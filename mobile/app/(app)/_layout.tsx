import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SidebarDrawer from '../../src/shared/components/SidebarDrawer';
import { BottomSheet, ListItem } from '../../src/shared/components';
import { useQuickActionsStore } from '../../src/shared/store/quickActionsStore';
import { useAttendance } from '../../src/features/attendance/hooks/useAttendance';
import useTheme from '../../src/shared/hooks/useTheme';

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

    if (!hasPunchedIn) {
      await clockIn({
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      });
    } else {
      await clockOut({
        id: todayRecord.id,
        payload: {
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
