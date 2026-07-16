/**
 * @file InfoRow.tsx
 * @description Reusable label + value display row for profile information pages.
 *              Used consistently across all 14 inner pages of the Profile module.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import useTheme from '../../../shared/hooks/useTheme';

interface InfoRowProps {
  label: string;
  value?: string | null;
  style?: ViewStyle;
  valueColor?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, style, valueColor }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.row, { paddingVertical: spacing.sm }, style]}>
      <Text
        style={{
          fontSize: typography.sizes.caption,
          fontFamily: typography.fonts.semibold,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: typography.sizes.body,
          fontFamily: typography.fonts.medium,
          color: valueColor || colors.text,
        }}
      >
        {value && value.trim() !== '' ? value : '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
});

export default InfoRow;
