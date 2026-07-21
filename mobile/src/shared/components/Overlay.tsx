/**
 * @file Overlay.tsx
 * @description Theme-aware, animated overlay components (Modal, BottomSheet, Snackbar, Toast, Dialog).
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal as RNModal,
  Dimensions,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import useTheme from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  style,
}) => {
  const { colors, radius, shadows, typography } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
            },
            shadows.heavy,
            style,
          ]}
          onPress={(e) => e.stopPropagation()} // Prevent closing on inner tap
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text
              style={{
                fontSize: typography.sizes.h3,
                fontFamily: typography.fonts.semibold,
                color: colors.text,
                flex: 1,
              }}
            >
              {title}
            </Text>
            <Pressable onPress={onClose} accessible accessibilityLabel="Close modal">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  style,
}) => {
  const { colors, radius, shadows, typography, spacing } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    } else {
      translateY.value = SCREEN_HEIGHT;
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.bottomSheetContainer}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          style={[
            styles.bottomSheetPanel,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
            shadows.heavy,
            animatedStyle,
            style,
          ]}
        >
          {/* Drag Handle Indicator */}
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: colors.border, marginTop: spacing.sm },
            ]}
          />
          <View style={styles.bottomSheetHeader}>
            <Text
              style={{
                fontSize: typography.sizes.h3,
                fontFamily: typography.fonts.semibold,
                color: colors.text,
                flex: 1,
              }}
            >
              {title}
            </Text>
            <Pressable onPress={handleClose} accessible accessibilityLabel="Close bottom sheet">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={[styles.bottomSheetBody, { paddingBottom: spacing.xxl }]}>
            {children}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
};

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  onClose,
  duration = 3000,
}) => {
  const { colors, radius, shadows, typography, spacing } = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, opacity, onClose]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: interpolateTranslation(opacity.value, [0, 1], [-20, 0]) },
      ],
    };
  });

  const interpolateTranslation = (
    val: number,
    input: number[],
    output: number[]
  ) => {
    'worklet';
    return output[0] + (val - input[0]) * ((output[1] - output[0]) / (input[1] - input[0]));
  };

  if (!visible) return null;

  const getThemeColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      case 'info':
      default:
        return colors.primary;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle-outline';
      case 'warning':
        return 'warning-outline';
      case 'danger':
        return 'alert-circle-outline';
      case 'info':
      default:
        return 'information-circle-outline';
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderColor: colors.border,
          borderWidth: 1,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        shadows.medium,
        animatedStyle,
      ]}
    >
      <Ionicons
        name={getIconName() as any}
        size={20}
        color={getThemeColor()}
        style={{ marginRight: spacing.sm }}
      />
      <Text
        style={{
          color: colors.text,
          fontSize: typography.sizes.subtitle,
          fontFamily: typography.fonts.medium,
          flex: 1,
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
};

export const Snackbar = Toast; // Alias for similar behavior

interface DialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  intent?: 'primary' | 'danger' | 'success';
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  intent = 'primary',
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <Text
        style={{
          fontSize: typography.sizes.body,
          color: colors.textMuted,
          fontFamily: typography.fonts.regular,
          marginBottom: spacing.xl,
        }}
      >
        {message}
      </Text>
      <View style={styles.dialogActions}>
        <Button
          title={cancelLabel}
          onPress={onCancel}
          variant="text"
          intent="neutral"
          style={{ flex: 1, marginRight: spacing.sm }}
        />
        <Button
          title={confirmLabel}
          onPress={onConfirm}
          intent={intent as any}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalBody: {
    padding: 20,
  },
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheetPanel: {
    width: '100%',
    maxHeight: '80%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  bottomSheetBody: {
    paddingHorizontal: 20,
  },
  toastWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 2000,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
});
