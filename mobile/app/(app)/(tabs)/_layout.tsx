/**
 * @file _layout.tsx
 * @description Bottom Tab Bar layout config for the primary app screens.
 *              Implements the center FAB (+) and approved mockup tab selections.
 */

import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import useTheme from '../../../src/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useConversations } from '../../../src/features/chat';

export default function TabsLayout() {
  const { colors, typography } = useTheme();
  const { data: conversations = [] } = useConversations();

  // Calculate total unread messages across all active conversations
  const totalUnreadChat = conversations.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: typography.sizes.label,
          fontFamily: typography.fonts.semibold,
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
            // Prevent default navigation
            e.preventDefault();
            // Emit action trigger
            if ((global as any).showQuickActionsSheet) {
              (global as any).showQuickActionsSheet();
            }
          },
        }}
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -16,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="apps" size={24} color="#FFFFFF" />
            </View>
          ),
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
            backgroundColor: colors.primary,
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
