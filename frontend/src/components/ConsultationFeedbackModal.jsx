import React, { useState, useEffect } from 'react';
import { 
  Star, Mic, MicOff, Send, X, CheckCircle2, Sparkles, 
  MessageSquare, Heart, Globe, ThumbsUp, ChevronRight, Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import { startListening, stopListening, isSpeechRecognitionSupported } from '../utils/speech';

const SUPPORTED_FEEDBACK_LANGUAGES = [
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🌐' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' }
];

const QUICK_COMPLIMENTS = [
  { id: 'clear_advice', label: '🩺 Clear Medical Advice' },
  { id: 'listened_well', label: '👂 Listened Patiently' },
  { id: 'translation', label: '🌐 Bilingual Translation Helped' },
  { id: 'rx_explained', label: '💊 Prescriptions Explained' },
  { id: 'accurate_dx', label: '🎯 Accurate Diagnosis' },
  { id: 'friendly_care', label: '❤️ Friendly & Compassionate' }
];

const RATING_DESCRIPTIONS = {
  5: { text: "Outstanding Consultation Experience!", sub: "Doctor provided thorough care and clear guidance." },
  4: { text: "Very Good & Helpful", sub: "Most concerns were addressed clearly." },
  3: { text: "Satisfactory Consultation", sub: "Standard medical consultation." },
  2: { text: "Needs Improvement", sub: "Could be more attentive or clearer." },
  1: { text: "Unsatisfactory Experience", sub: "We apologize; our hospital team will review this." }
};

export function ConsultationFeedbackModal({
  isOpen,
  onClose,
  consultationData = {},
  onFeedbackSubmitted
}) {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['🩺 Clear Medical Advice', '👂 Listened Patiently']);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLang, setFeedbackLang] = useState(user?.preferred_language || currentLanguage || 'kn');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const effectiveDoctorName = consultationData.doctorName || "Dr. Rajesh Rao";
  const effectiveDoctorId = consultationData.doctorId || "doc_05";
  const effectivePatientName = user?.name || consultationData.patientName || "Priya Sharma";
  const effectivePatientId = user?.patientId || user?.id || consultationData.patientId || "p_01";
  const effectiveConsultId = consultationData.id || "consult_01";

  // Sync preferred language
  useEffect(() => {
    if (currentLanguage && SUPPORTED_FEEDBACK_LANGUAGES.some(l => l.code === currentLanguage)) {
      setFeedbackLang(currentLanguage);
    }
  }, [currentLanguage]);

  if (!isOpen) return null;

  const handleToggleTag = (label) => {
    setSelectedTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  };

  const handleToggleVoice = () => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setVoiceUsed(true);
      const rec = startListening({
        lang: feedbackLang,
        onResult: (transcript, isFinal) => {
          if (transcript && transcript.trim()) {
            setFeedbackText(prev => {
              if (!prev.trim()) return transcript;
              return prev.endsWith(' ') ? prev + transcript : prev + ' ' + transcript;
            });
          }
        },
        onError: (err) => {
          console.warn("Speech recognition error:", err);
          setIsRecording(false);
        },
        onEnd: () => {
          setIsRecording(false);
        }
      });
      if (!rec) {
        setIsRecording(false);
      }
    }
  };

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    try {
      if (isRecording) {
        stopListening();
        setIsRecording(false);
      }

      const payload = {
        consultation_id: effectiveConsultId,
        patient_id: effectivePatientId,
        patient_name: effectivePatientName,
        doctor_id: effectiveDoctorId,
        doctor_name: effectiveDoctorName,
        rating: rating,
        tags: selectedTags,
        feedback_text: feedbackText.trim(),
        language: feedbackLang,
        voice_input_used: voiceUsed,
        skipped: false
      };

      await api.submitConsultationFeedback(payload);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSubmittedSuccess(true);
      if (onFeedbackSubmitted) onFeedbackSubmitted(payload);

      setTimeout(() => {
        setSubmittedSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      alert("Could not submit feedback: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
    }

    try {
      // Record skip in background without blocking patient
      api.submitConsultationFeedback({
        consultation_id: effectiveConsultId,
        patient_id: effectivePatientId,
        patient_name: effectivePatientName,
        doctor_id: effectiveDoctorId,
        doctor_name: effectiveDoctorName,
        rating: 5,
        skipped: true
      }).catch(() => {});
    } catch (e) {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 text-slate-900 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white relative">
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            title="Skip Feedback"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Heart className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Consultation Completed
              </span>
              <h3 className="text-xl font-black text-white">
                How was your consultation?
              </h3>
            </div>
          </div>

          <p className="text-xs text-emerald-200/90 mt-1">
            With <strong>{effectiveDoctorName}</strong> • Share feedback in your language via voice or text.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

          {submittedSuccess ? (
            <div className="p-8 text-center space-y-3 animate-in zoom-in duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Thank you for your feedback!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your review has been translated and recorded for Dr. {effectiveDoctorName.split(' ').pop()} and the clinical care quality board.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Star Rating */}
              <div className="text-center space-y-2 pb-2">
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1.5 transition transform hover:scale-125 cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="min-h-[38px]">
                  <p className="font-black text-sm text-slate-900">
                    {RATING_DESCRIPTIONS[rating]?.text}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {RATING_DESCRIPTIONS[rating]?.sub}
                  </p>
                </div>
              </div>

              {/* 2. Quick Satisfaction Tags */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  What went well?
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_COMPLIMENTS.map((c) => {
                    const isSelected = selectedTags.includes(c.label);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleTag(c.label)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Language Selector for Feedback */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold text-slate-800">
                    Language (ಭಾಷೆ / भाषा):
                  </span>
                </div>
                <select
                  value={feedbackLang}
                  onChange={(e) => setFeedbackLang(e.target.value)}
                  className="text-xs font-bold p-1.5 px-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {SUPPORTED_FEEDBACK_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Voice or Text Input Area */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your Thoughts (Voice or Text)</span>
                  </label>
                  {voiceUsed && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-200">
                      ✓ Voice Captured
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Speak using microphone or type your experience in any language..."
                    className="w-full text-xs p-3.5 pr-14 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none leading-relaxed"
                  />

                  {/* Mic Button Inside Textbox */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition shadow-md cursor-pointer ${
                      isRecording
                        ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title={isRecording ? "Stop voice listening" : "Speak in your language"}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>

                {/* Voice Status Indicator */}
                {isRecording && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span>Listening in {SUPPORTED_FEEDBACK_LANGUAGES.find(l => l.code === feedbackLang)?.name}... Speak now</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        stopListening();
                        setIsRecording(false);
                      }}
                      className="text-[11px] font-black underline cursor-pointer"
                    >
                      Done Speaking
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 leading-tight">
                  ℹ️ Regional speech is automatically transcribed and translated to English for hospital quality records.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Footer Actions: Skip vs Submit */}
        {!submittedSuccess && (
          <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1"
            >
              <span>Skip for Now</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
