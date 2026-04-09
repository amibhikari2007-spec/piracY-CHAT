import { useRef, useCallback } from 'react';
import { socketEmit } from '../socket/socketClient';

export const useTyping = (conversationId: string, receiverId: string) => {
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const startTyping = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      socketEmit.startTyping(conversationId, receiverId);
    }

    // Reset stop timer
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socketEmit.stopTyping(conversationId, receiverId);
    }, 2000);
  }, [conversationId, receiverId]);

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      socketEmit.stopTyping(conversationId, receiverId);
    }
  }, [conversationId, receiverId]);

  return { startTyping, stopTyping };
};
