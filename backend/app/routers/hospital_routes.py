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
@router.post("/medicines/{med_id}/adjust-stock")
def adjust_medicine_stock(med_id: str, quantity: int = 50, delta: int = None):
    med = db.medicines.get(med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicine item not found")
    
    amount = delta if delta is not None else quantity
    new_stock = max(0, med["stock_count"] + amount)
    med["stock_count"] = new_stock
    
    if new_stock == 0:
        med["status"] = "Critical"
    elif new_stock <= med.get("min_threshold", 50):
        med["status"] = "Low Stock"
    else:
        med["status"] = "In Stock"
        
    action_text = f"added {amount}" if amount >= 0 else f"deducted {abs(amount)}"
    return {
        "message": f"Successfully {action_text} {med.get('unit', 'units')} for {med['name']}. Current stock: {new_stock} {med.get('unit', 'units')}.",
        "medicine": med,
        "new_stock": new_stock
    }
