/**
 * @file app/(app)/(tabs)/_layout.tsx
 * @description Pixel-Perfect Floating Glassmorphic Bottom Navigation Bar.
 *              Features 4 tabs (Home, My Tasks, Chat, Profile) and a center elevated
 *              floating purple action button with a lightning bolt icon.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import useTheme from '../../../src/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useConversations } from '../../../src/features/chat';
import { useQuickActionsStore } from '../../../src/shared/store/quickActionsStore';

export default function TabsLayout() {
  const { colors, typography, isDark } = useTheme();
  const { data: conversations = [] } = useConversations();

  // Calculate total unread messages across all active conversations
  const totalUnreadChat = conversations.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#A78BFA', // Soft bright purple
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F1221' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 72 : 64,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          borderRadius: 32,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.fonts.semibold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'My Tasks',
          tabBarLabel: 'My Tasks',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="action"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            useQuickActionsStore.getState().openActions();
          },
        }}
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={styles.floatingActionWrapper}>
              <View style={[styles.floatingActionCircle, { borderColor: isDark ? '#0F1221' : '#FFFFFF' }]}>
                <Ionicons name="flash" size={24} color="#FFFFFF" />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={22}
              color={color}
            />
          ),
          tabBarBadge: totalUnreadChat > 0 ? totalUnreadChat : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#8B5CF6',
            color: '#FFFFFF',
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingActionWrapper: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6', // Vibrant purple
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
  },
});
