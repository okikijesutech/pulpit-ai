import { describe, it, expect, beforeEach } from 'vitest';
import { AuditEvent } from '@pulpit-ai/shared-types';
import { SongDatabase } from '../src/SongDatabase.js';
import { SEED_SONGS } from '../src/SeedSongData.js';
import { BackupManager } from '../src/backup/BackupManager.js';

describe('BackupManager Disaster Recovery Tests', () => {
  let db: SongDatabase;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    for (const song of SEED_SONGS) {
      db.saveSong(song);
    }
  });

  const mockAuditTrail: AuditEvent[] = [
    {
      id: 'audit_1',
      timestamp: 1700000000000,
      action: 'candidate_approved',
      actor: 'operator',
      details: { title: 'Amazing Grace' },
      severity: 'info'
    }
  ];

  it('creates an atomic backup archive with cryptographic checksum', () => {
    const archive = BackupManager.createBackup(db, mockAuditTrail, '0.1.0');

    expect(archive.metadata.formatVersion).toBe('1.0');
    expect(archive.metadata.songCount).toBe(SEED_SONGS.length);
    expect(archive.metadata.auditEventCount).toBe(1);
    expect(archive.metadata.checksumSha256).toHaveLength(64); // SHA-256 hex string
    expect(archive.songs.length).toBe(SEED_SONGS.length);
    expect(archive.auditTrail.length).toBe(1);
  });

  it('restores songs and versions into an empty database after checksum verification', () => {
    const archive = BackupManager.createBackup(db, mockAuditTrail);

    // Create a fresh empty database
    const freshDb = new SongDatabase(':memory:');
    expect(freshDb.listSongs().length).toBe(0);

    const restoreRes = BackupManager.restoreBackup(archive, freshDb);

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.integrityVerified).toBe(true);
    expect(restoreRes.restoredSongCount).toBe(SEED_SONGS.length);
    expect(freshDb.listSongs().length).toBe(SEED_SONGS.length);

    // Verify detailed song content and versions
    const restoredSong = freshDb.searchSongs('Amazing Grace')[0].song;
    expect(restoredSong.canonicalTitle).toBe('Amazing Grace');
    expect(restoredSong.versions.length).toBe(1);
    expect(restoredSong.versions[0].sections.length).toBeGreaterThan(0);
  });

  it('fails closed and blocks restore if archive checksum is tampered', () => {
    const archive = BackupManager.createBackup(db, mockAuditTrail);

    // Tamper with a song title without updating checksum
    archive.songs[0].canonicalTitle = 'Corrupted Title';

    const freshDb = new SongDatabase(':memory:');
    const restoreRes = BackupManager.restoreBackup(archive, freshDb);

    expect(restoreRes.success).toBe(false);
    expect(restoreRes.integrityVerified).toBe(false);
    expect(restoreRes.errors.some(e => e.includes('integrity verification failed'))).toBe(true);
    expect(freshDb.listSongs().length).toBe(0); // Kept completely intact/empty!
  });

  it('supports atomic replace when clearExisting is enabled', () => {
    const archive = BackupManager.createBackup(db, mockAuditTrail);

    // Add dummy song to current db
    db.saveSong({
      id: 'dummy_song',
      canonicalTitle: 'Temporary Song',
      alternativeTitles: [],
      language: 'en',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: []
    });
    expect(db.listSongs().length).toBe(SEED_SONGS.length + 1);

    // Restore with clearExisting = true
    const restoreRes = BackupManager.restoreBackup(archive, db, true);
    expect(restoreRes.success).toBe(true);
    expect(db.listSongs().length).toBe(SEED_SONGS.length);
    expect(db.searchSongs('Temporary Song').length).toBe(0); // Dummy song wiped
  });
});
