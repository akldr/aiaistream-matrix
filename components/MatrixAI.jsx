import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Sparkles, RotateCcw, Download, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp } from "lucide-react";
import TTSCharacterPanel from "./TTSCharacterPanel";

// 轻量 UI 组件（纯 JSX，无 TS 类型）
const Button = (props) => {
  const { children, variant = "primary", size = "default", onClick, disabled, style = {}, className = "", ...rest } = props || {};
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10,
    fontSize: size === 'sm' ? 12 : size === 'icon' ? 12 : 13, fontWeight: 600,
    padding: size === 'sm' ? '8px 12px' : size === 'icon' ? '8px' : '10px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    border: '1px solid rgba(255,255,255,0.10)', transition: 'transform 0.08s ease, background 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
  };
  const palette = {
    primary: { background: '#e5e7eb', color: '#0a0a0a' },
    secondary: { background: 'rgba(28,28,32,0.9)', color: '#e5e7eb' },
    ghost: { background: 'rgba(255,255,255,0.04)', color: '#d1d5db' },
    outline: { background: 'transparent', color: '#e5e7eb' },
  };
  const composed = { ...base, ...(palette[variant] || palette.primary), ...style };
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const hoverStyle = hover ? { boxShadow: '0 4px 14px rgba(0,0,0,0.35)' } : {};
  const activeStyle = active ? { transform: 'translateY(1px)' } : {};
  return (
    <button
      type="button"
      style={{ ...composed, ...hoverStyle, ...activeStyle }}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >{children}</button>
  );
};

const Slider = (props) => {
  const { value, min, max, step, onChange, className = "", style = {} } = props || {};
  const safeValue = Number.isFinite(value) ? value : 0;
  return (<input type="range" min={min} max={max} step={step} value={safeValue} onChange={(e) => onChange && onChange(parseFloat(e.target.value))} className={className} style={{ width:'100%', height: 18, ...style }} />);
};

const Input = (props) => { const { className = "", style = {}, ...rest } = props || {}; return (<input className={className} style={{ height: 32, width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(9,9,11,0.9)', color: '#e5e7eb', padding: '6px 10px', fontSize: 12, ...style }} {...rest} />); };
const Card = (props) => { const { className = "", style = {}, children } = props || {}; return (<div className={className} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(12,12,16,0.92)', color: '#e5e7eb', boxShadow: '0 10px 28px rgba(0,0,0,0.40)', ...style }}>{children}</div>); };
const CardHeader = (props) => { const { className = "", style = {}, children } = props || {}; return (<div className={className} style={{ display:'flex', flexDirection:'column', gap:8, padding:18, borderBottom: '1px solid rgba(255,255,255,0.10)', position:'sticky', top:0, background: 'rgba(22,22,26,0.55)', backdropFilter:'blur(8px)', zIndex: 10, borderTopLeftRadius: 14, borderTopRightRadius: 14, ...style }}>{children}</div>); };
const CardTitle = (props) => { const { className = "", style = {}, children } = props || {}; return (<h3 className={className} style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, display:'flex', alignItems:'center', gap:8, color:'#e6fff5', ...style }}>{children}</h3>); };
const CardContent = (props) => { const { className = "", style = {}, children } = props || {}; return (<div className={className} style={{ padding:20, paddingTop:16, ...style }}>{children}</div>); };

function isVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /\.mp4(\?.*)?$/i.test(url.trim());
}

// 抽出独立 Panel 组件
const Panel = (props) => {
  const { running, setRunning, onReset, onDownload, uiState, updateConfig, depthPreview, depthInfo, collapsed, setCollapsed, isTtsDepthActive, onDepthCanvasReady } = props;
  
  // 安全的折叠切换，防止影响TTS播放
  const handleToggleCollapse = useCallback((shouldCollapse) => {
    // 只改变UI状态，不影响TTS引擎
    setCollapsed(shouldCollapse);
  }, [setCollapsed]);
  
  // Check if current selection is TTS
  const isTtsSelected = uiState.depthUrl === 'tts-live-face';
  
  return (
    <div style={{ 
      position:'absolute', 
      top: 'clamp(10px, 2vh, 20px)', 
      right: 'clamp(10px, 2vw, 20px)', 
      bottom: 'clamp(10px, 2vh, 20px)', 
      zIndex:20, 
      display:'flex', 
      flexDirection:'column', 
      alignItems:'flex-end', 
      pointerEvents:'none',
      maxWidth: 'calc(100vw - 20px)'
    }}>
      <div style={{ pointerEvents:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10, maxHeight:'100%' }}>
        {/* 折叠按钮 - 仅在折叠时显示 */}
        {collapsed && (
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={() => handleToggleCollapse(false)}
            style={{ 
              touchAction: 'manipulation',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* Card - 始终存在，用 visibility 控制显示 */}
        <Card style={{ 
          width: collapsed ? 0 : 'min(max(320px, 30vw), 480px)', 
          maxWidth: collapsed ? 0 : 'calc(100vw - 20px)',
          maxHeight: collapsed ? 0 : 'calc(100vh - 20px)',
          overflowY: collapsed ? 'hidden' : 'auto',
          opacity: collapsed ? 0 : 1,
          visibility: collapsed ? 'hidden' : 'visible',
          transition: 'opacity 0.2s ease, width 0.2s ease',
          display:'flex', 
          flexDirection:'column',
          WebkitOverflowScrolling: 'touch',
          pointerEvents: collapsed ? 'none' : 'auto'
        }}>
            <CardHeader style={{ flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <CardTitle>
                  <Sparkles className="h-4 w-4" style={{ color:'#34d399' }} /> Matrix with Depth
                </CardTitle>
                <div style={{ display:'flex', gap:8 }}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleToggleCollapse(true)}
                    style={{ 
                      touchAction: 'manipulation',
                      minWidth: '44px',
                      minHeight: '44px'
                    }}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* API key input removed */}
              <div style={{ display:'flex', gap:10, marginTop:10 }}>
                <Button variant="secondary" size="sm" style={{ flex:1 }} onClick={() => setRunning((r) => !r)}>
                  {running ? (<><Pause className="mr-2 h-3 w-3" /> Pause</>) : (<><Play className="mr-2 h-3 w-3" /> Play</>)}
                </Button>
                <Button variant="secondary" size="sm" style={{ flex:1 }} onClick={onReset}>
                  <RotateCcw className="mr-2 h-3 w-3" /> Reset
                </Button>
                <Button variant="secondary" size="icon" onClick={onDownload}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display:'grid', gap:14 }}>
                <LabeledSlider label="Fall Speed" value={uiState.speed} onChange={(v) => updateConfig("speed", v)} min={0.5} max={8} step={0.1} />
                <LabeledSlider label="Density" value={uiState.density} onChange={(v) => updateConfig("density", v)} min={0.3} max={1.8} step={0.05} />
                <LabeledSlider label="Trail Length" value={uiState.trail} onChange={(v) => updateConfig("trail", v)} min={0} max={1.5} step={0.05} />
                <LabeledSlider label="Trail Persist" value={uiState.persistence} onChange={(v) => updateConfig("persistence", v)} min={0} max={1} step={0.01} />
                <LabeledSlider label="Glyph Cycle" value={uiState.glyphSpeed} onChange={(v) => updateConfig("glyphSpeed", v)} min={0.1} max={1.5} step={0.05} />
                <LabeledSlider label="Font Size" value={uiState.fontSize} onChange={(v) => updateConfig("fontSize", v)} min={10} max={26} step={1} />
                <LabeledSlider label="Glow" value={uiState.glow} onChange={(v) => updateConfig("glow", v)} min={0} max={0.5} step={0.01} />
                <LabeledSlider label="Color Hue" value={uiState.colorHue} onChange={(v) => updateConfig("colorHue", v)} min={0} max={360} step={1} />
                <LabeledSlider label="Depth Strength" value={uiState.depthInfluence} onChange={(v) => updateConfig("depthInfluence", v)} min={0} max={1.5} step={0.05} />
                
                <div style={{ display:'grid', gap:10, marginTop:4 }}>
                  <label style={{ fontSize:12, color:'#cbd5e1', fontWeight:600 }}>Depth Map</label>
                  <select
                    style={{ height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(24,24,27,0.6)', color:'#e5e7eb', fontSize:12, padding:'6px 10px' }}
                    value={uiState.depthUrl}
                    onChange={e => updateConfig("depthUrl", e.target.value)}
                  >
                    <option value="tts-live-face">TTS语音实时面部动画</option>
                    <option value="/depth-map-video.mp4">默认（视频）</option>
                    <option value="/depth-default.png">默认（图片）</option>
                    <option value="/depth-map-01.png">图片 01</option>
                    <option value="/depth-map-02.png">图片 02</option>
                    <option value="/depth-map-03.png">图片 03</option>
                    <option value="/depth-map-04.png">图片 04</option>
                    <option value="/depth-map-05.png">图片 05</option>
                  </select>
                  
                  {isTtsSelected ? (
                    // TTS控制面板
                    <div style={{ display:'grid', gap:12, marginTop:8 }}>
                      {/* 引擎选择 */}
                      <div style={{ display:'grid', gap:8 }}>
                        <label style={{ fontSize:12, color:'#cbd5e1', fontWeight:600 }}>TTS 引擎</label>
                        <select
                          value={props.ttsEngine}
                          onChange={(e) => props.onTtsEngineChange(e.target.value)}
                          style={{ height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(24,24,27,0.6)', color:'#e5e7eb', fontSize:12, padding:'6px 10px' }}
                        >
                          <option value="web-speech">Web Speech API (免费，内置)</option>
                          <option value="elevenlabs">ElevenLabs (高质，需API密钥)</option>
                        </select>
                      </div>
                      
                      {/* API密钥输入 (ElevenLabs) */}
                      {props.ttsEngine === 'elevenlabs' && (
                        <div style={{ display:'grid', gap:8 }}>
                          <label style={{ fontSize:12, color:'#cbd5e1', fontWeight:600 }}>ElevenLabs API 密钥</label>
                          <Input
                            type="password"
                            value={props.ttsApiKey}
                            onChange={(e) => props.onTtsApiKeyChange(e.target.value)}
                            placeholder="sk_..."
                            style={{ background:'rgba(24,24,27,0.6)', width:'94%' }}
                          />
                        </div>
                      )}
                      
                      {/* 语言选择 */}
                      <div style={{ display:'grid', gap:8 }}>
                        <label style={{ fontSize:12, color:'#cbd5e1', fontWeight:600 }}>语言 / Language</label>
                        <select
                          value={props.ttsLanguage}
                          onChange={(e) => props.onTtsLanguageChange(e.target.value)}
                          style={{ height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(24,24,27,0.6)', color:'#e5e7eb', fontSize:12, padding:'6px 10px', cursor:'pointer' }}
                        >
                          <option value="auto">自动检测 / Auto-detect</option>
                          <option value="en">English (英文)</option>
                          <option value="zh">中文 (Chinese)</option>
                        </select>
                      </div>
                      
                      {/* TTS预览 - 显示底部实例的canvas */}
                      <div style={{ display:'grid', gap:8 }}>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:0.6, fontWeight:700, color:'#90909b' }}>
                          面部动画预览
                        </div>
                        {props.ttsPreviewCanvasRef?.current ? (
                          <div style={{ position:'relative', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, overflow:'hidden', background:'rgba(6,6,8,0.5)', width:'100%', height:'140px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <canvas
                              ref={(el) => {
                                if (el && props.ttsPreviewCanvasRef?.current) {
                                  // Mirror the source canvas
                                  el.width = props.ttsPreviewCanvasRef.current.width;
                                  el.height = props.ttsPreviewCanvasRef.current.height;
                                  // Set up animation loop to copy canvas content
                                  const animate = () => {
                                    if (el && props.ttsPreviewCanvasRef?.current) {
                                      const ctx = el.getContext('2d');
                                      if (ctx) {
                                        ctx.clearRect(0, 0, el.width, el.height);
                                        ctx.drawImage(props.ttsPreviewCanvasRef.current, 0, 0);
                                      }
                                      requestAnimationFrame(animate);
                                    }
                                  };
                                  animate();
                                }
                              }}
                              style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }}
                            />
                          </div>
                        ) : (
                          <div style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic', padding:12, border:'1px dashed rgba(255,255,255,0.14)', borderRadius:10 }}>
                            等待TTS初始化...
                          </div>
                        )}
                      </div>
                      
                      {/* 调试信息 */}
                      <div style={{
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(24,24,27,0.6)',
                        fontSize: 11,
                        color: '#a0a0a8',
                        fontFamily: 'monospace'
                      }}>
                        <div>Viseme: <span style={{ color: '#3b82f6' }}>{props.ttsDebugInfo?.viseme || '-'}</span></div>
                        <div>Mouth: <span style={{ color: '#10b981' }}>{props.ttsDebugInfo?.mouthOpenness || '-'}</span></div>
                      </div>
                    </div>
                  ) : (
                    // 传统 Depth Map 控制
                    <>
                      <Input 
                        placeholder="Paste Image URL..." 
                        value={uiState.depthUrl} 
                        onChange={(e) => updateConfig("depthUrl", e.target.value)} 
                        style={{ background:'rgba(24,24,27,0.6)', width:'94%'}} 
                      />
                      <div style={{ display:'grid', gap:8 }}>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:0.6, fontWeight:700, color:'#90909b' }}>
                          Preview {depthInfo ? `— ${depthInfo}` : ""}
                        </div>
                        {depthPreview ? (
                          <div style={{ position:'relative', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, overflow:'hidden', background:'rgba(6,6,8,0.5)', width:'100%', height:'140px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {isVideoUrl(depthPreview) ? (
                              <video
                                src={depthPreview}
                                muted
                                loop
                                autoPlay
                                playsInline
                                style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }}
                              />
                            ) : (
                              <img src={depthPreview} alt="depth preview" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }} />
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize:12, color:'#9ca3af', fontStyle:'italic', padding:12, border:'1px dashed rgba(255,255,255,0.14)', borderRadius:10 }}>
                            No active depth map
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

// Core constants
const DEFAULT_GLYPHS = "舍利子色不异空即是受想行识亦复如是诸法相生灭垢淨增减故中无眼耳鼻舌身意声香味触法界乃至明尽老死苦集道智得以菩提萨埵依般若波罗蜜多心罣碍有恐怖远离颠倒梦想究竟涅槃三世诸佛得阿耨多罗三藐大知神咒明上等能除一切真实虚说曰揭谛波罗僧萨婆诃";
const DEFAULT_DEPTH_URL = "tts-live-face";
const MAX_SEGMENTS = 3;

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
const DEPTH_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) { const x = i / 255; const shifted = (x - 0.5) * 1.6; let y = clamp(0.5 + shifted, 0, 1); if (y >= 0.5) { y = 0.5 + Math.pow(y - 0.5, 0.7); } else { y = 0.5 - Math.pow(0.5 - y, 0.7); } DEPTH_LUT[i] = clamp(y, 0, 1); }
function hash32(a) { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function fitCanvas(canvas, aspect = 1) { 
  const ratio = Math.min(window.devicePixelRatio || 1, 2); 
  const parent = canvas.parentElement; 
  if (!parent) return; 
  const bounds = parent.getBoundingClientRect(); 
  const W = Math.max(1, Math.floor(bounds.width)); 
  const H = Math.max(1, Math.floor(bounds.height));
  
  // Always fill the entire viewport (no aspect ratio constraint)
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

function hueToRGB(h) {
  const H = ((h % 360) + 360) % 360;
  const C = 1;
  const X = 1 - Math.abs(((H / 60) % 2) - 1);
  let r=0,g=0,b=0;
  if (H < 60) { r=1; g=X; b=0; }
  else if (H < 120) { r=X; g=1; b=0; }
  else if (H < 180) { r=0; g=1; b=X; }
  else if (H < 240) { r=0; g=X; b=1; }
  else if (H < 300) { r=X; g=0; b=1; }
  else { r=1; g=0; b=X; }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

function LabeledSlider({ label, value, onChange, min, max, step }) {
  const display = Number.isFinite(value) ? (Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(0)) : String(value);
  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-zinc-300 flex items-baseline justify-between">
        <span>{label}</span>
        <span className="font-mono text-zinc-100 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{display}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} className="w-full" />
    </div>
  );
}

function extractGlyphTextFromGemini(data) {
  if (!data) return null;
  const candidates = data.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const parts = candidates[0] && candidates[0].content && candidates[0].content.parts;
    if (Array.isArray(parts) && parts.length > 0) {
      const joined = parts.map((p) => (typeof (p && p.text) === "string" ? p.text : "")).join(" ").trim();
      if (joined) return joined;
    }
  }
  const direct = data.output_text || data.text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return null;
}

const DEFAULT_CONFIG = { speed: 10, density: 1.8, fontSize: 12, glow: 0, trail: 1.2, persistence: 0, glyphSpeed: 0.1, depthInfluence: 0.6, glyphs: DEFAULT_GLYPHS, depthUrl: DEFAULT_DEPTH_URL, colorHue: Math.random() * 360 };

export default function MatrixAI() {
  const canvasRef = useRef(null);
  // API key logic removed

  const [running, setRunning] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [depthPreview, setDepthPreview] = useState(null);
  const [depthInfo, setDepthInfo] = useState(null);
  const ttsDepthCanvasRef = useRef(null);
  const isTtsDepthActiveRef = useRef(false);
  const [isTtsDepthActive, setIsTtsDepthActive] = useState(false);
  const configRef = useRef({ ...DEFAULT_CONFIG });
  const [uiState, setUiState] = useState({ ...DEFAULT_CONFIG });
  const updateConfig = (key, value) => { const next = { ...configRef.current, [key]: value }; configRef.current = next; setUiState(next); };

  // TTS state for main panel controls
  const [ttsEngine, setTtsEngine] = useState('web-speech');
  const [ttsLanguage, setTtsLanguage] = useState('auto');
  const [ttsApiKey, setTtsApiKey] = useState('');
  const [ttsDebugInfo, setTtsDebugInfo] = useState({ viseme: '-', mouthOpenness: '-' });
  const ttsPreviewCanvasRef = useRef(null); // Reference to TTS canvas for main panel preview

  // 移除 AI 生成区域（按需求暂不显示）

  const depthImageEl = useRef(null);
  const depthLumaRef = useRef(null);
  const depthDimsRef = useRef({ w: 0, h: 0 });
  const depthAspectRef = useRef(1); // Track source aspect ratio to avoid stretching
  const depthVideoEl = useRef(null);
  const depthOffscreenRef = useRef(null);
  const handleDepthCanvasReady = useCallback((canvas) => {
    ttsDepthCanvasRef.current = canvas;
    if (canvas) {
      isTtsDepthActiveRef.current = true;
      setIsTtsDepthActive(true);
      const cw = canvas.width || canvas.clientWidth || 0;
      const ch = canvas.height || canvas.clientHeight || 0;
      if (cw && ch) {
        depthAspectRef.current = cw / ch;
        const c = canvasRef.current;
        if (c) fitCanvas(c, depthAspectRef.current);
      }
      setDepthInfo(`${cw}×${ch} (TTS canvas)`);
      setDepthPreview(null);
    } else {
      isTtsDepthActiveRef.current = false;
      setIsTtsDepthActive(false);
      depthLumaRef.current = null;
      setDepthInfo(null);
      setDepthPreview(null);
    }
  }, []);

  const colCountRef = useRef(0);
  const segHeadsRef = useRef(null);
  const segSpeedRef = useRef(null);
  const segCountRef = useRef(null);
  const colSeedRef = useRef(null);

  const lastTimeRef = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  const tickRef = useRef(0);
  const fpsRef = useRef(0);
  const fpsCountRef = useRef(0);
  const fpsStartRef = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  const lastVideoSampleRef = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  const lastCanvasSampleRef = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  const [fps, setFps] = useState(0);

  const ensureOffscreen = useCallback((w, h) => {
    let off = depthOffscreenRef.current;
    if (!off) { off = document.createElement("canvas"); depthOffscreenRef.current = off; }
    if (off.width !== w || off.height !== h) { off.width = w; off.height = h; }
    return off;
  }, []);

  const resampleFromImage = useCallback(() => {
    const canvas = canvasRef.current; const img = depthImageEl.current; if (!canvas || !img) { depthLumaRef.current = null; return; }
    depthAspectRef.current = img.naturalWidth && img.naturalHeight ? (img.naturalWidth / img.naturalHeight) : 1;
    fitCanvas(canvas, depthAspectRef.current);
    const cw = canvas.clientWidth; const ch = canvas.clientHeight; if (!cw || !ch) return;
    const off = ensureOffscreen(cw, ch); const g = off.getContext("2d", { willReadFrequently: true }); if (!g) return;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = Math.floor(img.naturalWidth * scale); const dh = Math.floor(img.naturalHeight * scale);
    const ox = Math.floor((cw - dw) / 2); const oy = Math.floor((ch - dh) / 2);
    g.fillStyle = "#000"; g.fillRect(0, 0, cw, ch); g.drawImage(img, ox, oy, dw, dh);
    try { const imageData = g.getImageData(0, 0, cw, ch); const data = imageData.data; const luma = new Uint8Array(cw * ch); for (let i = 0; i < cw * ch; i++) { const r = data[i * 4]; const gVal = data[i * 4 + 1]; const b = data[i * 4 + 2]; luma[i] = (0.299 * r + 0.587 * gVal + 0.114 * b) | 0; } depthLumaRef.current = luma; depthDimsRef.current = { w: cw, h: ch }; } catch (e) { console.warn("depth resample failed", e); depthLumaRef.current = null; }
  }, [ensureOffscreen]);

  const resampleFromVideo = useCallback(() => {
    const canvas = canvasRef.current; const video = depthVideoEl.current; if (!canvas || !video) return;
    if (video.readyState < 2) return; // not enough data
    depthAspectRef.current = video.videoWidth && video.videoHeight ? (video.videoWidth / video.videoHeight) : depthAspectRef.current;
    fitCanvas(canvas, depthAspectRef.current);
    const cw = canvas.clientWidth; const ch = canvas.clientHeight; if (!cw || !ch) return;
    const off = ensureOffscreen(cw, ch); const g = off.getContext("2d", { willReadFrequently: true }); if (!g) return;
    const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
    const dw = Math.floor(video.videoWidth * scale); const dh = Math.floor(video.videoHeight * scale);
    const ox = Math.floor((cw - dw) / 2); const oy = Math.floor((ch - dh) / 2);
    g.fillStyle = "#000"; g.fillRect(0, 0, cw, ch); g.drawImage(video, ox, oy, dw, dh);
    try { const imageData = g.getImageData(0, 0, cw, ch); const data = imageData.data; const luma = new Uint8Array(cw * ch); for (let i = 0; i < cw * ch; i++) { const r = data[i * 4]; const gVal = data[i * 4 + 1]; const b = data[i * 4 + 2]; luma[i] = (0.299 * r + 0.587 * gVal + 0.114 * b) | 0; } depthLumaRef.current = luma; depthDimsRef.current = { w: cw, h: ch }; } catch (e) { console.warn("depth video resample failed", e); depthLumaRef.current = null; }
  }, [ensureOffscreen]);

  const resampleFromCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const sourceCanvas = ttsDepthCanvasRef.current;
    if (!canvas || !sourceCanvas) return;
    
    const sw = sourceCanvas.width || sourceCanvas.clientWidth || 0;
    const sh = sourceCanvas.height || sourceCanvas.clientHeight || 0;
    if (sw && sh) {
      depthAspectRef.current = sw / sh;
      fitCanvas(canvas, depthAspectRef.current);
    }
    
    // Depth map size: 90% of canvas, top-aligned, centered
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    
    const depthMapHeight = Math.floor(ch * 0.9);
    const depthMapWidth = Math.floor(depthMapHeight * (sw / sh));
    const offsetX = Math.floor((cw - depthMapWidth) / 2);
    const offsetY = 0; // top-aligned
    
    const off = ensureOffscreen(cw, ch);
    const g = off.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    
    g.fillStyle = '#000';
    g.fillRect(0, 0, cw, ch);
    g.drawImage(sourceCanvas, offsetX, offsetY, depthMapWidth, depthMapHeight);
    
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
      // Canvas resample failed - continue with default depth
      depthLumaRef.current = null;
    }
  }, [ensureOffscreen]);

  const getDepthValue = (x, y) => { const luma = depthLumaRef.current; if (!luma) return 0.5; const dims = depthDimsRef.current || { w: 0, h: 0 }; const w = dims.w || 0; const h = dims.h || 0; if (!w || !h) return 0.5; const ix = x | 0; const iy = y | 0; if (ix < 0 || ix >= w || iy < 0 || iy >= h) return 0.5; const idx = iy * w + ix; const v = luma[idx]; return DEPTH_LUT[v]; };

  const glyphAt = (col, row, t, glyphSet, colSeed) => { if (!glyphSet || !glyphSet.length) return " "; const baseT = t * 11.3 + col * 0.73 + row * 0.37; const tInt = baseT | 0; const seed = (col * 73856093) ^ ((row | 0) * 19349663) ^ ((tInt * 2654435761) | 0) ^ (colSeed | 0); const r = hash32(seed); const idx = (r * glyphSet.length) | 0; return glyphSet[idx % glyphSet.length]; };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.clientWidth; const H = canvas.clientHeight;
    const cfg = configRef.current; const speed = cfg.speed; const density = cfg.density; const fontSize = cfg.fontSize; const glow = cfg.glow; const trail = cfg.trail; const persistence = cfg.persistence; const depthInfluence = cfg.depthInfluence; const glyphs = cfg.glyphs;

    const colsNeeded = Math.max(1, Math.floor(W / Math.max(8, fontSize)));
    if (colCountRef.current !== colsNeeded || !segHeadsRef.current || !segSpeedRef.current || !segCountRef.current || !colSeedRef.current) {
      colCountRef.current = colsNeeded; const newSegHeads = []; const newSegSpeeds = []; for (let s = 0; s < MAX_SEGMENTS; s++) { newSegHeads[s] = new Float32Array(colsNeeded); newSegSpeeds[s] = new Float32Array(colsNeeded); }
      const segCount = new Uint8Array(colsNeeded); const seeds = new Uint32Array(colsNeeded); const charsPerScreenInit = H / fontSize;
      let colDepthScores = null; let depthCutoff = 0;
      if (depthLumaRef.current) { colDepthScores = new Float32Array(colsNeeded); const midY = H * 0.5; for (let i = 0; i < colsNeeded; i++) { const x = i * fontSize + fontSize * 0.5; colDepthScores[i] = getDepthValue(x, midY); } const sorted = Array.from(colDepthScores).sort((a, b) => b - a); const idxCut = Math.max(0, Math.min(sorted.length - 1, Math.floor(colsNeeded * 0.3))); depthCutoff = sorted[idxCut] ?? 0; }
      for (let i = 0; i < colsNeeded; i++) { let count = 2; if (colDepthScores && depthCutoff > 0 && colDepthScores[i] >= depthCutoff) { count = 3; } segCount[i] = count; seeds[i] = (Math.random() * 0xffffffff) >>> 0; for (let s = 0; s < MAX_SEGMENTS; s++) { if (s < count) { const basePhase = count > 1 ? s / (count - 1) : 0; const phase = basePhase * 1.3 + Math.random() * 0.25; newSegHeads[s][i] = -phase * charsPerScreenInit; newSegSpeeds[s][i] = 0.7 + Math.random() * 0.6; } else { newSegHeads[s][i] = -9999; newSegSpeeds[s][i] = 0; } } }
      segHeadsRef.current = newSegHeads; segSpeedRef.current = newSegSpeeds; segCountRef.current = segCount; colSeedRef.current = seeds;
    }

    const cols = colCountRef.current; const segHeads = segHeadsRef.current; const segSpeeds = segSpeedRef.current; const segCount = segCountRef.current; const colSeed = colSeedRef.current;
    const trailNorm = clamp(trail, 0, 1); const persistNorm = clamp(persistence, 0, 1);
    const bgAlphaBase = 0.32 - 0.26 * persistNorm; // higher persistence => smaller clear alpha
    const bgAlpha = clamp(bgAlphaBase, 0.04, 0.34);
    ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
    const skipEvery = Math.max(1, Math.round(2.2 - Math.min(2, density))); const glowClamped = clamp(glow, 0, 0.5); const charsPerScreen = H / fontSize;
    const minFactor = 0.25; const maxFactor = 1.6; const factor = minFactor + (maxFactor - minFactor) * trailNorm; let baseTailLen = Math.round(charsPerScreen * (factor + persistNorm * 0.45)); if (!Number.isFinite(baseTailLen) || baseTailLen < 2) baseTailLen = 2;
    const shadowColorHead = `rgba(180,255,220,${glowClamped})`; const shadowColorTail = `rgba(0,255,140,${glowClamped * 0.6})`; const shadowBlurHead = 7 * glowClamped; const shadowBlurTail = 4 * glowClamped; const hasGlow = glowClamped > 0.01;

    const renderSegment = (colIndex, segIndex, headRow, segCountForCol) => {
      const baseX = colIndex * fontSize; const k = Math.max(1, segCountForCol); const effectiveTail = Math.max(2, Math.round(baseTailLen / Math.sqrt(k)));
      const drawTailFactor = segIndex === 0 ? 0.5 : 0.35; const drawTailLen = Math.max(2, Math.round(effectiveTail * drawTailFactor));
      const headY = headRow * fontSize; const dHead = getDepthValue(baseX, headY); const nearHead = dHead * 2 - 1; const baseSize = clamp(fontSize * (1 + depthInfluence * nearHead * 0.25), 8, fontSize * 1.8);
      const [baseR, baseG, baseB] = hueToRGB(configRef.current.colorHue || 140);
      for (let j = 0; j < drawTailLen; j++) {
        const rowPos = headRow - j;
        const yChar = rowPos * fontSize;
        // 允许尾部完全延伸到底部边缘和上方，不提前裁剪
        if (yChar < -fontSize || yChar > H + fontSize * 2) continue;
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
          if (hasGlow && isPrimarySegment) { ctx.shadowColor = shadowColorHead; ctx.shadowBlur = shadowBlurHead; }
          else if (hasGlow) { ctx.shadowColor = shadowColorTail; ctx.shadowBlur = shadowBlurTail * 0.8; }
          else { ctx.shadowBlur = 0; }
          const headAlpha = isPrimarySegment ? alphaHead : alphaHead * 0.6;
          // Keep leading (head) glyph pure white, unaffected by hue
          ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
        } else {
          const fadeK = (1.1 + (1 - trailNorm) * 1.6) * (0.55 + 0.75 * (1 - persistNorm));
          const brightness = Math.exp(-fadeK * tTail);
          const alphaTail = clamp(0.04 + 0.2 * trailNorm + 0.8 * brightness * (0.4 + 0.6 * depthBoost), 0.06, isPrimarySegment ? 0.97 : 0.6);
          if (hasGlow && isPrimarySegment) { ctx.shadowColor = shadowColorTail; ctx.shadowBlur = shadowBlurTail; }
          else if (hasGlow) { ctx.shadowColor = shadowColorTail; ctx.shadowBlur = shadowBlurTail * 0.6; }
          else { ctx.shadowBlur = 0; }
          const tailScale = 0.35 + 0.65 * brightness;
          const tailR = Math.round(baseR * tailScale);
          const tailG = Math.round(baseG * tailScale);
          const tailB = Math.round(baseB * tailScale * (0.85 + 0.15 * depthBoost));
            ctx.fillStyle = `rgba(${tailR},${tailG},${tailB},${alphaTail})`;
        }
        const char = glyphAt(colIndex, rowIndex, tickRef.current, glyphs, colSeed[colIndex] || 0);
        ctx.fillText(char, baseX | 0, yChar | 0);
      }
      const fallDepth = dHead; const fallNorm = clamp(fallDepth, 0, 1); const fallMul = 0.6 + 1.2 * (1 - fallNorm); const segSpeedMul = segSpeeds[segIndex][colIndex] || 1; const step = speed * fallMul * segSpeedMul * 0.12; let newHeadRow = headRow + step; if (headY > H + fontSize * 4) { const effTail = Math.max(2, Math.round(baseTailLen / Math.sqrt(Math.max(1, segCountForCol)))); newHeadRow = -effTail - Math.random() * charsPerScreen * 0.5; segSpeeds[segIndex][colIndex] = 0.7 + Math.random() * 0.6; if (segIndex === 0) { colSeed[colIndex] = (Math.random() * 0xffffffff) >>> 0; } }
      return newHeadRow;
    };

    for (let i = 0; i < cols; i++) {
      if (i % skipEvery !== 0) continue; const countForCol = segCount[i] || 0; if (!countForCol) continue;
      for (let s = 0; s < countForCol && s < MAX_SEGMENTS; s++) { const headRow = segHeads[s][i]; const newHeadRow = renderSegment(i, s, headRow, countForCol); segHeads[s][i] = newHeadRow; }
    }
  }, []);

  // 生成逻辑已移除

  useEffect(() => {
    // 检查是否选择了 TTS 模式
    const isTtsMode = uiState.depthUrl === 'tts-live-face';
    
    if (isTtsMode) {
      // TTS 模式：清理图片/视频资源，等待 TTS canvas 回调
      depthImageEl.current = null;
      depthVideoEl.current = null;
      // 如果还没有 TTS canvas，暂时清空 depth data
      if (!isTtsDepthActiveRef.current) {
        depthLumaRef.current = null;
        setDepthPreview(null);
        setDepthInfo('Waiting for TTS...');
      }
      return () => {};
    }
    
    // 非 TTS 模式：清理 TTS 资源，加载图片/视频
    if (isTtsDepthActiveRef.current) {
      isTtsDepthActiveRef.current = false;
      setIsTtsDepthActive(false);
      ttsDepthCanvasRef.current = null;
    }
    
    let cancelled = false; 
    const url = uiState.depthUrl; 
    if (!url) return;
    
    if (isVideoUrl(url)) {
      depthImageEl.current = null;
      const vid = document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.referrerPolicy = "no-referrer";
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      const handleReady = () => {
        if (cancelled) return;
        depthVideoEl.current = vid;
        setDepthPreview(url);
        setDepthInfo(`${vid.videoWidth}×${vid.videoHeight} (video)`);
        resampleFromVideo();
      };
      const handleError = () => {
        if (cancelled) return;
        depthVideoEl.current = null;
        depthLumaRef.current = null;
        setDepthPreview(null);
        setDepthInfo("Video load failed");
      };
      vid.addEventListener("loadeddata", handleReady);
      vid.addEventListener("error", handleError);
      vid.src = url;
      vid.play().catch(() => {});
      return () => {
        cancelled = true;
        vid.pause();
        vid.removeEventListener("loadeddata", handleReady);
        vid.removeEventListener("error", handleError);
        vid.removeAttribute("src");
        vid.load();
      };
    }
    depthVideoEl.current = null;
    const tryLoad = (src, tried = []) => {
      const img = new Image(); img.crossOrigin = "anonymous"; img.referrerPolicy = "no-referrer";
      img.onload = () => { if (cancelled) return; depthImageEl.current = img; setDepthPreview(src); setDepthInfo(`${img.naturalWidth}×${img.naturalHeight}`); resampleFromImage(); };
      img.onerror = () => { if (cancelled) return; if (!tried.includes("weserv") && !src.startsWith("data:")) { const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(src)}`; tryLoad(proxied, [...tried, "weserv"]); return; } depthImageEl.current = null; depthLumaRef.current = null; setDepthPreview(null); setDepthInfo("Load failed"); };
      img.src = src;
    };
    tryLoad(url);
    return () => { cancelled = true; };
  }, [uiState.depthUrl, resampleFromImage, resampleFromVideo]);

  useEffect(() => {
    const onResize = () => {
      const c = canvasRef.current;
      if (!c) return;
      fitCanvas(c, depthAspectRef.current || 1);
      if (isTtsDepthActiveRef.current) {
        resampleFromCanvas();
      } else if (depthVideoEl.current) {
        resampleFromVideo();
      } else {
        resampleFromImage();
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resampleFromImage, resampleFromVideo, resampleFromCanvas]);

  useEffect(() => {
    let rafId = 0;
    const loop = () => {
      if (running) {
        const nowSample = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (isTtsDepthActiveRef.current) {
          if (nowSample - lastCanvasSampleRef.current >= 33) {
            resampleFromCanvas();
            lastCanvasSampleRef.current = nowSample;
          }
        } else if (depthVideoEl.current) {
          const nowSample = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (nowSample - lastVideoSampleRef.current >= 33) { // ~30fps sampling
            resampleFromVideo();
            lastVideoSampleRef.current = nowSample;
          }
        }
        draw();
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        fpsCountRef.current += 1;
        if (now - fpsStartRef.current >= 500) {
          const f = (fpsCountRef.current * 1000) / (now - fpsStartRef.current);
          fpsRef.current = f;
          setFps(Math.round(f));
          fpsCountRef.current = 0;
          fpsStartRef.current = now;
        }
      }
      tickRef.current += 1;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [running, draw, resampleFromCanvas, resampleFromVideo]);

  // No minimize state needed - always show compact version at bottom

  return (
    <div style={{ position:'relative', width:'100%', height:'100vh', background:'#0b0b0f', overflow:'hidden' }}>
      {/* Full-screen Matrix Canvas */}
      <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
      
      {/* FPS Counter */}
      <div style={{ position:'absolute', top:10, left:12, color:'#a7f3d0', fontSize:12, background:'rgba(6,6,8,0.5)', border:'1px solid rgba(255,255,255,0.10)', padding:'6px 8px', borderRadius:8, zIndex:5 }}>
        FPS: {fps}
      </div>
      
      {/* TTS Compact Panel - Always shown at bottom when TTS mode active */}
      {uiState.depthUrl === 'tts-live-face' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(810px, 81vw)',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          backdropFilter: 'blur(12px)',
          borderRadius: '14px 14px 0 0',
          border: '1px solid rgba(255,255,255,0.12)',
          borderBottom: 'none',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
          zIndex: 15,
          pointerEvents: 'auto'
        }}>
          <TTSCharacterPanel 
            onDepthCanvasReady={handleDepthCanvasReady} 
            isEmbedded={true}
            isCompact={true}
            ttsEngine={ttsEngine}
            ttsLanguage={ttsLanguage}
            apiKey={ttsApiKey}
            onEngineChange={setTtsEngine}
            onLanguageChange={setTtsLanguage}
            onApiKeyChange={setTtsApiKey}
            onCanvasRefReady={(canvasRef) => { ttsPreviewCanvasRef.current = canvasRef; }}
            onDebugInfoUpdate={setTtsDebugInfo}
          />
        </div>
      )}
      
      <Panel
        running={running}
        setRunning={setRunning}
        onReset={() => { configRef.current = { ...DEFAULT_CONFIG }; setUiState({ ...DEFAULT_CONFIG }); }}
        onDownload={() => { if (!canvasRef.current) return; const a = document.createElement('a'); a.href = canvasRef.current.toDataURL('image/png'); a.download = 'matrix_ai.png'; a.click(); }}
        uiState={uiState}
        updateConfig={updateConfig}
        depthPreview={depthPreview}
        depthInfo={depthInfo}
        isTtsDepthActive={isTtsDepthActive}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onDepthCanvasReady={handleDepthCanvasReady}
        ttsEngine={ttsEngine}
        ttsLanguage={ttsLanguage}
        ttsApiKey={ttsApiKey}
        onTtsEngineChange={setTtsEngine}
        onTtsLanguageChange={setTtsLanguage}
        onTtsApiKeyChange={setTtsApiKey}
        ttsPreviewCanvasRef={ttsPreviewCanvasRef}
        ttsDebugInfo={ttsDebugInfo}
      />
    </div>
  );
}
