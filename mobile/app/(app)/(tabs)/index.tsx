/**
 * @file index.tsx
 * @description Modular, pixel-perfect Enterprise Dashboard matching approved mockup UI
 *              with dynamic attendance bindings, 8-icon quick access grid, upcoming events
 *              with attendee badges/chevrons, header notifications, and full light/dark theme compatibility.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Pressable,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import useBranding from '../../../src/shared/hooks/useBranding';
import {
  useAttendance,
  useAttendanceHistory,
} from '../../../src/features/attendance/hooks/useAttendance';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '../../../src/features/dashboard/hooks/useDashboard';
import { UpcomingEvent } from '../../../src/features/dashboard/api/dashboardApi';
import { useNotificationsUnreadCount } from '../../../src/features/notifications';
import useAuthStore from '../../../src/shared/store/authStore';
import { connectSocket } from '../../../src/shared/services/socketManager';
import {
  Card,
  Avatar,
  Badge,
  BottomSheet,
  ListItem,
  Skeleton,
  ErrorState,
  Logo,
} from '../../../src/shared/components';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 12-hour format converter helper
const formatTime12h = (time24?: string) => {
  if (!time24 || time24 === '--:--') return 'Pending';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // Hour '0' -> '12'
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
};

// Robust format parser helper supporting 12h, 24h and ISO strings
const parseTimeToDate = (timeStr?: string) => {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  
  if (clean.includes('-') && dayjs(clean).isValid()) {
    return dayjs(clean);
  }

  const match12h = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12h) {
    let hours = parseInt(match12h[1], 10);
    const minutes = parseInt(match12h[2], 10);
    const ampm = match12h[3].toUpperCase();

    if (ampm === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
  }

  const match24h = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24h) {
    const hours = parseInt(match24h[1], 10);
    const minutes = parseInt(match24h[2], 10);
    const seconds = match24h[3] ? parseInt(match24h[3], 10) : 0;
    return dayjs().hour(hours).minute(minutes).second(seconds).millisecond(0);
  }

  const parsed = dayjs(clean);
  return parsed.isValid() ? parsed : null;
};

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  title: string;
  isPunchedIn: boolean;
  isLoading: boolean;
}

const SwipeButton: React.FC<SwipeButtonProps> = ({
  onSwipeComplete,
  title,
  isPunchedIn,
  isLoading,
}) => {
  const pan = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const thumbSize = 46;
  const padding = 4;
  const maxTravel = containerWidth - thumbSize - padding * 2;

  const panResponder = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (e, gestureState) => {
        if (maxTravel <= 0 || isLoading) return;
        let x = gestureState.dx;
        if (x < 0) x = 0;
        if (x > maxTravel) x = maxTravel;
        pan.setValue(x);
      },
      onPanResponderRelease: (e, gestureState) => {
        if (maxTravel <= 0 || isLoading) return;
        if (gestureState.dx >= maxTravel * 0.8) {
          Animated.timing(pan, {
            toValue: maxTravel,
            duration: 100,
            useNativeDriver: false,
          }).start(() => {
            onSwipeComplete();
            Animated.spring(pan, {
              toValue: 0,
              tension: 40,
              friction: 8,
              useNativeDriver: false,
            }).start();
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
    [maxTravel, isLoading, onSwipeComplete, pan]
  );

  const { colors } = useTheme();
  const thumbColor = isPunchedIn ? colors.primary : '#10B981'; // Primary theme color when punched in, Green before

  const rotation = pan.interpolate({
    inputRange: [0, maxTravel > 0 ? maxTravel : 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={styles.swipeContainer}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.swipeText} numberOfLines={1}>
        {isLoading ? 'Processing...' : title}
      </Text>

      <Animated.View
        style={[
          styles.swipeThumb,
          {
            transform: [
              { translateX: pan },
              { rotate: rotation }
            ],
            backgroundColor: thumbColor,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="finger-print-outline" size={22} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, typography, isDark, setThemeMode } = useTheme();
  const { companyName } = useBranding();
  const insets = useSafeAreaInsets();

  // Load backend states via React Query hooks
  const {
    role,
    user,
    events,
    isLoading: isDashboardLoading,
    hasError,
    refetchAll: refetchDashboard,
  } = useDashboard();

  // Load attendance module bindings
  const {
    todayRecord,
    clockIn,
    clockOut,
    isClockingIn,
    isClockingOut,
    refetchStatus: refetchTodayAttendance,
  } = useAttendance();

  // Load monthly history to calculate dynamic attendance rates
  const currentMonth = dayjs().format('YYYY-MM');
  const {
    summary: monthSummary,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useAttendanceHistory(currentMonth);

  const { data: dbUnreadCount = 0, refetch: refetchUnreadCount } = useNotificationsUnreadCount();
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync with DB count
  useEffect(() => {
    setUnreadCount(dbUnreadCount);
  }, [dbUnreadCount]);

  // Refetch notification unread count whenever dashboard screen gets focus
  useFocusEffect(
    React.useCallback(() => {
      refetchUnreadCount();
    }, [refetchUnreadCount])
  );

  // Listen for real-time WebSocket unread badge count updates
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token) {
      const socket = connectSocket(token);

      socket.on('notification:unread_count', ({ count }: any) => {
        setUnreadCount(count);
      });

      socket.on('notification:unread_reset', () => {
        setUnreadCount(0);
      });

      return () => {
        socket.off('notification:unread_count');
        socket.off('notification:unread_reset');
      };
    }
  }, []);

  // Component UI local states
  const [refreshing, setRefreshing] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00h 00m 00s');

  // Register global floating FAB trigger
  useEffect(() => {
    (global as any).showQuickActionsSheet = () => {
      setIsActionsVisible(true);
    };
    return () => {
      (global as any).showQuickActionsSheet = undefined;
    };
  }, []);

  // Update working time counter dynamically with seconds
  useEffect(() => {
    const updateTimer = () => {
      if (
        todayRecord?.punchIn &&
        todayRecord.punchIn !== '--:--' &&
        (!todayRecord.punchOut || todayRecord.punchOut === '--:--' || todayRecord.punchOut === 'Pending')
      ) {
        const punchDate = parseTimeToDate(todayRecord.punchIn);
        if (punchDate && punchDate.isValid()) {
          const diffSecs = dayjs().diff(punchDate, 'second');
          if (diffSecs > 0) {
            const hrs = Math.floor(diffSecs / 3600);
            const mins = Math.floor((diffSecs % 3600) / 60);
            const secs = diffSecs % 60;
            setElapsedTime(
              `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
            );
          } else {
            setElapsedTime('00h 00m 00s');
          }
        } else {
          setElapsedTime('00h 00m 00s');
        }
      } else if (todayRecord?.totalHours) {
        let breakSecs = 0;
        if (todayRecord.breakTime) {
          const clean = todayRecord.breakTime.toLowerCase();
          if (clean.includes('min')) {
            const mins = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 0;
            breakSecs = mins * 60;
          } else if (clean.includes('h')) {
            const parts = clean.split('h');
            const hrs = parseInt(parts[0], 10) || 0;
            const mins = parseInt(parts[1]?.replace(/[^0-9]/g, ''), 10) || 0;
            breakSecs = (hrs * 60 + mins) * 60;
          }
        }
        const totalSecs = Math.round(todayRecord.totalHours * 3600) + breakSecs;
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        setElapsedTime(
          `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
        );
      } else {
        setElapsedTime('00h 00m 00s');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Check every 1 second for live seconds
    return () => clearInterval(interval);
  }, [todayRecord]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Invalidate every active query on the screen to trigger fresh network refetches
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const handleQuickClockToggle = async () => {
    setIsActionsVisible(false);

    const hasPunchedIn = todayRecord && todayRecord.punchIn && todayRecord.punchIn !== '--:--';
    const hasPunchedOut = todayRecord && todayRecord.punchOut && todayRecord.punchOut !== '--:--';

    if (hasPunchedOut) {
      return;
    }

    if (!hasPunchedIn) {
      await clockIn({
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      });
    } else {
      await clockOut({
        id: todayRecord.id,
        payload: {
          notes: 'Shift completed.',
        },
      });
    }
    // Refresh states after punching
    await Promise.all([refetchTodayAttendance(), refetchHistory()]);
  };

  // Get Today's overtime dynamically from totalHours (>8 hours limit)
  const getTodayOvertime = () => {
    if (todayRecord && todayRecord.totalHours && todayRecord.totalHours > 8) {
      const diff = todayRecord.totalHours - 8;
      const hrs = Math.floor(diff);
      const mins = Math.round((diff - hrs) * 60);
      return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
    }
    return '00h 00m';
  };

  // Get dynamic attendance rate
  const getAttendanceRate = () => {
    if (!monthSummary || !monthSummary.totalWorkingDays) return '83%';
    const rate = Math.round((monthSummary.presentDays / monthSummary.totalWorkingDays) * 100);
    return `${rate}%`;
  };

  // Dynamic Greeting Generator
  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Resolve status tags
  const getStatusBadgeStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('present')) {
      return { bg: 'rgba(16,185,129,0.1)', border: '#10B981', text: '#10B981' };
    }
    if (s.includes('late')) {
      return { bg: 'rgba(249,115,22,0.1)', border: '#F97316', text: '#F97316' };
    }
    if (s.includes('absent')) {
      return { bg: 'rgba(239,68,68,0.1)', border: '#EF4444', text: '#EF4444' };
    }
    return { bg: 'rgba(148,163,184,0.1)', border: '#94A3B8', text: '#94A3B8' };
  };

  // Quick Action Grid configuration matching approved mockup
  const quickAccessItems = [
    { label: 'Attendance', icon: 'time-outline', color: '#3B82F6', route: 'attendance' },
    { label: 'Leave', icon: 'calendar-outline', color: '#F59E0B', route: 'leave' },
    { label: 'Payslip', icon: 'document-text-outline', color: '#8B5CF6', route: 'payroll' },
    { label: 'Tasks', icon: 'checkbox-outline', color: '#10B981', route: 'work' },
    { label: 'Calendar', icon: 'today-outline', color: '#EC4899', route: 'work' },
    { label: 'Reports', icon: 'bar-chart-outline', color: '#14B8A6', route: 'reports' },
    { label: 'Documents', icon: 'folder-open-outline', color: '#3B82F6', route: 'documents' },
    { label: 'Projects', icon: 'briefcase-outline', color: '#6366F1', route: 'projects' },
  ];

  const isLoading = isDashboardLoading || isHistoryLoading;

  const todayStatus = todayRecord?.status || 'ABSENT';
  const badgeStyle = getStatusBadgeStyles(todayStatus);

  const getShiftCompletedBgColor = (statusStr?: string) => {
    if (!statusStr) return '#10B981'; // default green (Present)
    const st = statusStr.toLowerCase();
    if (st.includes('present')) return '#10B981'; // Present (green)
    if (st.includes('late')) return '#F97316'; // Late (orange)
    if (st.includes('half')) return '#EAB308'; // Half Day (yellowish/amber)
    if (st.includes('leave') || st.includes('off')) return '#8B5CF6'; // Paid Leave (purple)
    if (st.includes('absent')) return '#EF4444'; // Absent (red)
    return '#10B981';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── 1. Header (Menu, Hello Wave, Notifications, Avatar) ─── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 16, backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.menuButton}>
            <Ionicons name="menu-outline" size={26} color={colors.text} />
          </Pressable>
          <View style={styles.greetingContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.helloText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Hello, {user?.name?.split(' ')[0] || 'Employee'}
              </Text>
            </View>
            <Text style={[styles.greetingSubText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              {getGreeting()}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerIconsGroup}>
            <Pressable
              onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
              style={styles.iconButton}
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon-outline'}
                size={22}
                color={colors.text}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={styles.iconButton}
              accessibilityLabel="Notifications"
              accessible
              accessibilityRole="button"
            >
              <Ionicons name="notifications" size={22} color={colors.text} />
              {unreadCount > 0 && (
                <Badge content={String(unreadCount)} style={styles.notificationBadge} />
              )}
            </Pressable>
          </View>
          <Avatar
            name={user?.name || 'User'}
            size={38}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80, paddingHorizontal: spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
            {/* Attendance card skeleton */}
            <Skeleton height={200} borderRadius={20} />
            
            {/* Quick Access skeleton */}
            <View style={styles.sectionHeaderRow}>
              <Skeleton width={120} height={20} borderRadius={4} />
            </View>
            <View style={styles.quickGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={styles.gridCell}>
                  <Skeleton height={48} borderRadius={14} style={{ marginBottom: 6 }} />
                  <Skeleton height={10} borderRadius={2} />
                </View>
              ))}
            </View>

            {/* Upcoming events skeleton */}
            <View style={styles.sectionHeaderRow}>
              <Skeleton width={140} height={20} borderRadius={4} />
            </View>
            <Skeleton height={70} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={70} borderRadius={16} />
          </View>
        ) : hasError ? (
          <ErrorState
            message="We were unable to load your dashboard metrics. Please check your connection and try again."
            onRetry={handleRefresh}
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {/* ─── 2. My Attendance Card (High-Fidelity Match) ─── */}
            <Card
              style={[
                styles.attendanceCard,
                {
                  backgroundColor: '#1E293B', // Beautiful deep dark slate-blue
                  borderColor: 'rgba(255,255,255,0.06)',
                },
              ]}
            >
              <View style={styles.attendanceCardHeader}>
                <Text style={styles.attendanceCardTitle}>My Attendance</Text>
                <Pressable onPress={() => router.push('/attendance-history')}>
                  <Text style={[styles.viewHistoryLink, { color: '#C084FC' }]}>View History</Text>
                </Pressable>
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusCol}>
                  <Text style={styles.cardLabel}>TODAY'S STATUS</Text>
                  <View style={[styles.statusBadge, { borderColor: badgeStyle.border, backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>
                      {todayStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeCol}>
                  <Text style={styles.cardLabel}>PUNCH IN</Text>
                  <Text style={styles.cardTimeValue}>
                    {todayRecord?.punchIn && todayRecord.punchIn !== '--:--'
                      ? formatTime12h(todayRecord.punchIn)
                      : '--:--'}
                  </Text>
                </View>

                <View style={styles.timeCol}>
                  <Text style={styles.cardLabel}>PUNCH OUT</Text>
                  <Text style={styles.cardTimeValue}>
                    {todayRecord?.punchOut && todayRecord.punchOut !== '--:--'
                      ? formatTime12h(todayRecord.punchOut)
                      : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Row of 3 mini metric cards */}
              <View style={styles.miniMetricsRow}>
                <View style={[styles.miniMetricBox, { flex: 1.4 }]}>
                  <View style={styles.miniMetricHeader}>
                    <Ionicons name="time-outline" size={13} color="#60A5FA" style={{ marginRight: 4 }} />
                    <Text style={styles.miniMetricLabel}>WORKING</Text>
                  </View>
                  <Text style={styles.miniMetricValue}>{elapsedTime}</Text>
                </View>

                <View style={[styles.miniMetricBox, { flex: 1.0 }]}>
                  <View style={styles.miniMetricHeader}>
                    <Ionicons name="timer-outline" size={13} color="#F472B6" style={{ marginRight: 4 }} />
                    <Text style={styles.miniMetricLabel}>OVERTIME</Text>
                  </View>
                  <Text style={styles.miniMetricValue}>{getTodayOvertime()}</Text>
                </View>

                <View style={[styles.miniMetricBox, { flex: 0.7 }]}>
                  <View style={styles.miniMetricHeader}>
                    <Ionicons name="trending-up" size={13} color="#34D399" style={{ marginRight: 4 }} />
                    <Text style={styles.miniMetricLabel}>RATE</Text>
                  </View>
                  <Text style={styles.miniMetricValue}>{getAttendanceRate()}</Text>
                </View>
              </View>

              {/* Swipe to check in / out slider */}
              <View style={{ marginTop: 12 }}>
                {todayRecord?.punchOut && todayRecord.punchOut !== '--:--' ? (
                  <View style={[styles.swipeContainer, { backgroundColor: getShiftCompletedBgColor(todayRecord?.status), borderColor: 'transparent' }]}>
                    <Text style={[styles.swipeText, { color: '#FFFFFF', fontFamily: typography.fonts.bold }]}>
                      Shift Completed ({todayRecord?.status || 'Present'}) 🎉
                    </Text>
                  </View>
                ) : (
                  <SwipeButton
                    title={
                      todayRecord?.punchIn && todayRecord.punchIn !== '--:--'
                        ? 'Swipe to Punch Out'
                        : 'Swipe to Punch In'
                    }
                    isPunchedIn={!!(todayRecord?.punchIn && todayRecord.punchIn !== '--:--')}
                    onSwipeComplete={handleQuickClockToggle}
                    isLoading={isClockingIn || isClockingOut}
                  />
                )}
              </View>
            </Card>

            {/* ─── 3. Quick Access Grid (Mockup Reference Matched) ─── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Quick Access
              </Text>
              <Pressable>
                <Text style={[styles.seeAllLink, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
                  See All
                </Text>
              </Pressable>
            </View>

            <View style={styles.quickGrid}>
              {quickAccessItems.map((item, index) => (
                <View key={index} style={styles.gridCell}>
                  <Pressable
                    style={styles.gridItemPressable}
                    onPress={() => {
                      if (item.route) {
                        router.push(`/${item.route}` as any);
                      }
                    }}
                  >
                    <View style={[styles.gridIconBadge, { backgroundColor: `${item.color}15` }]}>
                      <Ionicons name={item.icon as any} size={24} color={item.color} />
                    </View>
                    <Text style={[styles.gridLabel, { color: colors.text, fontFamily: typography.fonts.medium }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* ─── 4. Upcoming Events (Mockup Reference Matched) ─── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Upcoming Events
              </Text>
              <Pressable>
                <Text style={[styles.seeAllLink, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
                  See All
                </Text>
              </Pressable>
            </View>

            {events.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No upcoming meetings or events.
                </Text>
              </View>
            ) : (
              events.map((event: UpcomingEvent) => {
                const isMeeting = event.type === 'meeting';
                return (
                  <Card key={event.id} style={[styles.eventCard, { borderColor: colors.border }]}>
                    <View style={styles.eventLeft}>
                      <View style={[styles.eventIconCircle, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons
                          name={isMeeting ? 'people' : 'shield-checkmark'}
                          size={20}
                          color="#4F46E5"
                        />
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                          {event.title}
                        </Text>
                        <Text style={[styles.eventTime, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                          {dayjs(event.startTime).format('dddd, hh:mm A')}
                        </Text>
                      </View>
                    </View>

                    {/* Right element matching mockup */}
                    {isMeeting && event.attendees && event.attendees.length > 0 ? (
                      <View style={styles.avatarGroup}>
                        {event.attendees.slice(0, 2).map((att: any, idx: number) => (
                          <View key={att.id} style={[styles.overlappingAvatar, { left: idx * -10 }]}>
                            <Avatar
                              name={att.name}
                              size={24}
                            />
                          </View>
                        ))}
                        {event.attendees.length > 2 && (
                          <View style={[styles.moreAttendeesBadge, { left: 2 * -10, backgroundColor: colors.border }]}>
                            <Text style={[styles.moreAttendeesText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                              +{event.attendees.length - 2}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    )}
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Center FAB actions Bottom Sheet */}
      <BottomSheet
        visible={isActionsVisible}
        onClose={() => setIsActionsVisible(false)}
        title="Quick Actions"
      >
        <View style={styles.actionsSheetList}>
          <ListItem
            title="Clock In / Out"
            description="Toggle your daily attendance check-in status"
            leftIcon="time-outline"
            onPress={handleQuickClockToggle}
          />
          <ListItem
            title="Request Leave"
            description="Apply for annual, sick, or casual leaves"
            leftIcon="calendar-outline"
            onPress={() => {
              setIsActionsVisible(false);
              router.push('/leave' as any);
            }}
          />
          <ListItem
            title="Submit Work Report"
            description="Log your daily completed tasks and milestones"
            leftIcon="create-outline"
            onPress={() => {
              setIsActionsVisible(false);
              router.push('/work' as any);
            }}
          />
          <ListItem
            title="Upload Document"
            description="Add certifications, invoices or receipts"
            leftIcon="cloud-upload-outline"
            onPress={() => {
              setIsActionsVisible(false);
              router.push('/documents' as any);
            }}
          />
        </View>
      </BottomSheet>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 6,
    marginLeft: -6,
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helloText: {
    fontSize: 18,
    fontWeight: '700',
  },
  greetingSubText: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  scrollContent: {
    paddingTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 17,
  },
  seeAllLink: {
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  gridCell: {
    width: '25%',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  gridItemPressable: {
    alignItems: 'center',
  },
  gridIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  attendanceCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  attendanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  attendanceCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewHistoryLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusCol: {
    flex: 1.2,
  },
  timeCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTimeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  miniMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  miniMetricBox: {
    flex: 1,
    backgroundColor: '#334155', // slightly lighter Slate
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  miniMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniMetricLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  miniMetricValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  swipeContainer: {
    height: 56,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  swipeText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  swipeThumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 14,
  },
  eventTime: {
    fontSize: 11,
    marginTop: 2,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlappingAvatar: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  moreAttendeesBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  moreAttendeesText: {
    fontSize: 9,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  actionsSheetList: {
    paddingVertical: 8,
  },
});
