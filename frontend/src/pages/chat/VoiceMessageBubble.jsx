/**
 * @file src/pages/chat/VoiceMessageBubble.jsx
 * @description Inline audio player for voice messages in the chat bubble.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const VoiceMessageBubble = ({ message: msg, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(msg.media?.duration || 0);
  const [loadError, setLoadError] = useState(false);

  const audioRef = useRef(null);

  const src = msg.media?.url || msg.content;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Explicitly load the audio source when it changes
    try {
      audio.load();
    } catch (e) {
      console.warn('[VoiceMessage] Error loading audio:', e);
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setLoadError(false);

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setTotalDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onError = (e) => {
      const err = audio.error;
      if (err && err.code === 1) {
        return; // Ignore non-fatal aborted error
      }
      setLoadError(true);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || loadError) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => {
        console.warn('[VoiceMessage] Playback error:', err);
        setIsPlaying(false); // Reset playing state rather than disabling the audio entirely
      });
      setIsPlaying(true);
    }
  }, [isPlaying, loadError]);

  const handleScrub = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const val = Number(e.target.value);
    audio.currentTime = val;
    setCurrentTime(val);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`vmb-container ${isOwn ? 'vmb-own' : 'vmb-other'}`}>
      <audio ref={audioRef} src={src} preload="auto" />

      {/* Play / Pause button */}
      <button
        className="vmb-play-btn"
        onClick={togglePlay}
        disabled={loadError}
        title={loadError ? 'Audio unavailable' : isPlaying ? 'Pause' : 'Play'}
      >
        {loadError ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        ) : isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Waveform / Scrubber area */}
      <div className="vmb-waveform-area">
        {/* Static fake waveform bars */}
        <div className="vmb-fake-wave" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => {
            const h = 4 + Math.abs(Math.sin(i * 0.9 + 1.5)) * 22;
            const filled = (i / 28) * 100 <= progress;
            return (
              <div
                key={i}
                className={`vmb-wave-bar ${filled ? 'vmb-wave-bar-filled' : ''}`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        {/* Invisible range input on top for scrubbing */}
        <input
          className="vmb-scrubber"
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleScrub}
          aria-label="Audio scrubber"
        />
      </div>

      {/* Duration */}
      <span className="vmb-duration">
        {isPlaying ? formatDuration(currentTime) : formatDuration(totalDuration)}
      </span>

      {/* Mic icon badge */}
      <span className="vmb-mic-icon" title="Voice message">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </span>
    </div>
  );
};

export default VoiceMessageBubble;
