from fastapi import APIRouter, HTTPException, status
from app.models import UserLogin, UserRegister, TokenResponse
from app.auth import create_access_token
from app.database import db

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register/{role}", response_model=TokenResponse)
def register(role: str, data: UserRegister):
    if role not in ["patient", "doctor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'patient', 'doctor', or 'admin'.")

    if data.username in db.users:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = {
        "id": f"u_{len(db.users) + 1}",
        "username": data.username,
        "password": data.password,
        "role": role,
        "name": data.name,
        "preferred_language": data.preferred_language,
        "specialization": data.specialization,
        "spoken_languages": data.spoken_languages or ["en"]
    }
    db.users[data.username] = new_user
    db.save_user(new_user)

    # If patient, create initial record
    if role == "patient":
        pat_record = {
            "id": new_user["id"],
            "name": data.name,
            "age": 30,
            "gender": "Other",
            "phone": "+91 99000 11223",
            "preferred_language": data.preferred_language,
            "medical_history": ["New Patient Registration"],
            "active_medications": [],
            "risk_score": 15.0,
            "risk_level": "Low",
            "risk_factors": ["New registration; baseline profile"],
            "post_discharge_followups": []
        }
        db.patients[new_user["id"]] = pat_record
        db.save_patient(pat_record)

    token = create_access_token({"sub": data.username, "role": role, "name": data.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user["id"],
            "username": new_user["username"],
            "name": new_user["name"],
            "role": new_user["role"],
            "preferred_language": new_user.get("preferred_language", "en")
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):
    user = db.users.get(data.username)
    if not user or user["password"] != data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # If role mismatch, allow flexible persona switching or align
    token = create_access_token({
        "sub": user["username"],
        "role": user["role"],
        "name": user["name"]
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "preferred_language": user.get("preferred_language", "en"),
            "specialization": user.get("specialization")
        }
    }

@router.get("/demo-users")
def get_demo_users():
    """Returns instant one-click login accounts for demonstration"""
    return [
        {
            "role": "patient",
            "username": "patient_priya",
            "name": "Priya Sharma",
            "description": "Patient (Speaks Hindi, Post-Op Day 6, Low Risk)",
            "patient_id": "p_01",
            "language": "hi"
        },
        {
            "role": "patient",
            "username": "patient_ramesh",
            "name": "Ramesh Kumar",
            "description": "Patient (Speaks Kannada, CHF High Readmission Risk)",
            "patient_id": "p_02",
            "language": "kn"
        },
        {
            "role": "doctor",
            "username": "doc_ching",
            "name": "Dr. Ching Ming Yang",
            "description": "Cardiologist (Speaks English & Hindi)",
            "doctor_id": "doc_01"
        },
        {
            "role": "doctor",
            "username": "doc_rajesh",
            "name": "Dr. Rajesh Rao",
            "description": "General Physician (Speaks Kannada, Hindi, Telugu, English)",
            "doctor_id": "doc_05"
        },
        {
            "role": "admin",
            "username": "admin_vikram",
            "name": "Admin Vikram Malhotra",
            "description": "Hospital Administrator (Emergency Command & Resources)",
            "admin_id": "adm_01"
        }
    ]
