/**
 * @file search.tsx
 * @description Advanced global/room-level search with category filters, date filters, and recent search history.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useConversationSearch } from '../../../src/features/chat/hooks/useChat';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components';
import secureStore from '../../../src/shared/services/secureStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SearchCategory = 'all' | 'text' | 'media' | 'document' | 'link';

export default function SearchScreen() {
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const conversationId = (params.conversationId as string) || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Advanced Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'any' | 'today' | 'week' | 'month'>('any');

  // Debouncing Query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Search History
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await secureStore.getItem('recent_chat_searches');
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (err) {}
    };
    loadHistory();
  }, []);

  const saveSearchToHistory = async (query: string) => {
    if (!query.trim()) return;
    try {
      const next = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
      setRecentSearches(next);
      await secureStore.setItem('recent_chat_searches', JSON.stringify(next));
    } catch (e) {}
  };

  const clearHistory = async () => {
    try {
      setRecentSearches([]);
      await secureStore.deleteItem('recent_chat_searches');
      toast.success('Search history cleared');
    } catch (e) {}
  };

  // Search execution via Query hook
  const { data: searchResults = [], isLoading, isRefetching } = useConversationSearch(
    conversationId,
    debouncedQuery
  );

  // Filter and sort results based on category & date
  const processedResults = useMemo(() => {
    if (!searchResults) return [];

    let filtered = [...searchResults];

    // 1. Category Filter
    if (activeCategory === 'text') {
      filtered = filtered.filter(m => m.type === 'text');
    } else if (activeCategory === 'media') {
      filtered = filtered.filter(m => m.type === 'image' || m.type === 'video' || m.type === 'audio');
    } else if (activeCategory === 'document') {
      filtered = filtered.filter(m => m.type === 'file' || m.media?.mimeType?.includes('pdf') || m.media?.mimeType?.includes('doc'));
    } else if (activeCategory === 'link') {
      filtered = filtered.filter(m => m.content && /https?:\/\/[^\s]+/i.test(m.content));
    }

    // 2. Date Filter
    if (dateFilter !== 'any') {
      const now = new Date();
      filtered = filtered.filter(m => {
        const date = new Date(m.createdAt);
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === 'today') return diffDays <= 1;
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;
        return true;
      });
    }

    return filtered;
  }, [searchResults, activeCategory, dateFilter]);

  const handleSelectResult = (item: any) => {
    saveSearchToHistory(debouncedQuery);
    // Navigate to ChatRoomScreen and focus target message
    router.push({
      pathname: `/chat/${item.conversationId}`,
      params: { msgId: item.id },
    });
  };

  const renderCategoryPill = (cat: SearchCategory, label: string, icon: string) => {
    const isSelected = activeCategory === cat;
    return (
      <Pressable
        key={cat}
        onPress={() => setActiveCategory(cat)}
        style={[
          styles.pill,
          {
            backgroundColor: isSelected ? colors.primary : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <Ionicons name={icon as any} size={14} color={isSelected ? '#FFFFFF' : colors.textMuted} style={{ marginRight: 6 }} />
        <Text
          style={[
            styles.pillText,
            {
              color: isSelected ? '#FFFFFF' : colors.text,
              fontFamily: isSelected ? typography.fonts.semibold : typography.fonts.medium,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderSearchResultItem = ({ item }: { item: any }) => {
    const formattedTime = new Date(item.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Pressable
        onPress={() => handleSelectResult(item)}
        style={[styles.resultItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={styles.resultItemLeft}>
          <Avatar name={item.senderName} size={38} source={item.senderAvatar} />
        </View>

        <View style={styles.resultItemBody}>
          <View style={styles.resultHeader}>
            <Text style={[styles.senderName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {item.senderName}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
              {formattedTime}
            </Text>
          </View>

          <Text
            style={[styles.contentPreview, { color: colors.textLight, fontFamily: typography.fonts.regular }]}
            numberOfLines={2}
          >
            {item.content}
          </Text>

          {item.media && (
            <View style={[styles.mediaIndicator, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: radius.sm }]}>
              <Ionicons
                name={item.type === 'image' ? 'image-outline' : item.type === 'video' ? 'videocam-outline' : 'document-attach-outline'}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.mediaText, { color: colors.primary, fontFamily: typography.fonts.medium }]}>
                {item.media.fileName || 'Attachment'}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      {/* Search Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.searchBarRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: radius.lg }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
              placeholder="Search messages, media, files..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => saveSearchToHistory(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.filterButton,
              {
                borderColor: showFilters ? colors.primary : colors.border,
                backgroundColor: showFilters ? `${colors.primary}08` : 'transparent',
              },
            ]}
          >
            <Ionicons name="options-outline" size={20} color={showFilters ? colors.primary : colors.text} />
          </Pressable>
        </View>

        {/* Category Selector Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.pillsScroll, { paddingBottom: spacing.md }]}
        >
          {renderCategoryPill('all', 'All', 'chatbubbles-outline')}
          {renderCategoryPill('text', 'Messages', 'document-text-outline')}
          {renderCategoryPill('media', 'Media', 'image-outline')}
          {renderCategoryPill('document', 'Files', 'document-attach-outline')}
          {renderCategoryPill('link', 'Links', 'link-outline')}
        </ScrollView>
      </View>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.filterTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Filter by Date
          </Text>
          <View style={styles.filterOptionsRow}>
            {(['any', 'today', 'week', 'month'] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setDateFilter(opt)}
                style={[
                  styles.filterOptionBtn,
                  {
                    backgroundColor: dateFilter === opt ? `${colors.primary}12` : 'transparent',
                    borderColor: dateFilter === opt ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: dateFilter === opt ? colors.primary : colors.textLight,
                    fontFamily: dateFilter === opt ? typography.fonts.bold : typography.fonts.medium,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {opt === 'any' ? 'Any Time' : opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Search Content */}
      {isLoading || isRefetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            Searching conversation history...
          </Text>
        </View>
      ) : searchQuery.trim() === '' ? (
        // Render Search History / Blank State
        <View style={{ flex: 1 }}>
          {recentSearches.length > 0 ? (
            <View style={{ padding: spacing.lg }}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
                  Recent Searches
                </Text>
                <Pressable onPress={clearHistory}>
                  <Text style={[styles.clearText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                    Clear All
                  </Text>
                </Pressable>
              </View>

              {recentSearches.map((historyQuery, index) => (
                <Pressable
                  key={index}
                  onPress={() => setSearchQuery(historyQuery)}
                  style={[styles.historyItem, { borderBottomColor: colors.border }]}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 10 }} />
                  <Text style={[styles.historyItemText, { color: colors.text, fontFamily: typography.fonts.regular }]}>
                    {historyQuery}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Ionicons name="search" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Search Chat Content
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                Type keywords above to find messages, files, shared media, and links.
              </Text>
            </View>
          )}
        </View>
      ) : processedResults.length > 0 ? (
        <FlatList
          data={processedResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResultItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.centerContainer}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
            <Ionicons name="information-circle-outline" size={40} color={colors.danger} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            No Results Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
            We couldn't find any matches for "{debouncedQuery}" in this category.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
  filtersPanel: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filterTitle: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  clearText: {
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  historyItemText: {
    fontSize: 14,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  resultItemLeft: {
    marginRight: 12,
  },
  resultItemBody: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 11,
  },
  contentPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    gap: 4,
  },
  mediaText: {
    fontSize: 11,
  },
});
