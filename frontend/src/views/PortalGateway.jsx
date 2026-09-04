import React from 'react';
import { 
  Heart, User, Stethoscope, Building2, ShieldAlert, ArrowRight, 
  Sparkles, Globe, Pill, Calendar, Activity, CheckCircle2, ChevronRight, Lock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function PortalGateway({ onSelectPortal }) {
  const { currentLanguage, t } = useLanguage();

  const portals = [
    {
      id: 'patient_login',
      title: 'Patient Healthcare Portal',
      subtitle: 'रोगियों के लिए • ರೋಗಿಗಳಿಗೆ • நோயாளிகளுக்கு',
      tag: 'Patients & Families',
      badge: 'Multilingual Triage',
      color: 'emerald',
      icon: User,
      gradient: 'from-emerald-500 to-teal-700',
      borderHover: 'hover:border-emerald-400 hover:shadow-emerald-500/20',
      bgPill: 'bg-emerald-100 text-emerald-800',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30',
      description: 'AI clinical symptom check in 5 regional languages, doctor appointment booking, doctor-approved medication regimens, and instant emergency SOS.',
      features: [
        'Voice & Text intake in 5 Indian languages',
        'Groq LPU clinical triage & follow-up questions',
        'Medicine reminders & doctor-verified prescriptions',
        '1-tap emergency SOS ambulance dispatch'
      ],
      profilesAvailable: 'Priya Sharma • Ramesh Kumar • New Patients'
    },
    {
      id: 'doctor_login',
      title: 'Doctor Clinical Portal',
      subtitle: 'चिकित्सक पोर्टल • ವೈದ್ಯರ ಪೋರ್ಟಲ್ • மருத்துவர்கள்',
      tag: 'Physicians & Specialists',
      badge: 'Clinical Command',
      color: 'blue',
      icon: Stethoscope,
      gradient: 'from-blue-600 to-indigo-800',
      borderHover: 'hover:border-blue-400 hover:shadow-blue-500/20',
      bgPill: 'bg-blue-100 text-blue-800',
      btnBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30',
      description: 'Dedicated clinical workstation for licensed practitioners: manage consultation schedule, review AI prescription drafts, and conduct live video calls.',
      features: [
        'Live consultation schedule & booked appointments',
        'AI Prescription Confirmation Queue (Approve / Edit)',
        'Real-time video consults with Indian language subtitles',
        'High-risk readmission monitor & patient EHR roster'
      ],
      profilesAvailable: 'Dr. Ching Ming Yang • Dr. Rajesh Rao • Dr. Marc Lee • Dr. Olivia Bennett • Dr. Ethan Roberts'
    },
    {
      id: 'admin_login',
      title: 'Hospital Admin Portal',
      subtitle: 'प्रशासन • ಆಸ್ಪತ್ರೆ ಆಡಳಿತ • நிர்வாகம்',
      tag: 'Hospital Administration',
      badge: 'Operations & Fleet',
      color: 'amber',
      icon: Building2,
      gradient: 'from-amber-600 to-orange-800',
      borderHover: 'hover:border-amber-400 hover:shadow-amber-500/20',
      bgPill: 'bg-amber-100 text-amber-800',
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30',
      description: 'Central hospital command center: live GPS ambulance dispatch, real-time ICU bed and oxygen allocation, and pharmacy stock monitoring.',
      features: [
        'Live GPS emergency ambulance fleet tracking',
        'ICU & Ventilator bed occupancy management',
        'Oxygen cylinder stock & critical buffer alerts',
        'Pharmacy inventory & essential medicine refills'
      ],
      profilesAvailable: 'Admin Vikram Malhotra (Hospital Command)'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 font-sans">
      
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-black shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-emerald" />
          <span>Multilingual AI Healthcare Infrastructure</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>India 2026</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Welcome to <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 bg-clip-text text-transparent">SehatSanketh AI</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Please select your authorized portal category below. Each category provides a secure, dedicated login for its individual user profiles.
        </p>
      </div>

      {/* 3 Dedicated Category Portals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {portals.map((portal) => {
          const IconComp = portal.icon;
          return (
            <div
              key={portal.id}
              className={`group relative bg-white rounded-[32px] border border-slate-200/90 p-7 flex flex-col justify-between shadow-soft transition-all duration-300 ${portal.borderHover} hover:-translate-y-1`}
            >
              {/* Top Banner & Icon */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${portal.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                    <IconComp className="w-7 h-7" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${portal.bgPill}`}>
                    {portal.badge}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {portal.tag}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-slate-950">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {portal.subtitle}
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {portal.description}
                </p>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Portal Capabilities:
                  </span>
                  <ul className="space-y-1.5">
                    {portal.features.map((feat, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Available Profiles */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-[11px] space-y-0.5">
                  <span className="font-extrabold text-slate-800 block">Profiles in Category:</span>
                  <p className="text-slate-500 font-medium">{portal.profilesAvailable}</p>
                </div>
              </div>

              {/* Bottom Login Action Button */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={() => onSelectPortal(portal.id)}
                  className={`w-full py-3.5 px-5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${portal.btnBg}`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Access {portal.title.split(' ')[0]} Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety & Compliance Strip */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-slate-800 block">Role-Isolated Security Model</strong>
            <span>Patients, Doctors, and Administrators have distinct access portals and cannot access each other's workspaces.</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600">
          <span>🔒 256-bit Encrypted</span>
          <span>⚡ Groq LPU</span>
          <span>🇮🇳 5 Indian Languages</span>
        </div>
      </div>

    </div>
  );
}
