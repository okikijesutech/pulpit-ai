# PULPIT AI

## Agent-Ready Product Build Specification

**Version:** 1.0\
**Status:** Product direction agreed; implementation architecture must
be validated before coding\
**Primary implementation agent:** Google Antigravity\
**Initial platform:** Windows desktop\
**Presentation engine:** FreeShow\
**Product model:** Open-source, local-first, self-hosted by churches

------------------------------------------------------------------------

## 1. Instructions to the Build Agent

You are the lead software architect and implementation agent for
**Pulpit AI**.

Your task is to build a reliable, secure, modular desktop application
that assists church presentation operators by listening to a church
service, recognising spoken words and sung lyrics, finding matching
approved content, and presenting suggestions or controlled presentation
actions through FreeShow.

### Non-negotiable rules

1.  **Human authority always takes priority.** The operator must be able
    to take control immediately.
2.  **Accuracy before automation.** Suggestions are the default.
    Automatic projection is a later capability and must remain disabled
    until explicitly enabled and validated.
3.  **Never invent Scripture or song lyrics.** Retrieve content from
    approved, verified libraries only.
4.  **Local-first by default.** Audio and church content stay on the
    church's machine unless an administrator explicitly enables a cloud
    feature.
5.  **Fail closed.** If the app cannot determine whether it is allowed
    to project, it must not project.
6.  **Modular architecture.** Recognition engines, content sources, and
    presentation integrations must be replaceable.
7.  **Security and privacy are product requirements, not later
    enhancements.**
8.  **Do not silently substitute content.** If an exact translation,
    song version, or reference is unavailable, tell the operator.
9.  **Do not let AI bypass the authority manager.** Every AI-originated
    presentation action must pass through one central permission and
    validation layer.
10. **Do not build a replacement for FreeShow.** Pulpit AI is a separate
    application that integrates with FreeShow.

### How to work

-   Begin by inspecting the existing repository and development
    environment.
-   Identify what already exists before creating or replacing files.
-   Produce an architecture proposal and implementation plan before
    substantial coding.
-   Compare viable desktop/runtime and audio-processing approaches
    against the actual target hardware.
-   Explain trade-offs, risks, dependencies, licensing, and operational
    costs.
-   Do not assume a technology is selected merely because it appears in
    this document as a candidate.
-   Keep documentation current as decisions are made.
-   Work in small, reviewable phases with tests.
-   Do not make broad rewrites without explaining why and receiving
    approval.
-   Never store secrets in source control.
-   Do not download large AI models automatically without user
    confirmation and a disk-space check.

**First task:** inspect the repository and machine, then return an
implementation-readiness report. Do not begin feature implementation
until the user approves the proposed architecture and first milestone.

------------------------------------------------------------------------

## 2. Product Vision

Pulpit AI is an open-source desktop application that helps church
presentation operators keep slides aligned with the live service.

It listens to one selected audio source at a time---such as a church
mixer feed or a microphone---and uses speech and singing recognition to
identify likely Scripture references, songs, hymns, and other approved
presentation content.

It retrieves matching content from local church libraries and, where
configured, a curated shared library. It then presents candidates to the
operator. The operator remains in control.

### Product promise

**Pulpit AI helps the operator find the right content at the right
moment without taking authority away from the operator.**

### Product principles

-   Human control over AI automation.
-   Verified content over generated content.
-   Accuracy over speed where the two conflict.
-   Local-first processing and storage.
-   Transparent confidence and uncertainty.
-   Graceful operation without internet access.
-   Replaceable AI and integration components.
-   No punitive or opaque automation.

### Out of scope for the first release

-   Replacing FreeShow or building a complete presentation engine.
-   Unsupervised automatic projection.
-   Simultaneous capture and mixing of multiple audio devices.
-   Automatic generation of Bible passages or lyrics.
-   Treating sermon themes as sufficient evidence for a Scripture
    reference.
-   Requiring a paid cloud account for core functionality.
-   Assuming a large language model is necessary for the core
    recognition workflow.

------------------------------------------------------------------------

## 3. Confirmed Product Decisions

  -----------------------------------------------------------------------
  Area                                Decision
  ----------------------------------- -----------------------------------
  Recognition                         Both speech and singing

  Initial language                    English

  Later languages                     Yoruba, Igbo, Hausa

  Audio sources                       Mixer input and microphone

  Active audio sources                One at a time; switchable

  Content sources                     Imported church libraries and
                                      curated shared library

  Import formats                      TXT, DOCX, CSV, PPTX, PDF

  Scripture                           Approved translations and exact
                                      explicit references only

  AI behaviour                        Suggestions by default; automatic
                                      mode considered later

  Human control                       Always takes priority

  Deployment                          Open-source; churches install and
                                      operate it themselves

  Cloud                               Optional, never mandatory for core
                                      local operation

  Hardware starting point             Existing Windows laptop; exact
                                      specifications to be verified

  Presentation engine                 FreeShow

  Integration model                   Independent application integrating
                                      with FreeShow
  -----------------------------------------------------------------------

### Hardware information currently available

The user's previously reported machine is:

-   Windows 10
-   Intel Core i5 (exact generation/model unknown)
-   8 GB RAM
-   256 GB SSD
-   GPU details unknown

Do not select final inference models until the exact CPU, GPU, operating
system, free disk space, and audio hardware are checked.

------------------------------------------------------------------------

## 4. Users and Core Workflows

### Primary user: presentation operator

The operator needs to:

-   Select an audio input.
-   See whether audio is being received clearly.
-   See recognised speech or lyric fragments.
-   Review suggested songs or Scripture passages.
-   Approve, reject, or dismiss a suggestion.
-   Manually control FreeShow without AI interference.
-   Lock AI projection instantly.
-   See integration and recognition errors clearly.

### Secondary user: church administrator

The administrator needs to:

-   Install and configure the application.
-   Manage approved song and Scripture libraries.
-   Import church-owned content.
-   Review imported content before recognition can use it.
-   Configure FreeShow integration.
-   Configure optional shared-library synchronisation.
-   Manage backups, retention, and privacy settings.

### Typical service workflow

1.  Operator opens Pulpit AI and FreeShow.
2.  Pulpit AI connects to the local FreeShow instance.
3.  Operator selects one audio source.
4.  Pulpit AI shows input level and confirms audio capture.
5.  Recognition workers process audio and emit candidate events.
6.  The content retrieval layer searches approved local content.
7.  Candidate results appear with evidence and confidence indicators.
8.  Operator approves, rejects, or ignores suggestions.
9.  Only an explicitly permitted action can be sent to FreeShow.
10. The operator can take manual control or activate the safety lock at
    any time.

------------------------------------------------------------------------

## 5. Application Architecture

Build a modular desktop application with clear boundaries between the
user interface, audio capture, recognition, content retrieval, authority
decisions, and presentation integration.

### Logical components

1.  **Desktop shell and UI**
    -   Application lifecycle.
    -   Settings and device selection.
    -   Operator dashboard.
    -   Status, errors, and notifications.
2.  **Audio acquisition**
    -   Windows audio input discovery.
    -   Capture from one active input.
    -   Input-level monitoring.
    -   Buffering and device recovery.
3.  **Audio processing**
    -   Resampling and channel conversion.
    -   Voice activity detection.
    -   Segmentation.
    -   Separate speech and singing pipelines where appropriate.
4.  **Speech recognition**
    -   Speech-to-text.
    -   Transcript normalisation.
    -   Explicit Scripture reference extraction.
5.  **Singing recognition**
    -   Singing/lyric activity detection.
    -   Lyric transcription candidate generation.
    -   Matching against approved song lyrics.
6.  **Verified content retrieval**
    -   Song and lyric search.
    -   Bible reference resolution.
    -   Exact Scripture text retrieval from approved translations.
7.  **Candidate and confidence manager**
    -   Candidate ranking.
    -   Evidence tracking.
    -   Duplicate suppression.
    -   Ambiguity handling.
8.  **Presentation authority manager**
    -   Listening, suggesting, and projecting permissions.
    -   Manual lock.
    -   Approval checks.
    -   Emergency stop.
    -   Audit trail.
9.  **Presentation adapter**
    -   FreeShow connection.
    -   State observation.
    -   Allowlisted commands.
    -   Connection recovery.
10. **Local data and library management**
    -   SQLite database.
    -   Full-text search.
    -   Import pipeline.
    -   Backup and restore.
11. **Optional shared-library service**
    -   Synchronisation of curated, approved content.
    -   No dependency for local operation.

### Candidate technology stack

The following is a starting proposal, not a final mandate:

-   Desktop shell: Electron.
-   UI: React + TypeScript.
-   Styling: Tailwind CSS.
-   Components: shadcn/ui where useful.
-   State: Zustand.
-   Icons: Lucide.
-   Local database: SQLite with FTS5.
-   Speech recognition candidate: whisper.cpp.
-   Audio capture: Windows WASAPI through a suitable, maintained library
    or worker.
-   Presentation integration: FreeShow local REST/WebSocket API, with
    OSC considered only where useful.

### Architecture decision still required

Compare at least these approaches:

-   Electron UI + Python/FastAPI local worker.
-   Electron UI + native inference/audio workers.
-   A more unified desktop runtime with native modules.

Evaluate:

-   Windows reliability.
-   Packaging and installation complexity.
-   Audio capture latency and stability.
-   IPC complexity and security.
-   Model compatibility.
-   CPU/RAM overhead.
-   Developer experience and maintainability.
-   Crash isolation and recovery.
-   Open-source licensing.

Recommend one approach based on a small technical proof of concept. Do
not add Python, FastAPI, or a complex service layer without a
demonstrated reason.

------------------------------------------------------------------------

## 6. Audio Acquisition and Processing

### Source requirements

Support:

-   Church mixer output through a suitable line-level/audio interface.
-   Microphone input.
-   One active source at a time.
-   Switching between sources without restarting the entire application
    where feasible.

Do not combine multiple sources in v1.

### Audio capture requirements

-   Enumerate available input devices.
-   Allow the operator to select an input.
-   Show a live input-level meter.
-   Detect silence, clipping, and device disconnection.
-   Handle supported sample rates and channel layouts.
-   Convert audio to the format required by recognition workers.
-   Use bounded buffers so memory cannot grow without limit.
-   Keep audio capture responsive even when inference is slow.
-   Reconnect safely after device loss.
-   Surface clear errors instead of silently continuing with no audio.

### Switching input devices

When the operator switches sources:

1.  Stop capture from the previous device.
2.  Flush its pending audio buffer.
3.  Reset short-lived recognition context that could join unrelated
    fragments.
4.  Start capture from the new device.
5.  Tag subsequent events with the new source identifier.
6.  Show the new active source in the UI.

Never join lyric or speech fragments across a source switch.

### Audio privacy

-   Do not continuously archive raw audio by default.
-   Use short-lived buffers for live recognition.
-   Recording for diagnostics must be explicit opt-in.
-   Provide retention controls and a clear delete action for any saved
    recordings.
-   Do not upload audio to cloud services unless an administrator
    explicitly enables it and the UI explains what is sent.

------------------------------------------------------------------------

## 7. Speech Recognition Pipeline

### Initial local candidate

Evaluate `whisper.cpp` as the first local speech recognition candidate.
Benchmark appropriate small and quantised models on the actual target
laptop.

Do not assume the largest model is best for the product. The application
must remain usable on modest hardware.

### Pipeline

`Audio capture → voice activity detection → segmentation → speech transcription → normalisation → explicit reference extraction → canon validation → verified content lookup → candidate`

### Requirements

-   Handle ordinary preaching speech.
-   Handle Nigerian English accents.
-   Handle quiet, fast, and reverberant speech.
-   Handle Scripture references spoken in different common forms.
-   Avoid treating a topic or sermon theme as an explicit Bible
    reference.
-   Retain timestamps and source identifiers where practical.
-   Provide transcript snippets as evidence for suggestions.
-   Avoid presenting low-confidence transcription as certain.

### Scripture reference extraction

Extract references only when there is explicit evidence in the
recognised words.

Examples:

-   "John chapter three verse sixteen."
-   "First Corinthians thirteen, verses four to seven."
-   "Psalm twenty-three."

Normalise common spoken forms, but preserve the original transcript for
operator review.

Validate:

-   Book name.
-   Chapter number.
-   Verse number or range.
-   Whether the chapter and verses exist in the selected canon.

If the reference is incomplete, ambiguous, invalid, or not supported by
the selected translation, request operator review. Never guess missing
numbers.

------------------------------------------------------------------------

## 8. Singing and Song Recognition

Singing recognition is a distinct and harder problem than ordinary
speech recognition. Do not assume a speech model will reliably recognise
choir singing.

### MVP pipeline

`Audio → singing/music activity detection → lyric transcription candidate → normalisation → local lyric search → consecutive-line evidence → candidate ranking → operator suggestion`

### Matching signals

Use a combination of:

-   Exact phrase match.
-   Token overlap.
-   Consecutive lyric-line match.
-   Fuzzy text similarity.
-   Song title and version.
-   Uniqueness of the matched phrase.
-   Evidence across multiple successive segments.

A common phrase such as "Hallelujah" is not enough to identify a song.

### Candidate behaviour

-   Show the likely song title and version.
-   Show the lyric fragments that matched.
-   Show confidence or evidence in understandable terms.
-   Allow the operator to choose among similar songs.
-   Suppress repeated identical suggestions.
-   Return "No verified match" when evidence is insufficient.
-   Never invent missing lyrics.

### Model research

`MOSS-Music` and other music-language models may be investigated
experimentally. Do not make a large music model a requirement for the
initial laptop deployment. Evaluate cloud/server or later hardware use
separately, with explicit privacy and cost analysis.

Audio fingerprinting services such as AcoustID are not a substitute for
recognising live sung lyrics. They identify known recordings and should
not be treated as a live lyric-recognition solution.

------------------------------------------------------------------------

## 9. Verified Scripture System

Scripture handling must be deterministic and auditable.

### Required behaviour

1.  Detect an explicit spoken reference.
2.  Resolve it to a canonical book/chapter/verse range.
3.  Validate the reference against the selected canon.
4.  Retrieve exact text from a locally available approved translation.
5.  Show the translation name and attribution.
6.  Present the result to the operator for review.
7.  Send it to FreeShow only after the authority manager permits the
    action.

### Strict rules

-   Never generate Bible text.
-   Never paraphrase a passage and present it as Scripture.
-   Never infer a reference from a sermon theme.
-   Never silently substitute a different translation.
-   Never silently fill in an incomplete reference.
-   Never project text from an unverified source.

### Translation package metadata

Every translation package should include:

-   Translation name.
-   Publisher or source.
-   Edition/version.
-   Language.
-   Licence and copyright status.
-   Required attribution.
-   Redistribution permissions.
-   Import date.
-   Checksum.
-   Verification status.

### Initial translation strategy

A public-domain translation such as the World English Bible may be
evaluated for the initial package, but verify the exact edition,
licence, attribution, and any trademark conditions before
redistribution.

Do not assume that API access to a translation grants permission to
redistribute it. API.Bible and other providers may impose
translation-specific conditions.

### Data packaging

Prefer a separately versioned Bible dataset package that can be
installed independently of the application. Keep translation data
separate from application code.

------------------------------------------------------------------------

## 10. Song Library and Content Imports

### Song data model

A song should support:

-   Stable song identifier.
-   Canonical title.
-   Alternative titles.
-   Author/composer where known.
-   Language.
-   Source.
-   Licence/rights information.
-   Multiple approved versions.
-   Sections such as verse, chorus, bridge, and refrain.
-   Ordered lyric lines.
-   Import and verification metadata.

Different arrangements or lyric versions must not be silently merged.

### Import formats

Support these formats in the import workflow:

-   TXT
-   DOCX
-   CSV
-   PPTX
-   PDF

### Import workflow

`Select file → validate file → resource checks → parse safely → extract structure/text → normalise → detect possible songs/sections → duplicate check → human review → save to local library`

### Format-specific behaviour

**TXT** - Support UTF-8. - Preserve line breaks. - Provide a preview
before import.

**DOCX** - Extract paragraphs, headings, and tables. - Do not assume
document formatting alone identifies lyric sections. - Show extracted
content for review.

**CSV** - Support configurable column mapping for title, author,
section, position, lyrics, language, and source. - Also support a simple
one-row-per-song import mode. - Validate missing and malformed fields.

**PPTX** - Preserve slide order. - Extract text from slides. - Retain
slide/song relationships where possible. - Do not assume background
images will be OCR'd in v1.

**PDF** - Support text-based PDFs first. - Detect likely
scanned/image-only pages. - Report extraction problems. - Do not
silently drop pages. - OCR can be a later optional feature.

### Import restrictions

-   Do not treat arbitrary imported Bible text as an authoritative
    translation.
-   Imported content must be reviewed before it is used for recognition.
-   Unverified rights should mean local/private use only unless the user
    confirms appropriate rights.
-   Do not presume that a song is public domain because it is old or
    widely used.

### Secure import handling

Treat every import as untrusted input.

-   Validate actual file type, not only extension.
-   Enforce file-size and parsing-time limits.
-   Protect against archive expansion/decompression bombs.
-   Do not execute macros, scripts, or embedded active content.
-   Do not follow external links during parsing.
-   Quarantine malformed files.
-   Isolate parser workers where practical.
-   Keep original files separate from normalised library records.
-   Record import errors and allow safe retry.

------------------------------------------------------------------------

## 11. FreeShow Integration

FreeShow is the initial presentation engine. Pulpit AI must remain an
independent application.

Official API documentation: <https://freeshow.app/api>

### Known integration interfaces to verify

The documented local interfaces include:

-   REST HTTP: `http://localhost:5506`
-   WebSocket/Socket.IO: localhost port `5505`
-   OSC over UDP

FreeShow supports presentation-related operations, including
show/project, scripture, media, overlays, and stage-related actions.
Verify exact current endpoints, event payloads, and version
compatibility against the official documentation and an installed
FreeShow instance before implementation.

### Integration requirements

-   Detect whether FreeShow is running.
-   Connect to the local instance.
-   Show connection status.
-   Handle authentication/API keys where supported.
-   Use an allowlist of supported commands.
-   Validate all command arguments.
-   Handle disconnects and reconnect safely.
-   Never assume a command succeeded until success is confirmed.
-   Log AI-originated commands and outcomes.
-   Provide a safe test mode before live projection.

### Security

-   Bind local services to loopback wherever possible.
-   Do not expose FreeShow control ports to the public internet.
-   Do not expose control ports to an untrusted LAN.
-   Use authentication where supported.
-   Recommend firewall restrictions.
-   Store API keys securely.
-   Do not hardcode credentials.

### Critical research question: manual state observability

Verify whether FreeShow exposes enough state-change events to reliably
detect manual operator actions and current presentation state.

Do not assume that being able to send a command means Pulpit AI can
observe all manual changes.

If event support is incomplete, evaluate safe polling and document its
limitations. If the current authority state cannot be established,
Pulpit AI must not send an AI projection command.

------------------------------------------------------------------------

## 12. Presentation Authority Manager

This is one of the most important parts of the product. It must be
implemented as a central, testable service---not scattered UI
conditions.

### Separate permissions

Track these separately:

-   **Listening:** audio capture and recognition are allowed.
-   **Suggesting:** candidate suggestions may be shown.
-   **Projecting:** AI-originated presentation actions may be sent to
    FreeShow.

Listening does not imply permission to project.

### Modes

1.  **Suggestions mode --- default**
    -   AI listens and suggests.
    -   Operator chooses what to project.
    -   No AI-originated projection without explicit approval.
2.  **Manual control**
    -   Operator controls FreeShow.
    -   AI may continue listening and suggesting.
    -   AI cannot project.
3.  **AI automatic mode --- later**
    -   Must be explicitly activated.
    -   Must have strict confidence and validation thresholds.
    -   Must be disabled by default.
    -   Must not be released until testing demonstrates acceptable
        accuracy and safe override behaviour.
4.  **Manual safety lock**
    -   Immediately blocks all AI-originated projection.
    -   Must remain effective even if recognition workers are delayed or
        restarted.
    -   AI cannot disable or bypass it.

### Authority rules

-   Manual operator action takes priority.
-   Manual lock blocks AI projection.
-   Approval is scoped to one defined action, not unrestricted future
    actions.
-   Ambiguous or low-confidence candidates cannot auto-project.
-   Emergency stop disables AI projection immediately.
-   Unknown FreeShow state means no AI projection.
-   FreeShow disconnect means no AI projection.
-   Every AI command must be checked by the authority manager
    immediately before dispatch.
-   UI state alone is not sufficient authorization.

### Suggested state model

Represent authority explicitly, for example:

-   `listeningEnabled`
-   `suggestionsEnabled`
-   `projectionPermission`
-   `manualLockActive`
-   `operatorMode`
-   `freeShowConnectionState`
-   `observedPresentationState`
-   `lastOperatorActionAt`

Use a well-defined state machine and document valid transitions. Avoid
ambiguous combinations of booleans where possible.

### Audit events

Record:

-   Candidate created.
-   Candidate accepted/rejected/dismissed.
-   Operator entered manual mode.
-   Manual lock activated/deactivated.
-   Approval granted.
-   AI action requested.
-   Authority check result.
-   Command dispatched.
-   Command acknowledged or failed.
-   FreeShow connection lost/restored.

Do not store unnecessary private audio or transcript data in audit logs.

------------------------------------------------------------------------

## 13. Data Storage

Use a local database such as SQLite with FTS5 for full-text search,
subject to architecture validation.

### Proposed entities

-   `songs`
-   `song_versions`
-   `song_sections`
-   `song_lyrics`
-   `content_sources`
-   `licences`
-   `imports`
-   `bible_translations`
-   `bible_books`
-   `bible_verses`
-   `recognition_events`
-   `recognition_candidates`
-   `presentation_sessions`
-   `presentation_actions`
-   `integration_configs`
-   `audit_logs`
-   `sync_records`

### Data principles

-   Use stable identifiers.
-   Store timestamps consistently.
-   Separate application settings from church content.
-   Separate transient recognition data from persistent library data.
-   Use database migrations.
-   Define backup and restore behaviour.
-   Avoid storing raw audio by default.
-   Ensure shared-library updates cannot silently overwrite church-local
    content.
-   Make import and sync operations recoverable and auditable.

------------------------------------------------------------------------

## 14. Curated Shared Library

The shared library is optional. Local use must work without an account
or internet connection.

### Proposed contribution lifecycle

1.  Contributor submits content.
2.  System validates structure and required metadata.
3.  Duplicate detection runs.
4.  Rights and source information are checked.
5.  Moderator reviews content.
6.  Publisher approves a version.
7.  Churches can synchronise approved versions.

### Rules

-   Clearly distinguish local content from shared approved content.
-   Track source and version.
-   Do not overwrite local edits silently.
-   Show when a shared item has an update.
-   Let the church review changes before applying them.
-   Content with unknown rights must not be redistributed as free
    content.
-   Do not make the shared library a dependency for core presentation
    operation.

------------------------------------------------------------------------

## 15. UI/UX Requirements

The interface is for an operator working during a live church service.
It must be calm, clear, readable, and fast to operate.

### Main operator screen

Show the most important live information:

-   FreeShow connection status.
-   Active audio source.
-   Audio input level.
-   Listening state.
-   Current operating mode.
-   Manual lock state.
-   Recognised speech/lyric snippet.
-   Candidate Scripture or song suggestions.
-   Evidence and confidence.
-   Clear approve, reject, and dismiss actions.
-   Emergency stop/manual lock control.

### Interaction principles

-   Never hide whether AI projection is enabled.
-   Make manual lock prominent and easy to activate.
-   Avoid excessive animation and visual noise.
-   Use readable type and strong contrast.
-   Use clear status labels, not colour alone.
-   Make errors actionable.
-   Avoid presenting confidence as certainty.
-   Do not place destructive or high-impact actions where accidental
    clicks are likely.
-   Keyboard shortcuts may be provided, but must be documented and avoid
    conflicts with FreeShow.

### Accessibility

-   Keyboard navigation.
-   Visible focus states.
-   Appropriate contrast.
-   Screen-reader labels for controls.
-   Do not rely on colour alone to communicate status.

------------------------------------------------------------------------

## 16. Security, Privacy, and Threat Model

Create a threat model before production release and maintain it as the
product evolves.

### Threats to consider

-   Malicious imported documents.
-   Malformed audio/device input.
-   Untrusted local network access to control interfaces.
-   Stolen API credentials.
-   Prompt injection or malicious text inside imported content.
-   Compromised or malicious recognition worker.
-   Accidental AI projection.
-   Shared-library content poisoning.
-   Database corruption.
-   Sensitive content leaking through logs or diagnostics.
-   Unsafe auto-update or installer mechanisms.

### Security requirements

-   No arbitrary shell execution by AI.
-   No unrestricted filesystem access for recognition or AI components.
-   Strict IPC schemas and validation.
-   Strict allowlists for presentation commands.
-   Authority checks at the command boundary.
-   Local services bind to loopback.
-   Protect credentials and tokens.
-   Validate API and import inputs.
-   Keep dependencies maintained and scan them.
-   Use signed releases where feasible.
-   Provide secure backup guidance.
-   Avoid private content in telemetry and logs.
-   Isolate recognition workers from the presentation-control process.
-   A recognition worker crash must not grant or expand presentation
    permissions.

### Privacy defaults

-   Audio stays local.
-   No continuous audio recording.
-   No cloud audio upload by default.
-   No mandatory cloud account.
-   Clear opt-in for any external processing.
-   Explain what data leaves the device and why.
-   Provide controls for retention and deletion.

------------------------------------------------------------------------

## 17. Hardware and Performance

The initial machine is modest by current AI inference standards.
Optimise for dependable operation, not impressive model size.

### Before selecting models, inspect

-   Exact CPU model and generation.
-   GPU model and available VRAM.
-   RAM and current memory pressure.
-   Windows version and build.
-   Available SSD space.
-   Audio interface and driver.
-   Whether Windows 11 is supported.

Windows 10 mainstream support ended on October 14, 2025. Check the
machine's upgrade compatibility and any applicable Extended Security
Updates before recommending a long-term deployment on Windows 10.

### Performance requirements

-   Audio capture must not block on model inference.
-   Use bounded queues and backpressure.
-   Keep model memory use predictable.
-   Avoid loading multiple large models simultaneously.
-   Use small/quantised models where appropriate.
-   Load models on demand where practical.
-   Check disk space before downloading models.
-   Verify model checksums.
-   Isolate inference workers so they can restart without crashing the
    UI or capture process.
-   Keep the UI responsive during long services.

### Benchmark plan

Test with FreeShow running and a realistic service workload, including a
two-hour session.

Measure:

-   CPU use.
-   Peak and average RAM.
-   GPU/VRAM use where applicable.
-   Model load time.
-   Recognition latency.
-   Audio dropouts.
-   Thermal throttling.
-   Device reconnection.
-   Worker crash recovery.
-   Disk use.

------------------------------------------------------------------------

## 18. Testing Strategy

Testing must cover correctness, safety, performance, and recovery.

### Unit tests

-   Reference parsing and canon validation.
-   Song matching and ranking.
-   Confidence calculation.
-   Authority state transitions.
-   Import validation.
-   Database migrations.
-   Command allowlist and payload validation.

### Integration tests

-   Audio capture to recognition event.
-   Recognition event to candidate.
-   Candidate to verified content.
-   Approval to authority manager.
-   Authority manager to FreeShow adapter.
-   FreeShow disconnect and reconnect.
-   Database backup and restore.

### Fixture tests

Create a controlled audio test set containing:

-   Nigerian English preaching.
-   Clear and noisy speech.
-   Spoken Bible references.
-   Incomplete and invalid references.
-   Choir singing.
-   Congregational singing.
-   Similar song lyrics.
-   Common phrases that should not identify a song.
-   Silence and background noise.
-   Mixer and microphone recordings.

Use content for which the project has permission to test.

### Safety and recovery tests

-   Manual slide change while AI is listening.
-   Manual lock activated during recognition.
-   Manual lock activated immediately before a queued AI command.
-   FreeShow disconnects.
-   FreeShow state cannot be determined.
-   Recognition worker crashes.
-   Audio device disconnects.
-   Operator switches audio source.
-   Internet becomes unavailable.
-   Imported document is malformed.
-   Imported file is oversized or malicious.
-   Shared library returns an update to locally edited content.

### Key metrics

-   Speech word error rate (WER).
-   Explicit Scripture reference extraction precision and recall.
-   Invalid reference rejection rate.
-   Song matching precision and recall.
-   Incorrect projection rate.
-   Suggestion latency.
-   Manual override response time.
-   Audio dropout rate.
-   Peak RAM/CPU.
-   Recovery time after failure.

**Incorrect automatic projection is a critical safety metric.**
Automatic mode must not be enabled merely because average recognition
accuracy looks good.

------------------------------------------------------------------------

## 19. Delivery Roadmap

Build in this order. Do not start with singing recognition or automatic
projection.

### Phase 0 --- Repository and architecture validation

-   Inspect repository and machine.
-   Confirm operating system and hardware.
-   Review FreeShow API documentation.
-   Compare desktop/runtime architectures.
-   Prototype FreeShow connection and state observation.
-   Produce threat model outline.
-   Present architecture decision record and milestone plan.

**Exit criteria:** user approves the architecture and first
implementation milestone.

### Phase 1 --- FreeShow integration and authority foundation

-   Desktop shell.
-   FreeShow connection status.
-   Safe integration adapter.
-   Manual control mode.
-   Suggestions-only mode.
-   Manual safety lock.
-   Central authority manager.
-   Audit events.
-   Integration tests.

**Exit criteria:** Pulpit AI can connect to FreeShow, observe what it
can reliably observe, and prove that AI-originated commands are blocked
whenever permission is absent or uncertain.

### Phase 2 --- Audio capture and English speech recognition

-   Input device discovery.
-   Single active source selection.
-   Audio level meter.
-   Capture pipeline.
-   VAD and segmentation.
-   Local speech recognition.
-   Transcript display.
-   Device switching and recovery.

**Exit criteria:** stable audio capture and useful transcript latency on
the target laptop during extended testing.

### Phase 3 --- Verified Scripture retrieval

-   Explicit reference extraction.
-   Canon and range validation.
-   Approved translation package format.
-   Exact local passage retrieval.
-   Translation attribution.
-   Operator review and approval.
-   Tests for incomplete, ambiguous, and invalid references.

**Exit criteria:** only validated references retrieve exact approved
text; no generated or silently substituted Scripture.

### Phase 4 --- Song library and imports

-   Song schema.
-   TXT, DOCX, CSV, PPTX, and text-PDF import.
-   Preview and review workflow.
-   Rights/source metadata.
-   Local full-text search.
-   Duplicate detection.

**Exit criteria:** church can import, review, search, and maintain its
own song library safely.

### Phase 5 --- Singing recognition

-   Singing activity detection.
-   Lyric candidate generation.
-   Local matching.
-   Consecutive-line evidence.
-   Ambiguity handling.
-   Operator suggestions.
-   Performance evaluation.

**Exit criteria:** measured precision is acceptable for suggestions,
with unknown/ambiguous songs correctly rejected.

### Phase 6 --- Curated shared library and packaging

-   Contribution and moderation workflow.
-   Versioned shared content.
-   Safe synchronisation.
-   Installer and update strategy.
-   Backup/restore documentation.
-   Security review.

**Exit criteria:** churches can install and use the app locally, and
optionally synchronise approved shared content.

### Later phase --- Controlled automatic mode

Only consider after the preceding phases have been validated in real
service-like conditions.

Requirements include explicit opt-in, strict thresholds, clear status,
immediate manual override, safety lock, full auditability, and
fail-closed behaviour.

------------------------------------------------------------------------

## 20. Suggested Repository Structure

Adapt this to the existing repository rather than forcing a rewrite.

``` text
pulpit-ai/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/
│       │   ├── preload/
│       │   └── renderer/
│       └── package.json
├── packages/
│   ├── shared-types/
│   ├── authority-manager/
│   ├── content-core/
│   ├── audio-contracts/
│   ├── presentation-contracts/
│   └── ui/
├── workers/
│   ├── audio/
│   ├── speech/
│   └── singing/
├── data/
│   └── bible-packages/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── security/
│   ├── decisions/
│   └── testing/
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
└── README.md
```

The final structure depends on the architecture decision. Keep contracts
and domain logic independent from Electron and FreeShow-specific code.

------------------------------------------------------------------------

## 21. Required Project Documentation

Maintain these documents in the repository:

1.  `README.md` --- purpose, setup, supported platforms, development.
2.  `docs/product/PRD.md` --- product requirements and confirmed
    decisions.
3.  `docs/architecture/ARCHITECTURE.md` --- components, boundaries, data
    flow.
4.  `docs/architecture/DECISIONS.md` --- important technical decisions
    and rationale.
5.  `docs/security/THREAT_MODEL.md` --- threats, mitigations, residual
    risks.
6.  `docs/security/PRIVACY.md` --- data collection, storage, retention,
    external processing.
7.  `docs/architecture/FREESHOW_INTEGRATION.md` --- endpoints, events,
    commands, limitations.
8.  `docs/architecture/AUDIO_PIPELINE.md` --- capture and processing
    design.
9.  `docs/architecture/CONTENT_AND_LICENSING.md` --- source, copyright,
    and distribution policy.
10. `docs/testing/TEST_PLAN.md` --- tests, fixtures, metrics, acceptance
    criteria.
11. `docs/operations/BACKUP_AND_RECOVERY.md` --- backup and restore
    procedures.

Record unresolved questions rather than quietly making assumptions.

------------------------------------------------------------------------

## 22. Definition of Done

A feature is not complete merely because its happy path works.

A feature is done when:

-   Its requirements and limitations are documented.
-   Its implementation respects module boundaries.
-   Inputs are validated.
-   Errors are visible and actionable.
-   Unit and relevant integration tests pass.
-   Security and privacy implications are reviewed.
-   It does not bypass the authority manager.
-   It behaves safely when dependencies disconnect or fail.
-   It has been tested on the target Windows hardware where relevant.
-   Documentation and configuration examples are updated.

A release is not ready if manual override, safety lock, verified
Scripture retrieval, import safety, or privacy defaults are unreliable.

------------------------------------------------------------------------

## 23. First Antigravity Session: Exact Instructions

Start by doing the following, in order:

1.  Inspect the current repository, branch, working tree, package
    manager, existing code, and documentation.
2.  Do not overwrite or delete existing work.
3.  Inspect the machine's exact CPU, RAM, GPU, Windows version,
    available disk space, and audio devices.
4.  Inspect the current FreeShow API documentation and, if installed,
    verify the local API and event behaviour.
5.  Determine whether FreeShow exposes reliable state-change information
    for manual operator actions.
6.  Compare the proposed desktop/runtime and worker architectures.
7.  Identify feasible local speech recognition models for the actual
    hardware.
8.  Identify licensing and redistribution questions for Bible
    translations and song libraries.
9.  Produce:
    -   Repository assessment.
    -   Hardware assessment.
    -   Architecture options comparison.
    -   Recommended architecture with reasons.
    -   FreeShow integration findings.
    -   Initial threat model.
    -   Proposed Phase 1 scope.
    -   Risks, unknowns, and decisions requiring user approval.
10. Stop and request approval before implementing Phase 1.

### Required first-session response format

Return a concise but evidence-based report with these headings:

-   Existing repository status
-   Hardware and operating-system findings
-   FreeShow API and observability findings
-   Architecture options considered
-   Recommended architecture
-   Security and privacy risks
-   Licensing questions
-   Phase 1 implementation plan
-   Decisions requiring approval

Do not claim that an API, event, model, or licence has been verified
unless you actually tested or checked its authoritative documentation.
Distinguish confirmed facts from assumptions.

------------------------------------------------------------------------

## 24. Final Product Rule

Pulpit AI is an assistant for the church presentation operator---not an
autonomous authority over the service.

**When uncertain, suggest. When permission is absent, do not project.
When content is unverified, do not present it as Scripture or an
approved song.**
