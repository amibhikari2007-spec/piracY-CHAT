import React, { useState } from 'react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Message, User } from '../../types';
import MessageTicks from '../UI/MessageTicks';
import { Lock } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine, showAvatar }) => {
  const [showTime, setShowTime] = useState(false);
  const sender = typeof message.sender === 'object' ? message.sender as User : null;
  const timeStr = format(new Date(message.sentAt || message.createdAt), 'HH:mm');
  const displayText = message.decryptedText ?? '';
  const isEmpty = !displayText || displayText === '[Encrypted message]' || displayText === '[Encrypted]';

  return (
    <div className={clsx(
      'flex items-end gap-1.5 group max-w-[78%] animate-slide-up',
      isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
    )}>
      {/* Avatar */}
      {!isMine && (
        <div className="w-7 flex-shrink-0 mb-1">
          {showAvatar && sender && (
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold select-none">
              {sender.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        onClick={() => setShowTime(s => !s)}
        className={clsx(
          'relative px-3 pt-2 pb-1.5 rounded-2xl cursor-pointer select-text max-w-full transition-opacity',
          'shadow-[0_1px_2px_rgba(0,0,0,0.13)]',
          isMine
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-br-[4px]'
            : 'bg-white dark:bg-[#202c33] rounded-bl-[4px]',
          message.failed && 'opacity-50',
          message.pending && 'opacity-75'
        )}
      >
        {/* Text */}
        {isEmpty ? (
          <span className="flex items-center gap-1 text-[#667781] dark:text-[#8696a0] text-sm italic">
            <Lock size={10} /> Encrypted message
          </span>
        ) : (
          <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words leading-[1.45] pr-10">
            {displayText}
          </p>
        )}

        {/* Time + ticks — always visible in bottom right */}
        <div className="flex items-center justify-end gap-1 mt-[-2px]">
          <span className="text-[11px] text-[#667781] dark:text-[#8696a0] whitespace-nowrap">
            {timeStr}
          </span>
          {isMine && (
            <MessageTicks
              status={message.status}
              pending={message.pending}
              failed={message.failed}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
