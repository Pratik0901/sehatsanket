import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import psycopg2
from psycopg2.extras import Json
from app.config import settings
from app.database import Database

def get_connection():
    db_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL
    print(f"Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    return conn

def create_tables(cur):
    print("Creating tables in Neon PostgreSQL...")
    
    # 1. users
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(128) UNIQUE NOT NULL,
        password VARCHAR(256) NOT NULL,
        role VARCHAR(32) NOT NULL,
        name VARCHAR(128) NOT NULL,
        preferred_language VARCHAR(16) DEFAULT 'en',
        specialization VARCHAR(128),
        spoken_languages JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. patients
    cur.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        age INT,
        gender VARCHAR(32),
        phone VARCHAR(64),
        preferred_language VARCHAR(16) DEFAULT 'en',
        medical_history JSONB DEFAULT '[]'::jsonb,
        active_medications JSONB DEFAULT '[]'::jsonb,
        risk_score FLOAT DEFAULT 0.0,
        risk_level VARCHAR(32) DEFAULT 'Low',
        risk_factors JSONB DEFAULT '[]'::jsonb,
        post_discharge_followups JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. doctors
    cur.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        specialization VARCHAR(128) NOT NULL,
        experience_years INT DEFAULT 0,
        rating FLOAT DEFAULT 5.0,
        spoken_languages JSONB DEFAULT '[]'::jsonb,
        clinic_address TEXT,
        session_fee INT DEFAULT 0,
        avatar_url TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        available_slots JSONB DEFAULT '[]'::jsonb,
        assigned_patient_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. ambulances
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ambulances (
        id VARCHAR(64) PRIMARY KEY,
        vehicle_number VARCHAR(64) NOT NULL,
        driver_name VARCHAR(128) NOT NULL,
        driver_phone VARCHAR(64),
        status VARCHAR(32) DEFAULT 'Available',
        current_location VARCHAR(256),
        lat FLOAT,
        lng FLOAT,
        fuel_level INT DEFAULT 100,
        assigned_emergency_id VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. medicines
    cur.execute("""
    CREATE TABLE IF NOT EXISTS medicines (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        category VARCHAR(128),
        stock_count INT DEFAULT 0,
        min_threshold INT DEFAULT 0,
        unit VARCHAR(32) DEFAULT 'units',
        status VARCHAR(32) DEFAULT 'In Stock',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. admitted_patients
    cur.execute("""
    CREATE TABLE IF NOT EXISTS admitted_patients (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        age INT,
        ward VARCHAR(128),
        bed_number VARCHAR(64),
        admission_date VARCHAR(64),
        diagnosis TEXT,
        attending_doctor VARCHAR(128),
        readmission_risk_score FLOAT DEFAULT 0.0,
        medication_administered JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 7. prescriptions
    cur.execute("""
    CREATE TABLE IF NOT EXISTS prescriptions (
        id VARCHAR(64) PRIMARY KEY,
        patient_id VARCHAR(64) NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        source VARCHAR(128),
        ai_draft TEXT,
        medications JSONB DEFAULT '[]'::jsonb,
        remedies JSONB DEFAULT '[]'::jsonb,
        doctor_confirmation_status VARCHAR(64) DEFAULT 'Pending',
        doctor_id VARCHAR(64),
        doctor_name VARCHAR(128),
        final_text TEXT,
        review_notes TEXT,
        created_at VARCHAR(64)
    );
    """)

    # 8. emergencies
    cur.execute("""
    CREATE TABLE IF NOT EXISTS emergencies (
        id VARCHAR(64) PRIMARY KEY,
        patient_id VARCHAR(64) NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        patient_phone VARCHAR(64),
        timestamp VARCHAR(64),
        location_lat FLOAT,
        location_lng FLOAT,
        address TEXT,
        severity VARCHAR(32) DEFAULT 'Moderate',
        ai_explainability TEXT,
        is_probable_false_alarm BOOLEAN DEFAULT FALSE,
        status VARCHAR(64) DEFAULT 'Active',
        assigned_ambulance_id VARCHAR(64),
        ambulance_eta_mins INT
    );
    """)

    # 9. consultations
    cur.execute("""
    CREATE TABLE IF NOT EXISTS consultations (
        id VARCHAR(64) PRIMARY KEY,
        patient_id VARCHAR(64) NOT NULL,
        doctor_id VARCHAR(64) NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        doctor_name VARCHAR(128) NOT NULL,
        scheduled_time VARCHAR(64),
        status VARCHAR(64) DEFAULT 'Scheduled',
        language_pair VARCHAR(32) DEFAULT 'hi-en',
        transcript JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 10. appointments
    cur.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(64) PRIMARY KEY,
        consultation_id VARCHAR(64),
        patient_id VARCHAR(64) NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        doctor_id VARCHAR(64) NOT NULL,
        doctor_name VARCHAR(128) NOT NULL,
        time VARCHAR(64),
        date VARCHAR(64),
        status VARCHAR(64) DEFAULT 'Booked',
        symptoms TEXT,
        language_pair VARCHAR(32),
        created_at VARCHAR(64)
    );
    """)

    # 11. triage_sessions
    cur.execute("""
    CREATE TABLE IF NOT EXISTS triage_sessions (
        id VARCHAR(64) PRIMARY KEY,
        session_data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

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
    print("All 13 clinical tables created successfully.")


def seed_data(cur):
    print("Seeding initial dataset into Neon PostgreSQL...")
    seed_source = Database()

    # 1. Users
    for user_key, u in seed_source.users.items():
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

    # 2. Patients
    for p_id, p in seed_source.patients.items():
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

    # 3. Doctors
    for d_id, d in seed_source.doctors.items():
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
            d["id"], d["name"], d["specialization"], d.get("experience_years", 0),
            d.get("rating", 5.0),
            Json(d.get("spoken_languages", [])),
            d.get("clinic_address", ""),
            d.get("session_fee", 0),
            d.get("avatar_url", ""),
            d.get("is_available", True),
            Json(d.get("available_slots", [])),
            Json(d.get("assigned_patient_ids", []))
        ))

    # 4. Ambulances
    for a_id, a in seed_source.ambulances.items():
        cur.execute("""
        INSERT INTO ambulances (id, vehicle_number, driver_name, driver_phone, status, current_location, lat, lng, fuel_level, assigned_emergency_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            vehicle_number = EXCLUDED.vehicle_number,
            driver_name = EXCLUDED.driver_name,
            driver_phone = EXCLUDED.driver_phone,
            status = EXCLUDED.status,
            current_location = EXCLUDED.current_location,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            fuel_level = EXCLUDED.fuel_level,
            assigned_emergency_id = EXCLUDED.assigned_emergency_id;
        """, (
            a["id"], a["vehicle_number"], a["driver_name"], a.get("driver_phone", ""),
            a.get("status", "Available"), a.get("current_location", ""),
            a.get("lat"), a.get("lng"), a.get("fuel_level", 100),
            a.get("assigned_emergency_id")
        ))

    # 5. Medicines
    for m_id, m in seed_source.medicines.items():
        cur.execute("""
        INSERT INTO medicines (id, name, category, stock_count, min_threshold, unit, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            stock_count = EXCLUDED.stock_count,
            min_threshold = EXCLUDED.min_threshold,
            unit = EXCLUDED.unit,
            status = EXCLUDED.status;
        """, (
            m["id"], m["name"], m.get("category", ""),
            m.get("stock_count", 0), m.get("min_threshold", 0),
            m.get("unit", "tablets"), m.get("status", "In Stock")
        ))

    # 6. Admitted Patients
    for ap in seed_source.admitted_patients:
        cur.execute("""
        INSERT INTO admitted_patients (id, name, age, ward, bed_number, admission_date, diagnosis, attending_doctor, readmission_risk_score, medication_administered)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            age = EXCLUDED.age,
            ward = EXCLUDED.ward,
            bed_number = EXCLUDED.bed_number,
            admission_date = EXCLUDED.admission_date,
            diagnosis = EXCLUDED.diagnosis,
            attending_doctor = EXCLUDED.attending_doctor,
            readmission_risk_score = EXCLUDED.readmission_risk_score,
            medication_administered = EXCLUDED.medication_administered;
        """, (
            ap["id"], ap["name"], ap.get("age"), ap.get("ward", ""),
            ap.get("bed_number", ""), ap.get("admission_date", ""),
            ap.get("diagnosis", ""), ap.get("attending_doctor", ""),
            ap.get("readmission_risk_score", 0.0),
            Json(ap.get("medication_administered", []))
        ))

    # 7. Prescriptions
    for presc_id, pr in seed_source.prescriptions.items():
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

    # 8. Emergencies
    for em_id, em in seed_source.emergencies.items():
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

    # 9. Consultations
    for c_id, c in seed_source.consultations.items():
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

    # 10. Appointments
    for a_id, ap in seed_source.appointments.items():
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

    # 11. Lab Orders
    for ord_id, o in seed_source.lab_orders.items():
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

    # 13. Consultation Feedback
    for fb_id, fb in seed_source.consultation_feedback.items():
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
            fb["id"], fb.get("consultation_id"), fb.get("patient_id"), fb.get("patient_name"),
            fb.get("doctor_id"), fb.get("doctor_name"), fb.get("rating", 5),
            Json(fb.get("tags", [])), fb.get("feedback_text", ""), fb.get("language", "en"),
            fb.get("translated_text", ""), fb.get("sentiment", "Positive"),
            fb.get("sentiment_score", 0.95), fb.get("voice_input_used", False),
            fb.get("skipped", False), fb.get("created_at")
        ))

    print("Data seeded successfully into all tables.")

def verify_counts(cur):
    tables = [
        "users", "patients", "doctors", "ambulances", "medicines",
        "admitted_patients", "prescriptions", "emergencies",
        "consultations", "appointments", "triage_sessions", "lab_orders",
        "consultation_feedback"
    ]
    print("\n--- Verification Summary in Neon PostgreSQL ---")
    all_ok = True
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t};")
        count = cur.fetchone()[0]
        print(f"Table '{t}': {count} rows")
        if count == 0 and t not in ["triage_sessions"]:

            all_ok = False
    return all_ok

def main():
    conn = get_connection()
    cur = conn.cursor()
    try:
        create_tables(cur)
        seed_data(cur)
        success = verify_counts(cur)
        if success:
            print("\nSUCCESS: All data pushed into Neon PostgreSQL database!")
        else:
            print("\nWARNING: Some tables have 0 rows.")
    except Exception as e:
        print("Error during migration:", e)
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
