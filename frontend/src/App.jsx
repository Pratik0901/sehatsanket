import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AiAssistantModal } from './components/AiAssistantModal';
import { EmergencySosModal } from './components/EmergencySosModal';
import { VideoConsultationModal } from './components/VideoConsultationModal';
import { IncomingCallNotification } from './components/IncomingCallNotification';

import { PortalGateway } from './views/PortalGateway';
import { CategoryLoginPage } from './views/CategoryLoginPage';
import { PatientDashboard } from './views/PatientDashboard';
import { DoctorDashboard } from './views/DoctorDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { api } from './utils/api';

function MainContent() {
  const { user, role, currentPortal, setCurrentPortal, personas, loginProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // Modals state
  const [isAiTriageOpen, setIsAiTriageOpen] = useState(false);
  const [initialTriageText, setInitialTriageText] = useState('');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isVideoConsultOpen, setIsVideoConsultOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeConsultData, setActiveConsultData] = useState({ 
    id: 'consult_01', 
    doctorName: 'Dr. Rajesh Rao', 
    patientName: 'Priya Sharma' 
  });

  const isVideoConsultOpenRef = useRef(isVideoConsultOpen);
  isVideoConsultOpenRef.current = isVideoConsultOpen;

  const roleRef = useRef(role);
  roleRef.current = role;

  const userRef = useRef(user);
  userRef.current = user;

  const signalingWsRef = useRef(null);

  // Global Call Signaling: Alerts the patient when a doctor initiates a video consultation
  const handleIncomingSignal = useCallback((data) => {
    if (!data) return;

    if (data.type === 'INCOMING_CALL') {
      // 1. Don't show incoming call prompt if this tab is already inside the video consultation room
      if (isVideoConsultOpenRef.current) return;

      // 2. Don't ring on the doctor who initiated the call
      const doctorCaller = (data.doctorName || data.doctor_name || '').trim().toLowerCase();
      const currentUserName = (userRef.current?.name || '').trim().toLowerCase();
      const isCurrentDoctor = roleRef.current === 'doctor' && currentUserName && doctorCaller && currentUserName.includes(doctorCaller);
      if (isCurrentDoctor) return;

      console.log("[Signaling] Displaying incoming call alert:", data);
      setIncomingCall({
        consultationId: data.consultationId || data.consultation_id || 'consult_01',
        doctorName: data.doctorName || data.doctor_name || 'Dr. Rajesh Rao',
        doctorSpecialty: data.doctorSpecialty || data.doctor_specialty || 'Senior Cardiologist & General Physician',
        patientName: data.patientName || data.patient_name || userRef.current?.name || 'Priya Sharma'
      });
    } else if (data.type === 'CALL_DECLINED' || data.type === 'CALL_ENDED') {
      console.log("[Signaling] Call ended or declined:", data);
      setIncomingCall(null);
      try {
        localStorage.removeItem('sehat_active_call');
      } catch (e) {}
      setIsVideoConsultOpen(false);
      setActiveTab('home');
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    let broadcastCh = null;
    let pollInterval = null;

    // 1. Cross-tab storage event: Fires 100% reliably in 0ms across all browser tabs
    const handleStorage = (e) => {
      if (!isSubscribed) return;
      if (e.key === 'sehat_active_call') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            handleIncomingSignal(parsed);
          } catch (err) {}
        } else {
          setIncomingCall(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initial check: if call was already placed right before tab loaded
    try {
      const existingCall = localStorage.getItem('sehat_active_call');
      if (existingCall) {
        const parsed = JSON.parse(existingCall);
        if (Date.now() - (parsed.timestamp || parsed.t || 0) < 60000) {
          handleIncomingSignal(parsed);
        }
      }
    } catch (e) {}

    // 2. BroadcastChannel
    try {
      broadcastCh = new BroadcastChannel('sehatsanketh_telehealth_global_signaling');
      broadcastCh.onmessage = (event) => {
        if (isSubscribed) handleIncomingSignal(event.data);
      };
    } catch (e) {
      console.warn("BroadcastChannel error:", e);
    }

    // 3. Global WebSocket Signaling
    const connectSignalingWs = () => {
      if (!isSubscribed) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/consultation/ws/signal`;
        const ws = new WebSocket(wsUrl);
        signalingWsRef.current = ws;

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            handleIncomingSignal(data);
          } catch (e) {}
        };

        ws.onclose = () => {
          if (isSubscribed) {
            setTimeout(connectSignalingWs, 2500);
          }
        };
      } catch (err) {
        console.warn("Signaling WebSocket error:", err);
      }
    };
    connectSignalingWs();

    // 4. Fallback Active Call Polling every 2.5 seconds
    pollInterval = setInterval(async () => {
      if (!isSubscribed || isVideoConsultOpenRef.current) return;
      try {
        const res = await api.getActiveCalls();
        if (res.active_calls && res.active_calls.length > 0) {
          const latest = res.active_calls[res.active_calls.length - 1];
          handleIncomingSignal({
            type: 'INCOMING_CALL',
            ...latest
          });
        }
      } catch (e) {}
    }, 2500);

    return () => {
      isSubscribed = false;
      window.removeEventListener('storage', handleStorage);
      if (broadcastCh) broadcastCh.close();
      if (signalingWsRef.current) {
        try { signalingWsRef.current.close(); } catch (e) {}
      }
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [handleIncomingSignal]);

  const handleOpenAiTriage = (text = '') => {
    setInitialTriageText(text || '');
    setIsAiTriageOpen(true);
  };

  const handleOpenVideoConsult = async (consultId = 'consult_01', docName = null, patName = null) => {
    const isDocRole = role === 'doctor' || user?.role === 'doctor';
    const finalDoc = isDocRole ? (user?.name || docName || 'Dr. Rajesh Rao') : (docName || 'Dr. Rajesh Rao');
    const rawPat = !isDocRole ? (user?.name || patName || 'Priya Sharma') : (patName || 'Priya Sharma');
    const finalPat = (rawPat || 'Priya Sharma').split('(')[0].trim();
    
    setActiveConsultData({ 
      id: consultId, 
      doctorName: finalDoc, 
      patientName: finalPat 
    });
    setIsVideoConsultOpen(true);

    // If initiated from doctor portal or doctor user, alert the patient across all four channels!
    if (isDocRole || (docName && docName.includes('Dr.'))) {
      const callPayload = {
        type: 'INCOMING_CALL',
        consultation_id: consultId || 'consult_01',
        consultationId: consultId || 'consult_01',
        doctor_name: finalDoc,
        doctorName: finalDoc,
        doctor_specialty: user?.specialization || 'Senior Cardiologist & General Physician',
        doctorSpecialty: user?.specialization || 'Senior Cardiologist & General Physician',
        patient_name: finalPat,
        patientName: finalPat,
        timestamp: Date.now(),
        t: Date.now()
      };

      console.log("[Doctor Calling] Broadcasting incoming call to patient:", callPayload);

      // 1. Write to localStorage to trigger instantaneous 'storage' event in all other browser tabs
      try {
        localStorage.setItem('sehat_active_call', JSON.stringify(callPayload));
      } catch (e) {}

      // 2. Notify backend REST API (registers in active_calls and broadcasts to websockets)
      api.startCall(callPayload).catch(err => {
        console.warn("api.startCall failed:", err);
      });

      // 3. Notify same-browser tabs via BroadcastChannel
      try {
        const ch = new BroadcastChannel('sehatsanketh_telehealth_global_signaling');
        ch.postMessage(callPayload);
        setTimeout(() => ch.close(), 1500);
      } catch (e) {}

      // 4. Send directly via global signaling WebSocket
      if (signalingWsRef.current && signalingWsRef.current.readyState === WebSocket.OPEN) {
        try {
          signalingWsRef.current.send(JSON.stringify({
            type: 'START_CALL',
            ...callPayload
          }));
        } catch (e) {}
      }
    }
  };

  // Render when unauthenticated: Category Portals & Separate Login Pages
  const renderUnauthenticatedContent = () => {
    switch (currentPortal) {
      case 'patient_login':
        return <CategoryLoginPage category="patient" onBack={() => setCurrentPortal('portal_gateway')} />;
      case 'doctor_login':
        return <CategoryLoginPage category="doctor" onBack={() => setCurrentPortal('portal_gateway')} />;
      case 'admin_login':
        return <CategoryLoginPage category="admin" onBack={() => setCurrentPortal('portal_gateway')} />;
      case 'portal_gateway':
      default:
        return <PortalGateway onSelectPortal={setCurrentPortal} />;
    }
  };

  // Render when authenticated: Isolated category dashboard
  const renderDashboard = () => {
    switch (role) {
      case 'doctor':
        return <DoctorDashboard onOpenVideoConsult={handleOpenVideoConsult} />;
      case 'admin':
        return <AdminDashboard />;
      case 'patient':
      default:
        return (
          <PatientDashboard
            onOpenAiTriage={handleOpenAiTriage}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
            onOpenVideoConsult={handleOpenVideoConsult}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FAF6] flex flex-col font-sans text-slate-900">
      
      {/* Global Navbar with isolated user status & safe logout */}
      <Navbar
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenAiTriage={() => handleOpenAiTriage()}
        isMobileFrame={isMobileFrame}
        setIsMobileFrame={setIsMobileFrame}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex justify-center py-6 px-4 sm:px-6">
        {!user ? (
          /* Unauthenticated: Dedicated Category Portals & Login Pages */
          <div className="w-full max-w-7xl animate-in fade-in duration-200">
            {renderUnauthenticatedContent()}
          </div>
        ) : isMobileFrame && role === 'patient' ? (
          /* Mobile Phone Mockup Frame (For Patient View) */
          <div className="w-full max-w-[420px] bg-white rounded-[44px] shadow-2xl border-[10px] border-slate-900 p-6 relative overflow-hidden flex flex-col min-h-[840px] animate-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-32 bg-slate-900 rounded-b-2xl z-30" />
            <div className="flex-1 overflow-y-auto pt-4 pb-20 scrollbar-none">
              {renderDashboard()}
            </div>
          </div>
        ) : (
          /* Full Responsive Isolated Role Dashboard */
          <div className="w-full max-w-7xl animate-in fade-in duration-150">
            {renderDashboard()}
          </div>
        )}
      </main>

      {/* Floating Bottom Nav (Only for Patient Dashboard) */}
      {user && role === 'patient' && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAiTriage={() => handleOpenAiTriage()}
        />
      )}

      {/* Modals */}
      <AiAssistantModal
        isOpen={isAiTriageOpen}
        initialPrompt={initialTriageText}
        onClose={() => {
          setIsAiTriageOpen(false);
          setInitialTriageText('');
        }}
        onBookDoctor={(specialty) => {
          setIsAiTriageOpen(false);
          setInitialTriageText('');
          setActiveTab('home');
        }}
        onTriggerEmergency={() => {
          setIsAiTriageOpen(false);
          setInitialTriageText('');
          setIsEmergencyOpen(true);
        }}
        onOpenVideoConsult={handleOpenVideoConsult}
      />

      <EmergencySosModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />

      {/* Real-time Incoming Video Call Alert for Patient */}
      <IncomingCallNotification
        callData={incomingCall}
        onAccept={() => {
          if (!incomingCall) return;
          const call = incomingCall;
          setIncomingCall(null);
          try {
            localStorage.removeItem('sehat_active_call');
          } catch (e) {}

          // If the patient is not logged in, activate the patient session
          if (!user || role !== 'patient') {
            const patientPersona = (personas && personas.find(p => p.role === 'patient')) || {
              id: 'p_01',
              role: 'patient',
              name: call.patientName || 'Priya Sharma',
              patientId: 'p_01',
              lang: 'kn'
            };
            if (loginProfile) loginProfile(patientPersona);
          }

          handleOpenVideoConsult(call.consultationId, call.doctorName, call.patientName);
        }}
        onDecline={() => {
          if (incomingCall) {
            api.declineCall(incomingCall.consultationId, user?.name || 'Priya Sharma').catch(() => {});
          }
          setIncomingCall(null);
          try {
            localStorage.removeItem('sehat_active_call');
          } catch (e) {}
          try {
            const channel = new BroadcastChannel('sehatsanketh_telehealth_global_signaling');
            channel.postMessage({ type: 'CALL_DECLINED' });
            setTimeout(() => channel.close(), 1500);
          } catch (e) {}
        }}
      />

      <VideoConsultationModal
        isOpen={isVideoConsultOpen}
        onClose={() => {
          setIsVideoConsultOpen(false);
          setActiveTab('home');
          try {
            localStorage.removeItem('sehat_active_call');
          } catch (e) {}
          api.endCall(activeConsultData.id, role || 'participant').catch(() => {});
          try {
            const channel = new BroadcastChannel('sehatsanketh_telehealth_global_signaling');
            channel.postMessage({ type: 'CALL_ENDED', by: role });
            setTimeout(() => channel.close(), 1500);
          } catch (e) {}
        }}
        consultationId={activeConsultData.id}
        doctorName={activeConsultData.doctorName}
        patientName={activeConsultData.patientName}
      />

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
