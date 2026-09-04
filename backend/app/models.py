from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Models ---
class UserLogin(BaseModel):
    username: str
    password: str
    role: str  # 'patient' | 'doctor' | 'admin'

class UserRegister(BaseModel):
    name: str
    username: str
    password: str
    preferred_language: str = "en"
    specialization: Optional[str] = None
    spoken_languages: Optional[List[str]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# --- Patient Models ---
class MedicationItem(BaseModel):
    id: str
    name: str
    dosage: str
    frequency: str
    timing: str  # e.g., "08:00 AM"
    taken_today: bool = False
    instructions: Optional[str] = None

class PatientProfile(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    preferred_language: str
    medical_history: List[str]
    active_medications: List[MedicationItem]
    risk_score: float  # Readmission risk (0-100)
    risk_level: str   # 'Low', 'Moderate', 'High'
    risk_factors: List[str]
    post_discharge_followups: List[Dict[str, Any]]

# --- Doctor Models ---
class DoctorProfile(BaseModel):
    id: str
    name: str
    specialization: str
    experience_years: int
    rating: float
    spoken_languages: List[str]
    clinic_address: str
    session_fee: int
    avatar_url: str
    is_available: bool = True
    available_slots: List[str]
    assigned_patient_ids: List[str] = []

# --- Triage Models ---
class TriageRequest(BaseModel):
    patient_id: str
    language: str = "en"
    symptom_text: str
    audio_base64: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class TriageResult(BaseModel):
    session_id: str
    status: str  # 'inquiry' (needs clarifying questions) | 'completed'
    clarifying_question: Optional[str] = None
    triage_category: Optional[str] = None  # 'Home Care' | 'Doctor Consultation'
    urgency_level: str  # 'Routine', 'Moderate', 'Urgent', 'Emergency'
    confidence: float
    analysis_summary: str
    chatbot_reply: Optional[str] = None
    clinical_understanding: Optional[str] = None
    audio_base64: Optional[str] = None
    detected_language: str
    suggested_specialty: Optional[str] = None
    home_remedies: Optional[List[str]] = None
    suggested_medications: Optional[List[Any]] = None
    prescription_draft_id: Optional[str] = None
    doctor_confirmation_status: Optional[str] = None
    assigned_doctor_name: Optional[str] = None
    emergency_flag: Optional[bool] = False
    powered_by: Optional[str] = None

# --- Prescription Models ---
class PrescriptionDraft(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    source: str  # 'AI Triage' | 'Doctor Consultation'
    ai_draft: str
    medications: List[Dict[str, str]]
    remedies: List[str]
    doctor_confirmation_status: str  # 'Pending', 'Approved', 'Rejected', 'Modified'
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    final_text: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: str

class PrescriptionConfirmRequest(BaseModel):
    doctor_id: str
    status: str  # 'Approved', 'Modified', 'Rejected'
    final_text: Optional[str] = None
    modified_medications: Optional[List[Dict[str, str]]] = None
    review_notes: Optional[str] = None

# --- Appointment / Consultation ---
class AppointmentBookingRequest(BaseModel):
    patient_id: str
    doctor_id: str
    slot_time: str
    date: str
    symptoms: str
    preferred_language: str

class ConsultationSession(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    patient_name: str
    doctor_name: str
    scheduled_time: str
    status: str  # 'Scheduled', 'In-Progress', 'Completed'
    language_pair: str  # e.g., 'kn-en', 'hi-en'
    transcript: List[Dict[str, Any]] = []

# --- Emergency Models ---
class EmergencyTriggerRequest(BaseModel):
    patient_id: str
    location_lat: float
    location_lng: float
    address: Optional[str] = "Detected Patient Location"
    symptom_notes: Optional[str] = "One-tap Emergency Triggered"

class EmergencyEvent(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    patient_phone: str
    timestamp: str
    location_lat: float
    location_lng: float
    address: str
    severity: str  # 'High Alert', 'Critical'
    ai_explainability: str
    is_probable_false_alarm: bool
    status: str  # 'Pending Admin Review', 'Ambulance Dispatched', 'Resolved'
    assigned_ambulance_id: Optional[str] = None
    recommended_ambulance_id: Optional[str] = None
    recommended_ambulance_vehicle: Optional[str] = None
    ambulance_eta_mins: Optional[int] = None

class DispatchAmbulanceRequest(BaseModel):
    ambulance_id: str

# --- Hospital Resources Models ---
class AmbulanceResource(BaseModel):
    id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    status: str  # 'Available', 'Dispatched', 'Maintenance'
    current_location: str
    lat: float
    lng: float
    fuel_level: int
    assigned_emergency_id: Optional[str] = None

class MedicineInventoryItem(BaseModel):
    id: str
    name: str
    category: str
    stock_count: int
    min_threshold: int
    unit: str
    status: str  # 'In Stock', 'Low Stock', 'Critical'

class AdmittedPatient(BaseModel):
    id: str
    name: str
    age: int
    ward: str
    bed_number: str
    admission_date: str
    diagnosis: str
    attending_doctor: str
    readmission_risk_score: float
    medication_administered: List[str]

# --- Reminders Models ---
class ReminderCreateRequest(BaseModel):
    patient_id: str
    title: str
    type: str  # 'medication' | 'follow-up' | 'test'
    time: str
    dosage: Optional[str] = None
    date: Optional[str] = None

class ReminderActionRequest(BaseModel):
    action: str  # 'take' | 'snooze'
