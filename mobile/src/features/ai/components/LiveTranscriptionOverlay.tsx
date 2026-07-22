/**
 * @file LiveTranscriptionOverlay.tsx
 * @description Real-time live subtitle banner overlay for active audio/video calls.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAiStore from '../store/useAiStore';

export const LiveTranscriptionOverlay: React.FC = () => {
  const { transcripts, isSubtitlesEnabled, setIsSubtitlesEnabled } = useAiStore();

  if (!isSubtitlesEnabled || transcripts.length === 0) return null;

  const latestSegment = transcripts[transcripts.length - 1];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.subtitleCard}>
        <View style={styles.headerRow}>
          <View style={styles.speakerBadge}>
            <Text style={styles.speakerText}>{latestSegment.speakerName}</Text>
          </View>
          <Pressable onPress={() => setIsSubtitlesEnabled(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={14} color="#94A3B8" />
          </Pressable>
        </View>

        <Text style={styles.transcriptText}>{latestSegment.text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 950,
  },
  subtitleCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#38BDF8',
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  speakerBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speakerText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
  transcriptText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default LiveTranscriptionOverlay;
