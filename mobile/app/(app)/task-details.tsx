/**
 * @file task-details.tsx
 * @description Task Details screen displaying full task metadata, interactive checklist,
 *              attachment list, comments, activity log, and sticky status update bar.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import useTheme from '../../src/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, Tag, Skeleton, ErrorState } from '../../src/shared/components';
import useAuthStore from '../../src/shared/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useTaskDetails,
  useUpdateTaskStatus,
  useUpdateTaskProgress,
  useAddTaskComment,
} from '../../src/features/tasks/hooks/useTasksData';
import dayjs from 'dayjs';

// Static checklist items mapping based on progress percentage
const CHECKLIST_ITEMS = [
  'Requirement analysis',
  'UI/UX Design',
  'API Integration',
  'Development',
  'Testing',
];

export default function TaskDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const authUser = useAuthStore((s) => s.user);
  
  // Retrieve search params
  const { projectId, taskId } = useLocalSearchParams<{ projectId: string; taskId: string }>();

  // Fetch task detail query
  const { data: task, isLoading, error, refetch } = useTaskDetails(
    projectId || '',
    taskId || ''
  );

  // Mutations
  const updateStatusMutation = useUpdateTaskStatus();
  const updateProgressMutation = useUpdateTaskProgress();
  const addCommentMutation = useAddTaskComment();

  // Screen UI States
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  // Resolve checklist completion states based on progress percentage (20% per item)
  const checklistData = useMemo(() => {
    if (!task) return [];
    const progress = task.progress || 0;
    const completedCount = Math.floor(progress / 20);

    return CHECKLIST_ITEMS.map((item, idx) => ({
      id: `check-${idx}`,
      title: item,
      completed: idx < completedCount,
    }));
  }, [task]);

  const checklistCompletedCount = useMemo(() => {
    return checklistData.filter(item => item.completed).length;
  }, [checklistData]);

  // Handle Checklist item toggling
  const handleToggleChecklist = async (index: number) => {
    // Read-only: no action allowed
    return;
  };

  // Handle posting a comment
  const handlePostComment = async () => {
    // Read-only: no action allowed
    return;
  };

  // Handle updating status via bottom picker
  const handleUpdateStatus = async (status: string) => {
    // Read-only: no action allowed
    return;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.border, paddingTop: insets.top || 12 }]}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Skeleton width={120} height={20} />
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutralLight }} />
        </View>
        <ScrollView style={{ padding: spacing.lg }}>
          <Skeleton height={150} borderRadius={16} style={{ marginBottom: spacing.lg }} />
          <Skeleton width={100} height={18} style={{ marginBottom: spacing.md }} />
          <Skeleton height={80} borderRadius={12} style={{ marginBottom: spacing.lg }} />
          <Skeleton height={200} borderRadius={12} style={{ marginBottom: spacing.lg }} />
        </ScrollView>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.border, paddingTop: insets.top || 12 }]}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <ErrorState message="Could not load task details. It may have been deleted or moved." onRetry={refetch} />
      </View>
    );
  }

  const priorityDetails = getPriorityDetails(task.priority);
  const statusDetails = getStatusDetails(task.status);
  
  // Format due date
  const formattedDueDate = task.dueDate ? dayjs(task.dueDate).format('DD MMM YYYY') : 'No Date';
  const formattedStartDate = task.startDate ? dayjs(task.startDate).format('DD MMM YYYY') : '05 Jul 2026';
  
  const assignedLog = task.activityLog?.find((act: any) => act.action === 'assigned');
  const formattedCreatedDate = task.createdAt 
    ? dayjs(task.createdAt).format('DD MMM YYYY') 
    : (assignedLog?.timestamp ? dayjs(assignedLog.timestamp).format('DD MMM YYYY') : '10 Jul 2026');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        
        {/* ── STICKY HEADER ── */}
        <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top || 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>Task Details</Text>
          <Pressable
            onPress={() => router.push('/profile')}
            style={styles.moreHeaderBtn}
            accessible
            accessibilityLabel="View Profile"
          >
            <Avatar name={authUser?.name || 'User'} size={28} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ── TOP CARD ── */}
          <View style={[styles.topCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.light]}>
            <View style={styles.topCardHeader}>
              <View style={[styles.taskIconCircle, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name={getTaskIcon(task.title)} size={28} color={colors.primary} />
              </View>
              <View style={styles.topCardHeaderRight}>
                <View style={styles.badgeRow}>
                  <Tag label={`${task.priority} Priority`} intent={priorityDetails.intent as any} style={{ marginRight: 6 }} />
                  <Tag label={statusDetails.label} intent={statusDetails.intent as any} />
                </View>
                <Text style={[styles.taskName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                  {task.title}
                </Text>
                <Text style={[styles.taskSubtext, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                  {task.projectName} • {task.projectId || task.id.replace('t-', '').split('-').slice(0, 2).join('-') || task.projectCode || 'PRJ-001'}
                </Text>
              </View>
            </View>

            {/* Timelines row */}
            <View style={[styles.timelineRow, { borderTopColor: colors.border }]}>
              <View style={styles.timelineCol}>
                <Text style={[styles.timelineLabel, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>Due Date</Text>
                <Text style={[styles.timelineValue, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{formattedDueDate}</Text>
              </View>
              <View style={styles.timelineDivider} />
              <View style={styles.timelineCol}>
                <Text style={[styles.timelineLabel, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>Start Date</Text>
                <Text style={[styles.timelineValue, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{formattedStartDate}</Text>
              </View>
              <View style={styles.timelineDivider} />
              <View style={styles.timelineCol}>
                <Text style={[styles.timelineLabel, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>Assigned By</Text>
                <Text style={[styles.timelineValue, { color: colors.text, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                  {task.assignedByName || 'Admin User'}
                </Text>
              </View>
            </View>

            {/* Progress Row */}
            <View style={styles.progressRow}>
              <View style={styles.progressTextRow}>
                <Text style={[styles.progressLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>Progress</Text>
                <Text style={[styles.progressValueText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>{task.progress || 0}%</Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.neutralLight }]}>
                <View style={[styles.progressBarFill, { width: `${task.progress || 0}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          </View>


          {/* ── DESCRIPTION SECTION ── */}
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.light]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>Description</Text>
            <Text
              style={[styles.descriptionText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}
              numberOfLines={isDescExpanded ? undefined : 3}
            >
              {task.description || 'No description provided.'}
            </Text>
            {task.description && task.description.length > 100 && (
              <Pressable onPress={() => setIsDescExpanded(!isDescExpanded)} style={styles.readMoreBtn}>
                <Text style={[styles.readMoreText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
                  {isDescExpanded ? 'Read Less' : '... Read More'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── TASK INFORMATION TABLE ── */}
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.light]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>Task Information</Text>
            
            <View style={styles.infoTable}>
              <InfoRow label="Priority" value={task.priority} dotColor={priorityDetails.color} valueColor={priorityDetails.color} />
              <InfoRow label="Status" value={statusDetails.label} dotColor={statusDetails.color} valueColor={colors.primary} />
              <InfoRow label="Project" value={task.projectName || 'OMS'} />
              <InfoRow label="Task ID" value={task.id} />
              <InfoRow label="Assigned To" value={task.assigneeName} avatar />
              <InfoRow label="Assigned By" value={task.assignedByName || 'Admin User'} avatar />
              <InfoRow label="Created Date" value={formattedCreatedDate} />
              <InfoRow label="Start Date" value={formattedStartDate} />
              <InfoRow label="Due Date" value={formattedDueDate} />
              <InfoRow label="Estimated Time" value={`${task.estimatedHours || 20}h`} />
              <InfoRow label="Time Spent" value={`${task.completed ? (task.estimatedHours || 20) : Math.round(((task.progress || 0) / 100) * (task.estimatedHours || 20))}h`} />
            </View>
          </View>

          {/* ── INTERACTIVE CHECKLIST ── */}
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.light]}>
            <View style={styles.checklistHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Checklist ({checklistCompletedCount}/{checklistData.length})
              </Text>
              <Text style={[styles.checklistPercentText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                {task.progress || 0}%
              </Text>
            </View>
            
            {/* Checklist progress bar */}
            <View style={[styles.checklistProgressBarTrack, { backgroundColor: colors.neutralLight }]}>
              <View style={[styles.checklistProgressBarFill, { width: `${task.progress || 0}%`, backgroundColor: colors.primary }]} />
            </View>

            {checklistData.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => handleToggleChecklist(idx)}
                style={styles.checklistRow}
              >
                <Ionicons
                  name={item.completed ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={item.completed ? colors.primary : colors.textLight}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.checklistTitle,
                    {
                      color: item.completed ? colors.textMuted : colors.text,
                      fontFamily: typography.fonts.regular,
                      textDecorationLine: item.completed ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── ATTACHMENTS ── */}
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.light]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
              Attachments ({task.attachments?.length || 0})
            </Text>

            {task.attachments && task.attachments.length > 0 ? (
              task.attachments.map((file) => (
                <View key={file.id} style={[styles.attachmentRow, { borderColor: colors.border }]}>
                  <View style={styles.attachmentLeft}>
                    <View style={[styles.fileIconWrapper, { backgroundColor: getFileBg(file.name) }]}>
                      <Ionicons name={getFileIcon(file.name)} size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.fileTextWrapper}>
                      <Text style={[styles.fileName, { color: colors.text, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.fileSize, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                        {file.size || '1.5 MB'} • {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </Text>
                    </View>
                  </View>
                  <Pressable style={styles.downloadBtn}>
                    <Ionicons name="download-outline" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptySubSection}>
                <Text style={{ color: colors.textLight, fontSize: 13, fontFamily: typography.fonts.regular }}>
                  No attachments uploaded.
                </Text>
              </View>
            )}
            
            {task.attachments && task.attachments.length > 0 && (
              <Pressable style={styles.viewAllBtn}>
                <Text style={[styles.viewAllText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>View All</Text>
              </Pressable>
            )}
          </View>

          {/* ── COMMENTS ── */}
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.light]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
              Comments ({task.comments?.length || 0})
            </Text>

            {task.comments && task.comments.length > 0 ? (
              task.comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Avatar name={comment.sender} size={32} style={{ marginRight: 10 }} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentSenderName, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                        {comment.sender}
                      </Text>
                      <Text style={[styles.commentTime, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
                        {comment.time || 'Today'}
                      </Text>
                    </View>
                    <Text style={[styles.commentTextMsg, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                      {comment.text}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptySubSection}>
                <Text style={{ color: colors.textLight, fontSize: 13, fontFamily: typography.fonts.regular }}>
                  No comments yet. Start the conversation!
                </Text>
              </View>
            )}

          </View>

          {/* ── ACTIVITY TIMELINE ── */}
          <View style={[styles.sectionContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 40 }, shadows.light]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>Activity Timeline</Text>
            
            {task.activityLog && task.activityLog.length > 0 ? (
              <View style={styles.timelineList}>
                {task.activityLog.slice(-5).map((log, idx) => {
                  const isLast = idx === Math.min(task.activityLog!.length, 5) - 1;
                  return (
                    <View key={log.id} style={styles.timelineItemRow}>
                      <View style={styles.timelineVisual}>
                        <View style={[styles.timelineVisualDot, { backgroundColor: colors.primary }]} />
                        {!isLast && <View style={[styles.timelineVisualLine, { backgroundColor: colors.border }]} />}
                      </View>
                      <View style={styles.timelineItemContent}>
                        <Text style={[styles.timelineItemTitle, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                          {getActivityActionTitle(log.action, log.details)}
                        </Text>
                        <Text style={[styles.timelineItemUser, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                          {log.userName}
                        </Text>
                      </View>
                      <Text style={[styles.timelineItemTime, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
                        {log.timestamp ? dayjs(log.timestamp).format('DD MMM, hh:mm A') : 'Just now'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptySubSection}>
                <Text style={{ color: colors.textLight, fontSize: 13, fontFamily: typography.fonts.regular }}>
                  No activity logged yet.
                </Text>
              </View>
            )}

            {task.activityLog && task.activityLog.length > 0 && (
              <Pressable style={styles.viewAllBtn}>
                <Text style={[styles.viewAllText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>View Full Timeline</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* ── STICKY BOTTOM STATUS INDICATOR ── */}
        <View style={[styles.stickyFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
          <View
            style={[styles.stickyStatusBtn, { backgroundColor: statusDetails.color, justifyContent: 'center' }, shadows.medium]}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[styles.stickyStatusBtnText, { fontFamily: typography.fonts.semibold }]}>
              Status: {statusDetails.label}
            </Text>
          </View>
        </View>

        {/* ── STATUS SELECTOR MODAL / SHEET ── */}
        {statusPickerVisible && (
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setStatusPickerVisible(false)} />
            <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>Select Status</Text>
                <Pressable onPress={() => setStatusPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              {['To Do', 'In Progress', 'QA', 'Completed', 'Backlog', 'Cancelled'].map((statusOption) => {
                const isCurrent = task.status === statusOption;
                return (
                  <Pressable
                    key={statusOption}
                    onPress={() => handleUpdateStatus(statusOption)}
                    style={[
                      styles.statusOptionRow,
                      { borderBottomColor: colors.border },
                      isCurrent && { backgroundColor: `${colors.primary}10` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        {
                          color: isCurrent ? colors.primary : colors.text,
                          fontFamily: isCurrent ? typography.fonts.semibold : typography.fonts.medium,
                        },
                      ]}
                    >
                      {statusOption}
                    </Text>
                    {isCurrent && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// Subcomponents / Helpers
interface InfoRowProps {
  label: string;
  value?: string;
  dotColor?: string;
  valueColor?: string;
  avatar?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, dotColor, valueColor, avatar }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>{label}</Text>
      <View style={styles.infoValueRow}>
        {dotColor && <View style={[styles.infoDot, { backgroundColor: dotColor }]} />}
        {avatar && <Avatar name={value || 'U'} size={20} style={{ marginRight: 6 }} />}
        <Text
          style={[
            styles.infoValueText,
            {
              color: valueColor || colors.text,
              fontFamily: typography.fonts.medium,
            },
          ]}
        >
          {value || 'N/A'}
        </Text>
      </View>
    </View>
  );
};

function getStatusDetails(status?: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'completed' || s === 'done') {
    return { label: 'Completed', intent: 'success', color: '#10B981' };
  } else if (s === 'in progress' || s === 'in_progress') {
    return { label: 'In Progress', intent: 'primary', color: '#4F46E5' };
  } else if (s === 'pending acceptance' || s === 'pending') {
    return { label: 'Pending', intent: 'warning', color: '#F59E0B' };
  } else if (s === 'to do' || s === 'todo') {
    return { label: 'To Do', intent: 'info', color: '#3B82F6' };
  } else if (s === 'overdue') {
    return { label: 'Overdue', intent: 'danger', color: '#EF4444' };
  } else if (s === 'cancelled') {
    return { label: 'Cancelled', intent: 'neutral', color: '#64748B' };
  }
  return { label: status || 'To Do', intent: 'info', color: '#3B82F6' };
}

function getPriorityDetails(priority?: string) {
  const p = priority?.toLowerCase() || '';
  if (p === 'urgent' || p === 'critical') {
    return { color: '#8B5CF6', intent: 'danger' };
  } else if (p === 'high') {
    return { color: '#EF4444', intent: 'danger' };
  } else if (p === 'medium') {
    return { color: '#F59E0B', intent: 'warning' };
  } else {
    return { color: '#10B981', intent: 'success' };
  }
}

function getTaskIcon(title?: string): keyof typeof Ionicons.glyphMap {
  const t = title?.toLowerCase() || '';
  if (t.includes('create') || t.includes('design') || t.includes('logo') || t.includes('ui/ux')) {
    return 'brush-outline';
  } else if (t.includes('chat') || t.includes('message')) {
    return 'chatbubble-outline';
  } else if (t.includes('test') || t.includes('bug') || t.includes('fix')) {
    return 'bug-outline';
  } else if (t.includes('mobile') || t.includes('app')) {
    return 'phone-portrait-outline';
  } else if (t.includes('report') || t.includes('progress') || t.includes('document')) {
    return 'document-text-outline';
  }
  return 'document-text-outline';
}

function getFileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'document-outline';
  if (ext === 'xlsx' || ext === 'xls') return 'grid-outline';
  if (ext === 'zip' || ext === 'rar') return 'archive-outline';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return 'image-outline';
  return 'document-attach-outline';
}

function getFileBg(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '#EF4444'; // Red
  if (ext === 'xlsx' || ext === 'xls') return '#10B981'; // Green
  if (ext === 'zip' || ext === 'rar') return '#8B5CF6'; // Purple
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return '#3B82F6'; // Blue
  return '#64748B'; // Gray
}

function getActivityActionTitle(action: string, details: string): string {
  if (action === 'assigned') return 'Task assigned';
  if (action === 'accepted') return 'Task accepted';
  if (action === 'started') return 'Task started';
  if (action === 'status_updated') return details || 'Status changed';
  if (action === 'comment_added') return 'Comment added';
  if (action === 'attachment_uploaded') return 'Attachment added';
  if (action === 'progress_updated') return 'Progress updated';
  return details || 'Activity logged';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
  },
  moreHeaderBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  topCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  topCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topCardHeaderRight: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  taskName: {
    fontSize: 15,
    marginBottom: 2,
  },
  taskSubtext: {
    fontSize: 11,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  timelineCol: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 12,
  },
  timelineDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  progressRow: {
    width: '100%',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValueText: {
    fontSize: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  sectionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  readMoreText: {
    fontSize: 12,
  },
  infoTable: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  infoValueText: {
    fontSize: 12,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistPercentText: {
    fontSize: 14,
  },
  checklistProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  checklistProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checklistTitle: {
    fontSize: 13,
    flex: 1,
  },
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  fileIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileTextWrapper: {
    flex: 1,
  },
  fileName: {
    fontSize: 12,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 10,
  },
  downloadBtn: {
    padding: 6,
  },
  emptySubSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllBtn: {
    alignSelf: 'center',
    marginTop: 12,
  },
  viewAllText: {
    fontSize: 12,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentSenderName: {
    fontSize: 12,
  },
  commentTime: {
    fontSize: 10,
  },
  commentTextMsg: {
    fontSize: 12,
    lineHeight: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  sendCommentBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  timelineList: {
    paddingLeft: 8,
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  timelineVisual: {
    alignItems: 'center',
    width: 16,
    marginRight: 10,
  },
  timelineVisualDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  timelineVisualLine: {
    width: 2,
    height: 40,
    marginTop: 4,
  },
  timelineItemContent: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  timelineItemUser: {
    fontSize: 10,
  },
  timelineItemTime: {
    fontSize: 10,
    textAlign: 'right',
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 200,
  },
  stickyStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  stickyStatusBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
  },
  statusOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statusOptionText: {
    fontSize: 14,
  },
});
