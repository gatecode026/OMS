/**
 * @file attendanceApi.ts
 * @description API requests for attendance logging (clock-in, clock-out, status).
 */

import apiClient from '../../../shared/services/apiClient';
import { AttendanceRecord, ClockInPayload, ClockOutPayload } from '../types';

export const attendanceApi = {
  /**
   * Fetch today's check-in record status
   */
  async fetchTodayStatus(): Promise<AttendanceRecord | null> {
    const response = await apiClient.get('/api/v1/attendance/today');
    return response.data?.data || null;
  },

  /**
   * Create an attendance record (Clock In)
   */
  async clockIn(payload: ClockInPayload): Promise<AttendanceRecord> {
    const response = await apiClient.post('/api/v1/attendance', payload);
    return response.data?.data;
  },

  /**
   * Update an attendance record (Clock Out)
   */
  async clockOut(id: string, payload: ClockOutPayload): Promise<AttendanceRecord> {
    const response = await apiClient.put(`/api/v1/attendance/${id}`, payload);
    return response.data?.data;
  },

  /**
   * Fetch attendance records for a specific date range (e.g. current month)
   */
  async fetchMonthRecords(from: string, to: string): Promise<AttendanceRecord[]> {
    const response = await apiClient.get('/api/v1/attendance', {
      params: { from, to }
    });
    return response.data?.data || [];
  },

  /**
   * Fetch monthly attendance summary stats (Present days, avg hours, etc.)
   */
  async fetchSummary(month: string): Promise<{
    presentDays: number;
    absentDays: number;
    lateDays: number;
    avgHours: number;
    totalWorkingDays: number;
  }> {
    const response = await apiClient.get('/api/v1/attendance/summary', {
      params: { month }
    });
    return response.data?.data || {
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      avgHours: 0,
      totalWorkingDays: 22
    };
  },
};

export default attendanceApi;
