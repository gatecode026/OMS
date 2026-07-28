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
  Easing,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
const HOME_SIDE_PADDING = 8;
const QUICK_ACTION_WIDTH = Math.max(58, (SCREEN_WIDTH - HOME_SIDE_PADDING * 2 - 40) / 5);

const parseTimeToSeconds = (timeStr?: string): number | null => {
  if (!timeStr || timeStr === '--:--') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      const hrs = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      const secs = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
      if (!Number.isNaN(hrs) && !Number.isNaN(mins)) {
        return hrs * 3600 + mins * 60 + (Number.isNaN(secs) ? 0 : secs);
      }
    }
    return null;
  }
  let hrs = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hrs !== 12) hrs += 12;
  if (ampm === 'AM' && hrs === 12) hrs = 0;
  return hrs * 3600 + mins * 60;
};

const getLiveWorkingSeconds = (attendanceRecord: any, currentTime: Date): number => {
  if (attendanceRecord?.punchIn && attendanceRecord.punchIn !== '--:--') {
    const inSecs = parseTimeToSeconds(attendanceRecord.punchIn);
    if (inSecs !== null) {
      const hasPunchOut = attendanceRecord.punchOut && attendanceRecord.punchOut !== '--:--';
      const outSecs = hasPunchOut
        ? parseTimeToSeconds(attendanceRecord.punchOut)
        : currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();

      if (outSecs !== null) {
        let diffSecs = outSecs - inSecs;
        if (diffSecs < 0) diffSecs += 24 * 3600;
        return diffSecs;
      }
    }
  }

  const hrsVal = attendanceRecord?.totalHours || attendanceRecord?.workingHours || 0;
  if (typeof hrsVal === 'number') return Math.round(hrsVal * 3600);
  const parsedHrs = parseFloat(String(hrsVal).replace(/hrs|hr|hours|hour|%/gi, '').trim());
  return Number.isNaN(parsedHrs) ? 0 : Math.round(parsedHrs * 3600);
};

const getAttendanceStatusStyle = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('punch') && normalized.includes('error')) return { label: 'Punch Error', color: '#D97706', backgroundColor: 'rgba(217, 119, 6, 0.20)' };
  if (normalized.includes('half')) return { label: 'Half Day', color: '#EAB308', backgroundColor: 'rgba(234, 179, 8, 0.20)' };
  if (normalized.includes('late')) return { label: 'Late', color: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.20)' };
  if (normalized.includes('absent')) return { label: 'Absent', color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.20)' };
  if (normalized.includes('leave') || normalized.includes('off')) return { label: 'Paid Leave', color: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.20)' };
  return { label: 'Present', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.20)' };
};

const MetricCardBackground: React.FC<{ start: string; end: string }> = ({ start, end }) => (
  <Svg style={StyleSheet.absoluteFillObject} width={'100%'} height={'100%'}>
    <Defs>
      <LinearGradient id={'metricGradient'} x1={'0%'} y1={'0%'} x2={'100%'} y2={'100%'}>
        <Stop offset={'0%'} stopColor={start} />
        <Stop offset={'100%'} stopColor={end} />
      </LinearGradient>
    </Defs>
    <Rect width={'100%'} height={'100%'} fill={'url(#metricGradient)'} />
  </Svg>
);

// ─── Circular Progress Ring Component ──────────────────────────────────────────
const ProgressRing: React.FC<{ percentage: number; remainingLabel?: string; size?: number; strokeWidth?: number }> = ({
  percentage = 75,
  remainingLabel,
  size = 92,
  strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, percentage))) / 100;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={'ringProgressGradient'} x1={'12%'} y1={'0%'} x2={'88%'} y2={'100%'}>
            <Stop offset={'0%'} stopColor={'#B8A7FF'} />
            <Stop offset={'48%'} stopColor={'#8667FF'} />
            <Stop offset={'100%'} stopColor={'#E05AF8'} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={Math.max(0, radius - strokeWidth / 2 - 3)}
          fill={'rgba(8, 14, 37, 0.76)'}
        />
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={'rgba(83, 92, 160, 0.22)'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={'rgba(139, 92, 246, 0.20)'}
          strokeWidth={strokeWidth + 5}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={'round'}
          fill={'none'}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={'url(#ringProgressGradient)'}
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
          <Text style={styles.ringSubtext}>Completed</Text>
          {!!remainingLabel && (
            <View style={styles.remainingPill}>
              <Ionicons name={'time-outline'} size={11} color={'#A88BFF'} />
              <Text style={styles.remainingPillText}>{remainingLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Swipe to Punch Button Component ──────────────────────────────────────────
interface SwipePunchButtonProps {
  onSwipeComplete: () => void;
  title: string;
  subtitle?: string;
  isPunchedIn: boolean;
  isLoading: boolean;
  isDisabled?: boolean;
  statusColor?: string;
  statusBackgroundColor?: string;
}

const SwipePunchButton: React.FC<SwipePunchButtonProps> = ({
  onSwipeComplete,
  title,
  subtitle,
  isPunchedIn,
  isLoading,
  isDisabled = false,
  statusColor,
  statusBackgroundColor,
}) => {
  const pan = useRef(new Animated.Value(0)).current;
  const shimmerMotion = useRef(new Animated.Value(0)).current;
  const chevronMotion = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(320);
  const thumbSize = 44;
  const padding = 5;
  const maxTravel = Math.max(100, containerWidth - thumbSize - padding * 2);

  useEffect(() => {
    shimmerMotion.stopAnimation();
    chevronMotion.stopAnimation();
    shimmerMotion.setValue(0);
    chevronMotion.setValue(0);
    if (isDisabled || isLoading) return;

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerMotion, {
        toValue: 1,
        duration: 1900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    const chevronLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronMotion, { toValue: 1, duration: 650, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(chevronMotion, { toValue: 0, duration: 650, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    shimmerLoop.start();
    chevronLoop.start();
    return () => {
      shimmerLoop.stop();
      chevronLoop.stop();
    };
  }, [chevronMotion, isDisabled, isLoading, shimmerMotion]);

  const triggerSwipeComplete = () => {
    if (isLoading || isDisabled) return;
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
        onStartShouldSetPanResponder: () => !isDisabled,
        onMoveShouldSetPanResponder: (_, gestureState) => !isDisabled && Math.abs(gestureState.dx) > 3,
        onPanResponderGrant: () => {},
        onPanResponderMove: (_, gestureState) => {
          if (isLoading || isDisabled) return;
          let x = gestureState.dx;
          if (x < 0) x = 0;
          if (x > maxTravel) x = maxTravel;
          pan.setValue(x);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isLoading || isDisabled) return;
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
    [maxTravel, isLoading, isDisabled, onSwipeComplete, pan]
  );

  return (
    <Pressable
      onPress={triggerSwipeComplete}
      disabled={isDisabled}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.swipeContainer,
        isDisabled && styles.swipeContainerCompleted,
        isDisabled && { backgroundColor: statusBackgroundColor, borderColor: statusColor },
      ]}
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0) {
          setContainerWidth(e.nativeEvent.layout.width);
        }
      }}
    >
      {!isDisabled && (
        <Animated.View
          pointerEvents={'none'}
          style={[
            styles.swipeShimmer,
            {
              transform: [
                { translateX: shimmerMotion.interpolate({ inputRange: [0, 1], outputRange: [-70, containerWidth + 20] }) },
                { rotate: '16deg' },
              ],
            },
          ]}
        />
      )}
      <View style={styles.swipeTextGroup}>
        <Text style={[styles.swipeText, isDisabled && { color: statusColor }]} numberOfLines={1}>
          {isLoading ? 'Processing...' : title}
        </Text>
        {!!subtitle && <Text style={styles.swipeSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      <Animated.View
        style={[
          styles.swipeThumb,
          {
            transform: [{ translateX: isDisabled ? 0 : pan }],
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            top: '50%',
            marginTop: -(thumbSize / 2),
            ...(isDisabled && statusColor ? { backgroundColor: statusColor } : {}),
          },
        ]}
        {...(!isDisabled ? panResponder.panHandlers : {})}
      >
        <Ionicons name="finger-print" size={24} color="#0F1221" />
      </Animated.View>
      {!isDisabled && (
        <Animated.View
          pointerEvents={'none'}
          style={[
            styles.swipeChevrons,
            {
              opacity: chevronMotion.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
              transform: [{ translateX: chevronMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }],
            },
          ]}
        >
          <Ionicons name={'chevron-forward'} size={19} color={'#8B5CF6'} />
          <Ionicons name={'chevron-forward'} size={19} color={'#9B72FF'} />
          <Ionicons name={'chevron-forward'} size={19} color={'#A88BFF'} />
        </Animated.View>
      )}
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
  const dashboardColors = useMemo(() => isDark ? {
    background: '#090D20',
    header: '#17173D',
    surface: '#10172F',
    innerSurface: 'rgba(9, 13, 32, 0.82)',
    text: '#FFFFFF',
    secondaryText: 'rgba(255,255,255,0.68)',
    border: 'rgba(139, 92, 246, 0.28)',
    overviewStart: '#211B55',
    overviewMiddle: '#111A38',
    overviewEnd: '#09142D',
  } : {
    background: '#F4F6FC',
    header: '#FFFFFF',
    surface: '#FFFFFF',
    innerSurface: 'rgba(248, 250, 255, 0.96)',
    text: '#111827',
    secondaryText: '#64748B',
    border: 'rgba(109, 70, 247, 0.20)',
    overviewStart: '#F4F0FF',
    overviewMiddle: '#FAFAFF',
    overviewEnd: '#FFFFFF',
  }, [isDark]);

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
  const { summary: reportsSummary, loadingSummary: isReportsLoading } = useReports();

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
  const [overviewHeight, setOverviewHeight] = useState(460);

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
      const workingSeconds = getLiveWorkingSeconds(todayRecord, new Date());
      const hrs = Math.floor(workingSeconds / 3600);
      const mins = Math.floor((workingSeconds % 3600) / 60);
      const secs = workingSeconds % 60;
      setElapsedTime(
        `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      );
      setWorkPercentage(Math.min(100, Math.round((workingSeconds / (8 * 3600)) * 100)));
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
  const hasPunchedOut = !!(
    (todayRecord?.punchOut && todayRecord.punchOut !== '--:--') || justPunchedOutTime
  );
  const completedShiftStatus = getAttendanceStatusStyle(todayRecord?.status);
  const completedTasks = Number(tasksData?.summary?.completed ?? 0);
  const pendingTasksCount = Number(tasksData?.summary?.pending ?? 0);
  const taskCount = completedTasks + pendingTasksCount;
  const completedTaskPct = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
  const pendingTaskPct = taskCount > 0 ? Math.round((pendingTasksCount / taskCount) * 100) : 0;
  const submittedReports = Number(reportsSummary?.summaryCards?.totalReports?.value ?? 0);
  const pendingReportsCount = Number(reportsSummary?.summaryCards?.pending?.value ?? 0);
  const reportCount = submittedReports + pendingReportsCount;
  const submittedReportPct = reportCount > 0 ? Math.round((submittedReports / reportCount) * 100) : 0;
  const leaveBalancePct = Math.min(100, Math.max(0, Number((stats as any)?.leaveBalancePercentage ?? 0)));
  const remainingWorkSeconds = Math.max(0, 8 * 3600 - getLiveWorkingSeconds(todayRecord, new Date()));
  const remainingHours = Math.floor(remainingWorkSeconds / 3600);
  const remainingMinutes = Math.floor((remainingWorkSeconds % 3600) / 60);
  const remainingWorkLabel = `${remainingHours}h ${String(remainingMinutes).padStart(2, '0')}m left`;

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
    const pendingReports = Number(reportsSummary?.summaryCards?.pending?.value ?? 0);
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
    <View style={[styles.container, { backgroundColor: dashboardColors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={dashboardColors.header}
        translucent
      />

      {/* ─── 1. Curved Bottom Header Bar ─── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) + 8, backgroundColor: dashboardColors.header, borderBottomColor: dashboardColors.border }]}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => useDrawerStore.getState().openDrawer()} style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={26} color={dashboardColors.text} />
          </Pressable>

          <View style={styles.greetingCol}>
            <Text style={[styles.greetingText, { color: dashboardColors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
              {getGreeting()}, {employeeName}
            </Text>
            <Text style={[styles.dateSubtext, { color: dashboardColors.secondaryText }]}>{formattedDate}</Text>
          </View>

          <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={dashboardColors.text} />
            {unreadCount > 0 && <View style={styles.notificationDot}><Text style={styles.notificationCount}>{Math.min(99, unreadCount)}</Text></View>}
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
            <View
              style={styles.overviewCard}
              onLayout={(event) => setOverviewHeight(Math.ceil(event.nativeEvent.layout.height))}
            >
            <Svg style={StyleSheet.absoluteFillObject} width={SCREEN_WIDTH - HOME_SIDE_PADDING * 2} height={overviewHeight}>
              <Defs>
                <LinearGradient id={'overviewGradient'} x1={'0%'} y1={'0%'} x2={'0%'} y2={'100%'}>
                  <Stop offset={'0%'} stopColor={dashboardColors.overviewStart} stopOpacity={isDark ? 0.82 : 1} />
                  <Stop offset={'55%'} stopColor={dashboardColors.overviewMiddle} stopOpacity={isDark ? 0.94 : 1} />
                  <Stop offset={'100%'} stopColor={dashboardColors.overviewEnd} stopOpacity={isDark ? 0.98 : 1} />
                </LinearGradient>
              </Defs>
              <Rect width={SCREEN_WIDTH - HOME_SIDE_PADDING * 2} height={overviewHeight} rx={24} ry={24} fill={'url(#overviewGradient)'} />
            </Svg>
            <View style={styles.overviewHeadingRow}>
              <View style={styles.overviewIconBox}>
                <Ionicons name={'stats-chart'} size={24} color={'#A88BFF'} />
              </View>
              <View style={styles.overviewHeadingText}>
                <Text style={[styles.overviewTitle, { color: dashboardColors.text }]}>Today’s Overview</Text>
                <Text style={[styles.overviewSubtitle, { color: dashboardColors.secondaryText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>Track your day, stay productive and achieve more.</Text>
              </View>
            </View>

            {/* Inner Attendance Card */}
            <View style={[styles.attendanceCard, { backgroundColor: dashboardColors.innerSurface, borderColor: dashboardColors.border }]}>
              <View style={styles.attendanceHeaderRow}>
                <View style={styles.attendanceTitleRow}>
                  <Text style={[styles.attendanceCardLabel, { color: dashboardColors.text }]}>My Attendance</Text>
                </View>
                <View style={[styles.presentBadge, { backgroundColor: completedShiftStatus.backgroundColor, borderColor: completedShiftStatus.color }]}>
                  <Text style={[styles.presentBadgeText, { color: completedShiftStatus.color }]}>{completedShiftStatus.label}</Text>
                </View>
              </View>

              {/* Stats & Progress Ring Row */}
              <View style={styles.statsAndRingRow}>
                {/* Left Column Stats */}
                <View style={styles.statsLeftCol}>
                  <View style={[styles.workingHoursBox, { backgroundColor: isDark ? 'rgba(30, 39, 79, 0.72)' : '#EEF2FF' }]}>
                    <View style={styles.workingHoursTopRow}>
                      <View style={styles.workingHoursIcon}>
                        <Ionicons name={'time-outline'} size={22} color={'#A88BFF'} />
                      </View>
                      <View>
                        <Text style={[styles.workingHoursLabel, { color: dashboardColors.secondaryText }]}>Working Hours</Text>
                        <Text style={[styles.workingHoursValue, { color: dashboardColors.text }]}>{elapsedTime}</Text>
                      </View>
                    </View>
                    <View style={styles.workProgressTrack}>
                      <View style={[styles.workProgressFill, { width: `${workPercentage}%` }]} />
                    </View>
                    <Text style={[styles.workTargetText, { color: dashboardColors.secondaryText }]}>of 08h 00m</Text>
                  </View>

                  <View style={styles.punchTimesRow}>
                    <View style={styles.punchTimeItem}>
                      <View style={styles.punchLabelRow}><Text style={[styles.punchLabel, { color: dashboardColors.secondaryText }]}>Punch In</Text></View>
                      <Text style={[styles.punchValue, { color: dashboardColors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                        {todayRecord?.punchIn && todayRecord.punchIn !== '--:--'
                          ? todayRecord.punchIn
                          : '--:--'}
                      </Text>
                    </View>

                    <View style={styles.punchTimeItem}>
                      <View style={styles.punchLabelRow}><View style={styles.punchOutDot} /><Text style={[styles.punchLabel, { color: dashboardColors.secondaryText }]}>Punch Out</Text></View>
                      <Text style={[styles.punchValue, { color: dashboardColors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                        {todayRecord?.punchOut && todayRecord.punchOut !== '--:--'
                          ? todayRecord.punchOut
                          : (justPunchedOutTime || '--:--')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Circular Progress Ring */}
                <ProgressRing percentage={workPercentage} remainingLabel={remainingWorkLabel} size={108} strokeWidth={9} />
              </View>

              {/* Swipe to Punch Button */}
              <View style={{ marginTop: 20 }}>
                <SwipePunchButton
                  title={hasPunchedOut ? `Shift Complete • ${completedShiftStatus.label}` : isPunchedIn ? 'Swipe to Punch Out' : 'Swipe to Punch In'}
                  subtitle={hasPunchedOut ? `Total Working Hours: ${elapsedTime}` : undefined}
                  isPunchedIn={isPunchedIn}
                  isLoading={isClockingIn || isClockingOut}
                  isDisabled={hasPunchedOut}
                  statusColor={completedShiftStatus.color}
                  statusBackgroundColor={completedShiftStatus.backgroundColor}
                  onSwipeComplete={handlePunchToggle}
                />
              </View>
            </View>

            {/* ─── 3. 4 Metric Cards Grid ─── */}
            <View style={styles.metricGrid}>
              {/* Metric 1: Task Completed */}
              <Pressable onPress={() => router.push('/work')} style={[styles.metricCard, styles.metricCardGreen]}>
                <View style={styles.metricTopRow}>
                  <View style={styles.metricIconBox}><Ionicons name={'checkmark'} size={14} color={'#D1FAE5'} /></View>
                  <Text style={styles.metricNumber}>{String(tasksData?.summary?.completed ?? 0).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={2}>Tasks{`\n`}Done</Text>
                <View style={styles.metricProgressTrack}><View style={[styles.metricProgressFill, { width: `${completedTaskPct}%`, backgroundColor: '#00F58A' }]} /></View>
              </Pressable>

              {/* Metric 2: Pending Tasks */}
              <Pressable onPress={() => router.push('/work')} style={[styles.metricCard, styles.metricCardGold]}>
                <View style={styles.metricTopRow}>
                  <View style={styles.metricIconBox}><Ionicons name={'hourglass-outline'} size={14} color={'#FDE68A'} /></View>
                  <Text style={styles.metricNumber}>{String(tasksData?.summary?.pending ?? 0).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={2}>Tasks{`\n`}Pending</Text>
                <View style={styles.metricProgressTrack}><View style={[styles.metricProgressFill, { width: `${pendingTaskPct}%`, backgroundColor: '#FFAA16' }]} /></View>
              </Pressable>

              {/* Metric 3: Leave Balance */}
              <Pressable onPress={() => router.push('/leave')} style={[styles.metricCard, styles.metricCardBlue]}>
                <View style={styles.metricTopRow}>
                  <View style={styles.metricIconBox}><Ionicons name={'calendar-outline'} size={14} color={'#BFDBFE'} /></View>
                  <Text style={styles.metricNumber}>{String(stats?.leaveBalance ?? 0).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={2}>Leaves{`\n`}Left</Text>
                <View style={styles.metricProgressTrack}><View style={[styles.metricProgressFill, { width: `${leaveBalancePct}%`, backgroundColor: '#4D91FF' }]} /></View>
              </Pressable>

              {/* Metric 4: Reports Submitted */}
              <Pressable onPress={() => router.push('/(app)/reports' as any)} style={[styles.metricCard, styles.metricCardTeal]}>
                <View style={styles.metricTopRow}>
                  <View style={styles.metricIconBox}><Ionicons name={'document-text-outline'} size={14} color={'#CCFBF1'} /></View>
                  <Text style={styles.metricNumber}>{String(reportsSummary?.summaryCards?.totalReports?.value ?? 0).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={2}>Reports{`\n`}Sent</Text>
                <View style={styles.metricProgressTrack}><View style={[styles.metricProgressFill, { width: `${submittedReportPct}%`, backgroundColor: '#46D9C8' }]} /></View>
              </Pressable>
            </View>
            </View>

            {/* ─── 4. Quick Actions ─── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: dashboardColors.text }]}>Quick Actions</Text>
              <Pressable onPress={() => useQuickActionsStore.getState().openActions()}>
                <Text style={styles.viewAllText}>View All ›</Text>
              </Pressable>
            </View>

            <View style={[styles.quickActionsPanel, { backgroundColor: 'transparent' }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
                {/* Attendance → Attendance tab */}
                <Pressable onPress={() => router.push('/attendance')} style={[styles.quickActionCard, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="time-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: dashboardColors.text }]}>Attendance</Text>
                </Pressable>

                {/* Apply Leave → apply-leave screen */}
                <Pressable onPress={() => router.push('/(app)/apply-leave' as any)} style={[styles.quickActionCard, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="calendar-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: dashboardColors.text }]}>Apply Leave</Text>
                </Pressable>

                {/* Digital Pass → attendance-qr */}
                <Pressable onPress={() => router.push('/(app)/attendance-qr' as any)} style={[styles.quickActionCard, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="card-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: dashboardColors.text }]}>Digital Pass</Text>
                </Pressable>

                {/* My Tasks → work tab */}
                <Pressable onPress={() => router.push('/work')} style={[styles.quickActionCard, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="checkbox-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: dashboardColors.text }]}>My Tasks</Text>
                </Pressable>

                {/* Work Report → work-reports screen */}
                <Pressable onPress={() => router.push('/(app)/work-reports' as any)} style={[styles.quickActionCard, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
                  <View style={styles.quickActionIconBox}>
                    <Ionicons name="trending-up-outline" size={22} color="#A78BFA" />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: dashboardColors.text }]}>Work Report</Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* ─── 5. Upcoming Events ─── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: dashboardColors.text }]}>Upcoming Events</Text>
              <Pressable onPress={() => router.push('/calendar')}>
                <Text style={styles.viewAllText}>See All ›</Text>
              </Pressable>
            </View>

            <View style={[styles.eventsPanel, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
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
                          <Text style={[styles.eventTitle, { color: dashboardColors.text }]} numberOfLines={1}>{event.title}</Text>
                          <Text style={[styles.eventSubtitle, { color: dashboardColors.secondary }]} numberOfLines={1}>{event.description || 'Event Details'}</Text>
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
              <Text style={[styles.sectionTitle, { color: dashboardColors.text }]}>Need Your Attention</Text>
              <Pressable onPress={() => router.push('/notifications')}>
                <Text style={styles.viewAllText}>See All ›</Text>
              </Pressable>
            </View>

            <View style={[styles.attentionPanel, { backgroundColor: dashboardColors.surface, borderColor: dashboardColors.border }]}>
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
                        <Text style={[styles.attentionTitle, { color: dashboardColors.text }]}>{item.title}</Text>
                        <Text style={[styles.attentionSubtitle, { color: dashboardColors.secondary }]}>{item.subtitle}</Text>
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
    backgroundColor: '#090D20',
  },
  headerContainer: {
    backgroundColor: '#17173D',
    borderRadius: 28,
    marginHorizontal: 0,
    marginTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    marginLeft: 16,
  },
  greetingText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 1,
    right: -1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: HOME_SIDE_PADDING,
    paddingTop: 12,
  },
  overviewCard: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(217, 217, 217, 0.2)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },

  overviewHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  overviewIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  overviewHeadingText: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overviewSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.62)',
  },
  attendanceCard: {
    backgroundColor: 'rgba(9, 13, 32, 0.76)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  greenStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  presentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22E36B',
    textTransform: 'uppercase',
  },
  statsAndRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  workingHoursBox: {
    width: '100%',
    backgroundColor: 'rgba(30, 39, 79, 0.72)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  workingHoursTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workingHoursIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  workingHoursLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.66)',
  },
  workingHoursValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 3,
  },
  workProgressTrack: {
    height: 5,
    borderRadius: 999,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  workProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8B5CF6',
  },
  workTargetText: {
    marginTop: 5,
    fontSize: 10,
    color: 'rgba(255,255,255,0.62)',
  },
  punchTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  punchTimeItem: {
    flex: 1,
  },
  punchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  punchInDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: '#22E36B',
  },
  punchOutDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  punchLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  punchValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 5,
    marginLeft: 0,
  },
  ringCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentageText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  ringSubtext: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: 'rgba(226, 232, 240, 0.76)',
    textAlign: 'center',
    marginTop: 1,
  },
  remainingPill: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(64, 42, 128, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 167, 255, 0.82)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 7,
    elevation: 6,
  },
  remainingPillText: {
    marginLeft: 4,
    color: '#F4F0FF',
    fontSize: 9,
    fontWeight: '700',
  },
  swipeContainer: {
    height: 48,
    borderRadius: 999,
    backgroundColor: '#302761',
    justifyContent: 'center',
    paddingHorizontal: 5,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  swipeContainerCompleted: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
  },
  swipeTextGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    zIndex: 2,
  },
  swipeText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  swipeSubtitle: {
    marginTop: 3,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: '#CBD5E1',
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
    zIndex: 4,
  },
  swipeShimmer: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: 38,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 1,
  },
  swipeChevrons: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -5,
    zIndex: 3,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 9,
    height: 92,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  metricCardGreen: { backgroundColor: '#0A3A2B' },
  metricCardGold: { backgroundColor: '#5A3C1B' },
  metricCardBlue: { backgroundColor: '#24477D' },
  metricCardTeal: { backgroundColor: '#1B555A' },
  metricIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F1F5F9',
    lineHeight: 12,
    width: '100%',
    minHeight: 24,
  },
  metricProgressTrack: {
    height: 3,
    borderRadius: 2,
    width: '100%',
    backgroundColor: 'rgba(5, 12, 28, 0.48)',
    overflow: 'hidden',
  },
  metricProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9D72FF',
  },

  quickActionsPanel: {
    paddingVertical: 0,
    overflow: 'hidden',
  },
  quickActionsScroll: {
    paddingHorizontal: 0,
    gap: 10,
  },
  quickActionCard: {
    width: QUICK_ACTION_WIDTH,
    height: 78,
    borderRadius: 16,
    backgroundColor: '#11172D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
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

  eventsPanel: {
    borderWidth: 0.5,
    borderColor: '#68718C',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 9,
    backgroundColor: 'rgba(8, 18, 43, 0.35)',
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
    minHeight: 48,
  },
  attentionPanel: {
    borderWidth: 0.5,
    borderColor: '#68718C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 18, 43, 0.35)',
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
  emptyBox: {
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
  },
});
