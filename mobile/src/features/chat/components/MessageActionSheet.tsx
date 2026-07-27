/**
 * @file MessageActionSheet.tsx
 * @description Enterprise Action Sheet component supporting 9 quick reactions
 *              (👍 ❤️ 😂 😮 😢 🙏 👏 🔥 🎉) and 15 dynamic permission-driven actions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage } from '../types';
import MessageActionManager from '../services/MessageActionManager';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉'];

interface MessageActionSheetProps {
  visible: boolean;
  message: ChatMessage | null;
  currentUserId: string;
  userRole?: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onPin: () => void;
  onStar: () => void;
  onCopy: () => void;
  onShare: () => void;
  onInfo: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  visible,
  message,
  currentUserId,
  userRole,
  onClose,
  onReact,
  onReply,
  onForward,
  onEdit,
  onPin,
  onStar,
  onCopy,
  onShare,
  onInfo,
  onDeleteForMe,
  onDeleteForEveryone,
}) => {
  const { colors, typography, isDark } = useTheme();

  if (!message) return null;

  const menuBgColor = isDark ? '#233138' : '#FFFFFF';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const iconColor = isDark ? '#8696A0' : '#54656F';
  const separatorColor = isDark ? '#2F3B43' : '#F0F2F5';

  const canEdit = MessageActionManager.canEdit(message, currentUserId);
  const canDeleteEveryone = MessageActionManager.canDeleteForEveryone(message, currentUserId, userRole);
  const hasMedia = !!(message.media?.url || message.type === 'image' || message.type === 'video' || message.type === 'file');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.contentContainer}>
          {/* WhatsApp-style Floating Reactions Capsule (9 Emojis) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.reactionsRow, { backgroundColor: menuBgColor }]}
          >
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
          </ScrollView>

          {/* WhatsApp-style Floating Actions Card */}
          <View style={[styles.modalCard, { backgroundColor: menuBgColor }]}>
            {/* Reply */}
            <Pressable
              onPress={() => { onReply(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Reply</Text>
            </Pressable>

            {/* Copy */}
            <Pressable
              onPress={() => { onCopy(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="copy-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Copy</Text>
            </Pressable>

            {/* Forward */}
            <Pressable
              onPress={() => { onForward(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="arrow-redo-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Forward</Text>
            </Pressable>

            {/* Share / Save (Media items only) */}
            {hasMedia && (
              <Pressable
                onPress={() => { onShare(); onClose(); }}
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
              >
                <Ionicons name="share-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
                <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Share & Save</Text>
              </Pressable>
            )}

            {/* Pin / Unpin */}
            <Pressable
              onPress={() => { onPin(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="pin-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>
                {message.isPinned ? 'Unpin Message' : 'Pin Message'}
              </Text>
            </Pressable>

            {/* Star / Unstar */}
            <Pressable
              onPress={() => { onStar(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name={message.isStarred ? 'star' : 'star-outline'} size={20} color={message.isStarred ? colors.warning : iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>
                {message.isStarred ? 'Unstar Message' : 'Star Message'}
              </Text>
            </Pressable>

            {/* Message Info */}
            <Pressable
              onPress={() => { onInfo(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="information-circle-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Message Info</Text>
            </Pressable>

            {/* Edit (Permission Controlled) */}
            {canEdit && (
              <Pressable
                onPress={() => { onEdit(); onClose(); }}
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
              >
                <Ionicons name="create-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
                <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Edit</Text>
              </Pressable>
            )}

            <View style={[styles.separator, { backgroundColor: separatorColor }]} />

            {/* Delete for Me */}
            <Pressable
              onPress={() => { onDeleteForMe(); onClose(); }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: typography.fonts.medium }]}>Delete for Me</Text>
            </Pressable>

            {/* Delete for Everyone (Permission Controlled) */}
            {canDeleteEveryone && (
              <Pressable
                onPress={() => { onDeleteForEveryone(); onClose(); }}
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
              >
                <Ionicons name="trash-bin-outline" size={20} color={colors.danger} style={{ marginRight: 14 }} />
                <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: typography.fonts.medium }]}>Delete for Everyone</Text>
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
    backgroundColor: 'rgba(9, 14, 17, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '82%',
    alignItems: 'center',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    marginBottom: 10,
    gap: 8,
  },
  reactionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionText: {
    fontSize: 26,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  actionLabel: {
    fontSize: 15,
  },
  separator: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 12,
  },
});

export default MessageActionSheet;
