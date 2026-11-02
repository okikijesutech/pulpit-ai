# Security and Authority Architecture

## 1. Core Principle: Human Control Over AI

Pulpit AI adheres strictly to the non-negotiable architectural requirement: **human church operators retain absolute authority over the presentation screen at all times**.

AI components (speech recognition, Scripture detection, lyric matching) are treated as **untrusted suggestion generators**. No AI subsystem may ever:
- Communicate directly with the FreeShow presentation software.
- Force a slide, show, or scripture passage to the live projection display.
- Bypass the Central Authority Manager.

```
       [ Microphone / Sound Board ]
                    │
                    ▼
       [ Audio Acquisition & VAD ]
                    │
                    ▼
     [ Local Speech/Singing Engines ]
                    │ (Candidate Suggestions Only)
                    ▼
    ╔═══════════════════════════════════╗
    ║     Central Authority Manager     ║ ◄── Human Operator Control
    ║     - Fail-Closed Policy Check    ║ ◄── Manual Safety Lock (Freeze)
    ║     - Allowlisted Action Filter   ║ ◄── Mode Selector (Suggestions/Manual)
    ║     - Tamper-Evident Audit Trail  ║
    ╚═══════════════════════════════════╝
                    │ (Authorized & Audited Commands)
                    ▼
         [ FreeShow API Adapter ]
                    │ (WebSocket ws://127.0.0.1:5505)
                    ▼
       [ FreeShow Presentation Display ]
```

---

## 2. Authority State Model & Precedence Matrix

The Central Authority Manager enforces the following precedence hierarchy:

1. **Human Manual Safety Lock (`manualLockActive = true`):**
   - Immediate freeze of all automated or queued commands.
   - When engaged, all projection commands are rejected fail-closed.
   - Requires explicit human click to release.
2. **Human Operator Action (`source = 'operator'`):**
   - Operator clicks (slide navigation, manual Scripture lookup, song selection) always take immediate priority over AI suggestions.
   - Dispatched immediately to FreeShow without waiting for AI queues.
3. **AI Suggestion Candidate (`source = 'ai'`):**
   - In default `suggestions` mode, candidates are queued for operator review.
   - An AI candidate cannot execute until explicitly approved by the human operator.
   - In `manual` mode, background suggestion generation is fully suppressed.

---

## 3. Strict Action Allowlist

The presentation adapter enforces a hardcoded allowlist of permitted FreeShow actions (`packages/shared-types/src/freeshow.ts`). Any attempt to dispatch an action outside this allowlist is blocked and logged as a security alert:

```typescript
export const ALLOWLISTED_FREESHOW_ACTIONS = [
  'next_slide',
  'previous_slide',
  'index_select_slide',
  'name_select_slide',
  'start_show',
  'name_select_show',
  'start_scripture',
  'scripture_next',
  'scripture_previous',
  'clear_all',
  'clear_slide',
  'clear_background',
  'clear_overlays',
  'restore_output',
  'get_output',
  'get_output_slide_text',
  'get_output_group_name'
] as const;
```

---

## 4. Network Isolation and Sandboxing

To eliminate external network attack vectors:
1. **Localhost Only:** Presentation APIs and WebSocket connections are restricted to `127.0.0.1:5505`. No presentation control ports are ever exposed to the local network or internet.
2. **Electron Sandbox:** The desktop UI runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
3. **Content Security Policy (CSP):**
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* http://localhost:*;
   ```
4. **Zero Cloud Dependencies:** Speech recognition (`whisper.cpp`), Scripture storage (`node:sqlite`), and song library matching run 100% locally on the host machine. No audio frames or transcripts leave the church sanctuary.

---

## 5. Tamper-Evident Audit Trail

Every state transition, mode change, lock engagement, candidate creation, approval, and rejection is recorded in an in-memory and persistent SQLite audit log with cryptographic timestamps and actor provenance (`operator`, `ai`, or `system`).
