# Pulpit AI — System Architecture

## Overview
Pulpit AI is designed as a modular, local-first desktop application that integrates with FreeShow. It operates with a strict separation between UI, presentation authority, audio acquisition, speech recognition, and content storage.

## Core Principles
1. **Human Authority Above AI:** The operator has instant, absolute authority over projections.
2. **Central Authority Gatekeeper:** No presentation command can be dispatched to FreeShow without passing through the central `AuthorityManager`.
3. **Fail-Closed Design:** In the event of network disruption, worker crash, or state ambiguity, the system defaults to rejecting projection commands.
4. **Crash Containment:** Recognition and audio workers run in isolated processes. A crash in an inference worker cannot crash the operator UI or elevate permissions.

## Component Architecture

```mermaid
flowchart TD
    UI[Operator UI - React/Zustand] -->|Strict IPC| Main[Electron Main Process]
    
    subgraph AuthorityCore["Authority & Protection"]
        AM[Central Authority Manager]
        AL[Audit Logger]
        AM --- AL
    end

    Main --> AM
    AM -->|Verified Commands| FS_Adapter[FreeShow Adapter]
    FS_Adapter -->|Port 5505 (Socket.io/REST)| FS[FreeShow Instance]

    subgraph Workers["Isolated Background Workers"]
        Audio[Audio Capture Worker]
        VAD[Voice Activity Detection]
        STT[whisper.cpp AVX2 Subprocess]
        Audio --> VAD --> STT
    end

    STT -->|Transcribed Fragments| ContentEngine[Verified Content Retrieval]
    ContentEngine -->|Candidates| AM
    AM -->|Suggestions Only| UI
```

## State Machine
The Authority Manager maintains the following operational states:
* **`suggestions` (Default):** AI listens and suggests candidate content; no projection command is dispatched without explicit manual operator approval.
* **`manual`:** Operator actively drives FreeShow; AI commands are blocked.
* **`automatic` (Future):** Strictly disabled by default; requires active opt-in and confidence thresholds.
* **`manualLockActive` (Kill Switch):** Immediately overrides all modes and drops 100% of AI-originated projection actions.
