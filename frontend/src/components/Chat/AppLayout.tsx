import React, { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import Sidebar from '../Sidebar/Sidebar';
import ChatPanel from './ChatPanel';

const AppLayout: React.FC = () => {
  const { subscribeToSocket, unsubscribeFromSocket, activeConversation } = useChatStore();

  useEffect(() => {
    subscribeToSocket();
    return () => unsubscribeFromSocket();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: activeConversation ? '0' : '100%',
        maxWidth: '360px',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        borderRight: '1px solid #e9edef',
      }}
        className="md-sidebar dark:border-[#313d45]"
      >
        <Sidebar />
      </div>

      {/* Chat Panel */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatPanel />
      </div>
    </div>
  );
};

export default AppLayout;