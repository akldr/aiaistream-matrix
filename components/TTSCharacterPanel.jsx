/**
 * TTS Character Animation Component
 * Real-time face animation with TTS - No video recording
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ImageBasedFaceAnimator } from '../lib/imageBasedFace';
import { SpeechSynthesizer } from '../lib/speechEngine';
import { Play, Pause, RotateCcw } from 'lucide-react';

const TTSCharacterPanel = ({ onDepthCanvasReady, isEmbedded = false }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [ttsEngine, setTtsEngine] = useState('web-speech');
  const [ttsLanguage, setTtsLanguage] = useState('auto'); // 'auto', 'en', 'zh'
  const [apiKey, setApiKey] = useState('');
  const [ttsText, setTtsText] = useState(`Congratulations!
Today is your day.
You're off to Great Places!
You're off and away!

You have brains in your head.
You have feet in your shoes.
You can steer yourself
any direction you choose.
You're on your own. And you know what you know.
And YOU are the guy who'll decide where to go.`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ viseme: '-', mouthOpenness: '-' });

  // Refs
  const canvasRef = useRef(null);
  const faceModelRef = useRef(null);
  const speechSynthesizerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  /**
   * Initialize components on mount
   */
  useEffect(() => {
    if (!isEnabled) return;

    // 确保 Canvas 有正确的尺寸后再初始化
    const initTimer = setTimeout(() => {
      const initializeComponents = async () => {
        try {
          if (!canvasRef.current) {
            console.error('Canvas ref not found');
            return;
          }

          // 初始化图片动画器（使用黑白恐怖照片 v2）
          if (!faceModelRef.current) {
            const sources = [
              '/photo-bw-lipsync-creepy-2.png',
              '/photo-bw-lipsync-creepy.png',
              '/depth-map-lipsync.png',
              '/photo-rgb-lipsync.png'
            ];
            let lastError = null;
            for (const src of sources) {
              try {
                faceModelRef.current = new ImageBasedFaceAnimator(
                  canvasRef.current,
                  src
                );
                await faceModelRef.current.loadImage();
                console.log('ImageBasedFaceAnimator initialized with', src);
                if (typeof onDepthCanvasReady === 'function') {
                  onDepthCanvasReady(canvasRef.current);
                }
                lastError = null;
                break;
              } catch (err) {
                console.error('Failed to initialize ImageBasedFaceAnimator with', src, err);
                faceModelRef.current = null;
                lastError = err;
              }
            }
            if (lastError) {
              throw lastError;
            }
          }

          // 初始化语音合成器
          if (speechSynthesizerRef.current) {
            speechSynthesizerRef.current.stopPlayback();
            speechSynthesizerRef.current = null;
          }

          speechSynthesizerRef.current = new SpeechSynthesizer({
            engine: ttsEngine,
            language: ttsLanguage,
            apiKey: ttsEngine === 'elevenlabs' ? apiKey : '',
            onViseme: ({ viseme, energy, width, height }) => {
              if (faceModelRef.current) {
                faceModelRef.current.updateViseme(viseme, energy, width, height);
                // 更新调试信息
                setDebugInfo({
                  viseme: viseme || '-',
                  mouthOpenness: (faceModelRef.current.mouthOpenness * 100).toFixed(0) + '%',
                  width: width ? (width * 100).toFixed(0) + '%' : '-',
                  height: height ? (height * 100).toFixed(0) + '%' : '-'
                });
              }
            },
            onSpeechStart: () => {
              setIsPlaying(true);
              // Set initial mouth state to slightly open
              if (faceModelRef.current) {
                faceModelRef.current.updateViseme('A', 0.5);
              }
            },
            onSpeechEnd: () => {
              setIsPlaying(false);
              if (faceModelRef.current) {
                faceModelRef.current.updateViseme('M', 0);
              }
              if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current);
                playbackIntervalRef.current = null;
              }
            },
          });
          console.log('SpeechSynthesizer initialized');

          // 启动动画循环
          startAnimationLoop();
        } catch (error) {
          console.error('Failed to initialize TTS components:', error);
        }
      };

      initializeComponents();
    }, 100);

    return () => {
      clearTimeout(initTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      if (faceModelRef.current) {
        faceModelRef.current.destroy();
      }
      if (speechSynthesizerRef.current) {
        speechSynthesizerRef.current.stopPlayback();
        speechSynthesizerRef.current = null;
      }
      if (typeof onDepthCanvasReady === 'function') {
        onDepthCanvasReady(null);
      }
    };
  }, [isEnabled, ttsEngine, apiKey, onDepthCanvasReady]);

  /**
   * 主动画循环 - 渲染面部
   */
  const startAnimationLoop = useCallback(() => {
    const animate = () => {
      try {
        if (faceModelRef.current) {
          // 渲染面部
          faceModelRef.current.render();
        }
      } catch (error) {
        console.error('Animation loop error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [isPlaying]);

  /**
   * 处理 TTS 合成和播放
  /**
   * 处理 TTS 合成和播放 - 实时动画
   */
  const handleSpeak = useCallback(async () => {
    if (!ttsText.trim()) {
      alert('请输入要合成的文本');
      return;
    }

    if (!speechSynthesizerRef.current) {
      alert('TTS 引擎未初始化');
      return;
    }

    if (!faceModelRef.current) {
      alert('面部动画未初始化');
      return;
    }

    // Prevent starting new speech while already playing
    if (isPlaying) {
      console.log('Speech already in progress, ignoring play request');
      return;
    }

    try {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }

      const result = await speechSynthesizerRef.current.synthesize(ttsText);
      console.log('TTS completed, duration:', result.duration);
    } catch (error) {
      console.error('TTS synthesis failed:', error);
      alert(`语音合成失败: ${error.message}`);
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
  }, [ttsText]);

  /**
   * 停止播放
   */
  const handleStop = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    if (faceModelRef.current) {
      faceModelRef.current.updateViseme('M', 0);
    }
    setIsPlaying(false);
    if (speechSynthesizerRef.current) {
      speechSynthesizerRef.current.stopPlayback();
    }
    window.speechSynthesis.cancel(); // 停止TTS
  }, []);

  /**
   * 重置动画
   */
  const handleReset = useCallback(() => {
    handleStop();
    if (faceModelRef.current) {
      faceModelRef.current.updateViseme(null, 0);
    }
  }, [handleStop]);

  const containerStyle = isEmbedded ? {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  } : {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 16,
    background: 'rgba(12,12,16,0.92)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.10)'
  };

  return (
    <div style={containerStyle}>
      {!isEmbedded && (
        <h2 style={{ margin: 0, color: '#e5e7eb', fontSize: 16, fontWeight: 700 }}>
          🎤 实时TTS动画
        </h2>
      )}

      {/* 启用/禁用切换 */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{ color: '#cbd5e1', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          启用实时面部动画
        </label>
      </div>

      {isEnabled && (
        <>
          {/* 引擎选择 */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
              TTS 引擎
            </label>
            <select
              value={ttsEngine}
              onChange={(e) => setTtsEngine(e.target.value)}
              style={{
                height: 32,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(24,24,27,0.6)',
                color: '#e5e7eb',
                fontSize: 12,
                padding: '6px 10px',
              }}
            >
              <option value="web-speech">Web Speech API (免费，内置)</option>
              <option value="elevenlabs">ElevenLabs (高质，需API密钥)</option>
            </select>
          </div>

          {/* API 密钥输入 (ElevenLabs) */}
          {ttsEngine === 'elevenlabs' && (
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
                ElevenLabs API 密钥
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_..."
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(24,24,27,0.6)',
                  color: '#e5e7eb',
                  fontSize: 12,
                  padding: '6px 10px',
                }}
              />
            </div>
          )}

          {/* 语言选择 */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
              语言 / Language
            </label>
            <select
              value={ttsLanguage}
              onChange={(e) => setTtsLanguage(e.target.value)}
              style={{
                height: 32,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(24,24,27,0.6)',
                color: '#e5e7eb',
                fontSize: 12,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              <option value="auto">自动检测 / Auto-detect</option>
              <option value="en">English (英文)</option>
              <option value="zh">中文 (Chinese)</option>
            </select>
          </div>

          {/* 文本输入 */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
              文本内容
            </label>
            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="输入要转语音的文本..."
              style={{
                height: 80,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(24,24,27,0.6)',
                color: '#e5e7eb',
                fontSize: 12,
                padding: '8px 10px',
                fontFamily: 'monospace',
                resize: 'none',
              }}
            />
          </div>

          {/* Canvas 预览 */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, color: '#90909b' }}>
              面部动画预览
            </label>
            <canvas
              ref={(el) => {
                canvasRef.current = el;
                if (el && !el.width) {
                  el.width = 512;
                  el.height = 512;
                }
              }}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: '#000000',
                display: 'block',
                width: '100%',
                height: 'auto',
                maxHeight: '400px',
                objectFit: 'contain', // 按比例显示，不压缩变形
                imageRendering: 'auto'
              }}
            />
          </div>

          {/* 实时调试信息 */}
          <div style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(24,24,27,0.6)',
            fontSize: 11,
            color: '#a0a0a8',
            fontFamily: 'monospace'
          }}>
            <div>Viseme: <span style={{ color: '#3b82f6' }}>{debugInfo.viseme}</span></div>
            <div>Mouth: <span style={{ color: '#10b981' }}>{debugInfo.mouthOpenness}</span></div>
          </div>

          {/* 控制按钮 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <button
              onClick={isPlaying ? handleStop : handleSpeak}
              style={{
                height: 40,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: isPlaying ? '#ef4444' : '#3b82f6',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" /> 停止
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> 播放
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={isPlaying}
              style={{
                height: 40,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(28,28,32,0.9)',
                color: '#e5e7eb',
                fontSize: 12,
                fontWeight: 600,
                cursor: isPlaying ? 'not-allowed' : 'pointer',
                opacity: isPlaying ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <RotateCcw className="h-4 w-4" /> 重置
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TTSCharacterPanel;
