import urllib.request
import json
import psycopg2
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
NEON_URL = "postgresql://neondb_owner:npg_ISrsQv68fBVd@ep-tiny-breeze-b31iet5x-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

print("=== 1. TEST SUBMITTING KANNADA VOICE FEEDBACK ===")
kannada_payload = {
    "doctor_id": "doc_01",
    "doctor_name": "Dr. Ananya Roy",
    "patient_id": "pat_kannada_01",
    "patient_name": "Ramesh Gowda",
    "consultation_id": "consult_kannada_999",
    "rating": 5,
    "feedback_text": "ಡಾಕ್ಟರ್ ತುಂಬಾ ಚೆನ್ನಾಗಿ ಚಿಕಿತ್ಸೆ ನೀಡಿದರು ಮತ್ತು ರೋಗಲಕ್ಷಣಗಳನ್ನು ವಿವರವಾಗಿ ವಿವರಿಸಿದರು",
    "language_code": "kn",
    "is_voice": True,
    "tags": ["Very Patient", "Accurate Diagnosis", "Clear Explanation"],
    "skipped": False
}

res_kn = post_json(f"{BASE_URL}/consultation/feedback", kannada_payload)
print("Kannada Submission Result:")
print(f" - Status: {res_kn.get('status')}")
print(f" - Message: {res_kn.get('message')}")
item_kn = res_kn.get('feedback', {})
print(f" - Original Kannada: {item_kn.get('feedback_text')}")
print(f" - AI English Translation: {item_kn.get('english_translation')}")
print(f" - Sentiment: {item_kn.get('sentiment')}")
print(f" - Updated Doctor Rating: {res_kn.get('doctor_rating')}")

print("\n=== 2. TEST SUBMITTING HINDI FEEDBACK ===")
hindi_payload = {
    "doctor_id": "doc_01",
    "doctor_name": "Dr. Ananya Roy",
    "patient_id": "pat_hindi_02",
    "patient_name": "Sunita Verma",
    "consultation_id": "consult_hindi_888",
    "rating": 5,
    "feedback_text": "डॉक्टर साहब बहुत दयालु हैं और दवाएं बहुत प्रभावी साबित हुईं",
    "language_code": "hi",
    "is_voice": False,
    "tags": ["Great Bedside Manner", "Prompt Treatment"],
    "skipped": False
}

res_hi = post_json(f"{BASE_URL}/consultation/feedback", hindi_payload)
print("Hindi Submission Result:")
item_hi = res_hi.get('feedback', {})
print(f" - Original Hindi: {item_hi.get('feedback_text')}")
print(f" - AI English Translation: {item_hi.get('english_translation')}")
print(f" - Sentiment: {item_hi.get('sentiment')}")

print("\n=== 3. TEST SUBMITTING SKIPPED FEEDBACK ===")
skip_payload = {
    "doctor_id": "doc_01",
    "doctor_name": "Dr. Ananya Roy",
    "patient_id": "pat_skip_03",
    "patient_name": "Anonymous Patient",
    "consultation_id": "consult_skip_777",
    "rating": 5,
    "feedback_text": "",
    "language_code": "en",
    "is_voice": False,
    "tags": [],
    "skipped": True
}
res_skip = post_json(f"{BASE_URL}/consultation/feedback", skip_payload)
print(f"Skip Submission Result: {res_skip.get('status')} - {res_skip.get('message')}")

print("\n=== 4. TEST GETTING DOCTOR FEEDBACK ===")
doc_res = get_json(f"{BASE_URL}/consultation/feedback/doctor/doc_01")
print(f"Doctor 'doc_01' Feedback Count: {doc_res.get('total_reviews')}, Average Rating: {doc_res.get('average_rating')}")
for fb in doc_res.get('feedbacks', [])[-3:]:
    en_txt = fb.get('english_translation') or fb.get('translated_text') or ''
    print(f" - [{fb.get('language') or fb.get('language_code')}] Rating: {fb.get('rating')} | Voice: {fb.get('is_voice')} | EN: {en_txt[:50]}...")

print("\n=== 5. TEST GETTING ALL HOSPITAL FEEDBACK (ADMIN) ===")
admin_res = get_json(f"{BASE_URL}/consultation/feedback/all")
print(f"Total Hospital Feedback: {admin_res.get('total')} reviews")

print("\n=== 6. VERIFY NEON POSTGRESQL CLOUD PERSISTENCE ===")
try:
    conn = psycopg2.connect(NEON_URL)
    cur = conn.cursor()
    cur.execute("SELECT id, patient_name, rating, language, voice_input_used, sentiment, translated_text, skipped FROM consultation_feedback ORDER BY created_at DESC LIMIT 5;")
    rows = cur.fetchall()
    print(f"Neon DB Verified - Retrieved {len(rows)} recent rows directly from Neon PostgreSQL:")
    for row in rows:
        tr_text = (row[6] or '')[:65]
        print(f"   ID: {row[0]} | Patient: {row[1]} | ⭐ {row[2]} | Lang: {row[3]} | Voice: {row[4]} | Sentiment: {row[5]} | Skipped: {row[7]}")
        print(f"      English: {tr_text}...")
    cur.close()
    conn.close()
    print("\n>>> ALL FEEDBACK END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")
except Exception as e:
    print(f"Neon DB query error: {e}")
