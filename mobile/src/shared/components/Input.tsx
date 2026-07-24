/**
 * @file Input.tsx
 * @description Theme-aware, highly-accessible, animated input fields (TextField, PasswordField, SearchBar, Dropdown).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  Modal,
  FlatList,
  TextInputProps,
  StyleProp,
} from 'react-native';
import useTheme from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  disabled = false,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { colors, radius, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Focus animation shared value (0 = unfocused, 1 = focused)
  const focusAnim = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [
        error ? colors.danger : colors.border,
        error ? colors.danger : colors.primary,
      ]
    );

    return {
      borderColor,
      borderWidth: error || focusAnim.value > 0 ? 1.5 : 1,
    };
  });

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 150 });
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 150 });
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? colors.danger : isFocused ? colors.primary : colors.textMuted,
              fontFamily: typography.fonts.medium,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderRadius: radius.md,
            backgroundColor: disabled ? colors.neutralLight : colors.surface,
          },
          animatedContainerStyle,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? colors.danger : isFocused ? colors.primary : colors.textLight}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          placeholderTextColor={colors.textLight}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessible
          accessibilityLabel={label || rest.placeholder}
          accessibilityState={{ disabled }}
          style={[
            styles.input,
            {
              color: disabled ? colors.textLight : colors.text,
              fontSize: typography.sizes.body,
              fontFamily: typography.fonts.regular,
            },
            inputStyle,
          ]}
          {...rest}
        />

        {rightIcon && (
          <Pressable onPress={onRightIconPress} disabled={disabled} style={styles.rightIcon}>
            <Ionicons
              name={rightIcon}
              size={20}
              color={error ? colors.danger : colors.textLight}
            />
          </Pressable>
        )}
      </Animated.View>

      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.danger,
              fontSize: typography.sizes.caption,
              fontFamily: typography.fonts.regular,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            {
              color: colors.textLight,
              fontSize: typography.sizes.caption,
              fontFamily: typography.fonts.regular,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

export const PasswordField: React.FC<TextFieldProps> = (props) => {
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  return (
    <TextField
      {...props}
      secureTextEntry={secureTextEntry}
      rightIcon={secureTextEntry ? 'eye-off' : 'eye'}
      onRightIconPress={() => setSecureTextEntry(!secureTextEntry)}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
};

export interface SearchBarProps extends Omit<TextFieldProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void;
  value: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  ...rest
}) => {
  const handleClear = () => {
    if (onChangeText) onChangeText('');
    if (onClear) onClear();
  };

  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      leftIcon="search-outline"
      rightIcon={value ? 'close-circle' : undefined}
      onRightIconPress={handleClear}
      returnKeyType="search"
      {...rest}
    />
  );
};

export interface DropdownOption {
  label: string;
  value: any;
}

export interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: any;
  onSelect: (value: any) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
  error,
  disabled = false,
}) => {
  const { colors, spacing, radius, typography, shadows } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (val: any) => {
    onSelect(val);
    setModalVisible(false);
  };

  return (
    <View style={styles.fieldContainer}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? colors.danger : colors.textMuted,
              fontFamily: typography.fonts.medium,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        accessible
        accessibilityRole="combobox"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled, expanded: modalVisible }}
        style={[
          styles.inputWrapper,
          {
            borderRadius: radius.md,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: error ? 1.5 : 1,
            backgroundColor: disabled ? colors.neutralLight : colors.surface,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Text
          style={{
            flex: 1,
            color: selectedOption ? colors.text : colors.textLight,
            fontSize: typography.sizes.body,
            fontFamily: typography.fonts.regular,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textLight} />
      </Pressable>

      {error && (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.danger,
              fontSize: typography.sizes.caption,
              fontFamily: typography.fonts.regular,
            },
          ]}
        >
          {error}
        </Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderColor: colors.border,
                borderWidth: 1,
              },
              shadows.heavy,
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text
                style={{
                  fontSize: typography.sizes.h3,
                  fontFamily: typography.fonts.semibold,
                  color: colors.text,
                }}
              >
                {label || 'Select'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <Pressable
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.neutralLight },
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text
                      style={{
                        fontSize: typography.sizes.body,
                        fontFamily: isSelected ? typography.fonts.semibold : typography.fonts.regular,
                        color: isSelected ? colors.primary : colors.text,
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 8,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    marginTop: 4,
  },
  helperText: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
});
