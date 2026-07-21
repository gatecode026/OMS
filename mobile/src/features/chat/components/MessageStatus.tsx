import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../types';
import useTheme from '../../../shared/hooks/useTheme';

interface MessageStatusProps {
  msg: ChatMessage;
  currentUserId: string;
  onRetry: (msg: ChatMessage) => void;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ msg, currentUserId, onRetry }) => {
  const { colors } = useTheme();
  let status = msg.status;
  if (!status) {
    if (msg.id.startsWith('temp_')) {
      status = 'sending';
    } else {
      const isRead = msg.readBy?.some(r => r.employeeId !== currentUserId);
      const isDelivered = msg.deliveredTo?.some(d => d.employeeId !== currentUserId);
      if (isRead) status = 'read';
      else if (isDelivered) status = 'delivered';
      else status = 'sent';
    }
  }

  if (status === 'failed') {
    return (
      <Pressable onPress={() => onRetry(msg)} style={{ marginLeft: 4 }}>
        <Ionicons name="alert-circle" size={16} color={colors.danger} />
      </Pressable>
    );
  }

  let iconName = 'checkmark';
  let iconColor = 'rgba(255,255,255,0.6)';

  if (status === 'pending' || status === 'sending') {
    iconName = 'time-outline';
    iconColor = 'rgba(255,255,255,0.4)';
  } else if (status === 'delivered') {
    iconName = 'checkmark-done';
    iconColor = 'rgba(255,255,255,0.6)';
  } else if (status === 'read') {
    iconName = 'checkmark-done';
    iconColor = '#38BDF8';
  } else if (status === 'retrying') {
    iconName = 'refresh-outline';
    iconColor = 'rgba(255,255,255,0.4)';
  }

  return (
    <Ionicons
      name={iconName as any}
      size={14}
      color={iconColor}
      style={{ marginLeft: 4 }}
    />
  );
};
export default MessageStatus;
