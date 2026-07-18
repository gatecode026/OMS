/**
 * @file pinned.tsx
 * @description Pinned messages list view for a specific chat room, with unpin actions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { usePinnedMessages, useUnpinMessage } from '../../../src/features/chat/hooks/useChat';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components';

export default function PinnedScreen() {
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const conversationId = (params.conversationId as string) || '';

  const { data: pinnedMessages = [], isLoading, refetch } = usePinnedMessages(conversationId);
  const unpinMutation = useUnpinMessage();

  const handleUnpin = async (msgId: string) => {
    try {
      await unpinMutation.mutateAsync({ conversationId, messageId: msgId });
      toast.success('Message unpinned');
      refetch();
    } catch (e) {
      toast.error('Failed to unpin message');
    }
  };

  const handleJumpToMessage = (item: any) => {
    router.push({
      pathname: `/chat/${conversationId}`,
      params: { msgId: item.id },
    });
  };

  const renderPinnedItem = ({ item }: { item: any }) => {
    const formattedTime = new Date(item.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Pressable
        onPress={() => handleJumpToMessage(item)}
        style={[styles.msgItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={styles.msgHeader}>
          <Avatar name={item.senderName} size={32} source={item.senderAvatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.senderName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {item.senderName}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
              {formattedTime}
            </Text>
          </View>

          <Pressable
            onPress={() => handleUnpin(item.id)}
            style={styles.unpinBtn}
            hitSlop={8}
          >
            <Ionicons name="pin" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={[styles.msgContent, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
          {item.content}
        </Text>

        {item.media && (
          <View style={[styles.mediaRow, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: radius.md }]}>
            <Ionicons
              name={item.type === 'image' ? 'image-outline' : item.type === 'video' ? 'videocam-outline' : 'document-attach-outline'}
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.mediaText, { color: colors.primary, fontFamily: typography.fonts.medium }]} numberOfLines={1}>
              {item.media.fileName || 'Attachment'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          Pinned Messages
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            Loading pinned messages...
          </Text>
        </View>
      ) : pinnedMessages.length > 0 ? (
        <FlatList
          data={pinnedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderPinnedItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      ) : (
        <View style={styles.centerContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <Ionicons name="pin-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            No Pinned Messages
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
            Pin important messages in this conversation to find them quickly here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  msgItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  senderName: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
  },
  unpinBtn: {
    padding: 6,
  },
  msgContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  mediaText: {
    fontSize: 12,
    maxWidth: 240,
  },
});
