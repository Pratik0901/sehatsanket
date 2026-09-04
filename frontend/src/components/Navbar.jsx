import React, { useState, useEffect } from 'react';
import { 
  Heart, AlertCircle, Globe, Users, Bell, User,
  Smartphone, Monitor, ChevronDown, Check, ShieldAlert, Sparkles, CheckCircle2,
  LogOut, Stethoscope, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';

export function Navbar({ onOpenEmergency, onOpenAiTriage, isMobileFrame, setIsMobileFrame }) {
  const { user, role, logout, currentPortal, setCurrentPortal } = useAuth();
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [patientNotifs, setPatientNotifs] = useState([]);

  useEffect(() => {
    if (role !== 'patient' || !user) return;
    const pId = user?.patientId || user?.id || 'p_01';
    
    const fetchNotifs = async () => {
      try {
        const res = await api.getPatientNotifications(pId);
        setPatientNotifs(res || []);
      } catch (e) {}
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2500);
    return () => clearInterval(interval);
  }, [role, user]);

  const unreadCount = patientNotifs.filter(n => !n.read).length;

  const getRoleBadgeColor = () => {
    if (role === 'doctor') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (role === 'admin') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div 
          onClick={() => {
            if (!user) setCurrentPortal('portal_gateway');
          }}
          className={`flex items-center gap-3 ${!user ? 'cursor-pointer' : ''}`}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-emerald to-brand-mint flex items-center justify-center text-white shadow-md shadow-brand-mint/30">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                Sehat<span className="text-brand-mint">Sanketh</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800">
                AI Health
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-orange-900 border border-orange-200">
                ⚡ Groq LPU & Sarvam AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {t('appTagline', 'AI-Powered Multilingual Healthcare')} • Real-Time Indian Language Inference
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Frame View Toggle (Mobile vs Desktop) */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Toggle between Mobile App mockup and Desktop Dashboard view"
          >
            {isMobileFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isMobileFrame ? 'Desktop Mode' : 'Mobile Preview'}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition"
            >
              <Globe className="w-3.5 h-3.5 text-brand-emerald" />
              <span className="uppercase">{currentLanguage}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('selectLanguage', 'Select Language')}
                </div>
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-emerald-50 transition ${
                      currentLanguage === lang.code ? 'font-bold text-brand-emerald bg-emerald-50/60' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      <span className="text-[11px] text-slate-400">({lang.native})</span>
                    </div>
                    {currentLanguage === lang.code && <Check className="w-3.5 h-3.5 text-brand-emerald" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Patient Notification Bell (Only when logged in as patient) */}
          {role === 'patient' && user && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowLangMenu(false);
                }}
                className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
                title="View Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-white shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Notifications
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {unreadCount} New
                    </span>
                  </div>

                  <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                    {patientNotifs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                    ) : (
                      patientNotifs.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1. AUTHENTICATED USER BADGE & LOGOUT BUTTON (No Persona Dropdown!) */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${getRoleBadgeColor()}`}>
                <img 
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt={user.name} 
                  className="w-5 h-5 rounded-full object-cover border border-slate-300"
                />
                <span className="truncate max-w-[120px] font-black hidden sm:inline">{user.name}</span>
                <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-2xs">
                  {user.role}
                </span>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition active:scale-95"
                title="Log Out of this profile"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Log Out</span>
              </button>
            </div>
          ) : (
            /* 2. UNAUTHENTICATED: CATEGORY PORTAL ACCESS BUTTONS */
            <div className="flex items-center gap-1.5 text-xs font-extrabold">
              <button
                onClick={() => setCurrentPortal('patient_login')}
                className={`px-3 py-1.5 rounded-full transition ${
                  currentPortal === 'patient_login'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Patient
              </button>
              <button
                onClick={() => setCurrentPortal('doctor_login')}
                className={`px-3 py-1.5 rounded-full transition ${
                  currentPortal === 'doctor_login'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Doctor
              </button>
              <button
                onClick={() => setCurrentPortal('admin_login')}
                className={`px-3 py-1.5 rounded-full transition ${
                  currentPortal === 'admin_login'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {/* ONE-TAP EMERGENCY SOS BUTTON (Always Visible) */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:from-red-700 hover:to-rose-600 active:scale-95 transition-transform animate-pulse"
            title="Trigger instant emergency response and GPS ambulance dispatch"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span className="tracking-wide uppercase font-extrabold">{t('emergencySos', 'Emergency SOS')}</span>
          </button>

        </div>
      </div>
    </header>
  );
}
