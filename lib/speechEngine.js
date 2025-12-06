/**
 * TTS Integration & Speech Synthesis
 * Supports Web Speech API (browser native, free)
 */

/**
 * Speech Synthesizer - Text-to-Speech engine
 */
const VOWEL_GROUPS = {
  A: /[aàáâǎāɑ]/i,
  E: /[eēéèêěɘ]/i,
  I: /[iíìîǐīɪyü]/i,
  O: /[oóòôǒō]/i,
  U: /[uùúūǔü]/i,
};

function charToViseme(char = '') {
  if (!char) {
    return { viseme: 'M', energy: 0.1 };
  }
  if (/[pbm]/i.test(char)) {
    return { viseme: 'M', energy: 0.15 };
  }
  if (/[fv]/i.test(char)) {
    return { viseme: 'F', energy: 0.35 };
  }
  if (/[w]/i.test(char)) {
    return { viseme: 'W', energy: 0.4 };
  }
  if (/[l]/i.test(char)) {
    return { viseme: 'L', energy: 0.35 };
  }
  if (/[r]/i.test(char)) {
    return { viseme: 'R', energy: 0.4 };
  }
  if (/[sšzžx]/i.test(char)) {
    return { viseme: 'S', energy: 0.45 };
  }
  if (/[tdn]/i.test(char)) {
    return { viseme: 'T', energy: 0.3 };
  }
  if (/[kg]/i.test(char)) {
    return { viseme: 'K', energy: 0.4 };
  }
  for (const [viseme, regex] of Object.entries(VOWEL_GROUPS)) {
    if (regex.test(char)) {
      const baseEnergy = viseme === 'A' ? 0.85 : viseme === 'O' ? 0.75 : 0.65;
      return { viseme, energy: baseEnergy };
    }
  }
  if (/[ --]/.test(char) || /[.,;!?，。！？、]/.test(char)) {
    return { viseme: 'M', energy: 0.05 };
  }
  return { viseme: 'A', energy: 0.55 };
}

export class SpeechSynthesizer {
  constructor(options = {}) {
    this.engine = options.engine || 'web-speech';
    this.voiceId = options.voiceId || 'default';
    this.apiKey = options.apiKey || '';
    this.onViseme = options.onViseme || null;
    this.onSpeechStart = options.onSpeechStart || null;
    this.onSpeechEnd = options.onSpeechEnd || null;
    this.isPlaying = false;
    this.pendingVisemeTimers = [];
  }

  setVisemeCallback(cb) {
    this.onViseme = cb;
  }

  setSpeechLifecycleCallbacks({ onStart, onEnd } = {}) {
    this.onSpeechStart = onStart;
    this.onSpeechEnd = onEnd;
  }

  clearVisemeTimers() {
    this.pendingVisemeTimers.forEach((timer) => clearTimeout(timer));
    this.pendingVisemeTimers = [];
  }

  scheduleViseme(viseme, energy, delayMs = 0) {
    if (!this.onViseme) return;
    const timer = setTimeout(() => {
      this.onViseme && this.onViseme({ viseme, energy });
    }, delayMs);
    this.pendingVisemeTimers.push(timer);
  }

  /**
   * Start text-based realtime viseme animation
   */
  startTextBasedVisemeAnimation(text) {
    if (!this.onViseme) return;
    
    this.clearVisemeTimers();
    
    const sanitized = text.replace(/\s+/g, '');
    if (!sanitized) {
      this.scheduleViseme('M', 0.1, 0);
      return;
    }
    
    const chars = Array.from(sanitized);
    const estimatedDuration = this.estimateDuration(text);
    const totalChars = chars.length;
    const timePerChar = Math.max(60, estimatedDuration * 1000 / totalChars);
    
    console.log(`Starting text-based viseme animation: ${totalChars} chars, ${timePerChar}ms per char`);
    
    chars.forEach((char, idx) => {
      const { viseme, energy } = charToViseme(char);
      const delay = idx * timePerChar;
      this.scheduleViseme(viseme, energy, delay);
      
      // Add some randomness to make it more natural
      if (Math.random() < 0.3) {
        const nextDelay = delay + timePerChar * 0.5;
        const nextViseme = viseme === 'A' ? 'O' : 'A';
        this.scheduleViseme(nextViseme, energy * 0.8, nextDelay);
      }
    });
    
    // Schedule mouth close at the end
    const endDelay = estimatedDuration * 1000 + 200;
    this.scheduleViseme('M', 0, endDelay);
  }

  /**
   * Public synthesize method - delegates to Web Speech API
   */
  async synthesize(text) {
    return this.synthesizeWebSpeech(text);
  }

  /**
   * Web Speech API (browser native, free)
   */
  async synthesizeWebSpeech(text) {
    return new Promise((resolve, reject) => {
      const loadVoices = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;

        // Try to select English voice first
        selectedVoice = voices.find(v => 
          v.name && (
            v.name.includes('Google') && v.lang.includes('en') ||
            v.name.includes('Microsoft') && v.lang.includes('en-US') ||
            (v.lang.includes('en-US') || v.lang.includes('en_US')) && v.name.includes('Female')
          )
        );

        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('en'));
        }

        // If text is Chinese, select Chinese voice
        if (!selectedVoice && /[\u4e00-\u9fff]/.test(text)) {
          utterance.lang = 'zh-CN';
          selectedVoice = voices.find(v => 
            v.name && (
              v.name.includes('Google') && v.lang.includes('zh') ||
              v.name.includes('Microsoft') && v.lang.includes('zh-CN') ||
              (v.lang.includes('zh-CN') || v.lang.includes('zh_CN')) && v.name.includes('Female')
            )
          );
          
          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes('zh'));
          }
        }

        // Fallback to any available voice
        if (!selectedVoice && voices.length > 0) {
          selectedVoice = voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
        }

        let startTime = Date.now();

        utterance.onstart = () => {
          startTime = Date.now();
          this.clearVisemeTimers();
          if (this.onSpeechStart) {
            this.onSpeechStart();
          }
          this.startTextBasedVisemeAnimation(text);
        };

        utterance.onend = () => {
          const duration = (Date.now() - startTime) / 1000;
          this.clearVisemeTimers();
          if (this.onViseme) {
            this.onViseme({ viseme: 'M', energy: 0 });
          }
          if (this.onSpeechEnd) {
            this.onSpeechEnd();
          }
          resolve({
            audio: null,
            duration: Math.max(duration, text.length * 0.05),
            method: 'web-speech'
          });
        };

        utterance.onerror = (e) => {
          // Don't treat "interrupted" as an error - it's expected when canceling
          if (e.error === 'interrupted') {
            this.clearVisemeTimers();
            if (this.onSpeechEnd) {
              this.onSpeechEnd();
            }
            resolve({
              audio: null,
              duration: Math.max((Date.now() - startTime) / 1000, text.length * 0.05),
              method: 'web-speech'
            });
            return;
          }
          
          this.clearVisemeTimers();
          if (this.onSpeechEnd) {
            this.onSpeechEnd();
          }
          reject(new Error(`Speech synthesis failed: ${e.error}`));
        };

        // Only cancel if currently speaking
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        
        window.speechSynthesis.speak(utterance);
        this.isPlaying = true;
      };

      // Ensure voices are loaded
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      } else {
        loadVoices();
      }
    });
  }

  /**
   * Stop playback
   */
  stopPlayback() {
    // Cancel any Web Speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.clearVisemeTimers();
    this.isPlaying = false;
  }

  /**
   * Estimate audio duration (for animation timing)
   */
  estimateDuration(text) {
    // Average speaking rate: ~150 words per minute = 2.5 words/sec = 0.4 sec/word
    const wordCount = text.split(/\s+/).length;
    return wordCount * 0.4;
  }
}

export default SpeechSynthesizer;
