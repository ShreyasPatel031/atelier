#!/bin/bash
# CodeWiki Viewer Startup Script
# Starts both the static viewer server and the chat API server

set -e

# Get the atelier root directory (parent of demo/)
ATELIER_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$ATELIER_ROOT/demo"

# Detect and activate virtual environment if it exists
if [ -d "$ATELIER_ROOT/.venv" ]; then
    VENV_PYTHON="$ATELIER_ROOT/.venv/bin/python"
    if [ -f "$VENV_PYTHON" ]; then
        echo "🐍 Using virtual environment: $ATELIER_ROOT/.venv"
        PYTHON_CMD="$VENV_PYTHON"
    else
        PYTHON_CMD="python3"
    fi
elif [ -d "$ATELIER_ROOT/venv" ]; then
    VENV_PYTHON="$ATELIER_ROOT/venv/bin/python"
    if [ -f "$VENV_PYTHON" ]; then
        echo "🐍 Using virtual environment: $ATELIER_ROOT/venv"
        PYTHON_CMD="$VENV_PYTHON"
    else
        PYTHON_CMD="python3"
    fi
else
    PYTHON_CMD="python3"
fi

echo "🚀 Starting CodeWiki Viewer..."
echo ""

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $1 is already in use!"
        echo "   Please stop the process using port $1 or use different ports."
        return 1
    fi
    return 0
}

# Check ports
if ! check_port 8080; then
    echo "   Static viewer server (port 8080) is already running"
    STATIC_RUNNING=true
else
    STATIC_RUNNING=false
fi

if ! check_port 8001; then
    echo "   Chat API server (port 8001) is already running"
    API_RUNNING=true
else
    API_RUNNING=false
fi

echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$STATIC_PID" ]; then
        kill $STATIC_PID 2>/dev/null || true
    fi
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    echo "✅ Servers stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start static server if not running
if [ "$STATIC_RUNNING" = false ]; then
    echo "📄 Starting static viewer server on port 8080..."
    cd "$DEMO_DIR"
    python3 -m http.server 8080 > /dev/null 2>&1 &
    STATIC_PID=$!
    echo "   ✅ Static server started (PID: $STATIC_PID)"
    sleep 1
else
    echo "📄 Static viewer server already running on port 8080"
fi

# Start API server if not running
if [ "$API_RUNNING" = false ]; then
    echo "🤖 Starting chat API server on port 8001..."
    cd "$ATELIER_ROOT"
    $PYTHON_CMD -m codewiki.run_web_app --port 8001 > /tmp/codewiki_api.log 2>&1 &
    API_PID=$!
    echo "   ⏳ Waiting for server to start..."
    
    # Wait up to 5 seconds for server to start
    for i in {1..10}; do
        sleep 0.5
        if curl -s http://127.0.0.1:8001/ > /dev/null 2>&1; then
            echo "   ✅ API server started successfully (PID: $API_PID)"
            API_RUNNING=true
            break
        fi
        # Check if process died
        if ! kill -0 $API_PID 2>/dev/null; then
            echo "   ❌ API server failed to start!"
            echo "   📋 Error log:"
            tail -20 /tmp/codewiki_api.log | sed 's/^/      /'
            echo ""
            echo "   💡 Try installing API deps (minimal, for chat on port 8001):"
            if [ ! -z "$VENV_PYTHON" ]; then
                echo "      cd $ATELIER_ROOT && $VENV_PYTHON -m pip install -r demo/requirements-api.txt"
            else
                echo "      cd $ATELIER_ROOT && pip install -r demo/requirements-api.txt"
            fi
            echo "   Full stack (may fail on very new Python): pip install -r requirements.txt"
            API_PID=""
            break
        fi
    done
    
    if [ "$API_RUNNING" = false ] && [ ! -z "$API_PID" ]; then
        echo "   ⚠️  API server may not be responding (PID: $API_PID)"
        echo "   📋 Check logs: tail -f /tmp/codewiki_api.log"
    fi
else
    echo "🤖 Chat API server already running on port 8001"
fi

echo ""
if [ "$API_RUNNING" = true ]; then
    echo "✅ CodeWiki Viewer is ready (with chat support)!"
else
    echo "✅ CodeWiki Viewer is ready (viewer only - chat not available)"
    echo "   ⚠️  To enable chat, fix the API server errors above"
fi
echo ""
echo "🌐 Open in your browser:"
echo "   http://localhost:8080/"
echo "   (first repo in repos/index.json loads automatically; use ?repo=name or the dropdown)"
echo "   Legacy /viewer.html?repo=… redirects to /?repo=…"
echo ""
echo "📝 Repositories are listed in demo/repos/index.json (viewer dropdown reads this file)."
echo ""
if [ "$API_RUNNING" = false ]; then
    echo "🔧 Troubleshooting:"
    echo "   1. Check API server logs: tail -f /tmp/codewiki_api.log"
    echo "   2. Install API deps: cd $ATELIER_ROOT && pip install -r demo/requirements-api.txt"
    echo "   3. Or use single-server mode: python3 -m codewiki.run_web_app --port 8001"
    echo ""
fi
echo "💡 Tip: Press Ctrl+C to stop both servers"
echo ""

# Wait for user interrupt
wait
