import React, { useState, useEffect } from 'react';
import { 
  User, Stethoscope, Building2, Lock, ArrowLeft, ArrowRight, 
  CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Key, Check, Plus, Star, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';

export function CategoryLoginPage({ category, onBack }) {
  const { login, loginProfile, personas } = useAuth();
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveDoctors, setLiveDoctors] = useState([]);

  // Registration state
  // 1. Patient
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('password123');
  const [regAge, setRegAge] = useState('28');
  const [regGender, setRegGender] = useState('Female');
  const [regPhone, setRegPhone] = useState('+91 98765 12345');
  const [regLang, setRegLang] = useState(currentLanguage || 'en');
  const [regHistory, setRegHistory] = useState('Seasonal allergies, mild asthma');

  // 2. Doctor
  const [regDocName, setRegDocName] = useState('');
  const [regDocUsername, setRegDocUsername] = useState('');
  const [regDocPassword, setRegDocPassword] = useState('password123');
  const [regDocSpecialty, setRegDocSpecialty] = useState('Cardiologist');
  const [regDocExp, setRegDocExp] = useState('10');
  const [regDocFee, setRegDocFee] = useState('80');
  const [regDocAddress, setRegDocAddress] = useState('Apollo Metro Hospital, Block C');
  const [regDocLang, setRegDocLang] = useState('en');

  // 3. Admin
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminUsername, setRegAdminUsername] = useState('');
  const [regAdminPassword, setRegAdminPassword] = useState('password123');
  const [regAdminDept, setRegAdminDept] = useState('Hospital Emergency & Fleet Command');

  useEffect(() => {
    if (category === 'doctor') {
      api.getDoctors().then(res => {
        if (res && res.doctors) {
          setLiveDoctors(res.doctors);
        }
      }).catch(() => {});
    }
  }, [category, activeTab]);

  // Filter profiles strictly belonging to this category and merge live doctors
  const defaultCategoryProfiles = personas.filter(p => p.role === category);
  const categoryProfiles = category === 'doctor' && liveDoctors.length > 0
    ? liveDoctors.map(doc => {
        const matchingPersona = personas.find(p => p.id === doc.id || p.doctorId === doc.id);
        const spoken = doc.spoken_languages || ['en'];
        const speaksHi = spoken.some(l => l.toLowerCase() === 'hi');
        return {
          id: doc.id,
          username: matchingPersona?.username || doc.username || doc.id,
          name: doc.name,
          role: 'doctor',
          doctorId: doc.id,
          specialization: doc.specialization,
          rating: doc.rating || 5.0,
          experience_years: doc.experience_years || 5,
          session_fee: doc.session_fee || 60,
          clinic_address: doc.clinic_address || 'Apollo Metro Hospital',
          avatar: doc.avatar_url || matchingPersona?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
          badgeText: speaksHi ? 'Speaks HI' : 'Translates via Sarvam AI',
          spoken_languages: spoken
        };
      })
    : defaultCategoryProfiles;

  const getCategoryConfig = () => {
    switch (category) {
      case 'doctor':
        return {
          title: 'Doctor Clinical Portal Login',
          subtitle: 'Authorized Medical Practitioner Access',
          icon: Stethoscope,
          gradient: 'from-blue-600 via-indigo-600 to-blue-800',
          badge: 'Clinical EHR & Triage',
          btnBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30',
          accentColor: 'text-blue-600',
          borderColor: 'border-blue-200',
          note: 'Access restricted to credentialed physicians and attending specialists.'
        };
      case 'admin':
        return {
          title: 'Hospital Administration Login',
          subtitle: 'Fleet & Emergency Resource Command Center',
          icon: Building2,
          gradient: 'from-amber-600 via-orange-600 to-amber-800',
          badge: 'Operations & Fleet Command',
          btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30',
          accentColor: 'text-amber-600',
          borderColor: 'border-amber-200',
          note: 'Hospital administration credentials required for fleet and bed command.'
        };
      case 'patient':
      default:
        return {
          title: 'Patient Healthcare Portal Login',
          subtitle: 'Personal Health Records, Triage & Consultations',
          icon: User,
          gradient: 'from-emerald-600 via-teal-600 to-emerald-800',
          badge: 'Patient Portal',
          btnBg: 'bg-brand-emerald hover:bg-emerald-700 shadow-emerald-600/30',
          accentColor: 'text-brand-emerald',
          borderColor: 'border-emerald-200',
          note: 'Sign in with your patient account or register as a new patient.'
        };
    }
  };

  const config = getCategoryConfig();
  const IconComp = config.icon;

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter your username / ID.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await login(username.trim(), password, category);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProfile = (profile) => {
    setErrorMsg(null);
    loginProfile(profile);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let payload = {};
      if (category === 'patient') {
        if (!regName.trim()) {
          setErrorMsg('Please provide your full name.');
          setIsLoading(false);
          return;
        }
        const uName = regUsername.trim() || `patient_${regName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        payload = {
          name: regName.trim(),
          username: uName,
          password: regPassword || 'password123',
          role: 'patient',
          age: parseInt(regAge) || 30,
          gender: regGender,
          phone: regPhone,
          preferred_language: regLang,
          medical_history: regHistory ? [regHistory] : ["Registered Patient"]
        };
      } else if (category === 'doctor') {
        if (!regDocName.trim()) {
          setErrorMsg('Please enter doctor name.');
          setIsLoading(false);
          return;
        }
        const cleanName = regDocName.trim().startsWith('Dr.') ? regDocName.trim() : `Dr. ${regDocName.trim()}`;
        const uName = regDocUsername.trim() || `doc_${regDocName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        payload = {
          name: cleanName,
          username: uName,
          password: regDocPassword || 'password123',
          role: 'doctor',
          specialization: regDocSpecialty,
          experience_years: parseInt(regDocExp) || 5,
          session_fee: parseInt(regDocFee) || 60,
          clinic_address: regDocAddress,
          preferred_language: regDocLang,
          spoken_languages: [regDocLang, 'en']
        };
      } else if (category === 'admin') {
        if (!regAdminName.trim()) {
          setErrorMsg('Please enter administrator name.');
          setIsLoading(false);
          return;
        }
        const uName = regAdminUsername.trim() || `admin_${regAdminName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        payload = {
          name: regAdminName.trim(),
          username: uName,
          password: regAdminPassword || 'password123',
          role: 'admin',
          preferred_language: 'en',
          department: regAdminDept
        };
      }

      const res = await api.register(category, payload);
      loginProfile(res.user);
    } catch (err) {
      console.warn("Registration error:", err);
      setErrorMsg(err.message || 'Registration failed. Username may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6 font-sans">
      
      {/* Top Navigation Back to Gateway */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-black text-slate-700 shadow-xs transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Portal Gateway</span>
      </button>

      {/* Main Login Card */}
      <div className="bg-white rounded-[36px] border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Banner */}
        <div className={`p-8 bg-gradient-to-r ${config.gradient} text-white relative overflow-hidden`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                <IconComp className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider inline-block mb-1">
                  {config.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">{config.title}</h2>
                <p className="text-xs text-white/80 mt-0.5">{config.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs text-white/90 border border-white/20">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Role-Isolated Profile</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Tab Switcher (Login vs Register) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl max-w-sm mx-auto text-xs font-black">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl transition ${
                activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In to Profile
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl transition ${
                activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'doctor' ? 'Register New Doctor' : category === 'admin' ? 'Register New Admin' : 'Register New Patient'}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. EXISTING PROFILES SELECTION (Under this specific category) */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Authorized {category.toUpperCase()} Profiles</span>
                  <span className="text-[11px] font-bold text-slate-400">
                    (Click to sign in directly to your profile)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Each profile operates in a fully isolated sandbox. You will not see other users' data.
                </p>
              </div>

              <div className={category === 'doctor' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                {categoryProfiles.map((p) => {
                  if (category === 'doctor') {
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProfile(p)}
                        className="p-4 rounded-3xl border-2 border-emerald-300 hover:border-emerald-600 bg-white text-left transition-all group flex flex-col justify-between gap-3 shadow-xs hover:shadow-lg hover:-translate-y-0.5 cursor-pointer relative overflow-hidden"
                      >
                        {/* Top Header: Specialization & Rating */}
                        <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-800">
                            {p.specialization || 'Clinical Specialist'}
                          </span>
                          <span className="text-xs font-black text-amber-500 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{p.rating || 4.8}</span>
                          </span>
                        </div>

                        {/* Doctor Main Info */}
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 group-hover:border-emerald-500 flex-shrink-0 transition shadow-xs"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 truncate leading-tight">
                              {p.name}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-500 truncate">
                              {p.experience_years ? `${p.experience_years}+ yrs exp` : 'Senior Physician'} • ${p.session_fee || 80}/session
                            </p>
                            <div>
                              {p.badgeText === 'Speaks HI' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>Speaks HI</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                  <span>Translates via Sarvam AI</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer: Clinic Location & Direct Login Action */}
                        <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400 truncate max-w-[140px] font-medium" title={p.clinic_address}>
                            {p.clinic_address || 'Apollo Metro Hospital'}
                          </span>
                          <span className="font-black text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1">
                            <span>Direct Login</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProfile(p)}
                      className="p-4 rounded-3xl border-2 border-slate-200/90 hover:border-slate-800 bg-slate-50/50 hover:bg-white text-left transition-all group flex items-start gap-3 shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-300 group-hover:border-slate-800 flex-shrink-0 transition"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 group-hover:text-black truncate">
                            {p.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            {p.lang || 'en'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{p.subtext}</p>
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-1">
                          <span>Sign In as {p.name.split(' ')[0]}</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. MANUAL CREDENTIALS SIGN IN FORM */}
          {activeTab === 'login' && (
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Or Sign In with Username & Password:
              </span>

              <form onSubmit={handleManualLogin} className="space-y-4 max-w-md">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                    {category === 'doctor' ? 'Doctor ID / Username' : category === 'admin' ? 'Admin ID / Key' : 'Patient Username'}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={category === 'doctor' ? 'e.g. doc_ching or doc_rajesh' : category === 'admin' ? 'e.g. admin_vikram' : 'e.g. patient_priya'}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${config.btnBg}`}
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Authenticating Profile...' : `Sign In to ${config.title.split(' ')[0]} Portal`}</span>
                </button>
              </form>
            </div>
          )}

          {/* 3. ROLE-SPECIFIC REGISTRATION FORMS */}
          {activeTab === 'register' && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Register New {category.toUpperCase()} Account</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Saved to Neon Cloud DB
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your credentials and profile details will be securely saved to PostgreSQL so you can sign in anytime.
                </p>
              </div>

              {/* Patient Registration */}
              {category === 'patient' && (
                <form onSubmit={handleRegister} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Ananya Rao"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. ananya_rao"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Age & Gender *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={regAge}
                          onChange={(e) => setRegAge(e.target.value)}
                          className="w-20 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-center font-bold"
                        />
                        <select
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className="flex-1 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Contact Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Preferred Language
                      </label>
                      <select
                        value={regLang}
                        onChange={(e) => setRegLang(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                        <option value="kn">Kannada (ಕನ್ನಡ)</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                        <option value="te">Telugu (తెలుగు)</option>
                        <option value="mr">Marathi (मराठी)</option>
                        <option value="bn">Bengali (বাংলা)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Prior Medical Conditions & Known Allergies
                    </label>
                    <textarea
                      rows={2}
                      value={regHistory}
                      onChange={(e) => setRegHistory(e.target.value)}
                      placeholder="e.g. Asthma, Penicillin allergy, Diabetes"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl bg-brand-emerald hover:bg-emerald-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-emerald/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isLoading ? 'Creating Account...' : 'Create Patient Profile & Log In'}</span>
                  </button>
                </form>
              )}

              {/* Doctor Registration */}
              {category === 'doctor' && (
                <form onSubmit={handleRegister} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Doctor Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regDocName}
                        onChange={(e) => setRegDocName(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Rao"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Doctor Username / ID *
                      </label>
                      <input
                        type="text"
                        value={regDocUsername}
                        onChange={(e) => setRegDocUsername(e.target.value)}
                        placeholder="e.g. doc_rajesh"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regDocPassword}
                        onChange={(e) => setRegDocPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Medical Specialization *
                      </label>
                      <select
                        value={regDocSpecialty}
                        onChange={(e) => setRegDocSpecialty(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                      >
                        <option value="Cardiologist">Cardiologist</option>
                        <option value="General Physician">General Physician</option>
                        <option value="Pediatrician">Pediatrician</option>
                        <option value="Neurologist">Neurologist</option>
                        <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                        <option value="Therapist & Clinical Psychologist">Therapist & Clinical Psychologist</option>
                        <option value="General Surgeon">General Surgeon</option>
                        <option value="Dermatologist">Dermatologist</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Experience & Fee ($ / session)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={regDocExp}
                          onChange={(e) => setRegDocExp(e.target.value)}
                          placeholder="Years"
                          title="Years of experience"
                          className="w-24 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-center font-bold"
                        />
                        <input
                          type="number"
                          value={regDocFee}
                          onChange={(e) => setRegDocFee(e.target.value)}
                          placeholder="Fee $"
                          title="Session Fee in USD"
                          className="flex-1 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-center font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Primary Consultation Language
                      </label>
                      <select
                        value={regDocLang}
                        onChange={(e) => setRegDocLang(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                        <option value="kn">Kannada (ಕನ್ನಡ)</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                        <option value="te">Telugu (తెలుగు)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Hospital / Clinic Address
                    </label>
                    <input
                      type="text"
                      value={regDocAddress}
                      onChange={(e) => setRegDocAddress(e.target.value)}
                      placeholder="e.g. Apollo Metro Hospital, Block C, Bangalore"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isLoading ? 'Registering Doctor...' : 'Create Doctor Profile & Log In'}</span>
                  </button>
                </form>
              )}

              {/* Admin Registration */}
              {category === 'admin' && (
                <form onSubmit={handleRegister} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Admin Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAdminName}
                        onChange={(e) => setRegAdminName(e.target.value)}
                        placeholder="e.g. Vikram Malhotra"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Admin Username / ID *
                      </label>
                      <input
                        type="text"
                        value={regAdminUsername}
                        onChange={(e) => setRegAdminUsername(e.target.value)}
                        placeholder="e.g. admin_vikram"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regAdminPassword}
                        onChange={(e) => setRegAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Assigned Command Unit / Department
                      </label>
                      <select
                        value={regAdminDept}
                        onChange={(e) => setRegAdminDept(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                      >
                        <option value="Hospital Emergency & Fleet Command">Hospital Emergency & Fleet Command</option>
                        <option value="ICU Bed & Critical Resource Command">ICU Bed & Critical Resource Command</option>
                        <option value="Pharmacy & Medical Inventory Operations">Pharmacy & Medical Inventory Operations</option>
                        <option value="General Hospital Operations">General Hospital Operations</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isLoading ? 'Registering Admin...' : 'Create Admin Profile & Log In'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
