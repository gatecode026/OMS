/**
 * @file video.tsx — OMS Enterprise Video Call Screen
 *
 * Phase 7 Recovery:
 *  ✓ State bound to CallProvider context (not disconnected Zustand)
 *  ✓ remoteStream bound via useCall() — real WebRTC RTCView
 *  ✓ localStream bound for PiP preview RTCView
 *  ✓ Camera fallback: Initials Avatar when stream unavailable
 *  ✓ Camera-off badge when isVideoOff = true
 *  ✓ Camera flip, mute, camera toggle, speaker controls
 *  ✓ End call through CallProvider.endCall()
 *  ✓ Floating draggable PiP preview
 *  ✓ Non-scrolling layout on all device sizes
 *  ✓ Full Light / Dark theme
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useTheme from '../../../src/shared/hooks/useTheme';
import { Avatar } from '../../../src/shared/components';
import { useCall } from '../../../src/shared/providers/CallProvider';
import {
  AudioRoutePickerModal,
  CallStatisticsSheet,
  useAudioRoute,
} from '../../../src/features/calling';


const { width: W, height: H } = Dimensions.get('window');

// Safely load RTCView — not available in Expo Go
let RTCView: any = null;
try { RTCView = require('react-native-webrtc').RTCView; } catch (_) {}

export default function VideoCallScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams();
  const insets  = useSafeAreaInsets();
  const { colors, typography, isDark } = useTheme();

  // ── Phase 3 & 7: CallProvider context ─────────────────────────────────
  const {
    activeCall,
    endCall,
    localStream,  remoteStream,
    isMuted,      toggleMute,
    isVideoOff,   toggleVideo,
    isFrontCamera, flipCamera,
    isSpeakerOn,   toggleSpeaker,
    isOnHold,
    networkQuality,
    callDuration,
    connectionState,
  } = useCall();

  const { activeRoute, selectRoute } = useAudioRoute('speaker');
  const [isAudioRouteOpen, setIsAudioRouteOpen] = useState(false);
  const [isStatsOpen,      setIsStatsOpen]       = useState(false);

  // Live timer from callDuration (driven by useWebRTC)
  const displayTimer = React.useMemo(() => {
    if (connectionState === 'connected' && callDuration > 0) {
      const h = Math.floor(callDuration / 3600);
      const m = Math.floor((callDuration % 3600) / 60).toString().padStart(2, '0');
      const s = (callDuration % 60).toString().padStart(2, '0');
      return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    }
    return connectionState === 'connecting' ? 'Connecting…' : '00:00';
  }, [callDuration, connectionState]);

  // ── Phase 3: Dynamic participant ──────────────────────────────────────
  const callerName   = (params.name        as string) || activeCall?.targetUser?.name        || 'Staff Member';
  const callerRole   = (params.designation as string) || activeCall?.targetUser?.role        || '';
  const callerDept   = (params.department  as string) || activeCall?.targetUser?.department  || '';
  const callerAvatar = (params.avatar      as string) || activeCall?.targetUser?.avatar      || undefined;

  const qualityColor =
    networkQuality === 'Excellent' || networkQuality === 'Good' ? '#10B981' :
    networkQuality === 'Fair' ? '#F59E0B' : '#EF4444';

  // ── Phase 9: PiP drag state ───────────────────────────────────────────
  const pipPosition = useRef(new Animated.ValueXY({ x: W - 108, y: 90 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pipPosition.x, dy: pipPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pipPosition.extractOffset();
      },
    })
  ).current;

  const hasRemoteStream = !!remoteStream;
  const hasLocalStream  = !!localStream;

  const handleEndCall = async () => {
    await endCall();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#1E293B' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          style={[styles.headerBtn, { backgroundColor: 'rgba(15,23,42,0.7)', borderColor: 'rgba(255,255,255,0.15)' }]}
          onPress={() => router.back()} accessibilityLabel="Minimize video call"
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: '#FFF', fontFamily: typography.fonts.bold }]}>
            {isOnHold ? 'Call On Hold' :
             connectionState === 'connected' ? 'Video Call' :
             connectionState === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
          </Text>
          <View style={styles.encryptedRow}>
            <Ionicons name="lock-closed" size={10} color="#10B981" />
            <Text style={[styles.encryptedTxt, { color: '#10B981', fontFamily: typography.fonts.semibold }]}>
              {' '}Encrypted HD
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.headerBtn, { backgroundColor: 'rgba(15,23,42,0.7)', borderColor: 'rgba(255,255,255,0.15)' }]}
          onPress={() => setIsStatsOpen(true)} accessibilityLabel="Call stats"
        >
          <Ionicons name="stats-chart-outline" size={17} color="#FFF" />
        </Pressable>
      </View>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <View style={[styles.body, { paddingBottom: insets.bottom + 12 }]}>

        {/* ── REMOTE VIDEO AREA ─────────────────────────────────────────── */}
        <View style={styles.remoteArea}>
          {RTCView && hasRemoteStream && !isOnHold ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              objectFit="cover"
              style={StyleSheet.absoluteFill}
              mirror={false}
            />
          ) : (
            /* Fallback avatar when no stream or on hold */
            <View style={styles.fallback}>
              <Avatar name={callerName} size={108} source={callerAvatar} />
              <Text style={[styles.fallbackName, { color: '#FFF', fontFamily: typography.fonts.bold }]}>
                {callerName}
              </Text>
              {callerRole ? (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                  {[callerRole, callerDept].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
              {isVideoOff && (
                <View style={styles.camOffBadge}>
                  <Ionicons name="videocam-off" size={13} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: '#EF4444', marginLeft: 5 }}>Camera Off</Text>
                </View>
              )}
              {isOnHold && (
                <View style={[styles.camOffBadge, { backgroundColor: 'rgba(234,179,8,0.15)', borderColor: '#EAB308' }]}>
                  <Ionicons name="pause" size={13} color="#EAB308" />
                  <Text style={{ fontSize: 12, color: '#EAB308', marginLeft: 5 }}>On Hold</Text>
                </View>
              )}
            </View>
          )}

          {/* Timer + quality overlay */}
          <View style={styles.metricsRow}>
            <View style={styles.metricDot} />
            <Text style={{ color: '#FFF', fontSize: 12, fontFamily: typography.fonts.bold, marginRight: 10 }}>
              {displayTimer}
            </Text>
            <Ionicons name="wifi" size={12} color={qualityColor} />
            <Text style={{ color: qualityColor, fontSize: 11, fontFamily: typography.fonts.bold, marginLeft: 3 }}>
              {' '}{networkQuality}
            </Text>
          </View>

          {/* Participant name overlay — only when remote video is live */}
          {hasRemoteStream && (
            <View style={styles.participantTag}>
              <Text style={{ color: '#FFF', fontSize: 13, fontFamily: typography.fonts.bold }}>{callerName}</Text>
              {callerDept ? (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{callerDept}</Text>
              ) : null}
            </View>
          )}

          {/* ── PiP local preview — draggable ──────────────────────────── */}
          <Animated.View
            style={[styles.pip, { borderColor: colors.primary }, pipPosition.getLayout()]}
            {...panResponder.panHandlers}
          >
            {isVideoOff ? (
              <View style={styles.pipOff}>
                <Ionicons name="videocam-off" size={18} color="rgba(255,255,255,0.5)" />
              </View>
            ) : RTCView && hasLocalStream ? (
              <RTCView
                streamURL={localStream.toURL()}
                objectFit="cover"
                style={StyleSheet.absoluteFill}
                mirror={isFrontCamera}
              />
            ) : (
              <View style={styles.pipOff}>
                <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
              </View>
            )}
            <TouchableOpacity style={styles.flipBtn} onPress={flipCamera} accessibilityLabel="Flip camera">
              <Ionicons name="camera-reverse" size={13} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── CONTROLS CARD ─────────────────────────────────────────────── */}
        <View style={[styles.controlsCard, {
          backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }]}>
          <View style={styles.controlsRow}>
            <VidBtn icon={isMuted ? 'mic-off' : 'mic-outline'}
              label={isMuted ? 'Muted' : 'Mute'} active={isMuted} activeColor="#EF4444"
              isDark={isDark} colors={colors} typography={typography} onPress={toggleMute} />

            <VidBtn icon={isVideoOff ? 'videocam-off' : 'videocam'}
              label={isVideoOff ? 'Cam Off' : 'Camera'} active={!isVideoOff} activeColor={colors.primary}
              isDark={isDark} colors={colors} typography={typography} onPress={toggleVideo} />

            <VidBtn icon="camera-reverse-outline"
              label="Flip" active={false} activeColor={colors.primary}
              isDark={isDark} colors={colors} typography={typography} onPress={flipCamera} />

            <VidBtn icon={isSpeakerOn ? 'volume-high' : 'ear-outline'}
              label="Speaker" active={isSpeakerOn} activeColor={colors.primary}
              isDark={isDark} colors={colors} typography={typography}
              onPress={() => { toggleSpeaker(); setIsAudioRouteOpen(true); }} />
          </View>

          <TouchableOpacity style={styles.endCallBtn} activeOpacity={0.85} onPress={handleEndCall}
            accessibilityLabel="End call">
            <Ionicons name="call" size={22} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={[styles.endCallText, { fontFamily: typography.fonts.bold }]}>End Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <AudioRoutePickerModal
        visible={isAudioRouteOpen}
        activeRoute={activeRoute}
        onSelectRoute={(r) => { selectRoute(r); if (r === 'speaker' && !isSpeakerOn) toggleSpeaker(); setIsAudioRouteOpen(false); }}
        onClose={() => setIsAudioRouteOpen(false)}
      />
      <CallStatisticsSheet visible={isStatsOpen} networkQuality={networkQuality as any} onClose={() => setIsStatsOpen(false)} />
    </View>
  );
}

function VidBtn({ icon, label, active, activeColor, isDark, colors, typography, onPress }: any) {
  return (
    <View style={styles.btnItem}>
      <TouchableOpacity
        style={[styles.btnCircle,
          active ? { backgroundColor: activeColor }
                 : { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}
        activeOpacity={0.8} onPress={onPress} accessibilityLabel={label}
      >
        <Ionicons name={icon} size={22} color={active ? '#FFF' : isDark ? '#FFF' : '#1E293B'} />
      </TouchableOpacity>
      <Text style={[styles.btnLabel, {
        color: active ? activeColor : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
        fontFamily: typography.fonts.medium,
      }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle:  { fontSize: 15 },
  encryptedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  encryptedTxt: { fontSize: 10 },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 0,
  },
  remoteArea: {
    width: '100%', flex: 1, borderRadius: 22, overflow: 'hidden',
    position: 'relative', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1E293B', marginBottom: 12,
    marginTop: 96, // offset for absolute header
  },
  fallback:  { alignItems: 'center', justifyContent: 'center', padding: 20 },
  fallbackName: { fontSize: 20, marginTop: 12, textAlign: 'center' },
  camOffBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#EF4444',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 10,
  },
  metricsRow: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  metricDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981', marginRight: 6 },
  participantTag: {
    position: 'absolute', bottom: 14, left: 14,
    backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  pip: {
    position: 'absolute', top: 0, right: 0, // overridden by PanResponder
    width: 96, height: 136, borderRadius: 16, borderWidth: 2, overflow: 'hidden',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  pipOff:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  flipBtn: {
    position: 'absolute', bottom: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
  },
  controlsCard: {
    width: W - 24, borderRadius: 26, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  controlsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 14,
  },
  btnItem:   { alignItems: 'center' },
  btnCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  btnLabel:  { fontSize: 11, marginTop: 5 },
  endCallBtn: {
    height: 52, borderRadius: 26, backgroundColor: '#EF4444',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 4,
  },
  endCallText: { color: '#FFF', fontSize: 16, marginLeft: 8 },
});
