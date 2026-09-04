import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, UserCheck, ShieldCheck, Sparkles } from 'lucide-react';

export function IncomingCallNotification({ 
  callData, 
  onAccept, 
  onDecline 
}) {
  const audioContextRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  // Play telephone ring chime tone
  useEffect(() => {
    if (!callData) return;

    let ctx = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const playRingBurst = () => {
          if (!ctx || ctx.state === 'closed') return;
          try {
            // Dual-tone telephone chime (440Hz + 480Hz)
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(440, ctx.currentTime);
            osc2.frequency.setValueAtTime(480, ctx.currentTime);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 1.2);
            osc2.stop(ctx.currentTime + 1.2);
          } catch (e) {}
        };

        playRingBurst();
        chimeIntervalRef.current = setInterval(playRingBurst, 3000);
      }
    } catch (err) {
      console.warn("Ringtone AudioContext not allowed without gesture:", err);
    }

    return () => {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    };
  }, [callData]);

  if (!callData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-emerald-500/80 w-full max-w-md rounded-3xl shadow-2xl p-6 text-white text-center relative overflow-hidden ring-4 ring-emerald-500/20">
        
        {/* Animated Ringing Ambient Waves */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />

        {/* Incoming Icon with Pulsing Halo */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <Video className="w-8 h-8 text-white animate-bounce" />
          </div>
        </div>

        {/* Call Details */}
        <div className="space-y-1 mb-5">
          <span className="px-3 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
            Incoming Telehealth Consultation
          </span>
          <h3 className="text-xl font-black text-white mt-1">
            {callData.doctorName || "Dr. Rajesh Rao"}
          </h3>
          <p className="text-xs text-blue-300 font-semibold">
            {callData.doctorSpecialty || "Consultant Cardiologist & General Physician"}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Doctor is ready to begin your real-time consultation. Subtitles & voice translation ready.
          </p>
        </div>

        {/* Security & Features Badge */}
        <div className="bg-slate-800/80 rounded-2xl p-2.5 mb-6 border border-slate-700 text-[11px] text-slate-300 flex items-center justify-around">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted WebRTC</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-mint" />
            <span>Live Regional Voice</span>
          </div>
        </div>

        {/* Action Buttons: Accept or Decline */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDecline}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-black text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <PhoneOff className="w-4 h-4 text-red-400" />
            <span>Decline</span>
          </button>

          <button
            onClick={onAccept}
            className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 transition cursor-pointer"
          >
            <Phone className="w-4 h-4 text-white" />
            <span>Accept & Join</span>
          </button>
        </div>

      </div>
    </div>
  );
}
