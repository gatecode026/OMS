/**
 * @file VoiceRecorder.tsx
 * @description WhatsApp-style voice recording UI.
 * Shows animated pulsing red dot, live waveform bars, slide-left cancel hint,
 * and a lock indicator. PanResponder detects swipe gestures passed from MessageComposer.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';

const NUM_BARS = 20;
const CYCLE_MS = 180;

interface VoiceRecorderProps {
  isRecording: boolean;
  recordingDuration: number;
  recordingLocked: boolean;
  onCancel: () => void;
  lockProgress?: number; // 0–1 filled lock indicator
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  recordingDuration,
  recordingLocked,
  onCancel,
  lockProgress = 0,
}) => {
  const { colors, typography } = useTheme();

  // Pulsing red dot animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Waveform bar heights
  const barAnims = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(4))
  ).current;
  // Slide hint fade animation
  const slideHintAnim = useRef(new Animated.Value(1)).current;
  // Lock fill animation
  const lockAnim = useRef(new Animated.Value(lockProgress)).current;

  // Pulsing dot loop
  useEffect(() => {
    if (!isRecording) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isRecording]);

  // Waveform bars cycling animation
  useEffect(() => {
    if (!isRecording) return;
    const makeBarAnim = (anim: Animated.Value, idx: number) => {
      const heights = [4, 6, 10, 14, 18, 22, 16, 10, 6, 4];
      return Animated.loop(
        Animated.sequence([
          Animated.delay(idx * (CYCLE_MS / NUM_BARS)),
          Animated.timing(anim, {
            toValue: heights[Math.floor(Math.random() * heights.length)],
            duration: CYCLE_MS,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 4,
            duration: CYCLE_MS,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const anims = barAnims.map((a, idx) => makeBarAnim(a, idx));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [isRecording]);

  // Slide hint blinking loop
  useEffect(() => {
    if (recordingLocked) return;
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(slideHintAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(slideHintAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [recordingLocked]);

  // Lock fill animation
  useEffect(() => {
    Animated.timing(lockAnim, {
      toValue: lockProgress,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [lockProgress]);

  if (!isRecording) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const lockHeight = lockAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Pulsing red recording dot */}
      <Animated.View
        style={[
          styles.recDot,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />

      {/* Recording timer */}
      <Text style={[styles.timerText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
        {formatTime(recordingDuration)}
      </Text>

      {/* Waveform bars */}
      <View style={styles.waveformContainer}>
        {barAnims.map((anim, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.waveBar,
              {
                height: anim,
                backgroundColor: colors.danger,
                opacity: 0.6 + (idx % 3) * 0.13,
              },
            ]}
          />
        ))}
      </View>

      {/* Slide-to-cancel hint or "Locked" label */}
      {recordingLocked ? (
        <Text style={[styles.lockedLabel, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>
          Locked ↑
        </Text>
      ) : (
        <Animated.View style={{ opacity: slideHintAnim, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={12} color={colors.textMuted} />
          <Text style={[styles.slideHintText, { color: colors.textMuted }]}>Slide to cancel</Text>
        </Animated.View>
      )}

      {/* Lock fill indicator (right side) */}
      {!recordingLocked && (
        <View style={styles.lockTrack}>
          <Animated.View style={[styles.lockFill, { height: lockHeight }]} />
          <Ionicons
            name="lock-closed"
            size={14}
            color={lockProgress > 0.5 ? colors.primary : colors.textLight}
            style={styles.lockIcon}
          />
        </View>
      )}

      {/* Cancel button (visible when NOT locked) */}
      {!recordingLocked && (
        <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={10}>
          <Ionicons name="close-circle" size={22} color={colors.danger} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    height: 38,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  timerText: {
    fontSize: 13,
    marginRight: 8,
    minWidth: 38,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    flex: 1,
    gap: 2,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  slideHintText: {
    fontSize: 10,
    marginLeft: 2,
  },
  lockedLabel: {
    fontSize: 11,
    marginLeft: 8,
  },
  lockTrack: {
    width: 16,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.4)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginLeft: 8,
    position: 'relative',
  },
  lockFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  lockIcon: {
    position: 'absolute',
    top: -2,
    left: 1,
  },
  cancelBtn: {
    marginLeft: 6,
  },
});

export default VoiceRecorder;
