/**
 * @file _layout.tsx
 * @description Layout for the authentication group (Tenant resolution, Login).
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="tenant" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
