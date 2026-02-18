export interface ParticipantEntry {
  screenName: string;
  role: string;
  lastSeen: number;
  source: 'heartbeat' | 'webhook' | 'sdk-sync';
}

// In-memory store for participant lists (keyed by meeting ID, then participant UUID)
// In production, consider using Redis for multi-instance deployments
export const meetingParticipants: Map<string, Map<string, ParticipantEntry>> = new Map();

export function getOrCreateMeeting(meetingId: string): Map<string, ParticipantEntry> {
  let meeting = meetingParticipants.get(meetingId);
  if (!meeting) {
    meeting = new Map();
    meetingParticipants.set(meetingId, meeting);
  }
  return meeting;
}

// Clean up old entries every 5 minutes
// Webhook entries get a 2-hour TTL; heartbeat/sdk entries get 1-hour TTL
setInterval(() => {
  const now = Date.now();
  const WEBHOOK_TTL = 2 * 60 * 60 * 1000; // 2 hours
  const DEFAULT_TTL = 60 * 60 * 1000;      // 1 hour

  for (const [meetingId, participants] of meetingParticipants.entries()) {
    for (const [uuid, entry] of participants.entries()) {
      const ttl = entry.source === 'webhook' ? WEBHOOK_TTL : DEFAULT_TTL;
      if (now - entry.lastSeen > ttl) {
        participants.delete(uuid);
      }
    }
    if (participants.size === 0) {
      meetingParticipants.delete(meetingId);
    }
  }
}, 5 * 60 * 1000);
