/**
 * @file EmojiPicker.tsx
 * @description Premium Emoji Keyboard picker and Quick reactions component.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import useTheme from '../../../shared/hooks/useTheme';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const ALL_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
  '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
  '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
  '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',
  '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '✍️', '🙋',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '🙌', '👏', '🙏', '👋', '✍️', '🤳', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓'
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectReaction?: (emoji: string) => void;
  showReactions?: boolean;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onSelectReaction,
  showReactions = false,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Quick Reactions Bar */}
      {showReactions && onSelectReaction && (
        <View style={[styles.reactionsRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            Quick Reaction
          </Text>
          <View style={styles.quickEmojis}>
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => onSelectReaction(emoji)}
                style={({ pressed }) => [
                  styles.emojiBtn,
                  pressed && { opacity: 0.6 }
                ]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Grid of emojis */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.emojiGrid}>
          {ALL_EMOJIS.map((emoji, index) => (
            <Pressable
              key={index}
              onPress={() => onSelectEmoji(emoji)}
              style={({ pressed }) => [
                styles.gridEmojiBtn,
                pressed && { opacity: 0.6 }
              ]}
            >
              <Text style={styles.gridEmojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    borderTopWidth: 1,
  },
  reactionsRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  quickEmojis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  scrollContent: {
    padding: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridEmojiBtn: {
    width: '12.5%', // 8 items per row
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridEmojiText: {
    fontSize: 24,
  },
});

export default EmojiPicker;
