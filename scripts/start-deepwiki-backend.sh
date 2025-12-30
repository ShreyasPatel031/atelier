#!/bin/bash

# Script to start the DeepWiki Python backend
# This backend is required for the codebase tool to work

DEEPWIKI_DIR="/Users/shreyaspatel/Desktop/Code/deepwiki-open"
PORT=8001

echo "🚀 Starting DeepWiki Python backend on port $PORT..."

# Check if backend is already running
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ DeepWiki backend is already running on port $PORT"
    exit 0
fi

# Check if directory exists
if [ ! -d "$DEEPWIKI_DIR" ]; then
    echo "❌ Error: DeepWiki directory not found at $DEEPWIKI_DIR"
    exit 1
fi

# Navigate to DeepWiki root directory
cd "$DEEPWIKI_DIR" || {
    echo "❌ Failed to change directory to $DEEPWIKI_DIR"
    exit 1
}

# Verify pyproject.toml exists in api subdirectory
if [ ! -f "api/pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found in $DEEPWIKI_DIR/api"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "✅ Found pyproject.toml in api subdirectory"

# Load .env file if it exists (for OPENAI_API_KEY)
if [ -f ".env" ]; then
    echo "✅ Loading .env file from $DEEPWIKI_DIR"
    set -a
    source .env
    set +a
elif [ -f "../.env" ]; then
    echo "✅ Loading .env file from parent directory"
    set -a
    source ../.env
    set +a
else
    echo "⚠️  Warning: .env file not found in $DEEPWIKI_DIR"
    # Try to use OPENAI_API_KEY from environment if available
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  Warning: OPENAI_API_KEY not set - backend may fail"
    fi
fi

# Set environment variables - PYTHONPATH must point to root directory for api imports
export PYTHONPATH="$DEEPWIKI_DIR:$PYTHONPATH"

# Get Poetry Python path from api directory
cd "$DEEPWIKI_DIR/api" || exit 1
POETRY_PYTHON=$(poetry run which python 2>/dev/null | grep -v "Warning" | grep python | tail -1)
cd "$DEEPWIKI_DIR" || exit 1

if [ -z "$POETRY_PYTHON" ] || [ ! -f "$POETRY_PYTHON" ]; then
    echo "⚠️  Could not find Poetry Python via 'which', trying env path..."
    # Try to find poetry env path
    cd "$DEEPWIKI_DIR/api" || exit 1
    POETRY_ENV=$(poetry env info --path 2>/dev/null | grep -v "Warning" | tail -1)
    cd "$DEEPWIKI_DIR" || exit 1
    if [ -n "$POETRY_ENV" ] && [ -d "$POETRY_ENV" ]; then
        POETRY_PYTHON="$POETRY_ENV/bin/python"
    fi
fi

if [ -n "$POETRY_PYTHON" ] && [ -f "$POETRY_PYTHON" ]; then
    echo "✅ Using Poetry Python: $POETRY_PYTHON"
    echo "📦 Starting uvicorn server from root directory..."
    echo "   Working directory: $(pwd)"
    echo "   PYTHONPATH: $PYTHONPATH"
    echo "   OPENAI_API_KEY: ${OPENAI_API_KEY:0:20}..." # Show first 20 chars for verification
    # Ensure OPENAI_API_KEY is exported and passed to Python
    export OPENAI_API_KEY
    "$POETRY_PYTHON" -m uvicorn api.api:app --host 0.0.0.0 --port $PORT
else
    echo "❌ Could not find Poetry Python executable"
    echo "   Please ensure Poetry is installed and dependencies are set up"
    exit 1
fi




