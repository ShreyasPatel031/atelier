# CodeWiki Viewer Setup Guide

## Architecture Overview

The CodeWiki viewer uses a **two-server architecture**:

### 1. Static Viewer Server (Port 8080)
- **What**: Simple HTTP server serving static HTML/JS files
- **Purpose**: Display documentation, diagrams, and UI
- **Technology**: Any static file server (Python's `http.server`, nginx, etc.)
- **Files**: `viewer.html`, `viewer-debug.js`, `repos/` folder

### 2. Chat API Server (Port 8001)
- **What**: FastAPI backend server with Python
- **Purpose**: Provides chat functionality via `/api/arch-agent/chat` endpoint
- **Technology**: FastAPI (Python) with LLM integration
- **Requires**: Python environment, LLM API keys configured

## Why Two Servers?

### Advantages ✅

1. **Separation of Concerns**
   - Static viewer can be deployed anywhere (GitHub Pages, Vercel, CDN)
   - Chat API requires Python backend and can't be static

2. **Flexibility**
   - Viewer works **without** chat (read-only mode)
   - Chat is optional - you can use viewer standalone
   - Different deployment strategies for each component

3. **Performance**
   - Static files can be cached and served from CDN
   - Backend only runs when chat is needed
   - Can scale viewer and API independently

4. **Development**
   - Fast iteration on static files (no server restart)
   - Backend changes don't affect static assets
   - Easy to test viewer without backend

### Disadvantages ❌

1. **Setup Complexity**
   - Need to start two servers manually
   - Different ports to remember
   - More moving parts

2. **CORS Configuration**
   - Must configure CORS on API server
   - Cross-origin requests between servers

3. **Port Management**
   - Must ensure ports don't conflict
   - Hardcoded port assumptions in code

## Quick Setup

### Prerequisites

**Install dependencies first:**
```bash
cd /Users/shreyaspatel/atelier

# If using virtual environment (recommended)
source .venv/bin/activate  # or: venv/bin/activate
pip install -r requirements.txt

# Or install globally
pip install -r requirements.txt
```

### Option 1: Viewer Only (No Chat)
```bash
cd /Users/shreyaspatel/atelier/demo
python3 -m http.server 8080
```
Open: http://localhost:8080/viewer.html?repo=KubeElasti

**Chat will not work** - you'll see an error if you try to use it.

### Option 2: Full Setup (Viewer + Chat)

**Terminal 1 - Static Viewer:**
```bash
cd /Users/shreyaspatel/atelier/demo
python3 -m http.server 8080
```

**Terminal 2 - Chat API:**
```bash
cd /Users/shreyaspatel/atelier
# Activate venv if using one
source .venv/bin/activate  # or: venv/bin/activate
python3 -m codewiki.run_web_app --port 8001
```

Then open: http://localhost:8080/viewer.html?repo=KubeElasti

### Option 3: Use Helper Script (Easiest)
```bash
cd /Users/shreyaspatel/atelier
./demo/start_viewer.sh
```

This automatically:
- Detects and uses your virtual environment
- Starts both servers
- Verifies the API server started successfully
- Shows helpful error messages if something fails

## Alternative: Single Server Setup

You can also serve everything from the FastAPI server:

```bash
cd /Users/shreyaspatel/atelier
python3 -m codewiki.run_web_app --port 8001
```

Then open: http://localhost:8001/demo/viewer.html?repo=KubeElasti

**Note**: The FastAPI server already mounts the `demo/` folder, so this works out of the box. Chat will work automatically since it's same-origin.

## Troubleshooting

### Chat API Not Working

1. **Check if server is running:**
   ```bash
   curl http://127.0.0.1:8001/api/arch-agent/chat
   ```
   Should return a 405 (Method Not Allowed) or 422 (validation error), not a connection error.

2. **Check CORS configuration:**
   - Ensure `http://localhost:8080` is in allowed origins
   - See `codewiki/src/fe/web_app.py` line 36

3. **Check port in viewer.html:**
   - Line 2276: `const CHAT_API_BASE = (window.location.port === '8080') ? 'http://127.0.0.1:8001' : '';`
   - If serving from different port, update this line

### Port Conflicts

- **8080 in use?** Use a different port for static server: `python3 -m http.server 9000`
- **8001 in use?** Start API on different port: `python3 -m codewiki.run_web_app --port 9001`
- **Update viewer.html** line 2276 to match your API port

## Making Chat Optional

The viewer is designed to work without chat. If you don't need chat functionality:
- Just start the static server (Option 1)
- Chat UI will show errors, but documentation viewing works fine
- No backend required
