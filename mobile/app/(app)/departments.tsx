/**
 * @file departments.tsx
 * @description Enterprise Departments & Branches directory screen with employee counts, department managers, and search filter.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useTheme from '../../src/shared/hooks/useTheme';
import apiClient from '../../src/shared/services/apiClient';
import profileApi from '../../src/features/profile/api/profileApi';

export default function DepartmentsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'departments' | 'branches'>('departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['departments'] }),
        queryClient.invalidateQueries({ queryKey: ['branches'] }),
        profileApi.fetchProfile(),
        refetchDepts(),
        refetchBranches(),
      ]);
    } catch (err) {
      console.warn('[DepartmentsScreen] Hard refresh error:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  // Fetch real departments
  const { data: departments = [], isLoading: isLoadingDepts, refetch: refetchDepts, isRefetching: isRefetchingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/departments');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Fetch real branches
  const { data: branches = [], isLoading: isLoadingBranches, refetch: refetchBranches, isRefetching: isRefetchingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/branches');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const displayData = activeTab === 'departments' ? departments : branches;
  const isLoading = activeTab === 'departments' ? isLoadingDepts : isLoadingBranches;
  const isRefetching = activeTab === 'departments' ? isRefetchingDepts : isRefetchingBranches;
  const refetch = activeTab === 'departments' ? refetchDepts : refetchBranches;

  const filteredData = displayData.filter((item: any) => {
    const name = item.name || item.departmentName || item.branchName || '';
    const code = item.code || item.branchCode || '';
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Organization Structure</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'departments' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('departments')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'departments' ? colors.primary : colors.textMuted }]}>
            Departments ({departments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'branches' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('branches')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'branches' ? colors.primary : colors.textMuted }]}>
            Branches ({branches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No {activeTab} Found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                  <Ionicons
                    name={activeTab === 'departments' ? 'git-network-outline' : 'location-outline'}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {item.name || item.departmentName || item.branchName || 'Unnamed'}
                  </Text>
                  {item.code ? <Text style={[styles.cardSub, { color: colors.textMuted }]}>Code: {item.code}</Text> : null}
                </View>
              </View>

              <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
                <View style={styles.infoStat}>
                  <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.infoStatText, { color: colors.textSecondary }]}>
                    {item.employeeCount ?? item.membersCount ?? 0} Employees
                  </Text>
                </View>
                {item.managerName || item.headName ? (
                  <View style={styles.infoStat}>
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.infoStatText, { color: colors.textSecondary }]}>
                      Head: {item.managerName || item.headName}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },
  searchSection: { padding: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  infoStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoStatText: { fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
});
