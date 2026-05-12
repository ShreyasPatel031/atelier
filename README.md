# CodeWiki

AI-powered repository documentation generation with interactive diagrams and multi-level module exploration.

**Moving this repo to another laptop / Cursor:** [SETUP-OTHER-MACHINE.md](SETUP-OTHER-MACHINE.md) · one-command zip: `./scripts/make-portable-archive.sh`

**Full documentation:** [docs/README.md](docs/README.md)

Quick start:

```bash
pip install -e .
codewiki config set --api-key YOUR_KEY --main-model gemini-2.0-flash --cluster-model gemini-2.0-flash
cd /path/to/your/repo && codewiki generate
```

Demo viewer: [docs/README.md#live-demo](docs/README.md#live-demo) · Development: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
