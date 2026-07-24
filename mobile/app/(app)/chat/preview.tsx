/**
 * @file preview.tsx
 * @description Enhanced Fullscreen Media Viewer with Pinch/Double-tap Zoom, Swipe horizontal gallery,
 *              resumable download progress, and direct sharing controls.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useQueryClient } from '@tanstack/react-query';

import useTheme from '../../../src/shared/hooks/useTheme';
import { toast } from '../../../src/shared/components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Isolated video player — useVideoPlayer only fires when this component mounts.
 * Must NOT be inlined in the parent to preserve hook call order.
 */
const VideoPlayerItem: React.FC<{ url: string; style: any }> = ({ url, style }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  return <VideoView player={player} nativeControls style={style} />;
};

interface MediaItem {
  id: string;
  url: string;
  type: string;
  name: string;
  size?: number | string;
}

export default function MediaPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, spacing, radius, typography } = useTheme();

  // Params
  const { url, type, name, size, conversationId, activeMessageId } = useLocalSearchParams<{
    url: string;
    type: string;
    name: string;
    size: string;
    conversationId?: string;
    activeMessageId?: string;
  }>();

  const [activeIndex, setActiveIndex] = useState(0);
  const [downloadProgresses, setDownloadProgresses] = useState<Record<string, number>>({});
  const [downloadTasks, setDownloadTasks] = useState<Record<string, any>>({});
  const [downloadPausedStates, setDownloadPausedStates] = useState<Record<string, boolean>>({});
  const [zoomScales, setZoomScales] = useState<Record<string, number>>({});
  const scrollViewRefs = useRef<Record<string, any>>({});

  // 1. Resolve media list in current chat thread
  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!conversationId) {
      return [{ id: 'single', url: url || '', type: type || 'image', name: name || 'Media File', size }];
    }
    const msgs = queryClient.getQueryData<any[]>(['chat', 'messages', conversationId]) || [];
    const filtered = msgs
      .filter((m) => !m.isDeleted && (m.type === 'image' || m.type === 'video' || (m.type === 'file' && m.media?.mimeType?.startsWith('video/'))))
      .map((m) => ({
        id: m.id,
        url: m.media?.url || '',
        type: m.type === 'image' ? 'image' : 'video',
        name: m.media?.fileName || 'Attachment',
        size: m.media?.fileSize || 0,
      }));

    return filtered.length > 0 ? filtered : [{ id: 'single', url: url || '', type: type || 'image', name: name || 'Media File', size }];
  }, [conversationId, url, type, name, size]);

  // Set initial scroll index
  const initialIndex = useMemo(() => {
    if (!activeMessageId) return 0;
    const idx = mediaItems.findIndex((item) => item.id === activeMessageId);
    return idx >= 0 ? idx : 0;
  }, [mediaItems, activeMessageId]);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const activeItem = mediaItems[activeIndex] || { id: 'single', url: '', type: 'image', name: '' };

  const formatBytes = (bytes: number | string | undefined, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const num = Number(bytes);
    if (isNaN(num)) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // 2. Download and Resumable Action Handlers
  const startDownload = async (item: MediaItem) => {
    try {
      const fileName = item.name || `file_${Date.now()}`;
      const localPath = `${FileSystem.documentDirectory}${Date.now()}_${fileName}`;

      const callback = (downloadProgress: any) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgresses((prev) => ({ ...prev, [item.id]: progress }));
      };

      const resumable = FileSystem.createDownloadResumable(
        item.url,
        localPath,
        {},
        callback
      );

      setDownloadTasks((prev) => ({ ...prev, [item.id]: resumable }));
      setDownloadPausedStates((prev) => ({ ...prev, [item.id]: false }));

      const downloadResult = await resumable.downloadAsync();
      
      if (downloadResult && downloadResult.status === 200) {
        setDownloadProgresses((prev) => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
        toast.success('Download completed successfully!');
        
        // Share/Open download
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          toast.info(`Saved to local directory: ${downloadResult.uri}`);
        }
      }
    } catch (e: any) {
      if (e.message?.includes('aborted')) return;
      toast.error('Download failed: ' + e.message);
    }
  };

  const pauseDownload = async (itemId: string) => {
    const task = downloadTasks[itemId];
    if (task) {
      await task.pauseAsync();
      setDownloadPausedStates((prev) => ({ ...prev, [itemId]: true }));
      toast.info('Download paused');
    }
  };

  const resumeDownload = async (itemId: string) => {
    const task = downloadTasks[itemId];
    if (task) {
      setDownloadPausedStates((prev) => ({ ...prev, [itemId]: false }));
      try {
        const result = await task.resumeAsync();
        if (result && result.status === 200) {
          setDownloadProgresses((prev) => {
            const copy = { ...prev };
            delete copy[itemId];
            return copy;
          });
          toast.success('Download completed!');
          await Sharing.shareAsync(result.uri);
        }
      } catch (e: any) {
        toast.error('Download failed to resume: ' + e.message);
      }
    }
  };

  const cancelDownload = async (itemId: string) => {
    const task = downloadTasks[itemId];
    if (task) {
      await task.cancelAsync();
      setDownloadProgresses((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      setDownloadPausedStates((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      toast.info('Download cancelled');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#090D16' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeItem.name || 'Media Viewer'}
          </Text>
          {activeItem.size && (
            <Text style={styles.headerSubtitle}>
              {formatBytes(activeItem.size)}
            </Text>
          )}
        </View>
        <Pressable onPress={() => startDownload(activeItem)} style={styles.headerBtn}>
          <Ionicons name="download-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* HORIZONTAL SWIPE MULTI-GALLERY */}
      <FlatList
        data={mediaItems}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(index);
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isImg = item.type === 'image';
          const isVid = item.type === 'video';
          const progress = downloadProgresses[item.id];
          const isPaused = downloadPausedStates[item.id];

          return (
            <View style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              {isImg && item.url ? (
                // Native pinch-to-zoom via ScrollView.maximumZoomScale
                // Double-tap overlay toggles between 1x and 2x
                <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 120, justifyContent: 'center' }}>
                  <ScrollView
                    ref={(ref) => { scrollViewRefs.current[item.id] = ref; }}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 120, justifyContent: 'center' }}
                    scrollEventThrottle={16}
                  >
                    <Image source={{ uri: item.url }} style={styles.imagePreview} resizeMode="contain" />
                  </ScrollView>
                  {/* Double-tap zone */}
                  <Pressable
                    onPress={() => {
                      const currentZoom = zoomScales[item.id] ?? 1;
                      const nextZoom = currentZoom < 1.5 ? 2 : 1;
                      setZoomScales((prev) => ({ ...prev, [item.id]: nextZoom }));
                      scrollViewRefs.current[item.id]?.scrollResponderZoomTo?.({
                        x: 0, y: 0,
                        width: SCREEN_WIDTH / nextZoom,
                        height: (SCREEN_HEIGHT - 120) / nextZoom,
                        animated: true,
                      });
                    }}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="box-none"
                  />
                </View>
              ) : isVid && item.url ? (
                <VideoPlayerItem url={item.url} style={styles.videoPreview} />
              ) : (
                <View style={styles.docWrapper}>
                  <Ionicons name="document-attach" size={80} color="#3B82F6" />
                  <Text style={styles.docTitle}>{item.name}</Text>
                  {item.size && <Text style={styles.docSize}>{formatBytes(item.size)}</Text>}
                </View>
              )}

              {/* Download / Upload progress overlays */}
              {progress !== undefined && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressTitle}>Downloading file: {Math.round(progress * 100)}%</Text>
                  <View style={styles.progressBgBar}>
                    <View style={[styles.progressFillBar, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <View style={styles.progressActionsRow}>
                    {isPaused ? (
                      <Pressable onPress={() => resumeDownload(item.id)} style={styles.progBtn}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                        <Text style={styles.progBtnText}>Resume</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => pauseDownload(item.id)} style={styles.progBtn}>
                        <Ionicons name="pause" size={16} color="#FFFFFF" />
                        <Text style={styles.progBtnText}>Pause</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => cancelDownload(item.id)} style={[styles.progBtn, { backgroundColor: colors.danger }]}>
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                      <Text style={styles.progBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
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
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 99,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 180,
  },
  docWrapper: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  docTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  docSize: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    width: '80%',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 8,
  },
  progressBgBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFillBar: {
    height: '100%',
  },
  progressActionsRow: {
    flexDirection: 'row',
  },
  progBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  progBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginLeft: 4,
  },
});
