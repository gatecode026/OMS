/**
 * @file index.ts
 * @description Barrel exports for the Enterprise Chat feature module.
 */

export * from './types';
export { default as chatApi } from './api/chatApi';
export {
  useConversations,
  useChatMessages,
  useStartDirectChat,
  useCreateGroupChat,
  useMarkChatRead,
  useSearchEmployees,
  useHideConversation,
  useUnhideConversation,
  useHiddenConversations,
  useGlobalSearch,
  useUpdateGroupDetails,
  useDeleteConversationForMe,
  useArchivedConversations,
  useCallHistory,
  useArchiveConversation,
  useUnarchiveConversation,
  useThreadActivity,
  useThreadDetails,
  useThreadReplies,
  useSendThreadReply,
  useFollowThread,
  useUnfollowThread,
  useMarkThreadRead,
  useCreateThread,
  usePinnedMessages,
  useAddGroupMembers,
  useRemoveGroupMember,
  useBlockedUsers,
  useClearChat,
  useBlockUser,
  useUnblockUser,
} from './hooks/useChat';
