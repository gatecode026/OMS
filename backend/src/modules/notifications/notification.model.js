/**
 * @file src/modules/notifications/notification.model.js
 * @description Mongoose model for the Enterprise Notification Engine.
 *   Supports: Redis-first hot path, offline queue recovery, multi-tenancy,
 *   priority tiers (normal/high), category grouping, and 90-day auto-cleanup.
 */

import mongoose from "mongoose";
import { tenantPlugin } from "../../utils/tenantPlugin.js";

/**
 * Notification types supported by the engine.
 * Mirrors the NOTIFICATION_TYPES constant in notification.service.js
 */
const VALID_TYPES = [
  "message",
  "new_message",
  "mention",
  "group_mention",
  "announcement",
  "broadcast",
  "task",
  "task_assigned",
  "task_updated",
  "meeting",
  "file",
  "reaction",
  "group",
  "group_invite",
  "user_added",
  "user_removed",
  "system",
  "chat_invitation",
  "leave",
  "attendance",
  "poll",
];

const notificationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      index: true,
    },
    // ── TARGETING ──────────────────────────────────────────────────────────────
    userId: {
      type: String,
      required: true,
      index: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },

    // ── CONTENT ────────────────────────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: VALID_TYPES,
      index: true,
    },
    /**
     * Broad category used for frontend filter tabs.
     * Derived automatically from `type` if not provided.
     */
    category: {
      type: String,
      enum: [
        "message",
        "mention",
        "announcement",
        "broadcast",
        "task",
        "meeting",
        "file",
        "reaction",
        "group",
        "system",
        "other",
      ],
      default: "other",
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    /**
     * Arbitrary metadata: conversationId, messageId, taskId, senderId, etc.
     * Kept as Mixed for maximum flexibility without schema migrations.
     */
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── STATE ──────────────────────────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Backwards-compat alias — kept in sync with isRead
    read: {
      type: Boolean,
      default: false,
    },

    // ── PRIORITY ───────────────────────────────────────────────────────────────
    /** 'high' for mentions, announcements; 'normal' for everything else */
    priority: {
      type: String,
      enum: ["normal", "high"],
      default: "normal",
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

// ── PLUGINS ───────────────────────────────────────────────────────────────────
// Enforce multi-tenancy (injects companyId scoping)
notificationSchema.plugin(tenantPlugin);

// ── INDEXES ───────────────────────────────────────────────────────────────────
// Primary query pattern: user's unread notifications for a company
notificationSchema.index({ companyId: 1, userId: 1, isRead: 1 });

// Category filter query pattern
notificationSchema.index({ companyId: 1, userId: 1, category: 1, createdAt: -1 });

// Type filter query pattern
notificationSchema.index({ companyId: 1, userId: 1, type: 1, createdAt: -1 });

// Chronological listing (most common read pattern)
notificationSchema.index({ userId: 1, createdAt: -1 });

// TTL index: auto-purge notifications older than 90 days to prevent unbounded growth
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);

// ── PRE-SAVE MIDDLEWARE ───────────────────────────────────────────────────────
/**
 * Auto-derive `category` from `type` before save.
 * Ensures consistent categorization without requiring callers to set it.
 */
notificationSchema.pre("save", function (next) {
  if (!this.isModified("type") && this.category !== "other") return next();
  this.category = deriveCategory(this.type);
  next();
});

/**
 * Also apply on insertMany (batch broadcasts)
 */
notificationSchema.pre("insertMany", function (next, docs) {
  if (Array.isArray(docs)) {
    docs.forEach((doc) => {
      if (!doc.category || doc.category === "other") {
        doc.category = deriveCategory(doc.type);
      }
    });
  }
  next();
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
export const deriveCategory = (type) => {
  if (!type) return "other";
  const t = type.toLowerCase();
  if (t.includes("message") || t === "chat_invitation") return "message";
  if (t.includes("mention")) return "mention";
  if (t === "announcement") return "announcement";
  if (t === "broadcast") return "broadcast";
  if (t.includes("task")) return "task";
  if (t === "meeting") return "meeting";
  if (t === "file") return "file";
  if (t === "reaction") return "reaction";
  if (t.includes("group") || t.includes("user_added") || t.includes("user_removed")) return "group";
  if (t === "system" || t === "leave" || t === "attendance" || t === "poll") return "system";
  return "other";
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
