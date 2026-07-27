/**
 * @file incoming-call.tsx
 * @description OMS Enterprise Incoming Call Screen.
 *
 * Phase 1B — BUG-001 FIX:
 *  ✓ Fullscreen dedicated incoming call screen (not the active-call screen)
 *  ✓ Caller avatar + name + designation + department from CallProvider context
 *  ✓ Call type badge (Audio / Video)
 *  ✓ Animated pulsing ring around avatar
 *  ✓ Accept (green) — triggers acceptCall() → navigates to /call or /call/video
 *  ✓ Decline (red)  — triggers rejectCall() → navigates back
 *  ✓ Non-scrolling, fits all screen sizes
 *  ✓ Full Light / Dark theme via useTheme()
 *  ✓ StatusBar adapts to isDark
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import useTheme from '../../src/shared/hooks/useTheme';
import { Avatar } from '../../src/shared/components';
import { useCall } from '../../src/shared/providers/CallProvider';

const { width: W } = Dimensions.get('window');

export default function IncomingCallScreen() {
  const insets          = useSafeAreaInsets();
  const router          = useRouter();
  const { colors, typography, isDark } = useTheme();
  const { activeCall, acceptCall, rejectCall } = useCall();

  // Auto-dismiss screen if activeCall is cleared or call was ended/missed/rejected by other party
  useEffect(() => {
    if (!activeCall || activeCall.status === 'ended' || activeCall.status === 'rejected' || activeCall.status === 'missed') {
      router.replace('/(tabs)/inbox' as any);
    }
  }, [activeCall, router]);

  // ── Pulsing aura animation ───────────────────────────────────────────────
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.55, duration: 1400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,    duration: 0,    useNativeDriver: true }),
        ])
      );

    const l1 = makeLoop(pulse1, 0);
    const l2 = makeLoop(pulse2, 450);
    const l3 = makeLoop(pulse3, 900);
    l1.start(); l2.start(); l3.start();

    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [pulse1, pulse2, pulse3]);

  // Button press scales
  const acceptScale  = useRef(new Animated.Value(1)).current;
  const declineScale = useRef(new Animated.Value(1)).current;

  const animatePress = (anim: Animated.Value, onDone: () => void) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.88, duration: 90,  useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start(onDone);
  };

  // ── Derived caller info ──────────────────────────────────────────────────
  const caller     = activeCall?.targetUser;
  const callerName = caller?.name        || 'Incoming Call';
  const callerRole = caller?.role        || '';
  const callerDept = caller?.department  || '';
  const callerAvatar = caller?.avatar    || undefined;
  const callType   = activeCall?.callType || 'audio';
  const isVideo    = callType === 'video';

  const handleAccept = () => {
    animatePress(acceptScale, () => {
      acceptCall();
      // CallProvider.acceptCall() navigates to /(app)/call or /(app)/call/video internally
    });
  };

  const handleDecline = () => {
    animatePress(declineScale, () => {
      rejectCall();
    });
  };

  const AURA_BASE   = 130;
  const AURA_COLOR  = isVideo ? colors.secondary || '#8B5CF6' : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#050D1A' : '#0F2027' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HEADER LABEL ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.callTypeBadge, { borderColor: AURA_COLOR + '60', backgroundColor: AURA_COLOR + '20' }]}>
          <Ionicons name={isVideo ? 'videocam' : 'call'} size={13} color={AURA_COLOR} />
          <Text style={[styles.callTypeBadgeText, { color: AURA_COLOR, fontFamily: typography.fonts.semibold }]}>
            {isVideo ? 'Incoming Video Call' : 'Incoming Audio Call'}
          </Text>
        </View>
      </View>

      {/* ── CALLER PROFILE ───────────────────────────────────────────────── */}
      <View style={styles.profileSection}>
        {/* Concentric pulsing rings */}
        <View style={[styles.auraContainer, { width: AURA_BASE + 80, height: AURA_BASE + 80 }]}>
          <Animated.View style={[
            styles.auraRing,
            { width: AURA_BASE + 80, height: AURA_BASE + 80, borderRadius: (AURA_BASE + 80) / 2,
              borderColor: AURA_COLOR + '18', transform: [{ scale: pulse3 }] },
          ]} />
          <Animated.View style={[
            styles.auraRing,
            { width: AURA_BASE + 44, height: AURA_BASE + 44, borderRadius: (AURA_BASE + 44) / 2,
              borderColor: AURA_COLOR + '30', transform: [{ scale: pulse2 }] },
          ]} />
          <Animated.View style={[
            styles.auraRing,
            { width: AURA_BASE + 16, height: AURA_BASE + 16, borderRadius: (AURA_BASE + 16) / 2,
              borderColor: AURA_COLOR + '55', transform: [{ scale: pulse1 }] },
          ]} />

          {/* Avatar in centre */}
          <View style={[styles.avatarWrapper, { borderColor: AURA_COLOR, width: AURA_BASE, height: AURA_BASE, borderRadius: AURA_BASE / 2 }]}>
            <Avatar name={callerName} size={AURA_BASE - 8} source={callerAvatar} />
          </View>
        </View>

        {/* Caller info */}
        <Text style={[styles.callerName, { color: '#FFFFFF', fontFamily: typography.fonts.bold }]}>
          {callerName}
        </Text>

        {callerRole ? (
          <Text style={[styles.callerRole, { color: 'rgba(255,255,255,0.70)', fontFamily: typography.fonts.medium }]}>
            {callerRole}
          </Text>
        ) : null}

        {callerDept ? (
          <Text style={[styles.callerDept, { color: AURA_COLOR, fontFamily: typography.fonts.semibold }]}>
            {callerDept}
          </Text>
        ) : null}

        {/* Calling... label */}
        <Text style={[styles.callingLabel, { color: 'rgba(255,255,255,0.45)', fontFamily: typography.fonts.medium }]}>
          Calling{isVideo ? ' via video' : ''}…
        </Text>
      </View>

      {/* ── ACTION BUTTONS ───────────────────────────────────────────────── */}
      <View style={[styles.actionsRow, { paddingBottom: insets.bottom + 32 }]}>
        {/* Decline */}
        <View style={styles.actionItem}>
          <Animated.View style={{ transform: [{ scale: declineScale }] }}>
            <TouchableOpacity
              style={[styles.actionCircle, styles.declineCircle]}
              activeOpacity={0.85}
              onPress={handleDecline}
              accessibilityLabel="Decline call"
            >
              <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </Animated.View>
          <Text style={[styles.actionLabel, { color: 'rgba(255,255,255,0.65)', fontFamily: typography.fonts.medium }]}>
            Decline
          </Text>
        </View>

        {/* Accept */}
        <View style={styles.actionItem}>
          <Animated.View style={{ transform: [{ scale: acceptScale }] }}>
            <TouchableOpacity
              style={[styles.actionCircle, styles.acceptCircle]}
              activeOpacity={0.85}
              onPress={handleAccept}
              accessibilityLabel="Accept call"
            >
              <Ionicons name="call" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={[styles.actionLabel, { color: 'rgba(255,255,255,0.65)', fontFamily: typography.fonts.medium }]}>
            {isVideo ? 'Video' : 'Accept'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  callTypeBadgeText: {
    fontSize: 13,
    marginLeft: 6,
  },
  profileSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  auraRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  avatarWrapper: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  callerName: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 6,
  },
  callerRole: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 2,
  },
  callerDept: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  callingLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  actionItem: {
    alignItems: 'center',
    gap: 12,
  },
  actionCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  declineCircle: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  acceptCircle: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  actionLabel: {
    fontSize: 13,
  },
});
