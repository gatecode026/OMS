import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage } from '../types';
import { toast } from '../../../shared/components/Toast';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageActionSheetProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onReact: (reaction: string) => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
  isMe: boolean;
  isStarred: boolean;
}

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  visible,
  message,
  onClose,
  onReact,
  onReply,
  onForward,
  onEdit,
  onPin,
  onStar,
  onDelete,
  isMe,
  isStarred,
}) => {
  const { colors, radius, typography } = useTheme();

  if (!message) return null;

  const handleCopy = () => {
    Clipboard.setString(message.content);
    toast.success('Copied to clipboard');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radius.lg }]}>
          {/* Reaction emojis row */}
          <View style={[styles.reactionsRow, { borderBottomColor: colors.border }]}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  onReact(emoji);
                  onClose();
                }}
                style={styles.reactionBtn}
              >
                <Text style={styles.reactionText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {/* Action List items */}
          <View style={styles.actionsList}>
            <Pressable
              onPress={() => {
                onReply();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
            >
              <Ionicons name="arrow-undo-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>Reply</Text>
            </Pressable>

            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
            >
              <Ionicons name="copy-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>Copy</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onForward();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
            >
              <Ionicons name="arrow-redo-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>Forward</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onPin();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
            >
              <Ionicons name="pin-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                {message.isPinned ? 'Unpin Message' : 'Pin Message'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onStar();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
            >
              <Ionicons name={isStarred ? "star" : "star-outline"} size={18} color={isStarred ? colors.warning : colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                {isStarred ? 'Unstar Message' : 'Star Message'}
              </Text>
            </Pressable>

            {isMe && (
              <Pressable
                onPress={() => {
                  onEdit();
                  onClose();
                }}
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
              >
                <Ionicons name="create-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>Edit</Text>
              </Pressable>
            )}

            {isMe && (
              <Pressable
                onPress={() => {
                  onDelete();
                  onClose();
                }}
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.neutralLight }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 12 }} />
                <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: typography.fonts.medium }]}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    margin: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  reactionBtn: {
    padding: 6,
  },
  reactionText: {
    fontSize: 24,
  },
  actionsList: {
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 14,
  },
});

export default MessageActionSheet;
