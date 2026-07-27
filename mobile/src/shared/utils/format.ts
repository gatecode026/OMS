/**
 * @file format.ts
 * @description Central formatting helpers (currency, date, time).
 */

export const formatINR = (value: number | string | undefined | null) => {
  if (value === undefined || value === null) return '₹0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    return '₹' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

/**
 * Single source of truth time formatter for Attendance Correction forms.
 * Accepts: "18:00:00", "18:00", "06:00 PM", "2026-07-24T18:00:00Z", "--:--", null, undefined.
 * Returns: "06:00 PM" if valid, or "--:--" if empty/missing.
 */
export const formatAttendanceTime = (rawTime?: string | null): string => {
  if (!rawTime || rawTime === '--:--' || rawTime === 'null' || rawTime === 'undefined') {
    return '--:--';
  }

  const trimmed = String(rawTime).trim();
  if (!trimmed || trimmed === '--:--') return '--:--';

  // Case 1: ISO Date String e.g. "2026-07-24T18:00:00Z"
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }

  // Case 2: 12-hour format e.g. "06:00 PM" or "6:00 AM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    const hh = String(parseInt(match12[1], 10)).padStart(2, '0');
    const mm = match12[2];
    const ampm = match12[3].toUpperCase();
    return `${hh}:${mm} ${ampm}`;
  }

  // Case 3: 24-hour format e.g. "18:00:00" or "18:00" or "09:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    if (!isNaN(hours) && hours >= 0 && hours <= 23) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }

  return '--:--';
};

/**
 * Converts any valid time format ("10:10 AM", "06:00 PM", "18:00:00", "--:--")
 * into clean 24-hour HH:MM format ("10:10", "18:00", "--:--") expected by backend schemas.
 */
export const to24hAttendanceTime = (rawTime?: string | null): string => {
  if (!rawTime || rawTime === '--:--' || rawTime === 'null' || rawTime === 'undefined') {
    return '--:--';
  }

  const trimmed = String(rawTime).trim();
  if (!trimmed || trimmed === '--:--') return '--:--';

  // Case 1: 12-hour format e.g. "10:10 AM" or "06:00 PM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    let hh = parseInt(match12[1], 10);
    const mm = match12[2];
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }

  // Case 2: 24-hour format e.g. "18:00:00" or "18:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hh = String(parseInt(match24[1], 10)).padStart(2, '0');
    const mm = match24[2];
    return `${hh}:${mm}`;
  }

  return '--:--';
};
