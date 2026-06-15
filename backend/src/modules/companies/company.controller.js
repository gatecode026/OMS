import service from './company.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const data = await service.createCompany(req.body);
  return successResponse(res, data, 'Company registered successfully with default admin user', 201);
});

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Companies fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  // Security check: Company Admin can only fetch their own company details
  if (req.user.roleId === 'company_admin' && req.params.id !== req.user.companyId) {
    return res.status(403).json({ status: 'fail', message: 'Unauthorized to view this company profile' });
  }
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Company fetched successfully');
});

export const update = asyncHandler(async (req, res) => {
  // Security check: Company Admin can only update their own company profile
  if (req.user.roleId === 'company_admin' && req.params.id !== req.user.companyId) {
    return res.status(403).json({ status: 'fail', message: 'Unauthorized to update this company profile' });
  }
  const data = await service.updateCompany(req.params.id, req.body);
  return successResponse(res, data, 'Company profile updated successfully');
});

export const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const data = await service.setStatus(req.params.id, status);
  return successResponse(res, data, `Company status updated to ${status} successfully`);
});

export default {
  create,
  getAll,
  getById,
  update,
  setStatus
};
