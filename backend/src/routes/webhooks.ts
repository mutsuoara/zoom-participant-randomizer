import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getOrCreateMeeting, meetingParticipants } from '../storage/participants.js';
import { toUrlSafeId } from '../utils/meetingId.js';

const router = Router();

function getWebhookSecret(): string {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    throw new Error('ZOOM_WEBHOOK_SECRET_TOKEN environment variable is not set');
  }
  return secret;
}

// Verify Zoom webhook signature
function verifySignature(req: Request): boolean {
  const signature = req.headers['x-zm-signature'] as string | undefined;
  const timestamp = req.headers['x-zm-request-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    return false;
  }

  const secret = getWebhookSecret();
  const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const expectedSignature = `v0=${hash}`;

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

// POST /api/webhooks/zoom
router.post('/zoom', (req: Request, res: Response) => {
  const { event, payload } = req.body;

  // Handle Zoom endpoint URL validation challenge
  if (event === 'endpoint.url_validation') {
    const plainToken = payload?.plainToken;
    if (!plainToken) {
      res.status(400).json({ error: 'Missing plainToken' });
      return;
    }

    const secret = getWebhookSecret();
    const encryptedToken = crypto
      .createHmac('sha256', secret)
      .update(plainToken)
      .digest('hex');

    res.json({ plainToken, encryptedToken });
    return;
  }

  // All other events require signature verification
  if (!verifySignature(req)) {
    console.warn('[Webhook] Invalid signature — rejecting request');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const meetingUuid = payload?.object?.uuid;
  if (!meetingUuid) {
    res.status(400).json({ error: 'Missing meeting UUID' });
    return;
  }

  const meetingId = toUrlSafeId(meetingUuid);

  if (event === 'meeting.participant_joined') {
    const participant = payload?.object?.participant;
    if (!participant) {
      res.status(400).json({ error: 'Missing participant data' });
      return;
    }

    const participantId = participant.participant_uuid || participant.id || participant.user_id;
    const screenName = participant.user_name || participant.participant_user_name || 'Unknown';

    const meeting = getOrCreateMeeting(meetingId);
    const existing = meeting.get(participantId);

    // Don't overwrite heartbeat-sourced entries (they have fresher timing data)
    if (!existing || existing.source !== 'heartbeat') {
      meeting.set(participantId, {
        screenName,
        role: participant.role || 'attendee',
        lastSeen: Date.now(),
        source: 'webhook',
      });
    }

    console.log(`[Webhook] ${screenName} joined meeting ${meetingId} (${meeting.size} total)`);
    res.json({ success: true });
    return;
  }

  if (event === 'meeting.participant_left') {
    const participant = payload?.object?.participant;
    if (!participant) {
      res.status(400).json({ error: 'Missing participant data' });
      return;
    }

    const participantId = participant.participant_uuid || participant.id || participant.user_id;
    const screenName = participant.user_name || participant.participant_user_name || 'Unknown';

    const meeting = meetingParticipants.get(meetingId);
    if (meeting) {
      // Authoritative removal regardless of source
      meeting.delete(participantId);
      console.log(`[Webhook] ${screenName} left meeting ${meetingId} (${meeting.size} remaining)`);
    }

    res.json({ success: true });
    return;
  }

  // Unhandled event type
  console.log(`[Webhook] Unhandled event: ${event}`);
  res.json({ success: true });
});

export default router;
