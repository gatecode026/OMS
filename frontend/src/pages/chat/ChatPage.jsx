/**
 * @file src/pages/chat/ChatPage.jsx
 * @description Main WhatsApp-style chat container.
 *   Left panel: ConversationsList | Right panel: ChatWindow
 */

import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';
import ConversationsList from './ConversationsList';
import ChatWindow from './ChatWindow';
import './Chat.css';

const ChatPage = () => {
  const {
    conversations, activeConvId, openConversation, isConnected,
    showMobileList: showList, setShowMobileList: setShowList
  } = useChat();
  const { currentUser } = useApp();

  // Auto-select first conversation on load
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      openConversation(conversations[0].id);
    }
  }, [conversations]);

  // On mobile: when conv selected, hide list and show chat
  const handleSelectConversation = async (convId) => {
    await openConversation(convId);
    setShowList(false);
  };

  return (
    <div className="chat-page">
      {/* Connection status banner */}
      {!isConnected && (
        <div className="chat-reconnecting-banner">
          <span className="chat-reconnecting-dot" />
          Connecting to chat server...
        </div>
      )}

      <div className="chat-layout">
        {/* ── LEFT: Conversations List ──────────────────────────── */}
        <div className={`chat-left-panel ${!showList ? 'chat-panel-hidden-mobile' : ''}`}>
          <ConversationsList
            currentUser={currentUser}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* ── RIGHT: Chat Window ────────────────────────────────── */}
        <div className={`chat-right-panel ${showList ? 'chat-panel-hidden-mobile' : ''}`}>
          {activeConvId ? (
            <ChatWindow
              currentUser={currentUser}
              onBack={() => setShowList(true)}
            />
          ) : (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="var(--color-primary-light, #f0f4ff)" />
                  <path d="M20 24h24M20 32h16M20 40h12" stroke="var(--color-primary, #6366f1)" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="46" cy="42" r="8" fill="var(--color-primary, #6366f1)"/>
                  <path d="M43 42h6M46 39v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="chat-empty-title">Select a Conversation</h3>
              <p className="chat-empty-sub">
                Choose from your existing conversations or start a new chat.
              </p>
              {isConnected && (
                <div className="chat-online-indicator">
                  <span className="chat-online-dot" />
                  Connected
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
