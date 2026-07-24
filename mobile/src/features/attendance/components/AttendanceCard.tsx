/**
 * @file AttendanceCard.tsx
 * @description Attendance shift card component. Binds check-in actions with reanimated visual transitions.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import useTheme from '../../../shared/hooks/useTheme';
import { Card, Button, Divider } from '../../../shared/components';
import useAttendance from '../hooks/useAttendance';
import dayjs from 'dayjs';

export const AttendanceCard: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const {
    todayRecord,
    loadingStatus,
    clockIn,
    isClockingIn,
    clockOut,
    isClockingOut,
  } = useAttendance();

  const [message, setMessage] = useState('');

  const handlePress = async () => {
    setMessage('');
    try {
      if (!todayRecord) {
        // Clock In
        const mockLocation = { latitude: 37.7749, longitude: -122.4194 };
        await clockIn({
          notes: 'Clocked in via OMS Mobile',
          location: mockLocation,
        });
        setMessage('Checked in successfully!');
      } else if (todayRecord && !todayRecord.checkOut) {
        // Clock Out
        await clockOut({
          id: todayRecord.id,
          payload: { notes: 'Clocked out via OMS Mobile' },
        });
        setMessage('Checked out successfully!');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Action failed. Please try again.');
    }
  };

  if (loadingStatus) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Card>
    );
  }

  const isClockedIn = !!todayRecord && !todayRecord.checkOut;
  const isShiftComplete = !!todayRecord && !!todayRecord.checkOut;

  const getStatusText = () => {
    if (isShiftComplete) return 'Shift Completed';
    if (isClockedIn) return 'Active Shift';
    return 'Off Duty';
  };

  const getStatusColor = () => {
    if (isShiftComplete) return colors.neutral;
    if (isClockedIn) return colors.success;
    return colors.textLight;
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
        <View style={styles.info}>
          <Text
            style={{
              fontSize: typography.sizes.title,
              fontFamily: typography.fonts.semibold,
              color: colors.text,
            }}
          >
            {getStatusText()}
          </Text>
          <Text
            style={{
              fontSize: typography.sizes.caption,
              fontFamily: typography.fonts.regular,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {isClockedIn
              ? `Checked in at ${dayjs(todayRecord.checkIn).format('hh:mm A')}`
              : isShiftComplete
              ? `Shift: ${dayjs(todayRecord.checkIn).format('hh:mm A')} - ${dayjs(todayRecord.checkOut).format('hh:mm A')}`
              : 'Record check-in time for today'}
          </Text>
        </View>
      </View>

      {message ? (
        <Text
          style={[
            styles.feedback,
            {
              color: message.includes('failed') || message.includes('Error') ? colors.danger : colors.success,
              fontSize: typography.sizes.caption,
              fontFamily: typography.fonts.medium,
              marginTop: spacing.sm,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {!isShiftComplete && (
        <>
          <Divider style={{ marginVertical: spacing.md }} />
          <Button
            title={isClockedIn ? 'Clock Out' : 'Clock In Now'}
            intent={isClockedIn ? 'danger' : 'success'}
            leftIcon={isClockedIn ? 'exit-outline' : 'enter-outline'}
            onPress={handlePress}
            loading={isClockingIn || isClockingOut}
            fullWidth
          />
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  feedback: {
    textAlign: 'center',
  },
});
export default AttendanceCard;
