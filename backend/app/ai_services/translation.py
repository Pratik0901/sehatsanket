import re
import json
import base64
import asyncio
import urllib.request
import urllib.parse
import httpx
from typing import Dict, Optional, Any
from app.config import settings

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "हिंदी (Hindi)",
    "kn": "ಕನ್ನಡ (Kannada)",
    "ta": "தமிழ் (Tamil)",
    "te": "తెలుగు (Telugu)"
}

SARVAM_LANG_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "kn": "kn-IN",
    "ta": "ta-IN",
    "te": "te-IN"
}

TRANSLATION_MAP = {
    "Hello, how are you feeling today?": {
        "hi": "नमस्ते, आज आप कैसा महसूस कर रहे हैं?",
        "kn": "ನಮಸ್ಕಾರ, ಇಂದು ನಿಮ್ಮ ಆರೋಗ್ಯ ಹೇಗಿದೆ?",
        "ta": "வணக்கம், இன்று உங்கள் உடல்நிலை எப்படி இருக்கிறது?",
        "te": "నమస్కారం, ఈ రోజు మీరు ఎలా ఉన్నారు?"
    },
    "I am having mild fever and cough for two days.": {
        "hi": "मुझे दो दिनों से हल्का बुखार और खांसी है।",
        "kn": "ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಸಾಧಾರಣ ಜ್ವರ ಮತ್ತು ಕೆಮ್ಮು ಇದೆ.",
        "ta": "எனக்கு இரண்டு நாட்களாக லேசான காய்ச்சலும் இருமலும் உள்ளது.",
        "te": "నాకు రెండు రోజులుగా తేలికపాటి జ్వరం మరియు దగ్గు ఉంది."
    },
    "Are you experiencing any shortness of breath, chest tightness, or dizziness?": {
        "hi": "क्या आपको सांस लेने में तकलीफ, सीने में जकड़न या चक्कर आ रहे हैं?",
        "kn": "ನಿಮಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ, ಎದೆ ಬಿಗಿತ ಅಥವಾ ತಲೆತಿರುಗುವಿಕೆ ಉಂಟಾಗುತ್ತಿದೆಯೇ?",
        "ta": "உங்களுக்கு மூச்சுத் திணறல், நெஞ்சு இறுக்கம் அல்லது தலைச்சுற்றல் உள்ளதா?",
        "te": "మీకు శ్వాస తీసుకోవడంలో ఇబ్బంది, ఛాతీ బిగుతుగా ఉండటం లేదా తలతిరగడం ఉందా?"
    },
    "No, no chest pain, just tiredness and body aches.": {
        "hi": "नहीं, सीने में कोई दर्द नहीं है, बस थकान और बदन दर्द है।",
        "kn": "ಇಲ್ಲ, ಎದೆ ನೋವು ಇಲ್ಲ, ಕೇವಲ ಆಯಾಸ ಮತ್ತು ಮೈಕೈ ನೋವು ಇದೆ.",
        "ta": "இல்லை, நெஞ்சு வலி இல்லை, வெறும் சோர்வும் உடல் வலியும் தான் உள்ளது.",
        "te": "లేదు, ఛాతీ నొప్పి లేదు, కేవలం అలసట మరియు ఒళ్ళు నొప్పులు మాత్రమే ఉన్నాయి."
    },
    "I recommend Home Care with hydration and Paracetamol. Prescriptions sent to doctor for confirmation.": {
        "hi": "मैं पर्याप्त पानी पीने और पैरासिटामोल के साथ घरेलू देखभाल की सलाह देता हूं। पर्चा डॉक्टर के पास पुष्टि के लिए भेजा गया है।",
        "kn": "ನಾನು ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯುವುದು ಮತ್ತು ಪ್ಯಾರಸಿಟಮಾಲ್‌ನೊಂದಿಗೆ ಮನೆ ಆರೈಕೆಯನ್ನು ಶಿಫಾರಸು ಮಾಡುತ್ತೇನೆ. ದೃಢೀಕರಣಕ್ಕಾಗಿ ವೈದ್ಯರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.",
        "ta": "நீரேற்றம் மற்றும் பாராசிட்டமாலுடன் கூடிய வீட்டுப் பராமரிப்பை பரிந்துரைக்கிறேன். மருத்துவர் உறுதிப்படுத்தலுக்கு அனுப்பப்பட்டுள்ளது.",
        "te": "నేను హైడ్రేషన్ మరియు పారాసిటమాల్‌తో ఇంటి సంరక్షణను సిఫార్సు చేస్తున్నాను. నిర్ధారణ కోసం ప్రిస్క్రిప్షన్ డాక్టర్‌కు పంపబడింది."
    },
    "Please book a Doctor Consultation immediately for in-depth evaluation.": {
        "hi": "कृपया विस्तृत जांच के लिए तुरंत डॉक्टर परामर्श बुक करें।",
        "kn": "ದಯವಿಟ್ಟು ವಿವರವಾದ ತಪಾಸಣೆಗಾಗಿ ತಕ್ಷಣವೇ ವೈದ್ಯರ ಸಮಾಲೋಚನೆಯನ್ನು ಕಾಯ್ದಿರಿಸಿ.",
        "ta": "ஆழமான மதிப்பீட்டிற்கு உடனடியாக மருத்துவ ஆலோசனையை பதிவு செய்யவும்.",
        "te": "సమగ్ర పరిశీలన కోసం దయచేసి వెంటనే వైద్యుల సంప్రదింపులను బుక్ చేసుకోండి."
    },
    "Emergency alert triggered. Dispatching nearest ambulance.": {
        "hi": "आपातकालीन अलर्ट सक्रिय किया गया। नजदीकी एम्बुलेंस भेजी जा रही है।",
        "kn": "ತುರ್ತು ಎಚ್ಚರಿಕೆ ಸಕ್ರಿಯಗೊಂಡಿದೆ. ಹತ್ತಿರದ ಆಂಬ್ಯುಲೆನ್ಸ್ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ.",
        "ta": "அவசர எச்சரிக்கை தொடங்கப்பட்டது. அருகில் உள்ள ஆம்புலன்ஸ் அனுப்பப்படுகிறது.",
        "te": "అత్యవసర హెచ్చరిక ప్రారంభించబడింది. సమీప ఆంబులెన్స్ పంపబడుతోంది."
    }
}

def clean_speech_text(text: str) -> str:
    if not text:
        return ""
    # Remove emojis
    cleaned = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    # Remove markdown formatting characters
    cleaned = re.sub(r'[\*#_`~>•]', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

class TranslationService:
    def __init__(self):
        self.sarvam_key = settings.SARVAM_API_KEY
        self._tts_cache: Dict[str, str] = {}

    def detect_language(self, text: str, fallback: str = "en") -> str:
        if any('\u0900' <= char <= '\u097f' for char in text):
            return "hi"  # Devanagari (Hindi)
        if any('\u0c80' <= char <= '\u0cff' for char in text):
            return "kn"  # Kannada
        if any('\u0b80' <= char <= '\u0bff' for char in text):
            return "ta"  # Tamil
        if any('\u0c00' <= char <= '\u0c7f' for char in text):
            return "te"  # Telugu
        return fallback

    async def generate_sarvam_speech(self, text: str, target_lang: str = "en") -> Optional[str]:
        """
        Generates high-fidelity Indian regional voice audio (base64 encoded MP3).
        Uses Sarvam AI Bulbul if configured, otherwise falls back to Indian regional Google TTS (gTTS).
        Supports Hindi, Kannada, Tamil, Telugu, and Indian English.
        Never generates beep tones.
        """
        clean = clean_speech_text(text)
        if not clean:
            return None

        lang = target_lang if target_lang in ["en", "hi", "kn", "ta", "te"] else self.detect_language(clean)

        # 0. Check in-memory speech cache for instant 0ms playback of repeated phrases
        cache_key = f"{lang}:{clean[:250]}"
        if cache_key in self._tts_cache:
            return self._tts_cache[cache_key]

        # 1. Try Sarvam AI Bulbul TTS (if API key is present)
        if self.sarvam_key:
            sarvam_tgt = SARVAM_LANG_MAP.get(lang, "en-IN")
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        "https://api.sarvam.ai/text-to-speech",
                        headers={
                            "api-subscription-key": self.sarvam_key,
                            "Content-Type": "application/json"
                        },
                        json={
                            "inputs": [clean[:500]],
                            "target_language_code": sarvam_tgt,
                            "speaker": "meera",
                            "model": "bulbul:v1"
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        audios = data.get("audios", [])
                        if audios and audios[0]:
                            self._tts_cache[cache_key] = audios[0]
                            return audios[0]
            except Exception as e:
                print(f"[Sarvam TTS] API attempt failed, switching to regional gTTS fallback: {e}")

        # 2. Authentic regional Indian speech via production gTTS
        try:
            def _synthesize_gtts(content: str, l_code: str) -> Optional[str]:
                import io
                from gtts import gTTS
                buf = io.BytesIO()
                tts_obj = gTTS(text=content, lang=l_code, slow=False)
                tts_obj.write_to_fp(buf)
                raw_bytes = buf.getvalue()
                if raw_bytes and len(raw_bytes) > 100:
                    return base64.b64encode(raw_bytes).decode("utf-8")
                return None

            audio_b64 = await asyncio.wait_for(
                asyncio.to_thread(_synthesize_gtts, clean[:500], lang),
                timeout=8.0
            )
            if audio_b64:
                self._tts_cache[cache_key] = audio_b64
                return audio_b64
        except Exception as err:
            print(f"[gTTS Engine] Audio synthesis failed: {err}")

        # If cloud TTS gateways are temporarily unreachable, return None so the client
        # can cleanly fallback to browser SpeechSynthesis rather than emitting an artificial beep tone.
        return None

    async def translate_with_sarvam(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> Optional[str]:
        if not text or not text.strip():
            return None

        src = source_lang or self.detect_language(text)
        if src == target_lang:
            return text

        if self.sarvam_key:
            sarvam_src = SARVAM_LANG_MAP.get(src, "en-IN")
            sarvam_tgt = SARVAM_LANG_MAP.get(target_lang, "en-IN")
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.post(
                        "https://api.sarvam.ai/translate",
                        headers={
                            "api-subscription-key": self.sarvam_key,
                            "Content-Type": "application/json"
                        },
                        json={
                            "input": text,
                            "source_language_code": sarvam_src,
                            "target_language_code": sarvam_tgt,
                            "speaker_gender": "Female",
                            "mode": "formal",
                            "model": "mayura:v1"
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        translated = data.get("translated_text")
                        if translated:
                            return translated
            except Exception as e:
                print(f"[Sarvam AI] Translation error: {e}")

        # High-accuracy regional translation fallback
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                gtx_url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={src}&tl={target_lang}&dt=t&q={urllib.parse.quote(text)}"
                resp = await client.get(gtx_url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    parts = [p[0] for p in data[0] if p and p[0]]
                    if parts:
                        return "".join(parts)
        except Exception as e:
            print(f"[Translation Fallback] Error: {e}")

        return None

    def translate_text(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
        if not text or not target_lang or (target_lang == "en" and source_lang == "en"):
            return text

        if source_lang is None:
            source_lang = self.detect_language(text)

        if source_lang == target_lang:
            return text

        # Check in mapped corpus
        for phrase, translations in TRANSLATION_MAP.items():
            if phrase.lower() in text.lower() or text.lower() in phrase.lower():
                if target_lang in translations:
                    return translations[target_lang]

        # Fast sync translation fallback
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={urllib.parse.quote(text)}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                parts = [p[0] for p in data[0] if p and p[0]]
                if parts:
                    return "".join(parts)
        except Exception:
            pass

        return text

translation_service = TranslationService()
