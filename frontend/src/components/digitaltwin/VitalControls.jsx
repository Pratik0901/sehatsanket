import React from 'react';
import { 
  Heart, Activity, Wind, Thermometer, Droplets, RotateCcw, 
  Play, Sparkles, Sliders, Zap, Check, ShieldAlert, AlertTriangle 
} from 'lucide-react';
import { VITAL_BOUNDS, DEMO_PRESETS } from '../../utils/digitalTwinConfig';

export function VitalControls({ 
  vitals, 
  onChangeVital, 
  onResetToNormal, 
  onRunAnalysis, 
  isAnalyzing,
  onApplyPreset,
  variationAlert 
}) {
  const controls = [
    {
      key: 'heartRate',
      label: 'Heart Rate',
      unit: 'BPM',
      icon: <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />,
      min: VITAL_BOUNDS.heartRate.min,
      max: VITAL_BOUNDS.heartRate.max,
      step: 1,
      normal: '60 - 100',
      accentColor: 'accent-rose-500'
    },
    {
      key: 'systolicBp',
      label: 'Systolic BP',
      unit: 'mmHg',
      icon: <Activity className="w-4 h-4 text-indigo-600" />,
      min: VITAL_BOUNDS.systolicBp.min,
      max: VITAL_BOUNDS.systolicBp.max,
      step: 1,
      normal: '90 - 129',
      accentColor: 'accent-indigo-600'
    },
    {
      key: 'diastolicBp',
      label: 'Diastolic BP',
      unit: 'mmHg',
      icon: <Activity className="w-4 h-4 text-indigo-600" />,
      min: VITAL_BOUNDS.diastolicBp.min,
      max: VITAL_BOUNDS.diastolicBp.max,
      step: 1,
      normal: '60 - 84',
      accentColor: 'accent-indigo-600'
    },
    {
      key: 'spo2',
      label: 'SpO₂ Saturation',
      unit: '%',
      icon: <Wind className="w-4 h-4 text-cyan-600" />,
      min: VITAL_BOUNDS.spo2.min,
      max: VITAL_BOUNDS.spo2.max,
      step: 1,
      normal: '95 - 100',
      accentColor: 'accent-cyan-600'
    },
    {
      key: 'temperature',
      label: 'Body Temperature',
      unit: '°F',
      icon: <Thermometer className="w-4 h-4 text-amber-600" />,
      min: VITAL_BOUNDS.temperature.min,
      max: VITAL_BOUNDS.temperature.max,
      step: 0.1,
      normal: '97.6 - 99.1',
      accentColor: 'accent-amber-600'
    },
    {
      key: 'respiratoryRate',
      label: 'Respiratory Rate',
      unit: '/min',
      icon: <Wind className="w-4 h-4 text-teal-600" />,
      min: VITAL_BOUNDS.respiratoryRate.min,
      max: VITAL_BOUNDS.respiratoryRate.max,
      step: 1,
      normal: '12 - 20',
      accentColor: 'accent-teal-600'
    },
    {
      key: 'glucose',
      label: 'Blood Glucose',
      unit: 'mg/dL',
      icon: <Droplets className="w-4 h-4 fill-emerald-600 text-emerald-600" />,
      min: VITAL_BOUNDS.glucose.min,
      max: VITAL_BOUNDS.glucose.max,
      step: 1,
      normal: '70 - 125',
      accentColor: 'accent-emerald-600'
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-soft space-y-5">
      
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-emerald" />
            <h3 className="font-black text-base text-slate-900 tracking-tight">
              Wearable & Sensor Telemetry Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time biometric data stream • Adjust sliders to simulate physiological changes
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetToNormal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Restore default healthy baseline values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Normal</span>
          </button>

          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-brand-emerald to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-95 text-white text-xs font-black shadow-md shadow-brand-emerald/30 transition cursor-pointer disabled:opacity-75"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Digital Twin Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Scenario Preset Chips for Hackathon Jury Demonstrations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Hackathon Demo Presets (1-Click Test Scenarios)</span>
          </span>
          <span className="text-[10px] text-slate-400">Click to instantly load vitals</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className="px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 hover:shadow-sm flex items-center gap-1.5 bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800 cursor-pointer"
            >
              <span>{preset.name}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${preset.badgeColor}`}>
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Predictive Flag & Reason Banner (Updates immediately as sliders move) */}
      {variationAlert ? (
        <div className={`p-4 rounded-3xl border-2 transition-all duration-300 shadow-xs animate-in fade-in duration-200 ${
          variationAlert.severity === 'Critical'
            ? 'bg-red-50/90 border-red-300 text-red-950'
            : 'bg-orange-50/90 border-orange-300 text-orange-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
              variationAlert.severity === 'Critical' 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-orange-500 text-white'
            }`}>
              {variationAlert.severity === 'Critical' ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${variationAlert.badgeColor}`}>
                    ⚡ Real-Time Variation: {variationAlert.severity} Risk
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-700 bg-white/70 px-2 py-0.5 rounded-lg border border-black/5">
                    {variationAlert.triggerValue}
                  </span>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                  Predicted Score: {variationAlert.predictedRiskScore}/100
                </span>
              </div>
              
              <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                {variationAlert.problem}
              </h4>
              
              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                <strong className="text-slate-900 font-extrabold">Physiological Reason:</strong> {variationAlert.reason}
              </p>
              
              <p className="text-[11px] font-medium text-slate-700 leading-relaxed pt-0.5">
                <strong className="text-slate-900 font-extrabold">Predicted Impact:</strong> {variationAlert.prediction}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900 font-medium shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span><strong>Live Sensor Telemetry:</strong> Sliders simulate real-time physiological vitals. Variations will immediately flag clinical reasons & predictions.</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold hidden sm:inline-block">🟢 Stable Homeostasis</span>
        </div>
      )}

      {/* Grid of Sliders for all 6 core vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        {controls.map((ctrl) => {
          const val = ctrl.key === 'temperature' 
            ? Number(vitals[ctrl.key] || 98.6).toFixed(1)
            : vitals[ctrl.key];

          return (
            <div 
              key={ctrl.key} 
              className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2 hover:border-slate-200 transition-colors"
            >
              {/* Header: Label, Icon, Value readout */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-xl bg-white flex items-center justify-center shadow-xs">
                    {ctrl.icon}
                  </div>
                  <span className="text-xs font-extrabold text-slate-800">
                    {ctrl.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded-xl border border-slate-200/60 shadow-2xs">
                  <span>{val}</span>
                  <span className="text-[10px] font-bold text-slate-500">{ctrl.unit}</span>
                </div>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={vitals[ctrl.key]}
                onChange={(e) => onChangeVital(ctrl.key, Number(e.target.value))}
                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${ctrl.accentColor}`}
              />

              {/* Slider bounds & normal range hint */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>Min: {ctrl.min}</span>
                <span className="text-slate-600 font-bold">Normal: {ctrl.normal}</span>
                <span>Max: {ctrl.max}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
