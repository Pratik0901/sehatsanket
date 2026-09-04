// Multilingual Speech-to-Text and Text-to-Speech with Sarvam AI Bulbul integration

const LANG_CODE_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN'
};

let currentRecognition = null;
let currentAudio = null;

export function isSpeechRecognitionSupported() {
  return ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function startListening({ lang = 'en', onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (onError) onError(new Error("Speech recognition is not supported in this browser."));
    return null;
  }

  if (currentRecognition) {
    try {
      currentRecognition.stop();
    } catch (e) {
      // ignore
    }
  }

  const recognition = new SpeechRecognition();
  recognition.lang = LANG_CODE_MAP[lang] || 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    if (onResult) onResult(transcript, event.results[event.results.length - 1].isFinal);
  };

  recognition.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  try {
    recognition.start();
    currentRecognition = recognition;
    return recognition;
  } catch (err) {
    console.error("Failed to start speech recognition", err);
    if (onError) onError(err);
    return null;
  }
}

export function stopListening() {
  if (currentRecognition) {
    try {
      currentRecognition.stop();
    } catch (e) {
      // ignore
    }
    currentRecognition = null;
  }
}

export function cleanSpeechText(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[*#_`~>•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function speakText(text, lang = 'en', directAudioB64 = null) {
  if (!text) return;
  const sanitized = cleanSpeechText(text);
  if (!sanitized) return;

  // 0. If direct audio base64 is provided from backend, play it immediately!
  // (Safeguard against legacy synthetic beep WAV audio)
  const isSyntheticBeep = directAudioB64 && directAudioB64.startsWith('UklGR') && directAudioB64.length < 35000;
  if (directAudioB64 && !isSyntheticBeep) {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      const mime = directAudioB64.startsWith('UklGR') ? 'audio/wav' : 'audio/mpeg';
      const audio = new Audio(`data:${mime};base64,${directAudioB64}`);
      currentAudio = audio;
      await audio.play();
      return;
    } catch (e) {
      console.warn("Direct base64 audio playback failed, trying API/browser TTS:", e);
    }
  }

  // 1. High-fidelity Indic voice from SehatSanketh backend TTS (Sarvam AI / Regional Indian Speech via gTTS)
  try {
    const res = await fetch('/api/consultation/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sanitized, target_language: lang })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.has_audio && data.audio_base64) {
        const isBeep = data.audio_base64.startsWith('UklGR') && data.audio_base64.length < 35000;
        if (!isBeep) {
          if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
          }
          const mimeType = data.format || (data.audio_base64.startsWith('UklGR') ? 'audio/wav' : 'audio/mpeg');
          const audio = new Audio(`data:${mimeType};base64,${data.audio_base64}`);
          currentAudio = audio;
          await audio.play();
          return;
        }
      }
    }
  } catch (err) {
    console.warn("Backend TTS fetch failed, checking browser Web Speech fallback:", err);
  }

  // 2. Fallback to browser SpeechSynthesis
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sanitized);
    const targetLangCode = LANG_CODE_MAP[lang] || 'en-US';
    utterance.lang = targetLangCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const targetLangLower = targetLangCode.toLowerCase();
    const matchingVoice = voices.find(v => 
      v.lang.toLowerCase() === targetLangLower || 
      v.lang.toLowerCase().replace('_', '-').startsWith(lang.toLowerCase())
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Browser TTS error:", err);
  }
}
