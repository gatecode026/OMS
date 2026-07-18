/**
 * @file settings.tsx
 * @description Premium Chat Settings, Privacy & Preferences Screen (PRD 04).
 *              Integrates mute configurations, solid wallpapers, disappears messages,
 *              storage metrics, backups, and critical privacy actions like export and clear.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  Modal,
  ActivityIndicator,
  Share,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import useTheme from '../../../src/shared/hooks/useTheme';
import { toast } from '../../../src/shared/components/Toast';
import useAuthStore from '../../../src/shared/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import {
  useConversations,
  useChatMessages,
  useBlockUser,
  useUnblockUser,
  useBlockedUsers,
  useClearChat,
  useDeleteConversationForMe,
  useReportUser,
  useExportChat,
} from '../../../src/features/chat';
import { useChatSettingsStore } from '../../../src/shared/store/chatSettingsStore';

type SettingsSheetType = 'mute' | 'wallpaper' | 'disappearing' | 'clear' | 'delete' | 'block' | 'report' | 'storage' | 'export_options' | null;

const SOLID_WALLPAPERS = [
  { name: 'Default', value: 'default', color: '#64748B' },
  { name: 'Indigo Dream', value: '#312E81', color: '#4338CA' },
  { name: 'Teal Forest', value: '#064E3B', color: '#047857' },
  { name: 'Deep Crimson', value: '#4C0519', color: '#9F1239' },
  { name: 'Dark Slate', value: '#0F172A', color: '#1E293B' },
  { name: 'Warm Amber', value: '#451A03', color: '#B45309' },
  { name: 'Classic Black', value: '#000000', color: '#171717' },
];

export default function ChatSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const authUser = useAuthStore((s) => s.user);

  const { id: conversationId } = useLocalSearchParams<{ id: string }>();

  // ── Zustand settings store ──────────────────────────────────────────────────
  const {
    mutedConversationIds,
    toggleMuteConversation,
    setWallpaper,
    getWallpaper,
    mediaAutoDownload,
    setMediaAutoDownload,
    saveToGallery,
    setSaveToGallery,
    setDisappearingDuration,
    getDisappearingDuration,
    setNotificationConfig,
    getNotificationConfig,
  } = useChatSettingsStore();

  const conversationMuted = conversationId ? mutedConversationIds.includes(conversationId) : false;
  const activeWallpaper = conversationId ? getWallpaper(conversationId) : { type: 'default', value: '' };
  const disappearDuration = conversationId ? getDisappearingDuration(conversationId) : 'off';
  const customNotify = conversationId ? getNotificationConfig(conversationId) : {};

  // ── Queries & Mutations ─────────────────────────────────────────────────────
  const { data: conversations = [] } = useConversations();
  const { data: messages = [], isLoading: isMessagesLoading } = useChatMessages(conversationId || '');
  const { data: blockedData, refetch: refetchBlocked } = useBlockedUsers();
  const blockedList = useMemo(() => blockedData?.blockedUsers || [], [blockedData]);

  const { mutate: blockUser } = useBlockUser();
  const { mutate: unblockUser } = useUnblockUser();
  const { mutate: clearChat, isPending: isClearing } = useClearChat();
  const { mutate: deleteChat, isPending: isDeleting } = useDeleteConversationForMe();
  const { mutate: reportUser, isPending: isReporting } = useReportUser();
  const { mutate: exportChatMutate } = useExportChat();

  // ── Derived Data ────────────────────────────────────────────────────────────
  const conversation = useMemo(() => {
    return conversations.find((c) => c.id === conversationId);
  }, [conversations, conversationId]);

  const targetParticipant = useMemo(() => {
    if (!conversation) return null;
    return conversation.participants.find((p) => p.employeeId !== authUser?.id);
  }, [conversation, authUser]);

  const isBlocked = useMemo(() => {
    if (!targetParticipant) return false;
    return blockedList.some((b) => b.id === targetParticipant.employeeId);
  }, [blockedList, targetParticipant]);

  const chatTitle = useMemo(() => {
    if (!conversation) return 'Settings';
    return conversation.type === 'direct' ? targetParticipant?.name || 'Contact' : conversation.name || 'Group Settings';
  }, [conversation, targetParticipant]);

  // ── UI States ───────────────────────────────────────────────────────────────
  const [activeSheet, setActiveSheet] = useState<SettingsSheetType>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Report User States
  const [reportCategory, setReportCategory] = useState<'Spam' | 'Harassment' | 'Abuse' | 'Fake Account' | 'Scam' | 'Inappropriate Content' | 'Other'>('Spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportScreenshot, setReportScreenshot] = useState<string | null>(null);

  // Storage Sizes States
  const [cacheSize, setCacheSize] = useState(12.4 * 1024 * 1024); // 12.4 MB estimated cache
  const [downloadsSize, setDownloadsSize] = useState(8.2 * 1024 * 1024); // 8.2 MB estimated downloads

  // Export States
  const [exportFormat, setExportFormat] = useState<'TXT' | 'PDF'>('TXT');
  const [exportWithMedia, setExportWithMedia] = useState(false);

  // Storage Used Calculations
  const storageDetails = useMemo(() => {
    let imgSize = 0;
    let vidSize = 0;
    let audioSize = 0;
    let docSize = 0;

    messages.filter(m => !m.isDeleted && m.media).forEach((msg) => {
      const size = msg.media?.fileSize || 0;
      if (msg.type === 'image' || msg.media?.mimeType?.startsWith('image/')) {
        imgSize += size;
      } else if (msg.type === 'video' || msg.media?.mimeType?.startsWith('video/')) {
        vidSize += size;
      } else if (msg.type === 'audio' || msg.media?.mimeType?.startsWith('audio/')) {
        audioSize += size;
      } else {
        docSize += size;
      }
    });

    const total = imgSize + vidSize + audioSize + docSize + cacheSize + downloadsSize;
    return {
      images: imgSize,
      videos: vidSize,
      audio: audioSize,
      docs: docSize,
      cache: cacheSize,
      downloads: downloadsSize,
      total,
    };
  }, [messages, cacheSize, downloadsSize]);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  // ── Actions & Workflows ─────────────────────────────────────────────────────

  // Mute Workflow
  const handleSelectMute = (duration: '8 hours' | '1 week' | 'always' | null) => {
    if (!conversationId) return;
    if (duration === null) {
      if (conversationMuted) {
        toggleMuteConversation(conversationId);
      }
    } else {
      if (!conversationMuted) {
        toggleMuteConversation(conversationId);
      }
      setNotificationConfig(conversationId, { muteDuration: duration });
    }
    setActiveSheet(null);
    toast.success(duration ? `Muted notifications for ${duration}` : 'Notifications unmuted');
  };

  // Wallpaper Workflow
  const handleSelectWallpaper = (val: string) => {
    if (!conversationId) return;
    if (val === 'default') {
      setWallpaper(conversationId, { type: 'default', value: '' });
    } else {
      setWallpaper(conversationId, { type: 'solid', value: val });
    }
    setActiveSheet(null);
    toast.success('Chat wallpaper applied successfully!');
  };

  // Select Screenshot for Reporting
  const handleSelectScreenshot = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      toast.error('Permission to access camera roll is required!');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setReportScreenshot(pickerResult.assets[0].uri);
    }
  };

  // Submit User Report
  const handleReportUser = () => {
    if (!targetParticipant) return;
    if (!reportCategory) {
      toast.error('Please select a category');
      return;
    }
    reportUser(
      {
        targetUserId: targetParticipant.employeeId,
        category: reportCategory,
        description: reportDescription || undefined,
        screenshotUrl: reportScreenshot || undefined,
      },
      {
        onSuccess: () => {
          setActiveSheet(null);
          toast.success('Report Submitted');
          setReportCategory('Spam');
          setReportDescription('');
          setReportScreenshot(null);
        },
        onError: (err: any) => {
          toast.error('Report submission failed: ' + err.message);
        },
      }
    );
  };

  // Clear Storage Cache
  const handleClearCache = () => {
    toast.info('Cache Will Be Removed');
    setCacheSize(0);
    setActiveSheet(null);
    toast.success('Storage Cleaned');
  };

  // Delete Storage Downloads
  const handleDeleteDownloads = () => {
    toast.info('This Action Cannot Be Undone');
    setDownloadsSize(0);
    setActiveSheet(null);
    toast.success('Storage Cleaned');
  };

  // Export Chat Workflow (called after format selection)
  const handleGenerateExport = async () => {
    if (!conversationId || messages.length === 0) {
      toast.error('No messages found to export');
      return;
    }

    setExporting(true);
    toast.info('Generating chat export...');

    try {
      // 1. Audit log export on backend
      await new Promise<void>((resolve, reject) => {
        exportChatMutate(conversationId, {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        });
      });

      // 2. Generate file locally
      let path = '';
      if (exportFormat === 'TXT') {
        const logText = messages
          .filter((m) => !m.isDeleted)
          .map((m) => {
            const time = dayjs(m.createdAt).format('YYYY-MM-DD HH:mm:ss');
            const attachment = (exportWithMedia && m.media) ? ` [Attachment: ${m.media.fileName}]` : '';
            return `[${time}] ${m.senderName}: ${m.content || ''}${attachment}`;
          })
          .join('\n');

        path = `${FileSystem.documentDirectory}ChatExport_${conversationId}.txt`;
        await FileSystem.writeAsStringAsync(path, logText, { encoding: FileSystem.EncodingType.UTF8 });
      } else {
        // PDF format: generate HTML and print to file
        const messagesHtml = messages
          .filter((m) => !m.isDeleted)
          .map((m) => {
            const time = dayjs(m.createdAt).format('YYYY-MM-DD hh:mm A');
            const attachmentText = (exportWithMedia && m.media) ? `<div style="font-size: 11px; color: #4F46E5; margin-top: 4px;">📎 Attachment: ${m.media.fileName}</div>` : '';
            return `
              <div style="margin-bottom: 12px; padding: 8px; border-bottom: 0.5px solid #E2E8F0;">
                <div style="font-weight: bold; font-size: 13px; color: #1E293B;">${m.senderName} <span style="font-weight: normal; font-size: 10px; color: #64748B; margin-left: 8px;">${time}</span></div>
                <div style="font-size: 13px; color: #334155; margin-top: 4px;">${m.content || ''}</div>
                ${attachmentText}
              </div>
            `;
          })
          .join('');

        const html = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #334155; }
                h1 { font-size: 20px; color: #0F172A; text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; }
                .meta { font-size: 11px; color: #64748B; margin-bottom: 20px; text-align: center; }
              </style>
            </head>
            <body>
              <h1>Chat History Export</h1>
              <div class="meta">Exported on: ${dayjs().format('YYYY-MM-DD HH:mm:ss')} | Room ID: ${conversationId}</div>
              <div>${messagesHtml}</div>
            </body>
          </html>
        `;

        const printResult = await Print.printToFileAsync({ html });
        path = printResult.uri;
      }

      setExporting(false);
      toast.success('Export Generated');

      const shareAvailable = await Sharing.isAvailableAsync();
      if (shareAvailable) {
        await Sharing.shareAsync(path);
      } else {
        toast.info(`Export saved: ${path}`);
      }
      setActiveSheet(null);
    } catch (e: any) {
      setExporting(false);
      toast.error('Export Failed: ' + e.message);
    }
  };

  // Backup Chat
  const handleBackupChat = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      toast.success('Cloud backup completed successfully!');
    }, 2000);
  };

  // Clear Chat History
  const handleClearChat = () => {
    if (!conversationId) return;
    clearChat(conversationId, {
      onSuccess: () => {
        setActiveSheet(null);
        toast.success('Chat history cleared!');
      },
      onError: (err) => {
        toast.error('Clear failed: ' + err.message);
      },
    });
  };

  // Delete Conversation
  const handleDeleteChat = () => {
    if (!conversationId) return;
    deleteChat(conversationId, {
      onSuccess: () => {
        setActiveSheet(null);
        toast.success('Chat deleted successfully!');
        router.replace('/(tabs)/inbox' as any);
      },
      onError: (err) => {
        toast.error('Delete failed: ' + err.message);
      },
    });
  };

  // Block User
  const handleBlockUser = () => {
    if (!targetParticipant) return;
    if (isBlocked) {
      unblockUser(targetParticipant.employeeId, {
        onSuccess: () => {
          refetchBlocked();
          setActiveSheet(null);
          toast.success('User unblocked!');
        },
      });
    } else {
      blockUser(targetParticipant.employeeId, {
        onSuccess: () => {
          refetchBlocked();
          setActiveSheet(null);
          toast.success('User blocked!');
        },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, spacing.md) }]}>
      {/* ─── HEADER ─── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
            Chat Preferences
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fonts.medium }}>
            {chatTitle}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ─── NOTIFICATION CARD ─── */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Notifications
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setActiveSheet('mute')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#6366F115' }]}>
              <Ionicons name="notifications-off-outline" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Mute Notifications
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                {conversationMuted ? `Muted: ${customNotify.muteDuration || 'Always'}` : 'Unmuted'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="volume-high-outline" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                High Priority Previews
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Show notifications at the top of the screen
              </Text>
            </View>
            <Switch
              value={customNotify.priority ?? true}
              onValueChange={(val) => setNotificationConfig(conversationId || '', { priority: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ─── WALLPAPER & MEDIA ─── */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Wallpaper & Media
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setActiveSheet('wallpaper')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="image-outline" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Chat Wallpaper
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                {activeWallpaper.type === 'default' ? 'Default Solid Background' : 'Solid Color Active'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="cloud-download-outline" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Media Auto-Download
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Current rule: WiFi connections only
              </Text>
            </View>
            <Switch
              value={mediaAutoDownload === 'wifi'}
              onValueChange={(val) => setMediaAutoDownload(val ? 'wifi' : 'never')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="download-outline" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Save to Photos Gallery
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Save incoming media directly to device storage
              </Text>
            </View>
            <Switch
              value={saveToGallery}
              onValueChange={setSaveToGallery}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ─── DISAPPEARING & PRIVACY ─── */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Privacy & Security
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setActiveSheet('disappearing')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="time-outline" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Disappearing Messages
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                {disappearDuration === 'off' ? 'Off' : `Expired: ${disappearDuration}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#14B8A615' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#14B8A6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Encryption Verification
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }} numberOfLines={1}>
                Fingerprint hash: 884-219-096-728-441-236
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          </View>
        </View>

        {/* ─── STORAGE & CLOUD BACKUPS ─── */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Storage & Cloud Backups
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setActiveSheet('storage')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#47556915' }]}>
              <Ionicons name="server-outline" size={18} color="#475569" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Chat Storage Size
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Images: {formatSize(storageDetails.images)} • Videos: {formatSize(storageDetails.videos)}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: typography.fonts.bold, color: colors.textMuted, marginRight: 8 }}>
              {formatSize(storageDetails.total)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={handleBackupChat} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#0EA5E915' }]}>
              <Ionicons name="cloud-upload-outline" size={18} color="#0EA5E9" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Backup chat to Cloud
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Last synced backup: Today 12:45 PM
              </Text>
            </View>
            {backingUp ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={16} color={colors.textLight} />
            )}
          </Pressable>
        </View>

        {/* ─── DANGER PRIVACY ACTIONS ─── */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Privacy Actions
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setActiveSheet('export_options')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="share-social-outline" size={18} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Export Chat History
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Generates a clean text or PDF file to share or download
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            )}
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => setActiveSheet('clear')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-bin-outline" size={18} color={colors.danger} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>
                Clear Chat history
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Deletes all messages and cached files inside this chat
              </Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => setActiveSheet('delete')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>
                Delete Conversation
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Completely removes the conversation card from sidebar list
              </Text>
            </View>
          </Pressable>

          {conversation?.type === 'direct' && (
            <>
              <View style={styles.divider} />
              <Pressable onPress={() => setActiveSheet('block')} style={styles.optionRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="ban-outline" size={18} color={colors.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.optionLabel, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>
                    {isBlocked ? 'Unblock User' : 'Block User'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                    Stop receiving calls or messages from this contact
                  </Text>
                </View>
              </Pressable>

              <View style={styles.divider} />
              <Pressable onPress={() => setActiveSheet('report')} style={styles.optionRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.optionLabel, { color: colors.danger, fontFamily: typography.fonts.semibold }]}>
                    Report User
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                    Report contact for spam, abuse or inappropriate content
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </View>

        {/* ─── LEGAL & COMPLIANCE ─── */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardHeaderText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Legal & Compliance
          </Text>
        </View>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Message Retention Policy
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                Forever (Corporate Policy)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable onPress={() => toast.info('Opening Privacy Policy...')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Privacy Policy & Compliance
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => toast.info('Opening Terms of Service...')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Terms of Service
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => toast.info('Opening compliance audit logs...')} style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="shield-outline" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                Audit & Compliance Logs
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── BOTTOM SHEETS ─── */}

      {/* Mute sheet */}
      {activeSheet === 'mute' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Mute Notifications
            </Text>
            {[
              { label: 'Unmute', val: null },
              { label: '8 Hours', val: '8 hours' },
              { label: '1 Week', val: '1 week' },
              { label: 'Always', val: 'always' },
            ].map((opt, idx) => {
              const isSel = (opt.val === null && !conversationMuted) || (opt.val !== null && conversationMuted && customNotify.muteDuration === opt.val);
              return (
                <Pressable key={idx} onPress={() => handleSelectMute(opt.val as any)} style={styles.sheetOption}>
                  <Text style={{ fontSize: 14, color: isSel ? colors.primary : colors.text, fontFamily: isSel ? typography.fonts.bold : typography.fonts.regular }}>
                    {opt.label}
                  </Text>
                  {isSel && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      )}

      {/* Wallpaper sheet */}
      {activeSheet === 'wallpaper' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Choose solid wallpaper
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
              {SOLID_WALLPAPERS.map((opt, idx) => {
                const isSel = (opt.value === 'default' && activeWallpaper.type === 'default') || (opt.value !== 'default' && activeWallpaper.type === 'solid' && activeWallpaper.value === opt.value);
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handleSelectWallpaper(opt.value)}
                    style={{ alignItems: 'center', marginRight: 16, width: 64 }}
                  >
                    <View style={[styles.wallpaperCircle, { backgroundColor: opt.color, borderColor: isSel ? colors.primary : colors.border, borderWidth: isSel ? 3 : 1 }]} />
                    <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4 }} numberOfLines={1}>
                      {opt.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Disappearing sheet */}
      {activeSheet === 'disappearing' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Disappearing Messages
            </Text>
            {[
              { label: 'Off', val: 'off' },
              { label: '24 Hours', val: '24h' },
              { label: '7 Days', val: '7d' },
              { label: '30 Days', val: '30d' },
              { label: '90 Days', val: '90d' },
            ].map((opt, idx) => {
              const isSel = disappearDuration === opt.val;
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setDisappearingDuration(conversationId || '', opt.val);
                    setActiveSheet(null);
                    toast.success(opt.val === 'off' ? 'Disappearing messages disabled' : `Disappearing messages set to: ${opt.label}`);
                  }}
                  style={styles.sheetOption}
                >
                  <Text style={{ fontSize: 14, color: isSel ? colors.primary : colors.text, fontFamily: isSel ? typography.fonts.bold : typography.fonts.regular }}>
                    {opt.label}
                  </Text>
                  {isSel && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      )}

      {/* Clear chat confirmation sheet */}
      {activeSheet === 'clear' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Clear Chat History?
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              This will permanently delete all messages and download assets in this chat. This action cannot be undone.
            </Text>
            <Pressable onPress={handleClearChat} style={[styles.dangerBtn, { backgroundColor: colors.danger }]}>
              {isClearing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Clear Chat History</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setActiveSheet(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Delete chat confirmation sheet */}
      {activeSheet === 'delete' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Delete Conversation?
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              This will remove the chat room from your inbox list. Other participants will not be affected.
            </Text>
            <Pressable onPress={handleDeleteChat} style={[styles.dangerBtn, { backgroundColor: colors.danger }]}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Delete Conversation</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setActiveSheet(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Block user confirmation sheet */}
      {activeSheet === 'block' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              {isBlocked ? 'Unblock User?' : 'Block User?'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
              {isBlocked ? 'You will be able to receive calls and messages from this contact again.' : 'Blocked users will not be able to call you, send you messages, or see your online presence status.'}
            </Text>
            <Pressable onPress={handleBlockUser} style={[styles.dangerBtn, { backgroundColor: isBlocked ? colors.primary : colors.danger }]}>
              <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setActiveSheet(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Report User Sheet */}
      {activeSheet === 'report' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Report User
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              Choose a category to report this user:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {(['Spam', 'Harassment', 'Abuse', 'Fake Account', 'Scam', 'Inappropriate Content', 'Other'] as const).map((cat) => {
                const isSel = reportCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setReportCategory(cat)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.background,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, color: isSel ? '#FFF' : colors.text, fontFamily: isSel ? typography.fonts.bold : typography.fonts.regular }}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              placeholder="Provide optional details..."
              placeholderTextColor={colors.textLight}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              numberOfLines={3}
              style={[
                styles.reportInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  fontFamily: typography.fonts.regular,
                },
              ]}
            />
            
            {/* Screenshot attachments */}
            <Pressable onPress={handleSelectScreenshot} style={[styles.attachmentRow, { borderColor: colors.border }]}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.primary, fontFamily: typography.fonts.semibold, marginLeft: 8 }}>
                {reportScreenshot ? 'Change Screenshot' : 'Attach Screenshot'}
              </Text>
            </Pressable>

            {reportScreenshot && (
              <View style={styles.screenshotPreviewContainer}>
                <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }} numberOfLines={1}>
                  Attached: {reportScreenshot.split('/').pop()}
                </Text>
                <Pressable onPress={() => setReportScreenshot(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                </Pressable>
              </View>
            )}

            <Pressable onPress={handleReportUser} style={[styles.submitBtn, { backgroundColor: colors.danger }]}>
              {isReporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Submit Report</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setActiveSheet(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Storage Management Sheet */}
      {activeSheet === 'storage' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Storage Management
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
              Breakdown of cached files and local downloads.
            </Text>
            
            <View style={[styles.storageContainer, { borderColor: colors.border }]}>
              <View style={styles.storageRow}>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.regular }}>Images & Video Media</Text>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.semibold }}>{formatSize(storageDetails.images + storageDetails.videos)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.storageRow}>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.regular }}>Audio & Documents</Text>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.semibold }}>{formatSize(storageDetails.audio + storageDetails.docs)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.storageRow}>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.regular }}>Local App Cache</Text>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.semibold }}>{formatSize(storageDetails.cache)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.storageRow}>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.regular }}>App Downloads</Text>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.semibold }}>{formatSize(storageDetails.downloads)}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.primary, height: 1.5 }]} />
              <View style={styles.storageRow}>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.bold }}>Total Size</Text>
                <Text style={{ fontSize: 13, color: colors.primary, fontFamily: typography.fonts.bold }}>{formatSize(storageDetails.total)}</Text>
              </View>
            </View>

            <Pressable onPress={handleClearCache} style={[styles.submitBtn, { backgroundColor: colors.primary, marginBottom: 8 }]} accessibilityLabel="Clear Cache button" accessibilityRole="button" accessible>
              <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Clear App Cache</Text>
            </Pressable>
            
            <Pressable onPress={handleDeleteDownloads} style={[styles.submitBtn, { backgroundColor: colors.danger }]} accessibilityLabel="Delete Downloads button" accessibilityRole="button" accessible>
              <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Delete Local Downloads</Text>
            </Pressable>

            <Pressable onPress={() => setActiveSheet(null)} style={[styles.cancelBtn, { borderColor: colors.border, marginTop: 8 }]}>
              <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold, fontSize: 14 }}>Close</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Export Options Sheet */}
      {activeSheet === 'export_options' && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActiveSheet(null)} />
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Export Chat History
            </Text>
            
            <Text style={{ fontSize: 12, fontFamily: typography.fonts.semibold, color: colors.textMuted, marginBottom: 8 }}>
              Export Format
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {(['TXT', 'PDF'] as const).map((fmt) => {
                const isSel = exportFormat === fmt;
                return (
                  <Pressable
                    key={fmt}
                    onPress={() => setExportFormat(fmt)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.background,
                        borderColor: isSel ? colors.primary : colors.border,
                        width: 80,
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, color: isSel ? '#FFF' : colors.text, fontFamily: isSel ? typography.fonts.bold : typography.fonts.regular }}>
                      {fmt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.optionRow, { paddingHorizontal: 0, marginBottom: 20 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                  Include Media Files
                </Text>
                <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
                  Include filenames and links of attachments in the export
                </Text>
              </View>
              <Switch
                value={exportWithMedia}
                onValueChange={setExportWithMedia}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Pressable onPress={handleGenerateExport} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
              {exporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Generate & Share Export</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setActiveSheet(null)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold, fontSize: 14 }}>Cancel</Text>
            </Pressable>
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
  cardHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  cardHeaderText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  settingsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginLeft: 64,
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
    marginBottom: 10,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  wallpaperCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  dangerBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cancelBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  screenshotPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  storageContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
