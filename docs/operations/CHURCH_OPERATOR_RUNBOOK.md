# Church Operator Runbook

This guide is for church AV and presentation volunteers operating Pulpit AI during live services.

---

## 1. Pre-Service Setup Checklist (15 Minutes Before Service)

### Step 1: Launch FreeShow
1. Open **FreeShow**.
2. Confirm the presentation output window is active on your projector or secondary monitor.
3. Ensure FreeShow's local WebSocket/HTTP API server is enabled on port **5505** (`Settings > Remotes & API > Enable API`).

### Step 2: Launch Pulpit AI
1. Double-click the **Pulpit AI** desktop shortcut.
2. In the top bar, verify **FreeShow: Connected** shows a green indicator. If disconnected, click **Connect**.
3. Select your church audio input device from the microphone dropdown (e.g., *USB Audio Codec*, *Focusrite Scarlett*, or *Mixer Line In*).
4. Have the worship leader or pastor speak a few words into their microphone. Observe the **VU Level Meter** in the header:
   - Green (-24dB to -12dB): Optimal audio level.
   - Amber (-6dB): High speech level.
   - Red (Clipping): Turn down the gain on the mixer or audio interface to avoid distorted speech recognition.

---

## 2. Operating Modes During the Service

Pulpit AI features two primary operating modes, toggled in the header:

### Mode 1: Suggestions Mode (Default)
- **Use during:** Sermon preaching and congregational worship singing.
- **Behavior:**
  - AI continuously listens locally and generates suggestion cards in the **Suggested Content Queue**.
  - **Scripture suggestions:** When the preacher quotes a passage (e.g., *"Turn to John 3:16"*), the verified text from the selected Bible translation appears instantly.
  - **Song suggestions:** When the congregation sings a hymn or worship song, the matching song section appears with its lyric lines and confidence badge.
  - **Action:** Click **Project to Screen** / **Project Song Show** to display the content in FreeShow. Click **X** to dismiss.

### Mode 2: Manual Control Mode
- **Use during:** Quiet prayers, communion, announcements, or unscripted moments.
- **Behavior:**
  - Background AI suggestion candidate popups are suppressed.
  - The operator has direct manual control buttons (Next Slide, Prev Slide, Clear All, Restore Output).
  - Quick manual Scripture lookup bar remains available at all times.

---

## 3. The Emergency Manual Safety Lock

If anything unexpected occurs on stage (e.g., a cough misinterpreted by speech recognition, an unexpected guest speaker, or slides out of order):

1. **Click the RED "Engage Manual Safety Lock" banner** at the top of the screen (or press `Spacebar` / shortcut).
2. **Result:** The system enters a hard freeze state:
   - All AI suggestions and queued actions are immediately blocked fail-closed.
   - FreeShow output cannot be modified by any automated process.
3. When ready to resume, click **Release Lock**.

---

## 4. Song Library & Content Imports

To manage hymns, worship lyrics, and imported files:
1. Click **Song Library** in the header.
2. **Search:** Type song titles or lyric phrases in the search bar.
3. **Manual Projection:** Select a song, choose an arrangement, and click **Project Section** on any slide to project it directly.
4. **Importing Files:**
   - Click **Import Songs**.
   - Drag and drop or browse `.txt`, `.csv`, `.docx`, `.pptx`, or `.pdf` files.
   - All imported files enter the **Quarantined Review Queue**.
   - Inspect the parsed lyrics, review the duplicate detector report, check the **Legal Rights Attestation** box, and click **Approve & Promote to Library**.

---

## 5. Quick Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| **FreeShow: Disconnected** | FreeShow API port not open | Ensure FreeShow is running and port 5505 is enabled. Click **Connect** in header. |
| **VU Meter shows "MUTE"** | Audio interface muted or wrong device selected | Select the active audio input from the microphone dropdown. Check physical mute switch on mixer. |
| **No Scripture suggestions appear** | Book or verse not recognized | Use the **Quick Lookup Bar** in the Suggested Content Queue to type the reference manually (e.g., `Romans 8:28`). |
| **Duplicate suggestions for same song** | Rapid repeated lines | Cooldown timers automatically suppress duplicates within 10 seconds. |
