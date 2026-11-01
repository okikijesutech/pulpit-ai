# FreeShow Integration Specification

## 1. Network Interfaces & Protocols
* **REST HTTP:** `http://localhost:5505/?action=<ACTION>&data=<JSON>`
* **WebSocket / Socket.io:** `ws://localhost:5505`
* **OSC over UDP:** Port `5507` (fallback)

## 2. Command Flow & Central Authority Guard
Every command sent to FreeShow must pass through the `AuthorityManager`:
1. `FreeShowAdapter.dispatchCommand(command)` is invoked.
2. `AuthorityManager.authorizeCommand(command)` verifies permissions:
   * Rejects un-allowlisted action names with security severity.
   * If `source === 'ai'`: strictly rejects if `manualLockActive`, `operatorMode === 'suggestions'`, or `operatorMode === 'manual'`.
   * Only approves scoped operator-approved commands or direct manual actions.
3. If approved, `FreeShowAdapter` emits `action` payload over Socket.io and awaits response confirmation.

## 3. Telemetry & State Synchronization
FreeShow pushes state updates via `data` events:
* `slide_number`: active zero-based slide index.
* `show_id`: active presentation or song title.
* `slide_text`: literal text currently rendered on the live presentation screen.
* `is_cleared`: boolean indicator if output layers are hidden.
