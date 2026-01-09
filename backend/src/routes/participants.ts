import { Router, Request, Response } from 'express';

const router = Router();

// In-memory store for participant lists (keyed by meeting ID)
// In production, consider using Redis for multi-instance deployments
interface ParticipantData {
  participants: Array<{
    participantUUID: string;
    screenName: string;
    role: string;
  }>;
  updatedAt: number;
}

const meetingParticipants: Map<string, ParticipantData> = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  for (const [meetingId, data] of meetingParticipants.entries()) {
    if (now - data.updatedAt > maxAge) {
      meetingParticipants.delete(meetingId);
    }
  }
}, 5 * 60 * 1000);

// POST /api/participants/:meetingId - Host updates participant list
router.post('/:meetingId', (req: Request, res: Response) => {
  const { meetingId } = req.params;
  const { participants } = req.body;

  if (!meetingId || !participants || !Array.isArray(participants)) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  meetingParticipants.set(meetingId, {
    participants,
    updatedAt: Date.now(),
  });

  console.log(`Updated participants for meeting ${meetingId}: ${participants.length} participants`);
  res.json({ success: true });
});

// GET /api/participants/:meetingId - Get participant list for a meeting
router.get('/:meetingId', (req: Request, res: Response) => {
  const { meetingId } = req.params;

  const data = meetingParticipants.get(meetingId);
  if (!data) {
    res.json({ participants: [], updatedAt: null });
    return;
  }

  res.json(data);
});

// DELETE /api/participants/:meetingId - Clean up when meeting ends
router.delete('/:meetingId', (req: Request, res: Response) => {
  const { meetingId } = req.params;
  meetingParticipants.delete(meetingId);
  res.json({ success: true });
});

export default router;
