import React, { useState, useEffect } from 'react';
import { Megaphone, Car, Baby, CreditCard, AlertCircle, X, Cast, Clock, Sparkles, Check, Trash2 } from 'lucide-react';

export type AnnouncementCategory = 'parking' | 'nursery' | 'giving' | 'custom';
export type AnnouncementStyle = 'amber' | 'indigo' | 'emerald';

export interface ActiveAnnouncement {
  id: string;
  category: AnnouncementCategory;
  text: string;
  durationSeconds: number;
  remainingSeconds: number;
  style: AnnouncementStyle;
  startedAt: number;
}

interface QuickAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcast: (text: string, durationSeconds: number, style: AnnouncementStyle) => void;
  onClearOverlay: () => void;
  activeAnnouncement: ActiveAnnouncement | null;
  freeShowConnected: boolean;
  isLocked: boolean;
}

export const QuickAnnouncementModal: React.FC<QuickAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onBroadcast,
  onClearOverlay,
  activeAnnouncement,
  freeShowConnected,
  isLocked
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory>('parking');
  const [duration, setDuration] = useState<number>(30); // 30s default auto-dismiss
  const [style, setStyle] = useState<AnnouncementStyle>('amber');

  // Parking fields
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('Toyota Corolla');
  const [parkingReason, setParkingReason] = useState<string>('Blocking the driveway');

  // Nursery fields
  const [childTag, setChildTag] = useState<string>('');
  const [nurseryLocation, setNurseryLocation] = useState<string>("Children's Church / Nursery");

  // Giving fields
  const [bankName, setBankName] = useState<string>('Zenith Bank');
  const [accountNumber, setAccountNumber] = useState<string>('1012345678');
  const [accountName, setAccountName] = useState<string>('RCCG Sanctuary of Praise');
  const [ussdCode, setUssdCode] = useState<string>('*966*000*123#');

  // Custom notice
  const [customText, setCustomText] = useState<string>('');

  // Auto-sync style based on category
  useEffect(() => {
    if (selectedCategory === 'parking') setStyle('amber');
    else if (selectedCategory === 'nursery') setStyle('indigo');
    else if (selectedCategory === 'giving') setStyle('emerald');
    else setStyle('amber');
  }, [selectedCategory]);

  // Construct formatted live lower-third text
  const computeAnnouncementText = (): string => {
    switch (selectedCategory) {
      case 'parking': {
        const plate = plateNumber.trim().toUpperCase() || 'LAG-412-XA';
        const model = vehicleModel.trim() || 'Vehicle';
        const reason = parkingReason.trim() || 'Please move immediately';
        return `🚗 PARKING ALERT: ${model} (${plate}) — ${reason}.`;
      }
      case 'nursery': {
        const tag = childTag.trim() || '#42';
        const loc = nurseryLocation.trim() || "Children's Department";
        return `👶 NURSERY CALL: Parent of Child with Tag ${tag}, please report to the ${loc}.`;
      }
      case 'giving': {
        const bank = bankName.trim() || 'Bank';
        const acc = accountNumber.trim() || '0000000000';
        const name = accountName.trim() || 'Church Account';
        const ussd = ussdCode.trim() ? ` | USSD: ${ussdCode.trim()}` : '';
        return `💳 TITHES & OFFERING: ${bank} | Acc: ${acc} | Name: ${name}${ussd}`;
      }
      case 'custom':
        return customText.trim() || 'ANNOUNCEMENT: Please remain seated for brief church announcements.';
      default:
        return '';
    }
  };

  const previewText = computeAnnouncementText();

  const handleBroadcast = () => {
    if (!previewText || isLocked || !freeShowConnected) return;
    onBroadcast(previewText, duration, style);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || selectedCategory !== 'custom')) {
      e.preventDefault();
      handleBroadcast();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="glass-panel w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-sm">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-white flex items-center gap-2">
                <span>Sanctuary Quick Announcements & Lower Third</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 font-mono">
                  Live Overlay
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Broadcast non-intrusive lower-third tickers onto sanctuary screens without stopping sermon slides.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 bg-slate-950/70 overflow-y-auto max-h-[80vh]">
          {/* Active Overlay Notice (if one is currently showing) */}
          {activeAnnouncement && (
            <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-amber-300">
                    Currently Active on Sanctuary Screens ({activeAnnouncement.remainingSeconds}s remaining)
                  </div>
                  <div className="text-xs text-slate-200 truncate font-medium mt-0.5">
                    "{activeAnnouncement.text}"
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearOverlay}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex-shrink-0"
              >
                Clear Now
              </button>
            </div>
          )}

          {/* Category Tabs */}
          <div className="grid grid-cols-4 gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedCategory('parking')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-all ${
                selectedCategory === 'parking'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Parking</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('nursery')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-all ${
                selectedCategory === 'nursery'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>Nursery</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('giving')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-all ${
                selectedCategory === 'giving'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Offering</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('custom')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-all ${
                selectedCategory === 'custom'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Custom</span>
            </button>
          </div>

          {/* Dynamic Category Form Fields */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col gap-3">
            {selectedCategory === 'parking' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    License Plate Number
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. LAG-412-XA"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 uppercase font-mono font-bold focus:border-amber-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Car Model / Color
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Silver Toyota Corolla"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Notice Reason
                  </label>
                  <input
                    type="text"
                    value={parkingReason}
                    onChange={(e) => setParkingReason(e.target.value)}
                    placeholder="e.g. Blocking driveway entrance / Headlights left on"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {selectedCategory === 'nursery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Child / Baby Tag #
                  </label>
                  <input
                    type="text"
                    value={childTag}
                    onChange={(e) => setChildTag(e.target.value)}
                    placeholder="e.g. #42 or Tag B-12"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Report Location
                  </label>
                  <input
                    type="text"
                    value={nurseryLocation}
                    onChange={(e) => setNurseryLocation(e.target.value)}
                    placeholder="e.g. Children's Department / Crèche"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-medium focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {selectedCategory === 'giving' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Zenith Bank"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1012345678"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. RCCG Sanctuary of Praise"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    USSD Transfer Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={ussdCode}
                    onChange={(e) => setUssdCode(e.target.value)}
                    placeholder="e.g. *966*000*123#"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {selectedCategory === 'custom' && (
              <div className="text-xs">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Custom Lower-Third Text
                </label>
                <textarea
                  rows={2}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type any custom notice or announcement to display across the bottom of the screen..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-violet-500 focus:outline-none resize-none"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Options: Duration & Style */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Auto-Dismiss Timer */}
            <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase">Auto-Dismiss:</span>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
              >
                <option value={15} className="bg-slate-900 text-slate-100">15 Seconds</option>
                <option value={30} className="bg-slate-900 text-slate-100">30 Seconds (Recommended)</option>
                <option value={60} className="bg-slate-900 text-slate-100">60 Seconds</option>
                <option value={0} className="bg-slate-900 text-slate-100">Manual Dismiss Only</option>
              </select>
            </div>

            {/* Visual Color Scheme */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStyle('amber')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  style === 'amber' ? 'bg-amber-600 text-white' : 'text-amber-400/70 hover:text-amber-300'
                }`}
              >
                Amber Warning
              </button>
              <button
                type="button"
                onClick={() => setStyle('indigo')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  style === 'indigo' ? 'bg-indigo-600 text-white' : 'text-indigo-400/70 hover:text-indigo-300'
                }`}
              >
                Indigo Info
              </button>
              <button
                type="button"
                onClick={() => setStyle('emerald')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  style === 'emerald' ? 'bg-emerald-600 text-white' : 'text-emerald-400/70 hover:text-emerald-300'
                }`}
              >
                Emerald Giving
              </button>
            </div>
          </div>

          {/* Live Lower-Third Stage Preview */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Sanctuary Display Lower-Third Preview:
            </span>
            <div className="relative aspect-[16/6] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-end p-3 shadow-inner">
              {/* Simulated background slide */}
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-xs font-mono select-none">
                [ Sanctuary Projector Slide Feed ]
              </div>

              {/* Lower Third Ticker Bar */}
              <div
                className={`relative z-10 px-4 py-2.5 rounded-lg border shadow-xl flex items-center space-x-2 text-xs font-bold leading-tight ${
                  style === 'amber'
                    ? 'bg-amber-950/95 border-amber-500/80 text-amber-200 shadow-amber-900/30'
                    : style === 'indigo'
                    ? 'bg-indigo-950/95 border-indigo-500/80 text-indigo-200 shadow-indigo-900/30'
                    : 'bg-emerald-950/95 border-emerald-500/80 text-emerald-200 shadow-emerald-900/30'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 animate-ping ${
                    style === 'amber'
                      ? 'bg-amber-400'
                      : style === 'indigo'
                      ? 'bg-indigo-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="truncate">{previewText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            {!freeShowConnected ? (
              <span className="text-rose-400 font-medium">FreeShow Disconnected</span>
            ) : isLocked ? (
              <span className="text-amber-400 font-medium">Manual Safety Locked</span>
            ) : (
              <span className="text-emerald-400 font-medium">Ready to Overlay</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all"
            >
              Cancel
            </button>

            {activeAnnouncement && (
              <button
                type="button"
                onClick={() => {
                  onClearOverlay();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 border border-slate-700 text-rose-300 text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Overlay</span>
              </button>
            )}

            <button
              type="button"
              disabled={!freeShowConnected || isLocked}
              onClick={handleBroadcast}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                style === 'amber'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/40 border border-amber-400/40'
                  : style === 'indigo'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-900/40 border border-indigo-400/40'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/40 border border-emerald-400/40'
              }`}
            >
              <Cast className="w-3.5 h-3.5" />
              <span>Broadcast Lower-Third Now</span>
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-black/30 text-[9px] font-mono text-white/80">
                ↵
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
