import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Returns the number of working days in a given 'YYYY-MM' month string,
 * taking the weekendPolicy into account.
 *   'Sunday Only'          → only Sundays are non-working
 *   'Friday & Saturday'    → Fridays + Saturdays are non-working
 *   anything else          → Saturdays + Sundays are non-working (default)
 */
const calcWorkingDays = (monthStr, weekendPolicy) => {
  const [year, monthNum] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  let weekendDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, monthNum - 1, d).getDay(); // 0=Sun, 6=Sat, 5=Fri
    if (weekendPolicy === 'Sunday Only') {
      if (dayOfWeek === 0) weekendDays++;
    } else if (weekendPolicy === 'Friday & Saturday') {
      if (dayOfWeek === 5 || dayOfWeek === 6) weekendDays++;
    } else {
      // Default: 'Saturday & Sunday'
      if (dayOfWeek === 0 || dayOfWeek === 6) weekendDays++;
    }
  }
  return daysInMonth - weekendDays;
};

export const useMyAttendance = (filters = {}) => {
  const { currentUser, token, payrollRules } = useApp();
  const userId = currentUser?.id || '';
  const weekendPolicy = payrollRules?.weekendPolicy || 'Saturday & Sunday';

  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // Always compute the correct working days using the live weekendPolicy from global context
  const correctWorkingDays = useMemo(
    () => calcWorkingDays(currentMonthStr, weekendPolicy),
    [currentMonthStr, weekendPolicy]
  );

  const getSwrCache = useCallback(() => {
    if (!userId) return null;
    try {
      const saved = localStorage.getItem(`swr_my_attendance_${userId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, [userId]);

  const initialCache = getSwrCache();

  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState(null);
  const [todayRecord, setTodayRecord] = useState(initialCache?.todayRecord || null);
  const [summary, setSummary] = useState(() => {
    // Even if we have a cached summary, always correct the working days
    if (initialCache?.summary) {
      return { ...initialCache.summary, totalWorkingDays: calcWorkingDays(currentMonthStr, weekendPolicy) };
    }
    return {
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      avgHours: 0,
      totalWorkingDays: calcWorkingDays(currentMonthStr, weekendPolicy)
    };
  });
  const [records, setRecords] = useState(initialCache?.records || []);

  const { from, to, month } = filters;

  const fetchMyAttendanceData = useCallback(async () => {
    if (!currentUser || !currentUser.id || !token) {
      setLoading(false);
      return;
    }

    const cache = getSwrCache();
    if (!cache) {
      setLoading(true);
    }
    setError(null);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const fromVal = from || '';
    const toVal = to || '';
    const monthVal = month || new Date().toISOString().substring(0, 7);

    const workingDaysForMonth = calcWorkingDays(monthVal, weekendPolicy);

    try {
      const [recordsRes, todayRes, summaryRes] = await Promise.allSettled([
        fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance?employeeId=${currentUser.id}&from=${fromVal}&to=${toVal}`, { headers }),
        fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance/today?employeeId=${currentUser.id}`, { headers }),
        fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance/summary?employeeId=${currentUser.id}&month=${monthVal}&weekendPolicy=${encodeURIComponent(weekendPolicy)}`, { headers })
      ]);

      let recordsData = [];
      if (recordsRes.status === 'fulfilled' && recordsRes.value.ok) {
        const json = await recordsRes.value.json();
        if (json.status === 'success') recordsData = json.data || [];
      }

      let todayData = null;
      if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
        const json = await todayRes.value.json();
        if (json.status === 'success') todayData = json.data;
      }
      if (!todayData) {
        const todayStr = new Date().toISOString().split('T')[0];
        todayData = recordsData.find(r => r.date === todayStr) || null;
      }

      let summaryData = null;
      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        const json = await summaryRes.value.json();
        if (json.status === 'success') summaryData = json.data;
      }

      if (!summaryData) {
        // Client-side fallback: compute working days using the weekendPolicy
        const present = recordsData.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'WFH' || r.status === 'Late').length;
        const absent = recordsData.filter(r => r.status === 'Absent').length;
        const late = recordsData.filter(r => r.status === 'Late').length;
        const hoursRecords = recordsData.filter(r => r.totalHours > 0);
        const avg = hoursRecords.length > 0
          ? parseFloat((hoursRecords.reduce((sum, r) => sum + r.totalHours, 0) / hoursRecords.length).toFixed(1))
          : 0;

        summaryData = {
          presentDays: present,
          absentDays: absent,
          lateDays: late,
          avgHours: avg,
          totalWorkingDays: workingDaysForMonth
        };
      } else {
        // Always override totalWorkingDays with the client-computed value
        // so the weekendPolicy setting is always respected
        summaryData = { ...summaryData, totalWorkingDays: workingDaysForMonth };
      }

      setRecords(recordsData);
      setTodayRecord(todayData);
      setSummary(summaryData);

      if (userId) {
        localStorage.setItem(`swr_my_attendance_${userId}`, JSON.stringify({
          records: recordsData,
          todayRecord: todayData,
          summary: summaryData
        }));
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, token, from, to, month, userId, weekendPolicy, getSwrCache]);

  useEffect(() => {
    fetchMyAttendanceData();
  }, [fetchMyAttendanceData]);

  // Whenever weekendPolicy changes, re-correct the working days in the current summary
  useEffect(() => {
    setSummary(prev => ({ ...prev, totalWorkingDays: correctWorkingDays }));
  }, [correctWorkingDays]);

  return {
    loading,
    error,
    todayRecord,
    summary,
    records,
    refetch: fetchMyAttendanceData
  };
};

export default useMyAttendance;
