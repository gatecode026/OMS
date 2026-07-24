/**
 * @file index.ts
 * @description Type definitions for the Attendance feature module.
 */

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  companyId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  punchIn?: string;
  punchOut?: string;
  totalHours?: number;
  breakTime?: string;
  source?: string;
  workMode?: string;
  overtime?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  breaks?: {
    breakType?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  }[];
}

export interface ClockInPayload {
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ClockOutPayload {
  notes?: string;
}
