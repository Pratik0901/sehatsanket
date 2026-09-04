// Multilingual Speech-to-Text and Text-to-Speech with Sarvam AI & Indic Neural Engine

const LANG_CODE_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-IN'
};

let currentRecognition = null;
let currentAudio = null;
let isExplicitlyStopped = false;
let silenceTimer = null;
let latestInterimText = '';

export function isSpeechRecognitionSupported() {
  return ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function startListening({ 
  lang = 'en', 
  continuous = true, 
  autoRestart = true, 
  silenceThresholdMs = 1200,
  onResult, 
  onError, 
  onEnd 
}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (onError) onError(new Error("Speech recognition is not supported in this browser."));
    return null;
  }

  isExplicitlyStopped = false;
  latestInterimText = '';
  if (silenceTimer) clearTimeout(silenceTimer);

  if (currentRecognition) {
    try {
      currentRecognition.stop();
    } catch (e) {}
  }

  const recognition = new SpeechRecognition();
  recognition.lang = LANG_CODE_MAP[lang] || 'en-US';
  recognition.continuous = continuous;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const item = event.results[i];
      if (item && item[0]) {
        const text = item[0].transcript;
        if (item.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }
    }

    const currentText = (finalTranscript || interimTranscript).trim();
    if (currentText) {
      latestInterimText = currentText;
      if (onResult) onResult(currentText, false);

      // Automatic Turn Completion on Natural Silence Pause
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (latestInterimText && latestInterimText.trim()) {
          const completedTurn = latestInterimText.trim();
          latestInterimText = '';
          if (onResult) onResult(completedTurn, true);
        }
      }, silenceThresholdMs);
    }

    if (finalTranscript.trim()) {
      if (silenceTimer) clearTimeout(silenceTimer);
      latestInterimText = '';
      if (onResult) onResult(finalTranscript.trim(), true);
    }
  };

  recognition.onerror = (event) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn("Speech recognition warning:", event.error);
    }
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (!isExplicitlyStopped && autoRestart) {
      setTimeout(() => {
        if (!isExplicitlyStopped && currentRecognition === recognition) {
          try {
            recognition.start();
          } catch (e) {}
        }
      }, 300);
    } else {
      if (onEnd) onEnd();
    }
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
  isExplicitlyStopped = true;
  if (silenceTimer) clearTimeout(silenceTimer);
  latestInterimText = '';
  if (currentRecognition) {
    try {
      currentRecognition.stop();
    } catch (e) {}
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

export function cancelSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

export function speakText(text, lang = 'en', directAudioB64 = null) {
  return new Promise(async (resolve) => {
    if (!text) return resolve(false);
    const sanitized = cleanSpeechText(text);
    if (!sanitized) return resolve(false);

    cancelSpeech();

    // 0. Play direct high-fidelity Audio Base64 if already provided
    if (directAudioB64 && typeof directAudioB64 === 'string' && directAudioB64.length > 100) {
      const isLegacyBeep = directAudioB64.startsWith('UklGR') && directAudioB64.length < 35000;
      if (!isLegacyBeep) {
        try {
          const mime = directAudioB64.startsWith('UklGR') ? 'audio/wav' : 'audio/mpeg';
          const audio = new Audio(`data:${mime};base64,${directAudioB64}`);
          currentAudio = audio;
          audio.onended = () => { currentAudio = null; resolve(true); };
          audio.onerror = () => { currentAudio = null; tryBackendOrBrowserTts(); };
          await audio.play();
          return;
        } catch (playErr) {
          console.warn("Direct base64 audio playback failed, falling back to TTS API:", playErr);
        }
      }
    }

    async function tryBackendOrBrowserTts() {
      // 1. Fetch from SehatSanketh backend TTS (Sarvam AI / Indic gTTS)
      try {
        const endpoints = ['/api/consultation/tts', '/consultation/tts'];
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: sanitized, target_language: lang })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.has_audio && data.audio_base64) {
                const mimeType = data.format || (data.audio_base64.startsWith('UklGR') ? 'audio/wav' : 'audio/mpeg');
                const audio = new Audio(`data:${mimeType};base64,${data.audio_base64}`);
                currentAudio = audio;
                audio.onended = () => { currentAudio = null; resolve(true); };
                audio.onerror = () => { currentAudio = null; tryBrowserSpeech(); };
                await audio.play();
                return;
              }
            }
          } catch (e) {
            // try next endpoint
          }
        }
      } catch (err) {
        console.warn("Backend TTS fetch failed, trying Web Speech API fallback:", err);
      }

      tryBrowserSpeech();
    }

    function tryBrowserSpeech() {
      // 2. Native Web Speech API fallback
      if (!('speechSynthesis' in window)) {
        return resolve(false);
      }

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

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        // Chrome safeguard for long speech synthesis
        window.speechSynthesis.speak(utterance);

        // Fallback resolution after 8 seconds in case onend never fires
        setTimeout(() => resolve(true), 8000);
      } catch (err) {
        console.warn("Browser SpeechSynthesis error:", err);
        resolve(false);
      }
    }

    tryBackendOrBrowserTts();
  });
}
