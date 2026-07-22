/**
 * @file KeypadModal.tsx
 * @description In-call DTMF Keypad overlay modal allowing numeric entry during active calls.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';
import { Button } from '../../../shared/components';

interface KeypadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const KeypadModal: React.FC<KeypadModalProps> = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const [digits, setDigits] = useState('');

  const keypadRows = [
    [
      { num: '1', sub: '' },
      { num: '2', sub: 'ABC' },
      { num: '3', sub: 'DEF' },
    ],
    [
      { num: '4', sub: 'GHI' },
      { num: '5', sub: 'JKL' },
      { num: '6', sub: 'MNO' },
    ],
    [
      { num: '7', sub: 'PQRS' },
      { num: '8', sub: 'TUV' },
      { num: '9', sub: 'WXYZ' },
    ],
    [
      { num: '*', sub: '' },
      { num: '0', sub: '+' },
      { num: '#', sub: '' },
    ],
  ];

  const handleKeyPress = (digit: string) => {
    setDigits((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDigits((prev) => prev.slice(0, -1));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              In-Call Keypad
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Keypad Display */}
          <View style={[styles.displayBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.digitsText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {digits || 'Enter digits...'}
            </Text>
            {digits.length > 0 && (
              <Pressable onPress={handleBackspace}>
                <Ionicons name="backspace-outline" size={22} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Keypad Grid */}
          <View style={styles.grid}>
            {keypadRows.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((item) => (
                  <Pressable
                    key={item.num}
                    style={[styles.keyBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleKeyPress(item.num)}
                  >
                    <Text style={[styles.keyNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {item.num}
                    </Text>
                    {item.sub ? (
                      <Text style={[styles.keySub, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                        {item.sub}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ))}
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
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
  },
  displayBox: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  digitsText: {
    fontSize: 20,
    letterSpacing: 2,
  },
  grid: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  keyBtn: {
    width: 68,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  keyNum: {
    fontSize: 20,
  },
  keySub: {
    fontSize: 9,
    marginTop: -2,
  },
});

export default KeypadModal;
