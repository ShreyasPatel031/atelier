# AGENTS.md

## Cursor Cloud specific instructions

### What this is
"Atelier" (repo name "OpenAI Realtime Console") is an AI architecture-diagramming tool. A single Node process (`server/server.js`, Express + Vite SSR via `ts-node/esm`) serves the React client on `http://localhost:3000`. Routes: `/` (auth view), `/canvas` (public), `/embed` (framer widget). The core flow is chat/voice → AI-generated architecture diagram on a ReactFlow/ELK canvas; there is no manual node-creation path, so exercising core functionality requires OpenAI.

### Running the app (dev)
- Start with `npm run dev` (see `package.json` scripts). It serves everything on port 3000. Use `npm start` for the non-dev server.
- `npm run dev` also spawns `npm run start:deepwiki` (`scripts/start-deepwiki-backend.sh`). That script points at a hardcoded macOS path (`/Users/shreyaspatel/...`) and exits with an error on this VM. This is EXPECTED and does not block the main server. The DeepWiki Python backend (port 8001) is an external repo, only needed for the optional "import a GitHub repo → Mermaid diagram" feature.

### Required env / `.env` (non-obvious)
- The server hard-exits at startup if `OPENAI_API_KEY` is unset, and every core feature (chat, realtime `/token`, diagram generation, `npm run build`'s embedding precompute) calls OpenAI. Provide a real key via a Cursor secret named `OPENAI_API_KEY` (the server reads `process.env`; `dotenv` does not override an already-set env var).
- Gotcha: `client/lib/firebase.ts` calls `getAuth()` at module load. If `VITE_FIREBASE_API_KEY` is empty/undefined, SSR throws `auth/invalid-api-key` and EVERY route returns HTTP 500. A `.env` with non-empty Firebase values is therefore required just to boot. `cp .env.example .env` provides working non-empty placeholders (real Firebase values are only needed for the authenticated `/auth` Google sign-in flow). `.env` is gitignored.

### Lint / test / build status (as-is in this repo)
- `npm run lint` does NOT work: `eslint` is not a dependency and there is no eslint config, so the script fails with `eslint: not found`. No lint step is available without adding tooling.
- `npm run test:unit` (jest) runs, but the repo has pre-existing unit-test failures unrelated to environment setup. The jest runner itself is healthy.
- `npm test` (`test:comprehensive`) and `npm run test:e2e` (Playwright) need the app running plus a valid `OPENAI_API_KEY`. `npm run build` / `test:build` runs `precompute-embeddings`, which calls the OpenAI embeddings API and needs a valid key.

### Node
`.nvmrc` pins Node 20; the VM's Node 22 runs the dev server fine.
