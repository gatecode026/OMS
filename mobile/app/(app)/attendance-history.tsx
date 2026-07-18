/**
 * @file attendance-history.tsx
 * @description Enterprise-grade, pixel-perfect Attendance History screen.
 *              Displays monthly summary stats, an interactive calendar grid,
 *              and detailed punch-in/out logs matching approved UI references.
 *              Includes live duration tracking, correction request modals, a correction history tracker,
 *              with interactive Edit, Withdraw, and inline modal feedback.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useTheme from '../../src/shared/hooks/useTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useAttendanceHistory } from '../../src/features/attendance/hooks/useAttendance';
import { Card, Skeleton, EmptyState, ErrorState } from '../../src/shared/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 12h Time Formatting Helper
const formatTime12h = (timeStr?: string) => {
  if (!timeStr || timeStr === '--:--') return '--:--';
  if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
    return timeStr;
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

// Formats average hours decimal (e.g. 8.25 -> "08:15")
const formatAvgHours = (hoursNum?: number) => {
  if (!hoursNum || hoursNum === 0) return '00:00';
  const hrs = Math.floor(hoursNum);
  const mins = Math.round((hoursNum - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
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

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();

  // Selected date states
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);

  // Fetch month data and summary from React Query hooks
  const {
    records,
    summary,
    holidays,
    isLoading,
    isError,
    error,
    refetch,
  } = useAttendanceHistory(selectedMonth);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Invalidate every active query on the screen to trigger fresh network refetches
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prev = dayjs(selectedMonth).subtract(1, 'month').format('YYYY-MM');
    setSelectedMonth(prev);
    setSelectedDate(`${prev}-01`);
  };

  const handleNextMonth = () => {
    const next = dayjs(selectedMonth).add(1, 'month').format('YYYY-MM');
    setSelectedMonth(next);
    setSelectedDate(`${next}-01`);
  };

  // Build calendar days array for the selected month (Monday to Sunday grid alignment)
  const calendarDays = useMemo(() => {
    const startOfMonth = dayjs(selectedMonth).startOf('month');
    const endOfMonth = dayjs(selectedMonth).endOf('month');
    
    // Convert Sunday-first (0) to Monday-first (0 = Mon, ..., 6 = Sun)
    const startDayOfWeek = (startOfMonth.day() + 6) % 7;
    
    const days = [];
    
    // 1. Previous month leading padding days (shown as muted light-gray)
    const prevMonth = startOfMonth.subtract(1, 'month');
    const prevMonthDays = prevMonth.daysInMonth();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonth.date(prevMonthDays - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: d.date(),
        dateString: d.format('YYYY-MM-DD'),
      });
    }
    
    // 2. Current month days
    const currentMonthDays = startOfMonth.daysInMonth();
    for (let i = 1; i <= currentMonthDays; i++) {
      const d = startOfMonth.date(i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dayNumber: i,
        dateString: d.format('YYYY-MM-DD'),
      });
    }
    
    // 3. Next month trailing padding days
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    const nextMonth = startOfMonth.add(1, 'month');
    for (let i = 1; i <= remaining; i++) {
      const d = nextMonth.date(i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: d.date(),
        dateString: d.format('YYYY-MM-DD'),
      });
    }
    
    return days;
  }, [selectedMonth]);

  // Index records by date string for O(1) calendar dot resolutions
  const recordsMap = useMemo(() => {
    const map = new Map<string, typeof records[0]>();
    records.forEach((r) => {
      map.set(r.date, r);
    });
    return map;
  }, [records]);

  // Helper to determine status style & color details
  const getStatusConfig = (statusStr?: string, dateStr?: string, punchIn?: string, punchOut?: string) => {
    const isFuture = dateStr && dayjs(dateStr).isAfter(dayjs(), 'day');
    const dayOfWeek = dateStr ? dayjs(dateStr).day() : -1;
    const isPast = dateStr ? dayjs(dateStr).isBefore(dayjs(), 'day') : false;
    
    if (isFuture) {
      return { dotColor: 'transparent', text: 'Scheduled', color: '#94A3B8', labelBg: '#F8FAFC', borderColor: 'transparent' };
    }

    // 1. Check if it's a Holiday
    const isHoliday = dateStr && holidays?.some((h: any) => h.date === dateStr);
    if (isHoliday) {
      const holidayObj = holidays.find((h: any) => h.date === dateStr);
      return {
        dotColor: '#0EA5E9',
        text: holidayObj?.name || 'Holiday',
        color: '#0EA5E9',
        labelBg: '#EFF6FF',
        borderColor: '#DBEAFE',
      };
    }

    // Leave/Weekly Off exceptions
    if (statusStr) {
      const st = statusStr.toLowerCase();
      if (st.includes('leave') || st.includes('off')) {
        return { dotColor: '#8B5CF6', text: 'Paid Leave', color: '#8B5CF6', labelBg: '#FAF5FF', borderColor: '#F3E8FF' };
      }
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = Sunday, 6 = Saturday
      return { dotColor: '#94A3B8', text: 'Weekly Off', color: '#64748B', labelBg: '#F8FAFC', borderColor: 'transparent', isWeekend: true };
    }

    // Check if there are no punches at all (Absent) or if it is a punch error (only punch-in but no punch-out)
    const hasPunchIn = !!(punchIn && punchIn !== '--:--');
    const hasPunchOut = !!(punchOut && punchOut !== '--:--');

    if (isPast && hasPunchIn && !hasPunchOut) {
      return {
        dotColor: 'transparent',
        text: 'Punch Error',
        color: '#D97706',
        labelBg: '#FFFBEB',
        borderColor: '#FDE68A'
      };
    }

    const hasPunches = hasPunchIn || hasPunchOut;
    if (isPast && !hasPunches) {
      return { dotColor: '#EF4444', text: 'Absent', color: '#EF4444', labelBg: '#FFF5F5', borderColor: '#FEE2E2' };
    }

    if (!statusStr) {
      return { dotColor: '#EF4444', text: 'Absent', color: '#EF4444', labelBg: '#FFF5F5', borderColor: '#FEE2E2' };
    }

    const st = statusStr.toLowerCase();
    if (st.includes('present')) {
      return { dotColor: '#10B981', text: 'Present', color: '#10B981', labelBg: '#F0FDF4', borderColor: '#D1FAE5' };
    }
    if (st.includes('late')) {
      return { dotColor: '#3B82F6', text: 'Late', color: '#3B82F6', labelBg: '#EFF6FF', borderColor: '#DBEAFE' };
    }
    if (st.includes('absent')) {
      return { dotColor: '#EF4444', text: 'Absent', color: '#EF4444', labelBg: '#FFF5F5', borderColor: '#FEE2E2' };
    }
    if (st.includes('half')) {
      return { dotColor: '#EAB308', text: 'Half Day', color: '#EAB308', labelBg: '#FEFCE8', borderColor: '#FEF9C3' };
    }

    return { dotColor: '#10B981', text: 'Present', color: '#10B981', labelBg: '#F0FDF4', borderColor: '#D1FAE5' };
  };

  // Find record for currently selected day
  const dailyRecord = recordsMap.get(selectedDate);
  const selectedConfig = getStatusConfig(dailyRecord?.status, selectedDate, dailyRecord?.punchIn, dailyRecord?.punchOut);

  // Dynamic values for display
  const activePresentCount = summary?.presentDays || 0;
  const activeLateCount = summary?.lateDays || 0;
  const activeAvgHours = formatAvgHours(summary?.avgHours);

  // Calculate gross working duration for display (totalHours + breakTime)
  const getSelectedWorkingDuration = () => {
    if (!dailyRecord || !dailyRecord.punchIn || dailyRecord.punchIn === '--:--') return '--h --m';
    let hours = dailyRecord.totalHours || 0;
    let breakMins = 0;
    
    if (dailyRecord.breakTime) {
      const clean = dailyRecord.breakTime.toLowerCase();
      if (clean.includes('min')) {
        breakMins = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 0;
      } else if (dailyRecord.breakTime.includes('h')) {
        const parts = dailyRecord.breakTime.split('h');
        const hrs = parseInt(parts[0], 10) || 0;
        const mins = parseInt(parts[1]?.replace(/[^0-9]/g, ''), 10) || 0;
        breakMins = hrs * 60 + mins;
      }
    }

    const totalMins = Math.round(hours * 60) + breakMins;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  // Live Today duration timer
  const [liveDuration, setLiveDuration] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateLiveTimer = () => {
      const todayStr = dayjs().format('YYYY-MM-DD');
      if (selectedDate !== todayStr || !dailyRecord) {
        setLiveDuration('');
        return;
      }

      // If today is checked in but not checked out yet, show live elapsed counter
      if (
        dailyRecord.punchIn &&
        dailyRecord.punchIn !== '--:--' &&
        (!dailyRecord.punchOut || dailyRecord.punchOut === '--:--' || dailyRecord.punchOut === 'Pending')
      ) {
        const punchDate = parseTimeToDate(dailyRecord.punchIn);
        if (punchDate && punchDate.isValid()) {
          const diffMins = dayjs().diff(punchDate, 'minute');
          if (diffMins > 0) {
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            setLiveDuration(`${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`);
          } else {
            setLiveDuration('00h 00m');
          }
        } else {
          setLiveDuration('00h 00m');
        }
      } else {
        setLiveDuration('');
      }
    };

    updateLiveTimer();
    interval = setInterval(updateLiveTimer, 1000); // Live update every second!

    return () => clearInterval(interval);
  }, [selectedDate, dailyRecord]);

  const activeDurationDisplay = liveDuration || getSelectedWorkingDuration();

  // Date selection handler that auto-switches month if adjacent days are clicked
  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dateMonth = dayjs(dateStr).format('YYYY-MM');
    if (dateMonth !== selectedMonth) {
      setSelectedMonth(dateMonth);
    }
  };

  // Calculate cell width mathematically based on full screen width minus horizontal paddings (16 left + 16 right card padding = 32 total width offset)
  // With 6 gaps of 8px each (total 48px space for gaps)
  const cellWidth = useMemo(() => {
    return Math.floor((SCREEN_WIDTH - 32 - 48) / 7);
  }, []);

  // Perfect Square Day Cells
  const cellHeight = cellWidth;

  // Punch time correction states
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<'In' | 'Out'>('In');
  const [proposedHour, setProposedHour] = useState('');
  const [proposedMin, setProposedMin] = useState('');
  const [proposedAmPm, setProposedAmPm] = useState<'AM' | 'PM'>('AM');
  const [reason, setReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Inline Feedback States (Instead of popups)
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [historyAlert, setHistoryAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Withdraw Confirmation Dialog States
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [requestToWithdraw, setRequestToWithdraw] = useState<string | null>(null);

  // Local state for requests history
  const [correctionRequests, setCorrectionRequests] = useState([
    { id: '1', date: '2026-07-09', type: 'Out', proposedTime: '06:30 PM', reason: 'Client meeting completed late', status: 'Pending' },
    { id: '2', date: '2026-07-08', type: 'In', proposedTime: '09:15 AM', reason: 'Train delayed', status: 'Approved' },
  ]);

  const requestCount = useMemo(() => {
    return correctionRequests.filter(r => r.date === selectedDate && r.status === 'Pending').length;
  }, [correctionRequests, selectedDate]);

  const filteredRequests = useMemo(() => {
    return correctionRequests.filter(r => r.date === selectedDate);
  }, [correctionRequests, selectedDate]);

  const showHistoryAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setHistoryAlert({ message, type });
    setTimeout(() => {
      setHistoryAlert(null);
    }, 3000);
  };

  const handleWithdrawClick = (id: string) => {
    setRequestToWithdraw(id);
    setConfirmVisible(true);
  };

  const confirmWithdraw = () => {
    if (requestToWithdraw) {
      setCorrectionRequests((prev) => prev.filter((r) => r.id !== requestToWithdraw));
      setConfirmVisible(false);
      setRequestToWithdraw(null);
      showHistoryAlert('Request withdrawn successfully!', 'success');
    }
  };

  const handleEditRequest = (item: any) => {
    setEditingRequestId(item.id);
    setPunchType(item.type);
    setSelectedDate(item.date); // sync date
    setInlineError(null);
    setSuccessText(null);
    
    const match = item.proposedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      setProposedHour(match[1]);
      setProposedMin(match[2]);
      setProposedAmPm(match[3].toUpperCase() as 'AM' | 'PM');
    } else {
      setProposedHour('');
      setProposedMin('');
      setProposedAmPm('AM');
    }
    setReason(item.reason);
    
    setIsHistoryModalOpen(false); // Close list
    setIsCorrectionModalOpen(true); // Open edit inputs
  };

  // Prepopulate correction fields
  const handleOpenCorrectionModal = (type: 'In' | 'Out') => {
    setEditingRequestId(null); // Reset edit state
    setPunchType(type);
    setInlineError(null);
    setSuccessText(null);
    let sourceTime = type === 'In' ? dailyRecord?.punchIn : dailyRecord?.punchOut;
    
    const formattedSourceTime = formatTime12h(sourceTime);
    if (formattedSourceTime && formattedSourceTime !== '--:--') {
      const match = formattedSourceTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        setProposedHour(match[1]);
        setProposedMin(match[2]);
        setProposedAmPm(match[3].toUpperCase() as 'AM' | 'PM');
      }
    } else {
      setProposedHour('');
      setProposedMin('');
      setProposedAmPm('AM');
    }
    setReason('');
    setIsCorrectionModalOpen(true);
  };

  const handlePunchTypeChange = (type: 'In' | 'Out') => {
    setPunchType(type);
    let sourceTime = type === 'In' ? dailyRecord?.punchIn : dailyRecord?.punchOut;
    const formattedSourceTime = formatTime12h(sourceTime);
    if (formattedSourceTime && formattedSourceTime !== '--:--') {
      const match = formattedSourceTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        setProposedHour(match[1]);
        setProposedMin(match[2]);
        setProposedAmPm(match[3].toUpperCase() as 'AM' | 'PM');
      }
    } else {
      setProposedHour('');
      setProposedMin('');
      setProposedAmPm('AM');
    }
  };

  const handleSubmitCorrection = () => {
    const hh = parseInt(proposedHour, 10);
    const mm = parseInt(proposedMin, 10);

    if (isNaN(hh) || hh < 1 || hh > 12) {
      setInlineError('Please enter a valid hour between 1 and 12.');
      return;
    }
    if (isNaN(mm) || mm < 0 || mm > 59) {
      setInlineError('Please enter a valid minute between 0 and 59.');
      return;
    }
    if (!reason.trim()) {
      setInlineError('Please provide a brief reason for the punch correction.');
      return;
    }

    setInlineError(null);
    setIsSubmittingRequest(true);
    // Mock API request delay
    setTimeout(() => {
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${proposedAmPm}`;
      
      if (editingRequestId) {
        setCorrectionRequests(prev => prev.map(r => r.id === editingRequestId ? { ...r, type: punchType, proposedTime: timeStr, reason: reason } : r));
        setEditingRequestId(null);
        setIsSubmittingRequest(false);
        setSuccessText('Request Updated Successfully');
        
        // Auto close after 2.5 seconds
        setTimeout(() => {
          setIsCorrectionModalOpen(false);
          setSuccessText(null);
        }, 2200);
      } else {
        const newReq = {
          id: String(Date.now()),
          date: selectedDate,
          type: punchType,
          proposedTime: timeStr,
          reason: reason,
          status: 'Pending'
        };
        setCorrectionRequests(prev => [newReq, ...prev]);
        setIsSubmittingRequest(false);
        setSuccessText('Request Submitted Successfully');
        
        // Auto close after 2.5 seconds
        setTimeout(() => {
          setIsCorrectionModalOpen(false);
          setSuccessText(null);
        }, 2200);
      }
    }, 1200);
  };
  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ─── Sticky Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <Text style={[styles.title, { fontFamily: typography.fonts.bold }]}>
          Attendance History
        </Text>
        <View style={styles.headerRightGroup}>
          <Pressable style={styles.headerIconButton}>
            <Ionicons name="filter-outline" size={22} color="#1E293B" />
          </Pressable>
          <Pressable style={styles.headerIconButton}>
            <Ionicons name="calendar-outline" size={22} color="#1E293B" />
          </Pressable>
        </View>
      </View>

      {isError ? (
        <View style={styles.centerFeedback}>
          <ErrorState
            title="Failed to Load History"
            message={error?.message || 'Check your internet connection and try again.'}
            onRetry={refetch}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
        >
          {/* ─── Month Navigation Card ─── */}
          <Card style={[styles.monthCard, { marginHorizontal: 20, marginTop: spacing.md, borderRadius: 16 }]}>
            <View style={styles.monthNavRow}>
              <Pressable onPress={handlePrevMonth} style={styles.monthNavArrow}>
                <Ionicons name="chevron-back" size={20} color="#4F46E5" />
              </Pressable>
              <View style={styles.monthTitleWrapper}>
                <Text style={[styles.monthLabel, { fontFamily: typography.fonts.bold }]}>
                  {dayjs(selectedMonth).format('MMMM YYYY')}
                </Text>
                <Text style={[styles.monthSubLabel, { fontFamily: typography.fonts.medium }]}>
                  {Math.ceil(calendarDays.length / 7)} Weeks Overview
                </Text>
              </View>
              <Pressable onPress={handleNextMonth} style={styles.monthNavArrow}>
                <Ionicons name="chevron-forward" size={20} color="#4F46E5" />
              </Pressable>
            </View>
          </Card>

          {/* ─── Statistics Horizontal Row ─── */}
          {isLoading ? (
            <View style={[styles.statsRow, { paddingHorizontal: 20 }]}>
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
            </View>
          ) : (
            <View style={styles.statsRow}>
              {/* Present Card */}
              <View style={[styles.statCard, { backgroundColor: '#E6F7F0' }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={[styles.statLabel, { color: '#10B981', fontFamily: typography.fonts.bold }]}>
                    PRESENT
                  </Text>
                </View>
                <Text style={[styles.statValue, { fontFamily: typography.fonts.bold }]}>
                  {String(activePresentCount).padStart(2, '0')}{' '}
                  <Text style={[styles.statUnit, { fontFamily: typography.fonts.medium }]}>days</Text>
                </Text>
              </View>

              {/* Late Card */}
              <View style={[styles.statCard, { backgroundColor: '#EBF5FF' }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="time" size={14} color="#3B82F6" />
                  <Text style={[styles.statLabel, { color: '#3B82F6', fontFamily: typography.fonts.bold }]}>
                    LATE
                  </Text>
                </View>
                <Text style={[styles.statValue, { fontFamily: typography.fonts.bold }]}>
                  {String(activeLateCount).padStart(2, '0')}{' '}
                  <Text style={[styles.statUnit, { fontFamily: typography.fonts.medium }]}>days</Text>
                </Text>
              </View>

              {/* Avg Hours Card */}
              <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="pulse" size={14} color="#8B5CF6" />
                  <Text style={[styles.statLabel, { color: '#8B5CF6', fontFamily: typography.fonts.bold }]}>
                    AVG HOURS
                  </Text>
                </View>
                <Text style={[styles.statValue, { fontFamily: typography.fonts.bold }]}>
                  {activeAvgHours}{' '}
                  <Text style={[styles.statUnit, { fontFamily: typography.fonts.medium }]}>hrs</Text>
                </Text>
              </View>
            </View>
          )}

          {/* ─── Activity Calendar ─── */}
          <View style={styles.calendarCard}>
            <Text style={[styles.sectionTitle, { fontFamily: typography.fonts.bold, marginBottom: spacing.lg }]}>
              Activity Calendar
            </Text>

            {/* Weekday headers aligned mathematically with columns */}
            <View style={styles.weekHeadersRow}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w, index) => (
                <Text
                  key={index}
                  style={[
                    styles.weekHeaderText,
                    {
                      width: cellWidth,
                      marginRight: index < 6 ? 8 : 0,
                      fontFamily: typography.fonts.medium,
                    },
                  ]}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* Days grid */}
            {isLoading ? (
              <View style={styles.calendarGridSkeleton}>
                <Skeleton height={200} borderRadius={16} />
              </View>
            ) : (
              <View style={styles.daysGrid}>
                {calendarDays.map((day, idx) => {
                  const isSelected = day.dateString === selectedDate;
                  const isToday = day.dateString === dayjs().format('YYYY-MM-DD');
                  const dayRecord = recordsMap.get(day.dateString);
                  const config = getStatusConfig(dayRecord?.status, day.dateString, dayRecord?.punchIn, dayRecord?.punchOut);

                  const dayOfWeek = day.date.day();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Saturday & Sunday are weekly off weekends!

                  const isPastDay = dayjs(day.dateString).isBefore(dayjs(), 'day');
                  const hasPunchIn = !!(dayRecord && dayRecord.punchIn && dayRecord.punchIn !== '--:--');
                  const hasPunchOut = !!(dayRecord && dayRecord.punchOut && dayRecord.punchOut !== '--:--');
                  const isPunchError = isPastDay && hasPunchIn && !hasPunchOut;

                  // Determine background color and border dynamically based on status to match the exact user request
                  let cellBg = 'transparent';
                  let cellBorderColor = 'transparent';
                  let cellBorderWidth = 0;

                  if (isSelected) {
                    cellBg = '#3F51B5'; // Premium indigo background for selected date
                  } else if (isPunchError) {
                    cellBg = '#FFFBEB'; // Soft warning background
                    cellBorderColor = '#FDE68A';
                    cellBorderWidth = 1;
                  } else if (day.isCurrentMonth) {
                    if (isWeekend) {
                      cellBg = 'transparent'; // Sunday is transparent
                    } else if (dayRecord) {
                      // Color complete box matching day's status
                      cellBg = config.labelBg;
                      cellBorderColor = config.borderColor;
                      cellBorderWidth = 1;
                    } else {
                      // Weekday with no record (Absent or today/future)
                      const isTodayOrFuture = day.dateString === dayjs().format('YYYY-MM-DD') || dayjs(day.dateString).isAfter(dayjs(), 'day');
                      if (isTodayOrFuture) {
                        cellBg = '#F8FAFC'; // default soft gray
                      } else {
                        // Past weekday with no record is Absent
                        cellBg = '#FFF5F5'; // Soft light red
                        cellBorderColor = '#FEE2E2';
                        cellBorderWidth = 1;
                      }
                    }
                  } else {
                    // Padding day of previous/next month
                    if (dayRecord) {
                      cellBg = config.labelBg;
                      cellBorderColor = config.borderColor;
                      cellBorderWidth = 1;
                    }
                  }

                  let textColor = '#1E293B';
                  if (isSelected) {
                    textColor = '#FFFFFF';
                  } else if (isPunchError) {
                    textColor = '#D97706'; // warning orange/amber text
                  } else if (!day.isCurrentMonth) {
                    textColor = '#CBD5E1'; // faint gray padding day text
                  }

                  let dotColor = config.dotColor;
                  if (isSelected) {
                    dotColor = '#FFFFFF';
                  }

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handleDateSelect(day.dateString)}
                      style={[
                        styles.dayCell,
                        {
                          width: cellWidth,
                          height: cellHeight,
                          backgroundColor: cellBg,
                          borderColor: cellBorderColor,
                          borderWidth: cellBorderWidth,
                          borderRadius: 12,
                          marginRight: (idx % 7 < 6) ? 8 : 0,
                        },
                        isSelected && {
                          shadowColor: '#3F51B5',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 6,
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumberText,
                          {
                            color: textColor,
                            fontFamily: isSelected || isToday ? typography.fonts.bold : typography.fonts.medium,
                          },
                        ]}
                      >
                        {day.dayNumber}
                      </Text>
                      {isPunchError && (
                        <Ionicons
                          name="alert-circle"
                          size={10}
                          color={isSelected ? '#FFFFFF' : '#D97706'}
                          style={{ position: 'absolute', top: 4, right: 4 }}
                        />
                      )}
                      {dotColor !== 'transparent' && !isPunchError && (
                        <View
                          style={[
                            styles.dayDot,
                            { backgroundColor: dotColor },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Calendar Legends */}
            <View style={styles.legendContainer}>
              <View style={styles.legendRow}>
                <View style={[styles.legendItem, { backgroundColor: '#E6F7F0' }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.legendText, { color: '#10B981', fontFamily: typography.fonts.semibold }]}>Present</Text>
                </View>
                <View style={[styles.legendItem, { backgroundColor: '#EBF5FF' }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.legendText, { color: '#3B82F6', fontFamily: typography.fonts.semibold }]}>Late</Text>
                </View>
                <View style={[styles.legendItem, { backgroundColor: '#FEE2E2' }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.legendText, { color: '#EF4444', fontFamily: typography.fonts.semibold }]}>Absent</Text>
                </View>
                <View style={[styles.legendItem, { backgroundColor: '#FEF3C7' }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
                  <Text style={[styles.legendText, { color: '#EAB308', fontFamily: typography.fonts.semibold }]}>Half Day</Text>
                </View>
              </View>
              <View style={[styles.legendRow, { marginTop: 8, justifyContent: 'flex-start' }]}>
                <View style={[styles.legendItem, { backgroundColor: '#F3E8FF' }]}>
                  <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={[styles.legendText, { color: '#8B5CF6', fontFamily: typography.fonts.semibold }]}>Paid Leave</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ─── Detailed Logs Section ─── */}
          <View style={[styles.detailedLogsHeader, { paddingHorizontal: 20 }]}>
            <Text style={[styles.sectionTitle, { fontFamily: typography.fonts.bold }]}>
              Detailed Logs
            </Text>
          </View>

          {isLoading ? (
            <View style={{ paddingHorizontal: 20 }}>
              <Skeleton height={160} borderRadius={24} />
            </View>
          ) : dailyRecord ? (
            <Card
              style={[
                styles.logCard,
                {
                  marginHorizontal: 20,
                  borderRadius: 24,
                  borderTopWidth: 6,
                  borderTopColor: selectedConfig.color,
                },
              ]}
            >
              <View style={styles.logCardHeader}>
                <View style={styles.logCardDateCol}>
                  <View style={styles.dateBubble}>
                    <Text style={[styles.dateBubbleDay, { fontFamily: typography.fonts.medium }]}>
                      {dayjs(selectedDate).format('ddd').toUpperCase()}
                    </Text>
                    <Text style={[styles.dateBubbleNum, { fontFamily: typography.fonts.bold }]}>
                      {dayjs(selectedDate).format('D')}
                    </Text>
                  </View>
                  <View style={styles.dateLabelGroup}>
                    <Text style={[styles.logDateVal, { fontFamily: typography.fonts.bold }]}>
                      {dayjs(selectedDate).format('MMMM D, YYYY')}
                    </Text>
                    <View
                      style={[
                        styles.statusLabelBadge,
                        {
                          backgroundColor: selectedConfig.labelBg || '#E6F7F0',
                        },
                      ]}
                    >
                      <View style={[styles.statusBadgeDot, { backgroundColor: selectedConfig.color }]} />
                      <Text style={[styles.statusLabelText, { color: selectedConfig.color, fontFamily: typography.fonts.bold }]}>
                        {selectedConfig.text}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.durationCol}>
                  <Text style={[styles.durationVal, { fontFamily: typography.fonts.bold }]}>
                    {activeDurationDisplay}
                  </Text>
                  <Text style={[styles.durationLabel, { fontFamily: typography.fonts.bold }]}>
                    TOTAL DURATION
                  </Text>
                </View>
              </View>

              {/* Punch details or "No data available" placeholder */}
              {!dailyRecord.punchIn || dailyRecord.punchIn === '--:--' ? (
                <View style={{
                  alignItems: 'center',
                  paddingVertical: 24,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  borderStyle: 'dashed',
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  marginTop: 8,
                }}>
                  <Ionicons name="calendar-clear-outline" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                  <Text style={{ color: '#64748B', fontSize: 13, fontFamily: typography.fonts.medium }}>
                    No data available for this date
                  </Text>
                </View>
              ) : (
                <View>
                  {/* Punch In / Out cards */}
                  <View style={styles.punchDetailsRow}>
                    {/* Punch In */}
                    <Pressable
                      onPress={() => handleOpenCorrectionModal('In')}
                      style={styles.punchDetailsBox}
                    >
                      <View style={styles.punchHeader}>
                        <Text style={[styles.punchTitle, { fontFamily: typography.fonts.bold }]}>
                          PUNCH IN
                        </Text>
                        <Ionicons name="create-outline" size={14} color="#64748B" />
                      </View>
                      <Text style={[styles.punchTimeText, { fontFamily: typography.fonts.bold }]}>
                        {formatTime12h(dailyRecord.punchIn)}
                      </Text>
                      <Text style={[styles.punchStatusSubtitle, { color: dailyRecord.status === 'Late' ? '#F59E0B' : '#10B981', fontFamily: typography.fonts.bold }]}>
                        {dailyRecord.status === 'Late' ? 'Late Arrival' : 'On Time'}
                      </Text>
                    </Pressable>

                    {/* Punch Out */}
                    <Pressable
                      onPress={() => handleOpenCorrectionModal('Out')}
                      style={styles.punchDetailsBox}
                    >
                      <View style={styles.punchHeader}>
                        <Text style={[styles.punchTitle, { fontFamily: typography.fonts.bold }]}>
                          PUNCH OUT
                        </Text>
                        <Ionicons name="create-outline" size={14} color="#64748B" />
                      </View>
                      <Text style={[styles.punchTimeText, { fontFamily: typography.fonts.bold }]}>
                        {formatTime12h(dailyRecord.punchOut)}
                      </Text>
                      <Text style={[styles.punchStatusSubtitle, { color: dailyRecord.punchOut && dailyRecord.punchOut !== '--:--' ? '#10B981' : '#94A3B8', fontFamily: typography.fonts.bold }]}>
                        {dailyRecord.punchOut && dailyRecord.punchOut !== '--:--' ? 'Regular Exit' : 'Pending'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Correction Request CTA Button Row */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
                    <Pressable
                      onPress={() => handleOpenCorrectionModal('In')}
                      style={[styles.correctionTriggerBtn, { flex: 1 }]}
                    >
                      <Ionicons name="git-pull-request" size={16} color="#3F51B5" style={{ marginRight: 6 }} />
                      <Text style={[styles.correctionTriggerText, { color: '#3F51B5', fontFamily: typography.fonts.semibold }]}>
                        Request Punch Correction
                      </Text>
                    </Pressable>

                    {/* Small button with badge */}
                    <Pressable
                      onPress={() => setIsHistoryModalOpen(true)}
                      style={styles.requestCountBtn}
                    >
                      <Ionicons name="list-outline" size={20} color="#3F51B5" />
                      {requestCount > 0 && (
                        <View style={styles.badgeContainer}>
                          <Text style={styles.badgeText}>{requestCount}</Text>
                        </View>
                      )}
                    </Pressable>
                  </View>

                  {/* Work Location details if available */}
                  {dailyRecord.location?.address && (
                    <View style={styles.locationDetailsRow}>
                      <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={[styles.locationText, { color: '#64748B', fontFamily: typography.fonts.medium }]} numberOfLines={1}>
                        Location: {dailyRecord.location.address}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <EmptyState
                title="No logs recorded"
                description={`No attendance punches registered for ${dayjs(selectedDate).format('MMM DD, YYYY')}.`}
                icon="calendar-clear-outline"
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── Punch Correction Request Modal ─── */}
      <Modal
        visible={isCorrectionModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCorrectionModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            {successText ? (
              /* Inline Success Feedback */
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <View style={[styles.alertIconCircle, { backgroundColor: '#ECFDF5', marginBottom: 16 }]}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { fontFamily: typography.fonts.bold, textAlign: 'center', marginBottom: 8 }]}>
                  {successText}
                </Text>
                <Text style={{ textAlign: 'center', color: '#64748B', fontFamily: typography.fonts.medium, fontSize: 13 }}>
                  This request will close automatically...
                </Text>
              </View>
            ) : (
              /* Standard Input Form */
              <View>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { fontFamily: typography.fonts.bold }]}>
                    {editingRequestId ? 'Edit Punch Request' : 'Punch Correction'}
                  </Text>
                  <Pressable onPress={() => setIsCorrectionModalOpen(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </Pressable>
                </View>

                {/* Selected Date Indicator */}
                <View style={styles.modalDateInfo}>
                  <Ionicons name="calendar-outline" size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                  <Text style={[styles.modalDateText, { fontFamily: typography.fonts.semibold }]}>
                    For {dayjs(selectedDate).format('MMMM DD, YYYY')}
                  </Text>
                </View>

                {/* Segmented Punch Type Selector */}
                <View style={styles.segmentContainer}>
                  <Pressable
                    onPress={() => handlePunchTypeChange('In')}
                    style={[
                      styles.segmentBtn,
                      punchType === 'In' && styles.segmentBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { fontFamily: typography.fonts.bold },
                        punchType === 'In' && styles.segmentTextActive,
                      ]}
                    >
                      Punch In
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handlePunchTypeChange('Out')}
                    style={[
                      styles.segmentBtn,
                      punchType === 'Out' && styles.segmentBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { fontFamily: typography.fonts.bold },
                        punchType === 'Out' && styles.segmentTextActive,
                      ]}
                    >
                      Punch Out
                    </Text>
                  </Pressable>
                </View>

                {/* Time Picker Inputs */}
                <Text style={[styles.inputLabel, { fontFamily: typography.fonts.bold }]}>
                  Proposed Time
                </Text>
                <View style={styles.timeInputsRow}>
                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={[styles.timeInput, { fontFamily: typography.fonts.bold }]}
                      placeholder="09"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={2}
                      value={proposedHour}
                      onChangeText={setProposedHour}
                    />
                    <Text style={styles.timeInputSub}>HH</Text>
                  </View>

                  <Text style={[styles.timeColon, { fontFamily: typography.fonts.bold }]}>:</Text>

                  <View style={styles.timeInputWrapper}>
                    <TextInput
                      style={[styles.timeInput, { fontFamily: typography.fonts.bold }]}
                      placeholder="30"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={2}
                      value={proposedMin}
                      onChangeText={setProposedMin}
                    />
                    <Text style={styles.timeInputSub}>MM</Text>
                  </View>

                  {/* AM/PM Toggle */}
                  <View style={styles.ampmToggleContainer}>
                    <Pressable
                      onPress={() => setProposedAmPm('AM')}
                      style={[
                        styles.ampmBtn,
                        proposedAmPm === 'AM' && styles.ampmBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ampmText,
                          { fontFamily: typography.fonts.bold },
                          proposedAmPm === 'AM' && styles.ampmTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setProposedAmPm('PM')}
                      style={[
                        styles.ampmBtn,
                        proposedAmPm === 'PM' && styles.ampmBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ampmText,
                          { fontFamily: typography.fonts.bold },
                          proposedAmPm === 'PM' && styles.ampmTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Reason Text Area */}
                <Text style={[styles.inputLabel, { fontFamily: typography.fonts.bold, marginTop: 16 }]}>
                  Reason for Correction
                </Text>
                <TextInput
                  style={[styles.reasonTextarea, { fontFamily: typography.fonts.medium }]}
                  multiline={true}
                  numberOfLines={4}
                  placeholder="Provide a reason for approval..."
                  placeholderTextColor="#94A3B8"
                  value={reason}
                  onChangeText={setReason}
                />

                {/* Inline Error Message */}
                {inlineError && (
                  <View style={styles.inlineErrorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={[styles.inlineErrorText, { fontFamily: typography.fonts.semibold }]}>
                      {inlineError}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.modalActionsRow}>
                  <Pressable
                    onPress={() => setIsCorrectionModalOpen(false)}
                    style={styles.cancelBtn}
                    disabled={isSubmittingRequest}
                  >
                    <Text style={[styles.cancelBtnText, { fontFamily: typography.fonts.semibold }]}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitCorrection}
                    style={[styles.submitBtn, { backgroundColor: '#3F51B5' }]}
                    disabled={isSubmittingRequest}
                  >
                    {isSubmittingRequest ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.submitBtnText, { fontFamily: typography.fonts.bold }]}>
                        {editingRequestId ? 'Update' : 'Submit'} Request
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Correction Requests History Modal ─── */}
      <Modal
        visible={isHistoryModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsHistoryModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { maxHeight: '80%', padding: 24 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: typography.fonts.bold }]}>
                Correction Requests
              </Text>
              <Pressable onPress={() => setIsHistoryModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            {/* Inline History Action Alert */}
            {historyAlert && (
              <View
                style={[
                  styles.inlineErrorBanner,
                  {
                    backgroundColor: historyAlert.type === 'success' ? '#ECFDF5' : '#FFF5F5',
                    borderColor: historyAlert.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                    marginBottom: 12,
                  },
                ]}
              >
                <Ionicons
                  name={historyAlert.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={historyAlert.type === 'success' ? '#10B981' : '#EF4444'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.inlineErrorText,
                    {
                      color: historyAlert.type === 'success' ? '#10B981' : '#EF4444',
                      fontFamily: typography.fonts.semibold,
                    },
                  ]}
                >
                  {historyAlert.message}
                </Text>
              </View>
            )}

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="git-pull-request-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#64748B', fontFamily: typography.fonts.medium }}>No requests submitted for this date yet.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
                renderItem={({ item }) => {
                  const isApproved = item.status === 'Approved';
                  const isPending = item.status === 'Pending';
                  return (
                    <View style={styles.requestHistoryCard}>
                      <View style={styles.requestHistoryHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name={item.type === 'In' ? 'enter-outline' : 'exit-outline'}
                            size={16}
                            color="#3F51B5"
                          />
                          <Text style={[styles.requestHistoryType, { fontFamily: typography.fonts.bold }]}>
                            Punch {item.type}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isApproved ? '#ECFDF5' : isPending ? '#FFFBEB' : '#FFF5F5',
                              borderColor: isApproved ? '#D1FAE5' : isPending ? '#FEF3C7' : '#FEE2E2',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: isApproved ? '#10B981' : isPending ? '#D97706' : '#EF4444',
                                fontFamily: typography.fonts.bold,
                              },
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ marginTop: 8, gap: 4 }}>
                        <Text style={[styles.requestHistoryDetail, { fontFamily: typography.fonts.medium }]}>
                          Date: <Text style={{ fontFamily: typography.fonts.semibold, color: '#0F172A' }}>{dayjs(item.date).format('MMM DD, YYYY')}</Text>
                        </Text>
                        <Text style={[styles.requestHistoryDetail, { fontFamily: typography.fonts.medium }]}>
                          Proposed Time: <Text style={{ fontFamily: typography.fonts.semibold, color: '#3F51B5' }}>{item.proposedTime}</Text>
                        </Text>
                        <Text style={[styles.requestHistoryDetail, { fontFamily: typography.fonts.medium }]} numberOfLines={2}>
                          Reason: <Text style={{ color: '#64748B', fontStyle: 'italic' }}>"{item.reason}"</Text>
                        </Text>
                      </View>

                      {isPending && (
                        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end', marginTop: 8 }}>
                          <Pressable
                            onPress={() => handleEditRequest(item)}
                            style={styles.editRequestBtn}
                          >
                            <Ionicons name="create-outline" size={14} color="#3F51B5" style={{ marginRight: 4 }} />
                            <Text style={[styles.editRequestBtnText, { fontFamily: typography.fonts.bold }]}>Edit</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleWithdrawClick(item.id)}
                            style={styles.withdrawBtn}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                            <Text style={[styles.withdrawBtnText, { fontFamily: typography.fonts.bold }]}>Withdraw</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}

            <Pressable
              onPress={() => setIsHistoryModalOpen(false)}
              style={[styles.submitBtn, { backgroundColor: '#3F51B5', width: '100%', marginTop: 16 }]}
            >
              <Text style={[styles.submitBtnText, { fontFamily: typography.fonts.bold }]}>
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Withdraw Confirmation Modal ─── */}
      <Modal
        visible={confirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setConfirmVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { width: '85%', alignItems: 'center', padding: 24, position: 'relative' }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Pressable
              onPress={() => setConfirmVisible(false)}
              style={{ position: 'absolute', top: 12, right: 12, padding: 6 }}
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </Pressable>

            <View style={[styles.alertIconCircle, { backgroundColor: '#FFF5F5', marginBottom: 16 }]}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.alertTitleText, { fontFamily: typography.fonts.bold, fontSize: 16, marginBottom: 8 }]}>
              Withdraw Request?
            </Text>
            <Text style={[styles.alertMessageText, { fontFamily: typography.fonts.medium, color: '#64748B', lineHeight: 18, textAlign: 'center', marginBottom: 20 }]}>
              Are you sure you want to withdraw this punch correction request? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                style={[styles.cancelBtn, { flex: 1 }]}
              >
                <Text style={[styles.cancelBtnText, { fontFamily: typography.fonts.semibold, color: '#64748B' }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmWithdraw}
                style={[styles.submitBtn, { backgroundColor: '#EF4444', flex: 1 }]}
              >
                <Text style={[styles.submitBtnText, { fontFamily: typography.fonts.bold, color: '#FFFFFF' }]}>
                  Withdraw
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  title: {
    fontSize: 18,
    color: '#0F172A',
    flex: 1,
    marginLeft: 12,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 6,
  },
  monthCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavArrow: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  monthTitleWrapper: {
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 16,
    color: '#0F172A',
  },
  monthSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    elevation: 0,
    shadowColor: 'transparent',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    color: '#0F172A',
  },
  statUnit: {
    fontSize: 11,
    color: '#64748B',
  },
  calendarCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#0F172A',
  },
  weekHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  weekHeaderText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
  },
  calendarGridSkeleton: {
    marginVertical: 10,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    justifyContent: 'flex-start',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNumberText: {
    fontSize: 13,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },
  legendContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
  },
  detailedLogsHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  centerFeedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logCard: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  logCardDateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBubble: {
    width: 42,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EEF2FF', // soft blue/indigo bubble matching image 3
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBubbleDay: {
    fontSize: 8,
    color: '#4F46E5',
    fontWeight: '800',
  },
  dateBubbleNum: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 1,
  },
  dateLabelGroup: {
    justifyContent: 'center',
  },
  logDateVal: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  statusLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    fontSize: 9,
  },
  durationCol: {
    alignItems: 'flex-end',
  },
  durationVal: {
    fontSize: 16,
    color: '#4F46E5', // bold blue duration matching image 3
  },
  durationLabel: {
    fontSize: 8,
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  punchDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  punchDetailsBox: {
    flex: 1,
    backgroundColor: '#F1F5F9', // soft gray inner box background matching image 3
    borderRadius: 16,
    padding: 12,
    borderWidth: 0,
  },
  punchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  punchTitle: {
    fontSize: 8,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  punchTimeText: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  punchStatusSubtitle: {
    fontSize: 9,
  },
  correctionTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  correctionTriggerText: {
    fontSize: 13,
  },
  requestCountBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  locationDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  locationText: {
    fontSize: 10,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  modalDateText: {
    fontSize: 12,
    color: '#4F46E5',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 13,
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#3F51B5',
  },
  inputLabel: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputWrapper: {
    alignItems: 'center',
    width: 60,
  },
  timeInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
    color: '#0F172A',
  },
  timeInputSub: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '800',
  },
  timeColon: {
    fontSize: 24,
    color: '#94A3B8',
    paddingBottom: 16,
  },
  ampmToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    height: 48,
    alignItems: 'center',
    marginLeft: 12,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  ampmBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  ampmText: {
    fontSize: 13,
    color: '#64748B',
  },
  ampmTextActive: {
    color: '#3F51B5',
  },
  reasonTextarea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  alertIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitleText: {
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
  },
  alertMessageText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },
  requestHistoryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  requestHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestHistoryType: {
    fontSize: 14,
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
  },
  requestHistoryDetail: {
    fontSize: 11,
    color: '#64748B',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  withdrawBtnText: {
    color: '#EF4444',
    fontSize: 11,
  },
  editRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  editRequestBtnText: {
    color: '#3F51B5',
    fontSize: 11,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
});
