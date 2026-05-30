/**
 * @file src/utils/asyncHandler.js
 * @description Standard express asynchronous controller wrapper. Avoids repetitive try-catch blocks.
 */

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
