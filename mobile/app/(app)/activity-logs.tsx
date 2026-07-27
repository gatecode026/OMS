/**
 * @file activity-logs.tsx
 * @description Enterprise Activity & Security Audit Logs viewer for management and administration roles.
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

export default function ActivityLogsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activity-logs'] }),
        profileApi.fetchProfile(),
        refetch(),
      ]);
    } catch (err) {
      console.warn('[ActivityLogsScreen] Hard refresh error:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  // Fetch real activity logs
  const { data: logs = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/activity-logs');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const filteredLogs = logs.filter((log: any) => {
    const action = log.action || log.event || log.title || '';
    const user = log.userName || log.userEmail || log.performedBy || '';
    return (
      action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Activity Audit Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search audit logs by action or user..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Audit Logs List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
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
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Audit Logs Recorded</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Ionicons name="shield-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                    {item.action || item.event || item.title || 'System Action'}
                  </Text>
                  <Text style={[styles.userText, { color: colors.textMuted }]}>
                    By {item.userName || item.userEmail || item.performedBy || 'System'}
                  </Text>
                </View>
              </View>

              {item.details || item.description ? (
                <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                  {item.details || item.description}
                </Text>
              ) : null}

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.timeText, { color: colors.textMuted }]}>
                  {new Date(item.timestamp || item.createdAt || Date.now()).toLocaleString()}
                </Text>
                {item.ipAddress ? (
                  <Text style={[styles.timeText, { color: colors.textMuted }]}>IP: {item.ipAddress}</Text>
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
  card: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 15, fontWeight: '700' },
  userText: { fontSize: 12, marginTop: 2 },
  detailsText: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, marginTop: 10 },
  timeText: { fontSize: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
});
