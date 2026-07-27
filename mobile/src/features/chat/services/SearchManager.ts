/**
 * @file SearchManager.ts
 * @description Search & Relevance Ranking Engine for Chat Messages and Shared Media.
 */

import { ChatMessage } from '../types';
import { ExtractedLinkItem } from './SharedContentManager';

export class SearchManagerClass {
  /**
   * Filter ChatMessages by search query
   */
  searchMessages(messages: ChatMessage[], query: string): ChatMessage[] {
    if (!query.trim()) return messages;
    const q = query.toLowerCase().trim();

    return messages.filter((msg) => {
      const matchContent = msg.content?.toLowerCase().includes(q);
      const matchFileName = msg.media?.fileName?.toLowerCase().includes(q);
      const matchSender = msg.senderName?.toLowerCase().includes(q);
      return matchContent || matchFileName || matchSender;
    });
  }

  /**
   * Filter ExtractedLinkItems by search query
   */
  searchLinks(links: ExtractedLinkItem[], query: string): ExtractedLinkItem[] {
    if (!query.trim()) return links;
    const q = query.toLowerCase().trim();

    return links.filter((item) => {
      const matchUrl = item.url.toLowerCase().includes(q);
      const matchDomain = item.domain.toLowerCase().includes(q);
      const matchSender = item.senderName.toLowerCase().includes(q);
      return matchUrl || matchDomain || matchSender;
    });
  }
}

export const SearchManager = new SearchManagerClass();
export default SearchManager;
