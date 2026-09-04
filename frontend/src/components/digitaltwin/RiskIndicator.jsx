import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert, Activity, Sparkles } from 'lucide-react';

export function RiskIndicator({ analysis }) {
  const riskScore = analysis?.riskScore || 10;
  const riskLevel = analysis?.riskLevel || 'Stable';
  const healthState = analysis?.healthState || 'Optimal Physiological Homeostasis';
  const detectedSyndrome = analysis?.detectedSyndrome;
  const emergencyWarning = analysis?.emergencyWarning;
  const abnormalities = analysis?.abnormalities || [];

  const getRiskConfig = (level) => {
    switch (level) {
      case 'High':
        return {
          color: '#EF4444',
          bgClass: 'bg-red-50 border-red-200 text-red-900',
          badgeClass: 'bg-red-600 text-white',
          pillText: '🔴 High Risk',
          icon: <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />,
          barColor: 'bg-red-500'
        };
      case 'Elevated':
        return {
          color: '#F97316',
          bgClass: 'bg-orange-50 border-orange-200 text-orange-900',
          badgeClass: 'bg-orange-500 text-white',
          pillText: '🟠 Elevated Risk',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
          barColor: 'bg-orange-500'
        };
      case 'Moderate':
        return {
          color: '#F59E0B',
          bgClass: 'bg-amber-50 border-amber-200 text-amber-900',
          badgeClass: 'bg-amber-500 text-white',
          pillText: '🟡 Moderate Risk',
          icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
          barColor: 'bg-amber-500'
        };
      case 'Stable':
      default:
        return {
          color: '#10B981',
          bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          badgeClass: 'bg-emerald-600 text-white',
          pillText: '🟢 Stable',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
          barColor: 'bg-emerald-500'
        };
    }
  };

  const cfg = getRiskConfig(riskLevel);

  return (
    <div className={`p-5 rounded-3xl border shadow-sm ${cfg.bgClass} space-y-4 transition-all duration-300`}>
      
      {/* Top row: Indicator title, Level Pill, and Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-xs flex items-center justify-center">
            {cfg.icon}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
              Physiological Vulnerability Index
            </span>
            <h3 className="font-black text-lg sm:text-xl tracking-tight leading-tight">
              {healthState}
            </h3>
          </div>
        </div>

        <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs ${cfg.badgeClass}`}>
          {cfg.pillText}
        </span>
      </div>

      {/* Center Gauge: 0 - 100 Score with visual bar */}
      <div className="space-y-1.5 bg-white/70 backdrop-blur-xs p-3.5 rounded-2xl border border-black/5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-extrabold text-slate-700">
            Composite Risk Score
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {riskScore}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`}
            style={{ width: `${riskScore}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 pt-0.5">
          <span>0 (Low)</span>
          <span>25 (Moderate)</span>
          <span>50 (Elevated)</span>
          <span>75+ (Critical)</span>
        </div>
      </div>

      {/* Active Compound Syndrome Alert */}
      {detectedSyndrome && (
        <div className="p-3 rounded-2xl bg-white border border-red-200 text-red-900 text-xs font-extrabold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Sparkles className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>Pattern Detected: {detectedSyndrome}</span>
        </div>
      )}

      {/* Detected Abnormalities Pills */}
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-80 block mb-1.5">
          Detected Biomarker Deviations ({abnormalities.length})
        </span>

        {abnormalities.length === 0 ? (
          <div className="text-xs font-semibold text-emerald-800 bg-white/60 p-2.5 rounded-xl">
            ✓ All 6 core physiological biomarkers are within normal clinical thresholds.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {abnormalities.map((abn, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border bg-white flex items-center gap-1 shadow-2xs ${
                  abn.severity === 'Critical' ? 'border-red-300 text-red-700' :
                  abn.severity === 'Elevated' ? 'border-orange-300 text-orange-700' :
                  'border-amber-300 text-amber-700'
                }`}
              >
                <span>{abn.parameter}:</span>
                <span className="underline">{abn.value}</span>
                <span className="text-[9px] opacity-75">({abn.finding})</span>
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
