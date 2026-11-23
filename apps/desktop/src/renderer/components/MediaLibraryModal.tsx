import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Star,
  Trash2,
  X,
  Cast,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore.js';
import { usePresentationStore, MediaCategory } from '../stores/presentationStore.js';
import { useAuthorityStore } from '../stores/authorityStore.js';

export const MediaLibraryModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.isMediaModalOpen);
  const onClose = useUIStore((s) => s.closeMediaModal);

  const mediaAssets = usePresentationStore((s) => s.mediaAssets);
  const churchLogoId = usePresentationStore((s) => s.churchLogoId);
  const activeMediaAsset = usePresentationStore((s) => s.activeMediaAsset);
  const addMediaAsset = usePresentationStore((s) => s.addMediaAsset);
  const removeMediaAsset = usePresentationStore((s) => s.removeMediaAsset);
  const setChurchLogo = usePresentationStore((s) => s.setChurchLogo);
  const projectMediaAsset = usePresentationStore((s) => s.projectMediaAsset);
  const clearActiveMedia = usePresentationStore((s) => s.clearActiveMedia);

  const freeShowConnected = useAuthorityStore((s) => s.freeShowSnapshot.connected);

  const [filterTab, setFilterTab] = useState<'all' | MediaCategory>('all');
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('flyer');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredAssets =
    filterTab === 'all' ? mediaAssets : mediaAssets.filter((a) => a.category === filterTab);

  const handleNativeImport = async () => {
    if (typeof window !== 'undefined' && window.pulpitAPI?.pickMediaFiles) {
      try {
        const res = await window.pulpitAPI.pickMediaFiles();
        if (res.canceled) return;
        for (const f of res.files) {
          addMediaAsset({
            name: f.name,
            category: uploadCategory,
            dataUrl: f.dataUrl,
            filePath: f.filePath
          });
        }
        if (res.files.length > 0) {
          setStatusMessage(`Imported ${res.files.length} graphic${res.files.length === 1 ? '' : 's'}`);
          setTimeout(() => setStatusMessage(null), 3000);
        } else if (res.errors.length > 0) {
          setStatusMessage(res.errors[0]);
        }
        return;
      } catch {
        // Fallback to browser file input below
      }
    }
    fileInputRef.current?.click();
  };

  const handleBrowserFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          addMediaAsset({
            name: file.name.replace(/\.[^.]+$/, ''),
            category: uploadCategory,
            dataUrl: reader.result
          });
        }
      };
      reader.readAsDataURL(file);
    });

    setStatusMessage(`Imported ${files.length} graphic${files.length === 1 ? '' : 's'}`);
    setTimeout(() => setStatusMessage(null), 3000);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-4xl max-h-[88vh] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">
                  Media, Church Logo &amp; Event Flyers
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-semibold">
                  Hotkey: G
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Import PNG, JPG, WebP, or SVG graphics and project church logos or announcement flyers live.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['all', 'logo', 'flyer', 'background'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  filterTab === tab
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? `All (${mediaAssets.length})` : tab === 'logo' ? 'Church Logo' : `${tab}s`}
              </button>
            ))}
          </div>

          {/* Import Controls */}
          <div className="flex items-center space-x-2">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="flyer">Tag as Flyer / Poster</option>
              <option value="logo">Tag as Church Logo</option>
              <option value="background">Tag as Background</option>
            </select>

            <button
              type="button"
              onClick={handleNativeImport}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Graphic</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              multiple
              onChange={handleBrowserFileInput}
              className="hidden"
            />
          </div>
        </div>

        {/* Active Projected Graphic Banner */}
        {activeMediaAsset && (
          <div className="px-6 py-2.5 bg-emerald-950/40 border-b border-emerald-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Currently Displaying: <strong>{activeMediaAsset.name}</strong></span>
            </div>
            <button
              type="button"
              onClick={clearActiveMedia}
              className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold flex items-center space-x-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Clear Graphic</span>
            </button>
          </div>
        )}

        {/* Media Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {statusMessage && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-cyan-950/50 border border-cyan-700/50 text-cyan-200 text-xs font-semibold">
              {statusMessage}
            </div>
          )}

          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40 text-center">
              <ImageIcon className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-200 mb-1">No Church Graphics Imported Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Import your Church Logo, Sunday event flyers, or announcement posters to project them to sanctuary screens with one click.
              </p>
              <button
                type="button"
                onClick={handleNativeImport}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Image Files</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => {
                const isLogo = asset.id === churchLogoId;
                const isLive = activeMediaAsset?.id === asset.id;

                return (
                  <div
                    key={asset.id}
                    className={`rounded-xl overflow-hidden border flex flex-col transition-all bg-slate-900/80 ${
                      isLive
                        ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* 16:9 Thumbnail */}
                    <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-2 left-2 text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-slate-200">
                        {asset.category}
                      </span>
                      {isLogo && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/90 text-slate-950 flex items-center space-x-1">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Default Logo</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 space-y-2.5">
                      <div className="text-xs font-bold text-slate-100 truncate" title={asset.name}>
                        {asset.name}
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          disabled={!freeShowConnected}
                          onClick={() => projectMediaAsset(asset)}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40 ${
                            isLive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          <Cast className="w-3.5 h-3.5" />
                          <span>{isLive ? 'Live' : 'Display'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setChurchLogo(isLogo ? null : asset.id)}
                          title={isLogo ? 'Unset as Default Church Logo' : 'Set as Default Church Logo'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isLogo
                              ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-amber-300'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isLogo ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeMediaAsset(asset.id)}
                          title="Delete graphic"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Star any image to bind it directly to the 1-click Church Logo button.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
