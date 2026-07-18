/**
 * @file src/modules/documents/documents.controller.js
 * @description Controllers for Documents module.
 */

import service from './documents.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { runWithTenant } from '../../utils/tenantContext.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query, req.user);
  return successResponse(res, data, 'Records fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id, req.user);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.createRecord(req.body, req.user);
  return successResponse(res, data, 'Record created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.updateRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Record updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const data = await service.deleteRecord(req.params.id, req.user);
  return successResponse(res, data, 'Record deleted successfully');
});

export const restore = asyncHandler(async (req, res) => {
  const data = await service.restoreRecord(req.params.id, req.user);
  return successResponse(res, data, 'Record restored successfully');
});

export const archive = asyncHandler(async (req, res) => {
  const data = await service.archiveRecord(req.params.id, req.user);
  return successResponse(res, data, 'Record archived successfully');
});

export const uploadVersion = asyncHandler(async (req, res) => {
  const data = await service.uploadVersion(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Version uploaded successfully', 201);
});

export const move = asyncHandler(async (req, res) => {
  const data = await service.moveRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Record moved successfully');
});

export const getFolderStructure = asyncHandler(async (req, res) => {
  const data = await service.getFolders(req.user);
  return successResponse(res, data, 'Folders structure fetched successfully');
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const data = await service.getAnalytics(req.user);
  return successResponse(res, data, 'Analytics fetched successfully');
});

export const getPublicData = asyncHandler(async (req, res) => {
  return successResponse(res, { status: 'mock_public_data' }, 'Public record fetched');
});

export const incrementDownloads = asyncHandler(async (req, res) => {
  const data = await service.incrementDownloads(req.params.id);
  return successResponse(res, data, 'Downloads count incremented successfully');
});

export const serveFile = asyncHandler(async (req, res) => {
  // Accept token from query param (for img/iframe src) OR Authorization header (for fetch)
  let token = req.query.token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  // Reverse XSS entity encoding applied by global middleware
  if (token && typeof token === 'string') {
    token = token
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'Authentication required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ status: 'fail', message: 'Invalid or expired token.' });
  }

  const companyId = decoded.companyId || 'COMP-DEFAULT';
  const docId = req.params.id;
  const isDownload = req.query.download === 'true';

  // Wrap DB calls in tenant context
  const document = await runWithTenant(companyId, () => service.findById(docId, decoded));

  if (!document || !document.fileUrl) {
    return res.status(404).json({ status: 'fail', message: 'File not found' });
  }

  let response;
  try {
    response = await fetch(document.fileUrl);
  } catch (err) {
    return res.status(502).json({ status: 'fail', message: 'Failed to reach file storage provider' });
  }

  if (!response.ok) {
    return res.status(502).json({ status: 'fail', message: 'File storage provider returned an error' });
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");

  if (isDownload) {
    const fileExt = document.type ? document.type.toLowerCase() : 'bin';
    const filename = document.name.endsWith(`.${fileExt}`) ? document.name : `${document.name}.${fileExt}`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    // Increment download count
    await runWithTenant(companyId, () => service.incrementDownloads(docId));
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return res.send(buffer);
});

export const exportReport = asyncHandler(async (req, res) => {
  const query = req.query || {};
  const format = query.format || 'csv';
  const currentUser = req.user;

  const data = await service.findAll(query, currentUser);
  const reportDate = new Date().toLocaleDateString();
  const filename = `Document_Report_${Date.now()}`;

  if (format === 'csv' || format === 'excel') {
    const sep = format === 'csv' ? ',' : '\t';
    const headerRow = ['ID', 'Name', 'Scope', 'Project', 'Department', 'Category', 'Visibility', 'Type', 'Size', 'Version', 'Status', 'Uploaded By', 'Upload Date', 'Downloads'];
    const rows = [headerRow.join(sep)];

    data.forEach(d => {
      rows.push([
        d.id,
        `"${d.name}"`,
        d.documentScope,
        `"${d.projectName || ''}"`,
        `"${d.departmentName || ''}"`,
        `"${d.category}"`,
        `"${d.visibility}"`,
        d.type,
        d.size,
        d.version,
        d.status,
        `"${d.uploadedBy}"`,
        d.uploadDate,
        d.downloads || 0
      ].join(sep));
    });

    const content = rows.join('\n');
    const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
    const fileExt = format === 'csv' ? 'csv' : 'xls';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExt}"`);
    return res.send(content);
  } else if (format === 'pdf') {
    const rowsHtml = data.map(d => `
      <tr>
        <td style="padding:6px;border:1px solid #334155;">${d.id}</td>
        <td style="padding:6px;border:1px solid #334155;font-weight:600;">${d.name}</td>
        <td style="padding:6px;border:1px solid #334155;">${d.documentScope}</td>
        <td style="padding:6px;border:1px solid #334155;">${d.projectName || d.departmentName || '—'}</td>
        <td style="padding:6px;border:1px solid #334155;">${d.category}</td>
        <td style="padding:6px;border:1px solid #334155;text-align:center;">${d.version}</td>
        <td style="padding:6px;border:1px solid #334155;text-align:center;">${d.size}</td>
        <td style="padding:6px;border:1px solid #334155;">${d.uploadedBy}</td>
        <td style="padding:6px;border:1px solid #334155;text-align:center;">${d.uploadDate}</td>
      </tr>
    `).join('');

    const html = `
      <html>
      <head>
        <title>Document Management Report</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #1e293b; color: #f1f5f9; padding: 8px; border: 1px solid #334155; text-align: left; }
          td { border: 1px solid #334155; padding: 6px; color: #e2e8f0; font-size: 13px; }
          h1 { color: #db2777; }
        </style>
      </head>
      <body>
        <h1>Document Management System Report</h1>
        <p>Report Date: ${reportDate} | Generated By: ${currentUser.name}</p>
        <hr style="border-color: #334155; margin-bottom: 24px;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Scope</th>
              <th>Location</th>
              <th>Category</th>
              <th>Ver</th>
              <th>Size</th>
              <th>Uploaded By</th>
              <th>Upload Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  return res.status(400).json({ status: 'fail', message: 'Unsupported format' });
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  restore,
  archive,
  uploadVersion,
  move,
  getFolderStructure,
  getAnalytics,
  getPublicData,
  incrementDownloads,
  serveFile,
  exportReport
};
