/**
 * @file AudioRoutePickerModal.tsx
 * @description Bottom Sheet modal for selecting audio output routing
 *              (Speakerphone, Earpiece, Bluetooth Headset, Wired Earphones).
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';
import { Button } from '../../../shared/components';

export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'headset';

interface AudioRoutePickerModalProps {
  visible: boolean;
  activeRoute: AudioRoute;
  onSelectRoute: (route: AudioRoute) => void;
  onClose: () => void;
}

export const AudioRoutePickerModal: React.FC<AudioRoutePickerModalProps> = ({
  visible,
  activeRoute,
  onSelectRoute,
  onClose,
}) => {
  const { colors, typography, radius } = useTheme();

  const routes: Array<{ id: AudioRoute; label: string; icon: keyof typeof Ionicons.glyphMap; subtext: string }> = [
    { id: 'speaker', label: 'Speakerphone', icon: 'volume-high-outline', subtext: 'Built-in loud speaker' },
    { id: 'earpiece', label: 'Phone Earpiece', icon: 'ear-outline', subtext: 'Built-in receiver' },
    { id: 'bluetooth', label: 'Bluetooth Device', icon: 'bluetooth-outline', subtext: 'Wireless headset or car audio' },
    { id: 'headset', label: 'Wired Headphones', icon: 'headset-outline', subtext: '3.5mm or USB-C headset' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Audio Output Route
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ marginTop: 12 }}>
            {routes.map((r) => {
              const isSelected = activeRoute === r.id;
              return (
                <Pressable
                  key={r.id}
                  style={[
                    styles.routeOption,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary + '10' : colors.background,
                    },
                  ]}
                  onPress={() => {
                    onSelectRoute(r.id);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: isSelected ? colors.primary : colors.surface },
                    ]}
                  >
                    <Ionicons name={r.icon} size={22} color={isSelected ? '#FFFFFF' : colors.text} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.routeLabel, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {r.label}
                    </Text>
                    <Text style={[styles.routeSubtext, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                      {r.subtext}
                    </Text>
                  </View>

                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>

          <Button title="Done" onPress={onClose} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: 15,
  },
  routeSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default AudioRoutePickerModal;
