import uuid
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from app.models import ReminderCreateRequest, ReminderActionRequest
from app.ai_services.readmission import readmission_service
from app.database import db

router = APIRouter(tags=["Reminders & Patient Care"])

@router.get("/patients/{patient_id}/profile")
def get_patient_profile(patient_id: str):
    patient = db.patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")
    
    # Recalculate live risk
    risk_info = readmission_service.calculate_risk(patient)
    patient["risk_score"] = risk_info["risk_score"]
    patient["risk_level"] = risk_info["risk_level"]
    patient["risk_factors"] = risk_info["risk_factors"]

    return {
        "patient": patient,
        "risk_breakdown": risk_info
    }

@router.get("/patients/{patient_id}/risk")
def get_patient_risk(patient_id: str):
    patient = db.patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return readmission_service.calculate_risk(patient)

@router.post("/reminders")
def create_reminder(req: ReminderCreateRequest):
    patient = db.patients.get(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if req.type == "medication":
        new_med = {
            "id": f"med_{uuid.uuid4().hex[:4]}",
            "name": req.title,
            "dosage": req.dosage or "1 tablet",
            "frequency": "Daily",
            "timing": req.time,
            "taken_today": False,
            "instructions": "Added via Reminders"
        }
        patient.setdefault("active_medications", []).append(new_med)
        item = new_med
    else:
        new_followup = {
            "id": f"fol_{uuid.uuid4().hex[:4]}",
            "title": req.title,
            "date": req.date or "2026-09-10",
            "status": "Scheduled",
            "doctor": "Assigned Specialist",
            "department": "Outpatient"
        }
        patient.setdefault("post_discharge_followups", []).append(new_followup)
        item = new_followup

    return {"message": "Reminder created successfully", "item": item}

@router.post("/patients/{patient_id}/meds/{med_id}/action")
def take_medication_action(patient_id: str, med_id: str, req: ReminderActionRequest):
    patient = db.patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    target_med = None
    for med in patient.get("active_medications", []):
        if med.get("id") == med_id:
            target_med = med
            break

    if not target_med:
        raise HTTPException(status_code=404, detail="Medication not found")

    if req.action == "take":
        target_med["taken_today"] = True
    elif req.action == "snooze":
        target_med["taken_today"] = False

    # Recalculate dynamic readmission risk
    updated_risk = readmission_service.calculate_risk(patient)
    patient["risk_score"] = updated_risk["risk_score"]
    patient["risk_level"] = updated_risk["risk_level"]
    patient["risk_factors"] = updated_risk["risk_factors"]

    return {
        "message": f"Medication marked as {'taken' if req.action == 'take' else 'snoozed'}",
        "medication": target_med,
        "updated_risk_score": updated_risk["risk_score"],
        "updated_risk_level": updated_risk["risk_level"]
    }

@router.get("/patients/{patient_id}/notifications")
def get_patient_notifications(patient_id: str):
    patient = db.patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return patient.get("notifications", [])

@router.post("/patients/{patient_id}/notifications/{notif_id}/read")
def mark_notification_read(patient_id: str, notif_id: str):
    patient = db.patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")
    for n in patient.get("notifications", []):
        if n.get("id") == notif_id:
            n["read"] = True
            break
    return {"message": "Notification marked as read"}
