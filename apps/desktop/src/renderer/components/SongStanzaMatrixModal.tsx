import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Music,
  Radio,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Search,
} from "lucide-react";

export interface StanzaItem {
  id: string;
  type: string;
  label: string;
  lines: string[];
  sequenceOrder: number;
}

interface SongStanzaMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSongTitle?: string;
  currentSectionIndex?: number;
  onProjectStanza: (
    songTitle: string,
    sectionLabel: string,
    sectionIndex: number,
    textSnippet?: string,
  ) => void;
  onClearOutput?: () => void;
  freeShowConnected: boolean;
  isLocked: boolean;
}

// Default bundled church worship songs & hymns for instant offline launch
const DEFAULT_WORSHIP_SET: Array<{
  id: string;
  title: string;
  hymnNumber?: number;
  author: string;
  sections: StanzaItem[];
}> = [
  {
    id: "hymn_amazing_grace",
    title: "Amazing Grace",
    hymnNumber: 1,
    author: "John Newton",
    sections: [
      {
        id: "sec_ag_1",
        type: "verse",
        label: "Verse 1",
        sequenceOrder: 1,
        lines: [
          "Amazing grace! How sweet the sound",
          "That saved a wretch like me!",
          "I once was lost, but now am found;",
          "Was blind, but now I see.",
        ],
      },
      {
        id: "sec_ag_2",
        type: "verse",
        label: "Verse 2",
        sequenceOrder: 2,
        lines: [
          "'Twas grace that taught my heart to fear,",
          "And grace my fears relieved;",
          "How precious did that grace appear",
          "The hour I first believed.",
        ],
      },
      {
        id: "sec_ag_3",
        type: "verse",
        label: "Verse 3",
        sequenceOrder: 3,
        lines: [
          "Through many dangers, toils, and snares",
          "I have already come;",
          "'Tis grace hath brought me safe thus far,",
          "And grace will lead me home.",
        ],
      },
      {
        id: "sec_ag_4",
        type: "verse",
        label: "Verse 4",
        sequenceOrder: 4,
        lines: [
          "When we've been there ten thousand years,",
          "Bright shining as the sun,",
          "We've no less days to sing God's praise",
          "Than when we'd first begun.",
        ],
      },
    ],
  },
  {
    id: "hymn_blessed_assurance",
    title: "Blessed Assurance",
    hymnNumber: 2,
    author: "Fanny J. Crosby",
    sections: [
      {
        id: "sec_ba_1",
        type: "verse",
        label: "Verse 1",
        sequenceOrder: 1,
        lines: [
          "Blessed assurance, Jesus is mine!",
          "Oh, what a foretaste of glory divine!",
          "Heir of salvation, purchase of God,",
          "Born of His Spirit, washed in His blood.",
        ],
      },
      {
        id: "sec_ba_ch",
        type: "chorus",
        label: "Chorus",
        sequenceOrder: 2,
        lines: [
          "This is my story, this is my song,",
          "Praising my Savior all the day long;",
          "This is my story, this is my song,",
          "Praising my Savior all the day long.",
        ],
      },
      {
        id: "sec_ba_2",
        type: "verse",
        label: "Verse 2",
        sequenceOrder: 3,
        lines: [
          "Perfect submission, perfect delight,",
          "Visions of rapture now burst on my sight;",
          "Angels descending, bring from above",
          "Echoes of mercy, whispers of love.",
        ],
      },
      {
        id: "sec_ba_3",
        type: "verse",
        label: "Verse 3",
        sequenceOrder: 4,
        lines: [
          "Perfect submission, all is at rest,",
          "I in my Savior am happy and blest;",
          "Watching and waiting, looking above,",
          "Filled with His goodness, lost in His love.",
        ],
      },
    ],
  },
  {
    id: "hymn_rccg_anthem",
    title: "RCCG Anthem (We Are The Redeemed)",
    hymnNumber: 10,
    author: "Pastor E. A. Adeboye",
    sections: [
      {
        id: "sec_ra_1",
        type: "verse",
        label: "Verse 1",
        sequenceOrder: 1,
        lines: [
          "We are the Redeemed of God,",
          "Bought with the precious blood of Jesus,",
          "Called out of darkness into His marvelous light,",
          "To show forth His praises everywhere.",
        ],
      },
      {
        id: "sec_ra_ch",
        type: "chorus",
        label: "Chorus",
        sequenceOrder: 2,
        lines: [
          "We are the Redeemed,",
          "We are the church of the living God,",
          "We are the light of the world,",
          "Shining bright in the dark world.",
        ],
      },
      {
        id: "sec_ra_2",
        type: "verse",
        label: "Verse 2",
        sequenceOrder: 3,
        lines: [
          "And covenant people of God,",
          "Living in holiness every day,",
          "Walking in the love of Jesus Christ our Lord,",
          "Waiting for His glorious return.",
        ],
      },
    ],
  },
  {
    id: "song_way_maker",
    title: "Way Maker",
    author: "Sinach",
    sections: [
      {
        id: "sec_wm_1",
        type: "verse",
        label: "Verse 1",
        sequenceOrder: 1,
        lines: [
          "You are here, moving in our midst",
          "I worship You, I worship You",
          "You are here, working in this place",
          "I worship You, I worship You",
        ],
      },
      {
        id: "sec_wm_ch",
        type: "chorus",
        label: "Chorus",
        sequenceOrder: 2,
        lines: [
          "Way Maker, Miracle Worker, Promise Keeper",
          "Light in the darkness, my God, that is who You are",
          "Way Maker, Miracle Worker, Promise Keeper",
          "Light in the darkness, my God, that is who You are",
        ],
      },
      {
        id: "sec_wm_2",
        type: "verse",
        label: "Verse 2",
        sequenceOrder: 3,
        lines: [
          "You are here, touching every heart",
          "I worship You, I worship You",
          "You are here, healing every heart",
          "I worship You, I worship You",
        ],
      },
      {
        id: "sec_wm_br",
        type: "bridge",
        label: "Bridge",
        sequenceOrder: 4,
        lines: [
          "Even when I don’t see it, You’re working",
          "Even when I don’t feel it, You’re working",
          "You never stop, You never stop working",
          "You never stop, You never stop working",
        ],
      },
      {
        id: "sec_wm_tag",
        type: "tag",
        label: "Tag",
        sequenceOrder: 5,
        lines: [
          "That is who You are",
          "That is who You are",
          "That is who You are",
          "That is who You are",
        ],
      },
    ],
  },
];

export const SongStanzaMatrixModal: React.FC<SongStanzaMatrixModalProps> = ({
  isOpen,
  onClose,
  activeSongTitle,
  currentSectionIndex = 0,
  onProjectStanza,
  onClearOutput,
  freeShowConnected,
  isLocked,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);
  const [liveStanzaIndex, setLiveStanzaIndex] =
    useState<number>(currentSectionIndex);

  // Available song list (defaults merged with any matches)
  const songs = DEFAULT_WORSHIP_SET;

  // Filter songs by title or hymn number
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase().trim();

    // Check hymn number: e.g. "14", "hymn 2", "rccg 10"
    const numMatch = q.match(/\d+/);
    const searchNum = numMatch ? parseInt(numMatch[0], 10) : null;

    return songs.filter((s) => {
      if (s.title.toLowerCase().includes(q)) return true;
      if (s.author.toLowerCase().includes(q)) return true;
      if (searchNum !== null && s.hymnNumber === searchNum) return true;
      return false;
    });
  }, [searchQuery, songs]);

  const activeSong =
    filteredSongs[selectedSongIndex] || filteredSongs[0] || songs[0];

  // Sync if activeSongTitle is passed
  useEffect(() => {
    if (activeSongTitle) {
      const idx = songs.findIndex((s) =>
        s.title.toLowerCase().includes(activeSongTitle.toLowerCase()),
      );
      if (idx !== -1) {
        setSelectedSongIndex(idx);
      }
    }
  }, [activeSongTitle, songs]);

  useEffect(() => {
    setLiveStanzaIndex(currentSectionIndex);
  }, [currentSectionIndex]);

  // Keyboard shortcut listener for fast stanza navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in the search input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "1") {
        e.preventDefault();
        handleJumpStanza(0);
      } else if (e.key === "2") {
        e.preventDefault();
        handleJumpStanza(1);
      } else if (e.key === "3") {
        e.preventDefault();
        handleJumpStanza(2);
      } else if (e.key === "4") {
        e.preventDefault();
        handleJumpStanza(3);
      } else if (e.key === "c" || e.key === "C") {
        // Jump to first chorus
        const chIdx = activeSong.sections.findIndex((s) => s.type === "chorus");
        if (chIdx !== -1) {
          e.preventDefault();
          handleJumpStanza(chIdx);
        }
      } else if (e.key === "b" || e.key === "B") {
        // Jump to first bridge
        const brIdx = activeSong.sections.findIndex((s) => s.type === "bridge");
        if (brIdx !== -1) {
          e.preventDefault();
          handleJumpStanza(brIdx);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeSong, liveStanzaIndex, freeShowConnected, isLocked]);

  if (!isOpen) return null;

  const handleJumpStanza = (sectionIndex: number) => {
    if (!freeShowConnected || isLocked) return;
    const section = activeSong.sections[sectionIndex];
    if (!section) return;

    setLiveStanzaIndex(sectionIndex);
    const snippet = section.lines.join("\n");
    onProjectStanza(activeSong.title, section.label, sectionIndex, snippet);
  };

  const getSectionBadgeStyle = (type: string, isLive: boolean) => {
    if (isLive) {
      return "bg-emerald-950 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    }
    switch (type.toLowerCase()) {
      case "chorus":
        return "bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/50";
      case "bridge":
        return "bg-purple-950/40 border-purple-700/60 text-purple-300 hover:border-purple-500 hover:bg-purple-900/50";
      case "tag":
      case "pre_chorus":
      case "vamp":
        return "bg-amber-950/40 border-amber-700/60 text-amber-300 hover:border-amber-500 hover:bg-amber-900/50";
      case "outro":
      case "ending":
        return "bg-rose-950/40 border-rose-700/60 text-rose-300 hover:border-rose-500 hover:bg-rose-900/50";
      default: // verse
        return "bg-indigo-950/40 border-indigo-700/60 text-indigo-300 hover:border-indigo-500 hover:bg-indigo-900/50";
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150'>
      <div className='relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#090d1a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden'>
        {/* Header Bar */}
        <div className='flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80'>
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center shadow-sm'>
              <Music className='w-4 h-4' />
            </div>
            <div>
              <div className='flex items-center space-x-2'>
                <h2 className='text-sm font-bold text-white tracking-wide'>
                  Worship Stanza Matrix & Quick Hymn Launcher
                </h2>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950 border border-violet-800/60 text-violet-300 font-semibold'>
                  S
                </span>
              </div>
              <p className='text-[11px] text-slate-400'>
                1-click live stanza jumping • Now Loaded:{" "}
                <strong className='text-slate-200'>{activeSong.title}</strong>
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-3'>
            <button
              onClick={onClose}
              className='p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'
              title='Close Stanza Matrix [Esc]'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Toolbar: Hymn Number / Song Title Search Omnibar */}
        <div className='px-5 py-3 border-b border-slate-800/90 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3'>
          {/* Quick Lookup Input */}
          <div className='flex-1 max-w-md relative'>
            <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedSongIndex(0);
              }}
              placeholder='Search hymn # (e.g. 14, 2), song title, or lyrics...'
              className='w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-medium'
            />
          </div>

          {/* Song selector dropdown/pills */}
          <div className='flex items-center space-x-1.5 overflow-x-auto max-w-lg custom-scrollbar py-0.5'>
            {filteredSongs.slice(0, 4).map((song, idx) => (
              <button
                key={song.id}
                onClick={() => setSelectedSongIndex(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  idx === selectedSongIndex
                    ? "bg-violet-950 border-violet-500 text-violet-200 shadow-sm"
                    : "bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {song.hymnNumber ? `#${song.hymnNumber} ` : ""}
                {song.title}
              </button>
            ))}
          </div>
        </div>

        {/* Stanza Matrix Grid Area */}
        <div className='flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-[320px]'>
          <div className='flex items-center justify-between mb-3 px-1'>
            <div className='flex items-center space-x-2'>
              <span className='text-xs font-bold text-slate-300 uppercase tracking-wider'>
                {activeSong.title}
              </span>
              <span className='text-[11px] text-slate-500'>
                by {activeSong.author}
              </span>
            </div>
            <div className='flex items-center space-x-2 text-[11px] text-slate-400'>
              <span className='font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400'>
                Hotkeys: <kbd className='text-violet-300'>1..4</kbd> (Verses),{" "}
                <kbd className='text-emerald-300'>C</kbd> (Chorus),{" "}
                <kbd className='text-purple-300'>B</kbd> (Bridge)
              </span>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5'>
            {activeSong.sections.map((section, index) => {
              const isLive = index === liveStanzaIndex;
              const badgeStyle = getSectionBadgeStyle(section.type, isLive);

              return (
                <button
                  key={section.id}
                  onClick={() => handleJumpStanza(index)}
                  disabled={!freeShowConnected || isLocked}
                  className={`group relative text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[140px] cursor-pointer shadow-sm ${badgeStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {/* Top Bar: Section Badge & Live Status */}
                  <div className='flex items-center justify-between w-full mb-2'>
                    <span className='text-[11px] font-bold tracking-wider uppercase flex items-center space-x-1.5'>
                      <span>{section.label}</span>
                    </span>

                    {isLive ? (
                      <span className='flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/70 animate-pulse'>
                        <Radio className='w-2.5 h-2.5 text-emerald-400' />
                        <span>LIVE ON AIR</span>
                      </span>
                    ) : (
                      <span className='text-[10px] font-mono text-slate-500 group-hover:text-violet-300 transition-colors'>
                        Click to Fire
                      </span>
                    )}
                  </div>

                  {/* Lyrics Excerpt */}
                  <div className='flex-1 my-1'>
                    <p className='text-xs text-slate-200 line-clamp-3 leading-relaxed font-serif italic'>
                      "{section.lines.slice(0, 3).join(" / ")}"
                    </p>
                  </div>

                  {/* Footer Tag */}
                  <div className='mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]'>
                    <span className='text-slate-500 font-mono'>
                      {section.lines.length} lines
                    </span>
                    <span className='opacity-0 group-hover:opacity-100 text-violet-400 font-bold transition-opacity flex items-center space-x-1'>
                      <span>Project Now</span>
                      <ArrowRight className='w-3 h-3' />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation & Stepper Bar */}
        <div className='px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center space-x-2'>
            <button
              type='button'
              disabled={!freeShowConnected || isLocked || liveStanzaIndex <= 0}
              onClick={() => handleJumpStanza(Math.max(0, liveStanzaIndex - 1))}
              className='px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold transition-all flex items-center space-x-1.5 active:scale-95'
            >
              <ChevronLeft className='w-4 h-4' />
              <span>Previous Stanza</span>
            </button>

            <button
              type='button'
              disabled={
                !freeShowConnected ||
                isLocked ||
                liveStanzaIndex >= activeSong.sections.length - 1
              }
              onClick={() =>
                handleJumpStanza(
                  Math.min(activeSong.sections.length - 1, liveStanzaIndex + 1),
                )
              }
              className='px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs text-white font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95'
            >
              <span>Next Stanza</span>
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>

          <div className='flex items-center space-x-2.5'>
            {onClearOutput && (
              <button
                type='button'
                disabled={!freeShowConnected}
                onClick={() => {
                  onClearOutput();
                  onClose();
                }}
                className='px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95'
                title='Blackout Projector Screen [Esc]'
              >
                <EyeOff className='w-3.5 h-3.5 text-rose-400' />
                <span>Blackout Screen</span>
              </button>
            )}

            <button
              type='button'
              onClick={onClose}
              className='px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all'
            >
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
