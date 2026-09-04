import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.database import db

router = APIRouter(prefix="/digital-twin", tags=["Patient Digital Twin"])

class VitalsInput(BaseModel):
    heart_rate: float = Field(..., ge=30, le=240, description="Heart Rate in BPM")
    blood_pressure_systolic: float = Field(..., ge=50, le=260, description="Systolic BP mmHg")
    blood_pressure_diastolic: float = Field(..., ge=30, le=160, description="Diastolic BP mmHg")
    oxygen_saturation: float = Field(..., ge=50, le=100, description="SpO2 percentage")
    temperature: float = Field(..., ge=90.0, le=110.0, description="Body Temperature in Fahrenheit")
    respiratory_rate: float = Field(..., ge=6, le=60, description="Breaths per minute")
    glucose: float = Field(..., ge=20, le=600, description="Blood Glucose in mg/dL")
    patient_id: Optional[str] = "p_01"

class SimulationRequest(BaseModel):
    current_vitals: VitalsInput
    future_vitals: VitalsInput

def calculate_digital_twin_analysis(v: VitalsInput) -> Dict[str, Any]:
    abnormalities = []
    sub_scores = []
    
    # 1. Heart Rate (Normal: 60-100 BPM)
    hr = v.heart_rate
    hr_status = "Normal"
    if hr > 130 or hr < 45:
        hr_status = "Critical"
        sub_scores.append(85)
        abnormalities.append({
            "parameter": "Heart Rate",
            "value": f"{hr} BPM",
            "severity": "Critical",
            "finding": "Severe Tachycardia" if hr > 130 else "Severe Bradycardia",
            "system": "Cardiovascular"
        })
    elif hr > 100:
        hr_status = "Elevated"
        sub_scores.append(45)
        abnormalities.append({
            "parameter": "Heart Rate",
            "value": f"{hr} BPM",
            "severity": "Elevated",
            "finding": "Sinus Tachycardia",
            "system": "Cardiovascular"
        })
    elif hr < 60:
        hr_status = "Borderline"
        sub_scores.append(25)
        abnormalities.append({
            "parameter": "Heart Rate",
            "value": f"{hr} BPM",
            "severity": "Moderate",
            "finding": "Sinus Bradycardia",
            "system": "Cardiovascular"
        })
    else:
        sub_scores.append(5)

    # 2. Blood Pressure (Normal: 90-120 / 60-80 mmHg)
    sbp = v.blood_pressure_systolic
    dbp = v.blood_pressure_diastolic
    bp_status = "Normal"
    if sbp >= 180 or dbp >= 120:
        bp_status = "Critical"
        sub_scores.append(90)
        abnormalities.append({
            "parameter": "Blood Pressure",
            "value": f"{sbp}/{dbp} mmHg",
            "severity": "Critical",
            "finding": "Hypertensive Crisis Range",
            "system": "Vascular"
        })
    elif sbp >= 140 or dbp >= 90:
        bp_status = "Elevated"
        sub_scores.append(55)
        abnormalities.append({
            "parameter": "Blood Pressure",
            "value": f"{sbp}/{dbp} mmHg",
            "severity": "Elevated",
            "finding": "Stage 2 Hypertension",
            "system": "Vascular"
        })
    elif sbp >= 130 or dbp >= 85:
        bp_status = "Borderline"
        sub_scores.append(30)
        abnormalities.append({
            "parameter": "Blood Pressure",
            "value": f"{sbp}/{dbp} mmHg",
            "severity": "Moderate",
            "finding": "Prehypertension / Stage 1",
            "system": "Vascular"
        })
    elif sbp < 90 or dbp < 60:
        bp_status = "Elevated"
        sub_scores.append(60)
        abnormalities.append({
            "parameter": "Blood Pressure",
            "value": f"{sbp}/{dbp} mmHg",
            "severity": "Elevated",
            "finding": "Systemic Hypotension",
            "system": "Vascular"
        })
    else:
        sub_scores.append(5)

    # 3. Oxygen Saturation (SpO2 Normal: 95-100%)
    spo2 = v.oxygen_saturation
    spo2_status = "Normal"
    if spo2 < 88:
        spo2_status = "Critical"
        sub_scores.append(95)
        abnormalities.append({
            "parameter": "SpO2",
            "value": f"{spo2}%",
            "severity": "Critical",
            "finding": "Severe Arterial Hypoxemia",
            "system": "Respiratory"
        })
    elif spo2 < 92:
        spo2_status = "Elevated"
        sub_scores.append(70)
        abnormalities.append({
            "parameter": "SpO2",
            "value": f"{spo2}%",
            "severity": "Elevated",
            "finding": "Moderate Hypoxemia",
            "system": "Respiratory"
        })
    elif spo2 < 95:
        spo2_status = "Borderline"
        sub_scores.append(35)
        abnormalities.append({
            "parameter": "SpO2",
            "value": f"{spo2}%",
            "severity": "Moderate",
            "finding": "Mild Sub-optimal Oxygenation",
            "system": "Respiratory"
        })
    else:
        sub_scores.append(5)

    # 4. Body Temperature (Normal: 97.6-99.1 F)
    temp = v.temperature
    temp_status = "Normal"
    if temp >= 103.5 or temp < 95.0:
        temp_status = "Critical"
        sub_scores.append(85)
        abnormalities.append({
            "parameter": "Temperature",
            "value": f"{temp} F",
            "severity": "Critical",
            "finding": "Hyperpyrexia" if temp >= 103.5 else "Hypothermia",
            "system": "Thermoregulation"
        })
    elif temp >= 101.0:
        temp_status = "Elevated"
        sub_scores.append(60)
        abnormalities.append({
            "parameter": "Temperature",
            "value": f"{temp} F",
            "severity": "Elevated",
            "finding": "Moderate-to-High Pyrexia (Fever)",
            "system": "Thermoregulation"
        })
    elif temp >= 99.5:
        temp_status = "Borderline"
        sub_scores.append(30)
        abnormalities.append({
            "parameter": "Temperature",
            "value": f"{temp} F",
            "severity": "Moderate",
            "finding": "Low-grade Pyrexia",
            "system": "Thermoregulation"
        })
    else:
        sub_scores.append(5)

    # 5. Respiratory Rate (Normal: 12-20 breaths/min)
    rr = v.respiratory_rate
    rr_status = "Normal"
    if rr > 30 or rr < 8:
        rr_status = "Critical"
        sub_scores.append(90)
        abnormalities.append({
            "parameter": "Respiratory Rate",
            "value": f"{rr}/min",
            "severity": "Critical",
            "finding": "Severe Tachypnea" if rr > 30 else "Severe Bradypnea",
            "system": "Respiratory"
        })
    elif rr > 22:
        rr_status = "Elevated"
        sub_scores.append(50)
        abnormalities.append({
            "parameter": "Respiratory Rate",
            "value": f"{rr}/min",
            "severity": "Elevated",
            "finding": "Tachypneic Pattern",
            "system": "Respiratory"
        })
    elif rr < 12:
        rr_status = "Borderline"
        sub_scores.append(30)
        abnormalities.append({
            "parameter": "Respiratory Rate",
            "value": f"{rr}/min",
            "severity": "Moderate",
            "finding": "Mild Bradypnea",
            "system": "Respiratory"
        })
    else:
        sub_scores.append(5)

    # 6. Blood Glucose (Normal: 70-140 mg/dL)
    glu = v.glucose
    glu_status = "Normal"
    if glu >= 300 or glu < 55:
        glu_status = "Critical"
        sub_scores.append(85)
        abnormalities.append({
            "parameter": "Blood Glucose",
            "value": f"{glu} mg/dL",
            "severity": "Critical",
            "finding": "Severe Hyperglycemia" if glu >= 300 else "Severe Acute Hypoglycemia",
            "system": "Metabolic"
        })
    elif glu >= 200:
        glu_status = "Elevated"
        sub_scores.append(55)
        abnormalities.append({
            "parameter": "Blood Glucose",
            "value": f"{glu} mg/dL",
            "severity": "Elevated",
            "finding": "Marked Hyperglycemia",
            "system": "Metabolic"
        })
    elif glu > 140:
        glu_status = "Borderline"
        sub_scores.append(25)
        abnormalities.append({
            "parameter": "Blood Glucose",
            "value": f"{glu} mg/dL",
            "severity": "Moderate",
            "finding": "Elevated Postprandial Glucose",
            "system": "Metabolic"
        })
    elif glu < 70:
        glu_status = "Elevated"
        sub_scores.append(60)
        abnormalities.append({
            "parameter": "Blood Glucose",
            "value": f"{glu} mg/dL",
            "severity": "Elevated",
            "finding": "Mild Hypoglycemia",
            "system": "Metabolic"
        })
    else:
        sub_scores.append(5)

    # Compound Synergies
    synergy_boost = 0
    syndrome = None
    if spo2 < 92 and rr > 22:
        synergy_boost += 20
        syndrome = "Acute Cardiorespiratory Compromise Pattern"
    if temp >= 100.8 and hr >= 100:
        synergy_boost += 15
        syndrome = (syndrome + " with Systemic Inflammatory Stress") if syndrome else "Systemic Physiological Stress / Fever Pattern"
    if (sbp >= 165 or dbp >= 100) and hr >= 95:
        synergy_boost += 15
        syndrome = syndrome or "Hypertensive Cardiovascular Strain Pattern"
    if glu >= 250 and rr >= 24:
        synergy_boost += 15
        syndrome = syndrome or "Metabolic Hyperglycemic Stress Pattern"

    max_sub = max(sub_scores) if sub_scores else 5
    avg_sub = sum(sub_scores) / len(sub_scores) if sub_scores else 5
    raw_score = (max_sub * 0.55) + (avg_sub * 0.45) + synergy_boost
    risk_score = round(min(100.0, max(5.0, raw_score)), 1)

    if risk_score >= 75.0 or spo2 < 89 or sbp >= 180 or temp >= 104.0:
        risk_level = "High"
        health_state = "High-Risk Physiological Compromise"
        state_badge = "High"
        recommended_action = "Urgent clinical evaluation required. Emergency medical review advised."
        emergency_warning = True
    elif risk_score >= 50.0 or len(abnormalities) >= 2:
        risk_level = "Elevated"
        health_state = "Elevated Physiological Strain"
        state_badge = "Elevated"
        recommended_action = "Schedule prompt physician consultation. Initiate continuous vital monitoring."
        emergency_warning = False
    elif risk_score >= 25.0 or len(abnormalities) >= 1:
        risk_level = "Moderate"
        health_state = "Moderate Physiological Variation"
        state_badge = "Moderate"
        recommended_action = "Continue regular monitoring and review contributing lifestyle/hydration factors."
        emergency_warning = False
    else:
        risk_level = "Stable"
        health_state = "Stable Physiological State"
        state_badge = "Stable"
        recommended_action = "Maintain routine wellness care and scheduled follow-ups."
        emergency_warning = False

    if risk_level == "High":
        trajectory = "Potential trajectory: Significant cardiopulmonary or metabolic decompensation may accelerate if abnormal vital trends continue unmanaged. Immediate clinical intervention is recommended to prevent acute worsening."
    elif risk_level == "Elevated":
        trajectory = "Potential trajectory: The physiological stress pattern observed across multiple vitals suggests increasing systemic burden. If this trend continues over the next 12 to 24 hours, escalated clinical intervention and secondary laboratory diagnostics may be warranted."
    elif risk_level == "Moderate":
        trajectory = "Potential trajectory: Mild physiological fluctuation noted. With rest, hydration, and adherence, vital parameters typically stabilize. Ongoing periodic observation is advised to confirm normalization."
    else:
        trajectory = "Potential trajectory: Physiological markers remain within optimal homeostatic ranges. Current telemetry indicates stable cardiopulmonary, metabolic, and thermoregulatory stability."

    precautions = []
    if temp >= 99.5:
        precautions.append("Maintain adequate oral hydration (electrolyte fluids) and restful recovery.")
        precautions.append("Monitor core temperature every 2 hours; seek care if chills or rigidity develop.")
    if spo2 < 95 or rr > 22:
        precautions.append("Position patient upright (semi-Fowler position) to optimize pulmonary ventilation.")
        precautions.append("Avoid strenuous physical exertion and re-check pulse oximetry regularly.")
    if sbp >= 135 or dbp >= 85:
        precautions.append("Rest in a seated, relaxed environment for 15 minutes before re-checking blood pressure.")
        precautions.append("Limit dietary sodium intake and avoid caffeine or acute stimulants.")
    if glu > 140 or glu < 70:
        precautions.append("Verify timing of last nutritional intake and antidiabetic medication.")
        precautions.append("Follow standard hypoglycemia/hyperglycemia dietary protocols as instructed by physician.")
    if not precautions:
        precautions.append("Continue daily activity balance, adequate sleep, and routine wellness hydration.")
        precautions.append("Perform weekly preventative health telemetry checks.")

    med_consideration = None
    if temp >= 101.0 and hr >= 95:
        med_consideration = {
            "title": "Antipyretic & Hydration Consideration",
            "medication_candidate": "Paracetamol 650mg Oral",
            "rationale": "Elevated pyrexia accompanied by elevated tachycardia points to active systemic inflammatory response.",
            "disclaimer": "AI-generated treatment consideration. Requires attending physician clinical verification before administration.",
            "status": "Awaiting Clinician Confirmation"
        }
    elif spo2 < 92:
        med_consideration = {
            "title": "Respiratory Support Consideration",
            "medication_candidate": "Supplemental Oxygen Titration & Inhaled Bronchodilator (e.g. Salbutamol)",
            "rationale": "Sub-optimal peripheral oxygen saturation with increased work of breathing requires respiratory support.",
            "disclaimer": "AI-generated treatment consideration. Requires attending physician clinical verification before administration.",
            "status": "Awaiting Clinician Confirmation"
        }
    elif sbp >= 165 or dbp >= 100:
        med_consideration = {
            "title": "Antihypertensive Titration Consideration",
            "medication_candidate": "Amlodipine 5mg or Telmisartan 40mg Oral Review",
            "rationale": "Sustained arterial pressure exceeding target parameters indicates need for pharmacological adjustment.",
            "disclaimer": "AI-generated treatment consideration. Requires attending physician clinical verification before administration.",
            "status": "Awaiting Clinician Confirmation"
        }
    elif glu >= 250:
        med_consideration = {
            "title": "Glycemic Management Consideration",
            "medication_candidate": "Insulin / Hydration Protocol Review",
            "rationale": "Marked glycemic excursion indicates need for metabolic adjustment and hydration replenishment.",
            "disclaimer": "AI-generated treatment consideration. Requires attending physician clinical verification before administration.",
            "status": "Awaiting Clinician Confirmation"
        }
    else:
        med_consideration = {
            "title": "Maintenance Therapy",
            "medication_candidate": "Continue Prescribed Maintenance Medications",
            "rationale": "No acute pharmacological adjustments indicated by current simulated physiological parameters.",
            "disclaimer": "All therapies remain under attending clinician supervision.",
            "status": "Clinically Verified"
        }

    return {
        "analysis_id": f"dta_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "vitals_snapshot": v.model_dump() if hasattr(v, "model_dump") else v.dict(),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "health_state": health_state,
        "state_badge": state_badge,
        "syndrome": syndrome,
        "emergency_warning": emergency_warning,
        "vital_statuses": {
            "heart_rate": hr_status,
            "blood_pressure": bp_status,
            "oxygen_saturation": spo2_status,
            "temperature": temp_status,
            "respiratory_rate": rr_status,
            "glucose": glu_status
        },
        "detected_abnormalities": abnormalities,
        "potential_trajectory": trajectory,
        "precautions": precautions,
        "recommended_action": recommended_action,
        "medication_consideration": med_consideration
    }

@router.post("/analyze")
async def analyze_patient_digital_twin(vitals: VitalsInput):
    return {"status": "success", "digital_twin": calculate_digital_twin_analysis(vitals)}

@router.post("/simulate")
async def simulate_future_state(req: SimulationRequest):
    current_res = calculate_digital_twin_analysis(req.current_vitals)
    future_res = calculate_digital_twin_analysis(req.future_vitals)
    score_delta = round(future_res["risk_score"] - current_res["risk_score"], 1)
    return {
        "status": "success",
        "current_state": current_res,
        "future_state": future_res,
        "comparison": {
            "risk_score_delta": score_delta,
            "level_changed": current_res["risk_level"] != future_res["risk_level"],
            "trajectory_shift": "Deteriorating Trend" if score_delta > 0 else ("Improving Trend" if score_delta < 0 else "Stable Trend"),
            "vital_deltas": {
                "heart_rate": round(req.future_vitals.heart_rate - req.current_vitals.heart_rate, 1),
                "systolic": round(req.future_vitals.blood_pressure_systolic - req.current_vitals.blood_pressure_systolic, 1),
                "diastolic": round(req.future_vitals.blood_pressure_diastolic - req.current_vitals.blood_pressure_diastolic, 1),
                "oxygen_saturation": round(req.future_vitals.oxygen_saturation - req.current_vitals.oxygen_saturation, 1),
                "temperature": round(req.future_vitals.temperature - req.current_vitals.temperature, 1),
                "respiratory_rate": round(req.future_vitals.respiratory_rate - req.current_vitals.respiratory_rate, 1),
                "glucose": round(req.future_vitals.glucose - req.current_vitals.glucose, 1)
            }
        }
    }

class TreatmentConsiderationRequest(BaseModel):
    patient_id: Optional[str] = "p_01"
    patient_name: Optional[str] = "Priya Sharma"
    vitals_snapshot: Optional[Dict[str, Any]] = None
    risk_level: Optional[str] = "Elevated"
    risk_score: Optional[float] = 55.0
    medication_consideration: Dict[str, Any]

@router.post("/submit-treatment-consideration")
async def submit_treatment_consideration(req: TreatmentConsiderationRequest):
    draft_id = f"presc_dt_{uuid.uuid4().hex[:6]}"
    med_info = req.medication_consideration
    candidate_name = med_info.get("candidateMedication") or med_info.get("medication_candidate") or "Paracetamol 650mg Oral Tablet"
    dosage = med_info.get("dosageInstructions") or "1 tablet with water SOS"
    target_doctor_id = med_info.get("suggestedDoctorId") or "doc_05"
    target_doctor_name = med_info.get("suggestedDoctor") or "Dr. Rajesh Rao (Attending Physician)"

    presc_record = {
        "id": draft_id,
        "patient_id": req.patient_id or "p_01",
        "patient_name": req.patient_name or "Priya Sharma",
        "source": f"Patient Digital Twin ({req.risk_level} Risk - {req.risk_score}%)",
        "ai_draft": f"Digital Twin Telemetry Synthesis: {med_info.get('title', 'Clinical Protocol')}. Rationale: {med_info.get('rationale', 'Physiological parameter variation')}",
        "medications": [
            {
                "name": candidate_name,
                "dosage": dosage,
                "frequency": "As clinically validated by physician"
            }
        ],
        "remedies": [
            "Maintain restful recovery in semi-Fowler position",
            "Monitor core vitals every 30-60 minutes",
            "Maintain oral electrolyte hydration"
        ],
        "doctor_confirmation_status": "Pending",
        "doctor_id": target_doctor_id,
        "doctor_name": target_doctor_name,
        "final_text": None,
        "review_notes": None,
        "created_at": "Just now"
    }

    db.prescriptions[draft_id] = presc_record
    db.save_prescription(presc_record)

    # Also register a notification in patient record
    patient = db.patients.get(req.patient_id or "p_01")
    if patient:
        notif = {
            "id": f"notif_{uuid.uuid4().hex[:6]}",
            "type": "digital_twin_submitted",
            "title": "Treatment Consideration Submitted to Doctor",
            "message": f"Your Digital Twin telemetry and proposed medication consideration ({candidate_name}) have been submitted to {target_doctor_name} for clinical verification.",
            "prescription_id": draft_id,
            "timestamp": "Just now",
            "read": False
        }
        patient.setdefault("notifications", []).append(notif)
        db.save_patient(patient)

    return {
        "status": "success",
        "message": f"Treatment consideration transmitted to {target_doctor_name} for clinical review",
        "prescription_id": draft_id,
        "prescription": presc_record
    }

