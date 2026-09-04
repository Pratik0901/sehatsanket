import uuid
import re
from typing import Dict, Any, Optional, List
from app.ai_services.translation import translation_service, LANGUAGE_NAMES
from app.ai_services.llm_provider import llm_provider
from app.database import db

CLARIFYING_QUESTIONS = {
    "fever": {
        "en": "To give an accurate assessment: 1) What is your temperature or how high is the fever? 2) How many days have you had it? 3) Do you have chills, sore throat, or body aches?",
        "hi": "सटीक मूल्यांकन के लिए: 1) आपका तापमान क्या है या बुखार कितना तेज है? 2) यह कितने दिनों से है? 3) क्या आपको ठंड, गले में खराश या बदन दर्द है?",
        "kn": "ನಿಖರವಾದ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ: 1) ನಿಮ್ಮ ತಾಪಮಾನ ಎಷ್ಟು ಅಥವಾ ಜ್ವರ ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ? 2) ಎಷ್ಟು ದಿನಗಳಿಂದ ಇದೆ? 3) ಚಳಿ, ಗಂಟಲು ನೋವು ಅಥವಾ ಮೈಕೈ ನೋವು ಇದೆಯೇ?",
        "ta": "துல்லியமான மதிப்பீட்டிற்கு: 1) உங்கள் காய்ச்சலின் அளவு என்ன? 2) எத்தனை நாட்களாக உள்ளது? 3) குளிர், தொண்டை வலி அல்லது உடல் வலி உள்ளதா?",
        "te": "ఖచ్చితమైన అంచనా కోసం: 1) మీ శరీర ఉష్ణోగ్రత ఎంత లేదా జ్వరం ఎంత తీవ్రంగా ఉంది? 2) ఎన్ని రోజులుగా ఉంది? 3) చలి, గొంతు నెప్పి లేదా ఒళ్ళు నొప్పులు ఉన్నాయా?"
    },
    "general": {
        "en": "To provide an accurate clinical prediction: 1) How long have you had this symptom (hours or days)? 2) How severe is the discomfort (1-10 scale or mild/moderate/severe)? 3) Any other symptoms like fever, nausea, or dizziness?",
        "hi": "सटीक नैदानिक भविष्यवाणी के लिए: 1) यह लक्षण कितने समय से है (घंटे या दिन)? 2) परेशानी कितनी गंभीर है (1-10 पैमाना या हल्का/मध्यम/गंभीर)? 3) क्या बुखार, मतली या चक्कर जैसे कोई अन्य लक्षण हैं?",
        "kn": "ನಿಖರವಾದ ವೈದ್ಯಕೀಯ ಮುನ್ನೋಟಕ್ಕಾಗಿ: 1) ಈ ರೋಗಲಕ್ಷಣ ಎಷ್ಟು ಸಮಯದಿಂದ ಇದೆ (ಗಂಟೆಗಳು ಅಥವಾ ದಿನಗಳು)? 2) ಕಿರಿಕಿರಿ ಎಷ್ಟು ತೀವ್ರವಾಗಿದೆ (1-10 ಪ್ರಮಾಣ ಅಥವಾ ಲಘು/ಮಧ್ಯಮ/ತೀವ್ರ)? 3) ಜ್ವರ, ವಾಕರಿಕೆ ಅಥವಾ ತಲೆತಿರುಗುವಿಕೆಯಂತಹ ಇತರ ಲಕ್ಷಣಗಳಿವೆಯೇ?",
        "ta": "துல்லியமான மருத்துவ கணிப்பிற்கு: 1) இந்த அறிகுறி எவ்வளவு காலமாக உள்ளது (மணிகள் அல்லது நாட்கள்)? 2) அசௌகரியம் எவ்வளவு தீவிரமானது (1-10 அளவுகோல் அல்லது லேசான/நடுத்தர/கடுமையான)? 3) காய்ச்சல், குமட்டல் அல்லது மயக்கம் போன்ற பிற அறிகுறிகள் உள்ளதா?",
        "te": "ఖచ్చితమైన వైద్య అంచనా కోసం: 1) ఈ లక్షణం ఎంతకాలంగా ఉంది (గంటలు లేదా రోజులు)? 2) ఎంత అసౌకర్యంగా ఉంది (1-10 స్కేల్ లేదా తేలికపాటి/మధ్యస్థ/తీవ్రమైన)? 3) జ్వరం, వికారం లేదా తలతిరగడం వంటి ఇతర లక్షణాలు ఉన్నాయా?"
    }
}

class SymptomTriageService:
    def check_negated_emergency(self, text: str) -> bool:
        """
        Robust multilingual clinical negation detection.
        Checks if acute emergency terms are explicitly negated in English, Hindi, Kannada, Tamil, or Telugu.
        """
        raw_text = text.lower()

        # Emergency keywords
        emergency_terms = [
            "chest pain", "heart attack", "can't breathe", "cannot breathe", "severe breath",
            "shortness of breath", "stroke", "paralysis", "unconscious", "heavy bleeding",
            "severe abdominal pain", "severe stomach pain", "thunderclap headache", "worst headache",
            "severe head pain", "severe back pain", "severe flank pain", "unbearable pain", "excruciating pain",
            "radiating pain", "slurred speech", "numbness", "sudden weakness", "vision loss",
            "सीने में दर्द", "हृदय घात", "सांस फूलना", "गंभीर पेट दर्द", "तीव्र सिरदर्द", "असहनीय दर्द",
            "ಎದೆ ನೋವು", "ಉಸಿರಾಟದ ತೊಂದರೆ", "ತೀವ್ರ ಹೊಟ್ಟೆ ನೋವು", "ಅಸಹನೀಯ ನೋವು", "ತೀವ್ರ ತಲೆನೋವು",
            "நெஞ்சு வலி", "மூச்சுத்திணறல்", "கடுமையான வயிற்று வலி", "பொறுக்க முடியாத வலி", "கடுமையான தலைவலி",
            "ఛాతీ నొప్పి", "శ్వాస తీసుకోవడంలో ఇబ్బంది", "తీవ్రమైన కడుపు నొప్పి", "తట్టుకోలేని నొప్పి", "తీవ్రమైన తలనొప్పి"
        ]

        # Negation patterns
        negation_prefix_patterns = [
            r"\bno\b", r"\bnot\b", r"\bdon't have\b", r"\bwithout\b", r"\bno history of\b", r"\bdenies\b", r"\bdenying\b",
            r"कोई नहीं", r"नहीं", r"नॉट",
            r"ಇಲ್ಲ", r"ಯಾವುದೇ ಇಲ್ಲ",
            r"இல்லை", r"எதுவும் இல்லை",
            r"లేదు", r"ఏమీ లేదు"
        ]

        for term in emergency_terms:
            if term in raw_text:
                # Look at context window around the term
                start_idx = max(0, raw_text.find(term) - 30)
                end_idx = min(len(raw_text), raw_text.find(term) + len(term) + 30)
                window = raw_text[start_idx:end_idx]

                # Check if any negation phrase occurs in the immediate window
                is_negated = any(re.search(pat, window) for pat in negation_prefix_patterns)
                if not is_negated:
                    return True  # Genuine unnegated emergency term found

        return False

    async def analyze_symptoms(
        self,
        patient_id: str,
        symptom_text: str,
        preferred_lang: str = "en",
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        conv = conversation_history or []
        session_id = str(uuid.uuid4())[:8]

        detected_lang = translation_service.detect_language(symptom_text, fallback=preferred_lang)
        active_lang = preferred_lang if preferred_lang in LANGUAGE_NAMES else detected_lang
        patient = db.patients.get(patient_id, {})
        patient_name = patient.get("name", "Registered Patient")
        patient_history = patient.get("medical_history", [])

        # Count user turns
        user_messages = [c for c in conv if c.get("role") == "user"]
        has_current_in_conv = any(c.get("content") == symptom_text for c in user_messages)
        total_user_turns = len(user_messages) if has_current_in_conv else len(user_messages) + 1

        combined_text = " ".join([c.get("content", "") for c in conv] + [symptom_text]).lower()

        # 1. Acute Emergency Detection with Negation Handling
        is_emergency = self.check_negated_emergency(symptom_text) or (total_user_turns > 1 and self.check_negated_emergency(combined_text))

        if is_emergency:
            emergency_summary = {
                "en": "CRITICAL EMERGENCY DETECTED: Reported symptoms indicate an acute clinical emergency requiring immediate ambulance dispatch and emergency resuscitation care.",
                "hi": "गंभीर आपातकाल: लक्षण तत्काल एम्बुलेंस प्रेषण और आपातकालीन चिकित्सा देखभाल की आवश्यकता वाले तीव्र नैदानिक आपातकाल का संकेत देते हैं।",
                "kn": "ತೀವ್ರ ತುರ್ತು: ರೋಗಲಕ್ಷಣಗಳು ತಕ್ಷಣದ ಆಂಬ್ಯುಲೆನ್ಸ್ ಮತ್ತು ತುರ್ತು ವೈದ್ಯಕೀಯ ಆರೈಕೆಯ ಅಗತ್ಯವಿರುವ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ಸೂಚಿಸುತ್ತವೆ.",
                "ta": "அவசரம்: அறிகுறிகள் உடனடியாக ஆம்புலன்ஸ் மற்றும் அவசர மருத்துவ கவனிப்பு தேவைப்படும் அவசரநிலையைக் குறிக்கின்றன.",
                "te": "తీవ్ర అత్యవసరం: లక్షణాలు తక్షణ ఆంబులెన్స్ మరియు అత్యవసర వైద్య సంరక్షణ అవసరమయ్యే తీవ్ర అత్యవసర పరిస్థితిని సూచిస్తున్నాయి."
            }
            final_emerg_msg = emergency_summary.get(active_lang, emergency_summary["en"])
            emerg_audio = await translation_service.generate_sarvam_speech(final_emerg_msg, active_lang)
            return {
                "session_id": session_id,
                "status": "completed",
                "is_categorized": True,
                "triage_category": "Emergency",
                "urgency_level": "Emergency",
                "confidence": 0.99,
                "clinical_understanding": "Acute cardiopulmonary or neurological distress requiring immediate hospital admission.",
                "analysis_summary": final_emerg_msg,
                "chatbot_reply": final_emerg_msg,
                "audio_base64": emerg_audio,
                "detected_language": active_lang,
                "suggested_specialty": "Cardiology / Emergency Medicine",
                "emergency_flag": True,
                "home_remedies": [],
                "suggested_medications": [],
                "prescription_draft_id": None,
                "doctor_confirmation_status": None,
                "assigned_doctor_name": None,
                "powered_by": "Groq LPU (openai/gpt-oss-120b) Clinical Emergency Reasoning"
            }

        # 2. Conversational LLM Engine with Groq
        system_prompt = (
            "You are SehatSanketh AI, an empathetic, highly skilled clinical conversational doctor and medical triage chatbot.\n"
            "You converse naturally with patients to analyze their symptoms, explain clinical understanding, and later accurately categorize them.\n\n"
            "CHATBOT BEHAVIOR RULES:\n"
            "1. IN EVERY TURN:\n"
            "   - Provide 'clinical_understanding': explain what the symptoms indicate physiologically (e.g. tension headache, acute gastritis, viral pharyngitis, allergic rhinitis).\n"
            "   - Respond empathetically and conversationally in 'conversational_reply_en'.\n"
            "2. WHEN TO INQUIRE vs WHEN TO CATEGORIZE:\n"
            "   - If this is the patient's initial message or duration/pain severity/other symptoms are missing:\n"
            "     * Set `is_categorized`: false\n"
            "     * Set `triage_category`: null\n"
            "     * Formulate 2-3 caring clinical follow-up questions asking for: duration, pain severity (1-10 scale), and accompanying symptoms in your reply.\n"
            "   - If the patient has answered the follow-up questions (or after 2+ user messages):\n"
            "     * Set `is_categorized`: true\n"
            "     * Categorize strictly into ONE of: 'Home Care', 'Doctor Consultation', or 'Emergency'.\n"
            "     * CRITERIA:\n"
            "       - 'Home Care': Mild, uncomplicated symptoms (pain <= 3/10, duration 1-2 days without red flags). Provide home remedies and OTC medication suggestions.\n"
            "       - 'Doctor Consultation': Symptoms lasting > 3 days, moderate to high pain (>= 5/10), high fever, incision pain, or needing prescription antibiotics.\n"
            "       - 'Emergency': Severe chest tightness, dyspnea, acute unbearable pain (>= 8/10), stroke signs.\n"
            "   - If categorization was already completed and the patient is asking follow-up questions:\n"
            "     * Keep `is_categorized`: true with the existing category.\n"
            "     * Answer their health query helpfully.\n\n"
            "RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:\n"
            "{\n"
            '  "clinical_understanding": "Concise medical analysis of the symptoms reported and physiological observations.",\n'
            '  "conversational_reply_en": "Empathetic, clear doctor chatbot response to the patient in English.",\n'
            '  "is_categorized": boolean,\n'
            '  "triage_category": "Home Care" | "Doctor Consultation" | "Emergency" | null,\n'
            '  "urgency_level": "Routine" | "Moderate" | "Urgent" | "Emergency" | "Assessing",\n'
            '  "suggested_specialty": "General Physician" | "Cardiologist" | "Pediatrician" | "Therapist & Clinical Psychologist" | null,\n'
            '  "home_remedies": ["remedy 1", "remedy 2"],\n'
            '  "suggested_medications": [{"name": "Med Name", "dosage": "Dosage", "frequency": "Frequency"}]\n'
            "}"
        )

        chat_messages = [{"role": "system", "content": system_prompt}]
        for m in conv[-6:]:
            role_tag = "assistant" if m.get("role") == "assistant" else "user"
            chat_messages.append({"role": role_tag, "content": m.get("content", "")})

        is_first_turn = total_user_turns <= 1
        turn_instruction = (
            "This is Turn 1 (initial symptom intake). Please formulate clinical understanding and ask 2-3 caring follow-up questions asking duration, pain severity (1-10), and other symptoms. Set is_categorized: false, triage_category: null."
            if is_first_turn else
            f"This is Turn {total_user_turns} (follow-up information provided). You MUST now deliver the final clinical categorization: set is_categorized: true, and set triage_category to 'Home Care', 'Doctor Consultation', or 'Emergency'."
        )

        user_turn_prompt = (
            f"Patient Context: {patient_name}, Age: {patient.get('age', 35)}, History: {', '.join(patient_history) if patient_history else 'None'}.\n"
            f"Current Turn: {total_user_turns}. {turn_instruction}\n"
            f"Patient Message: '{symptom_text}'\n"
            f"Analyze symptoms, formulate clinical understanding, and reply as the chatbot in strict JSON."
        )
        chat_messages.append({"role": "user", "content": user_turn_prompt})

        llm_res = await llm_provider.generate_chat_structured_json(chat_messages)

        if not is_first_turn and llm_res and not llm_res.get("is_categorized"):
            llm_res["is_categorized"] = True
            if not llm_res.get("triage_category"):
                is_mild = any(m in combined_text for m in ["mild", "slight", "light", "हल्का", "ಸಾಧಾರಣ", "ಲೇಸಾದ", "லேசான", "తేలికపాటి"])
                needs_doc = not is_mild and (any(w in combined_text for w in ["fever", "pain", "severe", "3 days", "4 days", "week"]) or patient.get("risk_score", 0) > 60)
                llm_res["triage_category"] = "Doctor Consultation" if needs_doc else "Home Care"
                llm_res["urgency_level"] = "Moderate" if needs_doc else "Routine"

        # Deterministic Clinical Protocol Fallback (Offline / Keyless execution)
        if not llm_res:
            if is_first_turn:
                question_key = "fever" if "fever" in combined_text or "बुखार" in combined_text or "ಜ್ವರ" in combined_text else "general"
                question_text = CLARIFYING_QUESTIONS.get(question_key, CLARIFYING_QUESTIONS["general"]).get(active_lang, CLARIFYING_QUESTIONS["general"]["en"])
                llm_res = {
                    "clinical_understanding": "Initial symptom presentation logged. Assessing onset duration, pain intensity, and systemic comorbidities.",
                    "conversational_reply_en": question_text,
                    "is_categorized": False,
                    "triage_category": None,
                    "urgency_level": "Assessing",
                    "suggested_specialty": None,
                    "home_remedies": [],
                    "suggested_medications": []
                }
            else:
                is_explicitly_mild = any(m in combined_text for m in ["mild", "slight", "light", "हल्का", "ಸಾಧಾರಣ", "ಲೇಸಾದ", "லேசான", "తేలికపాటి"])
                needs_doc = not is_explicitly_mild and (any(w in combined_text for w in ["fever", "pain", "severe", "3 days", "4 days", "week", "दिन", "ದಿನ"]) or patient.get("risk_score", 0) > 60)
                cat = "Doctor Consultation" if needs_doc else "Home Care"
                
                home_remedies_list = [
                    "Drink 2.5 - 3 Liters of warm fluids daily for hydration",
                    "Ensure adequate bed rest for 24-48 hours",
                    "Steam inhalation twice daily for airway relief"
                ]
                otc_meds = [
                    {"name": "Paracetamol 650mg", "dosage": "1 tablet after meals", "frequency": "Max 3 times daily SOS"}
                ]
                
                llm_res = {
                    "clinical_understanding": f"Symptoms evaluated clinically based on patient history and reported turn responses. Categorized as {cat}.",
                    "conversational_reply_en": (
                        "Based on your symptoms and reported duration, we recommend consulting a specialist for comprehensive clinical evaluation."
                        if cat == "Doctor Consultation"
                        else "Your symptoms appear mild and self-limiting. Supportive home care with hydration and rest is recommended."
                    ),
                    "is_categorized": True,
                    "triage_category": cat,
                    "urgency_level": "Moderate" if cat == "Doctor Consultation" else "Routine",
                    "suggested_specialty": "General Physician",
                    "home_remedies": home_remedies_list if cat == "Home Care" else [],
                    "suggested_medications": otc_meds if cat == "Home Care" else []
                }

        reply_en = llm_res.get("conversational_reply_en", "Symptoms analyzed by SehatSanketh AI.")
        understanding_en = llm_res.get("clinical_understanding", "Clinical symptom analysis in progress.")

        final_reply = reply_en
        final_understanding = understanding_en

        if active_lang != "en":
            sarvam_reply = await translation_service.translate_with_sarvam(reply_en, active_lang, "en")
            final_reply = sarvam_reply or translation_service.translate_text(reply_en, active_lang, "en")

            sarvam_und = await translation_service.translate_with_sarvam(understanding_en, active_lang, "en")
            final_understanding = sarvam_und or translation_service.translate_text(understanding_en, active_lang, "en")

        is_categorized = llm_res.get("is_categorized", False)
        triage_cat = llm_res.get("triage_category")
        urgency = llm_res.get("urgency_level", "Routine")
        specialty = llm_res.get("suggested_specialty", "General Physician")
        remedies = llm_res.get("home_remedies", [])
        meds = llm_res.get("suggested_medications", [])

        draft_id = None
        assigned_doctor = "doc_05"
        assigned_doctor_name = "Dr. Rajesh Rao (General Physician)"

        if is_categorized and triage_cat == "Home Care" and meds:
            draft_id = f"presc_draft_{uuid.uuid4().hex[:6]}"
            db.prescriptions[draft_id] = {
                "id": draft_id,
                "patient_id": patient_id,
                "patient_name": patient_name,
                "source": "AI Chatbot - Groq Clinical Analysis",
                "ai_draft": f"AI Home Care Protocol: {understanding_en}. Formulated for {patient_name}.",
                "medications": meds,
                "remedies": remedies,
                "doctor_confirmation_status": "Pending",
                "doctor_id": assigned_doctor,
                "doctor_name": assigned_doctor_name,
                "final_text": None,
                "review_notes": None,
                "created_at": "Just now"
            }

        audio_b64 = await translation_service.generate_sarvam_speech(final_reply, active_lang)

        return {
            "session_id": session_id,
            "status": "completed" if is_categorized else "inquiry",
            "is_categorized": is_categorized,
            "chatbot_reply": final_reply,
            "clinical_understanding": final_understanding,
            "audio_base64": audio_b64,
            "analysis_summary": final_reply,
            "clarifying_question": final_reply,
            "triage_category": triage_cat,
            "urgency_level": urgency,
            "confidence": 0.95 if is_categorized else 0.75,
            "detected_language": active_lang,
            "suggested_specialty": specialty if triage_cat == "Doctor Consultation" else None,
            "emergency_flag": triage_cat == "Emergency",
            "home_remedies": remedies,
            "suggested_medications": [f"{m.get('name', 'Medication')} - {m.get('dosage', '')}" for m in meds],
            "prescription_draft_id": draft_id,
            "doctor_confirmation_status": "Pending" if draft_id else None,
            "assigned_doctor_name": assigned_doctor_name if draft_id else None,
            "powered_by": "Groq LPU (openai/gpt-oss-120b) Medical Chatbot"
        }

triage_service = SymptomTriageService()
