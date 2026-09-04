from typing import Dict, Any, List

class ReadmissionRiskService:
    def calculate_risk(self, patient: Dict[str, Any]) -> Dict[str, Any]:
        age = patient.get("age", 40)
        history = patient.get("medical_history", [])
        meds = patient.get("active_medications", [])
        
        base_score = 10.0

        # Age weighting
        if age > 65:
            base_score += 15.0
        elif age > 50:
            base_score += 8.0

        # Comorbidity weighting
        history_text = " ".join(history).lower()
        if "heart failure" in history_text or "chf" in history_text:
            base_score += 26.0
        if "diabetes" in history_text:
            base_score += 10.0
        if "hypertension" in history_text:
            base_score += 4.0
        if "post-op" in history_text or "discharged" in history_text:
            base_score += 6.0

        # Medication adherence weighting
        total_meds = len(meds)
        taken_meds = sum(1 for m in meds if m.get("taken_today", False))
        if total_meds > 0:
            adherence_ratio = taken_meds / total_meds
            if adherence_ratio < 0.4:
                base_score += 12.0
            elif adherence_ratio >= 0.8:
                base_score -= 10.0
            elif adherence_ratio >= 0.5:
                base_score -= 6.0

        score = max(5.0, min(95.0, round(base_score, 1)))

        if score < 30.0:
            level = "Low"
            recommendations = [
                "Continue taking prescribed medications on time.",
                "Maintain scheduled post-discharge checkup.",
                "Log any new or changing symptoms in the SehatSanketh AI assistant."
            ]
        elif score < 60.0:
            level = "Moderate"
            recommendations = [
                "Ensure strict adherence to daily medication times.",
                "Avoid high-sodium foods and monitor blood pressure / weight daily.",
                "Keep close track of scheduled diagnostic follow-ups."
            ]
        else:
            level = "High"
            recommendations = [
                "Urgent clinical monitoring: Ensure daily vitals and weight are monitored.",
                "Do not skip diuretic or cardiac doses without consulting your doctor.",
                "Use the instant Doctor Consultation booking if you experience breathlessness or leg swelling."
            ]

        factors = []
        if age > 50:
            factors.append(f"Age group risk factor ({age} years)")
        for h in history:
            factors.append(f"Clinical history factor: {h}")
        if total_meds > 0:
            factors.append(f"Current medication adherence: {int((taken_meds/total_meds)*100)}% today")

        return {
            "patient_id": patient.get("id"),
            "risk_score": score,
            "risk_level": level,
            "risk_factors": factors,
            "clinical_recommendations": recommendations
        }

readmission_service = ReadmissionRiskService()
