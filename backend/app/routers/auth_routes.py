import uuid
from fastapi import APIRouter, HTTPException, status
from app.models import UserLogin, UserRegister, TokenResponse
from app.auth import create_access_token
from app.database import db

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register/{role}", response_model=TokenResponse)
def register(role: str, data: UserRegister):
    role_norm = role.lower()
    if role_norm not in ["patient", "doctor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'patient', 'doctor', or 'admin'.")

    # 1. Check uniqueness across memory and Neon PostgreSQL
    existing = db.users.get(data.username)
    if not existing:
        conn = db._get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM users WHERE username = %s;", (data.username,))
                    if cur.fetchone():
                        existing = True
            except Exception as e:
                print("Notice checking existing user in Neon PSQL:", e)
            finally:
                conn.close()

    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{data.username}' already exists. Please choose a different username or sign in.")

    # 2. Generate unique ID for user
    if role_norm == "patient":
        user_id = f"p_{uuid.uuid4().hex[:6]}"
    elif role_norm == "doctor":
        user_id = f"doc_{uuid.uuid4().hex[:6]}"
    elif role_norm == "admin":
        user_id = f"adm_{uuid.uuid4().hex[:6]}"
    else:
        user_id = f"u_{uuid.uuid4().hex[:6]}"

    new_user = {
        "id": user_id,
        "username": data.username,
        "password": data.password,
        "role": role_norm,
        "name": data.name,
        "preferred_language": data.preferred_language or "en",
        "specialization": data.specialization if role_norm == "doctor" else None,
        "spoken_languages": data.spoken_languages or ([data.preferred_language or "en", "en"] if role_norm == "doctor" else [data.preferred_language or "en"])
    }

    # Persist user in Neon PostgreSQL & memory
    db.users[data.username] = new_user
    db.save_user(new_user)

    # 3. Create role-specific domain record
    if role_norm == "patient":
        pat_record = {
            "id": user_id,
            "name": data.name,
            "age": data.age or 30,
            "gender": data.gender or "Other",
            "phone": data.phone or "+91 99000 11223",
            "preferred_language": data.preferred_language or "en",
            "medical_history": data.medical_history if data.medical_history else ["Registered Patient"],
            "active_medications": [],
            "risk_score": 15.0,
            "risk_level": "Low",
            "risk_factors": ["Newly registered patient profile"],
            "post_discharge_followups": []
        }
        db.patients[user_id] = pat_record
        db.save_patient(pat_record)

    elif role_norm == "doctor":
        avatar_pool = [
            "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1594824813586-77823f66c9bb?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
            "https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&w=400&q=80"
        ]
        assigned_avatar = data.avatar_url or avatar_pool[abs(hash(data.username)) % len(avatar_pool)]
        doc_record = {
            "id": user_id,
            "name": data.name if data.name.startswith("Dr.") else f"Dr. {data.name}",
            "specialization": data.specialization or "General Physician",
            "experience_years": data.experience_years or 5,
            "rating": 5.0,
            "spoken_languages": data.spoken_languages or ([data.preferred_language, "en"] if data.preferred_language else ["en", "hi"]),
            "clinic_address": data.clinic_address or "Apollo Metro Hospital & Clinics",
            "session_fee": data.session_fee or 60,
            "avatar_url": assigned_avatar,
            "is_available": True,
            "available_slots": ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM", "06:00 PM"],
            "assigned_patient_ids": []
        }
        db.doctors[user_id] = doc_record
        db.save_doctor(doc_record)

    token = create_access_token({"sub": data.username, "role": role_norm, "name": data.name})

    user_payload = {
        "id": user_id,
        "username": data.username,
        "name": data.name,
        "role": role_norm,
        "preferred_language": data.preferred_language or "en",
        "lang": data.preferred_language or "en"
    }
    if role_norm == "patient":
        user_payload["patientId"] = user_id
    elif role_norm == "doctor":
        user_payload["doctorId"] = user_id
        user_payload["specialization"] = data.specialization or "General Physician"
    elif role_norm == "admin":
        user_payload["adminId"] = user_id

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload
    }

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):
    user = db.users.get(data.username)
    # If not found in cache, check Neon PostgreSQL
    if not user:
        conn = db._get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, username, password, role, name, preferred_language, specialization, spoken_languages FROM users WHERE username = %s;",
                        (data.username,)
                    )
                    r = cur.fetchone()
                    if r:
                        user = {
                            "id": r[0],
                            "username": r[1],
                            "password": r[2],
                            "role": r[3],
                            "name": r[4],
                            "preferred_language": r[5] or "en",
                            "specialization": r[6],
                            "spoken_languages": r[7] or []
                        }
                        db.users[data.username] = user
            except Exception as err:
                print("Error retrieving user from Neon PSQL:", err)
            finally:
                conn.close()

    if not user or user["password"] != data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token({
        "sub": user["username"],
        "role": user["role"],
        "name": user["name"]
    })

    user_payload = {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "preferred_language": user.get("preferred_language", "en"),
        "lang": user.get("preferred_language", "en")
    }
    if user["role"] == "patient":
        user_payload["patientId"] = user["id"]
    elif user["role"] == "doctor":
        user_payload["doctorId"] = user["id"]
        user_payload["specialization"] = user.get("specialization", "General Physician")
    elif user["role"] == "admin":
        user_payload["adminId"] = user["id"]

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload
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
            "description": "Cardiologist • 14+ yrs exp • Speaks English & Hindi",
            "doctor_id": "doc_01"
        },
        {
            "role": "doctor",
            "username": "doc_rajesh",
            "name": "Dr. Rajesh Rao",
            "description": "General Physician • 16+ yrs exp • Speaks Kannada, Hindi, Telugu, English",
            "doctor_id": "doc_05"
        },
        {
            "role": "doctor",
            "username": "doc_marc",
            "name": "Dr. Marc Lee",
            "description": "Cardiologist • 10+ yrs exp • Translates via Sarvam AI (English & Kannada)",
            "doctor_id": "doc_02"
        },
        {
            "role": "doctor",
            "username": "doc_olivia",
            "name": "Dr. Olivia Bennett",
            "description": "Therapist & Clinical Psychologist • 8+ yrs exp • Translates via Sarvam AI (English & Telugu)",
            "doctor_id": "doc_03"
        },
        {
            "role": "doctor",
            "username": "doc_ethan",
            "name": "Dr. Ethan Roberts",
            "description": "Pediatrician • 12+ yrs exp • Translates via Sarvam AI (English & Tamil)",
            "doctor_id": "doc_04"
        },
        {
            "role": "admin",
            "username": "admin_vikram",
            "name": "Admin Vikram Malhotra",
            "description": "Hospital Administrator (Emergency Command & Resources)",
            "admin_id": "adm_01"
        }
    ]
