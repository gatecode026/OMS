/**
 * @file src/utils/response.js
 * @description Standardized API JSON payload response handlers.
 */

export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

export const failResponse = (res, errors = null, message = 'Failure', statusCode = 400) => {
  return res.status(statusCode).json({
    status: 'fail',
    message,
    errors,
  });
};

export const errorResponse = (res, message = 'Internal Server Error', statusCode = 500) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
  });
};

export default {
  success: successResponse,
  fail: failResponse,
  error: errorResponse,
};
