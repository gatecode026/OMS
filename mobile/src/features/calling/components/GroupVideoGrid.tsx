/**
 * @file GroupVideoGrid.tsx
 * @description Dynamic multi-participant video grid layout supporting Gallery View,
 *              Active Speaker View, and audio avatar grids.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { GroupParticipant, MeetingLayout } from '../types/calling.types';
import { Avatar } from '../../../shared/components/Avatar';
import { Ionicons } from '@expo/vector-icons';

let RTCView: any = null;
try {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
} catch (e) {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GroupVideoGridProps {
  participants: GroupParticipant[];
  activeSpeakerId: string | null;
  layoutMode: MeetingLayout;
}

export const GroupVideoGrid: React.FC<GroupVideoGridProps> = ({
  participants,
  activeSpeakerId,
  layoutMode,
}) => {
  if (participants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Waiting for participants to join...</Text>
      </View>
    );
  }

  // Active Speaker View Layout
  if (layoutMode === 'speaker' && participants.length > 1) {
    const speaker = participants.find((p) => p.userId === activeSpeakerId) || participants[0];
    const others = participants.filter((p) => p.userId !== speaker.userId);

    return (
      <View style={styles.container}>
        {/* Main Active Speaker */}
        <View style={[styles.speakerContainer, styles.activeBorder]}>
          {RTCView && speaker.stream ? (
            <RTCView streamURL={speaker.stream.toURL()} style={StyleSheet.absoluteFillObject} objectFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Avatar name={speaker.name} size={100} source={speaker.avatar || undefined} />
              <Text style={styles.participantName}>{speaker.name}</Text>
            </View>
          )}
        </View>

        {/* Bottom Horizontal Strip for other attendees */}
        <FlatList
          data={others}
          horizontal
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.stripContainer}
          renderItem={({ item }) => (
            <View style={styles.stripTile}>
              <Avatar name={item.name} size={48} source={item.avatar || undefined} />
              {item.isAudioMuted && (
                <View style={styles.mutedBadge}>
                  <Ionicons name="mic-off" size={12} color="#EF4444" />
                </View>
              )}
            </View>
          )}
        />
      </View>
    );
  }

  // Gallery View Dynamic Responsive Grid
  const numColumns = participants.length > 2 ? 2 : 1;
  const tileHeight = participants.length <= 2 ? 260 : 180;

  return (
    <View style={styles.container}>
      <FlatList
        data={participants}
        numColumns={numColumns}
        key={numColumns}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => {
          const isActive = item.userId === activeSpeakerId;

          return (
            <View style={[styles.gridTile, { height: tileHeight }, isActive && styles.activeBorder]}>
              {RTCView && item.stream && !item.isVideoOff ? (
                <RTCView streamURL={item.stream.toURL()} style={StyleSheet.absoluteFillObject} objectFit="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Avatar name={item.name} size={64} source={item.avatar || undefined} />
                  <Text style={styles.participantName}>{item.name}</Text>
                </View>
              )}

              {/* Status Icons Overlay */}
              <View style={styles.tileFooter}>
                <Text style={styles.tileName} numberOfLines={1}>
                  {item.name} {item.role === 'host' ? '(Host)' : ''}
                </Text>
                {item.isAudioMuted && <Ionicons name="mic-off" size={14} color="#EF4444" />}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  gridContent: {
    padding: 8,
    gap: 8,
  },
  gridTile: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeBorder: {
    borderColor: '#10B981',
    borderWidth: 2.5,
  },
  speakerContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  avatarFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  participantName: {
    color: '#F8FAFC',
    marginTop: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  stripContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  stripTile: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mutedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 2,
  },
  tileFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileName: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default GroupVideoGrid;
