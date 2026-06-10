#!/usr/bin/env node
/**
 * Watches demo/repos/<repo_id>/viewer_state.json for last_diagram_ask (set by the
 * viewer "?" pill) and runs one Cursor SDK agent turn with project MCP loaded.
 *
 * Usage:
 *   export CURSOR_API_KEY="..."   # https://cursor.com/dashboard/integrations
 *   node scripts/diagram_ask_watcher.mjs --repo atelier-tdc8
 *
 * Optional: DIAGRAM_WATCH_REPO defaults repo if --repo omitted.
 *
 * Writes demo/repos/<repo_id>/viewer_sdk_answer.json (gitignored) with the reply or error.
 *
 * Companion HTTP (DIAGRAM_SSE_PORT, default 9878): serves ./demo as static files so the viewer
 * can open http://127.0.0.1:<port>/?repo=… same-origin (POST viewer_state + SSE /events work in Chromium).
 *
 * SDK observability:
 *   • stdout: one JSON line per trace row `{ "t":"sdk_trace", "channel", "at", "asked_at_ms", "payload" }`
 *   • SSE: same payload nested under `{ kind:"sdk_trace", repo_id, ts_ms, channel, payload }` (disable with DIAGRAM_SDK_TRACE_SSE=0)
 */

import { Agent } from '@cursor/sdk';
import { createServer } from 'http';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, watch, writeFileSync } from 'fs';
import { dirname, extname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseUrl } from 'url';

const REPO_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const VIEWER_STATE_MAX_BYTES = 524_288;

/** Repo id passed via `--repo` — POST /repos/:id/viewer_state.json only schedules asks for this repo. */
let companionWatchedRepo = '';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

function parseArgs() {
    const argv = process.argv.slice(2);
    let repo = process.env.DIAGRAM_WATCH_REPO || 'atelier-tdc8';
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--repo' && argv[i + 1]) {
            repo = argv[++i];
            continue;
        }
        if (!a.startsWith('-')) repo = a;
    }
    return { repo };
}

function viewerStatePath(repoId) {
    return join(REPO_ROOT, 'demo', 'repos', repoId, 'viewer_state.json');
}

function viewerAnswerPath(repoId) {
    return join(REPO_ROOT, 'demo', 'repos', repoId, 'viewer_sdk_answer.json');
}

function readState(repoId) {
    const p = viewerStatePath(repoId);
    if (!existsSync(p)) return null;
    try {
        return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
        return null;
    }
}

function writeAnswer(repoId, payload) {
    const p = viewerAnswerPath(repoId);
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const out = { kind: 'diagram_answer', ...payload };
    const tmp = p + '.tmp';
    writeFileSync(tmp, JSON.stringify(out, null, 2), 'utf8');
    renameSync(tmp, p);
    broadcastSSE(repoId, out);
}

// --- SSE server: pushes answers to the browser instantly ---
const SSE_PORT = parseInt(process.env.DIAGRAM_SSE_PORT || '9878', 10);
/** @type {Set<import('http').ServerResponse>} */
const sseClients = new Set();

const SSE_TRACE_ENABLED = process.env.DIAGRAM_SDK_TRACE_SSE !== '0';

function broadcastSSE(repoId, payload) {
    const data = JSON.stringify({ repo_id: repoId, ...payload });
    for (const res of sseClients) {
        try {
            res.write(`data: ${data}\n\n`);
            if (typeof /** @type {{ flush?: () => void }} */ (res).flush === 'function') {
                /** @type {{ flush?: () => void }} */ (res).flush();
            }
        } catch {
            sseClients.delete(res);
        }
    }
}

/** @param {unknown} value */
function toTraceJson(value, depth = 0, maxDepth = 6) {
    if (value == null) return value;
    const t = typeof value;
    if (t === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
    if (t === 'number' || t === 'boolean') return value;
    if (t === 'bigint') return String(value);
    if (depth >= maxDepth) return '[maxDepth]';
    if (Array.isArray(value)) return value.slice(0, 80).map((v) => toTraceJson(v, depth + 1, maxDepth));
    if (t === 'object') {
        const out = {};
        const keys = Object.keys(value).slice(0, 50);
        for (const k of keys) {
            try {
                out[k] = toTraceJson(/** @type {Record<string, unknown>} */ (value)[k], depth + 1, maxDepth);
            } catch {
                out[k] = '[unserializable]';
            }
        }
        return out;
    }
    return String(value);
}

/** @param {unknown} block */
function summarizeContentBlock(block) {
    if (!block || typeof block !== 'object') return null;
    const b = /** @type {{ type?: string; text?: string; id?: string; name?: string; input?: unknown }} */ (block);
    if (b.type === 'text') return { type: 'text', text: toTraceJson(b.text, 0, 2) };
    if (b.type === 'tool_use') return { type: 'tool_use', id: b.id, name: b.name, input: toTraceJson(b.input, 0, 4) };
    return toTraceJson(block, 0, 3);
}

/** @param {import('@cursor/sdk').SDKMessage} ev */
function summarizeSdkMessage(ev) {
    if (!ev || typeof ev !== 'object') return { raw: String(ev) };
    const base = { type: ev.type, agent_id: ev.agent_id, run_id: ev.run_id };
    switch (ev.type) {
        case 'system':
            return {
                ...base,
                subtype: ev.subtype,
                model: ev.model,
                tools: ev.tools ? { count: ev.tools.length, names: ev.tools.slice(0, 40) } : undefined,
            };
        case 'assistant': {
            const content = ev.message?.content;
            const parts = Array.isArray(content) ? content.map(summarizeContentBlock) : [];
            return { ...base, content: parts };
        }
        case 'tool_call':
            return {
                ...base,
                call_id: ev.call_id,
                name: ev.name,
                status: ev.status,
                args: toTraceJson(ev.args, 0, 4),
                result: toTraceJson(ev.result, 0, 4),
                truncated: ev.truncated,
            };
        case 'thinking':
            return { ...base, text: toTraceJson(ev.text, 0, 2), thinking_duration_ms: ev.thinking_duration_ms };
        case 'user':
            return { ...base, message: toTraceJson(ev.message, 0, 3) };
        case 'status':
            return { ...base, status: ev.status, message: ev.message };
        default:
            return toTraceJson(ev, 0, 5);
    }
}

/** @param {unknown} u — SDK `InteractionUpdate` from `onDelta`. */
function interactionUpdateToAssistantChunk(u) {
    if (!u || typeof u !== 'object') return '';
    const o = /** @type {Record<string, unknown>} */ (u);
    const typ = typeof o.type === 'string' ? o.type : '';
    const isTextish =
        typ === 'text-delta' ||
        typ === 'token-delta' ||
        typ === 'textDelta' ||
        typ === 'tokenDelta';
    if (isTextish) {
        for (const k of ['text', 'delta', 'token', 'content', 'value']) {
            const v = o[k];
            if (typeof v === 'string' && v.length) return v;
        }
    }
    return '';
}

/** Raw stream message → plain assistant text (for chat streaming). */
function assistantPlainTextFromStreamMessage(ev) {
    if (!ev || typeof ev !== 'object') return '';
    if (ev.type !== 'assistant' || !ev.message || typeof ev.message !== 'object') return '';
    const content = ev.message.content;
    if (!Array.isArray(content)) return '';
    let out = '';
    for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        if (block.type === 'text' && typeof block.text === 'string') out += block.text;
    }
    return out;
}

/** Viewer-facing status line (always SSE’d; not the verbose sdk_trace log). */
function emitDiagramActivity(repoId, askedAtMs, label) {
    if (!label || askedAtMs == null) return;
    broadcastSSE(repoId, {
        kind: 'diagram_activity',
        asked_at_ms: askedAtMs,
        label: String(label).slice(0, 240),
        ts_ms: Date.now(),
    });
}

/** @param {unknown} u — raw InteractionUpdate */
function diagramActivityFromInteractionUpdate(u) {
    if (!u || typeof u !== 'object') return null;
    const o = /** @type {Record<string, unknown>} */ (u);
    const typ = String(o.type || '');
    if (typ === 'tool-call-started' || typ === 'tool_call_started') {
        const n = (typeof o.name === 'string' && o.name) || (typeof o.toolName === 'string' && o.toolName) || 'tool';
        return `${n} — starting`;
    }
    if (typ === 'tool-call-completed' || typ === 'tool_call_completed') {
        const n = (typeof o.name === 'string' && o.name) || (typeof o.toolName === 'string' && o.toolName) || 'tool';
        return `${n} — completed`;
    }
    return null;
}

/** @param {unknown} step */
function diagramActivityFromStep(step) {
    if (!step || typeof step !== 'object') return null;
    const s = /** @type {Record<string, unknown>} */ (step);
    const t = String(s.type || '');
    if (t === 'toolCall' || t === 'tool_call') {
        const n =
            (typeof s.name === 'string' && s.name) ||
            (typeof s.toolName === 'string' && s.toolName) ||
            'tool';
        const st = typeof s.status === 'string' ? s.status : 'running';
        return `${n} — ${st}`;
    }
    if (t === 'thinkingMessage') return 'Thinking…';
    return null;
}

/** @returns {string|null} */
function diagramActivityFromTrace(channel, payload) {
    try {
        if (channel === 'stream' && payload && typeof payload === 'object') {
            const p = /** @type {Record<string, unknown>} */ (payload);
            if (p.type === 'tool_call') {
                const n = (typeof p.name === 'string' && p.name) || 'tool';
                const st = (typeof p.status === 'string' && p.status) || '';
                return st ? `${n} — ${st}` : `${n}`;
            }
            if (p.type === 'thinking') return 'Thinking…';
            if (p.type === 'status' && typeof p.message === 'string' && p.message.trim()) {
                return p.message.trim().slice(0, 160);
            }
        }
    } catch (_) {}
    return null;
}

function emitSdkTrace(repoId, askedAtMs, channel, payload) {
    const row = { t: 'sdk_trace', channel, at: Date.now(), asked_at_ms: askedAtMs, payload };
    console.log(JSON.stringify(row));
    const act = diagramActivityFromTrace(channel, payload);
    if (act) emitDiagramActivity(repoId, askedAtMs, act);
    if (SSE_TRACE_ENABLED) {
        broadcastSSE(repoId, {
            kind: 'sdk_trace',
            ts_ms: row.at,
            asked_at_ms: askedAtMs,
            channel,
            payload,
        });
    }
}

function viewerStatePostPath(pathname) {
    const p = pathname.replace(/\/$/, '') || '/';
    const parts = p.split('/').filter(Boolean);
    if (parts.length === 3 && parts[0] === 'repos' && parts[2] === 'viewer_state.json') {
        return parts[1];
    }
    return null;
}

function corsViewerState(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Read POST body with size cap (same limit as codewiki MCP static server).
 * @param {import('http').IncomingMessage} req
 */
function readBodyLimited(req, maxBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on('data', (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                reject(new Error('body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

const DEMO_MIME = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
};

function demoMimeForPath(filePath) {
    const ext = extname(filePath).toLowerCase();
    return DEMO_MIME[ext] || 'application/octet-stream';
}

/** Serve files under demo/ so POST /repos/.../viewer_state.json is same-origin as the viewer (avoids browser blocks on cross-port localhost). */
function serveDemoStatic(res, pathnameOnly) {
    try {
        let pathPart = pathnameOnly.split('?')[0];
        if (pathPart === '/' || pathPart === '') pathPart = '/index.html';
        const rel = pathPart.replace(/^\/+/, '');
        const demoRoot = join(REPO_ROOT, 'demo');
        const absPath = join(demoRoot, rel);
        const relSafe = relative(demoRoot, absPath);
        if (!relSafe || relSafe.startsWith('..')) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Forbidden');
            return true;
        }
        if (!existsSync(absPath) || !statSync(absPath).isFile()) return false;
        res.writeHead(200, {
            'Content-Type': demoMimeForPath(absPath),
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'Access-Control-Allow-Origin': '*',
        });
        createReadStream(absPath).pipe(res);
        return true;
    } catch {
        return false;
    }
}

function startCompanionHttpServer(watchedRepoId) {
    companionWatchedRepo = watchedRepoId;
    const server = createServer(async (req, res) => {
        const pathname = parseUrl(req.url || '', false).pathname || '/';

        const repoFromPost = viewerStatePostPath(pathname);
        if (req.method === 'OPTIONS' && repoFromPost) {
            res.writeHead(204);
            corsViewerState(res);
            res.end();
            return;
        }

        if (req.method === 'POST' && repoFromPost) {
            corsViewerState(res);
            if (!REPO_ID_RE.test(repoFromPost)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'Invalid repo id' }));
                return;
            }
            const repoDir = join(REPO_ROOT, 'demo', 'repos', repoFromPost);
            if (!existsSync(repoDir)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'Unknown repo' }));
                return;
            }
            let raw;
            try {
                raw = await readBodyLimited(req, VIEWER_STATE_MAX_BYTES);
            } catch {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'Body too large' }));
                return;
            }
            let data;
            try {
                data = JSON.parse(raw.length ? raw.toString('utf8') : '{}');
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
                return;
            }
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'JSON must be an object' }));
                return;
            }
            const outPath = join(repoDir, 'viewer_state.json');
            const tmpPath = outPath + '.tmp';
            try {
                writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
                renameSync(tmpPath, outPath);
            } catch {
                try {
                    if (existsSync(tmpPath)) unlinkSync(tmpPath);
                } catch {
                    /* ignore */
                }
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'Write failed' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            if (repoFromPost === companionWatchedRepo) {
                scheduleProcess(companionWatchedRepo);
            }
            return;
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            });
            res.end();
            return;
        }
        if (req.method === 'GET' && (pathname === '/events' || pathname.startsWith('/events?'))) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no',
            });
            res.write(':ok\n\n');
            sseClients.add(res);
            req.on('close', () => sseClients.delete(res));
            return;
        }
        if (req.method === 'GET' && serveDemoStatic(res, pathname)) {
            return;
        }
        res.writeHead(404);
        res.end('not found');
    });
    server.listen(SSE_PORT, '127.0.0.1', () => {
        console.log(
            `[diagram_ask_watcher] Companion HTTP on http://127.0.0.1:${SSE_PORT} — demo static + POST /repos/<repo>/viewer_state.json + SSE /events`
        );
    });
    server.on('error', (err) => {
        console.warn(`[diagram_ask_watcher] Companion HTTP failed on port ${SSE_PORT}:`, err.message);
    });
}

let lastHandledAskMs = 0;
let busy = false;
let debounceTimer = null;

/**
 * Read diagram context from disk so the SDK agent doesn't need MCP tools.
 * Returns { overview, moduleDiagram, moduleTree } strings (may be empty if files missing).
 */
function loadDiagramContext(repoId, ask) {
    const repoDir = join(REPO_ROOT, 'demo', 'repos', repoId);
    let overview = '';
    let moduleDiagram = '';
    let moduleTree = '';

    try {
        const overviewPath = join(repoDir, 'overview.md');
        if (existsSync(overviewPath)) overview = readFileSync(overviewPath, 'utf8').slice(0, 12000);
    } catch { /* ignore */ }

    try {
        const treePath = join(repoDir, 'module_tree.json');
        if (existsSync(treePath)) moduleTree = readFileSync(treePath, 'utf8').slice(0, 8000);
    } catch { /* ignore */ }

    const moduleHint =
        (ask.diagram_selection && ask.diagram_selection.module_id) ||
        (ask.module_id) ||
        null;
    if (moduleHint) {
        try {
            const modPath = join(repoDir, moduleHint + '.md');
            if (existsSync(modPath)) moduleDiagram = readFileSync(modPath, 'utf8').slice(0, 12000);
        } catch { /* ignore */ }
    }

    return { overview, moduleDiagram, moduleTree };
}

async function handleAsk(repoId, ask) {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) {
        writeAnswer(repoId, {
            answered_at_ms: Date.now(),
            asked_at_ms: ask.asked_at_ms,
            ok: false,
            error: 'CURSOR_API_KEY missing',
            answer: null,
        });
        return;
    }

    const ctx = loadDiagramContext(repoId, ask);

    const prompt = [
        'You help explain a CodeWiki architecture diagram for this repo.',
        '',
        `repo_id: ${repoId}`,
        '',
        'The user clicked the diagram "?" help control. Structured payload:',
        JSON.stringify(ask, null, 2),
        '',
        '--- DIAGRAM CONTEXT (pre-loaded from disk; do NOT call MCP tools) ---',
        '',
        ctx.overview ? `## Overview diagram\n${ctx.overview}` : '(no overview available)',
        '',
        ctx.moduleDiagram ? `## Module diagram\n${ctx.moduleDiagram}` : '',
        '',
        ctx.moduleTree ? `## Module tree (JSON)\n${ctx.moduleTree}` : '',
        '',
        '--- END DIAGRAM CONTEXT ---',
        '',
        'Instructions:',
        '1. Use ONLY the diagram context above to answer. Do NOT call any MCP tools or try to fetch data.',
        '2. Answer `last_diagram_ask.message` briefly and accurately for THIS codebase.',
        '3. Reply with ONLY the user-facing explanation (1-4 sentences). No preamble, no narration.',
        '',
        'CRITICAL: Do NOT mention MCP, tools, fetching, loading, viewer state, or server availability.',
        'Do NOT apologize. Do NOT narrate steps. Just give the concise architectural explanation.',
    ].join('\n');

    /** @type {import('@cursor/sdk').SDKAgent | null} */
    let agent = null;
    try {
        agent = await Agent.create({
            apiKey: String(apiKey).trim(),
            model: { id: 'composer-2' },
            local: {
                cwd: REPO_ROOT,
            },
        });

        const askedAtMs = ask.asked_at_ms;
        let rollingAnswerText = '';
        let lastAnswerProgressAt = 0;
        /** @param {{ force?: boolean }} [opts] */
        function bumpAnswerProgress(opts) {
            const force = !!(opts && opts.force);
            const now = Date.now();
            if (!rollingAnswerText) return;
            if (!force && now - lastAnswerProgressAt < 24) return;
            lastAnswerProgressAt = now;
            broadcastSSE(repoId, {
                kind: 'answer_progress',
                asked_at_ms: ask.asked_at_ms,
                partial: rollingAnswerText,
            });
        }

        const sendOptions = {
            onDelta: async (/** @type {{ update: import('@cursor/sdk').InteractionUpdate }} */ args) => {
                const actU = diagramActivityFromInteractionUpdate(args && args.update);
                if (actU) emitDiagramActivity(repoId, ask.asked_at_ms, actU);
                emitSdkTrace(repoId, askedAtMs, 'delta', { update: toTraceJson(args.update, 0, 8) });
                const chunk = interactionUpdateToAssistantChunk(args && args.update);
                if (chunk) {
                    rollingAnswerText += chunk;
                    bumpAnswerProgress({ force: rollingAnswerText.length === chunk.length });
                }
            },
            onStep: async (/** @type {{ step: import('@cursor/sdk').ConversationStep }} */ args) => {
                const actS = diagramActivityFromStep(args && args.step);
                if (actS) emitDiagramActivity(repoId, ask.asked_at_ms, actS);
                emitSdkTrace(repoId, askedAtMs, 'step', { step: toTraceJson(args.step, 0, 8) });
            },
        };

        const run = await agent.send(prompt, sendOptions);

        const streamPromise = (async () => {
            if (!run.supports('stream')) {
                emitSdkTrace(repoId, askedAtMs, 'stream', {
                    error: 'unsupported',
                    reason: run.unsupportedReason('stream'),
                });
                return;
            }
            try {
                for await (const ev of run.stream()) {
                    emitSdkTrace(repoId, askedAtMs, 'stream', summarizeSdkMessage(ev));
                    const plain = assistantPlainTextFromStreamMessage(ev);
                    if (plain.length > rollingAnswerText.length) {
                        rollingAnswerText = plain;
                        bumpAnswerProgress({ force: true });
                    } else {
                        bumpAnswerProgress({});
                    }
                }
            } catch (err) {
                emitSdkTrace(repoId, askedAtMs, 'stream', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        })();

        const result = await run.wait();
        await streamPromise;

        if (run.supports('conversation')) {
            try {
                const turns = await run.conversation();
                emitSdkTrace(repoId, askedAtMs, 'conversation', { turns: toTraceJson(turns, 0, 10) });
            } catch (err) {
                emitSdkTrace(repoId, askedAtMs, 'conversation', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        } else {
            emitSdkTrace(repoId, askedAtMs, 'conversation', {
                error: 'unsupported',
                reason: run.unsupportedReason('conversation'),
            });
        }

        const text = result.result || '(no text result)';
        console.log('[diagram_ask_watcher] --- answer ---\n' + text);
        writeAnswer(repoId, {
            answered_at_ms: Date.now(),
            asked_at_ms: ask.asked_at_ms,
            ok: result.status === 'finished',
            error: result.status !== 'finished' ? String(result.status) : null,
            answer: text,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[diagram_ask_watcher] Error:', msg);
        writeAnswer(repoId, {
            answered_at_ms: Date.now(),
            asked_at_ms: ask.asked_at_ms,
            ok: false,
            error: msg,
            answer: null,
        });
    } finally {
        try {
            agent?.close?.();
        } catch {
            /* ignore */
        }
    }
}

function scheduleProcess(repoId) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void processState(repoId), 450);
}

async function processState(repoId) {
    if (busy) return;
    const data = readState(repoId);
    const ask = data && data.last_diagram_ask;
    if (!ask || typeof ask.asked_at_ms !== 'number') return;
    if (ask.asked_at_ms <= lastHandledAskMs) return;

    if (!process.env.CURSOR_API_KEY?.trim()) {
        console.warn(
            '[diagram_ask_watcher] CURSOR_API_KEY unset — writing error answer so the viewer can clear (export key for real SDK runs).'
        );
    }

    busy = true;
    try {
        await handleAsk(repoId, ask);
        lastHandledAskMs = ask.asked_at_ms;
    } finally {
        busy = false;
    }
}

function main() {
    const { repo } = parseArgs();
    const statePath = viewerStatePath(repo);
    const watchDir = dirname(statePath);

    console.log(
        `[diagram_ask_watcher] repo=${repo}\n  state=${statePath}\n  answer=${viewerAnswerPath(repo)}`
    );

    if (!process.env.CURSOR_API_KEY) {
        console.warn(
            '[diagram_ask_watcher] CURSOR_API_KEY is not set — runs will fail until you export it.'
        );
    }

    startCompanionHttpServer(repo);

    void processState(repo);

    if (!existsSync(watchDir)) {
        mkdirSync(watchDir, { recursive: true });
    }

    watch(watchDir, { persistent: true }, (_evt, filename) => {
        if (filename === 'viewer_state.json' || filename == null) {
            scheduleProcess(repo);
        }
    });

    console.log('[diagram_ask_watcher] Watching for last_diagram_ask changes… (Ctrl+C to exit)');
}

main();
