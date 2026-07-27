/**
 * @file useChat.ts
 * @description React Query hooks for active/archived conversations, calls, threads, and message interactions.
 */

import { AppState } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chatApi from '../api/chatApi';
import { ChatConversation } from '../types';
import useOfflineStore from '../../../shared/store/offlineStore';
import UserProfileManager from '../../../shared/services/UserProfileManager';

export const useConversations = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      if (__DEV__) console.log('[useConversations] Fetching conversations...');
      const result = await chatApi.fetchConversations();
      if (__DEV__) console.log('[useConversations] Result:', result?.length, 'conversations');

      // ── Seed all participant profiles into UserProfileStore ──────────────────
      // This ensures every avatar in the conversation list and chat rooms
      // resolves from the centralized store (single source of truth)
      if (Array.isArray(result)) {
        const batchEntries: any[] = [];
        for (const conv of result) {
          if (Array.isArray(conv.participants)) {
            for (const p of conv.participants) {
              const pId = String(p.employeeId || (p as any).id || (p as any)._id || (p as any).userId || '');
              const pAvatar = p.avatar || (p as any).avatarUrl || (p as any).profilePhoto || (p as any).photoUrl || null;
              if (pId && pAvatar) {
                batchEntries.push({
                  userId:      pId,
                  employeeId:  (p as any).employeeId,
                  id:          (p as any).id,
                  _id:         (p as any)._id,
                  name:        p.name || '',
                  avatarUrl:   pAvatar,
                  profilePhoto: pAvatar,
                });
              }
            }
          }
        }
        if (batchEntries.length > 0) {
          UserProfileManager.cacheProfilesBatch(batchEntries);
        }
      }

      return result;
    },
    enabled: isConnected,
    refetchOnWindowFocus: true,
  });
};

export const useChatMessages = (conversationId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => chatApi.fetchMessages(conversationId),
    // Guard against literal string 'undefined' from bad navigation params
    enabled: isConnected && !!conversationId && conversationId !== 'undefined',
    staleTime: 30000,
  });
};

export const useStartDirectChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetEmployeeId: string) => chatApi.startDirectChat(targetEmployeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useCreateGroupChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, participantIds, description, avatar }: { name: string; participantIds: string[]; description?: string; avatar?: string }) =>
      chatApi.createGroupChat(name, participantIds, description, avatar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useMarkChatRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.markAsRead(conversationId),
    onMutate: async (conversationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.setQueryData<ChatConversation[]>(['chat', 'conversations'], (old) => {
        if (!old) return old;
        return old.map((conv) => {
          if (conv.id === conversationId || (conv as any)._id === conversationId) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        });
      });
    },
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<ChatConversation[]>(['chat', 'conversations'], (old) => {
        if (!old) return old;
        return old.map((conv) => {
          if (conv.id === conversationId || (conv as any)._id === conversationId) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        });
      });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
  });
};

export const useSearchEmployees = (query: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'employees', query],
    queryFn: async () => {
      const employees = await chatApi.searchEmployees(query);
      if (Array.isArray(employees)) {
        const batchEntries: any[] = [];
        for (const emp of employees) {
          const empId = String(emp.id || emp.employeeId || emp._id || '');
          const empAvatar = emp.avatarUrl || emp.avatar || emp.photoUrl || emp.profilePhoto || null;
          if (empId) {
            batchEntries.push({
              userId:      empId,
              employeeId:  emp.employeeId,
              id:          emp.id,
              _id:         emp._id,
              name:        emp.name || '',
              avatarUrl:   empAvatar,
              profilePhoto: empAvatar,
              designation: emp.designation,
              department:  emp.department,
            });
          }
        }
        if (batchEntries.length > 0) {
          UserProfileManager.cacheProfilesBatch(batchEntries);
        }
      }
      return employees;
    },
    enabled: isConnected,
    staleTime: 60 * 1000, // Cache search results for 1 minute
  });
};

export const useCallHistory = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'calls'],
    queryFn: () => chatApi.fetchCallHistory(),
    enabled: isConnected,
  });
};

export const useArchivedConversations = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'conversations', 'archived'],
    queryFn: () => chatApi.fetchArchivedConversations(),
    enabled: isConnected,
  });
};

export const useArchiveConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.archiveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', 'archived'] });
    },
  });
};

export const useUnarchiveConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.unarchiveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', 'archived'] });
    },
  });
};

export const useClearChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.clearChat(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useReactToMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, reaction }: { messageId: string; reaction: string }) =>
      chatApi.reactToMessage(messageId, reaction),
    onSuccess: () => {
      // Invalidate messages since the reaction affects rendering
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      chatApi.editMessage(messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, deleteForEveryone }: { messageId: string; deleteForEveryone?: boolean }) =>
      chatApi.deleteMessage(messageId, deleteForEveryone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
    },
  });
};

export const useDeleteConversationForMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.deleteConversationForMe(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useBlockUser = () => {
  return useMutation({
    mutationFn: (employeeId: string) => chatApi.blockUser(employeeId),
  });
};

export const useUnblockUser = () => {
  return useMutation({
    mutationFn: (employeeId: string) => chatApi.unblockUser(employeeId),
  });
};

export const useHideConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.hideConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', 'hidden'] });
    },
  });
};

export const useUnhideConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.unhideConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', 'hidden'] });
    },
  });
};

export const useHiddenConversations = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'conversations', 'hidden'],
    queryFn: () => chatApi.fetchHiddenConversations(),
    enabled: isConnected,
  });
};

export const useGlobalSearch = (query: string, category: string = 'all') => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'global-search', query, category],
    queryFn: async () => {
      const results = await chatApi.globalSearch(query, category);
      if (results && Array.isArray(results.contacts)) {
        for (const emp of results.contacts) {
          const empId = String(emp.id || emp.employeeId || emp._id || '');
          const empAvatar = emp.avatarUrl || emp.avatar || emp.photoUrl || emp.profilePhoto || null;
          if (empId) {
            UserProfileManager.cacheProfile({
              userId: empId,
              name: emp.name || '',
              avatarUrl: empAvatar,
              profilePhoto: empAvatar,
              designation: emp.designation,
              department: emp.department,
            });
          }
        }
      }
      return results;
    },
    enabled: isConnected && !!query.trim(),
    staleTime: 10 * 1000,
  });
};

export const useUpdateGroupDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: any }) =>
      chatApi.updateGroupDetails(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
  });
};

export const useThreadActivity = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'threads', 'activity'],
    queryFn: () => chatApi.fetchThreadActivity(),
    enabled: isConnected,
  });
};

export const useThreadDetails = (threadId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'threads', 'details', threadId],
    queryFn: () => chatApi.fetchThreadDetails(threadId),
    enabled: isConnected && !!threadId,
  });
};

export const useThreadReplies = (threadId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'threads', 'replies', threadId],
    queryFn: () => chatApi.fetchThreadReplies(threadId),
    enabled: isConnected && !!threadId,
  });
};

export const useSendThreadReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, content, type, media, tempId }: { threadId: string; content: string; type: string; media?: any; tempId?: string }) =>
      chatApi.sendThreadReply(threadId, { content, type, media, tempId }),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'replies', threadId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'activity'] });
    },
  });
};

export const useFollowThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => chatApi.followThread(threadId),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'details', threadId] });
    },
  });
};

export const useUnfollowThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => chatApi.unfollowThread(threadId),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'details', threadId] });
    },
  });
};

export const useMarkThreadRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => chatApi.markThreadRead(threadId),
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'details', threadId] });
    },
  });
};

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rootMessageId: string) => chatApi.createThread(rootMessageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads', 'activity'] });
    },
  });
};

export const usePinnedMessages = (conversationId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'pinned', conversationId],
    queryFn: () => chatApi.fetchPinnedMessages(conversationId),
    enabled: isConnected && !!conversationId,
  });
};

export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, memberIds }: { conversationId: string; memberIds: string[] }) =>
      chatApi.addGroupMembers(conversationId, memberIds),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, memberId }: { conversationId: string; memberId: string }) =>
      chatApi.removeGroupMember(conversationId, memberId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useBlockedUsers = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'users', 'blocked'],
    queryFn: () => chatApi.fetchBlockedUsers(),
    enabled: isConnected,
  });
};

export const useReportUser = () => {
  return useMutation({
    mutationFn: ({ targetUserId, category, description, screenshotUrl }: { targetUserId: string; category: string; description?: string; screenshotUrl?: string }) =>
      chatApi.reportUser(targetUserId, category, description, screenshotUrl),
  });
};

export const useExportChat = () => {
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.exportChat(conversationId),
  });
};

export const usePinMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      chatApi.pinMessage(conversationId, messageId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'pinned', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
  });
};

export const useUnpinMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      chatApi.unpinMessage(conversationId, messageId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'pinned', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    },
  });
};

export const useStarMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatApi.starMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', 'starred'] });
    },
  });
};

export const useUnstarMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatApi.unstarMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', 'starred'] });
    },
  });
};

export const useStarredMessages = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'messages', 'starred'],
    queryFn: () => chatApi.fetchStarredMessages(),
    enabled: isConnected,
  });
};

export const useSharedContentSummary = (conversationId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'shared-content', conversationId],
    queryFn: () => chatApi.fetchSharedContentSummary(conversationId),
    enabled: isConnected && !!conversationId,
  });
};

export const useUpdateStatus = () => {
  return useMutation({
    mutationFn: ({ status, emoji, expiresInMinutes }: { status: string; emoji: string | null; expiresInMinutes: number | null }) =>
      chatApi.updateStatus(status, emoji, expiresInMinutes),
  });
};

export const useUserPresence = (userId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'presence', userId],
    queryFn: () => chatApi.fetchUserPresence(userId),
    enabled: isConnected && !!userId,
  });
};

export const useLastSeen = (userId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'last-seen', userId],
    queryFn: () => chatApi.fetchLastSeen(userId),
    enabled: isConnected && !!userId,
  });
};

export const useConversationSearch = (conversationId: string, query: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['chat', 'search', conversationId, query],
    queryFn: () => chatApi.searchMessagesInConversation(conversationId, query),
    enabled: isConnected && !!conversationId && !!query.trim(),
  });
};
