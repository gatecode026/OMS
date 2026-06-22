/**
 * @file src/pages/chat/VoiceRecorder.jsx
 * @description Voice message recorder with record / preview / send stages.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [stage, setStage] = useState('recording'); // 'recording' | 'preview' | 'sending'
  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveformBars, setWaveformBars] = useState(Array(30).fill(4));

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  // ── Start recording on mount ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;

        // Waveform analyser
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const drawWave = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const bars = Array.from({ length: 30 }, (_, i) => {
            const idx = Math.floor((i / 30) * data.length);
            return Math.max(4, (data[idx] / 255) * 32);
          });
          setWaveformBars(bars);
          animFrameRef.current = requestAnimationFrame(drawWave);
        };
        drawWave();

        // Find best supported mimeType
        let recorderOptions = {};
        let detectedMimeType = 'audio/webm'; // default fallback
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/aac'
        ];
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            recorderOptions = { mimeType: candidate };
            detectedMimeType = candidate;
            break;
          }
        }

        // MediaRecorder
        const mr = new MediaRecorder(stream, recorderOptions);
        mediaRecorderRef.current = mr;
        chunksRef.current = [];

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          const actualMime = mr.mimeType || detectedMimeType;
          const blob = new Blob(chunksRef.current, { type: actualMime });
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
          setStage('preview');
          cancelAnimationFrame(animFrameRef.current);
        };

        mr.start(100);

        // Duration timer
        timerRef.current = setInterval(() => {
          setDuration(d => {
            if (d >= 119) {
              // auto-stop at 2 min
              mr.stop();
              clearInterval(timerRef.current);
            }
            return d + 1;
          });
        }, 1000);

      } catch (err) {
        console.error('[VoiceRecorder] Mic access denied:', err);
        onCancel();
      }
    };

    startRecording();

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  // ── Playback ─────────────────────────────────────────────────────────────
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => {
        console.warn('[VoiceRecorder] Preview play error:', err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.load();
    } catch (e) {
      console.warn('[VoiceRecorder] Error loading preview audio:', e);
    }

    setIsPlaying(false);
    setPlaybackTime(0);

    const onTimeUpdate = () => setPlaybackTime(Math.floor(audio.currentTime));
    const onEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!audioBlob) return;
    setStage('sending');

    // Convert blob → base64 data URL so it travels like image/file messages
    const reader = new FileReader();
    reader.onload = () => {
      const actualType = audioBlob.type || 'audio/webm';
      const extension = actualType.split('/')[1]?.split(';')[0] || 'webm';
      onSend(reader.result, 'audio', {
        fileName: `voice_${Date.now()}.${extension}`,
        fileType: actualType,
        fileSize: audioBlob.size,
        duration,
        url: reader.result,
      });
    };
    reader.readAsDataURL(audioBlob);
  }, [audioBlob, duration, onSend]);

  // ── Discard ──────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (stage === 'recording') stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onCancel();
  }, [stage, audioUrl, stopRecording, onCancel]);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="voice-recorder">
      {/* Hidden audio element for preview */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {stage === 'recording' && (
        <>
          {/* Live waveform */}
          <div className="vr-waveform">
            {waveformBars.map((h, i) => (
              <div
                key={i}
                className="vr-bar vr-bar-live"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          <span className="vr-duration vr-duration-live">
            <span className="vr-rec-dot" /> {formatDuration(duration)}
          </span>

          {/* Stop (converts to preview) */}
          <button className="vr-btn vr-btn-stop" onClick={stopRecording} title="Stop recording">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>

          {/* Discard */}
          <button className="vr-btn vr-btn-cancel" onClick={handleCancel} title="Discard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </>
      )}

      {stage === 'preview' && (
        <>
          {/* Play/Pause */}
          <button className="vr-btn vr-btn-play" onClick={togglePlayback} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Scrubber */}
          <input
            className="vr-scrubber"
            type="range"
            min={0}
            max={duration || 1}
            value={playbackTime}
            onChange={e => {
              if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
              setPlaybackTime(Number(e.target.value));
            }}
          />

          <span className="vr-duration">
            {isPlaying ? formatDuration(playbackTime) : formatDuration(duration)}
          </span>

          {/* Discard */}
          <button className="vr-btn vr-btn-cancel" onClick={handleCancel} title="Discard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Send */}
          <button className="vr-btn vr-btn-send" onClick={handleSend} title="Send voice message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </>
      )}

      {stage === 'sending' && (
        <span className="vr-duration" style={{ opacity: 0.6 }}>Sending…</span>
      )}
    </div>
  );
};

export default VoiceRecorder;
