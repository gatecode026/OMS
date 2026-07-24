/**
 * @file work.tsx
 * @description My Tasks Dashboard screen displaying assigned tasks, summary metrics,
 *              filters, search, and swipeable task cards.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTheme from '../../../src/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, Tag, Skeleton, LoadingState, ErrorState } from '../../../src/shared/components';
import useAuthStore from '../../../src/shared/store/authStore';
import { useNotificationsUnreadCount } from '../../../src/features/notifications';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useMyTasks, useUpdateTaskStatus } from '../../../src/features/tasks/hooks/useTasksData';
import { TaskItem } from '../../../src/features/tasks/types';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

// Available filters matching the reference UI
const FILTERS = ['All', 'Pending', 'To Do', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

// Helper to determine status color gradient mapping for the Reanimated card background
const STATUS_INDEX_MAP: Record<string, number> = {
  All: 0,
  Pending: 1,
  'To Do': 1, // To Do matches pending in color theme
  'In Progress': 2,
  Completed: 3,
  Overdue: 4,
  Cancelled: 5,
};

// ── DATA FOR WHEEL PICKERS ──
const YEARS_DATA = Array.from({ length: 11 }, (_, i) => ({
  label: String(2020 + i),
  value: 2020 + i,
}));

const MONTHS_DATA = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

interface WheelPickerProps {
  items: Array<{ label: string; value: any }>;
  selectedValue: any;
  onValueChange: (value: any) => void;
  itemHeight?: number;
  width?: any;
}

const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedValue,
  onValueChange,
  itemHeight = 44,
  width = '48%',
}) => {
  const { colors, typography } = useTheme();
  const flatListRef = React.useRef<FlatList>(null);
  const scrollY = useSharedValue(0);

  const paddedItems = useMemo(() => {
    return [
      { label: '', value: 'dummy-start-1' },
      { label: '', value: 'dummy-start-2' },
      ...items,
      { label: '', value: 'dummy-end-1' },
      { label: '', value: 'dummy-end-2' },
    ];
  }, [items]);

  useEffect(() => {
    const originalIdx = items.findIndex((item) => item.value === selectedValue);
    if (originalIdx !== -1) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: originalIdx * itemHeight,
          animated: false,
        });
      }, 50);
    }
  }, [selectedValue, items, itemHeight]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event: any) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleScrollEnd = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < items.length) {
      const val = items[index].value;
      if (val !== selectedValue) {
        onValueChange(val);
      }
    }
  };

  return (
    <View style={{ height: itemHeight * 5, width, overflow: 'hidden' }}>
      <Animated.FlatList
        ref={flatListRef}
        data={paddedItems}
        keyExtractor={(item, index) => `${item.value}-${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        renderItem={({ item, index }) => {
          if (item.value.toString().startsWith('dummy')) {
            return <View style={{ height: itemHeight }} />;
          }

          const originalIdx = index - 2;
          const isSelected = item.value === selectedValue;

          return (
            <WheelPickerItem
              item={item}
              index={originalIdx}
              scrollY={scrollY}
              itemHeight={itemHeight}
              isSelected={isSelected}
              colors={colors}
              typography={typography}
            />
          );
        }}
      />
    </View>
  );
};

const WheelPickerItem = ({
  item,
  index,
  scrollY,
  itemHeight,
  isSelected,
  colors,
  typography,
}: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    const itemOffset = index * itemHeight;
    const distance = Math.abs(scrollY.value - itemOffset);
    const scale = Math.max(0.75, 1 - (distance / (itemHeight * 2.5)) * 0.25);
    const opacity = Math.max(0.3, 1 - (distance / (itemHeight * 2.5)) * 0.7);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: itemHeight,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        },
        animatedStyle,
      ]}
    >
      <Text
        style={{
          fontSize: isSelected ? 18 : 15,
          fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium,
          color: isSelected ? colors.primary : colors.text,
          textAlign: 'center',
        }}
      >
        {item.label}
      </Text>
    </Animated.View>
  );
};

export default function MyWorkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadows, isDark, setThemeMode } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { data: unreadCount = 0 } = useNotificationsUnreadCount();

  // Selected Day, Month & Year states
  const [selectedDay, setSelectedDay] = useState<number>(dayjs().date());
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year()); // e.g. 2026
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Dynamic days calculations for selected Month/Year
  const daysCount = useMemo(() => {
    return dayjs(`${selectedYear}-${selectedMonth}-01`).daysInMonth();
  }, [selectedMonth, selectedYear]);

  const DAYS_DATA = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => ({
      label: String(i + 1).padStart(2, '0'),
      value: i + 1,
    }));
  }, [daysCount]);

  useEffect(() => {
    if (selectedDay > daysCount) {
      setSelectedDay(daysCount);
    }
  }, [daysCount, selectedDay]);

  // Tasks query hook
  const { data, isLoading, error, refetch } = useMyTasks(selectedMonth, selectedYear);
  const updateStatusMutation = useUpdateTaskStatus();

  // Search & Filter States
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');

  // Task actions bottom sheet states
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedActionTask, setSelectedActionTask] = useState<TaskItem | null>(null);

  // Reset all filters when screen gets focus (e.g. user returns from detail or other pages)
  useFocusEffect(
    React.useCallback(() => {
      const today = dayjs();
      setSelectedDay(today.date());
      setSelectedMonth(today.month() + 1);
      setSelectedYear(today.year());
      setSelectedFilter('All');
      setSearchQuery('');
      setSortBy('dueDate');
    }, [])
  );

  // Shared value to animate the summary card background color transitions
  const colorIndex = useSharedValue(0);

  useEffect(() => {
    const idx = STATUS_INDEX_MAP[selectedFilter] ?? 0;
    colorIndex.value = withTiming(idx, { duration: 400 });
  }, [selectedFilter]);

  // Interpolated animated style for the Glassmorphic Summary Card
  const animatedCardStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorIndex.value,
      [0, 1, 2, 3, 4, 5],
      [
        isDark ? '#312E81' : '#4F46E5', // All (Indigo)
        isDark ? '#78350F' : '#F59E0B', // Pending (Orange)
        isDark ? '#1E3A8A' : '#3B82F6', // In Progress (Blue)
        isDark ? '#064E3B' : '#10B981', // Completed (Green)
        isDark ? '#7F1D1D' : '#EF4444', // Overdue (Red)
        isDark ? '#374151' : '#64748B', // Cancelled (Gray)
      ]
    );

    return {
      backgroundColor,
    };
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter and Search Logic
  const filteredTasks = useMemo(() => {
    if (!data?.tasks) {
      console.log('[DEBUG work.tsx] No tasks in data object');
      return [];
    }
    
    console.log('[DEBUG work.tsx] Filtering tasks. Total tasks count:', data.tasks.length, 'selectedDay:', selectedDay, 'selectedMonth:', selectedMonth, 'selectedYear:', selectedYear);
    if (data.tasks.length > 0) {
      console.log('[DEBUG work.tsx] Sample task in list:', JSON.stringify(data.tasks[0]));
    }

    return data.tasks.filter((task) => {
      // 0. Filter by Selected Day, Month & Year
      if (task.dueDate) {
        const d = dayjs(task.dueDate);
        if (d.date() !== selectedDay || d.month() + 1 !== selectedMonth || d.year() !== selectedYear) {
          return false;
        }
      } else {
        return false;
      }

      // 1. Filter by Status chip
      if (selectedFilter !== 'All') {
        const status = task.status?.toLowerCase();
        if (selectedFilter === 'Pending' && !['pending', 'pending acceptance'].includes(status)) return false;
        if (selectedFilter === 'To Do' && status !== 'to do') return false;
        if (selectedFilter === 'In Progress' && status !== 'in progress') return false;
        if (selectedFilter === 'Completed' && !['completed', 'done'].includes(status)) return false;
        if (selectedFilter === 'Overdue' && status !== 'overdue') return false;
        if (selectedFilter === 'Cancelled' && status !== 'cancelled') return false;
      }

      // 2. Filter by Search Query (Task Name, Project Name, Task ID, Description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = task.title?.toLowerCase().includes(query);
        const matchesProject = task.projectName?.toLowerCase().includes(query) || task.projectId?.toLowerCase().includes(query);
        const matchesId = task.id?.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        
        return matchesName || matchesProject || matchesId || matchesDesc;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
      } else {
        const priorityWeight = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
    });
  }, [data, selectedFilter, searchQuery, sortBy, selectedDay, selectedMonth, selectedYear]);

  // Card stats based on filtered tasks
  const stats = useMemo(() => {
    if (!data?.tasks) {
      return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, rate: 0 };
    }

    const tList = data.tasks.filter((t) => {
      if (t.dueDate) {
        const d = dayjs(t.dueDate);
        return d.date() === selectedDay && d.month() + 1 === selectedMonth && d.year() === selectedYear;
      }
      return false;
    });

    const total = tList.length;
    const completed = tList.filter(t => t.completed || ['completed', 'done'].includes(t.status?.toLowerCase())).length;
    const inProgress = tList.filter(t => t.status?.toLowerCase() === 'in progress').length;
    const pending = tList.filter(t => ['pending', 'pending acceptance', 'to do'].includes(t.status?.toLowerCase())).length;
    const overdue = tList.filter(t => t.status?.toLowerCase() === 'overdue' || (t.dueDate && new Date(t.dueDate) < new Date() && !t.completed)).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, inProgress, completed, overdue, rate };
  }, [data, selectedDay, selectedMonth, selectedYear]);

  const handleTaskPressMenu = (task: TaskItem) => {
    setSelectedActionTask(task);
    setActionModalVisible(true);
  };

  // Render Skeleton Loader
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
          <Skeleton width={120} height={24} />
          <View style={styles.headerRight}>
            <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} />
            <Skeleton width={32} height={32} borderRadius={16} />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Skeleton height={200} borderRadius={16} style={{ marginBottom: spacing.lg }} />
          <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
            <Skeleton width={60} height={30} borderRadius={15} style={{ marginRight: 8 }} />
            <Skeleton width={80} height={30} borderRadius={15} style={{ marginRight: 8 }} />
            <Skeleton width={80} height={30} borderRadius={15} style={{ marginRight: 8 }} />
          </View>
          <Skeleton height={100} borderRadius={12} style={{ marginBottom: spacing.md }} />
          <Skeleton height={100} borderRadius={12} style={{ marginBottom: spacing.md }} />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState message="Could not fetch tasks from server. Please verify your connection." onRetry={refetch} />
      </View>
    );
  }

  // Circular Completion Rate Ring Config
  const radiusRing = 32;
  const strokeRing = 6;
  const circumference = 2 * Math.PI * radiusRing;
  const strokeDashoffset = circumference - (stats.rate / 100) * circumference;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      {/* ── STICKY HEADER ── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            My Tasks
          </Text>
        </View>

        <View style={styles.headerRight}>
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
          <Pressable onPress={() => router.push('/(app)/attendance-qr' as any)} accessibilityLabel="View Attendance ID Pass">
            <Avatar name={user?.name || 'Employee'} size={32} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {/* ── PREMIUM SUMMARY CARD ── */}
            <Animated.View style={[styles.summaryCard, animatedCardStyle, shadows.medium]}>
              <View style={styles.summaryTopRow}>
                <Text style={styles.summaryLabel}>TASK SUMMARY</Text>
                <Pressable onPress={() => setDateModalVisible(true)} style={styles.filterMonthBtn}>
                  <Text style={styles.filterMonthText}>
                    {dayjs().date(selectedDay).month(selectedMonth - 1).year(selectedYear).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
                      ? 'Today'
                      : dayjs().date(selectedDay).month(selectedMonth - 1).year(selectedYear).format('DD MMM YYYY')}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </Pressable>
              </View>

              <View style={styles.summaryGrid}>
                {/* Left Stats Grid */}
                <View style={styles.summaryGridLeft}>
                  <View style={styles.summaryGridRow}>
                    <View style={styles.statBox}>
                      <View style={styles.statIconHeader}>
                        <Ionicons name="calendar-outline" size={18} color="#FFFFFF" opacity={0.9} />
                        <Text style={styles.statBoxValue}>{stats.total}</Text>
                      </View>
                      <Text style={styles.statBoxLabel}>Total Tasks</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={styles.statIconHeader}>
                        <Ionicons name="time-outline" size={18} color="#FFFFFF" opacity={0.9} />
                        <Text style={styles.statBoxValue}>{stats.inProgress}</Text>
                      </View>
                      <Text style={styles.statBoxLabel}>In Progress</Text>
                    </View>
                  </View>
                  
                  <View style={styles.summaryGridRow}>
                    <View style={styles.statBox}>
                      <View style={styles.statIconHeader}>
                        <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" opacity={0.9} />
                        <Text style={styles.statBoxValue}>{stats.pending}</Text>
                      </View>
                      <Text style={styles.statBoxLabel}>Pending</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={styles.statIconHeader}>
                        <Ionicons name="warning-outline" size={18} color="#FFFFFF" opacity={0.9} />
                        <Text style={styles.statBoxValue}>{stats.overdue}</Text>
                      </View>
                      <Text style={styles.statBoxLabel}>Overdue</Text>
                    </View>
                  </View>
                </View>

                {/* Right Completion Ring */}
                <View style={styles.summaryGridRight}>
                  <View style={styles.ringWrapper}>
                    <Svg width="80" height="80" viewBox="0 0 80 80">
                      <Circle
                        cx="40"
                        cy="40"
                        r={radiusRing}
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth={strokeRing}
                        fill="transparent"
                      />
                      <Circle
                        cx="40"
                        cy="40"
                        r={radiusRing}
                        stroke="#FFFFFF"
                        strokeWidth={strokeRing}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                    </Svg>
                    <View style={styles.ringTextWrapper}>
                      <Text style={styles.ringRateText}>{stats.rate}%</Text>
                    </View>
                  </View>
                  <Text style={styles.ringLabel}>Completion Rate</Text>
                </View>
              </View>
            </Animated.View>

            {/* ── FILTER CHIPS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTERS.map((filter) => {
                const isSelected = selectedFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setSelectedFilter(filter)}
                    style={[
                      styles.filterChip,
                      {
                        borderRadius: radius.circular,
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: 1,
                      },
                      isSelected && shadows.light,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textMuted,
                          fontFamily: isSelected ? typography.fonts.semibold : typography.fonts.medium,
                        },
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── SEARCH & SORT BAR ── */}
            <View style={styles.searchRow}>
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search tasks by title, project..."
                  placeholderTextColor={colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textLight} />
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={() => setSortBy(prev => prev === 'dueDate' ? 'priority' : 'dueDate')}
                style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="options-outline" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* ── TASK HEADLINE ── */}
            <View style={styles.tasksHeaderRow}>
              <Text style={[styles.tasksCountText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                TASKS ({filteredTasks.length})
              </Text>
              <View style={styles.tasksSortLabelRow}>
                <Text style={[styles.tasksSortText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                  {sortBy === 'dueDate' ? 'Due Date' : 'Priority'}
                </Text>
                <Ionicons name="arrow-down" size={12} color={colors.textMuted} style={{ marginLeft: 2 }} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textLight} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
              {searchQuery.trim() ? 'No Search Results' : 'You\'ve reached the end'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
              {searchQuery.trim() 
                ? 'Try refactoring your search keywords.' 
                : 'All your assigned tasks are fully completed or up to date!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          // Status Badge details
          const statusDetails = getStatusDetails(item.status);
          const priorityDetails = getPriorityDetails(item.priority);
          
          return (
            <Pressable
              onPress={() => {
                router.push({
                  pathname: '/task-details',
                  params: {
                    projectId: item.projectId || 'PRJ-001',
                    taskId: item.id,
                  },
                });
              }}
              style={({ pressed }) => [
                styles.taskCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftColor: priorityDetails.color,
                  opacity: pressed ? 0.95 : 1,
                },
                shadows.light,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.taskIconWrapper, { backgroundColor: `${colors.primary}10` }]}>
                    <Ionicons name={getTaskIcon(item.title)} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.taskTitleCol}>
                    <Text style={[styles.taskTitle, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.taskProject, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                      {item.projectName} • {item.id.replace('t-', '').split('-')[0] || item.projectCode || 'PRJ'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleTaskPressMenu(item)}
                  style={styles.dotMenuBtn}
                  accessible
                  accessibilityLabel="More actions"
                >
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.cardFooterLeft}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textLight} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardDateText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                    {item.dueDate ? dayjs(item.dueDate).format('DD MMM YYYY') : 'No due date'}
                  </Text>
                </View>
                <View style={styles.cardFooterRight}>
                  <Tag label={item.priority} intent={priorityDetails.intent as any} style={{ marginRight: 6 }} />
                  <Tag label={statusDetails.label} intent={statusDetails.intent as any} style={{ marginRight: 8 }} />
                  <Avatar name={item.assigneeName} size={24} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ── CUSTOM DATE PICKER MODAL (PREMIUM WHEEL PICKER) ── */}
      {dateModalVisible && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDateModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>Select Date</Text>
              <Pressable onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.pickerWheelsWrapper}>
                {/* Date/Day Wheel */}
                <WheelPicker
                  items={DAYS_DATA}
                  selectedValue={selectedDay}
                  onValueChange={(val) => {
                    setSelectedDay(val);
                  }}
                  width="26%"
                />

                {/* Month Wheel */}
                <WheelPicker
                  items={MONTHS_DATA}
                  selectedValue={selectedMonth}
                  onValueChange={(val) => {
                    setSelectedMonth(val);
                  }}
                  width="42%"
                />

                {/* Year Wheel */}
                <WheelPicker
                  items={YEARS_DATA}
                  selectedValue={selectedYear}
                  onValueChange={(val) => {
                    setSelectedYear(val);
                  }}
                  width="26%"
                />

                {/* Highlight Guide Lines */}
                <View style={[styles.highlightLinesContainer, { borderColor: colors.border }]} pointerEvents="none" />
              </View>

              {/* Preview Display */}
              <View style={[styles.datePreviewContainer, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}15` }]}>
                <Text style={[styles.datePreviewText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                  Selected: {dayjs().date(selectedDay).month(selectedMonth - 1).year(selectedYear).format('DD MMMM YYYY')}
                </Text>
              </View>

              {/* Submit / Reset Actions */}
              <View style={styles.modalActionsRow}>
                <Pressable
                  onPress={() => {
                    const today = dayjs();
                    setSelectedDay(today.date());
                    setSelectedMonth(today.month() + 1);
                    setSelectedYear(today.year());
                  }}
                  style={[styles.resetTodayBtn, { borderColor: colors.border, flex: 1 }]}
                >
                  <Text style={[styles.resetTodayBtnText, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>Today</Text>
                </Pressable>

                <Pressable
                  onPress={() => setDateModalVisible(false)}
                  style={[styles.submitDateBtn, { backgroundColor: colors.primary, flex: 1 }]}
                >
                  <Text style={[styles.submitDateBtnText, { fontFamily: typography.fonts.bold }]}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── CUSTOM TASK ACTIONS BOTTOM SHEET ── */}
      {actionModalVisible && selectedActionTask && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setActionModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>Task Actions</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: typography.fonts.regular, marginTop: 4 }} numberOfLines={1}>
                  Options for: {selectedActionTask.title}
                </Text>
              </View>
              <Pressable onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <Pressable
                onPress={() => {
                  setActionModalVisible(false);
                  router.push({
                    pathname: '/task-details',
                    params: {
                      projectId: selectedActionTask.projectId || 'PRJ-001',
                      taskId: selectedActionTask.id,
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.actionRowBtn,
                  {
                    backgroundColor: pressed ? `${colors.primary}08` : 'transparent',
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="eye-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <Text style={[styles.actionRowBtnText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                  View Details
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  setActionModalVisible(false);
                  try {
                    const targetStatus = selectedActionTask.status === 'In Progress' ? 'Completed' : 'In Progress';
                    await updateStatusMutation.mutateAsync({
                      projectId: selectedActionTask.projectId || 'PRJ-001',
                      taskId: selectedActionTask.id,
                      status: targetStatus,
                    });
                    refetch();
                  } catch (err: any) {
                    Alert.alert('Error', err?.message || 'Failed to update status');
                  }
                }}
                style={({ pressed }) => [
                  styles.actionRowBtn,
                  {
                    backgroundColor: pressed ? `${colors.primary}08` : 'transparent',
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={selectedActionTask.status === 'In Progress' ? "checkmark-circle-outline" : "play-circle-outline"}
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.actionRowBtnText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                  {selectedActionTask.status === 'In Progress' ? 'Move to Completed' : 'Move to In Progress'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Helpers for tags mapping
function getStatusDetails(status?: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'completed' || s === 'done') {
    return { label: 'Completed', intent: 'success' };
  } else if (s === 'in progress' || s === 'in_progress') {
    return { label: 'In Progress', intent: 'primary' };
  } else if (s === 'pending acceptance' || s === 'pending') {
    return { label: 'Pending', intent: 'warning' };
  } else if (s === 'to do' || s === 'todo') {
    return { label: 'To Do', intent: 'info' };
  } else if (s === 'overdue') {
    return { label: 'Overdue', intent: 'danger' };
  } else if (s === 'cancelled') {
    return { label: 'Cancelled', intent: 'neutral' };
  }
  return { label: status || 'To Do', intent: 'info' };
}

function getPriorityDetails(priority?: string) {
  const p = priority?.toLowerCase() || '';
  if (p === 'urgent' || p === 'critical') {
    return { color: '#8B5CF6', intent: 'danger' }; // Purple / Red
  } else if (p === 'high') {
    return { color: '#EF4444', intent: 'danger' }; // Red
  } else if (p === 'medium') {
    return { color: '#F59E0B', intent: 'warning' }; // Orange
  } else {
    return { color: '#10B981', intent: 'success' }; // Green
  }
}

function getTaskIcon(title?: string): keyof typeof Ionicons.glyphMap {
  const t = title?.toLowerCase() || '';
  if (t.includes('create') || t.includes('design') || t.includes('logo') || t.includes('ui/ux')) {
    return 'brush-outline';
  } else if (t.includes('chat') || t.includes('message')) {
    return 'chatbubble-outline';
  } else if (t.includes('test') || t.includes('bug') || t.includes('fix')) {
    return 'bug-outline';
  } else if (t.includes('mobile') || t.includes('app')) {
    return 'phone-portrait-outline';
  } else if (t.includes('report') || t.includes('progress') || t.includes('document')) {
    return 'document-text-outline';
  }
  return 'document-text-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
    flexGrow: 1,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.8,
    letterSpacing: 0.8,
  },
  filterMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterMonthText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryGridLeft: {
    flex: 1,
    marginRight: 16,
  },
  summaryGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginRight: 6,
  },
  statIconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statBoxValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statBoxLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
  },
  summaryGridRight: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
  },
  ringWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTextWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringRateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ringLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 6,
    opacity: 0.9,
    textAlign: 'center',
  },
  filterScroll: {
    marginBottom: 16,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 12,
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksCountText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tasksSortLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tasksSortText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  taskIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskTitleCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  taskProject: {
    fontSize: 11,
  },
  dotMenuBtn: {
    padding: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDateText: {
    fontSize: 11,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalContent: {
    gap: 16,
  },
  pickerSectionLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthTitle: {
    fontSize: 16,
  },
  navBtn: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerWheelsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 220, // 44 * 5
    position: 'relative',
    marginVertical: 12,
  },
  highlightLinesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 88, // 44 * 2
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },

  datePreviewContainer: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  datePreviewText: {
    fontSize: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetTodayBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetTodayBtnText: {
    fontSize: 16,
  },
  submitDateBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  actionRowBtnText: {
    fontSize: 15,
  },
});
