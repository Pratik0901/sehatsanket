import React, { useEffect, useRef } from 'react';
import { 
  ShieldAlert, AlertTriangle, Activity, Sparkles, 
  RotateCcw, X, ArrowRight, Zap, Volume2, VolumeX 
} from 'lucide-react';

export function RealTimeVariationModal({ 
  alert, 
  onDismiss, 
  onRunAnalysis, 
  onResetToNormal 
}) {
  const lastProblemRef = useRef(null);

  // Play gentle clinical telemetry chime when a new variation is flagged
  useEffect(() => {
    if (alert && alert.problem !== lastProblemRef.current) {
      lastProblemRef.current = alert.problem;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = alert.severity === 'Critical' ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(alert.severity === 'Critical' ? 880 : 587.33, ctx.currentTime); // A5 or D5
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch (e) {
        // AudioContext restricted before interaction
      }
    }
  }, [alert]);

  if (!alert) return null;

  const isCritical = alert.severity === 'Critical';

  return (
    <div className="fixed top-20 right-4 z-50 w-full max-w-lg animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto">
      <div 
        className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-2xl border-2 backdrop-blur-2xl transition-all duration-300 ${
          isCritical 
            ? 'bg-gradient-to-br from-slate-950 via-red-950 to-slate-900 border-red-500/80 shadow-red-500/25 ring-4 ring-red-500/20' 
            : 'bg-gradient-to-br from-slate-950 via-orange-950 to-slate-900 border-orange-500/80 shadow-orange-500/25 ring-4 ring-orange-500/20'
        }`}
      >
        {/* Glowing Background Radial */}
        <div className={`absolute -right-12 -top-12 w-44 h-44 rounded-full filter blur-3xl pointer-events-none ${
          isCritical ? 'bg-red-500/20' : 'bg-orange-500/20'
        }`} />

        {/* Top Header Bar */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
              isCritical ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'
            }`}>
              {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Real-Time Predictive Telemetry Flag</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${alert.badgeColor}`}>
                  {alert.severity} Risk
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug mt-0.5">
                {alert.problem}
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
            title="Dismiss real-time alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trigger Parameter Pill */}
        <div className="mt-3 py-1.5 px-3 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between text-xs font-mono relative z-10">
          <span className="text-slate-300 font-sans text-[11px] font-bold">Biomarker Delta:</span>
          <span className="font-black text-amber-300">{alert.triggerValue}</span>
        </div>

        {/* The Physiological Reason (Directly addresses the user prompt) */}
        <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Physiological Reason:
          </span>
          <p className="text-slate-200 leading-relaxed font-medium">
            {alert.reason}
          </p>
        </div>

        {/* Predicted Variation & Trajectory */}
        <div className="mt-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
              Predicted Variation Impact:
            </span>
            <span className="text-[11px] font-black text-white bg-purple-500/30 px-2 py-0.5 rounded-full border border-purple-400/30">
              Risk: {alert.predictedRiskScore}/100 ({alert.predictedRiskLevel})
            </span>
          </div>
          <p className="text-purple-100/90 leading-relaxed font-medium text-[11px]">
            {alert.prediction}
          </p>
        </div>

        {/* Recommended Action & Quick Buttons */}
        <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 relative z-10">
          <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
            ⚡ Real-time prediction from live telemetry slider
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetToNormal}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => {
                onRunAnalysis();
                onDismiss();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-brand-emerald hover:bg-emerald-600 active:scale-95 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-500/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthesize Twin</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
