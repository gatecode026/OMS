/**
 * @file leave.tsx
 * @description Enterprise Leave Management Screen.
 *              Displays leave summary stats, policy balances, and filtered leave request logs.
 *              Supports light/dark theme matching approved visual hierarchy.
 *              Now located in (tabs) to show the bottom tab bar.
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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

import useTheme from '../../../src/shared/hooks/useTheme';
import useBranding from '../../../src/shared/hooks/useBranding';
import useAuthStore from '../../../src/shared/store/authStore';
import {
  useLeaveRequests,
  useLeavePolicies,
  useCancelLeaveRequest,
} from '../../../src/features/leaves/hooks/useLeaves';
import {
  Card,
  Tag,
  Skeleton,
  EmptyState,
  ErrorState,
} from '../../../src/shared/components';

type StatusTab = 'Pending' | 'Approved' | 'Rejected' | 'History';

export default function LeaveManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const { companyName } = useBranding();

  const formatDays = (days: number) => {
    return days % 1 === 0 ? days.toFixed(0) : days.toFixed(1);
  };
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<StatusTab>('Pending');
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const {
    data: requests = [],
    isLoading: isLoadingRequests,
    isError: isErrorRequests,
    refetch: refetchRequests,
  } = useLeaveRequests(user?.id);

  const {
    data: policies = [],
    isLoading: isLoadingPolicies,
    isError: isErrorPolicies,
    refetch: refetchPolicies,
  } = useLeavePolicies();

  const cancelMutation = useCancelLeaveRequest();

  // Pull-to-Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leaves'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
    setRefreshing(false);
  };

  // ─── Leave Balance & Summary Stats Calculations ────────────────────────────
  const { balances, stats } = useMemo(() => {
    let availableBalance = 0;
    let leavesUsed = 0;
    let pendingApproval = 0;
    let approvedFilings = 0;

    // Filter requests for calculations
    const myRequests = requests.filter((r) => r.employeeId === user?.id);

    const calculatedBalances = policies.map((policy) => {
      const entitlement = policy.defaultDays || 0;
      const carryForward = policy.maxCarryForward || 0;
      const total = entitlement + carryForward;

      // Filter matching requests
      const matchingApproved = myRequests.filter(
        (r) =>
          r.type.toLowerCase().trim() === policy.leaveName.toLowerCase().trim() &&
          r.status === 'Approved'
      );
      const matchingPending = myRequests.filter(
        (r) =>
          r.type.toLowerCase().trim() === policy.leaveName.toLowerCase().trim() &&
          r.status === 'Pending'
      );

      const used = matchingApproved.reduce((sum, r) => sum + (r.days || 0), 0);
      const pending = matchingPending.reduce((sum, r) => sum + (r.days || 0), 0);
      const remaining = Math.max(0, total - used);

      availableBalance += remaining;
      leavesUsed += used;
      pendingApproval += pending;

      return {
        policy,
        total,
        used,
        pending,
        remaining,
        progress: total > 0 ? remaining / total : 0,
      };
    });

    approvedFilings = myRequests.filter((r) => r.status === 'Approved').length;

    // If availableBalance is 0 and no policies exist, default/mock fallback just for visual rendering
    if (policies.length === 0) {
      return {
        balances: [
          {
            policy: {
              id: 'POL-003',
              isPolicy: true,
              leaveCode: 'PL',
              leaveName: 'Paid Leave',
              defaultDays: 2,
              maxCarryForward: 0,
              isActive: true,
              description: 'Annual paid leave cycle',
            },
            total: 2,
            used: 0,
            pending: 0,
            remaining: 2,
            progress: 1.0,
          },
        ],
        stats: {
          availableBalance: 2,
          leavesUsed: 0,
          pendingApproval: 0,
          approvedFilings: 0,
        },
      };
    }

    return {
      balances: calculatedBalances,
      stats: {
        availableBalance,
        leavesUsed,
        pendingApproval,
        approvedFilings,
      },
    };
  }, [policies, requests, user?.id]);

  // ─── Filter requests list based on selected Tab ───────────────────────────
  const filteredRequests = useMemo(() => {
    const myRequests = requests.filter((r) => r.employeeId === user?.id);
    if (activeTab === 'History') {
      return myRequests;
    }
    return myRequests.filter(
      (r) => r.status.toLowerCase() === activeTab.toLowerCase()
    );
  }, [requests, activeTab, user?.id]);

  // ─── Withdraw Request Handler ─────────────────────────────────────────────
  const handleCancelRequest = (requestId: string) => {
    cancelMutation.mutate(
      { id: requestId, status: 'Cancelled', approverNotes: 'Withdrawn by employee' },
      {
        onSuccess: () => {
          // Success handled in hook invalidation
        },
        onError: (err: any) => {
          alert(
            err.response?.data?.message ||
              'Unable to withdraw request. Please contact your manager or HR department.'
          );
        },
      }
    );
  };

  const isLoading = isLoadingRequests || isLoadingPolicies;
  const isError = isErrorRequests || isErrorPolicies;

  const getStatusBadgeIntent = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      case 'cancelled':
      default:
        return 'neutral';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Sticky Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          Leave Management
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
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
        {/* Title */}
        <View style={[styles.titleSection, { paddingHorizontal: spacing.lg, marginTop: spacing.md }]}>
          <Text style={[styles.titleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            My Leaves
          </Text>
          <Text style={[styles.subtitleText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
            Overview of your time-off status
          </Text>
        </View>

        {isError ? (
          <View style={{ padding: spacing.xl }}>
            <ErrorState
              title="Connection Error"
              message="Failed to load leaves dashboard. Please check your network and try again."
              onRetry={handleRefresh}
            />
          </View>
        ) : isLoading ? (
          /* SKELETON LOADER STATE */
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.md }}>
            <View style={styles.statsGrid}>
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
            </View>
            <View style={styles.statsGrid}>
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
              <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
            </View>
            <Skeleton height={160} borderRadius={20} />
            <Skeleton height={40} borderRadius={20} style={{ marginTop: spacing.md }} />
            <Skeleton height={100} borderRadius={16} style={{ marginTop: spacing.md }} />
          </View>
        ) : (
          <View>
            {/* ─── 1. Stats Summary Cards Grid (Premium & Spacious) ─── */}
            <View style={[styles.statsGridContainer, { paddingHorizontal: spacing.lg, marginTop: spacing.md }]}>
              <View style={styles.statsRow}>
                {/* Available Balance */}
                <View style={[styles.statsCard, { backgroundColor: colors.surface }, shadows.light]}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="wallet-outline" size={13} color="#4F46E5" />
                  </View>
                  <View style={styles.statsTextCol}>
                    <Text style={[styles.statsValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {formatDays(stats.availableBalance)}{' '}<Text style={styles.statsUnit}>Days</Text>
                    </Text>
                    <Text style={[styles.statsLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                      AVAILABLE BALANCE
                    </Text>
                  </View>
                </View>

                {/* Leaves Used */}
                <View style={[styles.statsCard, { backgroundColor: colors.surface }, shadows.light]}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="calendar-outline" size={13} color="#2563EB" />
                  </View>
                  <View style={styles.statsTextCol}>
                    <Text style={[styles.statsValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {formatDays(stats.leavesUsed)}{' '}<Text style={styles.statsUnit}>Days</Text>
                    </Text>
                    <Text style={[styles.statsLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                      LEAVES USED
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsRow, { marginTop: 8 }]}>
                {/* Pending Approval */}
                <View style={[styles.statsCard, { backgroundColor: colors.surface }, shadows.light]}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="clipboard-outline" size={13} color="#10B981" />
                  </View>
                  <View style={styles.statsTextCol}>
                    <Text style={[styles.statsValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {formatDays(stats.pendingApproval)}{' '}<Text style={styles.statsUnit}>Days</Text>
                    </Text>
                    <Text style={[styles.statsLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                      PENDING APPROVAL
                    </Text>
                  </View>
                </View>

                {/* Approved Filings */}
                <View style={[styles.statsCard, { backgroundColor: colors.surface }, shadows.light]}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#8B5CF6" />
                  </View>
                  <View style={styles.statsTextCol}>
                    <Text style={[styles.statsValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {stats.approvedFilings}{' '}<Text style={styles.statsUnit}>Filings</Text>
                    </Text>
                    <Text style={[styles.statsLabel, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                      APPROVED FILINGS
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ─── 2. Leave Balance Cards (Days wrapping fixed) ─── */}
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              {balances.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.balanceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                    },
                    shadows.light,
                  ]}
                >
                  {/* Left Accent Bar */}
                  <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

                  {/* Card Content */}
                  <View style={styles.balanceCardBody}>
                    <View style={styles.balanceHeader}>
                      <Text style={[styles.leaveName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                        {item.policy.leaveName}
                      </Text>
                      <View style={[styles.activeBadge, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[styles.activeBadgeText, { color: '#4F46E5', fontFamily: typography.fonts.bold }]}>
                          Active
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.annualCycle, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
                      Annual cycle: Jan 1 - Dec 31
                    </Text>

                    <View style={styles.remainingRow}>
                      <View style={styles.remainingLeft}>
                        <Text style={[styles.remainingVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {formatDays(item.remaining)}{' '}
                          <Text style={[styles.remainingLbl, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                            Days remaining
                          </Text>
                        </Text>
                      </View>
                      <View style={styles.remainingRight}>
                        <Text style={[styles.totalRatioText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>
                          Used: {formatDays(item.used)} / Total: {formatDays(item.total)}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar Fill */}
                    <View style={[styles.progressTrack, { backgroundColor: colors.neutralLight }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${item.progress * 100}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.entitlementFooter}>
                      <View>
                        <Text style={[styles.entitlementLabel, { color: colors.textLight, fontFamily: typography.fonts.bold }]}>
                          ANNUAL ENTITLEMENT
                        </Text>
                        <Text style={[styles.entitlementVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {formatDays(item.policy.defaultDays || 0)} Days
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.entitlementLabel, { color: colors.textLight, fontFamily: typography.fonts.bold }]}>
                          CARRY FORWARD
                        </Text>
                        <Text style={[styles.entitlementVal, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {formatDays(item.policy.maxCarryForward || 0)} Days
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* ─── 3. Status Tabs (One Screen Flex Row - Scroll-free) ─── */}
            <View style={[styles.tabsWrapper, { marginTop: spacing.md, paddingHorizontal: spacing.lg }]}>
              <View style={styles.tabsRowContainer}>
                {(['Pending', 'Approved', 'Rejected', 'History'] as StatusTab[]).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[
                        styles.tabButton,
                        {
                          backgroundColor: isActive ? colors.surface : 'transparent',
                          borderColor: isActive ? colors.border : 'transparent',
                        },
                        isActive && shadows.light,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          {
                            color: isActive ? colors.primary : colors.textMuted,
                            fontFamily: isActive ? typography.fonts.bold : typography.fonts.semibold,
                          },
                        ]}
                      >
                        {tab}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ─── 4. Leave Requests List ─── */}
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
              {filteredRequests.length === 0 ? (
                /* Empty state matching the premium 3D illustration */
                <View style={[styles.emptyContainer, { marginTop: spacing.lg }]}>
                  <View style={[styles.illustrationCard, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                    <Ionicons name="calendar-outline" size={40} color="#4F46E5" style={{ opacity: 0.8 }} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    No {activeTab.toLowerCase() !== 'history' ? activeTab.toLowerCase() : ''} leave requests
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                    {activeTab === 'Pending'
                      ? "You don't have any requests waiting for approval. Relax and enjoy your productive day!"
                      : `You don't have any leave requests in this category.`}
                  </Text>
                </View>
              ) : (
                filteredRequests.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                      },
                      shadows.light,
                    ]}
                  >
                    <View style={styles.requestHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reqType, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {item.type}
                        </Text>
                        <Text style={[styles.reqRange, { color: colors.textLight, fontFamily: typography.fonts.semibold }]}>
                          {dayjs(item.fromDate).format('MMM DD')} - {dayjs(item.toDate).format('MMM DD, YYYY')}
                        </Text>
                      </View>
                      <Tag intent={getStatusBadgeIntent(item.status)} label={item.status} />
                    </View>

                    <Text
                      style={[
                        styles.reqReason,
                        { color: colors.textMuted, fontFamily: typography.fonts.regular },
                      ]}
                      numberOfLines={2}
                    >
                      Reason: {item.reason}
                    </Text>

                    <View style={styles.reqFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reqAppliedDate, { color: colors.textLight, fontFamily: typography.fonts.regular }]}>
                          Applied on: {dayjs(item.appliedDate).format('MMM DD, YYYY')}
                        </Text>
                        <Text style={[styles.reqDaysCount, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                          Duration: {item.days} {item.days === 1 ? 'Day' : 'Days'}
                        </Text>
                      </View>

                      {/* Edit / Withdraw buttons for pending requests */}
                      {item.status === 'Pending' && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {/* Edit */}
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '/apply-leave' as any,
                                params: {
                                  editId: item.id,
                                  type: item.type,
                                  fromDate: item.fromDate,
                                  toDate: item.toDate,
                                  reason: item.reason,
                                },
                              })
                            }
                            style={[styles.editBtn, { borderColor: colors.primary }]}
                          >
                            <Ionicons name="pencil-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.editText, { color: colors.primary, fontFamily: typography.fonts.semibold }]}>
                              Edit
                            </Text>
                          </Pressable>

                          {/* Withdraw */}
                          <Pressable
                            onPress={() => handleCancelRequest(item.id)}
                            disabled={cancelMutation.isPending}
                            style={[styles.withdrawBtn, { borderColor: colors.danger }]}
                          >
                            {cancelMutation.isPending ? (
                              <ActivityIndicator size="small" color={colors.danger} />
                            ) : (
                              <Text style={[styles.withdrawText, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>
                                Withdraw
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {item.approverNotes ? (
                      <View style={[styles.approverNotesBox, { backgroundColor: colors.neutralLight }]}>
                        <Text style={[styles.approverNotesText, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                          Note: {item.approverNotes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Apply Leave Button — bottom-right pill */}
      <Pressable
        onPress={() => router.push('/apply-leave' as any)}
        style={[
          styles.floatingApplyBtn,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 25 ,
            right: 16,
          },
          shadows.medium,
        ]}
      >
        <Ionicons name="add-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={[styles.floatingApplyBtnText, { fontFamily: typography.fonts.bold }]}>
          APPLY FOR LEAVE
        </Text>
      </Pressable>
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
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 32,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleSection: {
    marginBottom: 8,
  },
  titleText: {
    fontSize: 22,
  },
  subtitleText: {
    fontSize: 13,
    marginTop: 2,
  },
  statsGridContainer: {
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsTextCol: {
    flex: 1,
  },
  statsUnit: {
    fontSize: 7,
    color: '#6B7280',
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  statsLabel: {
    fontSize: 8,
    letterSpacing: 0.2,
    lineHeight: 11,
    marginTop: 2,
  },
  balanceCard: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
    height: '100%',
  },
  balanceCardBody: {
    flex: 1,
    padding: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveName: {
    fontSize: 16,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  annualCycle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  remainingLeft: {
    flex: 1,
  },
  remainingVal: {
    fontSize: 22,
    lineHeight: 26,
  },
  remainingLbl: {
    fontSize: 13,
  },
  remainingRight: {
    alignItems: 'flex-end',
  },
  totalRatioText: {
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  entitlementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  entitlementLabel: {
    fontSize: 8,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  entitlementVal: {
    fontSize: 12,
  },
  tabsWrapper: {
    height: 38,
    justifyContent: 'center',
  },
  tabsRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  illustrationCard: {
    width: 100,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  floatingApplyBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 30,
  },
  floatingApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  requestCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reqType: {
    fontSize: 15,
  },
  reqRange: {
    fontSize: 12,
    marginTop: 2,
  },
  reqReason: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  reqFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  reqAppliedDate: {
    fontSize: 11,
    marginBottom: 2,
  },
  reqDaysCount: {
    fontSize: 12,
  },
  withdrawBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  withdrawText: {
    fontSize: 12,
  },
  editBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 68,
  },
  editText: {
    fontSize: 12,
  },
  approverNotesBox: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
  },
  approverNotesText: {
    fontSize: 11,
  },
});
