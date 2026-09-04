import React, { useState } from 'react';
import { 
  Compass, ShieldCheck, AlertCircle, Clock, Pill, Stethoscope, 
  Send, CheckCircle2, ChevronRight, Sparkles, AlertTriangle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function HealthAnalysis({ 
  analysis, 
  onSubmitToDoctor, 
  isSubmittingMed 
}) {
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const trajectory = analysis?.trajectory;
  const precautions = analysis?.precautions || [];
  const recommendedAction = analysis?.recommendedAction;
  const med = analysis?.medicationConsideration;
  const riskLevel = analysis?.riskLevel || 'Stable';

  const handleSendToDoctor = async () => {
    if (!med) return;
    if (onSubmitToDoctor) {
      await onSubmitToDoctor(med);
    }
    setSubmittedSuccess(true);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
    setTimeout(() => {
      setSubmittedSuccess(false);
    }, 4000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft space-y-5">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-emerald" />
          <h3 className="font-black text-base text-slate-900 tracking-tight">
            Digital Twin Clinical Synthesis
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 font-mono">
          Updated: {analysis?.timestamp || 'Just now'}
        </span>
      </div>

      {/* 1. Potential Future Trajectory */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
            Potential Future Trajectory
          </h4>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {trajectory}
        </p>
        <span className="text-[10px] text-slate-400 italic block">
          * Dynamic projection derived from multi-vital correlation models. Non-deterministic clinical forecast.
        </span>
      </div>

      {/* 2. Precautions & Protective Measures */}
      <div className="space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Clinical Precautions & Protective Measures</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {precautions.map((prec, i) => (
            <div 
              key={i} 
              className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 flex items-start gap-2.5 text-xs text-emerald-950 font-medium"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>{prec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recommended Action */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Recommended Next Action</span>
        </span>
        <p className="text-xs font-black text-slate-900 leading-snug">
          {recommendedAction}
        </p>
      </div>

      {/* 4. Clinician-Reviewable Medication Consideration */}
      {med && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-50 via-slate-50 to-indigo-50 border-2 border-amber-200/80 space-y-3">
          
          {/* Header & Safety Disclaimer Banner */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-800" />
                <span>Requires Clinician Confirmation</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assigned: {med.suggestedDoctor}</span>
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900">
              {med.title}
            </h4>
          </div>

          {/* Medication Candidate Detail Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {med.candidateMedication}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {med.dosageInstructions}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {med.status}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
              <strong>Clinical Rationale:</strong> {med.rationale}
            </p>
          </div>

          {/* Governance Flow Notice */}
          <div className="p-2.5 rounded-xl bg-amber-100/50 text-[11px] text-amber-900 font-medium leading-relaxed flex items-start gap-2">
            <InfoIcon className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-extrabold">Safety & Governance Protocol:</p>
              <p className="text-[10px] text-amber-800 mt-0.5">
                Digital Twin → Risk Analysis → Treatment Consideration → Doctor Review → Patient
              </p>
            </div>
          </div>

          {/* Action Button: Send to Doctor for Verification */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-400">
              Transmits telemetry snapshot & suggested protocol to EHR.
            </span>

            <button
              onClick={handleSendToDoctor}
              disabled={isSubmittingMed || submittedSuccess}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
                submittedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {submittedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transmitted to Dr. Rao</span>
                </>
              ) : isSubmittingMed ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Consideration for Doctor Confirmation</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

function InfoIcon(props) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
