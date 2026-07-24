/**
 * @file starred.tsx
 * @description Starred message viewer list with swipe-to-unstar actions and jump-to-source navigation.
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useStarredMessages, useUnstarMessage } from '../../../src/features/chat/hooks/useChat';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components';

export default function StarredScreen() {
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: starredMessages = [], isLoading, refetch } = useStarredMessages();
  const unstarMutation = useUnstarMessage();

  const handleUnstar = async (msgId: string) => {
    try {
      await unstarMutation.mutateAsync(msgId);
      toast.success('Message unstarred');
      refetch();
    } catch (e) {
      toast.error('Failed to unstar message');
    }
  };

  const handleJumpToMessage = (item: any) => {
    router.push({
      pathname: `/chat/${item.conversationId}`,
      params: { msgId: item.id },
    });
  };

  const renderStarredItem = ({ item }: { item: any }) => {
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
            onPress={() => handleUnstar(item.id)}
            style={styles.unstarBtn}
            hitSlop={8}
          >
            <Ionicons name="star" size={18} color="#EAB308" />
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
          Starred Messages
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            Loading starred messages...
          </Text>
        </View>
      ) : starredMessages.length > 0 ? (
        <FlatList
          data={starredMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderStarredItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      ) : (
        <View style={styles.centerContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <Ionicons name="star-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            No Starred Messages
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
            Press and hold any message in a chat and select "Star" to keep it handy here.
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
  unstarBtn: {
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
