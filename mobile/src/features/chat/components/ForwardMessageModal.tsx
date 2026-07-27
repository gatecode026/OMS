/**
 * @file ForwardMessageModal.tsx
 * @description Searchable Contact & Conversation picker for forwarding messages
 *              to Direct or Group chats.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import useTheme from '../../../shared/hooks/useTheme';
import { ChatMessage, ChatConversation } from '../types';
import chatApi from '../api/chatApi';
import { toast } from '../../../shared/components/Toast';
import socketManager from '../../../shared/services/socketManager';

interface ForwardMessageModalProps {
  visible: boolean;
  messages: ChatMessage[];
  onClose: () => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  visible,
  messages,
  onClose,
}) => {
  const { colors, typography, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  // Fetch user conversations
  const { data: conversations = [] } = useQuery<ChatConversation[]>({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatApi.fetchConversations(),
    enabled: visible,
  });

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.participants?.some((p: any) => p.name?.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  const toggleSelectTarget = (id: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendForward = async () => {
    if (selectedTargetIds.length === 0 || messages.length === 0) return;
    setIsForwarding(true);

    try {
      const socket = socketManager.getSocket();
      for (const targetId of selectedTargetIds) {
        for (const msg of messages) {
          const forwardPayload = {
            conversationId: targetId,
            content: msg.content || '',
            type: msg.type || 'text',
            media: msg.media,
            isForwarded: true,
            originalSenderName: msg.senderName || 'Contact',
          };

          if (socket && socket.connected) {
            socket.emit('send_message', forwardPayload);
          } else {
            await chatApi.sendMessage(forwardPayload);
          }
        }
      }

      toast.success(`Forwarded to ${selectedTargetIds.length} conversation(s)`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to forward message: ' + (err.message || 'Error'));
    } finally {
      setIsForwarding(false);
    }
  };

  const cardBg = isDark ? '#1F2C34' : '#FFFFFF';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const subTextColor = isDark ? '#8696A0' : '#667781';
  const searchBg = isDark ? '#2A3942' : '#F0F2F5';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" translucent />

        <View style={[styles.container, { backgroundColor: isDark ? '#111B21' : '#F8FAFC' }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: cardBg }]}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={textColor} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: textColor, fontFamily: typography.fonts.bold }]}>
              Forward Message ({messages.length})
            </Text>
            {selectedTargetIds.length > 0 ? (
              <Pressable
                onPress={handleSendForward}
                disabled={isForwarding}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: cardBg }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: searchBg }]}>
              <Ionicons name="search-outline" size={18} color={subTextColor} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search contact or group..."
                placeholderTextColor={subTextColor}
                style={[styles.searchInput, { color: textColor, fontFamily: typography.fonts.regular }]}
              />
            </View>
          </View>

          {/* Conversations List */}
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selectedTargetIds.includes(item.id);
              const title = item.name || item.participants?.[0]?.name || 'Chat';

              return (
                <Pressable
                  onPress={() => toggleSelectTarget(item.id)}
                  style={[styles.conversationRow, { backgroundColor: cardBg }]}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.avatarText, { fontFamily: typography.fonts.bold }]}>
                      {title.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.infoContainer}>
                    <Text style={[styles.targetName, { color: textColor, fontFamily: typography.fonts.semibold }]}>
                      {title}
                    </Text>
                    <Text style={[styles.targetType, { color: subTextColor, fontFamily: typography.fonts.regular }]}>
                      {(item as any).isGroup || item.type === 'group' ? 'Group Chat' : 'Direct Message'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? colors.primary : subTextColor,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  targetName: {
    fontSize: 15,
  },
  targetType: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ForwardMessageModal;
