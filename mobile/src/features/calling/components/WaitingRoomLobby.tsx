/**
 * @file WaitingRoomLobby.tsx
 * @description Waiting Room Lobby screen overlay for attendees waiting for host approval
 *              and host management controls.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Avatar } from '../../../shared/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import useCallStore from '../store/useCallStore';

interface WaitingRoomLobbyProps {
  isHost: boolean;
  meetingTitle?: string;
  onLeave: () => void;
}

export const WaitingRoomLobby: React.FC<WaitingRoomLobbyProps> = ({
  isHost,
  meetingTitle = 'Team Meeting',
  onLeave,
}) => {
  const { waitingRoomQueue, admitWaitingUser, rejectWaitingUser } = useCallStore();

  if (isHost && waitingRoomQueue.length > 0) {
    const nextUser = waitingRoomQueue[0];
    return (
      <View style={styles.hostBanner}>
        <Avatar name={nextUser.name} size={36} source={nextUser.avatar || undefined} />
        <View style={styles.hostBannerTextCol}>
          <Text style={styles.bannerName}>{nextUser.name}</Text>
          <Text style={styles.bannerSub}>Waiting to join the meeting...</Text>
        </View>

        <View style={styles.bannerActions}>
          <Pressable onPress={() => rejectWaitingUser(nextUser.userId)} style={styles.denyBtn}>
            <Ionicons name="close" size={18} color="#EF4444" />
          </Pressable>
          <Pressable onPress={() => admitWaitingUser(nextUser.userId)} style={styles.admitBtn}>
            <Text style={styles.admitText}>Admit</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Attendee Waiting Screen Overlay
  if (!isHost) {
    return (
      <View style={styles.fullScreenOverlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.cardTitle}>Waiting Room Lobby</Text>
          <Text style={styles.cardSub}>
            The host will let you into "{meetingTitle}" shortly.
          </Text>

          <Pressable onPress={onLeave} style={styles.leaveBtn}>
            <Text style={styles.leaveText}>Leave Meeting</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  hostBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
    elevation: 10,
    zIndex: 999,
  },
  hostBannerTextCol: {
    flex: 1,
  },
  bannerName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  denyBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
  },
  admitBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  admitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  leaveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  leaveText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WaitingRoomLobby;
