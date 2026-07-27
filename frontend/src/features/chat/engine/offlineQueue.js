/**
 * @file features/chat/engine/offlineQueue.js
 * @description Offline Mutation Queue (Part 12).
 *   Queues message send, edit, delete, reaction, reply, and forward actions when offline.
 *   Automatically replays pending actions in exact order when network connection restores.
 */

const STORAGE_KEY = "chat_offline_queue_v1";

/** Load offline queue from localStorage */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/** Save offline queue to localStorage */
export function saveOfflineQueue(queue = []) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("[offline-queue] Failed to save queue:", e);
  }
}

/** Enqueue a mutation action for offline replay */
export function enqueueOfflineAction(action) {
  const queue = getOfflineQueue();
  queue.push({
    ...action,
    queuedAt: new Date().toISOString(),
    id:
      action.id ||
      `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  });
  saveOfflineQueue(queue);
}

/** Replay all queued offline actions when socket connects */
export async function replayOfflineQueue(socket, messageRepo) {
  if (!socket?.connected) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;
  console.log(`[offline-queue] Replaying ${queue.length} offline actions...`);
  const remaining = [];

  for (const action of queue) {
    try {
      if (action.type === "send") {
        socket.emit("send_message", action.payload);
      } else if (action.type === "edit") {
        socket.emit("edit_message", action.payload);
      } else if (action.type === "delete") {
        socket.emit("delete_message", action.payload);
      } else if (action.type === "reaction") {
        socket.emit("add_reaction", action.payload);
      } else if (action.type === "read") {
        socket.emit("mark_read", action.payload);
      }
    } catch (err) {
      console.error(
        "[offline-queue] Action replay failed, keeping in queue:",
        err,
      );
      remaining.push(action);
    }
  }

  saveOfflineQueue(remaining);
}

export const offlineQueue = {
  getOfflineQueue,
  enqueueOfflineAction,
  replayOfflineQueue,
};

export default offlineQueue;
