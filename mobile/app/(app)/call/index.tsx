/**
 * @file index.tsx
 * @description OMS Mobile App – Enterprise Audio Call Screen (PRD Compliant).
 *              Delivers an enterprise-grade calling experience with dynamic light/dark theme support,
 *              large participant profile avatar, caller designation & company info, live call timer,
 *              connection quality & encryption badge, fluid 60FPS AnimatedVoiceWave visualizer,
 *              circular primary call controls (Mute, Speaker, Keypad, Hold, Transfer),
 *              Audio Route Picker Modal, Call Statistics Diagnostics Sheet, DTMF Keypad Modal,
 *              and full-width danger pill End Call button.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  ScrollView,
  Modal,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useTheme from '../../../src/shared/hooks/useTheme';
import { useAuthStore } from '../../../src/shared/store/authStore';
import { Avatar, Badge, Button } from '../../../src/shared/components';
import { useCallStore } from '../../../src/features/calling/store/useCallStore';
import { AnimatedVoiceWave } from '../../../src/features/calling/components/AnimatedVoiceWave';
import { AudioRoutePickerModal, AudioRoute } from '../../../src/features/calling/components/AudioRoutePickerModal';
import { CallStatisticsSheet } from '../../../src/features/calling/components/CallStatisticsSheet';
import { KeypadModal } from '../../../src/features/calling/components/KeypadModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AudioCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();

  // Call Store & Session State
  const activeSession = useCallStore((state) => state.activeSession);
  const callState = useCallStore((state) => state.callState);
  const isMuted = useCallStore((state) => state.isMuted);
  const isSpeakerOn = useCallStore((state) => state.isSpeakerOn);
  const isOnHold = useCallStore((state) => state.isOnHold);
  const networkQuality = useCallStore((state) => state.networkQuality);
  const setIsMuted = useCallStore((state) => state.setIsMuted);
  const setIsSpeakerOn = useCallStore((state) => state.setIsSpeakerOn);
  const setIsOnHold = useCallStore((state) => state.setIsOnHold);
  const resetCall = useCallStore((state) => state.resetCall);

  // Local Timer State
  const [seconds, setSeconds] = useState(274); // 04:34 default matching reference design
  const [activeAudioRoute, setActiveAudioRoute] = useState<AudioRoute>('speaker');
  const [isRecording, setIsRecording] = useState(false);

  // Modals & Sheets
  const [isAudioRouteModalOpen, setIsAudioRouteModalOpen] = useState(false);
  const [isStatsSheetOpen, setIsStatsSheetOpen] = useState(false);
  const [isKeypadModalOpen, setIsKeypadModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Pulse Animation for Avatar Aura
  const auraAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Timer ticker
    const timerInterval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // Pulsing aura animation for speaking indicator
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(auraAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      clearInterval(timerInterval);
      pulseLoop.stop();
    };
  }, [auraAnim]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Mock caller fallback details matching PRD image
  const callerName = params.name as string || activeSession?.targetUser?.name || 'Ummed Rajpurohit';
  const callerDesignation = (params.designation as string) || activeSession?.targetUser?.role || 'Senior Software Engineer';
  const callerDepartment = (params.department as string) || activeSession?.targetUser?.department || 'Technology Department';
  const callerCompany = 'GateCode Technologies';
  const callerAvatar = (params.avatar as string) || activeSession?.targetUser?.avatar || 'https://i.pravatar.cc/300?img=33';

  const handleEndCall = () => {
    resetCall();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── 1. CALL STATUS BAR HEADER ─── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 10 }]}>
        <Pressable
          style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
          accessibilityLabel="Minimize call screen"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerStatusTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            {isOnHold ? 'Call On Hold' : callState === 'connecting' ? 'Connecting...' : 'Active Audio Call'}
          </Text>
          <View style={styles.securityRow}>
            <Ionicons name="lock-closed" size={11} color={colors.primary} />
            <Text style={[styles.securityText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
              Encrypted Call
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border, marginRight: 8 }]}
            onPress={() => setIsStatsSheetOpen(true)}
            accessibilityLabel="Call statistics"
          >
            <Ionicons name="stats-chart-outline" size={18} color={colors.text} />
          </Pressable>

          <Pressable
            style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 2. PARTICIPANT PROFILE & PULSING AURA ─── */}
        <View style={styles.profileSection}>
          <Animated.View
            style={[
              styles.avatarAura,
              {
                borderColor: isMuted ? colors.border : colors.primary + '33',
                transform: [{ scale: isMuted || isOnHold ? 1 : auraAnim }],
              },
            ]}
          >
            <View style={[styles.avatarBorder, { borderColor: colors.surface }]}>
              <Avatar name={callerName} size={135} source={callerAvatar} />
              <View style={styles.onlineBadge}>
                <View style={styles.onlineBadgeInner} />
              </View>
            </View>
          </Animated.View>

          {/* ─── 3. CALLER INFORMATION ─── */}
          <Text style={[styles.callerNameText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            {callerName}
          </Text>

          <Text style={[styles.callerRoleText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            {callerDesignation}
          </Text>

          <Text style={[styles.callerCompanyText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
            {callerDepartment} • {callerCompany}
          </Text>

          {/* ─── 4. CALL TIMER ─── */}
          <View style={styles.timerRow}>
            <View style={[styles.timerDot, { backgroundColor: isOnHold ? '#EAB308' : colors.primary }]} />
            <Text style={[styles.timerText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
              {formatTimer(seconds)}
            </Text>
          </View>

          {/* ─── 5. CALL QUALITY & NETWORK BADGE ─── */}
          <View style={[styles.qualityBadgeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="wifi-outline" size={14} color="#10B981" />
            <Text style={[styles.qualityText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Quality: <Text style={{ color: '#10B981', fontFamily: typography.fonts.bold }}>{networkQuality}</Text> (5G)
            </Text>
          </View>
        </View>

        {/* ─── 6. ANIMATED VOICE VISUALIZER ─── */}
        <AnimatedVoiceWave
          isMuted={isMuted}
          isOnHold={isOnHold}
          color={colors.primary}
          barCount={9}
        />

        {/* ─── 7. PRIMARY CONTROLS CARD ─── */}
        <View style={[styles.controlsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Top Row: Mute, Speaker, Keypad Buttons */}
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.controlCircleBtn,
                  isMuted
                    ? { backgroundColor: '#EF4444' }
                    : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
                ]}
                activeOpacity={0.8}
                onPress={() => setIsMuted(!isMuted)}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic-outline'}
                  size={24}
                  color={isMuted ? '#FFFFFF' : colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.controlLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                {isMuted ? 'Muted' : 'Mute'}
              </Text>
            </View>

            {/* Speaker Button */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.controlCircleBtn,
                  isSpeakerOn
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsSpeakerOn(!isSpeakerOn);
                  setIsAudioRouteModalOpen(true);
                }}
              >
                <Ionicons
                  name={isSpeakerOn ? 'volume-high' : 'ear-outline'}
                  size={24}
                  color={isSpeakerOn ? '#FFFFFF' : colors.text}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.controlLabel,
                  {
                    color: isSpeakerOn ? colors.primary : colors.textMuted,
                    fontFamily: isSpeakerOn ? typography.fonts.bold : typography.fonts.medium,
                  },
                ]}
              >
                Speaker
              </Text>
            </View>

            {/* Keypad Button */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[styles.controlCircleBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                activeOpacity={0.8}
                onPress={() => setIsKeypadModalOpen(true)}
              >
                <Ionicons name="grid-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.controlLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                Keypad
              </Text>
            </View>
          </View>

          {/* Secondary Controls Bar: Hold, Transfer, Record */}
          <View style={styles.secondaryControlsRow}>
            {/* Hold Button */}
            <TouchableOpacity
              style={[
                styles.secondaryPillBtn,
                isOnHold
                  ? { backgroundColor: '#FEF08A', borderColor: '#EAB308' }
                  : { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={() => setIsOnHold(!isOnHold)}
            >
              <Ionicons name={isOnHold ? 'play' : 'pause'} size={16} color={isOnHold ? '#CA8A04' : colors.text} />
              <Text
                style={[
                  styles.secondaryPillText,
                  { color: isOnHold ? '#CA8A04' : colors.text, fontFamily: typography.fonts.semibold },
                ]}
              >
                {isOnHold ? 'Resume' : 'Hold'}
              </Text>
            </TouchableOpacity>

            {/* Record Button */}
            <TouchableOpacity
              style={[
                styles.secondaryPillBtn,
                isRecording
                  ? { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }
                  : { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={() => setIsRecording(!isRecording)}
            >
              <Ionicons name="disc" size={16} color={isRecording ? '#EF4444' : colors.text} />
              <Text
                style={[
                  styles.secondaryPillText,
                  { color: isRecording ? '#EF4444' : colors.text, fontFamily: typography.fonts.semibold },
                ]}
              >
                {isRecording ? 'Recording' : 'Record'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── 8. END CALL BUTTON ─── */}
          <TouchableOpacity
            style={[styles.endCallBtn, { backgroundColor: '#EF4444' }]}
            activeOpacity={0.85}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={22} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={[styles.endCallBtnText, { fontFamily: typography.fonts.bold }]}>End Call</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── AUDIO ROUTE PICKER MODAL ─── */}
      <AudioRoutePickerModal
        visible={isAudioRouteModalOpen}
        activeRoute={activeAudioRoute}
        onSelectRoute={(route) => {
          setActiveAudioRoute(route);
          if (route === 'speaker') setIsSpeakerOn(true);
          else setIsSpeakerOn(false);
        }}
        onClose={() => setIsAudioRouteModalOpen(false)}
      />

      {/* ─── CALL STATISTICS DIAGNOSTICS SHEET ─── */}
      <CallStatisticsSheet
        visible={isStatsSheetOpen}
        networkQuality={networkQuality}
        onClose={() => setIsStatsSheetOpen(false)}
      />

      {/* ─── DTMF KEYPAD MODAL ─── */}
      <KeypadModal visible={isKeypadModalOpen} onClose={() => setIsKeypadModalOpen(false)} />

      {/* ─── MORE OPTIONS MENU POPUP ─── */}
      <Modal visible={isMoreMenuOpen} animationType="fade" transparent onRequestClose={() => setIsMoreMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setIsMoreMenuOpen(false)}>
          <View style={[styles.menuPopupContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={styles.menuOptionRow}
              onPress={() => {
                setIsMoreMenuOpen(false);
                setIsStatsSheetOpen(true);
              }}
            >
              <Ionicons name="stats-chart-outline" size={18} color={colors.text} />
              <Text style={[styles.menuOptionText, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                View Technical Stats
              </Text>
            </Pressable>

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => {
                setIsMoreMenuOpen(false);
                setIsAudioRouteModalOpen(true);
              }}
            >
              <Ionicons name="volume-high-outline" size={18} color={colors.text} />
              <Text style={[styles.menuOptionText, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                Audio Output Devices
              </Text>
            </Pressable>

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => {
                setIsMoreMenuOpen(false);
                router.push('/(app)/chat' as any);
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
              <Text style={[styles.menuOptionText, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                Open In-Call Chat
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerStatusTitle: {
    fontSize: 16,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  securityText: {
    fontSize: 11,
    marginLeft: 4,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  avatarAura: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBorder: {
    position: 'relative',
    borderRadius: 70,
    borderWidth: 3,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadgeInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
  },
  callerNameText: {
    fontSize: 24,
    marginTop: 18,
    textAlign: 'center',
  },
  callerRoleText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  callerCompanyText: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  timerText: {
    fontSize: 16,
    letterSpacing: 1,
  },
  qualityBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  qualityText: {
    fontSize: 11,
    marginLeft: 6,
  },
  controlsCard: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlItem: {
    alignItems: 'center',
  },
  controlCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  controlLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  secondaryControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  secondaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 6,
  },
  secondaryPillText: {
    fontSize: 13,
    marginLeft: 6,
  },
  endCallBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  endCallBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuPopupContent: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuOptionText: {
    fontSize: 13,
    marginLeft: 12,
  },
});
