import { useReactToMessage } from './useChat';
import { toast } from '../../../shared/components/Toast';

export const useMessageReactions = () => {
  const { mutate: reactToMsg } = useReactToMessage();

  const addReaction = (messageId: string, emoji: string) => {
    reactToMsg({ messageId, reaction: emoji });
    toast.success(`Reacted with ${emoji}`);
  };

  return {
    addReaction,
  };
};

export default useMessageReactions;
