import { Router, Request, Response } from 'express';
import { meetingParticipants, getOrCreateMeeting } from '../storage/participants.js';

const router = Router();

const STALE_THRESHOLD = 15_000; // 15 seconds

// POST /api/participants/:meetingId/join - Self-registration + heartbeat
router.post('/:meetingId/join', (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const { participantUUID, screenName, role } = req.body;

  if (!meetingId || !participantUUID || !screenName) {
    res.status(400).json({ error: 'Invalid request: participantUUID and screenName required' });
    return;
  }

  const meeting = getOrCreateMeeting(meetingId);
  meeting.set(participantUUID, {
    screenName,
    role: role || 'attendee',
    lastSeen: Date.now(),
    source: 'heartbeat',
  });

  console.log(`[JOIN] ${screenName} (${role}) registered for meeting "${meetingId}" (${meeting.size} total)`);
  res.json({ success: true });
});

// POST /api/participants/:meetingId - Host bulk-syncs SDK participant list (upserts)
router.post('/:meetingId', (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const { participants } = req.body;

  if (!meetingId || !participants || !Array.isArray(participants)) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const meeting = getOrCreateMeeting(meetingId);
  const now = Date.now();

  for (const p of participants) {
    if (p.participantUUID) {
      const existing = meeting.get(p.participantUUID);
      // Upsert: update lastSeen and screenName/role, but don't overwrite
      // a self-registered user's more recent lastSeen
      meeting.set(p.participantUUID, {
        screenName: p.screenName || existing?.screenName || 'Unknown',
        role: p.role || existing?.role || 'attendee',
        lastSeen: Math.max(now, existing?.lastSeen ?? 0),
        source: existing?.source === 'webhook' ? 'webhook' : 'sdk-sync',
      });
    }
  }

  console.log(`[POST] Upserted ${participants.length} participants for meeting "${meetingId}" (${meeting.size} total)`);
  res.json({ success: true });
});

// GET /api/participants/:meetingId - Get active participant list
router.get('/:meetingId', (req: Request, res: Response) => {
  const { meetingId } = req.params;

  const meeting = meetingParticipants.get(meetingId);
  if (!meeting || meeting.size === 0) {
    console.log(`[GET] No data found for meeting "${meetingId}"`);
    res.json({ participants: [], updatedAt: null, webhookTracked: 0 });
    return;
  }

  const now = Date.now();
  const activeParticipants: Array<{ participantUUID: string; screenName: string; role: string }> = [];
  let webhookTracked = 0;

  for (const [uuid, entry] of meeting.entries()) {
    // Webhook-sourced entries are always active (removed only by participant_left event)
    // Heartbeat/sdk entries use the 15s stale threshold
    const isActive = entry.source === 'webhook' || (now - entry.lastSeen <= STALE_THRESHOLD);

    if (isActive) {
      activeParticipants.push({
        participantUUID: uuid,
        screenName: entry.screenName,
        role: entry.role,
      });
      if (entry.source === 'webhook') {
        webhookTracked++;
      }
    }
  }

  console.log(`[GET] Returning ${activeParticipants.length} active participants for meeting "${meetingId}" (${webhookTracked} webhook, ${meeting.size} total stored)`);
  res.json({ participants: activeParticipants, updatedAt: now, webhookTracked });
});

// DELETE /api/participants/:meetingId - Clean up when meeting ends
router.delete('/:meetingId', (req: Request, res: Response) => {
  const { meetingId } = req.params;
  meetingParticipants.delete(meetingId);
  res.json({ success: true });
});

export default router;
