/**
 * @file MenuCard.tsx
 * @description Tappable menu card row for the profile main screen menu list.
 *              Matches the approved mobile reference design: icon in colored bubble + title + chevron.
 */

import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';

interface MenuCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MenuCard: React.FC<MenuCardProps> = ({
  title,
  icon,
  iconColor,
  onPress,
  accessibilityLabel,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const effectiveIconColor = iconColor || colors.primary;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 12, stiffness: 350 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 350 }); }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={[
        animatedStyle,
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.iconBubble,
          { backgroundColor: `${effectiveIconColor}18`, borderRadius: radius.md },
        ]}
      >
        <Ionicons name={icon} size={20} color={effectiveIconColor} />
      </View>

      <Text
        style={{
          flex: 1,
          fontSize: typography.sizes.body,
          fontFamily: typography.fonts.medium,
          color: colors.text,
          marginLeft: spacing.md,
        }}
      >
        {title}
      </Text>

      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MenuCard;
