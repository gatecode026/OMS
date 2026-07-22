import express from 'express';
import callingController from './calling.controller.js';
import callingPolicyController from './calling.policy.controller.js';
import webhookService from './webhook.service.js';
import recordingService from './recording.service.js';
import telephonyService from './telephony.service.js';
import federationService from './federation.service.js';
import agentService from './agent.service.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// User Calls API
router.get('/history', callingController.getHistory);
router.post('/end', callingController.endCall);

// Tenant Administration & Policy Control APIs
router.get('/admin/policies', callingPolicyController.getPolicies);
router.post('/admin/policies', callingPolicyController.updatePolicies);
router.patch('/admin/feature-flags', callingPolicyController.toggleFeatureFlag);

// Webhook Subscription & Integration APIs
router.get('/webhooks', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const webhooks = await webhookService.getWebhooks(companyId);
    return res.json({ status: 'success', data: webhooks });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch webhooks' });
  }
});

router.post('/webhooks', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { targetUrl, events } = req.body;

    if (!targetUrl || !events) {
      return res.status(400).json({ status: 'fail', message: 'targetUrl and events are required' });
    }

    const subscription = await webhookService.registerWebhook(companyId, { targetUrl, events });
    return res.json({ status: 'success', data: subscription });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to register webhook' });
  }
});

// Media Recording & Asset Management APIs
router.get('/recordings', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const recordings = await recordingService.getRecordings(companyId);
    return res.json({ status: 'success', data: recordings });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch recordings' });
  }
});

router.post('/recordings/start', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { meetingId, recordingType } = req.body;

    if (!meetingId) {
      return res.status(400).json({ status: 'fail', message: 'meetingId is required' });
    }

    const recording = await recordingService.startRecording(companyId, {
      meetingId,
      callerId: req.user.id,
      callerName: req.user.name,
      recordingType: recordingType || 'video'
    });

    return res.json({ status: 'success', data: recording });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to start recording' });
  }
});

router.post('/recordings/stop', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { recordingId, durationSeconds, fileSizeBytes } = req.body;

    if (!recordingId) {
      return res.status(400).json({ status: 'fail', message: 'recordingId is required' });
    }

    const recording = await recordingService.stopRecording(companyId, recordingId, {
      durationSeconds,
      fileSizeBytes
    });

    return res.json({ status: 'success', data: recording });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to stop recording' });
  }
});

router.get('/recordings/:id/signed-url', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { id } = req.params;

    const signedData = await recordingService.generateSignedUrl(companyId, id);
    return res.json({ status: 'success', data: signedData });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to generate signed URL' });
  }
});

// Telephony, IVR & Contact Center APIs
router.get('/telephony/queues', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const queues = await telephonyService.getQueues(companyId);
    return res.json({ status: 'success', data: queues });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch telephony queues' });
  }
});

router.post('/telephony/queues', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const queue = await telephonyService.createQueue(companyId, req.body);
    return res.json({ status: 'success', data: queue });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to create queue' });
  }
});

router.get('/telephony/ivr', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const ivrs = await telephonyService.getIvrTrees(companyId);
    return res.json({ status: 'success', data: ivrs });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch IVR trees' });
  }
});

router.post('/telephony/ivr', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const ivr = await telephonyService.createIvrTree(companyId, req.body);
    return res.json({ status: 'success', data: ivr });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to create IVR tree' });
  }
});

router.post('/telephony/dial', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { queueId, callerNumber } = req.body;

    if (!queueId) {
      return res.status(400).json({ status: 'fail', message: 'queueId is required' });
    }

    const result = await telephonyService.dispatchCall(companyId, queueId, { callerNumber });
    return res.json({ status: 'success', data: result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to dispatch telephony call' });
  }
});

// UCaaS Global Federation & Trust Management APIs
router.get('/federation/trusts', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const trusts = await federationService.getActiveTrusts(companyId);
    return res.json({ status: 'success', data: trusts });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch federation trusts' });
  }
});

router.post('/federation/trust-requests', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { targetCompanyId, targetDomain } = req.body;

    if (!targetCompanyId || !targetDomain) {
      return res.status(400).json({ status: 'fail', message: 'targetCompanyId and targetDomain are required' });
    }

    const trust = await federationService.createTrustRequest(companyId, { targetCompanyId, targetDomain });
    return res.json({ status: 'success', data: trust });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to submit trust request' });
  }
});

router.post('/federation/trust-requests/:id/approve', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { id } = req.params;

    const approved = await federationService.approveTrustRequest(companyId, id);
    return res.json({ status: 'success', data: approved });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to approve trust request' });
  }
});

router.post('/federation/invitations', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { meetingId, invitedEmail } = req.body;

    if (!meetingId || !invitedEmail) {
      return res.status(400).json({ status: 'fail', message: 'meetingId and invitedEmail are required' });
    }

    const invitation = await federationService.createInvitation(companyId, { meetingId, invitedEmail });
    return res.json({ status: 'success', data: invitation });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to create cross-tenant invitation' });
  }
});

// Enterprise AI Agents & MCP Integration APIs
router.get('/mcp/tools', (req, res) => {
  const tools = agentService.getMcpTools();
  return res.json({ status: 'success', data: tools });
});

router.get('/agents', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const agents = await agentService.getAgents(companyId);
    return res.json({ status: 'success', data: agents });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch enterprise agents' });
  }
});

router.post('/agents/execute', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
    const { agentId, query } = req.body;

    if (!agentId || !query) {
      return res.status(400).json({ status: 'fail', message: 'agentId and query are required' });
    }

    const result = await agentService.executeAgent(companyId, agentId, query, req.user.id);
    return res.json({ status: 'success', data: result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to execute agent' });
  }
});

export default router;
