# FreeShow Integration Specification

## 1. Network Interfaces & Protocols
* **Remote Protocol (Port 5510):** Primary FreeShow 1.3.x remote control socket. Authenticates via `{ channel: 'ACCESS', data: authKey }` and broadcasts live output changes via `{ channel: 'OUT', data: ... }`. Commands are dispatched over `REMOTE` with `API:<action>` channels.
* **REST HTTP / Legacy Socket.io (Port 5505):** `http://localhost:5505/?action=<ACTION>&data=<JSON>`. Supports synchronous acknowledgment callbacks.
* **OSC over UDP:** Port `5507` (fallback)

## 2. Authentication & Credential Resolution
* **Dynamic Resolution:** Authentication key is read from operator settings (`process.env.FREESHOW_AUTH_KEY`) or automatically extracted from the local FreeShow installation (`%APPDATA%/FreeShow/settings.json -> serverData.remote.password`).
* **Zero Hardcoded Keys:** Hardcoded default credentials (such as `'1445'`) are strictly prohibited in the codebase. If no password is configured and FreeShow is unauthenticated, the adapter connects without an auth token.

## 3. Command Flow & Central Authority Guard
Every command sent to FreeShow must pass through the `AuthorityManager`:
1. `FreeShowAdapter.dispatchCommand(command)` is invoked.
2. `AuthorityManager.authorizeCommand(command)` verifies permissions:
   * Rejects un-allowlisted action names with security severity.
   * If `source === 'ai'`: strictly rejects if `manualLockActive`, `operatorMode === 'suggestions'`, or `operatorMode === 'manual'`.
   * Only approves scoped operator-approved commands or direct manual actions.
3. **Reference Validation:** For `start_scripture`, commands must specify an explicit scripture reference (`reference`, `referenceDisplay`, or canonical book/chapter/verse). Commands lacking a valid reference are rejected immediately with `success: false`. Silent fallback references (`John 3:16` or `43.3.16`) are strictly forbidden.
4. **Single-Emission Dispatch:** `start_scripture` is emitted to FreeShow exactly once per approval.
5. **Confirmation vs. Unconfirmed State:**
   * Pulpit AI does not use synthetic "fake success" timers.
   * Commands are marked as `status: 'confirmed'` only when FreeShow acknowledges via callback or an observed output event (`OUT` or `data`) matches the dispatched content.
   * If neither acknowledgment nor matching output event occurs within 1200ms, the command fails closed with `{ success: false, status: 'sent_unconfirmed' }`.

## 4. Telemetry & State Synchronization
FreeShow pushes state updates via `data` events and `REMOTE` output broadcasts:
* `slide_number`: active zero-based slide index.
* `show_id`: active presentation or song title.
* `slide_text`: literal text currently rendered on the live presentation screen.
* `is_cleared`: boolean indicator if output layers are hidden.

## 5. Development Mock Server & Simulation Isolation
* **Production Guard:** `MockFreeShowServer` is strictly disabled in production builds (`app.isPackaged || process.env.NODE_ENV === 'production'`). If no physical FreeShow instance is reachable, Pulpit AI reports disconnected rather than silently creating a virtual mock.
* **Simulated Status Banner:** In local development where the mock server is running, the adapter state is explicitly set to `status: 'simulated'`. The UI displays a persistent amber `SIMULATED` banner and `FreeShow: SIMULATED` status indicator to ensure the operator is never misled into believing a physical projector is connected.
* **Simulation Guard & Mock Isolation:** Audio simulation IPC handlers (`audio:simulate-speech` and `audio:simulate-singing`) are blocked in production builds. In development, any wildcard mock transcripts registered during a simulate call are consumed single-use and immediately cleared after ingestion, guaranteeing that test phrases can never leak into or override live microphone inference.
