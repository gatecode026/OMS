import React, { createContext, useContext } from 'react';
import useTheme from '../../../shared/hooks/useTheme';

export interface ChatTheme {
  bubbleMeBg: string;
  bubbleOtherBg: string;
  textMe: string;
  textOther: string;
  tickRead: string;
  tickDelivered: string;
  tickSent: string;
  reactionBg: string;
  reactionBorder: string;
  composerBg: string;
  headerBg: string;
}

const ChatThemeContext = createContext<ChatTheme | null>(null);

export const ChatThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();

  const chatTheme: ChatTheme = {
    bubbleMeBg: colors.primary,
    bubbleOtherBg: colors.card,
    textMe: '#FFFFFF',
    textOther: colors.text,
    tickRead: '#38BDF8',
    tickDelivered: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
    tickSent: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
    reactionBg: colors.neutralLight || (isDark ? '#334155' : '#F1F5F9'),
    reactionBorder: colors.border,
    composerBg: colors.surface,
    headerBg: colors.surface,
  };

  return <ChatThemeContext.Provider value={chatTheme}>{children}</ChatThemeContext.Provider>;
};

export const useChatTheme = () => {
  const context = useContext(ChatThemeContext);
  if (!context) {
    throw new Error('useChatTheme must be used within a ChatThemeProvider');
  }
  return context;
};
