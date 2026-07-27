/**
 * @file useCallTimer.ts
 * @description Dedicated hook for live call duration tracking in OMS Enterprise Calling module.
 *              Computes formatted timer (HH:MM:SS or MM:SS) and live elapsed seconds.
 */

import { useState, useEffect } from 'react';

export interface UseCallTimerResult {
  seconds: number;
  formattedTimer: string;
  resetTimer: () => void;
}

export const useCallTimer = (startedAt?: number | string | null, isRunning: boolean = true): UseCallTimerResult => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      setSeconds(0);
      return;
    }

    // Calculate initial offset if startedAt is provided
    let initialSecs = 0;
    if (startedAt) {
      const startTime = new Date(startedAt).getTime();
      if (!isNaN(startTime) && startTime > 0) {
        initialSecs = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      }
    }
    setSeconds(initialSecs);

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, isRunning]);

  const resetTimer = () => setSeconds(0);

  const formatTimer = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  return {
    seconds,
    formattedTimer: formatTimer(seconds),
    resetTimer,
  };
};

export default useCallTimer;
