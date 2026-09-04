/**
 * Digital Twin Physiological Analysis Engine
 * Multi-vital correlation, risk scoring, organ strain mapping, future trajectory synthesis,
 * and clinician-reviewable medication/treatment considerations.
 */

import { VITAL_BOUNDS, DEFAULT_HEALTHY_VITALS } from './digitalTwinConfig';

/**
 * Validates and clamps a vital parameter within sensible physiological bounds
 */
export function validateVital(paramKey, val) {
  const bounds = VITAL_BOUNDS[paramKey];
  if (!bounds) return Number(val);
  const num = Number(val);
  if (isNaN(num)) return bounds.normalMin;
  return Math.max(bounds.min, Math.min(bounds.max, num));
}

/**
 * Evaluates individual biomarkers and compound multi-vital synergies
 * to produce a complete physiological Digital Twin assessment.
 *
 * @param {Object} vitals - Current vital inputs
 * @returns {Object} Complete analysis breakdown
 */
export function analyzeDigitalTwin(vitals = {}) {
  // 1. Sanitize & Normalize Inputs
  const hr = validateVital('heartRate', vitals.heartRate ?? DEFAULT_HEALTHY_VITALS.heartRate);
  const sbp = validateVital('systolicBp', vitals.systolicBp ?? DEFAULT_HEALTHY_VITALS.systolicBp);
  const dbp = validateVital('diastolicBp', vitals.diastolicBp ?? DEFAULT_HEALTHY_VITALS.diastolicBp);
  const spo2 = validateVital('spo2', vitals.spo2 ?? DEFAULT_HEALTHY_VITALS.spo2);
  const temp = validateVital('temperature', vitals.temperature ?? DEFAULT_HEALTHY_VITALS.temperature);
  const rr = validateVital('respiratoryRate', vitals.respiratoryRate ?? DEFAULT_HEALTHY_VITALS.respiratoryRate);
  const glucose = validateVital('glucose', vitals.glucose ?? DEFAULT_HEALTHY_VITALS.glucose);

  const abnormalities = [];
  const organStrains = {
    neurological: { strain: 'normal', score: 5, notes: 'Normal cerebral perfusion' },
    cardiovascular: { strain: 'normal', score: 5, notes: 'Normal cardiac rhythm and workload' },
    pulmonary: { strain: 'normal', score: 5, notes: 'Adequate ventilation & alveolar exchange' },
    vascular: { strain: 'normal', score: 5, notes: 'Normal systemic vascular resistance' },
    metabolic: { strain: 'normal', score: 5, notes: 'Euglycemic metabolic state' },
    thermoregulatory: { strain: 'normal', score: 5, notes: 'Afebrile, normal thermoregulation' }
  };

  const subScores = [];

  // --- 1. Heart Rate Evaluation (Normal: 60-100 BPM) ---
  let hrStatus = 'Normal';
  if (hr > 130 || hr < 45) {
    hrStatus = 'Critical';
    subScores.push(85);
    organStrains.cardiovascular.strain = 'critical';
    organStrains.cardiovascular.notes = hr > 130 ? 'Severe tachycardia causing myocardial strain' : 'Severe bradycardia, hypoperfusion risk';
    abnormalities.push({
      parameter: 'Heart Rate',
      value: `${hr} BPM`,
      severity: 'Critical',
      finding: hr > 130 ? 'Severe Tachycardia (>130 BPM)' : 'Severe Bradycardia (<45 BPM)',
      system: 'Cardiovascular'
    });
  } else if (hr > 100) {
    hrStatus = 'Elevated';
    subScores.push(45);
    organStrains.cardiovascular.strain = 'elevated';
    organStrains.cardiovascular.notes = 'Sinus tachycardia, elevated cardiac demand';
    abnormalities.push({
      parameter: 'Heart Rate',
      value: `${hr} BPM`,
      severity: 'Elevated',
      finding: 'Sinus Tachycardia (101-130 BPM)',
      system: 'Cardiovascular'
    });
  } else if (hr < 60) {
    hrStatus = 'Borderline';
    subScores.push(25);
    organStrains.cardiovascular.strain = 'moderate';
    organStrains.cardiovascular.notes = 'Mild bradycardia';
    abnormalities.push({
      parameter: 'Heart Rate',
      value: `${hr} BPM`,
      severity: 'Moderate',
      finding: 'Mild Sinus Bradycardia (<60 BPM)',
      system: 'Cardiovascular'
    });
  } else {
    subScores.push(5);
  }

  // --- 2. Blood Pressure Evaluation (Normal: 90-129 / 60-84 mmHg) ---
  let bpStatus = 'Normal';
  if (sbp >= 180 || dbp >= 110) {
    bpStatus = 'Critical';
    subScores.push(90);
    organStrains.vascular.strain = 'critical';
    organStrains.vascular.notes = 'Hypertensive urgency/crisis range';
    organStrains.neurological.strain = 'elevated';
    organStrains.neurological.notes = 'Elevated cerebrovascular pressure';
    abnormalities.push({
      parameter: 'Blood Pressure',
      value: `${sbp}/${dbp} mmHg`,
      severity: 'Critical',
      finding: 'Hypertensive Urgency / Crisis Range',
      system: 'Vascular'
    });
  } else if (sbp >= 140 || dbp >= 90) {
    bpStatus = 'Elevated';
    subScores.push(55);
    organStrains.vascular.strain = 'elevated';
    organStrains.vascular.notes = 'Stage 2 hypertension, arterial stiffness';
    abnormalities.push({
      parameter: 'Blood Pressure',
      value: `${sbp}/${dbp} mmHg`,
      severity: 'Elevated',
      finding: 'Stage 2 Hypertension',
      system: 'Vascular'
    });
  } else if (sbp >= 130 || dbp >= 85) {
    bpStatus = 'Borderline';
    subScores.push(30);
    organStrains.vascular.strain = 'moderate';
    organStrains.vascular.notes = 'Prehypertensive arterial pressure';
    abnormalities.push({
      parameter: 'Blood Pressure',
      value: `${sbp}/${dbp} mmHg`,
      severity: 'Moderate',
      finding: 'Prehypertension (Stage 1)',
      system: 'Vascular'
    });
  } else if (sbp < 90 || dbp < 60) {
    bpStatus = 'Elevated';
    subScores.push(60);
    organStrains.vascular.strain = 'elevated';
    organStrains.vascular.notes = 'Systemic hypotension, risk of inadequate perfusion';
    abnormalities.push({
      parameter: 'Blood Pressure',
      value: `${sbp}/${dbp} mmHg`,
      severity: 'Elevated',
      finding: 'Systemic Hypotension',
      system: 'Vascular'
    });
  } else {
    subScores.push(5);
  }

  // --- 3. SpO2 Oxygen Saturation Evaluation (Normal: 95-100%) ---
  let spo2Status = 'Normal';
  if (spo2 < 89) {
    spo2Status = 'Critical';
    subScores.push(95);
    organStrains.pulmonary.strain = 'critical';
    organStrains.pulmonary.notes = 'Severe arterial hypoxemia, tissue hypoxia';
    organStrains.neurological.strain = 'critical';
    organStrains.neurological.notes = 'Cerebral oxygen desaturation alert';
    abnormalities.push({
      parameter: 'SpO₂ Saturation',
      value: `${spo2}%`,
      severity: 'Critical',
      finding: 'Severe Arterial Hypoxemia (<89%)',
      system: 'Respiratory'
    });
  } else if (spo2 < 93) {
    spo2Status = 'Elevated';
    subScores.push(70);
    organStrains.pulmonary.strain = 'elevated';
    organStrains.pulmonary.notes = 'Moderate alveolar-capillary desaturation';
    abnormalities.push({
      parameter: 'SpO₂ Saturation',
      value: `${spo2}%`,
      severity: 'Elevated',
      finding: 'Moderate Hypoxemia (89-92%)',
      system: 'Respiratory'
    });
  } else if (spo2 < 95) {
    spo2Status = 'Borderline';
    subScores.push(35);
    organStrains.pulmonary.strain = 'moderate';
    organStrains.pulmonary.notes = 'Sub-optimal peripheral oxygen saturation';
    abnormalities.push({
      parameter: 'SpO₂ Saturation',
      value: `${spo2}%`,
      severity: 'Moderate',
      finding: 'Mild Desaturation (93-94%)',
      system: 'Respiratory'
    });
  } else {
    subScores.push(5);
  }

  // --- 4. Body Temperature Evaluation (Normal: 97.6-99.1°F) ---
  let tempStatus = 'Normal';
  if (temp >= 103.0 || temp < 95.0) {
    tempStatus = 'Critical';
    subScores.push(85);
    organStrains.thermoregulatory.strain = 'critical';
    organStrains.thermoregulatory.notes = temp >= 103.0 ? 'Hyperpyrexia, systemic inflammatory peak' : 'Hypothermia, metabolic slowing';
    abnormalities.push({
      parameter: 'Temperature',
      value: `${temp}°F`,
      severity: 'Critical',
      finding: temp >= 103.0 ? 'Hyperpyrexia (≥103.0°F)' : 'Hypothermia (<95.0°F)',
      system: 'Thermoregulation'
    });
  } else if (temp >= 100.5) {
    tempStatus = 'Elevated';
    subScores.push(60);
    organStrains.thermoregulatory.strain = 'elevated';
    organStrains.thermoregulatory.notes = 'Pyrexia / active inflammatory response';
    abnormalities.push({
      parameter: 'Temperature',
      value: `${temp}°F`,
      severity: 'Elevated',
      finding: 'High Fever / Pyrexia (≥100.5°F)',
      system: 'Thermoregulation'
    });
  } else if (temp >= 99.3) {
    tempStatus = 'Borderline';
    subScores.push(30);
    organStrains.thermoregulatory.strain = 'moderate';
    organStrains.thermoregulatory.notes = 'Low-grade febrile elevation';
    abnormalities.push({
      parameter: 'Temperature',
      value: `${temp}°F`,
      severity: 'Moderate',
      finding: 'Low-Grade Pyrexia (99.3-100.4°F)',
      system: 'Thermoregulation'
    });
  } else {
    subScores.push(5);
  }

  // --- 5. Respiratory Rate Evaluation (Normal: 12-20 breaths/min) ---
  let rrStatus = 'Normal';
  if (rr >= 28 || rr < 8) {
    rrStatus = 'Critical';
    subScores.push(90);
    organStrains.pulmonary.strain = 'critical';
    organStrains.pulmonary.notes = rr >= 28 ? 'Severe tachypnea, ventilatory fatigue' : 'Severe bradypnea, respiratory depression';
    abnormalities.push({
      parameter: 'Respiratory Rate',
      value: `${rr}/min`,
      severity: 'Critical',
      finding: rr >= 28 ? 'Severe Tachypnea (≥28/min)' : 'Severe Bradypnea (<8/min)',
      system: 'Respiratory'
    });
  } else if (rr >= 22) {
    rrStatus = 'Elevated';
    subScores.push(50);
    if (organStrains.pulmonary.strain === 'normal') organStrains.pulmonary.strain = 'elevated';
    abnormalities.push({
      parameter: 'Respiratory Rate',
      value: `${rr}/min`,
      severity: 'Elevated',
      finding: 'Tachypneic Pattern (22-27/min)',
      system: 'Respiratory'
    });
  } else if (rr < 12) {
    rrStatus = 'Borderline';
    subScores.push(30);
    if (organStrains.pulmonary.strain === 'normal') organStrains.pulmonary.strain = 'moderate';
    abnormalities.push({
      parameter: 'Respiratory Rate',
      value: `${rr}/min`,
      severity: 'Moderate',
      finding: 'Mild Bradypnea (<12/min)',
      system: 'Respiratory'
    });
  } else {
    subScores.push(5);
  }

  // --- 6. Blood Glucose Evaluation (Normal: 70-125 mg/dL) ---
  let gluStatus = 'Normal';
  if (glucose >= 250 || glucose < 55) {
    gluStatus = 'Critical';
    subScores.push(85);
    organStrains.metabolic.strain = 'critical';
    organStrains.metabolic.notes = glucose >= 250 ? 'Severe hyperglycemic excursion' : 'Acute severe hypoglycemia';
    organStrains.neurological.strain = organStrains.neurological.strain === 'critical' ? 'critical' : 'elevated';
    organStrains.neurological.notes = 'Neuroglycopenic / hyperosmolar risk';
    abnormalities.push({
      parameter: 'Blood Glucose',
      value: `${glucose} mg/dL`,
      severity: 'Critical',
      finding: glucose >= 250 ? 'Severe Hyperglycemia (≥250 mg/dL)' : 'Severe Hypoglycemia (<55 mg/dL)',
      system: 'Metabolic'
    });
  } else if (glucose >= 160) {
    gluStatus = 'Elevated';
    subScores.push(55);
    organStrains.metabolic.strain = 'elevated';
    organStrains.metabolic.notes = 'Marked postprandial/fasting hyperglycemia';
    abnormalities.push({
      parameter: 'Blood Glucose',
      value: `${glucose} mg/dL`,
      severity: 'Elevated',
      finding: 'Marked Hyperglycemia (160-249 mg/dL)',
      system: 'Metabolic'
    });
  } else if (glucose > 125) {
    gluStatus = 'Borderline';
    subScores.push(25);
    organStrains.metabolic.strain = 'moderate';
    organStrains.metabolic.notes = 'Impaired glucose tolerance';
    abnormalities.push({
      parameter: 'Blood Glucose',
      value: `${glucose} mg/dL`,
      severity: 'Moderate',
      finding: 'Borderline Elevated Glucose (126-159 mg/dL)',
      system: 'Metabolic'
    });
  } else if (glucose < 70) {
    gluStatus = 'Elevated';
    subScores.push(60);
    organStrains.metabolic.strain = 'elevated';
    organStrains.metabolic.notes = 'Mild-to-moderate hypoglycemia';
    abnormalities.push({
      parameter: 'Blood Glucose',
      value: `${glucose} mg/dL`,
      severity: 'Elevated',
      finding: 'Hypoglycemia (<70 mg/dL)',
      system: 'Metabolic'
    });
  } else {
    subScores.push(5);
  }

  // --- Compound Multi-Vital Synergies ---
  let synergyBonus = 0;
  let detectedSyndrome = null;

  // Synergy A: Acute Hypoxemic Respiratory Distress (Low SpO2 + High RR)
  if (spo2 < 93 && rr >= 22) {
    synergyBonus += 25;
    detectedSyndrome = 'Acute Hypoxemic Respiratory Distress';
    organStrains.pulmonary.strain = 'critical';
  }

  // Synergy B: Febrile Tachycardia / Systemic Inflammatory Strain (High Temp + High HR)
  if (temp >= 100.5 && hr >= 100) {
    synergyBonus += 20;
    detectedSyndrome = detectedSyndrome 
      ? `${detectedSyndrome} + Febrile Tachycardic Response` 
      : 'Febrile Tachycardic / Systemic Inflammatory Stress';
    organStrains.thermoregulatory.strain = 'elevated';
    organStrains.cardiovascular.strain = organStrains.cardiovascular.strain === 'critical' ? 'critical' : 'elevated';
  }

  // Synergy C: Hypertensive Cardiovascular Overload (High BP + High HR)
  if ((sbp >= 155 || dbp >= 95) && hr >= 95) {
    synergyBonus += 18;
    detectedSyndrome = detectedSyndrome 
      ? `${detectedSyndrome} + Hypertensive Strain` 
      : 'Hypertensive Cardiovascular Overload';
    organStrains.cardiovascular.strain = 'elevated';
  }

  // Synergy D: Hemodynamic Shock Risk (High HR + Low Systolic BP, Shock Index > 0.9)
  const shockIndex = sbp > 0 ? (hr / sbp) : 0;
  if (shockIndex >= 0.95 && sbp < 100) {
    synergyBonus += 25;
    detectedSyndrome = 'Elevated Shock Index / Hemodynamic Decompensation';
    organStrains.vascular.strain = 'critical';
  }

  // Synergy E: Hyperglycemic Dehydration Stress (High Glucose + High HR)
  if (glucose >= 220 && hr >= 95) {
    synergyBonus += 15;
    detectedSyndrome = detectedSyndrome 
      ? `${detectedSyndrome} + Hyperglycemic Dehydration` 
      : 'Hyperglycemic Dehydration Stress';
    organStrains.metabolic.strain = 'elevated';
  }

  // --- Calculate Composite Risk Score (0 - 100) ---
  const maxSub = Math.max(...subScores);
  const avgSub = subScores.reduce((a, b) => a + b, 0) / subScores.length;
  const rawScore = (maxSub * 0.55) + (avgSub * 0.45) + synergyBonus;
  const riskScore = Math.min(100, Math.max(5, Math.round(rawScore * 10) / 10));

  // --- Categorize Risk Level & Health State ---
  let riskLevel = 'Stable';
  let healthState = 'Optimal Physiological Homeostasis';
  let riskBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let emergencyWarning = false;
  let recommendedAction = 'Maintain routine wellness care, regular hydration, and scheduled checkups.';

  if (riskScore >= 75 || spo2 <= 88 || (sbp >= 180 && dbp >= 110) || temp >= 103.5 || (spo2 < 92 && rr >= 24)) {
    riskLevel = 'High';
    healthState = 'Critical Physiological Compromise';
    riskBadgeColor = 'bg-red-100 text-red-800 border-red-300';
    emergencyWarning = true;
    recommendedAction = 'URGENT: Immediate physician evaluation or emergency medical triage required. Supplemental oxygen / stabilization advised.';
  } else if (riskScore >= 50 || abnormalities.length >= 2 || (temp >= 100.5 && hr >= 100)) {
    riskLevel = 'Elevated';
    healthState = 'Elevated Multi-System Physiological Strain';
    riskBadgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
    emergencyWarning = false;
    recommendedAction = 'Schedule prompt clinical consultation within 2-4 hours. Initiate frequent vital monitoring every 30 minutes.';
  } else if (riskScore >= 25 || abnormalities.length >= 1) {
    riskLevel = 'Moderate';
    healthState = 'Moderate Physiological Fluctuation';
    riskBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
    emergencyWarning = false;
    recommendedAction = 'Continue close observation. Address hydration, physical rest, and review environmental triggers.';
  } else {
    riskLevel = 'Stable';
    healthState = 'Optimal Physiological Homeostasis';
    riskBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    emergencyWarning = false;
    recommendedAction = 'All 6 vital biomarkers remain in physiological equilibrium. Continue routine preventative health regimen.';
  }

  // --- Potential Future Trajectory (Cautious Phrasing) ---
  let trajectory = '';
  if (riskLevel === 'High') {
    if (spo2 < 92 && rr >= 22) {
      trajectory = 'Potential trajectory: Sustained hypoxemia accompanied by elevated ventilatory frequency may indicate impending respiratory muscle exhaustion within 1 to 3 hours if supplemental oxygen and airway clearance are not initiated.';
    } else if (sbp >= 170 || dbp >= 105) {
      trajectory = 'Potential trajectory: Sustained elevated arterial afterload may indicate risk of progressive left ventricular wall stress or acute cerebrovascular strain if blood pressure is not pharmacologically moderated.';
    } else {
      trajectory = 'Potential trajectory: Multi-system telemetry indicates high acute decompensation vulnerability. If this trend continues unmanaged, progressive cardiopulmonary or metabolic strain may accelerate within 2 to 4 hours.';
    }
  } else if (riskLevel === 'Elevated') {
    if (temp >= 100.5 && hr >= 100) {
      trajectory = 'Potential trajectory: Sustained hyperthermia coupled with sinus tachycardia may indicate accelerating dehydration, increased metabolic oxygen consumption, and progressive fatigue if antipyresis and fluid repletion are not administered.';
    } else if (glucose >= 200) {
      trajectory = 'Potential trajectory: Persistently elevated glucose levels may indicate risk of progressive osmotic diuresis, electrolyte shifts, and increased metabolic strain if glycemic stabilization is delayed.';
    } else {
      trajectory = 'Potential trajectory: Telemetry reflects escalating physiological burden across multiple biomarkers. If current trend continues over the next 6 to 12 hours, progression to higher clinical risk is possible without supportive intervention.';
    }
  } else if (riskLevel === 'Moderate') {
    trajectory = 'Potential trajectory: Mild physiological deviation noted. With restful recovery, hydration, and monitoring, parameters typically stabilize toward baseline within 4 to 8 hours.';
  } else {
    trajectory = 'Potential trajectory: Core biomarkers indicate stable physiological equilibrium. Low acute decompensation probability projected over the subsequent 24-hour horizon under current physiological state.';
  }

  // --- Clinical Precautions ---
  const precautions = [];
  if (temp >= 99.5) {
    precautions.push('Ensure frequent oral electrolyte fluid intake to counterbalance hyperthermic fluid losses.');
    precautions.push('Apply cool forehead compress and avoid heavy blankets; measure temperature every 60-90 minutes.');
  }
  if (spo2 < 95 || rr >= 22) {
    precautions.push('Assume an upright Fowler’s or semi-Fowler’s seated posture (45-90°) to optimize pulmonary expansion.');
    precautions.push('Avoid physical exertion and ensure ambient room ventilation is unobstructed.');
  }
  if (sbp >= 135 || dbp >= 85) {
    precautions.push('Rest quietly in a calm, seated environment for 15 minutes before repeating measurement.');
    precautions.push('Temporarily abstain from caffeine, high-sodium foods, and acute emotional stressors.');
  }
  if (glucose >= 160 || glucose < 70) {
    precautions.push('Review timestamp and carbohydrate content of recent meals and insulin/oral hypoglycemic doses.');
    precautions.push('Maintain accessible rapid-acting carbohydrates (if hypoglycemic) or sugar-free hydration (if hyperglycemic).');
  }
  if (hr > 100) {
    precautions.push('Avoid strenuous ambulation; perform deep paced breathing exercises in a cool, quiet room.');
  }
  if (precautions.length === 0) {
    precautions.push('Maintain optimal daily hydration (2 to 2.5 Liters of water daily) and regular sleep hygiene.');
    precautions.push('Engage in moderate physical activity and schedule weekly preventative vital telemetry checks.');
  }

  // --- Clinician-Reviewable Medication Consideration ---
  let medicationConsideration = null;
  if (temp >= 101.0 && hr >= 95) {
    medicationConsideration = {
      title: 'Antipyretic & Hydration Protocol Consideration',
      candidateMedication: 'Paracetamol 650mg Oral Tablet',
      dosageInstructions: '1 tablet with water, max 3 times daily SOS',
      rationale: 'Elevated core pyrexia (≥101°F) coupled with compensatory sinus tachycardia points to active systemic inflammatory cascade.',
      disclaimer: 'Potential Medication Consideration — Requires Clinician Confirmation. Not an autonomous prescription.',
      status: 'Awaiting Clinician Confirmation',
      suggestedDoctor: 'Dr. Rajesh Rao (Attending Physician)',
      suggestedDoctorId: 'doc_05'
    };
  } else if (spo2 < 92) {
    medicationConsideration = {
      title: 'Pulmonary Oxygenation & Bronchodilator Consideration',
      candidateMedication: 'Supplemental O₂ (2-4 L/min Nasal Cannula) & Salbutamol Nebulization (2.5mg)',
      dosageInstructions: 'Administer via oxygen mask / nebulizer under clinical supervision',
      rationale: 'Arterial oxygen desaturation (<92%) with increased ventilatory workload necessitates acute respiratory support.',
      disclaimer: 'Potential Medication Consideration — Requires Clinician Confirmation. Not an autonomous prescription.',
      status: 'Awaiting Clinician Confirmation',
      suggestedDoctor: 'Dr. Ching Ming Yang (Senior Pulmonology / Critical Care)',
      suggestedDoctorId: 'doc_01'
    };
  } else if (sbp >= 160 || dbp >= 100) {
    medicationConsideration = {
      title: 'Antihypertensive Titration Consideration',
      candidateMedication: 'Amlodipine 5mg / Telmisartan 40mg Oral Review',
      dosageInstructions: 'Daily oral titration subject to clinician review',
      rationale: 'Sustained severe systolic/diastolic arterial overload elevates left ventricular afterload and cerebrovascular tension.',
      disclaimer: 'Potential Medication Consideration — Requires Clinician Confirmation. Not an autonomous prescription.',
      status: 'Awaiting Clinician Confirmation',
      suggestedDoctor: 'Dr. Ching Ming Yang (Cardiologist)',
      suggestedDoctorId: 'doc_01'
    };
  } else if (glucose >= 220) {
    medicationConsideration = {
      title: 'Glycemic Correction & Fluid Protocol Consideration',
      candidateMedication: 'Subcutaneous Regular Insulin Sliding Scale + Normal Saline Rehydration',
      dosageInstructions: 'Unit dosage determined via capillary blood glucose sliding protocol',
      rationale: 'Marked glycemic excursion indicates cellular metabolic deficit and progressive osmotic dehydration risk.',
      disclaimer: 'Potential Medication Consideration — Requires Clinician Confirmation. Not an autonomous prescription.',
      status: 'Awaiting Clinician Confirmation',
      suggestedDoctor: 'Dr. Rajesh Rao (Attending Physician)',
      suggestedDoctorId: 'doc_05'
    };
  } else {
    medicationConsideration = {
      title: 'Maintenance Therapy Continuity',
      candidateMedication: 'Continue Baseline Prescribed Medications (Amlodipine 5mg)',
      dosageInstructions: 'Continue scheduled daily regimen as previously prescribed',
      rationale: 'Current physiological markers demonstrate homeostatic stability; no acute pharmacological alteration indicated.',
      disclaimer: 'Potential Medication Consideration — Requires Clinician Confirmation.',
      status: 'Clinically Verified',
      suggestedDoctor: 'Dr. Rajesh Rao',
      suggestedDoctorId: 'doc_05'
    };
  }

  return {
    vitalsSnapshot: {
      heartRate: hr,
      systolicBp: sbp,
      diastolicBp: dbp,
      spo2,
      temperature: temp,
      respiratoryRate: rr,
      glucose
    },
    riskScore,
    riskLevel,
    healthState,
    riskBadgeColor,
    emergencyWarning,
    detectedSyndrome,
    abnormalities,
    vitalStatuses: {
      heartRate: hrStatus,
      systolicBp: bpStatus,
      diastolicBp: bpStatus,
      spo2: spo2Status,
      temperature: tempStatus,
      respiratoryRate: rrStatus,
      glucose: gluStatus
    },
    organStrains,
    trajectory,
    precautions,
    recommendedAction,
    medicationConsideration,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

/**
 * Simulates future physiological trajectory comparing Current State -> Simulated State
 *
 * @param {Object} currentVitals - Initial baseline vitals
 * @param {Object} futureVitals - Simulated future vitals
 * @param {Number} horizonHours - Projected time horizon (e.g. 2, 6, 24 hours)
 * @param {String} interventionType - 'none' | 'hydration_rest' | 'clinical_pharmacotherapy'
 * @returns {Object} Comparison delta and projected trajectory shift
 */
export function simulateFuture(currentVitals, futureVitals, horizonHours = 4, interventionType = 'none') {
  const currentAnalysis = analyzeDigitalTwin(currentVitals);
  const futureAnalysis = analyzeDigitalTwin(futureVitals);

  const scoreDelta = Math.round((futureAnalysis.riskScore - currentAnalysis.riskScore) * 10) / 10;
  const isWorsening = scoreDelta > 0;
  const isImproving = scoreDelta < 0;

  let trajectoryShift = 'Stable Physiological Horizon';
  if (scoreDelta >= 15) {
    trajectoryShift = 'Rapidly Deteriorating Trajectory (Acute Escalation)';
  } else if (scoreDelta > 0) {
    trajectoryShift = 'Mild Deteriorating Trend (Increasing Strain)';
  } else if (scoreDelta <= -15) {
    trajectoryShift = 'Substantial Clinical Recovery (Rapid Stabilization)';
  } else if (scoreDelta < 0) {
    trajectoryShift = 'Favorable Recovery Trend (Normalizing Vitals)';
  }

  return {
    currentAnalysis,
    futureAnalysis,
    horizonHours,
    interventionType,
    scoreDelta,
    isWorsening,
    isImproving,
    levelChanged: currentAnalysis.riskLevel !== futureAnalysis.riskLevel,
    trajectoryShift,
    vitalDeltas: {
      heartRate: futureAnalysis.vitalsSnapshot.heartRate - currentAnalysis.vitalsSnapshot.heartRate,
      systolicBp: futureAnalysis.vitalsSnapshot.systolicBp - currentAnalysis.vitalsSnapshot.systolicBp,
      diastolicBp: futureAnalysis.vitalsSnapshot.diastolicBp - currentAnalysis.vitalsSnapshot.diastolicBp,
      spo2: futureAnalysis.vitalsSnapshot.spo2 - currentAnalysis.vitalsSnapshot.spo2,
      temperature: Math.round((futureAnalysis.vitalsSnapshot.temperature - currentAnalysis.vitalsSnapshot.temperature) * 10) / 10,
      respiratoryRate: futureAnalysis.vitalsSnapshot.respiratoryRate - currentAnalysis.vitalsSnapshot.respiratoryRate,
      glucose: futureAnalysis.vitalsSnapshot.glucose - currentAnalysis.vitalsSnapshot.glucose
    }
  };
}

/**
 * Real-time Predictive Variation Detector
 * Evaluates live changes as sliders are moved, flagging the immediate clinical problem,
 * underlying physiological reason, and predicted trajectory impact without requiring
 * manual click of the analysis button.
 *
 * @param {Object} currentVitals - Newly adjusted vitals
 * @returns {Object|null} Telemetry alert with problem, reason, severity, and predicted impact
 */
export function predictVitalVariation(currentVitals) {
  const analysis = analyzeDigitalTwin(currentVitals);
  const { vitalsSnapshot, riskScore, riskLevel } = analysis;
  
  const hr = vitalsSnapshot.heartRate;
  const sbp = vitalsSnapshot.systolicBp;
  const dbp = vitalsSnapshot.diastolicBp;
  const spo2 = vitalsSnapshot.spo2;
  const temp = vitalsSnapshot.temperature;
  const rr = vitalsSnapshot.respiratoryRate;
  const glu = vitalsSnapshot.glucose;

  // 1. Compound Critical Synergies (Highest Priority)
  if (spo2 < 93 && rr >= 22) {
    return {
      severity: 'Critical',
      badgeColor: 'bg-red-600 text-white',
      borderColor: 'border-red-500 shadow-red-500/30',
      bgColor: 'from-slate-900 via-red-950 to-slate-900',
      problem: 'Acute Hypoxemic Respiratory Distress Pattern',
      triggerParam: 'SpO₂ Saturation & Respiratory Rate',
      triggerValue: `SpO₂ ${spo2}% • RR ${rr}/min`,
      reason: `Peripheral oxygen saturation dropped to ${spo2}% (below 93% safe limit) while respiratory rate surged to ${rr}/min as a desperate compensatory mechanism to overcome alveolar hypoxemia.`,
      prediction: `If sustained, respiratory muscle fatigue is predicted within 60-90 minutes, with high risk of sudden acute ventilatory collapse.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: 'Assume upright Fowler position (45-90°), administer supplemental oxygen, and notify attending physician.'
    };
  }

  if (temp >= 100.5 && hr >= 100) {
    return {
      severity: 'Elevated',
      badgeColor: 'bg-orange-600 text-white',
      borderColor: 'border-orange-500 shadow-orange-500/30',
      bgColor: 'from-slate-900 via-orange-950 to-slate-900',
      problem: 'Pyrexia with Compensatory Tachycardia (Systemic Inflammatory Response)',
      triggerParam: 'Body Temperature & Heart Rate',
      triggerValue: `${temp}°F • ${hr} BPM`,
      reason: `Core body temperature increased to ${temp}°F, accelerating cellular metabolic demand and driving compensatory sinus tachycardia (${hr} BPM) to increase circulating cardiac output.`,
      prediction: `Progressive fluid loss via diaphoresis and tachycardia-induced fatigue. Dehydration and thermoregulatory strain projected within 2-4 hours.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: 'Apply cool compress, begin aggressive oral electrolyte rehydration, and prepare antipyretic protocol.'
    };
  }

  if ((sbp >= 160 || dbp >= 100) && hr >= 90) {
    return {
      severity: 'Critical',
      badgeColor: 'bg-rose-600 text-white',
      borderColor: 'border-rose-500 shadow-rose-500/30',
      bgColor: 'from-slate-900 via-rose-950 to-slate-900',
      problem: 'Hypertensive Cardiovascular Overload',
      triggerParam: 'Arterial Blood Pressure & Heart Rate',
      triggerValue: `${sbp}/${dbp} mmHg • ${hr} BPM`,
      reason: `Systemic arterial pressure spiked to ${sbp}/${dbp} mmHg with a heart rate of ${hr} BPM, producing acute mechanical afterload resistance against the left ventricle.`,
      prediction: `Substantial risk of end-organ microvascular compromise or acute coronary ischemia if arterial pressure remains unmoderated.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: 'Rest in a seated, quiet environment; avoid physical movement or stimulants.'
    };
  }

  if (glu >= 220 && hr >= 95) {
    return {
      severity: 'Elevated',
      badgeColor: 'bg-orange-600 text-white',
      borderColor: 'border-orange-500 shadow-orange-500/30',
      bgColor: 'from-slate-900 via-orange-950 to-slate-900',
      problem: 'Hyperglycemic Dehydration Stress',
      triggerParam: 'Blood Glucose & Heart Rate',
      triggerValue: `${glu} mg/dL • ${hr} BPM`,
      reason: `Blood glucose escalated to ${glu} mg/dL, exceeding the renal glucose threshold (~180 mg/dL), promoting osmotic diuresis and circulatory volume contraction with compensatory tachycardia (${hr} BPM).`,
      prediction: `Accelerated intracellular dehydration and electrolyte shifts. Rising risk of hyperosmolar metabolic stress within 3-6 hours.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: 'Verify timing of last insulin dose; initiate isotonic fluid replenishment immediately.'
    };
  }

  // 2. Single Parameter Threshold Variations
  if (spo2 < 93) {
    return {
      severity: spo2 < 89 ? 'Critical' : 'Elevated',
      badgeColor: spo2 < 89 ? 'bg-red-600 text-white' : 'bg-orange-600 text-white',
      borderColor: spo2 < 89 ? 'border-red-500 shadow-red-500/30' : 'border-orange-500 shadow-orange-500/30',
      bgColor: 'from-slate-900 via-cyan-950 to-slate-900',
      problem: 'Arterial Hypoxemia (Sub-optimal Oxygenation)',
      triggerParam: 'SpO₂ Saturation',
      triggerValue: `${spo2}% (Normal: 95-100%)`,
      reason: `Peripheral arterial oxygen saturation fell to ${spo2}%, indicating compromised gas exchange in pulmonary capillary beds.`,
      prediction: `Sub-optimal tissue oxygenation affecting cerebral and cardiac perfusion. Risk score projected at ${riskScore}/100.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: 'Ensure unobstructed airway and assume semi-Fowler position.'
    };
  }

  if (temp >= 100.5 || temp <= 95.0) {
    const isHigh = temp >= 100.5;
    return {
      severity: temp >= 103.0 ? 'Critical' : 'Elevated',
      badgeColor: temp >= 103.0 ? 'bg-red-600 text-white' : 'bg-amber-600 text-white',
      borderColor: temp >= 103.0 ? 'border-red-500 shadow-red-500/30' : 'border-amber-500 shadow-amber-500/30',
      bgColor: 'from-slate-900 via-amber-950 to-slate-900',
      problem: isHigh ? 'Pyrexic Hyperthermia Warning' : 'Hypothermia Warning',
      triggerParam: 'Body Temperature',
      triggerValue: `${temp}°F (Normal: 97.6-99.1°F)`,
      reason: isHigh 
        ? `Core temperature reached ${temp}°F, indicating active endogenous pyrogen activation and systemic inflammatory response.`
        : `Core temperature dropped to ${temp}°F, provoking peripheral vasoconstriction and metabolic depression.`,
      prediction: isHigh
        ? `Elevated metabolic burn rate and perspiration-induced electrolyte depletion projected over next 2 hours.`
        : `Risk of cardiac arrhythmia and shivering exhaustion if core warming is delayed.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: isHigh ? 'Hydrate with cool electrolyte fluids.' : 'Apply passive external warming.'
    };
  }

  if (hr > 110 || hr < 50) {
    const isFast = hr > 110;
    return {
      severity: (hr > 130 || hr < 45) ? 'Critical' : 'Elevated',
      badgeColor: (hr > 130 || hr < 45) ? 'bg-red-600 text-white' : 'bg-rose-600 text-white',
      borderColor: 'border-rose-500 shadow-rose-500/30',
      bgColor: 'from-slate-900 via-rose-950 to-slate-900',
      problem: isFast ? 'Sinus Tachycardia (Cardiac Acceleration)' : 'Sinus Bradycardia (Cardiac Slowing)',
      triggerParam: 'Heart Rate',
      triggerValue: `${hr} BPM (Normal: 60-100 BPM)`,
      reason: isFast 
        ? `Heart rate accelerated to ${hr} BPM, shortening ventricular diastolic filling time and increasing myocardial oxygen consumption.`
        : `Heart rate slowed to ${hr} BPM, reducing cardiac output below optimal perfusion index.`,
      prediction: isFast
        ? `Cardiac workload increased significantly. Persistent tachycardia may precipitate fatigue or palpitations.`
        : `Risk of dizziness, orthostatic hypotension, or syncope.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: isFast ? 'Rest quietly, perform slow paced respiration.' : 'Assess conscious state and avoid sudden standing.'
    };
  }

  if (sbp >= 140 || dbp >= 90 || sbp < 90) {
    const isHigh = sbp >= 140 || dbp >= 90;
    return {
      severity: (sbp >= 180 || dbp >= 110) ? 'Critical' : 'Elevated',
      badgeColor: (sbp >= 180 || dbp >= 110) ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white',
      borderColor: 'border-indigo-500 shadow-indigo-500/30',
      bgColor: 'from-slate-900 via-indigo-950 to-slate-900',
      problem: isHigh ? 'Stage 2 Hypertension (Arterial Overload)' : 'Systemic Hypotension (Hypoperfusion Risk)',
      triggerParam: 'Blood Pressure',
      triggerValue: `${sbp}/${dbp} mmHg (Normal: 120/80 mmHg)`,
      reason: isHigh
        ? `Arterial wall pressure elevated to ${sbp}/${dbp} mmHg, indicating heightened peripheral vascular resistance.`
        : `Arterial pressure dropped to ${sbp}/${dbp} mmHg, risking organ hypoperfusion.`,
      prediction: isHigh
        ? `Sustained vascular resistance increases left ventricular wall stress. Predicted risk: ${riskScore}/100.`
        : `Inadequate cerebral perfusion risk if posture changes suddenly.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: isHigh ? 'Rest in seated position; avoid sudden movements.' : 'Elevate legs and administer oral fluids.'
    };
  }

  if (rr >= 24 || rr < 10) {
    const isFast = rr >= 24;
    return {
      severity: (rr >= 28 || rr < 8) ? 'Critical' : 'Elevated',
      badgeColor: 'bg-teal-600 text-white',
      borderColor: 'border-teal-500 shadow-teal-500/30',
      bgColor: 'from-slate-900 via-teal-950 to-slate-900',
      problem: isFast ? 'Tachypneic Ventilatory Strain' : 'Bradypnea (Hypoventilation)',
      triggerParam: 'Respiratory Rate',
      triggerValue: `${rr}/min (Normal: 12-20/min)`,
      reason: isFast
        ? `Ventilatory rate surged to ${rr}/min, reflecting heightened respiratory drive and increased minute ventilation.`
        : `Ventilatory rate reduced to ${rr}/min, risking carbon dioxide retention.`,
      prediction: isFast
        ? `Diaphragmatic and intercostal muscular fatigue predicted if sustained over 1-2 hours.`
        : `Respiratory acidosis risk if ventilatory depth is also shallow.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: isFast ? 'Fowler upright sitting (45-90°).' : 'Stimulate breathing and monitor oximetry.'
    };
  }

  if (glu >= 180 || glu < 70) {
    const isHigh = glu >= 180;
    return {
      severity: (glu >= 250 || glu < 55) ? 'Critical' : 'Elevated',
      badgeColor: 'bg-emerald-600 text-white',
      borderColor: 'border-emerald-500 shadow-emerald-500/30',
      bgColor: 'from-slate-900 via-emerald-950 to-slate-900',
      problem: isHigh ? 'Marked Hyperglycemic Excursion' : 'Acute Hypoglycemic Alert',
      triggerParam: 'Blood Glucose',
      triggerValue: `${glu} mg/dL (Normal: 70-125 mg/dL)`,
      reason: isHigh
        ? `Circulating glucose reached ${glu} mg/dL, elevating blood osmolarity and stimulating cellular dehydration.`
        : `Circulating glucose fell to ${glu} mg/dL, causing acute cellular neuroglycopenic deficit.`,
      prediction: isHigh
        ? `Glucosuria and progressive fluid shifts projected over next 2-4 hours.`
        : `Tremors, diaphoresis, and cognitive slowing imminent without rapid carbohydrates.`,
      predictedRiskScore: riskScore,
      predictedRiskLevel: riskLevel,
      recommendedImmediateAction: isHigh ? 'Drink water, avoid simple carbohydrates.' : 'Consume 15g fast-acting carbohydrates.'
    };
  }

  // If in normal range
  return null;
}

