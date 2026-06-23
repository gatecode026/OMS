/**
 * @file src/modules/chat/controllers/searchController.js
 * @description Controller for global search in chat.
 */

import * as searchService from '../services/searchService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { successResponse } from '../../../utils/response.js';

// GET /api/v1/chat/search?q=query&page=1&limit=10&category=all
export const globalSearch = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10, category = 'all' } = req.query;
  const { id: userId } = req.user;

  if (!q || !q.trim()) {
    return successResponse(res, {
      conversations: [],
      messages: [],
      files: [],
      contacts: []
    }, 'Query is empty');
  }

  const results = await searchService.performGlobalSearch({
    query: q.trim(),
    category,
    userId,
    page: parseInt(page),
    limit: parseInt(limit)
  });

  return successResponse(res, results, 'Search results retrieved successfully');
});
