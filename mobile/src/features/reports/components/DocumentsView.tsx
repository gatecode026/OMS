/**
 * @file src/features/reports/components/DocumentsView.tsx
 * @description Documents & Reports screen with top notch spacing, back button, and real DB data rendering.
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

export const DocumentsView: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [selectedFilter, setSelectedFilter] = useState('All');
  const { categories, allFiles, recentReports, refetchAll } = useReports();

  const filterTabs = ['All', 'Company', 'Personal', 'Shared'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0F172A' : '#1E3A8A' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── HEADER BAR WITH BACK BUTTON & STATUS BAR SPACING ───────── */}
      <View style={[styles.headerBar, { backgroundColor: isDark ? '#0F172A' : '#1E3A8A' }]}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.avatarBox}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Documents</Text>

        <View style={styles.headerActionGroup}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(app)/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MAIN CONTENT AREA ───────────────────────────────────────── */}
      <View style={[styles.mainContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ─── FILTER TABS ──────────────────────────────────────────── */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filterTabs.map((tab) => {
                const isActive = selectedFilter === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setSelectedFilter(tab)}
                    style={[
                      styles.filterTab,
                      isActive
                        ? { backgroundColor: '#2563EB' }
                        : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        isActive ? { color: '#FFFFFF' } : { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.filterIconButton}>
              <Ionicons name="options-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ─── RECENT REPORTS SECTION ────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="document-text-outline" size={18} color="#2563EB" />
              <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                Recent Reports
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/reports')}>
              <Text style={styles.seeAllText}>See All ›</Text>
            </TouchableOpacity>
          </View>

          {recentReports && recentReports.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentCardsScroll}>
              {recentReports.map((report) => (
                <View key={report.id} style={[styles.previewCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <View style={[styles.previewImageMock, { backgroundColor: report.bgColor || '#EFF6FF' }]}>
                    <Ionicons name="stats-chart" size={32} color={report.color || '#3B82F6'} />
                  </View>
                  <View style={styles.previewCardFooter}>
                    <View style={styles.cardTextGroup}>
                      <Text style={[styles.previewTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                        {report.title}
                      </Text>
                      <Text style={styles.previewDate}>{report.timeAgo}</Text>
                    </View>
                    <TouchableOpacity>
                      <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCardBox}>
              <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
              <Text style={styles.emptyCardText}>No recent report preview files in database.</Text>
            </View>
          )}

          {/* ─── CATEGORIES GRID ──────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A', marginTop: 16, marginBottom: 12 }]}>
            Categories
          </Text>

          {categories && categories.length > 0 ? (
            <View style={styles.categoriesGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                >
                  <View style={[styles.categoryIconBox, { backgroundColor: cat.bgColor || '#EEF2FF' }]}>
                    <Ionicons name="folder-open-outline" size={20} color={cat.color || '#4F46E5'} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                      {cat.title}
                    </Text>
                    <Text style={styles.categoryCount}>{cat.fileCount} Files</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCardBox}>
              <Ionicons name="folder-outline" size={28} color="#94A3B8" />
              <Text style={styles.emptyCardText}>No document categories in database.</Text>
            </View>
          )}

          {/* ─── ALL FILES LIST ───────────────────────────────────────── */}
          <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              All Files
            </Text>
            <TouchableOpacity style={styles.sortDropdown}>
              <Text style={styles.sortText}>Newest</Text>
              <Ionicons name="chevron-down" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          {allFiles && allFiles.length > 0 ? (
            allFiles.map((file) => (
              <View
                key={file.id}
                style={[styles.fileListItem, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
              >
                <View style={[styles.fileIconBox, { backgroundColor: file.bgColor || '#FEF2F2' }]}>
                  {file.iconType === 'pdf' ? (
                    <MaterialCommunityIcons name="file-pdf-box" size={24} color="#EF4444" />
                  ) : file.iconType === 'word' ? (
                    <MaterialCommunityIcons name="file-word-box" size={24} color="#3B82F6" />
                  ) : file.iconType === 'excel' ? (
                    <MaterialCommunityIcons name="file-excel-box" size={24} color="#10B981" />
                  ) : (
                    <MaterialCommunityIcons name="folder-zip-outline" size={24} color="#6B7280" />
                  )}
                </View>

                <View style={styles.fileDetails}>
                  <Text style={[styles.fileName, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                    {file.title}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {file.size} • {file.timeAgo}
                  </Text>
                </View>

                <TouchableOpacity style={styles.fileMenuButton}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyCardBox}>
              <Ionicons name="cloud-offline-outline" size={28} color="#94A3B8" />
              <Text style={styles.emptyCardText}>No files stored in database yet.</Text>
            </View>
          )}
        </ScrollView>

        {/* ─── FLOATING ACTION BUTTON ───────────────────────────────── */}
        <TouchableOpacity style={styles.fabButton}>
          <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 8,
    paddingBottom: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabText: {
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  seeAllText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  recentCardsScroll: {
    marginBottom: 8,
  },
  previewCard: {
    width: 200,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  previewImageMock: {
    height: 100,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextGroup: {
    flex: 1,
    marginRight: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 44) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 4,
    fontWeight: '500',
  },
  fileListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  fileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  fileMenuButton: {
    padding: 6,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyCardBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
});

export default DocumentsView;
