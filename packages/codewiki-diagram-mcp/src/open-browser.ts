import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AUTO_OPEN = process.env.CODEWIKI_AUTO_OPEN_BROWSER !== "0";

export async function tryOpenInCursor(url: string): Promise<{
  attempted: boolean;
  method?: string;
  ok: boolean;
  error?: string;
}> {
  if (!AUTO_OPEN) {
    return { attempted: false, ok: false };
  }

  const platform = process.platform;

  try {
    if (platform === "darwin") {
      await execFileAsync("open", ["-g", "-a", "Cursor", url]);
      return { attempted: true, method: "open -a Cursor", ok: true };
    }

    if (platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", url]);
      return { attempted: true, method: "start", ok: true };
    }

    await execFileAsync("xdg-open", [url]);
    return { attempted: true, method: "xdg-open", ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { attempted: true, ok: false, error: message };
  }
}
