## Summary
<!-- Keep PRs small & focused (<400 lines changed when possible). Describe WHAT changed and WHY. -->

- **Change Type**: [ ] Feature  [ ] Bug Fix  [ ] Refactor / Cleanup  [ ] Security / Performance
- **Scope**: <!-- e.g. apps/desktop, packages/scripture-engine -->

---

## Live Sunday Operational Readiness (Fail-Closed Safety Check)
- [ ] All projection commands route through `AuthorityManager` and `ALLOWLISTED_FREESHOW_ACTIONS`
- [ ] Manual Safety Lock blocks all AI/operator projection when engaged
- [ ] Failure modes degrade safely (no blank freezes, no orphan child processes, no accidental projection)

## Security & Local-First Privacy Check
- [ ] Any new/modified IPC endpoints validate input types, lengths, and bounds in `ipcValidation.ts`
- [ ] No cloud audio transmission or external network dependencies introduced
- [ ] Electron `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, and strict CSP preserved

## Performance & Cross-Platform Check
- [ ] No unindexed full-table database scans or main-thread blocking loops introduced
- [ ] High-frequency audio/UI updates are isolated in Zustand selectors (no full-tree re-renders)
- [ ] File paths work across Windows, macOS, and Linux (no hardcoded `APPDATA`/`USERPROFILE`)

## Automated Verification Evidence
Run `pnpm run check:pr` locally before requesting review:
- [ ] `pnpm run build` passed across all 10 packages
- [ ] `pnpm run typecheck:strict` passed with 0 errors
- [ ] `pnpm run lint` passed with 0 errors
- [ ] `pnpm test` passed (include test count: `___ / ___`)
- [ ] `pnpm run evaluate` passed (Precision >= 95%, Recall >= 95%)
- [ ] `pnpm run benchmark` reviewed (if touching audio, DB, search, or AI paths)
