/**
 * @file DocumentPresenter.tsx
 * @description Slide & Document presenter supporting page navigation, zoom,
 *              and live annotation layer overlay.
 */

import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useCollaborationStore from '../store/useCollaborationStore';
import WhiteboardCanvas from './WhiteboardCanvas';

export const DocumentPresenter: React.FC = () => {
  const { presentation, setPresentationPage, setPresentationZoom } = useCollaborationStore();

  if (!presentation) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No presentation document loaded</Text>
      </View>
    );
  }

  const { fileName, fileUrl, currentPage, totalPages, zoomLevel } = presentation;

  return (
    <View style={styles.container}>
      {/* Presentation Content Box */}
      <View style={styles.documentViewer}>
        <Image
          source={{ uri: fileUrl }}
          style={[
            styles.image,
            {
              transform: [{ scale: zoomLevel }],
            },
          ]}
          resizeMode="contain"
        />

        {/* Live Annotation Layer Overlay */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <WhiteboardCanvas />
        </View>
      </View>

      {/* Page Navigation & Zoom Control Bar */}
      <View style={styles.navbar}>
        <Text style={styles.fileNameText} numberOfLines={1}>
          {fileName}
        </Text>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setPresentationPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={[styles.navBtn, currentPage <= 1 && styles.disabledBtn]}
          >
            <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
          </Pressable>

          <Text style={styles.pageText}>
            {currentPage} / {totalPages}
          </Text>

          <Pressable
            onPress={() => setPresentationPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={[styles.navBtn, currentPage >= totalPages && styles.disabledBtn]}
          >
            <Ionicons name="chevron-forward" size={20} color="#F8FAFC" />
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={() => setPresentationZoom(zoomLevel - 0.25)} style={styles.navBtn}>
            <Ionicons name="remove-circle-outline" size={20} color="#F8FAFC" />
          </Pressable>

          <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>

          <Pressable onPress={() => setPresentationZoom(zoomLevel + 0.25)} style={styles.navBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#F8FAFC" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  documentViewer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navbar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  fileNameText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 140,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  pageText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  zoomText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
});

export default DocumentPresenter;
