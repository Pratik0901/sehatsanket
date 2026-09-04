import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import (
    DoctorProfile, PrescriptionDraft, PrescriptionConfirmRequest,
    AppointmentBookingRequest, ConsultationSession
)
from app.database import db

router = APIRouter(tags=["Doctors & Prescriptions"])

@router.get("/doctors/available")
def get_available_doctors(
    language: Optional[str] = Query(None, description="Patient preferred language (en, hi, kn, ta, te)"),
    specialty: Optional[str] = Query(None, description="Filtered medical specialty")
):
    # Synchronize with PostgreSQL to ensure any newly registered doctors are loaded
    conn = db._get_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                SELECT d.id, d.name, d.specialization, d.experience_years, d.rating, 
                       d.spoken_languages, d.clinic_address, d.session_fee, d.avatar_url, 
                       d.is_available, d.available_slots, d.assigned_patient_ids,
                       COALESCE(u.username, d.id) AS username
                FROM doctors d
                LEFT JOIN users u ON u.id = d.id OR u.username = d.id;
                """)
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        db.doctors[r[0]] = {
                            "id": r[0], "name": r[1], "specialization": r[2], "experience_years": r[3],
                            "rating": r[4], "spoken_languages": r[5] or [], "clinic_address": r[6] or "",
                            "session_fee": r[7], "avatar_url": r[8] or "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
                            "is_available": r[9] if r[9] is not None else True,
                            "available_slots": r[10] or ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM", "06:00 PM"],
                            "assigned_patient_ids": r[11] or [],
                            "username": r[12] or r[0],
                            "is_registered": True
                        }
        except Exception as e:
            print("Notice updating available doctors from PostgreSQL:", e)
        finally:
            conn.close()

    all_docs = list(db.doctors.values())
    filtered = []

    # Priority 1: Matches language and specialty (if specified)
    # Priority 2: Matches language
    # Priority 3: Other available doctors (fallback)
    matched_lang_and_spec = []
    matched_lang = []
    fallback_docs = []

    for doc in all_docs:
        if not doc.get("is_available", True):
            continue
        
        spoken = [l.lower() for l in doc.get("spoken_languages", [])] if doc.get("spoken_languages") else []
        has_lang = (language.lower() in spoken) if language else True
        has_spec = (specialty.lower() in doc.get("specialization", "").lower()) if specialty else True

        if has_lang and has_spec:
            matched_lang_and_spec.append(doc)
        elif has_lang:
            matched_lang.append(doc)
        else:
            fallback_docs.append(doc)

    # Combine with priority order
    result = matched_lang_and_spec + matched_lang + fallback_docs
    return {
        "doctors": result,
        "language_matched_count": len(matched_lang_and_spec) + len(matched_lang),
        "total_available": len(result),
        "is_fallback_applied": (len(matched_lang_and_spec) == 0 and len(matched_lang) == 0 and language is not None)
    }

@router.get("/doctors/{doctor_id}")
def get_doctor_by_id(doctor_id: str):
    doc = db.doctors.get(doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc

@router.post("/appointments/book")
def book_appointment(req: AppointmentBookingRequest):
    doc = db.doctors.get(req.doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    patient = db.patients.get(req.patient_id)
    patient_name = patient.get("name", "Patient") if patient else "Patient"

    consult_id = f"consult_{uuid.uuid4().hex[:6]}"
    apt_id = f"apt_{uuid.uuid4().hex[:6]}"

    apt_record = {
        "id": apt_id,
        "consultation_id": consult_id,
        "patient_id": req.patient_id,
        "patient_name": patient_name,
        "doctor_id": req.doctor_id,
        "doctor_name": doc["name"],
        "specialization": doc["specialization"],
        "time": req.slot_time,
        "date": req.date,
        "status": "Booked",
        "symptoms": req.symptoms,
        "language_pair": f"{req.preferred_language.upper()} ⟷ English",
        "created_at": "Just now"
    }
    db.appointments[apt_id] = apt_record
    db.save_appointment(apt_record)

    session = {
        "id": consult_id,
        "appointment_id": apt_id,
        "patient_id": req.patient_id,
        "doctor_id": req.doctor_id,
        "patient_name": patient_name,
        "doctor_name": doc["name"],
        "specialization": doc["specialization"],
        "scheduled_time": f"{req.date} at {req.slot_time}",
        "status": "Scheduled",
        "language_pair": f"{req.preferred_language}-en",
        "symptoms": req.symptoms,
        "transcript": [
            {"speaker": "System", "text": f"Consultation booked for {patient_name} with {doc['name']} ({req.preferred_language.upper()} <-> EN).", "time": "Just now"}
        ]
    }
    db.consultations[consult_id] = session
    db.save_consultation(session)

    # Add to doctor's assigned patients if not present
    if req.patient_id not in doc.get("assigned_patient_ids", []):
        doc.setdefault("assigned_patient_ids", []).append(req.patient_id)

    return {
        "message": f"Appointment confirmed successfully with {doc['name']}",
        "doctor": doc,
        "appointment": apt_record,
        "consultation": session
    }

@router.get("/doctors/{doctor_id}/schedule")
def get_doctor_schedule(doctor_id: str):
    if doctor_id == "all":
        booked_apts = list(db.appointments.values())
        slots = []
        slot_id = 1
        for apt in booked_apts:
            slots.append({
                "id": slot_id,
                "time": apt.get("time", "10:00 AM"),
                "date": apt.get("date", "Today"),
                "patient": f"{apt.get('patient_name')} ({apt.get('symptoms') or 'Clinical Consult'})",
                "patient_name": apt.get("patient_name"),
                "symptoms": apt.get("symptoms", ""),
                "status": "Booked",
                "lang": apt.get("language_pair"),
                "doctor_name": apt.get("doctor_name"),
                "consultation_id": apt.get("consultation_id", "consult_01")
            })
            slot_id += 1
        return {
            "doctor_id": "all",
            "doctor_name": "Hospital Central Schedule",
            "schedule": slots
        }

    doc = db.doctors.get(doctor_id)
    if not doc:
        doctor_id = "doc_01"
        doc = db.doctors.get("doc_01")
    
    default_slots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "04:30 PM", "06:00 PM"]
    
    def norm(t):
        if not t:
            return ""
        return t.strip().upper().replace(" ", "").lstrip("0")

    booked_apts = [
        a for a in db.appointments.values() 
        if a.get("doctor_id") == doctor_id or a.get("doctor_name") == doc.get("name")
    ]
    booked_by_time = {norm(a.get("time")): a for a in booked_apts}

    slots = []
    slot_id = 1
    for t_str in default_slots:
        n_t = norm(t_str)
        if n_t in booked_by_time:
            apt = booked_by_time[n_t]
            slots.append({
                "id": slot_id,
                "time": t_str,
                "date": apt.get("date", "Today"),
                "patient": f"{apt.get('patient_name')} ({apt.get('symptoms') or 'Clinical Consult'})",
                "patient_name": apt.get("patient_name"),
                "symptoms": apt.get("symptoms", ""),
                "status": "Booked",
                "lang": apt.get("language_pair"),
                "doctor_name": doc["name"],
                "consultation_id": apt.get("consultation_id", "consult_01")
            })
        else:
            slots.append({
                "id": slot_id,
                "time": t_str,
                "date": "Today",
                "patient": "Available Slot",
                "patient_name": None,
                "symptoms": None,
                "status": "Open",
                "lang": None,
                "doctor_name": doc["name"],
                "consultation_id": None
            })
        slot_id += 1

    # Include any custom slots booked outside the default list
    for a in booked_apts:
        if norm(a.get("time")) not in [norm(s) for s in default_slots]:
            slots.append({
                "id": slot_id,
                "time": a.get("time", "Custom Time"),
                "date": a.get("date", "Today"),
                "patient": f"{a.get('patient_name')} ({a.get('symptoms') or 'Clinical Consult'})",
                "patient_name": a.get("patient_name"),
                "symptoms": a.get("symptoms", ""),
                "status": "Booked",
                "lang": a.get("language_pair"),
                "doctor_name": doc["name"],
                "consultation_id": a.get("consultation_id", "consult_01")
            })
            slot_id += 1

    return {
        "doctor_id": doctor_id,
        "doctor_name": doc["name"],
        "schedule": slots
    }

@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(appointment_id: str):
    if appointment_id in db.appointments:
        apt = db.appointments[appointment_id]
        apt["status"] = "Cancelled"
        db.save_appointment(apt)
        return {"status": "success", "message": "Appointment cancelled successfully"}
    return {"status": "not_found", "message": "Appointment not found"}

@router.get("/prescriptions/pending")
def get_pending_prescriptions(doctor_id: Optional[str] = None):
    results = []
    for presc in db.prescriptions.values():
        if presc.get("doctor_confirmation_status") == "Pending":
            results.append(presc)
    if doctor_id:
        results.sort(key=lambda p: (p.get("doctor_id") != doctor_id))
    return results

@router.post("/prescriptions/{presc_id}/confirm")
def confirm_prescription(presc_id: str, req: PrescriptionConfirmRequest):
    presc = db.prescriptions.get(presc_id)
    if not presc:
        raise HTTPException(status_code=404, detail="Prescription draft not found")

    doctor = db.doctors.get(req.doctor_id)
    doctor_name = doctor["name"] if doctor else "Attending Physician"

    presc["doctor_confirmation_status"] = req.status
    presc["doctor_id"] = req.doctor_id
    presc["doctor_name"] = doctor_name
    presc["review_notes"] = req.review_notes

    if req.status in ["Approved", "Modified"]:
        if req.modified_medications:
            presc["medications"] = req.modified_medications
        presc["final_text"] = req.final_text or presc["ai_draft"]

        # Automatically add approved medications to patient's active medications
        patient_id = presc.get("patient_id")
        if patient_id and patient_id in db.patients:
            patient = db.patients[patient_id]
            for m in presc.get("medications", []):
                new_med = {
                    "id": f"med_rx_{uuid.uuid4().hex[:4]}",
                    "name": m.get("name"),
                    "dosage": m.get("dosage", "1 dose"),
                    "frequency": m.get("frequency", "Daily"),
                    "timing": "09:00 AM",
                    "taken_today": False,
                    "instructions": f"Prescribed by {doctor_name}"
                }
                patient.setdefault("active_medications", []).append(new_med)

            notif_entry = {
                "id": f"notif_{uuid.uuid4().hex[:6]}",
                "type": "prescription_approved",
                "title": f"Prescription Approved by {doctor_name}",
                "message": f"Dr. {doctor_name.replace('Dr. ', '')} has verified and approved your AI Home Care medications. They have been added to your active daily reminders.",
                "prescription_id": presc_id,
                "doctor_name": doctor_name,
                "medications": presc.get("medications", []),
                "review_notes": req.review_notes or "Clinically verified by attending physician.",
                "timestamp": "Just now",
                "read": False
            }
            patient.setdefault("notifications", []).append(notif_entry)
            db.save_patient(patient)

    db.save_prescription(presc)

    return {
        "message": f"Prescription successfully {req.status.lower()} by {doctor_name}",
        "prescription": presc
    }
