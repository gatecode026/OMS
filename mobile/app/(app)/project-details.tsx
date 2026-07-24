/**
 * @file project-details.tsx
 * @description Screen 02: Project Details Screen.
 *              Displays extensive metadata, segmented tabs (Overview, Team & Tasks, Docs & Files),
 *              task listings, team member roles, document downloads, activity timelines, and progress.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useTheme from '../../src/shared/hooks/useTheme';
import { useProjectDetails } from '../../src/features/projects/hooks/useProjectsData';
import { Avatar } from '../../src/shared/components/Avatar';
import { toast, ErrorState } from '../../src/shared/components';
import { ProjectTask, ProjectDocument } from '../../src/features/projects/types';
const { width } = Dimensions.get('window');
export default function ProjectDetailsScreen() {
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Fetch project details with automatic query list fallback mapping on 403
  const { data: project, isLoading, error, refetch, isRefetching } = useProjectDetails(id || '');
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'team_tasks' | 'docs_files'>('overview');
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Compute sub-statistics dynamically
  const taskStats = useMemo(() => {
    if (!project?.tasks) {
      return { total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 };
    }
    const total = project.tasks.length;
    const completed = project.tasks.filter((t) => t.completed || t.status === 'Completed' || t.status === 'Done').length;
    const pending = project.tasks.filter((t) => !t.completed && t.status !== 'Completed' && t.status !== 'Done').length;
    
    // Check if task is overdue (has a deadline that is in the past, and not completed)
    const overdue = project.tasks.filter((t) => {
      if (t.completed || t.status === 'Completed' || t.status === 'Done') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate,
    };
  }, [project]);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Project details updated!');
    } catch {
      toast.error('Failed to update project details.');
    }
  };

  // Mock download trigger
  const handleDownloadFile = (doc: ProjectDocument) => {
    toast.info(`Downloading ${doc.name}...`);
    setTimeout(() => {
      if (doc.downloadUrl) {
        Linking.openURL(doc.downloadUrl).catch(() => {
          toast.success(`${doc.name} saved to local storage!`);
        });
      } else {
        toast.success(`${doc.name} downloaded successfully!`);
      }
    }, 1200);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.medium }}>Loading project details...</Text>
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <ErrorState message="Could not load project details. Please check connection." onRetry={refetch} />
        </View>
      </View>
    );
  }

  const daysDuration = dayjs(project.deadline).diff(dayjs(project.startDate), 'day');
  const projectInitials = project.name.substring(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.headerTitleText, { fontFamily: typography.fonts.bold }]}>Project Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#FFFFFF" />}
      >
        {/* ─── PROJECT INFORMATION CARD (PURPLE GRADIENT) ─── */}
        <View style={[styles.gradientHeaderCard, shadows.medium]}>
          <View style={styles.gradientHeaderTop}>
            <View style={styles.logoAndName}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>{projectInitials}</Text>
              </View>
              <View style={styles.nameAndCode}>
                <Text style={styles.projectCodeText}>{project.projectCode || project.id}</Text>
                <Text style={styles.projectNameText} numberOfLines={1}>{project.name}</Text>
                <Text style={styles.projectClientText}>{project.client}</Text>
              </View>
            </View>

            <View style={styles.statusBadgeCol}>
              <View style={[styles.badgeContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.badgeText}>● {project.status}</Text>
              </View>
            </View>
          </View>

          {/* Tags Grid row */}
          <View style={styles.tagsRow}>
            <View style={styles.miniTag}>
              <Ionicons name="alert-circle-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.miniTagText}>{project.priority} Priority</Text>
            </View>
            <View style={styles.miniTag}>
              <Ionicons name="business-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.miniTagText}>{project.department}</Text>
            </View>
          </View>

          {/* Dates & Duration Grid */}
          <View style={styles.datesGrid}>
            <View style={styles.dateCol}>
              <Text style={styles.dateGridLabel}>START DATE</Text>
              <Text style={styles.dateGridVal}>{dayjs(project.startDate).format('DD MMM YYYY')}</Text>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateGridLabel}>END DATE</Text>
              <Text style={styles.dateGridVal}>{dayjs(project.deadline).format('DD MMM YYYY')}</Text>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateGridLabel}>DURATION</Text>
              <Text style={styles.dateGridVal}>{daysDuration ? `${daysDuration} Days` : '—'}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelsRow}>
              <Text style={styles.progressGridLabel}>Overall Progress</Text>
              <Text style={styles.progressGridVal}>{project.progress || 0}%</Text>
            </View>
            <View style={styles.progressGridBarBg}>
              <View style={[styles.progressGridBarFill, { width: `${project.progress || 0}%` }]} />
            </View>
          </View>
        </View>

        {/* ─── Expandable Description Block ─── */}
        <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.light]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>Description</Text>
          <Text
            style={[styles.descText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}
            numberOfLines={isDescExpanded ? undefined : 3}
          >
            {project.description || 'No description provided.'}
          </Text>
          {project.description && project.description.length > 120 && (
            <Pressable onPress={() => setIsDescExpanded(!isDescExpanded)} style={{ marginTop: spacing.xs }}>
              <Text style={[styles.readMoreText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                {isDescExpanded ? 'Read Less' : 'Read More'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ─── SEGMENTED TABS SELECTOR ─── */}
        <View style={styles.tabsWrapper}>
          {(['overview', 'team_tasks', 'docs_files'] as const).map((tab) => {
            const isSelected = activeTab === tab;
            const label = tab === 'overview' ? 'Overview' : tab === 'team_tasks' ? 'Team & Tasks' : 'Docs & Files';
            const icon = tab === 'overview' ? 'apps-outline' : tab === 'team_tasks' ? 'people-outline' : 'document-text-outline';
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, isSelected && { borderBottomColor: colors.primary }]}
              >
                <Ionicons name={icon as any} size={16} color={isSelected ? colors.primary : colors.textLight} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.tabLabelText,
                    {
                      color: isSelected ? colors.primary : colors.textMuted,
                      fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── TAB CONTENT PANELS ─── */}

        {/* 1. OVERVIEW TAB PANEL */}
        {activeTab === 'overview' && (
          <View style={styles.tabContentPanel}>
            {/* Task stats grid */}
            <View style={styles.statsGridRow}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="clipboard" size={20} color={colors.primary} />
                <Text style={[styles.statNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>{taskStats.total}</Text>
                <Text style={[styles.statLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Total Tasks</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.statNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>{taskStats.completed}</Text>
                <Text style={[styles.statLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Completed Tasks</Text>
              </View>
            </View>

            <View style={[styles.statsGridRow, { marginTop: spacing.md }]}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="time" size={20} color={colors.warning} />
                <Text style={[styles.statNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>{taskStats.pending}</Text>
                <Text style={[styles.statLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Pending Tasks</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={[styles.statNum, { color: colors.text, fontFamily: typography.fonts.bold }]}>{taskStats.overdue}</Text>
                <Text style={[styles.statLabelText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Overdue Tasks</Text>
              </View>
            </View>

            {/* Team Members List preview */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>Team Members</Text>
              <Pressable onPress={() => setActiveTab('team_tasks')}>
                <Text style={[styles.viewAllText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>View All</Text>
              </Pressable>
            </View>

            <View style={[styles.membersPreviewRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
                {project.members && project.members.map((member, idx) => (
                  <View key={idx} style={styles.memberBubbleCol}>
                    <Avatar name={member} size={42} />
                    <Text style={[styles.memberBubbleName, { color: colors.text, fontFamily: typography.fonts.medium }]} numberOfLines={1}>
                      {member.split(' ')[0]}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Milestones list section */}
            {project.milestonesTotal !== undefined && (
              <View style={styles.milestonesSection}>
                <Text style={[styles.sectionTitleText, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.sm }]}>
                  Milestones Progress
                </Text>
                <View style={[styles.milestonesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.milestoneMetric}>
                    <Text style={[styles.milestoneLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Completed Milestones</Text>
                    <Text style={[styles.milestoneVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {project.milestonesCompleted || 0} / {project.milestonesTotal || 0}
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E2E8F0', marginTop: spacing.xs }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${project.milestonesTotal > 0 ? ((project.milestonesCompleted || 0) / project.milestonesTotal) * 100 : 0}%`,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Recent task feed preview */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>Recent Tasks</Text>
              <Pressable onPress={() => setActiveTab('team_tasks')}>
                <Text style={[styles.viewAllText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>View All</Text>
              </Pressable>
            </View>

            {!project.tasks || project.tasks.length === 0 ? (
              <Text style={[styles.noItemsText, { color: colors.textLight }]}>No tasks assigned to this project.</Text>
            ) : (
              project.tasks.slice(0, 3).map((task: ProjectTask) => (
                <View
                  key={task.id}
                  style={[styles.taskItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.taskCardLeft}>
                    <Ionicons
                      name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={task.completed ? colors.success : colors.textLight}
                      style={{ marginRight: spacing.sm }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                        {task.title}
                      </Text>
                      {task.dueDate && (
                        <Text style={[styles.taskDateText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                          Due {dayjs(task.dueDate).format('DD MMM YYYY')}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.taskCardRight}>
                    <View
                      style={[
                        styles.taskStatusMiniBadge,
                        {
                          backgroundColor: task.completed ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
                          borderColor: task.completed ? '#10B981' : '#8B5CF6',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 9, color: task.completed ? '#10B981' : '#8B5CF6', fontFamily: typography.fonts.bold }}>
                        {task.completed ? 'COMPLETED' : 'IN PROGRESS'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 2. TEAM & TASKS PANEL */}
        {activeTab === 'team_tasks' && (
          <View style={styles.tabContentPanel}>
            <Text style={[styles.sectionTitleText, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }]}>
              Team Members
            </Text>

            {project.members && project.members.map((member, idx) => (
              <View
                key={idx}
                style={[styles.memberRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Avatar name={member} size={38} />
                <View style={styles.memberRowInfo}>
                  <Text style={[styles.memberNameText, { color: colors.text, fontFamily: typography.fonts.bold }]}>{member}</Text>
                  <Text style={[styles.memberRoleText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                    {idx === 0 ? 'Project Manager' : idx === 1 ? 'Team Leader' : 'Developer'}
                  </Text>
                </View>
                <View style={[styles.badgeContainer, { backgroundColor: colors.neutralLight, borderColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.textMuted }]}>Member</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.sectionTitleText, { color: colors.text, fontFamily: typography.fonts.bold, marginTop: spacing.xl, marginBottom: spacing.md }]}>
              Project Task Checklist ({taskStats.completed}/{taskStats.total})
            </Text>

            {!project.tasks || project.tasks.length === 0 ? (
              <Text style={[styles.noItemsText, { color: colors.textLight }]}>No tasks created yet.</Text>
            ) : (
              project.tasks.map((task: ProjectTask) => (
                <View
                  key={task.id}
                  style={[styles.taskChecklistItemRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons
                    name={task.completed ? 'checkmark-circle' : 'square-outline'}
                    size={22}
                    color={task.completed ? colors.success : colors.textLight}
                    style={{ marginRight: spacing.sm }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.taskChecklistTitle,
                        {
                          color: task.completed ? colors.textLight : colors.text,
                          textDecorationLine: task.completed ? 'line-through' : 'none',
                          fontFamily: typography.fonts.semibold,
                        },
                      ]}
                    >
                      {task.title}
                    </Text>
                    {task.assigneeName && (
                      <Text style={[styles.taskChecklistAssignee, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                        Assignee: {task.assigneeName}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.priorityBadgeMini, { borderColor: task.priority === 'Urgent' || task.priority === 'High' ? colors.danger : colors.border }]}>
                    <Text style={{ fontSize: 9, color: task.priority === 'Urgent' || task.priority === 'High' ? colors.danger : colors.textMuted, fontFamily: typography.fonts.bold }}>
                      {task.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 3. DOCUMENTS PANEL */}
        {activeTab === 'docs_files' && (
          <View style={styles.tabContentPanel}>
            <Text style={[styles.sectionTitleText, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }]}>
              Project Documents
            </Text>

            {!project.documents || project.documents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={44} color={colors.textLight} />
                <Text style={[styles.noItemsText, { color: colors.textLight, marginTop: spacing.sm }]}>No documents uploaded to this project.</Text>
              </View>
            ) : (
              project.documents.map((doc: ProjectDocument, idx: number) => {
                const docType = doc.type?.toLowerCase() || '';
                let fileIcon = 'document-outline';
                let iconColor = colors.primary;

                if (docType.includes('pdf')) {
                  fileIcon = 'document-text';
                  iconColor = colors.danger;
                } else if (docType.includes('xls') || docType.includes('sheet') || docType.includes('csv')) {
                  fileIcon = 'grid';
                  iconColor = colors.success;
                } else if (docType.includes('zip') || docType.includes('rar') || docType.includes('compressed')) {
                  fileIcon = 'archive';
                  iconColor = '#F59E0B';
                }

                return (
                  <View
                    key={idx}
                    style={[styles.documentRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.docIconBox, { backgroundColor: `${iconColor}15` }]}>
                      <Ionicons name={fileIcon as any} size={22} color={iconColor} />
                    </View>

                    <View style={styles.docRowInfo}>
                      <Text style={[styles.docNameText, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <Text style={[styles.docMetaText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                        {doc.size || 'Unknown size'} • Uploaded by {doc.uploadedBy || 'HR'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleDownloadFile(doc)}
                      style={[styles.docDownloadBtn, { borderColor: colors.border }]}
                    >
                      <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Bottom view-only information bar */}
      <View style={[styles.bottomActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.statusInfoRow}>
          <Ionicons name="lock-closed" size={14} color={colors.textLight} style={{ marginRight: 6 }} />
          <Text style={[styles.bottomInfoText, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
            View-Only Access Enabled
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#4F46E5', // Fluid match for top info gradient
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  gradientHeaderCard: {
    backgroundColor: '#4F46E5', // Indigo gradient base
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    padding: 20,
    paddingBottom: 26,
  },
  gradientHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  logoAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nameAndCode: {
    marginLeft: 14,
    flex: 1,
  },
  projectCodeText: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  projectNameText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  projectClientText: {
    color: '#FFFFFF',
    opacity: 0.85,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadgeCol: {
    alignItems: 'flex-end',
  },
  badgeContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  miniTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  dateCol: {
    flex: 1,
  },
  dateGridLabel: {
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 9,
    fontWeight: 'bold',
  },
  dateGridVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
  },
  progressSection: {
    marginTop: 24,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressGridLabel: {
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 11,
    fontWeight: '600',
  },
  progressGridVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressGridBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: '100%',
    overflow: 'hidden',
  },
  progressGridBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  descCard: {
    margin: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardSectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
  },
  readMoreText: {
    fontSize: 12,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabelText: {
    fontSize: 12,
  },
  tabContentPanel: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginRight: 10,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    marginTop: 8,
  },
  statLabelText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 15,
  },
  viewAllText: {
    fontSize: 12,
  },
  membersPreviewRow: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  memberBubbleCol: {
    alignItems: 'center',
    width: 65,
    marginRight: 10,
  },
  memberBubbleName: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  milestonesSection: {
    marginTop: 24,
  },
  milestonesCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  milestoneMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneLabel: {
    fontSize: 12,
  },
  milestoneVal: {
    fontSize: 13,
  },
  noItemsText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  taskCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskTitleText: {
    fontSize: 13,
  },
  taskDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  taskCardRight: {
    alignItems: 'flex-end',
  },
  taskStatusMiniBadge: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  memberRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameText: {
    fontSize: 13,
  },
  memberRoleText: {
    fontSize: 11,
    marginTop: 2,
  },
  taskChecklistItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  taskChecklistTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  taskChecklistAssignee: {
    fontSize: 10,
    marginTop: 4,
  },
  priorityBadgeMini: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  documentRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  docNameText: {
    fontSize: 13,
  },
  docMetaText: {
    fontSize: 10,
    marginTop: 2,
  },
  docDownloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomInfoText: {
    fontSize: 12,
  },
});
