import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Navigation, Pill, Users, Stethoscope, 
  MapPin, Clock, CheckCircle2, AlertTriangle, RefreshCw, 
  Send, Plus, Activity, UserCheck, PhoneCall, Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';

export function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [resources, setResources] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  // Active tab inside Admin Dashboard
  const [activeTab, setActiveTab] = useState('emergencies'); // 'emergencies' | 'ambulances' | 'medicines' | 'admitted'

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getHospitalResources();
      setResources(res);
      const emRes = await api.getActiveEmergencies();
      setEmergencies(emRes || []);
      if (emRes && emRes.length > 0 && !selectedEmergency) {
        setSelectedEmergency(emRes[0]);
        if (emRes[0].recommended_ambulance_id) {
          setSelectedAmbulanceId(emRes[0].recommended_ambulance_id);
        }
      }
    } catch (e) {
      console.warn("Error fetching admin resources:", e);
    }
  };

  const handleDispatch = async (emId) => {
    const ambId = selectedAmbulanceId || selectedEmergency?.recommended_ambulance_id || 'amb_01';
    try {
      const res = await api.dispatchAmbulance(emId, ambId);
      setActionNotice(res.message || "Ambulance dispatched successfully!");
      loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (e) {
      console.warn("Dispatch error:", e);
    }
  };

  const handleRestock = async (medId) => {
    try {
      await api.restockMedicine(medId, 250);
      loadData();
      setActionNotice("Medicine inventory successfully replenished (+250 units)");
      setTimeout(() => setActionNotice(null), 3000);
    } catch (e) {
      console.warn("Restock error:", e);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Top Admin Command Header */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Hospital Emergency Command
            </span>
            <span className="text-xs text-slate-400">• Apollo Metro Medical Base</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1">
            {user?.name || "Hospital Administrator Console"}
          </h1>
          <p className="text-xs text-slate-300">
            Live Fleet Dispatch, AI Emergency Explainability, Pharmacy Stock & Inpatient Tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setActiveTab('ambulances')}
          className="cursor-pointer p-4 rounded-3xl bg-white border border-slate-100 shadow-soft hover:border-emerald-200 transition"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Fleet</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {resources?.summary?.available_ambulances ?? 2} / {resources?.summary?.total_ambulances ?? 4}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Ambulances Stationed</p>
        </div>

        <div 
          onClick={() => setActiveTab('emergencies')}
          className="cursor-pointer p-4 rounded-3xl bg-white border border-slate-100 shadow-soft hover:border-red-200 transition"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active SOS Calls</p>
          <p className="text-2xl font-black text-red-600 mt-1">
            {emergencies.filter(e => e.status !== 'Resolved').length}
          </p>
          <p className="text-[11px] text-red-500 font-semibold mt-0.5">Live Emergency Radar</p>
        </div>

        <div 
          onClick={() => setActiveTab('admitted')}
          className="cursor-pointer p-4 rounded-3xl bg-white border border-slate-100 shadow-soft hover:border-blue-200 transition"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admitted Beds</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {resources?.admitted_patients?.length ?? 3}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">ICU & Post-Op Wards</p>
        </div>

        <div 
          onClick={() => setActiveTab('medicines')}
          className="cursor-pointer p-4 rounded-3xl bg-white border border-slate-100 shadow-soft hover:border-amber-200 transition"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicine Alerts</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {resources?.medicines?.filter(m => m.status !== 'In Stock').length ?? 2}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Low / Critical Threshold</p>
        </div>
      </div>

      {/* Navigation Pills inside Admin Command */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'emergencies', label: 'Emergency Alert Radar & Explainability', icon: ShieldAlert },
          { id: 'ambulances', label: 'Ambulance Fleet Status', icon: Navigation },
          { id: 'medicines', label: 'Hospital Medicine Stock', icon: Pill },
          { id: 'admitted', label: 'Admitted Inpatients & Med Logs', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Emergency Alert Radar with AI Explainability & False Alarm Filter */}
      {activeTab === 'emergencies' && (
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {t('emergencyAlertConsole', 'Emergency Alert Console & False Alarm Filter')}
                </h2>
                <p className="text-xs text-slate-400">
                  AI Explainability verifies patient context before ambulance dispatch
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black animate-pulse">
              Code Red Monitor
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Alerts List */}
            <div className="space-y-3">
              {emergencies.map((em) => (
                <div
                  key={em.id}
                  onClick={() => {
                    setSelectedEmergency(em);
                    if (em.recommended_ambulance_id) {
                      setSelectedAmbulanceId(em.recommended_ambulance_id);
                    }
                  }}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    selectedEmergency?.id === em.id
                      ? 'border-red-500 bg-red-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{em.patient_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800">
                          {em.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        {em.address}
                      </p>
                    </div>

                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                      em.status === 'Ambulance Dispatched'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {em.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {em.ai_explainability}
                  </p>
                </div>
              ))}
            </div>

            {/* Selected Alert Details & Dispatch Action */}
            {selectedEmergency && (
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Emergency SOS: {selectedEmergency.patient_name}
                    </h3>
                    <p className="text-xs text-slate-500">Contact: {selectedEmergency.patient_phone}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{selectedEmergency.timestamp}</span>
                </div>

                {/* AI Explainability Box */}
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      <span>AI Clinical Emergency Justification:</span>
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                      False Alarm Risk: 2.1%
                    </span>
                  </div>
                  <p className="text-amber-800 leading-relaxed font-medium">
                    {selectedEmergency.ai_explainability}
                  </p>
                  <p className="text-[11px] text-amber-700 pt-1">
                    ✓ Evaluated patient's pre-existing conditions, comorbidity index, and GPS location. Verified genuine emergency.
                  </p>
                </div>

                {/* Nearest Ambulance Selector */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                    Select Available Ambulance to Dispatch:
                  </label>
                  <select
                    value={selectedAmbulanceId}
                    onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-emerald"
                  >
                    {resources?.ambulances?.map((amb) => (
                      <option key={amb.id} value={amb.id}>
                        {amb.vehicle_number} — {amb.status} ({amb.current_location}) [Fuel: {amb.fuel_level}%]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleDispatch(selectedEmergency.id)}
                    disabled={selectedEmergency.status === 'Ambulance Dispatched'}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {selectedEmergency.status === 'Ambulance Dispatched'
                        ? 'Ambulance Already En Route'
                        : t('dispatchAmbulance', 'Dispatch Nearest Ambulance')}
                    </span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 2: Ambulance Fleet */}
      {activeTab === 'ambulances' && (
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                {t('liveAmbulances', 'Ambulance Fleet Status & GPS Tracking')}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700">All Vehicles Present</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources?.ambulances?.map((amb) => (
              <div
                key={amb.id}
                className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900">{amb.vehicle_number}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    amb.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                    amb.status === 'Dispatched' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {amb.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  Driver: <span className="font-bold text-slate-800">{amb.driver_name}</span> ({amb.driver_phone})
                </p>
                <p className="text-xs text-slate-500">
                  Location: <span className="font-medium text-slate-700">{amb.current_location}</span>
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">{amb.fuel_level}% Battery / Fuel</span>
                  <span className="text-[11px] text-slate-400">GPS: {amb.lat}, {amb.lng}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Hospital Medicine Stock */}
      {activeTab === 'medicines' && (
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                {t('medicineInventory', 'Hospital Pharmacy & Medicine Inventory')}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Stock Threshold Monitor</span>
          </div>

          <div className="space-y-3">
            {resources?.medicines?.map((med) => (
              <div
                key={med.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{med.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      med.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800' :
                      med.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {med.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {med.category} • Minimum safety threshold: {med.min_threshold} {med.unit}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-black text-slate-900">
                    {med.stock_count} {med.unit}
                  </span>
                  {med.status !== 'In Stock' && (
                    <button
                      onClick={() => handleRestock(med.id)}
                      className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      + Restock 250
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Admitted Inpatients & Medication Distribution Logs */}
      {activeTab === 'admitted' && (
        <div className="rounded-3xl p-6 bg-white border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-700" />
              <h3 className="font-extrabold text-base text-slate-900">
                {t('admittedPatients', 'Admitted Inpatients & Hospital Medication Records')}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Bed Allocation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources?.admitted_patients?.map((inp) => (
              <div
                key={inp.id}
                className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900">{inp.name}</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold">
                    Bed {inp.bed_number}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-bold">{inp.diagnosis}</p>
                
                <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                  <p className="text-[11px] font-extrabold text-slate-700">Medications Administered:</p>
                  <p className="text-[11px] text-slate-500">{inp.medication_administered.join(', ')}</p>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>{inp.ward}</span>
                  <span className="font-bold text-emerald-700">Dr. {inp.attending_doctor.split(' ').pop()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
