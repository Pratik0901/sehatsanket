import os
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

ITC_MAP = {
    "hi": "hi-t-i0-und",
    "kn": "kn-t-i0-und",
    "ta": "ta-t-i0-und",
    "te": "te-t-i0-und"
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

def has_indic_script(text: str) -> bool:
    if not text:
        return False
    return any(
        ('\u0900' <= c <= '\u097f') or  # Hindi / Devanagari
        ('\u0c80' <= c <= '\u0cff') or  # Kannada
        ('\u0b80' <= c <= '\u0bff') or  # Tamil
        ('\u0c00' <= c <= '\u0c7f')     # Telugu
        for c in text
    )

class TranslationService:
    def __init__(self):
        self.sarvam_key = os.getenv("SARVAM_API_KEY", settings.SARVAM_API_KEY)
        self._tts_cache: Dict[str, str] = {}
        self._translit_cache: Dict[str, str] = {}
        self._translation_cache: Dict[str, str] = {}

    def detect_language(self, text: str, fallback: str = "en") -> str:
        if not text:
            return fallback
        if any('\u0900' <= char <= '\u097f' for char in text):
            return "hi"  # Devanagari (Hindi)
        if any('\u0c80' <= char <= '\u0cff' for char in text):
            return "kn"  # Kannada
        if any('\u0b80' <= char <= '\u0bff' for char in text):
            return "ta"  # Tamil
        if any('\u0c00' <= char <= '\u0c7f' for char in text):
            return "te"  # Telugu
        return fallback

    async def transliterate_indic_async(self, text: str, lang: str) -> str:
        """
        Converts Romanized phonetic Indic text (e.g. 'nanage jwara ide', 'pet me dard')
        into authentic native script (Kannada, Hindi, Tamil, Telugu) via Google Input Tools.
        """
        itc = ITC_MAP.get(lang)
        if not itc or not text or not text.strip():
            return text
        clean = text.strip()
        cache_key = f"{lang}:{clean[:200]}"
        if cache_key in self._translit_cache:
            return self._translit_cache[cache_key]

        url = f"https://inputtools.google.com/request?text={urllib.parse.quote(clean)}&itc={itc}&num=1"
        try:
            async with httpx.AsyncClient(timeout=3.5) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    if data and len(data) > 1 and data[0] == "SUCCESS":
                        words = [item[1][0] for item in data[1] if item and len(item) > 1 and item[1]]
                        res = " ".join(words).strip()
                        if res:
                            self._translit_cache[cache_key] = res
                            return res
        except Exception:
            pass
        return clean

    def transliterate_indic_sync(self, text: str, lang: str) -> str:
        itc = ITC_MAP.get(lang)
        if not itc or not text or not text.strip():
            return text
        clean = text.strip()
        cache_key = f"{lang}:{clean[:200]}"
        if cache_key in self._translit_cache:
            return self._translit_cache[cache_key]

        url = f"https://inputtools.google.com/request?text={urllib.parse.quote(clean)}&itc={itc}&num=1"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and len(data) > 1 and data[0] == "SUCCESS":
                    words = [item[1][0] for item in data[1] if item and len(item) > 1 and item[1]]
                    res = " ".join(words).strip()
                    if res:
                        self._translit_cache[cache_key] = res
                        return res
        except Exception:
            pass
        return clean

    async def generate_sarvam_speech(self, text: str, target_lang: str = "en") -> Optional[str]:
        """
        Generates high-fidelity Indian regional voice audio (base64 encoded MP3).
        Uses Sarvam AI Bulbul (speaker: 'priya') if configured, otherwise falls back to
        production Indian regional Google TTS (gTTS).
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
        sarv_key = os.getenv("SARVAM_API_KEY", self.sarvam_key)
        if sarv_key:
            sarvam_tgt = SARVAM_LANG_MAP.get(lang, "en-IN")
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        "https://api.sarvam.ai/text-to-speech",
                        headers={
                            "api-subscription-key": sarv_key,
                            "Content-Type": "application/json"
                        },
                        json={
                            "inputs": [clean[:500]],
                            "target_language_code": sarvam_tgt,
                            "speaker": "priya",
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
                print(f"[Sarvam TTS] API attempt note: {e}")

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
            print(f"[gTTS Engine] Audio synthesis notice: {err}")

        return None

    async def _call_sarvam_api(self, text: str, src: str, tgt: str) -> Optional[str]:
        sarv_key = os.getenv("SARVAM_API_KEY", self.sarvam_key)
        if not sarv_key or src == tgt or src == "auto":
            return None
        sarvam_src = SARVAM_LANG_MAP.get(src, "en-IN")
        sarvam_tgt = SARVAM_LANG_MAP.get(tgt, "en-IN")
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    "https://api.sarvam.ai/translate",
                    headers={
                        "api-subscription-key": sarv_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "input": text[:800],
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
                    if translated and translated.strip():
                        return translated.strip()
        except Exception:
            pass
        return None

    async def _call_google_dict_async(self, text: str, sl: str, tl: str) -> Optional[str]:
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={sl}&tl={tl}&dt=t&q={urllib.parse.quote(text)}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    parts = [p[0] for p in data[0] if p and p[0]]
                    if parts:
                        res = "".join(parts).strip()
                        if res:
                            return res
        except Exception:
            pass
        return None

    def _call_google_dict_sync(self, text: str, sl: str, tl: str) -> Optional[str]:
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={sl}&tl={tl}&dt=t&q={urllib.parse.quote(text)}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                parts = [p[0] for p in data[0] if p and p[0]]
                if parts:
                    res = "".join(parts).strip()
                    if res:
                        return res
        except Exception:
            pass
        return None

    async def _call_mymemory_async(self, text: str, sl: str, tl: str) -> Optional[str]:
        try:
            pair = f"{sl}|{tl}" if sl != "auto" else f"autodetect|{tl}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair={pair}"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    res = data.get("responseData", {}).get("translatedText")
                    if res and res.strip() and not res.startswith("MYMEMORY WARNING"):
                        return res.strip()
        except Exception:
            pass
        return None

    def _call_mymemory_sync(self, text: str, sl: str, tl: str) -> Optional[str]:
        try:
            pair = f"{sl}|{tl}" if sl != "auto" else f"autodetect|{tl}"
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair={pair}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                res = data.get("responseData", {}).get("translatedText")
                if res and res.strip() and not res.startswith("MYMEMORY WARNING"):
                    return res.strip()
        except Exception:
            pass
        return None

    async def translate_with_sarvam(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> Optional[str]:
        """
        Translates text across English and Indian regional languages (Hindi, Kannada, Tamil, Telugu).
        Flawlessly handles:
        - Native Indic script (Devanagari, Kannada, Tamil, Telugu)
        - Romanized Indic script (Hinglish, Kanglish, etc.) via pre-transliteration
        - English medical guidance & consultation queries
        """
        if not text or not text.strip():
            return None

        clean_text = clean_speech_text(text)
        if not clean_text:
            return None

        if not target_lang:
            target_lang = "en"

        cache_key = f"{source_lang}->{target_lang}:{clean_text[:250]}"
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        # 0. Check in mapped corpus
        for phrase, translations in TRANSLATION_MAP.items():
            if phrase.lower() in clean_text.lower() or clean_text.lower() in phrase.lower():
                if target_lang in translations:
                    res = translations[target_lang]
                    self._translation_cache[cache_key] = res
                    return res

        has_indic = has_indic_script(clean_text)
        detected = self.detect_language(clean_text) if has_indic else None
        effective_src = detected or source_lang or "auto"

        # Case 1: Same language requested, but user provided Romanized Indic for an Indic language (e.g. Hinglish with target Hindi)
        if effective_src == target_lang and not has_indic and target_lang in ITC_MAP:
            translit = await self.transliterate_indic_async(clean_text, target_lang)
            if translit and translit != clean_text:
                self._translation_cache[cache_key] = translit
                return translit

        # Case 2: Source is an Indic language (Hindi, Kannada, Tamil, Telugu), but written in Latin script (Romanized Indic)
        if not has_indic and effective_src in ITC_MAP:
            native_text = await self.transliterate_indic_async(clean_text, effective_src)
            if native_text and native_text != clean_text:
                # Try Sarvam AI with native script
                sarv = await self._call_sarvam_api(native_text, effective_src, target_lang)
                if sarv and sarv.strip():
                    self._translation_cache[cache_key] = sarv.strip()
                    return sarv.strip()
                # Try Google Dict with native script
                g_res = await self._call_google_dict_async(native_text, effective_src, target_lang)
                if g_res and g_res.strip():
                    self._translation_cache[cache_key] = g_res.strip()
                    return g_res.strip()

        # Case 3: Try Sarvam AI directly (if key present and text is already native script or English)
        if effective_src != target_lang and effective_src != "auto":
            sarv = await self._call_sarvam_api(clean_text, effective_src, target_lang)
            if sarv and sarv.strip():
                self._translation_cache[cache_key] = sarv.strip()
                return sarv.strip()

        # Case 4: Google Translate Dict Chrome Extension endpoint
        sl_param = effective_src if (effective_src in ["hi", "kn", "ta", "te"] and has_indic) else "auto"
        direct = await self._call_google_dict_async(clean_text, sl_param, target_lang)
        if direct and direct.strip():
            # If target is an Indic language and result came back Romanized, transliterate it to native script
            if target_lang in ITC_MAP and not has_indic_script(direct):
                direct_native = await self.transliterate_indic_async(direct, target_lang)
                if direct_native and direct_native != direct:
                    direct = direct_native

            if direct.strip().lower() != clean_text.lower() or has_indic:
                self._translation_cache[cache_key] = direct.strip()
                return direct.strip()

        # Case 5: Direct translation returned unchanged text and target is English:
        # Check candidate Dravidian / Indic transliterations (kn, ta, te, hi)
        if target_lang == "en" and not has_indic:
            candidates = ["kn", "ta", "te", "hi"]
            if effective_src in candidates:
                candidates.remove(effective_src)
                candidates.insert(0, effective_src)
            for cand in candidates:
                cand_native = await self.transliterate_indic_async(clean_text, cand)
                if cand_native and cand_native != clean_text:
                    cand_trans = await self._call_google_dict_async(cand_native, cand, "en")
                    if cand_trans and cand_trans.strip().lower() != clean_text.lower():
                        self._translation_cache[cache_key] = cand_trans.strip()
                        return cand_trans.strip()

        # Case 6: MyMemory Fallback
        mm_res = await self._call_mymemory_async(clean_text, effective_src, target_lang)
        if mm_res and mm_res.strip():
            self._translation_cache[cache_key] = mm_res.strip()
            return mm_res.strip()

        fallback_result = direct if direct else clean_text
        self._translation_cache[cache_key] = fallback_result
        return fallback_result

    def translate_text(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
        """
        Synchronous fallback for translating text across English and Indian regional languages.
        """
        if not text or not text.strip():
            return text

        clean_text = clean_speech_text(text)
        if not clean_text:
            return text

        if not target_lang:
            target_lang = "en"

        cache_key = f"{source_lang}->{target_lang}:{clean_text[:250]}"
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        # 0. Check in mapped corpus
        for phrase, translations in TRANSLATION_MAP.items():
            if phrase.lower() in clean_text.lower() or clean_text.lower() in phrase.lower():
                if target_lang in translations:
                    res = translations[target_lang]
                    self._translation_cache[cache_key] = res
                    return res

        has_indic = has_indic_script(clean_text)
        detected = self.detect_language(clean_text) if has_indic else None
        effective_src = detected or source_lang or "auto"

        # Case 1: Same language requested, but user provided Romanized Indic for an Indic language
        if effective_src == target_lang and not has_indic and target_lang in ITC_MAP:
            translit = self.transliterate_indic_sync(clean_text, target_lang)
            if translit and translit != clean_text:
                self._translation_cache[cache_key] = translit
                return translit

        # Case 2: Source is an Indic language, but written in Latin script (Romanized Indic)
        if not has_indic and effective_src in ITC_MAP:
            native_text = self.transliterate_indic_sync(clean_text, effective_src)
            if native_text and native_text != clean_text:
                g_res = self._call_google_dict_sync(native_text, effective_src, target_lang)
                if g_res and g_res.strip():
                    self._translation_cache[cache_key] = g_res.strip()
                    return g_res.strip()

        # Case 3: Google Translate Dict Chrome Extension endpoint
        sl_param = effective_src if (effective_src in ["hi", "kn", "ta", "te"] and has_indic) else "auto"
        direct = self._call_google_dict_sync(clean_text, sl_param, target_lang)
        if direct and direct.strip():
            if target_lang in ITC_MAP and not has_indic_script(direct):
                direct_native = self.transliterate_indic_sync(direct, target_lang)
                if direct_native and direct_native != direct:
                    direct = direct_native

            if direct.strip().lower() != clean_text.lower() or has_indic:
                self._translation_cache[cache_key] = direct.strip()
                return direct.strip()

        # Case 4: Candidate transliterations for Dravidian / Indic languages to English
        if target_lang == "en" and not has_indic:
            candidates = ["kn", "ta", "te", "hi"]
            if effective_src in candidates:
                candidates.remove(effective_src)
                candidates.insert(0, effective_src)
            for cand in candidates:
                cand_native = self.transliterate_indic_sync(clean_text, cand)
                if cand_native and cand_native != clean_text:
                    cand_trans = self._call_google_dict_sync(cand_native, cand, "en")
                    if cand_trans and cand_trans.strip().lower() != clean_text.lower():
                        self._translation_cache[cache_key] = cand_trans.strip()
                        return cand_trans.strip()

        # Case 5: MyMemory Fallback
        mm_res = self._call_mymemory_sync(clean_text, effective_src, target_lang)
        if mm_res and mm_res.strip():
            self._translation_cache[cache_key] = mm_res.strip()
            return mm_res.strip()

        fallback_result = direct if direct else clean_text
        self._translation_cache[cache_key] = fallback_result
        return fallback_result

translation_service = TranslationService()

