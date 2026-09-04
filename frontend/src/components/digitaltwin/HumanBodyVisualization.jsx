import React, { useState, useRef } from 'react';
import { 
  Heart, Wind, Activity, Droplets, Thermometer, Brain
} from 'lucide-react';
import { ORGAN_SYSTEMS } from '../../utils/digitalTwinConfig';

/* ── Muscular wireframe body silhouette (viewBox 0 0 240 480) ── */
const BODY_PATH = `
  M 120 18
  C 104 18, 95 30, 95 46
  C 95 60, 102 70, 106 74
  L 108 80
  L 108 82
  C 102 84, 80 92, 66 102
  C 52 112, 42 124, 44 144
  C 46 158, 52 166, 58 172
  C 54 182, 48 202, 44 222
  C 40 240, 38 256, 42 268
  C 46 276, 52 278, 56 272
  C 60 264, 64 248, 66 228
  C 68 212, 70 194, 72 182
  C 74 196, 78 218, 82 238
  C 84 248, 86 258, 84 266
  C 72 290, 66 322, 76 356
  C 82 370, 82 386, 76 406
  C 72 422, 72 438, 80 452
  L 96 454
  C 100 442, 100 424, 96 406
  C 92 390, 94 376, 98 366
  L 104 354
  C 108 338, 114 310, 116 280
  L 120 274
  L 124 280
  C 126 310, 132 338, 136 354
  L 142 366
  C 146 376, 148 390, 144 406
  C 140 424, 140 442, 144 454
  L 160 452
  C 168 438, 168 422, 164 406
  C 158 386, 158 370, 164 356
  C 174 322, 168 290, 156 266
  C 154 258, 156 248, 158 238
  C 162 218, 166 196, 168 182
  C 170 194, 172 212, 174 228
  C 176 248, 180 264, 184 272
  C 188 278, 194 276, 198 268
  C 202 256, 200 240, 196 222
  C 192 202, 186 182, 182 172
  C 188 166, 194 158, 196 144
  C 198 124, 188 112, 174 102
  C 160 92, 138 84, 132 82
  L 132 80
  L 134 74
  C 138 70, 145 60, 145 46
  C 145 30, 136 18, 120 18 Z
`;

export function HumanBodyVisualization({ analysis, vitals }) {
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [activeLayer, setActiveLayer] = useState('all');
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const organStrains = analysis?.organStrains || {};
  const riskLevel = analysis?.riskLevel || 'Stable';
  const heartRate = vitals?.heartRate || 78;

  const pulseDuration = Math.max(0.35, Math.min(1.8, (60 / heartRate))).toFixed(2);
  const neuralSpeed = Math.max(0.5, Math.min(2.0, (60 / heartRate) * 1.1)).toFixed(2);
  const axonalRate = Math.round(80 + (heartRate - 60) * 0.7);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: +(x * 18).toFixed(1), y: +(-y * 16).toFixed(1) });
  };

  const handleMouseLeave = () => setMouseTilt({ x: 0, y: 0 });

  const getStrainColor = (strain) => {
    switch (strain) {
      case 'critical': return { fill: '#EF4444', glow: 'rgba(239,68,68,0.7)', badge: 'bg-red-500/20 text-red-300 border-red-500/40' };
      case 'elevated': return { fill: '#F97316', glow: 'rgba(249,115,22,0.7)', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'moderate': return { fill: '#F59E0B', glow: 'rgba(245,158,11,0.7)', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      default: return { fill: '#10B981', glow: 'rgba(16,185,129,0.5)', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
  };

  const getOrganIcon = (iconName) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-4 h-4" />;
      case 'Heart': return <Heart className="w-4 h-4 fill-current" />;
      case 'Wind': return <Wind className="w-4 h-4" />;
      case 'Activity': return <Activity className="w-4 h-4" />;
      case 'Droplets': return <Droplets className="w-4 h-4 fill-current" />;
      case 'Thermometer': return <Thermometer className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const showMuscular = activeLayer === 'all' || activeLayer === 'muscular';
  const showNeural = activeLayer === 'all' || activeLayer === 'neural';

  /* ── Generate wireframe horizontal cross-contour grid lines ── */
  const gridLines = [];
  for (let y = 20; y <= 460; y += 8) {
    gridLines.push(<line key={`gh${y}`} x1="0" y1={y} x2="240" y2={y} />);
  }
  const vGridLines = [];
  for (let x = 20; x <= 220; x += 9) {
    vGridLines.push(<line key={`gv${x}`} x1={x} y1="0" x2={x} y2="480" />);
  }

  return (
    <div 
      className="relative bg-gradient-to-b from-[#020a18] via-[#04101e] to-[#020a18] rounded-4xl p-5 sm:p-6 text-white overflow-hidden shadow-2xl border border-cyan-900/40 flex flex-col items-center justify-between min-h-[580px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <style>{`
        @keyframes neuralFlow { from{stroke-dashoffset:120} to{stroke-dashoffset:0} }
        @keyframes holoScan { 0%{top:4%;opacity:0} 15%{opacity:.85} 85%{opacity:.85} 100%{top:96%;opacity:0} }
        @keyframes idleFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pedestalSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes wireShimmer { 0%,100%{stroke-opacity:.32} 50%{stroke-opacity:.52} }
      `}</style>

      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(0,212,255,0.10),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00d4ff05_1px,transparent_1px),linear-gradient(to_bottom,#00d4ff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* ═══ TOP HEADER BAR ═══ */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10 pb-3 border-b border-cyan-900/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-200/80">
            3D Wireframe Twin &bull; Live Telemetry
          </span>
        </div>

        {/* Layer toggle */}
        <div className="flex items-center gap-1 bg-[#020a18] p-1 rounded-xl border border-cyan-800/40">
          {[
            { id: 'all',      label: '\uD83E\uDDEC Full Twin',    active: 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/30' },
            { id: 'neural',   label: '\u26A1 Neural',   active: 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' },
            { id: 'muscular', label: '\uD83D\uDCAA Wireframe', active: 'bg-sky-500 text-white shadow-md shadow-sky-500/30' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setActiveLayer(btn.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${activeLayer === btn.id ? btn.active : 'text-slate-400 hover:text-cyan-300'}`}
            >{btn.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
            riskLevel === 'High' ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' :
            riskLevel === 'Elevated' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
            riskLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
            'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>Status: {riskLevel}</span>
          <span className="text-[10px] font-mono text-cyan-400 font-bold hidden sm:inline">{axonalRate} m/s</span>
        </div>
      </div>

      {/* ═══ MAIN 3D VISUALIZATION ═══ */}
      <div className="relative w-full max-w-[340px] sm:max-w-[400px] h-[420px] my-1 flex items-center justify-center select-none" style={{ perspective: '1200px' }}>

        {/* Holographic scanner */}
        <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent pointer-events-none z-10" style={{ animation: 'holoScan 4s cubic-bezier(0.4,0,0.6,1) infinite', boxShadow: '0 0 20px 4px rgba(0,212,255,0.35)' }} />

        {/* 3D Perspective Tilt Wrapper */}
        <div className="relative w-full h-full flex items-center justify-center transition-transform duration-150 ease-out" style={{ transform: `rotateY(${mouseTilt.x}deg) rotateX(${mouseTilt.y}deg)`, transformStyle: 'preserve-3d' }}>

          {/* Holographic Pedestal at feet */}
          <div className="absolute bottom-0 w-[200px] h-[50px] pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 border border-cyan-500/25 rounded-[100%]" style={{ transform: 'rotateX(75deg)', animation: 'pedestalSpin 18s linear infinite', boxShadow: '0 0 30px rgba(0,212,255,0.15)' }} />
            <div className="absolute inset-3 border border-dashed border-cyan-400/30 rounded-[100%]" style={{ transform: 'rotateX(75deg)', animation: 'pedestalSpin 26s linear infinite reverse' }} />
          </div>

          {/* ╔══════════════════════════════════════════════╗ */}
          {/* ║  MASTER SVG — WIREFRAME HOLOGRAPHIC 3D MAN  ║ */}
          {/* ╚══════════════════════════════════════════════╝ */}
          <svg viewBox="0 0 240 480" className="w-full h-full" style={{ animation: 'idleFloat 7s ease-in-out infinite', filter: 'drop-shadow(0 0 18px rgba(0,212,255,0.18))' }}>
            <defs>
              {/* Body clip path for wireframe grid */}
              <clipPath id="bodyClip"><path d={BODY_PATH} /></clipPath>

              {/* Rim glow filter (bright cyan edge lighting) */}
              <filter id="rimGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="3" result="b1" />
                <feGaussianBlur stdDeviation="6" result="b2" />
                <feMerge><feMergeNode in="b2" /><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Intense glow for neural nodes */}
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="g" />
                <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Subtle inner body radial lighting */}
              <radialGradient id="innerLight" cx="50%" cy="40%" r="55%">
                <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.06" />
                <stop offset="60%"  stopColor="#00d4ff" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ═══════════════════════════════════════ */}
            {/*   LAYER 1: WIREFRAME MUSCULAR MESH     */}
            {/* ═══════════════════════════════════════ */}
            <g className="transition-opacity duration-500" opacity={showMuscular ? 1 : 0.12}>

              {/* A. Subtle body fill */}
              <path d={BODY_PATH} fill="url(#innerLight)" />

              {/* B. Dense horizontal wireframe grid (clipped to body) */}
              <g clipPath="url(#bodyClip)" stroke="#00d4ff" strokeWidth="0.45" opacity="0.38" style={{ animation: 'wireShimmer 5s ease-in-out infinite' }}>
                {gridLines}
              </g>

              {/* C. Dense vertical wireframe grid (clipped to body) */}
              <g clipPath="url(#bodyClip)" stroke="#00d4ff" strokeWidth="0.35" opacity="0.22">
                {vGridLines}
              </g>

              {/* D. Body outline — BRIGHT GLOWING RIM */}
              <path d={BODY_PATH} fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter="url(#rimGlow)" />
              {/* Secondary thinner bright edge */}
              <path d={BODY_PATH} fill="none" stroke="#67e8f9" strokeWidth="0.6" strokeLinejoin="round" opacity="0.9" />

              {/* ─── E. FACIAL FEATURES ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.85">
                {/* Brow ridge */}
                <path d="M 107 38 Q 120 34 133 38" strokeWidth="1" />
                {/* Left eye socket */}
                <ellipse cx="111" cy="42" rx="5" ry="3.5" strokeWidth="0.9" />
                <circle cx="111" cy="42" r="1.8" fill="#00d4ff" opacity="0.7" />
                {/* Right eye socket */}
                <ellipse cx="129" cy="42" rx="5" ry="3.5" strokeWidth="0.9" />
                <circle cx="129" cy="42" r="1.8" fill="#00d4ff" opacity="0.7" />
                {/* Nose bridge */}
                <path d="M 120 40 L 118 52 Q 120 55 122 52 L 120 40" strokeWidth="0.7" />
                {/* Mouth line */}
                <path d="M 114 58 Q 120 61 126 58" strokeWidth="0.6" />
                {/* Jaw contour */}
                <path d="M 102 48 Q 100 58 107 66 Q 120 72 133 66 Q 140 58 138 48" strokeWidth="0.8" />
                {/* Ear indicators */}
                <path d="M 96 40 Q 93 44 96 50" strokeWidth="0.6" />
                <path d="M 144 40 Q 147 44 144 50" strokeWidth="0.6" />
              </g>

              {/* ─── F. HEAD CROSS-CONTOUR WIREFRAME CURVES ─── */}
              <g stroke="#00d4ff" fill="none" strokeWidth="0.7" opacity="0.55">
                <path d="M 104 26 Q 120 22 136 26" />
                <path d="M 98 34 Q 120 28 142 34" />
                <path d="M 97 46 Q 120 40 143 46" />
                <path d="M 100 56 Q 120 52 140 56" />
                <path d="M 105 64 Q 120 60 135 64" />
              </g>

              {/* ─── G. TRAPEZIUS & CLAVICLE DEFINITION ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.7">
                {/* Clavicle arcs */}
                <path d="M 108 82 Q 90 90 68 100" strokeWidth="1.2" />
                <path d="M 132 82 Q 150 90 172 100" strokeWidth="1.2" />
                {/* Trapezius muscle fibers */}
                <path d="M 112 78 Q 100 84 76 96" strokeWidth="0.6" opacity="0.5" />
                <path d="M 128 78 Q 140 84 164 96" strokeWidth="0.6" opacity="0.5" />
                {/* Sternal notch */}
                <ellipse cx="120" cy="100" rx="3" ry="2" strokeWidth="0.8" />
              </g>

              {/* ─── H. DELTOID 3D CONTOUR CURVES ─── */}
              <g stroke="#00d4ff" fill="none" strokeWidth="0.8" opacity="0.65">
                {/* Left deltoid wrapping curves */}
                <path d="M 66 104 Q 50 112 46 132" />
                <path d="M 68 108 Q 54 116 50 136" />
                <path d="M 70 114 Q 58 122 54 142" />
                {/* Right deltoid */}
                <path d="M 174 104 Q 190 112 194 132" />
                <path d="M 172 108 Q 186 116 190 136" />
                <path d="M 170 114 Q 182 122 186 142" />
              </g>

              {/* ─── I. PECTORALIS MAJOR DEFINITION ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.75">
                {/* Left Pec boundary */}
                <path d="M 118 100 Q 78 108 72 130 Q 76 150 98 156 Q 114 152 118 140" strokeWidth="1.1" />
                {/* Left Pec belly curve */}
                <path d="M 80 118 Q 96 126 114 122" strokeWidth="0.7" opacity="0.5" />
                <path d="M 76 132 Q 94 140 114 134" strokeWidth="0.6" opacity="0.4" />
                {/* Right Pec boundary */}
                <path d="M 122 100 Q 162 108 168 130 Q 164 150 142 156 Q 126 152 122 140" strokeWidth="1.1" />
                {/* Right Pec belly curve */}
                <path d="M 160 118 Q 144 126 126 122" strokeWidth="0.7" opacity="0.5" />
                <path d="M 164 132 Q 146 140 126 134" strokeWidth="0.6" opacity="0.4" />
                {/* Sternal cleft */}
                <line x1="120" y1="100" x2="120" y2="160" strokeWidth="1.3" />
              </g>

              {/* ─── J. RECTUS ABDOMINIS (6-PACK) ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.7">
                {/* Abs top pair */}
                <rect x="100" y="162" width="17" height="18" rx="3" strokeWidth="0.9" />
                <rect x="123" y="162" width="17" height="18" rx="3" strokeWidth="0.9" />
                {/* Abs mid pair */}
                <rect x="100" y="184" width="17" height="19" rx="3" strokeWidth="0.9" />
                <rect x="123" y="184" width="17" height="19" rx="3" strokeWidth="0.9" />
                {/* Abs lower pair */}
                <rect x="101" y="207" width="16" height="20" rx="3" strokeWidth="0.9" />
                <rect x="123" y="207" width="16" height="20" rx="3" strokeWidth="0.9" />
                {/* Linea alba */}
                <line x1="120" y1="160" x2="120" y2="232" strokeWidth="1.1" />
                {/* Tendinous inscriptions */}
                <line x1="98" y1="182" x2="142" y2="182" strokeWidth="0.7" />
                <line x1="98" y1="205" x2="142" y2="205" strokeWidth="0.7" />
                {/* Navel */}
                <circle cx="120" cy="210" r="2" strokeWidth="0.7" />
              </g>

              {/* ─── K. SERRATUS ANTERIOR ─── */}
              <g stroke="#00d4ff" strokeWidth="0.7" fill="none" opacity="0.5">
                <path d="M 78 162 Q 86 164 94 160" />
                <path d="M 76 174 Q 84 176 92 172" />
                <path d="M 76 186 Q 84 188 92 184" />
                <path d="M 162 162 Q 154 164 146 160" />
                <path d="M 164 174 Q 156 176 148 172" />
                <path d="M 164 186 Q 156 188 148 184" />
              </g>

              {/* ─── L. OBLIQUES & V-TAPER ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.65">
                <path d="M 82 230 C 96 244 110 254 118 260" strokeWidth="1" />
                <path d="M 158 230 C 144 244 130 254 122 260" strokeWidth="1" />
                <path d="M 80 220 C 92 234 106 244 116 250" strokeWidth="0.6" opacity="0.4" />
                <path d="M 160 220 C 148 234 134 244 124 250" strokeWidth="0.6" opacity="0.4" />
              </g>

              {/* ─── M. ARM CROSS-CONTOUR WRAPPING CURVES ─── */}
              <g stroke="#00d4ff" fill="none" strokeWidth="0.6" opacity="0.5">
                {/* Left arm contours (bicep/forearm wraps) */}
                <path d="M 44 136 Q 52 134 58 138" />
                <path d="M 46 150 Q 54 148 60 152" />
                <path d="M 50 168 Q 56 166 64 170" />
                <path d="M 48 188 Q 54 186 62 190" />
                <path d="M 46 208 Q 52 206 60 210" />
                <path d="M 44 228 Q 50 226 58 230" />
                {/* Bicep peak line left */}
                <path d="M 48 130 Q 56 140 52 158" strokeWidth="0.8" opacity="0.6" />
                {/* Right arm contours */}
                <path d="M 196 136 Q 188 134 182 138" />
                <path d="M 194 150 Q 186 148 180 152" />
                <path d="M 190 168 Q 184 166 176 170" />
                <path d="M 192 188 Q 186 186 178 190" />
                <path d="M 194 208 Q 188 206 180 210" />
                <path d="M 196 228 Q 190 226 182 230" />
                {/* Bicep peak line right */}
                <path d="M 192 130 Q 184 140 188 158" strokeWidth="0.8" opacity="0.6" />
              </g>

              {/* ─── N. QUADRICEPS DEFINITION ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.65">
                {/* Left quad outer (vastus lateralis) */}
                <path d="M 84 268 Q 72 296 70 330 Q 72 348 80 358" strokeWidth="1" />
                {/* Left quad inner (vastus medialis teardrop) */}
                <path d="M 106 296 Q 112 320 104 350" strokeWidth="0.9" />
                {/* Left rectus femoris center */}
                <line x1="92" y1="272" x2="94" y2="346" strokeWidth="0.7" strokeDasharray="3 3" />
                {/* Right quad outer */}
                <path d="M 156 268 Q 168 296 170 330 Q 168 348 160 358" strokeWidth="1" />
                {/* Right quad inner */}
                <path d="M 134 296 Q 128 320 136 350" strokeWidth="0.9" />
                {/* Right rectus femoris */}
                <line x1="148" y1="272" x2="146" y2="346" strokeWidth="0.7" strokeDasharray="3 3" />
              </g>

              {/* ─── O. LEG CROSS-CONTOUR WRAPPING CURVES ─── */}
              <g stroke="#00d4ff" fill="none" strokeWidth="0.6" opacity="0.45">
                {/* Left thigh wraps */}
                <path d="M 76 284 Q 92 280 108 286" />
                <path d="M 72 300 Q 88 296 106 302" />
                <path d="M 70 316 Q 86 312 104 318" />
                <path d="M 70 332 Q 86 328 102 334" />
                {/* Right thigh wraps */}
                <path d="M 164 284 Q 148 280 132 286" />
                <path d="M 168 300 Q 152 296 134 302" />
                <path d="M 170 316 Q 154 312 136 318" />
                <path d="M 170 332 Q 154 328 138 334" />
              </g>

              {/* ─── P. KNEECAP CONTOURS ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.7">
                <ellipse cx="92" cy="360" rx="8" ry="9" strokeWidth="1" />
                <path d="M 86 356 Q 92 350 98 356" strokeWidth="0.7" />
                <ellipse cx="148" cy="360" rx="8" ry="9" strokeWidth="1" />
                <path d="M 142 356 Q 148 350 154 356" strokeWidth="0.7" />
              </g>

              {/* ─── Q. CALF CONTOURS (GASTROCNEMIUS) ─── */}
              <g stroke="#00d4ff" fill="none" opacity="0.6">
                {/* Left calf muscle definition */}
                <path d="M 80 376 Q 72 396 80 424" strokeWidth="1" />
                <path d="M 100 376 Q 104 396 96 424" strokeWidth="1" />
                <path d="M 86 380 Q 80 398 86 418" strokeWidth="0.6" opacity="0.4" />
                {/* Left calf wraps */}
                <path d="M 76 388 Q 88 384 100 390" strokeWidth="0.5" />
                <path d="M 78 404 Q 88 400 98 406" strokeWidth="0.5" />
                <path d="M 80 420 Q 88 416 96 422" strokeWidth="0.5" />
                {/* Right calf */}
                <path d="M 160 376 Q 168 396 160 424" strokeWidth="1" />
                <path d="M 140 376 Q 136 396 144 424" strokeWidth="1" />
                <path d="M 154 380 Q 160 398 154 418" strokeWidth="0.6" opacity="0.4" />
                <path d="M 164 388 Q 152 384 140 390" strokeWidth="0.5" />
                <path d="M 162 404 Q 152 400 142 406" strokeWidth="0.5" />
                <path d="M 160 420 Q 152 416 144 422" strokeWidth="0.5" />
              </g>

              {/* ─── R. TORSO CROSS-SECTION CURVES (3D depth arcs) ─── */}
              <g stroke="#00d4ff" fill="none" strokeWidth="0.55" opacity="0.4">
                <path d="M 72 106 Q 120 116 168 106" />
                <path d="M 72 120 Q 120 130 168 120" />
                <path d="M 74 140 Q 120 152 166 140" />
                <path d="M 76 160 Q 120 170 164 160" />
                <path d="M 78 200 Q 120 210 162 200" />
                <path d="M 80 220 Q 120 230 160 220" />
                <path d="M 82 240 Q 120 250 158 240" />
              </g>
            </g>

            {/* ═══════════════════════════════════════ */}
            {/*   LAYER 2: NEURAL LIGHT FLOW           */}
            {/* ═══════════════════════════════════════ */}
            <g className="transition-opacity duration-500" opacity={showNeural ? 1 : 0.08}>
              {/* Brain cortex synaptic core */}
              <g filter="url(#rimGlow)">
                <path d="M 120 28 C 104 28 100 42 108 52 Q 116 56 120 60" stroke="#00d4ff" strokeWidth="1.4" fill="none" />
                <path d="M 120 28 C 136 28 140 42 132 52 Q 124 56 120 60" stroke="#00d4ff" strokeWidth="1.4" fill="none" />
                <circle cx="120" cy="40" r="4" fill="#00d4ff" filter="url(#nodeGlow)" opacity="0.85" />
                <circle cx="120" cy="40" r="1.8" fill="#fff" />
              </g>

              {/* Spinal cord */}
              <g>
                <line x1="120" y1="62" x2="120" y2="260" stroke="#0077aa" strokeWidth="3" strokeOpacity="0.35" />
                <line x1="120" y1="62" x2="120" y2="260" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#rimGlow)"
                  style={{ strokeDasharray: '8 12', animation: `neuralFlow ${neuralSpeed}s linear infinite` }} />
                <circle r="3" fill="#fff" filter="url(#nodeGlow)">
                  <animateMotion path="M 120 62 L 120 260" dur={`${neuralSpeed}s`} repeatCount="indefinite" />
                </circle>
                <circle r="2" fill="#00d4ff" filter="url(#nodeGlow)">
                  <animateMotion path="M 120 62 L 120 260" begin={`${+neuralSpeed/2}s`} dur={`${neuralSpeed}s`} repeatCount="indefinite" />
                </circle>
              </g>

              {/* Left brachial plexus */}
              <g>
                <path d="M 120 84 C 96 92 74 104 64 124 C 54 146 50 186 46 226 L 44 268" stroke="#00d4ff" strokeWidth="1.6" fill="none" filter="url(#rimGlow)"
                  style={{ strokeDasharray: '6 10', animation: `neuralFlow ${+neuralSpeed*1.15}s linear infinite` }} />
                <path d="M 64 124 C 60 150 56 194 50 232 L 48 268" stroke="#22d3ee" strokeWidth="0.9" fill="none" strokeOpacity="0.6"
                  style={{ strokeDasharray: '4 8', animation: `neuralFlow ${+neuralSpeed*1.3}s linear infinite` }} />
                <circle r="2.2" fill="#fff" filter="url(#nodeGlow)">
                  <animateMotion path="M 120 84 C 96 92 74 104 64 124 C 54 146 50 186 46 226 L 44 268" dur={`${+neuralSpeed*1.15}s`} repeatCount="indefinite" />
                </circle>
              </g>

              {/* Right brachial plexus */}
              <g>
                <path d="M 120 84 C 144 92 166 104 176 124 C 186 146 190 186 194 226 L 196 268" stroke="#00d4ff" strokeWidth="1.6" fill="none" filter="url(#rimGlow)"
                  style={{ strokeDasharray: '6 10', animation: `neuralFlow ${+neuralSpeed*1.15}s linear infinite` }} />
                <path d="M 176 124 C 180 150 184 194 190 232 L 192 268" stroke="#22d3ee" strokeWidth="0.9" fill="none" strokeOpacity="0.6"
                  style={{ strokeDasharray: '4 8', animation: `neuralFlow ${+neuralSpeed*1.3}s linear infinite` }} />
                <circle r="2.2" fill="#fff" filter="url(#nodeGlow)">
                  <animateMotion path="M 120 84 C 144 92 166 104 176 124 C 186 146 190 186 194 226 L 196 268" dur={`${+neuralSpeed*1.15}s`} repeatCount="indefinite" />
                </circle>
              </g>

              {/* Thoracic intercostal arcs */}
              <g stroke="#00d4ff" strokeWidth="0.9" fill="none" opacity="0.7">
                <path d="M 120 108 Q 92 118 72 130" style={{ strokeDasharray: '4 6', animation: `neuralFlow ${+neuralSpeed*1.1}s linear infinite` }} />
                <path d="M 120 108 Q 148 118 168 130" style={{ strokeDasharray: '4 6', animation: `neuralFlow ${+neuralSpeed*1.1}s linear infinite` }} />
                <path d="M 120 130 Q 90 142 76 156" style={{ strokeDasharray: '5 7', animation: `neuralFlow ${+neuralSpeed*1.2}s linear infinite` }} />
                <path d="M 120 130 Q 150 142 164 156" style={{ strokeDasharray: '5 7', animation: `neuralFlow ${+neuralSpeed*1.2}s linear infinite` }} />
                <path d="M 120 164 Q 96 178 82 196" style={{ strokeDasharray: '4 6', animation: `neuralFlow ${+neuralSpeed*1.3}s linear infinite` }} />
                <path d="M 120 164 Q 144 178 158 196" style={{ strokeDasharray: '4 6', animation: `neuralFlow ${+neuralSpeed*1.3}s linear infinite` }} />
              </g>

              {/* Cardiac autonomic plexus */}
              <path d="M 120 122 Q 130 138 126 156 Q 116 142 120 122" stroke={organStrains.cardiovascular?.strain === 'critical' ? '#ef4444' : '#00d4ff'} strokeWidth="1.3" fill="none" filter="url(#rimGlow)" className="animate-pulse" />
              {/* Celiac plexus starburst */}
              <g stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.7" fill="none">
                <line x1="120" y1="190" x2="106" y2="182" strokeDasharray="2 3" />
                <line x1="120" y1="190" x2="134" y2="182" strokeDasharray="2 3" />
                <line x1="120" y1="190" x2="104" y2="200" strokeDasharray="2 3" />
                <line x1="120" y1="190" x2="136" y2="200" strokeDasharray="2 3" />
              </g>

              {/* Left leg sciatic/femoral */}
              <g>
                <path d="M 120 256 C 102 274 92 310 90 354 C 88 386 84 420 82 450" stroke="#00d4ff" strokeWidth="1.6" fill="none" filter="url(#rimGlow)"
                  style={{ strokeDasharray: '6 10', animation: `neuralFlow ${+neuralSpeed*1.25}s linear infinite` }} />
                <path d="M 120 256 C 84 282 76 326 82 368 C 86 400 84 428 86 450" stroke="#22d3ee" strokeWidth="0.9" fill="none" strokeOpacity="0.6"
                  style={{ strokeDasharray: '4 8', animation: `neuralFlow ${+neuralSpeed*1.4}s linear infinite` }} />
                <circle r="2.3" fill="#fff" filter="url(#nodeGlow)">
                  <animateMotion path="M 120 256 C 102 274 92 310 90 354 C 88 386 84 420 82 450" dur={`${+neuralSpeed*1.25}s`} repeatCount="indefinite" />
                </circle>
              </g>

              {/* Right leg sciatic/femoral */}
              <g>
                <path d="M 120 256 C 138 274 148 310 150 354 C 152 386 156 420 158 450" stroke="#00d4ff" strokeWidth="1.6" fill="none" filter="url(#rimGlow)"
                  style={{ strokeDasharray: '6 10', animation: `neuralFlow ${+neuralSpeed*1.25}s linear infinite` }} />
                <path d="M 120 256 C 156 282 164 326 158 368 C 154 400 156 428 154 450" stroke="#22d3ee" strokeWidth="0.9" fill="none" strokeOpacity="0.6"
                  style={{ strokeDasharray: '4 8', animation: `neuralFlow ${+neuralSpeed*1.4}s linear infinite` }} />
                <circle r="2.3" fill="#fff" filter="url(#nodeGlow)">
                  <animateMotion path="M 120 256 C 138 274 148 310 150 354 C 152 386 156 420 158 450" dur={`${+neuralSpeed*1.25}s`} repeatCount="indefinite" />
                </circle>
              </g>

              {/* Synapse ganglia beacons */}
              <g filter="url(#nodeGlow)">
                <circle cx="120" cy="84" r="3" fill="#00d4ff" />
                <circle cx="126" cy="142" r="3" fill={organStrains.cardiovascular?.strain === 'critical' ? '#ef4444' : '#00d4ff'} />
                <circle cx="120" cy="190" r="2.5" fill="#22d3ee" />
                <circle cx="120" cy="256" r="3" fill="#00d4ff" />
                <circle cx="64" cy="124" r="2.5" fill="#22d3ee" />
                <circle cx="176" cy="124" r="2.5" fill="#22d3ee" />
                <circle cx="92" cy="360" r="2.5" fill="#22d3ee" />
                <circle cx="148" cy="360" r="2.5" fill="#22d3ee" />
              </g>
            </g>
          </svg>

          {/* ═══ ORGAN NODES OVERLAY ═══ */}
          {ORGAN_SYSTEMS.map((organ) => {
            const strainInfo = organStrains[organ.id] || { strain: 'normal', notes: '' };
            const colors = getStrainColor(strainInfo.strain);
            const isSelected = selectedOrgan?.id === organ.id;
            return (
              <div key={organ.id}
                onClick={() => setSelectedOrgan(isSelected ? null : { ...organ, ...strainInfo })}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                style={{ left: `${organ.position.x}%`, top: `${organ.position.y}%` }}
              >
                <div className="absolute inset-0 rounded-full animate-ping opacity-50 pointer-events-none"
                  style={{ backgroundColor: colors.fill, animationDuration: `${pulseDuration}s` }} />
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-125 border-2 shadow-lg backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(2,10,24,0.9)', borderColor: colors.fill, boxShadow: `0 0 18px ${colors.glow}` }}>
                  <div style={{ color: colors.fill }}>{getOrganIcon(organ.icon)}</div>
                </div>
                <div className={`absolute left-1/2 -translate-x-1/2 top-9 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap pointer-events-none transition-all duration-200 shadow-md ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 group-hover:scale-100'}`}
                  style={{ backgroundColor: 'rgba(2,10,24,0.95)', color: colors.fill, border: `1px solid ${colors.fill}` }}>
                  {organ.shortName} &bull; {strainInfo.strain}
                </div>
              </div>
            );
          })}

          {/* Selected organ popover */}
          {selectedOrgan && (
            <div className="absolute top-2 left-2 right-2 p-3.5 rounded-2xl bg-[#020a18]/95 border border-cyan-800/60 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-150 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: getStrainColor(selectedOrgan.strain).fill }}>
                    {getOrganIcon(selectedOrgan.icon)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">{selectedOrgan.name}</h4>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getStrainColor(selectedOrgan.strain).badge}`}>
                      Strain: {selectedOrgan.strain}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedOrgan(null)} className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs">&#x2715;</button>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">{selectedOrgan.notes || selectedOrgan.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ BOTTOM ECG STRIP ═══ */}
      <div className="w-full bg-[#020a18]/90 rounded-2xl p-3 border border-cyan-900/40 z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Heart className="w-4 h-4 fill-cyan-400 animate-pulse" style={{ animationDuration: `${pulseDuration}s` }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{heartRate} BPM</span>
              <span className="text-[10px] text-slate-400">Sinus Telemetry</span>
            </div>
            <p className="text-[10px] text-cyan-400 font-mono">QRS: 0.08s &bull; QT: 0.38s &bull; Mesh: Active</p>
          </div>
        </div>
        <div className="w-full sm:w-44 h-8 overflow-hidden relative">
          <svg viewBox="0 0 200 40" className="w-full h-full stroke-cyan-400 fill-none stroke-[2]">
            <path d="M 0 20 L 30 20 L 35 15 L 40 25 L 45 5 L 50 35 L 55 18 L 60 20 L 100 20 L 105 15 L 110 25 L 115 5 L 120 35 L 125 18 L 130 20 L 170 20 L 175 15 L 180 25 L 185 5 L 190 35 L 195 18 L 200 20" />
          </svg>
        </div>
        <div className="text-[10px] text-cyan-400/60 hidden lg:block text-right">Hover to orbit 3D &bull; Click organs for readings</div>
      </div>
    </div>
  );
}
