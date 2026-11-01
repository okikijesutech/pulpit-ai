# Pulpit AI — Test Plan & Safety Verification

## 1. Test Architecture
* **Testing Runner:** Vitest v2
* **Unit Testing:** `@pulpit-ai/authority-manager`
* **Integration Testing:** `@pulpit-ai/presentation-contracts` with `MockFreeShowServer`

## 2. Test Execution
```bash
# Run all workspace test suites
pnpm test
```

## 3. Key Safety Acceptance Tests
1. **Un-allowlisted Action Rejection:** Ensures arbitrary shell commands or unvetted actions are dropped with security audit level.
2. **Suggestions Mode Interception:** Asserts that in the default suggestions mode, an AI-originated projection command never touches the network (zero commands received by the target server).
3. **Manual Safety Lock Override:** Asserts that engaging the manual safety lock immediately blocks subsequent or in-flight commands.
4. **Disconnection Handling:** Asserts that loss of connection to FreeShow immediately transitions the authority manager to a fail-closed state.
