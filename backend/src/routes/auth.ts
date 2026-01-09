import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// Use getters to read env vars at runtime (after dotenv loads)
const getClientId = () => process.env.ZOOM_CLIENT_ID || '';
const getClientSecret = () => process.env.ZOOM_CLIENT_SECRET || '';
const getRedirectUrl = () => process.env.ZOOM_REDIRECT_URL || 'http://localhost:3001/api/auth/callback';

// Extend session type
declare module 'express-session' {
  interface SessionData {
    state: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
  }
}

// Generate authorization URL
router.get('/authorize', (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.state = state;

  const authUrl = new URL('https://zoom.us/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', getClientId());
  authUrl.searchParams.set('redirect_uri', getRedirectUrl());
  authUrl.searchParams.set('state', state);

  res.json({ url: authUrl.toString() });
});

// OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // Verify state
  if (state !== req.session.state) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: getRedirectUrl(),
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store tokens in session
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.tokenExpiry = Date.now() + expires_in * 1000;

    // Redirect to frontend (use FRONTEND_URL for Zoom App context)
    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Zoom' });
  }
});

// Check auth status
router.get('/status', (req: Request, res: Response) => {
  const isAuthenticated = !!(
    req.session.accessToken &&
    req.session.tokenExpiry &&
    req.session.tokenExpiry > Date.now()
  );

  res.json({ authenticated: isAuthenticated });
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  if (!req.session.refreshToken) {
    return res.status(401).json({ error: 'No refresh token available' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: req.session.refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.tokenExpiry = Date.now() + expires_in * 1000;

    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

export default router;
