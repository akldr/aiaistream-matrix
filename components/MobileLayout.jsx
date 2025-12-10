import React, { useCallback, useState } from "react";
import { Play, Pause, Sparkles, RotateCcw, Download, Github } from "lucide-react";

/**
 * 移动端/小屏幕布局
 */
export function MobileLayout({
  running,
  setRunning,
  onReset,
  onDownload,
  fps,
  canvasRef,
  uiState,
  updateConfig,
  depthPreview,
  depthInfo,
  isTtsDepthActive,
  onDepthCanvasReady,
  ttsEngine,
  ttsLanguage,
  ttsApiKey,
  onTtsEngineChange,
  onTtsLanguageChange,
  onTtsApiKeyChange,
  ttsPreviewCanvasRef,
  ttsDebugInfo,
  TTSCharacterPanel,
  logSocialMediaClick,
}) {
  const [showPanel, setShowPanel] = useState(false);

  // 轻量 UI 组件
  const Button = (props) => {
    const { children, variant = "primary", size = "default", onClick, disabled, style = {}, ...rest } = props || {};
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      fontSize: size === 'sm' ? 11 : size === 'icon' ? 11 : 12,
      fontWeight: 600,
      padding: size === 'sm' ? '6px 10px' : size === 'icon' ? '6px' : '8px 12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      border: '1px solid rgba(255,255,255,0.10)',
      transition: 'all 0.2s ease',
    };
    const palette = {
      primary: { background: '#e5e7eb', color: '#0a0a0a' },
      secondary: { background: 'rgba(28,28,32,0.9)', color: '#e5e7eb' },
      ghost: { background: 'rgba(255,255,255,0.04)', color: '#d1d5db' },
    };
    return (
      <button
        style={{ ...base, ...(palette[variant] || palette.primary), ...style }}
        onClick={onClick}
        disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    );
  };

  const Slider = (props) => {
    const { value, min, max, step, onChange } = props || {};
    const safeValue = Number.isFinite(value) ? value : 0;
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e) => onChange && onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 16 }}
      />
    );
  };

  const LabeledSlider = ({ label, value, onChange, min, max, step }) => {
    const display = Number.isFinite(value) ? (Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(0)) : String(value);
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <span style={{ color: '#e5e7eb' }}>{display}</span>
        </div>
        <Slider value={value} min={min} max={max} step={step} onChange={onChange} />
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      minHeight: '100vh', 
      background: '#0b0b0f', 
      display: 'flex', 
      flexDirection: 'column',
      paddingTop: '12px',
    }}>
      {/* FPS 显示 - 左上角 */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        color: '#a7f3d0',
        fontSize: 11,
        background: 'rgba(6,6,8,0.6)',
        border: '1px solid rgba(255,255,255,0.10)',
        padding: '4px 6px',
        borderRadius: 6,
        zIndex: 20,
      }}>
        FPS: {fps}
      </div>

      {/* 社交媒体链接 - 右上角 */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        display: 'flex',
        gap: 8,
        zIndex: 20,
      }}>
        <a
          href="#"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            logSocialMediaClick && logSocialMediaClick('Xiaohongshu').then(() => {
              window.open('https://xhslink.com/m/3AUUKqviKxa', '_blank');
            });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'rgba(6,6,8,0.6)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(236,72,153,0.3)';
            e.currentTarget.style.borderColor = 'rgba(236,72,153,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(6,6,8,0.6)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="3" width="22" height="18" rx="4" fill="#FF2442"/>
          </svg>
        </a>
        <a
          href="#"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            logSocialMediaClick && logSocialMediaClick('GitHub').then(() => {
              window.open('https://github.com/akldr', '_blank');
            });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'rgba(6,6,8,0.6)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.3)';
            e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(6,6,8,0.6)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <Github width="16" height="16" />
        </a>
      </div>

      {/* Matrix Canvas - 顶部对齐，宽度100%，高度按比例自动调整 */}
      <div style={{
        width: '100%',
        flex: '0 0 auto',
        marginBottom: 0,
        aspectRatio: 'auto', // 让canvas自动计算比例
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            display: 'block', 
            width: '100%', 
            height: 'auto',
          }} 
        />
      </div>

      {/* TTS 面板 - 紧贴 canvas 下方 */}
      <div style={{
        width: '100%',
        flex: '0 0 auto',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(12,12,16,0.95)',
      }}>
        {uiState.depthUrl === 'tts-live-face' && (
          <TTSCharacterPanel
            onDepthCanvasReady={onDepthCanvasReady}
            isEmbedded={true}
            isCompact={true}
            ttsEngine={ttsEngine}
            ttsLanguage={ttsLanguage}
            apiKey={ttsApiKey}
            onEngineChange={onTtsEngineChange}
            onLanguageChange={onTtsLanguageChange}
            onApiKeyChange={onTtsApiKeyChange}
            onCanvasRefReady={(ref) => { ttsPreviewCanvasRef.current = ref; }}
            onDebugInfoUpdate={() => {}}
          />
        )}
      </div>

      {/* 主控制面板 - 接在 TTS 面板下方，可滚动 */}
      <div style={{
        flex: '1 1 auto',
        overflowY: 'auto',
        padding: '16px 12px 66px 12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          display: 'grid',
          gap: '12px',
          marginBottom: '20px',
        }}>
          {/* 控制按钮 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setRunning((r) => !r)} style={{ fontSize: '11px', padding: '6px 8px' }}>
              {running ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {running ? '暂停' : '播放'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onReset} style={{ fontSize: '11px', padding: '6px 8px' }}>
              <RotateCcw className="h-3 w-3 mr-1" />
              重置
            </Button>
            <Button variant="secondary" size="sm" onClick={onDownload} style={{ fontSize: '11px', padding: '6px 8px' }}>
              <Download className="h-3 w-3 mr-1" />
              下载
            </Button>
          </div>

          {/* Depth Map 选择 - 放在最前面 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Depth Map</label>
            <select
              style={{
                width: '100%',
                height: 32,
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(24,24,27,0.6)',
                color: '#e5e7eb',
                fontSize: 11,
                padding: '6px 8px',
              }}
              value={uiState.depthUrl}
              onChange={(e) => updateConfig("depthUrl", e.target.value)}
            >
              <option value="tts-live-face">TTS 面部动画</option>
              <option value="/depth-map-video.mp4">视频动画</option>
              <option value="/depth-default.png">默认图片</option>
              <option value="/depth-map-01.png">图片 01</option>
              <option value="/depth-map-02.png">图片 02</option>
              <option value="/depth-map-03.png">图片 03</option>
              <option value="/depth-map-04.png">图片 04</option>
              <option value="/depth-map-05.png">图片 05</option>
            </select>
          </div>

          {/* 滑块控制 */}
          <LabeledSlider label="Fall Speed" value={uiState.speed} onChange={(v) => updateConfig("speed", v)} min={0.5} max={8} step={0.1} />
          <LabeledSlider label="Trail Length" value={uiState.trail} onChange={(v) => updateConfig("trail", v)} min={0} max={1.5} step={0.05} />
          <LabeledSlider label="Trail Persist" value={uiState.persistence} onChange={(v) => updateConfig("persistence", v)} min={0} max={1} step={0.01} />
          <LabeledSlider label="Font Size" value={uiState.fontSize} onChange={(v) => updateConfig("fontSize", v)} min={11} max={21} step={1} />
          <LabeledSlider label="Color Hue" value={uiState.colorHue} onChange={(v) => updateConfig("colorHue", v)} min={0} max={360} step={1} />
          <LabeledSlider label="Depth Strength" value={uiState.depthInfluence} onChange={(v) => updateConfig("depthInfluence", v)} min={0} max={1} step={0.05} />
        </div>
      </div>
    </div>
  );
}
