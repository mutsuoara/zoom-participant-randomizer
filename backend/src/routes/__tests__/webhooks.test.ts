import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'crypto';
import webhookRouter from '../webhooks.js';
import { meetingParticipants, getOrCreateMeeting } from '../../storage/participants.js';
import { toUrlSafeId } from '../../utils/meetingId.js';

const TEST_SECRET = 'test-webhook-secret-token';

// Set env before importing router (it reads at call time)
vi.stubEnv('ZOOM_WEBHOOK_SECRET_TOKEN', TEST_SECRET);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', webhookRouter);
  return app;
}

function signPayload(body: object, timestamp: string): string {
  const message = `v0:${timestamp}:${JSON.stringify(body)}`;
  const hash = crypto.createHmac('sha256', TEST_SECRET).update(message).digest('hex');
  return `v0=${hash}`;
}

describe('POST /api/webhooks/zoom', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    meetingParticipants.clear();
  });

  describe('endpoint.url_validation', () => {
    it('returns correct HMAC for challenge token', async () => {
      const plainToken = 'test-challenge-token';
      const expectedEncrypted = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(plainToken)
        .digest('hex');

      const res = await request(app)
        .post('/api/webhooks/zoom')
        .send({
          event: 'endpoint.url_validation',
          payload: { plainToken },
        });

      expect(res.status).toBe(200);
      expect(res.body.plainToken).toBe(plainToken);
      expect(res.body.encryptedToken).toBe(expectedEncrypted);
    });
  });

  describe('meeting.participant_joined', () => {
    it('adds participant to storage with source webhook', async () => {
      const meetingUuid = 'abc+def/ghi==';
      const body = {
        event: 'meeting.participant_joined',
        payload: {
          object: {
            uuid: meetingUuid,
            participant: {
              participant_uuid: 'user-1',
              user_name: 'Alice',
              role: 'attendee',
            },
          },
        },
      };

      const timestamp = String(Date.now());
      const signature = signPayload(body, timestamp);

      const res = await request(app)
        .post('/api/webhooks/zoom')
        .set('x-zm-signature', signature)
        .set('x-zm-request-timestamp', timestamp)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const safeId = toUrlSafeId(meetingUuid);
      const meeting = meetingParticipants.get(safeId);
      expect(meeting).toBeDefined();
      expect(meeting!.get('user-1')).toMatchObject({
        screenName: 'Alice',
        role: 'attendee',
        source: 'webhook',
      });
    });

    it('does not overwrite heartbeat-sourced entries', async () => {
      const meetingUuid = 'test-meeting';
      const safeId = toUrlSafeId(meetingUuid);
      const meeting = getOrCreateMeeting(safeId);
      meeting.set('user-1', {
        screenName: 'Alice (heartbeat)',
        role: 'attendee',
        lastSeen: Date.now(),
        source: 'heartbeat',
      });

      const body = {
        event: 'meeting.participant_joined',
        payload: {
          object: {
            uuid: meetingUuid,
            participant: {
              participant_uuid: 'user-1',
              user_name: 'Alice (webhook)',
              role: 'attendee',
            },
          },
        },
      };

      const timestamp = String(Date.now());
      const signature = signPayload(body, timestamp);

      const res = await request(app)
        .post('/api/webhooks/zoom')
        .set('x-zm-signature', signature)
        .set('x-zm-request-timestamp', timestamp)
        .send(body);

      expect(res.status).toBe(200);
      // Should keep the heartbeat entry
      expect(meeting.get('user-1')!.screenName).toBe('Alice (heartbeat)');
      expect(meeting.get('user-1')!.source).toBe('heartbeat');
    });
  });

  describe('meeting.participant_left', () => {
    it('removes participant from storage', async () => {
      const meetingUuid = 'test-meeting';
      const safeId = toUrlSafeId(meetingUuid);
      const meeting = getOrCreateMeeting(safeId);
      meeting.set('user-1', {
        screenName: 'Alice',
        role: 'attendee',
        lastSeen: Date.now(),
        source: 'webhook',
      });

      const body = {
        event: 'meeting.participant_left',
        payload: {
          object: {
            uuid: meetingUuid,
            participant: {
              participant_uuid: 'user-1',
              user_name: 'Alice',
            },
          },
        },
      };

      const timestamp = String(Date.now());
      const signature = signPayload(body, timestamp);

      const res = await request(app)
        .post('/api/webhooks/zoom')
        .set('x-zm-signature', signature)
        .set('x-zm-request-timestamp', timestamp)
        .send(body);

      expect(res.status).toBe(200);
      expect(meeting.has('user-1')).toBe(false);
    });

    it('removes regardless of source (heartbeat entry)', async () => {
      const meetingUuid = 'test-meeting';
      const safeId = toUrlSafeId(meetingUuid);
      const meeting = getOrCreateMeeting(safeId);
      meeting.set('user-1', {
        screenName: 'Alice',
        role: 'attendee',
        lastSeen: Date.now(),
        source: 'heartbeat',
      });

      const body = {
        event: 'meeting.participant_left',
        payload: {
          object: {
            uuid: meetingUuid,
            participant: {
              participant_uuid: 'user-1',
              user_name: 'Alice',
            },
          },
        },
      };

      const timestamp = String(Date.now());
      const signature = signPayload(body, timestamp);

      await request(app)
        .post('/api/webhooks/zoom')
        .set('x-zm-signature', signature)
        .set('x-zm-request-timestamp', timestamp)
        .send(body);

      expect(meeting.has('user-1')).toBe(false);
    });
  });

  describe('signature verification', () => {
    it('rejects requests with invalid signature', async () => {
      const body = {
        event: 'meeting.participant_joined',
        payload: {
          object: {
            uuid: 'test-meeting',
            participant: {
              participant_uuid: 'user-1',
              user_name: 'Alice',
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/zoom')
        .set('x-zm-signature', 'v0=invalid-signature-here')
        .set('x-zm-request-timestamp', String(Date.now()))
        .send(body);

      expect(res.status).toBe(401);
    });

    it('rejects requests with missing signature headers', async () => {
      const body = {
        event: 'meeting.participant_joined',
        payload: {
          object: {
            uuid: 'test-meeting',
            participant: {
              participant_uuid: 'user-1',
              user_name: 'Alice',
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/zoom')
        .send(body);

      expect(res.status).toBe(401);
    });
  });
});
