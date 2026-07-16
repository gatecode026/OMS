import useAuthStore from '../../../shared/store/authStore';

export interface ChatFeatureFlags {
  polls: boolean;
  gifs: boolean;
  aiAssistant: boolean;
  tasks: boolean;
  attendance: boolean;
  leave: boolean;
  payslips: boolean;
}

const defaultFlags: ChatFeatureFlags = {
  polls: true,
  gifs: true,
  aiAssistant: true,
  tasks: true,
  attendance: true,
  leave: true,
  payslips: true,
};

const tenantFlags: Record<string, ChatFeatureFlags> = {
  'tenant-alpha': {
    polls: true,
    gifs: true,
    aiAssistant: true,
    tasks: true,
    attendance: true,
    leave: true,
    payslips: true,
  },
  'tenant-beta': {
    polls: true,
    gifs: false,
    aiAssistant: false,
    tasks: true,
    attendance: true,
    leave: false,
    payslips: false,
  },
};

export const getChatFeatureFlags = (tenantId?: string): ChatFeatureFlags => {
  if (!tenantId) return defaultFlags;
  return tenantFlags[tenantId] || defaultFlags;
};

export const useChatFeatureFlags = (): ChatFeatureFlags => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.role === 'admin' ? 'tenant-alpha' : 'tenant-beta';
  return getChatFeatureFlags(tenantId);
};
