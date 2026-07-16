/**
 * @file MessageComposer.tsx
 * @description Premium chat message input bar.
 * - PanResponder on the mic button area: slide left → cancel, slide up → lock
 * - Passes lockProgress (0–1) to VoiceRecorder for visual lock fill
 * - Left/Right plugin slots for attachment button and emoji button
 * - Reply/Edit preview bars above the input
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage } from '../types';
import VoiceRecorder from './VoiceRecorder';
import { EdgeInsets } from 'react-native-safe-area-context';

// Gesture thresholds (px)
const CANCEL_THRESHOLD_X = -60;   // slide left by 60px → cancel
const LOCK_THRESHOLD_Y = -50;     // slide up by 50px → lock

interface MessageComposerProps {
  messageText: string;
  onTextChange: (text: string) => void;
  onSend: () => void;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  isEditingMode: boolean;
  onClearEdit: () => void;

  // Voice Recording props
  isRecording: boolean;
  recordingDuration: number;
  recordingLocked: boolean;
  onCancelRecording: () => void;
  onStartRecording: () => void;
  onStopAndSendRecording: () => void;
  onLockRecording?: () => void;

  insets: EdgeInsets;

  // Extensible Plugins
  leftPlugins?: React.ReactNode[];
  rightPlugins?: React.ReactNode[];
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  messageText,
  onTextChange,
  onSend,
  replyTo,
  onClearReply,
  isEditingMode,
  onClearEdit,
  isRecording,
  recordingDuration,
  recordingLocked,
  onCancelRecording,
  onStartRecording,
  onStopAndSendRecording,
  onLockRecording,
  insets,
  leftPlugins = [],
  rightPlugins = [],
}) => {
  const { colors, radius, typography } = useTheme();

  // Tracks lock progress fill (0–1) based on how far the user slides up
  const [lockProgress, setLockProgress] = useState(0);
  const gestureStartY = useRef(0);
  const gestureStartX = useRef(0);
  const hasTriggeredLock = useRef(false);
  const hasTriggeredCancel = useRef(false);

  // PanResponder for mic button — slide left to cancel, slide up to lock
  const micPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !messageText.trim(),
    onMoveShouldSetPanResponder: () => isRecording,
    onPanResponderGrant: () => {
      hasTriggeredLock.current = false;
      hasTriggeredCancel.current = false;
      setLockProgress(0);
    },
    onPanResponderMove: (_evt, gestureState) => {
      const { dx, dy } = gestureState;

      if (!hasTriggeredLock.current && !hasTriggeredCancel.current) {
        // Calculate lock progress (dy negative = upward)
        if (dy < 0) {
          const progress = Math.min(1, Math.abs(dy) / Math.abs(LOCK_THRESHOLD_Y));
          setLockProgress(progress);
        }

        // Check thresholds
        if (dx < CANCEL_THRESHOLD_X && !hasTriggeredCancel.current) {
          hasTriggeredCancel.current = true;
          onCancelRecording();
          setLockProgress(0);
        } else if (dy < LOCK_THRESHOLD_Y && !hasTriggeredLock.current) {
          hasTriggeredLock.current = true;
          onLockRecording?.();
          setLockProgress(1);
        }
      }
    },
    onPanResponderRelease: () => {
      if (!hasTriggeredLock.current && !hasTriggeredCancel.current) {
        // Released without triggering lock or cancel — stop and send
        if (isRecording) {
          onStopAndSendRecording();
        }
      }
      setLockProgress(0);
    },
    onPanResponderTerminate: () => {
      setLockProgress(0);
    },
  });

  return (
    <View style={{ width: '100%' }}>
      {/* Reply Preview Bar */}
      {replyTo && (
        <View style={[styles.contextBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.contextBarAccent, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: typography.fonts.bold, color: colors.primary }}>
              Replying to {replyTo.senderName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
              {replyTo.content || '[Attachment]'}
            </Text>
          </View>
          <Pressable onPress={onClearReply} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </Pressable>
        </View>
      )}

      {/* Edit Mode Preview Bar */}
      {isEditingMode && (
        <View style={[styles.contextBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.contextBarAccent, { backgroundColor: colors.warning }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontFamily: typography.fonts.bold, color: colors.warning }}>
              Editing Message
            </Text>
          </View>
          <Pressable onPress={onClearEdit} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </Pressable>
        </View>
      )}

      {/* ─── MESSAGE INPUT FOOTER ─── */}
      <View
        style={[
          styles.footerInputRow,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        {/* Left Plugin Slot (attachment button) */}
        {leftPlugins.map((plugin, idx) => (
          <View key={`left-${idx}`}>{plugin}</View>
        ))}

        {isRecording ? (
          <VoiceRecorder
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            recordingLocked={recordingLocked}
            onCancel={onCancelRecording}
            lockProgress={lockProgress}
          />
        ) : (
          <View style={[styles.textInputWrapper, { backgroundColor: colors.background, borderRadius: radius.lg }]}>
            <TextInput
              placeholder="Type a message…"
              placeholderTextColor={colors.textLight}
              value={messageText}
              onChangeText={onTextChange}
              multiline
              accessibilityLabel="Message input field"
              accessibilityRole="text"
              accessible
              style={[styles.textInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
            />
          </View>
        )}

        {/* Right Plugin Slot (emoji button) */}
        {rightPlugins.map((plugin, idx) => (
          <View key={`right-${idx}`}>{plugin}</View>
        ))}

        {/* Send / Mic Button */}
        {isRecording ? (
          recordingLocked ? (
            // Locked state: trash (discard) + send button
            <View style={styles.lockedControls}>
              <Pressable onPress={onCancelRecording} style={styles.lockControlBtn} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
              <Pressable
                onPress={onStopAndSendRecording}
                style={[styles.sendBtn, { backgroundColor: colors.primary, borderRadius: radius.circular }]}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            // Active recording — mic button with PanResponder gesture area
            <View
              {...micPanResponder.panHandlers}
              style={[styles.sendBtn, { backgroundColor: colors.danger, borderRadius: radius.circular }]}
            >
              <Ionicons name="mic" size={18} color="#FFFFFF" />
            </View>
          )
        ) : messageText.trim() ? (
          // Send text button
          <Pressable
            onPress={onSend}
            style={[styles.sendBtn, { backgroundColor: colors.primary, borderRadius: radius.circular }]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          // Idle — mic button (hold to record with PanResponder)
          <Pressable
            onLongPress={onStartRecording}
            style={[styles.sendBtn, { backgroundColor: colors.primary, borderRadius: radius.circular }]}
            delayLongPress={200}
          >
            <Ionicons name="mic" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  contextBarAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 10,
  },
  footerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  textInputWrapper: {
    flex: 1,
    marginHorizontal: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    maxHeight: 80,
    paddingVertical: 7,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockControlBtn: {
    padding: 8,
    marginRight: 4,
  },
});

export default MessageComposer;
