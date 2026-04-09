import React, { useState, useRef, useCallback } from 'react';
import { Smile, Paperclip, Mic, Send } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useTyping } from '../../hooks/useTyping';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';
import clsx from 'clsx';

interface MessageInputProps {
  conversationId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ conversationId }) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, activeConversation } = useChatStore();
  const { user } = useAuthStore();
  const other = activeConversation?.participants.find(p => p.id !== user?.id) as User | undefined;
  const { startTyping, stopTyping } = useTyping(conversationId, other?.id || '');

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 130) + 'px';
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustHeight();
    if (e.target.value.trim()) startTyping();
    else stopTyping();
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    stopTyping();
    setIsSending(true);
    try {
      await sendMessage(trimmed);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [text, isSending, sendMessage, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#313d45]">

      {/* Emoji */}
      <button className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#313d45] transition flex-shrink-0 mb-0.5">
        <Smile size={22} />
      </button>

      {/* Attach */}
      <button className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#313d45] transition flex-shrink-0 mb-0.5">
        <Paperclip size={22} />
      </button>

      {/* Input */}
      <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-3xl px-4 py-2.5 flex items-end min-h-[42px] shadow-sm">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder="Type a message"
          rows={1}
          className="flex-1 bg-transparent text-[14.5px] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-none resize-none leading-relaxed max-h-[130px] scrollbar-thin"
        />
      </div>

      {/* Send / Mic */}
      <button
        onClick={canSend ? handleSend : undefined}
        disabled={isSending}
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 mb-0.5',
          'bg-[#00a884] hover:bg-[#008069] text-white shadow-sm'
        )}
      >
        {isSending ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : canSend ? (
          <Send size={18} className="translate-x-0.5" />
        ) : (
          <Mic size={18} />
        )}
      </button>
    </div>
  );
};

export default MessageInput;
