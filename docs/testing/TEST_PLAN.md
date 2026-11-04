# Pulpit AI — Test Plan & Safety Verification

## 1. Test Architecture
* **Testing Runner:** Vitest v2
* **Unit Testing:** `@pulpit-ai/authority-manager`, `@pulpit-ai/audio-engine`, `@pulpit-ai/speech-engine`, `@pulpit-ai/scripture-engine`, `@pulpit-ai/song-engine`, `@pulpit-ai/licensing-manager`
* **Integration Testing:**
  * FreeShow integration with `MockFreeShowServer`
  * Main process candidate registry & approval by ID
  * Native audio capture, AudioWorklet, and hardware disconnect detection
  * Native `whisper.cpp` subprocess verification
  * Full-pipeline WAV-to-candidate integration (`tests/WavToCandidate.test.ts`)
* **Audio Fixtures & Benchmarking (`tests/fixtures/`):**
  * Accented preaching with spoken scripture references (`preaching_accented_john316.wav`, `preaching_accented_romans828.wav`)
  * Quiet preaching speech (`preaching_quiet_psalm23.wav`)
  * Noisy preaching speech with room HVAC hum (`preaching_noisy_matthew53.wav`)
  * Sustained choir singing (`choir_worship_amazing_grace.wav`)
  * Sustained instrumental pad/organ chords (`instrument_organ_pad.wav`)
  * Pure ambient silence (`ambient_silence.wav`)

## 2. Test Execution & Evaluation
```bash
# Run all workspace test suites
pnpm test

# Run pipeline evaluation benchmark (WER, Precision, Recall, Wrong-Suggestion Rate, Latency)
pnpm run evaluate
```

## 3. Key Safety Acceptance Tests
1. **Un-allowlisted Action Rejection:** Ensures arbitrary shell commands or unvetted actions are dropped with security audit level.
2. **Suggestions Mode Interception:** Asserts that in the default suggestions mode, an AI-originated projection command never touches the network (zero commands received by the target server).
3. **Manual Safety Lock Override:** Asserts that engaging the manual safety lock immediately blocks subsequent or in-flight commands.
4. **Disconnection Handling:** Asserts that loss of connection to FreeShow immediately transitions the authority manager to a fail-closed state.
5. **WAV-to-Candidate Reference Accuracy:** Asserts that accented, quiet, and noisy preaching audio clips resolve to canonical scripture references with 100% precision and recall.
6. **Singing and Instrument Separation:** Asserts that choir and musical pads produce 0 false scripture candidate suggestions.
