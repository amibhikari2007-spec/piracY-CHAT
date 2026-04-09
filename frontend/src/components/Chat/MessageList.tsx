import React from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { Lock } from 'lucide-react';
import { Message } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from '../UI/TypingIndicator';

interface MessageListProps {
  conversationId: string;
  messages: Message[];
  containerRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
}

const dateLabel = (d: Date) => {
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

const MessageList: React.FC<MessageListProps> = ({
  conversationId, messages, containerRef, bottomRef, isLoading
}) => {
  const { user }    = useAuthStore();
  const { typing }  = useChatStore();
  const typingInfo  = typing[conversationId];

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-[5%] py-3 space-y-0.5 scrollbar-thin chat-bg"
    >
      {/* Loading spinner */}
      {isLoading && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
          <div className="bg-white dark:bg-[#202c33] rounded-full p-5 shadow-sm">
            <Lock size={28} className="text-[#00a884]" />
          </div>
          <p className="text-[13px] text-[#667781] dark:text-[#8696a0] text-center max-w-[220px] leading-relaxed">
            Messages are end-to-end encrypted. Send a message to start!
          </p>
        </div>
      )}

      {/* E2EE notice */}
      {messages.length > 0 && (
        <div className="flex justify-center mb-3 mt-1">
          <div className="flex items-center gap-1.5 bg-[#fef9c3] dark:bg-[#1f2c33] border border-[#f7d76b] dark:border-[#2a3942] rounded-lg px-3 py-1.5 max-w-[85%]">
            <Lock size={11} className="text-[#54656f] dark:text-[#8696a0] flex-shrink-0" />
            <span className="text-[11.5px] text-[#54656f] dark:text-[#8696a0] text-center leading-snug">
              Messages are end-to-end encrypted. No one outside this chat can read them.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, idx) => {
        const prev     = messages[idx - 1];
        const msgDate  = new Date(msg.sentAt || msg.createdAt);
        const prevDate = prev ? new Date(prev.sentAt || prev.createdAt) : null;
        const showDate = !prevDate || !isSameDay(msgDate, prevDate);

        const isMine = typeof msg.sender === 'object'
          ? (msg.sender as any).id === user?.id || (msg.sender as any)._id === user?.id
          : msg.sender === user?.id;

        const next = messages[idx + 1];
        const nextSenderId = next
          ? (typeof next.sender === 'object' ? (next.sender as any).id || (next.sender as any)._id : next.sender)
          : null;
        const thisSenderId = typeof msg.sender === 'object'
          ? (msg.sender as any).id || (msg.sender as any)._id
          : msg.sender;
        const showAvatar = !isMine && nextSenderId !== thisSenderId;

        return (
          <React.Fragment key={msg._id || msg.tempId}>
            {showDate && (
              <div className="flex justify-center my-3">
                <span className="bg-white dark:bg-[#1f2c33] text-[#54656f] dark:text-[#8696a0] text-[12px] font-medium px-3 py-1 rounded-lg shadow-sm">
                  {dateLabel(msgDate)}
                </span>
              </div>
            )}
            <div className={`mb-${showAvatar ? '2' : '0.5'}`}>
              <MessageBubble message={msg} isMine={isMine} showAvatar={showAvatar} />
            </div>
          </React.Fragment>
        );
      })}

      {/* Typing */}
      {typingInfo && (
        <div className="animate-fade-in">
          <TypingIndicator username={typingInfo.username} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
