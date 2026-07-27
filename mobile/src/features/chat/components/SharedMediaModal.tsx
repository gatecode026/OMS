/**
 * @file SharedMediaModal.tsx
 * @description Enterprise Shared Content Hub modal featuring 4 categorized tabs:
 *              Media Gallery (Photos & Videos Grid), Document Center (PDFs & Office files),
 *              Links Hub (URLs), and Starred / Favorites.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
  StatusBar,
  Linking,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage } from '../types';
import SharedContentManager from '../services/SharedContentManager';
import SearchManager from '../services/SearchManager';
import useSharedMediaStore from '../stores/useSharedMediaStore';
import DownloadManager from '../services/DownloadManager';
import { formatBytes, getFileIcon } from '../utils/fileUtils';
import { toast } from '../../../shared/components/Toast';

interface SharedMediaModalProps {
  visible: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onOpenPreview?: (index: number) => void;
}

export const SharedMediaModal: React.FC<SharedMediaModalProps> = ({
  visible,
  messages,
  onClose,
  onOpenPreview,
}) => {
  const { colors, typography, isDark } = useTheme();
  const { activeTab, setActiveTab, searchQuery, setSearchQuery } = useSharedMediaStore();

  // 1. Categorize all conversation messages
  const categorized = useMemo(() => {
    return SharedContentManager.categorizeMessages(messages);
  }, [messages]);

  // 2. Apply search queries
  const filteredMedia = useMemo(() => {
    return SearchManager.searchMessages(categorized.media, searchQuery);
  }, [categorized.media, searchQuery]);

  const filteredDocs = useMemo(() => {
    return SearchManager.searchMessages(categorized.documents, searchQuery);
  }, [categorized.documents, searchQuery]);

  const filteredLinks = useMemo(() => {
    return SearchManager.searchLinks(categorized.links, searchQuery);
  }, [categorized.links, searchQuery]);

  const filteredFavorites = useMemo(() => {
    return SearchManager.searchMessages(categorized.favorites, searchQuery);
  }, [categorized.favorites, searchQuery]);

  const cardBg = isDark ? '#1F2C34' : '#FFFFFF';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const subTextColor = isDark ? '#8696A0' : '#667781';
  const searchBg = isDark ? '#2A3942' : '#F0F2F5';
  const borderBottomColor = isDark ? '#222D34' : '#E2E8F0';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#111B21' : '#F8FAFC' }]}>
        <StatusBar barStyle="light-content" />

        {/* Top Navigation Header */}
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor }]}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>

          <View style={[styles.searchInputWrapper, { backgroundColor: searchBg }]}>
            <Ionicons name="search-outline" size={18} color={subTextColor} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search shared media, files, links..."
              placeholderTextColor={subTextColor}
              style={[styles.searchInput, { color: textColor, fontFamily: typography.fonts.regular }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={subTextColor} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Tab Selector Bar */}
        <View style={[styles.tabsBar, { backgroundColor: cardBg, borderBottomColor }]}>
          <Pressable
            onPress={() => setActiveTab('media')}
            style={[styles.tabItem, activeTab === 'media' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'media' ? colors.primary : subTextColor,
                  fontFamily: activeTab === 'media' ? typography.fonts.bold : typography.fonts.medium,
                },
              ]}
            >
              Media ({categorized.media.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('documents')}
            style={[styles.tabItem, activeTab === 'documents' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'documents' ? colors.primary : subTextColor,
                  fontFamily: activeTab === 'documents' ? typography.fonts.bold : typography.fonts.medium,
                },
              ]}
            >
              Docs ({categorized.documents.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('links')}
            style={[styles.tabItem, activeTab === 'links' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'links' ? colors.primary : subTextColor,
                  fontFamily: activeTab === 'links' ? typography.fonts.bold : typography.fonts.medium,
                },
              ]}
            >
              Links ({categorized.links.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('favorites')}
            style={[styles.tabItem, activeTab === 'favorites' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'favorites' ? colors.primary : subTextColor,
                  fontFamily: activeTab === 'favorites' ? typography.fonts.bold : typography.fonts.medium,
                },
              ]}
            >
              Starred ({categorized.favorites.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab 1: Media Gallery (3-Column Grid) */}
        {activeTab === 'media' && (
          <FlatList
            data={filteredMedia}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item, index }) => {
              const url = item.media?.url || (item.type === 'image' ? item.content : null);
              const isVideo = item.type === 'video';

              return (
                <Pressable
                  onPress={() => onOpenPreview?.(index)}
                  style={styles.gridThumbnailContainer}
                >
                  {url ? (
                    <Image source={{ uri: url }} style={styles.gridThumbnail} resizeMode="cover" />
                  ) : (
                    <View style={[styles.gridThumbnailPlaceholder, { backgroundColor: searchBg }]}>
                      <Ionicons name={isVideo ? 'videocam-outline' : 'image-outline'} size={28} color={subTextColor} />
                    </View>
                  )}
                  {isVideo && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play-circle" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={48} color={subTextColor} />
                <Text style={[styles.emptyText, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                  No shared photos or videos found
                </Text>
              </View>
            }
          />
        )}

        {/* Tab 2: Document Center */}
        {activeTab === 'documents' && (
          <FlatList
            data={filteredDocs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const fileName = item.media?.fileName || item.content || 'Document';
              const fileSize = item.media?.fileSize;
              const iconName = getFileIcon(fileName);

              return (
                <View style={[styles.documentRow, { backgroundColor: cardBg }]}>
                  <View style={[styles.docIconCircle, { backgroundColor: searchBg }]}>
                    <Ionicons name={iconName as any} size={22} color={colors.primary} />
                  </View>

                  <View style={styles.docInfoContainer}>
                    <Text style={[styles.docName, { color: textColor, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <Text style={[styles.docMeta, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                      {formatBytes(fileSize)} • {dayjs(item.createdAt).format('MMM DD, YYYY')}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      if (item.media?.url) {
                        DownloadManager.downloadAndSave(item.media.url, fileName);
                      }
                    }}
                    style={styles.downloadBtn}
                  >
                    <Ionicons name="download-outline" size={20} color={colors.primary} />
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={subTextColor} />
                <Text style={[styles.emptyText, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                  No shared documents found
                </Text>
              </View>
            }
          />
        )}

        {/* Tab 3: Links Hub */}
        {activeTab === 'links' && (
          <FlatList
            data={filteredLinks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.linkRow, { backgroundColor: cardBg }]}>
                <View style={[styles.linkIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="link-outline" size={20} color="#0284C7" />
                </View>

                <View style={styles.linkInfoContainer}>
                  <Text style={[styles.linkDomain, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                    {item.domain}
                  </Text>
                  <Text style={[styles.linkUrl, { color: textColor, fontFamily: typography.fonts.regular }]} numberOfLines={1}>
                    {item.url}
                  </Text>
                  <Text style={[styles.linkMeta, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                    Shared by {item.senderName} • {dayjs(item.createdAt).format('MMM DD, YYYY')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => {
                      Clipboard.setString(item.url);
                      toast.success('Link copied');
                    }}
                    style={styles.linkActionBtn}
                  >
                    <Ionicons name="copy-outline" size={18} color={subTextColor} />
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL(item.url)}
                    style={styles.linkActionBtn}
                  >
                    <Ionicons name="open-outline" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="link-outline" size={48} color={subTextColor} />
                <Text style={[styles.emptyText, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                  No shared links found
                </Text>
              </View>
            }
          />
        )}

        {/* Tab 4: Starred / Favorites */}
        {activeTab === 'favorites' && (
          <FlatList
            data={filteredFavorites}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.documentRow, { backgroundColor: cardBg }]}>
                <View style={[styles.docIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="star" size={20} color="#D97706" />
                </View>

                <View style={styles.docInfoContainer}>
                  <Text style={[styles.docName, { color: textColor, fontFamily: typography.fonts.semibold }]} numberOfLines={2}>
                    {item.content || item.media?.fileName || 'Starred Message'}
                  </Text>
                  <Text style={[styles.docMeta, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                    {item.senderName} • {dayjs(item.createdAt).format('MMM DD, YYYY')}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={48} color={subTextColor} />
                <Text style={[styles.emptyText, { color: subTextColor, fontFamily: typography.fonts.medium }]}>
                  No starred messages found
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 10,
    paddingTop: StatusBar.currentHeight || 0,
  },
  backBtn: {
    padding: 6,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  tabsBar: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
  },
  gridContent: {
    padding: 2,
  },
  gridThumbnailContainer: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 1.5,
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',

  },
  gridThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  docIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  docName: {
    fontSize: 14,
  },
  docMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  downloadBtn: {
    padding: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  linkIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  linkDomain: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  linkUrl: {
    fontSize: 14,
    marginTop: 1,
  },
  linkMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  linkActionBtn: {
    padding: 6,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default SharedMediaModal;
