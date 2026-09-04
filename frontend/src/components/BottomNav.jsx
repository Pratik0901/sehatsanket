import React from 'react';
import { Calendar, Compass, MessageSquare, Sparkles, Home, Stethoscope, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export function BottomNav({ activeTab, setActiveTab, onOpenAiTriage }) {
  const { t } = useLanguage();
  const { role } = useAuth();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-white/95 backdrop-blur-lg border border-slate-200/80 shadow-2xl shadow-slate-900/10 rounded-full px-4 py-2 flex items-center justify-between gap-1">
        
        {/* Tab 1: Home / Dashboard */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-full transition cursor-pointer ${
            activeTab === 'home' ? 'text-brand-emerald font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
          title="Dashboard"
        >
          <Home className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-0.5">Home</span>
        </button>

        {/* Tab 2: Digital Twin (Biometric Telemetry Simulation) */}
        <button
          onClick={() => setActiveTab('digital_twin')}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-full transition cursor-pointer relative ${
            activeTab === 'digital_twin' ? 'text-brand-emerald font-black scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          title="Patient Digital Twin"
        >
          <span className="text-sm leading-none">🧬</span>
          <span className="text-[9px] font-bold mt-0.5">Twin</span>
          {activeTab === 'digital_twin' && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        {/* CENTER FLOATING AI ASSISTANT PILL BUTTON (Matching Screenshot) */}
        <button
          onClick={onOpenAiTriage}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-brand-emerald via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 active:scale-95 transition-all duration-200 animate-pulse-glow cursor-pointer"
          title="Open AI Multilingual Symptom Triage"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-[11px] font-bold tracking-wide">
            {t('aiAssistant', 'AI Assistant')}
          </span>
        </button>

        {/* Tab 3: Calendar / Schedule */}
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-full transition cursor-pointer ${
            activeTab === 'schedule' ? 'text-brand-emerald font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
          title="Schedule"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-0.5">Schedule</span>
        </button>

        {/* Tab 4: Directory / Resources */}
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-full transition cursor-pointer ${
            activeTab === 'explore' ? 'text-brand-emerald font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
          title="Explore Doctors or Hospital"
        >
          {role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
          <span className="text-[9px] font-medium mt-0.5">
            {role === 'admin' ? 'Fleet' : 'Doctors'}
          </span>
        </button>

      </nav>
    </div>
  );
}
