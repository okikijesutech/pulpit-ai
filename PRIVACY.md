# Privacy & Data Sovereignty Policy — Pulpit AI

**Effective Date:** November 2026  
**Commitment:** 100% Local-First, Zero Cloud Transmission, Zero Sanctuary Audio Retention  

Pulpit AI is engineered specifically for worship sanctuaries, houses of prayer, and religious assemblies. We operate under the foundational principle that **sanctuary speech, pastoral prayers, and congregational worship are sacred and strictly private**.

---

## 1. Zero Cloud Transmission & Zero Telemetry

1. **No External Network Calls:** Pulpit AI operates 100% offline. The application contains zero third-party telemetry libraries, zero tracking pixels, zero analyticsSDKs, and zero cloud error-reporting services.
2. **Local Loopback Communication Only:** The only network socket opened by Pulpit AI is a local WebSocket client connecting directly to FreeShow on the loopback interface (`ws://127.0.0.1:5505`). No packets ever leave the physical host machine.
3. **No Cloud LLM Dependencies:** Speech recognition, canon parsing, and lyric identification are executed exclusively on the local CPU using native C++ binaries (`whisper.cpp`) and local SQLite databases. We never transmit audio to cloud speech APIs (such as OpenAI Whisper API, Google Cloud Speech-to-Text, or AWS Transcribe).

---

## 2. Volatile Audio Processing (Zero Raw Audio to Disk)

1. **Strict Volatile In-Memory Processing:** Physical microphone streams ingested by Pulpit AI are held temporarily in volatile memory (RAM) inside an off-thread `AudioWorklet` and a bounded circular buffer (`AudioRingBuffer`, 250 ms pre-roll capacity).
2. **No Audio Persistence:** Raw microphone audio is **never written to the local SSD or hard drive**. Once speech segments are transcribed by the local worker, the temporary audio memory is immediately cleared and overwritten.
3. **Immediate Memory Flush:**
   * Switching audio devices (`SpeechSegmenter.setSourceId`) immediately purges all pending frames from RAM.
   * Engaging the **Manual Safety Lock** freezes all AI pipelines.
   * Exiting the application instantly frees all in-memory audio buffers.

---

## 3. Cryptographic Model Integrity & Gated Downloads

1. **No Silent Downloads:** Pulpit AI will never initiate automatic, background, or unprompted downloads over the Internet.
2. **Explicit Operator Authorization:** Downloading a speech model requires an explicit operator confirmation prompt (`models:check-download`) showing the model name, exact byte size, and free storage check.
3. **Storage Safety Margin:** Downloads are blocked fail-closed if the target storage drive has less than a **2.0 GB safety margin**.
4. **Cryptographic Checksums:** Model files are validated against official SHA-256 cryptographic hashes before they are loaded into the inference engine. Any corrupted or tampered file is rejected immediately.

---

## 4. Local Audit Trails & Data Retention

1. **Local-Only Audit Log:** Pulpit AI maintains a local, append-only JSONL audit log stored in the user's local application data folder (`%APPDATA%/pulpit-ai/audit/audit.jsonl`).
2. **Audit Contents:** The audit log records operational events:
   * System startup and shutdown timestamps.
   * Manual Safety Lock activations and mode changes.
   * Scripture references and hymn titles approved for projection.
   * FreeShow command delivery confirmations.
3. **No Speech Audio or Full Transcripts in Audit:** Audit records contain only timestamped action identifiers and suggestion titles; raw audio waveforms and full conversational sermon transcripts are never logged to disk.
4. **User Deletion:** The operator retains complete ownership of all local data and can delete the audit log or song database at any time without impacting system operation.

---

## 5. Biblical Content & Copyright Compliance

1. **Public Domain Translations:** Sourced full-Bible datasets (World English Bible and King James Version 1769) are dedicated to the Public Domain worldwide and contain zero digital rights management (DRM) or tracking identifiers.
2. **Church Licensing Independence:** Song catalogs and imported lyric arrangements remain the exclusive property and responsibility of the local church pursuant to their respective CCLI or Christian Copyright Solutions (CCS) licenses.

---

## 6. Summary Guarantee

| Data Type | Stored on Disk? | Sent to Cloud? | Retained After Exit? |
|---|:---:|:---:|:---:|
| **Sanctuary Audio** | **NO** (Volatile RAM only) | **NO** | **NO** |
| **Sermon Transcripts** | **NO** (Volatile state only) | **NO** | **NO** |
| **Bible Datasets** | YES (Local JSON/SQLite) | **NO** | YES |
| **Hymn Database** | YES (Local SQLite) | **NO** | YES |
| **Action Audit Log** | YES (Local `%APPDATA%`) | **NO** | YES (User controlled) |
| **Telemetry / Analytics** | **NO** (Does not exist) | **NO** | **NO** |
