/**
 * @file VideoMessage.tsx
 * @description Premium video message bubble.
 * Shows a dark placeholder with play icon, duration badge and file size badge.
 * Uses a static placeholder instead of a live <Video> thumbnail to avoid
 * the performance cost of loading a video just for the bubble.
 * Tapping opens the fullscreen video player via preview.tsx.
 */

import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatBytes, formatDuration } from '../../utils/fileUtils';

const BUBBLE_WIDTH = 220;
const BUBBLE_HEIGHT = 165;

interface VideoMessageProps {
  mediaUrl: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  conversationId?: string;
  messageId?: string;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({
  mediaUrl,
  fileName,
  fileSize,
  duration,
  conversationId,
  messageId,
}) => {
  const router = useRouter();

  const handlePress = () => {
    const params = new URLSearchParams({
      url: mediaUrl,
      type: 'video',
      name: fileName || 'Video',
      size: String(fileSize || 0),
      ...(conversationId ? { conversationId } : {}),
      ...(messageId ? { activeMessageId: messageId } : {}),
    });
    router.push(`/chat/preview?${params.toString()}` as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`Video attachment${fileName ? `: ${fileName}` : ''}. Tap to play.`}
    >
      {/* Dark gradient background */}
      <View style={styles.darkBg} />

      {/* Centered Play Icon */}
      <View style={styles.playOverlay}>
        <View style={styles.playCircle}>
          <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>
      </View>

      {/* Duration badge — bottom left */}
      {duration != null && duration > 0 && (
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={9} color="#FFFFFF" style={{ marginRight: 2 }} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      )}

      {/* File size badge — bottom right */}
      {fileSize != null && fileSize > 0 && (
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>{formatBytes(fileSize)}</Text>
        </View>
      )}

      {/* Video icon indicator — top right */}
      <View style={styles.videoTypeBadge}>
        <Ionicons name="videocam" size={11} color="#FFFFFF" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#0F172A',
  },
  darkBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  sizeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  sizeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  videoTypeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
});

export default VideoMessage;
