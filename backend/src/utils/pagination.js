/**
 * @file src/utils/pagination.js
 * @description Page-limiting request helper for high-volume datasets.
 */

export const getPaginationData = (query) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const formatPaginatedResponse = (data, count, page, limit) => {
  return {
    results: data,
    pagination: {
      totalItems: count,
      itemsPerPage: limit,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      hasNextPage: page * limit < count,
      hasPrevPage: page > 1,
    }
  };
};

export default {
  getPaginationData,
  formatPaginatedResponse,
};
