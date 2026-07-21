import express from 'express';
import { getBranding, updateBranding } from './branding.controller.js';

const router = express.Router();

router.route('/')
  .get(getBranding)
  .put(updateBranding);

export default router;
