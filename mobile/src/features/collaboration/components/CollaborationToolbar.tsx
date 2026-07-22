/**
 * @file CollaborationToolbar.tsx
 * @description Floating toolbar providing controls for Pen, Highlighter,
 *              Laser Pointer, Color Picker, Undo, Clear Canvas, and Stop Sharing.
 */

import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useCollaborationStore from '../store/useCollaborationStore';
import { DrawingTool } from '../types/collaboration.types';

const COLORS = ['#38BDF8', '#10B981', '#F59E0B', '#EF4444', '#FFFFFF'];

export const CollaborationToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    undo,
    clearCanvas,
    resetCollaboration,
    collaborationMode,
  } = useCollaborationStore();

  if (collaborationMode === 'none') return null;

  return (
    <View style={styles.toolbarContainer}>
      {/* Tool Selectors */}
      <View style={styles.toolsGroup}>
        <Pressable
          onPress={() => setActiveTool('pen')}
          style={[styles.toolBtn, activeTool === 'pen' && styles.activeBtn]}
        >
          <Ionicons name="pencil" size={18} color={activeTool === 'pen' ? '#FFFFFF' : '#94A3B8'} />
        </Pressable>

        <Pressable
          onPress={() => setActiveTool('highlighter')}
          style={[styles.toolBtn, activeTool === 'highlighter' && styles.activeBtn]}
        >
          <Ionicons name="color-fill" size={18} color={activeTool === 'highlighter' ? '#FFFFFF' : '#94A3B8'} />
        </Pressable>

        <Pressable
          onPress={() => setActiveTool('laser')}
          style={[styles.toolBtn, activeTool === 'laser' && styles.activeBtn]}
        >
          <Ionicons name="navigate" size={18} color={activeTool === 'laser' ? '#FFFFFF' : '#94A3B8'} />
        </Pressable>

        <Pressable onPress={undo} style={styles.toolBtn}>
          <Ionicons name="arrow-undo" size={18} color="#94A3B8" />
        </Pressable>

        <Pressable onPress={clearCanvas} style={styles.toolBtn}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Color Palette Picker */}
      <View style={styles.colorsGroup}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setStrokeColor(c)}
            style={[styles.colorDot, { backgroundColor: c }, strokeColor === c && styles.activeColorDot]}
          />
        ))}
      </View>

      <View style={styles.divider} />

      {/* Stop Sharing Button */}
      <Pressable onPress={resetCollaboration} style={styles.stopBtn}>
        <Ionicons name="stop-circle" size={18} color="#FFFFFF" />
        <Text style={styles.stopText}>Stop</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 1000,
  },
  toolsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  activeBtn: {
    backgroundColor: '#38BDF8',
  },
  colorsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  activeColorDot: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
  },
  stopBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  stopText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CollaborationToolbar;
