import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export const useMyAttendance = (filters = {}) => {
  const { currentUser, token } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState({
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    avgHours: 0,
    totalWorkingDays: 22
  });
  const [records, setRecords] = useState([]);

  const { from, to, month } = filters;

  const fetchMyAttendanceData = useCallback(async () => {
    if (!currentUser || !currentUser.id || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // 1. Fetch range-filtered records
      let recordsData = [];
      try {
        const fromVal = from || '';
        const toVal = to || '';
        const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance?employeeId=${currentUser.id}&from=${fromVal}&to=${toVal}`, { headers });
        const json = await res.json();
        if (json.status === 'success') {
          recordsData = json.data || [];
        }
      } catch (err) {
        console.error('Failed fetching attendance list:', err);
      }

      // 2. Fetch today's record (with fallback)
      let todayData = null;
      try {
        const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance/today?employeeId=${currentUser.id}`, { headers });
        if (res.status === 404) throw new Error('Endpoint not found');
        const json = await res.json();
        if (json.status === 'success') {
          todayData = json.data;
        }
      } catch (err) {
        // Fallback: search locally in recordsData or today's Date
        const todayStr = new Date().toISOString().split('T')[0];
        todayData = recordsData.find(r => r.date === todayStr) || null;
      }

      // 3. Fetch summary stats (with fallback)
      let summaryData = null;
      try {
        const monthVal = month || new Date().toISOString().substring(0, 7); // YYYY-MM
        const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance/summary?employeeId=${currentUser.id}&month=${monthVal}`, { headers });
        if (res.status === 404) throw new Error('Endpoint not found');
        const json = await res.json();
        if (json.status === 'success') {
          summaryData = json.data;
        }
      } catch (err) {
        // Fallback: calculate from recordsData
        const present = recordsData.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'WFH').length;
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
          totalWorkingDays: 22
        };
      }

      setRecords(recordsData);
      setTodayRecord(todayData);
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err.message || 'An error occurred fetching attendance data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, token, from, to, month]);

  useEffect(() => {
    fetchMyAttendanceData();
  }, [fetchMyAttendanceData]);

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
