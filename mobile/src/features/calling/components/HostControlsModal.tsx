/**
 * @file HostControlsModal.tsx
 * @description Modal control panel for meeting hosts to manage participants,
 *              execute Mute All, lock meeting, or terminate meeting for everyone.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useCallStore from '../store/useCallStore';
import { Avatar } from '../../../shared/components/Avatar';
import { toast } from '../../../shared/components/Toast';

interface HostControlsModalProps {
  visible: boolean;
  onClose: () => void;
  onEndMeetingForEveryone: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({
  visible,
  onClose,
  onEndMeetingForEveryone,
}) => {
  const {
    groupParticipants,
    isMeetingLocked,
    setIsMeetingLocked,
    removeParticipant,
    setGroupParticipants,
  } = useCallStore();

  const handleMuteAll = () => {
    const updated = groupParticipants.map((p) => ({ ...p, isAudioMuted: true }));
    setGroupParticipants(updated);
    toast.info('Muted all participants');
  };

  const handleToggleLock = () => {
    const nextLocked = !isMeetingLocked;
    setIsMeetingLocked(nextLocked);
    toast.info(nextLocked ? 'Meeting locked' : 'Meeting unlocked');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Host Control Panel</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Quick Action Controls */}
          <View style={styles.actionsRow}>
            <Pressable onPress={handleMuteAll} style={styles.actionCard}>
              <Ionicons name="mic-off" size={20} color="#EF4444" />
              <Text style={styles.actionText}>Mute All</Text>
            </Pressable>

            <Pressable
              onPress={handleToggleLock}
              style={[styles.actionCard, isMeetingLocked && styles.activeActionCard]}
            >
              <Ionicons name={isMeetingLocked ? 'lock-closed' : 'lock-open'} size={20} color="#38BDF8" />
              <Text style={styles.actionText}>{isMeetingLocked ? 'Locked' : 'Lock Room'}</Text>
            </Pressable>
          </View>

          {/* Participant Management List */}
          <Text style={styles.sectionHeader}>Participants ({groupParticipants.length})</Text>
          <FlatList
            data={groupParticipants}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.participantRow}>
                <Avatar name={item.name} size={40} source={item.avatar || undefined} />
                <View style={styles.infoCol}>
                  <Text style={styles.nameText}>{item.name}</Text>
                  <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                </View>

                {item.role !== 'host' && (
                  <Pressable
                    onPress={() => {
                      removeParticipant(item.userId);
                      toast.info(`Removed ${item.name}`);
                    }}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="person-remove" size={18} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            )}
          />

          {/* End Meeting for Everyone Button */}
          <Pressable onPress={onEndMeetingForEveryone} style={styles.endAllBtn}>
            <Ionicons name="power" size={20} color="#FFFFFF" />
            <Text style={styles.endAllText}>End Meeting for Everyone</Text>
          </Pressable>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeActionCard: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  actionText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 14,
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  nameText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  roleText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  removeBtn: {
    padding: 6,
  },
  endAllBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  endAllText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default HostControlsModal;
