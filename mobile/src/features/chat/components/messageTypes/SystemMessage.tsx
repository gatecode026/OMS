import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../../shared/hooks/useTheme';

interface SystemMessageProps {
  content: string;
  type: string;
  isMe: boolean;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ content, type, isMe }) => {
  const { colors, typography, isDark } = useTheme();

  if (type === 'call') {
    const isMissed = content.toLowerCase().includes('missed');
    const isVideo = content.toLowerCase().includes('video');
    return (
      <View 
        style={[
          styles.callCardContainer, 
          { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'
          }
        ]}
      >
        <Ionicons 
          name={isVideo ? "videocam" : "call"} 
          size={15} 
          color={isMissed ? '#EF4444' : '#10B981'} 
          style={{ marginRight: 6 }} 
        />
        <Text style={[styles.callCardTitle, { color: colors.text, fontFamily: typography.fonts.medium }]}>
          {content}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.systemContainer}>
      <Text style={[styles.systemText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
        {content}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  callCardContainer: {
    alignSelf: 'center',
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  callCardTitle: {
    fontSize: 12,
  },
  systemContainer: {
    alignSelf: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  systemText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SystemMessage;
