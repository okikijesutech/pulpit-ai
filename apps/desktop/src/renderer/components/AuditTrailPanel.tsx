import React from 'react';
import { AuditEvent } from '@pulpit-ai/shared-types';
import { ScrollText, ShieldCheck, AlertCircle, Info, ShieldAlert, Lock, CheckCircle2, X } from 'lucide-react';

interface AuditTrailPanelProps {
  events: AuditEvent[];
  onClose?: () => void;
}

export const AuditTrailPanel: React.FC<AuditTrailPanelProps> = ({ events, onClose }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'security':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'warning':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Info className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full shadow-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
            <ScrollText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              Authority Audit Log
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block">Tamper-Evident Trail</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-emerald-400" />
            <span>Immutable</span>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Audit Log panel to expand center workspace (Hotkey: L)"
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Audit Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ShieldCheck className="w-8 h-8 mb-2 opacity-25 text-emerald-400" />
            <p className="font-semibold text-slate-300 text-xs">Security Audit Armed</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              All operator actions, candidate approvals, and safety lock toggles are cryptographically recorded.
            </p>
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 flex items-start space-x-2.5 leading-relaxed transition-all shadow-sm"
            >
              <div className="mt-0.5 flex-shrink-0">{getSeverityIcon(ev.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-slate-400 gap-1">
                  <span className="font-bold text-slate-200 truncate uppercase text-[10px] tracking-wide">
                    {ev.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-500 text-[9px] flex-shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400 mt-1 text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-[9px]">
                    {ev.actor}
                  </span>
                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <span className="text-slate-500 truncate text-[9px]">
                      {JSON.stringify(ev.details)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* System Integrity Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>Authority Intact</span>
        </span>
        <span className="text-slate-600">Local Zero-Cloud</span>
      </div>
    </div>
  );
};
