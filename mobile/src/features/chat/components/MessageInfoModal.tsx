/**
 * @file MessageInfoModal.tsx
 * @description WhatsApp-style Message Info Modal displaying delivery timestamps,
 *              read statuses, file metadata, and delivery/read timeline details.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage } from '../types';
import { formatBytes } from '../utils/fileUtils';

interface MessageInfoModalProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  visible,
  message,
  onClose,
}) => {
  const { colors, typography, isDark } = useTheme();

  if (!message) return null;

  const cardBg = isDark ? '#1F2C34' : '#FFFFFF';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const subTextColor = isDark ? '#8696A0' : '#667781';
  const separatorColor = isDark ? '#222D34' : '#F0F2F5';

  const isRead = message.status === 'read' || message.isRead;
  const isDelivered = isRead || message.status === 'delivered' || message.isDelivered;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" translucent />

        <View style={[styles.container, { backgroundColor: isDark ? '#111B21' : '#F0F2F5' }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: separatorColor }]}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: textColor, fontFamily: typography.fonts.bold }]}>
              Message Info
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Message Preview Bubble Card */}
            <View style={[styles.previewCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.previewLabel, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
                {message.type.toUpperCase()} MESSAGE
              </Text>
              
              <Text style={[styles.previewContent, { color: textColor, fontFamily: typography.fonts.regular }]}>
                {message.content || message.media?.fileName || 'Media Attachment'}
              </Text>

              {message.media && (
                <View style={styles.mediaDetailsRow}>
                  <Ionicons name="document-text-outline" size={18} color={subTextColor} />
                  <Text style={[styles.mediaDetailsText, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                    {message.media.fileName || 'File'} • {formatBytes(message.media.fileSize)}
                  </Text>
                </View>
              )}

              <Text style={[styles.sentTimestamp, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                Sent: {dayjs(message.createdAt).format('MMM DD, YYYY [at] hh:mm:ss A')}
              </Text>
            </View>

            {/* Read & Delivered Timeline Details */}
            <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
              {/* Read Status Row */}
              <View style={styles.statusRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="checkmark-done"
                    size={22}
                    color={isRead ? '#34B7F1' : subTextColor}
                  />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusTitle, { color: textColor, fontFamily: typography.fonts.semibold }]}>
                    Read
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                    {isRead ? 'Read by recipient' : 'Not read yet'}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: separatorColor }]} />

              {/* Delivered Status Row */}
              <View style={styles.statusRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="checkmark-done"
                    size={22}
                    color={isDelivered ? subTextColor : '#94A3B8'}
                  />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusTitle, { color: textColor, fontFamily: typography.fonts.semibold }]}>
                    Delivered
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                    {isDelivered ? 'Delivered to recipient device' : 'Sent to server'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Technical Metadata */}
            <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionHeader, { color: subTextColor, fontFamily: typography.fonts.bold }]}>
                DETAILS
              </Text>

              <View style={styles.infoFieldRow}>
                <Text style={[styles.infoFieldKey, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                  Message ID
                </Text>
                <Text style={[styles.infoFieldValue, { color: textColor, fontFamily: typography.fonts.regular }]} numberOfLines={1}>
                  {message.id}
                </Text>
              </View>

              <View style={styles.infoFieldRow}>
                <Text style={[styles.infoFieldKey, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                  Status
                </Text>
                <Text style={[styles.infoFieldValue, { color: textColor, fontFamily: typography.fonts.semibold }]}>
                  {message.status ? message.status.toUpperCase() : 'SENT'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  previewContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  mediaDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  mediaDetailsText: {
    fontSize: 13,
  },
  sentTimestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 40,
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  statusTitle: {
    fontSize: 15,
  },
  statusSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoFieldKey: {
    fontSize: 14,
  },
  infoFieldValue: {
    fontSize: 14,
    maxWidth: '65%',
  },
});

export default MessageInfoModal;
