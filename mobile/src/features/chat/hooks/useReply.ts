import { useState } from 'react';
import { ChatMessage } from '../types';

export const useReply = () => {
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);

  const clearReply = () => {
    setReplyTo(null);
  };

  const startReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    setIsEditingMode(false);
  };

  return {
    replyTo,
    setReplyTo,
    isEditingMode,
    setIsEditingMode,
    clearReply,
    startReply,
  };
};

export default useReply;
