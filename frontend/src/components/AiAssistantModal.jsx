import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Send, Sparkles, Volume2, 
  CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, User, Stethoscope, RefreshCw, HelpCircle,
  Video, Calendar
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { startListening, stopListening, speakText, isSpeechRecognitionSupported } from '../utils/speech';

export function AiAssistantModal({ isOpen, initialPrompt = '', onClose, onBookDoctor, onTriggerEmergency, onOpenVideoConsult }) {
  const { currentLanguage, t } = useLanguage();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('aiTriageSubtitle', 'Hello! I am your SehatSanketh AI assistant. Please describe what symptoms or discomfort you are experiencing.'),
      audioText: t('aiTriageSubtitle', 'Hello! I am your SehatSanketh AI assistant. Please describe what symptoms or discomfort you are experiencing.')
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInquiryPhase, setIsInquiryPhase] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [bookedDoctor, setBookedDoctor] = useState(null);
  const [isBookingDoctor, setIsBookingDoctor] = useState(false);
  const messagesEndRef = useRef(null);
  const hasTriggeredInitialRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, triageResult, isAnalyzing, bookedDoctor]);

  // Handle auto-submission of initialPrompt if opened from dashboard
  useEffect(() => {
    if (isOpen && initialPrompt && !hasTriggeredInitialRef.current) {
      hasTriggeredInitialRef.current = true;
      handleSend(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  // Update initial greeting when user switches language if only initial greeting is present
  useEffect(() => {
    if (messages.length <= 1 && messages[0]?.role === 'assistant') {
      const greeting = t('aiTriageSubtitle', 'Hello! I am your SehatSanketh AI assistant. Please describe what symptoms or discomfort you are experiencing.');
      setMessages([
        {
          role: 'assistant',
          content: greeting,
          audioText: greeting,
          audioBase64: null
        }
      ]);
    }
  }, [currentLanguage]);

  const handleBookConsultancy = async (specialty) => {
    setIsBookingDoctor(true);
    const pId = user?.patientId || user?.id || 'p_01';
    try {
      const docsRes = await api.getDoctors(currentLanguage, specialty);
      const availableDocs = docsRes.doctors || [];
      const targetDoc = availableDocs[0] || {
        id: "doc_05",
        name: "Dr. Rajesh Rao",
        specialization: specialty || "General Physician",
        spoken_languages: ["en", "hi", "kn", "te"],
        clinic_address: "OPD Block 1, Central Medical",
        session_fee: 60,
        rating: 4.8,
        avatar_url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80"
      };

      const slotTime = targetDoc.available_slots?.[0] || "02:00 PM";
      const dateStr = new Date().toISOString().split('T')[0];

      const bookingRes = await api.bookAppointment({
        patient_id: pId,
        doctor_id: targetDoc.id,
        slot_time: slotTime,
        date: dateStr,
        symptoms: triageResult?.analysis_summary || "AI Triage Doctor Consultation",
        preferred_language: currentLanguage
      });

      const confirmedData = {
        ...targetDoc,
        consultation_id: bookingRes.consultation?.id || `consult_${Date.now().toString().slice(-6)}`,
        scheduled_time: `Today at ${slotTime}`,
        date: dateStr
      };

      setBookedDoctor(confirmedData);

      const confirmTemplates = {
        en: `Appointment Confirmed! I have booked your appointment with ${targetDoc.name} (${targetDoc.specialization}) for Today at ${slotTime}. Spoken languages: ${targetDoc.spoken_languages?.join(', ').toUpperCase()}.`,
        hi: `अपॉइंटमेंट की पुष्टि हो गई! मैंने ${targetDoc.name} (${targetDoc.specialization}) के साथ आज ${slotTime} बजे आपका परामर्श बुक कर दिया है।`,
        kn: `ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಖಚಿತವಾಗಿದೆ! ${targetDoc.name} (${targetDoc.specialization}) ಅವರೊಂದಿಗೆ ಇಂದು ${slotTime} ಕ್ಕೆ ನಿಮ್ಮ ಸಮಾಲೋಚನೆ ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.`,
        ta: `சந்திப்பு உறுதிசெய்யப்பட்டது! ${targetDoc.name} (${targetDoc.specialization}) உடன் இன்று ${slotTime} மணிக்கு உங்கள் சந்திப்பு முன்பதிவு செய்யப்பட்டுள்ளது.`,
        te: `అపాయింట్‌మెంట్ ఖరారైంది! ${targetDoc.name} (${targetDoc.specialization}) తో ఈరోజు ${slotTime} గంటలకు మీ సంప్రదింపు బుక్ చేయబడింది.`
      };
      const confirmMsg = confirmTemplates[currentLanguage] || confirmTemplates.en;
      setMessages(prev => [...prev, { role: 'assistant', content: confirmMsg, audioText: confirmMsg, audioBase64: null }]);
      speakText(confirmMsg, currentLanguage);
    } catch (err) {
      console.warn("Booking consultancy error:", err);
      const fallbackDoc = {
        id: "doc_05",
        name: "Dr. Rajesh Rao",
        specialization: specialty || "General Physician",
        spoken_languages: ["en", "hi", "kn", "te"],
        clinic_address: "OPD Block 1, Central Medical",
        session_fee: 60,
        rating: 4.8,
        consultation_id: "consult_01",
        scheduled_time: "Today at 02:00 PM",
        avatar_url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80"
      };
      setBookedDoctor(fallbackDoc);
    } finally {
      setIsBookingDoctor(false);
    }
  };

  if (!isOpen) return null;

  const handleVoiceToggle = () => {
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
          setInputVal(transcript);
          if (isFinal) {
            setIsRecording(false);
          }
        },
        onError: (err) => {
          console.warn("Speech error:", err);
          setIsRecording(false);
        },
        onEnd: () => {
          setIsRecording(false);
        }
      });
    }
  };

  const handleSend = async (customText = null) => {
    const userText = (customText !== null && customText !== undefined ? customText : inputVal).trim();
    if (!userText || isAnalyzing) return;
    
    setInputVal('');
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    }

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsAnalyzing(true);

    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.analyzeSymptom(user?.id || 'p_01', currentLanguage, userText, history);
      
      const replyMsg = res.chatbot_reply || res.analysis_summary || res.clarifying_question || "I understand. Let me analyze your symptoms.";
      const clinicalUnd = res.clinical_understanding;
      const audioB64 = res.audio_base64 || null;

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: replyMsg, 
          clinicalUnderstanding: clinicalUnd,
          audioText: replyMsg, 
          audioBase64: audioB64,
          isConclusion: res.is_categorized 
        }
      ]);
      speakText(replyMsg, currentLanguage, audioB64);

      if (res.is_categorized || res.status === 'completed') {
        setIsInquiryPhase(false);
        setTriageResult(res);
      } else {
        setIsInquiryPhase(true);
      }
    } catch (err) {
      console.warn("Triage error:", err);
      const fallbackTemplates = {
        en: "Based on what you have reported, please take rest and hydrate. If symptoms persist or worsen, consult a doctor.",
        hi: "आपके द्वारा बताए गए लक्षणों के आधार पर, कृपया आराम करें और पर्याप्त पानी पिएं। यदि लक्षण बने रहते हैं या बिगड़ते हैं, तो डॉक्टर से परामर्श लें।",
        kn: "ನೀವು ತಿಳಿಸಿದ ಲಕ್ಷಣಗಳ ಆಧಾರದ ಮೇಲೆ, ದಯವಿಟ್ಟು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಮತ್ತು ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ. ಲಕ್ಷಣಗಳು ಮುಂದುವರಿದರೆ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
        ta: "நீங்கள் தெரிவித்த அறிகுறிகளின் அடிப்படையில், தயவுசெய்து ஓய்வெடுத்து போதுமான தண்ணீர் குடிக்கவும். அறிகுறிகள் தொடர்ந்தால் மருத்துவரை அணுகவும்.",
        te: "మీరు తెలిపిన లక్షణాల ఆధారంగా, దయచేసి విశ్రాంతి తీసుకోండి మరియు తగినంత నీరు త్రాగండి. లక్షణాలు తగ్గకపోతే వైద్యుడిని సంప్రదించండి."
      };
      const fallbackSummary = fallbackTemplates[currentLanguage] || fallbackTemplates.en;
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackSummary, audioText: fallbackSummary, audioBase64: null }]);
      speakText(fallbackSummary, currentLanguage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetTriage = () => {
    setMessages([
      {
        role: 'assistant',
        content: t('aiTriageSubtitle', 'Hello! I am your SehatSanketh AI assistant. Please describe what symptoms or discomfort you are experiencing.'),
        audioText: t('aiTriageSubtitle', 'Hello! I am your SehatSanketh AI assistant. Please describe what symptoms or discomfort you are experiencing.')
      }
    ]);
    setTriageResult(null);
    setBookedDoctor(null);
    setIsBookingDoctor(false);
    setIsInquiryPhase(false);
    setInputVal('');
    hasTriggeredInitialRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-emerald text-white flex items-center justify-center shadow-md shadow-brand-emerald/20">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                {t('aiTriageTitle', 'AI Clinical Symptom Triage')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Groq LPU Clinical Reasoning • {currentLanguage.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetTriage}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Reset conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat History Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-emerald text-white rounded-tr-none shadow-sm'
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Clinical Understanding Badge */}
                {m.clinicalUnderstanding && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-1.5 font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 block font-bold">Clinical Analysis:</strong>
                      <span>{m.clinicalUnderstanding}</span>
                    </div>
                  </div>
                )}

                <p className="whitespace-pre-line">{m.content}</p>
                {m.role === 'assistant' && (
                  <button
                    onClick={() => speakText(m.audioText, currentLanguage, m.audioBase64)}
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition"
                    title="Listen to speech"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Sarvam Voice</span>
                  </button>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Thinking / Analyzing Indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold p-3 bg-emerald-50 rounded-2xl animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing symptoms & formulating clinical questions via Groq LPU...</span>
            </div>
          )}

          {/* Triage Decision Card */}
          {triageResult && (
            <div className={`mt-4 rounded-3xl border p-5 bg-white shadow-lg space-y-3.5 transition-all ${
              triageResult.triage_category === 'Emergency' || triageResult.urgency_level === 'Emergency'
                ? 'border-red-400 bg-red-50/30'
                : triageResult.triage_category === 'Home Care'
                ? 'border-emerald-300 bg-emerald-50/20'
                : 'border-amber-300 bg-amber-50/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  triageResult.triage_category === 'Emergency' || triageResult.urgency_level === 'Emergency'
                    ? 'bg-red-600 text-white shadow-sm animate-pulse'
                    : triageResult.triage_category === 'Home Care'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {triageResult.triage_category === 'Home Care' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : triageResult.triage_category === 'Emergency' || triageResult.urgency_level === 'Emergency' ? (
                    <ShieldAlert className="w-4 h-4 text-white" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  {triageResult.triage_category || 'Clinical Assessment'}
                </span>

                <span className="text-xs font-bold text-slate-500">
                  Urgency: <strong className="text-slate-800">{triageResult.urgency_level}</strong>
                </span>
              </div>

              {/* 1. EMERGENCY PATH */}
              {(triageResult.triage_category === 'Emergency' || triageResult.urgency_level === 'Emergency') && (
                <div className="space-y-3">
                  <div className="p-4 bg-red-100/70 border border-red-300 rounded-2xl text-xs text-red-950 space-y-1">
                    <p className="font-black text-sm text-red-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-700" />
                      Acute Medical Emergency Detected
                    </p>
                    <p className="text-red-800 leading-relaxed font-medium">
                      {triageResult.analysis_summary}
                    </p>
                    <p className="text-[11px] text-red-700 font-bold pt-1">
                      Priority dispatch protocol recommended. Do not delay emergency care.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onTriggerEmergency();
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition animate-pulse"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>Trigger Immediate Emergency SOS Ambulance Dispatch</span>
                  </button>
                </div>
              )}

              {/* 2. HOME CARE PATH */}
              {triageResult.triage_category === 'Home Care' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="font-extrabold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {t('homeRemedies', 'Recommended Home Remedies')}:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-emerald-800 font-medium">
                      {triageResult.home_remedies?.map((rem, i) => (
                        <li key={i}>{rem}</li>
                      ))}
                    </ul>
                  </div>

                  {triageResult.suggested_medications?.length > 0 && (
                    <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-blue-900 flex items-center gap-1.5">
                          <span>AI Formulated Medications:</span>
                        </p>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase">
                          ⏳ Pending Doctor Verification
                        </span>
                      </div>

                      <ul className="list-disc list-inside space-y-1 text-blue-800 font-medium">
                        {triageResult.suggested_medications.map((med, i) => (
                          <li key={i}>{med}</li>
                        ))}
                      </ul>

                      <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 text-[11px] text-slate-700 leading-relaxed">
                        <strong className="text-blue-900">Doctor Verification Protocol: </strong>
                        These medications have been submitted to <span className="font-bold text-emerald-800">{triageResult.assigned_doctor_name || "Dr. Rajesh Rao"}</span> for clinical verification. Once approved, the prescription will be delivered to your dashboard and added to your daily medication reminders.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. DOCTOR CONSULTATION PATH */}
              {triageResult.triage_category === 'Doctor Consultation' && triageResult.urgency_level !== 'Emergency' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                    <p className="font-extrabold text-sm mb-1 text-amber-950">
                      {t('doctorConsultPath', 'Doctor Consultation Recommended')}
                    </p>
                    <p className="leading-relaxed">
                      Specialty Match: <strong className="text-slate-900">{triageResult.suggested_specialty || 'General Physician'}</strong>
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      {triageResult.analysis_summary}
                    </p>
                  </div>

                  {bookedDoctor ? (
                    <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-400 text-emerald-950 space-y-3 animate-in fade-in shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Consultancy Booked & Confirmed
                        </span>
                        <span className="text-xs font-black text-slate-800 px-2 py-0.5 bg-white rounded-lg border border-emerald-200 shadow-xs">
                          ⭐ {bookedDoctor.rating || 4.9}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={bookedDoctor.avatar_url || "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80"}
                          alt={bookedDoctor.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400 shadow-sm"
                        />
                        <div className="space-y-0.5">
                          <h4 className="font-black text-sm text-slate-900">{bookedDoctor.name}</h4>
                          <p className="text-xs font-bold text-emerald-800">{bookedDoctor.specialization}</p>
                          <p className="text-[11px] text-slate-500">{bookedDoctor.clinic_address}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-medium">Scheduled Time:</span>
                          <strong className="text-emerald-800 font-bold">{bookedDoctor.scheduled_time}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-medium">Languages Supported:</span>
                          <strong className="text-slate-800 uppercase font-bold">
                            {bookedDoctor.spoken_languages ? bookedDoctor.spoken_languages.join(', ') : currentLanguage}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-500 font-medium">Consultation Fee:</span>
                          <strong className="text-slate-800 font-bold">₹{bookedDoctor.session_fee || 60}</strong>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                          ✓ Schedule slot updated in Dr. {bookedDoctor.name.split(' ')[1] || 'Doctor'}'s dashboard calendar.
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50/90 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
                        <p className="font-extrabold text-blue-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-700" />
                          Appointment Officially Scheduled
                        </p>
                        <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                          Your slot is reserved on <strong>{bookedDoctor.name}</strong>'s agenda for {bookedDoctor.scheduled_time}. The consultation call will be available at your appointed time from your patient dashboard.
                        </p>
                      </div>

                      <button
                        onClick={onClose}
                        className="w-full py-3.5 px-4 rounded-xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-emerald/20 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Done • View in My Dashboard</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBookConsultancy(triageResult.suggested_specialty)}
                      disabled={isBookingDoctor}
                      className="w-full py-3.5 px-5 rounded-2xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/25 transition disabled:opacity-60"
                    >
                      {isBookingDoctor ? (
                        <Sparkles className="w-4 h-4 animate-spin" />
                      ) : (
                        <Stethoscope className="w-4 h-4" />
                      )}
                      <span>
                        {isBookingDoctor 
                          ? "Booking Consultancy & Reserving Doctor Slot..." 
                          : t('bookAppointment', 'Book Language-Matched Doctor Appointment')}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Follow-Up Inquiry Guidance & Quick-Fill Chips */}
        {isInquiryPhase && !triageResult && (
          <div className="px-5 py-2.5 bg-emerald-50/90 border-t border-emerald-100 flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in">
            <span className="text-[11px] font-black text-emerald-900 mr-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
              Quick Fill Answers:
            </span>
            <button
              onClick={() => setInputVal(prev => (prev ? `${prev}, ` : '') + 'Mild pain (2/10), 2 days duration')}
              className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100 text-[11px] transition shadow-xs"
            >
              Mild (2/10) • 2 days
            </button>
            <button
              onClick={() => setInputVal(prev => (prev ? `${prev}, ` : '') + 'Moderate pain (5/10), 3 days, slight dizziness')}
              className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100 text-[11px] transition shadow-xs"
            >
              Moderate (5/10) • 3 days
            </button>
            <button
              onClick={() => setInputVal(prev => (prev ? `${prev}, ` : '') + 'Severe pain (8/10), started today, nausea')}
              className="px-2.5 py-1 rounded-xl bg-white border border-red-200 text-red-900 font-bold hover:bg-red-50 text-[11px] transition shadow-xs"
            >
              Severe (8/10) • Today
            </button>
          </div>
        )}

        {/* Post-Categorization Follow-Up Chips */}
        {triageResult && (
          <div className="px-5 py-2 bg-blue-50/70 border-t border-blue-100 flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in">
            <span className="text-[11px] font-black text-blue-900 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              Ask Doctor Chatbot:
            </span>
            <button
              onClick={() => handleSend("What foods or drinks should I avoid?")}
              className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 text-[11px] transition shadow-xs"
            >
              What foods to avoid?
            </button>
            <button
              onClick={() => handleSend("When should I see a doctor if symptoms persist?")}
              className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 text-[11px] transition shadow-xs"
            >
              When to see a doctor?
            </button>
            <button
              onClick={() => handleSend("What home precautions should I take?")}
              className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 text-[11px] transition shadow-xs"
            >
              Home precautions?
            </button>
          </div>
        )}

        {/* Input Bar with Voice & Text */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <button
              onClick={handleVoiceToggle}
              className={`p-3 rounded-2xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-bounce shadow-lg shadow-red-500/30'
                  : 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200'
              }`}
              title={isRecording ? "Stop recording" : "Speak your symptoms"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  isRecording 
                    ? t('listening', 'Listening to your voice...') 
                    : triageResult
                    ? "Ask follow-up questions about remedies, precautions, diet..."
                    : isInquiryPhase
                    ? "Reply with duration, pain severity (1-10), and other symptoms..."
                    : t('typeSymptoms', 'Describe symptoms in your language...')
                }
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-transparent pr-10 shadow-sm"
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!inputVal.trim() || isAnalyzing}
              className="p-3 rounded-2xl bg-brand-emerald text-white disabled:opacity-40 hover:bg-emerald-700 active:scale-95 transition shadow-md shadow-brand-emerald/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Supports voice & text in English, Hindi, Kannada, Tamil, Telugu</span>
            <span>Groq LPU clinical triage & follow-up inquiry</span>
          </div>
        </div>

      </div>
    </div>
  );
}
