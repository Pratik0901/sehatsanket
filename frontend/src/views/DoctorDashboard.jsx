import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Edit3, Video, 
  User, Activity, Pill, AlertTriangle, FileText, ChevronRight, 
  Check, Plus, Sparkles, Globe, UserCheck, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';

export function DoctorDashboard({ onOpenVideoConsult }) {
  const { user } = useAuth();
  const { currentLanguage, t } = useLanguage();

  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedMeds, setEditedMeds] = useState([]);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  // Doctor Schedule Slots
  const [scheduleSlots, setScheduleSlots] = useState([
    { id: 1, time: "10:00 AM", patient: "Available Slot", status: "Open" },
    { id: 2, time: "11:00 AM", patient: "Priya Sharma (Post-Op Incision Review)", status: "Booked", lang: "Hindi ⟷ English" },
    { id: 3, time: "12:00 PM", patient: "Available Slot", status: "Open" },
    { id: 4, time: "04:30 PM", patient: "Ramesh Kumar (CHF Follow-up)", status: "Booked", lang: "Kannada ⟷ English" },
    { id: 5, time: "06:00 PM", patient: "Available Slot", status: "Open" }
  ]);

  // Assigned Patients Roster
  const [assignedPatients, setAssignedPatients] = useState([
    {
      id: "p_02",
      name: "Ramesh Kumar",
      age: 58,
      gender: "Male",
      consultingSince: "18 months (Regular Patient)",
      diagnosis: "Congestive Heart Failure (NYHA Class II) & Type 2 Diabetes",
      spokenLang: "Kannada (ಕನ್ನಡ)",
      activeMeds: ["Furosemide 40mg (Daily)", "Metformin 500mg", "Atorvastatin 20mg"],
      readmissionRisk: 68.0,
      riskLevel: "High",
      clinicalSnapshot: "Discharged from Cardiology 10 days ago. Missed morning diuretic dose yesterday. Needs weight & edema monitoring."
    },
    {
      id: "p_01",
      name: "Priya Sharma",
      age: 34,
      gender: "Female",
      consultingSince: "6 months (Post-Op Follow-up)",
      diagnosis: "Post-Op Appendectomy (Discharged Day 6) & Hypertension",
      spokenLang: "Hindi (हिन्दी)",
      activeMeds: ["Amlodipine 5mg", "Paracetamol 650mg SOS", "Cefixime 200mg"],
      readmissionRisk: 14.0,
      riskLevel: "Low",
      clinicalSnapshot: "Wound healing normally. Incision site clean, sutures intact. Blood pressure stable at 122/82 mmHg."
    }
  ]);

  const [scheduleDoctorId, setScheduleDoctorId] = useState(user?.doctorId || 'doc_01');

  useEffect(() => {
    setScheduleDoctorId(user?.doctorId || 'doc_01');
  }, [user]);

  useEffect(() => {
    loadPrescriptions();
    loadSchedule();

    const interval = setInterval(() => {
      loadPrescriptions();
      loadSchedule();
    }, 2000);

    return () => clearInterval(interval);
  }, [user, scheduleDoctorId]);

  const loadSchedule = async () => {
    try {
      const docId = scheduleDoctorId || user?.doctorId || 'doc_01';
      const res = await api.getDoctorSchedule(docId);
      if (res && res.schedule) {
        setScheduleSlots(res.schedule);
      }
    } catch (e) {
      console.warn("Could not load schedule:", e);
    }
  };

  const loadPrescriptions = async () => {
    try {
      const res = await api.getPendingPrescriptions();
      setPendingPrescriptions(res || []);
      if (res && res.length > 0) {
        setSelectedPrescription(res[0]);
        setEditedMeds(res[0].medications || []);
        setEditedNotes(res[0].review_notes || '');
      }
    } catch (e) {
      console.warn("Could not load prescriptions:", e);
    }
  };

  const handleSelectPrescription = (presc) => {
    setSelectedPrescription(presc);
    setEditedMeds(presc.medications || []);
    setEditedNotes(presc.review_notes || '');
  };

  const handleConfirmPrescription = async (prescId, status) => {
    try {
      const targetPresc = pendingPrescriptions.find(p => p.id === prescId) || selectedPrescription;
      const medsToSubmit = (selectedPrescription?.id === prescId && editedMeds.length > 0) 
        ? editedMeds 
        : (targetPresc?.medications || []);

      await api.confirmPrescription(prescId, {
        doctor_id: user?.doctorId || user?.id || 'doc_05',
        status: status,
        modified_medications: medsToSubmit,
        review_notes: editedNotes || "Reviewed and clinically validated by attending physician."
      });

      const patientName = targetPresc?.patient_name || "Patient";
      setActionSuccess(`✓ Prescriptions Approved! Medicines successfully dispatched to ${patientName}'s dashboard & active medication reminders.`);
      
      // Refresh list
      setTimeout(() => {
        setActionSuccess(null);
        loadPrescriptions();
      }, 2500);
    } catch (e) {
      console.warn("Confirmation error:", e);
    }
  };

  return (
    <div className="space-y-6 pb-24 font-sans">
      
      {/* Doctor Header Profile Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80"}
            alt="Doctor"
            className="w-20 h-20 rounded-3xl object-cover border-2 border-blue-400 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black">{user?.name || "Dr. Rajesh Rao"}</h1>
              <button 
                onClick={() => setIsAvailable(!isAvailable)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
                  isAvailable ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/25 text-red-400 border border-red-500/40'
                }`}
              >
                {isAvailable ? '● Accepting Consults' : '○ On Break'}
              </button>
            </div>

            <p className="text-xs font-semibold text-blue-200 mt-1">
              Specialization: <span className="text-white font-bold">{user?.specialization || "General Physician & Internal Medicine"}</span>
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-blue-100 text-[11px] font-medium">
                <Globe className="w-3 h-3 text-brand-mint" />
                Spoken Languages: <strong className="uppercase">English, Hindi, Kannada, Telugu</strong>
              </span>
              <span className="text-slate-400 text-[11px]">• Apollo Metro Hospital (OPD Wing B)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenVideoConsult("consult_01", user?.name, "Priya Sharma")}
            className="px-5 py-3 rounded-2xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-brand-emerald/30 transition"
          >
            <Video className="w-4 h-4" />
            <span>Launch Video Consultation Room</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-3 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Two Column Grid: AI Prescription Confirmation Queue & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AI-Generated Prescription Confirmation Queue (PRD §4.3) */}
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {t('prescriptionQueue', 'AI Prescription Confirmation Queue')}
                </h2>
                <p className="text-xs text-slate-500">
                  Verify & approve AI medications before delivery to patient
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
              {pendingPrescriptions.length} Awaiting Verification
            </span>
          </div>

          {pendingPrescriptions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">All prescription drafts verified!</p>
              <p className="text-slate-400 mt-0.5">Any new Home Care triage drafts will appear here for your sign-off.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {pendingPrescriptions.map((presc) => (
                <div
                  key={presc.id}
                  onClick={() => handleSelectPrescription(presc)}
                  className={`p-5 rounded-3xl border transition-all ${
                    selectedPrescription?.id === presc.id
                      ? 'border-brand-emerald bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-emerald-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          {presc.patient_name}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                          AI Home Care Draft
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                        "{presc.ai_draft}"
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap ml-2">
                      {presc.created_at}
                    </span>
                  </div>

                  {/* Formulated Medicines Pills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {presc.medications?.map((m, i) => (
                      <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                        💊 {m.name} ({m.dosage})
                      </span>
                    ))}
                  </div>

                  {/* PROMINENT DIRECT ACTION BUTTONS ON CARD */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmPrescription(presc.id, 'Approved');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-brand-emerald/20 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Approve Medicine & Deliver</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPrescription(presc);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modify</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Prescription Detailed Editor Box */}
          {selectedPrescription && (
            <div className="p-5 rounded-3xl bg-slate-50 border-2 border-emerald-200/80 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Clinical Verification: {selectedPrescription.patient_name}
                  </span>
                </div>
                <span className="text-xs text-emerald-700 font-black">Ready for Sign-Off</span>
              </div>

              {/* AI Remedies */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                <p className="font-extrabold text-slate-800">Supportive Home Remedies:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                  {selectedPrescription.remedies?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Medication Editor */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
                  AI Formulated Medications (Doctor Can Adjust):
                </label>
                <div className="space-y-1.5">
                  {editedMeds.map((med, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => {
                          const updated = [...editedMeds];
                          updated[idx].name = e.target.value;
                          setEditedMeds(updated);
                        }}
                        className="flex-1 font-bold text-slate-800 border-none p-0 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...editedMeds];
                          updated[idx].dosage = e.target.value;
                          setEditedMeds(updated);
                        }}
                        className="w-44 text-slate-600 text-[11px] border-none p-0 focus:outline-none text-right font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  Doctor Clinical Signature & Advice:
                </label>
                <input
                  type="text"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="e.g. Approved. Take plenty of warm fluids. Return if fever persists past 3 days."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-brand-emerald focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => handleConfirmPrescription(selectedPrescription.id, 'Approved')}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/30 transition"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>✓ Approve Medicine & Deliver to Patient</span>
                </button>

                <button
                  onClick={() => handleConfirmPrescription(selectedPrescription.id, 'Rejected')}
                  className="py-3.5 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Doctor Consultation Schedule Calendar */}
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {t('consultationSchedule', 'Doctor Consultation Schedule')}
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time agenda with live consultation links
                </p>
              </div>
            </div>

            {/* Doctor View Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setScheduleDoctorId('doc_01')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  scheduleDoctorId === 'doc_01'
                    ? 'bg-white text-blue-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dr. Ching (Cardio)
              </button>
              <button
                onClick={() => setScheduleDoctorId('doc_05')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  scheduleDoctorId === 'doc_05'
                    ? 'bg-white text-blue-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dr. Rajesh (GP)
              </button>
              <button
                onClick={() => setScheduleDoctorId('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  scheduleDoctorId === 'all'
                    ? 'bg-white text-blue-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Bookings
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {scheduleSlots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                  slot.status === 'Booked'
                    ? 'bg-blue-50/60 border-blue-200'
                    : 'bg-slate-50/60 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-11 rounded-xl flex items-center justify-center font-extrabold text-xs ${
                    slot.status === 'Booked' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {slot.time}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-800">{slot.patient}</p>
                      {slot.doctor_name && (scheduleDoctorId === 'all' || slot.doctor_name !== user?.name) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                          {slot.doctor_name}
                        </span>
                      )}
                    </div>
                    {slot.lang && (
                      <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                        🌐 Live Subtitles: {slot.lang}
                      </p>
                    )}
                  </div>
                </div>

                {slot.status === 'Booked' ? (
                  <button
                    onClick={() => {
                      const cleanPatient = (slot.patient || "Priya Sharma").split('(')[0].trim();
                      onOpenVideoConsult(slot.consultation_id || "consult_01", user?.name, cleanPatient);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Call</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 px-3 py-1 rounded-full bg-slate-100">
                    Open Slot
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Assigned Patients Directory & Readmission Risk Monitor */}
      <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Assigned / Regular Patients Clinical History
              </h2>
              <p className="text-xs text-slate-500">
                Long-term clinical follow-up, diagnoses, and readmission risk indicators
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700">2 Patients In Active Care</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedPatients.map((patient) => (
            <div
              key={patient.id}
              className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900">{patient.name}</h3>
                    <span className="text-xs text-slate-500 font-medium">({patient.age} yrs • {patient.gender})</span>
                  </div>
                  <p className="text-xs font-bold text-blue-700 mt-0.5">
                    {patient.consultingSince} • Speaks {patient.spokenLang}
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                  patient.riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {patient.readmissionRisk}% Risk ({patient.riskLevel})
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                <p className="font-extrabold text-slate-800">Primary Diagnosis:</p>
                <p className="text-slate-600">{patient.diagnosis}</p>
                <p className="font-extrabold text-slate-800 pt-1">Active Medications:</p>
                <p className="text-slate-600 text-[11px]">{patient.activeMeds.join(', ')}</p>
              </div>

              <div className="text-xs text-slate-600 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                <span className="font-bold text-emerald-900">Clinical Snapshot: </span>
                <span>{patient.clinicalSnapshot}</span>
              </div>

              <div className="pt-1 flex items-center justify-end">
                <button
                  onClick={() => onOpenVideoConsult("consult_01", user?.name, patient.name || "Priya Sharma")}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Video Consultation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
