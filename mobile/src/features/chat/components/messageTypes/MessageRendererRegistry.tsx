import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ImageMessage from './ImageMessage';
import VideoMessage from './VideoMessage';
import AudioMessage from './AudioMessage';
import FileMessage from './FileMessage';
import SystemMessage from './SystemMessage';
import { ChatMessage } from '../../types';
import { toast } from '../../../../shared/components/Toast';

export type MessageRenderer = (props: { item: ChatMessage; isMe: boolean; currentUserId: string }) => React.ReactElement | null;

const registry: Record<string, MessageRenderer> = {};

export const registerMessageRenderer = (type: string, renderer: MessageRenderer) => {
  registry[type] = renderer;
};

// Helper to parse JSON payload safely
const parseContent = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
};

// Register core default message renderers
registerMessageRenderer('image', ({ item }) => (
  <ImageMessage
    mediaUrl={item.media?.url || ''}
    fileName={item.media?.fileName ?? undefined}
    fileSize={item.media?.fileSize ?? undefined}
    conversationId={item.conversationId}
    messageId={item.id}
  />
));

registerMessageRenderer('video', ({ item }) => (
  <VideoMessage
    mediaUrl={item.media?.url || ''}
    fileName={item.media?.fileName ?? undefined}
    fileSize={item.media?.fileSize ?? undefined}
    duration={item.media?.duration ?? undefined}
    conversationId={item.conversationId}
    messageId={item.id}
  />
));

registerMessageRenderer('audio', ({ item, isMe }) => (
  <AudioMessage
    mediaUrl={item.media?.url || ''}
    duration={item.media?.duration ?? undefined}
    isMe={isMe}
  />
));

registerMessageRenderer('file', ({ item, isMe }) => {
  const mimeType = item.media?.mimeType || null;
  const isVideo = mimeType?.startsWith('video/');
  if (isVideo) {
    return (
      <VideoMessage
        mediaUrl={item.media?.url || ''}
        fileName={item.media?.fileName ?? undefined}
        fileSize={item.media?.fileSize ?? undefined}
        duration={item.media?.duration ?? undefined}
        conversationId={item.conversationId}
        messageId={item.id}
      />
    );
  }
  return (
    <FileMessage
      mediaUrl={item.media?.url || ''}
      fileName={item.media?.fileName || ''}
      mimeType={mimeType}
      fileSize={item.media?.fileSize ?? undefined}
      isMe={isMe}
    />
  );
});

registerMessageRenderer('call', ({ item, isMe }) => <SystemMessage content={item.content} type={item.type} isMe={isMe} />);
registerMessageRenderer('system', ({ item, isMe }) => <SystemMessage content={item.content} type={item.type} isMe={isMe} />);

// ─── REGISTER OMS SMART CARD ATTACHMENT RENDERERS ───

registerMessageRenderer('task', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  const priorityColor = data.priority === 'High' ? '#EF4444' : data.priority === 'Medium' ? '#F59E0B' : '#3B82F6';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="checkbox-outline" size={20} color="#4F46E5" />
        <Text style={styles.cardTitle}>Task Linked</Text>
        <View style={[styles.badge, { backgroundColor: priorityColor }]}>
          <Text style={styles.badgeText}>{data.priority || 'Normal'}</Text>
        </View>
      </View>
      <Text style={styles.cardMainText} numberOfLines={1}>{data.title}</Text>
      <Text style={styles.cardSubText}>Due: {data.dueDate || 'No due date'} • {data.status || 'Pending'}</Text>
      <Pressable onPress={() => router.push(`/task-details?id=${data.id}` as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>Open Task details</Text>
        <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('leave', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  const statusColor = data.status === 'Approved' ? '#10B981' : data.status === 'Rejected' ? '#EF4444' : '#F59E0B';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="calendar-outline" size={20} color="#E53E3E" />
        <Text style={styles.cardTitle}>Leave Request</Text>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{data.status}</Text>
        </View>
      </View>
      <Text style={styles.cardMainText} numberOfLines={1}>{data.leaveType || 'Casual Leave'}</Text>
      <Text style={styles.cardSubText}>Dates: {data.startDate} to {data.endDate}</Text>
      <Pressable onPress={() => router.push('/apply-leave' as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>View Leave Applications</Text>
        <Ionicons name="chevron-forward" size={14} color="#E53E3E" />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('attendance', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="time-outline" size={20} color="#059669" />
        <Text style={styles.cardTitle}>Attendance logged</Text>
      </View>
      <Text style={styles.cardMainText}>Shift: {data.date}</Text>
      <Text style={styles.cardSubText}>In: {data.checkIn || '--'} • Out: {data.checkOut || '--'}</Text>
      <Pressable onPress={() => router.push('/attendance-history' as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>Open Attendance logs</Text>
        <Ionicons name="chevron-forward" size={14} color="#059669" />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('payslip', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="card-outline" size={20} color="#DB2777" />
        <Text style={styles.cardTitle}>Payslip</Text>
      </View>
      <Text style={styles.cardMainText}>Month: {data.month}</Text>
      <Text style={styles.cardSubText}>Salary: {data.salary || 'Confidential'}</Text>
      <Pressable onPress={() => router.push(`/payroll-details?id=${data.id}` as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>View Payslip PDF</Text>
        <Ionicons name="chevron-forward" size={14} color="#DB2777" />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('project', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="grid-outline" size={20} color="#4F46E5" />
        <Text style={styles.cardTitle}>Project Details</Text>
      </View>
      <Text style={styles.cardMainText} numberOfLines={1}>{data.title}</Text>
      <Text style={styles.cardSubText}>Category: {data.category} • Status: {data.status}</Text>
      <Pressable onPress={() => router.push(`/project-details?id=${data.id}` as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>Open Project dashboard</Text>
        <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('meeting', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="today-outline" size={20} color="#0EA5E9" />
        <Text style={styles.cardTitle}>Calendar Meeting</Text>
      </View>
      <Text style={styles.cardMainText} numberOfLines={1}>{data.title}</Text>
      <Text style={styles.cardSubText}>Time: {data.time} • Room: {data.roomId}</Text>
      <Pressable onPress={() => router.push(`/chat/${data.roomId}` as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>Join Video Conference</Text>
        <Ionicons name="videocam" size={14} color="#0EA5E9" style={{ marginLeft: 6 }} />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('contact', ({ item }) => {
  const router = useRouter();
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="person-circle-outline" size={22} color="#6366F1" />
        <Text style={styles.cardTitle}>Contact Shared</Text>
      </View>
      <Text style={styles.cardMainText}>{data.name}</Text>
      <Text style={styles.cardSubText}>{data.role} • {data.department}</Text>
      <Pressable onPress={() => router.push(`/chat/contact-info?id=${data.id}` as any)} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>View Contact Profile</Text>
        <Ionicons name="chevron-forward" size={14} color="#6366F1" />
      </Pressable>
    </View>
  );
});

registerMessageRenderer('location', ({ item }) => {
  const data = parseContent(item.content);
  if (!data) return <Text style={styles.fallbackText}>{item.content}</Text>;

  const handleOpenMap = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
    Linking.openURL(url).catch(() => toast.error('Could not open map app'));
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="pin-outline" size={20} color="#EF4444" />
        <Text style={styles.cardTitle}>Location Pin</Text>
      </View>
      <Text style={styles.cardMainText} numberOfLines={1}>{data.address || 'Shared coordinates'}</Text>
      <Text style={styles.cardSubText}>{data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}</Text>
      <Pressable onPress={handleOpenMap} style={styles.cardActionBtn}>
        <Text style={styles.cardActionText}>View in Google Maps</Text>
        <Ionicons name="map-outline" size={14} color="#EF4444" style={{ marginLeft: 6 }} />
      </Pressable>
    </View>
  );
});

export const renderMessageContent = (item: ChatMessage, isMe: boolean, currentUserId: string): React.ReactElement | null => {
  const renderer = registry[item.type];
  if (renderer) {
    return renderer({ item, isMe, currentUserId });
  }
  return null;
};

const styles = StyleSheet.create({
  fallbackText: {
    fontSize: 13,
  },
  cardContainer: {
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1,
  },
  cardMainText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardSubText: {
    fontSize: 10,
    color: '#CBD5E1',
    marginBottom: 8,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  cardActionText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
