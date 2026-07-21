/**
 * @file Toast.tsx
 * @description Lightweight global toast — no modals, no dialogs.
 *   Shows a small floating message for 1.5s then auto-dismisses.
 *   Usage:
 *     toast.show('Saved successfully', 'success')
 *     toast.show('Something went wrong', 'error')
 *     toast.show('Leave request updated')
 */

import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  message: string;
  type: ToastType;
}

export interface ToastRef {
  show: (message: string, type?: ToastType) => void;
}

// ─── Internal Toast component (rendered in _layout) ───────────────────────────
export const ToastView = forwardRef<ToastRef>((_, ref) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, type });

    // Animate in
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 1.5s
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 1500);
  }, [opacity, translateY]);

  useImperativeHandle(ref, () => ({ show }), [show]);

  if (!toast) return null;

  const bgColor =
    toast.type === 'success' ? '#10B981' :
    toast.type === 'error'   ? '#EF4444' : '#6366F1';

  const iconName =
    toast.type === 'success' ? 'checkmark-circle' :
    toast.type === 'error'   ? 'alert-circle'     : 'information-circle';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={iconName as any} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
      <Text style={styles.text} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
});

ToastView.displayName = 'ToastView';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

// ─── Global singleton ref — set once in _layout ───────────────────────────────
let _toastRef: ToastRef | null = null;

export const setToastRef = (ref: ToastRef | null) => {
  _toastRef = ref;
};

/** Call from anywhere in the app */
export const toast = {
  show: (message: string, type: ToastType = 'success') => {
    _toastRef?.show(message, type);
  },
  success: (message: string) => _toastRef?.show(message, 'success'),
  error:   (message: string) => _toastRef?.show(message, 'error'),
  info:    (message: string) => _toastRef?.show(message, 'info'),
};
