/**
 * @file MessageBubble.tsx
 * @description Premium chat message bubble with:
 *   - Circular progress arc overlay during upload (Animated, no SVG library)
 *   - Per-state upload feedback: preparing → compressing → uploading → uploaded → sending → delivered → read
 *   - Swipe-to-reply (left swipe)
 *   - Reactions, pin, star, edit indicators
 *   - Memoized with granular equality to prevent list re-renders
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage, ChatMessageReaction } from '../types';
import MessageStatus from './MessageStatus';
import { useChatTheme } from './ChatThemeProvider';
import { MessageContentRenderer } from './messageTypes/MessageRendererRegistry';
import type { UploadState } from '../hooks/useUploadQueue';

// ─── CIRCULAR PROGRESS ARC ────────────────────────────────────────────────────
// Implemented with two View halves (left clip + right clip) rotating via Animated,
// so no SVG / react-native-svg dependency is needed.

interface CircularProgressProps {
  progress: number; // 0–100
  onCancel: () => void;
  uploadState?: UploadState;
}

const CIRCLE_SIZE = 64;
const STROKE = 4;

const CircularProgress: React.FC<CircularProgressProps> = ({ progress, onCancel, uploadState }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const prevProgress = useRef(0);

  useEffect(() => {
    const target = Math.min(Math.max(progress, 0), 100);
    Animated.timing(rotateAnim, {
      toValue: target / 100,
      duration: 120,
      useNativeDriver: false,
    }).start();
    prevProgress.current = target;
  }, [progress]);

  const halfCircleRotation = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const labelMap: Record<string, string> = {
    preparing: '…',
    compressing: '⇣',
    uploading: `${progress}%`,
    uploaded: '✓',
    sending: '→',
  };

  const label = labelMap[uploadState || 'uploading'] ?? `${progress}%`;

  return (
    <View style={styles.progressOverlay}>
      {/* Semi-transparent backdrop */}
      <View style={styles.progressBackdrop} />

      {/* Arc ring */}
      <View style={[styles.arcContainer, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
        {/* Track */}
        <View
          style={[
            styles.arcTrack,
            {
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              borderRadius: CIRCLE_SIZE / 2,
              borderWidth: STROKE,
              borderColor: 'rgba(255,255,255,0.2)',
            },
          ]}
        />
        {/* Fill — rotates right half */}
        <Animated.View
          style={[
            styles.arcHalf,
            {
              width: CIRCLE_SIZE / 2,
              height: CIRCLE_SIZE,
              borderTopRightRadius: CIRCLE_SIZE / 2,
              borderBottomRightRadius: CIRCLE_SIZE / 2,
              borderRightWidth: STROKE,
              borderTopWidth: STROKE,
              borderBottomWidth: STROKE,
              borderColor: '#6366F1',
              transform: [
                { translateX: -(CIRCLE_SIZE / 4) },
                { rotate: halfCircleRotation },
                { translateX: CIRCLE_SIZE / 4 },
              ],
            },
          ]}
        />
        {/* Progress label centered */}
        <View style={styles.arcLabel}>
          <Text style={styles.arcLabelText}>{label}</Text>
        </View>
      </View>

      {/* Cancel button */}
      <Pressable onPress={onCancel} style={styles.progressCancelBtn} hitSlop={8}>
        <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </View>
  );
};

// ─── UPLOAD ERROR OVERLAY ─────────────────────────────────────────────────────

interface UploadErrorProps {
  onRetry: () => void;
}

const UploadErrorOverlay: React.FC<UploadErrorProps> = ({ onRetry }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.progressOverlay}>
      <View style={styles.progressBackdrop} />
      <Pressable onPress={onRetry} hitSlop={8}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="refresh-circle" size={36} color="#EF4444" />
        </Animated.View>
      </Pressable>
      <Text style={styles.errorLabel}>Failed · Tap to retry</Text>
    </View>
  );
};

// ─── MAIN MESSAGE BUBBLE ──────────────────────────────────────────────────────

const getSenderColor = (name: string) => {
  const colorsList = ['#E11D48', '#2563EB', '#059669', '#D97706', '#7C3AED', '#0891B2', '#EA580C'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorsList.length;
  return colorsList[index];
};

interface MessageBubbleProps {
  item: ChatMessage;
  currentUserId: string;
  onLongPress: (msg: ChatMessage) => void;
  onSwipeReply: (msg: ChatMessage) => void;
  onRetryUpload: (msg: ChatMessage) => void;
  onCancelUpload: (msgId: string) => void;
  onRetrySend: (msg: ChatMessage) => void;
  uploadProgress?: number;
  uploadError?: boolean;
  uploadState?: UploadState;
  isFirstOfGroup?: boolean;
  isLastOfGroup?: boolean;
  isGroup?: boolean;
  isHighlighted?: boolean;
}

const areEqual = (prevProps: MessageBubbleProps, nextProps: MessageBubbleProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.content === nextProps.item.content &&
    prevProps.item.isPinned === nextProps.item.isPinned &&
    prevProps.item.isDeleted === nextProps.item.isDeleted &&
    prevProps.item.isEdited === nextProps.item.isEdited &&
    JSON.stringify(prevProps.item.reactions) === JSON.stringify(nextProps.item.reactions) &&
    prevProps.item.starredBy?.length === nextProps.item.starredBy?.length &&
    prevProps.uploadProgress === nextProps.uploadProgress &&
    prevProps.uploadError === nextProps.uploadError &&
    prevProps.uploadState === nextProps.uploadState &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isFirstOfGroup === nextProps.isFirstOfGroup &&
    prevProps.isLastOfGroup === nextProps.isLastOfGroup &&
    prevProps.isGroup === nextProps.isGroup &&
    prevProps.isHighlighted === nextProps.isHighlighted
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  item,
  currentUserId,
  onLongPress,
  onSwipeReply,
  onRetryUpload,
  onCancelUpload,
  onRetrySend,
  uploadProgress,
  uploadError,
  uploadState,
  isFirstOfGroup = true,
  isLastOfGroup = true,
  isGroup = false,
  isHighlighted = false,
}) => {
  const { colors, radius, typography, isDark } = useTheme();
  const chatTheme = useChatTheme();
  const isMe = item.senderId === currentUserId;

  let swipeableRef: any = null;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.98,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isHighlighted]);

  const renderLeftActions = () => (
    <View style={styles.swipeLeftAction}>
      <Ionicons name="arrow-undo-outline" size={20} color={chatTheme.bubbleMeBg} />
    </View>
  );

  const messageContent = <MessageContentRenderer item={item} isMe={isMe} currentUserId={currentUserId} />;

  if (item.type === 'system' || item.type === 'call') {
    return messageContent;
  }

  const isUploading = uploadProgress !== undefined && uploadState !== 'delivered' && uploadState !== 'read' && uploadState !== 'cancelled';

  return (
    <Swipeable
      ref={(ref) => { swipeableRef = ref; }}
      renderLeftActions={renderLeftActions}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'left') onSwipeReply(item);
        swipeableRef?.close();
      }}
      friction={1.5}
      leftThreshold={30}
      enabled={!item.isDeleted}
    >
      <View 
        style={[
          styles.messageRow, 
          { 
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            marginTop: isFirstOfGroup ? 6 : 1.5,
            marginBottom: isLastOfGroup ? 6 : 1.5,
          }
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }], flexDirection: 'row', alignItems: 'flex-end' }}>
          <Pressable
            onLongPress={() => !item.isDeleted && onLongPress(item)}
            style={({ pressed }) => [
              styles.messageBubble,
              {
                backgroundColor: isMe ? chatTheme.bubbleMeBg : chatTheme.bubbleOtherBg,
                borderTopRightRadius: isMe ? (isFirstOfGroup ? 0 : 16) : 16,
                borderTopLeftRadius: isMe ? 16 : (isFirstOfGroup ? 0 : 16),
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                marginLeft: isMe ? 0 : 8,
                marginRight: isMe ? 8 : 0,
                opacity: pressed ? 0.92 : 1,
                borderWidth: isHighlighted ? 1.5 : 0,
                borderColor: colors.primary,
              },
            ]}
          >
          {isFirstOfGroup && (
            <View 
              style={[
                isMe ? styles.tailRight : styles.tailLeft,
                { borderTopColor: isMe ? chatTheme.bubbleMeBg : chatTheme.bubbleOtherBg }
              ]}
            />
          )}

          {isGroup && !isMe && isFirstOfGroup && (
            <Text 
              style={[
                styles.senderName, 
                { color: getSenderColor(item.senderName), fontFamily: typography.fonts.bold }
              ]}
            >
              {item.senderName}
            </Text>
          )}

          {/* WhatsApp-style nested Reply reference preview */}
          {item.replyTo && (
            <View
              style={[
                styles.replyReference,
                {
                  backgroundColor: isMe 
                    ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.22)') 
                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                  borderLeftColor: isMe ? '#FFFFFF' : chatTheme.bubbleMeBg,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontFamily: typography.fonts.bold, color: isMe ? '#FFFFFF' : chatTheme.bubbleMeBg }}>
                {item.replyTo.senderName}
              </Text>
              <Text style={{ fontSize: 12, color: isMe ? 'rgba(255, 255, 255, 0.85)' : chatTheme.textOther }} numberOfLines={1}>
                {item.replyTo.content}
              </Text>
            </View>
          )}

          {/* Message content (text / image / video / file / smart card / deleted placeholder) */}
          {item.isDeleted ? (
            <View style={styles.deletedMessageContainer}>
              <Ionicons
                name="ban-outline"
                size={14}
                color={isMe ? (isDark ? 'rgba(255,255,255,0.5)' : '#64748B') : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.deletedMessageText,
                  {
                    color: isMe ? (isDark ? 'rgba(255,255,255,0.5)' : '#64748B') : colors.textMuted,
                    fontFamily: typography.fonts.regular,
                    fontStyle: 'italic',
                  },
                ]}
              >
                {isMe ? 'You deleted this message' : 'This message was deleted'}
              </Text>
            </View>
          ) : (
            messageContent || (
              <Text
                style={[
                  styles.messageText,
                  { color: isMe ? chatTheme.textMe : chatTheme.textOther, fontFamily: typography.fonts.regular },
                ]}
              >
                {item.content}
              </Text>
            )
          )}

          {/* ── Upload Progress Arc ── */}
          {!item.isDeleted && isUploading && !uploadError && (
            <CircularProgress
              progress={uploadProgress ?? 0}
              onCancel={() => onCancelUpload(item.id)}
              uploadState={uploadState}
            />
          )}

          {/* ── Upload Error Overlay ── */}
          {!item.isDeleted && uploadError && (
            <UploadErrorOverlay onRetry={() => onRetryUpload(item)} />
          )}

          {/* Reaction labels */}
          {!item.isDeleted && item.reactions && item.reactions.length > 0 && (
            <View
              style={[
                styles.reactionsContainer,
                { backgroundColor: chatTheme.reactionBg, borderColor: chatTheme.reactionBorder, borderWidth: 0.5 },
              ]}
            >
              {item.reactions.slice(0, 3).map((r: ChatMessageReaction, i: number) => (
                <Text key={i} style={styles.reactionMiniText}>{r.reaction}</Text>
              ))}
            </View>
          )}

          {/* Footer: time, pin, star, delivery tick */}
          <View style={styles.messageFooter}>
            {!item.isDeleted && item.isPinned && (
              <Ionicons name="pin" size={10} color={isMe ? 'rgba(255,255,255,0.8)' : chatTheme.bubbleMeBg} style={{ marginRight: 4 }} />
            )}
            {!item.isDeleted && item.starredBy?.includes(currentUserId) && (
              <Ionicons name="star" size={10} color={isMe ? '#FFF700' : '#E2E8F0'} style={{ marginRight: 4 }} />
            )}
            {!item.isDeleted && item.isEdited && (
              <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.5)' : chatTheme.textOther }]}>
                edited
              </Text>
            )}
            <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : chatTheme.textOther }]}>
              {dayjs(item.createdAt).format('hh:mm A')}
            </Text>
            {isMe && !item.isDeleted && <MessageStatus msg={item} currentUserId={currentUserId} onRetry={onRetrySend} />}
          </View>
        </Pressable>
        </Animated.View>
      </View>
    </Swipeable>
  );
}, areEqual);

const styles = StyleSheet.create({
  messageRow: {
    maxWidth: '82%',
  },
  swipeLeftAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    paddingLeft: 10,
  },
  replyReference: {
    padding: 8,
    borderLeftWidth: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  editedLabel: {
    fontSize: 9,
    marginRight: 4,
    fontStyle: 'italic',
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: -10,
    right: 10,
    flexDirection: 'row',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  reactionMiniText: {
    fontSize: 11,
    marginHorizontal: 1,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 9,
    marginRight: 4,
  },

  // ── Progress Arc Overlay ──
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,13,22,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  progressBackdrop: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  arcContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcTrack: {
    position: 'absolute',
  },
  arcHalf: {
    position: 'absolute',
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  arcLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressCancelBtn: {
    marginTop: 8,
  },

  // ── Error Overlay ──
  errorLabel: {
    color: '#EF4444',
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },

  // ── Speech-bubble Tails ──
  tailLeft: {
    position: 'absolute',
    left: -5,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
  },
  tailRight: {
    position: 'absolute',
    right: -5,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderRightColor: 'transparent',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 3,
  },
  deletedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  deletedMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default MessageBubble;
