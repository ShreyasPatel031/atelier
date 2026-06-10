---
name: open-viewer
description: Open the Atelier architecture diagram viewer in Cursor.
---

Run these steps IN ORDER. Do NOT read files, search, check config, or run any command not listed here.

Step 1: Call MCP tool `open_viewer` on server `user-atelier` with arguments `{"repo_id":"dspy"}`.
Step 2: From the response, take the `url` field.
Step 3: Call MCP tool `browser_navigate` on server `cursor-ide-browser` with arguments `{"url":"<url from step 2>","position":"active","newTab":true}`.
Step 4: Reply with ONLY the URL on one line. Nothing else.
