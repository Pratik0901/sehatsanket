/**
 * Digital Twin Configuration
 * Clinical reference bounds, normal healthy defaults, warning/critical thresholds,
 * and demonstration scenario presets for physiological simulations.
 */

export const DEFAULT_HEALTHY_VITALS = {
  heartRate: 78,
  systolicBp: 120,
  diastolicBp: 80,
  spo2: 98,
  temperature: 98.6,
  respiratoryRate: 16,
  glucose: 95
};

export const VITAL_BOUNDS = {
  heartRate: {
    min: 40,
    max: 200,
    step: 1,
    unit: 'BPM',
    label: 'Heart Rate',
    icon: 'Heart',
    normalMin: 60,
    normalMax: 100,
    warningLow: 50,
    warningHigh: 101,
    criticalLow: 45,
    criticalHigh: 130
  },
  systolicBp: {
    min: 70,
    max: 220,
    step: 1,
    unit: 'mmHg',
    label: 'Systolic BP',
    icon: 'Activity',
    normalMin: 90,
    normalMax: 129,
    warningLow: 85,
    warningHigh: 130,
    criticalLow: 80,
    criticalHigh: 160
  },
  diastolicBp: {
    min: 40,
    max: 130,
    step: 1,
    unit: 'mmHg',
    label: 'Diastolic BP',
    icon: 'Activity',
    normalMin: 60,
    normalMax: 84,
    warningLow: 55,
    warningHigh: 85,
    criticalLow: 50,
    criticalHigh: 100
  },
  spo2: {
    min: 70,
    max: 100,
    step: 1,
    unit: '%',
    label: 'SpO₂ Saturation',
    icon: 'Wind',
    normalMin: 95,
    normalMax: 100,
    warningLow: 92,
    warningHigh: 100,
    criticalLow: 89,
    criticalHigh: 100
  },
  temperature: {
    min: 94.0,
    max: 106.0,
    step: 0.1,
    unit: '°F',
    label: 'Body Temperature',
    icon: 'Thermometer',
    normalMin: 97.6,
    normalMax: 99.1,
    warningLow: 96.0,
    warningHigh: 99.5,
    criticalLow: 95.0,
    criticalHigh: 101.5
  },
  respiratoryRate: {
    min: 8,
    max: 50,
    step: 1,
    unit: '/min',
    label: 'Respiratory Rate',
    icon: 'Lungs',
    normalMin: 12,
    normalMax: 20,
    warningLow: 10,
    warningHigh: 21,
    criticalLow: 8,
    criticalHigh: 25
  },
  glucose: {
    min: 40,
    max: 450,
    step: 1,
    unit: 'mg/dL',
    label: 'Blood Glucose',
    icon: 'Droplets',
    normalMin: 70,
    normalMax: 125,
    warningLow: 65,
    warningHigh: 126,
    criticalLow: 55,
    criticalHigh: 200
  }
};

export const DEMO_PRESETS = [
  {
    id: 'normal',
    name: 'Normal Baseline',
    badge: '🟢 Stable',
    description: 'Default healthy homeostasis (All 6 biomarkers optimal)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    vitals: { ...DEFAULT_HEALTHY_VITALS }
  },
  {
    id: 'fever_tachycardia',
    name: 'Pyrexia & Tachycardia',
    badge: '🟠 Elevated Risk',
    description: 'Elevated core temperature with compensatory sinus tachycardia',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    vitals: {
      heartRate: 112,
      systolicBp: 124,
      diastolicBp: 82,
      spo2: 97,
      temperature: 101.8,
      respiratoryRate: 20,
      glucose: 105
    }
  },
  {
    id: 'hypoxemia_tachypnea',
    name: 'Acute Hypoxemic Distress',
    badge: '🔴 High Risk',
    description: 'Desaturation with marked compensatory tachypnea (Requires urgent care)',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
    vitals: {
      heartRate: 118,
      systolicBp: 132,
      diastolicBp: 86,
      spo2: 88,
      temperature: 99.2,
      respiratoryRate: 28,
      glucose: 110
    }
  },
  {
    id: 'hypertensive_crisis',
    name: 'Hypertensive Urgency',
    badge: '🔴 High Risk',
    description: 'Marked arterial pressure elevation with elevated cardiovascular workload',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    vitals: {
      heartRate: 105,
      systolicBp: 185,
      diastolicBp: 110,
      spo2: 96,
      temperature: 98.6,
      respiratoryRate: 22,
      glucose: 140
    }
  },
  {
    id: 'hyperglycemic_stress',
    name: 'Marked Hyperglycemia',
    badge: '🟠 Elevated Risk',
    description: 'Marked glycemic spike with osmotic dehydration and elevated HR',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    vitals: {
      heartRate: 102,
      systolicBp: 138,
      diastolicBp: 88,
      spo2: 97,
      temperature: 99.0,
      respiratoryRate: 20,
      glucose: 285
    }
  }
];

export const ORGAN_SYSTEMS = [
  {
    id: 'neurological',
    name: 'Brain / Neurological',
    shortName: 'Brain',
    description: 'Cerebral oxygenation, perfusion & glycemic regulation',
    icon: 'Brain',
    position: { x: 50, y: 15 }
  },
  {
    id: 'cardiovascular',
    name: 'Heart / Cardiovascular',
    shortName: 'Heart',
    description: 'Heart rate, pulse regularity & cardiac workload',
    icon: 'Heart',
    position: { x: 54, y: 35 }
  },
  {
    id: 'pulmonary',
    name: 'Lungs / Respiratory',
    shortName: 'Lungs',
    description: 'Ventilation rate & alveolar oxygen exchange (SpO₂)',
    icon: 'Wind',
    position: { x: 44, y: 33 }
  },
  {
    id: 'vascular',
    name: 'Circulatory / Vascular',
    shortName: 'Vessels',
    description: 'Systemic vascular resistance & arterial blood pressure',
    icon: 'Activity',
    position: { x: 48, y: 52 }
  },
  {
    id: 'metabolic',
    name: 'Pancreas / Metabolic',
    shortName: 'Metabolic',
    description: 'Glycemic homeostasis & cellular energy metabolism',
    icon: 'Droplets',
    position: { x: 53, y: 44 }
  },
  {
    id: 'thermoregulatory',
    name: 'Systemic / Thermoregulation',
    shortName: 'Systemic',
    description: 'Core body temperature & inflammatory response',
    icon: 'Thermometer',
    position: { x: 50, y: 68 }
  }
];
