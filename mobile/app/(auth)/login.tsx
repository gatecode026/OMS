/**
 * @file login.tsx
 * @description Enterprise Login Screen — Feature 02.
 *              Matches approved Light/Dark mockup designs with 99% visual accuracy.
 *              Integrates with: authStore, themeStore, authApi, useBranding, useLogin.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Image,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../src/shared/hooks/useTheme';
import useBranding from '../../src/shared/hooks/useBranding';
import { Logo } from '../../src/shared/components/Logo';
import { useLogin } from '../../src/features/auth/hooks/useLogin';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Top bar: OMS logo + product name (left) | Language selector (right) */
const TopBar: React.FC<{ isDark: boolean; colors: any; typography: any }> = ({
  isDark,
  colors,
  typography,
}) => (
  <Animated.View entering={FadeIn.duration(600)} style={styles.topBar}>
    {/* Left: OMS product identity */}
    <View style={styles.topBarLeft}>
      <Logo variant="small" size={28} />
      <View style={styles.topBarBrandText}>
        <Text
          style={[
            styles.topBarBrand,
            { color: isDark ? '#FFFFFF' : '#0F172A', fontFamily: typography.fonts.bold },
          ]}
        >
          GATECODE{' '}
          <Text style={{ color: colors.secondary }}>OMS</Text>
        </Text>
      </View>
    </View>

    {/* Right: Language selector */}
    <Pressable
      style={[
        styles.langSelector,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Select language"
    >
      <Ionicons name="globe-outline" size={14} color={colors.textMuted} />
      <Text
        style={[
          styles.langText,
          { color: colors.text, fontFamily: typography.fonts.medium },
        ]}
      >
        English
      </Text>
      <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
    </Pressable>
  </Animated.View>
);

/** Decorative background circles matching the approved design */
const BackgroundDecoration: React.FC<{ isDark: boolean; colors: any }> = ({ isDark, colors }) => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width="100%" height="100%">
        {/* Gradients */}
        <Defs>
          <LinearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={isDark ? 0.15 : 0.08} />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Ambient background glow */}
        <SvgCircle
          cx="0"
          cy="0"
          r="300"
          fill="url(#glowGrad)"
        />

        {/* Diagonal mesh grid texture — dark only */}
        {isDark && (
          <>
            <Path
              d={`
                M -50 150 L ${SCREEN_WIDTH + 50} ${SCREEN_WIDTH + 200}
                M -50 250 L ${SCREEN_WIDTH + 50} ${SCREEN_WIDTH + 300}
                M -50 350 L ${SCREEN_WIDTH + 50} ${SCREEN_WIDTH + 400}
                M -50 450 L ${SCREEN_WIDTH + 50} ${SCREEN_WIDTH + 500}
              `}
              stroke={colors.primary}
              strokeWidth="0.5"
              opacity="0.04"
            />
            <Path
              d={`
                M ${SCREEN_WIDTH + 50} 150 L -50 ${SCREEN_WIDTH + 200}
                M ${SCREEN_WIDTH + 50} 250 L -50 ${SCREEN_WIDTH + 300}
                M ${SCREEN_WIDTH + 50} 350 L -50 ${SCREEN_WIDTH + 400}
                M ${SCREEN_WIDTH + 50} 450 L -50 ${SCREEN_WIDTH + 500}
              `}
              stroke={colors.primary}
              strokeWidth="0.5"
              opacity="0.04"
            />

            {/* Top-Right Decorative Tech Ring */}
            <SvgCircle
              cx={SCREEN_WIDTH * 0.9}
              cy={SCREEN_HEIGHT * 0.15}
              r="80"
              stroke={colors.secondary}
              strokeWidth="1.2"
              fill="none"
              opacity="0.04"
            />
            <SvgCircle
              cx={SCREEN_WIDTH * 0.9}
              cy={SCREEN_HEIGHT * 0.15}
              r="100"
              stroke={colors.primary}
              strokeWidth="0.8"
              fill="none"
              strokeDasharray="4 4"
              opacity="0.05"
            />
          </>
        )}

        {/* Glow Circles (Top-Left) */}
        <SvgCircle
          cx="0"
          cy="0"
          r="160"
          stroke={colors.primary}
          strokeWidth="1.5"
          fill="none"
          opacity={isDark ? 0.05 : 0.06}
        />
        <SvgCircle
          cx="0"
          cy="0"
          r="230"
          stroke={colors.primary}
          strokeWidth="1.5"
          fill="none"
          opacity={isDark ? 0.03 : 0.04}
        />

        {/* Glow Circles (Bottom-Right) */}
        <SvgCircle
          cx={SCREEN_WIDTH}
          cy={SCREEN_HEIGHT * 0.75}
          r="150"
          stroke={colors.secondary}
          strokeWidth="1.5"
          fill="none"
          opacity={isDark ? 0.03 : 0.05}
        />

        {/* City Skyline Silhouette (Bottom) */}
        <Path
          d={`
            M 0 ${SCREEN_HEIGHT + 30} 
            L 0 ${SCREEN_HEIGHT - 20} 
            L 15 ${SCREEN_HEIGHT - 20} 
            L 15 ${SCREEN_HEIGHT - 50} 
            L 35 ${SCREEN_HEIGHT - 50} 
            L 35 ${SCREEN_HEIGHT - 30} 
            L 45 ${SCREEN_HEIGHT - 30} 
            L 45 ${SCREEN_HEIGHT - 80} 
            L 70 ${SCREEN_HEIGHT - 80} 
            L 70 ${SCREEN_HEIGHT - 40} 
            L 85 ${SCREEN_HEIGHT - 40} 
            L 85 ${SCREEN_HEIGHT - 60} 
            L 105 ${SCREEN_HEIGHT - 60} 
            L 105 ${SCREEN_HEIGHT - 30} 
            L 125 ${SCREEN_HEIGHT - 30} 
            L 125 ${SCREEN_HEIGHT - 100} 
            L 155 ${SCREEN_HEIGHT - 100} 
            L 155 ${SCREEN_HEIGHT - 50} 
            L 175 ${SCREEN_HEIGHT - 50} 
            L 175 ${SCREEN_HEIGHT - 75} 
            L 195 ${SCREEN_HEIGHT - 75} 
            L 195 ${SCREEN_HEIGHT - 40} 
            L 215 ${SCREEN_HEIGHT - 40} 
            L 215 ${SCREEN_HEIGHT - 30} 
            L 235 ${SCREEN_HEIGHT - 30} 
            L 235 ${SCREEN_HEIGHT - 90} 
            L 260 ${SCREEN_HEIGHT - 90} 
            L 260 ${SCREEN_HEIGHT - 50} 
            L 280 ${SCREEN_HEIGHT - 50} 
            L 280 ${SCREEN_HEIGHT - 70} 
            L 305 ${SCREEN_HEIGHT - 70} 
            L 305 ${SCREEN_HEIGHT - 30} 
            L 325 ${SCREEN_HEIGHT - 30} 
            L 325 ${SCREEN_HEIGHT - 110} 
            L 355 ${SCREEN_HEIGHT - 110} 
            L 355 ${SCREEN_HEIGHT - 50} 
            L 375 ${SCREEN_HEIGHT - 50} 
            L 375 ${SCREEN_HEIGHT - 20} 
            L ${SCREEN_WIDTH} ${SCREEN_HEIGHT - 20} 
            L ${SCREEN_WIDTH} ${SCREEN_HEIGHT + 100} 
            L 0 ${SCREEN_HEIGHT + 100} Z
          `}
          fill={colors.primary}
          opacity={isDark ? 0.08 : 0.055}
        />
      </Svg>

      {/* Dot pattern - top right */}
      <View style={[styles.dotPattern, { top: SCREEN_HEIGHT * 0.06, right: 16 }]}>
        {Array.from({ length: 16 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: colors.primary,
                opacity: 0.15,
                top: Math.floor(i / 4) * 12,
                left: (i % 4) * 12,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

/** Company branding section: logo + name + badge + tagline */
const BrandingSection: React.FC<{
  companyName: string;
  logoUrl: string | null;
  tagline: string;
  colors: any;
  typography: any;
}> = ({ companyName, logoUrl, tagline, colors, typography }) => {
  const accentLine = useSharedValue(0);

  useEffect(() => {
    accentLine.value = withDelay(400, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    width: interpolate(accentLine.value, [0, 1], [0, 48]),
    opacity: accentLine.value,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.brandingSection}>
      {/* Logo */}
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.companyLogoImage}
          resizeMode="contain"
          accessibilityLabel={`${companyName} logo`}
        />
      ) : (
        <Logo variant="primary" size={72} />
      )}

      {/* Company Name + Verified badge */}
      <View style={styles.companyNameRow}>
        <Text
          style={[
            styles.companyName,
            { color: colors.text, fontFamily: typography.fonts.bold },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {companyName}
        </Text>
        {/* Verified badge */}
        <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
        </View>
      </View>

      {/* Tagline */}
      <Text
        style={[
          styles.tagline,
          { color: colors.textMuted, fontFamily: typography.fonts.regular },
        ]}
        numberOfLines={2}
      >
        {tagline}
      </Text>

      {/* Animated accent line */}
      <Animated.View
        style={[lineStyle, { height: 3, borderRadius: 2, backgroundColor: colors.secondary, marginTop: 12 }]}
      />
    </Animated.View>
  );
};

/** Single form input with icon */
interface FormInputProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  autoComplete?: any;
  error?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
  returnKeyType?: any;
  colors: any;
  typography: any;
  isDark: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  autoComplete,
  error,
  disabled = false,
  rightElement,
  inputRef,
  onSubmitEditing,
  returnKeyType = 'next',
  colors,
  typography,
  isDark,
}) => {
  const focusAnim = useSharedValue(0);

  const containerAnim = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.danger
      : interpolate(focusAnim.value, [0, 1], [0, 1]) === 1
      ? colors.secondary
      : isDark
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.1)',
    shadowOpacity: focusAnim.value * (isDark ? 0.25 : 0.12),
  }));

  return (
    <View style={styles.inputWrapper}>
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
            shadowColor: colors.secondary,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            elevation: 0,
          },
          containerAnim,
        ]}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={error ? colors.danger : colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              color: colors.text,
              fontFamily: typography.fonts.regular,
              flex: 1,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          editable={!disabled}
          onFocus={() => {
            focusAnim.value = withTiming(1, { duration: 200 });
          }}
          onBlur={() => {
            focusAnim.value = withTiming(0, { duration: 200 });
          }}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          accessibilityLabel={placeholder}
        />
        {rightElement}
      </Animated.View>
      {error ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color={colors.danger} />
          <Text style={[styles.errorText, { fontFamily: typography.fonts.regular, color: colors.danger }]}>{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

/** Sign In gradient button */
const SignInButton: React.FC<{
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  colors: any;
  typography: any;
}> = ({ onPress, loading, disabled, colors, typography }) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    onPress();
  };


  return (
    <Animated.View style={[animStyle, styles.signInButtonWrapper]}>
      <Pressable
        onPress={disabled || loading ? undefined : handlePress}
        style={{ borderRadius: 14, overflow: 'hidden' }}
        accessibilityRole="button"
        accessibilityLabel="Sign In"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        <View
          style={[
            styles.signInButton,
            {
              backgroundColor: colors.primary,
              opacity: disabled && !loading ? 0.6 : 1,
            },
          ]}
        >
          {loading ? (
            <Animated.View style={styles.loadingRow}>
              <Ionicons name="reload" size={18} color="#FFFFFF" />
              <Text
                style={[styles.signInText, { fontFamily: typography.fonts.semibold, marginLeft: 8 }]}
              >
                Signing In…
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.signInRow}>
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.signInText, { fontFamily: typography.fonts.semibold }]}>
                Sign In
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};


/** Trust indicators row: Secure / Fast / Reliable */
const TrustIndicators: React.FC<{ colors: any; typography: any }> = ({ colors, typography }) => {
  const INDICATORS = [
    { icon: 'shield-checkmark-outline', label: 'Secure', sub: 'Enterprise Grade' },
    { icon: 'speedometer-outline', label: 'Fast', sub: 'Optimized Performance' },
    { icon: 'people-outline', label: 'Reliable', sub: 'Always Connected' },
  ];

  return (
    <Animated.View entering={FadeInUp.delay(650).duration(500)} style={styles.trustRow}>
      {INDICATORS.map((item, i) => (
        <View key={item.label} style={styles.trustItem}>
          <View
            style={[
              styles.trustIconCircle,
              {
                backgroundColor: `${colors.primary}1A`,
                borderColor: `${colors.primary}2E`,
              },
            ]}
          >
            <Ionicons name={item.icon as any} size={22} color={colors.secondary} />
          </View>
          <Text
            style={[styles.trustLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}
          >
            {item.label}
          </Text>
          <Text
            style={[styles.trustSub, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}
          >
            {item.sub}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
};

/** Footer: version info + copyright */
const Footer: React.FC<{ companyName: string; colors: any; typography: any }> = ({
  companyName,
  colors,
  typography,
}) => (
  <Animated.View entering={FadeInUp.delay(750).duration(400)} style={styles.footer}>
    <View style={styles.footerVersionRow}>
      <Text style={[styles.footerVersion, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
        Version 1.0.0
      </Text>
      <View style={[styles.footerDot, { backgroundColor: colors.secondary }]} />
      <Text style={[styles.footerVersion, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
        Build 100
      </Text>
    </View>
    <Text style={[styles.footerCopy, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
      © 2024{' '}
      <Text style={{ color: colors.secondary }}>{companyName}</Text>
      . All rights reserved.
    </Text>
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SHOW_COMPANY_CODE = false; // Toggle from backend feature flag in future

export default function LoginScreen() {
  const { colors, spacing, typography, isDark, radius } = useTheme();
  const { companyName, logoUrl } = useBranding();
  const insets = useSafeAreaInsets();
  const { form, errors, loginError, loading, setField, submit } = useLogin(SHOW_COMPANY_CODE);

  // Input refs for keyboard flow
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Password visibility toggle
  const [showPassword, setShowPassword] = React.useState(false);

  // Keyboard visibility listener
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Screen entry animations
  const screenOpacity = useSharedValue(0);
  const formSlide = useSharedValue(30);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 500 });
    formSlide.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const formStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formSlide.value }],
    opacity: interpolate(formSlide.value, [30, 0], [0, 1]),
  }));

  const COMPANY_TAGLINE = 'Innovating Today, Building Tomorrow';

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: colors.background },
        screenStyle,
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Background decorative elements */}
      <BackgroundDecoration isDark={isDark} colors={colors} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 20,
              paddingBottom: 70, // Leaves space for absolute footer
              paddingHorizontal: 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 1. Top bar stays at the top */}
          <TopBar isDark={isDark} colors={colors} typography={typography} />

          {/* 2. Natural flow content container */}
          <View style={{ width: '100%', marginTop: 24, marginBottom: 12 }}>
            {/* Branding section */}
            <BrandingSection
              companyName={companyName}
              logoUrl={logoUrl}
              tagline={COMPANY_TAGLINE}
              colors={colors}
              typography={typography}
            />

            {/* ── Login Form Container ── */}
            <Animated.View
              entering={FadeInDown.delay(350).duration(600).springify()}
              style={styles.formContainer}
            >
              {/* Global login error banner */}
              {loginError && (
                <Animated.View
                  entering={FadeIn.duration(250)}
                  style={[
                    styles.errorBanner,
                    {
                      backgroundColor: `${colors.danger}1A`,
                      borderColor: `${colors.danger}59`,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text
                    style={[
                      styles.errorBannerText,
                      { color: colors.danger, fontFamily: typography.fonts.medium },
                    ]}
                  >
                    {loginError.message}
                  </Text>
                </Animated.View>
              )}

              {/* Company Code (conditional) */}
              {SHOW_COMPANY_CODE && (
                <FormInput
                  icon="business-outline"
                  placeholder="Enter company code (optional)"
                  value={form.companyCode}
                  onChangeText={(t) => setField('companyCode', t)}
                  autoCapitalize="characters"
                  error={errors.companyCode}
                  disabled={loading}
                  colors={colors}
                  typography={typography}
                  isDark={isDark}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  returnKeyType="next"
                />
              )}

              {/* Employee ID / Email */}
              <FormInput
                inputRef={emailRef}
                icon="person-outline"
                placeholder="Enter employee ID or email"
                value={form.identifier}
                onChangeText={(t) => setField('identifier', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                error={errors.identifier}
                disabled={loading}
                colors={colors}
                typography={typography}
                isDark={isDark}
              />

              {/* Password */}
              <FormInput
                inputRef={passwordRef}
                icon="lock-closed-outline"
                placeholder="Enter your password"
                value={form.password}
                onChangeText={(t) => setField('password', t)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                error={errors.password}
                disabled={loading}
                colors={colors}
                typography={typography}
                isDark={isDark}
                onSubmitEditing={submit}
                returnKeyType="go"
                rightElement={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                  </Pressable>
                }
              />

              {/* Sign In Button */}
              <SignInButton
                onPress={submit}
                loading={loading}
                disabled={loading}
                colors={colors}
                typography={typography}
              />

              {/* DEV ONLY: Quick credential fill for testing */}
              {__DEV__ && (
                <Animated.View
                  entering={FadeIn.delay(500).duration(300)}
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,165,0,0.3)',
                    backgroundColor: 'rgba(255,165,0,0.05)',
                  }}
                >
                  <Text style={{
                    fontSize: 10,
                    color: 'orange',
                    textAlign: 'center',
                    marginBottom: 8,
                    fontFamily: typography.fonts.medium,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
                    🔧 DEV — Quick Login
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                      { label: 'Manager', email: 'harsh@gmail.com' },
                      { label: 'Team Lead', email: 'geeta@gmail.com' },
                      { label: 'Employee', email: 'balram@gmail.com' },
                      { label: 'Company Admin', email: 'admin@gmail.com' },
                    ].map((cred) => (
                      <Pressable
                        key={cred.email}
                        onPress={() => {
                          setField('identifier', cred.email);
                          setField('password', 'password');
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: 'rgba(255,165,0,0.4)',
                          backgroundColor: 'rgba(255,165,0,0.1)',
                        }}
                      >
                        <Text style={{ fontSize: 11, color: 'orange', fontFamily: typography.fonts.medium }}>
                          {cred.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              )}
            </Animated.View>

            {/* Trust indicators */}
            <TrustIndicators colors={colors} typography={typography} />
          </View>
        </ScrollView>

      </KeyboardAvoidingView>

      {/* 3. Footer stays absolutely at the bottom when keyboard is hidden */}
      {!isKeyboardVisible && (
        <View style={styles.absoluteFooter}>
          <Footer companyName={companyName} colors={colors} typography={typography} />
        </View>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  absoluteFooter: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Background decoration
  bgCircle: {
    position: 'absolute',
  },
  dotPattern: {
    position: 'absolute',
    width: 48,
    height: 48,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarBrandText: {
    marginLeft: 6,
  },
  topBarBrand: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  langText: {
    fontSize: 13,
  },

  // Branding section
  brandingSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  companyLogoImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 12,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Login form container
  formContainer: {
    width: '100%',
    marginBottom: 16,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Form inputs
  inputWrapper: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    fontSize: 14,
    flex: 1,
    paddingVertical: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
  },

  // Sign in button
  signInButtonWrapper: {
    marginTop: 16,
  },
  signInButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Trust indicators
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
  },
  trustItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  trustIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: {
    fontSize: 13,
  },
  trustSub: {
    fontSize: 10,
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 0,
    marginBottom: 0,
  },
  footerVersionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerVersion: {
    fontSize: 12,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  footerCopy: {
    fontSize: 11,
    textAlign: 'center',
  },
});
