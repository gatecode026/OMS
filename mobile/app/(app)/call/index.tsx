/**
 * @file index.tsx
 * @description Screen for Active Audio & Video calls.
 *              Implements the exact layout from the reference mockup with high visual fidelity,
 *              including a draggable local video window and DTMF keypad.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

let RTCView: any = null;
try {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
} catch (e) {
  console.log('[WebRTC] RTCView native component not available.');
}
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import useTheme from '../../../src/shared/hooks/useTheme';
import { useCall } from '../../../src/shared/providers/CallProvider';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  
  const {
    activeCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isFrontCamera,
    callDuration,
    toggleMute,
    toggleVideo,
    flipCamera,
  } = useCall();

  const [isSpeakerActive, setIsSpeakerActive] = useState(false);
  const [keypadVisible, setKeypadVisible] = useState(false);
  const [typedDigits, setTypedDigits] = useState('');

  // Draggable Local Video Pip Positions
  const pipPosition = useRef(new RNAnimated.ValueXY({ x: SCREEN_WIDTH - 120, y: 100 })).current;
  const pipPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pipPosition.setOffset({
          // @ts-ignore
          x: pipPosition.x._value,
          // @ts-ignore
          y: pipPosition.y._value,
        });
        pipPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: RNAnimated.event(
        [null, { dx: pipPosition.x, dy: pipPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pipPosition.flattenOffset();
      },
    })
  ).current;

  // Animation values for 15 audio calling waveform bars
  const bars = Array.from({ length: 15 }, () => useSharedValue(15));

  // Ringing pulse animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Start pulsing waveform animation for audio call
    if (activeCall?.status === 'active' && activeCall.callType === 'audio') {
      bars.forEach((bar, idx) => {
        const targetHeight = 15 + Math.random() * 50;
        const duration = 300 + Math.random() * 400;
        bar.value = withRepeat(
          withSequence(
            withTiming(targetHeight, { duration }),
            withTiming(15, { duration })
          ),
          -1,
          true
        );
      });
    }
  }, [activeCall?.status, activeCall?.callType]);

  useEffect(() => {
    // Start pulsing circular indicators for incoming calls
    if (activeCall?.status === 'ringing') {
      pulseScale.value = withRepeat(withSequence(withTiming(1.3, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
      pulseOpacity.value = withRepeat(withSequence(withTiming(0.2, { duration: 1000 }), withTiming(0.6, { duration: 1000 })), -1, true);
    }
  }, [activeCall?.status]);

  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isIncomingRinging = activeCall?.isIncoming && activeCall?.status === 'ringing';
  const isOutgoingRinging = !activeCall?.isIncoming && activeCall?.status === 'ringing';
  const isVideo = activeCall?.callType === 'video';
  const isActive = activeCall?.status === 'active';

  // Pulsing circle animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  if (!activeCall) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>No active call session</Text>
      </View>
    );
  }

  // Render Incoming Call Screen
  if (isIncomingRinging) {
    return (
      <View style={[styles.container, { backgroundColor: '#090D16' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.ringingHeader, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={styles.ringingHeaderSub}>INCOMING {activeCall.callType.toUpperCase()} CALL</Text>
        </View>

        <View style={styles.ringingAvatarContainer}>
          <Animated.View style={[styles.ringingPulseCircle, pulseStyle]} />
          <Avatar name={activeCall.targetUser.name} size={150} source={activeCall.targetUser.avatar || undefined} />
        </View>

        <View style={styles.ringingInfoContainer}>
          <Text style={styles.ringingName}>{activeCall.targetUser.name}</Text>
          <Text style={styles.ringingRole}>{activeCall.targetUser.department || 'Operations'} · {activeCall.targetUser.role || 'Staff'}</Text>
        </View>

        {/* Incoming Accept/Decline action buttons */}
        <View style={[styles.incomingButtonsRow, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <Pressable onPress={rejectCall} style={[styles.circularActionBtn, { backgroundColor: colors.danger }]}>
            <Ionicons name="call-outline" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
          <Pressable onPress={acceptCall} style={[styles.circularActionBtn, { backgroundColor: colors.success }]}>
            <Ionicons name="call-outline" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  // Render Outgoing Dialing/Ringing Screen
  if (isOutgoingRinging) {
    return (
      <View style={[styles.container, { backgroundColor: '#090D16' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.ringingHeader, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={styles.ringingHeaderSub}>DIALING...</Text>
        </View>

        <View style={styles.ringingAvatarContainer}>
          <Animated.View style={[styles.ringingPulseCircle, pulseStyle]} />
          <Avatar name={activeCall.targetUser.name} size={150} source={activeCall.targetUser.avatar || undefined} />
        </View>

        <View style={styles.ringingInfoContainer}>
          <Text style={styles.ringingName}>{activeCall.targetUser.name}</Text>
          <Text style={styles.ringingRole}>Connecting to server...</Text>
        </View>

        <View style={[styles.incomingButtonsRow, { paddingBottom: insets.bottom + spacing.xxl, justifyContent: 'center' }]}>
          <Pressable onPress={endCall} style={[styles.circularActionBtn, { backgroundColor: colors.danger }]}>
            <Ionicons name="call-outline" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
        </View>
      </View>
    );
  }

  // Render Active Video Call Screen
  if (isActive && isVideo) {
    return (
      <View style={styles.videoContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Remote Video Stream Fullscreen */}
        {RTCView && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
            mirror={!isFrontCamera}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' }]}>
            <Avatar name={activeCall.targetUser.name} size={120} source={activeCall.targetUser.avatar || undefined} />
            <Text style={{ color: '#FFFFFF', marginTop: spacing.md, fontFamily: typography.fonts.medium }}>
              {RTCView ? 'Waiting for remote video...' : 'Video Call active (Simulation)'}
            </Text>
          </View>
        )}

        {/* Local Video Stream Pip (Floating, Draggable) */}
        {!isVideoOff && (
          <RNAnimated.View
            style={[
              styles.pipWindow,
              pipPosition.getLayout(),
            ]}
            {...pipPanResponder.panHandlers}
          >
            {RTCView && localStream ? (
              <RTCView
                streamURL={localStream.toURL()}
                style={StyleSheet.absoluteFillObject}
                objectFit="cover"
                mirror={isFrontCamera}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person-outline" size={24} color="#94A3B8" />
              </View>
            )}
          </RNAnimated.View>
        )}

        {/* Header Overlay (LIVE badge and Caller Details) */}
        <View style={[styles.videoOverlayHeader, { top: insets.top + spacing.md }]}>
          <Pressable onPress={endCall} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.liveTimerBadge}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.liveTimerText}>LIVE {formatDuration(callDuration)}</Text>
            <Ionicons name="wifi" size={12} color="#10B981" style={{ marginLeft: 6 }} />
          </View>
        </View>

        <View style={[styles.videoOverlayDetails, { top: insets.top + 70 }]}>
          <Text style={styles.videoCallerName}>{activeCall.targetUser.name}</Text>
          <Text style={styles.videoCallerRole}>{activeCall.targetUser.role || 'Operations Director'}</Text>
        </View>

        {/* Video Call Controls Bottom Panel */}
        <View style={[styles.videoControlsPanel, { bottom: insets.bottom + spacing.lg }]}>
          <View style={styles.videoControlsRow}>
            {/* Mic Toggle */}
            <Pressable
              onPress={toggleMute}
              style={[styles.videoControlBtn, isMuted && styles.controlBtnSelected]}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color={isMuted ? '#FFFFFF' : '#D1D5DB'} />
            </Pressable>

            {/* Video Toggle */}
            <Pressable
              onPress={toggleVideo}
              style={[styles.videoControlBtn, isVideoOff && styles.controlBtnSelected]}
            >
              <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={22} color={isVideoOff ? '#FFFFFF' : '#D1D5DB'} />
            </Pressable>

            {/* Red End Call Circular Button */}
            <Pressable onPress={endCall} style={styles.endCallCircularBtn}>
              <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>

            {/* Camera Switch (Flip) */}
            <Pressable onPress={flipCamera} style={styles.videoControlBtn}>
              <Ionicons name="camera-reverse" size={22} color="#D1D5DB" />
            </Pressable>

            {/* More Options */}
            <Pressable onPress={() => toast.info('Video calling features fully connected')} style={styles.videoControlBtn}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#D1D5DB" />
            </Pressable>
          </View>

          {/* End-to-end encrypted label */}
          <View style={styles.encryptedBadgeRow}>
            <Ionicons name="lock-closed" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
            <Text style={styles.encryptedText}>End-to-end encrypted</Text>
          </View>
        </View>
      </View>
    );
  }

  // Render Active Audio Call Screen
  const isLight = !isDark;
  return (
    <View style={[styles.container, { backgroundColor: isLight ? '#F8FAFC' : '#090D16' }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.audioHeader, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={endCall} style={styles.audioBackBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.audioHeaderTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Active Audio Call
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="lock-closed" size={11} color="#10B981" style={{ marginRight: 3 }} />
            <Text style={{ fontSize: 10.5, color: '#10B981', fontWeight: '600' }}>End-to-end Encrypted</Text>
          </View>
        </View>
        <Pressable onPress={() => {}} style={styles.audioBackBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Profile Details Container */}
      <View style={styles.audioProfileWrapper}>
        <View style={styles.audioAvatarContainer}>
          <Avatar name={activeCall.targetUser.name} size={150} source={activeCall.targetUser.avatar || undefined} />
          <View style={[styles.audioPresenceDot, { backgroundColor: '#10B981', borderColor: isLight ? '#F8FAFC' : '#090D16' }]} />
        </View>
        
        <Text style={[styles.audioCallerName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          {activeCall.targetUser.name}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fonts.medium, marginTop: 2 }}>
          {activeCall.targetUser.department || 'Operations'} · {activeCall.targetUser.role || 'Staff'}
        </Text>

        {/* Timer Dot */}
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
            {formatDuration(callDuration)}
          </Text>
        </View>
      </View>

      {/* 15 Bar Waveform graphic */}
      <View style={styles.waveformContainer}>
        {bars.map((barVal, idx) => {
          const barStyle = useAnimatedStyle(() => ({
            height: barVal.value,
          }));
          return (
            <Animated.View
              key={idx}
              style={[
                styles.waveBar,
                { backgroundColor: colors.primary },
                barStyle,
              ]}
            />
          );
        })}
      </View>

      {/* White/Dark rounded bottom controls panel */}
      <View
        style={[
          styles.audioControlsDrawer,
          {
            backgroundColor: isLight ? '#FFFFFF' : colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + spacing.xl,
          },
          shadows.heavy,
        ]}
      >
        <View style={styles.audioControlRow}>
          {/* Mute Button */}
          <View style={styles.audioControlItem}>
            <Pressable
              onPress={toggleMute}
              style={[styles.audioActionCircle, isMuted && [styles.audioCircleActive, { backgroundColor: colors.neutralLight }]]}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color={isMuted ? colors.primary : colors.text} />
            </Pressable>
            <Text style={[styles.audioActionLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Mute
            </Text>
          </View>

          {/* Speaker Button */}
          <View style={styles.audioControlItem}>
            <Pressable
              onPress={() => setIsSpeakerActive(!isSpeakerActive)}
              style={[
                styles.audioActionCircle,
                isSpeakerActive ? [styles.audioCircleActive, { backgroundColor: colors.primary }] : null,
              ]}
            >
              <Ionicons name="volume-high" size={22} color={isSpeakerActive ? '#FFFFFF' : colors.text} />
            </Pressable>
            <Text style={[styles.audioActionLabel, { color: isSpeakerActive ? colors.primary : colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Speaker
            </Text>
          </View>

          {/* Keypad Button */}
          <View style={styles.audioControlItem}>
            <Pressable onPress={() => setKeypadVisible(true)} style={styles.audioActionCircle}>
              <Ionicons name="keypad" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.audioActionLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Keypad
            </Text>
          </View>
        </View>

        {/* Pill Shaped red End Call button */}
        <Pressable onPress={endCall} style={[styles.endCallPillBtn, { backgroundColor: colors.danger }]}>
          <Ionicons name="call" size={20} color="#FFFFFF" style={{ marginRight: 8, transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.endCallPillText}>End Call</Text>
        </Pressable>
      </View>

      {/* DTMF Keypad Modal Overlay */}
      <Modal
        visible={keypadVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setKeypadVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.6)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setKeypadVisible(false)}
        >
          <Pressable
            style={{ width: '80%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderColor: colors.border, borderWidth: 1 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold, textAlign: 'center', marginBottom: spacing.md }}>
              Keypad Dialpad
            </Text>
            
            <View style={{ height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, justifyContent: 'center', paddingHorizontal: 12, marginBottom: spacing.lg }}>
              <Text style={{ color: colors.text, fontSize: 18, letterSpacing: 2, fontFamily: typography.fonts.semibold }}>{typedDigits}</Text>
            </View>

            <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((char) => (
                <Pressable
                  key={char}
                  onPress={() => setTypedDigits((prev) => prev + char)}
                  style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 20, color: colors.text, fontFamily: typography.fonts.semibold }}>{char}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl }}>
              <Pressable
                onPress={() => setTypedDigits('')}
                style={{ paddingVertical: 8, paddingHorizontal: 12 }}
              >
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Clear</Text>
              </Pressable>
              <Pressable
                onPress={() => setKeypadVisible(false)}
                style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 20 }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringingHeader: {
    alignItems: 'center',
    width: '100%',
  },
  ringingHeaderSub: {
    color: '#94A3B8',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  ringingAvatarContainer: {
    height: 250,
    width: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringingPulseCircle: {
    position: 'absolute',
    height: 180,
    width: 180,
    borderRadius: 90,
    backgroundColor: '#3B82F6',
    zIndex: -1,
  },
  ringingInfoContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 60,
  },
  ringingName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ringingRole: {
    color: '#94A3B8',
    fontSize: 14,
  },
  incomingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginBottom: 30,
  },
  circularActionBtn: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  audioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    height: 56,
  },
  audioBackBtn: {
    padding: 8,
  },
  audioHeaderTitle: {
    fontSize: 17,
  },
  audioProfileWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  audioAvatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  audioPresenceDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
  audioCallerName: {
    fontSize: 22,
    marginBottom: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timerText: {
    fontSize: 15,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: '100%',
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 3.5,
  },
  audioControlsDrawer: {
    width: SCREEN_WIDTH - 24,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  audioControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  audioControlItem: {
    alignItems: 'center',
  },
  audioActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  audioCircleActive: {
    elevation: 2,
  },
  audioActionLabel: {
    fontSize: 12,
  },
  endCallPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 26,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  endCallPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pipWindow: {
    position: 'absolute',
    width: 100,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    zIndex: 10,
    elevation: 5,
  },
  videoOverlayHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  backButton: {
    padding: 8,
  },
  liveTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveTimerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  videoOverlayDetails: {
    position: 'absolute',
    left: 16,
    zIndex: 5,
  },
  videoCallerName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  videoCallerRole: {
    color: '#E2E8F0',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoControlsPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    zIndex: 5,
  },
  videoControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  videoControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  endCallCircularBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  encryptedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  encryptedText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '500',
  },
});
