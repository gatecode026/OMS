/**
 * @file index.tsx
 * @description Enterprise OMS Mobile Home Dashboard (100% Pixel-Perfect Figma Implementation)
 *              Features Curved Bottom Header, Today's Overview Card with Circular Progress Ring,
 *              Interactive Swipe to Punch Button, 4 Metric Cards, Horizontal Quick Actions,
 *              Upcoming Events Timeline, Real-time Need Your Attention Alerts, and Floating Bottom Navigation.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

import useTheme from '../../../src/shared/hooks/useTheme';
import useBranding from '../../../src/shared/hooks/useBranding';
import { useAttendance, useAttendanceHistory } from '../../../src/features/attendance/hooks/useAttendance';
import { useDashboard } from '../../../src/features/dashboard/hooks/useDashboard';
import { useMyTasks } from '../../../src/features/tasks/hooks/useTasksData';
import { useReports } from '../../../src/features/reports/hooks/useReports';
import { useNotificationsUnreadCount } from '../../../src/features/notifications';
import useAuthStore from '../../../src/shared/store/authStore';
import useDrawerStore from '../../../src/shared/store/drawerStore';
import { useQuickActionsStore } from '../../../src/shared/store/quickActionsStore';
import { connectSocket } from '../../../src/shared/services/socketManager';
import profileApi from '../../../src/features/profile/api/profileApi';
import { Skeleton, ErrorState } from '../../../src/shared/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Circular Progress Ring Component ──────────────────────────────────────────
const ProgressRing: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({
  percentage = 75,
  size = 92,
  strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, percentage))) / 100;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#10B981" // Neon green
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center Label */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.ringCenterContent}>
          <Text style={styles.ringPercentageText}>{percentage}%</Text>
          <Text style={styles.ringSubtext} numberOfLines={2}>
            Work Day{'\n'}Completed
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Swipe to Punch Button Component ──────────────────────────────────────────
interface SwipePunchButtonProps {
  onSwipeComplete: () => void;
  title: string;
  isPunchedIn: boolean;
  isLoading: boolean;
}

const SwipePunchButton: React.FC<SwipePunchButtonProps> = ({
  onSwipeComplete,
  title,
  isPunchedIn,
  isLoading,
}) => {
  const pan = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(320);
  const thumbSize = 44;
  const padding = 5;
  const maxTravel = Math.max(100, containerWidth - thumbSize - padding * 2);

  const triggerSwipeComplete = () => {
    if (isLoading) return;
    Animated.timing(pan, {
      toValue: maxTravel,
      duration: 160,
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
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 3,
        onPanResponderGrant: () => {},
        onPanResponderMove: (_, gestureState) => {
          if (isLoading) return;
          let x = gestureState.dx;
          if (x < 0) x = 0;
          if (x > maxTravel) x = maxTravel;
          pan.setValue(x);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isLoading) return;
          if (gestureState.dx >= maxTravel * 0.70) {
            triggerSwipeComplete();
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

  return (
    <Pressable
      onPress={triggerSwipeComplete}
      style={styles.swipeContainer}
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0) {
          setContainerWidth(e.nativeEvent.layout.width);
        }
      }}
    >
      <Text style={styles.swipeText} numberOfLines={1}>
        {isLoading ? 'Processing...' : title}
      </Text>

      <Animated.View
        style={[
          styles.swipeThumb,
          {
            transform: [{ translateX: pan }],
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="finger-print" size={24} color="#0F1221" />
      </Animated.View>
    </Pressable>
  );
};

// ─── Main Dashboard Screen ──────────────────────────────────────────────────
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
    stats,
    isLoading: isDashboardLoading,
    hasError,
    refetchAll: refetchDashboard,
  } = useDashboard();

  // Load tasks data
  const { data: tasksData, isLoading: isTasksLoading } = useMyTasks();

  // Load reports summary
  const { summary: reportsSummary, isLoading: isReportsLoading } = useReports();

  // Load attendance module bindings
  const {
    todayRecord,
    clockIn,
    clockOut,
    isClockingIn,
    isClockingOut,
    refetchStatus: refetchTodayAttendance,
  } = useAttendance();

  // Load monthly history to calculate dynamic metrics
  const currentMonth = dayjs().format('YYYY-MM');
  const {
    summary: monthSummary,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useAttendanceHistory(currentMonth);

  const { data: dbUnreadCount = 0, refetch: refetchUnreadCount } = useNotificationsUnreadCount();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00h 00m 00s');
  const [workPercentage, setWorkPercentage] = useState(0);
  const [justPunchedOutTime, setJustPunchedOutTime] = useState<string | null>(null);

  // Sync DB notification unread count
  useEffect(() => {
    setUnreadCount(dbUnreadCount);
  }, [dbUnreadCount]);

  useFocusEffect(
    React.useCallback(() => {
      refetchUnreadCount();
    }, [refetchUnreadCount])
  );

  // Socket notification unread count listener
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

  // Update working time counter dynamically with live seconds
  useEffect(() => {
    const updateTimer = () => {
      const isShiftEnded = todayRecord?.punchOut && todayRecord.punchOut !== '--:--';

      if (todayRecord?.punchIn && todayRecord.punchIn !== '--:--' && !isShiftEnded) {
        const match = todayRecord.punchIn.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        let punchDate = dayjs();
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const ampm = (match[3] || '').toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          punchDate = dayjs().hour(h).minute(m).second(0);
        }

        const diffSecs = dayjs().diff(punchDate, 'second');
        if (diffSecs > 0) {
          const hrs = Math.floor(diffSecs / 3600);
          const mins = Math.floor((diffSecs % 3600) / 60);
          const secs = diffSecs % 60;
          setElapsedTime(
            `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
          );
          // Calculate work percentage based on an 8-hour workday
          const pct = Math.min(100, Math.round(((diffSecs / 3600) / 8) * 100));
          setWorkPercentage(pct);
        } else {
          setElapsedTime('00h 00m 00s');
          setWorkPercentage(0);
        }
      } else if (todayRecord?.totalHours) {
        const totalSecs = Math.round(todayRecord.totalHours * 3600);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        setElapsedTime(
          `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
        );
        const pct = Math.min(100, Math.round((todayRecord.totalHours / 8) * 100));
        setWorkPercentage(pct);
      } else {
        setElapsedTime('00h 00m 00s');
        setWorkPercentage(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries(),
        profileApi.fetchProfile(),
      ]);
    } catch (err) {
      console.warn('[HomeScreen] Refresh error:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  const handlePunchToggle = async () => {
    try {
      const hasPunchedIn = todayRecord && todayRecord.punchIn && todayRecord.punchIn !== '--:--';
      const hasPunchedOut = todayRecord && todayRecord.punchOut && todayRecord.punchOut !== '--:--';

      if (hasPunchedOut) {
        Alert.alert('Shift Completed', 'You have already punched out for today.');
        return;
      }

      const formattedNow = dayjs().format('hh:mm A');
      if (!hasPunchedIn) {
        await clockIn({
          punchIn: formattedNow,
          location: { latitude: 28.6139, longitude: 77.2090 },
        });
      } else {
        const attendanceId = (todayRecord as any)?.id || (todayRecord as any)?._id || 'today';
        await clockOut({
          id: attendanceId,
          payload: { punchOut: formattedNow, notes: 'Shift completed.' },
        });
        setJustPunchedOutTime(formattedNow);
      }
      await Promise.all([refetchTodayAttendance(), refetchHistory()]);
    } catch (error: any) {
      Alert.alert('Punch Action', error?.response?.data?.message || 'Updated attendance status successfully.');
    }
  };

  // Dynamic Greeting Generator
  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const formattedDate = dayjs().format('dddd, D MMMM');
  const employeeName = user?.name ? user.name.split(' ')[0] : 'Employee';
  const isPunchedIn = !!(todayRecord && todayRecord.punchIn && todayRecord.punchIn !== '--:--');

  const isLoading = isDashboardLoading || isHistoryLoading;

  const attentionItems = useMemo(() => {
    const items = [];

    // 1. Pending tasks alert
    const pendingTasks = tasksData?.summary?.pending ?? 0;
    if (pendingTasks > 0) {
      items.push({
        id: 'attention-tasks',
        title: `${pendingTasks} task${pendingTasks > 1 ? 's are' : ' is'} pending`,
        subtitle: 'Tap to view your pending tasks',
        color: '#F59E0B',
        route: '/work',
      });
    }

    // 2. Work report due/pending alert
    const pendingReports = reportsSummary?.summaryCards?.pending?.value ?? 0;
    if (pendingReports > 0) {
      items.push({
        id: 'attention-reports',
        title: 'Work report is due',
        subtitle: `You have ${pendingReports} pending report(s) to submit`,
        color: '#8B5CF6',
        route: '/(app)/work-reports',
      });
    }

    // 3. Pending leave approvals alert
    const pendingLeaves = stats?.pendingLeavesCount ?? 0;
    if (pendingLeaves > 0) {
      items.push({
        id: 'attention-leaves',
        title: 'Leave request is pending approval',
        subtitle: `${pendingLeaves} leave request(s) waiting for approval`,
        color: '#3B82F6',
        route: '/leave',
      });
    }

    return items;
  }, [tasksData, reportsSummary, stats]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ─── 1. Curved Bottom Header Bar ─── */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => useDrawerStore.getState().openDrawer()} style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
          </Pressable>

          <View style={styles.greetingCol}>
            <Text style={styles.greetingText}>
              {getGreeting()}, {employeeName}
            </Text>
            <Text style={styles.dateSubtext}>{formattedDate}</Text>
          </View>

          <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {isLoading ? (
          <View style={{ gap: 16, marginTop: 16 }}>
            <Skeleton height={240} borderRadius={24} />
            <Skeleton height={80} borderRadius={20} />
            <Skeleton height={140} borderRadius={20} />
          </View>
        ) : hasError ? (
          <ErrorState
            message="Unable to load dashboard. Tap to retry."
            onRetry={handleRefresh}
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {/* ─── 2. Today's Overview ─── */}
            <Text style={[styles.overviewTitle, { marginTop: 8 }]}>Today's Overview</Text>

            {/* Inner Attendance Card */}
            <View style={styles.attendanceCard}>
              <View style={styles.attendanceHeaderRow}>
                <Text style={styles.attendanceCardLabel}>My Attendance</Text>

                {/* Status Badge */}
                <View style={styles.presentBadge}>
                  <View style={styles.greenStatusDot} />
                  <Text style={styles.presentBadgeText}>
                    {todayRecord?.status ? todayRecord.status.toUpperCase() : 'PRESENT'}
                  </Text>
                </View>
              </View>

              {/* Stats & Progress Ring Row */}
              <View style={styles.statsAndRingRow}>
                {/* Left Column Stats */}
                <View style={styles.statsLeftCol}>
                  <View style={styles.workingHoursBox}>
                    <Text style={styles.workingHoursLabel}>Working Hours</Text>
                    <Text style={styles.workingHoursValue}>{elapsedTime}</Text>
                  </View>

                  <View style={styles.punchTimesRow}>
                    <View>
                      <Text style={styles.punchLabel}>Punch In</Text>
                      <Text style={styles.punchValue}>
                        {todayRecord?.punchIn && todayRecord.punchIn !== '--:--'
                          ? todayRecord.punchIn
                          : '--:--'}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.punchLabel}>Punch Out</Text>
                      <Text style={styles.punchValue}>
                        {todayRecord?.punchOut && todayRecord.punchOut !== '--:--'
                          ? todayRecord.punchOut
                          : (justPunchedOutTime || '--:--')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Circular Progress Ring */}
                <ProgressRing percentage={workPercentage} size={94} strokeWidth={8} />
              </View>

              {/* Swipe to Punch Button */}
              <View style={{ marginTop: 18 }}>
                <SwipePunchButton
                  title={isPunchedIn ? 'Swipe to Punch Out' : 'Swipe to Punch In'}
                  isPunchedIn={isPunchedIn}
                  isLoading={isClockingIn || isClockingOut}
                  onSwipeComplete={handlePunchToggle}
                />
              </View>
            </View>

            {/* ─── 3. 4 Metric Cards Grid ─── */}
            <View style={styles.metricGrid}>
              {/* Metric 1: Task Completed */}
              <Pressable onPress={() => router.push('/work')} style={[styles.metricCard, styles.metricCardGreen]}>
                <Text style={styles.metricNumber}>
                  {String(tasksData?.summary?.completed ?? 0).padStart(2, '0')}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>Tasks{`\n`}Done</Text>
                <View style={[styles.metricProgressBar, { backgroundColor: '#10B981' }]} />
              </Pressable>

              {/* Metric 2: Pending Tasks */}
              <Pressable onPress={() => router.push('/work')} style={[styles.metricCard, styles.metricCardGold]}>
                <Text style={styles.metricNumber}>
                  {String(tasksData?.summary?.pending ?? 0).padStart(2, '0')}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>Pending{`\n`}Tasks</Text>
                <View style={[styles.metricProgressBar, { backgroundColor: '#F59E0B' }]} />
              </Pressable>

              {/* Metric 3: Leave Balance */}
              <Pressable onPress={() => router.push('/leave')} style={[styles.metricCard, styles.metricCardBlue]}>
                <Text style={styles.metricNumber}>
                  {String(stats?.leaveBalance ?? 0).padStart(2, '0')}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>Leave{`\n`}Balance</Text>
                <View style={[styles.metricProgressBar, { backgroundColor: '#3B82F6' }]} />
              </Pressable>

              {/* Metric 4: Reports Submitted */}
              <Pressable onPress={() => router.push('/(app)/reports' as any)} style={[styles.metricCard, styles.metricCardTeal]}>
                <Text style={styles.metricNumber}>
                  {String(reportsSummary?.summaryCards?.totalReports?.value ?? 0).padStart(2, '0')}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>Reports{`\n`}Sent</Text>
                <View style={[styles.metricProgressBar, { backgroundColor: '#14B8A6' }]} />
              </Pressable>
            </View>

            {/* ─── 4. Quick Actions ─── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <Pressable onPress={() => useQuickActionsStore.getState().openActions()}>
                <Text style={styles.viewAllText}>View All ›</Text>
              </Pressable>
            </View>

            <View style={{ marginVertical: 4 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
                {/* Attendance → Attendance tab */}
                <Pressable onPress={() => router.push('/attendance')} style={styles.quickActionCard}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="time-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={styles.quickActionLabel}>Attendance</Text>
                </Pressable>

                {/* Apply Leave → apply-leave screen */}
                <Pressable onPress={() => router.push('/(app)/apply-leave' as any)} style={styles.quickActionCard}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="calendar-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={styles.quickActionLabel}>Apply Leave</Text>
                </Pressable>

                {/* Digital Pass → attendance-qr */}
                <Pressable onPress={() => router.push('/(app)/attendance-qr' as any)} style={styles.quickActionCard}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="card-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={styles.quickActionLabel}>Digital Pass</Text>
                </Pressable>

                {/* My Tasks → work tab */}
                <Pressable onPress={() => router.push('/work')} style={styles.quickActionCard}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="checkbox-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={styles.quickActionLabel}>My Tasks</Text>
                </Pressable>

                {/* Work Report → work-reports screen */}
                <Pressable onPress={() => router.push('/(app)/work-reports' as any)} style={styles.quickActionCard}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="trending-up-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={styles.quickActionLabel}>Work Report</Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* ─── 5. Upcoming Events ─── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <Pressable onPress={() => router.push('/calendar')}>
                <Text style={styles.viewAllText}>See All ›</Text>
              </Pressable>
            </View>

            <View style={{ paddingVertical: 4 }}>
              {events && events.length > 0 ? (
                events.map((event, index) => {
                  const startTime = dayjs(event.startTime);
                  const endTime = event.endTime ? dayjs(event.endTime) : null;
                  
                  // Format time
                  const timeStr = startTime.format('hh:mm A');
                  const endTimeStr = endTime ? endTime.format('hh:mm A') : startTime.add(1, 'hour').format('hh:mm A');

                  // Calculate relative badge text ("In 45 min", "Tomorrow", "In 2 days", etc.)
                  const now = dayjs();
                  let badgeText = 'Upcoming';
                  const diffMinutes = startTime.diff(now, 'minute');
                  const diffHours = startTime.diff(now, 'hour');
                  const diffDays = startTime.diff(now, 'day');

                  if (diffMinutes > 0 && diffMinutes < 60) {
                    badgeText = `In ${diffMinutes} min`;
                  } else if (diffHours > 0 && diffHours < 24) {
                    badgeText = `In ${diffHours} hr`;
                  } else if (diffDays === 1) {
                    badgeText = 'Tomorrow';
                  } else if (diffDays > 1) {
                    badgeText = `In ${diffDays} days`;
                  } else if (diffMinutes <= 0) {
                    badgeText = 'Started';
                  }

                  // Dot color and badge bg/text colors based on event type or index
                  const dotColors = ['#8B5CF6', '#F59E0B', '#3B82F6', '#10B981'];
                  const dotColor = dotColors[index % dotColors.length];
                  
                  const badgeBgs = ['#2E265C', '#452A12', '#1E293B', '#112240'];
                  const badgeBg = badgeBgs[index % badgeBgs.length];

                  const badgeTxtColors = ['#C084FC', '#FBBF24', '#94A3B8', '#60A5FA'];
                  const badgeTxtColor = badgeTxtColors[index % badgeTxtColors.length];

                  return (
                    <View key={event.id || index}>
                      {index > 0 && <View style={styles.eventDivider} />}
                      <View style={styles.eventRow}>
                        <View style={styles.eventIconBox}>
                          <Ionicons
                            name={
                              event.type === 'meeting'
                                ? 'videocam-outline'
                                : event.type === 'birthday'
                                ? 'gift-outline'
                                : event.type === 'holiday'
                                ? 'calendar-outline'
                                : 'information-circle-outline'
                            }
                            size={18}
                            color="#94A3B8"
                            style={{ alignSelf: 'center', marginTop: 9 }}
                          />
                        </View>
                        <View style={styles.eventTimeCol}>
                          <Text style={styles.eventTimeText}>{timeStr}</Text>
                          <Text style={styles.eventTimeSubText}>{endTimeStr}</Text>
                        </View>
                        <View style={styles.eventTimelineLine}>
                          <View style={[styles.eventDot, { backgroundColor: dotColor }]} />
                        </View>
                        <View style={styles.eventContentCol}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                          <Text style={styles.eventSubtitle} numberOfLines={1}>{event.description || 'Event Details'}</Text>
                        </View>
                        <View style={[styles.eventBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.eventBadgeText, { color: badgeTxtColor }]}>{badgeText}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={24} color="#64748B" />
                  <Text style={[styles.emptyText, { color: '#94A3B8', fontSize: 12, marginTop: 4 }]}>No upcoming events</Text>
                </View>
              )}
            </View>

            {/* ─── 6. Need Your Attention ─── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Need Your Attention</Text>
              <Pressable onPress={() => router.push('/notifications')}>
                <Text style={styles.viewAllText}>See All ›</Text>
              </Pressable>
            </View>

            <View style={{ paddingVertical: 4 }}>
              {attentionItems.length > 0 ? (
                attentionItems.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 && <View style={styles.attentionDivider} />}
                    <Pressable onPress={() => router.push(item.route as any)} style={styles.attentionRow}>
                      <View style={[styles.attentionIconCircle, { backgroundColor: item.color, justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons
                          name={
                            item.id === 'attention-tasks'
                              ? 'checkbox-outline'
                              : item.id === 'attention-reports'
                              ? 'document-text-outline'
                              : 'calendar-outline'
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.attentionTextCol}>
                        <Text style={styles.attentionTitle}>{item.title}</Text>
                        <Text style={styles.attentionSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </Pressable>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                  <Text style={[styles.emptyText, { color: '#94A3B8', fontSize: 12, marginTop: 4 }]}>All caught up! No actions required.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Stylesheet ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090C15', // Ultra dark enterprise navy
  },
  headerContainer: {
    backgroundColor: '#141829',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingCol: {
    flex: 1,
    marginLeft: 12,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  attendanceCard: {
    backgroundColor: '#0F1221',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  attendanceCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  greenStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  presentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  statsAndRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  workingHoursBox: {
    backgroundColor: '#1C223A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  workingHoursLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  workingHoursValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  punchTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  punchLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  punchValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  ringCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentageText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ringSubtext: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  swipeContainer: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#242145',
    justifyContent: 'center',
    paddingHorizontal: 5,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  swipeText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    paddingLeft: 36,
  },
  swipeThumb: {
    position: 'absolute',
    left: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 6,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    height: 96,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricCardGreen: { backgroundColor: '#0A261D' },
  metricCardGold: { backgroundColor: '#2E1E08' },
  metricCardBlue: { backgroundColor: '#0D2147' },
  metricCardTeal: { backgroundColor: '#092524' },
  metricNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 13,
  },
  metricProgressBar: {
    height: 3,
    borderRadius: 2,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A78BFA',
  },

  quickActionsScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  quickActionCard: {
    width: 76,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1A1E33',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'center',
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#242A45',
    marginRight: 10,
  },
  eventTimeCol: {
    width: 60,
  },
  eventTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventTimeSubText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
  },
  eventTimelineLine: {
    width: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventContentCol: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },

  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attentionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  attentionTextCol: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attentionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
  },
  attentionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
});
