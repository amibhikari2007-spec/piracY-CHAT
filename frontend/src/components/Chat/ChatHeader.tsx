import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, MoreVertical, Phone, Video, Search } from 'lucide-react';
import { Conversation, User } from '../../types';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../UI/Avatar';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation, onBack }) => {
  const { onlineUsers, typing } = useChatStore();
  const { user } = useAuthStore();

  const other = conversation.participants.find(p => p.id !== user?.id) as User;
  if (!other) return null;

  const isOnline  = onlineUsers.has(other.id);
  const isTyping  = !!typing[conversation._id];

  const getStatus = () => {
    if (isTyping) return <span className="text-[#00a884]">typing…</span>;
    if (isOnline)  return <span className="text-[#00a884]">online</span>;
    if (other.lastSeen) return <span>last seen {formatDistanceToNow(new Date(other.lastSeen), { addSuffix: true })}</span>;
    return <span>offline</span>;
  };

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#313d45] h-[60px] flex-shrink-0">
      {onBack && (
        <button onClick={onBack} className="md:hidden p-1.5 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1]">
          <ArrowLeft size={20} />
        </button>
      )}

      <Avatar name={other.username} src={other.avatar} size="md" isOnline={isOnline} showStatus />

      <div className="flex-1 min-w-0 cursor-pointer">
        <p className="font-semibold text-[15px] text-[#111b21] dark:text-[#e9edef] leading-tight truncate">
          {other.username}
        </p>
        <p className="text-[12.5px] text-[#667781] dark:text-[#8696a0] leading-tight truncate">
          {getStatus()}
        </p>
      </div>

      <div className="flex items-center">
        <button className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
          <Video size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
          <Phone size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
          <Search size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
