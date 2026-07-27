/**
 * @file ConflictResolver.ts
 * @description Server-wins Conflict Resolution Engine for handling concurrent message
 *              edits, deletes, and timestamps across multiple devices.
 */

import { ChatMessage } from '../types';

export class ConflictResolverClass {
  /**
   * Resolves conflicts between local message state and incoming server state.
   * Policy: Server timestamp & server deletion status always win.
   */
  resolveMessageConflict(localMsg: ChatMessage, serverMsg: ChatMessage): ChatMessage {
    // 1. If server deleted the message, server deletion state wins
    if (serverMsg.isDeleted) {
      return {
        ...localMsg,
        ...serverMsg,
        isDeleted: true,
        content: 'This message was deleted.',
        media: undefined,
      };
    }

    // 2. Compare edit timestamps — newest timestamp wins
    const localTime = new Date(localMsg.updatedAt || localMsg.createdAt || 0).getTime();
    const serverTime = new Date(serverMsg.updatedAt || serverMsg.createdAt || 0).getTime();

    if (serverTime >= localTime) {
      return {
        ...localMsg,
        ...serverMsg,
      };
    }

    return localMsg;
  }
}

export const ConflictResolver = new ConflictResolverClass();
export default ConflictResolver;
