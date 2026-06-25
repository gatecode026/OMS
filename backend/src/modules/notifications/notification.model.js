/**
 * @file src/modules/notifications/notification.model.js
 * @description Mongoose model for system Notifications.
 */

import mongoose from "mongoose";
import { tenantPlugin } from "../../utils/tenantPlugin.js";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // For backwards compatibility with existing UI/scripts
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  },
);

// Enforce multi-tenancy
notificationSchema.plugin(tenantPlugin);

// Compound index for fast queries by user and read state
notificationSchema.index({ companyId: 1, userId: 1, isRead: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
