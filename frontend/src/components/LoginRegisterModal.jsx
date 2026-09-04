import React, { useState } from 'react';
import { 
  X, User, Lock, Mail, Globe, Stethoscope, Building2, 
  CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';

export function LoginRegisterModal({ isOpen, onClose }) {
  const { switchPersona, personas, login } = useAuth();
  const { supportedLanguages } = useLanguage();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('patient'); // 'patient' | 'doctor' | 'admin'

  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [preferredLang, setPreferredLang] = useState('en');
  const [specialization, setSpecialization] = useState('General Physician');
  const [spokenLangs, setSpokenLangs] = useState(['en', 'hi']);
  const [medicalHistory, setMedicalHistory] = useState('');

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        username,
        password,
        preferred_language: preferredLang,
        specialization: role === 'doctor' ? specialization : undefined,
        spoken_languages: role === 'doctor' ? spokenLangs : undefined
      };

      const res = await api.register(role, payload);
      setSuccess(`Account registered successfully as ${role.toUpperCase()}! Logging you in...`);
      setTimeout(() => {
        switchPersona(res.user);
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Registration failed. Username might already exist.');
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(username, password, role);
      setSuccess(`Welcome back, ${loggedUser.name}!`);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your username and password.');
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (persona) => {
    switchPersona(persona);
    onClose();
  };

  const toggleSpokenLang = (code) => {
    setSpokenLangs(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">SehatSanketh Portal Access</h3>
              <p className="text-[11px] text-slate-300">Secure Role-Based Authentication & Registration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Tabs: Login vs Register */}
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create New Account
            </button>
          </div>

          {/* Role Selector Pills */}
          <div>
            <label className="text-xs font-extrabold text-slate-600 block mb-2 uppercase tracking-wider">
              Select Your Role:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'patient', label: 'Patient', icon: User, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                { id: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'text-blue-700 bg-blue-50 border-blue-300' },
                { id: 'admin', label: 'Hospital Admin', icon: Building2, color: 'text-amber-700 bg-amber-50 border-amber-300' },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-2xl border text-xs font-extrabold flex flex-col items-center gap-1.5 transition ${
                      isSelected ? r.color + ' shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
            
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Rao or Priya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-emerald focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose or enter username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-emerald focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-emerald focus:outline-none"
              />
            </div>

            {/* Role Specific Registration Fields */}
            {mode === 'register' && role === 'patient' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Preferred Regional Language (Text & Voice)
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-brand-emerald focus:outline-none"
                >
                  {supportedLanguages.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.native})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'register' && role === 'doctor' && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-brand-emerald focus:outline-none"
                  >
                    <option value="General Physician">General Physician</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Pediatrician">Pediatrician</option>
                    <option value="Therapist & Clinical Psychologist">Therapist & Clinical Psychologist</option>
                    <option value="General Surgeon">General Surgeon</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Spoken Regional Languages (Select all you speak):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {supportedLanguages.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => toggleSpokenLang(l.code)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                          spokenLangs.includes(l.code)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {l.flag} {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 rounded-2xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/25 transition disabled:opacity-50"
            >
              <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Fast Demo Persona Switcher */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Instant 1-Click Demo Profiles
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">No typing needed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickDemo(p)}
                  className="p-2.5 rounded-2xl border border-slate-100 hover:border-emerald-200 bg-slate-50/60 hover:bg-emerald-50/50 text-left flex items-center gap-2.5 transition"
                >
                  <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{p.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
