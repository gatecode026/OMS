/**
 * @file queryKeys.ts
 * @description Centralized Query Key Registry for TanStack React Query across the OMS application.
 *              Standardizes all query keys to prevent cache fragmentation and ensure deterministic invalidation.
 */

export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
    permissions: ['auth', 'permissions'] as const,
  },
  profile: {
    me: ['profile', 'me'] as const,
    employee: (id: string) => ['profile', 'employee', id] as const,
    documents: ['profile', 'documents'] as const,
    bank: ['profile', 'bank'] as const,
  },
  employees: {
    all: ['employees', 'all'] as const,
    search: (query: string) => ['employees', 'search', query] as const,
    department: (dept: string) => ['employees', 'department', dept] as const,
  },
  attendance: {
    today: ['attendance', 'today'] as const,
    history: (monthYear: string) => ['attendance', 'history', monthYear] as const,
    stats: ['attendance', 'stats'] as const,
  },
  leaves: {
    myLeaves: ['leaves', 'my-leaves'] as const,
    balance: ['leaves', 'balance'] as const,
    approvals: ['leaves', 'approvals'] as const,
  },
  tasks: {
    all: ['tasks', 'all'] as const,
    assigned: ['tasks', 'assigned'] as const,
    details: (id: string) => ['tasks', 'details', id] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    archived: ['chat', 'conversations', 'archived'] as const,
    hidden: ['chat', 'conversations', 'hidden'] as const,
    conversation: (id: string) => ['chat', 'conversation', id] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
    calls: ['chat', 'calls'] as const,
    pinnedMessages: (conversationId: string) => ['chat', 'pinned-messages', conversationId] as const,
    sharedContent: (conversationId: string) => ['chat', 'shared-content', conversationId] as const,
    globalSearch: (query: string, category: string) => ['chat', 'global-search', query, category] as const,
  },
  notifications: {
    all: ['notifications', 'all'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
};

export default queryKeys;
