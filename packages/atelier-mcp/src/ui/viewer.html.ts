export const VIEWER_UI_URI = "ui://atelier/viewer.html";

export const VIEWER_UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CodeWiki Diagram</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #0b0b0c; }
    iframe { width: 100%; height: 100vh; border: 0; display: block; }
    .status {
      color: #a1a1aa;
      font: 14px/1.4 system-ui, sans-serif;
      padding: 16px;
    }
  </style>
</head>
<body>
  <div id="status" class="status">Loading diagram viewer…</div>
  <iframe id="frame" hidden title="Architecture diagram viewer"></iframe>
  <script>
    const frame = document.getElementById("frame");
    const status = document.getElementById("status");

    function showUrl(url) {
      frame.src = url;
      frame.hidden = false;
      status.hidden = true;
    }

    function parseToolResult(params) {
      const content = params && params.content;
      if (!Array.isArray(content)) return null;
      for (const item of content) {
        if (item && item.type === "text" && typeof item.text === "string") {
          try {
            const data = JSON.parse(item.text);
            if (data && typeof data.url === "string") return data.url;
          } catch (_) {}
        }
      }
      return null;
    }

    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.method === "ui/notifications/tool-result") {
        const url = parseToolResult(msg.params);
        if (url) showUrl(url);
      }

      if (msg.method === "ui/notifications/tool-input") {
        const repoId = msg.params && msg.params.repo_id;
        if (typeof repoId === "string") {
          showUrl("http://127.0.0.1:9891/?repo=" + encodeURIComponent(repoId));
        }
      }
    });
  </script>
</body>
</html>`;
