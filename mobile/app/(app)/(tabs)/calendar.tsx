/**
 * @file calendar.tsx
 * @description Enterprise Calendar Module for OMS Mobile App conforming strictly to OMS Design System,
 * featuring Month/Week view toggle, event indicators, filter chips, metric overview cards,
 * timeline schedule cards, FAB quick action menu, search integration, and full theme support.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  RefreshControl,
  FlatList,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

import useTheme from '../../../src/shared/hooks/useTheme';
import { useAuthStore } from '../../../src/shared/store/authStore';
import { Avatar, Badge, Button, TextField } from '../../../src/shared/components';
import { useConversations } from '../../../src/features/chat';
import { useAttendance } from '../../../src/features/attendance/hooks/useAttendance';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../src/shared/services/apiClient';
import profileApi from '../../../src/features/profile/api/profileApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type CalendarFilter = 'all' | 'meetings' | 'holiday' | 'reminder';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'holiday' | 'reminder';
  time: string; // e.g. "10:00 AM"
  endTime?: string;
  date: string; // YYYY-MM-DD
  badgeText?: string; // e.g. "INTERNAL", "PROJECT", "CLIENT"
  location?: string; // e.g. "Meeting Room A", "Video Conference"
  organizer?: string;
  participants?: Array<{ name: string; avatarUrl?: string }>;
  totalParticipantsCount?: number;
  actionText?: string; // e.g. "Join", "View Task", "Call"
  actionType?: 'join' | 'view_task' | 'call' | 'leave' | 'details';
  priority?: 'High' | 'Medium' | 'Low';
}

const EVENT_COLOR_MAP: Record<string, string> = {
  meeting: '#3B82F6',   // Blue
  holiday: '#EC4899',   // Pink / Purple
  reminder: '#F97316',  // Orange
};

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { data: conversations = [] } = useConversations();

  const unreadCount = conversations.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState<dayjs.Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false);
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);

  // Form states for Create Meeting
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingStartTime, setNewMeetingStartTime] = useState('10:00');
  const [newMeetingEndTime, setNewMeetingEndTime] = useState('11:00');
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Form states for Add Reminder
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('10:00');
  const [newReminderDescription, setNewReminderDescription] = useState('');
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // Fetch real attendance status
  const { todayRecord } = useAttendance();

  // Fetch global holidays from backend
  const { data: userHolidays = [], refetch: refetchHolidays } = useQuery({
    queryKey: ['calendar-holidays'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/holidays');
        return response.data?.data || response.data || [];
      } catch (err) {
        return [];
      }
    },
  });

  // Fetch calendar events via React Query
  const { data: serverEvents = [], isLoading, isError, refetch: refetchEvents } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', currentMonth.format('YYYY-MM')],
    queryFn: async () => {
      try {
        const fromDate = currentMonth.startOf('month').format('YYYY-MM-DD');
        const toDate = currentMonth.endOf('month').format('YYYY-MM-DD');
        const response = await apiClient.get(`/api/v1/events?from=${fromDate}&to=${toDate}`);
        return response.data?.data || response.data || [];
      } catch (err) {
        return [];
      }
    },
  });

  // Combine real events into allEvents (ONLY meetings, holidays, and reminders)
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // 1. Add server events of type meeting, holiday, or reminder
    if (Array.isArray(serverEvents)) {
      serverEvents.forEach((ev: any) => {
        const typeClean = (ev.type || '').toLowerCase();
        if (['meeting', 'holiday', 'reminder'].includes(typeClean)) {
          events.push({
            id: ev.id || ev._id || `evt-${Math.random()}`,
            title: ev.title || 'Event',
            type: typeClean as 'meeting' | 'holiday' | 'reminder',
            time: ev.time || (ev.startTime ? dayjs(ev.startTime).format('hh:mm A') : 'All Day'),
            endTime: ev.endTime,
            date: ev.date ? dayjs(ev.date).format('YYYY-MM-DD') : (ev.startTime ? dayjs(ev.startTime).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')),
            badgeText: (ev.badgeText || typeClean).toUpperCase(),
            location: ev.location || ev.description,
            participants: ev.participants || ev.attendees || [],
            totalParticipantsCount: ev.totalParticipantsCount || (ev.attendees ? ev.attendees.length : 0),
            actionText: ev.actionText || (typeClean === 'meeting' ? 'Join' : 'Details'),
            actionType: ev.actionType || (typeClean === 'meeting' ? 'join' : 'details'),
          });
        }
      });
    }

    // 2. Add global company holidays
    if (Array.isArray(userHolidays)) {
      userHolidays.forEach((h: any) => {
        const holidayDate = h.date;
        if (holidayDate) {
          const dateStr = dayjs(holidayDate).format('YYYY-MM-DD');
          // Avoid duplicates if already present in serverEvents
          if (!events.some((e) => e.date === dateStr && e.title === h.name)) {
            events.push({
              id: `holiday-${h.id || h._id}`,
              title: h.name || 'Global Holiday',
              type: 'holiday',
              time: 'All Day',
              date: dateStr,
              badgeText: (h.type || 'GLOBAL HOLIDAY').toUpperCase(),
              location: h.description || 'Company Holiday',
              participants: [],
              totalParticipantsCount: 0,
              actionText: 'Holiday Details',
              actionType: 'details',
            });
          }
        }
      });
    }

    return events;
  }, [serverEvents, userHolidays]);

  // Map events by date for quick lookup in calendar cells
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    allEvents.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return map;
  }, [allEvents]);

  // Metric overview statistics calculated dynamically from meetings, holidays & reminders
  const todayStr = dayjs().format('YYYY-MM-DD');

  const meetingsTodayCount = useMemo(() => {
    return (eventsByDate[todayStr] || []).filter((e) => e.type === 'meeting').length;
  }, [eventsByDate, todayStr]);

  const remindersTodayCount = useMemo(() => {
    return (eventsByDate[todayStr] || []).filter((e) => e.type === 'reminder').length;
  }, [eventsByDate, todayStr]);

  const holidaysCount = useMemo(() => {
    return allEvents.filter((e) => e.type === 'holiday').length;
  }, [allEvents]);

  const totalEventsCount = useMemo(() => {
    return allEvents.length;
  }, [allEvents]);

  // Filtered schedule events for selected date (with automatic Sunday Week Off)
  const filteredEventsForDate = useMemo(() => {
    const eventsForDay = [...(eventsByDate[selectedDate] || [])];
    const isSunday = dayjs(selectedDate).day() === 0;

    if (isSunday && !eventsForDay.some((e) => e.title.toLowerCase().includes('week off'))) {
      eventsForDay.unshift({
        id: `week-off-${selectedDate}`,
        title: 'Sunday - Weekly Off',
        type: 'holiday',
        time: 'All Day',
        date: selectedDate,
        badgeText: 'WEEK OFF',
        location: 'Company Weekly Off',
        participants: [],
        totalParticipantsCount: 0,
        actionText: 'Weekly Off',
        actionType: 'details',
      });
    }

    if (activeFilter === 'all') return eventsForDay;
    return eventsForDay.filter((e) => e.type === activeFilter);
  }, [eventsByDate, selectedDate, activeFilter]);

  // Generate calendar grid days for Month View
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    
    // ISO week starts on Monday (1 = MO, 7 = SU)
    let startDayOfWeek = startOfMonth.isoWeekday(); // 1..7
    const days: Array<{ date: dayjs.Dayjs; isCurrentMonth: boolean; dateStr: string }> = [];

    // Fill padding days from previous month
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const prevDate = startOfMonth.subtract(i, 'day');
      days.push({ date: prevDate, isCurrentMonth: false, dateStr: prevDate.format('YYYY-MM-DD') });
    }

    // Fill days of current month
    const totalDays = endOfMonth.date();
    for (let i = 1; i <= totalDays; i++) {
      const currDate = currentMonth.date(i);
      days.push({ date: currDate, isCurrentMonth: true, dateStr: currDate.format('YYYY-MM-DD') });
    }

    // Fill padding days for next month to complete 5 or 6 rows of 7 days
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = endOfMonth.add(i, 'day');
      days.push({ date: nextDate, isCurrentMonth: false, dateStr: nextDate.format('YYYY-MM-DD') });
    }

    return days;
  }, [currentMonth]);

  // Generate 7 days for Week View
  const weekDays = useMemo(() => {
    const selectedDayObj = dayjs(selectedDate);
    const startOfWeek = selectedDayObj.startOf('isoWeek');
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = startOfWeek.add(i, 'day');
      days.push({ date: d, isCurrentMonth: d.isSame(currentMonth, 'month'), dateStr: d.format('YYYY-MM-DD') });
    }
    return days;
  }, [selectedDate, currentMonth]);

  // Group days into rows of 7 for clean flex layout (prevents premature wrapping)
  const calendarRows = useMemo(() => {
    const daysList = viewMode === 'month' ? calendarDays : weekDays;
    const rows: Array<Array<{ date: dayjs.Dayjs; isCurrentMonth: boolean; dateStr: string }>> = [];
    for (let i = 0; i < daysList.length; i += 7) {
      rows.push(daysList.slice(i, i + 7));
    }
    return rows;
  }, [viewMode, calendarDays, weekDays]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => prev.add(1, 'month'));
  };

  const handleTodayPress = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today.format('YYYY-MM-DD'));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchEvents(),
        refetchHolidays(),
        profileApi.fetchProfile(),
      ]);
    } catch (err) {
      console.warn('[CalendarScreen] Hard refresh error:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  const handleSaveMeeting = async () => {
    if (!newMeetingTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a meeting title.');
      return;
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    const meetingDate = newMeetingDate.trim() || selectedDate || todayStr;
    if (meetingDate < todayStr) {
      Alert.alert('Validation Error', 'Cannot schedule meetings before today.');
      return;
    }

    try {
      setIsSavingMeeting(true);
      await apiClient.post('/api/v1/events', {
        title: newMeetingTitle.trim(),
        type: 'meeting',
        date: meetingDate,
        startTime: newMeetingStartTime.trim() || '10:00',
        endTime: newMeetingEndTime.trim() || '11:00',
        location: newMeetingLocation.trim() || 'Meeting Room',
        description: newMeetingDescription.trim(),
      });

      Alert.alert('Success', 'Meeting created successfully!');
      setIsCreateMeetingModalOpen(false);
      setNewMeetingTitle('');
      setNewMeetingDate('');
      setNewMeetingStartTime('10:00');
      setNewMeetingEndTime('11:00');
      setNewMeetingLocation('');
      setNewMeetingDescription('');
      refetchEvents();
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to create meeting.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!newReminderTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a reminder title.');
      return;
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    const reminderDate = newReminderDate.trim() || selectedDate || todayStr;
    if (reminderDate < todayStr) {
      Alert.alert('Validation Error', 'Cannot set reminders before today.');
      return;
    }

    try {
      setIsSavingReminder(true);
      await apiClient.post('/api/v1/events', {
        title: newReminderTitle.trim(),
        type: 'reminder',
        date: reminderDate,
        startTime: newReminderTime.trim() || '10:00',
        location: 'Reminder',
        description: newReminderDescription.trim(),
      });

      Alert.alert('Success', 'Reminder added successfully!');
      setIsAddReminderModalOpen(false);
      setNewReminderTitle('');
      setNewReminderDate('');
      setNewReminderTime('10:00');
      setNewReminderDescription('');
      refetchEvents();
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to add reminder.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSavingReminder(false);
    }
  };

  // Search filtered results across meetings, leave, holidays
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.badgeText && e.badgeText.toLowerCase().includes(q))
    );
  }, [allEvents, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── 1. OMS HEADER ─── */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleGroup}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Calendar
            </Text>
            <Text style={[styles.headerSubtitleText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              {dayjs().format('dddd, D MMM YYYY')}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightGroup}>
          <Pressable
            style={[styles.headerIconButton, { backgroundColor: colors.background }]}
            onPress={() => setIsSearchVisible(true)}
            accessibilityLabel="Search"
          >
            <Ionicons name="search-outline" size={20} color={colors.text} />
          </Pressable>

          <Pressable
            style={[styles.headerIconButton, { backgroundColor: colors.background }]}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {unreadCount > 0 && <Badge content={String(unreadCount > 9 ? '9+' : unreadCount)} style={styles.notifBadge} />}
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/attendance-qr' as any)}
            accessibilityLabel="Profile settings"
            style={{ marginLeft: 6 }}
          >
            <Avatar
              name={user?.name || 'User'}
              size={36}
              source={user?.avatarUrl || (user as any)?.avatar || undefined}
            />
          </Pressable>
        </View>
      </View>


      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
      >
        {/* ─── 2. CALENDAR TOOLBAR ─── */}
        <View style={styles.toolbarContainer}>
          <View style={styles.monthNavGroup}>
            <Pressable style={[styles.navArrowBtn, { backgroundColor: colors.surface }]} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>

            <Pressable style={styles.monthTitleBtn} onPress={handleTodayPress}>
              <Text style={[styles.monthTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                {currentMonth.format('MMMM YYYY')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 4 }} />
            </Pressable>

            <Pressable style={[styles.navArrowBtn, { backgroundColor: colors.surface }]} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.toolbarRightControls}>
            <Pressable
              style={[
                styles.viewToggleBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
            >
              <Ionicons name={viewMode === 'month' ? 'calendar-outline' : 'calendar'} size={15} color={colors.primary} />
              <Text style={[styles.viewToggleText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
                {viewMode === 'month' ? 'Week' : 'Month'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ─── 3. EXPANDABLE CALENDAR CARD ─── */}
        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Weekday Labels Header */}
          <View style={styles.weekdayRow}>
            {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((day) => (
              <Text
                key={day}
                style={[
                  styles.weekdayText,
                  {
                    color: day === 'SU' ? '#EF4444' : colors.textMuted,
                    fontFamily: typography.fonts.semibold,
                  },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Date Grid Cells */}
          <View style={styles.gridContainer}>
            {calendarRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {row.map((item, colIndex) => {
                  const isSelected = item.dateStr === selectedDate;
                  const dayEvents = eventsByDate[item.dateStr] || [];
                  const isToday = item.dateStr === dayjs().format('YYYY-MM-DD');
                  const isSunday = item.date.day() === 0;

                  return (
                    <Pressable
                      key={`${item.dateStr}-${colIndex}`}
                      style={[
                        styles.dayCell,
                        isSunday && !isSelected && { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2' },
                        isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedDate(item.dateStr)}
                    >
                      <Text
                        style={[
                          styles.dayNumberText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : isSunday
                              ? '#EF4444'
                              : item.isCurrentMonth
                              ? colors.text
                              : colors.textMuted + '66',
                            fontFamily: isSelected || isToday || isSunday ? typography.fonts.bold : typography.fonts.medium,
                          },
                        ]}
                      >
                        {item.date.date()}
                      </Text>

                      {/* Multi Event Dots */}
                      <View style={styles.dotsRow}>
                        {dayEvents.length > 0 ? (
                          dayEvents.slice(0, 3).map((evt, idx) => {
                            const dotColor = isSelected ? '#FFFFFF' : EVENT_COLOR_MAP[evt.type] || colors.primary;
                            return <View key={idx} style={[styles.eventDot, { backgroundColor: dotColor }]} />;
                          })
                        ) : isSunday ? (
                          <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : '#EF4444' }]} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* ─── 4. QUICK FILTERS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContainer}
        >
          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'all'
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'all' ? '#FFFFFF' : colors.text, fontFamily: typography.fonts.semibold },
              ]}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'meetings'
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => setActiveFilter('meetings')}
          >
            <View style={[styles.chipDot, { backgroundColor: '#3B82F6' }]} />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'meetings' ? '#FFFFFF' : colors.text, fontFamily: typography.fonts.semibold },
              ]}
            >
              Meetings
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'holiday'
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => setActiveFilter('holiday')}
          >
            <View style={[styles.chipDot, { backgroundColor: '#EC4899' }]} />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'holiday' ? '#FFFFFF' : colors.text, fontFamily: typography.fonts.semibold },
              ]}
            >
              Holidays
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'reminder'
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => setActiveFilter('reminder')}
          >
            <View style={[styles.chipDot, { backgroundColor: '#F97316' }]} />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'reminder' ? '#FFFFFF' : colors.text, fontFamily: typography.fonts.semibold },
              ]}
            >
              Reminders
            </Text>
          </Pressable>
        </ScrollView>

        {/* ─── 5. METRIC OVERVIEW CARDS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsScrollContainer}
        >
          {/* Card 1: Meetings Today */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.metricNumberText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {String(meetingsTodayCount).padStart(2, '0')}
            </Text>
            <Text style={[styles.metricLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Meetings Today
            </Text>
          </View>

          {/* Card 2: Reminders Today */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="alarm-outline" size={20} color="#F97316" />
            </View>
            <Text style={[styles.metricNumberText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {String(remindersTodayCount).padStart(2, '0')}
            </Text>
            <Text style={[styles.metricLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Reminders Today
            </Text>
          </View>

          {/* Card 3: Global Holidays */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="gift-outline" size={20} color="#EC4899" />
            </View>
            <Text style={[styles.metricNumberText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {String(holidaysCount).padStart(2, '0')}
            </Text>
            <Text style={[styles.metricLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Global Holidays
            </Text>
          </View>

          {/* Card 4: Total Schedule */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="layers-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.metricNumberText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {String(totalEventsCount).padStart(2, '0')}
            </Text>
            <Text style={[styles.metricLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Total Events
            </Text>
          </View>
        </ScrollView>

        {/* ─── 6. TODAY'S SCHEDULE SECTION ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Today's Schedule
          </Text>
          <Pressable onPress={() => setActiveFilter('all')}>
            <Text style={[styles.seeAllText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
              See All
            </Text>
          </Pressable>
        </View>

        {/* Timeline Schedule Cards */}
        {filteredEventsForDate.length === 0 ? (
          /* Empty State */
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              No Events Scheduled
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Enjoy your free day or schedule a new meeting.
            </Text>
            <View style={styles.emptyButtonRow}>
              <Button
                title="Create Meeting"
                onPress={() => setIsCreateMeetingModalOpen(true)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Add Reminder"
                variant="outlined"
                onPress={() => setIsAddReminderModalOpen(true)}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        ) : (
          filteredEventsForDate.map((item) => (
            <View key={item.id} style={styles.timelineRow}>
              {/* Left Time Column */}
              <View style={styles.timeColumn}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: EVENT_COLOR_MAP[item.type] || colors.primary,
                      fontFamily: typography.fonts.bold,
                    },
                  ]}
                >
                  {item.time}
                </Text>
                <View style={[styles.timelineDot, { backgroundColor: EVENT_COLOR_MAP[item.type] || colors.primary }]} />
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Right Event Card */}
              <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Card Top Row: Title + Badge + Options Menu */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text numberOfLines={1} style={[styles.eventTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {item.title}
                    </Text>
                  </View>

                  {item.badgeText && (
                    <View
                      style={[
                        styles.eventBadge,
                        {
                          backgroundColor:
                            item.badgeText === 'PROJECT'
                              ? '#ECFDF5'
                              : item.badgeText === 'CLIENT'
                              ? '#F3E8FF'
                              : '#EFF6FF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventBadgeText,
                          {
                            color:
                              item.badgeText === 'PROJECT'
                                ? '#10B981'
                                : item.badgeText === 'CLIENT'
                                ? '#8B5CF6'
                                : '#3B82F6',
                          },
                        ]}
                      >
                        {item.badgeText}
                      </Text>
                    </View>
                  )}

                  <Pressable style={{ marginLeft: 6 }}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* Subtitle / Location */}
                {item.location && (
                  <View style={styles.locationRow}>
                    <Ionicons
                      name={item.location.includes('Video') ? 'videocam-outline' : 'location-outline'}
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={[styles.locationText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                      {item.location}
                    </Text>
                  </View>
                )}

                {/* Bottom Row: Participants + Action Button */}
                <View style={styles.cardFooterRow}>
                  {/* Participants Avatar Stack */}
                  <View style={styles.avatarStack}>
                    {item.participants?.map((p, pIdx) => (
                      <View key={pIdx} style={[styles.avatarStackItem, { marginLeft: pIdx === 0 ? 0 : -10 }]}>
                        <Avatar name={p.name} size={28} source={p.avatarUrl} />
                      </View>
                    ))}
                    {item.totalParticipantsCount && item.totalParticipantsCount > (item.participants?.length || 0) && (
                      <View style={[styles.extraCountBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.extraCountText}>
                          +{item.totalParticipantsCount - (item.participants?.length || 0)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Primary Action Button */}
                  {item.actionText && (
                    <TouchableOpacity
                      style={[
                        styles.cardActionBtn,
                        item.actionType === 'join'
                          ? { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }
                          : item.actionType === 'view_task'
                          ? { backgroundColor: '#FFF7ED', borderColor: '#F97316' }
                          : { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
                      ]}
                      onPress={() => {
                        if (item.actionType === 'join') {
                          router.push('/(app)/meetings' as any);
                        } else if (item.actionType === 'view_task') {
                          router.push('/(app)/work' as any);
                        }
                      }}
                    >
                      <Ionicons
                        name={
                          item.actionType === 'join'
                            ? 'videocam-outline'
                            : item.actionType === 'view_task'
                            ? 'clipboard-outline'
                            : 'call-outline'
                        }
                        size={14}
                        color={
                          item.actionType === 'join'
                            ? '#3B82F6'
                            : item.actionType === 'view_task'
                            ? '#F97316'
                            : '#10B981'
                        }
                      />
                      <Text
                        style={[
                          styles.cardActionBtnText,
                          {
                            color:
                              item.actionType === 'join'
                                ? '#3B82F6'
                                : item.actionType === 'view_task'
                                ? '#F97316'
                                : '#10B981',
                            fontFamily: typography.fonts.semibold,
                          },
                        ]}
                      >
                        {item.actionText}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── 7. FLOATING ACTION BUTTON (FAB) & EXPANDABLE MENU ─── */}
      <View style={styles.fabContainer}>
        {isFabOpen && (
          <View style={[styles.fabMenuBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setIsFabOpen(false);
                setIsCreateMeetingModalOpen(true);
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
              <Text style={[styles.fabMenuText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Create Meeting
              </Text>
            </Pressable>

            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setIsFabOpen(false);
                setIsAddReminderModalOpen(true);
              }}
            >
              <Ionicons name="notifications-outline" size={18} color="#F97316" />
              <Text style={[styles.fabMenuText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Add Reminder
              </Text>
            </Pressable>
          </View>
        )}

        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={() => setIsFabOpen(!isFabOpen)}
        >
          <Ionicons name={isFabOpen ? 'close' : 'add'} size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ─── 8. SEARCH MODAL INTEGRATION ─── */}
      <Modal visible={isSearchVisible} animationType="fade" transparent onRequestClose={() => setIsSearchVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.searchModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Search Calendar
              </Text>
              <Pressable onPress={() => setIsSearchVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextField
              placeholder="Search meetings, tasks, holidays, participants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <ScrollView style={{ marginTop: 12, maxHeight: 300 }}>
              {searchResults.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, marginVertical: 20 }}>
                  {searchQuery ? 'No matching events found' : 'Type to search calendar events'}
                </Text>
              ) : (
                searchResults.map((item) => (
                  <View key={item.id} style={[styles.searchResultItem, { borderColor: colors.border }]}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontFamily: typography.fonts.bold }}>{item.title}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {item.date} • {item.time} {item.location ? `• ${item.location}` : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── 9. CREATE MEETING MODAL ─── */}
      <Modal visible={isCreateMeetingModalOpen} animationType="slide" transparent onRequestClose={() => setIsCreateMeetingModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.formModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: 12 }]}>
              Create New Meeting
            </Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <TextField
                label="Meeting Title *"
                placeholder="e.g. Q4 Sprint Planning"
                value={newMeetingTitle}
                onChangeText={setNewMeetingTitle}
              />
              <TextField
                label="Date (YYYY-MM-DD)"
                placeholder={selectedDate}
                value={newMeetingDate}
                onChangeText={setNewMeetingDate}
                style={{ marginTop: 10 }}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Start Time (HH:mm)"
                    placeholder="10:00"
                    value={newMeetingStartTime}
                    onChangeText={setNewMeetingStartTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="End Time (HH:mm)"
                    placeholder="11:00"
                    value={newMeetingEndTime}
                    onChangeText={setNewMeetingEndTime}
                  />
                </View>
              </View>
              <TextField
                label="Location / Room / Link"
                placeholder="e.g. Conference Room A or Google Meet"
                value={newMeetingLocation}
                onChangeText={setNewMeetingLocation}
                style={{ marginTop: 10 }}
              />
              <TextField
                label="Description"
                placeholder="Optional notes or agenda"
                value={newMeetingDescription}
                onChangeText={setNewMeetingDescription}
                style={{ marginTop: 10 }}
              />
            </ScrollView>
            <View style={styles.modalFooterRow}>
              <Button title="Cancel" variant="outlined" onPress={() => setIsCreateMeetingModalOpen(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button
                title={isSavingMeeting ? 'Saving...' : 'Save Meeting'}
                loading={isSavingMeeting}
                onPress={handleSaveMeeting}
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 10. ADD REMINDER MODAL ─── */}
      <Modal visible={isAddReminderModalOpen} animationType="slide" transparent onRequestClose={() => setIsAddReminderModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.formModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: 12 }]}>
              Add Reminder
            </Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <TextField
                label="Reminder Title *"
                placeholder="e.g. Follow up on client proposal"
                value={newReminderTitle}
                onChangeText={setNewReminderTitle}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Date (YYYY-MM-DD)"
                    placeholder={selectedDate}
                    value={newReminderDate}
                    onChangeText={setNewReminderDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Time (HH:mm)"
                    placeholder="10:00"
                    value={newReminderTime}
                    onChangeText={setNewReminderTime}
                  />
                </View>
              </View>
              <TextField
                label="Note / Details"
                placeholder="Optional reminder details"
                value={newReminderDescription}
                onChangeText={setNewReminderDescription}
                style={{ marginTop: 10 }}
              />
            </ScrollView>
            <View style={styles.modalFooterRow}>
              <Button title="Cancel" variant="outlined" onPress={() => setIsAddReminderModalOpen(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button
                title={isSavingReminder ? 'Setting...' : 'Set Reminder'}
                loading={isSavingReminder}
                onPress={handleSaveReminder}
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitleText: {
    fontSize: 18,
  },
  headerSubtitleText: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  monthTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  monthTitleText: {
    fontSize: 18,
  },
  toolbarRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 13,
    marginLeft: 4,
  },
  calendarCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  weekdayText: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  gridContainer: {
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayCell: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  selectedDayCell: {
    borderRadius: 14,
  },
  dayNumberText: {
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  filterScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
  },
  metricsScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  metricCard: {
    width: 110,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricNumberText: {
    fontSize: 20,
  },
  metricLabelText: {
    fontSize: 11,
    marginTop: 2,
  },
  metricSmallText: {
    fontSize: 10,
  },
  onTimeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  onTimeText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  seeAllText: {
    fontSize: 13,
  },
  timelineRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  timeColumn: {
    width: 65,
    alignItems: 'center',
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    marginBottom: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
  },
  eventCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 15,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackItem: {},
  extraCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  extraCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardActionBtnText: {
    fontSize: 12,
    marginLeft: 4,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    alignItems: 'flex-end',
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabMenuBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fabMenuText: {
    fontSize: 13,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  searchModalContent: {
    borderRadius: 18,
    padding: 16,
  },
  formModalContent: {
    borderRadius: 18,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalFooterRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  emptyContainer: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyButtonRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
