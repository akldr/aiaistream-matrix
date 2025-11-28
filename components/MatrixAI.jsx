import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Sparkles,
  RotateCcw,
  Download,
  ChevronsLeft,
  ChevronsRight,
  Wand2,
  Type as TypeIcon,
  Image as ImageIcon,
  Loader2,
  Key,
} from "lucide-react";

// --- Lightweight UI primitives (no external UI lib) ---
// 为了避免某些运行环境对参数解构 + 默认值的兼容问题，统一改为在函数体内解构 props
const Button = (props) => {
  const {
    children,
    variant = "primary",
    size = "default",
    className = "",
    onClick,
    disabled,
    ...rest
  } = props || {};

  const baseStyle =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    secondary:
      "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-600/50 shadow-sm",
    ghost: "hover:bg-zinc-800/50 text-zinc-200 hover:text-white",
    outline:
      "border border-emerald-500/30 bg-transparent shadow-sm hover:bg-emerald-500/10 text-emerald-400",
  };

  const sizes = {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };

  return (
    <button
      type="button"
      className={`${baseStyle} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.default
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

// Slider: value is a plain number (fix: do NOT pass/expect arrays)
const Slider = (props) => {
  const { value, min, max, step, onChange, className = "" } = props || {};
  const safeValue = Number.isFinite(value) ? value : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={safeValue}
      onChange={(e) => onChange && onChange(parseFloat(e.target.value))}
      className={`w-full h-1.5 bg-zinc-700/50 rounded-full appearance-none cursor-pointer accent-emerald-400 ${className}`}
      style={{
        background: `linear-gradient(to right, rgb(16 185 129 / 0.7) 0%, rgb(16 185 129 / 0.7) ${((safeValue - min) / (max - min)) * 100}%, rgb(63 63 70 / 0.5) ${((safeValue - min) / (max - min)) * 100}%, rgb(63 63 70 / 0.5) 100%)`
      }}
    />
  );
};

const Input = (props) => {
  const { className = "", ...rest } = props || {};
  return (
    <input
      className={`flex h-9 w-full rounded-md border border-zinc-600/40 bg-zinc-800/50 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
};

const Card = (props) => {
  const { className = "", children } = props || {};
  return (
    <div
      className={`rounded-lg border border-zinc-700/50 bg-zinc-950/80 text-zinc-100 shadow-xl ${className}`}
    >
      {children}
    </div>
  );
};

const CardHeader = (props) => {
  const { className = "", children } = props || {};
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
};

const CardTitle = (props) => {
  const { className = "", children } = props || {};
  return (
    <h3 className={`font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = (props) => {
  const { className = "", children } = props || {};
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
};

// --- Core Logic ---

const DEFAULT_GLYPHS =
  "舍利子色不异空即是受想行识亦复如是诸法相生灭垢淨增减故中无眼耳鼻舌身意声香味触法界乃至明尽老死苦集道智得以菩提萨埵依般若波罗蜜多心罣碍有恐怖远离颠倒梦想究竟涅槃三世诸佛得阿耨多罗三藐大知神咒明上等能除一切真实虚说曰揭谛波罗僧萨婆诃";

// 默认 depth 图
const DEFAULT_DEPTH_URL = "/depth-default.png";

// 每列最大段数
const MAX_SEGMENTS = 3;

function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

// 预计算 depth 曲线 LUT（0-255 → 0-1）
const DEPTH_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const x = i / 255;
  const shifted = (x - 0.5) * 1.6;
  let y = clamp(0.5 + shifted, 0, 1);
  if (y >= 0.5) {
    y = 0.5 + Math.pow(y - 0.5, 0.7);
  } else {
    y = 0.5 - Math.pow(0.5 - y, 0.7);
  }
  DEPTH_LUT[i] = clamp(y, 0, 1);
}

// Fast random hash → [0,1)
function hash32(a) {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function fitCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const parent = canvas.parentElement;
  if (!parent) return;
  const bounds = parent.getBoundingClientRect();
  const W = Math.max(1, Math.floor(bounds.width));
  const H = Math.max(1, Math.floor(bounds.height));

  const targetW = Math.floor(W * ratio);
  const targetH = Math.floor(H * ratio);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}

function LabeledSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}) {
  const display = Number.isFinite(value)
    ? Math.abs(value) < 10
      ? value.toFixed(2)
      : value.toFixed(0)
    : String(value);

  return (
    <div className="w-full space-y-1.5">
      <div className="mb-1 text-xs font-medium text-zinc-300 flex items-baseline justify-between">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-100 text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          {display}
        </span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="w-full"
      />
    </div>
  );
}

// 从 Gemini 响应中提取字符集文本，容错多种结构
function extractGlyphTextFromGemini(data) {
  if (!data) return null;

  const candidates = data?.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const parts = candidates[0]?.content?.parts;
    if (Array.isArray(parts) && parts.length > 0) {
      const joined = parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join(" ")
        .trim();
      if (joined) return joined;
    }
  }

  const direct = data?.output_text || data?.text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  return null;
}

// 默认配置（用户指定）
const DEFAULT_CONFIG = {
  speed: 6,
  density: 1,
  fontSize: 16,
  glow: 0.1,
  trail: 1,
  glyphSpeed: 0.5,
  depthInfluence: 0.25,
  glyphs: DEFAULT_GLYPHS,
  depthUrl: DEFAULT_DEPTH_URL,
};

export default function MatrixAI() {
  const canvasRef = useRef(null);

  // --- API Key ---
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem("gemini_api_key");
        if (stored) setApiKey(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleKeySave = (val) => {
    setApiKey(val);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("gemini_api_key", val);
      }
    } catch {
      // ignore
    }
  };

  // --- UI 状态 ---
  const [running, setRunning] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [depthPreview, setDepthPreview] = useState(null);
  const [depthInfo, setDepthInfo] = useState(null);

  // 配置放 ref，避免每帧 re-render
  const configRef = useRef({ ...DEFAULT_CONFIG });
  const [uiState, setUiState] = useState({ ...DEFAULT_CONFIG });

  const updateConfig = (key, value) => {
    const next = { ...configRef.current, [key]: value };
    configRef.current = next;
    setUiState(next);
  };

  // --- AI 状态 ---
  const [aiPromptGlyph, setAiPromptGlyph] = useState("");
  const [aiPromptDepth, setAiPromptDepth] = useState("");
  const [isGeneratingGlyph, setIsGeneratingGlyph] = useState(false);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // --- Depth 数据 ---
  const depthImageEl = useRef(null);
  const depthLumaRef = useRef(null);
  const depthDimsRef = useRef({ w: 0, h: 0 });

  // 列与时间
  const colCountRef = useRef(0);
  const segHeadsRef = useRef(null); // [segment][col] → head row
  const segSpeedRef = useRef(null); // [segment][col] → per-segment speed mul
  const segCountRef = useRef(null); // 每列段数（2-3）
  const colSeedRef = useRef(null); // per-col glyph seed

  const lastTimeRef = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );
  const tickRef = useRef(0);

  // depth 重采样
  const rebuildDepthResample = useCallback(() => {
    const canvas = canvasRef.current;
    const img = depthImageEl.current;
    if (!canvas || !img) {
      depthLumaRef.current = null;
      return;
    }
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;

    const off = document.createElement("canvas");
    off.width = cw;
    off.height = ch;
    const g = off.getContext("2d", { willReadFrequently: true });
    if (!g) return;

    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = Math.floor(img.naturalWidth * scale);
    const dh = Math.floor(img.naturalHeight * scale);
    const ox = Math.floor((cw - dw) / 2);
    const oy = Math.floor((ch - dh) / 2);

    g.fillStyle = "#000";
    g.fillRect(0, 0, cw, ch);
    g.drawImage(img, ox, oy, dw, dh);

    try {
      const imageData = g.getImageData(0, 0, cw, ch);
      const data = imageData.data;
      const luma = new Uint8Array(cw * ch);
      for (let i = 0; i < cw * ch; i++) {
        const r = data[i * 4];
        const gVal = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        luma[i] = (0.299 * r + 0.587 * gVal + 0.114 * b) | 0;
      }
      depthLumaRef.current = luma;
      depthDimsRef.current = { w: cw, h: ch };
    } catch (e) {
      console.warn("depth resample failed", e);
      depthLumaRef.current = null;
    }
  }, []);

  const getDepthValue = (x, y) => {
    const luma = depthLumaRef.current;
    if (!luma) return 0.5;
    const dims = depthDimsRef.current || { w: 0, h: 0 };
    const w = dims.w || 0;
    const h = dims.h || 0;
    if (!w || !h) return 0.5;
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= w || iy < 0 || iy >= h) return 0.5;
    const idx = iy * w + ix;
    const v = luma[idx];
    return DEPTH_LUT[v];
  };

  // glyph 生成
  const glyphAt = (
    col,
    row,
    t,
    glyphSet,
    colSeed,
  ) => {
    if (!glyphSet || !glyphSet.length) return " ";
    const baseT = t * 11.3 + col * 0.73 + row * 0.37;
    const tInt = baseT | 0;
    const seed =
      (col * 73856093) ^
      ((row | 0) * 19349663) ^
      ((tInt * 2654435761) | 0) ^
      (colSeed | 0);
    const r = hash32(seed);
    const idx = (r * glyphSet.length) | 0;
    return glyphSet[idx % glyphSet.length];
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    const cfg = configRef.current;
    const speed = cfg.speed;
    const density = cfg.density;
    const fontSize = cfg.fontSize;
    const glow = cfg.glow;
    const trail = cfg.trail;
    const depthInfluence = cfg.depthInfluence;
    const glyphs = cfg.glyphs;

    const colsNeeded = Math.max(1, Math.floor(W / Math.max(8, fontSize)));
    if (
      colCountRef.current !== colsNeeded ||
      !segHeadsRef.current ||
      !segSpeedRef.current ||
      !segCountRef.current ||
      !colSeedRef.current
    ) {
      colCountRef.current = colsNeeded;

      const newSegHeads = [];
      const newSegSpeeds = [];
      for (let s = 0; s < MAX_SEGMENTS; s++) {
        newSegHeads[s] = new Float32Array(colsNeeded);
        newSegSpeeds[s] = new Float32Array(colsNeeded);
      }

      const segCount = new Uint8Array(colsNeeded);
      const seeds = new Uint32Array(colsNeeded);
      const charsPerScreenInit = H / fontSize;

      let colDepthScores = null;
      let depthCutoff = 0;

      if (depthLumaRef.current) {
        colDepthScores = new Float32Array(colsNeeded);
        const midY = H * 0.5;
        for (let i = 0; i < colsNeeded; i++) {
          const x = i * fontSize + fontSize * 0.5;
          colDepthScores[i] = getDepthValue(x, midY);
        }
        const sorted = Array.from(colDepthScores).sort((a, b) => b - a);
        const idxCut = Math.max(
          0,
          Math.min(sorted.length - 1, Math.floor(colsNeeded * 0.3)),
        );
        depthCutoff = sorted[idxCut] ?? 0;
      }

      for (let i = 0; i < colsNeeded; i++) {
        let count = 2;
        if (
          colDepthScores &&
          depthCutoff > 0 &&
          colDepthScores[i] >= depthCutoff
        ) {
          count = 3;
        }

        segCount[i] = count;
        seeds[i] = (Math.random() * 0xffffffff) >>> 0;

        for (let s = 0; s < MAX_SEGMENTS; s++) {
          if (s < count) {
            const basePhase = count > 1 ? s / (count - 1) : 0;
            const phase = basePhase * 1.3 + Math.random() * 0.25;
            newSegHeads[s][i] = -phase * charsPerScreenInit;
            newSegSpeeds[s][i] = 0.7 + Math.random() * 0.6;
          } else {
            newSegHeads[s][i] = -9999;
            newSegSpeeds[s][i] = 0;
          }
        }
      }

      segHeadsRef.current = newSegHeads;
      segSpeedRef.current = newSegSpeeds;
      segCountRef.current = segCount;
      colSeedRef.current = seeds;
    }

    const cols = colCountRef.current;
    const segHeads = segHeadsRef.current;
    const segSpeeds = segSpeedRef.current;
    const segCount = segCountRef.current;
    const colSeed = colSeedRef.current;

    const trailNorm = clamp(trail, 0, 1);
    const bgAlphaBase = 0.26 - 0.23 * trailNorm * trailNorm;
    const bgAlpha = clamp(bgAlphaBase, 0.04, 0.28);
    ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
    ctx.fillRect(0, 0, W, H);

    ctx.textBaseline = "top";

    const skipEvery = Math.max(1, Math.round(2.2 - Math.min(2, density)));
    const glowClamped = clamp(glow, 0, 0.5);
    const charsPerScreen = H / fontSize;

    const minFactor = 0.25;
    const maxFactor = 1.6;
    const factor = minFactor + (maxFactor - minFactor) * trailNorm;
    let baseTailLen = Math.round(charsPerScreen * factor);
    if (!Number.isFinite(baseTailLen) || baseTailLen < 2) baseTailLen = 2;

    const shadowColorHead = `rgba(180,255,220,${glowClamped})`;
    const shadowColorTail = `rgba(0,255,140,${glowClamped * 0.6})`;
    const shadowBlurHead = 7 * glowClamped;
    const shadowBlurTail = 4 * glowClamped;
    const hasGlow = glowClamped > 0.01;

    const renderSegment = (
      colIndex,
      segIndex,
      headRow,
      segCountForCol,
    ) => {
      const baseX = colIndex * fontSize;
      const k = Math.max(1, segCountForCol);
      const effectiveTail = Math.max(2, Math.round(baseTailLen / Math.sqrt(k)));

      const drawTailFactor = segIndex === 0 ? 0.5 : 0.35;
      const drawTailLen = Math.max(2, Math.round(effectiveTail * drawTailFactor));

      const headY = headRow * fontSize;
      const dHead = getDepthValue(baseX, headY);
      const nearHead = dHead * 2 - 1;
      const baseSize = clamp(
        fontSize * (1 + depthInfluence * nearHead * 0.25),
        8,
        fontSize * 1.8,
      );

      for (let j = 0; j < drawTailLen; j++) {
        const rowPos = headRow - j;
        const yChar = rowPos * fontSize;

        if (yChar < -fontSize * 2 || yChar > H + fontSize) continue;

        const rowIndex = rowPos | 0;
        const isHeadChar = j === 0;
        const tTail = effectiveTail > 1 ? j / (effectiveTail - 1) : 0;

        const dLocal = getDepthValue(baseX, yChar);
        const dBoostBase = clamp((dLocal - 0.35) * 2, 0, 1);
        const depthBoost = dBoostBase * dBoostBase;

        const localScale = 0.8 + depthBoost * depthInfluence * 1.1;
        const sizeLocal = (Math.max(8, baseSize * localScale) + 0.5) | 0;
        ctx.font = `${sizeLocal}px sans-serif`;

        const isPrimarySegment = segIndex === 0;

        if (isHeadChar) {
          const alphaHead = clamp(0.4 + 0.6 * depthBoost, 0.6, 1);
          if (hasGlow && isPrimarySegment) {
            ctx.shadowColor = shadowColorHead;
            ctx.shadowBlur = shadowBlurHead;
          } else if (hasGlow) {
            ctx.shadowColor = shadowColorTail;
            ctx.shadowBlur = shadowBlurTail * 0.8;
          } else {
            ctx.shadowBlur = 0;
          }
          const headAlpha = isPrimarySegment ? alphaHead : alphaHead * 0.6;
          ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
        } else {
          const fadeK = 1.4 + (1 - trailNorm) * 2.0;
          const brightness = Math.exp(-fadeK * tTail);

          const gBase = 90 + 160 * depthBoost;
          const gChan = clamp(gBase, 120, 255) | 0;
          const alphaTail = clamp(
            0.04 +
              0.2 * trailNorm +
              0.8 * brightness * (0.4 + 0.6 * depthBoost),
            0.06,
            isPrimarySegment ? 0.97 : 0.6,
          );

          if (hasGlow && isPrimarySegment) {
            ctx.shadowColor = shadowColorTail;
            ctx.shadowBlur = shadowBlurTail;
          } else if (hasGlow) {
            ctx.shadowColor = shadowColorTail;
            ctx.shadowBlur = shadowBlurTail * 0.6;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fillStyle = `rgba(0,${gChan},80,${alphaTail})`;
        }

        const char = glyphAt(
          colIndex,
          rowIndex,
          tickRef.current,
          glyphs,
          colSeed[colIndex] || 0,
        );
        ctx.fillText(char, baseX | 0, yChar | 0);
      }

      const fallDepth = dHead;
      const fallNorm = clamp(fallDepth, 0, 1);
      const fallMul = 0.6 + 1.2 * (1 - fallNorm);
      const segSpeedMul = segSpeeds[segIndex][colIndex] || 1;
      const step = speed * fallMul * segSpeedMul * 0.12;
      let newHeadRow = headRow + step;

      if (headY > H + fontSize * 4) {
        const effTail = Math.max(
          2,
          Math.round(
            baseTailLen / Math.sqrt(Math.max(1, segCountForCol)),
          ),
        );
        newHeadRow = -effTail - Math.random() * charsPerScreen * 0.5;
        segSpeeds[segIndex][colIndex] = 0.7 + Math.random() * 0.6;
        if (segIndex === 0) {
          colSeed[colIndex] = (Math.random() * 0xffffffff) >>> 0;
        }
      }

      return newHeadRow;
    };

    for (let i = 0; i < cols; i++) {
      if (i % skipEvery !== 0) continue;

      const countForCol = segCount[i] || 0;
      if (!countForCol) continue;

      for (let s = 0; s < countForCol && s < MAX_SEGMENTS; s++) {
        const headRow = segHeads[s][i];
        const newHeadRow = renderSegment(i, s, headRow, countForCol);
        segHeads[s][i] = newHeadRow;
      }
    }
  }, []);

  // --- AI 生成字符集 ---
  const handleGenerateGlyphs = async () => {
    if (!aiPromptGlyph.trim()) return;
    if (!apiKey) {
      setErrorMsg("Please enter an API Key first.");
      return;
    }
    setIsGeneratingGlyph(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Create a single string of about 60-100 unique characters representing the concept: "${aiPromptGlyph}". Return ONLY the raw string, no markdown, no explanation.`,
                  },
                ],
              },
            ],
          }),
        },
      );
      const data = await res.json();
      const raw = extractGlyphTextFromGemini(data);
      if (!raw) {
        console.warn("No glyph text in Gemini response", data);
        setErrorMsg(
          "No glyphs received from API. Try a different prompt or check quota.",
        );
        return;
      }
      const clean = raw.replace(/[`\n\r]/g, "").trim();
      if (!clean) {
        setErrorMsg(
          "API returned empty glyph string after cleaning. Try another prompt.",
        );
        return;
      }
      updateConfig("glyphs", clean);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to generate glyphs. Check API Key or quota.");
    } finally {
      setIsGeneratingGlyph(false);
    }
  };

  // --- AI 生成 depth map ---
  const handleGenerateDepth = async () => {
    if (!aiPromptDepth.trim()) return;
    if (!apiKey) {
      setErrorMsg("Please enter an API Key first.");
      return;
    }
    setIsGeneratingDepth(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [
              {
                prompt: `High contrast depth map grayscale of ${aiPromptDepth}, black background, white foreground.`,
              },
            ],
            parameters: { sampleCount: 1 },
          }),
        },
      );

      if (!res.ok) {
        console.error("Depth API error", res.status, await res.text());
        setErrorMsg(
          `Depth image API error (${res.status}). Check API key permissions.`,
        );
        return;
      }
      const data = await res.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
      if (typeof b64 === "string" && b64) {
        updateConfig("depthUrl", `data:image/png;base64,${b64}`);
      } else {
        console.warn("No image bytes in depth response", data);
        setErrorMsg(
          "No depth image received from API. Try another prompt or check quota.",
        );
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Image gen failed. Ensure your API Key has Imagen access.");
    } finally {
      setIsGeneratingDepth(false);
    }
  };

  // --- depth 图加载 ---
  useEffect(() => {
    let cancelled = false;
    const url = configRef.current.depthUrl;
    if (!url) return;

    const tryLoad = (src, tried = []) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        if (cancelled) return;
        depthImageEl.current = img;
        setDepthPreview(src);
        setDepthInfo(`${img.naturalWidth}×${img.naturalHeight}`);
        rebuildDepthResample();
      };
      img.onerror = () => {
        if (cancelled) return;
        if (!tried.includes("weserv") && !src.startsWith("data:")) {
          const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(
            src,
          )}`;
          tryLoad(proxied, [...tried, "weserv"]);
          return;
        }
        depthImageEl.current = null;
        depthLumaRef.current = null;
        setDepthPreview(null);
        setDepthInfo("Load failed");
      };
      img.src = src;
    };

    tryLoad(url);
    return () => {
      cancelled = true;
    };
  }, [uiState.depthUrl, rebuildDepthResample]);

  // Resize 监听
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = () => {
      fitCanvas(canvas);
      rebuildDepthResample();
    };

    handle();

    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(handle);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [rebuildDepthResample]);

  // 主循环
  useEffect(() => {
    let raf = null;

    const loop = () => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const dt = Math.min(0.1, Math.max(0, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      tickRef.current += dt * configRef.current.glyphSpeed;

      draw();
      if (running) raf = requestAnimationFrame(loop);
    };

    if (running) raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [running, draw]);

  // 轻量自检 + 针对 extractGlyphText 的简单测试
  useEffect(() => {
    try {
      console.assert(typeof Button === "function", "Button should be a function");
      console.assert(
        typeof clamp(0.5, 0, 1) === "number",
        "clamp should return number",
      );
      console.assert(
        typeof glyphAt(0, 0, 0, DEFAULT_GLYPHS, 123) === "string",
        "glyphAt should return char",
      );

      const mock1 = {
        candidates: [
          {
            content: { parts: [{ text: "ABC123" }] },
          },
        ],
      };
      console.assert(
        extractGlyphTextFromGemini(mock1) === "ABC123",
        "extractGlyphTextFromGemini basic parts/text",
      );

      const mock2 = { output_text: "XYZ" };
      console.assert(
        extractGlyphTextFromGemini(mock2) === "XYZ",
        "extractGlyphTextFromGemini output_text",
      );

      const mock3 = {};
      console.assert(
        extractGlyphTextFromGemini(mock3) === null,
        "extractGlyphTextFromGemini empty",
      );
    } catch (e) {
      console.warn("Self-test failed", e);
    }
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* 控制面板层 */}
      <div className="absolute top-4 right-4 bottom-4 z-20 flex flex-col items-end pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-end gap-2 h-full overflow-hidden">
          {collapsed && (
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-zinc-900/80 border border-zinc-700 backdrop-blur-md"
              onClick={() => setCollapsed(false)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          )}

          {!collapsed && (
            <Card className="flex flex-col bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 w-80 h-full shadow-2xl transition-all duration-300 overflow-hidden">
              <CardHeader className="pb-3 border-b border-zinc-700/30 sticky top-0 bg-zinc-900/70 backdrop-blur-sm z-10 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-zinc-100 font-bold">
                    <Sparkles className="h-4 w-4 text-emerald-400" /> Matrix AI Depth
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        !apiKey ? "text-amber-500 animate-pulse" : "text-zinc-400"
                      }`}
                      onClick={() => setShowKeyInput(!showKeyInput)}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                      onClick={() => setCollapsed(true)}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {showKeyInput && (
                  <div className="mt-3 p-2 bg-zinc-950/50 border border-zinc-800 rounded-md space-y-2">
                    <label className="text-xs text-zinc-400">Gemini API Key</label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => handleKeySave(e.target.value)}
                      placeholder="AI Studio Key..."
                      className="h-7 text-xs"
                    />
                    <div className="text-[10px] text-zinc-500">
                      Key is stored in browser localStorage.
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setRunning((r) => !r)}
                  >
                    {running ? (
                      <>
                        <Pause className="mr-2 h-3 w-3" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-3 w-3" /> Play
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      configRef.current = { ...DEFAULT_CONFIG };
                      setUiState({ ...DEFAULT_CONFIG });
                    }}
                  >
                    <RotateCcw className="mr-2 h-3 w-3" /> Reset
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (!canvasRef.current) return;
                      const a = document.createElement("a");
                      a.href = canvasRef.current.toDataURL("image/png");
                      a.download = "matrix_ai.png";
                      a.click();
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="overflow-y-auto space-y-5 pt-5 pr-3 pl-6 pb-6 custom-scrollbar flex-1">
                {/* AI Section */}
                <div className="space-y-4 border-b border-zinc-800 pb-4">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Wand2 className="w-3 h-3" /> AI Generator
                  </div>

                  {/* Glyph Generator */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                      <TypeIcon className="w-3 h-3" /> Generate Glyphs
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Theme: e.g., 'Cyberpunk Kanji'"
                        value={aiPromptGlyph}
                        onChange={(e) => setAiPromptGlyph(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleGenerateGlyphs}
                        disabled={isGeneratingGlyph || !aiPromptGlyph}
                        className="px-2 w-10 shrink-0"
                      >
                        {isGeneratingGlyph ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "✨"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Depth Map Generator */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Generate Depth Map
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Scene: e.g., 'Skull', 'Tree'"
                        value={aiPromptDepth}
                        onChange={(e) => setAiPromptDepth(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleGenerateDepth}
                        disabled={isGeneratingDepth || !aiPromptDepth}
                        className="px-2 w-10 shrink-0"
                      >
                        {isGeneratingDepth ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "✨"
                        )}
                      </Button>
                    </div>
                  </div>

                  {errorMsg ? (
                    <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                      {errorMsg}
                    </div>
                  ) : null}
                </div>

                <LabeledSlider
                  label="Fall Speed"
                  value={uiState.speed}
                  onChange={(v) => updateConfig("speed", v)}
                  min={0.5}
                  max={8}
                  step={0.1}
                />
                <LabeledSlider
                  label="Density"
                  value={uiState.density}
                  onChange={(v) => updateConfig("density", v)}
                  min={0.3}
                  max={1.8}
                  step={0.05}
                />
                <LabeledSlider
                  label="Trail Length"
                  value={uiState.trail}
                  onChange={(v) => updateConfig("trail", v)}
                  min={0}
                  max={1.5}
                  step={0.05}
                />
                <LabeledSlider
                  label="Glyph Cycle"
                  value={uiState.glyphSpeed}
                  onChange={(v) => updateConfig("glyphSpeed", v)}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                />
                <LabeledSlider
                  label="Font Size"
                  value={uiState.fontSize}
                  onChange={(v) => updateConfig("fontSize", v)}
                  min={10}
                  max={26}
                  step={1}
                />
                <LabeledSlider
                  label="Glow"
                  value={uiState.glow}
                  onChange={(v) => updateConfig("glow", v)}
                  min={0}
                  max={0.5}
                  step={0.01}
                />
                <LabeledSlider
                  label="Depth Strength"
                  value={uiState.depthInfluence}
                  onChange={(v) => updateConfig("depthInfluence", v)}
                  min={0}
                  max={1.5}
                  step={0.05}
                />

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="text-xs font-medium text-zinc-400">
                    Depth Map URL
                  </label>
                  <Input
                    placeholder="Paste Image URL..."
                    value={uiState.depthUrl}
                    onChange={(e) => updateConfig("depthUrl", e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-xs"
                  />
                  <div className="space-y-2 mt-2">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                      Preview {depthInfo ? `— ${depthInfo}` : ""}
                    </div>
                    {depthPreview ? (
                      <div className="relative rounded-md overflow-hidden border border-zinc-800 bg-zinc-950/50">
                        <img
                          src={depthPreview}
                          alt="depth preview"
                          className="w-full h-auto object-cover opacity-70"
                          style={{ maxHeight: 120 }}
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 italic p-2 border border-dashed border-zinc-800 rounded">
                        No active depth map
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
}
