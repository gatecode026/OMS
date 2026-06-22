/**
 * @file src/jobs/imagekitCleanup.job.js
 * @description Background cron job to clean up orphaned and soft-deleted files from ImageKit.
 */

import Company from '../modules/companies/company.model.js';
import Message from '../modules/chat/message.model.js';
import Conversation from '../modules/chat/conversation.model.js';
import ImageKitCleanupLog from '../modules/chat/cleanupLog.model.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { deleteFileFromImageKitById, deleteFromImageKit } from '../utils/imagekit.js';
import logger from '../config/logger.js';

/**
 * Sweeps and cleans up orphaned files and soft-deleted files from ImageKit,
 * and purges soft-deleted message records from MongoDB.
 * @returns {Promise<Object>} Summary of the cleanup run
 */
export const cleanImageKitFiles = async () => {
  logger.info('[ImageKit Cleanup] Starting daily sweep job...');
  const runDate = new Date();
  
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || privateKey.includes('***')) {
    logger.warn('[ImageKit Cleanup] IMAGEKIT_PRIVATE_KEY is not defined. Skipping cleanup.');
    return { status: 'failed', error: 'IMAGEKIT_PRIVATE_KEY not defined' };
  }

  const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
  const companyStats = new Map(); // companyId -> stats object

  try {
    // 1. Fetch all companies
    const companies = await Company.find({ status: 'Active' }).lean();
    logger.info(`[ImageKit Cleanup] Found ${companies.length} active companies.`);

    // Initialize stats for each company
    for (const company of companies) {
      companyStats.set(company.id, {
        companyId: company.id,
        filesAnalyzed: 0,
        orphanFilesFound: 0,
        filesDeleted: 0,
        spaceReclaimed: 0,
        status: 'success',
        error: null
      });
    }

    // 2. Collect references from all companies
    const activeFileIds = new Set();
    const activeUrls = new Set();
    const softDeletedFiles = new Map(); // fileId/url -> { messageId, companyId, size }

    for (const company of companies) {
      const companyId = company.id;

      await runWithTenant(companyId, async () => {
        // Fetch active messages with attachments
        const activeMessages = await Message.find({
          companyId,
          isDeleted: false,
          'media.url': { $ne: null }
        }).lean();

        for (const msg of activeMessages) {
          if (msg.media.imageKitFileId) {
            activeFileIds.add(msg.media.imageKitFileId);
          }
          if (msg.media.url) {
            activeUrls.add(msg.media.url);
          }
        }

        // Fetch active group avatars
        const activeConversations = await Conversation.find({
          companyId,
          avatar: { $ne: null }
        }).lean();

        for (const conv of activeConversations) {
          if (conv.avatarImageKitFileId) {
            activeFileIds.add(conv.avatarImageKitFileId);
          }
          if (conv.avatar) {
            activeUrls.add(conv.avatar);
          }
        }

        // Fetch soft-deleted messages with attachments
        const deletedMessages = await Message.find({
          companyId,
          isDeleted: true,
          'media.imageKitFileId': { $ne: null }
        }).lean();

        for (const msg of deletedMessages) {
          const fileKey = msg.media.imageKitFileId;
          softDeletedFiles.set(fileKey, {
            messageId: msg.id,
            companyId,
            fileId: msg.media.imageKitFileId,
            url: msg.media.url,
            size: msg.media.fileSize || 0
          });
        }
      });
    }

    logger.info(`[ImageKit Cleanup] Scanned all DBs. Active references: ${activeFileIds.size} fileIds, ${activeUrls.size} URLs.`);
    logger.info(`[ImageKit Cleanup] Soft-deleted message attachments awaiting cleanup: ${softDeletedFiles.size}.`);

    // 3. Fetch all files from ImageKit
    let imageKitFiles = [];
    let skip = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      logger.info(`[ImageKit Cleanup] Fetching files from ImageKit (skip: ${skip}, limit: ${limit})...`);
      const response = await fetch(`https://api.imagekit.io/v1/files?limit=${limit}&skip=${skip}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list ImageKit files: ${response.status} ${errorText}`);
      }

      const batch = await response.json();
      imageKitFiles = imageKitFiles.concat(batch);

      if (batch.length < limit) {
        hasMore = false;
      } else {
        skip += limit;
      }
    }

    logger.info(`[ImageKit Cleanup] Retrieved ${imageKitFiles.length} total files from ImageKit.`);

    // 4. Identify orphans and soft-deleted files to delete
    const filesToDelete = []; // Array of { fileId, url, companyId, type: 'orphan' | 'soft_deleted', messageId, size }

    for (const file of imageKitFiles) {
      const { fileId, url, size } = file;

      // Increment analyzed count for all active companies (since we scan all files)
      for (const stats of companyStats.values()) {
        stats.filesAnalyzed++;
      }

      // Check if file is active
      const isActive = activeFileIds.has(fileId) || activeUrls.has(url);
      if (isActive) {
        continue; // Keep the active file
      }

      // Check if it belongs to a soft-deleted message
      const softDeletedInfo = softDeletedFiles.get(fileId) || softDeletedFiles.get(url);
      if (softDeletedInfo) {
        filesToDelete.push({
          fileId,
          url,
          companyId: softDeletedInfo.companyId,
          type: 'soft_deleted',
          messageId: softDeletedInfo.messageId,
          size
        });
      } else {
        // It's a true orphan! We don't know the exact company it belongs to, 
        // but we can map it to a default or distribute it. Let's record it under the first active company
        // or a global null company, or attribute it globally. Let's attribute it to the first company.
        const defaultCompanyId = companies[0]?.id || 'global';
        filesToDelete.push({
          fileId,
          url,
          companyId: defaultCompanyId,
          type: 'orphan',
          size
        });
      }
    }

    logger.info(`[ImageKit Cleanup] Identified ${filesToDelete.length} files to delete (${filesToDelete.filter(f => f.type === 'orphan').length} orphans, ${filesToDelete.filter(f => f.type === 'soft_deleted').length} soft-deleted).`);

    // 5. Delete files and update MongoDB records (batches of 10)
    const BATCH_SIZE = 10;
    for (let i = 0; i < filesToDelete.length; i += BATCH_SIZE) {
      const batch = filesToDelete.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (item) => {
        try {
          // Delete from ImageKit
          const success = await deleteFileFromImageKitById(item.fileId);
          if (success) {
            // Update stats
            const stats = companyStats.get(item.companyId);
            if (stats) {
              stats.filesDeleted++;
              stats.spaceReclaimed += item.size;
              if (item.type === 'orphan') {
                stats.orphanFilesFound++;
              }
            }

            // If it was a soft-deleted message, purge the MongoDB message record
            if (item.type === 'soft_deleted' && item.messageId) {
              await runWithTenant(item.companyId, async () => {
                await Message.deleteOne({ id: item.messageId });
                logger.info(`[ImageKit Cleanup] Purged soft-deleted message record: ${item.messageId}`);
              });
            }
          }
        } catch (deleteErr) {
          logger.error(`[ImageKit Cleanup] Failed to process deletion for fileId ${item.fileId}:`, deleteErr);
        }
      }));
    }

    // 6. Write logs to database
    for (const stats of companyStats.values()) {
      await runWithTenant(stats.companyId, async () => {
        await ImageKitCleanupLog.create({
          companyId: stats.companyId,
          runDate,
          filesAnalyzed: stats.filesAnalyzed,
          orphanFilesFound: stats.orphanFilesFound,
          filesDeleted: stats.filesDeleted,
          spaceReclaimed: stats.spaceReclaimed,
          status: 'success'
        });
      });
      logger.info(`[ImageKit Cleanup] Saved cleanup log for company ${stats.companyId}: deleted ${stats.filesDeleted} files, reclaimed ${stats.spaceReclaimed} bytes.`);
    }

    return {
      status: 'success',
      companiesProcessed: companies.length,
      totalFilesDeleted: filesToDelete.length,
      runDate
    };

  } catch (err) {
    logger.error('[ImageKit Cleanup] Job failed with error:', err);
    
    // Log failure for all companies
    for (const stats of companyStats.values()) {
      try {
        await runWithTenant(stats.companyId, async () => {
          await ImageKitCleanupLog.create({
            companyId: stats.companyId,
            runDate,
            status: 'failed',
            error: err.message || 'Unknown error'
          });
        });
      } catch (logErr) {
        logger.error(`[ImageKit Cleanup] Failed to write failure log for company ${stats.companyId}:`, logErr);
      }
    }

    return { status: 'failed', error: err.message };
  }
};

/**
 * Initializes and schedules the background Daily ImageKit Cleanup Job.
 */
export const startImageKitCleanupJob = () => {
  logger.info('Initializing daily ImageKit Cleanup background job...');
  
  // Run sweep once on server startup after a 30-second grace period
  setTimeout(() => {
    cleanImageKitFiles().catch((err) => {
      logger.error('Error in initial run of cleanImageKitFiles:', err);
    });
  }, 30000);

  // Then schedule to run every 24 hours (86400000 ms)
  setInterval(async () => {
    try {
      await cleanImageKitFiles();
    } catch (err) {
      logger.error('Error running daily cleanImageKitFiles cycle:', err);
    }
  }, 86400000);
};

export default {
  cleanImageKitFiles,
  startImageKitCleanupJob
};
