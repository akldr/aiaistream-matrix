import React, { useEffect, useRef, useState } from "react";

const DEFAULT_GLYPHS = "舍利子色不异空即是受想行识亦复如是诸法相生灭垢淨增减故中无眼耳鼻舌身意声香味触法界乃至明尽老死苦集道智得以菩提萨埵依般若波罗蜜多心罣碍有恐怖远离颠倒梦想究竟涅槃三世诸佛得阿耨多罗三藐大知神咒明上等能除一切真实虚说曰揭谛波罗僧萨婆诃";
const DEFAULT_DEPTH_URL = "/depth-default.png";

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function hash32(a) {
  a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function fitCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const parent = canvas.parentElement;
  const bounds = parent.getBoundingClientRect();
  const W = Math.max(1, Math.floor(bounds.width));
  const H = Math.max(1, Math.floor(bounds.height));
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.floor(W * ratio);
  canvas.height = Math.floor(H * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export default function MatrixAI() {
  const canvasRef = useRef(null);

  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(2.6);
  const [density, setDensity] = useState(1.25);
  const [fontSize, setFontSize] = useState(16);
  const [glow, setGlow] = useState(0.5);
  const [trail, setTrail] = useState(0.8);
  const [glyphSpeed, setGlyphSpeed] = useState(0.6);
  const [depthUrl, setDepthUrl] = useState(DEFAULT_DEPTH_URL);
  const [depthInfluence, setDepthInfluence] = useState(0.9);

  const depthImageEl = useRef(null);
  const depthDataRef = useRef(null);
  const [depthPreview, setDepthPreview] = useState(null);
  const [depthInfo, setDepthInfo] = useState(null);

  const colCountRef = useRef(0);
  const colYRef = useRef(null);

  const lastTimeRef = useRef(performance.now());
  const tickRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = (url, tried = []) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        if (cancelled) return;
        depthImageEl.current = img;
        setDepthPreview(url);
        setDepthInfo(`${img.naturalWidth}×${img.naturalHeight}`);
        rebuildDepthResample();
      };
      img.onerror = () => {
        if (cancelled) return;
        if (!tried.includes("weserv")) {
          const p = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
          tryLoad(p, [...tried, "weserv"]);
          return;
        }
        if (!tried.includes("isogit")) {
          const p = `https://cors.isomorphic-git.org/${url}`;
          tryLoad(p, [...tried, "isogit"]);
          return;
        }
        depthImageEl.current = null; depthDataRef.current = null;
        setDepthPreview(null); setDepthInfo(null);
      };
      img.src = url;
    };
    const clean = depthUrl && depthUrl.trim();
    if (clean) tryLoad(clean);
    else { setDepthPreview(null); setDepthInfo(null); }
    return () => { cancelled = true; };
  }, [depthUrl]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const handle = () => {
      fitCanvas(canvas);
      rebuildDepthResample();
      const cols = Math.max(1, Math.floor(canvas.clientWidth / Math.max(8, fontSize)));
      colCountRef.current = cols;
      colYRef.current = new Float32Array(cols);
      for (let i = 0; i < cols; i++) colYRef.current[i] = Math.random() * (canvas.clientHeight / fontSize);
    };
    handle();
    const ro = new ResizeObserver(handle);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [fontSize]);

  useEffect(() => {
    let raf = null;
    const loop = () => {
      const now = performance.now();
      const dt = Math.max(0, now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      tickRef.current += dt * glyphSpeed;
      draw();
      if (running) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [running, speed, density, fontSize, glow, trail, glyphSpeed, depthInfluence]);

  function rebuildDepthResample() {
    const canvas = canvasRef.current; const img = depthImageEl.current; if (!canvas || !img) { depthDataRef.current = null; return; }
    const cw = canvas.clientWidth, ch = canvas.clientHeight; if (!cw || !ch) return;
    const off = document.createElement("canvas"); off.width = cw; off.height = ch; const g = off.getContext("2d");
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = Math.max(1, Math.floor(img.naturalWidth * scale));
    const dh = Math.max(1, Math.floor(img.naturalHeight * scale));
    const ox = Math.floor((cw - dw) / 2), oy = Math.floor((ch - dh) / 2);
    g.fillStyle = "#000"; g.fillRect(0,0,cw,ch);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, ox, oy, dw, dh);
    try { depthDataRef.current = g.getImageData(0, 0, cw, ch); } catch { depthDataRef.current = null; }
  }

  function sampleDepthNorm(x, y) {
    const d = depthDataRef.current; if (!d) return 0.5;
    const cw = d.width, ch = d.height;
    const ix = clamp(Math.floor(x), 0, cw - 1);
    const iy = clamp(Math.floor(y), 0, ch - 1);
    const idx = (iy * cw + ix) * 4;
    const r = d.data[idx], g = d.data[idx+1], b = d.data[idx+2];
    const ycc = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return ycc;
  }

  function glyphAt(col, row, t) {
    const seed = (col * 73856093) ^ (row * 19349663) ^ Math.floor(t * 2);
    const r = hash32(seed);
    const idx = Math.floor(r * DEFAULT_GLYPHS.length) % DEFAULT_GLYPHS.length;
    return DEFAULT_GLYPHS.charAt(idx);
  }

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const bgAlpha = Math.max(0.02, Math.min(0.24, 0.02 + (1 - trail) * 0.18));
    ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
    ctx.fillRect(0, 0, W, H);
    const cols = colCountRef.current; const colY = colYRef.current; if (!cols || !colY) return;
    ctx.textBaseline = "top";
    const skipEvery = Math.max(1, Math.round(2.2 - Math.min(2, density)));
    for (let i = 0; i < cols; i++) {
      if (i % skipEvery !== 0) continue;
      const baseX = i * fontSize;
      const yChar = colY[i] * fontSize;
      const d = sampleDepthNorm(baseX, yChar);
      const near = d * 2 - 1;
      const sizeMul = 1 + depthInfluence * near * 0.45;
      const sizeLocal = clamp(fontSize * sizeMul, 8, fontSize * 2.2);
      ctx.shadowColor = `rgba(0,255,140,${glow})`;
      ctx.shadowBlur = 6 * glow;
      const grad = ctx.createLinearGradient(baseX, yChar - sizeLocal * 1.6, baseX, yChar + sizeLocal);
      grad.addColorStop(0, `rgba(0,255,160,${0.08 + 0.18 * (d)})`);
      grad.addColorStop(1, `rgba(0,255,${Math.round(160 + 80 * d)},0.95)`);
      ctx.fillStyle = grad;
      const rowIndex = Math.floor(yChar / fontSize);
      const char = glyphAt(i, rowIndex, tickRef.current);
      const nextChar = glyphAt(i, rowIndex + 1, tickRef.current);
      ctx.font = `${Math.max(8, sizeLocal)}px sans-serif`;
      const frac = (yChar / fontSize) - rowIndex;
      ctx.globalAlpha = 1;
      ctx.fillText(char, baseX, yChar);
      if (nextChar !== char) {
        ctx.globalAlpha = 0.25 + 0.45 * frac;
        ctx.fillText(nextChar, baseX, yChar + fontSize * 0.9);
        ctx.globalAlpha = 1;
      }
      const fallMul = 1 + (1 - d) * 0.5;
      const step = speed * fallMul * 0.12;
      colY[i] += step;
      if (yChar > H + fontSize * 4) colY[i] = 0;
    }
  }

  useEffect(() => {
    try {
      console.assert(typeof DEFAULT_GLYPHS === 'string' && DEFAULT_GLYPHS.length > 0, 'glyph set non-empty');
      console.assert(typeof fontSize === 'number' && fontSize > 0, 'fontSize > 0');
      console.assert(typeof clamp(0.5, 0, 1) === 'number', 'clamp returns number');
      console.assert(typeof sampleDepthNorm(0, 0) === 'number', 'depth sampler returns number');
      console.assert(typeof DEFAULT_DEPTH_URL === 'string' && DEFAULT_DEPTH_URL.length > 0, 'depth url non-empty');
    } catch (e) { console.warn('Self-tests error', e); }
  }, []);

  return (
    <div style={{position:'relative', height:'80vh', width:'100%', overflow:'hidden', borderRadius:12, background:'#000'}}>
      <canvas ref={canvasRef} style={{position:'absolute', inset:0, display:'block'}} />
      <div style={{position:'absolute', top:16, right:16, width:380, zIndex:20}}>
        <div style={{background:'rgba(20,20,20,0.75)', padding:12, borderRadius:8, color:'#ddd', border:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{display:'flex', gap:8, marginBottom:8}}>
            <button onClick={() => setRunning(r => !r)} style={{padding:'6px 8px'}}> {running? 'Pause' : 'Play'} </button>
            <button onClick={() => setDepthUrl(DEFAULT_DEPTH_URL)} style={{padding:'6px 8px'}}>Reset Depth</button>
            <button onClick={() => { const a = document.createElement('a'); a.href = canvasRef.current.toDataURL('image/png'); a.download = 'matrix_ai.png'; a.click(); }} style={{padding:'6px 8px'}}>PNG</button>
          </div>
          <div style={{display:'grid', gap:8}}>
            <LabeledSlider label="Speed" value={speed} onChange={setSpeed} min={0.2} max={6} step={0.1} />
            <LabeledSlider label="Density" value={density} onChange={setDensity} min={0.2} max={1.8} step={0.01} />
            <LabeledSlider label="Trail" value={trail} onChange={setTrail} min={0} max={1} step={0.01} />
            <LabeledSlider label="Glyph change speed" value={glyphSpeed} onChange={setGlyphSpeed} min={0} max={2} step={0.01} />
            <LabeledSlider label="Font size" value={fontSize} onChange={setFontSize} min={10} max={30} step={1} />
            <LabeledSlider label="Glow" value={glow} onChange={setGlow} min={0} max={1} step={0.01} />
            <LabeledSlider label="Depth influence" value={depthInfluence} onChange={setDepthInfluence} min={0} max={1.5} step={0.01} />
            <div>
              <input type="text" placeholder="Depth Map URL" value={depthUrl} onChange={e=>setDepthUrl(e.target.value)} style={{width:'100%', padding:8, background:'#111', color:'#eee', border:'1px solid rgba(255,255,255,0.06)'}} />
              <div style={{fontSize:12, color:'#999', marginTop:6}}>Depth preview {depthInfo ? `(${depthInfo})` : ''}</div>
              {depthPreview ? <img src={depthPreview} alt="depth preview" style={{maxWidth:180, height:'auto', marginTop:6, borderRadius:6, border:'1px solid rgba(255,255,255,0.04)'}} /> : <div style={{fontSize:12, color:'#666', marginTop:6}}>No preview</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledSlider({ label, value, onChange, min, max, step }) {
  return (
    <div style={{width:'100%'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
        <span style={{fontSize:13, color:'#ddd'}}>{label}</span>
        <span style={{fontFamily:'monospace', color:'#ddd'}}>{Number.isFinite(value) ? (Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(0)) : String(value)}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))} style={{width:'100%'}} />
    </div>
  );
}
