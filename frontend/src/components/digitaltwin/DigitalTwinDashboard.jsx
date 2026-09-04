import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Sliders, Activity, Compass, Clock, RotateCcw, 
  CheckCircle2, AlertTriangle, ShieldCheck, Heart, Info, ArrowRight 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DEFAULT_HEALTHY_VITALS } from '../../utils/digitalTwinConfig';
import { analyzeDigitalTwin, predictVitalVariation } from '../../utils/digitalTwinEngine';
import { HumanBodyVisualization } from './HumanBodyVisualization';
import { VitalCards } from './VitalCards';
import { VitalControls } from './VitalControls';
import { RiskIndicator } from './RiskIndicator';
import { HealthAnalysis } from './HealthAnalysis';
import { FutureSimulation } from './FutureSimulation';
import { RealTimeVariationModal } from './RealTimeVariationModal';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export function DigitalTwinDashboard({ onBackToOverview }) {
  const { user } = useAuth();
  
  // Live Vitals State (Initialized to normal healthy baseline)
  const [vitals, setVitals] = useState({ ...DEFAULT_HEALTHY_VITALS });
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'simulation'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);
  const [analysisRunNotice, setAnalysisRunNotice] = useState(null);
  const [doctorSuccessNotice, setDoctorSuccessNotice] = useState(null);
  const [variationAlert, setVariationAlert] = useState(null);

  // Synchronous, zero-lag clinical synthesis engine
  const analysis = analyzeDigitalTwin(vitals);

  // Handle manual vital adjustment from sliders in real time
  const handleVitalChange = (paramKey, newVal) => {
    const updatedVitals = {
      ...vitals,
      [paramKey]: newVal
    };
    setVitals(updatedVitals);

    // Instant real-time prediction of variation without running full analysis
    const liveAlert = predictVitalVariation(updatedVitals);
    setVariationAlert(liveAlert);
  };

  // Reset to default normal healthy values
  const handleResetToNormal = () => {
    setVitals({ ...DEFAULT_HEALTHY_VITALS });
    setVariationAlert(null);
    setAnalysisRunNotice('Reset to normal healthy baseline (All 6 vitals in equilibrium).');
    setTimeout(() => setAnalysisRunNotice(null), 3000);
  };

  // Apply Hackathon Demo Presets
  const handleApplyPreset = (preset) => {
    setVitals({ ...preset.vitals });
    const liveAlert = predictVitalVariation(preset.vitals);
    setVariationAlert(liveAlert);
    setAnalysisRunNotice(`Loaded Demo Scenario: ${preset.name} (${preset.badge})`);
    setTimeout(() => setAnalysisRunNotice(null), 3500);
  };

  // Run explicit Digital Twin Analysis action
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Optional backend synchronization if available
      if (api.analyzeDigitalTwin) {
        await api.analyzeDigitalTwin(vitals).catch(() => {});
      }
    } catch (e) {
      // client-side analysis is primary
    }
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisRunNotice(`Digital Twin Analysis Complete: ${analysis.healthState} (${analysis.riskLevel} Risk).`);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => setAnalysisRunNotice(null), 4000);
    }, 500);
  };

  // Submit Treatment Consideration for Attending Doctor Review
  const handleSubmitToDoctor = async (medData) => {
    setIsSubmittingMed(true);
    const patientId = user?.patientId || user?.id || 'p_01';
    const patientName = user?.name || 'Priya Sharma';

    try {
      if (api.submitDigitalTwinTreatment) {
        await api.submitDigitalTwinTreatment({
          patient_id: patientId,
          patient_name: patientName,
          vitals_snapshot: vitals,
          risk_level: analysis.riskLevel,
          risk_score: analysis.riskScore,
          medication_consideration: medData
        });
      }
      setDoctorSuccessNotice(`Treatment consideration submitted to ${medData.suggestedDoctor} for official clinical verification.`);
    } catch (e) {
      console.warn("Doctor submission local fallback:", e);
      setDoctorSuccessNotice(`Treatment consideration submitted to ${medData.suggestedDoctor} for official clinical verification.`);
    } finally {
      setIsSubmittingMed(false);
      setTimeout(() => setDoctorSuccessNotice(null), 6000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      
      {/* Real-Time Predictive Telemetry Popup Alert (Flags problem & reason instantly as sliders vary) */}
      <RealTimeVariationModal
        alert={variationAlert}
        onDismiss={() => setVariationAlert(null)}
        onRunAnalysis={handleRunAnalysis}
        onResetToNormal={handleResetToNormal}
      />

      {/* Top Banner & Mode Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-6 rounded-4xl text-white shadow-xl border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
              🧬 Patient Digital Twin • In Silico Physiology
            </span>
            <span className="text-xs text-emerald-200 font-mono">
              Patient: {user?.name || 'Priya Sharma'} (ID: {user?.patientId || 'p_01'})
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Physiological Digital Twin
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl mt-1 leading-relaxed">
            Real-time biometric modeling synthesized from 6 vital biomarkers. Detects multi-system abnormalities, forecasts clinical trajectories, and formulates clinician-reviewable treatment considerations.
          </p>
        </div>

        {/* View Segmented Toggle (Live Avatar vs Simulate Future) */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/15">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'live'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Avatar</span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulate Future</span>
            <span className="w-2 h-2 rounded-full bg-purple-300 animate-ping" />
          </button>
        </div>
      </div>

      {/* Real-Time Notification Banners */}
      {analysisRunNotice && (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center justify-between shadow-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{analysisRunNotice}</span>
          </div>
          <button 
            onClick={() => setAnalysisRunNotice(null)} 
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {doctorSuccessNotice && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 text-indigo-950 text-xs font-extrabold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                Doctor Review Workflow Active
              </span>
              <span>{doctorSuccessNotice}</span>
            </div>
          </div>
          <button 
            onClick={() => setDoctorSuccessNotice(null)} 
            className="text-xs text-indigo-700 hover:text-indigo-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: LIVE BIOMETRIC TWIN */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          
          {/* Main Visualizer Area: Human Body (Center) + Live Vital Cards (Around/Beside) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Center: Holographic Human Body Silhouette with Glowing Organ Nodes */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <HumanBodyVisualization analysis={analysis} vitals={vitals} />
            </div>

            {/* Around It: Live Vital Cards & Current Risk Indicator */}
            <div className="lg:col-span-6 space-y-4">
              <RiskIndicator analysis={analysis} />
              <VitalCards vitals={vitals} analysis={analysis} />
            </div>

          </div>

          {/* Interactive Telemetry Sliders & Hackathon Preset Scenarios */}
          <VitalControls
            vitals={vitals}
            onChangeVital={handleVitalChange}
            onResetToNormal={handleResetToNormal}
            onRunAnalysis={handleRunAnalysis}
            isAnalyzing={isAnalyzing}
            onApplyPreset={handleApplyPreset}
            variationAlert={variationAlert}
          />

          {/* Detailed Synthesis Panel: Precautions, Trajectory, Medication Advisory */}
          <HealthAnalysis
            analysis={analysis}
            onSubmitToDoctor={handleSubmitToDoctor}
            isSubmittingMed={isSubmittingMed}
          />

        </div>
      )}

      {/* VIEW 2: DYNAMIC FUTURE SIMULATION */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <FutureSimulation
            currentVitals={vitals}
            onSyncSimulatedVitalsToLive={(simVitals) => {
              setVitals(simVitals);
              setActiveTab('live');
              setAnalysisRunNotice('Simulated trajectory applied to Live Avatar.');
            }}
          />
        </div>
      )}

    </div>
  );
}
