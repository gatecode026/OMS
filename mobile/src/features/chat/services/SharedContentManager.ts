/**
 * @file SharedContentManager.ts
 * @description Centralized Indexing & Classification Engine for Shared Media,
 *              Documents, Links, and Favorites within chat conversations.
 */

import { ChatMessage } from '../types';

export interface ExtractedLinkItem {
  id: string;
  url: string;
  domain: string;
  senderName: string;
  createdAt: string;
  content: string;
}

export interface CategorizedSharedContent {
  media: ChatMessage[];
  documents: ChatMessage[];
  links: ExtractedLinkItem[];
  favorites: ChatMessage[];
}

export class SharedContentManagerClass {
  private URL_REGEX = /(https?:\/\/[^\s]+)/gi;

  /**
   * Categorizes raw chat messages into Media, Documents, Links, and Favorites
   */
  categorizeMessages(messages: ChatMessage[]): CategorizedSharedContent {
    const media: ChatMessage[] = [];
    const documents: ChatMessage[] = [];
    const links: ExtractedLinkItem[] = [];
    const favorites: ChatMessage[] = [];

    for (const msg of messages) {
      if (msg.isDeleted) continue;

      // 1. Check Starred / Favorites
      if (msg.isStarred) {
        favorites.push(msg);
      }

      // 2. Check Media vs Documents
      if (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio') {
        media.push(msg);
      } else if (msg.type === 'file' || msg.media) {
        const mime = msg.media?.fileType || '';
        if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) {
          media.push(msg);
        } else {
          documents.push(msg);
        }
      }

      // 3. Extract Links
      if (msg.content) {
        const matches = msg.content.match(this.URL_REGEX);
        if (matches) {
          matches.forEach((url, idx) => {
            try {
              const domain = new URL(url).hostname.replace('www.', '');
              links.push({
                id: `${msg.id}_link_${idx}`,
                url,
                domain,
                senderName: msg.senderName || 'Contact',
                createdAt: msg.createdAt,
                content: msg.content,
              });
            } catch {
              links.push({
                id: `${msg.id}_link_${idx}`,
                url,
                domain: 'link',
                senderName: msg.senderName || 'Contact',
                createdAt: msg.createdAt,
                content: msg.content,
              });
            }
          });
        }
      }
    }

    return {
      media,
      documents,
      links,
      favorites,
    };
  }
}

export const SharedContentManager = new SharedContentManagerClass();
export default SharedContentManager;
