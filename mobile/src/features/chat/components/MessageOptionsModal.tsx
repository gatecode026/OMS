/**
 * @file MessageOptionsModal.tsx
 * @description Slide-up modal overlay for message quick reactions (Emoji) 
 *              and options (Reply, Forward, Edit, Pin, Delete, Copy).
 */

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

interface MessageOptionsModalProps {
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

export const MessageOptionsModal: React.FC<MessageOptionsModalProps> = ({
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
                <Text style={[styles.actionLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>Edit Message</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                onDelete();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: colors.danger }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>Delete Message</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9,13,22,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '90%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  reactionBtn: {
    padding: 6,
  },
  reactionText: {
    fontSize: 24,
  },
  actionsList: {
    paddingVertical: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  actionLabel: {
    fontSize: 13,
  },
});

export default MessageOptionsModal;
