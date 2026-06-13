/**
 * @file src/modules/events/event.model.js
 * @description Mongoose schema definition for Events / Meetings module.
 */

import mongoose from 'mongoose';
import Employee from '../employees/employees.model.js';

const EVENT_TYPES = ["meeting", "reminder", "audit", "review", "one-on-one"];

// Try to register 'User' alias pointing to the same employees collection to maintain compatibility
let User;
try {
  User = mongoose.model('User');
} catch (e) {
  User = mongoose.model('User', Employee.schema);
}

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: EVENT_TYPES, required: true, default: "meeting" },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true }, // "YYYY-MM-DD"
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },  // "HH:mm"
    endTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/, default: null },
    location: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String, default: "#38bdf8" },
    reminded10: { type: Boolean, default: false },
    reminded5: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "confirmed", "declined"], default: "confirmed" }
  },
  { timestamps: true, collection: 'events' } // createdAt, updatedAt
);

// Indexes for high-performance calendar and attendee queries
eventSchema.index({ date: 1, startTime: 1 });
eventSchema.index({ attendees: 1, date: 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
export { EVENT_TYPES };
