import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';

export const useMessages = (conversationId: string | undefined) => {
  const { messages, isLoadingMessages, hasMoreMessages, currentPage, loadMessages } =
    useChatStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);

  const msgs = conversationId ? messages[conversationId] || [] : [];
  const hasMore = conversationId ? hasMoreMessages[conversationId] ?? true : false;
  const page    = conversationId ? currentPage[conversationId] || 1 : 1;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  // Load older messages on scroll to top
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || !conversationId) return;
    if (el.scrollTop < 80 && hasMore && !isLoadingMessages) {
      const prevHeight = el.scrollHeight;
      loadMessages(conversationId, page + 1).then(() => {
        // Maintain scroll position after prepend
        el.scrollTop = el.scrollHeight - prevHeight;
      });
    }
  }, [conversationId, hasMore, isLoadingMessages, page, loadMessages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { msgs, isLoadingMessages, containerRef, bottomRef };
};
