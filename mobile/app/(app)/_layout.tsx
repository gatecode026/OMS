import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SidebarDrawer from '../../src/shared/components/SidebarDrawer';
import { BottomSheet, ListItem } from '../../src/shared/components';
import { useQuickActionsStore } from '../../src/shared/store/quickActionsStore';
import { useAttendance } from '../../src/features/attendance/hooks/useAttendance';
import useTheme from '../../src/shared/hooks/useTheme';

import dayjs from 'dayjs';

export default function AppLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  
  // Connect global quick action triggers
  const { isOpen, closeActions } = useQuickActionsStore();
  const { todayRecord, clockIn, clockOut } = useAttendance();

  const handleQuickClockToggle = async () => {
    closeActions();

    const hasPunchedIn = todayRecord && todayRecord.punchIn && todayRecord.punchIn !== '--:--';
    const hasPunchedOut = todayRecord && todayRecord.punchOut && todayRecord.punchOut !== '--:--';

    if (hasPunchedOut) {
      return;
    }

    const formattedNow = dayjs().format('hh:mm A');
    if (!hasPunchedIn) {
      await clockIn({
        punchIn: formattedNow,
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      });
    } else {
      await clockOut({
        id: todayRecord.id,
        payload: {
          punchOut: formattedNow,
          notes: 'Shift completed.',
        },
      });
    }
  };

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        {/* ── Call screens — slide up from bottom like a native call sheet ─── */}
        <Stack.Screen
          name="incoming-call"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false, // prevent accidental swipe-dismiss
          }}
        />
        <Stack.Screen
          name="call/index"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="call/video"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
      </Stack>
      <SidebarDrawer />
      
      {/* Global Quick Actions Bottom Sheet available on all screens */}
      <BottomSheet
        visible={isOpen}
        onClose={closeActions}
        title="Quick Actions"
      >
        <View style={styles.actionsSheetList}>
          <ListItem
            title="Clock In / Out"
            description="Toggle your daily attendance check-in status"
            leftIcon="time-outline"
            onPress={handleQuickClockToggle}
          />
          <ListItem
            title="Request Leave"
            description="Apply for annual, sick, or casual leaves"
            leftIcon="today-outline"
            onPress={() => {
              closeActions();
              router.push('/apply-leave');
            }}
          />
          <ListItem
            title="New Direct Chat"
            description="Start a private conversation with an employee"
            leftIcon="chatbubbles-outline"
            onPress={() => {
              closeActions();
              router.push('/chat/new-chat');
            }}
          />
          <ListItem
            title="Create Group Chat"
            description="Create a collaboration group for your team"
            leftIcon="people-outline"
            onPress={() => {
              closeActions();
              router.push('/chat/create-group');
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  actionsSheetList: {
    paddingVertical: 12,
    gap: 16,
  },
});
