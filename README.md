# Pulpit AI

**Pulpit AI** is an open-source, local-first church presentation assistant designed to assist church presentation operators by listening to a live church service, recognising spoken words and sung lyrics, finding matching approved content, and presenting verified suggestions or controlled presentation actions through FreeShow.

## Non-Negotiable Rules

1. **Human authority always takes priority.** The operator can take control or lock AI projection instantly.
2. **Accuracy before automation.** Suggestions are the default behaviour.
3. **Never invent Scripture or song lyrics.** Only retrieve from verified approved sources.
4. **Local-first by default.** Audio and church content stay on the local machine; zero mandatory cloud dependencies.
5. **Fail closed.** If the system cannot verify permission or presentation state, it does not project.

## Architecture

* **Desktop Shell:** Electron (React + TypeScript + Tailwind CSS + Zustand)
* **Central Authority Manager:** Strict finite state machine enforcing safety boundaries and audit trails
* **Presentation Engine:** FreeShow Integration Adapter (local REST/WebSocket API)
* **Audio Capture & VAD:** WASAPI with Voice Activity Detection
* **Speech Recognition:** Local `whisper.cpp` AVX2 workers with quantized GGML models
* **Data Storage:** Embedded SQLite with FTS5 for sub-millisecond local searches

## Monorepo Structure

```text
pulpit-ai/
├── apps/
│   └── desktop/               # Electron application & operator dashboard
├── packages/
│   ├── shared-types/          # Domain contracts, authority types, command allowlists
│   ├── authority-manager/     # Central presentation authority & audit logger
│   └── presentation-contracts/ # FreeShow connection adapter & mock server
├── workers/
│   ├── audio/                 # Audio capture & VAD pipeline
│   └── speech/                # whisper.cpp integration
├── docs/                      # Architectural decision records, PRD, threat models
└── tests/                     # Integration and safety test fixtures
```

## Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Build shared types
pnpm --filter @pulpit-ai/shared-types run build

# Run unit and integration tests
pnpm test
```
