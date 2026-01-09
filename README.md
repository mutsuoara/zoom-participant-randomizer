# Zoom Participant Randomizer

A Zoom App that allows hosts and co-hosts to randomize meeting participants to determine speaking order.

## Features

- Real-time participant list display
- One-click randomization using Fisher-Yates shuffle
- Results broadcast to all app users in the meeting
- Copy-to-clipboard for easy sharing
- Role-based access (only host/co-host can trigger randomization)

## Prerequisites

- Node.js 18+
- npm or yarn
- Zoom Developer Account with a Zoom App created
- ngrok (for local development)

## Setup

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure Environment

Edit `.env` file with your Zoom App credentials:

```env
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

### 3. Set Up ngrok (for local development)

Zoom Apps require HTTPS. Use ngrok to create a tunnel:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 4. Configure Zoom App

In your Zoom App settings at [marketplace.zoom.us](https://marketplace.zoom.us):

1. **Home URL**: Your ngrok URL (e.g., `https://abc123.ngrok.io`)
2. **Redirect URL**: `https://abc123.ngrok.io/api/auth/callback`
3. **Add Scopes**: Select required permissions

### 5. Update .env with ngrok URLs

```env
ZOOM_REDIRECT_URL=https://abc123.ngrok.io/api/auth/callback
ZOOM_HOME_URL=https://abc123.ngrok.io
FRONTEND_URL=https://abc123.ngrok.io
```

### 6. Start Development Servers

```bash
npm run dev
```

This starts both frontend (port 3000) and backend (port 3001).

## Testing in Zoom

1. Open Zoom Desktop Client
2. Start or join a meeting
3. Click "Apps" in the meeting toolbar
4. Find and open "Participant Randomizer"
5. If you're the host/co-host, you'll see the participant list and randomize button

## Project Structure

```
zoom-participant-randomizer/
├── frontend/          # React app with Zoom SDK
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Zoom SDK hooks
│   │   └── utils/       # Helper functions
│   └── ...
├── backend/           # Express server for OAuth
│   └── src/
│       ├── routes/    # API routes
│       └── index.ts   # Server entry
├── agent-docs/        # Build documentation
└── .env              # Environment variables
```

## How It Works

1. **Initialization**: App initializes Zoom SDK with required capabilities
2. **Role Check**: `getUserContext()` determines if user is host/co-host
3. **Participant Fetch**: Host/co-host can view participant list via `getMeetingParticipants()`
4. **Randomization**: Fisher-Yates shuffle algorithm randomizes the order
5. **Broadcasting**: Results sent to all app instances via `sendMessage()`
6. **Display**: All users see the randomized order in real-time

## Deployment

### Option 1: Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Option 2: Docker

```bash
docker build -t zoom-randomizer .
docker run -p 3001:3001 zoom-randomizer
```

### Post-Deployment

1. Update Zoom App URLs to production domain
2. Set `NODE_ENV=production` in environment
3. Install app in your Zoom organization

## Troubleshooting

### "Failed to initialize Zoom SDK"
- Make sure you're running the app inside Zoom, not in a regular browser

### "No permission for this API"
- `getMeetingParticipants()` only works for host/co-host

### OAuth errors
- Verify your Client ID and Secret are correct
- Check that redirect URL matches exactly in Zoom App settings

## License

MIT
