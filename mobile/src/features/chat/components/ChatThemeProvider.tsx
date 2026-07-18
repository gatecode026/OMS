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
    // Sent bubble: primary color tint — matches OMS indigo branding
    bubbleMeBg: isDark ? `${colors.primary}CC` : `${colors.primary}18`,
    // Received bubble: card surface
    bubbleOtherBg: isDark ? colors.card : colors.surface,
    // Text colors — use theme text
    textMe: isDark ? colors.text : colors.text,
    textOther: colors.text,
    // Tick colors — use primary for read, muted for others
    tickRead: colors.primary,
    tickDelivered: colors.textLight,
    tickSent: colors.textLight,
    // Reaction chips
    reactionBg: isDark ? colors.neutralLight : colors.neutralLight,
    reactionBorder: colors.border,
    // Composer & header use surface
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
