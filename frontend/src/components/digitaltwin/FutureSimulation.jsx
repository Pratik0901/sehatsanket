import React, { useState } from 'react';
import { 
  Sparkles, ArrowRight, TrendingUp, TrendingDown, Clock, 
  Sliders, ShieldCheck, AlertCircle, RefreshCw, Zap 
} from 'lucide-react';
import { analyzeDigitalTwin, simulateFuture } from '../../utils/digitalTwinEngine';
import { VITAL_BOUNDS } from '../../utils/digitalTwinConfig';

export function FutureSimulation({ currentVitals, onSyncSimulatedVitalsToLive }) {
  const [horizonHours, setHorizonHours] = useState(4);
  const [simulatedVitals, setSimulatedVitals] = useState({
    ...currentVitals,
    // Add default simulated variation for instant demonstration
    temperature: currentVitals.temperature > 100 ? 99.0 : 101.5,
    heartRate: currentVitals.heartRate > 100 ? 82 : 115
  });

  const handleVitalChange = (param, val) => {
    setSimulatedVitals(prev => ({
      ...prev,
      [param]: Number(val)
    }));
  };

  // Quick Simulation Scenarios
  const applySimScenario = (scenarioType) => {
    switch (scenarioType) {
      case 'untreated_deterioration':
        setSimulatedVitals({
          heartRate: Math.min(180, Math.round(currentVitals.heartRate * 1.25)),
          systolicBp: Math.min(210, Math.round(currentVitals.systolicBp * 1.2)),
          diastolicBp: Math.min(125, Math.round(currentVitals.diastolicBp * 1.15)),
          spo2: Math.max(78, currentVitals.spo2 - 7),
          temperature: Math.min(104.5, Number((currentVitals.temperature + 2.4).toFixed(1))),
          respiratoryRate: Math.min(42, currentVitals.respiratoryRate + 8),
          glucose: Math.min(380, currentVitals.glucose + 60)
        });
        break;
      case 'rapid_clinical_recovery':
        setSimulatedVitals({
          heartRate: 74,
          systolicBp: 118,
          diastolicBp: 78,
          spo2: 99,
          temperature: 98.6,
          respiratoryRate: 15,
          glucose: 96
        });
        break;
      case 'mild_improvement':
        setSimulatedVitals({
          heartRate: Math.max(72, currentVitals.heartRate - 12),
          systolicBp: Math.max(115, currentVitals.systolicBp - 10),
          diastolicBp: Math.max(75, currentVitals.diastolicBp - 6),
          spo2: Math.min(99, currentVitals.spo2 + 3),
          temperature: Math.max(98.6, Number((currentVitals.temperature - 1.2).toFixed(1))),
          respiratoryRate: Math.max(14, currentVitals.respiratoryRate - 4),
          glucose: Math.max(90, currentVitals.glucose - 25)
        });
        break;
      default:
        break;
    }
  };

  const simulationResult = simulateFuture(currentVitals, simulatedVitals, horizonHours);
  const { currentAnalysis, futureAnalysis, scoreDelta, trajectoryShift } = simulationResult;

  const isWorsening = scoreDelta > 0;
  const isImproving = scoreDelta < 0;

  const getLevelBadgeClass = (lvl) => {
    switch (lvl) {
      case 'High': return 'bg-red-500 text-white';
      case 'Elevated': return 'bg-orange-500 text-white';
      case 'Moderate': return 'bg-amber-500 text-white';
      case 'Stable':
      default: return 'bg-emerald-500 text-white';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft space-y-6">
      
      {/* Simulation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-slate-900 tracking-tight">
              🔮 Future Health Trajectory Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare live biometric state against prospective physiological progressions
          </p>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          {[2, 4, 6, 12, 24].map((hrs) => (
            <button
              key={hrs}
              onClick={() => setHorizonHours(hrs)}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                horizonHours === hrs
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              +{hrs}h
            </button>
          ))}
        </div>
      </div>

      {/* Quick What-If Intervention Scenarios */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Select Projection Scenario:</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => applySimScenario('untreated_deterioration')}
            className="p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-left transition cursor-pointer active:scale-95"
          >
            <span className="text-xs font-black text-red-900 block">⚠️ Natural Deterioration</span>
            <span className="text-[10px] text-red-700 block mt-0.5">Simulate worsening without clinical intervention</span>
          </button>
          <button
            onClick={() => applySimScenario('mild_improvement')}
            className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition cursor-pointer active:scale-95"
          >
            <span className="text-xs font-black text-amber-900 block">💧 Supportive Home Care</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">Hydration, Fowler rest, and temperature control</span>
          </button>
          <button
            onClick={() => applySimScenario('rapid_clinical_recovery')}
            className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition cursor-pointer active:scale-95"
          >
            <span className="text-xs font-black text-emerald-900 block">🏥 Clinical Pharmacotherapy</span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Rapid normalization following doctor-verified protocol</span>
          </button>
        </div>
      </div>

      {/* SIDE-BY-SIDE COMPARISON: Current State → Simulated State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        
        {/* Left Column: Current State */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Current Baseline (T = 0)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getLevelBadgeClass(currentAnalysis.riskLevel)}`}>
              {currentAnalysis.riskLevel}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-black text-slate-900">
              {currentAnalysis.riskScore} <span className="text-xs font-semibold text-slate-400">/ 100 Risk</span>
            </div>
            <p className="text-xs font-extrabold text-slate-800">
              {currentAnalysis.healthState}
            </p>
          </div>

          {/* Key Vitals Snapshot */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
            <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block">HR</span>
              <span className="font-black text-slate-900">{currentVitals.heartRate}</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block">SpO₂</span>
              <span className="font-black text-slate-900">{currentVitals.spo2}%</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block">Temp</span>
              <span className="font-black text-slate-900">{Number(currentVitals.temperature).toFixed(1)}°F</span>
            </div>
          </div>

          {/* Current Recommended Action */}
          <div className="text-xs text-slate-600 bg-white p-3 rounded-2xl border border-slate-200/80 leading-relaxed">
            <strong className="text-slate-800">Current Action:</strong> {currentAnalysis.recommendedAction}
          </div>
        </div>

        {/* Right Column: Simulated State */}
        <div className={`p-5 rounded-3xl border space-y-4 ${
          isWorsening ? 'bg-red-50/50 border-red-200' :
          isImproving ? 'bg-emerald-50/50 border-emerald-200' :
          'bg-purple-50/50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
              <span>Simulated Projection (T = +{horizonHours}h)</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getLevelBadgeClass(futureAnalysis.riskLevel)}`}>
              {futureAnalysis.riskLevel}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {futureAnalysis.riskScore}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 100 Risk</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                scoreDelta > 0 ? 'bg-red-200 text-red-800' :
                scoreDelta < 0 ? 'bg-emerald-200 text-emerald-800' :
                'bg-slate-200 text-slate-700'
              }`}>
                {scoreDelta > 0 ? `+${scoreDelta} (Worsening)` : `${scoreDelta} (Improving)`}
              </span>
            </div>
            <p className="text-xs font-extrabold text-slate-800">
              {futureAnalysis.healthState}
            </p>
          </div>

          {/* Key Vitals Snapshot with Deltas */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
            <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block">HR</span>
              <span className="font-black text-slate-900">{simulatedVitals.heartRate}</span>
              <span className={`text-[9px] font-bold block ${simulatedVitals.heartRate > currentVitals.heartRate ? 'text-red-600' : 'text-emerald-600'}`}>
                {simulatedVitals.heartRate >= currentVitals.heartRate ? `+${simulatedVitals.heartRate - currentVitals.heartRate}` : `${simulatedVitals.heartRate - currentVitals.heartRate}`}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block">SpO₂</span>
              <span className="font-black text-slate-900">{simulatedVitals.spo2}%</span>
              <span className={`text-[9px] font-bold block ${simulatedVitals.spo2 < currentVitals.spo2 ? 'text-red-600' : 'text-emerald-600'}`}>
                {simulatedVitals.spo2 >= currentVitals.spo2 ? `+${simulatedVitals.spo2 - currentVitals.spo2}` : `${simulatedVitals.spo2 - currentVitals.spo2}`}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block">Temp</span>
              <span className="font-black text-slate-900">{Number(simulatedVitals.temperature).toFixed(1)}°F</span>
              <span className={`text-[9px] font-bold block ${simulatedVitals.temperature > currentVitals.temperature ? 'text-red-600' : 'text-emerald-600'}`}>
                {Number(simulatedVitals.temperature - currentVitals.temperature).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Projected Future Recommended Action */}
          <div className="text-xs text-slate-700 bg-white p-3 rounded-2xl border border-slate-200/80 leading-relaxed">
            <strong className="text-slate-900">Simulated Action:</strong> {futureAnalysis.recommendedAction}
          </div>
        </div>

      </div>

      {/* Trajectory Transition Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
        isWorsening ? 'bg-red-100/70 border-red-200 text-red-900' :
        isImproving ? 'bg-emerald-100/70 border-emerald-200 text-emerald-900' :
        'bg-slate-100 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {isWorsening ? <TrendingUp className="w-5 h-5 text-red-600" /> : <TrendingDown className="w-5 h-5 text-emerald-600" />}
          <div>
            <span className="text-xs font-black uppercase tracking-wider block">
              Trajectory Evolution: {trajectoryShift}
            </span>
            <span className="text-[11px] font-medium opacity-85">
              {futureAnalysis.trajectory}
            </span>
          </div>
        </div>

        {onSyncSimulatedVitalsToLive && (
          <button
            onClick={() => onSyncSimulatedVitalsToLive(simulatedVitals)}
            className="px-3.5 py-2 rounded-xl bg-white shadow-xs text-xs font-extrabold hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer"
          >
            Apply to Live Avatar
          </button>
        )}
      </div>

      {/* Dynamic Simulated Vitals Sliders for Fine-Tuning */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-purple-600" />
            <span>Interactive Simulated Vitals Fine-Tuner</span>
          </span>
          <span className="text-[10px] text-slate-400">Drag sliders to test custom physiological what-ifs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {/* Simulated HR */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Simulated HR</span>
              <span>{simulatedVitals.heartRate} BPM</span>
            </div>
            <input
              type="range"
              min={VITAL_BOUNDS.heartRate.min}
              max={VITAL_BOUNDS.heartRate.max}
              value={simulatedVitals.heartRate}
              onChange={(e) => handleVitalChange('heartRate', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Simulated SpO2 */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Simulated SpO₂</span>
              <span>{simulatedVitals.spo2}%</span>
            </div>
            <input
              type="range"
              min={VITAL_BOUNDS.spo2.min}
              max={VITAL_BOUNDS.spo2.max}
              value={simulatedVitals.spo2}
              onChange={(e) => handleVitalChange('spo2', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Simulated Temp */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Simulated Temp</span>
              <span>{Number(simulatedVitals.temperature).toFixed(1)}°F</span>
            </div>
            <input
              type="range"
              min={VITAL_BOUNDS.temperature.min}
              max={VITAL_BOUNDS.temperature.max}
              step={0.1}
              value={simulatedVitals.temperature}
              onChange={(e) => handleVitalChange('temperature', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Simulated Resp Rate */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Simulated RR</span>
              <span>{simulatedVitals.respiratoryRate}/min</span>
            </div>
            <input
              type="range"
              min={VITAL_BOUNDS.respiratoryRate.min}
              max={VITAL_BOUNDS.respiratoryRate.max}
              value={simulatedVitals.respiratoryRate}
              onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          {/* Simulated Systolic BP */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Simulated Sys BP</span>
              <span>{simulatedVitals.systolicBp} mmHg</span>
            </div>
            <input
              type="range"
              min={VITAL_BOUNDS.systolicBp.min}
              max={VITAL_BOUNDS.systolicBp.max}
              value={simulatedVitals.systolicBp}
              onChange={(e) => handleVitalChange('systolicBp', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Simulated Glucose */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Simulated Glucose</span>
              <span>{simulatedVitals.glucose} mg/dL</span>
            </div>
            <input
              type="range"
              min={VITAL_BOUNDS.glucose.min}
              max={VITAL_BOUNDS.glucose.max}
              value={simulatedVitals.glucose}
              onChange={(e) => handleVitalChange('glucose', e.target.value)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
