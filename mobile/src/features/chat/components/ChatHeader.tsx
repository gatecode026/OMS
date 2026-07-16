import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '../../../shared/components/Avatar';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatConversation } from '../types';
import { EdgeInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  conversationId: string;
  conversation: ChatConversation | undefined;
  chatMeta: {
    title: string;
    avatar: string | null;
    otherUser: any;
    isOnline: boolean;
    userStatus?: string;
    statusEmoji?: string | null;
    otherUserIsOnChatScreen?: boolean;
  };
  typingState: Record<string, { name: string; isRecording: boolean }> | undefined;
  getTypingPreview: (tState: Record<string, { name: string; isRecording: boolean }> | undefined) => { text: string; isRecording: boolean } | null;
  pinnedMessages: any[];
  onScrollToMessage: (msgId: string) => void;
  onVoiceCallInit: () => void;
  onVideoCallInit: () => void;
  insets: EdgeInsets;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversationId,
  conversation,
  chatMeta,
  typingState,
  getTypingPreview,
  pinnedMessages,
  onScrollToMessage,
  onVoiceCallInit,
  onVideoCallInit,
  insets,
}) => {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();

  const isTyping = typingState && Object.keys(typingState).length > 0;
  const typingPreview = getTypingPreview(typingState);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'away': return '#F59E0B';
      case 'dnd': return '#EF4444';
      case 'offline':
      default: return '#94A3B8';
    }
  };

  const currentStatus = chatMeta.userStatus || (chatMeta.isOnline ? 'available' : 'offline');

  return (
    <View style={{ width: '100%' }}>
      {/* ─── HEADER ─── */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Back" accessibilityRole="button" accessible>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Pressable
          style={styles.headerTitleContainer}
          onPress={() => router.push(`/chat/contact-info?id=${conversationId}` as any)}
        >
          <View style={styles.avatarWrapper}>
            <Avatar name={chatMeta.title} size={36} source={chatMeta.avatar || undefined} />
            {conversation?.type === 'direct' && (
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus), borderColor: colors.card }]} />
            )}
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
              {chatMeta.title}{chatMeta.statusEmoji ? ` ${chatMeta.statusEmoji}` : ''}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: isTyping ? '#10B981' : colors.textMuted,
                  fontFamily: typography.fonts.medium,
                },
              ]}
              numberOfLines={1}
            >
              {isTyping
                ? typingPreview?.text
                : (currentStatus === 'offline' || !chatMeta.isOnline)
                  ? 'Offline'
                  : currentStatus === 'available'
                    ? chatMeta.otherUserIsOnChatScreen
                      ? 'Online'
                      : 'Available'
                    : currentStatus === 'dnd'
                      ? 'Do Not Disturb'
                      : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerRightRow}>
          {conversation?.type === 'direct' && (
            <>
              <Pressable style={styles.headerBtn} onPress={onVoiceCallInit} accessibilityLabel="Start Voice Call" accessibilityRole="button" accessible>
                <Ionicons name="call-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable style={styles.headerBtn} onPress={onVideoCallInit} accessibilityLabel="Start Video Call" accessibilityRole="button" accessible>
                <Ionicons name="videocam-outline" size={22} color={colors.text} />
              </Pressable>
            </>
          )}
          <Pressable style={styles.headerBtn} onPress={() => router.push(`/chat/contact-info?id=${conversationId}` as any)} accessibilityLabel="Chat Information Options" accessibilityRole="button" accessible>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Pinned Messages Header indicator */}
      {pinnedMessages.length > 0 && (
        <View style={[styles.pinnedHeaderBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Ionicons name="pin" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.pinnedHeaderText, { color: colors.text, fontFamily: typography.fonts.medium }]} numberOfLines={1}>
            Pinned: {pinnedMessages[pinnedMessages.length - 1].text || 'Attachment'}
          </Text>
          <Pressable onPress={() => onScrollToMessage(pinnedMessages[pinnedMessages.length - 1].messageId)}>
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: typography.fonts.bold }}>View</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
  },
  headerTitle: {
    fontSize: 15,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  pinnedHeaderText: {
    fontSize: 11,
    flex: 1,
  },
});

export default ChatHeader;
