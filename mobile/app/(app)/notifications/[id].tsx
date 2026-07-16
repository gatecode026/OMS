/**
 * @file [id].tsx
 * @description Notification details screen. Displays detailed alert content with category icons,
 *              meta information, and context-aware action triggers.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import useTheme from '../../../src/shared/hooks/useTheme';
import { useNotifications, useMarkNotificationRead } from '../../../src/features/notifications';
import { Card } from '../../../src/shared/components';

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

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();

  // Load from Query Cache
  const { data: notifications = [], isLoading } = useNotifications();
  const notification = notifications.find((n) => n.id === id);

  const { mutate: markAsRead } = useMarkNotificationRead();

  // Mark notification as read when detail screen mounts
  useEffect(() => {
    if (id && notification && !(notification.isRead ?? notification.read)) {
      markAsRead(id);
    }
  }, [id, notification]);

  const getCategoryTheme = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'leave':
        return { icon: 'calendar', color: '#8B5CF6', bg: '#F5F3FF', label: 'Leave Alert' };
      case 'attendance':
        return { icon: 'finger-print', color: '#10B981', bg: '#ECFDF5', label: 'Attendance Alert' };
      case 'payroll':
        return { icon: 'cash', color: '#F59E0B', bg: '#FEF3C7', label: 'Payroll & Salary' };
      case 'task':
        return { icon: 'checkbox', color: '#3B82F6', bg: '#EFF6FF', label: 'Task Assignment' };
      case 'announcement':
      case 'broadcast':
        return { icon: 'megaphone', color: '#EC4899', bg: '#FDF2F8', label: 'Company Announcement' };
      case 'meeting':
        return { icon: 'people', color: '#06B6D4', bg: '#ECFEFF', label: 'Meeting Invite' };
      case 'system':
        return { icon: 'settings', color: '#6B7280', bg: '#F9FAFB', label: 'System Alert' };
      default:
        return { icon: 'notifications', color: '#6366F1', bg: '#EEF2FF', label: 'General Alert' };
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!notification) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} style={{ marginBottom: spacing.md }} />
        <Text style={{ color: colors.text, fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold }}>
          Notification not found or has been deleted.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary, marginTop: spacing.lg, borderRadius: radius.md }]}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const { icon, color, bg, label } = getCategoryTheme(notification.category || notification.type);
  const isHighPriority = notification.priority === 'high';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          Detail
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Category Header Card */}
        <View style={styles.metaRow}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : bg }]}>
            <Ionicons name={icon as any} size={24} color={isDark ? colors.text : color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metaLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
              {label.toUpperCase()}
            </Text>
            <Text style={[styles.metaTime, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              {dayjs(notification.createdAt).format('MMMM DD, YYYY · hh:mm A')}
            </Text>
          </View>
          {isHighPriority && (
            <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.priorityBadgeText}>IMPORTANT</Text>
            </View>
          )}
        </View>

        {/* Content Panel */}
        <Card style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            {decodeHtmlEntities(notification.title)}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.description, { color: colors.text, fontFamily: typography.fonts.regular }]}>
            {decodeHtmlEntities(notification.message)}
          </Text>
        </Card>

        {/* Action Button Mapping based on category */}
        <View style={{ marginTop: spacing.xl }}>
          {notification.category?.toLowerCase() === 'leave' && (
            <Pressable
              onPress={() => router.push('/(app)/profile')}
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            >
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.actionBtnText, { fontFamily: typography.fonts.bold }]}>
                View Leave Summary
              </Text>
            </Pressable>
          )}

          {notification.category?.toLowerCase() === 'attendance' && (
            <Pressable
              onPress={() => router.push('/(app)/attendance-history')}
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            >
              <Ionicons name="time-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.actionBtnText, { fontFamily: typography.fonts.bold }]}>
                Check Attendance History
              </Text>
            </Pressable>
          )}

          {notification.category?.toLowerCase() === 'task' && (
            <Pressable
              onPress={() => router.push('/(app)/work')}
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            >
              <Ionicons name="checkbox-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.actionBtnText, { fontFamily: typography.fonts.bold }]}>
                View My Tasks
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metaLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaTime: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 9,
    color: '#EF4444',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  contentCard: {
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
