/**
 * @file src/modules/chat/chat.service.js
 * @description Business logic for all chat operations — conversations,
 *   messages, reactions, group management. All operations are tenant-scoped
 *   via runWithTenant() to ensure cross-tenant isolation.
 */

import mongoose from 'mongoose';
import Conversation from './conversation.repository.js';
import Message from './message.repository.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { getIO } from '../../config/socket.js';
import redis from '../../config/redis.js';
import { uploadToImageKit, deleteFromImageKit, uploadToImageKitDetailed, deleteFileFromImageKitById } from '../../utils/imagekit.js';
import logger from '../../config/logger.js';
import * as readReceiptService from './services/readReceipt.service.js';
import { CacheKeys, TTL, cacheGetOrSet, cacheDel, cacheDelPattern } from '../../services/cache.service.js';

/**
 * Detects if a text content contains Markdown syntax.
 */
export const detectMarkdown = (content) => {
  if (!content || typeof content !== "string") return "plain";

  // 1. Code blocks (``` or ~~~)
  if (content.includes("```") || content.includes("~~~")) return "markdown";

  // 2. Inline code (`inline`)
  if (/`[^`\n]+`/.test(content)) return "markdown";

  // 3. Bold (**text** or *text*)
  if (/\*\*[^*]+\*\*/.test(content) || /(?<!\*)\*(?!\*)[^*]+\*/.test(content))
    return "markdown";

  // 4. Underscores (__bold__ or _italic_)
  if (/__[^_]+__/.test(content) || /(?<!_)_(?!_)[^_]+_/.test(content))
    return "markdown";

  // 5. Strikethrough (~text~)
  if (/(?<!~)~(?!~)[^~]+~/.test(content) || /~~[^~]+~~/.test(content))
    return "markdown";

  // 6. Blockquote (> text at the start of string or newlines)
  if (/(^|\n)\s*>\s+\S/.test(content)) return "markdown";

  // 7. Bullet lists (*, -, + followed by whitespace at beginning of string or after a newline)
  if (/(^|\n)\s*[\*\-+]\s+\S/.test(content)) return "markdown";

  // 8. Numbered lists (digits followed by dot and whitespace)
  if (/(^|\n)\s*\d+\.\s+\S/.test(content)) return "markdown";

  // 9. Horizontal rule (--- or *** or ___ alone on a line)
  if (/(^|\n)\s*(-{3,}|\*{3,}|_{3,})\s*($|\n)/.test(content)) return "markdown";

  return "plain";
};

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

/**
 * Get or create direct conversation between 2 users
 */
export const getOrCreateDirectConversation = async (
  user1,
  user2,
  companyId,
) => {
  const result = await runWithTenant(companyId, async () => {
    // Check existing direct conversation
    const existing = await Conversation.findOne({
      type: "direct",
      "participants.employeeId": { $all: [user1.id, user2.id] },
    });

    if (existing) return { conversation: existing, isNew: false };

    // Create new direct conversation
    const convId = await generateCompanyUniqueId(companyId, "conversations");

    const conversation = await Conversation.create({
      id: convId,
      companyId,
      type: "direct",
      participants: [
        {
          employeeId: user1.id,
          name: user1.name,
          avatar: user1.avatar || null,
          role: user1.role || "employee",
          joinedAt: new Date(),
          isAdmin: false,
        },
        {
          employeeId: user2.id,
          name: user2.name,
          avatar: user2.avatar || null,
          role: user2.role || "employee",
          joinedAt: new Date(),
          isAdmin: false,
        },
      ],
      lastActivityAt: new Date(),
    });

    return { conversation, isNew: true };
  });

  if (result.isNew) {
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});
  }
  return result;
};

/**
 * Create group conversation
 */
export const createGroupConversation = async (
  creatorUser,
  groupData,
  participantUsers,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const convId = await generateCompanyUniqueId(companyId, "conversations");

    let avatarUrl = groupData.avatar || null;
    let avatarFileId = null;
    if (
      avatarUrl &&
      avatarUrl.startsWith("data:") &&
      avatarUrl.includes(";base64,")
    ) {
      try {
        const uploadResult = await uploadToImageKitDetailed(
          avatarUrl,
          `group_avatar_${convId}_${Date.now()}.jpg`,
        );
        avatarUrl = uploadResult.url;
        avatarFileId = uploadResult.fileId;
      } catch (err) {
        logger.error("[Chat] Group avatar upload failed:", err);
      }
    }

    // Creator is always admin
    const participants = [
      {
        employeeId: creatorUser.id,
        name: creatorUser.name,
        avatar: creatorUser.avatar || null,
        role: creatorUser.role || "employee",
        joinedAt: new Date(),
        isAdmin: true,
        canAddMembers: true,
        canRemoveMembers: true,
      },
      ...participantUsers.map((p) => ({
        employeeId: p.id,
        name: p.name,
        avatar: p.avatar || null,
        role: p.role || "employee",
        joinedAt: new Date(),
        isAdmin: false,
        canAddMembers: false,
        canRemoveMembers: false,
      })),
    ];

    const conversation = await Conversation.create({
      id: convId,
      companyId,
      type: "group",
      name: groupData.name.trim(),
      description: groupData.description || null,
      avatar: avatarUrl,
      avatarImageKitFileId: avatarFileId,
      createdBy: creatorUser.id,
      branch: groupData.branch || null,
      participants,
      lastActivityAt: new Date(),
      settings: {
        onlyAdminsCanMessage: false,
        onlyAdminsCanEditInfo: true,
      },
    });

    // System message: "John created group XYZ"
    const msgId = new mongoose.Types.ObjectId().toString();
    await Message.create({
      id: msgId,
      companyId,
      conversationId: convId,
      senderId: "system",
      senderName: "System",
      content: `${creatorUser.name} created group "${groupData.name}"`,
      type: "system",
      systemMeta: {
        action: "group_created",
        targetId: creatorUser.id,
        targetName: creatorUser.name,
      },
    });

    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});
    return conversation;
  });
};

/**
 * Helper to enrich conversation with user-specific unread counts and dynamic last message
 */
const enrichConversationForUser = async (conv, employeeId) => {
  const targetIdStr = String(employeeId || '');
  const participant = conv.participants?.find(
    (p) => String(p.employeeId || p.userId || p.id || p._id || '') === targetIdStr,
  );
  const lastReadAt = participant?.lastReadAt || new Date(0);

  const deleteEntry = conv.deletedBy?.find(
    (d) => String(d.userId || d.employeeId || '') === targetIdStr,
  );
  const minCreatedAt = deleteEntry ? deleteEntry.deletedAt : new Date(0);
  const unreadAfter = new Date(
    Math.max(new Date(lastReadAt).getTime(), new Date(minCreatedAt).getTime()),
  );

  const unreadCount = await readReceiptService.getUnreadCount(
    targetIdStr,
    conv.id,
    unreadAfter,
    conv.companyId,
  );

  // Find the actual last message that is NOT deleted or cleared for this user
  const query = {
    conversationId: conv.id,
    $nor: [{ "deletedFor.employeeId": employeeId }],
  };
  if (deleteEntry) {
    query.createdAt = { $gt: deleteEntry.deletedAt };
  }

  const latestMsg = await Message.findOne(query, { sort: { createdAt: -1 }, lean: true });

  let lastMessage = null;
  if (latestMsg) {
    lastMessage = {
      messageId: latestMsg.id,
      content: latestMsg.content,
      type: latestMsg.type,
      senderId: latestMsg.senderId,
      senderName: latestMsg.senderName,
      sentAt: latestMsg.createdAt,
      isDeleted: latestMsg.isDeleted,
    };
  }

  return { ...conv, unreadCount, lastMessage };
};

/**
 * Get all conversations for a user (WhatsApp style — sorted by last activity)
 */
export const getUserConversations = async (
  employeeId,
  companyId,
  role,
  branch,
) => {
  const cacheKey = CacheKeys.sidebar(companyId, employeeId);
  return cacheGetOrSet(
    cacheKey,
    async () => {
      return runWithTenant(companyId, async () => {
        const isExcluded = [
          "super_admin",
          "company_admin",
          "superadmin",
          "companyadmin",
        ].includes(role?.toLowerCase());
        const query = {
          "participants.employeeId": employeeId,
          isActive: true,
          isDeleted: { $ne: true },
          hiddenBy: { $not: { $elemMatch: { userId: employeeId } } },
          archivedBy: { $not: { $elemMatch: { userId: employeeId } } },
          deletedBy: {
            $not: { $elemMatch: { userId: employeeId, clearHistory: false } },
          },
        };

        if (!isExcluded && branch) {
          query.$or = [
            { type: "direct" },
            {
              type: "group",
              $or: [
                { branch: branch },
                { branch: { $exists: false } },
                { branch: null },
              ],
            },
          ];
        }

        const conversations = await Conversation.find(query)
          .sort({ lastActivityAt: -1 })
          .lean();

        // Filter: exclude if the user deleted the conversation and there has been no new activity since then
        const activeConversations = conversations.filter((conv) => {
          const deleteEntry = conv.deletedBy?.find(
            (d) => d.userId?.toString() === employeeId?.toString(),
          );
          if (deleteEntry && !deleteEntry.clearHistory) {
            const lastActivityTime = new Date(
              conv.lastActivityAt || 0,
            ).getTime();
            const deleteTime = new Date(deleteEntry.deletedAt).getTime();
            if (lastActivityTime <= deleteTime) {
              return false;
            }
          }
          return true;
        });

        // Dynamic single-source-of-truth profile hydration for all participants
        const participantIds = new Set();
        activeConversations.forEach((conv) => {
          conv.participants?.forEach((p) => {
            const pId = p.employeeId || p.userId || p.id || p._id;
            if (pId) participantIds.add(String(pId));
          });
        });

        if (participantIds.size > 0) {
          try {
            const conn = await getTenantConnection(companyId);
            const employees = await conn.collection('employees').find(
              { id: { $in: Array.from(participantIds) } },
              { projection: { id: 1, name: 1, avatar: 1, photoUrl: 1, designation: 1, department: 1 } }
            ).toArray();

            const empMap = new Map();
            employees.forEach((e) => {
              empMap.set(String(e.id), e);
            });

            activeConversations.forEach((conv) => {
              if (Array.isArray(conv.participants)) {
                conv.participants = conv.participants.map((p) => {
                  const pId = String(p.employeeId || p.userId || p.id || p._id || '');
                  const emp = empMap.get(pId);
                  if (emp) {
                    const freshAvatar = emp.avatar || emp.photoUrl || null;
                    return {
                      ...p,
                      name: emp.name || p.name,
                      avatar: freshAvatar,
                      avatarUrl: freshAvatar,
                      photoUrl: freshAvatar,
                      designation: emp.designation || p.designation,
                      department: emp.department || p.department,
                    };
                  }
                  return p;
                });
              }
            });
          } catch (hydrErr) {
            logger.error('[getUserConversations] Dynamic profile hydration error:', hydrErr);
          }
        }

        // Add unread count and compute dynamic lastMessage for each conversation
        const convsWithUnread = await Promise.all(
          activeConversations.map((conv) =>
            enrichConversationForUser(conv, employeeId),
          ),
        );

        return convsWithUnread;
      });
    },
    TTL.SIDEBAR,
  );
};

/**
 * Get paginated messages for a conversation
 */
export const getMessages = async (
  conversationId,
  employeeId,
  companyId,
  cursor = null,
  limit = 50,
) => {
  const isCacheable = !cursor;
  const cacheKey = isCacheable
    ? CacheKeys.convMsgs(companyId, conversationId)
    : null;

  const fetchFn = async () => {
    return runWithTenant(companyId, async () => {
      // Verify participant
      const conv = await Conversation.findOne({
        id: conversationId,
        "participants.employeeId": employeeId,
      });
      if (!conv) throw new Error("Conversation not found or access denied");

      const query = {
        conversationId,
        $nor: [{ "deletedFor.employeeId": employeeId }],
      };

      const deleteEntry = conv.deletedBy?.find(
        (d) => d.userId?.toString() === employeeId?.toString(),
      );
      if (deleteEntry) {
        query.createdAt = { $gt: deleteEntry.deletedAt };
      }

      if (cursor && mongoose.isValidObjectId(cursor)) {
        query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      }

      const messages = await Message.find(query, { sort: { _id: -1 }, limit, lean: true });

      // Fetch and populate poll details for poll messages
      const pollIds = messages
        .filter((m) => m.type === "poll" && m.pollId)
        .map((m) => m.pollId);
      if (pollIds.length > 0) {
        const Poll = mongoose.model("Poll");
        const polls = await Poll.find({ _id: { $in: pollIds } }).lean();

        // Auto-expire check on fetch
        const now = new Date();
        const expiredPollIds = [];
        const updatedPolls = polls.map((p) => {
          if (!p.isClosed && p.expiresAt && new Date(p.expiresAt) <= now) {
            p.isClosed = true;
            expiredPollIds.push(p._id);
          }
          return p;
        });

        if (expiredPollIds.length > 0) {
          await Poll.updateMany(
            { _id: { $in: expiredPollIds } },
            { $set: { isClosed: true } },
          );
        }

        const pollMap = updatedPolls.reduce((acc, p) => {
          if (p.isAnonymous) {
            p = {
              ...p,
              options: p.options.map((opt) => ({
                optionId: opt.optionId,
                text: opt.text,
                votesCount: opt.votes.length,
                votes: [], // Strip voter identities for privacy
              })),
            };
          }
          acc[p._id.toString()] = p;
          return acc;
        }, {});

        messages.forEach((m) => {
          if (m.type === "poll" && m.pollId && pollMap[m.pollId.toString()]) {
            m.pollId = pollMap[m.pollId.toString()];
          }
        });
      }

      // Populate thread details for messages having a threadId
      const threadIds = messages
        .filter((m) => m.threadId)
        .map((m) => m.threadId);
      if (threadIds.length > 0) {
        const Thread = mongoose.model("Thread");
        const threads = await Thread.find({ _id: { $in: threadIds } }).lean();
        const threadMap = threads.reduce((acc, t) => {
          acc[t._id.toString()] = {
            replyCount: t.replyCount,
            lastReplyAt: t.lastReplyAt,
            status: t.status,
            participants: t.participants,
          };
          return acc;
        }, {});

        messages.forEach((m) => {
          if (m.threadId && threadMap[m.threadId.toString()]) {
            m.threadDetails = threadMap[m.threadId.toString()];
          }
        });
      }

      // Reverse for chronological order (newest last — WhatsApp style)
      messages.reverse();

      const nextCursor =
        messages.length > 0 ? messages[0]._id.toString() : null;

      let hasMore = false;
      if (nextCursor) {
        const moreCount = await Message.countDocuments({
          conversationId,
          $nor: [{ "deletedFor.employeeId": employeeId }],
          _id: { $lt: new mongoose.Types.ObjectId(nextCursor) },
        });
        hasMore = moreCount > 0;
      }

      return {
        messages,
        pagination: {
          cursor: nextCursor,
          limit,
          hasMore,
        },
        conversation: conv,
      };
    });
  };

  if (isCacheable && cacheKey) {
    return cacheGetOrSet(cacheKey, fetchFn, TTL.RECENT_MESSAGES);
  }
  return fetchFn();
};

/**
 * Get single message detail
 */
export const getMessageDetail = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({
      id: messageId,
      $nor: [{ "deletedFor.employeeId": employeeId }],
    }).lean();

    if (!message) throw new Error("Message not found");

    // Verify participant
    const conv = await Conversation.findOne({
      id: message.conversationId,
      "participants.employeeId": employeeId,
    });
    if (!conv) throw new Error("Access denied");

    if (message.type === "poll" && message.pollId) {
      const Poll = mongoose.model("Poll");
      let poll = await Poll.findById(message.pollId).lean();
      if (poll) {
        const now = new Date();
        if (
          !poll.isClosed &&
          poll.expiresAt &&
          new Date(poll.expiresAt) <= now
        ) {
          poll.isClosed = true;
          await Poll.findByIdAndUpdate(poll._id, { $set: { isClosed: true } });
        }
        if (poll.isAnonymous) {
          poll = {
            ...poll,
            options: poll.options.map((opt) => ({
              optionId: opt.optionId,
              text: opt.text,
              votesCount: opt.votes.length,
              votes: [],
            })),
          };
        }
        message.pollId = poll;
      }
    }

    return message;
  });
};

/**
 * Save message to DB (called by Socket.io handler)
 */
export const saveMessage = async (messageData, companyId, existingConv = null) => {
  return runWithTenant(companyId, async () => {
    if (messageData.tempId) {
      const existingMsg = await Message.findOne({
        conversationId: messageData.conversationId,
        tempId: messageData.tempId,
      });
      if (existingMsg) {
        logger.info(`[ChatService] Duplicate message detected for tempId: ${messageData.tempId}. Returning existing message.`);
        return existingMsg;
      }
    }

    // Enforce onlyAdminsCanMessage settings
    const conv = existingConv || await Conversation.findOne({ id: messageData.conversationId });
    if (!conv) throw new Error("Conversation not found");

    if (conv.type === "group" && conv.settings?.onlyAdminsCanMessage) {
      const participant = conv.participants.find(
        (p) => p.employeeId === messageData.senderId,
      );
      if (!participant?.isAdmin) {
        throw new Error("Only admins can send messages in this group");
      }
    }

    const msgId = new mongoose.Types.ObjectId().toString();

    let replyToObject = null;
    if (messageData.replyTo && typeof messageData.replyTo === "string") {
      const originalMsg = await Message.findOne({ id: messageData.replyTo });
      if (originalMsg) {
        let replyContent = originalMsg.content || "";
        if (originalMsg.type === "audio") {
          replyContent = "🎤 Voice Message";
        } else if (originalMsg.type === "image") {
          replyContent = "📷 Photo";
        } else if (originalMsg.type === "video") {
          replyContent = "🎥 Video";
        } else if (originalMsg.type === "file") {
          replyContent = `📎 ${originalMsg.media?.fileName || "File"}`;
        } else if (replyContent.startsWith("data:")) {
          replyContent = replyContent.startsWith("data:audio") ? "🎤 Voice Message" :
                         replyContent.startsWith("data:image") ? "📷 Photo" :
                         replyContent.startsWith("data:video") ? "🎥 Video" : "📎 Attachment";
        }

        replyToObject = {
          messageId: originalMsg.id,
          content: replyContent,
          senderId: originalMsg.senderId,
          senderName: originalMsg.senderName,
          type: originalMsg.type || "text",
          mediaUrl: originalMsg.media?.url || null,
        };
      }
    } else if (messageData.replyTo && typeof messageData.replyTo === "object") {
      replyToObject = messageData.replyTo;
    }

    const contentType =
      messageData.type === "text"
        ? detectMarkdown(messageData.content)
        : "plain";

    const message = await Message.create({
      id: msgId,
      companyId,
      ...messageData,
      contentType: messageData.contentType || contentType,
      replyTo: replyToObject,
    });

    // Update conversation lastMessage + lastActivityAt
    const previewContent = messageData.isDeleted
      ? null
      : messageData.type === "text"
        ? messageData.content
        : `📎 ${messageData.media?.fileName || messageData.type}`;

    await Conversation.findOneAndUpdate(
      { id: messageData.conversationId },
      {
        lastMessage: {
          messageId: msgId,
          content: previewContent,
          type: messageData.type,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          sentAt: new Date(),
        },
        lastActivityAt: new Date(),
        hiddenBy: [],
        archivedBy: [],
      },
    );

    // Increment unread counts for other participants (non-blocking)
    readReceiptService.incrementUnreadCounts(
      messageData.conversationId,
      messageData.senderId,
      companyId,
    ).catch(() => {});

    // Invalidate caches
    cacheDel(CacheKeys.convMsgs(companyId, messageData.conversationId)).catch(
      () => {},
    );
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return message;
  });
};

/**
 * Mark messages as read — WhatsApp blue tick
 */
export const markAsRead = async (
  conversationId,
  employeeId,
  employeeName,
  companyId,
) => {
  if (redis.isAvailable) {
    const unreadKey = `unread:${employeeId}:${conversationId}`;
    await redis.set(unreadKey, 0).catch(() => {});
  }

  const result = await runWithTenant(companyId, async () => {
    const now = new Date();

    // Find latest visible message in conversation to persist lastReadMessageId
    const latestMsg = await Message.findOne(
      { conversationId, isDeleted: false },
      { sort: { createdAt: -1 } }
    );
    const lastReadMessageId = latestMsg?.id || null;

    // Add readBy to all unread messages in this conversation
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: employeeId },
        isDeleted: false,
        "readBy.employeeId": { $ne: employeeId },
      },
      {
        $push: {
          readBy: { employeeId, name: employeeName, readAt: now },
        },
      },
    );

    // Update participant's lastReadAt AND lastReadMessageId
    const updateFields = { "participants.$[elem].lastReadAt": now };
    if (lastReadMessageId) {
      updateFields["participants.$[elem].lastReadMessageId"] = lastReadMessageId;
    }

    await Conversation.updateOne(
      { id: conversationId },
      { $set: updateFields },
      // Participant subdocs are keyed by employeeId (see conversation.model.js).
      // Referencing non-schema paths (userId/id) throws a Mongoose
      // "Could not find path participants.N.userId in schema" strict-mode error.
      { arrayFilters: [{ "elem.employeeId": employeeId }] }
    );

    return { success: true, readAt: now, lastReadMessageId };
  });

  cacheDel(CacheKeys.sidebar(companyId, employeeId)).catch(() => {});
  cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});
  return result;
};

/**
 * Mark a conversation as UNREAD for a user (manual "mark as unread").
 * Unread is derived from getUnreadCount, which excludes messages the user has a
 * readBy entry on. So we (1) drop the user's readBy from the latest incoming
 * message, (2) rewind the participant's lastReadAt to just before it, and
 * (3) invalidate the redis unread key + sidebar cache so counts recompute.
 */
export const markAsUnread = async (conversationId, employeeId, companyId) => {
  const result = await runWithTenant(companyId, async () => {
    const latestIncoming = await Message.findOne(
      { conversationId, isDeleted: false, senderId: { $ne: employeeId } },
      { sort: { createdAt: -1 } },
    );

    // Nothing from anyone else → nothing to mark unread.
    if (!latestIncoming) {
      return { success: true, unreadCount: 0 };
    }

    // Remove this user's read receipt so the message is counted as unread.
    await Message.updateOne(
      { id: latestIncoming.id },
      { $pull: { readBy: { employeeId } } },
    );

    // Rewind lastReadAt to just before that message.
    const unreadFrom = new Date(new Date(latestIncoming.createdAt).getTime() - 1);
    await Conversation.updateOne(
      { id: conversationId },
      {
        $set: {
          "participants.$[elem].lastReadAt": unreadFrom,
          "participants.$[elem].lastReadMessageId": null,
        },
      },
      { arrayFilters: [{ "elem.employeeId": employeeId }] },
    );

    return { success: true, readAt: unreadFrom };
  });

  // Invalidate cached unread count so getUnreadCount recomputes from Mongo.
  if (redis.isAvailable) {
    await redis.del(`unread:${employeeId}:${conversationId}`).catch(() => {});
  }
  cacheDel(CacheKeys.sidebar(companyId, employeeId)).catch(() => {});
  cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});
  return result;
};

/**
 * Delete message — for me only OR for everyone
 */
export const deleteMessage = async (
  messageId,
  employeeId,
  deleteForEveryone,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({ id: messageId });
    if (!message) throw new Error("Message not found");

    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (message.senderId !== employeeId) {
        throw new Error("Only sender can delete message for everyone");
      }
      // Check time limit (WhatsApp: 60 hours)
      const hoursDiff = (Date.now() - message.createdAt) / (1000 * 60 * 60);
      if (hoursDiff > 60) {
        throw new Error("Cannot delete message after 60 hours");
      }

      // Delete from ImageKit immediately if media exists
      if (message.media) {
        if (message.media.imageKitFileId) {
          logger.info(
            `[ImageKit] Immediate deletion on Delete for Everyone. FileID: ${message.media.imageKitFileId}`,
          );
          deleteFileFromImageKitById(message.media.imageKitFileId).catch(
            (err) => {
              logger.error(
                `[ImageKit] Failed to delete fileId ${message.media.imageKitFileId} immediately:`,
                err,
              );
            },
          );
        } else if (
          message.media.url &&
          message.media.url.includes("imagekit.io")
        ) {
          logger.info(
            `[ImageKit] Immediate deletion on Delete for Everyone. URL: ${message.media.url}`,
          );
          deleteFromImageKit(message.media.url).catch((err) => {
            logger.error(
              `[ImageKit] Failed to delete URL ${message.media.url} immediately:`,
              err,
            );
          });
        }
      }

      await Message.findOneAndUpdate(
        { id: messageId },
        {
          isDeleted: true,
          deletedAt: new Date(),
          content: "",
          media: null,
        },
      );
    } else {
      // Delete for me only
      await Message.findOneAndUpdate(
        { id: messageId },
        {
          $push: {
            deletedFor: { employeeId, deletedAt: new Date() },
          },
        },
      );
    }

    // Invalidate caches
    cacheDel(CacheKeys.convMsgs(companyId, message.conversationId)).catch(
      () => {},
    );
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return { success: true, deleteForEveryone };
  });
};

/**
 * Clear all messages in a conversation for a specific employee (soft delete for this user)
 */
export const clearConversationMessages = async (
  conversationId,
  employeeId,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    // Verify participant
    const conv = await Conversation.findOne({
      id: conversationId,
      "participants.employeeId": employeeId,
    });
    if (!conv) throw new Error("Conversation not found or access denied");

    const now = new Date();

    // Push { employeeId, deletedAt } to all messages of this conversation where it's not already deleted
    await Message.updateMany(
      {
        conversationId,
        "deletedFor.employeeId": { $ne: employeeId },
      },
      {
        $push: {
          deletedFor: { employeeId, deletedAt: now },
        },
      },
    );

    // Invalidate caches
    cacheDel(CacheKeys.convMsgs(companyId, conversationId)).catch(() => {});
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return { success: true };
  });
};

/**
 * Add reaction to message (WhatsApp emoji reactions)
 */
export const addReaction = async (
  messageId,
  employeeId,
  employeeName,
  emoji,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    // Remove existing reaction from same user first (toggle)
    await Message.findOneAndUpdate(
      { id: messageId },
      { $pull: { reactions: { employeeId } } },
    );

    // Add new reaction
    await Message.findOneAndUpdate(
      { id: messageId },
      {
        $push: {
          reactions: {
            employeeId,
            name: employeeName,
            emoji,
            reactedAt: new Date(),
          },
        },
      },
    );

    return { success: true };
  });
};

/**
 * Remove reaction from message
 */
export const removeReaction = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    await Message.findOneAndUpdate(
      { id: messageId },
      { $pull: { reactions: { employeeId } } },
    );
    return { success: true };
  });
};

/**
 * Edit message
 */
export const editMessage = async (
  messageId,
  employeeId,
  newContent,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({ id: messageId });
    if (!message) throw new Error("Message not found");
    if (message.senderId !== employeeId)
      throw new Error("Only sender can edit message");
    if (message.type !== "text")
      throw new Error("Only text messages can be edited");

    const contentType = detectMarkdown(newContent);
    await Message.findOneAndUpdate(
      { id: messageId },
      {
        content: newContent,
        contentType,
        isEdited: true,
        editedAt: new Date(),
        $push: {
          editHistory: {
            content: message.content,
            editedAt: new Date(),
          },
        },
      },
    );

    // Invalidate caches
    cacheDel(CacheKeys.convMsgs(companyId, message.conversationId)).catch(
      () => {},
    );
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return { success: true };
  });
};

/**
 * Search messages in a conversation
 */
export const searchMessages = async (
  conversationId,
  query,
  employeeId,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const messages = await Message.find(
      {
        conversationId,
        content: { $regex: query, $options: "i" },
        isDeleted: false,
        $nor: [{ "deletedFor.employeeId": employeeId }],
      },
      { sort: { createdAt: -1 }, limit: 50, lean: true }
    );

    return messages;
  });
};

/**
 * Add members to group
 */
export const addGroupMembers = async (
  conversationId,
  adminId,
  newMembers,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv || conv.type !== "group") throw new Error("Group not found");

    const adminParticipant = conv.participants.find(
      (p) => p.employeeId === adminId,
    );
    if (!adminParticipant?.isAdmin)
      throw new Error("Only admins can add members");

    const validNewMembers = [];
    const addedNames = [];

    for (const member of newMembers) {
      const exists = conv.participants.find((p) => p.employeeId === member.id);
      if (!exists) {
        validNewMembers.push({
          employeeId: member.id,
          name: member.name,
          avatar: member.avatar || null,
          joinedAt: new Date(),
          isAdmin: false,
        });
        addedNames.push(member.name);
      }
    }

    if (validNewMembers.length === 0) {
      return { success: true, addedMembers: [], conversation: conv };
    }

    // Push all new participants in one operation
    const conversation = await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $push: { participants: { $each: validNewMembers } } },
      { new: true },
    ).lean();

    // Create a single batched system message
    let content = "";
    if (addedNames.length === 1) {
      content = `${adminParticipant.name} added ${addedNames[0]}`;
    } else if (addedNames.length === 2) {
      content = `${adminParticipant.name} added ${addedNames[0]} and ${addedNames[1]}`;
    } else {
      content = `${adminParticipant.name} added ${addedNames[0]}, ${addedNames[1]} and ${addedNames.length - 2} others`;
    }

    const msgId = new mongoose.Types.ObjectId().toString();
    const sysMsg = await Message.create({
      id: msgId,
      companyId,
      conversationId,
      senderId: "system",
      senderName: "System",
      content,
      type: "system",
      systemMeta: {
        action: "member_added",
        targetId: validNewMembers[0].employeeId,
        targetName: addedNames.join(", "),
      },
    });

    // Broadcast system message to active sockets in room
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("new_message", {
        id: msgId,
        conversationId,
        senderId: "system",
        senderName: "System",
        preview: sysMsg.content,
        type: "system",
        createdAt: sysMsg.createdAt,
        _isOptimized: true,
      });
    } catch (err) {}

    // Invalidate caches
    cacheDel(
      CacheKeys.groupMembers(companyId, conversationId),
      CacheKeys.convMsgs(companyId, conversationId),
    ).catch(() => {});
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return { success: true, addedMembers: addedNames, conversation };
  });
};

/**
 * Remove member from group / Leave group
 */
export const removeGroupMember = async (
  conversationId,
  adminId,
  targetEmployeeId,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv || conv.type !== "group") throw new Error("Group not found");

    const isSelf = adminId === targetEmployeeId;
    let adminParticipant = null;
    if (!isSelf) {
      adminParticipant = conv.participants.find(
        (p) => p.employeeId === adminId,
      );
      if (!adminParticipant?.isAdmin)
        throw new Error("Only admins can remove members");
    }

    const target = conv.participants.find(
      (p) => p.employeeId === targetEmployeeId,
    );
    if (!target) throw new Error("Member not found in group");

    // Auto-promote logic if the leaving user is the last admin
    let autoPromotedMsg = null;
    let autoPromotedMemberId = null;

    if (target.isAdmin) {
      const admins = conv.participants.filter((p) => p.isAdmin);
      if (admins.length === 1) {
        const otherParticipants = conv.participants.filter(
          (p) => p.employeeId !== targetEmployeeId,
        );
        if (otherParticipants.length > 0) {
          // Sort by joinedAt ascending to find the longest standing member
          otherParticipants.sort(
            (a, b) => new Date(a.joinedAt) - new Date(b.joinedAt),
          );
          const longestStanding = otherParticipants[0];
          autoPromotedMemberId = longestStanding.employeeId;

          // Promote them in DB
          await Conversation.findOneAndUpdate(
            {
              id: conversationId,
              "participants.employeeId": longestStanding.employeeId,
            },
            { $set: { "participants.$.isAdmin": true } },
          );

          autoPromotedMsg = `${longestStanding.name} has been promoted to Admin (auto-promoted)`;
        }
      }
    }

    const action = isSelf ? "member_left" : "member_removed";
    const content = isSelf
      ? `${target.name} left the group`
      : `${adminParticipant ? adminParticipant.name : "Admin"} removed ${target.name}`;

    // Pull member out
    const updatedConv = await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $pull: { participants: { employeeId: targetEmployeeId } } },
      { new: true },
    ).lean();

    // Create system message for leave/remove
    const msgId = new mongoose.Types.ObjectId().toString();
    const sysMsg = await Message.create({
      id: msgId,
      companyId,
      conversationId,
      senderId: "system",
      senderName: "System",
      content,
      type: "system",
      systemMeta: {
        action,
        targetId: targetEmployeeId,
        targetName: target.name,
      },
    });

    // Broadcast leave/remove system message
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("new_message", {
        id: sysMsg.id,
        conversationId,
        senderId: "system",
        senderName: "System",
        preview: sysMsg.content,
        type: "system",
        createdAt: sysMsg.createdAt,
        _isOptimized: true,
      });
    } catch (err) {}

    // Create and broadcast auto-promote system message if applicable
    if (autoPromotedMsg) {
       const pMsgId = new mongoose.Types.ObjectId().toString();
      const pSysMsg = await Message.create({
        id: pMsgId,
        companyId,
        conversationId,
        senderId: "system",
        senderName: "System",
        content: autoPromotedMsg,
        type: "system",
        systemMeta: {
          action: "admin_added",
          targetId: autoPromotedMemberId,
          targetName: autoPromotedMsg.split(" has been")[0],
        },
      });

      try {
        const io = getIO();
        io.to(`conv:${conversationId}`).emit("new_message", {
          id: pSysMsg.id,
          conversationId,
          senderId: "system",
          senderName: "System",
          preview: pSysMsg.content,
          type: "system",
          createdAt: pSysMsg.createdAt,
          _isOptimized: true,
        });
      } catch (err) {}
    }

    // Invalidate caches
    cacheDel(
      CacheKeys.groupMembers(companyId, conversationId),
      CacheKeys.convMsgs(companyId, conversationId),
    ).catch(() => {});
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return { success: true, conversation: updatedConv };
  });
};

/**
 * Update group details (name, description, avatar, settings)
 */
export const updateGroupDetails = async (
  conversationId,
  adminId,
  groupData,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv || conv.type !== "group") throw new Error("Group not found");

    const adminParticipant = conv.participants.find(
      (p) => p.employeeId === adminId,
    );
    if (!adminParticipant?.isAdmin)
      throw new Error("Only admins can update group details");

    const updates = {};
    const systemMessages = [];

    // 0. Promote Member to Admin
    if (groupData.promoteEmployeeId) {
      const target = conv.participants.find(
        (p) => p.employeeId === groupData.promoteEmployeeId,
      );
      if (target && !target.isAdmin) {
        await Conversation.findOneAndUpdate(
          {
            id: conversationId,
            "participants.employeeId": groupData.promoteEmployeeId,
          },
          { $set: { "participants.$.isAdmin": true } },
        );
        systemMessages.push(
          `${adminParticipant.name} promoted ${target.name} to Admin`,
        );
      }
    }

    // 1. Name update
    if (groupData.name && groupData.name.trim() !== conv.name) {
      updates.name = groupData.name.trim();
      systemMessages.push(
        `${adminParticipant.name} changed the group name to "${updates.name}"`,
      );
    }

    // 2. Description update
    if (
      groupData.description !== undefined &&
      groupData.description !== conv.description
    ) {
      updates.description = groupData.description || null;
    }

    // 3. Avatar update with ImageKit old file deletion
    if (groupData.avatar !== undefined && groupData.avatar !== conv.avatar) {
      let newAvatarUrl = groupData.avatar || null;
      let newAvatarFileId = null;
      if (
        newAvatarUrl &&
        newAvatarUrl.startsWith("data:") &&
        newAvatarUrl.includes(";base64,")
      ) {
        try {
          const uploadResult = await uploadToImageKitDetailed(
            newAvatarUrl,
            `group_avatar_${conversationId}_${Date.now()}.jpg`,
          );
          newAvatarUrl = uploadResult.url;
          newAvatarFileId = uploadResult.fileId;
        } catch (err) {
          logger.error("[Chat] Group avatar upload failed:", err);
        }
      }

      const oldAvatarId = conv.avatarImageKitFileId;
      const oldAvatar = conv.avatar;
      updates.avatar = newAvatarUrl;
      updates.avatarImageKitFileId = newAvatarFileId;

      if (oldAvatarId) {
        deleteFileFromImageKitById(oldAvatarId).catch((err) => {
          logger.error("[ImageKit] Failed to delete old avatar by ID:", err);
        });
      } else if (oldAvatar && oldAvatar.includes("imagekit.io")) {
        deleteFromImageKit(oldAvatar).catch((err) => {
          logger.error("[ImageKit] Failed to delete old avatar:", err);
        });
      }

      systemMessages.push(
        `${adminParticipant.name} changed the group profile photo`,
      );
    }

    // 4. Settings update
    if (groupData.settings) {
      updates.settings = {
        ...conv.settings,
        ...groupData.settings,
      };
      if (
        groupData.settings.onlyAdminsCanMessage !== undefined &&
        groupData.settings.onlyAdminsCanMessage !==
          conv.settings?.onlyAdminsCanMessage
      ) {
        const settingText = groupData.settings.onlyAdminsCanMessage
          ? "Admins Only"
          : "All Participants";
        systemMessages.push(
          `${adminParticipant.name} set group messages setting to: ${settingText}`,
        );
      }
    }

    if (Object.keys(updates).length === 0) return conv;

    const updatedConv = await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $set: updates },
      { new: true },
    );

    // Write system messages
    for (const content of systemMessages) {
      const msgId = new mongoose.Types.ObjectId().toString();
      const sysMsg = await Message.create({
        id: msgId,
        companyId,
        conversationId,
        senderId: "system",
        senderName: "System",
        content,
        type: "system",
      });

      // Broadcast system message
      try {
        const io = getIO();
        io.to(`conv:${conversationId}`).emit("new_message", {
          id: sysMsg.id,
          conversationId,
          senderId: "system",
          senderName: "System",
          preview: sysMsg.content,
          type: "system",
          createdAt: sysMsg.createdAt,
          _isOptimized: true,
        });
      } catch (err) {}
    }

    // Invalidate caches
    cacheDel(CacheKeys.convMsgs(companyId, conversationId)).catch(() => {});
    cacheDelPattern(CacheKeys.sidebar(companyId, "*")).catch(() => {});

    return updatedConv;
  });
};

/**
 * Pin a conversation for a specific employee
 */
export const pinConversation = async (
  conversationId,
  employeeId,
  companyId,
) => {
  const result = await runWithTenant(companyId, async () => {
    return await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $addToSet: { pinnedBy: { employeeId, pinnedAt: new Date() } } },
      { new: true },
    );
  });
  cacheDel(CacheKeys.sidebar(companyId, employeeId)).catch(() => {});
  return result;
};

/**
 * Unpin a conversation for a specific employee
 */
export const unpinConversation = async (
  conversationId,
  employeeId,
  companyId,
) => {
  const result = await runWithTenant(companyId, async () => {
    return await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $pull: { pinnedBy: { employeeId } } },
      { new: true },
    );
  });
  cacheDel(CacheKeys.sidebar(companyId, employeeId)).catch(() => {});
  return result;
};

/**
 * Mute a conversation for a specific employee
 */
export const muteConversation = async (
  conversationId,
  employeeId,
  companyId,
  mutedUntil = null,
) => {
  const result = await runWithTenant(companyId, async () => {
    return await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $addToSet: { mutedBy: { employeeId, mutedUntil } } },
      { new: true },
    );
  });
  cacheDel(CacheKeys.sidebar(companyId, employeeId)).catch(() => {});
  return result;
};

/**
 * Unmute a conversation for a specific employee
 */
export const unmuteConversation = async (
  conversationId,
  employeeId,
  companyId,
) => {
  const result = await runWithTenant(companyId, async () => {
    return await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $pull: { mutedBy: { employeeId } } },
      { new: true },
    );
  });
  cacheDel(CacheKeys.sidebar(companyId, employeeId)).catch(() => {});
  return result;
};

/**
 * Pin a message in a conversation
 */
export const pinMessage = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { isPinned: true, pinnedBy: employeeId, pinnedAt: new Date() },
      { new: true },
    );
  });
};

/**
 * Unpin a message in a conversation
 */
export const unpinMessage = async (messageId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { isPinned: false, pinnedBy: null, pinnedAt: null },
      { new: true },
    );
  });
};

/**
 * Star/Highlight a message for a specific employee
 */
export const starMessage = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { $addToSet: { starredBy: employeeId } },
      { new: true },
    );
  });
};

/**
 * Unstar/Unhighlight a message for a specific employee
 */
export const unstarMessage = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { $pull: { starredBy: employeeId } },
      { new: true },
    );
  });
};

/**
 * Bulk delete messages (soft delete for a specific user)
 */
export const deleteMessagesBulk = async (messageIds, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const now = new Date();

    await Message.updateMany(
      {
        id: { $in: messageIds },
        "deletedFor.employeeId": { $ne: employeeId },
      },
      {
        $push: {
          deletedFor: { employeeId, deletedAt: now },
        },
      },
    );

    return { success: true };
  });
};

/**
 * Permanent Delete Message
 * Fetches message, deletes attachment from ImageKit by fileId (or fallback url),
 * updates conversation lastMessage preview if necessary, and deletes MongoDB document.
 */
export const deleteMessagePermanently = async (messageId, companyId) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({ id: messageId });
    if (!message) throw new Error("Message not found");

    // 1. Delete attachment from ImageKit
    if (message.media) {
      if (message.media.imageKitFileId) {
        logger.info(
          `[Chat] Deleting message attachment by file ID: ${message.media.imageKitFileId}`,
        );
        await deleteFileFromImageKitById(message.media.imageKitFileId);
      } else if (
        message.media.url &&
        message.media.url.includes("imagekit.io")
      ) {
        logger.info(
          `[Chat] Deleting message attachment by URL: ${message.media.url}`,
        );
        await deleteFromImageKit(message.media.url);
      }
    }

    // 2. Update conversation lastMessage preview if this message was the latest one
    const conv = await Conversation.findOne({ id: message.conversationId });
    if (conv && conv.lastMessage?.messageId === messageId) {
      const nextLatest = await Message.findOne(
        {
          conversationId: message.conversationId,
          id: { $ne: messageId },
        },
        { sort: { createdAt: -1 } }
      );

      if (nextLatest) {
        const previewContent = nextLatest.isDeleted
          ? null
          : nextLatest.type === "text"
            ? nextLatest.content
            : `📎 ${nextLatest.media?.fileName || nextLatest.type}`;

        await Conversation.findOneAndUpdate(
          { id: message.conversationId },
          {
            $set: {
              lastMessage: {
                messageId: nextLatest.id,
                content: previewContent,
                type: nextLatest.type,
                senderId: nextLatest.senderId,
                senderName: nextLatest.senderName,
                sentAt: nextLatest.createdAt,
              },
            },
          },
        );
      } else {
        await Conversation.findOneAndUpdate(
          { id: message.conversationId },
          { $set: { lastMessage: null } },
        );
      }
    }

    // 3. Remove message record from MongoDB
    await Message.deleteOne({ id: messageId });
    logger.info(`[Chat] Permanently deleted message messageId: ${messageId}`);

    return { success: true };
  });
};

/**
 * Permanent Delete Conversation
 * Fetches all conversation messages, collects and deletes all attachment files
 * from ImageKit in parallel/batches, deletes all messages & conversation from MongoDB,
 * and emits a socket event.
 */
export const deleteConversationPermanently = async (
  conversationId,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv) throw new Error("Conversation not found");

    // 1. Gather all messages in conversation
    const messages = await Message.find({ conversationId }, { lean: true });

    // 2. Collect unique ImageKit File IDs and URLs to delete
    const fileIdsToDelete = new Set();
    const urlsToDelete = new Set();

    if (conv.avatarImageKitFileId) {
      fileIdsToDelete.add(conv.avatarImageKitFileId);
    } else if (conv.avatar && conv.avatar.includes("imagekit.io")) {
      urlsToDelete.add(conv.avatar);
    }

    for (const msg of messages) {
      if (msg.media) {
        if (msg.media.imageKitFileId) {
          fileIdsToDelete.add(msg.media.imageKitFileId);
        } else if (msg.media.url && msg.media.url.includes("imagekit.io")) {
          urlsToDelete.add(msg.media.url);
        }
      }
    }

    // 3. Delete files from ImageKit in batches of 10
    const fileIdsArray = Array.from(fileIdsToDelete);
    const urlsArray = Array.from(urlsToDelete);

    logger.info(
      `[Chat] Permanent cleanup for conversation ${conversationId}: Deleting ${fileIdsArray.length} files by ID and ${urlsArray.length} files by URL...`,
    );

    const BATCH_SIZE = 10;

    // Delete fileIds
    for (let i = 0; i < fileIdsArray.length; i += BATCH_SIZE) {
      const batch = fileIdsArray.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((fileId) =>
          deleteFileFromImageKitById(fileId).catch((err) =>
            logger.error(
              `[Chat] Failed to delete fileId ${fileId} during conversation cleanup:`,
              err,
            ),
          ),
        ),
      );
    }

    // Delete urls
    for (let i = 0; i < urlsArray.length; i += BATCH_SIZE) {
      const batch = urlsArray.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((url) =>
          deleteFromImageKit(url).catch((err) =>
            logger.error(
              `[Chat] Failed to delete url ${url} during conversation cleanup:`,
              err,
            ),
          ),
        ),
      );
    }

    // 4. Delete all messages from MongoDB
    await Message.deleteMany({ conversationId });

    // 5. Delete conversation from MongoDB
    await Conversation.deleteOne({ id: conversationId });

    logger.info(
      `[Chat] Permanently deleted conversation conversationId: ${conversationId} and all associated records.`,
    );

    // 6. Broadcast socket deletion event
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("conversation_deleted", {
        conversationId,
      });

      // Also notify each participant directly so their UI updates
      for (const participant of conv.participants) {
        io.to(`user:${participant.employeeId}`).emit("conversation_deleted", {
          conversationId,
        });
      }
    } catch (socketErr) {
      logger.error(
        "[Chat] Socket emission of conversation_deleted failed:",
        socketErr,
      );
    }

    return { success: true };
  });
};

/**
 * Forward message to multiple target conversations
 */
export const forwardMessage = async (
  messageId,
  targetConversationIds,
  forwardingUser,
  companyId,
) => {
  return runWithTenant(companyId, async () => {
    // 1. Validate source message exists
    const sourceMessage = await Message.findOne({ id: messageId });
    if (!sourceMessage) {
      throw new Error("Message not found");
    }

    // 2. Validate user has access to source conversation
    const sourceConv = await Conversation.findOne({
      id: sourceMessage.conversationId,
      "participants.employeeId": forwardingUser.id,
    });
    if (!sourceConv) {
      throw new Error(
        "Access denied: You do not belong to the source conversation",
      );
    }

    // 3. Validate user belongs to target conversations
    const targetConvs = await Conversation.find({
      id: { $in: targetConversationIds },
      "participants.employeeId": forwardingUser.id,
    });
    if (targetConvs.length !== targetConversationIds.length) {
      throw new Error(
        "Access denied: You are not a participant in all selected conversations",
      );
    }

    // 4. Increment forwardedCount on source message
    await Message.findOneAndUpdate(
      { id: sourceMessage.id },
      { $inc: { forwardedCount: targetConversationIds.length } },
    );

    const createdMessages = [];

    // 5. Create new messages copies
    for (const targetConv of targetConvs) {
      const newMsgId = new mongoose.Types.ObjectId().toString();

      let mediaObj = null;
      if (sourceMessage.media) {
        mediaObj = {
          url: sourceMessage.media.url,
          fileName: sourceMessage.media.fileName,
          fileSize: sourceMessage.media.fileSize,
          mimeType:
            sourceMessage.media.mimeType || sourceMessage.media.fileType,
          width: sourceMessage.media.width,
          height: sourceMessage.media.height,
          duration: sourceMessage.media.duration,
          imageKitFileId: sourceMessage.media.imageKitFileId,
          imageKitFilePath: sourceMessage.media.imageKitFilePath,
        };
      }

      const newMsg = await Message.create({
        id: newMsgId,
        companyId,
        conversationId: targetConv.id,
        senderId: forwardingUser.id,
        senderName: forwardingUser.name,
        senderAvatar: forwardingUser.avatar || null,
        senderRole: forwardingUser.role || "employee",
        content: sourceMessage.content || "",
        type: sourceMessage.type || "text",
        contentType: sourceMessage.contentType || "plain",
        contentVersion: sourceMessage.contentVersion || 1,
        media: mediaObj,
        isForwarded: true,
        forwardedCount: (sourceMessage.forwardedCount || 0) + 1,
        forwardedFrom: {
          conversationId: sourceMessage.conversationId,
          messageId: sourceMessage.id,
          senderId: sourceMessage.senderId,
          senderName: sourceMessage.senderName,
        },
      });

      // Update conversation lastMessage + lastActivityAt
      const previewText =
        newMsg.type === "text"
          ? newMsg.content
          : `📎 ${newMsg.media?.fileName || newMsg.type}`;

      await Conversation.findOneAndUpdate(
        { id: targetConv.id },
        {
          lastMessage: {
            messageId: newMsg.id,
            content: previewText,
            type: newMsg.type,
            senderId: forwardingUser.id,
            senderName: forwardingUser.name,
            sentAt: new Date(),
          },
          lastActivityAt: new Date(),
        },
      );

      createdMessages.push(newMsg);
    }

    return createdMessages;
  });
};

/**
 * Get all archived conversations for a user
 */
export const getArchivedConversations = async (
  employeeId,
  companyId,
  role,
  branch,
) => {
  return runWithTenant(companyId, async () => {
    const isExcluded = [
      "super_admin",
      "company_admin",
      "superadmin",
      "companyadmin",
    ].includes(role?.toLowerCase());
    const query = {
      "participants.employeeId": employeeId,
      isActive: true,
      isDeleted: { $ne: true },
      archivedBy: { $elemMatch: { userId: employeeId } },
    };

    if (!isExcluded && branch) {
      query.$or = [
        { type: "direct" },
        {
          type: "group",
          $or: [
            { branch: branch },
            { branch: { $exists: false } },
            { branch: null },
          ],
        },
      ];
    }

    const conversations = await Conversation.find(query)
      .sort({ lastActivityAt: -1 })
      .lean();

    // Add unread count and compute dynamic lastMessage for each conversation
    const convsWithUnread = await Promise.all(
      conversations.map((conv) => enrichConversationForUser(conv, employeeId)),
    );

    return convsWithUnread;
  });
};

/**
 * Get all hidden conversations for a user
 */
export const getHiddenConversations = async (
  employeeId,
  companyId,
  role,
  branch,
) => {
  return runWithTenant(companyId, async () => {
    const isExcluded = [
      "super_admin",
      "company_admin",
      "superadmin",
      "companyadmin",
    ].includes(role?.toLowerCase());
    const query = {
      "participants.employeeId": employeeId,
      isActive: true,
      isDeleted: { $ne: true },
      hiddenBy: { $elemMatch: { userId: employeeId } },
    };

    if (!isExcluded && branch) {
      query.$or = [
        { type: "direct" },
        {
          type: "group",
          $or: [
            { branch: branch },
            { branch: { $exists: false } },
            { branch: null },
          ],
        },
      ];
    }

    const conversations = await Conversation.find(query)
      .sort({ lastActivityAt: -1 })
      .lean();

    // Add unread count and compute dynamic lastMessage for each conversation
    const convsWithUnread = await Promise.all(
      conversations.map((conv) => enrichConversationForUser(conv, employeeId)),
    );

    return convsWithUnread;
  });
};

/**
 * Retrieve all starred messages of a specific employee
 */
export const getStarredMessages = async (employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.find({
      starredBy: employeeId,
      isDeleted: false,
      "deletedFor.employeeId": { $ne: employeeId },
    })
      .sort({ createdAt: -1 })
      .lean();
  });
};

/**
 * Retrieve a summary of shared media, documents, and links in a conversation
 */
export const getSharedContentSummary = async (conversationId, companyId) => {
  return runWithTenant(companyId, async () => {
    // 1. Fetch messages containing media in this conversation
    const mediaMessages = await Message.find({
      conversationId,
      isDeleted: false,
      "media.url": { $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    const images = [];
    const videos = [];
    const audio = [];
    const documents = [];

    mediaMessages.forEach((m) => {
      const media = m.media;
      const fileData = {
        messageId: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        createdAt: m.createdAt,
        url: media.url,
        fileName: media.fileName || "File",
        fileSize: media.fileSize || 0,
        mimeType: media.mimeType || "",
      };

      if (m.type === "image" || media.mimeType?.startsWith("image/")) {
        images.push(fileData);
      } else if (m.type === "video" || media.mimeType?.startsWith("video/")) {
        videos.push(fileData);
      } else if (m.type === "audio" || media.mimeType?.startsWith("audio/")) {
        audio.push(fileData);
      } else {
        documents.push(fileData);
      }
    });

    // 2. Fetch messages containing links in this conversation
    const linkMessages = await Message.find({
      conversationId,
      isDeleted: false,
      content: { $regex: /https?:\/\/[^\s]+/i },
    })
      .sort({ createdAt: -1 })
      .lean();

    const links = linkMessages.map((m) => {
      const matches = m.content.match(/https?:\/\/[^\s]+/gi);
      return {
        messageId: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        createdAt: m.createdAt,
        content: m.content,
        urls: matches || [],
      };
    });

    return {
      images,
      videos,
      audio,
      documents,
      links,
    };
  });
};
