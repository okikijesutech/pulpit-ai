# Architectural Decision Records (ADRs)

## ADR-001: Runtime Stack Selection (Electron + TypeScript + Native whisper.cpp)
* **Date:** 2026-11-01
* **Status:** Confirmed & Approved
* **Context:** Target hardware is an HP EliteBook 840 G3 (Intel Core i5-6300U, 2 cores / 4 threads, 8 GB RAM, 11.04 GB free SSD storage on Windows 10 Pro).
* **Decision:** Selected Option 2 (Electron desktop shell with native C++ `whisper.cpp` worker subprocesses and SQLite FTS5) over Option 1 (Python/FastAPI) and Option 3 (Rust/Tauri).
* **Rationale:**
  * Python + PyTorch requires 3–5 GB of disk space (which would exhaust the 11 GB available) and consumes 1 GB baseline RAM.
  * `whisper.cpp` compiled with AVX2 runs in < 200 MB disk space and 150–350 MB RAM for quantized models (`base.en-q5_1`).
  * Separate OS processes ensure fail-closed crash isolation.

## ADR-002: FreeShow State Observability and Authority Guard
* **Date:** 2026-11-01
* **Status:** Confirmed & Approved
* **Context:** FreeShow does not provide synchronous pre-event hooks to intercept manual operator clicks inside its GUI.
* **Decision:** Pulpit AI does not attempt to lock or hijack the FreeShow UI. Instead, the Central Authority Manager controls Pulpit AI's internal dispatch channel and revokes AI projection permissions instantly when manual activity or connection instability is detected.

## ADR-003: Public Domain and Verified Content Packaging
* **Date:** 2026-11-01
* **Status:** Confirmed & Approved
* **Context:** Modern Bible translations and contemporary worship lyrics are protected by copyright law and cannot be bundled in open-source distributions.
* **Decision:** Bundle the World English Bible (WEB) and King James Version (KJV) alongside pre-1928 public domain hymns. Provide an extensible `.pulpit-bible` and file import pipeline for local church licenses.
