/**
 * @file SplashScreen.tsx
 * @description Enterprise Splash Screen & App Initialization View.
 *              100% layout, spacing, and visual match to the Gatecode Pvt Technologies mockup.
 *              Inherits colors dynamically from the Theme & Branding engine (no hardcoded blue).
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, Image, ImageStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import useTheme from '../hooks/useTheme';
import useBranding from '../hooks/useBranding';
import { Logo } from './Logo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');



const INIT_MESSAGES = [
  'Preparing your workspace...',
  'Loading company profile...',
  'Checking secure session...',
  'Loading user preferences...',
  'Loading dashboard widgets...',
  'Connecting securely...',
  'Synchronizing offline data...',
];

interface SplashScreenProps {
  progressValue?: number; // Optional controlled progress, otherwise runs self-simulation
  statusText?: string;   // Optional custom status text
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  progressValue,
  statusText,
}) => {
  const { colors, isDark, typography } = useTheme();
  const branding = useBranding();

  // Animation values
  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const selfProgress = useSharedValue(0);
  const spinnerRotation = useSharedValue(0);
  
  // Rotating status message state
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(statusText || INIT_MESSAGES[0]);
  const textOpacity = useSharedValue(1);

  // Animations initialization
  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.2)) });
    logoOpacity.value = withTiming(1, { duration: 800 });
    contentOpacity.value = withTiming(1, { duration: 1000, easing: Easing.ease });

    spinnerRotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );

    if (progressValue === undefined) {
      selfProgress.value = withTiming(1, { duration: 4000, easing: Easing.linear });
    }
  }, [logoScale, logoOpacity, contentOpacity, spinnerRotation, selfProgress, progressValue]);

  // Status message rotation
  useEffect(() => {
    if (statusText) {
      setCurrentMessage(statusText);
      return;
    }

    const interval = setInterval(() => {
      textOpacity.value = withTiming(0, { duration: 250 }, () => {
        const nextIndex = (messageIndex + 1) % INIT_MESSAGES.length;
        runOnJS(setMessageIndex)(nextIndex);
        runOnJS(setCurrentMessage)(INIT_MESSAGES[nextIndex]);
        textOpacity.value = withTiming(1, { duration: 250 });
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [messageIndex, textOpacity, statusText]);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => {
    const p = progressValue !== undefined ? progressValue : selfProgress.value;
    return {
      width: `${p * 100}%`,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotation.value}deg` }],
  }));

  const activeBg = isDark ? '#090D16' : '#F8FAFC';
  const textDarkColor = isDark ? '#FFFFFF' : '#0F172A';

  // Render a grid of dots matching the mockup design
  const renderDotGrid = (startX: number, startY: number, cols: number, rows: number) => {
    const dots = [];
    const spacing = 10;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push(
          <Circle
            key={`${r}-${c}`}
            cx={startX + c * spacing}
            cy={startY + r * spacing}
            r="1.5"
            fill={colors.primary}
            opacity={isDark ? 0.04 : 0.07}
          />
        );
      }
    }
    return dots;
  };

  return (
    <View style={[styles.container, { backgroundColor: activeBg }]} accessibilityLabel="Gatecode OMS Loading Screen">
      {/* ── Background Arcs, Dots, and Skyline ── */}
      <View style={styles.bgDecorations} pointerEvents="none">
        <Svg width="100%" height="100%">
          {/* Top Left Concentric Arcs */}
          <Circle cx="0" cy="0" r="160" stroke={colors.primary} strokeWidth="1.5" fill="none" opacity={isDark ? 0.05 : 0.06} />
          <Circle cx="0" cy="0" r="230" stroke={colors.primary} strokeWidth="1.5" fill="none" opacity={isDark ? 0.03 : 0.04} />
          <Circle cx="0" cy="0" r="300" stroke={colors.primary} strokeWidth="1.5" fill="none" opacity={isDark ? 0.015 : 0.02} />

          {/* Top Right Dot Grid */}
          {renderDotGrid(SCREEN_WIDTH - 65, 45, 6, 18)}

          {/* Bottom Left Dot Grid */}
          {renderDotGrid(15, SCREEN_HEIGHT - 380, 6, 18)}

          {/* Bottom skyline silhouette background path */}
          <Path
            d={`
              M 0 ${SCREEN_HEIGHT - 120} 
              L 0 ${SCREEN_HEIGHT - 180} 
              L 15 ${SCREEN_HEIGHT - 180} 
              L 15 ${SCREEN_HEIGHT - 210} 
              L 35 ${SCREEN_HEIGHT - 210} 
              L 35 ${SCREEN_HEIGHT - 190} 
              L 45 ${SCREEN_HEIGHT - 190} 
              L 45 ${SCREEN_HEIGHT - 240} 
              L 70 ${SCREEN_HEIGHT - 240} 
              L 70 ${SCREEN_HEIGHT - 200} 
              L 85 ${SCREEN_HEIGHT - 200} 
              L 85 ${SCREEN_HEIGHT - 220} 
              L 105 ${SCREEN_HEIGHT - 220} 
              L 105 ${SCREEN_HEIGHT - 190} 
              L 125 ${SCREEN_HEIGHT - 190} 
              L 125 ${SCREEN_HEIGHT - 260} 
              L 155 ${SCREEN_HEIGHT - 260} 
              L 155 ${SCREEN_HEIGHT - 210} 
              L 175 ${SCREEN_HEIGHT - 210} 
              L 175 ${SCREEN_HEIGHT - 235} 
              L 195 ${SCREEN_HEIGHT - 235} 
              L 195 ${SCREEN_HEIGHT - 200} 
              L 215 ${SCREEN_HEIGHT - 200} 
              L 215 ${SCREEN_HEIGHT - 190} 
              L 235 ${SCREEN_HEIGHT - 190} 
              L 235 ${SCREEN_HEIGHT - 250} 
              L 260 ${SCREEN_HEIGHT - 250} 
              L 260 ${SCREEN_HEIGHT - 210} 
              L 280 ${SCREEN_HEIGHT - 210} 
              L 280 ${SCREEN_HEIGHT - 230} 
              L 305 ${SCREEN_HEIGHT - 230} 
              L 305 ${SCREEN_HEIGHT - 190} 
              L 325 ${SCREEN_HEIGHT - 190} 
              L 325 ${SCREEN_HEIGHT - 270} 
              L 355 ${SCREEN_HEIGHT - 270} 
              L 355 ${SCREEN_HEIGHT - 210} 
              L 375 ${SCREEN_HEIGHT - 210} 
              L 375 ${SCREEN_HEIGHT - 180} 
              L ${SCREEN_WIDTH} ${SCREEN_HEIGHT - 180} 
              L ${SCREEN_WIDTH} ${SCREEN_HEIGHT} 
              L 0 ${SCREEN_HEIGHT} Z
            `}
            fill={colors.primary}
            opacity={isDark ? 0.025 : 0.045}
          />
        </Svg>
      </View>

      {/* ── Top Header Logo: "GATECODE" ── */}
      <Animated.View style={[styles.logoSection, logoStyle]}>
        <Logo size={60} animated={true} />

        <Text style={[styles.gatecodeTitle, { color: textDarkColor, fontFamily: typography.fonts.bold }]}>
          GATECODE
        </Text>

        {/* Spaced "PVT TECHNOLOGIES" tagline with horizontal side lines */}
        <View style={styles.subTitleRow}>
          <View style={[styles.titleDividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]} />
          <Text style={[styles.pvtText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
            PVT TECHNOLOGIES
          </Text>
          <View style={[styles.titleDividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]} />
        </View>

        {/* Dynamic accent line */}
        <View style={[styles.accentLine, { backgroundColor: colors.secondary }]} />

        {/* Brand Slogans */}
        <Text style={[styles.slogan, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
          One Platform. Many Solutions.
        </Text>
        <Text style={[styles.sloganHighlight, { color: colors.secondary, fontFamily: typography.fonts.semibold }]}>
          Infinite Possibilities.
        </Text>
      </Animated.View>

      {/* ── Middle Circular Skyline Card ── */}
      <Animated.View style={[styles.brandPanel, contentStyle]}>
        <View
          style={[
            styles.brandCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              shadowColor: colors.primary,
            },
          ]}
        >
          <Svg width="64" height="64" viewBox="0 0 100 100" fill="none">
            <Defs>
              <LinearGradient id="buildGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.secondary} />
                <Stop offset="100%" stopColor={colors.primary} />
              </LinearGradient>
            </Defs>

            {/* Flying birds */}
            <Path d="M 12 36 Q 16 33 20 36 Q 17 38 12 36 Z" fill="url(#buildGrad)" opacity={0.4} />
            <Path d="M 22 28 Q 25 26 28 28 Q 26 30 22 28 Z" fill="url(#buildGrad)" opacity={0.4} />

            {/* Building 1 (Left) */}
            <Rect x="22" y="50" width="14" height="32" rx="2" fill="url(#buildGrad)" opacity={0.7} />
            <Circle cx="29" cy="58" r="1.5" fill="#FFFFFF" />
            <Circle cx="29" cy="66" r="1.5" fill="#FFFFFF" />
            <Circle cx="29" cy="74" r="1.5" fill="#FFFFFF" />

            {/* Building 2 (Center - tallest) */}
            <Rect x="42" y="26" width="18" height="56" rx="3" fill="url(#buildGrad)" />
            <Circle cx="51" cy="36" r="2" fill="#FFFFFF" />
            <Circle cx="51" cy="46" r="2" fill="#FFFFFF" />
            <Circle cx="51" cy="56" r="2" fill="#FFFFFF" />
            <Circle cx="51" cy="66" r="2" fill="#FFFFFF" />
            <Circle cx="51" cy="76" r="2" fill="#FFFFFF" />

            {/* Building 3 (Right) */}
            <Rect x="66" y="42" width="14" height="40" rx="2" fill="url(#buildGrad)" opacity={0.85} />
            <Circle cx="73" cy="50" r="1.5" fill="#FFFFFF" />
            <Circle cx="73" cy="60" r="1.5" fill="#FFFFFF" />
            <Circle cx="73" cy="70" r="1.5" fill="#FFFFFF" />

            {/* Tiny trees / bushes at base */}
            <Circle cx="16" cy="80" r="5" fill="url(#buildGrad)" opacity={0.5} />
            <Circle cx="84" cy="80" r="5" fill="url(#buildGrad)" opacity={0.5} />
          </Svg>
        </View>

        {/* Carousel pagination indicators */}
        <View style={styles.carouselDots}>
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
          <View style={[styles.dotActive, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
        </View>
      </Animated.View>

      {/* ── Bootstrapping Spinner & Message ── */}
      <Animated.View style={[styles.bootSection, contentStyle]}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.spinner, spinnerStyle]}>
            <Ionicons name="sync-outline" size={16} color={colors.secondary} />
          </Animated.View>
          <Animated.Text style={[styles.statusText, textAnimatedStyle, { color: colors.text, fontFamily: typography.fonts.medium }]}>
            {currentMessage}
          </Animated.Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <Animated.View style={[styles.progressBarFill, progressStyle, { backgroundColor: colors.primary }]} />
        </View>
      </Animated.View>

      {/* ── Bottom Features row ── */}
      <Animated.View style={[styles.featuresContainer, contentStyle, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        {/* Secure */}
        <View style={styles.featureItem}>
          <Ionicons name="shield-outline" size={24} color={colors.primary} />
          <Text style={[styles.featureTitle, { color: textDarkColor, fontFamily: typography.fonts.semibold }]}>
            Secure
          </Text>
          <Text style={[styles.featureDesc, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
            Enterprise Grade
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />

        {/* Fast */}
        <View style={styles.featureItem}>
          <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
          <Text style={[styles.featureTitle, { color: textDarkColor, fontFamily: typography.fonts.semibold }]}>
            Fast
          </Text>
          <Text style={[styles.featureDesc, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
            Optimized Performance
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />

        {/* Reliable */}
        <View style={styles.featureItem}>
          <Ionicons name="people-outline" size={24} color={colors.primary} />
          <Text style={[styles.featureTitle, { color: textDarkColor, fontFamily: typography.fonts.semibold }]}>
            Reliable
          </Text>
          <Text style={[styles.featureDesc, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
            Always Connected
          </Text>
        </View>
      </Animated.View>

      {/* ── App Metadata Footer ── */}
      <Animated.View style={[styles.metaFooter, contentStyle]}>
        <Text style={[styles.metaText, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
          Version 1.0.0   •   Build 100
        </Text>
        <Text style={[styles.copyright, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
          © 2024 Gatecode Pvt Technologies. All rights reserved.
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  bgDecorations: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  logoSection: {
    zIndex: 1,
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.04,
    width: '100%',
  },
  logoWrapper: {
    width: 60,
    height: 60,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  gatecodeTitle: {
    fontSize: 26,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    gap: 8,
    marginBottom: 12,
  },
  pvtText: {
    fontSize: 10,
    letterSpacing: 3,
  },
  titleDividerLine: {
    flex: 1,
    height: 1,
  },
  accentLine: {
    width: 48,
    height: 2,
    borderRadius: 1,
    marginBottom: 14,
  },
  slogan: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  sloganHighlight: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  brandPanel: {
    alignItems: 'center',
    zIndex: 1,
    width: '100%',
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  brandCard: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },
  carouselDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 12,
    height: 6,
    borderRadius: 3,
  },
  bootSection: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  spinner: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  progressBarBg: {
    width: '75%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  featuresContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 11,
    marginTop: 6,
  },
  featureDesc: {
    fontSize: 9.5,
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 28,
  },
  metaFooter: {
    alignItems: 'center',
    zIndex: 1,
    marginTop: 6,
  },
  metaText: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  copyright: {
    fontSize: 9.5,
    textAlign: 'center',
  },
});

export default SplashScreen;
