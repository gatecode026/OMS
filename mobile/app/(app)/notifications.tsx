/**
 * @file notifications.tsx
 * @description System notifications center stack screen. Displays system alerts grouped by date
 *              with category filters, gradient announcement highlight cards, and details navigation.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

import useTheme from '../../src/shared/hooks/useTheme';
import { toast } from '../../src/shared/components/Toast';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  useNotificationPreferences,
  useSaveNotificationPreferences,
  AppNotification,
} from '../../src/features/notifications';
import { EmptyState, Card } from '../../src/shared/components';

// Helper to decode HTML entities like &quot;
const decodeHtmlEntities = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

// Filter Categories list
const FILTER_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'important', label: 'Important' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'task', label: 'Tasks' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'leave', label: 'Leave' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'system', label: 'System' },
];

export default function NotificationsCenterScreen() {
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [prefsVisible, setPrefsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hook integrations
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const { mutate: markAllAsRead } = useMarkAllNotificationsRead();
  const { mutate: markAsRead } = useMarkNotificationRead();
  const { mutate: deleteNotification } = useDeleteNotification();

  const { data: prefs = {}, isLoading: isLoadingPrefs } = useNotificationPreferences();
  const { mutate: savePrefs } = useSaveNotificationPreferences();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleTogglePref = (key: string, currentValue: boolean) => {
    setErrorMessage(null);
    savePrefs(
      { [key]: !currentValue },
      {
        onError: (err: any) => {
          setErrorMessage(err.message || 'Failed to update preferences. Try again.');
        },
      }
    );
  };

  // Helper to resolve Category icon and color
  const getCategoryTheme = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'leave':
        return { icon: 'calendar-outline', color: '#8B5CF6', bg: '#F5F3FF' };
      case 'attendance':
        return { icon: 'finger-print-outline', color: '#10B981', bg: '#ECFDF5' };
      case 'payroll':
        return { icon: 'cash-outline', color: '#F59E0B', bg: '#FEF3C7' };
      case 'task':
        return { icon: 'checkbox-outline', color: '#3B82F6', bg: '#EFF6FF' };
      case 'announcement':
      case 'broadcast':
        return { icon: 'megaphone-outline', color: '#EC4899', bg: '#FDF2F8' };
      case 'meeting':
        return { icon: 'people-outline', color: '#06B6D4', bg: '#ECFEFF' };
      case 'system':
        return { icon: 'settings-outline', color: '#6B7280', bg: '#F9FAFB' };
      default:
        return { icon: 'notifications-outline', color: '#6366F1', bg: '#EEF2FF' };
    }
  };

  // Filter notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const isItemRead = item.isRead ?? item.read ?? false;
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'unread') return !isItemRead;
      if (selectedFilter === 'important') return item.priority === 'high';
      
      const cat = item.category?.toLowerCase() || '';
      const type = item.type?.toLowerCase() || '';
      return cat === selectedFilter || type === selectedFilter;
    });
  }, [notifications, selectedFilter]);

  // Group filtered notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {
      TODAY: [],
      YESTERDAY: [],
      'THIS WEEK': [],
      'LAST WEEK': [],
      EARLIER: [],
    };

    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    const thisWeek = today.subtract(7, 'day');
    const lastWeek = today.subtract(14, 'day');

    filteredNotifications.forEach((item) => {
      const date = dayjs(item.createdAt);
      if (date.isAfter(today)) {
        groups.TODAY.push(item);
      } else if (date.isAfter(yesterday)) {
        groups.YESTERDAY.push(item);
      } else if (date.isAfter(thisWeek)) {
        groups['THIS WEEK'].push(item);
      } else if (date.isAfter(lastWeek)) {
        groups['LAST WEEK'].push(item);
      } else {
        groups.EARLIER.push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredNotifications]);

  // Handle action menu trigger
  const handleMoreMenu = () => {
    setPrefsVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          Notifications
        </Text>
        <Pressable
          onPress={handleMoreMenu}
          style={styles.headerBtn}
          accessibilityLabel="Settings"
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Categories Horizontal Chip Row */}
      <View style={{ paddingVertical: spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        >
          {FILTER_CATEGORIES.map((cat) => {
            const active = selectedFilter === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedFilter(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    marginRight: spacing.sm,
                    borderRadius: radius.circular,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? '#FFFFFF' : colors.textMuted,
                      fontFamily: active ? typography.fonts.bold : typography.fonts.semibold,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="No Notifications Found"
            description="You don't have any alerts in this category."
            icon="notifications-off-outline"
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
        >
          {groupedNotifications.map(([groupName, items]) => (
            <View key={groupName} style={{ marginBottom: spacing.lg }}>
              {/* Group Name Header */}
              <View style={styles.groupHeaderRow}>
                <Text
                  style={[
                    styles.groupTitle,
                    {
                      color: colors.textMuted,
                      fontFamily: typography.fonts.bold,
                    },
                  ]}
                >
                  {groupName}
                </Text>
                {groupName === 'TODAY' && (
                  <Pressable
                    onPress={() => markAllAsRead()}
                    style={styles.markAllReadInlineBtn}
                  >
                    <Ionicons name="checkmark-done" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.markAllReadInlineText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                      Mark all read
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Group Items */}
              {items.map((item) => {
                const isItemRead = item.isRead ?? item.read ?? false;
                const { icon, color, bg } = getCategoryTheme(item.category || item.type);
                const isAnnouncement =
                  item.category?.toLowerCase() === 'announcement' ||
                  item.type?.toLowerCase() === 'broadcast';

                if (isAnnouncement) {
                  // Premium Announcement Gradient Highlight Card
                  return (
                    <Animated.View
                      entering={FadeInDown.duration(300)}
                      layout={Layout.springify()}
                      key={item.id}
                      style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.xs }}
                    >
                      <Pressable
                        onPress={() => {
                          if (!isItemRead) markAsRead(item.id);
                          router.push(`/notifications/${item.id}`);
                        }}
                        style={({ pressed }) => [
                          styles.announcementCard,
                          {
                            backgroundColor: colors.primary,
                            borderRadius: radius.lg,
                            padding: spacing.lg,
                            opacity: pressed ? 0.9 : 1,
                          },
                          shadows.medium,
                        ]}
                      >
                        <View style={styles.announcementBadge}>
                          <Text style={styles.announcementBadgeText}>ANNOUNCEMENT</Text>
                        </View>
                        <Text style={[styles.announcementTitle, { fontFamily: typography.fonts.bold }]}>
                          {decodeHtmlEntities(item.title)}
                        </Text>
                        <Text style={[styles.announcementDesc, { fontFamily: typography.fonts.medium }]} numberOfLines={2}>
                          {decodeHtmlEntities(item.message || '')}
                        </Text>
                        <View style={styles.announcementFooter}>
                          <Text style={styles.announcementTime}>
                            {dayjs(item.createdAt).fromNow()}
                          </Text>
                          {!isItemRead && <View style={styles.unreadDotAnnouncement} />}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                }

                // Regular Notification Card
                return (
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    layout={Layout.springify()}
                    key={item.id}
                    style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.xs }}
                  >
                    <Pressable
                      onPress={() => {
                        if (!isItemRead) markAsRead(item.id);
                        router.push(`/notifications/${item.id}`);
                      }}
                      onLongPress={() => {
                        deleteNotification(item.id);
                        toast.info('Notification removed');
                      }}
                      style={({ pressed }) => [
                        styles.notificationCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderRadius: radius.md,
                          padding: spacing.md,
                          opacity: pressed ? 0.8 : 1,
                        },
                        shadows.light,
                      ]}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : bg }]}>
                        <Ionicons name={icon as any} size={20} color={isDark ? colors.text : color} />
                      </View>
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text
                            style={[
                              styles.cardTitle,
                              {
                                color: colors.text,
                                fontFamily: isItemRead ? typography.fonts.medium : typography.fonts.bold,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {decodeHtmlEntities(item.title)}
                          </Text>
                          <Text style={[styles.cardTime, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                            {dayjs(item.createdAt).fromNow()}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.cardDesc,
                            {
                              color: colors.textMuted,
                              fontFamily: typography.fonts.regular,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {decodeHtmlEntities(item.message || '')}
                        </Text>
                      </View>
                      {!isItemRead && (
                        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Preferences Settings Modal */}
      <Modal
        visible={prefsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPrefsVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(15,23,42,0.5)' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radius.lg }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Notification Settings
              </Text>
              <Pressable onPress={() => setPrefsVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Error Banner */}
            {errorMessage && (
              <View style={[styles.errorBanner, { borderColor: colors.danger, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2' }]}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.errorBannerText, { color: colors.danger, fontFamily: typography.fonts.medium }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Settings toggles list */}
            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
              {[
                { key: 'messages', label: 'Direct & Group Messages' },
                { key: 'mentions', label: 'Mentions & Replies' },
                { key: 'announcements', label: 'Company Announcements' },
                { key: 'tasks', label: 'Task Assignments' },
                { key: 'meetings', label: 'Meeting Invites' },
                { key: 'system', label: 'System Alerts' },
              ].map((item) => {
                const isEnabled = prefs[item.key] ?? true;
                return (
                  <View key={item.key} style={[styles.preferenceRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.preferenceLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                      {item.label}
                    </Text>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => handleTogglePref(item.key, isEnabled)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  cardTime: {
    fontSize: 11,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  announcementCard: {
    position: 'relative',
  },
  announcementBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  announcementBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  announcementTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  announcementDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  unreadDotAnnouncement: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
    marginTop: 12,
  },
  markAllReadInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllReadInlineText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 13,
    flex: 1,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: 16,
  },
});
