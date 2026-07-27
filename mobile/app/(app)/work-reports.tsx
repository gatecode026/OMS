/**
 * @file work-reports.tsx
 * @description Enterprise Work Reports screen for submitting daily/weekly tasks accomplished and reviewing supervisor feedback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useTheme from '../../src/shared/hooks/useTheme';
import apiClient from '../../src/shared/services/apiClient';
import profileApi from '../../src/features/profile/api/profileApi';

export default function WorkReportsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [hoursSpent, setHoursSpent] = useState('8');
  const [reportCategory, setReportCategory] = useState('Daily');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-reports'] }),
        profileApi.fetchProfile(),
        refetch(),
      ]);
    } catch (err) {
      console.warn('[WorkReportsScreen] Hard refresh error:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 400);
    }
  };

  // Fetch work reports from backend
  const { data: reports = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['work-reports'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/work-reports');
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Submit work report mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiClient.post('/api/v1/work-reports', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-reports'] });
      setIsSubmitModalOpen(false);
      setReportTitle('');
      setReportSummary('');
      Alert.alert('Success', 'Work report submitted successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to submit report.');
    },
  });

  const handleSubmit = () => {
    if (!reportTitle.trim() || !reportSummary.trim()) {
      Alert.alert('Validation Error', 'Please enter a report title and summary.');
      return;
    }

    submitMutation.mutate({
      title: reportTitle.trim(),
      summary: reportSummary.trim(),
      hoursSpent: parseFloat(hoursSpent) || 8,
      category: reportCategory,
      date: new Date().toISOString().split('T')[0],
    });
  };

  const renderStatusBadge = (status: string = 'Pending') => {
    let bgColor = '#FEF3C7';
    let textColor = '#D97706';
    if (status.toLowerCase() === 'approved' || status.toLowerCase() === 'completed') {
      bgColor = '#D1FAE5';
      textColor = '#059669';
    } else if (status.toLowerCase() === 'rejected') {
      bgColor = '#FEE2E2';
      textColor = '#DC2626';
    }
    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{status.toUpperCase()}</Text>
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Work Reports</Text>
        <TouchableOpacity onPress={() => setIsSubmitModalOpen(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Reports List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
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
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Work Reports Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Tap the + icon above to submit your daily work report.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title || 'Work Report'}</Text>
                {renderStatusBadge(item.status)}
              </View>

              <Text style={[styles.cardSummary, { color: colors.textSecondary }]}>{item.summary || item.description}</Text>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {item.date || new Date(item.createdAt || Date.now()).toLocaleDateString()}
                </Text>
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  Hours: {item.hoursSpent || 8} hrs
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Submit Report Modal */}
      <Modal visible={isSubmitModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Submit Work Report</Text>
              <TouchableOpacity onPress={() => setIsSubmitModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Report Title</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. Completed API integration & testing"
              placeholderTextColor={colors.textMuted}
              value={reportTitle}
              onChangeText={setReportTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tasks Accomplished / Summary</Text>
            <TextInput
              style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Describe tasks completed today..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={reportSummary}
              onChangeText={setReportSummary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hours Logged</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              keyboardType="numeric"
              value={hoursSpent}
              onChangeText={setHoursSpent}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  listContainer: { padding: 16 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  cardSummary: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8 },
  metaText: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  textArea: { height: 90, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingTop: 8, fontSize: 14 },
  submitButton: { marginTop: 20, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
