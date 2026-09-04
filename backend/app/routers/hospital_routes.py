from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.database import db

router = APIRouter(prefix="/hospital", tags=["Hospital Resources"])

@router.get("/{hospital_id}/resources")
def get_hospital_resources(hospital_id: str = "hosp_main"):
    total_ambulances = len(db.ambulances)
    available_ambulances = sum(1 for a in db.ambulances.values() if a["status"] == "Available")
    critical_medicines = sum(1 for m in db.medicines.values() if m["status"] in ["Low Stock", "Critical"])
    active_emergencies = sum(1 for e in db.emergencies.values() if e["status"] != "Resolved")
    
    return {
        "hospital_id": hospital_id,
        "hospital_name": "SehatSanketh Metro General Hospital",
        "ambulances": list(db.ambulances.values()),
        "medicines": list(db.medicines.values()),
        "admitted_patients": db.admitted_patients,
        "doctors": list(db.doctors.values()),
        "summary": {
            "total_ambulances": total_ambulances,
            "available_ambulances": available_ambulances,
            "critical_medicines_alert": critical_medicines,
            "admitted_patient_count": len(db.admitted_patients),
            "active_emergencies": active_emergencies
        }
    }

@router.get("/admitted-patients")
def get_admitted_patients():
    return db.admitted_patients

@router.post("/medicines/{med_id}/restock")
def restock_medicine(med_id: str, quantity: int = 200):
    med = db.medicines.get(med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicine item not found")
    med["stock_count"] += quantity
    if med["stock_count"] > med["min_threshold"]:
        med["status"] = "In Stock"
    return {"message": f"Successfully added {quantity} units to {med['name']}.", "medicine": med}
