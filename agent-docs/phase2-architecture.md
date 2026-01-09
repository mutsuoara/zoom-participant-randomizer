# Phase 2: Architecture Design

**Project:** Zoom Participant Randomizer
**Approach:** Zoom Apps SDK (In-Client App)
**Date:** January 2026

---

## Overview

A Zoom App that runs inside the Zoom client, allowing hosts/co-hosts to randomize participants and display the order to everyone in the meeting.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZOOM CLIENT                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Zoom App Panel                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │           React Frontend (Embedded)                  │  │  │
│  │  │                                                      │  │  │
│  │  │   ┌──────────────┐    ┌──────────────────────────┐  │  │  │
│  │  │   │ Participant  │    │    Randomize Button      │  │  │  │
│  │  │   │    List      │    │    (Host/Co-Host only)   │  │  │  │
│  │  │   │              │    └──────────────────────────┘  │  │  │
│  │  │   │ 1. Alice     │                                  │  │  │
│  │  │   │ 2. Bob       │    ┌──────────────────────────┐  │  │  │
│  │  │   │ 3. Carol     │    │    Randomized Order      │  │  │  │
│  │  │   │ ...          │    │    1. Carol              │  │  │  │
│  │  │   └──────────────┘    │    2. Alice              │  │  │  │
│  │  │                       │    3. Bob                │  │  │  │
│  │  │                       └──────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           │ Zoom Apps SDK                │ OAuth
           ▼                              ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Zoom APIs         │         │   Backend Server    │
│   - getMeetingPart  │         │   (Node.js)         │
│   - getUserContext  │         │   - OAuth handling  │
│   - sendMessage     │         │   - Session mgmt    │
└─────────────────────┘         └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI components |
| **Styling** | Tailwind CSS | Rapid styling |
| **Zoom SDK** | @zoom/appssdk | Zoom client integration |
| **Backend** | Node.js + Express | OAuth, API proxy |
| **Build** | Vite | Fast development |

---

## Project Structure

```
zoom-participant-randomizer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParticipantList.tsx
│   │   │   ├── RandomizeButton.tsx
│   │   │   ├── RandomizedOrder.tsx
│   │   │   └── App.tsx
│   │   ├── hooks/
│   │   │   ├── useZoomSdk.ts
│   │   │   └── useParticipants.ts
│   │   ├── utils/
│   │   │   └── randomize.ts
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── health.ts
│   │   └── index.ts
│   └── package.json
├── .env
├── .gitignore
└── package.json
```

---

## Core Components

### 1. Zoom SDK Hook (`useZoomSdk.ts`)

```typescript
// Initializes SDK, fetches user context and participants
interface UseZoomSdk {
  isHost: boolean;
  participants: Participant[];
  sendResult: (result: string[]) => Promise<void>;
}
```

### 2. Participant List (`ParticipantList.tsx`)

- Displays current meeting participants
- Updates in real-time via `onParticipantChange`
- Shows participant name and role

### 3. Randomize Button (`RandomizeButton.tsx`)

- Only visible to host/co-host
- Triggers Fisher-Yates shuffle
- Sends result to all app instances

### 4. Randomized Order (`RandomizedOrder.tsx`)

- Displays numbered randomized list
- Copy-to-clipboard button
- History of previous randomizations (optional)

---

## Data Flow

### Initialization Flow

```
1. User opens Zoom App in meeting
2. Frontend loads in Zoom webview
3. zoomSdk.config() initializes SDK
4. getUserContext() → check if host/co-host
5. getMeetingParticipants() → populate list
6. onParticipantChange → subscribe to updates
```

### Randomization Flow

```
1. Host clicks "Randomize" button
2. Frontend shuffles participant array (Fisher-Yates)
3. Display result in UI
4. zoomSdk.sendMessage() → broadcast to all app instances
5. All participants see the same randomized order
```

---

## Key SDK Methods Used

| Method | Purpose |
|--------|---------|
| `zoomSdk.config()` | Initialize SDK with capabilities |
| `zoomSdk.getUserContext()` | Get current user role |
| `zoomSdk.getMeetingParticipants()` | Get participant list |
| `zoomSdk.onParticipantChange()` | Real-time participant updates |
| `zoomSdk.sendMessage()` | Broadcast result to all instances |
| `zoomSdk.onMessage()` | Receive broadcast messages |

---

## OAuth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Zoom    │     │  Backend │     │  Zoom    │
│  Client  │     │  Server  │     │  OAuth   │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ 1. Open App    │                │
     │───────────────>│                │
     │                │ 2. Redirect    │
     │                │───────────────>│
     │                │                │
     │                │ 3. Auth Code   │
     │                │<───────────────│
     │                │                │
     │                │ 4. Exchange    │
     │                │───────────────>│
     │                │                │
     │                │ 5. Token       │
     │                │<───────────────│
     │ 6. Authorized  │                │
     │<───────────────│                │
     │                │                │
```

---

## UI Mockup

```
┌─────────────────────────────────────┐
│  Participant Randomizer         [?] │
├─────────────────────────────────────┤
│                                     │
│  Current Participants (5)           │
│  ┌───────────────────────────────┐  │
│  │ 👤 Alice (Host)               │  │
│  │ 👤 Bob                        │  │
│  │ 👤 Carol                      │  │
│  │ 👤 David                      │  │
│  │ 👤 Eve                        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      🎲 RANDOMIZE ORDER       │  │
│  └───────────────────────────────┘  │
│                                     │
│  Randomized Order:                  │
│  ┌───────────────────────────────┐  │
│  │ 1. Carol                      │  │
│  │ 2. Eve                        │  │
│  │ 3. Alice                      │  │
│  │ 4. David                      │  │
│  │ 5. Bob                        │  │
│  └───────────────────────────────┘  │
│                                     │
│  [📋 Copy to Clipboard]             │
│                                     │
└─────────────────────────────────────┘
```

---

## Security Considerations

1. **OAuth tokens** - Stored server-side, never exposed to client
2. **Role verification** - Always check `getUserContext()` before sensitive actions
3. **Input validation** - Sanitize any user input
4. **HTTPS only** - Required for Zoom Apps

---

## Deployment Strategy

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | `https://localhost:3000` (via ngrok) | Local testing |
| Production | `https://your-domain.com` | Live deployment |

**Hosting options:**
- Vercel (recommended - free tier, easy deploy)
- Netlify
- AWS/GCP/Azure

---

## Implementation Order

1. **Backend first** - Set up OAuth flow
2. **Frontend skeleton** - Basic React app with SDK init
3. **Participant list** - Fetch and display participants
4. **Randomization** - Implement shuffle logic
5. **Broadcasting** - Send results to all instances
6. **Polish** - UI improvements, error handling

---

## Next Steps (Phase 3)

1. Initialize monorepo with frontend + backend
2. Set up Zoom SDK integration
3. Implement OAuth flow
4. Build UI components
5. Test in Zoom client
