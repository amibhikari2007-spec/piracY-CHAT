import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageSquarePlus, MoreVertical, Moon, Sun, LogOut, MessageCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { chatApi } from '../../services/api';
import { User, Conversation } from '../../types';
import Avatar from '../UI/Avatar';

const Sidebar: React.FC = () => {
  const { conversations, openConversation, loadConversations, onlineUsers, activeConversation } = useChatStore();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMenu, setShowMenu]     = useState(false);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await chatApi.searchUsers(search);
        setResults(data.data.users);
      } finally { setIsSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleSelect = (u: User) => {
    openConversation(u);
    setSearch('');
    setResults([]);
  };

  const getOther = (c: Conversation) => c.participants.find(p => p.id !== user?.id) ?? null;

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return formatDistanceToNow(d, { addSuffix: false });
  };

  const isSearchMode = search.trim().length >= 2;

  return (
    <aside className="w-full md:w-[360px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#313d45]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex-shrink-0">
        <Avatar name={user?.username || 'Me'} src={user?.avatar} size="md" />
        <div className="flex items-center gap-0.5">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setSearch(' ')} className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
            <MessageSquarePlus size={20} />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(s => !s)} className="p-2 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#313d45] text-[#54656f] dark:text-[#aebac1] transition">
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 w-44 bg-white dark:bg-[#233138] rounded-lg shadow-xl border border-[#e9edef] dark:border-[#313d45] z-50 animate-fade-in overflow-hidden">
                <button onClick={() => { logout(); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] transition">
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-white dark:bg-[#111b21] flex-shrink-0">
        <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg px-3 py-2">
          <Search size={15} className="text-[#54656f] dark:text-[#aebac1] flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="flex-1 bg-transparent text-[14px] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#8696a0] text-xs hover:text-[#54656f]">✕</button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isSearchMode ? (
          <div>
            <p className="px-4 py-2 text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider">
              {isSearching ? 'Searching…' : `People (${results.length})`}
            </p>
            {results.length === 0 && !isSearching && (
              <p className="px-4 py-6 text-center text-sm text-[#8696a0]">No users found</p>
            )}
            {results.map(u => (
              <button key={u.id || (u as any)._id} onClick={() => handleSelect(u)}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] transition text-left">
                <Avatar name={u.username} src={u.avatar} size="md" isOnline={onlineUsers.has(u.id)} showStatus />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">{u.username}</p>
                  <p className="text-[13px] text-[#8696a0] truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
            <MessageCircle size={40} className="text-[#e9edef] dark:text-[#313d45]" />
            <div>
              <p className="font-medium text-[#111b21] dark:text-[#e9edef] text-sm">No chats yet</p>
              <p className="text-[13px] text-[#8696a0] mt-1">Search for someone to start chatting</p>
            </div>
          </div>
        ) : (
          conversations.map(conv => {
            const other = getOther(conv);
            if (!other) return null;
            const isOnline = onlineUsers.has(other.id);
            const unread   = conv.unreadCount?.[user?.id || ''] || 0;
            const isActive = activeConversation?._id === conv._id;

            return (
              <button key={conv._id} onClick={() => openConversation(other)}
                className={clsx(
                  'flex items-center gap-3 w-full px-4 py-3 transition text-left border-b border-[#f0f2f5] dark:border-[#1f2c33]',
                  isActive ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942]'
                )}>
                <Avatar name={other.username} src={other.avatar} size="md" isOnline={isOnline} showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-[15px] text-[#111b21] dark:text-[#e9edef] truncate">{other.username}</span>
                    <span className={clsx('text-[12px] ml-2 flex-shrink-0', unread > 0 ? 'text-[#00a884] font-medium' : 'text-[#8696a0]')}>
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-[#8696a0] truncate pr-2">
                      {conv.lastMessage ? '🔐 Encrypted message' : 'Tap to start chatting'}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#00a884] text-white text-[11px] font-bold flex items-center justify-center px-1">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
