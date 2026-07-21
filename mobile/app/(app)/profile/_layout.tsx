/**
 * @file _layout.tsx
 * @description Stack navigator for the Enterprise Profile module.
 *              All profile inner pages are nested within this stack.
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
