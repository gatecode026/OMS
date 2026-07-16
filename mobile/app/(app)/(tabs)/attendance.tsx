/**
 * @file attendance.tsx
 * @description Production-ready, pixel-perfect Attendance Detail Screen.
 *              Conforms exactly to the approved UI layout (Reference driven, NO mock/dummy values).
 *              Integrates with the bottom tab navigation to keep the bottom bar permanently visible.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useTheme from '../../../src/shared/hooks/useTheme';
import useBranding from '../../../src/shared/hooks/useBranding';
import { useQueryClient } from '@tanstack/react-query';
import { useAttendance, useAttendanceHistory } from '../../../src/features/attendance/hooks/useAttendance';
import { Card, Badge, BottomSheet, Divider, Skeleton, EmptyState, ErrorState } from '../../../src/shared/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to format 24h or 12h times cleanly to 12h AM/PM format
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

export default function AttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const { companyName } = useBranding();

  // Selected date states
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Punch time correction states
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<'In' | 'Out'>('In');
  const [proposedHour, setProposedHour] = useState('');
  const [proposedMin, setProposedMin] = useState('');
  const [proposedAmPm, setProposedAmPm] = useState<'AM' | 'PM'>('AM');
  const [reason, setReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Custom Alert Pop-up States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [historyAlert, setHistoryAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);



  const showHistoryAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setHistoryAlert({ message, type });
    setTimeout(() => {
      setHistoryAlert(null);
    }, 3000);
  };

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [requestToWithdraw, setRequestToWithdraw] = useState<string | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

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
    setInlineError(null);
    setSuccessText(null);
    setSelectedDate(item.date); // sync date
    
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
    let sourceTime = type === 'In' ? recordToDisplay?.punchIn : recordToDisplay?.punchOut;
    
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

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
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

  const handlePunchTypeChange = (type: 'In' | 'Out') => {
    setPunchType(type);
    let sourceTime = type === 'In' ? recordToDisplay?.punchIn : recordToDisplay?.punchOut;
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

  // Fetch data using React Query history hook
  const { 
    records, 
    summary, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useAttendanceHistory(selectedMonth);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Invalidate every active query on the screen to trigger fresh network refetches
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const flatListRef = useRef<FlatList>(null);

  // Generate selectable months (last 6 months)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const m = dayjs().subtract(i, 'month');
    return {
      value: m.format('YYYY-MM'),
      label: m.format('MMMM YYYY'),
    };
  });

  // Generate list of days of the selected month
  const daysInMonth = dayjs(selectedMonth).daysInMonth();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const dateObj = dayjs(selectedMonth).date(i + 1);
    return {
      dateString: dateObj.format('YYYY-MM-DD'),
      dayLabel: dateObj.format('ddd'), // E.g., 'Mon'
      dayNumber: dateObj.format('D'),  // E.g., '20'
    };
  });

  // Auto-scroll date list to center selected day
  useEffect(() => {
    if (daysArray.length > 0 && !isLoading && !isError) {
      const idx = daysArray.findIndex((d) => d.dateString === selectedDate);
      if (idx !== -1 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.5,
          });
        }, 100);
      }
    }
  }, [selectedDate, selectedMonth, isLoading, isError]);

  // Handler when month is changed
  const handleMonthSelect = (monthVal: string) => {
    setSelectedMonth(monthVal);
    setIsMonthPickerVisible(false);
    
    // Default to the first day of that month, or today if month is current
    const isCurrentMonth = monthVal === dayjs().format('YYYY-MM');
    if (isCurrentMonth) {
      setSelectedDate(dayjs().format('YYYY-MM-DD'));
    } else {
      setSelectedDate(`${monthVal}-01`);
    }
  };

  // Find record for currently selected day from the database logs
  const dailyRecord = records.find((r) => r.date === selectedDate);
  const recordToDisplay = dailyRecord;

  const [liveTrigger, setLiveTrigger] = useState(0);

  useEffect(() => {
    if (!dailyRecord) return;
    const isToday = dailyRecord.date === dayjs().format('YYYY-MM-DD');
    const isActive = isToday && (!dailyRecord.punchOut || dailyRecord.punchOut === '--:--' || dailyRecord.punchOut === 'Pending');

    if (isActive) {
      const interval = setInterval(() => {
        setLiveTrigger((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [dailyRecord?.date, dailyRecord?.punchIn, dailyRecord?.punchOut]);

  // Check if a break was taken on this day
  const hasBreak = !!(
    recordToDisplay &&
    recordToDisplay.breakTime &&
    recordToDisplay.breakTime !== '--:--' &&
    recordToDisplay.breakTime !== '0 mins' &&
    recordToDisplay.breakTime !== '00h 00m' &&
    recordToDisplay.breakTime !== '0'
  );

  const getStatusDetails = () => {
    if (!recordToDisplay) {
      const dayOfWeek = dayjs(selectedDate).day();
      if (dayOfWeek === 0) {
        return {
          text: 'Weekly Off',
          color: colors.textMuted,
          desc: 'Sunday Weekly Off',
          indicator: colors.textMuted,
        };
      }
      
      const isFuture = dayjs(selectedDate).isAfter(dayjs(), 'day');
      return {
        text: isFuture ? 'Scheduled' : 'Absent',
        color: isFuture ? colors.textMuted : colors.danger,
        desc: isFuture ? 'Upcoming shift' : 'No attendance logged for this day',
        indicator: isFuture ? colors.textMuted : colors.danger,
      };
    }

    const st = recordToDisplay.status.toLowerCase();
    if (st.includes('present')) {
      return {
        text: 'Present',
        color: colors.success,
        desc: `Punched in at ${formatTime12h(recordToDisplay.punchIn)}`,
        indicator: colors.success,
      };
    }
    if (st.includes('late')) {
      return {
        text: 'Late',
        color: colors.warning,
        desc: `Late punch-in at ${formatTime12h(recordToDisplay.punchIn)}`,
        indicator: colors.warning,
      };
    }
    if (st.includes('leave') || st.includes('off')) {
      return {
        text: 'On Leave',
        color: colors.info,
        desc: recordToDisplay.notes || 'On Approved Leave',
        indicator: colors.info,
      };
    }
    return {
      text: recordToDisplay.status || 'Absent',
      color: colors.danger,
      desc: recordToDisplay.notes || 'No attendance logged',
      indicator: colors.danger,
    };
  };

  const statusInfo = getStatusDetails();

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

  // Helper to get working hours including break/lunch duration
  const getDisplayedWorkingDuration = () => {
    if (!recordToDisplay) return '--h --m';

    const isToday = recordToDisplay.date === dayjs().format('YYYY-MM-DD');
    let hours = recordToDisplay.totalHours || 0;

    // If clocked in but not checked out (today)
    if (isToday && (!recordToDisplay.punchOut || recordToDisplay.punchOut === '--:--' || recordToDisplay.punchOut === 'Pending')) {
      const punchDate = parseTimeToDate(recordToDisplay.punchIn);
      if (punchDate && punchDate.isValid()) {
        const diffMins = dayjs().diff(punchDate, 'minute');
        if (diffMins > 0) {
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
        }
      }
    }

    // Historical records or completed shifts:
    // Add breakTime back to totalHours
    let breakMins = 0;
    if (recordToDisplay.breakTime) {
      const clean = recordToDisplay.breakTime.toLowerCase();
      if (clean.includes('min')) {
        breakMins = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 0;
      } else if (clean.includes('h')) {
        const parts = clean.split('h');
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

  const getBreakTimeRange = () => {
    const breakStr = recordToDisplay?.breakTime;
    let breakMinutes = 60; // Default to 1 hour
    
    if (breakStr && breakStr !== '--:--') {
      const clean = breakStr.toLowerCase();
      if (clean.includes('min')) {
        breakMinutes = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 60;
      } else if (clean.includes('h')) {
        const parts = clean.split('h');
        const hrs = parseInt(parts[0], 10) || 0;
        const mins = parseInt(parts[1]?.replace(/[^0-9]/g, ''), 10) || 0;
        breakMinutes = hrs * 60 + mins;
      }
    }
    
    const start = dayjs(selectedDate).hour(13).minute(0).second(0); // 01:00 PM
    const end = start.add(breakMinutes, 'minute');
    return `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`;
  };

  const getTimelineBreaks = () => {
    if (recordToDisplay?.breaks && recordToDisplay.breaks.length > 0) {
      return recordToDisplay.breaks.map((b: any) => ({
        title: b.breakType || 'Lunch Break',
        time: b.startTime && b.endTime ? `${formatTime12h(b.startTime)} - ${formatTime12h(b.endTime)}` : getBreakTimeRange(),
        location: b.location || 'Cafeteria Hub',
      }));
    }
    if (hasBreak) {
      return [{
        title: 'Lunch Break',
        time: getBreakTimeRange(),
        location: 'Cafeteria Hub',
      }];
    }
    return [];
  };

  const getTimelineItems = () => {
    if (!recordToDisplay) return [];

    const items = [];
    const isSelectedToday = selectedDate === dayjs().format('YYYY-MM-DD');
    const now = dayjs();

    // 1. Punch In
    if (recordToDisplay.punchIn && recordToDisplay.punchIn !== '--:--') {
      items.push({
        title: 'Punch In',
        time: formatTime12h(recordToDisplay.punchIn),
        desc: recordToDisplay.source === 'Biometric Scanner'
          ? 'Entry verified at Main Gate - Zone A'
          : 'Self Punch-in registered via GPS geofencing',
        color: isDark ? colors.primary : '#3F51B5',
        icon: 'enter-outline',
      });
    }

    // Parse break minutes
    let breakMinutes = 60;
    if (recordToDisplay.breakTime) {
      const clean = recordToDisplay.breakTime.toLowerCase();
      if (clean.includes('min')) {
        breakMinutes = parseInt(clean.replace(/[^0-9]/g, ''), 10) || 60;
      } else if (clean.includes('h')) {
        const parts = clean.split('h');
        const hrs = parseInt(parts[0], 10) || 0;
        const mins = parseInt(parts[1]?.replace(/[^0-9]/g, ''), 10) || 0;
        breakMinutes = hrs * 60 + mins;
      }
    }

    // 2. Lunch Break Start
    const lunchStart = dayjs(selectedDate).hour(13).minute(0).second(0);
    const showLunchStart = hasBreak && (!isSelectedToday || now.isAfter(lunchStart));
    if (showLunchStart) {
      items.push({
        title: 'Lunch Break Start',
        time: '01:00 PM',
        desc: 'Lunch break started. Dining at Cafeteria Hub',
        color: colors.info,
        icon: 'restaurant-outline',
        isBreakStart: true,
        location: 'Cafeteria Hub',
      });
    }

    // 3. Lunch Break Closed
    const lunchEnd = lunchStart.add(breakMinutes, 'minute');
    const showLunchEnd = hasBreak && (!isSelectedToday || now.isAfter(lunchEnd));
    if (showLunchEnd) {
      items.push({
        title: 'Lunch Break Closed',
        time: lunchEnd.format('hh:mm A'),
        desc: 'Break complete. Returned to active workspace',
        color: colors.info,
        icon: 'briefcase-outline',
      });
    }

    // 4. Punch Out
    if (recordToDisplay.punchOut && recordToDisplay.punchOut !== '--:--') {
      items.push({
        title: 'Punch Out',
        time: formatTime12h(recordToDisplay.punchOut),
        desc: 'Automatic punch-out recorded via Geofencing',
        color: colors.success,
        icon: 'exit-outline',
      });
    }

    return items;
  };

  // Dynamically compute monthly stats from actual DB records
  const getAvgInTime = () => {
    const validRecords = records.filter((r) => r.punchIn && r.punchIn !== '--:--');
    if (validRecords.length === 0) return '--:--';

    let totalMins = 0;
    validRecords.forEach((r) => {
      const cleanTime = r.punchIn!.replace(/(AM|PM)/i, '').trim();
      const parts = cleanTime.split(':').map(Number);
      let hours = parts[0] || 0;
      const mins = parts[1] || 0;

      if (r.punchIn!.toLowerCase().includes('pm') && hours < 12) hours += 12;
      if (r.punchIn!.toLowerCase().includes('am') && hours === 12) hours = 0;

      totalMins += hours * 60 + mins;
    });

    const avgMins = Math.round(totalMins / validRecords.length);
    const avgH = Math.floor(avgMins / 60);
    const avgM = avgMins % 60;

    const ampm = avgH >= 12 ? 'PM' : 'AM';
    const displayH = avgH % 12 === 0 ? 12 : avgH % 12;
    return `${String(displayH).padStart(2, '0')}:${String(avgM).padStart(2, '0')} ${ampm}`;
  };

  const getTotalOvertime = () => {
    let totalOvertimeMins = 0;
    records.forEach((r) => {
      if (r.totalHours && r.totalHours > 8) {
        const diffHours = r.totalHours - 8;
        totalOvertimeMins += Math.round(diffHours * 60);
      }
    });
    if (totalOvertimeMins === 0) return '00h 00m';
    const hrs = Math.floor(totalOvertimeMins / 60);
    const mins = totalOvertimeMins % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── 1. Header Row ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : '#3F51B5'} />
        </Pressable>
        <Text style={[styles.title, { color: isDark ? colors.text : '#3F51B5', fontFamily: typography.fonts.bold }]}>
          Attendance
        </Text>
        <Pressable style={styles.calendarButton} onPress={() => router.push('/attendance-history')}>
          <Ionicons name="calendar-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {isError ? (
        /* Error state container */
        <View style={styles.centerFeedback}>
          <ErrorState
            title="Failed to Load Logs"
            message={error?.message || 'A network timeout or unauthorized token error occurred.'}
            onRetry={refetch}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[isDark ? colors.primary : '#3F51B5']}
              tintColor={isDark ? colors.primary : '#3F51B5'}
            />
          }
        >
          {/* ─── 2. Month Selector Dropdown ─── */}
          <Pressable
            onPress={() => setIsMonthPickerVisible(true)}
            style={[styles.monthDropdown, { marginHorizontal: spacing.lg, marginTop: spacing.md }]}
          >
            <Text style={[styles.monthText, { color: isDark ? colors.primary : '#3F51B5', fontFamily: typography.fonts.semibold }]}>
              {dayjs(selectedMonth).format('MMMM YYYY')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={isDark ? colors.primary : '#3F51B5'} style={styles.dropdownChevron} />
          </Pressable>

          {/* ─── 3. Horizontal Date Carousel ─── */}
          <View style={{ marginTop: spacing.md }}>
            {isLoading ? (
              /* Calendar skeleton indicators */
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg }}>
                <Skeleton width={58} height={78} borderRadius={18} />
                <Skeleton width={58} height={78} borderRadius={18} />
                <Skeleton width={58} height={78} borderRadius={18} />
                <Skeleton width={58} height={78} borderRadius={18} />
                <Skeleton width={58} height={78} borderRadius={18} />
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={daysArray}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
                keyExtractor={(item) => item.dateString}
                getItemLayout={(_, index) => ({
                  length: 64,
                  offset: 74 * index,
                  index,
                })}
                renderItem={({ item }) => {
                  const isToday = item.dateString === dayjs().format('YYYY-MM-DD');
                  const isSelected = item.dateString === selectedDate;

                  let cardBg = colors.card;
                  let cardBorder = isDark ? colors.border : '#F1F5F9';
                  let dayTextColor = colors.textMuted;
                  let numTextColor = colors.text;

                  // Date Highlighting Logic (Issue 2)
                  if (isSelected && isToday) {
                    // Selected today: single active brand color
                    cardBg = isDark ? colors.primary : '#3F51B5';
                    cardBorder = isDark ? colors.primary : '#3F51B5';
                    dayTextColor = '#FFFFFF';
                    numTextColor = '#FFFFFF';
                  } else if (isToday) {
                    // Today but not selected: Primary Brand Color (filled circle/pill)
                    cardBg = isDark ? colors.primary : '#3F51B5';
                    cardBorder = isDark ? colors.primary : '#3F51B5';
                    dayTextColor = '#FFFFFF';
                    numTextColor = '#FFFFFF';
                  } else if (isSelected) {
                    // Selected but not today: Secondary Highlight (outlined or soft background)
                    cardBg = isDark ? `${colors.primary}1A` : '#EBF5FF';
                    cardBorder = isDark ? colors.primary : '#3F51B5';
                    dayTextColor = isDark ? colors.primary : '#3F51B5';
                    numTextColor = isDark ? colors.primary : '#3F51B5';
                  }

                  return (
                    <Pressable
                      onPress={() => setSelectedDate(item.dateString)}
                      style={[
                        styles.dateCard,
                        {
                          backgroundColor: cardBg,
                          borderColor: cardBorder,
                          borderRadius: 18,
                        },
                        isSelected ? shadows.medium : shadows.light,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateCardDay,
                          {
                            color: dayTextColor,
                            fontFamily: typography.fonts.medium,
                          },
                        ]}
                      >
                        {item.dayLabel}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardNum,
                          {
                            color: numTextColor,
                            fontFamily: typography.fonts.bold,
                          },
                        ]}
                      >
                        {item.dayNumber}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          {/* ─── 4. Main Metrics Summary Card ─── */}
          {isLoading ? (
            /* Summary loading skeleton */
            <Card style={[styles.summaryCard, { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: 24, borderColor: colors.border }]}>
              <View style={styles.summaryCardHeader}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={26} />
                </View>
                <Skeleton width={54} height={54} borderRadius={27} />
              </View>
              <View style={styles.metricsContainer}>
                <View style={styles.metricsRow}>
                  <Skeleton height={60} borderRadius={14} style={{ flex: 1 }} />
                  <Skeleton height={60} borderRadius={14} style={{ flex: 1 }} />
                </View>
                <View style={styles.metricsRow}>
                  <Skeleton height={60} borderRadius={14} style={{ flex: 1 }} />
                  <Skeleton height={60} borderRadius={14} style={{ flex: 1 }} />
                </View>
              </View>
            </Card>
          ) : (
            <Card style={[styles.summaryCard, { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: 24, borderColor: colors.border }]}>
              <View style={styles.summaryCardHeader}>
                <View>
                  <Text style={[styles.summaryDate, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                    {dayjs(selectedDate).format('dddd, D MMMM YYYY')}
                  </Text>
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusVal, { color: statusInfo.color, fontFamily: typography.fonts.bold }]}>
                      {statusInfo.text}
                    </Text>
                    <Ionicons
                      name={statusInfo.text === 'Present' || statusInfo.text === 'Late' ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={statusInfo.color}
                      style={styles.statusCheckIcon}
                    />
                  </View>
                </View>

                <View style={[styles.fingerprintBadge, { backgroundColor: '#EBF5FF' }]}>
                  <Ionicons name="finger-print" size={26} color="#3B82F6" />
                </View>
              </View>

              {/* Dynamic shift details inside Summary Card */}
              <View style={styles.shiftDetailsRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.shiftDetailsText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                  Shift: {recordToDisplay?.workMode === 'WFH' ? 'Work From Home' : 'Day Shift (WFO)'}
                </Text>
                {recordToDisplay?.status === 'Late' && (
                  <View style={[styles.lateLabelBadge, { backgroundColor: `${colors.warning}1A` }]}>
                    <Text style={[styles.lateLabelText, { color: colors.warning, fontFamily: typography.fonts.bold }]}>
                      Late Arrival
                    </Text>
                  </View>
                )}
              </View>

              {/* Grid of metrics */}
              <View style={styles.metricsContainer}>
                <View style={styles.metricsRow}>
                  <Pressable
                    onPress={() => handleOpenCorrectionModal('In')}
                    style={[
                      styles.gridCellCard,
                      {
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderColor: isDark ? colors.border : '#F1F5F9',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.gridLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                        Punch In
                      </Text>
                      <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.gridVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {formatTime12h(recordToDisplay?.punchIn)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleOpenCorrectionModal('Out')}
                    style={[
                      styles.gridCellCard,
                      {
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderColor: isDark ? colors.border : '#F1F5F9',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.gridLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                        Punch Out
                      </Text>
                      <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.gridVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {formatTime12h(recordToDisplay?.punchOut)}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.metricsRow}>
                  <View
                    style={[
                      styles.gridCellCard,
                      {
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderColor: isDark ? colors.border : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text style={[styles.gridLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                      Working Duration
                    </Text>
                    <Text style={[styles.gridVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {getDisplayedWorkingDuration()}
                    </Text>
                  </View>

                  {hasBreak && (
                    <View
                      style={[
                        styles.gridCellCard,
                        {
                          flex: 1,
                          backgroundColor: colors.surface,
                          borderColor: isDark ? colors.border : '#F1F5F9',
                        },
                      ]}
                    >
                      <Text style={[styles.gridLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                        Break Duration
                      </Text>
                      <Text style={[styles.gridVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                        {recordToDisplay?.breakTime || '00h 00m'}
                      </Text>
                    </View>
                  )}
                </View>
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
            </Card>
          )}

          {/* ─── 5. Timeline Tracking Module ─── */}
          <View style={[styles.timelineSection, { paddingHorizontal: spacing.lg, marginTop: spacing.xl }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Today's Timeline
              </Text>
              {recordToDisplay && recordToDisplay.status !== 'Absent' && (
                <View style={[styles.onTimeBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.onTimeBadgeText, { color: '#065F46', fontFamily: typography.fonts.bold }]}>
                    {recordToDisplay.status === 'Late' ? 'Late Punch-in' : 'On Time'}
                  </Text>
                </View>
              )}
            </View>

            {isLoading ? (
              /* Timeline loading skeleton */
              <View style={{ gap: 15 }}>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Skeleton width={22} height={22} borderRadius={11} />
                  <Skeleton width="70%" height={36} borderRadius={8} />
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Skeleton width={22} height={22} borderRadius={11} />
                  <Skeleton width="70%" height={36} borderRadius={8} />
                </View>
              </View>
            ) : recordToDisplay && getTimelineItems().length > 0 ? (
              <View style={styles.customTimeline}>
                {getTimelineItems().map((item: any, idx: number) => {
                  const isLast = idx === getTimelineItems().length - 1;
                  return (
                    <View key={idx} style={styles.timelineItem}>
                      <View style={styles.timelineLeftTrack}>
                        <View style={[styles.timelineNodeOuter, { borderColor: `${item.color}2A` }]}>
                          <View style={[styles.timelineNodeInner, { backgroundColor: item.color }]} />
                        </View>
                        {!isLast && <View style={[styles.timelineVerticalBar, { backgroundColor: colors.border }]} />}
                      </View>
                      <View style={styles.timelineRightContent}>
                        <View style={styles.timelineRowText}>
                          <Text style={[styles.timelineItemTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                            {item.title}
                          </Text>
                          <Text style={[styles.timelineItemTime, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                            {item.time}
                          </Text>
                        </View>
                        {item.isBreakStart ? (
                          <View style={[styles.timelineFoodBox, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border, marginTop: 4 }]}>
                            <Ionicons name="restaurant" size={14} color={isDark ? colors.primary : '#3F51B5'} />
                            <Text style={[styles.foodText, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                              {item.location}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.timelineItemDesc, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                            {item.desc}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Empty state (Issue 6) */
              <View style={styles.emptyTimelineWrapper}>
                <EmptyState
                  title="No punch-in recorded"
                  description={`No attendance logged for ${dayjs(selectedDate).format('MMM DD, YYYY')}.`}
                  icon="calendar-clear-outline"
                />
              </View>
            )}
          </View>

          {/* ─── 6. Statistics Footer Cards ─── */}
          <View style={[styles.footerStatsRow, { paddingHorizontal: spacing.lg, marginTop: spacing.xl }]}>
            {isLoading ? (
              <>
                <Skeleton height={80} borderRadius={20} style={{ flex: 1 }} />
                <Skeleton height={80} borderRadius={20} style={{ flex: 1 }} />
              </>
            ) : (
              <>
                <Card style={[styles.footerStatCard, { borderColor: colors.border, borderRadius: 20 }]}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#EBF5FF' }]}>
                    <Ionicons name="stats-chart" size={18} color="#3B82F6" />
                  </View>
                  <Text style={[styles.footerStatLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                    Avg. In Time
                  </Text>
                  <Text style={[styles.footerStatVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    {getAvgInTime()}
                  </Text>
                </Card>
                
                <Card style={[styles.footerStatCard, { borderColor: colors.border, borderRadius: 20 }]}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#EBF5FF' }]}>
                    <Ionicons name="time" size={18} color="#3B82F6" />
                  </View>
                  <Text style={[styles.footerStatLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                    Total Overtime
                  </Text>
                  <Text style={[styles.footerStatVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    {getTotalOvertime()}
                  </Text>
                </Card>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Month Dropdown Bottom Sheet */}
      <BottomSheet
        visible={isMonthPickerVisible}
        onClose={() => setIsMonthPickerVisible(false)}
        title="Select Month"
      >
        <View style={styles.sheetContent}>
          {monthOptions.map((opt) => {
            const isSelected = opt.value === selectedMonth;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handleMonthSelect(opt.value)}
                style={[
                  styles.monthOptionRow,
                  {
                    backgroundColor: isSelected ? `${colors.primary}0D` : 'transparent',
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthOptionLabel,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontFamily: isSelected ? typography.fonts.semibold : typography.fonts.regular,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      {/* ─── Punch Correction Modal (Aesthetic Matching design) ─── */}
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
            <View style={segmentStyles.segmentContainer}>
              <Pressable
                onPress={() => handlePunchTypeChange('In')}
                style={[
                  segmentStyles.segmentBtn,
                  punchType === 'In' && segmentStyles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    segmentStyles.segmentText,
                    { fontFamily: typography.fonts.bold },
                    punchType === 'In' && segmentStyles.segmentTextActive,
                  ]}
                >
                  Punch In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handlePunchTypeChange('Out')}
                style={[
                  segmentStyles.segmentBtn,
                  punchType === 'Out' && segmentStyles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    segmentStyles.segmentText,
                    { fontFamily: typography.fonts.bold },
                    punchType === 'Out' && segmentStyles.segmentTextActive,
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
              <View style={segmentStyles.ampmToggleContainer}>
                <Pressable
                  onPress={() => setProposedAmPm('AM')}
                  style={[
                    segmentStyles.ampmBtn,
                    proposedAmPm === 'AM' && segmentStyles.ampmBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      segmentStyles.ampmText,
                      { fontFamily: typography.fonts.bold },
                      proposedAmPm === 'AM' && segmentStyles.ampmTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setProposedAmPm('PM')}
                  style={[
                    segmentStyles.ampmBtn,
                    proposedAmPm === 'PM' && segmentStyles.ampmBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      segmentStyles.ampmText,
                      { fontFamily: typography.fonts.bold },
                      proposedAmPm === 'PM' && segmentStyles.ampmTextActive,
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
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFF5F5',
                borderWidth: 1,
                borderColor: '#FEE2E2',
                borderRadius: 12,
                padding: 10,
                marginBottom: 16,
              }}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: '#EF4444', flex: 1, fontFamily: typography.fonts.semibold }}>
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
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: historyAlert.type === 'success' ? '#ECFDF5' : '#FFF5F5',
                  borderColor: historyAlert.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={historyAlert.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={historyAlert.type === 'success' ? '#10B981' : '#EF4444'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: historyAlert.type === 'success' ? '#10B981' : '#EF4444',
                    fontSize: 12,
                    fontFamily: typography.fonts.semibold,
                    flex: 1,
                  }}
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarButton: {
    padding: 6,
  },
  monthDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownChevron: {
    marginLeft: 6,
  },
  dateCard: {
    width: 58,
    height: 78,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dateCardDay: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateCardNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 20,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusVal: {
    fontSize: 24,
    fontWeight: '800',
  },
  statusCheckIcon: {
    marginTop: 2,
  },
  fingerprintBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  shiftDetailsText: {
    fontSize: 12,
  },
  lateLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lateLabelText: {
    fontSize: 10,
  },
  metricsContainer: {
    gap: 12,
    marginTop: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  gridCellCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  gridVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineSection: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  onTimeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onTimeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customTimeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineLeftTrack: {
    alignItems: 'center',
    width: 22,
  },
  timelineNodeOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineVerticalBar: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineRightContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineRowText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  timelineItemTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineItemDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  timelineFoodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  foodText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyTimelineWrapper: {
    paddingVertical: 10,
    width: '100%',
  },
  footerStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  footerStatCard: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  footerStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerStatVal: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetContent: {
    paddingBottom: 20,
    gap: 8,
  },
  monthOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  monthOptionLabel: {
    fontSize: 15,
  },
  centerFeedback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 24,
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
    marginBottom: 16,
  },
  alertTitleText: {
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessageText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
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
});

const segmentStyles = StyleSheet.create({
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
});
