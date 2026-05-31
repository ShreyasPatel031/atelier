/**
 * No reliable way to open Cursor Simple Browser from an MCP subprocess.
 * Return the URL and let the agent open it (e.g. via open_resource or browser_navigate).
 */
export async function tryOpenInCursor(_url: string): Promise<{
  attempted: boolean;
  method?: string;
  ok: boolean;
  error?: string;
}> {
  return { attempted: false, ok: false, error: "Agent should open the URL in Simple Browser" };
}
