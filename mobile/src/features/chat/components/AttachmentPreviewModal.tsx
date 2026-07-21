/**
 * @file AttachmentPreviewModal.tsx
 * @description Premium pre-send attachment editor.
 * Full-screen dark modal with:
 *   - Animated toolbar that slides in per media type (image/video/document)
 *   - Caption TextInput at the bottom
 *   - Multi-item carousel with thumbnail strip
 *   - Per-item quality / rotation / trim controls
 *   - File size + MIME type header badge
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTheme from '../../../shared/hooks/useTheme';
import { formatBytes, getFileIcon, getFileExtension } from '../utils/fileUtils';

/**
 * Isolated video player component.
 * useVideoPlayer MUST live here so it only fires when a real URI is mounted.
 * Rendering this component conditionally prevents the native "Received 3 arguments"
 * crash that happens when useVideoPlayer is called with null/empty source.
 */
const VideoPlayerView: React.FC<{ uri: string; style: any }> = ({ uri, style }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={style} nativeControls />;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PreviewItem {
  uri: string;
  name: string;
  mimeType: string;
  type: 'image' | 'video' | 'file';
  size?: number;
  duration?: number;
}

interface AttachmentPreviewModalProps {
  visible: boolean;
  items: PreviewItem[];
  conversationName?: string;
  onCancel: () => void;
  onRetry: () => void;
  onSend: (customizedItems: {
    uri: string;
    name: string;
    mimeType: string;
    type: 'image' | 'file' | 'audio';
    quality?: number;
    rotation?: number;
    trimStart?: number;
    trimEnd?: number;
    caption?: string;
  }[]) => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  visible,
  items,
  conversationName,
  onCancel,
  onRetry,
  onSend,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = items[activeIndex] || null;
  const isCurrentVideo = !!(activeItem && (activeItem.mimeType?.startsWith('video/') || activeItem.type === 'video'));

  // Customization states for each picked item
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [cropToggles, setCropToggles] = useState<Record<number, boolean>>({});
  const [qualities, setQualities] = useState<Record<number, number>>({}); // 0.3 = low, 0.7 = med, 1.0 = high
  const [trimStarts, setTrimStarts] = useState<Record<number, number>>({});
  const [trimEnds, setTrimEnds] = useState<Record<number, number>>({});
  const [caption, setCaption] = useState('');

  // Toolbar slide animation
  const toolbarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(toolbarAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    } else {
      toolbarAnim.setValue(0);
      setActiveIndex(0);
      setCaption('');
    }
  }, [visible]);

  if (!visible || items.length === 0) return null;

  const currentItem = items[activeIndex];
  const currentRotation = rotations[activeIndex] || 0;
  const currentCrop = cropToggles[activeIndex] || false;
  const currentQuality = qualities[activeIndex] ?? 0.7;
  const currentTrimStart = trimStarts[activeIndex] || 0;
  const currentTrimEnd = trimEnds[activeIndex] || (currentItem.duration || 10);

  const isVideo = currentItem.mimeType?.startsWith('video/') || currentItem.type === 'video';
  const isImage = currentItem.mimeType?.startsWith('image/') || currentItem.type === 'image';
  const isDocument = !isVideo && !isImage;

  const fileInfo = isDocument ? getFileIcon(currentItem.mimeType, currentItem.name) : null;
  const ext = getFileExtension(currentItem.name);

  const toolbarTranslateY = toolbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const handleRotate = () =>
    setRotations((prev) => ({ ...prev, [activeIndex]: (currentRotation + 90) % 360 }));

  const handleToggleCrop = () =>
    setCropToggles((prev) => ({ ...prev, [activeIndex]: !currentCrop }));

  const handleSetQuality = (q: number) =>
    setQualities((prev) => ({ ...prev, [activeIndex]: q }));

  const handleTrimChange = (isStart: boolean, delta: number) => {
    const duration = currentItem.duration || 10;
    if (isStart) {
      const nextStart = Math.max(0, Math.min(currentTrimEnd - 1, currentTrimStart + delta));
      setTrimStarts((prev) => ({ ...prev, [activeIndex]: nextStart }));
    } else {
      const nextEnd = Math.min(duration, Math.max(currentTrimStart + 1, currentTrimEnd + delta));
      setTrimEnds((prev) => ({ ...prev, [activeIndex]: nextEnd }));
    }
  };

  const handleSendAll = () => {
    const customized = items.map((item, idx) => {
      const isVid = item.mimeType?.startsWith('video/') || item.type === 'video';
      const sendType = isVid ? 'file' : item.mimeType?.startsWith('audio/') ? 'audio' : 'image';
      return {
        uri: item.uri,
        name: item.name,
        mimeType: item.mimeType,
        type: sendType as 'image' | 'file' | 'audio',
        quality: qualities[idx] ?? 0.7,
        rotation: rotations[idx] || 0,
        trimStart: trimStarts[idx] || 0,
        trimEnd: trimEnds[idx] || item.duration || 0,
        caption: idx === 0 ? caption : undefined, // Caption applies to first item
      };
    });
    onSend(customized);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#090D16' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ─── Header ─── */}
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onCancel} style={styles.headerBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerCenter}>
            {conversationName ? (
              <Text style={[styles.headerConvName, { fontFamily: typography.fonts.semibold }]}>
                To: {conversationName}
              </Text>
            ) : (
              <Text style={[styles.headerTitle, { fontFamily: typography.fonts.semibold }]}>
                Preview
              </Text>
            )}
            <Text style={styles.headerSubtitle}>
              {activeIndex + 1} / {items.length}
              {currentItem.size ? `  ·  ${formatBytes(currentItem.size)}` : ''}
              {ext ? `  ·  ${ext}` : ''}
            </Text>
          </View>

          <Pressable onPress={onRetry} style={styles.headerBtn} hitSlop={10}>
            <Ionicons name="refresh" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* ─── Media Showcase ─── */}
        <View style={styles.showcaseContainer}>
          {isImage ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: currentItem.uri }}
                style={[
                  styles.previewImage,
                  { transform: [{ rotate: `${currentRotation}deg` }] },
                ]}
                resizeMode="contain"
              />
              {currentCrop && (
                <View style={styles.cropOverlay}>
                  <View style={[styles.cropCorner, styles.cropTopLeft]} />
                  <View style={[styles.cropCorner, styles.cropTopRight]} />
                  <View style={[styles.cropCorner, styles.cropBottomLeft]} />
                  <View style={[styles.cropCorner, styles.cropBottomRight]} />
                </View>
              )}
            </View>
          ) : isVideo ? (
            isCurrentVideo ? (
              <VideoPlayerView uri={currentItem.uri} style={styles.previewVideo} />
            ) : null
          ) : (
            <View style={styles.docPlaceholder}>
              <View style={[styles.docIconCircle, { backgroundColor: fileInfo?.bgColor ?? 'rgba(100,116,139,0.15)' }]}>
                <Ionicons name={(fileInfo?.icon ?? 'document-attach') as any} size={52} color={fileInfo?.color ?? '#64748B'} />
              </View>
              <Text style={[styles.docNameText, { fontFamily: typography.fonts.semibold }]} numberOfLines={2}>
                {currentItem.name}
              </Text>
              {currentItem.size ? (
                <Text style={styles.docSizeText}>{formatBytes(currentItem.size)}</Text>
              ) : null}
              {ext ? (
                <View style={[styles.docExtBadge, { backgroundColor: fileInfo?.color ?? '#64748B' }]}>
                  <Text style={styles.docExtText}>{ext}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* ─── Animated Toolbar ─── */}
        <Animated.View
          style={[
            styles.toolbarContainer,
            { opacity: toolbarAnim, transform: [{ translateY: toolbarTranslateY }] },
          ]}
        >
          {isImage && (
            <View style={styles.editorToolsRow}>
              {/* Rotate */}
              <Pressable onPress={handleRotate} style={styles.toolBtn}>
                <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
                <Text style={styles.toolText}>Rotate</Text>
              </Pressable>

              {/* Crop */}
              <Pressable
                onPress={handleToggleCrop}
                style={[styles.toolBtn, currentCrop && styles.activeTool]}
              >
                <Ionicons name="crop-outline" size={22} color={currentCrop ? '#6366F1' : '#FFFFFF'} />
                <Text style={[styles.toolText, currentCrop && { color: '#6366F1' }]}>Crop Box</Text>
              </Pressable>

              {/* Quality */}
              <View style={styles.compressionContainer}>
                <Text style={styles.qualityLabelText}>
                  Quality: {currentQuality === 0.3 ? 'Low' : currentQuality === 0.7 ? 'Medium' : 'High'}
                </Text>
                <View style={styles.qualityToggleGroup}>
                  {([0.3, 0.7, 1.0] as const).map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => handleSetQuality(q)}
                      style={[
                        styles.qualityBtn,
                        currentQuality === q && { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                      ]}
                    >
                      <Text style={[styles.qualityBtnText, currentQuality === q && { color: '#FFFFFF' }]}>
                        {q === 0.3 ? 'L' : q === 0.7 ? 'M' : 'H'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {isVideo && (
            <View style={styles.trimmerWrapper}>
              <Text style={styles.trimmerHeadingText}>
                Video Trim: {currentTrimStart.toFixed(1)}s — {currentTrimEnd.toFixed(1)}s
              </Text>
              <View style={styles.trimButtonsRow}>
                {[
                  { label: 'Start −0.5s', onPress: () => handleTrimChange(true, -0.5) },
                  { label: 'Start +0.5s', onPress: () => handleTrimChange(true, 0.5) },
                  { label: 'End −0.5s', onPress: () => handleTrimChange(false, -0.5) },
                  { label: 'End +0.5s', onPress: () => handleTrimChange(false, 0.5) },
                ].map((btn) => (
                  <Pressable key={btn.label} onPress={btn.onPress} style={styles.trimAdjustBtn}>
                    <Text style={styles.trimAdjustBtnText}>{btn.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* ─── Thumbnail Strip ─── */}
        {items.length > 1 && (
          <View style={styles.carouselStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {items.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setActiveIndex(idx)}
                  style={[
                    styles.thumbnailSelect,
                    activeIndex === idx && styles.thumbnailSelectActive,
                  ]}
                >
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.uri }} style={styles.thumbnailImg} />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Ionicons
                        name={item.type === 'video' ? 'videocam-outline' : 'document-text-outline'}
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                  {/* Active highlight ring */}
                  {activeIndex === idx && <View style={styles.thumbnailRing} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Caption + Send Bar ─── */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={[styles.captionInput, { fontFamily: typography.fonts.regular }]}
            multiline
            maxLength={500}
          />
          <View style={styles.sendRow}>
            <Pressable onPress={onCancel} style={styles.actionBtnSecondary} hitSlop={10}>
              <Text style={styles.actionBtnTextSecondary}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSendAll} style={styles.actionBtnPrimary}>
              <Text style={styles.actionBtnTextPrimary}>
                Send{items.length > 1 ? ` (${items.length})` : ''}
              </Text>
              <Ionicons name="send" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerConvName: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    marginTop: 1,
  },
  showcaseContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  imageWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 340,
  },
  cropOverlay: {
    position: 'absolute',
    width: SCREEN_WIDTH - 60,
    height: SCREEN_WIDTH - 60,
    borderColor: '#6366F1',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cropCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#6366F1',
  },
  cropTopLeft: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  cropTopRight: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  cropBottomLeft: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  cropBottomRight: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
  previewVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 340,
  },
  docPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  docIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  docNameText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 22,
  },
  docSizeText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginBottom: 12,
  },
  docExtBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5,
  },
  docExtText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  toolbarContainer: {
    paddingVertical: 10,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  editorToolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  toolBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 56,
  },
  activeTool: {
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  toolText: {
    color: '#FFFFFF',
    fontSize: 9,
    marginTop: 3,
  },
  compressionContainer: {
    alignItems: 'center',
  },
  qualityLabelText: {
    color: '#94A3B8',
    fontSize: 9,
    marginBottom: 4,
  },
  qualityToggleGroup: {
    flexDirection: 'row',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  qualityBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  qualityBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trimmerWrapper: {
    paddingHorizontal: 12,
  },
  trimmerHeadingText: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
  },
  trimButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  trimAdjustBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trimAdjustBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  carouselStrip: {
    height: 64,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  thumbnailSelect: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginHorizontal: 3,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  thumbnailSelectActive: {
    borderColor: '#6366F1',
    borderWidth: 2,
  },
  thumbnailRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    backgroundColor: 'rgba(9,13,22,0.98)',
    paddingTop: 10,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  captionInput: {
    color: '#FFFFFF',
    fontSize: 13,
    minHeight: 36,
    maxHeight: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtnSecondary: {
    padding: 10,
  },
  actionBtnTextSecondary: {
    color: '#94A3B8',
    fontSize: 14,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AttachmentPreviewModal;
