/**
 * @file projects.tsx
 * @description Screen 01: My Projects Dashboard.
 *              Displays premium project metrics, segmented donut chart, searching, pagination, 
 *              status filters, deadlines, and project lists.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import useTheme from '../../src/shared/hooks/useTheme';
import { useProjects } from '../../src/features/projects/hooks/useProjectsData';
import { useQueryClient } from '@tanstack/react-query';
import profileApi from '../../src/features/profile/api/profileApi';
import DonutChart from '../../src/features/projects/components/DonutChart';
import { Avatar } from '../../src/shared/components/Avatar';
import { toast } from '../../src/shared/components';
import { Project } from '../../src/features/projects/types';
import useAuthStore from '../../src/shared/store/authStore';
import { useQuickActionsStore } from '../../src/shared/store/quickActionsStore';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 6;

export default function MyProjectsScreen() {
  const { colors, spacing, radius, shadows, typography, isDark, setThemeMode } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user);

  // API query hook
  const { data: projects = [], isLoading, refetch, isRefetching } = useProjects();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<'All' | 'Year' | 'Month'>('Year');
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // Quick stats computed dynamically from backend data
  const stats = useMemo(() => {
    let list = projects;
    if (timeFilter === 'Year') {
      const currentYear = dayjs().year();
      list = projects.filter((p) => {
        const pYear = dayjs(p.startDate || p.createdAt).year();
        return pYear === currentYear;
      });
    } else if (timeFilter === 'Month') {
      const currentMonth = dayjs().month();
      const currentYear = dayjs().year();
      list = projects.filter((p) => {
        const d = dayjs(p.startDate || p.createdAt);
        return d.month() === currentMonth && d.year() === currentYear;
      });
    }

    const total = list.length;
    const inProgress = list.filter((p) => ['In Progress', 'Active'].includes(p.status as string)).length;
    const completed = list.filter((p) => (p.status as string) === 'Completed').length;
    const onHold = list.filter((p) => (p.status as string) === 'On Hold').length;
    const cancelled = list.filter((p) => (p.status as string) === 'Cancelled').length;
    const delayed = list.filter((p) => (p.status as string) === 'Delayed').length;

    const totalProgress = list.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const overallProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return {
      total,
      inProgress,
      completed,
      onHold,
      cancelled,
      delayed,
      overallProgress,
    };
  }, [projects, timeFilter]);

  // Donut chart segment structure
  const donutData = useMemo(() => {
    return [
      { label: 'In Progress', value: stats.inProgress, color: '#8B5CF6' }, // Purple
      { label: 'Completed', value: stats.completed, color: '#10B981' }, // Green
      { label: 'On Hold', value: stats.onHold, color: '#F59E0B' }, // Orange
      { label: 'Cancelled', value: stats.cancelled, color: '#EF4444' }, // Red
    ];
  }, [stats]);

  // Handle refresh callback
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        profileApi.fetchProfile(),
        refetch(),
      ]);
      toast.success('Projects refreshed successfully!');
    } catch {
      toast.error('Failed to reload projects.');
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  // Search & Status filters mapping
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Status filter
        if (selectedStatusFilter !== 'All') {
          if (selectedStatusFilter === 'In Progress' && !['In Progress', 'Active'].includes(project.status as string)) return false;
          if (selectedStatusFilter === 'Completed' && (project.status as string) !== 'Completed') return false;
          if (selectedStatusFilter === 'On Hold' && (project.status as string) !== 'On Hold') return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = project.name?.toLowerCase().includes(q);
          const matchesCode = project.projectCode?.toLowerCase().includes(q);
          const matchesId = project.id?.toLowerCase().includes(q);
          const matchesClient = project.client?.toLowerCase().includes(q);
          const matchesDept = project.department?.toLowerCase().includes(q);
          const matchesLeader = project.leader?.toLowerCase().includes(q);

          return matchesName || matchesCode || matchesId || matchesClient || matchesDept || matchesLeader;
        }

        return true;
      })
      .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime());
  }, [projects, selectedStatusFilter, searchQuery]);

  // Paginated projects
  const paginatedProjects = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));

  // Compute upcoming deadlines dynamically (any project that is not completed with a future deadline)
  const upcomingDeadlines = useMemo(() => {
    const activeProjects = projects.filter(
      (p) => (p.status as string) !== 'Completed' && (p.status as string) !== 'Cancelled' && p.deadline
    );
    return activeProjects
      .map((p) => {
        const remainingDays = dayjs(p.deadline).diff(dayjs(), 'day');
        return {
          ...p,
          remainingDays,
        };
      })
      .filter((p) => p.remainingDays >= 0)
      .sort((a, b) => a.remainingDays - b.remainingDays)
      .slice(0, 3);
  }, [projects]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── STICKY HEADER ─── */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>My Projects</Text>
        <View style={styles.headerRightRow}>
          <Pressable style={styles.headerBtn} onPress={() => setThemeMode(isDark ? 'light' : 'dark')}>
            <Ionicons name={isDark ? 'sunny' : 'moon-outline'} size={22} color={colors.text} />
          </Pressable>
          <Pressable style={[styles.headerBtn, { marginLeft: 8 }]} onPress={() => router.push('/profile' as any)}>
            <Avatar name={user?.name || 'User'} size={28} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ─── PROJECT SUMMARY GRADIENT CARD ─── */}
        <View style={[styles.gradientCardWrapper, shadows.medium]}>
          <View style={styles.gradientCardHeader}>
            <Text style={styles.gradientCardTitle}>PROJECT SUMMARY</Text>
            <Pressable
              onPress={() => setTimePickerVisible(!timePickerVisible)}
              style={styles.timeDropdown}
            >
              <Text style={styles.timeDropdownText}>
                {timeFilter === 'Year' ? 'This Year' : timeFilter === 'Month' ? 'This Month' : 'All Time'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Metric Grid */}
          <View style={styles.metricGrid}>
            <View style={styles.metricBox}>
              <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="folder-open" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.metricNum}>{stats.total}</Text>
              <Text style={styles.metricLabel}>Total Projects</Text>
            </View>

            <View style={styles.metricBox}>
              <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(139,92,246,0.25)' }]}>
                <Ionicons name="hourglass" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.metricNum}>{stats.inProgress}</Text>
              <Text style={styles.metricLabel}>In Progress</Text>
            </View>

            <View style={styles.metricBox}>
              <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.metricNum}>{stats.completed}</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
          </View>

          <View style={[styles.metricGrid, { marginTop: spacing.md }]}>
            <View style={styles.metricBox}>
              <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(245,158,11,0.25)' }]}>
                <Ionicons name="pause" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.metricNum}>{stats.onHold}</Text>
              <Text style={styles.metricLabel}>On Hold</Text>
            </View>

            <View style={styles.metricBox}>
              <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(239,110,110,0.25)' }]}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.metricNum}>{stats.cancelled}</Text>
              <Text style={styles.metricLabel}>Cancelled</Text>
            </View>

            <View style={styles.metricBox}>
              <View style={styles.overallProgressCircle}>
                <Text style={styles.overallProgressVal}>{stats.overallProgress}%</Text>
                <Text style={styles.overallProgressLbl}>Overall</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic selector list */}
        {timePickerVisible && (
          <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['All', 'Year', 'Month'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={styles.dropdownOption}
                onPress={() => {
                  setTimeFilter(mode);
                  setTimePickerVisible(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                  {mode === 'Year' ? 'This Year' : mode === 'Month' ? 'This Month' : 'All Time'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ─── PROJECT PROGRESS DONUT CHART CHART ─── */}
        {stats.total > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.chartCardTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Project Progress Overview
            </Text>
            <View style={styles.chartContentRow}>
              <DonutChart data={donutData} total={stats.total} size={130} />
              
              <View style={styles.chartLegend}>
                {donutData.map((item, idx) => {
                  const percentage = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                  return (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <View style={styles.legendTexts}>
                        <Text style={[styles.legendLabel, { color: colors.text, fontFamily: typography.fonts.medium }]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.legendVal, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                          {item.value} ({percentage}%)
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ─── SEARCH & FILTER ROW ─── */}
        <View style={styles.filterSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            My Projects ({filteredProjects.length})
          </Text>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
            <TextInput
              placeholder="Search by project name..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                setCurrentPage(1);
              }}
              style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
            />
          </View>
          <Pressable style={[styles.filterIconButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="funnel-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Filter Chips Horizontal list */}
        <View style={styles.chipsContainer}>
          {['All', 'In Progress', 'Completed', 'On Hold'].map((status) => {
            const isSelected = selectedStatusFilter === status;
            return (
              <Pressable
                key={status}
                onPress={() => {
                  setSelectedStatusFilter(status);
                  setCurrentPage(1);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textMuted,
                      fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium,
                    },
                  ]}
                >
                  {status}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── PROJECT CARDS LIST ─── */}
        {paginatedProjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>No Projects Found</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
              There are no projects that match your search filters.
            </Text>
          </View>
        ) : (
          paginatedProjects.map((item: Project) => {
            const daysLeft = dayjs(item.deadline).diff(dayjs(), 'day');
            const initials = item.name.substring(0, 2).toUpperCase();
            
            // Random-like theme for logo initials matching mockup
            const logoBg = item.status === 'Completed' ? '#10B981' : item.status === 'On Hold' ? '#F59E0B' : colors.primary;

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(app)/project-details?id=${item.id}` as any)}
                style={[styles.projectCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.light]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardLogoBox, { backgroundColor: logoBg }]}>
                    <Text style={styles.cardLogoText}>{initials}</Text>
                  </View>
                  <View style={styles.cardHeaderMiddle}>
                    <Text style={[styles.cardTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cardClientText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                      {item.client} • {item.department}
                    </Text>
                  </View>

                  <View style={styles.cardHeaderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            (item.status as string) === 'Completed'
                              ? 'rgba(16,185,129,0.1)'
                              : (item.status as string) === 'On Hold'
                              ? 'rgba(245,158,11,0.1)'
                              : (item.status as string) === 'Cancelled'
                              ? 'rgba(239,68,68,0.1)'
                              : 'rgba(139,92,246,0.1)',
                          borderColor:
                            (item.status as string) === 'Completed'
                              ? '#10B981'
                              : (item.status as string) === 'On Hold'
                              ? '#F59E0B'
                              : (item.status as string) === 'Cancelled'
                              ? '#EF4444'
                              : '#8B5CF6',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              (item.status as string) === 'Completed'
                                ? '#10B981'
                                : (item.status as string) === 'On Hold'
                                ? '#F59E0B'
                                : (item.status as string) === 'Cancelled'
                                ? '#EF4444'
                                : '#8B5CF6',
                            fontFamily: typography.fonts.bold,
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <Ionicons name="ellipsis-vertical" size={16} color={colors.textLight} style={{ marginTop: 8 }} />
                  </View>
                </View>

                {/* Progress bar info */}
                <View style={styles.cardProgressRow}>
                  <Text style={[styles.progressLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Overall Progress</Text>
                  <Text style={[styles.progressVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>{item.progress || 0}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E2E8F0' }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${item.progress || 0}%`,
                        backgroundColor: item.status === 'Completed' ? '#10B981' : colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* Card Footer displaying Dates, Days Remaining, and Avatars */}
                <View style={styles.cardFooter}>
                  <View style={styles.avatarGroup}>
                    {item.members &&
                      item.members.slice(0, 3).map((member, idx) => (
                        <View key={idx} style={[styles.stackedAvatar, { left: idx * -10 }]}>
                          <Avatar name={member} size={26} />
                        </View>
                      ))}
                    {item.members && item.members.length > 3 && (
                      <View style={[styles.moreMembersBadge, { left: 3 * -10, backgroundColor: colors.border }]}>
                        <Text style={[styles.moreMembersText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          +{item.members.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.footerDatesCol}>
                    <Text style={[styles.deadlineLabel, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>
                      {daysLeft >= 0 ? `${daysLeft} days left` : 'Overdue'}
                    </Text>
                    <Text style={[styles.dateText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                      {dayjs(item.deadline).format('DD MMM YYYY')}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

        {/* ─── CLIENT-SIDE PAGINATION ─── */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <Text style={[styles.paginationLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length}
            </Text>
            <View style={styles.pageButtonsRow}>
              <Pressable
                onPress={() => handlePageChange('prev')}
                disabled={currentPage === 1}
                style={[styles.pageBtn, { borderColor: colors.border }, currentPage === 1 && { opacity: 0.4 }]}
              >
                <Ionicons name="chevron-back" size={16} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => handlePageChange('next')}
                disabled={currentPage === totalPages}
                style={[styles.pageBtn, { borderColor: colors.border }, currentPage === totalPages && { opacity: 0.4 }]}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── UPCOMING DEADLINES SECTION ─── */}
        {upcomingDeadlines.length > 0 && (
          <View style={styles.deadlinesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>Upcoming Deadlines</Text>
              <Pressable>
                <Text style={[styles.seeAllLink, { color: colors.primary, fontFamily: typography.fonts.bold }]}>View All</Text>
              </Pressable>
            </View>

            {upcomingDeadlines.map((item) => (
              <View
                key={item.id}
                style={[styles.deadlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.deadlineDateBadge, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                  <Text style={[styles.dateDay, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    {dayjs(item.deadline).format('DD')}
                  </Text>
                  <Text style={[styles.dateMonth, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                    {dayjs(item.deadline).format('MMM').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.deadlineInfo}>
                  <Text style={[styles.deadlineTitle, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.deadlineSubtitle, { color: colors.textMuted, fontFamily: typography.fonts.regular }]} numberOfLines={1}>
                    {item.client} • Project Delivery
                  </Text>
                </View>

                <View style={styles.deadlineRight}>
                  <Text
                    style={[
                      styles.dueInText,
                      { color: item.remainingDays <= 7 ? colors.danger : '#F59E0B', fontFamily: typography.fonts.bold },
                    ]}
                  >
                    In {item.remainingDays} days
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── CUSTOM BOTTOM TAB BAR ─── */}
      <View style={[styles.bottomTabBar, { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        <Pressable style={styles.tabItem} onPress={() => router.replace('/(app)/(tabs)')}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.tabItemLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => router.replace('/(app)/(tabs)/work')}>
          <Ionicons name="checkbox-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.tabItemLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>My Tasks</Text>
        </Pressable>

        {/* Center Floating Plus Action button */}
        <Pressable
          style={styles.tabItem}
          onPress={() => {
            useQuickActionsStore.getState().openActions();
          }}
        >
          <View style={[styles.centerActionBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <Ionicons name="apps" size={24} color="#FFFFFF" />
          </View>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => router.replace('/(app)/(tabs)/inbox')}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.tabItemLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>Inbox</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => router.replace('/(app)/(tabs)/profile')}>
          <Ionicons name="person-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.tabItemLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>Profile</Text>
        </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gradientCardWrapper: {
    margin: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#4F46E5', // Fallback brand gradient base
  },
  gradientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gradientCardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  timeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  timeDropdownText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginRight: 4,
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 100,
    width: 130,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    fontSize: 13,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  overallProgressCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallProgressVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  overallProgressLbl: {
    fontSize: 8,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chartCardTitle: {
    fontSize: 15,
    marginBottom: 16,
  },
  chartContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartLegend: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  legendTexts: {
    marginLeft: 8,
  },
  legendLabel: {
    fontSize: 11,
  },
  legendVal: {
    fontSize: 11,
    marginTop: 1,
  },
  filterSectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  projectCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardHeaderMiddle: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cardTitleText: {
    fontSize: 15,
  },
  cardClientText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  cardProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
  },
  progressVal: {
    fontSize: 12,
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 13,
    overflow: 'hidden',
  },
  moreMembersBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreMembersText: {
    fontSize: 10,
  },
  footerDatesCol: {
    alignItems: 'flex-end',
  },
  deadlineLabel: {
    fontSize: 10,
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  paginationLabel: {
    fontSize: 12,
  },
  pageButtonsRow: {
    flexDirection: 'row',
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  deadlinesSection: {
    marginTop: 12,
  },
  seeAllLink: {
    fontSize: 12,
  },
  deadlineCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 14,
  },
  dateMonth: {
    fontSize: 8,
    marginTop: 1,
  },
  deadlineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deadlineTitle: {
    fontSize: 13,
  },
  deadlineSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  deadlineRight: {
    alignItems: 'flex-end',
  },
  dueInText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabItemLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  centerActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
