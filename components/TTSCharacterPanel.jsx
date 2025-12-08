/**
 * TTS Character Animation Component
 * Real-time face animation with TTS - No video recording
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ImageBasedFaceAnimator } from '../lib/imageBasedFace';
import { SpeechSynthesizer } from '../lib/speechEngine';
import { Play, Pause } from 'lucide-react';

const TTSCharacterPanel = ({ 
  onDepthCanvasReady, 
  isEmbedded = false, 
  isCompact = false,
  ttsEngine: externalEngine,
  ttsLanguage: externalLanguage,
  apiKey: externalApiKey,
  onEngineChange,
  onLanguageChange,
  onApiKeyChange,
  onCanvasRefReady, // New: callback to pass canvas ref to parent
  onDebugInfoUpdate // New: callback to pass debug info to parent
}) => {
  // Use external props if provided, otherwise use internal state
  const [internalEngine, setInternalEngine] = useState('web-speech');
  const [internalLanguage, setInternalLanguage] = useState('auto');
  const [internalApiKey, setInternalApiKey] = useState('');
  
  const ttsEngine = externalEngine !== undefined ? externalEngine : internalEngine;
  const ttsLanguage = externalLanguage !== undefined ? externalLanguage : internalLanguage;
  const apiKey = externalApiKey !== undefined ? externalApiKey : internalApiKey;
  
  const setTtsEngine = (val) => {
    if (onEngineChange) onEngineChange(val);
    else setInternalEngine(val);
  };
  const setTtsLanguage = (val) => {
    if (onLanguageChange) onLanguageChange(val);
    else setInternalLanguage(val);
  };
  const setApiKey = (val) => {
    if (onApiKeyChange) onApiKeyChange(val);
    else setInternalApiKey(val);
  };
  
  const [ttsText, setTtsText] = useState(`Congratulations! Today is your day. You're off to Great Places! You're off and away! You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose. You're on your own. And you know what you know. And YOU are the guy who'll decide where to go.`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ viseme: '-', mouthOpenness: '-' });

  // Refs - shared across all render modes
  const canvasRef = useRef(null);
  const faceModelRef = useRef(null);
  const speechSynthesizerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const playbackIntervalRef = useRef(null);

  /**
   * Initialize components on mount
   */
  useEffect(() => {
    // 确保 Canvas 有正确的尺寸后再初始化
    const initTimer = setTimeout(() => {
      const initializeComponents = async () => {
        try {
          if (!canvasRef.current) {
            // Canvas ref not found - silently skip
            return;
          }

          // 初始化图片动画器（使用黑白恐怖照片 v2）
          // 避免重复初始化，防止TTS中断
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
                // ImageBasedFaceAnimator initialized
                if (typeof onDepthCanvasReady === 'function') {
                  onDepthCanvasReady(canvasRef.current);
                }
                lastError = null;
                break;
              } catch (err) {
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
                const newDebugInfo = {
                  viseme: viseme || '-',
                  mouthOpenness: (faceModelRef.current.mouthOpenness * 100).toFixed(0) + '%',
                  width: width ? (width * 100).toFixed(0) + '%' : '-',
                  height: height ? (height * 100).toFixed(0) + '%' : '-'
                };
                setDebugInfo(newDebugInfo);
                // Pass debug info to parent if callback provided
                if (onDebugInfoUpdate) {
                  onDebugInfoUpdate(newDebugInfo);
                }
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
          // SpeechSynthesizer initialized

          // 启动动画循环
          startAnimationLoop();
        } catch (error) {
          // Initialization failed - continue silently
        }
      };

      initializeComponents();
    }, 100);

    return () => {
      clearTimeout(initTimer);
      // 只在组件真正卸载时清理，不在父组件折叠时清理
      // 这样可以防止UI折叠导致TTS中断
    };
  }, [ttsEngine, apiKey]);
  
  // 独立的清理效果，只在组件卸载时执行
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      if (faceModelRef.current) {
        faceModelRef.current.destroy();
        faceModelRef.current = null;
      }
      if (speechSynthesizerRef.current) {
        speechSynthesizerRef.current.stopPlayback();
        speechSynthesizerRef.current = null;
      }
      if (typeof onDepthCanvasReady === 'function') {
        onDepthCanvasReady(null);
      }
    };
  }, []);

  // 当 compact 模式切换时，强制重新渲染 canvas
  useEffect(() => {
    if (!isCompact && canvasRef.current && faceModelRef.current) {
      // 展开模式时，强制刷新 canvas
      faceModelRef.current.render();
    }
  }, [isCompact]);

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
        // Animation error - continue silently
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [isPlaying]);

  /**
   * 将 TTS 文本按日期写入服务器日志
   */
  const logToServer = useCallback(async (text) => {
    const trimmed = text.trim().slice(0, 300);
    if (!trimmed) return;
    try {
      await fetch('/api/tts-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed })
      });
    } catch (err) {
      // Log persistence failed - silently continue
    }
  }, []);

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
      return;
    }

    try {
      await logToServer(ttsText);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }

      const result = await speechSynthesizerRef.current.synthesize(ttsText);
      // TTS completed
    } catch (error) {
      console.error('TTS synthesis failed:', error);
      alert(`语音合成失败: ${error.message}`);
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
  }, [ttsText, logToServer]);

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
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    width: '100%'
  } : {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 18,
    padding: 16,
    background: 'rgba(12,12,16,0.92)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.10)',
    width: '100%'
  };

  // Compact mode: only show text input and play button
  if (isCompact) {
    return (
      <>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="输入要转语音的文本..."
            maxLength={300}
            style={{
              flex: '1 1 160px',
              height: '100%',
              minHeight: '50px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(24,24,27,0.8)',
              color: '#e5e7eb',
              fontSize: 13,
              padding: '8px 12px',
              fontFamily: 'system-ui, sans-serif',
              resize: 'none',
            }}
          />
          <button
            onClick={isPlaying ? handleStop : handleSpeak}
            style={{
              minWidth: '50px',
              width: '50px',
              height: '100%',
              minHeight: '50px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: isPlaying ? '#ef4444' : '#3b82f6',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 0.2s ease',
              padding: 0
            }}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
        </div>
        {/* Canvas always exists but hidden in compact mode to preserve rendering state */}
        <canvas
          ref={(el) => {
            canvasRef.current = el;
            if (el && !el.width) {
              el.width = 512;
              el.height = 512;
            }
            // Pass canvas ref to parent for preview in main panel
            if (el && onCanvasRefReady) {
              onCanvasRefReady(el);
            }
          }}
          style={{ display: 'none' }}
        />
      </>
    );
  }

  // For embedded mode (in main panel): show canvas and debug info only
  // Settings are now in the main panel
  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
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
            maxHeight: '200px',
            objectFit: 'contain',
            imageRendering: 'auto'
          }}
        />
      </div>

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
    </div>
  );
};

export default TTSCharacterPanel;
