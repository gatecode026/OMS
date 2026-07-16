import { useRef, useEffect } from 'react';
import { getSocket } from '../../../shared/services/socketManager';

export const useTyping = (conversationId: string) => {
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateTypingStatus = (text: string) => {
    const socket = getSocket();
    if (!socket?.connected) return;

    if (!text.trim() && isTypingRef.current) {
      socket.emit('typing:stop', { conversationId });
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    if (!isTypingRef.current && text.trim()) {
      isTypingRef.current = true;
      socket.emit('typing:start', { conversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
      isTypingRef.current = false;
    }, 3000);
  };

  const forceStopTyping = () => {
    const socket = getSocket();
    if (socket?.connected && isTypingRef.current) {
      socket.emit('typing:stop', { conversationId });
    }
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    updateTypingStatus,
    forceStopTyping,
  };
};

export default useTyping;
