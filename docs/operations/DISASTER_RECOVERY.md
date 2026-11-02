# Disaster Recovery & Emergency Failover Runbook

This runbook defines emergency procedures to guarantee that presentation failures never disrupt a church service.

---

## 1. The 30-Second Emergency Failover Rule

If Pulpit AI, the computer, or the recognition engine encounters a fatal software fault, the church presentation must recover **in under 30 seconds**.

### Emergency Failover Procedure:
1. **Engage Physical / FreeShow Manual Override:**
   - Switch focus directly to **FreeShow** (press `Alt + Tab` or click FreeShow on taskbar).
   - Use standard FreeShow keyboard shortcuts (`Right Arrow` / `Left Arrow` for slides, `F1` or `Escape` for blank screen).
   - FreeShow continues running independently of Pulpit AI.
2. **If Pulpit AI is unresponsive:**
   - Terminate the Pulpit AI window.
   - FreeShow is completely decoupled and will retain its current output state without dropping frames or flashing blank screens.

---

## 2. Emergency Freeze (Manual Lock)

When unintended suggestions or slide jumps occur:
- **Click "Engage Manual Safety Lock"** on the Pulpit AI header banner.
- **Fail-Closed Protection:** The Central Authority Manager sets `manualLockActive = true` and `projectionPermission = false`.
- In this state, any AI or background command received by the FreeShow adapter is rejected with `reason: "Manual Safety Lock is active"`.

---

## 3. Database Backup & Export Procedure

Local church song libraries, custom arrangements, and audit logs should be backed up regularly.

### Creating a Backup:
1. Call the atomic backup engine via UI or IPC:
   ```typescript
   const archive = await window.pulpitAPI.createBackup();
   ```
2. The backup archive contains:
   - Full relational songs catalog and multi-version arrangements.
   - Up to 500 recent tamper-evident audit events.
   - Cryptographic `checksumSha256` computed over the content.
3. Save the resulting JSON archive to a safe location (e.g., church USB drive or external backup folder).

---

## 4. Database Restore & Recovery Procedure

If the database becomes corrupted or a clean machine must be initialized:

1. Obtain the verified backup JSON archive.
2. Trigger the restore engine:
   ```typescript
   const result = await window.pulpitAPI.restoreBackup(archive, true);
   ```
3. **Pre-flight Checksum Verification:**
   - `BackupManager.restoreBackup()` calculates the SHA-256 hash of the payload and compares it against `metadata.checksumSha256`.
   - If any byte of the archive has been altered or corrupted, the restore fails closed and refuses to modify the database.
4. **Clean Slate Recovery:** When `clearExisting: true` is passed, the local SQLite database is purged of orphaned records and restored cleanly to the exact backup state.
