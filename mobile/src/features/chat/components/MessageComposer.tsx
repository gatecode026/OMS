/**
 * @file MessageComposer.tsx
 * @description Premium chat message input bar matching WhatsApp aesthetics.
 * - PanResponder on the mic button area: slide left → cancel, slide up → lock
 * - Passes lockProgress (0–1) to VoiceRecorder for visual lock fill
 * - Left/Right plugin slots for attachment button and emoji button
 * - Reply/Edit preview bars nested inside the unified card
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  PanResponder,
  Animated,
  Keyboard,
  Platform,
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

  // Block states
  isBlockedByMe?: boolean;
  isBlockedByThem?: boolean;
  onUnblock?: () => void;
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
  isBlockedByMe = false,
  isBlockedByThem = false,
  onUnblock,
}) => {
  const { colors, radius, typography, isDark } = useTheme();


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

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View style={{ width: '100%', paddingBottom: isKeyboardVisible ? 6 : (insets.bottom || 6), backgroundColor: 'transparent' }}>
      {isBlockedByMe ? (
        <View style={[styles.blockedBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.blockedText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            You blocked this contact.
          </Text>
          <Pressable onPress={onUnblock} style={styles.unblockBtn}>
            <Text style={[styles.unblockText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
              Unblock
            </Text>
          </Pressable>
        </View>
      ) : isBlockedByThem ? (
        <View style={[styles.blockedBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.blockedText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            This contact is unavailable.
          </Text>
        </View>
      ) : (
        <View style={styles.footerInputRow}>
        
        {/* Unified Input Card (Pill shape) */}
        {!isRecording && (
          <View style={[styles.composerMainCard, { backgroundColor: colors.surface }]}>
            {/* Reply Preview Bar */}
            {replyTo && (
              <View style={[styles.contextBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderLeftColor: colors.primary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: typography.fonts.bold, color: colors.primary }}>
                    {replyTo.senderName}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                    {replyTo.content || '[Attachment]'}
                  </Text>
                </View>
                <Pressable onPress={onClearReply} hitSlop={10}>
                  <Ionicons name="close" size={16} color={colors.textLight} />
                </Pressable>
              </View>
            )}

            {/* Edit Mode Preview Bar */}
            {isEditingMode && (
              <View style={[styles.contextBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderLeftColor: colors.warning }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: typography.fonts.bold, color: colors.warning }}>
                    Editing Message
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                    {messageText}
                  </Text>
                </View>
                <Pressable onPress={onClearEdit} hitSlop={10}>
                  <Ionicons name="close" size={16} color={colors.textLight} />
                </Pressable>
              </View>
            )}

            {/* Text Input Row containing plugins and input field */}
            <View style={styles.inputRow}>
              {/* Emoji button on the left */}
              {rightPlugins.map((plugin, idx) => (
                <View key={`right-${idx}`}>{plugin}</View>
              ))}

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

              {/* Attachment button on the right */}
              {leftPlugins.map((plugin, idx) => (
                <View key={`left-${idx}`}>{plugin}</View>
              ))}
            </View>
          </View>
        )}

        {isRecording && (
          <VoiceRecorder
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            recordingLocked={recordingLocked}
            onCancel={onCancelRecording}
            lockProgress={lockProgress}
          />
        )}

        {/* Send / Mic Circular Button */}
        {isRecording ? (
          recordingLocked ? (
            <View style={styles.lockedControls}>
              <Pressable onPress={onCancelRecording} style={styles.lockControlBtn} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
              <Pressable
                onPress={onStopAndSendRecording}
                style={[styles.sendBtn, { backgroundColor: '#075E54' }]}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View
              {...micPanResponder.panHandlers}
              style={[styles.sendBtn, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="mic" size={18} color="#FFFFFF" />
            </View>
          )
        ) : messageText.trim() ? (
          <Pressable
            onPress={onSend}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            onLongPress={onStartRecording}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            delayLongPress={200}
          >
            <Ionicons name="mic" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  composerMainCard: {
    flex: 1,
    borderRadius: 24,
    marginRight: 6,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    margin: 6,
    borderRadius: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 6,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  lockedControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockControlBtn: {
    padding: 10,
    marginRight: 6,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 0.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  blockedText: {
    fontSize: 13,
  },
  unblockBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unblockText: {
    fontSize: 13,
  },
});

export default MessageComposer;
