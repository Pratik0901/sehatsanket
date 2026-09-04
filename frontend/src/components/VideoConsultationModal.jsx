import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Mic, MicOff, Video, VideoOff, PhoneOff, PhoneCall, PhoneIncoming, MessageSquare, 
  Sparkles, Globe, Volume2, VolumeX, Send, FileText, CheckCircle, RefreshCw, UserCheck,
  Languages, Play, RotateCcw, Activity, Maximize2, Minimize2, Grid, Layout,
  Sliders, ShieldCheck, HelpCircle, ChevronRight, MessageCircle, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import { startListening, stopListening, speakText, isSpeechRecognitionSupported } from '../utils/speech';

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
  const isDoctorUser = role === 'doctor';
  const effectiveDoctorName = isDoctorUser ? (user?.name || doctorName) : doctorName;
  const effectivePatientName = !isDoctorUser ? (user?.name || patientName) : patientName;

  // Active speaking role fixed to the logged-in user's true identity
  const activeSpeakerRole = isDoctorUser ? 'doctor' : 'patient';
  
  // Real Hardware Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isTtsActive, setIsTtsActive] = useState(true);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCaptionsVisible, setIsCaptionsVisible] = useState(true);

  // Live Audio Level & Speaking Indicators
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [isPatientSpeaking, setIsPatientSpeaking] = useState(false);
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [audioPlayingTarget, setAudioPlayingTarget] = useState(null);

  // Language barrier configuration
  const [doctorLanguage, setDoctorLanguage] = useState('en');
  const [patientLanguage, setPatientLanguage] = useState(user?.preferred_language || currentLanguage || 'kn');

  // Video & Stream Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const doctorCanvasRef = useRef(null);
  const patientCanvasRef = useRef(null);
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

  // Active Live Subtitle Caption (empty until conversation is made)
  const [currentCaption, setCurrentCaption] = useState(null);

  // Conversation history (empty until conversation is made)
  const [transcript, setTranscript] = useState([]);

  const [inputText, setInputText] = useState('');
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

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

  // Continuous 60-FPS Animation Rendering for Both Doctor & Patient Canvases
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    let frameCount = 0;

    const drawDoctorAvatar = (ctx, fc, isSpeaking) => {
      // Clinical Room Background
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(0.5, '#0F172A');
      grad.addColorStop(1, '#134E4A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Hospital Heart Rate monitor
      ctx.fillStyle = '#022c22';
      ctx.fillRect(440, 25, 175, 95);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.strokeRect(440, 25, 175, 95);
      
      // ECG line
      ctx.beginPath();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      const ecgOffset = (fc * 3) % 175;
      for (let x = 445; x < 610; x += 15) {
        const y = 72 + Math.sin((x + ecgOffset) * 0.1) * ((x % 45 === 0) ? 20 : 3);
        if (x === 445) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText("ECG 74 BPM  SpO2 99%", 450, 48);

      // Doctor Breathing Simulation
      const breathOffset = Math.sin(fc * 0.05) * 3;
      const headCenter = { x: 320, y: 155 + breathOffset };

      // Shoulders / White Coat
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(320, 340 + breathOffset, 175, 120, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stethoscope around neck
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(320, 230 + breathOffset, 55, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(320, 275 + breathOffset, 12, 0, Math.PI * 2);
      ctx.fill();

      // Shirt / Blue Tie
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(310, 220 + breathOffset);
      ctx.lineTo(330, 220 + breathOffset);
      ctx.lineTo(325, 290 + breathOffset);
      ctx.lineTo(315, 290 + breathOffset);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = '#DDA17E';
      ctx.fillRect(298, headCenter.y + 45, 44, 35);

      // Head / Face
      ctx.fillStyle = '#F3C5A5';
      ctx.beginPath();
      ctx.ellipse(headCenter.x, headCenter.y, 55, 68, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(headCenter.x, headCenter.y - 25, 56, Math.PI, 0);
      ctx.fill();

      // Eyes (Blinking every ~3.5 seconds)
      const isBlinking = fc % 120 < 6;
      ctx.fillStyle = '#1E293B';
      if (isBlinking) {
        ctx.fillRect(headCenter.x - 28, headCenter.y - 8, 16, 2.5);
        ctx.fillRect(headCenter.x + 12, headCenter.y - 8, 16, 2.5);
      } else {
        ctx.beginPath();
        ctx.arc(headCenter.x - 20, headCenter.y - 6, 5, 0, Math.PI * 2);
        ctx.arc(headCenter.x + 20, headCenter.y - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyeglasses
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(headCenter.x - 34, headCenter.y - 18, 28, 22);
      ctx.strokeRect(headCenter.x + 6, headCenter.y - 18, 28, 22);
      ctx.beginPath();
      ctx.moveTo(headCenter.x - 6, headCenter.y - 7);
      ctx.lineTo(headCenter.x + 6, headCenter.y - 7);
      ctx.stroke();

      // Mouth (Animated lips sync when speaking)
      ctx.fillStyle = '#9f1239';
      if (isSpeaking) {
        const mouthOpen = Math.abs(Math.sin(fc * 0.35)) * 10 + 3;
        ctx.beginPath();
        ctx.ellipse(headCenter.x, headCenter.y + 35, 14, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(headCenter.x, headCenter.y + 32, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#9f1239';
        ctx.stroke();
      }

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${effectiveDoctorName} • Consultant Physician`, 20, 340);
    };

    const drawPatientAvatar = (ctx, fc, isSpeaking) => {
      // Warm Patient Room Background
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(0.5, '#1E1B4B');
      grad.addColorStop(1, '#064E3B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Window blinds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(40, 25, 140, 160);
      for (let i = 35; i < 185; i += 20) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(40, i, 140, 2);
      }

      // Patient Home Pulse Oximeter & BP Monitor
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(440, 25, 175, 95);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(440, 25, 175, 95);

      // Pulse waveform
      ctx.beginPath();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      const pulseOffset = (fc * 2.5) % 175;
      for (let x = 445; x < 610; x += 15) {
        const y = 72 + Math.sin((x + pulseOffset) * 0.12) * ((x % 45 === 0) ? 18 : 3);
        if (x === 445) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText("Pulse 72 BPM  SpO2 98%", 450, 48);

      // Patient Breathing Simulation
      const breathOffset = Math.sin(fc * 0.04) * 2.5;
      const headCenter = { x: 320, y: 155 + breathOffset };

      // Shoulders / Comfortable Attire (Teal top)
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.ellipse(320, 340 + breathOffset, 175, 120, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = '#C68B59';
      ctx.fillRect(298, headCenter.y + 45, 44, 35);

      // Face
      ctx.fillStyle = '#DDA17E';
      ctx.beginPath();
      ctx.ellipse(headCenter.x, headCenter.y, 52, 64, 0, 0, Math.PI * 2);
      ctx.fill();

      // Long Dark Hair
      ctx.fillStyle = '#171717';
      ctx.beginPath();
      ctx.arc(headCenter.x, headCenter.y - 15, 60, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
      ctx.fillRect(headCenter.x - 58, headCenter.y - 15, 18, 90);
      ctx.fillRect(headCenter.x + 40, headCenter.y - 15, 18, 90);

      // Eyes (Blinking every ~3.5 seconds)
      const isBlinking = fc % 130 < 6;
      ctx.fillStyle = '#171717';
      if (isBlinking) {
        ctx.fillRect(headCenter.x - 26, headCenter.y - 6, 14, 2.5);
        ctx.fillRect(headCenter.x + 12, headCenter.y - 6, 14, 2.5);
      } else {
        ctx.beginPath();
        ctx.arc(headCenter.x - 18, headCenter.y - 6, 5, 0, Math.PI * 2);
        ctx.arc(headCenter.x + 18, headCenter.y - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth (Animated lips sync when speaking)
      ctx.fillStyle = '#be123c';
      if (isSpeaking) {
        const mouthOpen = Math.abs(Math.sin(fc * 0.35)) * 9 + 3;
        ctx.beginPath();
        ctx.ellipse(headCenter.x, headCenter.y + 32, 12, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(headCenter.x, headCenter.y + 30, 10, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#be123c';
        ctx.stroke();
      }

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${effectivePatientName} • Patient Live Feed`, 20, 340);
    };

    const renderLoop = () => {
      if (!mounted) return;
      frameCount++;

      // Paint Doctor Canvas
      const docCanvas = doctorCanvasRef.current;
      if (docCanvas) {
        const ctx = docCanvas.getContext('2d');
        drawDoctorAvatar(ctx, frameCount, isDoctorSpeaking);
      }

      // Paint Patient Canvas
      const patCanvas = patientCanvasRef.current;
      if (patCanvas) {
        const ctx = patCanvas.getContext('2d');
        drawPatientAvatar(ctx, frameCount, isPatientSpeaking);
      }

      requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      mounted = false;
    };
  }, [isOpen, isDoctorSpeaking, isPatientSpeaking, effectiveDoctorName, effectivePatientName]);

  // Reset call termination guard and clear captions on modal open
  useEffect(() => {
    if (isOpen) {
      isEndingCallRef.current = false;
      setCurrentCaption(null);
      setTranscript([]);
    }
  }, [isOpen]);

  // Automatically fade out floating subtitle overlay after 14s of silence
  useEffect(() => {
    if (currentCaption) {
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => {
        setCurrentCaption(null);
      }, 14000);
    }
    return () => {
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    };
  }, [currentCaption]);

  // Keep remote video attached to stream whenever hasRemotePeerStream or stream reference updates
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(e => {
        console.log("Remote video play caught:", e);
      });
    }
  }, [hasRemotePeerStream, isPeerConnected]);

  // Keep local video attached to stream when physical camera is active
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && hasHardwareCamera) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(e => {
        console.log("Local video play caught:", e);
      });
    }
  }, [hasCameraStream, hasHardwareCamera, isVideoOn]);

  // Immediate Call Termination and Complete Hardware Clean-up
  const handleEndCall = useCallback(() => {
    if (isEndingCallRef.current) return;
    isEndingCallRef.current = true;

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}

    try {
      stopListening();
      setIsListeningSpeech(false);
    } catch (e) {}

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }

    // Inform room WebSocket
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

    // Call REST API to update active calls registry on backend
    api.endCall(consultationId, isDoctorUser ? 'doctor' : 'patient').catch(() => {});

    // Broadcast CALL_ENDED to all tabs and global signaling channel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'CALL_ENDED',
          senderSessionId: mySessionIdRef.current,
          by: isDoctorUser ? 'doctor' : 'patient'
        });
      } catch (e) {}
    }
    try {
      const globalCh = new BroadcastChannel('sehatsanketh_telehealth_global_signaling');
      globalCh.postMessage({
        type: 'CALL_ENDED',
        senderSessionId: mySessionIdRef.current,
        by: isDoctorUser ? 'doctor' : 'patient'
      });
      setTimeout(() => {
        try { globalCh.close(); } catch(e) {}
      }, 1000);
    } catch (e) {}

    try {
      localStorage.removeItem('sehat_active_call');
    } catch (e) {}

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

  // Deterministic WebRTC RTCPeerConnection initialization
  const initPeerConnection = useCallback(() => {
    if (pcRef.current && pcRef.current.signalingState !== 'closed') {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });
    pcRef.current = pc;
    pendingIceCandidatesRef.current = [];

    // Attach any local tracks that are already available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch (e) {}
      });
    }

    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack received remote media:", event.track.kind, event.streams);
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      setHasRemotePeerStream(true);
      setIsPeerConnected(true);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(err => {
          console.warn("[WebRTC] Autoplay handled:", err);
        });
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
      console.log("[WebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsPeerConnected(true);
        setHasRemotePeerStream(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsPeerConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsPeerConnected(true);
        setHasRemotePeerStream(true);
      }
    };

    return pc;
  }, [sendSignal]);

  // Drain any ICE candidates received before setRemoteDescription was ready
  const drainPendingIceCandidates = useCallback((pc) => {
    if (pendingIceCandidatesRef.current && pendingIceCandidatesRef.current.length > 0) {
      console.log(`[WebRTC] Draining ${pendingIceCandidatesRef.current.length} queued ICE candidates...`);
      for (const cand of pendingIceCandidatesRef.current) {
        try {
          pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {}
      }
      pendingIceCandidatesRef.current = [];
    }
  }, []);

  // Helper to add or replace tracks in RTCPeerConnection
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
        } catch (err) {
          console.warn("[WebRTC] addTrack error:", err);
        }
      }
    });
  }, [initPeerConnection]);

  // Doctor initiates offer
  const makeOffer = useCallback(async () => {
    if (!isDoctorUser) return;
    const pc = pcRef.current || initPeerConnection();
    if (isNegotiatingRef.current) return;

    try {
      isNegotiatingRef.current = true;
      if (pc.signalingState !== 'stable') {
        console.log("[WebRTC] makeOffer waiting for stable state, current:", pc.signalingState);
        isNegotiatingRef.current = false;
        return;
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Doctor created offer, broadcasting...");
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

  // Patient handles offer and creates answer
  const handleOffer = useCallback(async (offerSdp) => {
    if (isDoctorUser) return;
    console.log("[WebRTC] Patient handling WEBRTC_OFFER...");
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
      console.log("[WebRTC] Patient created answer, broadcasting...");
      sendSignal({
        type: 'WEBRTC_ANSWER',
        sdp: answer
      });
    } catch (err) {
      console.error("[WebRTC] Error handling offer:", err);
    }
  }, [isDoctorUser, initPeerConnection, sendSignal, drainPendingIceCandidates]);

  // Doctor handles answer
  const handleAnswer = useCallback(async (answerSdp) => {
    if (!isDoctorUser) return;
    console.log("[WebRTC] Doctor handling WEBRTC_ANSWER...");
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
        drainPendingIceCandidates(pc);
        console.log("[WebRTC] Handshake completed successfully on Doctor side!");
      }
    } catch (err) {
      console.error("[WebRTC] Error handling answer:", err);
    }
  }, [isDoctorUser, drainPendingIceCandidates]);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("[WebRTC] Error adding ICE candidate:", err);
    }
  }, []);

  // Real-Time Cross-Tab / Cross-Window Synchronization via WebSocket, BroadcastChannel & WebRTC
  useEffect(() => {
    if (!isOpen) return;

    let ws = null;
    let channel = null;

    // Deterministically initialize peer connection immediately on room open
    initPeerConnection();

    const handleIncomingSignal = async (data) => {
      if (!data) return;
      if (data.senderSessionId === mySessionIdRef.current) return;
      if (data.senderRole === (isDoctorUser ? 'doctor' : 'patient')) return;

      if (data.type === 'PEER_JOINED') {
        console.log("[WebRTC] Received PEER_JOINED from", data.senderRole);
        if (isDoctorUser) {
          makeOffer();
        } else {
          sendSignal({ type: 'PEER_READY' });
        }
      } else if (data.type === 'PEER_READY') {
        console.log("[WebRTC] Received PEER_READY from", data.senderRole);
        if (isDoctorUser) {
          makeOffer();
        }
      } else if (data.type === 'WEBRTC_OFFER') {
        if (!isDoctorUser && data.sdp) {
          handleOffer(data.sdp);
        }
      } else if (data.type === 'WEBRTC_ANSWER') {
        if (isDoctorUser && data.sdp) {
          handleAnswer(data.sdp);
        }
      } else if (data.type === 'WEBRTC_ICE_CANDIDATE') {
        if (data.candidate) {
          handleIceCandidate(data.candidate);
        }
      } else if (data.type === 'CALL_ENDED') {
        console.log("Remote peer ended call. Closing consultation room...");
        handleEndCall();
      } else if (data.type === 'NEW_SPEECH_TURN') {
        const msg = data.message;
        if (!msg) return;
        const origText = (msg.original || '').trim();
        const transText = (msg.translated || '').trim();
        // Discard any empty or symbol-only utterances completely
        if (!origText && !transText) return;

        setTranscript(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (data.caption && ((data.caption.original || '').trim() || (data.caption.translated || '').trim())) {
          setCurrentCaption(data.caption);
        }

        if (msg.role === 'doctor') {
          setIsDoctorSpeaking(true);
          setTimeout(() => setIsDoctorSpeaking(false), 4000);
        } else {
          setIsPatientSpeaking(true);
          setTimeout(() => setIsPatientSpeaking(false), 4000);
        }

        // Automatic translation speech playback for listener
        const isSender = data.message.role === (isDoctorUser ? 'doctor' : 'patient');
        if (!isSender && isTtsActive && data.audioToPlay) {
          setAudioPlayingTarget(data.caption.targetPerson);
          speakText(data.audioToPlay.text, data.audioToPlay.lang, data.audioToPlay.b64)
            .finally(() => setAudioPlayingTarget(null));
        }
      }
    };

    // 1. BroadcastChannel for local instant cross-tab sync
    try {
      channel = new BroadcastChannel(`sehatsanketh_call_${consultationId}`);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => handleIncomingSignal(event.data);
    } catch (e) {
      console.warn("BroadcastChannel not supported:", e);
    }

    // 2. Room WebSocket for server-backed cross-window/cross-network signaling
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
    } catch (wsErr) {
      console.warn("Room WebSocket error:", wsErr);
    }

    // Announce arrival via broadcast channel as well
    sendSignal({ type: 'PEER_JOINED' });

    // 3. Heartbeat & Self-Healing Auto-Reconciliation Timer (runs until connected)
    const heartbeatTimer = setInterval(() => {
      if (!isPeerConnected && !hasRemotePeerStream) {
        if (isDoctorUser) {
          makeOffer();
        } else {
          sendSignal({ type: 'PEER_READY' });
        }
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

  // Helper to generate a silent audio track when hardware microphone is completely unavailable
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

  // Robust Camera & Microphone Access with multi-tier fallbacks
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
            } catch (err3) {
              console.warn("Hardware camera locked by another application or tab:", err3);
            }
          }
        }
      }
    } catch (e) {}

    // Fallback if hardware camera is locked (e.g. 2 tabs on same laptop)
    if (!acquiredHardware || !stream) {
      console.log("Hardware camera unavailable/locked. Creating live canvas stream for avatar feed...");
      // Try to acquire real microphone at least
      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {}

      // Capture stream from the visible avatar canvas
      const targetCanvas = isDoctorUser ? doctorCanvasRef.current : patientCanvasRef.current;
      if (targetCanvas && targetCanvas.captureStream) {
        try {
          stream = targetCanvas.captureStream(30);
          console.log("Successfully created 30-FPS canvas stream for avatar feed");
        } catch (e) {
          console.warn("captureStream error:", e);
        }
      }

      if (stream) {
        if (micStream && micStream.getAudioTracks().length > 0) {
          stream.addTrack(micStream.getAudioTracks()[0]);
        } else {
          const silentAudio = createSilentAudioTrack();
          if (silentAudio) stream.addTrack(silentAudio);
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

      // Attach tracks to RTCPeerConnection
      attachTracksToPeer(stream);

      // Audio analyzer for equalizer
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
              if (isDoctorUser) {
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

      // If we are doctor, initiate offer now that tracks are attached
      if (isDoctorUser) {
        setTimeout(() => makeOffer(), 300);
      } else {
        // Patient announces ready to receive offer
        sendSignal({ type: 'PEER_READY' });
      }
    }
  }, [isDoctorUser, attachTracksToPeer, makeOffer, sendSignal]);

  // Request camera access on modal open
  useEffect(() => {
    if (!isOpen) return;
    requestCameraAccess();
  }, [isOpen, requestCameraAccess]);

  // Support pressing Escape key to immediately end call and close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleEndCall();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleEndCall]);

  // Toggle Mic Audio Track
  const handleToggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  };

  // Toggle Camera Video Track
  const handleToggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  };

  // Handle a completed utterance / turn in the conversation
  const handleCompleteTurn = async (customText = null) => {
    const textToSend = (customText !== null && customText !== undefined ? customText : inputText).trim();
    if (!textToSend || isTranslating) return;

    setInputText('');
    setIsTranslating(true);

    const isDocTurn = activeSpeakerRole === 'doctor';
    const sourceLang = isDocTurn ? doctorLanguage : patientLanguage;
    const targetLang = isDocTurn ? patientLanguage : doctorLanguage;
    const senderName = isDocTurn ? effectiveDoctorName : effectivePatientName;
    const targetPerson = isDocTurn ? effectivePatientName : effectiveDoctorName;

    if (isDocTurn) {
      setIsDoctorSpeaking(true);
    } else {
      setIsPatientSpeaking(true);
    }

    try {
      const res = await api.postConsultationMessage(consultationId, {
        sender_role: activeSpeakerRole,
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
        role: activeSpeakerRole,
        sourceLang,
        targetLang,
        original: entry.original_text,
        translated: entry.translated_text,
        audioBase64: res.audio_base64 || entry.audio_base64 || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setTranscript(prev => [...prev, newMsg]);

      const newCaption = {
        speakerName: senderName,
        speakerRole: activeSpeakerRole,
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

      // If standalone (testing without a connected peer), play audio so the user can verify speech output
      const isAlone = !isPeerConnected && !hasRemotePeerStream;
      if (isTtsActive && isAlone) {
        setAudioPlayingTarget(targetPerson);
        try {
          await speakText(newMsg.translated, targetLang, newMsg.audioBase64);
        } catch (audioErr) {
          console.warn("Audio playback error:", audioErr);
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
        role: activeSpeakerRole,
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
        speakerRole: activeSpeakerRole,
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
  };

  // Replay speech audio of any message
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

  // Live Speech Recognition on Real Microphone
  const handleToggleMicSpeech = () => {
    if (!isSpeechRecognitionSupported()) {
      alert("Speech recognition is not supported in this browser. Please use text input or quick dialogue presets.");
      return;
    }

    if (isListeningSpeech) {
      stopListening();
      setIsListeningSpeech(false);
    } else {
      setIsListeningSpeech(true);
      const activeLang = activeSpeakerRole === 'doctor' ? doctorLanguage : patientLanguage;
      startListening({
        lang: activeLang,
        onResult: (transcriptText, isFinal) => {
          const cleanText = (typeof transcriptText === 'string' ? transcriptText : '').trim();
          if (isFinal) {
            setIsListeningSpeech(false);
            if (cleanText) {
              handleCompleteTurn(cleanText);
            }
          } else {
            setInputText(transcriptText);
          }
        },
        onError: () => setIsListeningSpeech(false),
        onEnd: () => setIsListeningSpeech(false)
      });
    }
  };

  const getLangName = (code) => {
    const map = { en: 'English', hi: 'Hindi', kn: 'Kannada', ta: 'Tamil', te: 'Telugu' };
    return map[code] || code.toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none"
    >
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
              Encrypted Real-Time Telehealth • Instant Voice Subtitles
            </p>
          </div>
        </div>

        {/* Center: Language Barrier Tag */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-bold">
          <Languages className="w-3.5 h-3.5 text-brand-mint" />
          <span className="text-blue-300">Dr: {getLangName(doctorLanguage)}</span>
          <span className="text-slate-400">⇄</span>
          <span className="text-emerald-300">Patient: {getLangName(patientLanguage)}</span>
        </div>

        {/* Right Controls: Single User Identity (No Switcher) & End Call */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* User Profile Badge: Doctor sees Doctor profile, Patient sees Patient profile */}
          <div className="flex items-center">
            {isDoctorUser ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-700 text-blue-300 text-xs font-black shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>👨‍⚕️ {effectiveDoctorName} (Doctor)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-black shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>👤 {effectivePatientName} (Patient)</span>
              </div>
            )}
          </div>

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

      {/* MAIN CALL AREA: Video Stage + Collapsible Live Drawer */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden bg-black/90">
        
        {/* VIDEO STAGE: Takes 100% available space */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden p-2 sm:p-4">
          
          {/* Video Grid: 1 Tile for DOCTOR, 1 Tile for PATIENT */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            
            {layoutMode === 'grid' ? (
              /* GRID VIEW: Side-by-Side (Doctor on Left, Patient on Right) */
              <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 max-h-full">
                
                {/* 1. DOCTOR VIDEO TILE (Doctor's Face is ALWAYS visible) */}
                <div className={`relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all flex items-center justify-center ${
                  isDoctorSpeaking
                    ? 'border-blue-500 shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/30'
                    : 'border-slate-800'
                }`}>
                  {isDoctorUser ? (
                    <>
                      {/* Doctor Local Webcam Video */}
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover scale-x-[-1] ${
                          hasHardwareCamera && isVideoOn ? 'block' : 'hidden'
                        }`}
                      />
                      {/* Doctor Canvas Avatar (active when camera off or hardware camera locked) */}
                      <canvas
                        ref={doctorCanvasRef}
                        width={640}
                        height={360}
                        className={`w-full h-full object-cover ${
                          hasHardwareCamera && isVideoOn ? 'hidden' : 'block'
                        }`}
                      />
                    </>
                  ) : (
                    <>
                      {/* Patient Screen: Remote Doctor Video from WebRTC */}
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${
                          hasRemotePeerStream ? 'block' : 'hidden'
                        }`}
                      />
                      {/* Doctor Canvas Avatar (always rendered until WebRTC stream arrives) */}
                      <canvas
                        ref={doctorCanvasRef}
                        width={640}
                        height={360}
                        className={`w-full h-full object-cover ${
                          hasRemotePeerStream ? 'hidden' : 'block'
                        }`}
                      />
                    </>
                  )}

                  {/* Doctor Info Tag */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 z-20">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-blue-200">{effectiveDoctorName} (Doctor{isDoctorUser ? ' • You' : ''})</span>
                    <span className="text-[10px] text-blue-300 font-extrabold uppercase">
                      ({getLangName(doctorLanguage)})
                    </span>
                    {hasRemotePeerStream && !isDoctorUser && (
                      <span className="ml-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        LIVE P2P
                      </span>
                    )}
                  </div>

                  {/* Doctor Speaking Wave */}
                  {isDoctorSpeaking && (
                    <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] font-black flex items-center gap-1.5 shadow-md animate-pulse z-20">
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                      <span>Speaking in English...</span>
                    </div>
                  )}
                </div>

                {/* 2. PATIENT VIDEO TILE (Patient's Face is ALWAYS visible) */}
                <div className={`relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all flex items-center justify-center ${
                  isPatientSpeaking
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/30 ring-4 ring-emerald-500/30'
                    : 'border-slate-800'
                }`}>
                  {!isDoctorUser ? (
                    <>
                      {/* Patient Local Webcam Video */}
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover scale-x-[-1] ${
                          hasHardwareCamera && isVideoOn ? 'block' : 'hidden'
                        }`}
                      />
                      {/* Patient Canvas Avatar (active when camera off or hardware camera locked) */}
                      <canvas
                        ref={patientCanvasRef}
                        width={640}
                        height={360}
                        className={`w-full h-full object-cover ${
                          hasHardwareCamera && isVideoOn ? 'hidden' : 'block'
                        }`}
                      />
                    </>
                  ) : (
                    <>
                      {/* Doctor Screen: Remote Patient Video from WebRTC */}
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${
                          hasRemotePeerStream ? 'block' : 'hidden'
                        }`}
                      />
                      {/* Patient Canvas Avatar (always rendered until WebRTC stream arrives) */}
                      <canvas
                        ref={patientCanvasRef}
                        width={640}
                        height={360}
                        className={`w-full h-full object-cover ${
                          hasRemotePeerStream ? 'hidden' : 'block'
                        }`}
                      />
                    </>
                  )}

                  {/* Patient Info Tag with Live Mic Indicator */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 z-20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-200">{effectivePatientName} (Patient{!isDoctorUser ? ' • You' : ''})</span>
                    <span className="text-[10px] text-emerald-300 font-extrabold uppercase">
                      ({getLangName(patientLanguage)})
                    </span>
                    {hasRemotePeerStream && isDoctorUser && (
                      <span className="ml-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        LIVE P2P
                      </span>
                    )}

                    {/* Live Mic Meter */}
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

                  {/* Doctor Screen: Calling patient status badge */}
                  {isDoctorUser && !hasRemotePeerStream && !isPeerConnected && (
                    <div className="absolute top-12 left-2.5 sm:left-3 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-600/80 text-amber-300 text-[11px] font-black flex items-center gap-2 shadow-xl animate-pulse z-20">
                      <PhoneIncoming className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      <span>Calling {effectivePatientName}'s dashboard...</span>
                    </div>
                  )}

                  {/* Patient Speaking Wave */}
                  {isPatientSpeaking && (
                    <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[10px] font-black flex items-center gap-1.5 shadow-md animate-pulse z-20">
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                      <span>Speaking in {getLangName(patientLanguage)}...</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* PICTURE-IN-PICTURE (Focus Mode) */
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800">
                <canvas
                  ref={isDoctorUser ? patientCanvasRef : doctorCanvasRef}
                  width={640}
                  height={360}
                  className="w-full h-full object-cover"
                />

                <div className="absolute bottom-4 right-4 w-36 sm:w-48 h-24 sm:h-32 rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-2xl flex items-center justify-center">
                  <div className="text-[11px] text-slate-300 font-bold">
                    You ({isDoctorUser ? effectiveDoctorName : effectivePatientName})
                  </div>
                </div>
              </div>
            )}

            {/* FLOATING CLOSED-CAPTION OVERLAY (Rendered ONLY after a conversation is made) */}
            {isCaptionsVisible && currentCaption && ((currentCaption.original || '').trim() || (currentCaption.translated || '').trim()) && (
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex justify-center pointer-events-none">
                <div className="pointer-events-auto max-w-2xl w-full bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  
                  {/* Caption Header: Speaker & Translation Target */}
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        currentCaption.speakerRole === 'doctor' ? 'bg-blue-900/90 text-blue-300' : 'bg-emerald-900/90 text-emerald-300'
                      }`}>
                        {currentCaption.speakerName} ({getLangName(currentCaption.sourceLang)})
                      </span>
                      <span className="text-slate-500">⟶</span>
                      <span className="text-brand-mint font-extrabold truncate">
                        Translated for {currentCaption.targetPerson} ({getLangName(currentCaption.targetLang)}):
                      </span>
                    </div>

                    {/* Replay, Audio Status & Dismiss Button */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {audioPlayingTarget && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] animate-pulse">
                          <Volume2 className="w-3 h-3 text-emerald-400" />
                          <span>Voice Playing...</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleReplayAudio(
                          currentCaption.translated, 
                          currentCaption.targetLang, 
                          currentCaption.audioBase64, 
                          currentCaption.targetPerson
                        )}
                        className="p-1 sm:px-2 sm:py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Replay translated audio"
                      >
                        <RotateCcw className="w-3 h-3 text-brand-mint" />
                        <span className="hidden sm:inline">Replay</span>
                      </button>

                      <button
                        onClick={() => setCurrentCaption(null)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Dismiss caption overlay"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Original Spoken Text (Only rendered if non-empty) */}
                  {currentCaption.original && currentCaption.original.trim() && (
                    <p className="text-[11px] text-slate-400 font-medium italic line-clamp-1">
                      "{currentCaption.original.trim()}"
                    </p>
                  )}

                  {/* High-Contrast Translated Subtitle (Only rendered if non-empty) */}
                  {currentCaption.translated && currentCaption.translated.trim() && (
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-start gap-1.5">
                      <span className="text-brand-mint font-black text-xs mt-0.5">↳</span>
                      <p className="text-xs sm:text-sm font-black text-white leading-relaxed">
                        "{currentCaption.translated.trim()}"
                      </p>
                    </div>
                  )}
                </div>
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
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-xs text-slate-200">
                  Live Bilingual Transcript
                </h3>
              </div>
              
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition lg:hidden"
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
                      <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-brand-mint shadow-inner">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">No conversation yet</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
                          Live subtitles and voice translations will appear here once either participant speaks or sends a message.
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
                      className={`p-2.5 rounded-xl border space-y-1 transition ${
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
                              className="text-brand-mint hover:text-white transition p-0.5 cursor-pointer"
                              title="Listen to audio"
                            >
                              <Volume2 className="w-3 h-3" />
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
                          <span className="text-brand-mint font-black text-[10px]">↳</span>
                          <p className="text-white font-bold text-[11px] leading-relaxed">
                            "{transText}"
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
              
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-extrabold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-mint" />
                  <span>Click to speak as {isDoctorUser ? effectiveDoctorName : effectivePatientName}:</span>
                </span>
                {isTranslating && <span className="text-brand-mint animate-pulse font-bold">Translating...</span>}
              </div>

              {/* Fast presets for current role */}
              <div className="space-y-1">
                {isDoctorUser ? (
                  <>
                    <button
                      onClick={() => handleCompleteTurn(`Hello ${effectivePatientName}! Can you describe what discomfort you are feeling today?`)}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition truncate"
                    >
                      "Hello {effectivePatientName}! What discomfort are you feeling today?"
                    </button>
                    <button
                      onClick={() => handleCompleteTurn("On a scale from 1 to 10, how intense is your pain right now?")}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition truncate"
                    >
                      "On a scale from 1 to 10, how intense is your pain right now?"
                    </button>
                    <button
                      onClick={() => handleCompleteTurn("I am prescribing an anti-inflammatory medication. Please rest for two days.")}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition truncate"
                    >
                      "I am prescribing an anti-inflammatory. Please rest."
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleCompleteTurn(
                        patientLanguage === 'kn' ? "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ತೀವ್ರ ತಲೆನೋವು ಮತ್ತು ಜ್ವರವಿದೆ ಡಾಕ್ಟರೇ." :
                        patientLanguage === 'ta' ? "எனக்கு இரண்டு நாட்களாக கடுமையான தலைவலியும் காய்ச்சலும் உள்ளது." :
                        patientLanguage === 'te' ? "నాకు రెండు రోజులుగా తీవ్రమైన ತలనొప్పి మరియు జ్వరం ఉంది." :
                        "मुझे दो दिनों से तेज सिरदर्द और बुखार है डॉक्टर।"
                      )}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-semibold border border-slate-700 transition truncate"
                    >
                      {patientLanguage === 'kn' ? '"ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ತಲೆನೋವು ಮತ್ತು ಜ್ವರವಿದೆ ಡಾಕ್ಟರೇ."' :
                       patientLanguage === 'ta' ? '"எனக்கு இரண்டு நாட்களாக தலைவலி மற்றும் காய்ச்சல் உள்ளது."' :
                       patientLanguage === 'te' ? '"నాకు రెండు రోజులుగా ತలనొప్పి మరియు జ్వరం ఉంది."' :
                       '"मुझे दो दिनों से सिरदर्द और बुखार है डॉक्टर।"'}
                    </button>
                    <button
                      onClick={() => handleCompleteTurn(
                        patientLanguage === 'kn' ? "ನೋವು ಸುಮಾರು 6 ರಷ್ಟಿದೆ, ನಿದ್ರೆ ಮಾಡಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ." :
                        patientLanguage === 'ta' ? "வலி சுமார் 6 ஆக உள்ளது, தூங்க முடியவில்லை." :
                        patientLanguage === 'te' ? "నొప్పి దాదాపు 6 గా ఉంది, నిద్ర పట్టడం లేదు." :
                        "दर्द 6 के करीब है और सोने में परेशानी हो रही है।"
                      )}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-semibold border border-slate-700 transition truncate"
                    >
                      {patientLanguage === 'kn' ? '"ನೋವು ಸುಮಾರು 6 ರಷ್ಟಿದೆ, ನಿದ್ರೆ ಮಾಡಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ."' :
                       patientLanguage === 'ta' ? '"வலி சுமார் 6 ஆக உள்ளது, தூங்க முடியவில்லை."' :
                       patientLanguage === 'te' ? '"నొప్పి దాదాపు 6 గా ఉంది, నిద్ర పట్టడం లేదు."' :
                       '"दर्द 6 के करीब है और सोने में परेशानी हो रही है।"'}
                    </button>
                  </>
                )}
              </div>

              {/* Free Text / Voice Mic Input */}
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={handleToggleMicSpeech}
                  className={`p-1.5 rounded-lg transition ${
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
                      : isDoctorUser 
                      ? "Speak or type in English..." 
                      : `Speak or type in ${getLangName(patientLanguage)}...`
                  }
                  className="flex-1 bg-transparent px-1.5 text-[11px] text-white placeholder-slate-400 focus:outline-none"
                />

                <button
                  onClick={() => handleCompleteTurn()}
                  disabled={!inputText.trim() || isTranslating}
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition active:scale-95 cursor-pointer"
                  title="Send turn to translate and speak"
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
                ? 'bg-blue-600 text-white border border-blue-500' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title="Toggle Live Closed-Captions Overlay"
          >
            <span className="text-xs font-black">CC</span>
          </button>

          {/* Audio Voice Toggle */}
          <button
            onClick={() => setIsTtsActive(!isTtsActive)}
            className={`p-3 rounded-full transition active:scale-95 shadow-md cursor-pointer ${
              isTtsActive 
                ? 'bg-emerald-600 text-white border border-emerald-500' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title="Toggle Automatic Speech Audio Output"
          >
            {isTtsActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

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
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition hidden sm:flex cursor-pointer"
            title="Toggle Layout Mode"
          >
            {layoutMode === 'grid' ? <Layout className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          {/* Toggle Sidebar / Chat Drawer */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              isSidebarOpen ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Live Transcript & Presets Panel"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">Transcript</span>
          </button>

        </div>

      </footer>

    </div>
  );
}
