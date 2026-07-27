/**
 * @file announcements.tsx
 * @description Enterprise Company Announcements feed screen with priority badges, interactive search, acknowledge button, and dark mode support.
 */

import React, { useState, useMemo } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useTheme from '../../src/shared/hooks/useTheme';
import apiClient from '../../src/shared/services/apiClient';
import profileApi from '../../src/features/profile/api/profileApi';

export interface AnnouncementItem {
  id: string;
  _id?: string;
  title: string;
  content: string;
  priority: 'urgent' | 'important' | 'normal';
  category?: string;
  authorName?: string;
  createdAt: string;
  acknowledgedBy?: string[];
  likesCount?: number;
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'urgent' | 'important'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['announcements'] }),
        profileApi.fetchProfile(),
        refetch(),
      ]);
    } catch (err) {
      console.warn('[AnnouncementsScreen] Hard refresh error:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  // Fetch real announcements from backend API
  const { data: announcements = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/announcements');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Acknowledge announcement mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      await apiClient.post(`/api/v1/announcements/${announcementId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item: AnnouncementItem) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || item.priority === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [announcements, searchQuery, selectedFilter]);

  const renderPriorityBadge = (priority: string = 'normal') => {
    let bgColor = colors.surfaceHighlight;
    let textColor = colors.textSecondary;
    let label = 'NORMAL';

    if (priority === 'urgent') {
      bgColor = '#FEE2E2';
      textColor = '#EF4444';
      label = 'URGENT';
    } else if (priority === 'important') {
      bgColor = '#FEF3C7';
      textColor = '#F59E0B';
      label = 'IMPORTANT';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Company Announcements</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search & Filters */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search announcements..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.chipRow}>
          {(['all', 'urgent', 'important'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedFilter === filter ? colors.primary : isDark ? colors.surface : '#FFFFFF',
                  borderColor: selectedFilter === filter ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedFilter === filter ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Announcements List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredAnnouncements}
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
              <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Announcements</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                No announcements match your search criteria.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                {renderPriorityBadge(item.priority)}
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                  {new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.cardContent, { color: colors.textSecondary }]}>{item.content}</Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.authorText, { color: colors.textMuted }]}>
                  Posted by {item.authorName || 'Management'}
                </Text>
                <TouchableOpacity
                  style={[styles.ackButton, { backgroundColor: colors.primary }]}
                  onPress={() => acknowledgeMutation.mutate(item.id || item._id || '')}
                >
                  <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.ackButtonText}>Acknowledge</Text>
                </TouchableOpacity>
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
  filterSection: { padding: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  dateText: { fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  authorText: { fontSize: 12, fontStyle: 'italic' },
  ackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ackButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
});
