import React, { useState } from 'react';
import { 
  Microscope, CheckCircle2, Clock, ChevronDown, ChevronUp, 
  Pill, FlaskConical, Award, Building2, Gauge, Check, Sparkles, AlertCircle, ChevronRight
} from 'lucide-react';

export function PrescribedLabTestsCard({ patientLabOrders = [], onOpenLabBooking }) {
  // Global expansion state for the entire card (compact by default)
  const [isComponentExpanded, setIsComponentExpanded] = useState(false);
  // Per-order expansion inside the component if multiple orders exist
  const [expandedOrderId, setExpandedOrderId] = useState(
    patientLabOrders.length > 0 ? patientLabOrders[0].id : null
  );

  if (!patientLabOrders || patientLabOrders.length === 0) {
    return null;
  }

  // Aggregate statistics for the compact preview
  const totalOrders = patientLabOrders.length;
  const pendingOrders = patientLabOrders.filter(o => o.status !== 'lab_selected');
  const hasPendingAction = pendingOrders.length > 0;

  // Flatten tests for summary preview
  const allTests = patientLabOrders.flatMap(o => o.tests || []);
  const doctorsList = [...new Set(patientLabOrders.map(o => o.doctor_name).filter(Boolean))];

  return (
    <div className="rounded-3xl bg-white border border-indigo-100/80 shadow-soft hover:shadow-md transition-all overflow-hidden">
      
      {/* COMPACT CARD HEADER (Always Visible & Clickable to Expand) */}
      <div 
        onClick={() => setIsComponentExpanded(!isComponentExpanded)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/20 hover:bg-slate-50/80 transition select-none"
      >
        {/* Left Side: Icon, Title & Compact Badges */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
            <Microscope className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>Prescribed Diagnostic Lab Tests & Precision Laboratory Matcher</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black uppercase tracking-wider">
                Precision Ranked (CV &lt; 1.5%)
              </span>
            </div>

            {/* Quick Preview Information Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              <span>
                👨‍⚕️ Prescribed by <strong className="text-slate-800">{doctorsList.join(', ') || 'Attending Physician'}</strong>
              </span>
              <span>•</span>
              <span className="font-semibold text-indigo-900">
                🔬 {allTests.length} Diagnostic Test{allTests.length !== 1 ? 's' : ''} ({allTests.slice(0, 3).map(t => t.name).join(', ')}{allTests.length > 3 ? ` +${allTests.length - 3} more` : ''})
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Badges & Expand Trigger */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {hasPendingAction ? (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1 animate-pulse">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Select Lab ({pendingOrders.length})</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Labs Confirmed</span>
            </span>
          )}

          <button
            type="button"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              isComponentExpanded 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>{isComponentExpanded ? "Collapse" : "View Details & Match Labs"}</span>
            {isComponentExpanded ? (
              <ChevronUp className="w-4 h-4 text-white" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* EXPANDED FULL DETAILS (Shown when clicked) */}
      {isComponentExpanded && (
        <div className="p-5 sm:p-6 border-t border-indigo-100 bg-white space-y-6 animate-in fade-in duration-200">
          
          {/* Subheader Context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs text-slate-500">
            <p>
              Select accredited pathology laboratories based on diagnostic analyzer precision (CV%), manufacturer instruments, and analytical accuracy.
            </p>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 font-bold self-start sm:self-center">
              {totalOrders} Active Prescribed Order{totalOrders !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Orders List */}
          <div className="space-y-6">
            {patientLabOrders.map((order) => {
              const isSelected = order.status === 'lab_selected';
              const isOrderExpanded = expandedOrderId === order.id;
              const selectedLabId = order.selected_lab?.lab_id;

              return (
                <div 
                  key={order.id} 
                  className={`rounded-3xl border transition-all ${
                    isSelected 
                      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/20 via-white to-indigo-50/20 shadow-sm' 
                      : 'border-indigo-200 bg-white shadow-md'
                  }`}
                >
                  {/* Per-Order Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-black text-base text-slate-900">
                          Prescription & Lab Tests from {order.doctor_name}
                        </span>
                        {isSelected ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✓ Lab Confirmed: {order.selected_lab?.lab_name}</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Action Required: Select Laboratory</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Order ID: <span className="font-mono font-bold text-slate-700">{order.id}</span> • Prescribed on {order.created_at}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isOrderExpanded ? null : order.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                    >
                      <span>{isOrderExpanded ? "Hide Labs & Instruments" : "Show Labs & Instruments"}</span>
                      {isOrderExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Summary of Prescriptions & Tests */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Clinical Instructions */}
                    {order.clinical_notes && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
                        <span className="font-extrabold text-slate-900 block">Doctor's Clinical Directive:</span>
                        <p className="italic leading-relaxed">"{order.clinical_notes}"</p>
                      </div>
                    )}

                    {/* Prescribed Medications */}
                    {order.medications?.length > 0 && (
                      <div>
                        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mb-2">
                          <Pill className="w-4 h-4 text-emerald-600" />
                          <span>Prescribed Medications ({order.medications.length}):</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {order.medications.map((m, i) => (
                            <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                              💊 {m.name} ({m.dosage} • {m.frequency})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescribed Diagnostic Tests */}
                    <div>
                      <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mb-2">
                        <FlaskConical className="w-4 h-4 text-indigo-600" />
                        <span>Ordered Diagnostic Lab Tests ({order.tests?.length || 0}):</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {order.tests?.map((t, i) => (
                          <div key={i} className="text-xs font-bold px-3.5 py-2 rounded-2xl bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-2">
                            <span>🔬 {t.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-indigo-700 font-extrabold">
                              {t.category || "Diagnostic"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Laboratory Recommendations (Ranked by Precision & Accuracy) */}
                  {isOrderExpanded && (
                    <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      
                      {/* Explanatory Banner on Precision & Accuracy */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-200 text-xs space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-2 text-indigo-950 font-black">
                          <Award className="w-4 h-4 text-indigo-700" />
                          <span>How SehatSanketh AI Ranks Laboratories for Your Tests:</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          Diagnostic analyzers differ in analytical repeatability. Laboratories are ranked from <strong>Highest to Lowest Precision-Accuracy Index (PAI)</strong>.
                          A lower <strong>CV% (Coefficient of Variation)</strong> means the instrument produces virtually identical results under repeated testing, preventing false medical conclusions.
                        </p>
                      </div>

                      {/* Ranked Laboratories List */}
                      <div className="space-y-3.5">
                        {order.recommended_labs?.map((lab) => {
                          const isThisLabChosen = selectedLabId === lab.lab_id;

                          return (
                            <div
                              key={lab.lab_id}
                              className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                                isThisLabChosen
                                  ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/30 shadow-md'
                                  : 'border-slate-200 bg-white hover:border-indigo-300 shadow-xs'
                              }`}
                            >
                              {/* Lab Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                                    lab.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                    lab.rank === 2 ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                                    lab.rank === 3 ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    #{lab.rank}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="font-black text-sm text-slate-900">{lab.lab_name}</h4>
                                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                                        lab.badge_color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                                        lab.badge_color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {lab.clinical_precision_rating}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {lab.location} • Accreditations: <strong className="text-indigo-800">{lab.accreditations?.join(', ')}</strong>
                                    </p>
                                  </div>
                                </div>

                                {/* Precision Metric Callout */}
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-xs font-black text-indigo-950 block">
                                      {lab.precision_accuracy_index}% PAI
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700">
                                      Avg CV: {lab.average_cv_percent}% (Accuracy: {lab.average_accuracy_score}%)
                                    </span>
                                  </div>

                                  {isThisLabChosen ? (
                                    <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Selected</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onOpenLabBooking && onOpenLabBooking(order, lab)}
                                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                                    >
                                      <Building2 className="w-3.5 h-3.5" />
                                      <span>Select & Book Lab</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Instruments in Use Grid */}
                              <div className="mt-3.5 pt-1">
                                <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Diagnostic Analyzer Instruments & Company Specifications:</span>
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {lab.instruments?.map((inst, i) => (
                                    <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                                      <div className="flex items-start justify-between">
                                        <span className="font-extrabold text-slate-900 text-xs">{inst.instrument_name}</span>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                          CV: {inst.precision_cv_percent}%
                                        </span>
                                      </div>
                                      <p className="text-slate-600 text-[11px]">
                                        <strong>Company:</strong> {inst.company_name} ({inst.origin_country})
                                      </p>
                                      <p className="text-slate-500 text-[11px]">
                                        <strong>Type:</strong> {inst.technology_type}
                                      </p>
                                      <p className="text-[10px] text-indigo-700 font-medium pt-0.5">
                                        ✓ Analytical Accuracy: {inst.accuracy_score}% (Standard: {inst.reference_standard})
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Footer Details: Price, TAT, Home Collection */}
                              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                                    Total ₹{lab.estimated_price_inr}
                                  </span>
                                  <span className="text-slate-600 font-medium">
                                    ⏱ Turnaround: <strong>{lab.turnaround_time}</strong>
                                  </span>
                                  {lab.home_collection_available && (
                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Free Doorstep Phlebotomist</span>
                                    </span>
                                  )}
                                </div>

                                <p className="text-[10px] text-slate-400 italic">
                                  {lab.why_recommended}
                                </p>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
