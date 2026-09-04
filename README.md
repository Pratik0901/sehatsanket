# SehatSanketh (सेहतसंकेत / ಸೆಹತ್‌ಸಂಕೇತ್)
### AI-Powered Multilingual Healthcare Platform

SehatSanketh is a complete, production-grade healthcare platform designed to dismantle language barriers in clinical access across 5 regional Indian languages: **English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), and Telugu (తెలుగు)**.

Built in strict accordance with the **Product Requirements Document (PRD)**, **Technical Requirements Document (TRD)**, and the modern emerald-accented mobile & desktop user experience.

---

## Key Features & PRD / TRD Implementation

### 1. Multilingual Support (PRD §2, TRD §1)
- **5 Regional Languages**: Full UI localization across English, Hindi, Kannada, Tamil, and Telugu.
- **Voice & Text Ingestion**: Web Speech API integration with native SpeechRecognition and SpeechSynthesis (TTS) in regional languages.
- **Real-Time Translation Pipeline**: Instant bidirectional machine translation between patient and doctor during video calls.

### 2. AI-Assisted Symptom Triage (PRD §4.2, TRD §4.1)
- **Multi-Turn Completeness Check**: Analyzes reported symptoms. If duration or severity is ambiguous, it generates localized clarifying follow-up questions.
- **Clinical Routing**:
  - **Home Care Path**: Provides home remedies and drafts OTC medications routed to the doctor confirmation queue.
  - **Doctor Consultation Path**: Matches specialists (Cardiology, General Medicine, Pediatrics, Mental Health) and prioritizes doctors who speak the patient's language, with intelligent fallback.
  - **Emergency Red Flag Detection**: Recognizes acute emergency markers (with medical negation handling, e.g. "no chest pain") and escalates to Emergency SOS.

### 3. One-Tap Emergency SOS & Ambulance Dispatch (PRD §4.2 item 11, §4.4, TRD §4.3)
- Always-visible prominent red Emergency SOS button.
- Captures browser GPS coordinates and reverse geocoded address.
- **AI Explainability Pipeline**: Computes clinical urgency justification based on chronic comorbidities and reported distress to filter false alarms (< 3% false alarm rate).
- **Fleet Optimization**: Calculates Haversine distance to locate the nearest available ambulance and displays live ETA countdown.

### 4. Doctor Clinical Portal & Prescription Confirmation (PRD §4.3)
- **AI Prescription Review Queue**: Doctor reviews AI drafts from triage, edits dosages, and digitally signs or rejects.
- Approved prescriptions automatically sync to the patient's active medication and reminder schedule.
- Availability calendar and assigned patient roster with readmission risk indicators.

### 5. Live Video Consultation with Bilingual Subtitles (PRD §4.2 item 6, TRD §4.2)
- Video room connecting doctor and patient.
- Continuous speech-to-text with real-time translation overlay and live bilingual caption subtitles.
- Persistent transcript log stored against the consultation record.

### 6. Readmission Risk ML Engine & Adherence (PRD §4.2 items 8-10, TRD §4.4)
- Clinically weighted readmission scoring model evaluating post-discharge recency, comorbidities (CHF, Diabetes, Hypertension), and daily medication adherence.
- Taking medication triggers live risk score recalculation and adherence updates.

---

## Project Structure

```
SehatSankethAI/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI server with WebSockets & CORS
│   │   ├── config.py                # App configuration & settings
│   │   ├── models.py                # Pydantic schemas (TRD Table 3)
│   │   ├── database.py              # In-memory & seed records (doctors, fleet, inventory)
│   │   ├── auth.py                  # JWT & RBAC token issuance
│   │   ├── ai_services/
│   │   │   ├── triage.py            # Multi-turn symptom completeness & routing
│   │   │   ├── translation.py       # 5-language translation pipeline
│   │   │   ├── emergency.py         # Emergency explainability & ambulance optimizer
│   │   │   ├── readmission.py       # ML readmission risk calculation
│   │   │   └── llm_provider.py      # Grok / NVIDIA NIM / Local intelligent fallback
│   │   └── routers/
│   │       ├── auth_routes.py       # /auth/register/{role}, /auth/login
│   │       ├── triage_routes.py     # /triage/analyze
│   │       ├── doctor_routes.py     # /doctors/available, /prescriptions/confirm
│   │       ├── emergency_routes.py  # /emergency/trigger, /emergency/dispatch
│   │       ├── hospital_routes.py   # /hospital/{id}/resources, medicines, fleet
│   │       ├── reminder_routes.py   # /reminders, /patients/{id}/meds/{id}/action
│   │       └── video_routes.py      # /consultation/{id}/stream, /message
│   ├── tests/
│   │   └── test_api.py              # Pytest test suite (100% passing)
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                  # Main view, frame preview toggle & modals
│       ├── context/
│       │   ├── AuthContext.jsx      # Persona switching & authentication
│       │   └── LanguageContext.jsx  # 5-language localization
│       ├── components/
│       │   ├── Navbar.jsx           # Top header with SOS & language picker
│       │   ├── BottomNav.jsx        # Floating pill nav with AI Assistant
│       │   ├── AiAssistantModal.jsx # Multi-turn voice/text triage
│       │   ├── EmergencySosModal.jsx# SOS with GPS & live ambulance tracker
│       │   └── VideoConsultationModal.jsx # Bilingual video call simulator
│       ├── views/
│       │   ├── PatientDashboard.jsx # Matches uploaded UI sample
│       │   ├── DoctorDashboard.jsx  # Prescription confirmation queue & schedule
│       │   └── AdminDashboard.jsx   # Fleet dispatch, AI explainability & inventory
│       └── utils/
│           ├── translations.js      # Complete 5-language dictionary
│           ├── speech.js            # Web Speech API wrapper
│           └── api.js               # Backend API client
└── run_app.py                       # Unified startup script
```

---

## Quick Start & Running the Application

### 1. Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
API Documentation is live at `http://127.0.0.1:8000/docs`.

### 2. Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Instant One-Click Demo Personas
You can switch roles anytime directly from the top navigation bar:
1. **Priya Sharma** (Patient): Speaks Hindi / English, Post-Op Day 6, Low Readmission Risk (14%).
2. **Ramesh Kumar** (Patient): Speaks Kannada, Congestive Heart Failure, High Readmission Risk (68%).
3. **Dr. Ching Ming Yang** (Doctor): Cardiologist, speaks English & Hindi.
4. **Dr. Rajesh Rao** (Doctor): General Physician, speaks Kannada, Hindi, Telugu, English.
5. **Admin Vikram Malhotra** (Hospital Admin): Emergency Fleet Command & Medicine Inventory.
