/**
 * @file AttachmentMenu.tsx
 * @description Premium animated bottom-sheet attachment menu.
 * Opens with a spring animation from the bottom of the screen.
 * Backdrop tap dismisses it. Plugin grid is 4 columns.
 * Fully driven by the AttachmentProvider plugin system — no hardcoded items.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTheme from '../../../shared/hooks/useTheme';
import { useAttachmentPlugins } from './AttachmentProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 400);

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const plugins = useAttachmentPlugins();

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Spring-open animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide-down dismiss animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Split plugins into rows of 4
  const rows: (typeof plugins[0])[][] = [];
  const itemsPerRow = 4;
  for (let i = 0; i < plugins.length; i += itemsPerRow) {
    rows.push(plugins.slice(i, i + itemsPerRow));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={[styles.titleText, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
            Attachments
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Plugin grid */}
        {rows.map((row, rowIdx) => (
          <View key={`row-${rowIdx}`} style={styles.pluginRow}>
            {row.map((plugin) => (
              <Pressable
                key={plugin.id}
                onPress={() => {
                  plugin.action();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.pluginItem,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                ]}
                android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false, radius: 36 }}
              >
                <View style={[styles.iconCircle, { backgroundColor: plugin.backgroundColor }]}>
                  <Ionicons name={plugin.icon as any} size={22} color={plugin.iconColor} />
                </View>
                <Text
                  style={[styles.pluginLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}
                  numberOfLines={1}
                >
                  {plugin.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  pluginRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  pluginItem: {
    alignItems: 'center',
    width: '25%',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  pluginLabel: {
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 62,
  },
});

export default AttachmentMenu;
