import React from 'react';
import { Heart, Activity, Wind, Thermometer, Droplets, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VITAL_BOUNDS } from '../../utils/digitalTwinConfig';

export function VitalCards({ vitals, analysis }) {
  const vitalStatuses = analysis?.vitalStatuses || {};

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Critical':
        return {
          bg: 'bg-red-500/15 text-red-700 border-red-300',
          dot: 'bg-red-500',
          label: 'Critical'
        };
      case 'Elevated':
        return {
          bg: 'bg-orange-500/15 text-orange-700 border-orange-300',
          dot: 'bg-orange-500',
          label: 'Elevated'
        };
      case 'Borderline':
        return {
          bg: 'bg-amber-500/15 text-amber-700 border-amber-300',
          dot: 'bg-amber-500',
          label: 'Moderate'
        };
      case 'Normal':
      default:
        return {
          bg: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Normal'
        };
    }
  };

  const cardsData = [
    {
      id: 'heartRate',
      label: 'Heart Rate',
      value: vitals?.heartRate || 78,
      unit: 'BPM',
      normalRange: '60 - 100',
      status: vitalStatuses.heartRate || 'Normal',
      icon: <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />,
      colorClass: 'from-rose-500/10 to-rose-50 border-rose-200/80',
      barPercent: Math.min(100, Math.max(10, ((vitals?.heartRate || 78) - 40) / (180 - 40) * 100))
    },
    {
      id: 'bloodPressure',
      label: 'Blood Pressure',
      value: `${vitals?.systolicBp || 120}/${vitals?.diastolicBp || 80}`,
      unit: 'mmHg',
      normalRange: '90-129 / 60-84',
      status: vitalStatuses.systolicBp || 'Normal',
      icon: <Activity className="w-5 h-5 text-indigo-600" />,
      colorClass: 'from-indigo-500/10 to-indigo-50 border-indigo-200/80',
      barPercent: Math.min(100, Math.max(10, ((vitals?.systolicBp || 120) - 70) / (200 - 70) * 100))
    },
    {
      id: 'spo2',
      label: 'SpO₂ Saturation',
      value: vitals?.spo2 || 98,
      unit: '%',
      normalRange: '95 - 100%',
      status: vitalStatuses.spo2 || 'Normal',
      icon: <Wind className="w-5 h-5 text-cyan-600" />,
      colorClass: 'from-cyan-500/10 to-cyan-50 border-cyan-200/80',
      barPercent: Math.min(100, Math.max(10, (vitals?.spo2 || 98)))
    },
    {
      id: 'temperature',
      label: 'Body Temperature',
      value: Number(vitals?.temperature || 98.6).toFixed(1),
      unit: '°F',
      normalRange: '97.6 - 99.1°F',
      status: vitalStatuses.temperature || 'Normal',
      icon: <Thermometer className="w-5 h-5 text-amber-600" />,
      colorClass: 'from-amber-500/10 to-amber-50 border-amber-200/80',
      barPercent: Math.min(100, Math.max(10, ((vitals?.temperature || 98.6) - 94) / (106 - 94) * 100))
    },
    {
      id: 'respiratoryRate',
      label: 'Respiratory Rate',
      value: vitals?.respiratoryRate || 16,
      unit: '/min',
      normalRange: '12 - 20',
      status: vitalStatuses.respiratoryRate || 'Normal',
      icon: <Wind className="w-5 h-5 text-teal-600" />,
      colorClass: 'from-teal-500/10 to-teal-50 border-teal-200/80',
      barPercent: Math.min(100, Math.max(10, ((vitals?.respiratoryRate || 16) - 8) / (45 - 8) * 100))
    },
    {
      id: 'glucose',
      label: 'Blood Glucose',
      value: vitals?.glucose || 95,
      unit: 'mg/dL',
      normalRange: '70 - 125',
      status: vitalStatuses.glucose || 'Normal',
      icon: <Droplets className="w-5 h-5 fill-emerald-600 text-emerald-600" />,
      colorClass: 'from-emerald-500/10 to-emerald-50 border-emerald-200/80',
      barPercent: Math.min(100, Math.max(10, ((vitals?.glucose || 95) - 50) / (350 - 50) * 100))
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
      {cardsData.map((card) => {
        const badge = getStatusBadge(card.status);
        const isAbnormal = card.status !== 'Normal';

        return (
          <div
            key={card.id}
            className={`p-4 rounded-3xl bg-gradient-to-br ${card.colorClass} bg-white border shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
          >
            {/* Top row: Icon & Status pill */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-white shadow-xs flex items-center justify-center">
                {card.icon}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span>{badge.label}</span>
              </span>
            </div>

            {/* Middle row: Big Value & Unit */}
            <div className="my-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {card.unit}
                </span>
              </div>
              <span className="text-xs font-extrabold text-slate-700 block mt-0.5">
                {card.label}
              </span>
            </div>

            {/* Bottom row: Reference Range & Mini Level Gauge */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>Normal: {card.normalRange}</span>
                {isAbnormal && (
                  <span className="flex items-center gap-0.5 text-red-600 font-bold">
                    <AlertTriangle className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Progress Mini Bar */}
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    card.status === 'Critical' ? 'bg-red-500' :
                    card.status === 'Elevated' ? 'bg-orange-500' :
                    card.status === 'Borderline' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${card.barPercent}%` }}
                />
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
