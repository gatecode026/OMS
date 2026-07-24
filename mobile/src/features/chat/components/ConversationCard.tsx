import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../shared/components/Avatar';
import { ChatConversation } from '../types';
import { useDraftStore } from '../../../shared/store/draftStore';
import useTheme from '../../../shared/hooks/useTheme';

interface ConversationCardProps {
  conv: ChatConversation;
  currentUserId: string;
  isOnline: boolean;
  userStatus?: string;
  statusEmoji?: string | null;
  typingState?: Record<string, { name: string; isRecording: boolean }>;
  isPinned: boolean;
  isMuted: boolean;
  onPress: (conv: ChatConversation) => void;
  onLongPress: (conv: ChatConversation) => void;
  onTogglePin: (conv: ChatConversation) => void;
  onToggleMute: (conv: ChatConversation) => void;
  onMarkRead: (conv: ChatConversation) => void;
  onQuickReply: (conv: ChatConversation) => void;
  renderDeliveryStatus: (conv: ChatConversation) => React.ReactNode;
  getMessagePreview: (conv: ChatConversation) => { text: string; icon: keyof typeof Ionicons.glyphMap | null };
  getTypingPreview: (state: any) => { text: string; isRecording: boolean } | null;
  formatMessageTime: (date: string | Date) => string;
}

const areEqual = (prev: ConversationCardProps, next: ConversationCardProps) => {
  return (
    prev.conv.id === next.conv.id &&
    prev.conv.lastActivityAt === next.conv.lastActivityAt &&
    prev.conv.unreadCount === next.conv.unreadCount &&
    JSON.stringify(prev.conv.lastMessage) === JSON.stringify(next.conv.lastMessage) &&
    prev.isOnline === next.isOnline &&
    prev.userStatus === next.userStatus &&
    prev.statusEmoji === next.statusEmoji &&
    JSON.stringify(prev.typingState) === JSON.stringify(next.typingState) &&
    prev.isMuted === next.isMuted &&
    prev.isPinned === next.isPinned
  );
};

export const ConversationCard: React.FC<ConversationCardProps> = React.memo(({
  conv,
  currentUserId,
  isOnline,
  userStatus,
  statusEmoji,
  typingState,
  isPinned,
  isMuted,
  onPress,
  onLongPress,
  onTogglePin,
  onToggleMute,
  onMarkRead,
  onQuickReply,
  renderDeliveryStatus,
  getMessagePreview,
  getTypingPreview,
  formatMessageTime,
}) => {
  // Own the theme subscription so this re-renders on mode switch
  const { colors, spacing, radius, typography, isDark } = useTheme();
  const otherUser = conv.type === 'direct' ? conv.participants.find((p) => p.employeeId !== currentUserId) : null;
  const title = conv.type === 'direct' ? otherUser?.name || 'Chat Partner' : conv.name || 'Group Chat';
  const avatar = conv.type === 'direct' ? otherUser?.avatar || null : conv.avatar || null;
  
  const lastMsg = conv.lastMessage;
  const isMe = lastMsg?.senderId === currentUserId;
  const unreadCount = conv.unreadCount || 0;
  const hasUnread = unreadCount > 0;
  const draftText = useDraftStore((s) => s.drafts[conv.id]);

  const { text: previewText, icon: previewIcon } = getMessagePreview(conv);

  let swipeableRef: any = null;

  const handleLeftPress = (action: () => void) => {
    action();
    swipeableRef?.close();
  };

  const renderLeftActions = () => {
    return (
      <View style={[styles.leftActionsContainer, { width: 210 }]}>
        <Pressable
          onPress={() => handleLeftPress(() => onTogglePin(conv))}
          style={[styles.swipeActionBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name={isPinned ? 'pin-outline' : 'pin'} size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
        </Pressable>
        <Pressable
          onPress={() => handleLeftPress(() => onMarkRead(conv))}
          style={[styles.swipeActionBtn, { backgroundColor: colors.success }]}
        >
          <Ionicons name="mail-open-outline" size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Read</Text>
        </Pressable>
        <Pressable
          onPress={() => handleLeftPress(() => onQuickReply(conv))}
          style={[styles.swipeActionBtn, { backgroundColor: '#A855F7' }]}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Reply</Text>
        </Pressable>
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={[styles.rightActionsContainer, { width: 70 }]}>
        <Pressable
          onPress={() => handleLeftPress(() => onToggleMute(conv))}
          style={[styles.swipeActionBtn, { backgroundColor: colors.warning }]}
        >
          <Ionicons name={isMuted ? 'volume-high-outline' : 'volume-mute-outline'} size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable
      ref={(ref) => { swipeableRef = ref; }}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
    >
      <Pressable
        onPress={() => onPress(conv)}
        onLongPress={() => onLongPress(conv)}
        style={[
          styles.chatCard,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
          hasUnread && styles.unreadChatCard,
        ]}
      >
        <View style={styles.avatarWrapper}>
          <Avatar name={title} size={52} source={avatar || undefined} />
          {conv.type === 'direct' && (
            <View
              style={[
                styles.presenceDot,
                {
                  backgroundColor: (() => {
                    const currentStatus = userStatus || (isOnline ? 'available' : 'offline');
                    switch (currentStatus) {
                      case 'available': return '#10B981';
                      case 'away': return '#F59E0B';
                      case 'dnd': return '#EF4444';
                      case 'offline':
                      default: return colors.textLight;
                    }
                  })(),
                  borderColor: colors.card,
                  width: 13,
                  height: 13,
                  borderRadius: 6.5,
                  borderWidth: 2,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitleText,
                {
                  color: colors.text,
                  fontFamily: hasUnread ? typography.fonts.bold : typography.fonts.semibold,
                  fontSize: 15,
                },
              ]}
              numberOfLines={1}
            >
              {title}{statusEmoji ? ` ${statusEmoji}` : ''}
            </Text>
            {lastMsg?.sentAt && (
              <Text style={[styles.cardTimeText, { color: hasUnread ? colors.primary : colors.textMuted, fontFamily: typography.fonts.medium, fontSize: 10.5 }]}>
                {formatMessageTime(lastMsg.sentAt)}
              </Text>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              {!draftText && isMe && (!typingState || Object.keys(typingState).length === 0) && renderDeliveryStatus(conv)}
              {!draftText && previewIcon && <Ionicons name={previewIcon} size={14} color={colors.textLight} style={{ marginRight: 4 }} />}
              {draftText ? (
                <Text
                  style={[
                    styles.cardSnippetText,
                    {
                      color: colors.textMuted,
                      fontFamily: typography.fonts.regular,
                      fontSize: 13,
                    },
                  ]}
                  numberOfLines={1}
                >
                  <Text style={{ color: '#EF4444', fontFamily: typography.fonts.bold }}>Draft: </Text>
                  {draftText}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.cardSnippetText,
                    {
                      color: (typingState && Object.keys(typingState).length > 0) ? '#10B981' : colors.textMuted,
                      fontFamily: hasUnread ? typography.fonts.bold : typography.fonts.regular,
                      fontSize: 13,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {(typingState && Object.keys(typingState).length > 0) ? getTypingPreview(typingState)?.text : (conv.type === 'group' && lastMsg && !isMe ? `${lastMsg.senderName?.split(' ')[0] || 'Member'}: ` : '') + previewText}
                </Text>
              )}
            </View>

            <View style={styles.cardFooterRight}>
              {isMuted && (
                <Ionicons name="volume-mute-outline" size={14} color={colors.textLight} style={{ marginRight: 6 }} />
              )}
              {hasUnread ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              ) : null}
              {isPinned && (
                <Ionicons name="pin" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}, areEqual);

const styles = StyleSheet.create({
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unreadChatCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  presenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitleText: {
    flex: 1,
    marginRight: 8,
  },
  cardTimeText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSnippetText: {
    flex: 1,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  leftActionsContainer: {
    flexDirection: 'row',
  },
  rightActionsContainer: {
    flexDirection: 'row',
  },
  swipeActionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '100%',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
});

export default ConversationCard;
