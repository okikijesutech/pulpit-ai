import React from 'react';
import { AuditEvent } from '@pulpit-ai/shared-types';
import { ScrollText, ShieldCheck, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface AuditTrailPanelProps {
  events: AuditEvent[];
}

export const AuditTrailPanel: React.FC<AuditTrailPanelProps> = ({ events }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'security':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'warning':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-300">
        <div className="flex items-center space-x-2">
          <ScrollText className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Authority Audit Log
          </h2>
        </div>
        <span className="text-[11px] text-slate-500">Live Security Trail</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-xs">
            No audit records recorded yet.
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-start space-x-2 leading-relaxed"
            >
              <div className="mt-0.5">{getSeverityIcon(ev.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-slate-200 truncate uppercase">
                    {ev.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400 mt-0.5 text-[10px]">
                  <span>Actor: <strong className="text-slate-300">{ev.actor}</strong></span>
                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <span className="text-slate-500 truncate">
                      {JSON.stringify(ev.details)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
