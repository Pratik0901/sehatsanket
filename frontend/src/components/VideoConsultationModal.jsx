import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Mic, MicOff, Video, VideoOff, PhoneOff, PhoneCall, PhoneIncoming, MessageSquare, 
  Sparkles, Globe, Volume2, VolumeX, Send, FileText, CheckCircle, RefreshCw, UserCheck,
  Languages, Play, RotateCcw, Activity, Maximize2, Minimize2, Grid, Layout,
  Sliders, ShieldCheck, HelpCircle, ChevronRight, MessageCircle, User,
  Microscope, FlaskConical, Building2, Gauge, Award, Plus, Trash2, CheckCircle2, Pill
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import { startListening, stopListening, speakText, cancelSpeech, isSpeechRecognitionSupported } from '../utils/speech';

export function VideoConsultationModal({ 
  isOpen, 
  onClose, 
  consultationId = "consult_01", 
  doctorName = "Dr. Rajesh Rao",
  patientName = "Priya Sharma"
}) {
  const { user, role } = useAuth();
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();

  // Distinct Doctor & Patient identity
  const isDoctorUser = role === 'doctor' || user?.role === 'doctor';
  const effectiveDoctorName = isDoctorUser ? (user?.name || doctorName) : doctorName;
  const effectivePatientName = !isDoctorUser ? (user?.name || patientName) : patientName;

  // Active speaking role in simulator (allows toggling during sandbox testing)
  const [activeSpeakerRole, setActiveSpeakerRole] = useState(isDoctorUser ? 'doctor' : 'patient');
  
  // Real Hardware Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isTtsActive, setIsTtsActive] = useState(true);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [layoutMode, setLayoutMode] = useState('grid'); // Default to Split Grid so both Doctor and Patient are always visible side-by-side
  const [isSwapped, setIsSwapped] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLayoutMode('grid'); // Ensure both Doctor & Patient are immediately visible side-by-side
      setIsSwapped(false);
      setActiveSpeakerRole(isDoctorUser ? 'doctor' : 'patient');
      if (isDoctorUser) {
        setIsPeerConnected(false);
        setHasRemotePeerStream(false);
      } else {
        setIsPeerConnected(true);
      }
    }
  }, [isOpen, consultationId, isDoctorUser]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCaptionsVisible, setIsCaptionsVisible] = useState(true);

  // Live Audio Level & Speaking Indicators
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [isPatientSpeaking, setIsPatientSpeaking] = useState(false);
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [audioPlayingTarget, setAudioPlayingTarget] = useState(null);

  // Language barrier configuration (Doctor: English/Hindi, Patient: Kannada/Tamil/Telugu/Hindi)
  const [doctorLanguage, setDoctorLanguage] = useState('en');
  const [patientLanguage, setPatientLanguage] = useState(() => {
    if (!isDoctorUser) {
      return user?.preferred_language || (currentLanguage && currentLanguage !== 'en' ? currentLanguage : (user?.name?.toLowerCase().includes('ramesh') ? 'kn' : 'hi'));
    }
    const pName = (patientName || '').toLowerCase();
    if (pName.includes('ramesh')) return 'kn';
    if (pName.includes('priya')) return 'hi';
    return (currentLanguage && currentLanguage !== 'en') ? currentLanguage : 'hi';
  });

  // Video & Stream Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);

  // WebRTC P2P Real-Time Video Stream Status
  const [hasRemotePeerStream, setHasRemotePeerStream] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [hasHardwareCamera, setHasHardwareCamera] = useState(false);
  const pendingIceCandidatesRef = useRef([]);
  const mySessionIdRef = useRef('client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
  const isNegotiatingRef = useRef(false);
  const isEndingCallRef = useRef(false);
  const captionTimeoutRef = useRef(null);

  // Active Live Subtitle Caption
  const [currentCaption, setCurrentCaption] = useState(null);

  // Real-Time Live Speaking & Transcription Tracking
  const [localLiveSpeech, setLocalLiveSpeech] = useState('');
  const [remoteLiveSpeech, setRemoteLiveSpeech] = useState(null);
  const speechRecognitionActiveRef = useRef(false);

  // Conversation history
  const [transcript, setTranscript] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // In-Call Doctor Prescription & Lab Ordering State
  const [isInCallRxOpen, setIsInCallRxOpen] = useState(false);
  const [inCallCatalogTests, setInCallCatalogTests] = useState([]);
  const [inCallSelectedTests, setInCallSelectedTests] = useState(['t_cbc', 't_lft']);
  const [inCallMeds, setInCallMeds] = useState([
    { name: "Paracetamol 650mg", dosage: "1 tab", frequency: "SOS after food" },
    { name: "Pantoprazole 40mg", dosage: "1 tab", frequency: "Once daily before breakfast" }
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [inCallNotes, setInCallNotes] = useState("Recommended blood tests to monitor liver recovery and infection markers.");
  const [isSubmittingInCallRx, setIsSubmittingInCallRx] = useState(false);
  const [inCallRxSuccess, setInCallRxSuccess] = useState(null);

  const handleOpenInCallRx = async () => {
    setIsInCallRxOpen(true);
    if (inCallCatalogTests.length === 0) {
      try {
        const cat = await api.getLabCatalog();
        setInCallCatalogTests(cat?.tests || cat || []);
      } catch (e) {
        console.warn("Catalog load failed", e);
      }
    }
  };

  const handleAddInCallMed = () => {
    if (!newMedName.trim()) return;
    setInCallMeds(prev => [...prev, { name: newMedName.trim(), dosage: newMedDosage.trim() || '1 dose', frequency: 'Twice daily' }]);
    setNewMedName('');
    setNewMedDosage('');
  };

  const handleRemoveInCallMed = (index) => {
    setInCallMeds(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleInCallTest = (id) => {
    setInCallSelectedTests(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSendInCallRx = async () => {
    if (inCallSelectedTests.length === 0 && inCallMeds.length === 0) {
      alert("Please select at least one medication or lab test.");
      return;
    }

    setIsSubmittingInCallRx(true);
    try {
      const selectedTestObjects = inCallCatalogTests
        .filter(t => inCallSelectedTests.includes(t.id))
        .map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          clinical_significance: t.clinical_significance
        }));

      const payload = {
        consultation_id: consultationId || "consult_01",
        patient_id: "p_01",
        doctor_id: user?.doctorId || user?.id || 'doc_05',
        doctor_name: effectiveDoctorName,
        medications: inCallMeds,
        remedies: [
          "Adequate hydration (2.5L daily)",
          "Rest and observe symptom changes",
          "Follow up once lab reports are generated"
        ],
        clinical_notes: inCallNotes,
        lab_tests: selectedTestObjects
      };

      await api.createPostConsultationOrder(payload);

      try {
        const chan = new BroadcastChannel('sehatsanketh_telehealth_global_signaling');
        chan.postMessage({
          type: 'LAB_ORDER_ISSUED',
          order_id: 'new_order',
          doctorName: effectiveDoctorName,
          patientName: effectivePatientName,
          testCount: selectedTestObjects.length
        });
        setTimeout(() => chan.close(), 1500);
      } catch (e) {}

      setInCallRxSuccess(`✓ Order Transmitted! Prescription & ${selectedTestObjects.length} Lab Tests sent to ${effectivePatientName}. Accredited laboratories ranked by precision are ready.`);
      setTimeout(() => {
        setInCallRxSuccess(null);
        setIsInCallRxOpen(false);
      }, 3000);
    } catch (err) {
      alert("Error sending prescription & lab order: " + err.message);
    } finally {
      setIsSubmittingInCallRx(false);
    }
  };

  // Synchronize with App Language Context
  useEffect(() => {
    if (currentLanguage && currentLanguage !== 'en') {
      setPatientLanguage(currentLanguage);
    }
  }, [currentLanguage]);

  // Open sidebar automatically on large screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Reset call termination guard and clear captions on modal open
  useEffect(() => {
    if (isOpen) {
      isEndingCallRef.current = false;
      setCurrentCaption(null);
      setTranscript([]);
    }
  }, [isOpen]);

  // Automatically fade out floating subtitle overlay after 16s of silence
  useEffect(() => {
    if (currentCaption) {
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => {
        setCurrentCaption(null);
      }, 16000);
    }
    return () => {
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    };
  }, [currentCaption]);

  // Scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Keep remote video and audio attached to stream
  useEffect(() => {
    const targetStream = remoteStreamRef.current || (hasHardwareCamera && isVideoOn ? localStreamRef.current : null);
    if (targetStream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== targetStream) {
        remoteVideoRef.current.srcObject = targetStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteStreamRef.current && remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [hasRemotePeerStream, isPeerConnected, hasCameraStream, hasHardwareCamera, isVideoOn]);

  // Keep local video attached to stream
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && hasHardwareCamera) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [hasCameraStream, hasHardwareCamera, isVideoOn]);

  // Immediate Call Termination and Hardware Clean-up
  const handleEndCall = useCallback(() => {
    if (isEndingCallRef.current) return;
    isEndingCallRef.current = true;

    cancelSpeech();
    stopListening();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'CALL_ENDED',
          consultationId,
          senderSessionId: mySessionIdRef.current,
          by: isDoctorUser ? 'doctor' : 'patient'
        }));
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    api.endCall(consultationId, isDoctorUser ? 'doctor' : 'patient').catch(() => {});

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'CALL_ENDED',
          senderSessionId: mySessionIdRef.current,
          by: isDoctorUser ? 'doctor' : 'patient'
        });
      } catch (e) {}
    }

    setHasRemotePeerStream(false);
    setIsPeerConnected(false);
    setHasCameraStream(false);
    setHasHardwareCamera(false);
    setIsDoctorSpeaking(false);
    setIsPatientSpeaking(false);
    setCurrentCaption(null);
    setTranscript([]);

    if (onClose) {
      onClose();
    }
  }, [onClose, isDoctorUser, consultationId]);

  // Signaling message dispatcher across BroadcastChannel & WebSocket
  const sendSignal = useCallback((data) => {
    const payload = {
      ...data,
      senderSessionId: mySessionIdRef.current,
      senderRole: isDoctorUser ? 'doctor' : 'patient',
      consultationId
    };
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(payload);
      } catch (e) {}
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(payload));
      } catch (e) {}
    }
  }, [isDoctorUser, consultationId]);

  // Synchronize language changes in real time across peers
  const handleLanguageChange = useCallback((targetRole, newLang) => {
    if (targetRole === 'doctor') {
      setDoctorLanguage(newLang);
    } else {
      setPatientLanguage(newLang);
    }
    sendSignal({
      type: 'LANGUAGE_UPDATE',
      doctorLanguage: targetRole === 'doctor' ? newLang : doctorLanguage,
      patientLanguage: targetRole === 'patient' ? newLang : patientLanguage
    });
  }, [doctorLanguage, patientLanguage, sendSignal]);

  // WebRTC RTCPeerConnection initialization
  const initPeerConnection = useCallback(() => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    pcRef.current = pc;
    pendingIceCandidatesRef.current = [];

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch (e) {}
      });
    }

    pc.ontrack = (event) => {
      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        remoteStreamRef.current = stream;
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!stream.getTracks().some(t => t.id === track.id)) {
            stream.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!stream.getTracks().some(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
      }

      setHasRemotePeerStream(true);
      setIsPeerConnected(true);

      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== stream) {
          remoteAudioRef.current.srcObject = stream;
        }
        remoteAudioRef.current.play().catch(() => {});
      }

      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'WEBRTC_ICE_CANDIDATE',
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsPeerConnected(true);
        setHasRemotePeerStream(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsPeerConnected(false);
      }
    };

    return pc;
  }, [sendSignal]);

  const drainPendingIceCandidates = useCallback((pc) => {
    if (pendingIceCandidatesRef.current && pendingIceCandidatesRef.current.length > 0) {
      for (const cand of pendingIceCandidatesRef.current) {
        try {
          pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {}
      }
      pendingIceCandidatesRef.current = [];
    }
  }, []);

  const attachTracksToPeer = useCallback((stream) => {
    if (!stream) return;
    const pc = pcRef.current || initPeerConnection();
    const senders = pc.getSenders();
    stream.getTracks().forEach(track => {
      const existingSender = senders.find(s => s.track && s.track.kind === track.kind);
      if (existingSender) {
        existingSender.replaceTrack(track).catch(() => {});
      } else {
        try {
          pc.addTrack(track, stream);
        } catch (err) {}
      }
    });
  }, [initPeerConnection]);

  const makeOffer = useCallback(async () => {
    if (!isDoctorUser) return;
    const pc = pcRef.current || initPeerConnection();
    if (isNegotiatingRef.current) return;

    try {
      isNegotiatingRef.current = true;
      if (pc.signalingState !== 'stable') {
        isNegotiatingRef.current = false;
        return;
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      sendSignal({
        type: 'WEBRTC_OFFER',
        sdp: offer
      });
    } catch (err) {
      console.warn("[WebRTC] Error in makeOffer:", err);
    } finally {
      isNegotiatingRef.current = false;
    }
  }, [isDoctorUser, initPeerConnection, sendSignal]);

  const handleOffer = useCallback(async (offerSdp) => {
    if (isDoctorUser) return;
    const pc = pcRef.current || initPeerConnection();
    try {
      if (pc.signalingState !== 'stable') {
        await Promise.all([
          pc.setLocalDescription({ type: 'rollback' }).catch(() => {})
        ]);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      drainPendingIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({
        type: 'WEBRTC_ANSWER',
        sdp: answer
      });
    } catch (err) {
      console.error("[WebRTC] Error handling offer:", err);
    }
  }, [isDoctorUser, initPeerConnection, sendSignal, drainPendingIceCandidates]);

  const handleAnswer = useCallback(async (answerSdp) => {
    if (!isDoctorUser) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
        drainPendingIceCandidates(pc);
      }
    } catch (err) {
      console.error("[WebRTC] Error handling answer:", err);
    }
  }, [isDoctorUser, drainPendingIceCandidates]);

  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {}
  }, []);

  // Real-Time Cross-Tab / Cross-Window Synchronization
  useEffect(() => {
    if (!isOpen) return;

    let ws = null;
    let channel = null;

    initPeerConnection();

    const handleIncomingSignal = async (data) => {
      if (!data) return;
      if (data.senderSessionId === mySessionIdRef.current) return;
      if (data.senderRole === (isDoctorUser ? 'doctor' : 'patient')) return;

      if (data.type === 'PEER_JOINED' || data.type === 'CALL_ACCEPTED') {
        setIsPeerConnected(true);
        if (isDoctorUser) makeOffer();
        else sendSignal({ type: 'PEER_READY' });
      } else if (data.type === 'PEER_READY') {
        setIsPeerConnected(true);
        if (isDoctorUser) makeOffer();
      } else if (data.type === 'WEBRTC_OFFER') {
        setIsPeerConnected(true);
        if (!isDoctorUser && data.sdp) handleOffer(data.sdp);
      } else if (data.type === 'WEBRTC_ANSWER') {
        setIsPeerConnected(true);
        if (isDoctorUser && data.sdp) handleAnswer(data.sdp);
      } else if (data.type === 'WEBRTC_ICE_CANDIDATE') {
        if (data.candidate) handleIceCandidate(data.candidate);
      } else if (data.type === 'CALL_ENDED' || data.type === 'CALL_DECLINED') {
        handleEndCall();
      } else if (data.type === 'LANGUAGE_UPDATE') {
        if (data.doctorLanguage) setDoctorLanguage(data.doctorLanguage);
        if (data.patientLanguage) setPatientLanguage(data.patientLanguage);
      } else if (data.type === 'SPEECH_ACTIVITY') {
        const isPeerDoc = data.role ? data.role === 'doctor' : (data.senderRole === 'doctor');
        if (isPeerDoc) setIsDoctorSpeaking(!!data.isSpeaking);
        else setIsPatientSpeaking(!!data.isSpeaking);

        if (data.interimText && data.interimText.trim()) {
          setRemoteLiveSpeech({
            role: data.role || data.senderRole,
            text: data.interimText.trim()
          });
        } else if (!data.isSpeaking) {
          setRemoteLiveSpeech(null);
        }
      } else if (data.type === 'NEW_SPEECH_TURN') {
        setRemoteLiveSpeech(null);
        const msg = data.message;
        if (!msg) return;
        const origText = (msg.original || '').trim();
        const transText = (msg.translated || '').trim();
        if (!origText && !transText) return;

        setTranscript(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (data.caption) {
          setCurrentCaption(data.caption);
        }

        if (msg.role === 'doctor') {
          setIsDoctorSpeaking(true);
        } else {
          setIsPatientSpeaking(true);
        }

        // Automatic audio playback in listener's native language
        const isSender = data.message.role === (isDoctorUser ? 'doctor' : 'patient');
        if (!isSender && isTtsActive && data.audioToPlay) {
          setAudioPlayingTarget(data.caption?.targetPerson || 'Listener');
          speakText(data.audioToPlay.text, data.audioToPlay.lang, data.audioToPlay.b64)
            .finally(() => {
              setAudioPlayingTarget(null);
              setIsDoctorSpeaking(false);
              setIsPatientSpeaking(false);
            });
        } else {
          setTimeout(() => {
            setIsDoctorSpeaking(false);
            setIsPatientSpeaking(false);
          }, 3500);
        }
      }
    };

    try {
      channel = new BroadcastChannel(`sehatsanketh_call_${consultationId}`);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => handleIncomingSignal(event.data);
    } catch (e) {}

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/consultation/${consultationId}/stream`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          handleIncomingSignal(parsed);
        } catch (e) {}
      };

      ws.onopen = () => {
        sendSignal({ type: 'PEER_JOINED' });
      };
    } catch (wsErr) {}

    sendSignal({ type: 'PEER_JOINED' });

    const heartbeatTimer = setInterval(() => {
      if (!isPeerConnected && !hasRemotePeerStream) {
        if (isDoctorUser) makeOffer();
        else sendSignal({ type: 'PEER_READY' });
      }
    }, 2500);

    return () => {
      clearInterval(heartbeatTimer);
      if (channel) {
        channel.close();
        broadcastChannelRef.current = null;
      }
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, consultationId, isDoctorUser, isTtsActive, initPeerConnection, makeOffer, handleOffer, handleAnswer, handleIceCandidate, handleEndCall, sendSignal, isPeerConnected, hasRemotePeerStream]);

  // Call duration timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const createSilentAudioTrack = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const track = dst.stream.getAudioTracks()[0];
        track.enabled = false;
        return track;
      }
    } catch (e) {}
    return null;
  };

  // Camera & Mic Access
  const requestCameraAccess = useCallback(async () => {
    let stream = null;
    let acquiredHardware = false;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: true
          });
          acquiredHardware = true;
        } catch (err1) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            acquiredHardware = true;
          } catch (err2) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
              acquiredHardware = true;
            } catch (err3) {}
          }
        }
      }
    } catch (e) {}

    if (!acquiredHardware || !stream) {
      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream = micStream;
      } catch (e) {
        const silentAudio = createSilentAudioTrack();
        if (silentAudio) {
          stream = new MediaStream([silentAudio]);
        }
      }
    }

    if (stream) {
      localStreamRef.current = stream;
      setHasCameraStream(true);
      setHasHardwareCamera(acquiredHardware);
      setIsVideoOn(true);
      setIsMicOn(true);

      if (localVideoRef.current && acquiredHardware) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current && acquiredHardware && !remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }

      attachTracksToPeer(stream);

      try {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const audioOnlyStream = new MediaStream([audioTracks[0]]);
            const source = ctx.createMediaStreamSource(audioOnlyStream);
            source.connect(analyser);

            const pcmData = new Uint8Array(analyser.frequencyBinCount);

            const checkAudioLevel = () => {
              if (!analyserRef.current) return;
              analyser.getByteFrequencyData(pcmData);
              let sum = 0;
              for (let i = 0; i < pcmData.length; i++) sum += pcmData[i];
              const avg = sum / pcmData.length;
              const normalized = Math.min(100, Math.round((avg / 128) * 100));
              setLocalAudioLevel(normalized);

              const isSpeaking = normalized > 18;
              if (activeSpeakerRole === 'doctor') {
                setIsDoctorSpeaking(isSpeaking);
              } else {
                setIsPatientSpeaking(isSpeaking);
              }

              animFrameRef.current = requestAnimationFrame(checkAudioLevel);
            };

            checkAudioLevel();
          }
        }
      } catch (e) {}

      if (isDoctorUser) {
        setTimeout(() => makeOffer(), 300);
      } else {
        sendSignal({ type: 'PEER_READY' });
      }
    }
  }, [isDoctorUser, activeSpeakerRole, attachTracksToPeer, makeOffer, sendSignal]);

  useEffect(() => {
    if (!isOpen) return;
    requestCameraAccess();
  }, [isOpen, requestCameraAccess]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleEndCall();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleEndCall]);

  const handleToggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }
    if (!newState) {
      stopContinuousSpeech();
    } else {
      setTimeout(() => startContinuousSpeech(), 250);
    }
  };

  const handleToggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // CORE ENGINE: TURN-BASED BILINGUAL TRANSLATION, SUBTITLES & AUDIO OUTPUT
  // ═════════════════════════════════════════════════════════════════════════
  const handleCompleteTurn = useCallback(async (customText = null, customRole = null) => {
    const textToSend = (customText !== null && customText !== undefined ? customText : inputText).trim();
    if (!textToSend || isTranslating) return;

    setInputText('');
    setLocalLiveSpeech('');
    setIsTranslating(true);

    const speakingRole = customRole || activeSpeakerRole;
    const isDocTurn = speakingRole === 'doctor';
    
    // Directional Language Mapping
    // When Doctor speaks: Source = Doctor Lang (e.g. en), Target = Patient Lang (e.g. kn, ta, te, hi)
    // When Patient speaks: Source = Patient Lang (e.g. kn, ta, te, hi), Target = Doctor Lang (e.g. en)
    let sourceLang = isDocTurn ? doctorLanguage : patientLanguage;
    let targetLang = isDocTurn ? patientLanguage : doctorLanguage;
    const senderName = isDocTurn ? effectiveDoctorName : effectivePatientName;
    const targetPerson = isDocTurn ? effectivePatientName : effectiveDoctorName;

    if (sourceLang === targetLang) {
      targetLang = sourceLang === 'en' ? (patientLanguage !== 'en' ? patientLanguage : 'hi') : 'en';
    }

    if (isDocTurn) {
      setIsDoctorSpeaking(true);
    } else {
      setIsPatientSpeaking(true);
    }

    try {
      const res = await api.postConsultationMessage(consultationId, {
        sender_role: speakingRole,
        text: textToSend,
        source_language: sourceLang,
        target_language: targetLang
      });

      const entry = res.message_entry || {
        speaker: senderName,
        original_text: textToSend,
        translated_text: textToSend,
        audio_base64: null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const newMsg = {
        id: Date.now(),
        speaker: senderName,
        role: speakingRole,
        sourceLang,
        targetLang,
        original: entry.original_text,
        translated: entry.translated_text,
        audioBase64: res.audio_base64 || entry.audio_base64 || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setTranscript(prev => [...prev, newMsg]);

      // Subtitle generated in the opposite person's language
      const newCaption = {
        speakerName: senderName,
        speakerRole: speakingRole,
        sourceLang,
        targetLang,
        targetPerson,
        original: newMsg.original,
        translated: newMsg.translated,
        audioBase64: newMsg.audioBase64
      };
      setCurrentCaption(newCaption);

      const turnPayload = {
        type: 'NEW_SPEECH_TURN',
        message: newMsg,
        caption: newCaption,
        audioToPlay: isTtsActive ? {
          text: newMsg.translated,
          lang: targetLang,
          b64: newMsg.audioBase64
        } : null
      };

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(turnPayload);
        } catch (e) {}
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(turnPayload));
        } catch (e) {}
      }

      // Automatic Audio Speech Synthesis Playback in Target Language
      if (isTtsActive) {
        setAudioPlayingTarget(targetPerson);
        try {
          await speakText(newMsg.translated, targetLang, newMsg.audioBase64);
        } catch (audioErr) {
          console.warn("Audio playback note:", audioErr);
        } finally {
          setAudioPlayingTarget(null);
          setIsDoctorSpeaking(false);
          setIsPatientSpeaking(false);
        }
      } else {
        setTimeout(() => {
          setIsDoctorSpeaking(false);
          setIsPatientSpeaking(false);
        }, 3000);
      }

    } catch (err) {
      console.warn("Translation failed, using fallback:", err);
      const fallbackEntry = {
        id: Date.now(),
        speaker: senderName,
        role: speakingRole,
        sourceLang,
        targetLang,
        original: textToSend,
        translated: textToSend,
        audioBase64: null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setTranscript(prev => [...prev, fallbackEntry]);
      setCurrentCaption({
        speakerName: senderName,
        speakerRole: speakingRole,
        sourceLang,
        targetLang,
        targetPerson,
        original: textToSend,
        translated: textToSend,
        audioBase64: null
      });
      setIsDoctorSpeaking(false);
      setIsPatientSpeaking(false);
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, isTranslating, activeSpeakerRole, doctorLanguage, patientLanguage, effectiveDoctorName, effectivePatientName, consultationId, isTtsActive]);

  // Replay speech audio of any translated message
  const handleReplayAudio = async (text, lang, audioB64 = null, targetPerson = "Participant") => {
    setAudioPlayingTarget(targetPerson);
    try {
      await speakText(text, lang, audioB64);
    } catch (e) {
      console.warn("Replay error:", e);
    } finally {
      setAudioPlayingTarget(null);
    }
  };

  // Continuous Speech Recognition with Silence/Pause Detection
  const startContinuousSpeech = useCallback(() => {
    if (!isSpeechRecognitionSupported() || !isMicOn) return;
    if (speechRecognitionActiveRef.current) return;

    speechRecognitionActiveRef.current = true;
    setIsListeningSpeech(true);

    const activeLang = activeSpeakerRole === 'doctor' ? doctorLanguage : patientLanguage;

    startListening({
      lang: activeLang,
      continuous: true,
      autoRestart: true,
      silenceThresholdMs: 1200,
      onResult: (transcriptText, isFinal) => {
        const cleanText = (typeof transcriptText === 'string' ? transcriptText : '').trim();
        if (isFinal) {
          setLocalLiveSpeech('');
          sendSignal({
            type: 'SPEECH_ACTIVITY',
            isSpeaking: false,
            interimText: ''
          });
          if (cleanText) {
            handleCompleteTurn(cleanText);
          }
        } else {
          setLocalLiveSpeech(cleanText);
          if (cleanText) {
            sendSignal({
              type: 'SPEECH_ACTIVITY',
              isSpeaking: true,
              interimText: cleanText
            });
            if (activeSpeakerRole === 'doctor') {
              setIsDoctorSpeaking(true);
            } else {
              setIsPatientSpeaking(true);
            }
          }
        }
      },
      onError: (err) => {
        console.warn("[Speech] Recognition note:", err);
      },
      onEnd: () => {
        setLocalLiveSpeech('');
      }
    });
  }, [isMicOn, activeSpeakerRole, doctorLanguage, patientLanguage, sendSignal, handleCompleteTurn]);

  const stopContinuousSpeech = useCallback(() => {
    speechRecognitionActiveRef.current = false;
    setIsListeningSpeech(false);
    setLocalLiveSpeech('');
    stopListening();
    sendSignal({
      type: 'SPEECH_ACTIVITY',
      isSpeaking: false,
      interimText: ''
    });
  }, [sendSignal]);

  useEffect(() => {
    if (isOpen && isMicOn) {
      const t = setTimeout(() => {
        startContinuousSpeech();
      }, 700);
      return () => {
        clearTimeout(t);
        stopContinuousSpeech();
      };
    } else {
      stopContinuousSpeech();
    }
  }, [isOpen, isMicOn, startContinuousSpeech, stopContinuousSpeech]);

  const handleToggleMicSpeech = () => {
    if (!isSpeechRecognitionSupported()) {
      alert("Speech recognition is not supported in this browser. Please use text input or quick dialogue presets.");
      return;
    }

    if (isListeningSpeech) {
      stopContinuousSpeech();
    } else {
      startContinuousSpeech();
    }
  };

  const getLangName = (code) => {
    const map = { en: 'English', hi: 'Hindi', kn: 'Kannada', ta: 'Tamil', te: 'Telugu' };
    return map[code] || code.toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none">
      
      {/* Real WebRTC Remote Audio Player */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* TOP HEADER */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 z-20">
        
        {/* Left: Call Status & Connection Line */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-800 text-[11px] font-black text-emerald-400 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{formatDuration(callDuration)}</span>
          </div>

          <div className="truncate">
            <h1 className="text-xs sm:text-sm font-black text-slate-100 truncate flex items-center gap-1.5">
              <span className="text-blue-400">{effectiveDoctorName}</span>
              <span className="text-slate-500 font-normal">⟷</span>
              <span className="text-emerald-400">{effectivePatientName}</span>
              {hasRemotePeerStream && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 text-[10px] font-black flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>LIVE P2P</span>
                </span>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 hidden md:block">
              Real-Time Bilingual Video Call • Instant Voice & Subtitles
            </p>
          </div>
        </div>

        {/* Center: Language Barrier Selectors */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-bold shadow-xs">
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-blue-300 text-[11px]">Dr:</span>
            <select
              value={doctorLanguage}
              onChange={(e) => handleLanguageChange('doctor', e.target.value)}
              className="bg-slate-900 text-blue-200 text-xs font-semibold rounded-lg px-2 py-0.5 border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              title="Doctor's spoken language"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
          <span className="text-slate-400 text-xs">⇄</span>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-300 text-[11px]">Patient:</span>
            <select
              value={patientLanguage}
              onChange={(e) => handleLanguageChange('patient', e.target.value)}
              className="bg-slate-900 text-emerald-200 text-xs font-semibold rounded-lg px-2 py-0.5 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              title="Patient's spoken language"
            >
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* User Profile Badge */}
          <div className="flex items-center">
            {isDoctorUser ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-700 text-blue-300 text-xs font-black shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>👨‍⚕️ {effectiveDoctorName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-black shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>👤 {effectivePatientName}</span>
              </div>
            )}
          </div>

          {/* Doctor Quick Action: Prescribe & Order Labs */}
          {isDoctorUser && (
            <button
              onClick={handleOpenInCallRx}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              title="Issue Prescription & Recommend Diagnostic Labs"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prescribe & Labs</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs shadow-md shadow-red-600/20 transition cursor-pointer"
            title="End Consultation Call (Esc)"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </header>

      {/* MAIN CALL AREA: Video Stage + Collapsible Transcript Drawer */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden bg-black/90">
        
        {/* VIDEO STAGE */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden p-2 sm:p-4">
          
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            
            {/* STAGE CONTAINER: FaceTime PiP or Split Grid */}
            <div className={`w-full h-full ${layoutMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 max-h-full' : 'relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border border-slate-800'}`}>
              
              {/* Floating Layout Toggle */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
                <button
                  onClick={() => setLayoutMode(layoutMode === 'pip' ? 'grid' : 'pip')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800/95 backdrop-blur-md border border-slate-700/80 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition active:scale-95 cursor-pointer"
                >
                  {layoutMode === 'pip' ? (
                    <>
                      <Grid className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Split Grid</span>
                    </>
                  ) : (
                    <>
                      <Layout className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">FaceTime PiP</span>
                    </>
                  )}
                </button>
              </div>

              {/* 1. DOCTOR VIDEO TILE */}
              {(() => {
                const isDoctorMain = layoutMode === 'pip' && (isDoctorUser ? isSwapped : !isSwapped);
                const isDoctorPip = layoutMode === 'pip' && !isDoctorMain;

                const tileClass = layoutMode === 'grid'
                  ? `relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all flex items-center justify-center ${
                      isDoctorUser ? 'order-2' : 'order-1'
                    } ${
                      isDoctorSpeaking ? 'border-blue-500 shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/30' : 'border-slate-800'
                    }`
                  : isDoctorMain
                  ? `absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950 flex items-center justify-center border-0 ${
                      isDoctorSpeaking ? 'ring-4 ring-blue-500/40 ring-inset' : ''
                    }`
                  : `absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-36 sm:w-56 md:w-64 aspect-[4/3] rounded-2xl sm:rounded-3xl shadow-2xl border-2 z-20 cursor-pointer overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 group flex items-center justify-center bg-slate-900 ${
                      isDoctorSpeaking ? 'border-blue-400 ring-4 ring-blue-500/50' : 'border-white/30'
                    }`;

                return (
                  <div 
                    onClick={isDoctorPip ? () => setIsSwapped(!isSwapped) : undefined}
                    className={tileClass}
                  >
                    {isDoctorUser ? (
                      <>
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10 ${
                            hasHardwareCamera && isVideoOn ? 'block' : 'hidden'
                          }`}
                        />
                        {(!hasHardwareCamera || !isVideoOn) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 z-0 select-none">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                              <VideoOff className="w-8 h-8 text-slate-500" />
                            </div>
                            <div className="text-center px-4">
                              <p className="text-xs font-bold text-slate-300">Camera Feed Off</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Turn on camera to show live video</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className={`absolute inset-0 w-full h-full object-cover z-10 ${
                            isVideoOn ? 'block' : 'hidden'
                          }`}
                        />
                        {!isVideoOn && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 z-0 select-none">
                            <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-900/50 flex items-center justify-center text-blue-400 shadow-inner animate-pulse">
                              <VideoOff className="w-8 h-8 text-blue-400" />
                            </div>
                            <div className="text-center px-4">
                              <p className="text-xs font-bold text-blue-200">Doctor's Live Camera</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Camera is turned off</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {isDoctorPip && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 pointer-events-none">
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-slate-900/90 px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-lg">
                          <RotateCcw className="w-3 h-3 text-cyan-400" /> Tap to swap
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 z-20">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-blue-200">
                        {isDoctorUser ? `You (${effectiveDoctorName})` : `${effectiveDoctorName} (Doctor)`}
                      </span>
                      <span className="text-[10px] text-blue-300 font-extrabold uppercase">
                        ({getLangName(doctorLanguage)})
                      </span>
                    </div>

                    {isDoctorSpeaking && (
                      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] font-black flex items-center gap-1.5 shadow-md animate-pulse z-20">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Speaking in {getLangName(doctorLanguage)}...</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. PATIENT VIDEO TILE */}
              {(() => {
                const isPatientMain = layoutMode === 'pip' && (isDoctorUser ? !isSwapped : isSwapped);
                const isPatientPip = layoutMode === 'pip' && !isPatientMain;

                const tileClass = layoutMode === 'grid'
                  ? `relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all flex items-center justify-center ${
                      isDoctorUser ? 'order-1' : 'order-2'
                    } ${
                      isPatientSpeaking ? 'border-emerald-500 shadow-xl shadow-emerald-500/30 ring-4 ring-emerald-500/30' : 'border-slate-800'
                    }`
                  : isPatientMain
                  ? `absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950 flex items-center justify-center border-0 ${
                      isPatientSpeaking ? 'ring-4 ring-emerald-500/40 ring-inset' : ''
                    }`
                  : `absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-36 sm:w-56 md:w-64 aspect-[4/3] rounded-2xl sm:rounded-3xl shadow-2xl border-2 z-20 cursor-pointer overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 group flex items-center justify-center bg-slate-900 ${
                      isPatientSpeaking ? 'border-emerald-400 ring-4 ring-emerald-500/50' : 'border-white/30'
                    }`;

                return (
                  <div 
                    onClick={isPatientPip ? () => setIsSwapped(!isSwapped) : undefined}
                    className={tileClass}
                  >
                    {!isDoctorUser ? (
                      <>
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10 ${
                            hasHardwareCamera && isVideoOn ? 'block' : 'hidden'
                          }`}
                        />
                        {(!hasHardwareCamera || !isVideoOn) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 z-0 select-none">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                              <VideoOff className="w-8 h-8 text-slate-500" />
                            </div>
                            <div className="text-center px-4">
                              <p className="text-xs font-bold text-slate-300">Camera Feed Off</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Turn on camera to show live video</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {(!isPeerConnected && !hasRemotePeerStream) ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-slate-300 gap-4 p-6 text-center select-none z-20">
                            <div className="relative flex items-center justify-center">
                              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 animate-ping absolute inset-0" />
                              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl relative z-10">
                                <PhoneCall className="w-9 h-9 text-emerald-400 animate-bounce" />
                              </div>
                            </div>
                            <div className="space-y-1.5 max-w-xs">
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Calling Patient...
                              </div>
                              <p className="text-base font-extrabold text-white">{effectivePatientName}</p>
                              <p className="text-xs text-slate-400">Ringing patient device... Video will start once the patient accepts the call.</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={remoteVideoRef}
                              autoPlay
                              playsInline
                              className={`absolute inset-0 w-full h-full object-cover z-10 ${
                                isVideoOn ? 'block' : 'hidden'
                              }`}
                            />
                            {!isVideoOn && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 z-0 select-none">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center text-emerald-400 shadow-inner animate-pulse">
                                  <VideoOff className="w-8 h-8 text-emerald-400" />
                                </div>
                                <div className="text-center px-4">
                                  <p className="text-xs font-bold text-emerald-200">Patient's Live Camera</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Camera is turned off</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {isPatientPip && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 pointer-events-none">
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-slate-900/90 px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-lg">
                          <RotateCcw className="w-3 h-3 text-cyan-400" /> Tap to swap
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 z-20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-200">
                        {!isDoctorUser ? `You (${effectivePatientName})` : `${effectivePatientName} (Patient)`}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-extrabold uppercase">
                        ({getLangName(patientLanguage)})
                      </span>

                      {isMicOn && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <div 
                            className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                            style={{ height: `${Math.max(4, (localAudioLevel / 100) * 14)}px` }}
                          />
                          <div 
                            className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                            style={{ height: `${Math.max(6, (localAudioLevel / 100) * 18)}px` }}
                          />
                        </div>
                      )}
                    </div>

                    {isPatientSpeaking && (
                      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[10px] font-black flex items-center gap-1.5 shadow-md animate-pulse z-20">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Speaking in {getLangName(patientLanguage)}...</span>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* LIVE SPEECH INTERIM INDICATOR (While speaking) */}
            {localLiveSpeech && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-lg w-[90%] bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl px-4 py-2 text-center shadow-2xl animate-pulse">
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center justify-center gap-1">
                  <Mic className="w-3 h-3 animate-bounce" /> Transcribing Live Voice ({getLangName(activeSpeakerRole === 'doctor' ? doctorLanguage : patientLanguage)})...
                </span>
                <p className="text-xs font-semibold text-slate-100 italic mt-0.5">
                  "{localLiveSpeech}"
                </p>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* FLOATING REAL-TIME TRANSLATED SUBTITLES (OPPOSITE PERSON'S LANGUAGE) */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {isCaptionsVisible && currentCaption && ((currentCaption.original || '').trim() || (currentCaption.translated || '').trim()) && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-xl w-[94%] bg-slate-950/92 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                
                {/* Subtitle Header / Direction Badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      currentCaption.speakerRole === 'doctor' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {currentCaption.speakerName} ({getLangName(currentCaption.sourceLang)})
                    </span>
                    <span className="text-cyan-400 font-black">⟶</span>
                    <span className="text-cyan-300 text-[10px] font-black uppercase tracking-wider truncate">
                      Subtitles for {currentCaption.targetPerson} ({getLangName(currentCaption.targetLang)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {audioPlayingTarget && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Playing Audio
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReplayAudio(
                        currentCaption.translated,
                        currentCaption.targetLang,
                        currentCaption.audioBase64,
                        currentCaption.targetPerson
                      )}
                      className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-[10px] font-black transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Listen to translated audio output again"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                      <span>Replay Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentCaption(null)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Dismiss Subtitles"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary: Translated Subtitle in Listener's Native Language */}
                {currentCaption.translated && currentCaption.translated.trim() && (
                  <div className="bg-cyan-950/40 rounded-xl p-2.5 border border-cyan-500/30">
                    <p className="text-sm sm:text-base font-black text-cyan-100 leading-relaxed tracking-wide">
                      "{currentCaption.translated.trim()}"
                    </p>
                  </div>
                )}

                {/* Secondary: Original Spoken Utterance */}
                {currentCaption.original && currentCaption.original.trim() && currentCaption.original.trim() !== (currentCaption.translated || '').trim() && (
                  <p className="text-[11px] sm:text-xs text-slate-300 font-medium italic">
                    Original: "{currentCaption.original.trim()}"
                  </p>
                )}
              </div>
            )}

          </div>

        </div>

        {/* COLLAPSIBLE SIDEBAR: Bilingual Transcript & Quick Dialogue Presets */}
        {isSidebarOpen && (
          <aside className="w-full lg:w-88 xl:w-96 flex-shrink-0 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between h-72 lg:h-full z-10">
            
            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="font-extrabold text-xs text-slate-200">
                  Live Bilingual Transcript & Audio
                </h3>
              </div>
              
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition lg:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transcript Messages Feed */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 text-xs">
              {(() => {
                const validTranscript = transcript.filter(
                  msg => (msg.original && msg.original.trim()) || (msg.translated && msg.translated.trim())
                );
                if (validTranscript.length === 0) {
                  return (
                    <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-5 text-slate-500 space-y-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 shadow-inner">
                        <MessageSquare className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">No conversation turns yet</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
                          Live subtitles and translated voice audio will automatically generate here once either participant speaks.
                        </p>
                      </div>
                    </div>
                  );
                }
                return validTranscript.map((msg) => {
                  const isDoc = msg.role === 'doctor';
                  const origText = (msg.original || '').trim();
                  const transText = (msg.translated || '').trim();
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl border space-y-1.5 transition ${
                        isDoc ? 'bg-blue-950/40 border-blue-900/60' : 'bg-emerald-950/40 border-emerald-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span className={isDoc ? 'text-blue-400 font-black' : 'text-emerald-400 font-black'}>
                          {msg.speaker} ({getLangName(msg.sourceLang)})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span>{msg.time}</span>
                          {transText && (
                            <button
                              onClick={() => handleReplayAudio(transText, msg.targetLang, msg.audioBase64, msg.speaker)}
                              className="text-cyan-400 hover:text-white transition p-0.5 cursor-pointer"
                              title="Play translated speech"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {origText && (
                        <p className="text-slate-300 font-medium leading-relaxed text-[11px]">
                          "{origText}"
                        </p>
                      )}

                      {transText && (
                        <div className="pt-1 border-t border-slate-800/60 flex items-start gap-1">
                          <span className="text-cyan-400 font-black text-[10px]">↳</span>
                          <p className="text-white font-bold text-[11px] leading-relaxed">
                            "{transText}" ({getLangName(msg.targetLang)})
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              <div ref={transcriptEndRef} />
            </div>

            {/* Quick Dialogue Presets & Free Speech Input */}
            <div className="p-2.5 border-t border-slate-800 space-y-2 flex-shrink-0 bg-slate-900">
              
              {/* Speaker Role Selector for Sandbox Testing */}
              <div className="flex items-center justify-between gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveSpeakerRole('doctor')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                    activeSpeakerRole === 'doctor' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👨‍⚕️ Speak as Doctor ({getLangName(doctorLanguage)})
                </button>
                <button
                  onClick={() => setActiveSpeakerRole('patient')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                    activeSpeakerRole === 'patient' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👤 Speak as Patient ({getLangName(patientLanguage)})
                </button>
              </div>

              {/* Dynamic Quick Presets adapted to current active role */}
              <div className="space-y-1">
                {activeSpeakerRole === 'doctor' ? (
                  <>
                    <button
                      onClick={() => handleCompleteTurn(`Hello ${effectivePatientName}! Can you describe what symptoms you are experiencing today?`, 'doctor')}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition truncate cursor-pointer"
                    >
                      "Hello! What symptoms are you experiencing today?"
                    </button>
                    <button
                      onClick={() => handleCompleteTurn("Please take this medication twice daily with warm water.", 'doctor')}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition truncate cursor-pointer"
                    >
                      "Please take this medication twice daily with warm water."
                    </button>
                    <button
                      onClick={() => handleCompleteTurn("I recommend getting a complete blood count test done today.", 'doctor')}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition truncate cursor-pointer"
                    >
                      "I recommend getting a blood count test done today."
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleCompleteTurn(
                        patientLanguage === 'kn' ? "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ತೀವ್ರ ತಲೆನೋವು ಮತ್ತು ಜ್ವರವಿದೆ ಡಾಕ್ಟರೇ." :
                        patientLanguage === 'ta' ? "எனக்கு இரண்டு நாட்களாக கடுமையான தலைவலியும் காய்ச்சலும் உள்ளது." :
                        patientLanguage === 'te' ? "నాకు రెండు రోజులుగా తీవ్రమైన తలనొప్పి మరియు జ్వరం ఉంది." :
                        "मुझे दो दिनों से तेज सिरदर्द और बुखार है डॉक्टर।",
                        'patient'
                      )}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-semibold border border-slate-700 transition truncate cursor-pointer"
                    >
                      {patientLanguage === 'kn' ? '"ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ತಲೆನೋವು ಮತ್ತು ಜ್ವರವಿದೆ ಡಾಕ್ಟರೇ."' :
                       patientLanguage === 'ta' ? '"எனக்கு இரண்டு நாட்களாக தலைவலி மற்றும் காய்ச்சல் உள்ளது."' :
                       patientLanguage === 'te' ? '"నాకు రెండు రోజులుగా తలనొప్పి మరియు జ్వరం ఉంది."' :
                       '"मुझे दो दिनों से सिरदर्द और बुखार है डॉक्टर।"'}
                    </button>
                    <button
                      onClick={() => handleCompleteTurn(
                        patientLanguage === 'kn' ? "ನಾನು ಯಾವಾಗ ಈ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬೇಕು?" :
                        patientLanguage === 'ta' ? "நான் எப்போது இந்த மருந்துகளை எடுத்துக்கொள்ள வேண்டும்?" :
                        patientLanguage === 'te' ? "నేను ఎప్పుడు ఈ మందులు తీసుకోవాలి?" :
                        "मुझे यह दवाइयां कब लेनी चाहिए?",
                        'patient'
                      )}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-semibold border border-slate-700 transition truncate cursor-pointer"
                    >
                      {patientLanguage === 'kn' ? '"ನಾನು ಯಾವಾಗ ಈ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಬೇಕು?"' :
                       patientLanguage === 'ta' ? '"நான் எப்போது இந்த மருந்துகளை எடுத்துக்கொள்ள வேண்டும்?"' :
                       patientLanguage === 'te' ? '"నేను ఎప్పుడు ఈ మందులు తీసుకోవాలి?"' :
                       '"मुझे यह दवाइयां कब लेनी चाहिए?"'}
                    </button>
                  </>
                )}
              </div>

              {/* Free Text / Voice Mic Input */}
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={handleToggleMicSpeech}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isListeningSpeech ? 'bg-red-500 text-white animate-bounce' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                  title={isListeningSpeech ? "Stop Listening" : "Click to speak with microphone"}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompleteTurn()}
                  placeholder={
                    isListeningSpeech 
                      ? "Listening to voice..." 
                      : activeSpeakerRole === 'doctor' 
                      ? `Speak or type in ${getLangName(doctorLanguage)}...` 
                      : `Speak or type in ${getLangName(patientLanguage)}...`
                  }
                  className="flex-1 bg-transparent px-1.5 text-[11px] text-white placeholder-slate-400 focus:outline-none"
                />

                <button
                  onClick={() => handleCompleteTurn()}
                  disabled={!inputText.trim() || isTranslating}
                  className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition active:scale-95 cursor-pointer"
                  title="Translate and speak turn"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </aside>
        )}

      </div>

      {/* BOTTOM CONTROLS DOCK */}
      <footer className="h-16 sm:h-18 px-4 sm:px-8 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between flex-shrink-0 z-20">
        
        {/* Left: Security Info */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">
            Logged in as: <strong className="text-white">{user?.name}</strong> ({isDoctorUser ? 'Doctor' : 'Patient'})
          </span>
        </div>

        {/* Center: In-Call Action Buttons */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mx-auto">
          
          {/* Mic Button */}
          <button
            onClick={handleToggleMic}
            className={`p-3 rounded-full transition active:scale-95 shadow-md cursor-pointer ${
              isMicOn 
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={handleToggleVideo}
            className={`p-3 rounded-full transition active:scale-95 shadow-md cursor-pointer ${
              isVideoOn 
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
            }`}
            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Subtitles (CC) Toggle */}
          <button
            onClick={() => setIsCaptionsVisible(!isCaptionsVisible)}
            className={`p-3 rounded-full transition active:scale-95 shadow-md cursor-pointer ${
              isCaptionsVisible 
                ? 'bg-cyan-600 text-white border border-cyan-500 shadow-cyan-600/30' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title="Toggle Live Closed-Captions Overlay"
          >
            <span className="text-xs font-black">CC</span>
          </button>

          {/* Audio Voice Output (TTS) Toggle */}
          <button
            onClick={() => setIsTtsActive(!isTtsActive)}
            className={`p-3 rounded-full transition active:scale-95 shadow-md cursor-pointer ${
              isTtsActive 
                ? 'bg-emerald-600 text-white border border-emerald-500 shadow-emerald-600/30' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title="Toggle Automatic Speech Audio Output"
          >
            {isTtsActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Doctor In-Call Action: Prescribe & Order Labs */}
          {isDoctorUser && (
            <button
              onClick={handleOpenInCallRx}
              className="p-3 px-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer ml-1"
              title="Issue Prescription & Recommend Diagnostic Labs"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="hidden md:inline">Prescribe & Labs</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="px-5 sm:px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-red-600/30 transition active:scale-95 cursor-pointer ml-1"
            title="End Consultation Call (Esc)"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>End Call</span>
          </button>

        </div>

        {/* Right: Layout Toggle & Sidebar Drawer Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          <button
            onClick={() => setLayoutMode(layoutMode === 'grid' ? 'pip' : 'grid')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border ${
              layoutMode === 'pip'
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300 font-bold shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={layoutMode === 'pip' ? "Switch to Split Grid Mode (50/50)" : "Switch to FaceTime PiP Mode"}
          >
            {layoutMode === 'grid' ? <Layout className="w-4 h-4 text-blue-400" /> : <Grid className="w-4 h-4 text-emerald-400" />}
            <span className="text-xs font-bold hidden sm:inline">
              {layoutMode === 'pip' ? 'FaceTime' : 'Split Grid'}
            </span>
          </button>

          {/* Toggle Sidebar / Chat Drawer */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              isSidebarOpen ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Live Transcript & Presets Panel"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">Transcript</span>
          </button>

        </div>

      </footer>

      {/* In-Call Doctor Prescription & Lab Order Modal */}
      {isInCallRxOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 text-slate-900 animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white relative">
              <button 
                onClick={() => setIsInCallRxOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Active Video Consultation
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Issue Prescription & Diagnostic Lab Order
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-300">
                <span>Patient: <strong className="text-white">{effectivePatientName}</strong></span>
                <span>•</span>
                <span>Doctor: <strong className="text-white">{effectiveDoctorName}</strong></span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {inCallRxSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{inCallRxSuccess}</span>
                </div>
              )}

              {/* 1. Prescribe Medications */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span>Prescribed Medications</span>
                </label>

                <div className="space-y-2">
                  {inCallMeds.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900">{m.name}</span>
                        <span className="text-slate-500 ml-2">({m.dosage} • {m.frequency})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInCallMed(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new medication */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="Medicine name (e.g. Azithromycin 500mg)"
                    className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="Dosage (e.g. 1 tab once daily for 3 days)"
                    className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddInCallMed}
                    disabled={!newMedName.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* 2. Recommend Diagnostic Lab Tests */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                  <span>Recommended Diagnostic Lab Tests</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Select tests to recommend. Laboratories with highest instrument precision will be ranked for the patient.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inCallCatalogTests.map(t => {
                    const isSelected = inCallSelectedTests.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleInCallTest(t.id)}
                        className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                          isSelected ? 'bg-teal-50 border-teal-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                          isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900">{t.name}</h5>
                          <span className="text-[10px] text-teal-700 font-semibold">{t.category}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t.clinical_significance}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Clinical Notes */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Clinical Advice & Notes
                </label>
                <textarea
                  value={inCallNotes}
                  onChange={(e) => setInCallNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  placeholder="Additional patient guidance or dietary precautions..."
                />
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsInCallRxOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendInCallRx}
                disabled={isSubmittingInCallRx}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingInCallRx ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Order...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit Prescription & Lab Order</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
