/**
 * @file src/components/PinBoard.jsx
 * @description Main PinBoard container component. Orchestrates states for searching,
 *   filtering, and sorting, manages infinite scroll paginated fetches, and displays PinnedMessageCards.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import PinnedMessageCard from './PinnedMessageCard';
import { Search, Loader2, Pin } from 'lucide-react';

const PinBoard = ({ conversation, currentUser, onClose }) => {
  const {
    pinnedMessages,
    totalPinned,
    pinnedPagination,
    isLoadingPinned,
    loadPinnedMessages,
    unpinMessage,
    setHighlightedMessageId
  } = useChat();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState(''); // Empty means 'All'
  const [sortBy, setSortBy] = useState('recently_pinned');

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Debounce search query (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
  }, [search]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Reload pins when active conversation, search, filter, or sorting changes
  useEffect(() => {
    if (conversation?.id) {
      loadPinnedMessages(conversation.id, {
        page: 1,
        limit: 10,
        search: debouncedSearch,
        filter,
        sortBy
      });
    }
  }, [conversation?.id, debouncedSearch, filter, sortBy, loadPinnedMessages]);

  // Infinite Scroll Handler
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isLoadingPinned || !pinnedPagination?.hasNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load next page when scrolled within 40px of bottom
    if (scrollHeight - scrollTop - clientHeight < 40) {
      loadPinnedMessages(conversation.id, {
        page: (pinnedPagination.page || 1) + 1,
        limit: 10,
        search: debouncedSearch,
        filter,
        sortBy
      });
    }
  }, [conversation?.id, debouncedSearch, filter, sortBy, pinnedPagination, isLoadingPinned, loadPinnedMessages]);

  // Navigate to message wrapper
  const handleNavigate = (msgId) => {
    // Close PinBoard drawer
    onClose();
    // Set highlighted ID in ChatContext.
    // ChatWindow will capture this, page/scroll to the message, and run highlight animation.
    setTimeout(() => {
      setHighlightedMessageId(msgId);
    }, 150);
  };

  const handleUnpin = (msgId) => {
    unpinMessage(msgId, conversation.id);
  };

  // Filter types definitions
  const filters = [
    { label: 'All', value: '' },
    { label: 'Text', value: 'text' },
    { label: 'Images', value: 'image' },
    { label: 'Videos', value: 'video' },
    { label: 'Documents', value: 'document' },
    { label: 'Voice Notes', value: 'voice_note' }
  ];

  return (
    <div className="pinboard-container">
      {/* Search Row */}
      <div className="pinboard-search-wrap">
        <Search size={16} className="pinboard-search-icon" />
        <input
          type="text"
          className="pinboard-search-input"
          placeholder="Search pins, senders, files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="pinboard-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Filter Options Row */}
      <div className="pinboard-filters-row">
        <div className="pinboard-filter-pills">
          {filters.map((f) => (
            <button
              key={f.label}
              className={`pinboard-filter-pill ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Option Row */}
      <div className="pinboard-sort-row">
        <span className="pinboard-count">
          {totalPinned} pinned message{totalPinned !== 1 ? 's' : ''}
        </span>
        <div className="pinboard-sort-select-wrap">
          <span className="sort-label">Sort by:</span>
          <select
            className="pinboard-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recently_pinned">Recently Pinned</option>
            <option value="oldest_pinned">Oldest Pinned</option>
            <option value="original_date">Original Date</option>
          </select>
        </div>
      </div>

      {/* Pinned Messages Scroll Area */}
      <div
        className="pinboard-scroll-area"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {pinnedMessages.length === 0 && !isLoadingPinned ? (
          <div className="pinboard-empty-state">
            <div className="pinboard-empty-icon-wrap">
              <Pin size={36} className="pinboard-empty-icon" />
            </div>
            <h4 className="pinboard-empty-title">No Pinned Messages</h4>
            <p className="pinboard-empty-text">
              {search || filter
                ? 'No pins match your current search/filter criteria.'
                : 'Pin important messages to access them quickly.'}
            </p>
          </div>
        ) : (
          <div className="pinned-messages-list">
            {pinnedMessages.map((msg) => (
              <PinnedMessageCard
                key={msg.messageId}
                msg={msg}
                conversation={conversation}
                currentUser={currentUser}
                onUnpin={handleUnpin}
                onNavigate={handleNavigate}
              />
            ))}

            {/* Pagination Loader */}
            {isLoadingPinned && (
              <div className="pinboard-spinner-row">
                <Loader2 className="animate-spin text-primary" size={20} />
                <span>Loading pins...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinBoard;
