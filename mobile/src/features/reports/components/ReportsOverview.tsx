/**
 * @file src/features/reports/components/ReportsOverview.tsx
 * @description Reports & Analytics Overview Dashboard with top notch spacing, back button, and real DB data rendering.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useTheme from '../../../shared/hooks/useTheme';
import useAuthStore from '../../../shared/store/authStore';
import { useReports } from '../hooks/useReports';

const { width } = Dimensions.get('window');

export const ReportsOverview: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('This Year');

  const { summary, performance, departments, recentReports, loadingSummary, refetchAll } = useReports(
    selectedFilter,
    selectedPeriod === 'This Year' ? 'yearly' : 'monthly'
  );

  const filters = ['All', 'Financial', 'Operational', 'HR'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0F172A' : '#1E3A8A' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── ENTERPRISE HEADER WITH BACK BUTTON & STATUS BAR SPACING ──────── */}
      <View style={[styles.headerContainer, { backgroundColor: isDark ? '#0F172A' : '#1E3A8A' }]}>
        <View style={styles.headerTopRow}>
          {/* BACK BUTTON */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>My Reports</Text>
            <Text style={styles.headerSubtitle}>{user?.name ? `${user.name}'s Analytics` : 'Your Analytics & Reports'}</Text>
          </View>

          <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/(app)/profile')}>
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MAIN CONTENT CONTAINER ───────────────────────────────────── */}
      <View style={[styles.mainContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ─── SUMMARY CARDS GRID ───────────────────────────────────── */}
          <View style={styles.summaryGrid}>
            {/* Card 1: Total Reports */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={styles.summaryTopRow}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                </View>
                <Text style={styles.cardLabel}>Total Reports</Text>
              </View>
              <Text style={[styles.cardValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                {summary?.summaryCards?.totalReports?.value ?? 0}
              </Text>
              <View style={[styles.trendBadge, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="trending-up" size={12} color="#10B981" />
                <Text style={[styles.trendText, { color: '#10B981' }]}>
                  {summary?.summaryCards?.totalReports?.trend || '0%'} vs last month
                </Text>
              </View>
            </View>

            {/* Card 2: Scheduled */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={styles.summaryTopRow}>
                <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.cardLabel}>Scheduled</Text>
              </View>
              <Text style={[styles.cardValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                {summary?.summaryCards?.scheduled?.value ?? 0}
              </Text>
              <View style={[styles.trendBadge, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="trending-up" size={12} color="#8B5CF6" />
                <Text style={[styles.trendText, { color: '#8B5CF6' }]}>
                  {summary?.summaryCards?.scheduled?.trend || '0%'} vs last month
                </Text>
              </View>
            </View>

            {/* Card 3: Pending */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={styles.summaryTopRow}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="time-outline" size={20} color="#EF4444" />
                </View>
                <Text style={styles.cardLabel}>Pending</Text>
              </View>
              <Text style={[styles.cardValue, { color: isDark ? '#EF4444' : '#991B1B' }]}>
                {summary?.summaryCards?.pending?.value ?? 0}
              </Text>
              <View style={[styles.trendBadge, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="trending-down" size={12} color="#EF4444" />
                <Text style={[styles.trendText, { color: '#EF4444' }]}>
                  {summary?.summaryCards?.pending?.trend || '0%'} vs last month
                </Text>
              </View>
            </View>
          </View>

          {/* ─── PERFORMANCE OVERVIEW BAR CHART CARD ─────────────────── */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                Performance Overview
              </Text>
              <View style={styles.headerActionGroup}>
                <TouchableOpacity style={styles.periodDropdown}>
                  <Text style={styles.periodText}>{selectedPeriod}</Text>
                  <Ionicons name="chevron-down" size={14} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <View style={styles.yAxisLabels}>
                <Text style={styles.yAxisText}>{performance?.maxValue || 100}</Text>
                <Text style={styles.yAxisText}>80</Text>
                <Text style={styles.yAxisText}>60</Text>
                <Text style={styles.yAxisText}>40</Text>
                <Text style={styles.yAxisText}>20</Text>
                <Text style={styles.yAxisText}>0</Text>
              </View>

              <View style={styles.barsArea}>
                {(performance?.data || ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'].map((l) => ({ label: l, value: 0 }))).map((item, index) => {
                  const maxVal = Math.max(performance?.maxValue || 100, 1);
                  const barHeightPct = Math.min(100, Math.max(4, Math.round((item.value / maxVal) * 100)));
                  return (
                    <View key={index} style={styles.barColumn}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${barHeightPct}%`,
                              backgroundColor: item.value > 0 ? '#6366F1' : '#CBD5E1',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ─── BY DEPARTMENT DONUT CHART CARD ───────────────────────── */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                By Department
              </Text>
              <TouchableOpacity onPress={() => router.push('/(app)/projects')}>
                <Text style={styles.viewDetailsText}>View Details ›</Text>
              </TouchableOpacity>
            </View>

            {departments?.departments && departments.departments.length > 0 ? (
              <View style={styles.deptContentRow}>
                <View style={styles.donutContainer}>
                  <View style={styles.donutOuterRing}>
                    <View style={styles.donutCenterCircle}>
                      <Text style={styles.donutCenterNumber}>{departments?.totalTeams || 0}</Text>
                      <Text style={styles.donutCenterText}>TEAMS</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.legendContainer}>
                  {departments.departments.map((dept) => (
                    <View key={dept.id} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: dept.color }]} />
                      <Text style={[styles.legendName, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                        {dept.name}
                      </Text>
                      <Text style={styles.legendTeams}>{dept.teamsCount} Teams</Text>
                      <Text style={styles.legendPercentage}>{dept.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="business-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyText}>No department metrics recorded in database.</Text>
              </View>
            )}
          </View>

          {/* ─── FILTER CHIPS ROW ─────────────────────────────────────── */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.map((filter) => {
                const isActive = selectedFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setSelectedFilter(filter)}
                    style={[
                      styles.filterChip,
                      isActive
                        ? { backgroundColor: '#4F46E5' }
                        : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive ? { color: '#FFFFFF' } : { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.filterIconButton}>
              <Ionicons name="options-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ─── RECENT REPORTS LIST ──────────────────────────────────── */}
          <View style={styles.recentReportsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                My Recent Reports
              </Text>
              <TouchableOpacity onPress={() => router.push('/(app)/documents')}>
                <Text style={styles.viewDetailsText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentReports && recentReports.length > 0 ? (
              recentReports.map((report) => (
                <View
                  key={report.id}
                  style={[
                    styles.reportItemCard,
                    { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                  ]}
                >
                  <View style={[styles.accentIndicator, { backgroundColor: report.color || '#4F46E5' }]} />

                  <View style={[styles.reportIconBox, { backgroundColor: report.bgColor || '#EEF2FF' }]}>
                    {report.iconType === 'table' ? (
                      <MaterialCommunityIcons name="table-large" size={20} color={report.color || '#3B82F6'} />
                    ) : report.iconType === 'building' ? (
                      <Ionicons name="business-outline" size={20} color={report.color || '#10B981'} />
                    ) : (
                      <Ionicons name="document-text-outline" size={20} color={report.color || '#4F46E5'} />
                    )}
                  </View>

                  <View style={styles.reportDetails}>
                    <Text style={[styles.reportTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                      {report.title}
                    </Text>
                    <Text style={styles.reportMeta}>
                      {report.timeAgo} • {report.size}
                    </Text>
                  </View>

                  <View style={styles.reportActions}>
                    <TouchableOpacity style={styles.actionIconButton}>
                      <Feather name="download" size={18} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconButton}>
                      <Feather name="share-2" size={18} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconButton}>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyText}>You have not submitted any reports yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 8,
    paddingBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#93C5FD',
    fontSize: 12,
    marginTop: 2,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -12,
    paddingTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: (width - 44) / 3,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTopRow: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 3,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  moreButton: {
    padding: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'flex-end',
  },
  yAxisLabels: {
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  barsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 24,
    height: 120,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '600',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  deptContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 12,
    borderColor: '#4F46E5',
    borderTopColor: '#8B5CF6',
    borderRightColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  donutCenterText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
  },
  legendTeams: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    textAlign: 'right',
  },
  legendPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    width: 40,
    textAlign: 'right',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  recentReportsSection: {
    marginTop: 4,
  },
  reportItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  accentIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportDetails: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    padding: 6,
    marginLeft: 4,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
});

export default ReportsOverview;
