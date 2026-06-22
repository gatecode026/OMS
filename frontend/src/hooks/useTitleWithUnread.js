/**
 * @file src/hooks/useTitleWithUnread.js
 * @description Syncs the browser tab title with the total unread chat count.
 *   When there are unread messages the title becomes "(N) Gatecode OMS",
 *   and reverts to "Gatecode OMS" when there are none.
 *
 *   Usage: call once inside a top-level component (AppShell or similar).
 */

import { useEffect } from 'react';
import { useChat } from '../context/ChatContext';

const BASE_TITLE = 'Gatecode OMS';

export const useTitleWithUnread = () => {
  // unreadCounts is a plain state object { convId: number } that React re-renders on
  const { unreadCounts } = useChat();

  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      document.title = `(${total > 99 ? '99+' : total}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    // Clean up on unmount — restore base title
    return () => {
      document.title = BASE_TITLE;
    };
  }, [unreadCounts]);
};

export default useTitleWithUnread;
