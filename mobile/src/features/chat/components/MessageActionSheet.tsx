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
  const { colors, radius, typography, isDark } = useTheme();

  if (!message) return null;

  const handleCopy = () => {
    Clipboard.setString(message.content);
    toast.success('Copied to clipboard');
    onClose();
  };

  const menuBgColor = isDark ? '#233138' : '#FFFFFF';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const iconColor = isDark ? '#8696A0' : '#54656F';
  const separatorColor = isDark ? '#2F3B43' : '#F0F2F5';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.contentContainer}>
          {/* WhatsApp-style separate Floating Reactions Capsule */}
          <View style={[styles.reactionsRow, { backgroundColor: menuBgColor }]}>
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

          {/* WhatsApp-style Floating Actions Card */}
          <View style={[styles.modalCard, { backgroundColor: menuBgColor }]}>
            <Pressable
              onPress={() => {
                onReply();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Reply</Text>
            </Pressable>

            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="copy-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Copy</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onForward();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="arrow-redo-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Forward</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onPin();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="pin-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>
                {message.isPinned ? 'Unpin Message' : 'Pin Message'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onStar();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name={isStarred ? "star" : "star-outline"} size={20} color={isStarred ? colors.warning : iconColor} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>
                {isStarred ? 'Unstar Message' : 'Star Message'}
              </Text>
            </Pressable>

            {isMe && (
              <Pressable
                onPress={() => {
                  onEdit();
                  onClose();
                }}
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
              >
                <Ionicons name="create-outline" size={20} color={iconColor} style={{ marginRight: 14 }} />
                <Text style={[styles.actionLabel, { color: textColor, fontFamily: typography.fonts.medium }]}>Edit</Text>
              </Pressable>
            )}

            <View style={[styles.separator, { backgroundColor: separatorColor }]} />

            <Pressable
              onPress={() => {
                onDelete();
                onClose();
              }}
              style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: separatorColor }]}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} style={{ marginRight: 14 }} />
              <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: typography.fonts.medium }]}>Delete</Text>
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
    backgroundColor: 'rgba(9, 14, 17, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '78%',
    alignItems: 'center',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 30,
    marginBottom: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  reactionBtn: {
    padding: 6,
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
