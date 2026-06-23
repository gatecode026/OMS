import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCall } from '../../context/CallContext';
import { useApp } from '../../context/AppContext';

const CallScreen = () => {
  const {
    callState, callInfo, connectionState,
    localStream, remoteStream,
    isMuted, isVideoOff, isScreenSharing,
    isFrontCamera, isSpeakerOn,
    callDuration, formatDuration,
    acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, toggleScreenShare,
    flipCamera, toggleSpeaker,
    // Quality & Device Switching API
    networkQuality,
    audioDevices,
    videoDevices,
    speakerDevices,
    activeCamera,
    activeMic,
    activeSpeaker,
    micVolume,
    activeProfile,
    switchCamera,
    switchMicrophone,
    switchSpeaker,
    adjustQualityProfile
  } = useCall();

  const { currentUser } = useApp();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimerRef = useRef(null);
  const [isSwapped, setIsSwapped] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const audioRef = useRef(null);

  // Draggable PiP States
  const [pipPosition, setPipPosition] = useState({ x: window.innerWidth - 174, y: 80 });
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pipStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const pipRef = useRef(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const isOutgoing = callState === 'outgoing';
  const isActive = callState === 'active';

  const isCaller = currentUser?.id === callInfo?.callerId;
  const otherPersonName = isCaller ? callInfo?.calleeName : callInfo?.callerName;
  const otherPersonAvatar = isCaller ? callInfo?.calleeAvatar : callInfo?.callerAvatar;

  const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0 && !isVideoOff;
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;

  // Reset swap/drag state when call state changes
  useEffect(() => {
    if (callState === 'idle' || callState === 'outgoing' || callState === 'incoming') {
      setIsSwapped(false);
      hasDraggedRef.current = false;
    }
  }, [callState]);

  // Sync speaker volume changes with the audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = speakerVolume / 100;
    }
  }, [speakerVolume]);

  // Update initial position on mount/resize
  useEffect(() => {
    const handleResize = () => {
      const rect = pipRef.current ? pipRef.current.getBoundingClientRect() : { width: 150, height: 200 };
      const pipW = rect.width;
      const pipH = rect.height;

      if (!hasDraggedRef.current) {
        setPipPosition({
          x: window.innerWidth - pipW - 24,
          y: 80
        });
      } else {
        setPipPosition(prev => ({
          x: Math.max(16, Math.min(window.innerWidth - pipW - 16, prev.x)),
          y: Math.max(16, Math.min(window.innerHeight - pipH - 16, prev.y))
        }));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isVideo = callInfo?.callType === 'video' || callInfo?.type === 'video';
  const mainIsLocal = isVideo && isSwapped;
  const pipIsLocal = isVideo && !isSwapped;
  
  // Mirrored transforms for front camera
  const mainTransform = (mainIsLocal && isFrontCamera && !isScreenSharing) ? 'scaleX(-1)' : 'none';
  const pipTransform = (pipIsLocal && isFrontCamera && !isScreenSharing) ? 'scaleX(-1)' : 'none';

  let mainStream = null;
  let pipStream = null;

  if (isVideo) {
    if (isSwapped) {
      mainStream = localStream;
      pipStream = remoteStream;
    } else {
      mainStream = remoteStream;
      pipStream = localStream;
    }
  }

  // Recalculate PiP position when stream resolves to ensure proper sizing containment
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pipRef.current && !hasDraggedRef.current) {
        const rect = pipRef.current.getBoundingClientRect();
        setPipPosition({
          x: window.innerWidth - rect.width - 24,
          y: 80
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isVideo, pipStream]);

  // Pointer drag event handlers for local PiP
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    pipStartRef.current = { x: pipPosition.x, y: pipPosition.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    dragDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    
    if (dragDistanceRef.current > 5) {
      hasDraggedRef.current = true;
    }

    const rect = pipRef.current ? pipRef.current.getBoundingClientRect() : { width: 150, height: 200 };
    const pipW = rect.width;
    const pipH = rect.height;
    
    const nextX = Math.max(16, Math.min(window.innerWidth - pipW - 16, pipStartRef.current.x + dx));
    const nextY = Math.max(16, Math.min(window.innerHeight - pipH - 16, pipStartRef.current.y + dy));
    
    setPipPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapped(prev => !prev);
    }, 100);
    setTimeout(() => {
      setIsSwapping(false);
    }, 300);
  };

  const handlePipClick = (e) => {
    e.stopPropagation();
    if (dragDistanceRef.current > 5) return;
    handleSwap();
  };

  // Attach streams to video elements using callback refs
  const mainVideoCallbackRef = useCallback((node) => {
    if (node) {
      node.muted = true; // Always mute video elements to let the dedicated audio element play remote audio without duplicates
      if (mainStream) {
        if (node.srcObject !== mainStream) {
          node.srcObject = mainStream;
        }
        node.play().catch(err => console.warn('[CallScreen] Main video play error:', err));
      } else {
        node.srcObject = null;
      }
    }
  }, [mainStream]);

  const pipVideoCallbackRef = useCallback((node) => {
    if (node) {
      node.muted = true; // Always mute video elements
      if (pipStream) {
        if (node.srcObject !== pipStream) {
          node.srcObject = pipStream;
        }
        node.play().catch(err => console.warn('[CallScreen] PiP video play error:', err));
      } else {
        node.srcObject = null;
      }
    }
  }, [pipStream]);

  // ── Auto-hide controls after 5 seconds ────────
  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 5000);
  }, []);

  // Start auto-hide timer when call becomes active
  useEffect(() => {
    if (callState === 'active') {
      resetControlsTimer();
    }
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [callState, resetControlsTimer]);

  // Reset timer on any user interaction with controls
  const handleScreenTap = useCallback(() => {
    if (callState === 'active') {
      resetControlsTimer();
    }
  }, [callState, resetControlsTimer]);

  if (callState === 'idle') return null;

  const isIncoming = callState === 'incoming';

  // ═══════════════════════════════════════════════
  // INCOMING CALL — Full-screen attention-grabbing modal
  // ═══════════════════════════════════════════════
  if (isIncoming) {
    const callerName = callInfo?.callerName || 'Unknown';
    const callerAvatar = callInfo?.callerAvatar;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'radial-gradient(circle at center, #1b1c2b 0%, #0c0d18 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
      }}>
        {/* Glowing animations */}
        <style>{`
          @keyframes ripple {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          @keyframes accept-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45), 0 8px 24px rgba(16, 185, 129, 0.35); }
            70% { box-shadow: 0 0 0 16px rgba(16, 185, 129, 0), 0 8px 24px rgba(16, 185, 129, 0.2); }
          }
          @keyframes decline-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.25), 0 8px 24px rgba(234, 67, 53, 0.2); }
            70% { box-shadow: 0 0 0 12px rgba(234, 67, 53, 0), 0 8px 24px rgba(234, 67, 53, 0.1); }
          }
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>

        {/* Floating Ripple rings behind avatar */}
        <div style={{ position: 'relative', marginBottom: '40px', animation: 'float 4s ease-in-out infinite' }}>
          <div style={{
            position: 'absolute', inset: '-12px',
            borderRadius: '50%',
            border: '2px solid rgba(139, 92, 246, 0.2)',
            animation: 'ripple 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite'
          }} />
          <div style={{
            position: 'absolute', inset: '-12px',
            borderRadius: '50%',
            border: '2px solid rgba(139, 92, 246, 0.2)',
            animation: 'ripple 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 0.8s'
          }} />
          <div style={{
            position: 'absolute', inset: '-12px',
            borderRadius: '50%',
            border: '2px solid rgba(139, 92, 246, 0.2)',
            animation: 'ripple 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite 1.6s'
          }} />
          <div style={{
            width: '110px', height: '110px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '44px', fontWeight: 700,
            color: '#fff', overflow: 'hidden',
            border: '4px solid rgba(255,255,255,0.15)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            position: 'relative', zIndex: 2
          }}>
            {callerAvatar ? (
              <img src={callerAvatar} alt={callerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : callerName?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Caller info */}
        <h2 style={{
          color: '#fff', fontSize: '28px', fontWeight: 700,
          margin: '0 0 8px', textAlign: 'center',
          letterSpacing: '-0.02em',
          animation: 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>{callerName}</h2>
        <p style={{
          color: 'rgba(255,255,255,0.65)', fontSize: '15px',
          margin: '0 0 54px', letterSpacing: '0.02em',
          animation: 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both'
        }}>
          Incoming {isVideo ? 'video' : 'voice'} call...
        </p>

        {/* Accept / Reject buttons */}
        <div style={{
          display: 'flex', gap: '56px', alignItems: 'center',
          animation: 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both'
        }}>
          <div style={{ textAlign: 'center' }}>
            <CallBtn 
              onClick={() => rejectCall('declined')} 
              color="#ea4335" 
              size={64} 
              title="Decline"
              extraStyle={{ animation: 'decline-pulse 2s infinite' }}
            >
              <PhoneHangup />
            </CallBtn>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500, marginTop: '12px', letterSpacing: '0.02em' }}>Decline</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <CallBtn 
              onClick={acceptCall} 
              color="#10b981" 
              size={64} 
              title="Accept"
              extraStyle={{ animation: 'accept-pulse 2s infinite' }}
            >
              {isVideo ? <VideoIcon /> : <PhoneIcon />}
            </CallBtn>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500, marginTop: '12px', letterSpacing: '0.02em' }}>Accept</p>
          </div>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    const showVideo = mainIsLocal ? hasLocalVideo : (remoteStream && remoteStream.getVideoTracks().length > 0);
    
    if (showVideo) {
      return (
        <div 
          className={`video-main-wrapper ${isSwapping ? 'video-swapping' : ''}`}
          style={{
            position: 'absolute', inset: 0,
            zIndex: 1,
            background: '#000',
            overflow: 'hidden',
            transition: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <video
            ref={mainVideoCallbackRef}
            autoPlay
            playsInline
            style={{
              width: '100%', height: '100%',
              objectFit: (mainStream === localStream && isScreenSharing) ? 'contain' : 'cover',
              transform: mainTransform,
              display: 'block'
            }}
          />
        </div>
      );
    } else {
      const name = mainIsLocal ? 'You' : otherPersonName;
      const avatar = mainIsLocal ? currentUser?.avatar : otherPersonAvatar;
      
      return (
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, #121216 0%, #1a1a24 100%)'
        }}>
          {avatar && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${avatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(40px) brightness(0.25)',
              opacity: 0.5,
              zIndex: 0
            }} />
          )}

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '120px', height: '120px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '48px', fontWeight: 700, color: '#fff',
              overflow: 'hidden',
              border: '4px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              marginBottom: '20px'
            }}>
              {avatar ? (
                <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : name?.charAt(0).toUpperCase()}
            </div>
            <h2 style={{
              color: '#fff', fontSize: '24px', fontWeight: 700,
              margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}>{name}</h2>
            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0,
              textShadow: '0 1px 4px rgba(0,0,0,0.5)'
            }}>
              {isOutgoing && 'Calling...'}
              {!isOutgoing && isActive && connectionState === 'connecting' && 'Connecting...'}
              {!isOutgoing && isActive && connectionState === 'connected' && (mainIsLocal ? 'Camera is off' : 'Video is off')}
              {connectionState === 'failed' && 'Connection failed'}
            </p>
          </div>
        </div>
      );
    }
  };

  const renderPipContent = () => {
    const showVideo = pipIsLocal ? hasLocalVideo : (remoteStream && remoteStream.getVideoTracks().length > 0);
    
    if (showVideo) {
      return (
        <video
          ref={pipVideoCallbackRef}
          autoPlay
          playsInline
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: pipTransform,
            display: 'block',
            pointerEvents: 'none'
          }}
        />
      );
    } else {
      const name = pipIsLocal ? 'You' : otherPersonName;
      const avatar = pipIsLocal ? currentUser?.avatar : otherPersonAvatar;
      
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#1e1e24',
          color: '#fff',
          padding: '8px',
          position: 'relative'
        }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 600,
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.2)',
            marginBottom: '8px'
          }}>
            {avatar ? (
              <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : name?.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.8, textAlign: 'center' }}>
            {name}
          </span>
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
            width: '18px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2 2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </div>
        </div>
      );
    }
  };

  return (
    <div
      onClick={handleScreenTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <style>{`
        :root {
          --pip-width: 150px;
          --pip-height: 200px;
        }
        @media (max-width: 768px) {
          :root {
            --pip-width: 100px;
            --pip-height: 140px;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(12px); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .video-swapping {
          opacity: 0.3 !important;
          transform: scale(0.95) !important;
        }
      `}</style>

      {/* ─── LAYER 0: Background for non-video states ─── */}
      {!isVideo && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }} />
      )}

      {/* ─── LAYER 1: Main Content (Full-screen Video or Placeholder) ─── */}
      {isVideo && renderMainContent()}

      {/* ─── LAYER 2: Dark gradient overlay for readability ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: isControlsVisible
          ? 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.6) 100%)'
          : 'transparent',
        transition: 'background 0.4s ease',
        pointerEvents: 'none'
      }} />

      {/* ─── LAYER 3: Top bar — caller info + duration ─── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: isControlsVisible ? 1 : 0,
        transform: isControlsVisible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: isControlsVisible ? 'auto' : 'none'
      }}>
        {/* Left: Caller info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700, color: '#fff',
            overflow: 'hidden',
            border: isActive ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.3)',
            flexShrink: 0
          }}>
            {otherPersonAvatar ? (
              <img src={otherPersonAvatar} alt={otherPersonName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : otherPersonName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{
              color: '#fff', fontSize: '16px', fontWeight: 600,
              lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,0.5)'
            }}>{otherPersonName}</div>
            <div style={{
              color: 'rgba(255,255,255,0.7)', fontSize: '13px',
              lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,0.5)'
            }}>
              {isOutgoing && 'Calling...'}
              {isActive && connectionState === 'connecting' && 'Connecting...'}
              {isActive && connectionState === 'connected' && formatDuration(callDuration)}
              {connectionState === 'failed' && 'Connection failed'}
            </div>
          </div>
        </div>

        {/* Right: cellular network quality indicator */}
        {isActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '6px 12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <NetworkQualityIndicator quality={networkQuality} />
          </div>
        )}
      </div>

      {/* ─── LAYER 4: Center content (avatar when no video - Voice Call only) ─── */}
      {!isVideo && !isOutgoing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: '120px', height: '120px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px', fontWeight: 700, color: '#fff',
            overflow: 'hidden',
            border: isActive ? '4px solid #22c55e' : '4px solid rgba(255,255,255,0.2)',
            marginBottom: '20px'
          }}>
            {otherPersonAvatar ? (
              <img src={otherPersonAvatar} alt={otherPersonName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : otherPersonName?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{
            color: '#fff', fontSize: '24px', fontWeight: 700,
            margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}>{otherPersonName}</h2>
          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0,
            textShadow: '0 1px 4px rgba(0,0,0,0.5)'
          }}>
            {isActive && connectionState === 'connecting' && 'Connecting...'}
            {isActive && connectionState === 'connected' && formatDuration(callDuration)}
            {connectionState === 'failed' && 'Connection failed'}
          </p>
        </div>
      )}

      {/* ─── Outgoing call overlay text on top of local camera - Voice Call only ─── */}
      {isOutgoing && !isVideo && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '20px 32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: 700, color: '#fff',
              overflow: 'hidden', margin: '0 auto 12px',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              {otherPersonAvatar ? (
                <img src={otherPersonAvatar} alt={otherPersonName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : otherPersonName?.charAt(0).toUpperCase()}
            </div>
            <p style={{
              color: '#fff', fontSize: '18px', fontWeight: 600, margin: '0 0 4px'
            }}>{otherPersonName}</p>
            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0,
              animation: 'breathe 2s ease-in-out infinite'
            }}>Calling...</p>
          </div>
        </div>
      )}

      {/* ─── LAYER 5: Draggable PiP Video ─── */}
      {isVideo && (
        <div 
          ref={pipRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handlePipClick}
          className={`video-pip-wrapper ${isSwapping ? 'video-swapping' : ''}`}
          style={{
            position: 'absolute',
            left: `${pipPosition.x}px`,
            top: `${pipPosition.y}px`,
            width: 'var(--pip-width, 120px)',
            height: 'var(--pip-height, 160px)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.2)',
            zIndex: 9999, // Stay above all controls and reconnect overlays
            background: '#1a1a1a',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            cursor: isDraggingRef.current ? 'grabbing' : 'pointer',
            touchAction: 'none',
            transition: isDraggingRef.current 
              ? 'border-color 0.2s, box-shadow 0.2s' 
              : 'left 0.1s ease, top 0.1s ease, opacity 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s, box-shadow 0.2s'
          }}
        >
          {renderPipContent()}
        </div>
      )}

      {/* ─── LAYER 6: Screen sharing indicator ─── */}
      {isScreenSharing && isActive && (
        <div style={{
          position: 'absolute',
          top: '72px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(99, 102, 241, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '24px',
          padding: '8px 20px',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
        }}>
          <ScreenShareIcon />
          <span>You are sharing your screen</span>
          <button
            onClick={(e) => { e.stopPropagation(); toggleScreenShare(); }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '8px',
              color: '#fff', padding: '4px 12px',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', marginLeft: '4px',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            Stop
          </button>
        </div>
      )}

      {/* ─── LAYER 6.5: Reconnecting Banner Overlay ─── */}
      {(connectionState === 'reconnecting' || (connectionState === 'connecting' && isActive)) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff'
        }}>
          <div style={{
            width: '40px', height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <span style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Reconnecting Call</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Please check your internet connection...</span>
        </div>
      )}

      {/* ─── LAYER 7: Bottom Control Bar ─── */}
      {(isOutgoing || isActive) && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: '24px',
            opacity: isControlsVisible ? 1 : 0,
            transform: isControlsVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            pointerEvents: isControlsVisible ? 'auto' : 'none'
          }}
        >
          {/* Control pill container */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(20, 20, 22, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '32px',
            padding: '12px 20px',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
          }}>
            {/* Mute */}
            <BottomBtn
              onClick={toggleMute}
              active={isMuted}
              activeColor="#ea4335"
              label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff /> : <MicIcon />}
            </BottomBtn>

            {/* Camera On/Off */}
            {isVideo && (
              <BottomBtn
                onClick={toggleVideo}
                active={isVideoOff}
                activeColor="#ea4335"
                label={isVideoOff ? 'Camera On' : 'Camera Off'}
              >
                {isVideoOff ? <VideoOffIcon /> : <VideoIcon />}
              </BottomBtn>
            )}

            {/* Flip Camera (mobile) */}
            {isVideo && !isScreenSharing && (
              <BottomBtn onClick={flipCamera} label="Flip">
                <FlipCameraIcon />
              </BottomBtn>
            )}

            {/* Speaker toggle */}
            <BottomBtn
              onClick={toggleSpeaker}
              active={isSpeakerOn}
              activeColor="#10b981"
              label={isSpeakerOn ? 'Earpiece' : 'Speaker'}
            >
              {isSpeakerOn ? <SpeakerLoudIcon /> : <SpeakerIcon />}
            </BottomBtn>

            {/* Screen share */}
            {isActive && (
              <BottomBtn
                onClick={toggleScreenShare}
                active={isScreenSharing}
                activeColor="#d946ef"
                label={isScreenSharing ? 'Stop Share' : 'Share'}
              >
                <ScreenShareIcon />
              </BottomBtn>
            )}

            {/* Settings Gear */}
            <BottomBtn
              onClick={() => setIsSettingsOpen(prev => !prev)}
              active={isSettingsOpen}
              activeColor="#8b5cf6"
              label="Device Settings"
            >
              <SettingsIcon />
            </BottomBtn>

            {/* Separator */}
            <div style={{
              width: '1px',
              height: '28px',
              background: 'rgba(255,255,255,0.15)',
              margin: '0 6px'
            }} />

            {/* End Call — prominent red */}
            <button
              onClick={endCall}
              title="End call"
              style={{
                width: '56px',
                height: '48px',
                borderRadius: '24px',
                border: 'none',
                background: '#ea4335',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, box-shadow 0.2s ease',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(234, 67, 53, 0.35)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(220, 38, 38, 0.45)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#ea4335';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(234, 67, 53, 0.35)';
              }}
            >
              <PhoneHangup />
            </button>
          </div>
        </div>
      )}

      {/* ─── LAYER 8: Device Settings Modal overlay ─── */}
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          style={{
            position: 'absolute', inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px',
              background: 'rgba(30, 30, 35, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              color: '#fff',
              display: 'flex', flexDirection: 'column', gap: '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Device Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                  fontSize: '20px', cursor: 'pointer', padding: '4px'
                }}
              >
                &times;
              </button>
            </div>

            {/* Camera Select */}
            {isVideo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Camera</label>
                <select
                  value={activeCamera}
                  onChange={e => switchCamera(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', padding: '10px', fontSize: '14px', outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {videoDevices.map((d, index) => (
                    <option key={d.deviceId} value={d.deviceId} style={{ background: '#222', color: '#fff' }}>
                      {d.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && (
                    <option value="" style={{ background: '#222', color: '#fff' }}>No cameras found</option>
                  )}
                </select>
              </div>
            )}

            {/* Microphone Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Microphone</label>
              <select
                value={activeMic}
                onChange={e => switchMicrophone(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: '#fff', padding: '10px', fontSize: '14px', outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {audioDevices.map((d, index) => (
                  <option key={d.deviceId} value={d.deviceId} style={{ background: '#222', color: '#fff' }}>
                    {d.label || `Microphone ${index + 1}`}
                  </option>
                ))}
                {audioDevices.length === 0 && (
                  <option value="" style={{ background: '#222', color: '#fff' }}>No microphones found</option>
                )}
              </select>
            </div>

            {/* Speaker Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Speaker / Audio Output</label>
              <select
                value={activeSpeaker}
                onChange={e => switchSpeaker(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: '#fff', padding: '10px', fontSize: '14px', outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {speakerDevices.map((d, index) => (
                  <option key={d.deviceId} value={d.deviceId} style={{ background: '#222', color: '#fff' }}>
                    {d.label || `Speaker ${index + 1}`}
                  </option>
                ))}
                {speakerDevices.length === 0 && (
                  <option value="" style={{ background: '#222', color: '#fff' }}>Default Speaker</option>
                )}
              </select>
            </div>

            {/* Speaker Volume Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                <span>Speaker Volume</span>
                <span style={{ fontFamily: 'monospace' }}>{speakerVolume}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                  {speakerVolume === 0 ? (
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  ) : speakerVolume < 50 ? (
                    <>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </>
                  ) : (
                    <>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  )}
                </svg>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={speakerVolume}
                  onChange={e => setSpeakerVolume(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: '#22c55e'
                  }}
                />
              </div>
            </div>

            {/* Mic Volume Meter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                <span>Input Level</span>
                <span style={{ fontFamily: 'monospace' }}>{micVolume}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${micVolume}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #22c55e 70%, #eab308 90%, #ef4444 100%)', 
                    borderRadius: '4px',
                    transition: 'width 0.05s ease-out' 
                  }} 
                />
              </div>
            </div>

            {/* Quality Profile Select (Manual Option) */}
            {isVideo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Video Quality Profile</label>
                <select
                  value={activeProfile}
                  onChange={e => adjustQualityProfile(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', padding: '10px', fontSize: '14px', outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="fullhd" style={{ background: '#222', color: '#fff' }}>1080p (Full HD)</option>
                  <option value="hd" style={{ background: '#222', color: '#fff' }}>720p (HD)</option>
                  <option value="standard" style={{ background: '#222', color: '#fff' }}>480p (Standard)</option>
                  <option value="saver" style={{ background: '#222', color: '#fff' }}>360p (Data Saver)</option>
                </select>
              </div>
            )}

            {/* Quality Indicator Info */}
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <span>WebRTC P2P</span>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated audio element for remote stream audio */}
      {remoteStream && remoteStream.getAudioTracks().length > 0 && (
        <audio
          ref={(node) => {
            audioRef.current = node;
            if (node) {
              node.muted = false;
              if (node.srcObject !== remoteStream) {
                node.srcObject = remoteStream;
                console.log('[CallScreen] Attached remoteStream to dedicated audio element, tracks:', remoteStream.getAudioTracks().map(t => `${t.kind}:${t.id}:${t.enabled}`));
              }
              node.volume = speakerVolume / 100;
              node.play().catch(err => console.warn('[CallScreen] Remote audio play error:', err));
            }
          }}
          autoPlay
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════

const CallBtn = ({ onClick, color, size, title, children, extraStyle = {} }) => (
  <button onClick={onClick} title={title} style={{
    width: `${size}px`, height: `${size}px`,
    borderRadius: '50%', border: 'none',
    background: color, color: '#fff',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.15s, opacity 0.15s',
    flexShrink: 0,
    ...extraStyle
  }}
    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
  >
    {children}
  </button>
);

const BottomBtn = ({ onClick, active, activeColor, label, children }) => (
  <button onClick={onClick} title={label} style={{
    width: '48px', height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: active
      ? (activeColor || '#ea4335')
      : 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, box-shadow 0.2s ease',
    flexShrink: 0,
    position: 'relative',
    boxShadow: active ? `0 4px 14px ${activeColor || '#ea4335'}45` : 'none'
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'scale(1.08)';
      if (!active) {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.08)';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'scale(1)';
      if (!active) {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
  >
    {children}
  </button>
);

const NetworkQualityIndicator = ({ quality }) => {
  let bars = 4;
  let color = '#22c55e';
  
  if (quality === 'Excellent') {
    bars = 4;
    color = '#22c55e';
  } else if (quality === 'Good') {
    bars = 3;
    color = '#10b981';
  } else if (quality === 'Fair') {
    bars = 2;
    color = '#eab308';
  } else if (quality === 'Poor') {
    bars = 1;
    color = '#ef4444';
  } else if (quality === 'Reconnecting') {
    bars = 0;
    color = '#ef4444';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`Network Quality: ${quality}`}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
        {[1, 2, 3, 4].map(barNum => {
          const isActive = barNum <= bars;
          let height = barNum * 3 + 2;
          return (
            <div
              key={barNum}
              style={{
                width: '3px',
                height: `${height}px`,
                background: isActive ? color : 'rgba(255,255,255,0.2)',
                borderRadius: '1px',
                transition: 'background 0.3s'
              }}
            />
          );
        })}
      </div>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
        {quality}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════════════

const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const PhoneOff = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67"/>
    <path d="M2 2l20 20"/>
    <path d="M3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91"/>
  </svg>
);

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="1" width="6" height="12" rx="3"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOff = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const VideoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

const VideoOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const ScreenShareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <path d="M12 13V7M12 7l-3 3M12 7l3 3" />
  </svg>
);

const FlipCameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-2-2h-3.17l-1.24-1.86A2 2 0 0 0 12.93 3H11.07a2 2 0 0 0-1.66.86L8.17 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
    <path d="M9.5 12a2.5 2.5 0 0 1 4.5-1.5" />
    <polyline points="14 8 14 10.5 11.5 10.5" />
    <path d="M14.5 12a2.5 2.5 0 0 1-4.5 1.5" />
    <polyline points="10 16 10 13.5 12.5 13.5" />
  </svg>
);

const PhoneHangup = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)' }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const SpeakerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const SpeakerLoudIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default CallScreen;
