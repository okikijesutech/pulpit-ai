import React, { useState, useEffect } from 'react';
import {
  X,
  ListOrdered,
  Radio,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Music,
  Megaphone,
  CreditCard,
  Mic,
  HeartHandshake,
  RotateCcw,
  Play,
  Pencil,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Save
} from 'lucide-react';

export interface LiturgyCueItem {
  id: string;
  orderIndex: number;
  title: string;
  subtitle: string;
  category: 'loop' | 'prayer' | 'worship' | 'announcement' | 'giving' | 'sermon' | 'ministry' | 'dismissal';
  showName?: string;
  scriptureReference?: string;
  durationMinutes?: number;
  status: 'pending' | 'active' | 'completed';
}

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cues: LiturgyCueItem[];
  activeCueIndex: number;
  onSelectCue: (index: number) => void;
  onAdvanceCue: () => void;
  onResetService: () => void;
  onUpdateCue?: (index: number, updated: Partial<LiturgyCueItem>) => void;
  onAddCue?: (cue: Omit<LiturgyCueItem, 'id' | 'orderIndex' | 'status'>) => void;
  onRemoveCue?: (index: number) => void;
  onMoveCue?: (fromIndex: number, toIndex: number) => void;
  freeShowConnected: boolean;
  isLocked: boolean;
}

export const DEFAULT_SUNDAY_LITURGY: LiturgyCueItem[] = [
  {
    id: 'cue_preservice',
    orderIndex: 0,
    title: 'Pre-Service Welcome & Countdown',
    subtitle: 'Welcome to Church • Service beginning shortly',
    category: 'loop',
    showName: 'Pre-Service Loop',
    durationMinutes: 15,
    status: 'active'
  },
  {
    id: 'cue_call_to_worship',
    orderIndex: 1,
    title: 'Call to Worship & Scripture Reading',
    subtitle: 'Psalm 100: Enter His gates with thanksgiving',
    category: 'prayer',
    scriptureReference: 'Psalm 100:1-5',
    durationMinutes: 5,
    status: 'pending'
  },
  {
    id: 'cue_praise_worship',
    orderIndex: 2,
    title: 'Praise & Congregational Worship Set',
    subtitle: '10,000 Reasons • Blessed Assurance • Way Maker',
    category: 'worship',
    showName: 'Praise & Worship Set',
    durationMinutes: 25,
    status: 'pending'
  },
  {
    id: 'cue_announcements',
    orderIndex: 3,
    title: 'Weekly Church Announcements',
    subtitle: 'Midweek Bible Study • Youth Fellowship • Men & Women',
    category: 'announcement',
    showName: 'Weekly Announcements',
    durationMinutes: 8,
    status: 'pending'
  },
  {
    id: 'cue_tithes_giving',
    orderIndex: 4,
    title: 'Tithes & Kingdom Offering',
    subtitle: '2 Corinthians 9:7 • God loves a cheerful giver',
    category: 'giving',
    showName: 'Tithes & Offering Giving',
    durationMinutes: 7,
    status: 'pending'
  },
  {
    id: 'cue_sermon',
    orderIndex: 5,
    title: 'Pastoral Sermon & Word Ministration',
    subtitle: 'Series: Faith Unshakable • Speaker: Pastor David',
    category: 'sermon',
    showName: 'Sermon Deck - Faith Unshakable',
    durationMinutes: 40,
    status: 'pending'
  },
  {
    id: 'cue_altar_call',
    orderIndex: 6,
    title: 'Altar Call & Ministry Prayer',
    subtitle: 'Salvation, Dedication & Pastoral Healing Prayer',
    category: 'ministry',
    showName: 'Altar Call & Prayer',
    durationMinutes: 10,
    status: 'pending'
  },
  {
    id: 'cue_benediction',
    orderIndex: 7,
    title: 'Closing Hymn & Benediction Dismissal',
    subtitle: 'Numbers 6:24-26 • The Lord bless you and keep you',
    category: 'dismissal',
    scriptureReference: 'Numbers 6:24-26',
    durationMinutes: 5,
    status: 'pending'
  }
];

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  isOpen,
  onClose,
  cues = DEFAULT_SUNDAY_LITURGY,
  activeCueIndex,
  onSelectCue,
  onAdvanceCue,
  onResetService,
  onUpdateCue,
  onAddCue,
  onRemoveCue,
  onMoveCue,
  freeShowConnected,
  isLocked
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<Partial<LiturgyCueItem>>({});

  // Keyboard listener inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingIndex !== null || isAddingNew) {
          setEditingIndex(null);
          setIsAddingNew(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingIndex, isAddingNew]);

  if (!isOpen) return null;

  const currentCue = cues[activeCueIndex] || cues[0];
  const nextCue = activeCueIndex < cues.length - 1 ? cues[activeCueIndex + 1] : null;

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setIsAddingNew(false);
    setEditForm({ ...cues[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && onUpdateCue) {
      onUpdateCue(editingIndex, editForm);
      setEditingIndex(null);
    }
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingIndex(null);
    setEditForm({
      title: 'New Service Item',
      subtitle: 'Description or notes for this segment',
      category: 'worship',
      showName: '',
      scriptureReference: '',
      durationMinutes: 10
    });
  };

  const handleSaveAdd = () => {
    if (onAddCue && editForm.title) {
      onAddCue({
        title: editForm.title,
        subtitle: editForm.subtitle || '',
        category: editForm.category || 'worship',
        showName: editForm.showName || undefined,
        scriptureReference: editForm.scriptureReference || undefined,
        durationMinutes: editForm.durationMinutes || 10
      });
      setIsAddingNew(false);
    }
  };

  const getCategoryIcon = (category: LiturgyCueItem['category']) => {
    switch (category) {
      case 'loop':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'prayer':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'worship':
        return <Music className="w-4 h-4 text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case 'giving':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'sermon':
        return <Mic className="w-4 h-4 text-cyan-400" />;
      case 'ministry':
        return <HeartHandshake className="w-4 h-4 text-rose-400" />;
      case 'dismissal':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      default:
        return <ListOrdered className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: LiturgyCueItem['category']) => {
    switch (category) {
      case 'loop':
        return 'bg-slate-900 text-slate-300 border-slate-700';
      case 'prayer':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      case 'worship':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'announcement':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'giving':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'sermon':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'ministry':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      case 'dismissal':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#090d1a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-sm">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Service Order Run-Sheet & Liturgy Sequencer
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800/60 text-amber-300 font-semibold">
                  Hotkey: O
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Customize, edit, reorder, and advance sanctuary cues in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartAdd}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
            <button
              onClick={onResetService}
              title="Reset to default Sunday liturgy"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Active Cue Pacer Banner */}
        <div className="px-5 py-3 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-xs font-bold animate-pulse shadow-sm">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>LIVE ON STAGE</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono">
                Cue {activeCueIndex + 1} of {cues.length}:
              </span>{' '}
              <span className="text-xs font-bold text-white">{currentCue?.title}</span>
            </div>
          </div>

          {nextCue && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 hidden md:inline">Coming up next:</span>
              <button
                type="button"
                onClick={onAdvanceCue}
                disabled={!freeShowConnected || isLocked}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-amber-900/30 flex items-center space-x-1.5 transition-all active:scale-95"
              >
                <span>Advance to: {nextCue.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Edit or Add Cue Drawer */}
        {(editingIndex !== null || isAddingNew) && (
          <div className="p-4 bg-slate-900/95 border-b border-indigo-500/50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Pencil className="w-3.5 h-3.5" />
                <span>{isAddingNew ? 'Add New Liturgy Item' : `Edit Cue #${(editingIndex ?? 0) + 1}`}</span>
              </span>
              <button
                onClick={() => {
                  setEditingIndex(null);
                  setIsAddingNew(false);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Opening Hymn & Congregational Worship"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subtitle / Notes</label>
                <input
                  type="text"
                  value={editForm.subtitle || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Song title, speaker name, or sermon series"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category</label>
                <select
                  value={editForm.category || 'worship'}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, category: e.target.value as LiturgyCueItem['category'] }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="loop">Loop (Countdown)</option>
                  <option value="prayer">Prayer</option>
                  <option value="worship">Worship</option>
                  <option value="announcement">Announcement</option>
                  <option value="giving">Giving</option>
                  <option value="sermon">Sermon</option>
                  <option value="ministry">Ministry / Altar Call</option>
                  <option value="dismissal">Dismissal</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">FreeShow Show Name</label>
                <input
                  type="text"
                  value={editForm.showName || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, showName: e.target.value }))}
                  placeholder="e.g. Praise & Worship Set"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Scripture Reference</label>
                <input
                  type="text"
                  value={editForm.scriptureReference || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, scriptureReference: e.target.value }))}
                  placeholder="e.g. Psalm 100:1-5"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={editForm.durationMinutes || 10}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setIsAddingNew(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={isAddingNew ? handleSaveAdd : handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isAddingNew ? 'Create Service Item' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Liturgy Cue Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {cues.map((cue, index) => {
            const isActive = index === activeCueIndex;
            const isCompleted = index < activeCueIndex;
            const isBeingEdited = editingIndex === index;

            return (
              <div
                key={cue.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                    : isBeingEdited
                      ? 'bg-indigo-950/40 border-indigo-500'
                      : isCompleted
                        ? 'bg-slate-950/60 border-slate-800/80 text-slate-400 opacity-80'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                {/* Left Cue Details */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Step Order Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 border ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : isCompleted
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : index + 1}
                  </div>

                  {/* Category Icon */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${getCategoryBadgeClass(
                      cue.category
                    )}`}
                  >
                    {getCategoryIcon(cue.category)}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-bold truncate ${isActive ? 'text-amber-200' : 'text-slate-100'}`}
                      >
                        {cue.title}
                      </span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-semibold border ${getCategoryBadgeClass(
                          cue.category
                        )}`}
                      >
                        {cue.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{cue.subtitle}</p>
                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-500 font-mono">
                      {cue.showName && <span>Show: {cue.showName}</span>}
                      {cue.scriptureReference && <span>Scripture: {cue.scriptureReference}</span>}
                      {cue.durationMinutes && <span>Duration: ~{cue.durationMinutes}m</span>}
                    </div>
                  </div>
                </div>

                {/* Right Interactive Actions */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {/* Reorder Buttons */}
                  {onMoveCue && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMoveCue(index, index - 1)}
                        title="Move Up"
                        className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === cues.length - 1}
                        onClick={() => onMoveCue(index, index + 1)}
                        title="Move Down"
                        className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(index)}
                    title="Edit item title, category, show name, or duration"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center space-x-1 border border-slate-700"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden md:inline text-[11px]">Edit</span>
                  </button>

                  {/* Delete Button */}
                  {onRemoveCue && cues.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveCue(index)}
                      title="Remove cue from liturgy"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Project / Go Live */}
                  <button
                    type="button"
                    onClick={() => onSelectCue(index)}
                    disabled={!freeShowConnected || isLocked}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-md font-extrabold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isActive ? 'Live' : 'Go Live'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span>
              Total Liturgy Items: <strong className="text-white">{cues.length}</strong>
            </span>
            <span>
              Estimated Service Duration:{' '}
              <strong className="text-white">
                {cues.reduce((acc, c) => acc + (c.durationMinutes || 0), 0)} mins
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
