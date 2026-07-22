/**
 * @file MeetingReactions.tsx
 * @description Floating animated emoji reaction stream and raised hands banner overlay.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ReactionType } from '../types/calling.types';
import { Ionicons } from '@expo/vector-icons';
import useCallStore from '../store/useCallStore';
import useAuthStore from '../../../shared/store/authStore';

const EMOJIS: ReactionType[] = ['👍', '❤️', '👏', '🎉', '😂', '😮'];

export const MeetingReactions: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { activeReactions, raisedHands, toggleRaiseHand, addReaction } = useCallStore();

  const isHandRaised = user?.id ? raisedHands.includes(user.id) : false;

  const handleEmojiPress = (emoji: ReactionType) => {
    if (!user) return;
    addReaction(user.id, user.name, emoji);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Raised Hands Banner */}
      {raisedHands.length > 0 && (
        <View style={styles.raisedHandBanner}>
          <Ionicons name="hand-left" size={16} color="#F59E0B" />
          <Text style={styles.bannerText}>
            {raisedHands.length} {raisedHands.length === 1 ? 'hand' : 'hands'} raised
          </Text>
        </View>
      )}

      {/* Floating Animated Reaction Stream */}
      <View style={styles.streamContainer} pointerEvents="none">
        {activeReactions.map((reaction) => (
          <View key={reaction.id} style={styles.floatingBubble}>
            <Text style={styles.bubbleEmoji}>{reaction.emoji}</Text>
            <Text style={styles.bubbleName}>{reaction.userName}</Text>
          </View>
        ))}
      </View>

      {/* Bottom Action Control Bar for Emoji Reactions & Raise Hand */}
      <View style={styles.toolbarContainer}>
        <Pressable
          onPress={() => user?.id && toggleRaiseHand(user.id)}
          style={[styles.actionBtn, isHandRaised && styles.activeHandBtn]}
        >
          <Ionicons name="hand-left" size={20} color={isHandRaised ? '#FFFFFF' : '#F59E0B'} />
          <Text style={[styles.btnText, isHandRaised && styles.activeText]}>
            {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          </Text>
        </Pressable>

        <View style={styles.emojiRow}>
          {EMOJIS.map((emoji) => (
            <Pressable key={emoji} onPress={() => handleEmojiPress(emoji)} style={styles.emojiBtn}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 900,
  },
  raisedHandBanner: {
    alignSelf: 'center',
    marginTop: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bannerText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  streamContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    gap: 6,
  },
  floatingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  bubbleEmoji: {
    fontSize: 20,
  },
  bubbleName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  toolbarContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  activeHandBtn: {
    backgroundColor: '#F59E0B',
  },
  btnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#FFFFFF',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  emojiText: {
    fontSize: 18,
  },
});

export default MeetingReactions;
