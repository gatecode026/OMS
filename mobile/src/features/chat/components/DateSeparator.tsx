import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useTheme from '../../../shared/hooks/useTheme';

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.text, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
          {date}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  text: {
    fontSize: 11,
  },
});

export default DateSeparator;
