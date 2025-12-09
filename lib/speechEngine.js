/**
 * TTS Integration & Speech Synthesis
 * Supports Web Speech API (browser native, free)
 * Enhanced with phoneme-based viseme mapping and coarticulation
 */

/**
 * Phoneme-to-Viseme mapping with mouth shape details
 * Each viseme has width (horizontal) and height (vertical) factors
 */
const PHONEME_VISEMES = {
  // Bilabials - lips together
  'P': { viseme: 'M', energy: 0.15, width: 0.3, height: 0.1, duration: 80 },
  'B': { viseme: 'M', energy: 0.20, width: 0.3, height: 0.1, duration: 80 },
  'M': { viseme: 'M', energy: 0.25, width: 0.3, height: 0.15, duration: 100 },
  
  // Labiodentals - teeth on lower lip
  'F': { viseme: 'F', energy: 0.40, width: 0.4, height: 0.3, duration: 90 },
  'V': { viseme: 'F', energy: 0.45, width: 0.4, height: 0.3, duration: 90 },
  
  // Open vowels - wide mouth
  'AA': { viseme: 'A', energy: 0.95, width: 0.7, height: 0.9, duration: 150 }, // father
  'AE': { viseme: 'A', energy: 0.85, width: 0.8, height: 0.7, duration: 140 }, // cat
  'AH': { viseme: 'A', energy: 0.75, width: 0.6, height: 0.6, duration: 120 }, // cut
  
  // Mid vowels
  'EH': { viseme: 'E', energy: 0.70, width: 0.6, height: 0.5, duration: 130 }, // bed
  'ER': { viseme: 'E', energy: 0.65, width: 0.5, height: 0.4, duration: 140 }, // bird
  'EY': { viseme: 'E', energy: 0.75, width: 0.7, height: 0.5, duration: 150 }, // say
  
  // Rounded vowels - lips rounded
  'OW': { viseme: 'O', energy: 0.85, width: 0.5, height: 0.8, duration: 160 }, // go
  'AO': { viseme: 'O', energy: 0.80, width: 0.5, height: 0.7, duration: 140 }, // bought
  'UW': { viseme: 'U', energy: 0.75, width: 0.4, height: 0.6, duration: 150 }, // food
  'UH': { viseme: 'U', energy: 0.65, width: 0.4, height: 0.5, duration: 130 }, // book
  
  // Close vowels
  'IY': { viseme: 'I', energy: 0.70, width: 0.7, height: 0.4, duration: 140 }, // see
  'IH': { viseme: 'I', energy: 0.65, width: 0.6, height: 0.3, duration: 120 }, // sit
  
  // Semivowels
  'W': { viseme: 'W', energy: 0.55, width: 0.4, height: 0.5, duration: 90 },
  'Y': { viseme: 'I', energy: 0.60, width: 0.6, height: 0.3, duration: 80 },
  'L': { viseme: 'L', energy: 0.45, width: 0.5, height: 0.4, duration: 100 },
  'R': { viseme: 'R', energy: 0.55, width: 0.5, height: 0.5, duration: 110 },
  
  // Fricatives
  'S': { viseme: 'S', energy: 0.50, width: 0.5, height: 0.3, duration: 100 },
  'Z': { viseme: 'S', energy: 0.50, width: 0.5, height: 0.3, duration: 100 },
  'SH': { viseme: 'S', energy: 0.55, width: 0.4, height: 0.4, duration: 110 },
  'ZH': { viseme: 'S', energy: 0.55, width: 0.4, height: 0.4, duration: 110 },
  'TH': { viseme: 'T', energy: 0.40, width: 0.5, height: 0.3, duration: 90 },
  'DH': { viseme: 'T', energy: 0.40, width: 0.5, height: 0.3, duration: 90 },
  
  // Stops
  'T': { viseme: 'T', energy: 0.35, width: 0.4, height: 0.2, duration: 70 },
  'D': { viseme: 'T', energy: 0.40, width: 0.4, height: 0.2, duration: 70 },
  'N': { viseme: 'T', energy: 0.45, width: 0.4, height: 0.3, duration: 100 },
  'K': { viseme: 'K', energy: 0.50, width: 0.5, height: 0.4, duration: 80 },
  'G': { viseme: 'K', energy: 0.50, width: 0.5, height: 0.4, duration: 80 },
  
  // Silence
  'SIL': { viseme: 'M', energy: 0.05, width: 0.3, height: 0.1, duration: 50 },
};

/**
 * Chinese Pinyin Syllable to Viseme Mapping
 * Optimized for Mandarin Chinese lip sync
 * Each entry represents a common Chinese syllable structure
 * 注意：能量值不应超过 0.6，以保证嘴部能正常闭合
 */
const CHINESE_SYLLABLES = {
  // Open syllables ending in vowels (maximum energy for highly visible movement)
  'a': { viseme: 'A', energy: 0.85, width: 0.85, height: 0.85, duration: 120 },
  'e': { viseme: 'E', energy: 0.72, width: 0.75, height: 0.65, duration: 120 },
  'i': { viseme: 'I', energy: 0.70, width: 0.80, height: 0.55, duration: 120 },
  'o': { viseme: 'O', energy: 0.78, width: 0.70, height: 0.78, duration: 120 },
  'u': { viseme: 'U', energy: 0.75, width: 0.60, height: 0.72, duration: 120 },
  'ü': { viseme: 'U', energy: 0.75, width: 0.60, height: 0.72, duration: 120 },
  
  // Consonant + vowel combinations (maximum articulation visibility)
  'ba': { viseme: 'A', energy: 0.78, width: 0.80, height: 0.78, duration: 140 },
  'pa': { viseme: 'A', energy: 0.76, width: 0.78, height: 0.76, duration: 140 },
  'ma': { viseme: 'A', energy: 0.80, width: 0.82, height: 0.80, duration: 140 },
  'fa': { viseme: 'A', energy: 0.72, width: 0.75, height: 0.72, duration: 140 },
  
  'bo': { viseme: 'O', energy: 0.48, width: 0.45, height: 0.50, duration: 140 },
  'po': { viseme: 'O', energy: 0.46, width: 0.43, height: 0.48, duration: 140 },
  'mo': { viseme: 'O', energy: 0.50, width: 0.47, height: 0.52, duration: 140 },
  
  'bi': { viseme: 'I', energy: 0.42, width: 0.55, height: 0.28, duration: 140 },
  'pi': { viseme: 'I', energy: 0.40, width: 0.53, height: 0.26, duration: 140 },
  'mi': { viseme: 'I', energy: 0.44, width: 0.57, height: 0.30, duration: 140 },
  
  'bu': { viseme: 'U', energy: 0.45, width: 0.35, height: 0.45, duration: 140 },
  'pu': { viseme: 'U', energy: 0.43, width: 0.33, height: 0.43, duration: 140 },
  'mu': { viseme: 'U', energy: 0.47, width: 0.37, height: 0.47, duration: 140 },
  'fu': { viseme: 'U', energy: 0.40, width: 0.30, height: 0.40, duration: 140 },
  
  'da': { viseme: 'A', energy: 0.50, width: 0.60, height: 0.55, duration: 140 },
  'ta': { viseme: 'A', energy: 0.48, width: 0.58, height: 0.53, duration: 140 },
  'na': { viseme: 'A', energy: 0.50, width: 0.60, height: 0.55, duration: 140 },
  'la': { viseme: 'A', energy: 0.45, width: 0.55, height: 0.50, duration: 140 },
  
  'di': { viseme: 'I', energy: 0.42, width: 0.55, height: 0.28, duration: 140 },
  'ti': { viseme: 'I', energy: 0.40, width: 0.53, height: 0.26, duration: 140 },
  'ni': { viseme: 'I', energy: 0.42, width: 0.55, height: 0.28, duration: 140 },
  'li': { viseme: 'I', energy: 0.38, width: 0.50, height: 0.24, duration: 140 },
  
  'du': { viseme: 'U', energy: 0.45, width: 0.35, height: 0.45, duration: 140 },
  'tu': { viseme: 'U', energy: 0.43, width: 0.33, height: 0.43, duration: 140 },
  'nu': { viseme: 'U', energy: 0.70, width: 0.40, height: 0.60, duration: 140 },
  'lu': { viseme: 'U', energy: 0.65, width: 0.35, height: 0.55, duration: 140 },
  
  'ga': { viseme: 'A', energy: 0.50, width: 0.60, height: 0.55, duration: 140 },
  'ka': { viseme: 'A', energy: 0.48, width: 0.58, height: 0.53, duration: 140 },
  'ha': { viseme: 'A', energy: 0.46, width: 0.56, height: 0.51, duration: 140 },
  
  'ge': { viseme: 'E', energy: 0.40, width: 0.50, height: 0.35, duration: 140 },
  'ke': { viseme: 'E', energy: 0.38, width: 0.48, height: 0.33, duration: 140 },
  'he': { viseme: 'E', energy: 0.36, width: 0.46, height: 0.31, duration: 140 },
  
  'za': { viseme: 'A', energy: 0.45, width: 0.55, height: 0.50, duration: 140 },
  'ca': { viseme: 'A', energy: 0.43, width: 0.53, height: 0.48, duration: 140 },
  'sa': { viseme: 'A', energy: 0.42, width: 0.52, height: 0.47, duration: 140 },
  
  'zha': { viseme: 'A', energy: 0.45, width: 0.55, height: 0.50, duration: 140 },
  'cha': { viseme: 'A', energy: 0.43, width: 0.53, height: 0.48, duration: 140 },
  'sha': { viseme: 'A', energy: 0.42, width: 0.52, height: 0.47, duration: 140 },
  
  'ya': { viseme: 'A', energy: 0.46, width: 0.56, height: 0.51, duration: 140 },
  'wa': { viseme: 'A', energy: 0.48, width: 0.58, height: 0.53, duration: 140 },
  
  // Nasal finals (slightly reduced energy)
  'an': { viseme: 'A', energy: 0.48, width: 0.58, height: 0.52, duration: 150 },
  'en': { viseme: 'E', energy: 0.38, width: 0.45, height: 0.32, duration: 150 },
  'in': { viseme: 'I', energy: 0.38, width: 0.50, height: 0.24, duration: 150 },
  'un': { viseme: 'U', energy: 0.40, width: 0.32, height: 0.40, duration: 150 },
  
  'ang': { viseme: 'A', energy: 0.45, width: 0.55, height: 0.50, duration: 160 },
  'eng': { viseme: 'E', energy: 0.35, width: 0.42, height: 0.28, duration: 160 },
  'ing': { viseme: 'I', energy: 0.35, width: 0.48, height: 0.20, duration: 160 },
  'ong': { viseme: 'O', energy: 0.45, width: 0.42, height: 0.50, duration: 160 },
  
  // Retroflex finals
  'er': { viseme: 'E', energy: 0.40, width: 0.45, height: 0.32, duration: 140 },
  'ar': { viseme: 'A', energy: 0.48, width: 0.58, height: 0.52, duration: 140 },
  
  // Default fallbacks for common single initials/finals (reduced energy)
  'zh': { viseme: 'S', energy: 0.35, width: 0.45, height: 0.28, duration: 100 },
  'ch': { viseme: 'S', energy: 0.35, width: 0.45, height: 0.28, duration: 100 },
  'sh': { viseme: 'S', energy: 0.35, width: 0.45, height: 0.28, duration: 100 },
  'r': { viseme: 'R', energy: 0.35, width: 0.45, height: 0.40, duration: 100 },
  'z': { viseme: 'S', energy: 0.32, width: 0.45, height: 0.25, duration: 100 },
  'c': { viseme: 'S', energy: 0.32, width: 0.45, height: 0.25, duration: 100 },
  's': { viseme: 'S', energy: 0.32, width: 0.45, height: 0.25, duration: 100 },
  'x': { viseme: 'S', energy: 0.32, width: 0.45, height: 0.25, duration: 100 },
  'j': { viseme: 'I', energy: 0.40, width: 0.55, height: 0.28, duration: 100 },
  'q': { viseme: 'I', energy: 0.40, width: 0.55, height: 0.28, duration: 100 },
};

/**
 * Simple character-to-phoneme approximation for English and Chinese
 * This is a simplified version - for production use a proper G2P library
 */
function charToPhoneme(char, prevChar = '', nextChar = '') {
  if (!char || /\s/.test(char)) return 'SIL';
  
  const lower = char.toLowerCase();
  
  // Consonants
  if (/[pb]/.test(lower)) return lower === 'p' ? 'P' : 'B';
  if (/m/.test(lower)) return 'M';
  if (/[fv]/.test(lower)) return lower === 'f' ? 'F' : 'V';
  if (/w/.test(lower)) return 'W';
  if (/y/.test(lower)) return 'Y';
  if (/l/.test(lower)) return 'L';
  if (/r/.test(lower)) return 'R';
  if (/[sz]/.test(lower)) return lower === 's' ? 'S' : 'Z';
  if (/[td]/.test(lower)) return lower === 't' ? 'T' : 'D';
  if (/n/.test(lower)) return 'N';
  if (/[kg]/.test(lower)) return lower === 'k' ? 'K' : 'G';
  
  // Vowels - context-aware
  if (/a/i.test(lower)) {
    if (/[iu]/.test(nextChar)) return 'EY'; // ai, au
    return 'AA';
  }
  if (/e/i.test(lower)) {
    if (/[iy]/.test(nextChar)) return 'EY'; // ei
    return 'EH';
  }
  if (/i/i.test(lower)) return 'IY';
  if (/o/i.test(lower)) {
    if (/u/.test(nextChar)) return 'OW'; // ou
    return 'OW';
  }
  if (/u/i.test(lower)) return 'UW';
  
  // Chinese pinyin vowels
  if (/ā|á|ǎ|à/.test(char)) return 'AA';
  if (/ē|é|ě|è/.test(char)) return 'EH';
  if (/ī|í|ǐ|ì/.test(char)) return 'IY';
  if (/ō|ó|ǒ|ò/.test(char)) return 'OW';
  if (/ū|ú|ǔ|ù|ü/.test(char)) return 'UW';
  
  return 'AH'; // default schwa
}

/**
 * Convert phoneme to viseme with coarticulation effects
 * Coarticulation: phonemes influence each other in continuous speech
 */
function phonemeToViseme(phoneme, prevPhoneme = null, nextPhoneme = null) {
  const base = PHONEME_VISEMES[phoneme] || PHONEME_VISEMES['AH'];
  let result = { ...base };
  
  // Coarticulation: blend with adjacent phonemes
  if (prevPhoneme && PHONEME_VISEMES[prevPhoneme]) {
    const prev = PHONEME_VISEMES[prevPhoneme];
    // Smooth transition from previous shape (20% influence)
    result.energy = result.energy * 0.8 + prev.energy * 0.2;
    result.width = result.width * 0.8 + prev.width * 0.2;
    result.height = result.height * 0.8 + prev.height * 0.2;
  }
  
  if (nextPhoneme && PHONEME_VISEMES[nextPhoneme]) {
    const next = PHONEME_VISEMES[nextPhoneme];
    // Anticipate next shape (10% influence)
    result.energy = result.energy * 0.9 + next.energy * 0.1;
    result.width = result.width * 0.9 + next.width * 0.1;
    result.height = result.height * 0.9 + next.height * 0.1;
  }
  
  return result;
}

/**
 * Character to Viseme mapping with Chinese pinyin support
 * Optimized for both English and Chinese lip sync
 */
function charToViseme(char = '', prevChar = '', nextChar = '') {
  if (!char || /\s/.test(char)) {
    return {
      viseme: 'M',
      energy: 0.0,
      width: 0.3,
      height: 0.1
    };
  }
  
  // Check if character is Chinese
  const isChinese = /[\u4e00-\u9fff]/.test(char);
  
  if (isChinese) {
    // For Chinese characters, try to use stroke patterns and common finals
    // Chinese characters often contain radicals that suggest phonetic content
    
    // Map common radical patterns to viseme characteristics
    const charCode = char.charCodeAt(0);
    const charStr = char.toString();
    
    // Use character code hash to determine base viseme characteristics
    // This is a fallback when we don't have exact pinyin
    const hash = charCode % 100;
    
    // Default to an average Chinese speech pattern
    let result = {
      viseme: 'A',
      energy: 0.65,
      width: 0.55,
      height: 0.55,
      duration: 120
    };
    
    // Common Chinese final patterns based on radical analysis
    // These are heuristic - ideally would use actual pinyin data
    if (/[口]/.test(char) || hash < 20) {
      // Radicals related to mouth -> open vowels
      result = { viseme: 'A', energy: 0.78, width: 0.85, height: 0.78, duration: 120 };
    } else if (/[舌]/.test(char) || (hash >= 20 && hash < 40)) {
      // Radicals related to tongue -> mid vowels
      result = { viseme: 'E', energy: 0.68, width: 0.75, height: 0.60, duration: 120 };
    } else if (/[目]/.test(char) || (hash >= 40 && hash < 60)) {
      // Eye radical -> high vowels (smaller mouth)
      result = { viseme: 'I', energy: 0.65, width: 0.80, height: 0.52, duration: 120 };
    } else if (/[刀]/.test(char) || (hash >= 60 && hash < 80)) {
      // Knife radical -> fricatives (less mouth opening)
      result = { viseme: 'S', energy: 0.55, width: 0.65, height: 0.45, duration: 120 };
    } else {
      // Default balanced vowel-like sound
      result = { viseme: 'A', energy: 0.70, width: 0.75, height: 0.68, duration: 120 };
    }
    
    return {
      viseme: result.viseme,
      energy: result.energy,
      width: result.width,
      height: result.height
    };
  } else {
    // English character processing - use existing phoneme system
    const phoneme = charToPhoneme(char, prevChar, nextChar);
    const phonemeResult = phonemeToViseme(phoneme);
    return {
      viseme: phonemeResult.viseme,
      energy: phonemeResult.energy,
      width: phonemeResult.width,
      height: phonemeResult.height
    };
  }
}

export class SpeechSynthesizer {
  constructor(options = {}) {
    this.engine = options.engine || 'web-speech';
    this.language = options.language || 'auto'; // 'auto', 'en', 'zh'
    this.voiceId = options.voiceId || 'default';
    this.apiKey = options.apiKey || '';
    this.onViseme = options.onViseme || null;
    this.onSpeechStart = options.onSpeechStart || null;
    this.onSpeechEnd = options.onSpeechEnd || null;
    this.isPlaying = false;
    this.pendingVisemeTimers = [];
    this.currentText = ''; // Store text for boundary event reference
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

  /**
   * Schedule visemes based on text timing (fallback for when boundary events don't fire)
   * This creates a simple lip sync animation by scheduling character-based visemes
   */
  scheduleVisemesFromText(text, startTime = Date.now()) {
    if (!this.onViseme) return;
    
    // Detect if text contains Chinese characters
    const isChinese = /[\u4e00-\u9fff]/.test(text);
    
    // 根据语速调整时间（rate=0.8 意味着更慢，需要更长的时间）
    // Chinese syllables are longer (each character = one syllable)
    // English words have multiple phonemes per character
    const baseCharDuration = isChinese ? 150 : 85; // 提高基础时长以匹配实际语速
    const rate = 0.8; // 与 synthesizeWebSpeech 中的 rate 保持一致
    const avgCharDuration = baseCharDuration / rate; // 慢速时每字符时间更长
    
    let cumulativeDelay = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      
      // Skip whitespace and punctuation
      if (/[\s\p{P}]/u.test(char)) {
        cumulativeDelay += avgCharDuration * 0.3; // 标点符号也需要短暂停顿
        continue;
      }
      
      const { viseme, energy, width, height } = charToViseme(char);
      
      const delayMs = cumulativeDelay;
      cumulativeDelay += avgCharDuration;
      
      const timer = setTimeout(() => {
        if (this.onViseme) {
          this.onViseme({ viseme, energy, width, height });
          console.log(`[Text-Scheduled] char="${char}" at delay=${delayMs.toFixed(0)}ms, viseme=${viseme}, energy=${energy.toFixed(2)}`);
        }
      }, delayMs);
      
      this.pendingVisemeTimers.push(timer);
    }
    
    console.log(`[Scheduled] ${text.length} characters, isChinese=${isChinese}, avgDuration=${avgCharDuration.toFixed(0)}ms, totalTime=${cumulativeDelay.toFixed(0)}ms`);
  }

  scheduleViseme(viseme, energy, delayMs = 0) {
    if (!this.onViseme) return;
    const timer = setTimeout(() => {
      this.onViseme && this.onViseme({ viseme, energy });
    }, delayMs);
    this.pendingVisemeTimers.push(timer);
  }

  /**
   * Store full text for boundary event matching
   */
  setCurrentText(text) {
    this.currentText = text;
  }

  /**
   * Handle boundary event from Web Speech API - real-time lip sync
   * Called when speech engine reaches character boundaries
   * Enhanced with phoneme detection and coarticulation
   */
  handleSpeechBoundary(event) {
    if (!this.onViseme || !this.currentText) return;
    
    const charIndex = event.charIndex || 0;
    const charLength = event.charLength || 1;
    
    // Get the character(s) at this boundary with context
    const char = this.currentText.charAt(charIndex);
    if (!char) return;
    
    // Skip whitespace
    if (/\s/.test(char)) return;
    
    const prevChar = charIndex > 0 ? this.currentText.charAt(charIndex - 1) : '';
    const nextChar = charIndex < this.currentText.length - 1 ? this.currentText.charAt(charIndex + 1) : '';
    
    // 检测是否为中文字符
    const isChinese = /[\u4e00-\u9fff]/.test(char);
    
    let visemeResult;
    
    if (isChinese) {
      // 中文：直接使用 charToViseme
      visemeResult = charToViseme(char, prevChar, nextChar);
    } else {
      // 英文：使用音素系统
      const phoneme = charToPhoneme(char, prevChar, nextChar);
      const prevPhoneme = prevChar ? charToPhoneme(prevChar) : null;
      const nextPhoneme = nextChar ? charToPhoneme(nextChar) : null;
      visemeResult = phonemeToViseme(phoneme, prevPhoneme, nextPhoneme);
    }
    
    // Emit viseme with enhanced parameters
    this.onViseme({
      viseme: visemeResult.viseme,
      energy: visemeResult.energy,
      width: visemeResult.width,
      height: visemeResult.height
    });
    
    console.log(`[Boundary] idx=${charIndex} char="${char}" ${isChinese ? 'CN' : 'EN'} viseme=${visemeResult.viseme}, energy=${visemeResult.energy.toFixed(2)}`);
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
        utterance.rate = 0.8;      // 慢速：0.8倍速度
        utterance.pitch = 0.6;     // 低沉：0.6音高
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        console.log('[Voice Selection] Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        let selectedVoice = null;
        
        // 根据用户设置或自动检测语言
        let isChinesePreferred = false;
        
        if (this.language === 'zh') {
          isChinesePreferred = true;
        } else if (this.language === 'en') {
          isChinesePreferred = false;
        } else {
          // auto: 自动检测文本语言
          const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
          const hasEnglishChars = /[a-zA-Z]/.test(text);
          isChinesePreferred = hasChineseChars && (text.replace(/[^\u4e00-\u9fff]/g, '').length > text.length * 0.3);
        }

        if (isChinesePreferred) {
          // 优先选择普通话（Mandarin）中文男声 - 强制排除方言
          utterance.lang = 'zh-CN';
          
          // 过滤器：排除已知的方言和女声
          const filterChinese = (v) => {
            if (!v.lang || !v.lang.includes('zh')) return false;
            
            const name = v.name || '';
            const lang = v.lang || '';
            
            // 排除女声
            if (name.includes('Female') || name.includes('woman') || name.includes('female')) return false;
            
            // 排除已知的非普通话方言
            if (name.includes('Cantonese') || name.includes('cantonese') ||
                name.includes('粤语') || name.includes('Yue') ||
                name.includes('Wu') || name.includes('吴') ||
                name.includes('Min') || name.includes('闽') ||
                name.includes('Hakka') || name.includes('客家') ||
                name.includes('Northeast') || name.includes('东北')) {
              return false;
            }
            
            return true;
          };
          
          // 首先尝试找到明确标记为普通话或 Mandarin 的男声
          selectedVoice = voices.find(v => 
            filterChinese(v) && (
              v.name.includes('Mandarin') || 
              v.name.includes('mandarin') ||
              v.name.includes('普通话') ||
              v.lang === 'zh-CN'
            ) && 
            (v.name.includes('Male') || v.name.includes('man'))
          );
          
          console.log('[Voice Debug] After Mandarin filter:', selectedVoice?.name);
          
          // 如果找不到，尝试找到任何 zh-CN 的男声（排除方言）
          if (!selectedVoice) {
            selectedVoice = voices.find(v => 
              filterChinese(v) && 
              v.lang === 'zh-CN' && 
              (v.name.includes('Male') || v.name.includes('man'))
            );
            console.log('[Voice Debug] After zh-CN male filter:', selectedVoice?.name);
          }
          
          // 尝试找到 Google 或 Microsoft 的中文男声
          if (!selectedVoice) {
            selectedVoice = voices.find(v => 
              filterChinese(v) && (
                v.name.includes('Google') || v.name.includes('Microsoft')
              ) && 
              (v.name.includes('Male') || v.name.includes('man'))
            );
            console.log('[Voice Debug] After Google/Microsoft filter:', selectedVoice?.name);
          }
          
          // 任何符合条件的中文男声
          if (!selectedVoice) {
            selectedVoice = voices.find(v => 
              filterChinese(v) && 
              (v.name.includes('Male') || v.name.includes('man'))
            );
            console.log('[Voice Debug] After any male filter:', selectedVoice?.name);
          }

          // 最后的回退方案：任何符合条件的中文声音
          if (!selectedVoice) {
            selectedVoice = voices.find(filterChinese);
            console.log('[Voice Debug] After fallback filter:', selectedVoice?.name);
          }
        } else {
          // 选择英文男声
          utterance.lang = 'en-US';
          selectedVoice = voices.find(v => 
            v.name && (
              (v.name.includes('Google') || v.name.includes('Microsoft')) && 
              v.lang.includes('en') && 
              (v.name.includes('Male') || v.name.includes('man') || v.name.includes('David') || v.name.includes('Mark'))
            )
          );

          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes('en') && (!v.name || !v.name.includes('Female')));
          }

          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes('en'));
          }
        }

        // Fallback to any available voice
        if (!selectedVoice && voices.length > 0) {
          selectedVoice = voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('[Voice Selected]', selectedVoice.name, selectedVoice.lang);
        } else {
          console.warn('[Voice Warning] No suitable voice found, using system default');
        }

        let startTime = Date.now();

        utterance.onstart = () => {
          startTime = Date.now();
          this.clearVisemeTimers();
          this.setCurrentText(text);
          
          // Fallback: Schedule visemes based on text in case boundary events don't fire
          this.scheduleVisemesFromText(text, startTime);
          
          if (this.onSpeechStart) {
            this.onSpeechStart();
          }
        };

        // Boundary event: triggered for each character during speech
        utterance.onboundary = (event) => {
          this.handleSpeechBoundary(event);
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
        
        // 移动端关键：给cancel一些时间完成，然后再speak
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
          this.isPlaying = true;
        }, 100);
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
