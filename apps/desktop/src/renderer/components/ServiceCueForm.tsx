import React from 'react';
import { Pencil, Save, X } from 'lucide-react';
import type { LiturgyCueItem } from './ServiceOrderModal.js';

interface ServiceCueFormProps {
  isAddingNew: boolean;
  editingIndex: number | null;
  editForm: Partial<LiturgyCueItem>;
  onChange: (updater: (prev: Partial<LiturgyCueItem>) => Partial<LiturgyCueItem>) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const ServiceCueForm: React.FC<ServiceCueFormProps> = ({
  isAddingNew,
  editingIndex,
  editForm,
  onChange,
  onCancel,
  onSave
}) => {
  return (
    <div className="p-4 bg-slate-900/95 border-b border-indigo-500/50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Pencil className="w-3.5 h-3.5" />
          <span>{isAddingNew ? 'Add New Liturgy Item' : `Edit Cue #${(editingIndex ?? 0) + 1}`}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
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
            onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g. Opening Hymn & Congregational Worship"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div className="col-span-1 sm:col-span-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subtitle / Notes</label>
          <input
            type="text"
            value={editForm.subtitle || ''}
            onChange={(e) => onChange((prev) => ({ ...prev, subtitle: e.target.value }))}
            placeholder="e.g. Song title, speaker name, or sermon series"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category</label>
          <select
            value={editForm.category || 'worship'}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, category: e.target.value as LiturgyCueItem['category'] }))
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
            onChange={(e) => onChange((prev) => ({ ...prev, showName: e.target.value }))}
            placeholder="e.g. Praise & Worship Set"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Scripture Reference</label>
          <input
            type="text"
            value={editForm.scriptureReference || ''}
            onChange={(e) => onChange((prev) => ({ ...prev, scriptureReference: e.target.value }))}
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
            onChange={(e) => onChange((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isAddingNew ? 'Create Service Item' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
};
