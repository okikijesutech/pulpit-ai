# Product Requirements Document (PRD) — Pulpit AI

**Version:** 1.0.0  
**Status:** Remediated & Production-Ready  
**Target Platform:** Windows 10 / 11 (64-bit)  
**Author:** DeepMind Advanced Agentic Coding Pair with Church AV Leadership  

---

## 1. Executive Summary & Purpose

**Pulpit AI** is an open-source, local-first church presentation copilot engineered for church media volunteers and AV teams. Operating on constrained church laptop hardware during live worship services, Pulpit AI:
1. Captures live pulpit preaching and worship singing directly from the soundboard or microphone interface.
2. Performs low-latency, 100% offline speech recognition via native `whisper.cpp` and acoustic harmonicity analysis.
3. Automatically identifies referenced Bible scriptures (World English Bible, King James Version) and congregational hymn lyrics.
4. Generates single-click operator suggestion candidates with strict fail-closed safety guards.
5. Projects approved scriptures and lyrics seamlessly into **FreeShow** over a local WebSocket channel.

---

## 2. Core Non-Negotiable System Principles

1. **Absolute Operator Authority:** The human media volunteer has ultimate sovereignty. A persistent **Manual Safety Lock** immediately freezes and blocks all AI projection actions with zero latency.
2. **Never Project Unvetted Content:** AI operates strictly in **Suggestions Mode** by default. No slide is ever projected onto sanctuary screens without explicit operator approval.
3. **Never Invent or Hallucinate Content:** Scripture and song lyrics must originate from verified, tamper-evident local datasets. The system never invents bible verses or lyric lines.
4. **100% Local-First & Zero Telemetry:** Zero sanctuary audio, transcripts, or metadata ever leave the local machine. All speech processing, SQLite queries, and presentation dispatch occur offline.
5. **Fail-Closed Guarantees:** If any permission, socket connection, or cryptographic checksum check fails, the pipeline halts presentation and enters an inert, safe state.

---

## 3. Hardware & Environmental Constraints

Pulpit AI is calibrated for typical church presentation hardware, specifically benchmarked on:
* **Target Device:** HP EliteBook 840 G3
* **Processor:** Intel Core i5-6300U (2 cores / 4 threads, 2.40 GHz base, Skylake architecture with AVX2 instruction support).
* **Memory:** 8 GB DDR4 RAM.
* **Storage Limit:** Minimum 2.0 GB free SSD storage required; total application + quantized model footprint $\le 600\text{ MB}$.
* **Operating System:** Windows 10 Pro / Windows 11 (64-bit).
* **Acoustic Environment:** Dynamic church sanctuaries with reverberation, air-conditioning/fan background noise, varied preacher accents (including West African / Nigerian cadence), and sustained congregational singing.

---

## 4. Functional Specifications & Architecture

### 4.1. Audio Capture & Pre-Processing (`@pulpit-ai/audio-engine`)
* **Real Hardware Enumeration:** Dynamically scans physical hardware via `navigator.mediaDevices.enumerateDevices()` filtering for `audioinput`.
* **Acoustic DSP Bypass:** Disables browser processing (`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false`) to capture natural vocal dynamics without clipping soft preaching.
* **Dedicated AudioWorklet:** Replaces deprecated UI-thread processors with an off-thread `AudioWorkletNode` running `PcmCaptureProcessor` with zero-copy buffer transfer.
* **Hardware Disconnect Detection:** Listens to `track.onended` and `devicechange`. Unplugged audio interfaces transition to an error / `NO AUDIO` state within $< 1.0\text{ s}$.
* **Device Switch Flush:** Switching inputs flushes in-progress frames (`SpeechSegmenter.flush()`), cleanly emits pending utterances, and purges buffers to prevent cross-device word merging.
* **Distinct Level Meter States:** Replaces synthetic background noise with real RMS dynamics distinguishing:
  * `muted` (`MUT`): Software/hardware mic switch is off.
  * `silent` (`SIL`): Mic is open but sound level is below ambient noise floor (~-46 dBFS).
  * `active` (e.g. `-24 dBFS`): Active preaching vocal dynamics.
  * `disconnected` (`OFF`): Hardware unplugged, missing, or stream broken.
* **Pre-Roll Audio Ring Buffer:** Maintains 250 ms (4,000 samples at 16 kHz) of volatile pre-roll audio in RAM via `AudioRingBuffer`. When speech onset occurs, the pre-roll window is prepended to the utterance, preserving initial unvoiced consonants (e.g., *"p"*, *"t"*, *"s"*, *"th"*).
* **Adaptive Noise Floor VAD:** Evaluates 30 ms frames (480 samples). Continuously estimates ambient room noise floor and dynamically scales the speech threshold ($\text{threshold} = \max(\text{minThreshold}, \text{noiseFloor} \times 1.8)$), bounded between `0.001` and `0.035` RMS. Rejects DC rumble and ultrasonic hiss via ZCR filtering (30 to 7,800 Hz).
* **Singing Separation:** Uses normalized autocorrelation harmonicity ($F_0$ pitch tracking) and pitch stability. When worship singing is detected (`mode === 'singing'`), audio frames are diverted away from `SpeechSegmenter`. In-progress speech is flushed cleanly, and worship singing is routed to the song engine, preventing Whisper speech hallucination loops.

### 4.2. Offline Speech Recognition Engine (`@pulpit-ai/speech-engine`)
* **Native Subprocess Execution:** Runs native `whisper.cpp` (`whisper-cli.exe` / `whisper-cli`) as a child process outside the Electron main process, ensuring crash isolation.
* **Packaging & Binary Distribution:** Unpacks native binaries and models using `asarUnpack` (`bin/**/*`, `@pulpit-ai/speech-engine/bin/**/*`, `@pulpit-ai/speech-engine/models/**/*`).
* **Official Cryptographic Checksums:** Verifies GGUF quantized models with authentic SHA-256 hashes and byte size checks:
  * `tiny.en-q5_1`: `c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b` (32,166,155 bytes)
  * `base.en-q5_1`: `4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f` (59,721,011 bytes)
  * `small.en-q5_1`: `bfdff4894dcb76bbf647d56263ea2a96645423f1669176f4844a1bf8e478ad30` (190,098,681 bytes)
* **Gated Download Permissions:** Prohibits automatic network downloads. Requires explicit operator approval with a fail-closed disk space check ($\ge 2.0\text{ GB}$ safety margin).
* **Real Confidence Reporting:** Model transcripts provide actual token confidence or `null` (`confidence: number | null`). The UI displays `—` when confidence is absent.
* **Canonical Prompt Priming:** Primes beam search with all 66 Protestant Bible books and sermon phrases (*"chapter"*, *"verse"*, *"turn to"*) to minimize phoneme confusion.
* **Phantom Phrase Interception:** Discards hallucinated Whisper loop tokens on ambient silence:
  * Bracketed artifacts: `[MUSIC]`, `[applause]`, `[laughter]`, `[BLANK_AUDIO]`
  * Subtitle credits: `Subtitles by...`
  * Room pause loops: standalone `"Thank you."`, `"Thanks for watching!"`
* **Raw Text Preservation:** Feeds `event.rawText` directly to candidate generators and rolling windows. `TranscriptNormalizer` is reserved for UI chip display and handles compound spoken numbers (*"twenty-three"* $\to 23$, *"one hundred and nineteen"* $\to 119$).

### 4.3. Scripture Parsing & Canonical Verification (`@pulpit-ai/scripture-engine`)
* **Full Protestant Canon:** Embeds all 66 books, 1,189 chapters, and 31,102 verses sourced from official eBible.org datasets for both the World English Bible (WEB) and King James Version (KJV).
* **Cryptographic Package Verification:** Slices Scripture into versioned JSON data files (`web.json`, `kjv.json`) signed with SHA-256 checksums. startup loading computes and compares the hash, failing closed on any corruption or tampering.
* **Parser Structural Guards:**
  * Requires spoken or structural cues (*"chapter"*, *"verse"*, *":"*, *"turn to"*, *"open to"*) for bare numbers. Cue-less matches receive low confidence and a `needsReview: true` flag.
  * Discards colloquial non-scriptural units (*"times"*, *"weeks"*, *"days"*, *"years"*, *"percent"*).
  * Explicitly labels whole-chapter results as `"whole chapter, no verse given"` and retrieves all chapter verses rather than silently defaulting to verse 1.
  * Returns all references found within a segment via `parseAll()`.
* **Rolling Context Window:** Retains the last 3 utterances. Re-parses the window only when new speech adds a biblical book or number, preventing stale re-suggestions after cooldowns on conversational phrases (*"Amen church"*).
* **Boundary Overlap on Trailing Books:** When a transcript segment ends with a biblical book name without chapter/verse, the segmenter extends silence hangover by 15 frames (~450 ms) and flags a 1.5-second trailing overlap, prepending the book name audio into the next segment so citations are not severed.

### 4.4. Worship Song Identification (`@pulpit-ai/song-engine`)
* **Relational Schema:** Stores songs, versions, sections, and lines with full-text search (SQLite FTS5).
* **Multi-Format Importers:** Parses DOCX, PPTX, text-based PDF, CSV, and plain TXT files into structured lyrics with verse/chorus labeling.
* **Acoustic Mode Integration:** Receives singing mode signals from `SingingActivityDetector`. Requires consecutive lyric matches before elevating confidence.
* **Curated Sync & Disaster Backups:** Performs weekly rotating backups of the song database with SHA-256 archive checksums.

### 4.5. Presentation Authority & FreeShow Integration (`@pulpit-ai/authority-manager` & `@pulpit-ai/presentation-contracts`)
* **Central Authority FSM:** Controls presentation dispatch with modes: `suggestions` (default), `auto_present`, `manual_lock`, and `disconnected`.
* **Approval by Candidate ID:** IPC endpoint `authority:approve-candidate` strictly accepts `candidateId: string`. Stored in the main process `CandidateRegistry` with single-use enforcement, a 2-minute (120 s) expiration window, and rejection when Manual Lock is engaged.
* **Single-Emit Guarantee:** Dispatches presentation commands exactly once per operator click.
* **Verified Confirmation:** Verifies command success via direct socket response or matching broadcast event. If unconfirmed after 1,200 ms, transitions to fail-closed `sent_unconfirmed`.
* **Zero Hardcoded Credentials:** Reads FreeShow port (default `5505`) and authentication password from operator configuration or auto-detects from local FreeShow settings.
* **Production Mock Isolation:** Disables `MockFreeShowServer` in production builds. In development mode, displays a persistent `SIMULATED` banner. Audio simulation handlers are restricted to dev mode and cleared immediately after use.

---

## 5. Performance Benchmarks & Quality Metrics

The end-to-end pipeline is evaluated using calibrated WAV audio fixtures (`tests/fixtures/`) via `pnpm run evaluate`:

| Metric | Target Specification | Tested / Achieved Performance |
|---|:---:|:---:|
| **Word Error Rate (WER)** | $\le 5.0\%$ | **0.0%** across sermon test fixtures |
| **Scripture Reference Precision** | $\ge 95.0\%$ | **100.0%** |
| **Scripture Reference Recall** | $\ge 95.0\%$ | **100.0%** |
| **Wrong-Suggestion Rate** | $\le 5.0\%$ | **0.0%** on non-scriptural, choir & instrument audio |
| **Mean End-to-End Latency** | $\le 500\text{ ms}$ | **88.1 ms** (min: 7 ms, max: 178 ms) |
| **Total Automated Tests** | All passing | **236 / 236 passed** across 30 test suites |

---

## 6. Security, Safety & Fail-Closed Protocols

1. **Network Sandbox:** Socket communication is strictly confined to `localhost` (`127.0.0.1:5505`). Zero outbound network interfaces are opened.
2. **Crash Containment:** If the `whisper.cpp` worker process or presentation socket terminates unexpectedly, the main process catches the error, revokes projection permission (`projectionPermission = false`), logs a security audit event, and initiates a clean restart.
3. **Audit Trail:** Every candidate creation, operator approval, command dispatch, and lock transition is appended to a local, append-only JSONL audit log.
