/**
 * @file DonutChart.tsx
 * @description Segmented SVG Donut Chart representing project statuses.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import useTheme from '../../../shared/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  total: number;
  size?: number;
  strokeWidth?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  total,
  size = 140,
  strokeWidth = 14,
}) => {
  const { colors, typography, isDark } = useTheme();
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animation progress from 0 to 1
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [data]);

  // If no items or total is 0, show a fallback empty gray circle
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={[styles.totalNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>0</Text>
          <Text style={[styles.totalLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Projects</Text>
        </View>
      </View>
    );
  }

  // Calculate cumulative offsets
  let accumulatedPercent = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Base Background Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? '#1F2937' : '#F1F5F9'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Render individual status segments */}
          {data.map((segment, index) => {
            if (segment.value === 0) return null;
            
            const percentage = segment.value / total;
            const strokeDash = circumference * percentage;
            // The starting position (offset) of this segment
            const currentOffset = circumference * (1 - accumulatedPercent);
            
            accumulatedPercent += percentage;

            // Animated properties for growing segment transitions
            const animatedCircleProps = useAnimatedProps(() => {
              const currentProgress = animationProgress.value;
              return {
                strokeDashoffset: circumference - (strokeDash * currentProgress) + (circumference - currentOffset),
              };
            });

            return (
              <AnimatedCircle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${circumference} ${circumference}`}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>
      
      {/* Center Text displaying overall total count */}
      <View style={styles.centerLabel}>
        <Text style={[styles.totalNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          {total}
        </Text>
        <Text style={[styles.totalLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
          Total Projects
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalNum: {
    fontSize: 26,
    lineHeight: 28,
  },
  totalLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
export default DonutChart;
