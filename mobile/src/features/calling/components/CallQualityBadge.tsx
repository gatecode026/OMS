/**
 * @file CallQualityBadge.tsx
 * @description UI component displaying HD Voice/Video status, End-to-End Encryption badge,
 *              and real-time signal strength (Excellent / Good / Fair / Poor).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallQuality } from '../types/calling.types';

interface CallQualityBadgeProps {
  quality: CallQuality;
  isEncrypted?: boolean;
  isHD?: boolean;
}

export const CallQualityBadge: React.FC<CallQualityBadgeProps> = ({
  quality,
  isEncrypted = true,
  isHD = true,
}) => {
  const getQualityColor = () => {
    switch (quality) {
      case 'Excellent':
      case 'Good':
        return '#10B981'; // Green
      case 'Fair':
        return '#F59E0B'; // Yellow
      case 'Weak':
      case 'Poor':
        return '#EF4444'; // Red
      case 'Reconnecting':
        return '#6B7280'; // Gray
      default:
        return '#10B981';
    }
  };

  return (
    <View style={styles.container}>
      {isEncrypted && (
        <View style={styles.badge}>
          <Ionicons name="lock-closed" size={12} color="#10B981" />
          <Text style={styles.badgeText}>E2EE</Text>
        </View>
      )}

      {isHD && (
        <View style={styles.badge}>
          <Text style={styles.hdText}>HD</Text>
        </View>
      )}

      <View style={[styles.badge, styles.qualityBadge]}>
        <View style={[styles.dot, { backgroundColor: getQualityColor() }]} />
        <Text style={[styles.badgeText, { color: getQualityColor() }]}>{quality}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  hdText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  qualityBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default CallQualityBadge;
