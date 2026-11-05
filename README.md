# Pulpit AI

[![Tests](https://img.shields.io/badge/tests-236%20passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-lightgrey.svg)]()
[![Local-First](https://img.shields.io/badge/ai-100%25%20local%20offline-success.svg)]()

**Pulpit AI** is an open-source, local-first church presentation copilot designed to assist church media teams during live worship services. It listens to live preaching and congregational singing, identifies verified Scripture references and hymn lyrics in real time, and presents operator suggestion candidates with single-click projection into **[FreeShow](https://freeshow.app/)**.

---

## Non-Negotiable Core Principles

1. **Human Authority Always Takes Priority:** The church operator has absolute command. A prominent, persistent **Manual Safety Lock** immediately freezes all automated actions.
2. **Accuracy Before Automation:** AI suggestions are the default behavior. Pulpit AI never projects content unprompted without passing through the Central Authority Manager.
3. **Never Invent Content:** Scripture and song lyrics are **never hallucinated or invented**. Only exact, verified verses from local Protestant translations (WEB, KJV) and verified song catalogs are suggested.
4. **100% Local-First by Default:** All audio processing, speech recognition (native `whisper.cpp` AVX2 child process), singing pitch analysis, and SQLite databases run on the church PC. Zero sanctuary audio or transcripts leave the building.
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
                      │  - AudioWorklet (Dedicated Audio Thread│
                      │  - AudioRingBuffer (250ms Pre-Roll)    │
                      │  - VoiceActivityDetector (Adaptive VAD)│
                      │  - SingingActivityDetector (Pitch/F0)  │
                      │  - SpeechSegmenter (Book Overlap)      │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │        @pulpit-ai/speech-engine        │
                      │  - Native whisper.cpp AVX2 Subprocess  │
                      │  - Quantized GGUF Models (SHA-256)     │
                      │  - Canonical Protestant Prompt Priming │
                      │  - PhantomPhraseFilter ([MUSIC], etc.) │
                      └──────────┬───────────────────┬─────────┘
                                 │                   │
               ┌─────────────────┴─┐               ┌─┴────────────────┐
               ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│  @pulpit-ai/scripture-engine │   │     @pulpit-ai/song-engine       │
│  - 66-Book Protestant Canon  │   │  - Relational SQLite Song Schema │
│  - Full WEB & KJV (31,102 vs)│   │  - Multi-Version Arrangements    │
│  - SpokenNumberConverter     │   │  - Universal Importers (TXT/CSV/ │
│  - ScriptureReferenceParser  │   │    DOCX/PPTX/Text-PDF)           │
│  - ScriptureDatabase (SQLite)│   │  - LyricMatcher (IDF & Overlap)  │
│  - Rolling Window & Cues     │   │  - BackupManager (Weekly Sync)   │
└──────────────┬───────────────┘   └────────────────┬─────────────────┘
               │                                    │
               └─────────────────┬──────────────────┘
                                 │ (Untrusted Suggestion Candidates)
                                 ▼
              ┌─────────────────────────────────────┐
              │    @pulpit-ai/authority-manager     │
              │  - Central Finite State Machine     │
              │  - CandidateRegistry (Approval by ID│
              │  - Single-Use & 2-Minute Expiration │
              │  - Manual Safety Lock (Freeze)      │
              │  - Tamper-Evident Audit Trail       │
              └──────────────────┬──────────────────┘
                                 │ (Operator Authorized Commands)
                                 ▼
              ┌─────────────────────────────────────┐
              │ @pulpit-ai/presentation-contracts   │
              │  - FreeShowAdapter (WebSocket API)  │
              │  - Single-Emit Guarantee            │
              │  - Verified Confirmation Tracking   │
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

## Remediated Production Specifications (10 Phases Completed)

* **PR 1 (P0): Spoken-Number Corruption Remediation:** Preserved raw transcript through candidate generator and rolling window. Spoken compound numbers (*"twenty-three"* $\to 23$, *"one hundred and nineteen"* $\to 119$) parse cleanly to canonical references.
* **PR 2: Unsafe Defaults & Test Hooks Removal:** Eliminated fallback references (*John 3:16*), hardcoded credentials, and synthetic success timers. Enforced single-emit command dispatch and production mock isolation.
* **PR 3: Approval by Candidate ID:** IPC accepts only `candidateId`, looking up payloads in the main process `CandidateRegistry` with single-use enforcement, 2-minute expiration, and replay protection.
* **PR 4: Full Bible Data & Cryptographic Verification:** Loaded all 66 books (1,189 chapters, 31,102 verses) for both WEB and KJV with fail-closed SHA-256 package verification.
* **PR 5: Scripture Parser Guards:** Required structural/spoken cues for bare numbers, rejected colloquial non-scriptural units, labeled whole chapters accurately, and gated rolling window re-parsing to new book/number occurrences.
* **PR 6: Real Hardware Audio Capture:** Dynamic device enumeration via `navigator.mediaDevices.enumerateDevices()`, dedicated `AudioWorklet`, acoustic DSP bypass, disconnect detection ($< 1\text{ s}$), and real level metering (`MUT`, `SIL`, `active`, `OFF`).
* **PR 7: Native Speech Engine:** Native `whisper.cpp` child process running outside the Electron main process, official SHA-256 checksums, gated download permission ($\ge 2\text{ GB}$ margin), real confidence or null, prompt priming, and phantom phrase filtering (`[MUSIC]`, `"Thank you."`).
* **PR 8: Adaptive VAD, Ring Buffer Pre-Roll & Singing Separation:** Real-time adaptive noise floor VAD, volatile 250ms pre-roll `AudioRingBuffer` in RAM, 1.5s trailing book overlap, and singing diversion away from Whisper.
* **PR 9: Calibrated Fixtures & Benchmark Evaluation:** Suite of 7 calibrated WAV audio clips (`tests/fixtures/`), WAV-to-candidate integration testing, and automated evaluation benchmark (`pnpm run evaluate`).
* **PR 10: Complete Documentation Sync:** Authoring of [PRD.md](PRD.md), [PRIVACY.md](PRIVACY.md), [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md), [ADR-001 through ADR-011](docs/architecture/DECISIONS.md), and [AUDIO_PIPELINE.md](docs/architecture/AUDIO_PIPELINE.md).

---

## Monorepo Packages & Test Coverage

| Package | Purpose | Tests Passing |
|---|---|:---:|
| [`@pulpit-ai/shared-types`](packages/shared-types) | Domain contracts, FreeShow allowlist, and sync types | Built |
| [`@pulpit-ai/authority-manager`](packages/authority-manager) | Central authority FSM, candidate registry by ID, audit logger | 16 / 16 |
| [`@pulpit-ai/presentation-contracts`](packages/presentation-contracts) | FreeShow WebSocket adapter, single-emit, confirmation tracking | 9 / 9 |
| [`@pulpit-ai/audio-engine`](packages/audio-engine) | AudioWorklet, 250ms pre-roll ring buffer, adaptive VAD, singing detector | 36 / 36 |
| [`@pulpit-ai/speech-engine`](packages/speech-engine) | Native whisper.cpp subprocess, official hashes, prompt bias, phantom filter | 24 / 24 |
| [`@pulpit-ai/scripture-engine`](packages/scripture-engine) | Protestant canon, 31,102 verses (WEB/KJV), spoken numbers, parser guards | 37 / 37 |
| [`@pulpit-ai/song-engine`](packages/song-engine) | SQLite song catalog, DOCX/PPTX/PDF importers, lyric matcher, backup sync | 49 / 49 |
| [`@pulpit-ai/desktop`](apps/desktop) | Electron desktop app integration suites (audio, numbers, whisper, VAD guards) | 60 / 60 |
| **Root Integration Suite** ([`tests/`](tests/)) | Calibrated WAV fixture integration, audio format integrity, evaluation | 5 / 5 |

**Total Monorepo Tests:** **236 passing tests** across **30 test files** (100% pass rate).

---

## System Requirements

- **Operating System:** Windows 10 or 11 (64-bit)
- **CPU:** Intel Core i5 (6th gen Skylake or newer) or AMD equivalent with AVX2 instruction support
- **RAM:** Minimum 8 GB DDR4
- **Storage:** Minimum 2.0 GB free SSD storage
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

# 4. Run all unit and integration test suites (236 tests)
pnpm test

# 5. Run end-to-end evaluation benchmark (WER, Precision, Recall, Latency)
pnpm run evaluate

# 6. Launch desktop development app
pnpm --filter @pulpit-ai/desktop dev
```

---

## Operational & Architectural Documentation

- **[Product Requirements Document (PRD)](PRD.md):** Full system specifications, performance benchmarks, and architecture.
- **[Privacy & Data Sovereignty Policy](PRIVACY.md):** 100% local-first guarantee, zero telemetry, zero audio-to-disk.
- **[Backup & Disaster Recovery Manual](BACKUP_AND_RECOVERY.md):** Automated weekly backup rotation, SQLite integrity, and Sunday morning failover runbook.
- **[Audio & Speech Pipeline](docs/architecture/AUDIO_PIPELINE.md):** Deep-dive into AudioWorklet, 250ms pre-roll, adaptive VAD, and singing separation.
- **[Architectural Decision Records (ADRs)](docs/architecture/DECISIONS.md):** ADR-001 through ADR-011 covering all major technical decisions.
- **[Security & Authority](docs/architecture/SECURITY_AND_AUTHORITY.md):** Central state machine, single-use approval by ID, and network sandbox.
- **[Content & Licensing](docs/architecture/CONTENT_AND_LICENSING.md):** Public domain Bible datasets (eBible.org), CCLI boundaries, and checksum validation.
- **[FreeShow Integration Protocol](docs/architecture/FREESHOW_INTEGRATION.md):** WebSocket communication specifications.
- **[Test Plan & Safety Verification](docs/testing/TEST_PLAN.md):** Fixture inventory, acceptance criteria, and benchmark execution.

---

## License

This project is licensed under the [MIT License](LICENSE). Sourced Scripture translations (World English Bible, King James Version) and seed hymns are in the Public Domain worldwide.
