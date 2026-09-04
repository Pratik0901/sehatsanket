from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models import EmergencyTriggerRequest, EmergencyEvent, DispatchAmbulanceRequest
from app.ai_services.emergency import emergency_service
from app.database import db

router = APIRouter(prefix="/emergency", tags=["Emergency Response"])

@router.post("/trigger", response_model=EmergencyEvent)
def trigger_emergency(req: EmergencyTriggerRequest):
    event = emergency_service.evaluate_emergency(
        patient_id=req.patient_id,
        lat=req.location_lat,
        lng=req.location_lng,
        address=req.address or "Bangalore Metropolitan Area",
        symptom_notes=req.symptom_notes or "Immediate Patient Emergency SOS Trigger"
    )
    return event

@router.get("/active", response_model=List[EmergencyEvent])
def get_active_emergencies():
    return list(db.emergencies.values())

@router.post("/{emergency_id}/dispatch")
def dispatch_ambulance(emergency_id: str, req: DispatchAmbulanceRequest):
    try:
        res = emergency_service.dispatch_ambulance(emergency_id, req.ambulance_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{emergency_id}/resolve")
def resolve_emergency(emergency_id: str):
    em = db.emergencies.get(emergency_id)
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")
    
    em["status"] = "Resolved"
    db.save_emergency(em)
    if em.get("assigned_ambulance_id"):
        amb = db.ambulances.get(em["assigned_ambulance_id"])
        if amb:
            amb["status"] = "Available"
            amb["assigned_emergency_id"] = None

    return {"message": "Emergency marked as resolved and ambulance returned to available pool."}
