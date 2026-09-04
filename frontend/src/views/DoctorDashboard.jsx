import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Edit3, Video, 
  User, Activity, Pill, AlertTriangle, FileText, ChevronRight, 
  Check, Plus, Sparkles, Globe, UserCheck, ShieldCheck,
  FlaskConical, Microscope, Building2, Trash2, Gauge, Award, ChevronDown, ChevronUp,
  Star, MessageSquare, Heart, ThumbsUp, Search, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import { TeamsConsultationCalendar } from '../components/TeamsConsultationCalendar';

export function DoctorDashboard({ onOpenVideoConsult }) {
  const { user } = useAuth();
  const { currentLanguage, t } = useLanguage();

  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedMeds, setEditedMeds] = useState([]);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  // Diagnostic Lab Orders & Post-Consultation State
  const [labOrders, setLabOrders] = useState([]);
  const [isIssueOrderOpen, setIsIssueOrderOpen] = useState(false);
  const [orderPatientId, setOrderPatientId] = useState('p_01');
  const [orderMeds, setOrderMeds] = useState([
    { name: "Cefixime 200mg", dosage: "1 tablet", frequency: "Twice daily", instructions: "Post-op prophylactic antibiotic" },
    { name: "Paracetamol 650mg", dosage: "1 tablet SOS", frequency: "Max 3/day", instructions: "For surgical site soreness" }
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('Twice daily');
  const [orderClinicalNotes, setOrderClinicalNotes] = useState('Post-consultation evaluation: monitor inflammatory markers and organ recovery.');
  const [selectedTests, setSelectedTests] = useState(['t_cbc', 't_lft']);
  const [catalogTests, setCatalogTests] = useState([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [patientFeedbacks, setPatientFeedbacks] = useState([]);

  // Collapsible & Search States for Lab Orders & Feedback sections (smaller in size, expandable on click)
  const [isLabOrdersExpanded, setIsLabOrdersExpanded] = useState(false);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [labStatusFilter, setLabStatusFilter] = useState('all'); // 'all', 'confirmed', 'awaiting'
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);

  // Doctor Schedule Slots
  const [scheduleSlots, setScheduleSlots] = useState([
    { id: 1, time: "10:00 AM", patient: "Available Slot", status: "Open" },
    { id: 2, time: "11:00 AM", patient: "Priya Sharma (Post-Op Incision Review)", status: "Booked", lang: "Hindi ⟷ English" },
    { id: 3, time: "12:00 PM", patient: "Available Slot", status: "Open" },
    { id: 4, time: "04:30 PM", patient: "Ramesh Kumar (CHF Follow-up)", status: "Booked", lang: "Kannada ⟷ English" },
    { id: 5, time: "05:15 PM", patient: "Available Slot", status: "Open" }
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
    loadLabCatalog();
    loadLabOrders();
    loadFeedbacks();

    const interval = setInterval(() => {
      loadPrescriptions();
      loadSchedule();
      loadLabOrders();
      loadFeedbacks();
    }, 3000);

    return () => clearInterval(interval);
  }, [user, scheduleDoctorId]);

  const loadFeedbacks = async () => {
    try {
      const docId = user?.doctorId || user?.id || 'doc_05';
      const res = await api.getDoctorConsultationFeedback(docId);
      const list = Array.isArray(res) ? res : (res?.feedbacks || []);
      setPatientFeedbacks(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn("Could not load patient feedbacks:", e);
      setPatientFeedbacks([]);
    }
  };

  const loadLabCatalog = async () => {
    try {
      const res = await api.getLabCatalog();
      if (res && res.tests) {
        setCatalogTests(res.tests);
      }
    } catch (e) {
      console.warn("Could not load lab catalog:", e);
    }
  };

  const loadLabOrders = async () => {
    try {
      const docId = user?.doctorId || user?.id || 'doc_05';
      const res = await api.getDoctorLabOrders(docId);
      setLabOrders(res || []);
    } catch (e) {
      console.warn("Could not load doctor lab orders:", e);
    }
  };

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

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    setOrderMeds(prev => [
      ...prev,
      {
        name: newMedName.trim(),
        dosage: newMedDosage.trim() || "1 tablet",
        frequency: newMedFrequency,
        instructions: "As directed by physician"
      }
    ]);
    setNewMedName('');
    setNewMedDosage('');
  };

  const handleRemoveMedication = (idx) => {
    setOrderMeds(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleTestSelection = (testId) => {
    setSelectedTests(prev => 
      prev.includes(testId) ? prev.filter(t => t !== testId) : [...prev, testId]
    );
  };

  const handleSendPostConsultationOrder = async () => {
    if (selectedTests.length === 0 && orderMeds.length === 0) {
      alert("Please select at least one lab test or medication.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const targetPatient = assignedPatients.find(p => p.id === orderPatientId) || { name: "Priya Sharma" };
      const selectedTestObjects = catalogTests
        .filter(t => selectedTests.includes(t.id))
        .map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          clinical_significance: t.clinical_significance
        }));

      const payload = {
        consultation_id: "consult_01",
        patient_id: orderPatientId,
        doctor_id: user?.doctorId || user?.id || 'doc_05',
        doctor_name: user?.name || "Dr. Rajesh Rao",
        medications: orderMeds,
        remedies: [
          "Adequate hydration (2.5 - 3 Liters daily)",
          "Rest and observe symptom changes",
          "Follow up after lab reports are generated"
        ],
        clinical_notes: orderClinicalNotes,
        lab_tests: selectedTestObjects
      };

      const res = await api.createPostConsultationOrder(payload);
      setActionSuccess(`✓ Consultation Order Sent! Prescription & ${selectedTestObjects.length} Lab Tests dispatched to ${targetPatient.name}. Ranked laboratories are now available on patient dashboard.`);
      setIsIssueOrderOpen(false);
      loadLabOrders();
      loadPrescriptions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error("Failed to send post-consultation order:", err);
      alert("Error sending order: " + err.message);
    } finally {
      setIsSubmittingOrder(false);
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

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsIssueOrderOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-brand-mint" />
            <span>Issue Prescription & Lab Tests</span>
          </button>

          <button
            onClick={() => onOpenVideoConsult("consult_01", user?.name, "Priya Sharma")}
            className="px-5 py-3 rounded-2xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-brand-emerald/30 transition cursor-pointer"
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

        {/* Doctor Consultation Schedule Calendar (Microsoft Teams Calendar Scheduling) */}
        <TeamsConsultationCalendar
          scheduleSlots={scheduleSlots}
          onReloadSchedule={loadSchedule}
          onOpenVideoConsult={onOpenVideoConsult}
          assignedPatients={assignedPatients}
          user={user}
          scheduleDoctorId={scheduleDoctorId}
          setScheduleDoctorId={setScheduleDoctorId}
        />

      </div>

      {/* Diagnostic Lab Orders & Instrument Precision Analytics (Compact & Expandable on Click with Real-Time Search) */}
      {(() => {
        const totalLabOrders = labOrders.length;
        const confirmedLabOrdersCount = labOrders.filter(o => o.status === 'lab_selected').length;
        const pendingLabOrdersCount = labOrders.filter(o => o.status !== 'lab_selected').length;

        const filteredLabOrders = labOrders.filter(order => {
          if (labStatusFilter === 'confirmed' && order.status !== 'lab_selected') return false;
          if (labStatusFilter === 'awaiting' && order.status === 'lab_selected') return false;

          if (!labSearchQuery.trim()) return true;
          const q = labSearchQuery.toLowerCase().trim();

          if (order.patient_name?.toLowerCase().includes(q)) return true;
          if (order.doctor_name?.toLowerCase().includes(q)) return true;
          if (order.id?.toLowerCase().includes(q)) return true;
          if (order.selected_lab?.lab_name?.toLowerCase().includes(q) || order.selected_lab?.name?.toLowerCase().includes(q)) return true;
          if (order.tests?.some(t => t.name?.toLowerCase().includes(q))) return true;
          if (order.medications?.some(m => m.name?.toLowerCase().includes(q))) return true;
          if (order.instrument_details?.some(inst => 
            inst.instrument_name?.toLowerCase().includes(q) ||
            inst.company_name?.toLowerCase().includes(q) ||
            inst.technology_type?.toLowerCase().includes(q) ||
            inst.test_name?.toLowerCase().includes(q)
          )) return true;

          return false;
        });

        return (
          <div className="rounded-3xl bg-white border border-indigo-100/80 shadow-soft hover:shadow-md transition-all overflow-hidden">
            {/* COMPACT CARD HEADER (Clickable to Expand / Collapse) */}
            <div 
              onClick={() => setIsLabOrdersExpanded(!isLabOrdersExpanded)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/20 hover:bg-slate-50/80 transition select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
                  <Microscope className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      Diagnostic Lab Orders & Instrument Precision Analytics
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold uppercase tracking-wider">
                      Gold Standard Tracking
                    </span>
                  </div>
                  
                  {/* Compact Preview Information Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                    <span>
                      🔬 <strong className="text-slate-800">{totalLabOrders} Active Orders</strong>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      ✓ {confirmedLabOrdersCount} Confirmed
                    </span>
                    <span>•</span>
                    <span className="text-amber-700 font-semibold">
                      ⏱ {pendingLabOrdersCount} Awaiting Selection
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:inline text-slate-400">
                      CV% Precision & Analyzer Technology Specs
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsIssueOrderOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Create new lab order"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Order</span>
                </button>

                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    isLabOrdersExpanded 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{isLabOrdersExpanded ? "Collapse" : "Expand Analytics"}</span>
                  {isLabOrdersExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* EXPANDED CONTENT AREA WITH SEARCH */}
            {isLabOrdersExpanded && (
              <div className="p-5 sm:p-6 border-t border-indigo-100/80 bg-white space-y-5 animate-in fade-in duration-200">
                
                {/* Search & Filter Toolbar */}
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Search Bar Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={labSearchQuery}
                      onChange={(e) => setLabSearchQuery(e.target.value)}
                      placeholder="Search orders by patient, test (HbA1c, CBC), instrument (Sysmex, Roche), lab, or company..."
                      className="w-full text-xs pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 placeholder-slate-400 font-medium"
                    />
                    {labSearchQuery && (
                      <button
                        onClick={() => setLabSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setLabStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        labStatusFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All ({totalLabOrders})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabStatusFilter('confirmed')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        labStatusFilter === 'confirmed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Confirmed ({confirmedLabOrdersCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabStatusFilter('awaiting')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        labStatusFilter === 'awaiting'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Awaiting ({pendingLabOrdersCount})</span>
                    </button>
                  </div>
                </div>

                {/* Results Counter & Search Indicator */}
                {(labSearchQuery.trim() || labStatusFilter !== 'all') && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-500 font-medium">
                      Showing <strong className="text-slate-800">{filteredLabOrders.length}</strong> of {totalLabOrders} orders
                      {labSearchQuery.trim() && <span> matching "<strong className="text-indigo-600">{labSearchQuery}</strong>"</span>}
                    </span>
                    <button
                      onClick={() => {
                        setLabSearchQuery('');
                        setLabStatusFilter('all');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {/* Order Cards List or Empty State */}
                {filteredLabOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <FlaskConical className="w-8 h-8 text-indigo-400 mx-auto" />
                    <p className="font-extrabold text-slate-700">
                      {labSearchQuery.trim() 
                        ? `No diagnostic orders matching "${labSearchQuery}"`
                        : "No orders found in this category."}
                    </p>
                    {labSearchQuery.trim() && (
                      <button
                        onClick={() => setLabSearchQuery('')}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition cursor-pointer mt-1"
                      >
                        Clear Search Query
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLabOrders.map((order) => {
                      const isSelected = order.status === 'lab_selected';
                      const rep = order.precision_accuracy_report;
                      const lab = order.selected_lab;
                      const booking = order.booking_details;

                      return (
                        <div
                          key={order.id}
                          className={`p-6 rounded-3xl border transition-all ${
                            isSelected
                              ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 shadow-md'
                              : 'border-amber-200 bg-amber-50/30 shadow-sm'
                          }`}
                        >
                          {/* Order Top Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shadow-xs">
                                Rx
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-black text-sm sm:text-base text-slate-900">{order.patient_name}</h3>
                                  <span className="text-xs text-slate-400 font-medium">• Ordered by {order.doctor_name}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  Order ID: <span className="font-mono font-bold text-slate-700">{order.id}</span> • Issued: {order.created_at}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1 shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>✓ Lab Confirmed by Patient</span>
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Awaiting Patient Lab Choice</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Diagnostic Tests & Prescribed Medications */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Ordered Tests */}
                            <div className="p-4 rounded-2xl bg-white border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                  <FlaskConical className="w-4 h-4 text-indigo-600" />
                                  <span>Prescribed Diagnostic Tests ({order.tests?.length || 0}):</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {order.tests?.map((t, idx) => (
                                  <span key={idx} className="text-[11px] font-bold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-100 flex items-center gap-1">
                                    🔬 {t.name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Prescribed Medications */}
                            <div className="p-4 rounded-2xl bg-white border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                  <Pill className="w-4 h-4 text-emerald-600" />
                                  <span>Associated Prescribed Medications:</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {order.medications?.length > 0 ? (
                                  order.medications.map((m, idx) => (
                                    <span key={idx} className="text-[11px] font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100 flex items-center gap-1">
                                      💊 {m.name} ({m.dosage})
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No oral medications prescribed in this order.</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* When Patient Has Selected a Laboratory */}
                          {isSelected && lab && rep && (
                            <div className="mt-4 p-5 rounded-2xl bg-white border border-indigo-100 space-y-4 shadow-sm">
                              {/* Laboratory Title & Accreditation */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-indigo-600" />
                                    <h4 className="font-black text-sm text-slate-900">{lab.lab_name}</h4>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {lab.location} • Accreditations: <strong className="text-indigo-800">{lab.accreditations?.join(', ')}</strong>
                                  </p>
                                </div>

                                {booking && (
                                  <div className="text-xs text-right bg-indigo-50/70 px-3 py-1.5 rounded-xl border border-indigo-100">
                                    <span className="font-bold text-indigo-900">Sample Collection: </span>
                                    <span className="text-slate-700 font-semibold">{booking.collection_type}</span>
                                    <p className="text-[11px] text-slate-500 font-medium">Slot: {booking.scheduled_date} at {booking.scheduled_time}</p>
                                  </div>
                                )}
                              </div>

                              {/* Diagnostic Instruments Specifications Table */}
                              <div>
                                <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Instruments in Use & Analytical Precision Metrics:</span>
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {order.instrument_details?.map((inst, i) => (
                                    <div key={i} className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase">
                                            {inst.test_name}
                                          </span>
                                          <h5 className="text-xs font-black text-slate-900 mt-1">{inst.instrument_name}</h5>
                                        </div>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                          CV: {inst.precision_cv_percent}%
                                        </span>
                                      </div>

                                      <div className="text-[11px] text-slate-600 space-y-0.5">
                                        <p><strong>Company / Manufacturer:</strong> {inst.company_name} ({inst.origin_country})</p>
                                        <p><strong>Technology:</strong> {inst.technology_type}</p>
                                        <p><strong>Accuracy Score:</strong> <span className="text-emerald-700 font-bold">{inst.accuracy_score}%</span> (Precision: {inst.precision_score}%)</p>
                                        <p className="text-[10px] text-slate-500 italic pt-0.5">💡 {inst.clinical_impact}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Doctor Clinical Precision Summary Callout */}
                              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 flex items-start gap-3 text-xs">
                                <Award className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900">
                                      Clinician Precision Index: {rep.precision_accuracy_index}% PAI
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                                      {rep.clinical_precision_tier}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 mt-1 leading-relaxed">
                                    {rep.clinical_interpretation_note}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {!isSelected && (
                            <div className="mt-3 p-3.5 bg-amber-100/60 rounded-2xl border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-700" />
                                <span>Awaiting patient's lab selection. Patient has been provided with certified labs ranked from highest to lowest precision.</span>
                              </div>
                              <span className="text-[11px] font-bold text-amber-800">Ranked Labs Dispatched</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Patient Consultation Feedback & Multilingual Care Ratings (Compact & Expandable on Click) */}
      <div className="rounded-3xl bg-white border border-amber-100/80 shadow-soft hover:shadow-md transition-all overflow-hidden">
        {/* COMPACT CARD HEADER (Clickable to Expand / Collapse) */}
        {(() => {
          const feedbackList = Array.isArray(patientFeedbacks) ? patientFeedbacks.filter(f => !f.skipped) : [];
          const avgRating = feedbackList.length > 0 
            ? (feedbackList.reduce((acc, f) => acc + (f.rating || 5), 0) / feedbackList.length).toFixed(1)
            : "5.0";

          return (
            <div 
              onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer bg-gradient-to-r from-white via-amber-50/25 to-orange-50/20 hover:bg-slate-50/80 transition select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      Patient Consultation Feedback & Care Ratings
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      Live Multilingual AI Translation
                    </span>
                  </div>

                  {/* Compact Preview Information Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                    <span className="font-extrabold text-amber-700 flex items-center gap-1">
                      ⭐ {avgRating} Rating
                    </span>
                    <span>•</span>
                    <span className="text-slate-700 font-semibold">
                      {feedbackList.length} Verified Reviews
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:inline text-slate-400">
                      Verified Vernacular Translations (Kannada, Hindi, etc.)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Score Box & Expand Trigger */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                  <span className="text-lg font-black text-amber-600">{avgRating}</span>
                  <div className="flex items-center text-amber-400 text-xs">★★★★★</div>
                  <span className="text-[10px] text-slate-500 font-bold">({feedbackList.length})</span>
                </div>

                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    isFeedbackExpanded 
                      ? 'bg-amber-600 text-white shadow-sm' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{isFeedbackExpanded ? "Collapse" : `View Reviews (${feedbackList.length})`}</span>
                  {isFeedbackExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          );
        })()}

        {/* EXPANDED FEEDBACK LIST */}
        {isFeedbackExpanded && (
          <div className="p-5 sm:p-6 border-t border-amber-100/80 bg-white space-y-4 animate-in fade-in duration-200">
            {(() => {
              const feedbackList = Array.isArray(patientFeedbacks) ? patientFeedbacks.filter(f => !f.skipped) : [];
              if (feedbackList.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs font-medium">
                    No consultation reviews recorded yet. Patient feedback will appear here after video consultations.
                  </div>
                );
              }

              return feedbackList.map((fb, idx) => {
                const translated = fb.translated_text || fb.english_translation || "";
                const langCode = (fb.language || fb.language_code || "en").toUpperCase();
                const patientInit = (fb.patient_name || "P").charAt(0).toUpperCase();
                const voiceUsed = fb.voice_input_used || fb.is_voice;

                return (
                  <div
                    key={fb.id || idx}
                    className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/40 to-amber-50/10 space-y-3 hover:border-amber-200 transition shadow-xs"
                  >
                    {/* Feedback top header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                          {patientInit}
                        </span>
                        <div>
                          <span className="font-extrabold text-sm text-slate-900">{fb.patient_name || "Patient"}</span>
                          <span className="text-xs text-slate-400 ml-2">• Reviewed on {fb.created_at || "Recent"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Star Rating Display */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= (fb.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Sentiment Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          fb.sentiment === 'Positive' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : fb.sentiment === 'Neutral'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {fb.sentiment || "Positive"}
                        </span>

                        {voiceUsed && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold flex items-center gap-1">
                            🎙️ Voice Audio
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Praise Tags */}
                    {Array.isArray(fb.tags) && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {fb.tags.map((t, tIdx) => (
                          <span key={tIdx} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Original Feedback in Patient's Language */}
                    {fb.feedback_text && (
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-bold flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-slate-500" />
                            <span>Patient's Original Language ({langCode}):</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 italic font-medium leading-relaxed">
                          "{fb.feedback_text}"
                        </p>
                      </div>
                    )}

                    {/* AI English Translation */}
                    {translated && translated !== fb.feedback_text && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-emerald-50/60 border border-indigo-100 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-900">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Verified English Translation:</span>
                        </div>
                        <p className="text-xs text-slate-900 leading-relaxed font-semibold">
                          "{translated}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
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

      {/* Issue Post-Consultation Prescription & Lab Tests Modal */}
      {isIssueOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-4xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col max-h-[92vh] overflow-y-auto space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                  <FlaskConical className="w-6 h-6 text-brand-mint" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Issue Consultation Prescription & Order Lab Tests
                  </h3>
                  <p className="text-xs text-slate-500">
                    Formulate medication regimen and select diagnostic lab tests with precision-ranked analyzer instruments
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsIssueOrderOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target Patient Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase tracking-wider">
                Select Consulting Patient:
              </label>
              <select
                value={orderPatientId}
                onChange={(e) => setOrderPatientId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {assignedPatients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.diagnosis} • {p.spokenLang})
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnostic Tests Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Microscope className="w-4 h-4 text-indigo-600" />
                  <span>Select Diagnostic Lab Tests (App Will Rank Instruments by Precision):</span>
                </label>
                <span className="text-[11px] font-bold text-indigo-600">
                  {selectedTests.length} Tests Selected
                </span>
              </div>

              {/* Quick Select Presets */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setSelectedTests(['t_cbc', 't_lft', 't_kft'])}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                >
                  + Post-Op Panel (CBC + LFT + KFT)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTests(['t_trop_i', 't_lipid', 't_hba1c'])}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                >
                  + Cardio-Metabolic (Troponin + Lipid + HbA1c)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTests(['t_cbc', 't_hba1c', 't_tsh'])}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                >
                  + Routine Wellness (CBC + HbA1c + TSH)
                </button>
              </div>

              {/* Diagnostic Test Catalog Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                {catalogTests.map((test) => {
                  const isChecked = selectedTests.includes(test.id);
                  return (
                    <div
                      key={test.id}
                      onClick={() => toggleTestSelection(test.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isChecked 
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/30' 
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black text-slate-900 truncate">{test.name}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-600 font-bold">
                          {test.category}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                          {test.clinical_significance}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prescribed Medications Section */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Prescribed Medications ({orderMeds.length}):</span>
              </label>

              {/* List of active meds */}
              <div className="space-y-1.5 mb-2.5">
                {orderMeds.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800">💊 {med.name}</span>
                      <span className="text-slate-500 font-medium ml-2">({med.dosage} • {med.frequency})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(idx)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition"
                      title="Remove medication"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Add Medicine Bar */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-slate-50 p-2.5 rounded-2xl border border-dashed border-slate-300">
                <input
                  type="text"
                  placeholder="Medicine name (e.g. Amlodipine 5mg)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="flex-1 min-w-[150px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Dosage (e.g. 1 tab daily)"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  className="w-32 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Clinical Notes & Instructions */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                Clinical Diagnosis Notes & Instructions for Patient:
              </label>
              <textarea
                rows={2}
                value={orderClinicalNotes}
                onChange={(e) => setOrderClinicalNotes(e.target.value)}
                placeholder="Clinical guidance, warning signs, and follow-up directives..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsIssueOrderOpen(false)}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendPostConsultationOrder}
                disabled={isSubmittingOrder}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
              >
                {isSubmittingOrder ? (
                  <span>Dispatching Order...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Send Prescription & Order Lab Tests to Patient</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
