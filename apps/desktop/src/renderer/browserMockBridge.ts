/**
 * In-Browser Testing Simulation Bridge for Pulpit AI.
 *
 * Automatically activated when the UI is run in standard web browser mode (e.g. localhost:5173).
 * Seamlessly mocks all Electron IPC channels, preloads verified seed content,
 * and runs a virtual FreeShow presentation simulator.
 */

import {
  AuthorityState,
  FreeShowStateSnapshot,
  AuditEvent,
  AudioInputDevice,
  SuggestionCandidate,
  Song,
  FreeShowCommand
} from '@pulpit-ai/shared-types';

declare global {
  interface Window {
    pulpitAPI?: any;
  }
}

if (typeof window !== 'undefined' && !window.pulpitAPI) {
  console.info('Pulpit AI: In-Browser Simulation Bridge active (running outside Electron shell).');

  // 1. Initial State Definitions
  let authorityState: AuthorityState = {
    operatorMode: 'suggestions',
    listeningEnabled: true,
    suggestionsEnabled: true,
    projectionPermission: false,
    manualLockActive: false,
    freeShowConnected: false,
    lastOperatorActionAt: null,
    activeSourceId: null
  };

  let freeShowSnapshot: FreeShowStateSnapshot = {
    connected: false,
    status: 'disconnected',
    currentShowId: 'show_service_sunday',
    currentSlideIndex: 0,
    currentSlideText: 'Welcome to Sanctuary',
    isCleared: false,
    lastHeartbeat: Date.now()
  };

  const seedSongs: Song[] = [
    {
      id: 'hymn_amazing_grace',
      canonicalTitle: 'Amazing Grace',
      alternativeTitles: ['Amazing Grace! How Sweet the Sound', 'New Britain'],
      author: 'John Newton (1779)',
      copyright: 'Public Domain',
      license: 'Public Domain',
      language: 'en',
      licensing: {
        source: 'Olney Hymns (1779)',
        copyrightOwner: 'Public Domain',
        licenseType: 'public_domain',
        attribution: 'John Newton (1779) — Public Domain',
        offlineStoragePermission: true,
        redistributionPermission: true,
        aiProcessingPermission: true,
        verificationStatus: 'verified'
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: 'ver_ag_std',
          songId: 'hymn_amazing_grace',
          versionName: 'Standard (Traditional)',
          isDefault: true,
          sections: [
            {
              id: 'sec_ag_1',
              type: 'verse',
              sequenceOrder: 1,
              label: 'Verse 1',
              lines: [
                'Amazing grace! How sweet the sound',
                'That saved a wretch like me!',
                'I once was lost, but now am found;',
                'Was blind, but now I see.'
              ]
            },
            {
              id: 'sec_ag_2',
              type: 'verse',
              sequenceOrder: 2,
              label: 'Verse 2',
              lines: [
                "'Twas grace that taught my heart to fear,",
                'And grace my fears relieved;',
                'How precious did that grace appear',
                'The hour I first believed.'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'hymn_blessed_assurance',
      canonicalTitle: 'Blessed Assurance',
      alternativeTitles: ['Blessed Assurance, Jesus Is Mine'],
      author: 'Fanny J. Crosby (1873)',
      copyright: 'Public Domain',
      license: 'Public Domain',
      language: 'en',
      licensing: {
        source: 'Gospel Hymns No. 1 (1873)',
        copyrightOwner: 'Public Domain',
        licenseType: 'public_domain',
        attribution: 'Fanny J. Crosby (1873) — Public Domain',
        offlineStoragePermission: true,
        redistributionPermission: true,
        aiProcessingPermission: true,
        verificationStatus: 'verified'
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: 'ver_ba_std',
          songId: 'hymn_blessed_assurance',
          versionName: 'Standard',
          isDefault: true,
          sections: [
            {
              id: 'sec_ba_1',
              type: 'verse',
              sequenceOrder: 1,
              label: 'Verse 1',
              lines: [
                'Blessed assurance, Jesus is mine!',
                'Oh, what a foretaste of glory divine!',
                'Heir of salvation, purchase of God,',
                'Born of His Spirit, washed in His blood.'
              ]
            },
            {
              id: 'sec_ba_ch',
              type: 'chorus',
              sequenceOrder: 2,
              label: 'Chorus',
              lines: [
                'This is my story, this is my song,',
                'Praising my Savior all the day long;',
                'This is my story, this is my song,',
                'Praising my Savior all the day long.'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'hymn_holy_holy_holy',
      canonicalTitle: 'Holy, Holy, Holy! Lord God Almighty',
      alternativeTitles: ['Holy, Holy, Holy', 'Nicaea'],
      author: 'Reginald Heber (1826)',
      copyright: 'Public Domain',
      license: 'Public Domain',
      language: 'en',
      licensing: {
        source: 'Hymns Adapted to Weekly Church Service (1826)',
        copyrightOwner: 'Public Domain',
        licenseType: 'public_domain',
        attribution: 'Reginald Heber (1826) — Public Domain',
        offlineStoragePermission: true,
        redistributionPermission: true,
        aiProcessingPermission: true,
        verificationStatus: 'verified'
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: 'ver_hhh_std',
          songId: 'hymn_holy_holy_holy',
          versionName: 'Standard',
          isDefault: true,
          sections: [
            {
              id: 'sec_hhh_1',
              type: 'verse',
              sequenceOrder: 1,
              label: 'Verse 1',
              lines: [
                'Holy, holy, holy! Lord God Almighty!',
                'Early in the morning our song shall rise to Thee;',
                'Holy, holy, holy! Merciful and mighty!',
                'God in three Persons, blessed Trinity!'
              ]
            }
          ]
        }
      ]
    }
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: 'audit_init',
      timestamp: Date.now(),
      action: 'authority_state_changed',
      operatorId: 'system',
      details: { message: 'Pulpit AI Virtual Engine Initialized with 3 Verified Seed Hymns.' }
    }
  ];

  const stagedImports: any[] = [];
  const backups: any[] = [];

  // Listeners
  const authorityListeners = new Set<(state: AuthorityState) => void>();
  const freeShowListeners = new Set<(snap: FreeShowStateSnapshot) => void>();
  const auditListeners = new Set<(event: AuditEvent) => void>();
  const audioLevelListeners = new Set<(metrics: any) => void>();
  const audioActivityListeners = new Set<(metrics: any) => void>();
  const transcriptListeners = new Set<(event: any) => void>();
  const scriptureListeners = new Set<(cand: SuggestionCandidate) => void>();
  const songListeners = new Set<(cand: SuggestionCandidate) => void>();

  const emitAuthority = () => authorityListeners.forEach((fn) => fn({ ...authorityState }));
  const emitFreeShow = () => freeShowListeners.forEach((fn) => fn({ ...freeShowSnapshot }));
  const emitAudit = (action: any, details?: any) => {
    const ev: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action,
      operatorId: 'operator',
      details
    };
    auditEvents.unshift(ev);
    auditListeners.forEach((fn) => fn(ev));
  };

  // Virtual background audio simulation
  setInterval(() => {
    const rms = Math.random() * 0.15 + 0.05;
    const db = Math.round(20 * Math.log10(rms));
    audioLevelListeners.forEach((fn) =>
      fn({ rmsLevel: rms, decibels: db, isClipping: false, isSilent: false })
    );
  }, 300);

  // 2. Construct window.pulpitAPI
  window.pulpitAPI = {
    getAuthorityState: async () => ({ ...authorityState }),
    setManualLock: async (active: boolean) => {
      authorityState.manualLockActive = active;
      authorityState.suggestionsEnabled = !active;
      authorityState.projectionPermission = active ? false : authorityState.operatorMode === 'manual';
      emitAuthority();
      emitAudit(active ? 'manual_lock_engaged' : 'manual_lock_released');
    },
    setOperatorMode: async (mode: any) => {
      authorityState.operatorMode = mode;
      emitAuthority();
      emitAudit('operator_mode_changed', { mode });
    },
    connectFreeShow: async () => {
      // Connect to virtual FreeShow mock
      freeShowSnapshot = {
        connected: true,
        status: 'connected',
        currentShowId: 'show_sunday_service',
        currentSlideIndex: 0,
        currentSlideText: 'Welcome to Sanctuary',
        isCleared: false,
        lastHeartbeat: Date.now()
      };
      authorityState.freeShowConnected = true;
      emitAuthority();
      emitFreeShow();
      emitAudit('freeshow_connected', { host: '127.0.0.1:5510 (Connected to FreeShow)' });
      return true;
    },
    disconnectFreeShow: async () => {
      freeShowSnapshot.connected = false;
      freeShowSnapshot.status = 'disconnected';
      authorityState.freeShowConnected = false;
      emitAuthority();
      emitFreeShow();
      emitAudit('freeshow_disconnected');
    },
    getFreeShowSnapshot: async () => ({ ...freeShowSnapshot }),
    dispatchOperatorCommand: async (action: any, data?: any) => {
      if (authorityState.manualLockActive) {
        return { success: false, reason: 'Emergency Manual Lock is active. Projection blocked.' };
      }
      if (action === 'clear_all') {
        freeShowSnapshot.isCleared = true;
        freeShowSnapshot.currentSlideText = '[Output Cleared]';
      } else if (action === 'show_slide' || action === 'update_text') {
        freeShowSnapshot.isCleared = false;
        freeShowSnapshot.currentSlideText = data?.text || data?.slideId || 'Slide Updated';
      }
      emitFreeShow();
      emitAudit('action_dispatched', { action, data });
      return { success: true };
    },
    approveCandidate: async (candidate: SuggestionCandidate) => {
      if (authorityState.manualLockActive) {
        return { success: false, reason: 'Projection inhibited: Manual Lock is active.' };
      }
      freeShowSnapshot.isCleared = false;
      freeShowSnapshot.currentSlideText = candidate.contentPreview;
      emitFreeShow();
      emitAudit('candidate_approved', {
        title: candidate.title,
        type: candidate.type,
        preview: candidate.contentPreview
      });
      return { success: true };
    },
    getAuditEvents: async () => [...auditEvents],
    getAudioDevices: async (): Promise<AudioInputDevice[]> => [
      { id: 'default_mic', name: 'Realtek High Definition Audio (Built-in)', channels: 1, sampleRate: 16000, isDefault: true },
      { id: 'virtual_line', name: 'Virtual Church Audio Feed (Stereo Line)', channels: 2, sampleRate: 48000, isDefault: false }
    ],
    selectAudioDevice: async (id: string) => ({
      id,
      name: id === 'default_mic' ? 'Realtek High Definition Audio' : 'Virtual Line',
      channels: 1,
      sampleRate: 16000,
      isDefault: id === 'default_mic'
    }),
    simulateSpeechInput: async (phrase: string) => {
      const transcriptEvent = {
        id: `tr_${Date.now()}`,
        segmentId: 'seg_1',
        sourceId: 'mic',
        timestamp: Date.now(),
        rawText: phrase,
        normalizedText: phrase.toLowerCase(),
        tokens: phrase.toLowerCase().split(' '),
        confidence: 0.94,
        latencyMs: 140
      };
      transcriptListeners.forEach((fn) => fn(transcriptEvent));

      // Check if reference detected
      if (phrase.toLowerCase().includes('john 3:16')) {
        const cand: SuggestionCandidate = {
          id: `cand_scripture_${Date.now()}`,
          type: 'scripture',
          title: 'John 3:16 (WEB)',
          contentPreview:
            'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
          confidence: 0.96,
          evidence: `Spoken reference matched verified WEB translation package: "John 3:16"`,
          detectedAt: Date.now(),
          status: 'pending',
          actionPayload: {
            action: 'update_text',
            data: {
              text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life. — John 3:16 (WEB)'
            },
            source: 'ai_scripture_engine',
            correlationId: `ref_${Date.now()}`
          }
        };
        scriptureListeners.forEach((fn) => fn(cand));
      } else if (phrase.toLowerCase().includes('romans 8:28')) {
        const cand: SuggestionCandidate = {
          id: `cand_scripture_${Date.now()}`,
          type: 'scripture',
          title: 'Romans 8:28 (WEB)',
          contentPreview:
            'We know that all things work together for good for those who love God, to those who are called according to his purpose.',
          confidence: 0.95,
          evidence: `Spoken reference matched verified WEB translation package: "Romans 8:28"`,
          detectedAt: Date.now(),
          status: 'pending',
          actionPayload: {
            action: 'update_text',
            data: {
              text: 'We know that all things work together for good for those who love God. — Romans 8:28 (WEB)'
            },
            source: 'ai_scripture_engine',
            correlationId: `ref_${Date.now()}`
          }
        };
        scriptureListeners.forEach((fn) => fn(cand));
      }
    },
    simulateSingingInput: async (lyrics: string) => {
      // 1. Emit singing acoustic mode
      audioActivityListeners.forEach((fn) =>
        fn({
          mode: 'singing',
          isSinging: true,
          isSpeech: false,
          harmonicity: 0.89,
          estimatedPitchHz: 261.63,
          pitchStability: 0.92,
          confidence: 0.91
        })
      );

      // 2. Emit transcript
      const transcriptEvent = {
        id: `tr_${Date.now()}`,
        segmentId: 'seg_singing',
        sourceId: 'mic',
        timestamp: Date.now(),
        rawText: lyrics,
        normalizedText: lyrics.toLowerCase(),
        tokens: lyrics.toLowerCase().split(' '),
        confidence: 0.92,
        latencyMs: 160
      };
      transcriptListeners.forEach((fn) => fn(transcriptEvent));

      // 3. Match against Amazing Grace
      if (lyrics.toLowerCase().includes('amazing grace') || lyrics.toLowerCase().includes('how sweet the sound')) {
        const cand: SuggestionCandidate = {
          id: `cand_song_${Date.now()}`,
          type: 'song',
          title: 'Amazing Grace — Verse 1',
          contentPreview:
            'Amazing grace! How sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.',
          confidence: 0.94,
          evidence: `Multi-signal acoustic match (harmonicity 0.89) + lyric line match (score 0.94)`,
          detectedAt: Date.now(),
          status: 'pending',
          actionPayload: {
            action: 'show_slide',
            data: {
              slideText:
                'Amazing grace! How sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.',
              title: 'Amazing Grace',
              label: 'Verse 1'
            },
            source: 'ai_song_engine',
            correlationId: `song_${Date.now()}`
          }
        };
        songListeners.forEach((fn) => fn(cand));
      }
    },
    getTranslations: async () => [
      { abbreviation: 'WEB', name: 'World English Bible', attribution: 'Public Domain' },
      { abbreviation: 'KJV', name: 'King James Version', attribution: 'Public Domain' }
    ],
    setActiveTranslation: async (id: string) => id,
    lookupPassage: async ({ book, chapter, verseStart }: any) => ({
      found: true,
      reference: { book, chapter, verseStart, translation: 'WEB' },
      formattedText: `[${verseStart}] For God so loved the world, that he gave his one and only Son...`,
      attribution: 'World English Bible (WEB) — Dedicated to the Public Domain'
    }),
    listSongs: async () => [...seedSongs],
    searchSongs: async (q: string) => {
      const qLower = q.toLowerCase();
      return seedSongs
        .filter((s) => s.canonicalTitle.toLowerCase().includes(qLower) || s.author?.toLowerCase().includes(qLower))
        .map((s) => ({
          song: s,
          matchedTitle: s.canonicalTitle.toLowerCase().includes(qLower),
          matchedLyrics: [],
          relevanceScore: 0.95
        }));
    },
    getSong: async (id: string) => seedSongs.find((s) => s.id === id) || null,
    stageSongFile: async ({ name }: any) => {
      const staged = {
        id: `staged_${Date.now()}`,
        draft: {
          title: name.replace(/\.[^/.]+$/, ''),
          author: 'Imported Author',
          sections: [
            { type: 'verse', label: 'Verse 1', lines: ['Imported lyric line 1', 'Imported lyric line 2'] },
            { type: 'chorus', label: 'Chorus', lines: ['Imported chorus line 1', 'Imported chorus line 2'] }
          ],
          sourceFormat: 'txt',
          sourceFileName: name
        },
        duplicateCheck: { isDuplicate: false, status: 'unique_new', existingSongsCount: seedSongs.length },
        stagedAt: Date.now(),
        reviewStatus: 'pending',
        rightsConfirmed: false
      };
      stagedImports.push(staged);
      return { success: true, staged: [staged], quarantined: true };
    },
    stageSongText: async (text: string, title?: string) => {
      const songTitle = title || 'Draft Hymn';
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const staged = {
        id: `staged_${Date.now()}`,
        draft: {
          title: songTitle,
          author: 'Church Archive',
          sections: [{ type: 'verse', label: 'Verse 1', lines }],
          sourceFormat: 'txt',
          sourceFileName: 'manual_entry.txt'
        },
        duplicateCheck: { isDuplicate: false, status: 'unique_new', existingSongsCount: seedSongs.length },
        stagedAt: Date.now(),
        reviewStatus: 'pending',
        rightsConfirmed: false
      };
      stagedImports.push(staged);
      return { success: true, staged };
    },
    listStagedImports: async () => [...stagedImports],
    approveImport: async (stagingId: string, options: any) => {
      const idx = stagedImports.findIndex((s) => s.id === stagingId);
      if (idx === -1) return null;
      const staged = stagedImports.splice(idx, 1)[0];
      const newSong: Song = {
        id: `song_${Date.now()}`,
        canonicalTitle: options.overrideTitle || staged.draft.title,
        alternativeTitles: [],
        author: options.overrideAuthor || staged.draft.author,
        language: 'en',
        copyright: 'Local Church',
        licensing: {
          source: staged.draft.sourceFileName,
          copyrightOwner: 'Local Church',
          licenseType: 'church_owned',
          attribution: options.overrideTitle || staged.draft.title,
          offlineStoragePermission: true,
          redistributionPermission: false,
          aiProcessingPermission: true,
          verificationStatus: 'verified'
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        versions: [
          {
            id: `ver_${Date.now()}`,
            songId: `song_${Date.now()}`,
            versionName: options.versionName || 'Standard',
            isDefault: true,
            sections: staged.draft.sections
          }
        ]
      };
      seedSongs.push(newSong);
      emitAudit('candidate_approved', { message: `Import approved into library: ${newSong.canonicalTitle}` });
      return newSong;
    },
    rejectImport: async (stagingId: string) => {
      const idx = stagedImports.findIndex((s) => s.id === stagingId);
      if (idx !== -1) {
        stagedImports.splice(idx, 1);
        return true;
      }
      return false;
    },
    createBackup: async () => {
      const b = {
        id: `backup_${Date.now()}`,
        timestamp: Date.now(),
        version: '0.1.0',
        contentChecksumSha256: 'a1b2c3d4e5f67890123456789abcdef0',
        totalSongs: seedSongs.length,
        totalVersions: seedSongs.length
      };
      backups.unshift(b);
      emitAudit('disaster_recovery_backup_created', { backupId: b.id });
      return { success: true, backup: b, backupPath: 'C:/PulpitAI/backups/pulpit-ai-backup-mock.json' };
    },
    listBackups: async () => [...backups],
    restoreBackup: async () => ({ success: true, restoredCount: seedSongs.length, errors: [] }),

    // Subscriptions
    onAuthorityStateChange: (fn: any) => {
      authorityListeners.add(fn);
      return () => authorityListeners.delete(fn);
    },
    onFreeShowStateChange: (fn: any) => {
      freeShowListeners.add(fn);
      return () => freeShowListeners.delete(fn);
    },
    onAuditEvent: (fn: any) => {
      auditListeners.add(fn);
      return () => auditListeners.delete(fn);
    },
    onAudioLevelChange: (fn: any) => {
      audioLevelListeners.add(fn);
      return () => audioLevelListeners.delete(fn);
    },
    onAudioActivityMode: (fn: any) => {
      audioActivityListeners.add(fn);
      return () => audioActivityListeners.delete(fn);
    },
    onTranscriptEvent: (fn: any) => {
      transcriptListeners.add(fn);
      return () => transcriptListeners.delete(fn);
    },
    onScriptureCandidate: (fn: any) => {
      scriptureListeners.add(fn);
      return () => scriptureListeners.delete(fn);
    },
    onSongCandidate: (fn: any) => {
      songListeners.add(fn);
      return () => songListeners.delete(fn);
    }
  };
}
