# Pulpit AI

[![Tests](https://img.shields.io/badge/tests-126%20passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-lightgrey.svg)]()
[![Local-First](https://img.shields.io/badge/ai-100%25%20local%20offline-success.svg)]()

**Pulpit AI** is an open-source, local-first church presentation assistant designed to assist church media teams during live worship services. It listens to live preaching and congregational singing, identifies verified Scripture references and hymn lyrics in real time, and presents operator suggestion candidates with single-click projection into **FreeShow**.

---

## Non-Negotiable Core Principles

1. **Human Authority Always Takes Priority:** The church operator has absolute command. A prominent, persistent **Manual Safety Lock** immediately freezes all automated actions.
2. **Accuracy Before Automation:** AI suggestions are the default behavior. Pulpit AI never projects content unprompted without passing through the Central Authority Manager.
3. **Never Invent Content:** Scripture and song lyrics are **never hallucinated or invented**. Only exact, verified verses from local Protestant translations and verified song catalogs are suggested.
4. **100% Local-First by Default:** All audio processing, speech recognition (`whisper.cpp` AVX2), singing pitch analysis, and SQLite databases run on the church PC. Zero sanctuary audio or transcripts leave the building.
5. **Fail-Closed Safety:** If permission, connection, or content integrity cannot be verified, the system refuses to project.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Microphone / Sound Board Mixer      │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │        @pulpit-ai/audio-engine         │
                      │  - AudioRingBuffer (Float32 / PCM16)   │
                      │  - VoiceActivityDetector (Energy/ZCR)  │
                      │  - SingingActivityDetector (Pitch/F0)  │
                      │  - SpeechSegmenter (Hangover/Windows)  │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │        @pulpit-ai/speech-engine        │
                      │  - WhisperWorkerProcess (AVX2 Engine)  │
                      │  - Local Quantized GGML Models         │
                      │  - Normalized Transcript Stream        │
                      └──────────┬───────────────────┬─────────┘
                                 │                   │
               ┌─────────────────┴─┐               ┌─┴────────────────┐
               ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│  @pulpit-ai/scripture-engine │   │     @pulpit-ai/song-engine       │
│  - 66-Book Protestant Canon  │   │  - Relational SQLite Song Schema │
│  - SpokenNumberConverter     │   │  - Multi-Version Arrangements    │
│  - ScriptureReferenceParser  │   │  - Universal Importers (TXT/CSV/ │
│  - ScriptureDatabase (WEB/KJV│   │    DOCX/PPTX/Text-PDF)           │
│  - CandidateGenerator        │   │  - LyricMatcher (IDF & Overlap)  │
└──────────────┬───────────────┘   │  - ConsecutiveEvidenceTracker    │
               │                   │  - CuratedPackageSync & Backups  │
               │                   └────────────────┬─────────────────┘
               │                                    │
               └─────────────────┬──────────────────┘
                                 │ (Untrusted Suggestion Candidates)
                                 ▼
              ┌─────────────────────────────────────┐
              │    @pulpit-ai/authority-manager     │
              │  - Central Finite State Machine     │
              │  - Manual Safety Lock (Freeze)      │
              │  - Allowlisted Command Filter       │
              │  - Tamper-Evident Audit Trail       │
              └──────────────────┬──────────────────┘
                                 │ (Operator Authorized Commands)
                                 ▼
              ┌─────────────────────────────────────┐
              │ @pulpit-ai/presentation-contracts   │
              │  - FreeShowAdapter (WebSocket API)  │
              │  - Port 5505 (ws://127.0.0.1:5505)  │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │      FreeShow Presentation Output   │
              │     (Projector / Live Stream)       │
              └─────────────────────────────────────┘
```

---

## Monorepo Packages

| Package | Purpose | Tests |
|---|---|:---:|
| [`@pulpit-ai/shared-types`](packages/shared-types) | Common domain contracts, FreeShow allowlist, and sync types | Built |
| [`@pulpit-ai/authority-manager`](packages/authority-manager) | Central presentation authority, fail-closed enforcement & audit logging | 10 / 10 |
| [`@pulpit-ai/presentation-contracts`](packages/presentation-contracts) | FreeShow WebSocket adapter, command dispatch, and mock test rig | 5 / 5 |
| [`@pulpit-ai/audio-engine`](packages/audio-engine) | Audio ring buffer, VAD, level metering & singing activity detector | 21 / 21 |
| [`@pulpit-ai/speech-engine`](packages/speech-engine) | Offline whisper.cpp worker process, disk safety & transcripts | 6 / 6 |
| [`@pulpit-ai/scripture-engine`](packages/scripture-engine) | Protestant canon validator, spoken number parser, SQLite Scripture DB | 32 / 32 |
| [`@pulpit-ai/song-engine`](packages/song-engine) | Song catalog, universal importers (DOCX/PPTX/PDF), lyric matcher, backup sync | 49 / 49 |
| [`@pulpit-ai/desktop`](apps/desktop) | Electron desktop operator dashboard (React 18 + Tailwind CSS + Vite) | 3 / 3 |

**Total Monorepo Tests:** **126 passing tests** across 19 test files.

---

## System Requirements

- **Operating System:** Windows 10 or 11 (64-bit)
- **CPU:** Intel Core i5 (6th gen or newer) or AMD equivalent with AVX2 instruction support
- **RAM:** Minimum 8 GB
- **Storage:** ~500 MB for Pulpit AI application and quantized whisper models
- **Presentation Software:** [FreeShow](https://freeshow.app/) v1.2+ running on the same computer with API enabled on port `5505`

---

## Quickstart (Development)

### Prerequisites
- Node.js v20+ or v22+
- `pnpm` v9+ (`corepack enable pnpm`)

```bash
# 1. Clone repository
git clone https://github.com/okikijesutech/pulpit-ai.git
cd pulpit-ai

# 2. Install workspace dependencies
pnpm install

# 3. Build all workspace packages
pnpm run build

# 4. Run all unit and integration tests (126 tests)
pnpm test

# 5. Launch desktop development app
pnpm --filter @pulpit-ai/desktop dev
```

---

## Operational Documentation

- **[Operator Runbook](docs/operations/CHURCH_OPERATOR_RUNBOOK.md):** Step-by-step setup guide for AV volunteers on Sunday mornings.
- **[Disaster Recovery](docs/operations/DISASTER_RECOVERY.md):** Rapid 30-second manual failover runbook and emergency procedures.
- **[Security & Authority](docs/architecture/SECURITY_AND_AUTHORITY.md):** Deep dive into the fail-closed authority model and network isolation.
- **[Content & Licensing](docs/architecture/CONTENT_AND_LICENSING.md):** Public domain Bible translations, CCLI guidelines, and copyright boundaries.
- **[FreeShow Integration Protocol](docs/architecture/FREESHOW_INTEGRATION.md):** WebSocket communication specifications.

---

## License

This project is licensed under the [MIT License](LICENSE). Bundled Scripture translations (World English Bible, King James Version) and seed hymns are in the Public Domain.
