import React, { useState, useEffect } from 'react';
import { 
  Bell, Search, Star, Calendar, Clock, CheckCircle2, 
  AlertCircle, ArrowUpRight, Video, Pill, Heart, Activity, 
  MapPin, ChevronRight, Mic, MicOff, Send, Sparkles, 
  History, CalendarDays, ShieldAlert, Check, Plus, Volume2,
  Microscope, FlaskConical, Building2, Gauge, Award, CheckCircle, ChevronDown, ChevronUp, FileText,
  X, Home, Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import { startListening, stopListening, speakText, isSpeechRecognitionSupported } from '../utils/speech';
import { PrescribedLabTestsCard } from '../components/PrescribedLabTestsCard';
import { DigitalTwinDashboard } from '../components/digitaltwin/DigitalTwinDashboard';

export function PatientDashboard({ onOpenAiTriage, onOpenEmergency, onOpenVideoConsult, activeTab, setActiveTab }) {
  const { user } = useAuth();
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();

  const [internalView, setInternalView] = useState('clinical');
  const dashboardView = activeTab === 'digital_twin' ? 'digital_twin' : internalView;

  const [activeFilter, setActiveFilter] = useState('upcoming');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(14);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('12:00 PM');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Quick Dashboard Triage State
  const [symptomInput, setSymptomInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const [patientProfile, setPatientProfile] = useState(null);
  const [medications, setMedications] = useState([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [riskData, setRiskData] = useState({ risk_score: 24.5, risk_level: 'Low', risk_factors: [] });
  const [followups, setFollowups] = useState([]);
  const [approvalAlert, setApprovalAlert] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Diagnostic Lab Orders & Precision Matcher State
  const [patientLabOrders, setPatientLabOrders] = useState([]);
  const [selectedLabForBooking, setSelectedLabForBooking] = useState(null);
  const [labBookingModalOpen, setLabBookingModalOpen] = useState(false);
  const [collectionType, setCollectionType] = useState('Home Collection');
  const [collectionDate, setCollectionDate] = useState('Tomorrow, 08:30 AM');
  const [patientAddress, setPatientAddress] = useState('Flat 402, Shanthi Residency, Indiranagar, Bengaluru');
  const [patientPhone, setPatientPhone] = useState('+91 98765 43210');
  const [isBookingLab, setIsBookingLab] = useState(false);
  const [expandedLabOrderId, setExpandedLabOrderId] = useState(null);
  const [labSuccessAlert, setLabSuccessAlert] = useState(null);

  useEffect(() => {
    loadDoctors();
    loadPatientData();
    loadPendingPrescriptions();
    loadNotifications();
    loadPatientLabOrders();

    const interval = setInterval(() => {
      loadNotifications();
      loadPatientData();
      loadPendingPrescriptions();
      loadPatientLabOrders();
    }, 2000);

    return () => clearInterval(interval);
  }, [currentLanguage, user]);


  const loadNotifications = async () => {
    const pId = user?.patientId || user?.id || 'p_01';
    try {
      const res = await api.getPatientNotifications(pId);
      const notifs = res || [];
      setNotifications(notifs);

      const latestApproved = notifs.find(n => !n.read && n.type === 'prescription_approved');
      if (latestApproved && (!approvalAlert || approvalAlert.id !== latestApproved.id)) {
        setApprovalAlert(latestApproved);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadDoctors = async () => {
    try {
      const res = await api.getDoctors(currentLanguage);
      setDoctors(res.doctors || []);
    } catch (e) {
      console.warn("Could not load doctors from backend:", e);
    }
  };

  const loadPatientData = async () => {
    const pId = user?.patientId || user?.id || 'p_01';
    try {
      const res = await api.getPatientProfile(pId);
      setPatientProfile(res.patient);
      setMedications(res.patient?.active_medications || []);
      setFollowups(res.patient?.post_discharge_followups || []);
      setRiskData({
        risk_score: res.patient?.risk_score || 24.5,
        risk_level: res.patient?.risk_level || 'Low',
        risk_factors: res.patient?.risk_factors || []
      });
    } catch (e) {
      console.warn("Could not load patient profile:", e);
    }
  };

  const loadPendingPrescriptions = async () => {
    try {
      const res = await api.getPendingPrescriptions();
      const myPending = (res || []).filter(p => p.patient_id === (user?.patientId || user?.id || 'p_01'));
      setPendingPrescriptions(myPending);
    } catch (e) {
      console.warn("Could not load pending prescriptions:", e);
    }
  };

  const loadPatientLabOrders = async () => {
    const pId = user?.patientId || user?.id || 'p_01';
    try {
      const res = await api.getPatientLabOrders(pId);
      setPatientLabOrders(res || []);
      if (res && res.length > 0 && !expandedLabOrderId) {
        setExpandedLabOrderId(res[0].id);
      }
    } catch (e) {
      console.warn("Could not load patient lab orders:", e);
    }
  };

  const handleOpenLabBooking = (order, lab) => {
    setSelectedLabForBooking({ order, lab });
    setLabBookingModalOpen(true);
  };

  const handleConfirmLabSelection = async () => {
    if (!selectedLabForBooking) return;
    setIsBookingLab(true);
    try {
      const { order, lab } = selectedLabForBooking;
      await api.selectLaboratory({
        order_id: order.id,
        lab_id: lab.lab_id,
        collection_type: collectionType,
        scheduled_date: collectionDate,
        scheduled_time: "08:30 AM",
        patient_address: patientAddress,
        patient_phone: patientPhone
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setLabBookingModalOpen(false);
      setSelectedLabForBooking(null);
      setLabSuccessAlert(`✓ Laboratory Selected! ${lab.lab_name} confirmed for sample collection. Diagnostic analyzer instrument precision report (${lab.precision_accuracy_index}% PAI) transmitted to your attending physician.`);
      loadPatientLabOrders();
      loadNotifications();
      setTimeout(() => setLabSuccessAlert(null), 5500);
    } catch (e) {
      alert("Error confirming laboratory booking: " + e.message);
    } finally {
      setIsBookingLab(false);
    }
  };


  const handleVoiceInput = () => {
    if (!isSpeechRecognitionSupported()) {
      alert("Speech recognition is not supported in this browser. Please use text input.");
      return;
    }

    if (isRecording) {
      stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startListening({
        lang: currentLanguage,
        onResult: (transcript, isFinal) => {
          setSymptomInput(transcript);
          if (isFinal) {
            setIsRecording(false);
          }
        },
        onError: () => setIsRecording(false),
        onEnd: () => setIsRecording(false)
      });
    }
  };

  const handleQuickSubmit = () => {
    if (!symptomInput.trim()) return;
    onOpenAiTriage();
  };

  const handleMedAction = async (medId, action) => {
    const pId = user?.patientId || user?.id || 'p_01';
    try {
      const res = await api.takeMedicationAction(pId, medId, action);
      setMedications(prev => prev.map(m => m.id === medId ? { ...m, taken_today: action === 'take' } : m));
      setRiskData(prev => ({
        ...prev,
        risk_score: res.updated_risk_score,
        risk_level: res.updated_risk_level
      }));

      if (action === 'take') {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.8 }
        });
      }
    } catch (e) {
      console.warn("Med action error:", e);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor) return;
    const pId = user?.patientId || user?.id || 'p_01';
    try {
      await api.bookAppointment({
        patient_id: pId,
        doctor_id: selectedDoctor.id,
        slot_time: selectedTimeSlot,
        date: `2026-09-${selectedDate}`,
        symptoms: "Scheduled consultation via SehatSanketh",
        preferred_language: currentLanguage
      });
      setBookingSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        setBookingSuccess(false);
        setIsBookingOpen(false);
      }, 1600);
    } catch (e) {
      console.warn("Booking error:", e);
      setIsBookingOpen(false);
    }
  };

  const doesDoctorSpeakPatientLang = (doc) => {
    return doc.spoken_languages?.includes(currentLanguage);
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('docuVerse', 'Docu verse')} • Multilingual Health Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('healthUpdates', 'Health Updates')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as: <span className="font-extrabold text-slate-800">{user?.name}</span> • Preferred: <span className="font-bold text-emerald-700 uppercase">{currentLanguage}</span>
          </p>
        </div>

        {/* Action Pills: Language Quick Bar & Emergency SOS */}
        <div className="flex items-center gap-2">
          {/* Language Selector Chips directly in Patient View */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
            {supportedLanguages.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 transition ${
                  currentLanguage === l.code
                    ? 'bg-brand-emerald text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{l.flag}</span>
                <span className="uppercase">{l.code}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition animate-pulse"
            title="Trigger Instant Emergency SOS"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* Category View Switcher: Clinical Care Overview vs Patient Digital Twin */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit shadow-xs">
        <button
          onClick={() => {
            setInternalView('clinical');
            if (setActiveTab) setActiveTab('home');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            dashboardView === 'clinical'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Clinical Care & Overview</span>
        </button>

        <button
          onClick={() => {
            setInternalView('digital_twin');
            if (setActiveTab) setActiveTab('digital_twin');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            dashboardView === 'digital_twin'
              ? 'bg-brand-emerald text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <span className="text-base leading-none">🧬</span>
          <span>Patient Digital Twin</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
            LIVE
          </span>
        </button>
      </div>

      {dashboardView === 'digital_twin' ? (
        <DigitalTwinDashboard
          onBackToOverview={() => {
            setInternalView('clinical');
            if (setActiveTab) setActiveTab('home');
          }}
        />
      ) : (
        <>
          {/* Digital Twin Quick Launch Hero Banner */}
          <div 
            onClick={() => {
              setInternalView('digital_twin');
              if (setActiveTab) setActiveTab('digital_twin');
            }}
            className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl border border-emerald-800/40 cursor-pointer hover:border-emerald-500/60 hover:shadow-2xl transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                🧬
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                    Interactive In Silico Physiology
                  </span>
                  <span className="text-xs text-emerald-200 font-bold">Biometric Telemetry Simulation</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  Launch Patient Digital Twin
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5 max-w-xl">
                  Simulate live wearable vitals (HR, BP, SpO₂, Temp, RR, Glucose), inspect multi-organ stress, and explore prospective trajectory simulations.
                </p>
              </div>
            </div>

            <button
              className="px-5 py-2.5 rounded-2xl bg-brand-emerald hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-700/30 self-start sm:self-auto group-hover:translate-x-1 transition-all cursor-pointer"
            >
              <span>Explore Digital Twin</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Real-Time Doctor Prescription Approval Notification Alert */}
      {approvalAlert && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-2xl shadow-emerald-700/25 border-2 border-emerald-300 flex items-start justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white flex-shrink-0 shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-[10px] font-black uppercase tracking-wider">
                  🔔 Doctor Approval Notice
                </span>
                <span className="text-[11px] font-semibold text-emerald-100">
                  {approvalAlert.timestamp || 'Just now'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {approvalAlert.title || 'Prescription Approved by Doctor'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed max-w-2xl">
                {approvalAlert.message}
              </p>
              {approvalAlert.medications?.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-2">
                  {approvalAlert.medications.map((m, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl bg-white text-emerald-900 text-xs font-black shadow-sm flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-emerald-600" />
                      {m.name} ({m.dosage})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (approvalAlert.id) {
                api.markNotificationRead(user?.patientId || user?.id || 'p_01', approvalAlert.id);
              }
              setApprovalAlert(null);
            }}
            className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition text-xs font-bold"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-Time Laboratory Booking Confirmation Banner */}
      {labSuccessAlert && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-indigo-700/25 border-2 border-indigo-300 flex items-start justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white flex-shrink-0 shadow-inner">
              <Microscope className="w-7 h-7 text-brand-mint" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-[10px] font-black uppercase tracking-wider">
                  🔬 Laboratory Precision Match Confirmed
                </span>
                <span className="text-[11px] font-semibold text-indigo-100">Live Status</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {labSuccessAlert}
              </h2>
              <p className="text-xs text-indigo-100 font-medium">
                Your sample collection details and analytical instrument specifications have been synchronized with your hospital EHR & attending physician.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLabSuccessAlert(null)}
            className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition text-xs font-bold"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Voice/Text Symptom Triage Ingestion Box */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-mint animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {t('aiTriageTitle', 'AI Multilingual Symptom Triage')}
              </h2>
              <p className="text-xs text-emerald-200">
                Describe symptoms via voice or text in {supportedLanguages.find(l => l.code === currentLanguage)?.name}
              </p>
            </div>
          </div>

          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
            Powered by Groq + Sarvam
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/15 backdrop-blur-md">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-xl transition ${
              isRecording
                ? 'bg-red-500 text-white animate-bounce'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isRecording ? "Stop voice input" : "Speak your symptoms"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onOpenAiTriage()}
            placeholder={isRecording ? t('listening', 'Listening to your voice...') : t('typeSymptoms', 'Describe symptoms (e.g. fever, headache, body ache)...')}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-300 focus:outline-none"
          />

          <button
            onClick={onOpenAiTriage}
            className="px-4 py-3 rounded-xl bg-brand-mint hover:bg-emerald-400 active:scale-95 text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition"
          >
            <span>Analyze</span>
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-emerald-200/80 pt-1">
          <span>✓ Multi-turn completeness check</span>
          <span>✓ Doctor confirmation for medications</span>
          <span>✓ Instant emergency escalation</span>
        </div>
      </div>

      {/* Pending Doctor Confirmation Banner (If Any AI Prescriptions Exist) */}
      {pendingPrescriptions.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm animate-in fade-in">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-extrabold text-amber-900">
              AI Home Care Prescription Awaiting Doctor Validation
            </p>
            <p className="text-amber-800 mt-0.5">
              Your AI-drafted prescription is currently under review by <span className="font-bold">{pendingPrescriptions[0].doctor_name || "the attending physician"}</span>. It will be officially released and added to your active reminders once approved.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
            In Doctor Queue
          </span>
        </div>
      )}

      {/* 3 Quick Action Rounded Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Card 1: Top Doctors */}
        <div 
          onClick={() => setActiveFilter('popular')}
          className="cursor-pointer group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#00875A] to-[#056342] text-white shadow-lg shadow-emerald-800/10 hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <div className="flex items-start justify-between">
            <p className="font-extrabold text-sm leading-tight">
              {t('topDoctors', 'Top Doctors')}
            </p>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">Verified Specialists</p>

          <div className="mt-4 flex items-center -space-x-2">
            <img className="w-7 h-7 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=100&q=80" alt="doc" />
            <img className="w-7 h-7 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=100&q=80" alt="doc" />
            <img className="w-7 h-7 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1594824813591-10c0e7f7881c?auto=format&fit=crop&w=100&q=80" alt="doc" />
            <div className="w-7 h-7 rounded-full bg-black/40 border-2 border-white flex items-center justify-center text-[10px] font-bold">
              17+
            </div>
          </div>
        </div>

        {/* Card 2: Specialty Doctors */}
        <div 
          onClick={() => setActiveFilter('recommended')}
          className="cursor-pointer group relative overflow-hidden rounded-3xl p-5 bg-white border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
        >
          <div className="flex items-start justify-between">
            <p className="font-extrabold text-sm text-slate-800 leading-tight">
              {t('specialtyDoctors', 'Specialty Doctors')}
            </p>
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cardio • Neuro • Surgery</p>

          <div className="mt-4 flex items-center gap-2 text-slate-400">
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Pill className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 ml-1">15+</span>
          </div>
        </div>

        {/* Card 3: Emergency Services */}
        <div 
          onClick={onOpenEmergency}
          className="cursor-pointer group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/10 hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <div className="flex items-start justify-between">
            <p className="font-extrabold text-sm leading-tight">
              {t('emergencyServices', 'Emergency Services')}
            </p>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">Ambulance • ICU • SOS</p>

          <div className="mt-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/25 text-[10px] font-extrabold uppercase tracking-wide">
              24/7 Rapid Fleet
            </span>
            <span className="text-xs font-extrabold text-emerald-200">ETA 6 mins</span>
          </div>
        </div>

      </div>

      {/* Prescribed Diagnostic Lab Tests & Precision Laboratory Matcher (Compact & Expandable Component) */}
      <PrescribedLabTestsCard 
        patientLabOrders={patientLabOrders} 
        onOpenLabBooking={handleOpenLabBooking} 
      />

      {/* Two Column Grid: Medical History & Readmission Risk Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Medical History & Diagnoses */}
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-700" />
              <h3 className="font-extrabold text-base text-slate-800">
                Patient Medical History & Diagnoses
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Clinical Profile</span>
          </div>

          <div className="space-y-2">
            {patientProfile?.medical_history?.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-800 font-medium">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 pt-1">
            Data securely synchronized with Apollo Metro EHR records.
          </p>
        </div>

        {/* Readmission Risk Index (PRD §4.2 item 10) */}
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-800">
                {t('readmissionRiskIndicator', 'Readmission Risk Rate')}
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              riskData.risk_level === 'Low' ? 'bg-emerald-100 text-emerald-800' :
              riskData.risk_level === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {riskData.risk_score}% ({riskData.risk_level})
            </span>
          </div>

          {/* Risk Gauge Bar */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                riskData.risk_level === 'Low' ? 'bg-emerald-500' :
                riskData.risk_level === 'Moderate' ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${riskData.risk_score}%` }}
            />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Machine learning risk assessment evaluated from post-discharge status, chronic comorbidities, and daily adherence.
          </p>

          <div className="space-y-1 pt-1">
            {riskData.risk_factors.map((factor, i) => (
              <div key={i} className="text-[11px] flex items-center gap-2 text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Two Column Grid: Active Medication Reminders & Surgery Post-Discharge Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Active Medication Reminders (PRD §4.2 item 8) */}
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-brand-emerald" />
              <h3 className="font-extrabold text-base text-slate-800">
                {t('activeMedications', 'Active Medication Reminders')}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {medications.filter(m => m.taken_today).length}/{medications.length} Doses Taken
            </span>
          </div>

          <div className="space-y-2.5">
            {medications.map((med) => (
              <div 
                key={med.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{med.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {med.dosage} • <span className="font-bold text-emerald-700">{med.timing}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">{med.instructions}</p>
                </div>

                {med.taken_today ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 px-3 py-1.5 rounded-full bg-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('medicationTaken', 'Taken')}</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleMedAction(med.id, 'take')}
                      className="px-3 py-1.5 rounded-full bg-brand-emerald hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition active:scale-95"
                    >
                      {t('takeMedication', 'Take')}
                    </button>
                    <button
                      onClick={() => handleMedAction(med.id, 'snooze')}
                      className="px-2.5 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-300 transition"
                    >
                      {t('snooze', 'Snooze')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Post-Discharge & Surgical Follow-up Tracker (PRD §4.2 item 9) */}
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-slate-800">
                {t('postDischargeFollowup', 'Post-Discharge Follow-ups')}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
              Hospital Discharge Care
            </span>
          </div>

          <div className="space-y-2.5">
            {followups.map((fol) => (
              <div
                key={fol.id}
                className="p-3.5 rounded-2xl bg-blue-50/40 border border-blue-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{fol.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {fol.doctor} • <span className="font-bold text-blue-700">{fol.date}</span>
                  </p>
                  <span className="text-[10px] text-slate-400">{fol.department}</span>
                </div>

                <button
                  onClick={() => onOpenVideoConsult("consult_01", fol.doctor, user?.name || "Priya Sharma")}
                  className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Call</span>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Doctor Directory with Regional Language Matching (PRD §4.2 item 5) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {t('allDoctors', 'Doctor Consultation & Language Matching')}
            </h2>
            <p className="text-xs text-slate-500">
              Doctors speaking <span className="font-bold text-emerald-700 uppercase">{currentLanguage}</span> prioritized first
            </p>
          </div>
          <span className="text-xs font-bold text-brand-emerald">
            {doctors.length} Doctors Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {doctors.map((doc) => {
            const hasLangMatch = doesDoctorSpeakPatientLang(doc);
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoctor(doc);
                  setIsBookingOpen(true);
                }}
                className={`cursor-pointer group rounded-3xl p-5 bg-white border transition-all flex flex-col justify-between ${
                  hasLangMatch ? 'border-emerald-300 shadow-md hover:shadow-float hover:scale-[1.02]' : 'border-slate-100 shadow-soft hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-extrabold text-slate-500">
                      {doc.specialization}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-extrabold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{doc.rating}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={doc.avatar_url}
                      alt={doc.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                    <div>
                      <h4 className="font-black text-sm text-slate-900 group-hover:text-brand-emerald transition-colors">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {doc.experience_years}+ yrs exp • ${doc.session_fee} / session
                      </p>
                      
                      {/* Language Matching Tag */}
                      <div className="mt-1 flex items-center gap-1">
                        {hasLangMatch ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Speaks {currentLanguage.toUpperCase()}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Translates via Sarvam AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {doc.clinic_address}
                  </span>
                  <span className="text-brand-emerald font-extrabold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Book Slot <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Doctor Details & Booking Modal */}
      {isBookingOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl border border-slate-100 p-6 flex flex-col max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIsBookingOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition"
              >
                ✕
              </button>
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-rose-500" />
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <img
                src={selectedDoctor.avatar_url}
                alt={selectedDoctor.name}
                className="w-24 h-24 rounded-3xl object-cover border-2 border-emerald-400 shadow-md"
              />
              <h3 className="font-black text-xl text-slate-900 mt-3">
                {selectedDoctor.name}
              </h3>
              <p className="text-xs font-semibold text-emerald-700">
                {selectedDoctor.specialization} • Speaks {selectedDoctor.spoken_languages.join(', ').toUpperCase()}
              </p>

              <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-600">
                <span className="px-3 py-1 rounded-full bg-slate-100">
                  ${selectedDoctor.session_fee} Per Session
                </span>
                <span className="flex items-center gap-1 text-slate-500 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedDoctor.clinic_address}
                </span>
              </div>
            </div>

            {/* Schedule Date Row */}
            <div className="mt-6">
              <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2.5">
                {t('schedule', 'Schedule Date')}
              </p>
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
                {[12, 13, 14, 15, 16, 17, 18].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`w-11 h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition ${
                      selectedDate === d
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-normal">Sep</span>
                    <span>{d}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Pills */}
            <div className="mt-5">
              <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2.5">
                Time Slots
              </p>
              <div className="flex flex-wrap gap-2">
                {["10:00 AM", "11:00 AM", "12:00 PM", "06:00 PM", "07:00 PM"].map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold transition ${
                      selectedTimeSlot === slot
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Range / Adherence Indicator */}
            <div className="mt-6 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="text-emerald-700">8 Ongoing Treatments</span>
                <span className="text-slate-500">4 Awaiting Follow-up</span>
              </div>
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-2/3 rounded-full" />
              </div>
            </div>

            {/* Bottom Action: Book Appointment Pill Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => {
                  setIsBookingOpen(false);
                  onOpenVideoConsult("consult_01", selectedDoctor.name, user?.name || "Priya Sharma");
                }}
                className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
                title="Instant Video Call"
              >
                <Video className="w-5 h-5" />
              </button>

              <button
                onClick={handleConfirmBooking}
                disabled={bookingSuccess}
                className="flex-1 py-3.5 px-6 rounded-full bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/30 transition"
              >
                {bookingSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Appointment Confirmed!</span>
                  </>
                ) : (
                  <span>{t('bookAppointment', 'Book Appointment')}</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Diagnostic Lab Booking Modal */}
      {labBookingModalOpen && selectedLabForBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white relative">
              <button 
                onClick={() => setLabBookingModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Accredited Diagnostic Booking
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30">
                      Ranked #{selectedLabForBooking.lab.rank} Precision
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {selectedLabForBooking.lab.lab_name}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-indigo-200">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-300" />
                  <span>{selectedLabForBooking.lab.location}</span>
                </span>
                <span>•</span>
                <span>Accreditations: <strong className="text-white">{selectedLabForBooking.lab.accreditations?.join(', ')}</strong></span>
                <span>•</span>
                <span>TAT: <strong className="text-emerald-300">{selectedLabForBooking.lab.turnaround_time}</strong></span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Instrument & Precision Quality Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-600" />
                    <span>Analytical Precision & Instrument Verification</span>
                  </span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-xs">
                    {selectedLabForBooking.lab.precision_accuracy_index}% PAI
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                    <span className="text-slate-500 block text-[11px]">Repeatability CV%</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {selectedLabForBooking.lab.average_cv_percent}% CV
                    </span>
                    <span className="text-[10px] text-slate-400 block">Ultra-low analytical variance</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                    <span className="text-slate-500 block text-[11px]">Accuracy Score</span>
                    <span className="font-extrabold text-indigo-900 text-sm">
                      {selectedLabForBooking.lab.average_accuracy_score}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Traceable Reference Standards</span>
                  </div>
                </div>

                {/* Instrument Specifications */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Instruments dedicated for your tests:</span>
                  {selectedLabForBooking.lab.instruments?.map((inst, i) => (
                    <div key={i} className="text-[11px] p-2 rounded-xl bg-white/80 border border-indigo-100/60 flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900">{inst.instrument_name}</span>
                        <span className="text-slate-500 ml-1.5">({inst.company_name} • {inst.technology_type})</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-indigo-700">
                        CV: {inst.precision_cv_percent}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-indigo-900 font-medium bg-indigo-100/50 p-2 rounded-xl flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-700 flex-shrink-0" />
                  <span>
                    Report precision & analytical equipment data will be synchronized to Dr. {selectedLabForBooking.order.doctor_name} and hospital records.
                  </span>
                </div>
              </div>

              {/* Sample Collection Mode */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Select Collection Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollectionType('Home Collection')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      collectionType === 'Home Collection'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">🏠</span>
                      {collectionType === 'Home Collection' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">Home Sample Collection</span>
                      <span className="text-[11px] text-emerald-700 font-bold">Doorstep Phlebotomist (Free)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCollectionType('Center Visit')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      collectionType === 'Center Visit'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">🏥</span>
                      {collectionType === 'Center Visit' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block">Diagnostic Center Visit</span>
                      <span className="text-[11px] text-slate-500 font-medium">Walk-in with e-Slip</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Time Selection */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Sample Collection Slot
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    "Tomorrow, 07:30 AM",
                    "Tomorrow, 08:30 AM",
                    "Tomorrow, 10:00 AM",
                    "Tomorrow, 11:30 AM",
                    "Day After, 08:00 AM",
                    "Day After, 09:30 AM"
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setCollectionDate(slot)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold text-center transition cursor-pointer ${
                        collectionDate === slot
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address and Phone */}
              {collectionType === 'Home Collection' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Sample Pickup Address
                    </label>
                    <input
                      type="text"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                      placeholder="Enter full home address..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Contact Phone for Phlebotomist
                    </label>
                    <input
                      type="text"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Fasting Guideline Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Fasting Instruction:</strong> For Blood Sugar, HbA1c, and Lipid Profile tests, 8-10 hours overnight fasting is advised. You may drink plain water.
                </p>
              </div>

              {/* Price Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">Total Diagnostic Package</span>
                  <span className="text-[11px] text-slate-500">
                    {selectedLabForBooking.order.lab_tests?.length} tests • Phlebotomy Waived
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-900">
                    ₹{selectedLabForBooking.lab.estimated_price_inr}
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-bold">Pay at Collection / Online</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLabBookingModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLabSelection}
                disabled={isBookingLab}
                className="px-6 py-2.5 rounded-xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-brand-emerald/30 transition disabled:opacity-60 cursor-pointer"
              >
                {isBookingLab ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Order & Quality Data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Booking & Transmit Quality Metrics</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

        </>
      )}

    </div>
  );
}
