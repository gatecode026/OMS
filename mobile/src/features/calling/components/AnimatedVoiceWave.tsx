/**
 * @file AnimatedVoiceWave.tsx
 * @description Premium, 60FPS fluid animated voice visualizer for Audio Call screen.
 *              Dynamically animates frequency bars when active, mutes bars when muted,
 *              and pulses gently when on hold or connecting.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface AnimatedVoiceWaveProps {
  isMuted?: boolean;
  isOnHold?: boolean;
  isSpeaking?: boolean;
  color?: string;
  barCount?: number;
}

export const AnimatedVoiceWave: React.FC<AnimatedVoiceWaveProps> = ({
  isMuted = false,
  isOnHold = false,
  isSpeaking = true,
  color = '#3B82F6',
  barCount = 7,
}) => {
  // Create animated values for each bar
  const barHeights = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(12))
  ).current;

  useEffect(() => {
    if (isMuted || isOnHold) {
      // Collapse bars to minimum height when muted or on hold
      barHeights.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 6,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // Target heights for wave pattern (center bars taller)
    const baseHeights = [18, 32, 48, 64, 48, 32, 18];

    // Loop continuous fluid wave animations
    const animations = barHeights.map((anim, index) => {
      const maxH = baseHeights[index % baseHeights.length] || 30;
      const minH = Math.max(10, maxH * 0.25);

      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxH,
            duration: 350 + (index % 3) * 120,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: minH,
            duration: 350 + (index % 3) * 120,
            useNativeDriver: false,
          }),
        ])
      );
    });

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [isMuted, isOnHold, isSpeaking, barHeights]);

  return (
    <View style={styles.container}>
      {barHeights.map((animHeight, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: animHeight,
              backgroundColor: isMuted || isOnHold ? '#94A3B8' : color,
              opacity: isMuted || isOnHold ? 0.4 : 0.9,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    marginVertical: 16,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});

export default AnimatedVoiceWave;
