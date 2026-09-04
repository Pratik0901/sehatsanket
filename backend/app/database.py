import os
import uuid
from datetime import datetime
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import Json

class Database:
    def __init__(self):
        self.users = {
            "patient_priya": {
                "id": "p_01",
                "username": "patient_priya",
                "password": "password123",
                "role": "patient",
                "name": "Priya Sharma",
                "preferred_language": "hi",
            },
            "patient_ramesh": {
                "id": "p_02",
                "username": "patient_ramesh",
                "password": "password123",
                "role": "patient",
                "name": "Ramesh Kumar",
                "preferred_language": "kn",
            },
            "doc_ching": {
                "id": "doc_01",
                "username": "doc_ching",
                "password": "password123",
                "role": "doctor",
                "name": "Dr. Ching Ming Yang",
                "specialization": "Cardiologist",
                "spoken_languages": ["en", "hi"],
            },
            "doc_rajesh": {
                "id": "doc_05",
                "username": "doc_rajesh",
                "password": "password123",
                "role": "doctor",
                "name": "Dr. Rajesh Rao",
                "specialization": "General Physician",
                "spoken_languages": ["kn", "hi", "te", "en"],
            },
            "doc_marc": {
                "id": "doc_02",
                "username": "doc_marc",
                "password": "password123",
                "role": "doctor",
                "name": "Dr. Marc Lee",
                "specialization": "Cardiologist",
                "spoken_languages": ["en", "kn"],
            },
            "doc_olivia": {
                "id": "doc_03",
                "username": "doc_olivia",
                "password": "password123",
                "role": "doctor",
                "name": "Dr. Olivia Bennett",
                "specialization": "Therapist & Clinical Psychologist",
                "spoken_languages": ["en", "te"],
            },
            "doc_ethan": {
                "id": "doc_04",
                "username": "doc_ethan",
                "password": "password123",
                "role": "doctor",
                "name": "Dr. Ethan Roberts",
                "specialization": "Pediatrician",
                "spoken_languages": ["en", "ta"],
            },
            "admin_vikram": {
                "id": "adm_01",
                "username": "admin_vikram",
                "password": "password123",
                "role": "admin",
                "name": "Admin Vikram Malhotra",
                "preferred_language": "en",
            }
        }

        self.patients: Dict[str, Dict[str, Any]] = {
            "p_01": {
                "id": "p_01",
                "name": "Priya Sharma",
                "age": 34,
                "gender": "Female",
                "phone": "+91 98765 43210",
                "preferred_language": "hi",
                "medical_history": [
                    "Hypertension (Grade 1)",
                    "Post-op appendectomy (Discharged 6 days ago)",
                    "Penicillin allergy"
                ],
                "active_medications": [
                    {
                        "id": "med_1",
                        "name": "Amlodipine 5mg",
                        "dosage": "1 tablet daily",
                        "frequency": "Once daily",
                        "timing": "08:00 AM",
                        "taken_today": True,
                        "instructions": "Take after breakfast with water"
                    },
                    {
                        "id": "med_2",
                        "name": "Paracetamol 650mg",
                        "dosage": "1 tablet as needed",
                        "frequency": "Twice daily",
                        "timing": "02:00 PM",
                        "taken_today": False,
                        "instructions": "For mild surgical site soreness"
                    },
                    {
                        "id": "med_3",
                        "name": "Cefixime 200mg",
                        "dosage": "1 tablet",
                        "frequency": "Twice daily",
                        "timing": "08:00 PM",
                        "taken_today": False,
                        "instructions": "Post-op prophylactic antibiotic"
                    }
                ],
                "risk_score": 24.5,
                "risk_level": "Low",
                "risk_factors": [
                    "Wound healing on schedule",
                    "Blood pressure stable at 122/82 mmHg",
                    "Adherence rate > 90%"
                ],
                "post_discharge_followups": [
                    {
                        "id": "fol_1",
                        "title": "Post-Op Wound Inspection",
                        "date": "2026-09-08",
                        "status": "Scheduled",
                        "doctor": "Dr. Rajesh Rao",
                        "department": "General Surgery"
                    },
                    {
                        "id": "fol_2",
                        "title": "Complete Blood Count (CBC)",
                        "date": "2026-09-15",
                        "status": "Pending Test",
                        "doctor": "Lab Services",
                        "department": "Pathology"
                    }
                ]
            },
            "p_02": {
                "id": "p_02",
                "name": "Ramesh Kumar",
                "age": 58,
                "gender": "Male",
                "phone": "+91 97412 88990",
                "preferred_language": "kn",
                "medical_history": [
                    "Type 2 Diabetes Mellitus (12 yrs)",
                    "Congestive Heart Failure (NYHA Class II)",
                    "Discharged from Cardiology 10 days ago"
                ],
                "active_medications": [
                    {
                        "id": "med_4",
                        "name": "Metformin 500mg",
                        "dosage": "1 tablet twice daily",
                        "frequency": "Twice daily",
                        "timing": "09:00 AM",
                        "taken_today": True,
                        "instructions": "Take with meals"
                    },
                    {
                        "id": "med_5",
                        "name": "Furosemide 40mg",
                        "dosage": "1 tablet",
                        "frequency": "Once daily",
                        "timing": "08:00 AM",
                        "taken_today": False,
                        "instructions": "Diuretic - take early in morning"
                    },
                    {
                        "id": "med_6",
                        "name": "Atorvastatin 20mg",
                        "dosage": "1 tablet",
                        "frequency": "Bedtime",
                        "timing": "10:00 PM",
                        "taken_today": False,
                        "instructions": "Cholesterol management"
                    }
                ],
                "risk_score": 68.0,
                "risk_level": "High",
                "risk_factors": [
                    "Missed morning diuretic dose yesterday",
                    "Recent weight fluctuation (+1.4 kg)",
                    "High baseline cardiac risk with comorbidity"
                ],
                "post_discharge_followups": [
                    {
                        "id": "fol_3",
                        "title": "Renal & Electrolyte Profile",
                        "date": "2026-09-06",
                        "status": "Due in 2 days",
                        "doctor": "Dr. Ching Ming Yang",
                        "department": "Cardiology"
                    },
                    {
                        "id": "fol_4",
                        "title": "Echocardiogram Follow-up",
                        "date": "2026-09-20",
                        "status": "Scheduled",
                        "doctor": "Dr. Marc Lee",
                        "department": "Cardiology"
                    }
                ]
            }
        }

        self.doctors: Dict[str, Dict[str, Any]] = {
            "doc_01": {
                "id": "doc_01",
                "name": "Dr. Ching Ming Yang",
                "specialization": "Cardiologist",
                "experience_years": 14,
                "rating": 4.9,
                "spoken_languages": ["en", "hi"],
                "clinic_address": "300 Pasteur DR, Apollo Metro Hub",
                "session_fee": 92,
                "avatar_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
                "is_available": True,
                "available_slots": ["10:00 AM", "11:00 AM", "12:00 PM", "06:00 PM", "07:00 PM"],
                "assigned_patient_ids": ["p_02"]
            },
            "doc_02": {
                "id": "doc_02",
                "name": "Dr. Marc Lee",
                "specialization": "Cardiologist",
                "experience_years": 10,
                "rating": 4.6,
                "spoken_languages": ["en", "kn"],
                "clinic_address": "Cardio Wing B, Sehat Hospital",
                "session_fee": 85,
                "avatar_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
                "is_available": True,
                "available_slots": ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"],
                "assigned_patient_ids": []
            },
            "doc_03": {
                "id": "doc_03",
                "name": "Dr. Olivia Bennett",
                "specialization": "Therapist & Clinical Psychologist",
                "experience_years": 8,
                "rating": 4.3,
                "spoken_languages": ["en", "te"],
                "clinic_address": "Mind Care Center, Sector 4",
                "session_fee": 75,
                "avatar_url": "https://images.unsplash.com/photo-1594824813586-77823f66c9bb?auto=format&fit=crop&w=400&q=80",
                "is_available": True,
                "available_slots": ["10:30 AM", "01:00 PM", "03:30 PM", "05:30 PM"],
                "assigned_patient_ids": []
            },
            "doc_04": {
                "id": "doc_04",
                "name": "Dr. Ethan Roberts",
                "specialization": "Pediatrician",
                "experience_years": 12,
                "rating": 4.5,
                "spoken_languages": ["en", "ta"],
                "clinic_address": "Children's Health Pavilion",
                "session_fee": 80,
                "avatar_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
                "is_available": True,
                "available_slots": ["11:00 AM", "02:00 PM", "04:00 PM", "06:00 PM"],
                "assigned_patient_ids": []
            },
            "doc_05": {
                "id": "doc_05",
                "name": "Dr. Rajesh Rao",
                "specialization": "General Physician",
                "experience_years": 16,
                "rating": 4.8,
                "spoken_languages": ["kn", "hi", "te", "en"],
                "clinic_address": "OPD Block 1, Central Medical",
                "session_fee": 60,
                "avatar_url": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
                "is_available": True,
                "available_slots": ["09:30 AM", "11:00 AM", "02:30 PM", "05:00 PM", "06:30 PM"],
                "assigned_patient_ids": ["p_01"]
            }
        }

        self.ambulances: Dict[str, Dict[str, Any]] = {
            "amb_01": {
                "id": "amb_01",
                "vehicle_number": "KA-04-E-1081",
                "driver_name": "Manjunath K",
                "driver_phone": "+91 98451 22331",
                "status": "Available",
                "current_location": "Zone A - MG Road Cross",
                "lat": 12.9716,
                "lng": 77.5946,
                "fuel_level": 94,
                "assigned_emergency_id": None
            },
            "amb_02": {
                "id": "amb_02",
                "vehicle_number": "KA-04-E-2044",
                "driver_name": "Sunil Gowda",
                "driver_phone": "+91 98452 44552",
                "status": "Available",
                "current_location": "Zone B - Indiranagar 100ft Rd",
                "lat": 12.9784,
                "lng": 77.6408,
                "fuel_level": 82,
                "assigned_emergency_id": None
            },
            "amb_03": {
                "id": "amb_03",
                "vehicle_number": "KA-04-E-3099",
                "driver_name": "Praveen Kumar",
                "driver_phone": "+91 98453 66773",
                "status": "Dispatched",
                "current_location": "En route - Koramangala 80ft Rd",
                "lat": 12.9352,
                "lng": 77.6245,
                "fuel_level": 65,
                "assigned_emergency_id": "em_demo"
            },
            "amb_04": {
                "id": "amb_04",
                "vehicle_number": "KA-04-E-4112",
                "driver_name": "Deepak S",
                "driver_phone": "+91 98454 88994",
                "status": "Maintenance",
                "current_location": "Hospital Base Garage",
                "lat": 12.9600,
                "lng": 77.6000,
                "fuel_level": 40,
                "assigned_emergency_id": None
            }
        }

        self.medicines: Dict[str, Dict[str, Any]] = {
            "med_inv_1": {
                "id": "med_inv_1",
                "name": "Paracetamol 650mg",
                "category": "Analgesic & Antipyretic",
                "stock_count": 1420,
                "min_threshold": 200,
                "unit": "tablets",
                "status": "In Stock"
            },
            "med_inv_2": {
                "id": "med_inv_2",
                "name": "Amoxicillin 500mg",
                "category": "Broad Spectrum Antibiotic",
                "stock_count": 85,
                "min_threshold": 100,
                "unit": "strips",
                "status": "Low Stock"
            },
            "med_inv_3": {
                "id": "med_inv_3",
                "name": "Atorvastatin 20mg",
                "category": "Cardiovascular / Statin",
                "stock_count": 540,
                "min_threshold": 150,
                "unit": "tablets",
                "status": "In Stock"
            },
            "med_inv_4": {
                "id": "med_inv_4",
                "name": "Metformin 500mg",
                "category": "Antidiabetic",
                "stock_count": 890,
                "min_threshold": 200,
                "unit": "tablets",
                "status": "In Stock"
            },
            "med_inv_5": {
                "id": "med_inv_5",
                "name": "Adrenaline 1mg/ml Ampoules",
                "category": "Emergency & Critical Resuscitation",
                "stock_count": 14,
                "min_threshold": 30,
                "unit": "vials",
                "status": "Critical"
            },
            "med_inv_6": {
                "id": "med_inv_6",
                "name": "Salbutamol Respirator Solution",
                "category": "Respiratory Bronchodilator",
                "stock_count": 320,
                "min_threshold": 50,
                "unit": "bottles",
                "status": "In Stock"
            },
            "med_inv_7": {
                "id": "med_inv_7",
                "name": "Oral Rehydration Salts (WHO formula)",
                "category": "Electrolytes",
                "stock_count": 760,
                "min_threshold": 100,
                "unit": "packets",
                "status": "In Stock"
            }
        }

        self.admitted_patients: List[Dict[str, Any]] = [
            {
                "id": "adm_p_1",
                "name": "Suresh Venkat",
                "age": 62,
                "ward": "ICU Ward B",
                "bed_number": "B-04",
                "admission_date": "2026-09-01",
                "diagnosis": "Acute Myocardial Infarction (Post-PTCA)",
                "attending_doctor": "Dr. Ching Ming Yang",
                "readmission_risk_score": 72.5,
                "medication_administered": ["Aspirin 75mg", "Clopidogrel 75mg", "Heparin infusion"]
            },
            {
                "id": "adm_p_2",
                "name": "Meera Krishnan",
                "age": 45,
                "ward": "Post-Surgical General",
                "bed_number": "G-12",
                "admission_date": "2026-09-02",
                "diagnosis": "Laparoscopic Cholecystectomy",
                "attending_doctor": "Dr. Rajesh Rao",
                "readmission_risk_score": 18.0,
                "medication_administered": ["Tramadol IV", "Pantoprazole 40mg IV", "Normal Saline"]
            },
            {
                "id": "adm_p_3",
                "name": "Harish Patel",
                "age": 71,
                "ward": "Respiratory Care Unit",
                "bed_number": "R-02",
                "admission_date": "2026-09-02",
                "diagnosis": "COPD Exacerbation with Bronchospasm",
                "attending_doctor": "Dr. Rajesh Rao",
                "readmission_risk_score": 58.0,
                "medication_administered": ["Salbutamol Nebs", "Budesonide", "Hydrocortisone IV"]
            }
        ]

        self.prescriptions: Dict[str, Dict[str, Any]] = {
            "presc_01": {
                "id": "presc_01",
                "patient_id": "p_01",
                "patient_name": "Priya Sharma",
                "source": "AI Triage - Home Care Recommendation",
                "ai_draft": "Recommended soothing hydration with warm electrolyte fluid, Steam inhalation with eucalyptus twice daily, and OTC Paracetamol 650mg if temperature exceeds 100°F.",
                "medications": [
                    {"name": "Paracetamol 650mg", "dosage": "1 tablet SOS after food", "frequency": "Max 3 times a day"},
                    {"name": "Cetirizine 10mg", "dosage": "1 tablet at bedtime", "frequency": "Nightly for 3 days"}
                ],
                "remedies": [
                    "Warm water hydration (2.5 - 3 Liters/day)",
                    "Steam inhalation for 10 minutes morning and night",
                    "Honey and warm ginger tea to soothe airway"
                ],
                "doctor_confirmation_status": "Pending",
                "doctor_id": "doc_05",
                "doctor_name": "Dr. Rajesh Rao",
                "final_text": None,
                "review_notes": None,
                "created_at": "2026-09-03 21:15"
            },
            "presc_02": {
                "id": "presc_02",
                "patient_id": "p_02",
                "patient_name": "Ramesh Kumar",
                "source": "AI Triage - Follow-up Review",
                "ai_draft": "Adjust fluid intake monitor and recommend oral rehydration with low sodium electrolyte. Maintain Furosemide under doctor supervision.",
                "medications": [
                    {"name": "Furosemide 40mg", "dosage": "1 tab strictly at 8:00 AM", "frequency": "Daily"},
                    {"name": "Potassium Chloride 500mg", "dosage": "1 tab with lunch", "frequency": "Daily"}
                ],
                "remedies": [
                    "Weigh daily at 7 AM before breakfast",
                    "Limit fluid intake to 1.5 L / 24 hours",
                    "Elevate lower legs when sitting to prevent edema"
                ],
                "doctor_confirmation_status": "Pending",
                "doctor_id": "doc_01",
                "doctor_name": "Dr. Ching Ming Yang",
                "final_text": None,
                "review_notes": None,
                "created_at": "2026-09-03 22:40"
            }
        }

        self.emergencies: Dict[str, Dict[str, Any]] = {
            "em_demo": {
                "id": "em_demo",
                "patient_id": "p_02",
                "patient_name": "Ramesh Kumar",
                "patient_phone": "+91 97412 88990",
                "timestamp": "2026-09-03 23:10",
                "location_lat": 12.9352,
                "location_lng": 77.6245,
                "address": "4th Cross, 5th Block, Koramangala, Bengaluru",
                "severity": "Critical",
                "ai_explainability": "CRITICAL CARDIAC CONTEXT: Patient has CHF NYHA Class II with sudden acute dyspnea and bilateral leg edema. Readmission risk is 68%. High risk of acute decompensated heart failure requiring urgent ambulance and oxygen support. Classified as TRUE EMERGENCY (False Alarm probability: 2%).",
                "is_probable_false_alarm": False,
                "status": "Ambulance Dispatched",
                "assigned_ambulance_id": "amb_03",
                "ambulance_eta_mins": 6
            }
        }

        self.consultations: Dict[str, Dict[str, Any]] = {
            "consult_01": {
                "id": "consult_01",
                "patient_id": "p_01",
                "doctor_id": "doc_01",
                "patient_name": "Priya Sharma",
                "doctor_name": "Dr. Ching Ming Yang",
                "scheduled_time": "11:00 AM Today",
                "status": "Scheduled",
                "language_pair": "hi-en",
                "transcript": []
            }
        }

        self.appointments: Dict[str, Dict[str, Any]] = {
            "apt_01": {
                "id": "apt_01",
                "consultation_id": "consult_01",
                "patient_id": "p_01",
                "patient_name": "Priya Sharma",
                "doctor_id": "doc_01",
                "doctor_name": "Dr. Ching Ming Yang",
                "time": "11:00 AM",
                "date": "2026-09-04",
                "status": "Booked",
                "symptoms": "Post-Op Incision Review",
                "language_pair": "Hindi ⟷ English",
                "created_at": "Today"
            },
            "apt_02": {
                "id": "apt_02",
                "consultation_id": "consult_02",
                "patient_id": "p_02",
                "patient_name": "Ramesh Kumar",
                "doctor_id": "doc_01",
                "doctor_name": "Dr. Ching Ming Yang",
                "time": "04:30 PM",
                "date": "2026-09-04",
                "status": "Booked",
                "symptoms": "CHF Follow-up & Diuretic Review",
                "language_pair": "Kannada ⟷ English",
                "created_at": "Today"
            },
            "apt_03": {
                "id": "apt_03",
                "consultation_id": "consult_03",
                "patient_id": "p_01",
                "patient_name": "Priya Sharma",
                "doctor_id": "doc_05",
                "doctor_name": "Dr. Rajesh Rao",
                "time": "11:00 AM",
                "date": "2026-09-04",
                "status": "Booked",
                "symptoms": "General Physician Consultation",
                "language_pair": "Hindi ⟷ Kannada",
                "created_at": "Today"
            }
        }

        self.triage_sessions: Dict[str, Dict[str, Any]] = {}

        self.lab_orders: Dict[str, Dict[str, Any]] = {
            "lab_ord_01": {
                "id": "lab_ord_01",
                "consultation_id": "consult_01",
                "patient_id": "p_01",
                "patient_name": "Priya Sharma",
                "doctor_id": "doc_05",
                "doctor_name": "Dr. Rajesh Rao",
                "tests": [
                    {
                        "id": "t_cbc",
                        "name": "Complete Blood Count (CBC with 5-Part Differential)",
                        "category": "Hematology",
                        "clinical_significance": "Post-op wound healing & systemic infection screen"
                    },
                    {
                        "id": "t_lft",
                        "name": "Liver Function Test (LFT)",
                        "category": "Hepatic Panel",
                        "clinical_significance": "Post-appendectomy metabolic recovery & drug clearance"
                    }
                ],
                "medications": [
                    {"name": "Cefixime 200mg", "dosage": "1 tablet", "frequency": "Twice daily", "instructions": "Post-op prophylactic antibiotic"}
                ],
                "remedies": ["Warm hydration (2.5L daily)", "Keep surgical incision clean & dry"],
                "clinical_notes": "Patient recovering well on post-op day 6. Incision sutures intact. Check CBC and LFT to confirm absence of occult inflammatory response before suture removal.",
                "status": "pending_patient_selection",
                "created_at": "2026-09-04 11:30",
                "updated_at": "2026-09-04 11:30"
            }
        }

        self.consultation_feedback: Dict[str, Dict[str, Any]] = {
            "fb_01": {
                "id": "fb_01",
                "consultation_id": "consult_01",
                "patient_id": "p_01",
                "patient_name": "Priya Sharma",
                "doctor_id": "doc_05",
                "doctor_name": "Dr. Rajesh Rao",
                "rating": 5,
                "tags": ["Clear Explanation", "Friendly & Patient", "Bilingual Translation Helped"],
                "feedback_text": "ಡಾಕ್ಟರ್ ತುಂಬಾ ತಾಳ್ಮೆಯಿಂದ ಕೇಳಿಸಿಕೊಂಡರು ಮತ್ತು ಸರಿಯಾದ ಔಷಧಿ ಹಾಗೂ ಲ್ಯಾಬ್ ಪರೀಕ್ಷೆಗಳನ್ನು ವಿವರಿಸಿದರು.",
                "language": "kn",
                "translated_text": "The doctor listened very patiently and clearly explained the appropriate medications and diagnostic lab tests.",
                "sentiment": "Positive",
                "sentiment_score": 0.98,
                "voice_input_used": True,
                "skipped": False,
                "created_at": "2026-09-04 14:15"
            },
            "fb_02": {
                "id": "fb_02",
                "consultation_id": "consult_02",
                "patient_id": "p_02",
                "patient_name": "Ramesh Kumar",
                "doctor_id": "doc_01",
                "doctor_name": "Dr. Ching Ming Yang",
                "rating": 5,
                "tags": ["Accurate Diagnosis", "Friendly & Patient", "Clear Explanation"],
                "feedback_text": "डॉक्टर साहब ने हृदय स्वास्थ्य और ईसीजी रिपोर्ट की विस्तृत जानकारी दी। बहुत अच्छा अनुभव रहा।",
                "language": "hi",
                "translated_text": "The doctor provided detailed information regarding heart health and the ECG report. It was a very good experience.",
                "sentiment": "Positive",
                "sentiment_score": 0.96,
                "voice_input_used": False,
                "skipped": False,
                "created_at": "2026-09-03 16:45"
            }
        }

        # Synchronize live state from Neon PostgreSQL
        self.load_from_postgres()

    def _get_connection(self):
        try:
            from app.config import settings
            db_url = os.getenv("DATABASE_URL") or getattr(settings, "DATABASE_URL", None)
            if not db_url:
                return None
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            return conn
        except Exception:
            return None

    def load_from_postgres(self):
        """Loads live clinical data from Neon PostgreSQL into in-memory dictionaries."""
        conn = self._get_connection()
        if not conn:
            print("Notice: PostgreSQL not connected, running with default memory state.")
            return
        try:
            with conn.cursor() as cur:
                # 1. users
                cur.execute("SELECT id, username, password, role, name, preferred_language, specialization, spoken_languages FROM users;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.users[r[1]] = {
                            "id": r[0], "username": r[1], "password": r[2], "role": r[3],
                            "name": r[4], "preferred_language": r[5] or "en",
                            "specialization": r[6], "spoken_languages": r[7] or []
                        }

                # 2. patients
                cur.execute("SELECT id, name, age, gender, phone, preferred_language, medical_history, active_medications, risk_score, risk_level, risk_factors, post_discharge_followups FROM patients;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.patients[r[0]] = {
                            "id": r[0], "name": r[1], "age": r[2], "gender": r[3], "phone": r[4],
                            "preferred_language": r[5] or "en",
                            "medical_history": r[6] or [], "active_medications": r[7] or [],
                            "risk_score": r[8] or 0.0, "risk_level": r[9] or "Low",
                            "risk_factors": r[10] or [], "post_discharge_followups": r[11] or []
                        }

                # 3. doctors
                cur.execute("SELECT id, name, specialization, experience_years, rating, spoken_languages, clinic_address, session_fee, avatar_url, is_available, available_slots, assigned_patient_ids FROM doctors;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.doctors[r[0]] = {
                            "id": r[0], "name": r[1], "specialization": r[2], "experience_years": r[3],
                            "rating": r[4], "spoken_languages": r[5] or [], "clinic_address": r[6] or "",
                            "session_fee": r[7], "avatar_url": r[8] or "", "is_available": r[9],
                            "available_slots": r[10] or [], "assigned_patient_ids": r[11] or []
                        }

                # 4. ambulances
                cur.execute("SELECT id, vehicle_number, driver_name, driver_phone, status, current_location, lat, lng, fuel_level, assigned_emergency_id FROM ambulances;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.ambulances[r[0]] = {
                            "id": r[0], "vehicle_number": r[1], "driver_name": r[2], "driver_phone": r[3],
                            "status": r[4], "current_location": r[5], "lat": r[6], "lng": r[7],
                            "fuel_level": r[8], "assigned_emergency_id": r[9]
                        }

                # 5. medicines
                cur.execute("SELECT id, name, category, stock_count, min_threshold, unit, status FROM medicines;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.medicines[r[0]] = {
                            "id": r[0], "name": r[1], "category": r[2], "stock_count": r[3],
                            "min_threshold": r[4], "unit": r[5], "status": r[6]
                        }

                # 6. admitted_patients
                cur.execute("SELECT id, name, age, ward, bed_number, admission_date, diagnosis, attending_doctor, readmission_risk_score, medication_administered FROM admitted_patients;")
                rows = cur.fetchall()
                if rows:
                    self.admitted_patients = [{
                        "id": r[0], "name": r[1], "age": r[2], "ward": r[3], "bed_number": r[4],
                        "admission_date": r[5], "diagnosis": r[6], "attending_doctor": r[7],
                        "readmission_risk_score": r[8], "medication_administered": r[9] or []
                    } for r in rows]

                # 7. prescriptions
                cur.execute("SELECT id, patient_id, patient_name, source, ai_draft, medications, remedies, doctor_confirmation_status, doctor_id, doctor_name, final_text, review_notes, created_at FROM prescriptions;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.prescriptions[r[0]] = {
                            "id": r[0], "patient_id": r[1], "patient_name": r[2], "source": r[3],
                            "ai_draft": r[4], "medications": r[5] or [], "remedies": r[6] or [],
                            "doctor_confirmation_status": r[7], "doctor_id": r[8], "doctor_name": r[9],
                            "final_text": r[10], "review_notes": r[11], "created_at": r[12]
                        }

                # 8. emergencies
                cur.execute("SELECT id, patient_id, patient_name, patient_phone, timestamp, location_lat, location_lng, address, severity, ai_explainability, is_probable_false_alarm, status, assigned_ambulance_id, ambulance_eta_mins FROM emergencies;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.emergencies[r[0]] = {
                            "id": r[0], "patient_id": r[1], "patient_name": r[2], "patient_phone": r[3],
                            "timestamp": r[4], "location_lat": r[5], "location_lng": r[6],
                            "address": r[7], "severity": r[8], "ai_explainability": r[9],
                            "is_probable_false_alarm": r[10], "status": r[11],
                            "assigned_ambulance_id": r[12], "ambulance_eta_mins": r[13]
                        }

                # 9. consultations
                cur.execute("SELECT id, patient_id, doctor_id, patient_name, doctor_name, scheduled_time, status, language_pair, transcript FROM consultations;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.consultations[r[0]] = {
                            "id": r[0], "patient_id": r[1], "doctor_id": r[2], "patient_name": r[3],
                            "doctor_name": r[4], "scheduled_time": r[5], "status": r[6],
                            "language_pair": r[7], "transcript": r[8] or []
                        }

                # 10. appointments
                cur.execute("SELECT id, consultation_id, patient_id, patient_name, doctor_id, doctor_name, time, date, status, symptoms, language_pair, created_at FROM appointments;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.appointments[r[0]] = {
                            "id": r[0], "consultation_id": r[1], "patient_id": r[2], "patient_name": r[3],
                            "doctor_id": r[4], "doctor_name": r[5], "time": r[6], "date": r[7],
                            "status": r[8], "symptoms": r[9], "language_pair": r[10], "created_at": r[11]
                        }

                # 11. triage_sessions
                cur.execute("SELECT id, session_data FROM triage_sessions;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.triage_sessions[r[0]] = r[1]

                # 12. lab_orders
                cur.execute("""
                CREATE TABLE IF NOT EXISTS lab_orders (
                    id VARCHAR(64) PRIMARY KEY,
                    consultation_id VARCHAR(64),
                    patient_id VARCHAR(64) NOT NULL,
                    patient_name VARCHAR(128) NOT NULL,
                    doctor_id VARCHAR(64) NOT NULL,
                    doctor_name VARCHAR(128) NOT NULL,
                    tests JSONB DEFAULT '[]'::jsonb,
                    medications JSONB DEFAULT '[]'::jsonb,
                    remedies JSONB DEFAULT '[]'::jsonb,
                    clinical_notes TEXT,
                    status VARCHAR(64) DEFAULT 'pending_patient_selection',
                    selected_lab JSONB,
                    instrument_details JSONB,
                    precision_accuracy_report JSONB,
                    booking_details JSONB,
                    created_at VARCHAR(64),
                    updated_at VARCHAR(64)
                );
                """)
                cur.execute("SELECT id, consultation_id, patient_id, patient_name, doctor_id, doctor_name, tests, medications, remedies, clinical_notes, status, selected_lab, instrument_details, precision_accuracy_report, booking_details, created_at, updated_at FROM lab_orders;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.lab_orders[r[0]] = {
                            "id": r[0], "consultation_id": r[1], "patient_id": r[2], "patient_name": r[3],
                            "doctor_id": r[4], "doctor_name": r[5], "tests": r[6] or [],
                            "medications": r[7] or [], "remedies": r[8] or [], "clinical_notes": r[9],
                            "status": r[10] or "pending_patient_selection",
                            "selected_lab": r[11], "instrument_details": r[12],
                            "precision_accuracy_report": r[13], "booking_details": r[14],
                            "created_at": r[15], "updated_at": r[16]
                        }

                # 13. consultation_feedback
                cur.execute("""
                CREATE TABLE IF NOT EXISTS consultation_feedback (
                    id VARCHAR(64) PRIMARY KEY,
                    consultation_id VARCHAR(64),
                    patient_id VARCHAR(64) NOT NULL,
                    patient_name VARCHAR(128) NOT NULL,
                    doctor_id VARCHAR(64) NOT NULL,
                    doctor_name VARCHAR(128) NOT NULL,
                    rating INT DEFAULT 5,
                    tags JSONB DEFAULT '[]'::jsonb,
                    feedback_text TEXT,
                    language VARCHAR(16) DEFAULT 'en',
                    translated_text TEXT,
                    sentiment VARCHAR(32) DEFAULT 'Positive',
                    sentiment_score FLOAT DEFAULT 0.95,
                    voice_input_used BOOLEAN DEFAULT FALSE,
                    skipped BOOLEAN DEFAULT FALSE,
                    created_at VARCHAR(64)
                );
                """)
                cur.execute("SELECT id, consultation_id, patient_id, patient_name, doctor_id, doctor_name, rating, tags, feedback_text, language, translated_text, sentiment, sentiment_score, voice_input_used, skipped, created_at FROM consultation_feedback;")
                rows = cur.fetchall()
                if rows:
                    for r in rows:
                        self.consultation_feedback[r[0]] = {
                            "id": r[0], "consultation_id": r[1], "patient_id": r[2], "patient_name": r[3],
                            "doctor_id": r[4], "doctor_name": r[5], "rating": r[6], "tags": r[7] or [],
                            "feedback_text": r[8] or "", "language": r[9] or "en", "translated_text": r[10] or "",
                            "sentiment": r[11] or "Positive", "sentiment_score": r[12] or 0.95,
                            "voice_input_used": bool(r[13]), "skipped": bool(r[14]), "created_at": r[15]
                        }

            print("Loaded live clinical records from Neon PostgreSQL successfully.")
        except Exception as err:
            print("Notice: Error loading from PostgreSQL:", err)
        finally:
            conn.close()

    def save_appointment(self, ap: Dict[str, Any]):
        self.appointments[ap["id"]] = ap
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO appointments (id, consultation_id, patient_id, patient_name, doctor_id, doctor_name, time, date, status, symptoms, language_pair, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    consultation_id = EXCLUDED.consultation_id,
                    patient_id = EXCLUDED.patient_id,
                    patient_name = EXCLUDED.patient_name,
                    doctor_id = EXCLUDED.doctor_id,
                    doctor_name = EXCLUDED.doctor_name,
                    time = EXCLUDED.time,
                    date = EXCLUDED.date,
                    status = EXCLUDED.status,
                    symptoms = EXCLUDED.symptoms,
                    language_pair = EXCLUDED.language_pair,
                    created_at = EXCLUDED.created_at;
                """, (
                    ap["id"], ap.get("consultation_id"), ap["patient_id"],
                    ap["patient_name"], ap["doctor_id"], ap["doctor_name"],
                    ap.get("time", ""), ap.get("date", ""),
                    ap.get("status", "Booked"), ap.get("symptoms", ""),
                    ap.get("language_pair", ""), ap.get("created_at", "")
                ))
        except Exception as e:
            print("Error persisting appointment to PostgreSQL:", e)
        finally:
            conn.close()

    def save_prescription(self, pr: Dict[str, Any]):
        self.prescriptions[pr["id"]] = pr
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO prescriptions (id, patient_id, patient_name, source, ai_draft, medications, remedies, doctor_confirmation_status, doctor_id, doctor_name, final_text, review_notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    patient_name = EXCLUDED.patient_name,
                    source = EXCLUDED.source,
                    ai_draft = EXCLUDED.ai_draft,
                    medications = EXCLUDED.medications,
                    remedies = EXCLUDED.remedies,
                    doctor_confirmation_status = EXCLUDED.doctor_confirmation_status,
                    doctor_id = EXCLUDED.doctor_id,
                    doctor_name = EXCLUDED.doctor_name,
                    final_text = EXCLUDED.final_text,
                    review_notes = EXCLUDED.review_notes,
                    created_at = EXCLUDED.created_at;
                """, (
                    pr["id"], pr["patient_id"], pr["patient_name"], pr.get("source", ""),
                    pr.get("ai_draft", ""), Json(pr.get("medications", [])),
                    Json(pr.get("remedies", [])), pr.get("doctor_confirmation_status", "Pending"),
                    pr.get("doctor_id"), pr.get("doctor_name"),
                    pr.get("final_text"), pr.get("review_notes"),
                    pr.get("created_at", "")
                ))
        except Exception as e:
            print("Error persisting prescription to PostgreSQL:", e)
        finally:
            conn.close()

    def save_consultation(self, c: Dict[str, Any]):
        self.consultations[c["id"]] = c
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO consultations (id, patient_id, doctor_id, patient_name, doctor_name, scheduled_time, status, language_pair, transcript)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    doctor_id = EXCLUDED.doctor_id,
                    patient_name = EXCLUDED.patient_name,
                    doctor_name = EXCLUDED.doctor_name,
                    scheduled_time = EXCLUDED.scheduled_time,
                    status = EXCLUDED.status,
                    language_pair = EXCLUDED.language_pair,
                    transcript = EXCLUDED.transcript;
                """, (
                    c["id"], c["patient_id"], c["doctor_id"], c["patient_name"],
                    c["doctor_name"], c.get("scheduled_time", ""),
                    c.get("status", "Scheduled"), c.get("language_pair", "hi-en"),
                    Json(c.get("transcript", []))
                ))
        except Exception as e:
            print("Error persisting consultation to PostgreSQL:", e)
        finally:
            conn.close()

    def save_emergency(self, em: Dict[str, Any]):
        self.emergencies[em["id"]] = em
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO emergencies (id, patient_id, patient_name, patient_phone, timestamp, location_lat, location_lng, address, severity, ai_explainability, is_probable_false_alarm, status, assigned_ambulance_id, ambulance_eta_mins)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    patient_name = EXCLUDED.patient_name,
                    patient_phone = EXCLUDED.patient_phone,
                    timestamp = EXCLUDED.timestamp,
                    location_lat = EXCLUDED.location_lat,
                    location_lng = EXCLUDED.location_lng,
                    address = EXCLUDED.address,
                    severity = EXCLUDED.severity,
                    ai_explainability = EXCLUDED.ai_explainability,
                    is_probable_false_alarm = EXCLUDED.is_probable_false_alarm,
                    status = EXCLUDED.status,
                    assigned_ambulance_id = EXCLUDED.assigned_ambulance_id,
                    ambulance_eta_mins = EXCLUDED.ambulance_eta_mins;
                """, (
                    em["id"], em["patient_id"], em["patient_name"], em.get("patient_phone", ""),
                    em.get("timestamp", ""), em.get("location_lat"), em.get("location_lng"),
                    em.get("address", ""), em.get("severity", "Critical"),
                    em.get("ai_explainability", ""), em.get("is_probable_false_alarm", False),
                    em.get("status", "Active"), em.get("assigned_ambulance_id"),
                    em.get("ambulance_eta_mins")
                ))
        except Exception as e:
            print("Error persisting emergency to PostgreSQL:", e)
        finally:
            conn.close()

    def save_patient(self, p: Dict[str, Any]):
        self.patients[p["id"]] = p
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO patients (id, name, age, gender, phone, preferred_language, medical_history, active_medications, risk_score, risk_level, risk_factors, post_discharge_followups)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    age = EXCLUDED.age,
                    gender = EXCLUDED.gender,
                    phone = EXCLUDED.phone,
                    preferred_language = EXCLUDED.preferred_language,
                    medical_history = EXCLUDED.medical_history,
                    active_medications = EXCLUDED.active_medications,
                    risk_score = EXCLUDED.risk_score,
                    risk_level = EXCLUDED.risk_level,
                    risk_factors = EXCLUDED.risk_factors,
                    post_discharge_followups = EXCLUDED.post_discharge_followups;
                """, (
                    p["id"], p["name"], p["age"], p["gender"], p["phone"],
                    p.get("preferred_language", "en"),
                    Json(p.get("medical_history", [])),
                    Json(p.get("active_medications", [])),
                    p.get("risk_score", 0.0),
                    p.get("risk_level", "Low"),
                    Json(p.get("risk_factors", [])),
                    Json(p.get("post_discharge_followups", []))
                ))
        except Exception as e:
            print("Error persisting patient to PostgreSQL:", e)
        finally:
            conn.close()

    def save_user(self, u: Dict[str, Any]):
        self.users[u["username"]] = u
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO users (id, username, password, role, name, preferred_language, specialization, spoken_languages)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    username = EXCLUDED.username,
                    password = EXCLUDED.password,
                    role = EXCLUDED.role,
                    name = EXCLUDED.name,
                    preferred_language = EXCLUDED.preferred_language,
                    specialization = EXCLUDED.specialization,
                    spoken_languages = EXCLUDED.spoken_languages;
                """, (
                    u["id"], u["username"], u["password"], u["role"], u["name"],
                    u.get("preferred_language", "en"),
                    u.get("specialization"),
                    Json(u.get("spoken_languages", []))
                ))
        except Exception as e:
            print("Error persisting user to PostgreSQL:", e)
        finally:
            conn.close()

    def save_doctor(self, d: Dict[str, Any]):
        self.doctors[d["id"]] = d
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO doctors (id, name, specialization, experience_years, rating, spoken_languages, clinic_address, session_fee, avatar_url, is_available, available_slots, assigned_patient_ids)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    specialization = EXCLUDED.specialization,
                    experience_years = EXCLUDED.experience_years,
                    rating = EXCLUDED.rating,
                    spoken_languages = EXCLUDED.spoken_languages,
                    clinic_address = EXCLUDED.clinic_address,
                    session_fee = EXCLUDED.session_fee,
                    avatar_url = EXCLUDED.avatar_url,
                    is_available = EXCLUDED.is_available,
                    available_slots = EXCLUDED.available_slots,
                    assigned_patient_ids = EXCLUDED.assigned_patient_ids;
                """, (
                    d["id"], d["name"], d.get("specialization", ""), d.get("experience_years", 0),
                    d.get("rating", 5.0), Json(d.get("spoken_languages", [])),
                    d.get("clinic_address", ""), d.get("session_fee", 0),
                    d.get("avatar_url", ""), d.get("is_available", True),
                    Json(d.get("available_slots", [])), Json(d.get("assigned_patient_ids", []))
                ))
        except Exception as e:
            print("Error persisting doctor to PostgreSQL:", e)
        finally:
            conn.close()

    def save_lab_order(self, o: Dict[str, Any]):
        self.lab_orders[o["id"]] = o
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO lab_orders (id, consultation_id, patient_id, patient_name, doctor_id, doctor_name, tests, medications, remedies, clinical_notes, status, selected_lab, instrument_details, precision_accuracy_report, booking_details, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    consultation_id = EXCLUDED.consultation_id,
                    patient_id = EXCLUDED.patient_id,
                    patient_name = EXCLUDED.patient_name,
                    doctor_id = EXCLUDED.doctor_id,
                    doctor_name = EXCLUDED.doctor_name,
                    tests = EXCLUDED.tests,
                    medications = EXCLUDED.medications,
                    remedies = EXCLUDED.remedies,
                    clinical_notes = EXCLUDED.clinical_notes,
                    status = EXCLUDED.status,
                    selected_lab = EXCLUDED.selected_lab,
                    instrument_details = EXCLUDED.instrument_details,
                    precision_accuracy_report = EXCLUDED.precision_accuracy_report,
                    booking_details = EXCLUDED.booking_details,
                    updated_at = EXCLUDED.updated_at;
                """, (
                    o["id"], o.get("consultation_id"), o["patient_id"], o["patient_name"],
                    o["doctor_id"], o["doctor_name"], Json(o.get("tests", [])),
                    Json(o.get("medications", [])), Json(o.get("remedies", [])),
                    o.get("clinical_notes"), o.get("status", "pending_patient_selection"),
                    Json(o.get("selected_lab")) if o.get("selected_lab") else None,
                    Json(o.get("instrument_details")) if o.get("instrument_details") else None,
                    Json(o.get("precision_accuracy_report")) if o.get("precision_accuracy_report") else None,
                    Json(o.get("booking_details")) if o.get("booking_details") else None,
                    o.get("created_at"), o.get("updated_at")
                ))
        except Exception as e:
            print("Error persisting lab_order to PostgreSQL:", e)
        finally:
            conn.close()

    def save_consultation_feedback(self, f: Dict[str, Any]):
        self.consultation_feedback[f["id"]] = f
        conn = self._get_connection()
        if not conn: return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO consultation_feedback (id, consultation_id, patient_id, patient_name, doctor_id, doctor_name, rating, tags, feedback_text, language, translated_text, sentiment, sentiment_score, voice_input_used, skipped, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    rating = EXCLUDED.rating,
                    tags = EXCLUDED.tags,
                    feedback_text = EXCLUDED.feedback_text,
                    language = EXCLUDED.language,
                    translated_text = EXCLUDED.translated_text,
                    sentiment = EXCLUDED.sentiment,
                    sentiment_score = EXCLUDED.sentiment_score,
                    voice_input_used = EXCLUDED.voice_input_used,
                    skipped = EXCLUDED.skipped;
                """, (
                    f["id"], f.get("consultation_id"), f.get("patient_id"), f.get("patient_name"),
                    f.get("doctor_id"), f.get("doctor_name"), f.get("rating", 5),
                    Json(f.get("tags", [])), f.get("feedback_text", ""), f.get("language", "en"),
                    f.get("translated_text", ""), f.get("sentiment", "Positive"),
                    f.get("sentiment_score", 0.95), f.get("voice_input_used", False),
                    f.get("skipped", False), f.get("created_at")
                ))
        except Exception as e:
            print("Error persisting consultation_feedback to PostgreSQL:", e)
        finally:
            conn.close()

db = Database()

