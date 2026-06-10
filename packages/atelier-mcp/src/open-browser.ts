import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { platform } from "node:os";

import { CACHE_BASE } from "./paths.js";

export const LOG_FILE = join(CACHE_BASE, "open-viewer.log");

export function cursorAppPath(): string {
  const fromEnv = process.env.CURSOR_APP?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return "/Applications/Cursor.app";
}

function shellQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function logOpen(event: string, detail: Record<string, unknown>): Promise<void> {
  try {
    await mkdir(CACHE_BASE, { recursive: true });
    await appendFile(LOG_FILE, `${new Date().toISOString()} ${event} ${JSON.stringify(detail)}\n`);
  } catch {
    /* ignore */
  }
}

export interface OpenResult {
  attempted: boolean;
  method?: string;
  ok: boolean;
  error?: string;
  url?: string;
}

/**
 * Open localhost viewer in Cursor. Uses a detached shell so MCP sandbox does not block GUI.
 */
export async function tryOpenInCursor(url: string): Promise<OpenResult> {
  if (process.env.ATELIER_NO_AUTO_OPEN === "1") {
    return { attempted: false, ok: false, error: "ATELIER_NO_AUTO_OPEN=1" };
  }

  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|\?|$)/i.test(url)) {
    return { attempted: false, ok: false, error: "Only localhost viewer URLs are auto-opened" };
  }

  await logOpen("attempt", { url, pid: process.pid, ppid: process.ppid });

  if (platform() === "darwin") {
    const app = shellQuote(cursorAppPath());
    const target = shellQuote(url);
    const script = [
      `osascript -e 'tell application "Cursor" to activate'`,
      `open -a ${app} ${target}`,
    ].join(" && ");
    return await spawnDetachedOpen(script, "detached-macos-open", url);
  }

  if (platform() === "win32") {
    const script = `start "" ${shellQuote(url)}`;
    return await spawnDetachedOpen(script, "detached-win-start", url);
  }

  const script = `xdg-open ${shellQuote(url)}`;
  return await spawnDetachedOpen(script, "detached-xdg-open", url);
}

function spawnDetachedOpen(
  script: string,
  method: string,
  url: string
): Promise<OpenResult> {
  return new Promise((resolve) => {
    const child = spawn("/bin/bash", ["-lc", script], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    child.on("error", async (err) => {
      await logOpen("error", { url, method, error: err.message });
      resolve({ attempted: true, ok: false, error: err.message, url });
    });

    child.on("spawn", async () => {
      await logOpen("spawned", { url, method, childPid: child.pid });
      resolve({ attempted: true, ok: true, method, url });
    });
  });
}
