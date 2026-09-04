import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import db

client = TestClient(app)

def test_root_and_health():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert "supported_languages" in data
    assert len(data["supported_languages"]) == 5

def test_auth_flow():
    # Login as Priya
    login_resp = client.post("/auth/login", json={
        "username": "patient_priya",
        "password": "password123",
        "role": "patient"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["user"]["name"] == "Priya Sharma"

    # Register a new patient
    import uuid
    uniq_user = f"patient_{uuid.uuid4().hex[:6]}"
    reg_resp = client.post("/auth/register/patient", json={
        "name": "Kavita Nair",
        "username": uniq_user,
        "password": "secretpassword",
        "preferred_language": "ta"
    })
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["user"]["username"] == uniq_user

def test_symptom_triage_flow():
    # 1. Incomplete symptom input should request follow-up
    vague_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "hi",
        "symptom_text": "मुझे बुखार है"
    })
    assert vague_resp.status_code == 200
    data = vague_resp.json()
    assert data["status"] == "inquiry"
    assert data["clarifying_question"] is not None

    # 2. Multi-turn follow up inquiry test
    turn1_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "hi",
        "symptom_text": "मुझे हल्का जुकाम और हल्का सिरदर्द है"
    })
    assert turn1_resp.status_code == 200
    turn1_data = turn1_resp.json()
    assert turn1_data["status"] == "inquiry"
    assert turn1_data["clarifying_question"] is not None

    # Turn 2: Patient answers follow-up with duration & mild severity -> Completes Home Care
    turn2_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "hi",
        "symptom_text": "यह दो दिनों से हल्का जुकाम है, कोई बुखार नहीं है, कोई सीने में दर्द या सांस लेने में परेशानी नहीं है",
        "conversation_history": [
            {"role": "user", "content": "मुझे हल्का जुकाम और हल्का सिरदर्द है"},
            {"role": "assistant", "content": turn1_data["clarifying_question"]}
        ]
    })
    assert turn2_resp.status_code == 200
    turn2_data = turn2_resp.json()
    assert turn2_data["status"] == "completed"
    assert turn2_data["triage_category"] == "Home Care"
    assert len(turn2_data["home_remedies"]) > 0
    assert turn2_data["prescription_draft_id"] is not None
    assert turn2_data["doctor_confirmation_status"] == "Pending"

    # 3. Emergency symptom -> Immediate emergency alert
    emerg_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "en",
        "symptom_text": "Severe crushing chest pain radiating to left arm, cannot breathe"
    })
    assert emerg_resp.status_code == 200
    emerg_data = emerg_resp.json()
    assert emerg_data["urgency_level"] == "Emergency"
    assert emerg_data["triage_category"] == "Emergency"
    assert emerg_data["emergency_flag"] is True

def test_negated_emergency_handling():
    # Patient mentions chest pain in a NEGATED context ("no chest pain")
    neg_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "en",
        "symptom_text": "I have mild fever for 2 days, NO chest pain, no difficulty breathing"
    })
    assert neg_resp.status_code == 200
    data = neg_resp.json()
    # Must NOT trigger emergency alert!
    assert data["emergency_flag"] is False
    assert data["triage_category"] != "Emergency"

def test_doctor_language_matching():
    # Filter by Kannada (kn)
    resp = client.get("/doctors/available?language=kn")
    assert resp.status_code == 200
    data = resp.json()
    docs = data["doctors"]
    assert len(docs) > 0
    assert "kn" in docs[0]["spoken_languages"]

def test_prescription_confirmation_and_patient_sync():
    # Check pending prescriptions
    presc_resp = client.get("/prescriptions/pending")
    assert presc_resp.status_code == 200
    pending = presc_resp.json()
    assert len(pending) > 0
    test_presc = pending[0]

    patient_id = test_presc["patient_id"]
    meds_count_before = len(db.patients[patient_id].get("active_medications", []))

    # Confirm prescription as doctor
    confirm_resp = client.post(f"/prescriptions/{test_presc['id']}/confirm", json={
        "doctor_id": "doc_01",
        "status": "Approved",
        "review_notes": "Reviewed and clinically approved for patient home care."
    })
    assert confirm_resp.status_code == 200
    res = confirm_resp.json()
    assert res["prescription"]["doctor_confirmation_status"] == "Approved"

    # Verify active medications synced
    meds_count_after = len(db.patients[patient_id].get("active_medications", []))
    assert meds_count_after > meds_count_before

def test_emergency_trigger_and_dispatch():
    # 1. Trigger SOS
    sos_resp = client.post("/emergency/trigger", json={
        "patient_id": "p_02",
        "location_lat": 12.9352,
        "location_lng": 77.6245,
        "address": "Koramangala 5th Block, Bengaluru",
        "symptom_notes": "Patient reports acute shortness of breath and chest tightness."
    })
    assert sos_resp.status_code == 200
    em = sos_resp.json()
    assert em["severity"] in ["High Alert", "Critical Emergency"]
    assert len(em["ai_explainability"]) > 10
    assert em["recommended_ambulance_id"] is not None

    # 2. Dispatch recommended ambulance
    disp_resp = client.post(f"/emergency/{em['id']}/dispatch", json={
        "ambulance_id": em["recommended_ambulance_id"]
    })
    assert disp_resp.status_code == 200
    disp_data = disp_resp.json()
    assert disp_data["emergency"]["status"] == "Ambulance Dispatched"

def test_hospital_resources_and_medicines():
    resp = client.get("/hospital/hosp_main/resources")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["ambulances"]) >= 4
    assert len(data["medicines"]) >= 5
    assert len(data["admitted_patients"]) >= 2

def test_medication_action_and_readmission_risk():
    # Mark med as taken
    action_resp = client.post("/patients/p_01/meds/med_2/action", json={"action": "take"})
    assert action_resp.status_code == 200
    data = action_resp.json()
    assert data["medication"]["taken_today"] is True
    assert data["updated_risk_score"] <= 35.0

if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_api.py"])


def test_comprehensive_pain_emergency_evaluation():
    # 1. Non-chest severe pain (e.g. severe abdominal pain) -> Emergency alert
    abd_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "en",
        "symptom_text": "I am experiencing severe abdominal pain and excruciating stomach pain"
    })
    assert abd_resp.status_code == 200
    abd_data = abd_resp.json()
    assert abd_data["emergency_flag"] is True
    assert abd_data["triage_category"] == "Emergency"

    # 2. Acute thunderclap headache -> Emergency alert
    head_resp = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "hi",
        "symptom_text": "मुझे अचानक तीव्र सिरदर्द और असहनीय दर्द हो रहा है"
    })
    assert head_resp.status_code == 200
    head_data = head_resp.json()
    assert head_data["emergency_flag"] is True
    assert head_data["triage_category"] == "Emergency"

    # 3. Negated non-chest pain ("no severe abdominal pain") -> Should NOT trigger emergency
    neg_abd = client.post("/triage/analyze", json={
        "patient_id": "p_01",
        "language": "en",
        "symptom_text": "I have mild fever for 2 days, no severe abdominal pain, no severe stomach pain"
    })
    assert neg_abd.status_code == 200
    neg_data = neg_abd.json()
    assert neg_data["emergency_flag"] is False
    assert neg_data["triage_category"] != "Emergency"

def test_multilingual_tts_endpoint():
    for lang, sample in [("hi", "नमस्ते, आपका स्वास्थ्य कैसा है?"), ("kn", "ನಮಸ್ಕಾರ, ನಿಮ್ಮ ಆರೋಗ್ಯ ಹೇಗಿದೆ?"), ("ta", "வணக்கம், நலமா?"), ("te", "నమస్కారం, బాగున్నారా?"), ("en", "Hello, how are you feeling?")]:
        resp = client.post("/consultation/tts", json={
            "text": sample,
            "target_language": lang
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_audio"] is True
        assert data["audio_base64"] is not None
        assert len(data["audio_base64"]) > 100

def test_video_consultation_call_lifecycle():
    # 1. Doctor initiates call
    start_resp = client.post("/consultation/call/start", json={
        "consultation_id": "test_consult_42",
        "doctor_name": "Dr. Rajesh Rao",
        "patient_name": "Priya Sharma",
        "doctor_language": "en",
        "patient_language": "kn"
    })
    assert start_resp.status_code == 200
    start_data = start_resp.json()
    assert start_data["status"] == "ringing"
    assert start_data["call"]["consultationId"] == "test_consult_42"

    # 2. Check active calls registry
    active_resp = client.get("/consultation/call/active")
    assert active_resp.status_code == 200
    active_data = active_resp.json()
    assert any(c["consultationId"] == "test_consult_42" for c in active_data["active_calls"])

    # 3. Patient or Doctor ends call
    end_resp = client.post("/consultation/call/end", json={
        "consultation_id": "test_consult_42",
        "sender_role": "patient"
    })
    assert end_resp.status_code == 200
    assert end_resp.json()["status"] == "ended"

    # 4. Verify call removed from active calls
    active_after = client.get("/consultation/call/active").json()
    assert not any(c["consultationId"] == "test_consult_42" for c in active_after["active_calls"])

def test_digital_twin_endpoints():
    # 1. Normal vitals analysis
    normal_payload = {
        "heart_rate": 78,
        "blood_pressure_systolic": 120,
        "blood_pressure_diastolic": 80,
        "oxygen_saturation": 98,
        "temperature": 98.6,
        "respiratory_rate": 16,
        "glucose": 95,
        "patient_id": "p_01"
    }
    resp = client.post("/digital-twin/analyze", json=normal_payload)
    assert resp.status_code == 200
    dt = resp.json()["digital_twin"]
    assert dt["risk_level"] == "Stable"
    assert dt["risk_score"] < 25.0

    # 2. Elevated Pyrexia + Tachycardia
    fever_payload = {
        "heart_rate": 112,
        "blood_pressure_systolic": 124,
        "blood_pressure_diastolic": 82,
        "oxygen_saturation": 97,
        "temperature": 101.8,
        "respiratory_rate": 20,
        "glucose": 105,
        "patient_id": "p_01"
    }
    fever_resp = client.post("/digital-twin/analyze", json=fever_payload)
    assert fever_resp.status_code == 200
    fever_dt = fever_resp.json()["digital_twin"]
    assert fever_dt["risk_level"] in ["Elevated", "High"]
    assert len(fever_dt["detected_abnormalities"]) >= 2

    # 3. High Risk Hypoxemic Respiratory Distress
    hypox_payload = {
        "heart_rate": 118,
        "blood_pressure_systolic": 132,
        "blood_pressure_diastolic": 86,
        "oxygen_saturation": 88,
        "temperature": 99.2,
        "respiratory_rate": 28,
        "glucose": 110,
        "patient_id": "p_01"
    }
    hypox_resp = client.post("/digital-twin/analyze", json=hypox_payload)
    assert hypox_resp.status_code == 200
    hypox_dt = hypox_resp.json()["digital_twin"]
    assert hypox_dt["risk_level"] == "High"
    assert hypox_dt["emergency_warning"] is True

    # 4. Simulation Endpoint
    sim_resp = client.post("/digital-twin/simulate", json={
        "current_vitals": normal_payload,
        "future_vitals": hypox_payload
    })
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["comparison"]["level_changed"] is True
    assert sim_data["comparison"]["risk_score_delta"] > 0

    # 5. Submit Treatment Consideration for Doctor Review
    treatment_resp = client.post("/digital-twin/submit-treatment-consideration", json={
        "patient_id": "p_01",
        "patient_name": "Priya Sharma",
        "vitals_snapshot": fever_payload,
        "risk_level": "Elevated",
        "risk_score": 62.5,
        "medication_consideration": {
            "title": "Antipyretic Protocol",
            "candidateMedication": "Paracetamol 650mg Oral",
            "dosageInstructions": "1 tablet SOS",
            "rationale": "High fever with tachycardia",
            "suggestedDoctorId": "doc_05",
            "suggestedDoctor": "Dr. Rajesh Rao"
        }
    })
    assert treatment_resp.status_code == 200
    tx_data = treatment_resp.json()
    assert tx_data["status"] == "success"
    presc_id = tx_data["prescription_id"]
    assert presc_id in db.prescriptions
    assert db.prescriptions[presc_id]["doctor_confirmation_status"] == "Pending"



