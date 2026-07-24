/**
 * @file shared-media.tsx
 * @description Premium Shared Media, Links & Documents Screen (PRD 03).
 *              Provides a WhatsApp/Slack/Teams style layout to view, search, and manage files.
 *              Everything is reactive and loads in real-time from existing query caches.
 */

import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
  Clipboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';

import useTheme from '../../../src/shared/hooks/useTheme';
import { toast } from '../../../src/shared/components/Toast';
import { useChatMessages, useConversations } from '../../../src/features/chat';
import useAuthStore from '../../../src/shared/store/authStore';
import useVoicePlayer from '../../../src/features/chat/hooks/useVoicePlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MediaTab = 'images' | 'videos' | 'documents' | 'links' | 'voice';
type SortOption = 'newest' | 'oldest' | 'largest' | 'smallest';

interface MediaItem {
  id: string;
  messageId: string;
  url: string;
  type: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number;
  senderName: string;
  createdAt: string;
}

interface LinkItem {
  id: string;
  messageId: string;
  url: string;
  title: string;
  domain: string;
  senderName: string;
  createdAt: string;
}

// ─── Voice Note Item Component with Waveform Playback ─────────────────────────
const VoicePlaybackItem: React.FC<{ item: MediaItem; colors: any; typography: any }> = ({
  item,
  colors,
  typography,
}) => {
  const { isPlaying, position, playPause, speed, changeSpeed, seek } = useVoicePlayer(
    item.url,
    item.duration || 0
  );

  const totalBars = 35;
  const bars = useMemo(() => {
    return Array.from({ length: totalBars }, (_, i) => {
      return 4 + Math.sin(i * 0.4) * 14 + Math.random() * 8;
    });
  }, []);

  return (
    <View style={[styles.voiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={playPause} style={[styles.voicePlayBtn, { backgroundColor: colors.primary }]}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#FFF" />
      </Pressable>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.voiceWaveformRow}>
          {bars.map((barHeight, idx) => {
            const barProgress = idx / totalBars;
            const isPlayed = position >= barProgress;
            return (
              <Pressable
                key={idx}
                onPress={() => seek(barProgress)}
                style={[
                  styles.waveformBar,
                  {
                    height: barHeight,
                    backgroundColor: isPlayed ? colors.primary : colors.textLight,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.voiceMetaRow}>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fonts.medium }}>
            {item.duration ? `${Math.floor(item.duration)}s` : 'Voice note'} • By {item.senderName}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textLight }}>
            {dayjs(item.createdAt).format('hh:mm A')}
          </Text>
        </View>
      </View>

      <Pressable onPress={changeSpeed} style={[styles.speedBadge, { backgroundColor: colors.neutralLight }]}>
        <Text style={{ fontSize: 10, fontFamily: typography.fonts.bold, color: colors.text }}>
          {speed}x
        </Text>
      </Pressable>
    </View>
  );
};

const AnyFlashList = FlashList as any;

export default function SharedMediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const authUser = useAuthStore((s) => s.user);

  const { id: conversationId } = useLocalSearchParams<{ id: string }>();

  // ── Tab State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MediaTab>('images');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedFilterExt, setSelectedFilterExt] = useState<string | null>(null);

  // Sheets & Overlays
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  // ── Data Loading ────────────────────────────────────────────────────────────
  const { data: conversations = [] } = useConversations();
  const { data: messages = [], isLoading } = useChatMessages(conversationId || '');

  const conversation = useMemo(() => {
    return conversations.find((c) => c.id === conversationId);
  }, [conversations, conversationId]);

  const partnerName = useMemo(() => {
    if (!conversation) return 'Media';
    if (conversation.type === 'direct') {
      const partner = conversation.participants.find((p) => p.employeeId !== authUser?.id);
      return partner?.name || 'Shared Media';
    }
    return conversation.name || 'Group Shared Media';
  }, [conversation, authUser]);

  // ── Media Categorization & Processing ───────────────────────────────────────
  const { images, videos, documents, links, voiceNotes, totalStorage } = useMemo(() => {
    const list = messages.filter((m) => !m.isDeleted);
    const imgList: MediaItem[] = [];
    const vidList: MediaItem[] = [];
    const docList: MediaItem[] = [];
    const voiceList: MediaItem[] = [];
    const linkList: LinkItem[] = [];
    let sizeSum = 0;

    list.forEach((msg) => {
      // 1. Process files
      if (msg.media && msg.media.url) {
        const itemSize = msg.media.fileSize || 0;
        sizeSum += itemSize;

        const mediaItem: MediaItem = {
          id: msg.id,
          messageId: msg.id,
          url: msg.media.url,
          type: msg.type,
          name: msg.media.fileName || 'Attachment',
          size: itemSize,
          mimeType: msg.media.mimeType || 'application/octet-stream',
          duration: msg.media.duration || undefined,
          senderName: msg.senderName,
          createdAt: msg.createdAt,
        };

        if (msg.type === 'image' || msg.media.mimeType?.startsWith('image/')) {
          imgList.push(mediaItem);
        } else if (msg.type === 'video' || msg.media.mimeType?.startsWith('video/')) {
          vidList.push(mediaItem);
        } else if (msg.type === 'audio' || msg.media.mimeType?.startsWith('audio/')) {
          voiceList.push(mediaItem);
        } else {
          docList.push(mediaItem);
        }
      }

      // 2. Process links in text messages
      if (msg.type === 'text' && msg.content) {
        const urls = msg.content.match(/https?:\/\/[^\s]+/gi);
        if (urls) {
          urls.forEach((url, urlIdx) => {
            let domain = 'web';
            try {
              const cleaned = url.replace('https://', '').replace('http://', '');
              domain = cleaned.split('/')[0];
            } catch {}

            linkList.push({
              id: `${msg.id}_${urlIdx}`,
              messageId: msg.id,
              url,
              title: url.length > 50 ? url.substring(0, 50) + '...' : url,
              domain,
              senderName: msg.senderName,
              createdAt: msg.createdAt,
            });
          });
        }
      }
    });

    return {
      images: imgList,
      videos: vidList,
      documents: docList,
      links: linkList,
      voiceNotes: voiceList,
      totalStorage: sizeSum,
    };
  }, [messages]);

  // Storage Stats computed values
  const formattedStorage = useMemo(() => {
    const mb = totalStorage / (1024 * 1024);
    if (mb < 1) {
      return `${(totalStorage / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  }, [totalStorage]);

  // Quota simulation (100 MB per direct/group chat as simulated company soft ceiling)
  const quotaProgress = useMemo(() => {
    const limit = 100 * 1024 * 1024; // 100MB
    return Math.min(1, totalStorage / limit);
  }, [totalStorage]);

  // ── Actions & Helpers ───────────────────────────────────────────────────────
  const startDownloadFile = async (item: MediaItem) => {
    try {
      toast.info('Downloading file...');
      const localPath = `${FileSystem.documentDirectory}${Date.now()}_${item.name}`;

      const callback = (progress: any) => {
        const percent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
        setDownloadProgress((prev) => ({ ...prev, [item.id]: percent }));
      };

      const task = FileSystem.createDownloadResumable(item.url, localPath, {}, callback);
      const res = await task.downloadAsync();

      if (res && res.status === 200) {
        setDownloadProgress((prev) => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
        toast.success('Download Complete!');
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(res.uri);
        } else {
          toast.info(`Saved to local: ${res.uri}`);
        }
      }
    } catch (e: any) {
      toast.error('Download Failed: ' + e.message);
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    toast.success('Copied URL to Clipboard');
  };

  // ── Filter and Sort Processor ───────────────────────────────────────────────
  const filteredActiveItems = useMemo(() => {
    let items: any[] = [];
    if (activeTab === 'images') items = images;
    else if (activeTab === 'videos') items = videos;
    else if (activeTab === 'documents') items = documents;
    else if (activeTab === 'links') items = links;
    else if (activeTab === 'voice') items = voiceNotes;

    // Apply Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((x) => {
        if (activeTab === 'links') {
          return x.url.toLowerCase().includes(q) || x.senderName.toLowerCase().includes(q);
        }
        return x.name.toLowerCase().includes(q) || x.senderName.toLowerCase().includes(q);
      });
    }

    // Apply Document Filter Ext
    if (activeTab === 'documents' && selectedFilterExt) {
      items = items.filter((x) => {
        const ext = x.name.split('.').pop()?.toLowerCase();
        if (selectedFilterExt === 'PDF') return ext === 'pdf';
        if (selectedFilterExt === 'ZIP') return ext === 'zip' || ext === 'rar';
        if (selectedFilterExt === 'Office') {
          return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '');
        }
        return true;
      });
    }

    // Apply Sorting
    return [...items].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'largest') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'smallest') return (a.size || 0) - (b.size || 0);
      return 0;
    });
  }, [activeTab, searchQuery, sortBy, selectedFilterExt, images, videos, documents, links, voiceNotes]);

  // Group items by date heading
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      'Last Month': [],
      Older: [],
    };

    const now = dayjs();
    filteredActiveItems.forEach((item) => {
      const date = dayjs(item.createdAt);
      if (date.isSame(now, 'day')) {
        groups['Today'].push(item);
      } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
        groups['Yesterday'].push(item);
      } else if (now.diff(date, 'day') < 7) {
        groups['This Week'].push(item);
      } else if (now.diff(date, 'day') < 30) {
        groups['Last Month'].push(item);
      } else {
        groups['Older'].push(item);
      }
    });

    return Object.keys(groups).reduce((acc, key) => {
      if (groups[key].length > 0) {
        acc.push({ title: key, data: groups[key] });
      }
      return acc;
    }, [] as { title: string; data: any[] }[]);
  }, [filteredActiveItems]);

  // Dynamic flat list rendering layout
  const flatData = useMemo(() => {
    const list: any[] = [];
    groupedItems.forEach((g) => {
      list.push({ type: 'header', title: g.title });
      if (activeTab === 'images' || activeTab === 'videos') {
        const chunks: any[][] = [];
        for (let i = 0; i < g.data.length; i += 3) {
          chunks.push(g.data.slice(i, i + 3));
        }
        chunks.forEach((chunk) => {
          list.push({ type: 'grid_row', data: chunk });
        });
      } else {
        g.data.forEach((item) => {
          list.push({ type: 'item', data: item });
        });
      }
    });
    return list;
  }, [groupedItems, activeTab]);

  const renderTabButton = (tab: MediaTab, label: string, icon: string, count: number) => {
    const isSel = activeTab === tab;
    return (
      <Pressable
        onPress={() => {
          setActiveTab(tab);
          setSelectedFilterExt(null);
        }}
        style={[styles.tabBtn, isSel && { borderBottomColor: colors.primary }]}
      >
        <Ionicons name={icon as any} size={18} color={isSel ? colors.primary : colors.textMuted} />
        <Text
          style={[
            styles.tabText,
            {
              color: isSel ? colors.primary : colors.textMuted,
              fontFamily: isSel ? typography.fonts.bold : typography.fonts.semibold,
            },
          ]}
        >
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: isSel ? `${colors.primary}18` : colors.neutralLight }]}>
            <Text style={{ fontSize: 9, fontFamily: typography.fonts.bold, color: isSel ? colors.primary : colors.textMuted }}>
              {count}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, spacing.md) }]}>
      {/* ─── HEADER ─── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Shared Media
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fonts.medium }}>
            {partnerName}
          </Text>
        </View>
      </View>

      {/* ─── STORAGE BAR ─── */}
      <View style={[styles.storageContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.storageTextRow}>
          <Text style={{ fontSize: 13, fontFamily: typography.fonts.bold, color: colors.text }}>
            Shared Storage
          </Text>
          <Text style={{ fontSize: 12, fontFamily: typography.fonts.semibold, color: colors.primary }}>
            {formattedStorage} used
          </Text>
        </View>
        <View style={[styles.storageBarBg, { backgroundColor: colors.neutralLight }]}>
          <View style={[styles.storageBarFill, { width: `${quotaProgress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 4 }}>
          Soft ceiling quota simulated at 100 MB per chat room
        </Text>
      </View>

      {/* ─── TABS ─── */}
      <View style={[styles.tabsWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {renderTabButton('images', 'Images', 'image-outline', images.length)}
        {renderTabButton('videos', 'Videos', 'videocam-outline', videos.length)}
        {renderTabButton('documents', 'Docs', 'document-text-outline', documents.length)}
        {renderTabButton('links', 'Links', 'link-outline', links.length)}
        {renderTabButton('voice', 'Voice', 'mic-outline', voiceNotes.length)}
      </View>

      {/* ─── FILTER & SORT ROW ─── */}
      <View style={styles.actionRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textLight} />
          <TextInput
            placeholder="Search shared media..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
          />
        </View>
        <Pressable
          onPress={() => setShowSortSheet(true)}
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="funnel-outline" size={16} color={colors.text} />
        </Pressable>
        {activeTab === 'documents' && (
          <Pressable
            onPress={() => setShowFilterSheet(true)}
            style={[
              styles.actionBtn,
              { backgroundColor: selectedFilterExt ? `${colors.primary}15` : colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="options-outline" size={16} color={selectedFilterExt ? colors.primary : colors.text} />
          </Pressable>
        )}
      </View>

      {/* ─── MAIN ITEMS FLASH LIST ─── */}
      <View style={{ flex: 1 }}>
        {flatData.length === 0 ? (
          <View style={styles.emptyView}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textLight} />
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 12 }}>
              No shared items found in this section
            </Text>
          </View>
        ) : (
          <AnyFlashList
            data={flatData}
            keyExtractor={(item: any, index: number) => `${item.type}_${index}`}
            estimatedItemSize={80}
            renderItem={({ item }: any) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
                      {item.title}
                    </Text>
                  </View>
                );
              }
              // ──── Render grid rows for images and videos ────
              if (item.type === 'grid_row') {
                if (activeTab === 'images') {
                  return (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginVertical: 4 }}>
                      {item.data.map((img: any) => (
                        <Pressable
                          key={img.id}
                          style={{ flex: 1, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}
                          onPress={() =>
                            router.push(
                              `/chat/preview?url=${encodeURIComponent(img.url)}&type=image&name=${encodeURIComponent(
                                img.name
                              )}&conversationId=${conversationId}&activeMessageId=${img.id}` as any
                            )
                          }
                        >
                          <ExpoImage source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          <View style={styles.gridImageMeta}>
                            <Text style={{ fontSize: 8, color: '#FFF' }} numberOfLines={1}>
                              {img.senderName}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                      {item.data.length < 3 && Array.from({ length: 3 - item.data.length }).map((_, idx) => (
                        <View key={idx} style={{ flex: 1, aspectRatio: 1 }} />
                      ))}
                    </View>
                  );
                }

                if (activeTab === 'videos') {
                  return (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginVertical: 4 }}>
                      {item.data.map((vid: any) => (
                        <Pressable
                          key={vid.id}
                          style={{ flex: 1, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}
                          onPress={() =>
                            router.push(
                              `/chat/preview?url=${encodeURIComponent(vid.url)}&type=video&name=${encodeURIComponent(
                                vid.name
                              )}&conversationId=${conversationId}&activeMessageId=${vid.id}` as any
                            )
                          }
                        >
                          <View style={[styles.videoOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                            <Ionicons name="play-circle-outline" size={24} color="#FFF" />
                          </View>
                          {vid.duration && (
                            <View style={styles.durationBadge}>
                              <Text style={{ fontSize: 7, color: '#FFF' }}>
                                {Math.floor(vid.duration)}s
                              </Text>
                            </View>
                          )}
                          <View style={styles.gridImageMeta}>
                            <Text style={{ fontSize: 8, color: '#FFF' }} numberOfLines={1}>
                              {vid.senderName}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                      {item.data.length < 3 && Array.from({ length: 3 - item.data.length }).map((_, idx) => (
                        <View key={idx} style={{ flex: 1, aspectRatio: 1 }} />
                      ))}
                    </View>
                  );
                }
              }

              const dataVal = item.data;

              if (activeTab === 'documents') {
                const ext = dataVal.name.split('.').pop()?.toUpperCase() || 'FILE';
                const progress = downloadProgress[dataVal.id];
                return (
                  <View style={[styles.docCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.docIconCircle, { backgroundColor: `${colors.primary}12` }]}>
                      <Ionicons name="document-attach-outline" size={24} color={colors.primary} />
                      <Text style={[styles.docExtLabel, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                        {ext}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontFamily: typography.fonts.semibold, color: colors.text }} numberOfLines={1}>
                        {dataVal.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        {formatFileSize(dataVal.size)} • By {dataVal.senderName}
                      </Text>
                    </View>
                    <Pressable onPress={() => startDownloadFile(dataVal)} style={styles.docActionBtn}>
                      {progress !== undefined ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="download-outline" size={20} color={colors.text} />
                      )}
                    </Pressable>
                  </View>
                );
              }

              if (activeTab === 'links') {
                return (
                  <View style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.linkFavicon, { backgroundColor: colors.neutralLight }]}>
                      <ExpoImage
                        source={{ uri: `https://www.google.com/s2/favicons?sz=64&domain=${dataVal.domain}` }}
                        style={{ width: 24, height: 24 }}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 13, color: colors.textLight, fontFamily: typography.fonts.medium }}>
                        {dataVal.domain}
                      </Text>
                      <Pressable onPress={() => Linking.openURL(dataVal.url)}>
                        <Text style={{ fontSize: 14, color: colors.primary, fontFamily: typography.fonts.bold, textDecorationLine: 'underline', marginTop: 2 }} numberOfLines={2}>
                          {dataVal.url}
                        </Text>
                      </Pressable>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        By {dataVal.senderName}
                      </Text>
                    </View>
                    <Pressable onPress={() => copyToClipboard(dataVal.url)} style={styles.docActionBtn}>
                      <Ionicons name="copy-outline" size={18} color={colors.textLight} />
                    </Pressable>
                  </View>
                );
              }

              if (activeTab === 'voice') {
                return <VoicePlaybackItem item={dataVal} colors={colors} typography={typography} />;
              }

              return null;
            }}
          />
        )}
      </View>

      {/* ─── SORT OPTIONS BOTTOM SHEET overlay ─── */}
      {showSortSheet && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowSortSheet(false)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Sort Shared Media
            </Text>
            {(['newest', 'oldest', 'largest', 'smallest'] as SortOption[]).map((opt) => {
              const isSel = sortBy === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setSortBy(opt);
                    setShowSortSheet(false);
                  }}
                  style={styles.sheetOption}
                >
                  <Text style={{ fontSize: 14, color: isSel ? colors.primary : colors.text, fontFamily: isSel ? typography.fonts.bold : typography.fonts.regular }}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)} first
                  </Text>
                  {isSel && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      )}

      {/* ─── FILTER OPTIONS BOTTOM SHEET overlay ─── */}
      {showFilterSheet && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowFilterSheet(false)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Filter Documents
            </Text>
            {['All', 'PDF', 'ZIP', 'Office'].map((opt) => {
              const filterVal = opt === 'All' ? null : opt;
              const isSel = selectedFilterExt === filterVal;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setSelectedFilterExt(filterVal);
                    setShowFilterSheet(false);
                  }}
                  style={styles.sheetOption}
                >
                  <Text style={{ fontSize: 14, color: isSel ? colors.primary : colors.text, fontFamily: isSel ? typography.fonts.bold : typography.fonts.regular }}>
                    {opt} files
                  </Text>
                  {isSel && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  storageContainer: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  storageTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 10,
    marginTop: 4,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  imageGridRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  imageCard: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImageMeta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  docIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  docExtLabel: {
    fontSize: 8,
    position: 'absolute',
    bottom: 4,
  },
  docActionBtn: {
    padding: 8,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkFavicon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  voicePlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  waveformBar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  voiceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  speedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 35,
  },
  sheetTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
});
