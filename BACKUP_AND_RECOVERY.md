# Backup, Disaster Recovery & High-Availability Manual — Pulpit AI

**Version:** 1.0.0  
**Scope:** Data Protection, Automated Backup Rotation, and Sunday Morning Live Failover Runbook  

---

## 1. Overview & Data Storage Architecture

Pulpit AI is designed for high reliability in live worship environments. All persistent data resides exclusively in local directories:

```
%APPDATA%/pulpit-ai/
├── config/
│   └── settings.json          # Operator preferences, selected audio device, FreeShow port/key
├── data/
│   ├── songs.db               # SQLite database: songs, versions, sections, lines, FTS5 index
│   └── scriptures.db          # Verified Scripture database (loaded from signed JSON packages)
├── backups/
│   ├── backup_20261101.json   # Automated rotating JSON/SQLite archives with SHA-256 checksums
│   └── manifest.json          # Backup catalog and cryptographic checksum registry
└── audit/
    └── audit.jsonl            # Append-only tamper-evident operational event log
```

---

## 2. Automated Backup System (`BackupManager`)

The built-in [`BackupManager`](file:///C:/Users/HP/Desktop/cong_script/packages/song-engine/src/BackupManager.ts) in `@pulpit-ai/song-engine` ensures that custom church hymn libraries, song arrangements, and section tags are protected against accidental deletion or drive corruption.

### 2.1. Backup Characteristics
* **Format:** Self-contained JSON archives containing full relational data (songs, versions, sections, lines).
* **Integrity Protection:** Each backup archive is signed with a SHA-256 cryptographic checksum (`archive.checksum = sha256(JSON.stringify(archive.data))`).
* **Automated Rotation:** Retains the last **4 rolling backups**; older backups are automatically pruned to conserve SSD storage on the laptop.
* **Tamper-Evident Validation:** During restore, `BackupManager` recalculates the checksum and refuses to load any file with a checksum mismatch.

---

## 3. Step-by-Step Restoration Procedures

### 3.1. Restoring a Song Catalog via Application UI
1. Navigate to **Settings** $\to$ **Hymn Library & Backups**.
2. Select the desired restore point from the **Available Backups** list (verified with date, song count, and green checksum badge).
3. Click **Restore Backup**.
4. Pulpit AI will:
   - Validate the SHA-256 archive checksum.
   - Stage the restore in an isolated transaction.
   - Atomically overwrite `songs.db` and rebuild the SQLite FTS5 index.
   - Re-index song titles in FreeShow's local show directory.

### 3.2. Manual Emergency Recovery via CLI
If the application GUI fails to open:
```bash
# 1. Open PowerShell and navigate to the project directory
cd C:\Users\HP\Desktop\cong_script

# 2. Verify and restore database from latest verified backup archive
node -e "
  const { BackupManager, SongDatabase } = require('./packages/song-engine/dist/index.js');
  const db = new SongDatabase('path/to/songs.db');
  const bm = new BackupManager(db, 'path/to/backups');
  bm.restoreLatestVerifiedBackup();
"
```

---

## 4. Live Disaster Recovery & Sunday Morning Failover Scenarios

### Scenario A: Sunday Morning App Crash or UI Freeze (15-Second Recovery)
1. **FreeShow Remains Independent:** FreeShow runs as a standalone presentation app. If Pulpit AI crashes or freezes, FreeShow will **continue displaying the currently projected slide** without blacking out or blinking.
2. **Engage Manual Projection in FreeShow:** The media volunteer immediately uses FreeShow’s native keyboard shortcuts (`F1`–`F12`, arrow keys, or mouse click) to control slides manually.
3. **Restart Pulpit AI:** Launch Pulpit AI from the Windows Start Menu or Desktop shortcut. The app boots in $< 3.0\text{ s}$, reconnects to FreeShow on port `5505`, enters **Suggestions Mode**, and immediately resumes transcript listening.

### Scenario B: Audio Hardware Cable Unplugged or Mixer Disconnected
1. **Automatic Error Transition:** `SpeechSegmenter` and `AudioDeviceManager` detect hardware loss via `track.onended` and Windows `devicechange` within $< 1.0\text{ s}$.
2. **Status Indication:** The top-bar VU meter shifts to `OFF` (`disconnected`), and the status badge displays `NO AUDIO INPUT`.
3. **Re-connection:**
   - Plug the USB audio interface or 3.5 mm cable back into the laptop.
   - Pulpit AI dynamically re-enumerates devices without requiring an application restart.
   - Select the restored device from the dropdown; audio streaming resumes with an immediate buffer flush.

### Scenario C: Corrupted Scripture Data File
1. **Fail-Closed Protection:** During startup, `ScriptureDatabase` computes SHA-256 hashes of `web.json` and `kjv.json`. If a file has been tampered with or corrupted on disk, the system refuses to register it, logs a security error, and notifies the operator.
2. **Recovery:** Re-run the automated eBible acquisition script to re-download official, verified public domain packages:
   ```bash
   pnpm run build
   pnpm test
   ```

---

## 5. Exporting Manual Backups to External Media

To export your church's custom song arrangements to a USB thumb drive:
1. Insert the USB drive (e.g. `E:\`).
2. Copy `%APPDATA%/pulpit-ai/backups/` directly to `E:\PulpitAI_Backups\`.
3. Alternatively, click **Export Archive** from the Pulpit AI dashboard to generate a single `.pulpit-archive` file.
