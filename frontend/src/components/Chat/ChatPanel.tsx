import React from 'react';
import { Lock, MessageCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useMessages } from '../../hooks/useMessages';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center chat-bg gap-5">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#00a884]/10 flex items-center justify-center">
          <MessageCircle size={44} className="text-[#00a884]" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-[28px] font-light text-[#41525d] dark:text-[#e9edef] mb-2">
          WhatsApp Web
        </h2>
        <p className="text-[14px] text-[#667781] dark:text-[#8696a0] max-w-[300px] leading-relaxed">
          Send and receive messages without keeping your phone online.
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 border-t border-[#e9edef] dark:border-[#313d45] pt-5 px-8">
      <Lock size={11} className="text-[#8696a0]" />
      <span className="text-[12px] text-[#8696a0]">
        Your personal messages are end-to-end encrypted
      </span>
    </div>
  </div>
);

const ChatPanel: React.FC = () => {
  const { activeConversation } = useChatStore();
  const { msgs, isLoadingMessages, containerRef, bottomRef } = useMessages(activeConversation?._id);

  if (!activeConversation) {
    return (
      <div className="hidden md:flex flex-1 flex-col">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <ChatHeader conversation={activeConversation} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <MessageList
          conversationId={activeConversation._id}
          messages={msgs}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          bottomRef={bottomRef as React.RefObject<HTMLDivElement>}
          isLoading={isLoadingMessages}
        />
        <MessageInput conversationId={activeConversation._id} />
      </div>
    </div>
  );
};

export default ChatPanel;
