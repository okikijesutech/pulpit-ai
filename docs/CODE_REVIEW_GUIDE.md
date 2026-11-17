# Pulpit AI Code Review & Engineering Standards Guide

This guide adapts proven code review practices from Google, Meta, Amazon, Apple, and Microsoft to **Pulpit AI**'s mission-critical live church presentation environment.

---

## 1. Core Principle: Machines Check Mechanics, Humans Check Risk

Never ask a reviewer to catch missing imports, dead variables, or broken tests manually. Run the automated pre-submit gate locally before opening a Pull Request:

```bash
pnpm run check:pr
```

This single command executes:
1. **`pnpm run build`** — Compiles all 10 workspace packages + Electron renderer & main.
2. **`pnpm run typecheck:strict`** — Enforces `--noUnusedLocals --noUnusedParameters` across every package and target.
3. **`pnpm run lint`** — Runs ESLint v9 (TypeScript + React Hooks + security rules).
4. **`pnpm test`** — Runs all 39+ unit & integration test suites.
5. **`pnpm run evaluate`** — Enforces the AI sermon accuracy gate (Precision ≥ 95%, Recall ≥ 95%, WER bounds).

---

## 2. PR Sizing & Stacked Changes (Google / Meta Standard)

- **Target size**: **< 400 lines changed** per PR whenever possible.
- **One logical concern per PR**: Do not mix a UI redesign, a database schema migration, and a refactor in the same PR.
- **Conventional commits**: Use `feat(...)`, `fix(...)`, `refactor(...)`, `perf(...)`, `security(...)`, `test(...)`, or `ci(...)`.

---

## 3. The 7-Point FAANG Review Checklist

Review every PR top-to-bottom in this priority order:

| # | Dimension | Pulpit AI-Specific Verification |
| :--- | :--- | :--- |
| **1** | **Architecture & Boundaries** | Does every projection action route through `AuthorityManager` and `ALLOWLISTED_FREESHOW_ACTIONS`? |
| **2** | **Functionality & Edge Cases** | What happens when FreeShow disconnects, mic drops, or an invalid reference (`John 99:99`) is spoken? |
| **3** | **Operational Safety (ORR)** | Does the code fail *closed*? Are timers, intervals, and `whisper-cli` child processes cleaned up on crash/exit? |
| **4** | **Security & Privacy** | Are IPC inputs validated in `apps/desktop/src/main/ipc/ipcValidation.ts`? Does CSP stay strict? Is 100% of audio local-only? |
| **5** | **Performance & Resources** | Are SQLite queries indexed (no `UPPER()`/`LOWER()` defeating B-trees)? Are 60Hz audio updates isolated in `audioStore`? |
| **6** | **Automated Tests** | Does the PR include tests that would fail if the new logic regressed? |
| **7** | **Readability & Modularity** | Are components kept under ~400–500 lines? Is duplicate data kept in `@pulpit-ai/shared-types`? |

---

## 4. The "3-Hat" Review Protocol (For Solo Developers & Small Teams)

When reviewing your own PR (or using AI review assistants), inspect the `git diff` three separate times wearing one hat at a time:

1. **Security Hat**: Inspect every IPC handler, file path, shell spawn, and CSP header. Try to break it with malformed inputs (`null`, `../../etc/passwd`, 50 MB strings, non-allowlisted action names).
2. **Performance & Reliability Hat**: Run `pnpm run benchmark`. Check for `O(N)` loops on hot paths (audio frames, search inputs, Bible queries) and verify zero leaked timers/listeners.
3. **Sunday Operator Hat**: Imagine running a live 500-person service at 9:00 AM with a fast-preaching pastor. Is every action reachable in 1 click or 1 hotkey? Is Manual Lock unmistakable?

---

## 5. GitHub Branch Protection Recommended Settings

To enforce this workflow on `main`:
1. Go to **GitHub → Settings → Branches → Branch protection rules (`main`)**.
2. Enable **Require a pull request before merging**.
3. Enable **Require review from Code Owners** (uses `.github/CODEOWNERS`).
4. Enable **Require status checks to pass before merging** and select:
   - `Build, Lint, Strict Typecheck & Tests (ubuntu-latest)`
   - `Build, Lint, Strict Typecheck & Tests (windows-latest)`
   - `Build, Lint, Strict Typecheck & Tests (macos-latest)`
   - `Security & Electron Sandbox Gate`
