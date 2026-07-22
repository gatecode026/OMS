/**
 * @file AiMeetingSummaryModal.tsx
 * @description Executive Meeting Summary modal rendering overview, key decisions,
 *              risks, and action items with one-click creation in OMS Tasks.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAiStore from '../store/useAiStore';
import { toast } from '../../../shared/components/Toast';

interface AiMeetingSummaryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AiMeetingSummaryModal: React.FC<AiMeetingSummaryModalProps> = ({
  visible,
  onClose,
}) => {
  const { currentSummary, markActionItemCreated } = useAiStore();

  if (!currentSummary) return null;

  const handleExportTask = (itemId: string, title: string) => {
    markActionItemCreated(itemId);
    toast.success(`Task "${title}" exported to OMS Tasks!`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={20} color="#38BDF8" />
              <Text style={styles.title}>AI Meeting Intelligence</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Executive Summary Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Executive Summary</Text>
              <Text style={styles.bodyText}>{currentSummary.executiveSummary}</Text>
            </View>

            {/* Key Decisions Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Key Decisions</Text>
              {currentSummary.keyDecisions.map((decision, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.bulletText}>{decision}</Text>
                </View>
              ))}
            </View>

            {/* Action Items Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Action Items & Tasks</Text>
              {currentSummary.actionItems.map((item) => (
                <View key={item.id} style={styles.actionItemCard}>
                  <View style={styles.actionInfoCol}>
                    <Text style={styles.actionTitle}>{item.title}</Text>
                    {item.assigneeName && (
                      <Text style={styles.assigneeText}>Assignee: {item.assigneeName}</Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleExportTask(item.id, item.title)}
                    disabled={item.status === 'created_in_tasks'}
                    style={[
                      styles.exportBtn,
                      item.status === 'created_in_tasks' && styles.exportedBtn,
                    ]}
                  >
                    <Text style={styles.exportText}>
                      {item.status === 'created_in_tasks' ? 'Exported' : '+ Create Task'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  bodyText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bulletText: {
    color: '#F1F5F9',
    fontSize: 14,
    flex: 1,
  },
  actionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  actionInfoCol: {
    flex: 1,
  },
  actionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  assigneeText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  exportBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  exportedBtn: {
    backgroundColor: '#334155',
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default AiMeetingSummaryModal;
