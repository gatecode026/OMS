/**
 * @file FileMessage.tsx
 * @description Premium document/file message bubble.
 * Dynamically resolves the correct icon and color per MIME type.
 * Shows file extension badge, size, name, and a download/open button.
 * Tapping opens the native OS viewer or the in-app preview screen.
 */

import React, { useState } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import useTheme from '../../../../shared/hooks/useTheme';
import { toast } from '../../../../shared/components/Toast';
import {
  getFileIcon,
  getFileExtension,
  formatBytes,
} from '../../utils/fileUtils';

interface FileMessageProps {
  mediaUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  isMe: boolean;
}

export const FileMessage: React.FC<FileMessageProps> = ({
  mediaUrl,
  fileName,
  mimeType,
  fileSize,
  isMe,
}) => {
  const router = useRouter();
  const { colors, typography, radius } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const { icon, color, bgColor, label } = getFileIcon(mimeType, fileName);
  const ext = getFileExtension(fileName);

  const handleOpen = () => {
    // Navigate to in-app preview
    const params = new URLSearchParams({
      url: mediaUrl,
      type: 'file',
      name: fileName || 'Document',
      size: String(fileSize || 0),
    });
    router.push(`/chat/preview?${params.toString()}` as any);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const destUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        mediaUrl,
        destUri,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setDownloadProgress(Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100));
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result?.uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri, { mimeType: mimeType ?? undefined });
        } else {
          toast.success('File saved to device.');
        }
      }
    } catch (err) {
      toast.error('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const textColor = isMe ? '#FFFFFF' : colors.text;
  const mutedTextColor = isMe ? 'rgba(255,255,255,0.65)' : colors.textMuted;
  const borderColor = isMe ? 'rgba(255,255,255,0.15)' : colors.border;

  return (
    <View style={[styles.container, { borderColor }]}>
      {/* Left: Icon block */}
      <Pressable
        onPress={handleOpen}
        style={[styles.iconBlock, { backgroundColor: bgColor }]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${label} file`}
      >
        <Ionicons name={icon as any} size={26} color={color} />
        {ext ? (
          <View style={[styles.extBadge, { backgroundColor: color }]}>
            <Text style={styles.extBadgeText}>{ext}</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Middle: Name + size */}
      <Pressable onPress={handleOpen} style={styles.infoBlock}>
        <Text
          style={[styles.fileName, { color: textColor, fontFamily: typography.fonts.semibold }]}
          numberOfLines={2}
        >
          {fileName}
        </Text>
        <Text style={[styles.fileMeta, { color: mutedTextColor }]}>
          {label}{fileSize ? ` · ${formatBytes(fileSize)}` : ''}
        </Text>

        {/* Download progress bar */}
        {isDownloading && (
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${downloadProgress}%`, backgroundColor: color }]} />
          </View>
        )}
      </Pressable>

      {/* Right: Download button */}
      <Pressable
        onPress={handleDownload}
        style={styles.downloadBtn}
        accessibilityRole="button"
        accessibilityLabel="Download file"
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={isMe ? '#FFFFFF' : color} />
        ) : (
          <Ionicons
            name="cloud-download-outline"
            size={20}
            color={isMe ? 'rgba(255,255,255,0.8)' : color}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 240,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 4,
  },
  iconBlock: {
    width: 56,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 10,
  },
  extBadge: {
    position: 'absolute',
    bottom: 6,
    right: 4,
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  extBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  infoBlock: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 4,
  },
  fileName: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 10,
  },
  progressBarTrack: {
    marginTop: 5,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  downloadBtn: {
    width: 40,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FileMessage;
