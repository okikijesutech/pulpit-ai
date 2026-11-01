# Pulpit AI — Threat Model & Security Posture

## 1. Asset Inventory
* Presentation stream (FreeShow projection outputs).
* Live audio feed from church microphones/mixers.
* Local church database (imported song libraries, translations, notes).
* Operator authority state.

## 2. Threat Analysis & Mitigations

### THR-01: Erroneous AI Projection (Accidental Slide Change)
* **Impact:** Critical embarrassment or distraction during church services.
* **Mitigation:**
  * Mode defaults to `suggestions`. Automatic mode is strictly disabled.
  * Central Authority Manager enforces strict fail-closed checks immediately before dispatch.
  * Instant one-click Emergency Manual Lock drops all pending and in-flight AI actions.

### THR-02: Presentation Control Interface Hijacking
* **Impact:** Unauthorized remote attacker projects inappropriate content onto sanctuary screens.
* **Mitigation:**
  * FreeShow adapter binds strictly to loopback (`127.0.0.1`).
  * Authentication token support if configured in FreeShow.
  * Strict allowlist of commands; zero arbitrary shell or script execution.

### THR-03: Acoustic Privacy Leakage
* **Impact:** Private pastoral conversations or prayer sessions recorded or leaked.
* **Mitigation:**
  * Privacy-by-default architecture.
  * Audio captured in volatile in-memory ring buffers; zero raw audio persisted to disk.
  * Zero telemetry or cloud upload of audio frames.

### THR-04: Subprocess Crash Privilege Escalation
* **Impact:** Recognition worker crash leaves authority state in an undefined or permissive state.
* **Mitigation:**
  * Crash containment: The Authority Manager resides exclusively in the main process.
  * Any worker crash or timeout forces `projectionPermission = false`.
