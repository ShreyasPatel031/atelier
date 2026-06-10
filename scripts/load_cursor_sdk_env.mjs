/**
 * Loads local Cursor SDK env from gitignored files (no secrets in git).
 * Order: scripts/cursor-sdk.env, then .env at repo root.
 * Does not override a non-empty variable already in process.env (shell wins).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function unquote(s) {
    const t = s.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1);
    }
    return t;
}

/**
 * @param {string} repoRoot - parent of `scripts/`
 */
export function applyLocalCursorSdkEnv(repoRoot) {
    const paths = [join(repoRoot, 'scripts', 'cursor-sdk.env'), join(repoRoot, '.env')];
    for (const filePath of paths) {
        if (!existsSync(filePath)) continue;
        let text;
        try {
            text = readFileSync(filePath, 'utf8');
        } catch {
            continue;
        }
        for (const rawLine of text.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
            if (!m) continue;
            const key = m[1];
            const val = unquote(m[2]);
            const cur = process.env[key];
            if (cur != null && String(cur).trim() !== '') continue;
            process.env[key] = val;
        }
    }
}
