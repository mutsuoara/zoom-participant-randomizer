# Zoom Apps SDK Research for Participant Randomizer

**Research Date:** January 2025
**Purpose:** Evaluate Zoom Apps (in-client apps) for building a participant randomizer tool

---

## Table of Contents

1. [What Are Zoom Apps?](#1-what-are-zoom-apps)
2. [How Zoom Apps Work](#2-how-zoom-apps-work)
3. [Zoom Apps SDK Capabilities](#3-zoom-apps-sdk-capabilities)
4. [Participant List Access](#4-participant-list-access)
5. [Chat Message Capabilities](#5-chat-message-capabilities)
6. [Host/Co-Host Trigger Capability](#6-hostco-host-trigger-capability)
7. [Development and Deployment Process](#7-development-and-deployment-process)
8. [Pros and Cons for This Use Case](#8-pros-and-cons-for-this-use-case)
9. [Comparison: Zoom Apps vs REST API](#9-comparison-zoom-apps-vs-rest-api)
10. [Recommendation](#10-recommendation)

---

## 1. What Are Zoom Apps?

Zoom Apps are third-party web applications that run **embedded directly inside the Zoom client**. They allow developers to bring external applications front and center within Zoom Meetings and Webinars without requiring participants to leave the Zoom environment.

### Key Characteristics

- **Embedded Experience**: Apps run in an embedded browser (webview) inside the Zoom desktop/mobile client
- **Native Integration**: Seamless integration using a lightweight, framework-agnostic JavaScript SDK
- **Cross-Platform**: Supported on Windows 7+, macOS 10.13+, iOS, and Android
- **OAuth Authentication**: Industry-standard OAuth enables user-level authentication and authorization
- **Real-time Access**: Apps can access meeting context, participant information, and client features in real-time

### Running Contexts

Zoom Apps can run in multiple contexts:
- `inMeeting` - During an active meeting
- `inWebinar` - During a webinar
- `inMainClient` - In the main Zoom client (outside of meetings)
- `inCollaborate` - Collaboration mode
- `inImmersive` - Immersive view mode
- `inCamera` - Camera mode

**Sources:**
- [Zoom Apps Developer Documentation](https://developers.zoom.us/docs/zoom-apps/)
- [GitHub - zoom/appssdk](https://github.com/zoom/appssdk)

---

## 2. How Zoom Apps Work

### Architecture Overview

```
+-------------------+      JavaScript SDK      +------------------+
|   Your Web App    | <--------------------->  |   Zoom Client    |
|   (HTML/JS/CSS)   |      (zoomSdk)           |   (Embedded      |
|   Hosted on your  |                          |    Browser)      |
|   server          |                          |                  |
+-------------------+                          +------------------+
         |                                              |
         v                                              v
+-------------------+                          +------------------+
|   Your Backend    |                          |   Zoom APIs      |
|   Server          | <----------------------> |   (REST)         |
+-------------------+     OAuth / Webhooks     +------------------+
```

### SDK Initialization

The Zoom Apps SDK must be initialized with `zoomSdk.config()` before any APIs can be used:

```javascript
import zoomSdk from "@zoom/appssdk";

const configResponse = await zoomSdk.config({
  version: '0.16',
  popoutSize: { width: 480, height: 360 },
  capabilities: [
    "getMeetingParticipants",
    "getUserContext",
    "getMeetingContext",
    "sendAppInvitation",
    // ... other capabilities your app needs
  ]
});
```

### Installation Methods

1. **NPM Package**: `npm install @zoom/appssdk`
2. **Cloud SDK**: Include via script tag for automatic patches

### SDK Versioning

- Current version: **0.16.36** (as of January 2025)
- Cloud SDK automatically receives latest patches
- NPM SDK requires manual updates for new client versions
- SDK capabilities depend on user's installed Zoom Desktop Client version

**Sources:**
- [Zoom Apps SDK Documentation](https://appssdk.zoom.us/)
- [ZoomSdk Class Reference](https://appssdk.zoom.us/classes/ZoomSdk.ZoomSdk.html)

---

## 3. Zoom Apps SDK Capabilities

### Available APIs (Partial List)

| Category | API | Description |
|----------|-----|-------------|
| **Meeting Context** | `getMeetingContext()` | Get basic meeting information |
| **User Context** | `getUserContext()` | Get current user info (screenName, role, participantUUID) |
| **Participants** | `getMeetingParticipants()` | Get list of all meeting participants |
| **App Invitation** | `sendAppInvitation()` | Send app invitation to specific participants |
| **App Invitation** | `sendAppInvitationToAllParticipants()` | Send app invitation to all participants |
| **Messaging** | `sendMessage()` | Broadcast JSON data to all app instances |
| **Messaging** | `postMessage()` | Send data to connected app instances |
| **Chat** | `getCMCChatChannel()` | Get Continuous Meeting Chat channel UUID |
| **Collaboration** | `connect()` | Connect app instances for real-time sync |
| **UI Control** | `bringAppToFront()` | Bring app window to front |
| **Participant** | `setParticipantScreenName()` | Change participant's screen name |

### Available Events

| Event | Description |
|-------|-------------|
| `onParticipantChange` | Triggered when participants join/leave or change roles |
| `onMyUserContextChange` | Triggered when current user's context changes |
| `onMeeting` | Meeting state changes (started, ended) |
| `onMessage` | Receive broadcast messages from other app instances |
| `onConnect` | App connection status changes |
| `onRunningContextChange` | Running context changes |

### Supported Roles

- Host
- Co-Host
- Participant
- Panelist
- Attendee

**Sources:**
- [ZoomSdk API Reference](https://appssdk.zoom.us/classes/ZoomSdk.ZoomSdk.html)
- [Zoom Apps SDK GitHub](https://github.com/zoom/appssdk)

---

## 4. Participant List Access

### API: `getMeetingParticipants()`

**Can access participant list?** **YES** - but with restrictions

#### Response Format

```javascript
const participants = await zoomSdk.getMeetingParticipants();

// Response structure:
{
  participants: [
    {
      participantUUID: "abc123...",
      screenName: "John Doe",
      role: "host"  // or "cohost", "participant", etc.
    },
    {
      participantUUID: "def456...",
      screenName: "Jane Smith",
      role: "participant"
    }
    // ... more participants
  ]
}
```

#### Permissions and Restrictions

| Aspect | Restriction |
|--------|-------------|
| **Role Requirement** | **Host or Co-Host ONLY** |
| **Error if Unauthorized** | `Error: No Permission for this API. [code:80003, reason:require_meeting_owner_role]` |
| **Running Contexts** | inMeeting, inImmersive, inCollaborate, inCamera, inWebinar |
| **Participant Role Access** | Regular participants CANNOT access participant list |

#### Real-time Updates via Events

```javascript
// Listen for participant changes
zoomSdk.onParticipantChange((event) => {
  console.log('Participant changed:', event);
  // Re-fetch participant list after changes
  const updated = await zoomSdk.getMeetingParticipants();
});
```

#### Known Limitations

1. `participantUUID` may change when a user changes roles
2. Less information compared to REST API webhooks
3. Only returns current in-meeting participants

**Sources:**
- [getMeetingParticipants Forum Discussion](https://devforum.zoom.us/t/getmeetingparticipants/115309)
- [getMeetingParticipants Permission Issue](https://devforum.zoom.us/t/getmeetingparticipants-gives-reason-require-meeting-owner-role/76906)

---

## 5. Chat Message Capabilities

### Can send chat messages? **YES** - with caveats

#### Option 1: `sendAppInvitation()` / `sendAppInvitationToAllParticipants()`

Sends an in-meeting chat message inviting participants to open the app:

```javascript
// Send to specific participants
await zoomSdk.sendAppInvitation({
  participantUUIDs: [uuid1, uuid2],
  message: "You've been randomly selected! Open the app to see results."
});

// Send to all participants
await zoomSdk.sendAppInvitationToAllParticipants();
```

**Behavior Notes:**
- Message appears in the Zoom meeting chat
- Behavior depends on host's in-meeting chat settings
- In breakout rooms, only sends to participants in current room
- Supported for: Host, Co-Host, Participant, Panelist

#### Option 2: Continuous Meeting Chat (CMC) Integration

```javascript
// Get CMC channel UUID
const cmcChannel = await zoomSdk.getCMCChatChannel();

// Use REST API to send message to the channel
// POST https://api.zoom.us/v2/chat/users/{userId}/messages
```

**CMC Behavior:**
- For CMC-enabled meetings: Message sent to linked chat channel
- For non-CMC meetings: Posted to legacy meeting chat
- For sidebar apps: User can choose which channel to post to

#### Option 3: `sendMessage()` - App-to-App Communication

```javascript
// Broadcast JSON data to all app instances
await zoomSdk.sendMessage({
  type: "randomization_result",
  selectedParticipant: "John Doe"
});

// Receive in other app instances
zoomSdk.onMessage((data) => {
  console.log('Received:', data);
});
```

**Note:** This sends data between app instances, NOT to the general meeting chat.

#### Known Limitations

1. **No direct meeting chat API**: There is no dedicated API to send arbitrary messages directly to the meeting chat without using app invitations
2. **App invitation format**: Messages sent via `sendAppInvitation` have a specific format and include a link to open the app
3. **Chat settings dependent**: Functionality may be limited by host's in-meeting chat settings

**Sources:**
- [Zoom Apps SDK Missing Features Discussion](https://devforum.zoom.us/t/zoom-apps-sdk-missing-features-send-chat-broadcast-message-onaudio-video-change/84991)
- [API for In-Meeting Chat Message](https://devforum.zoom.us/t/api-for-in-meeting-chat-message/83224)

---

## 6. Host/Co-Host Trigger Capability

### Can Host/Co-Host trigger randomization? **YES**

The Zoom Apps SDK provides role information that can be used to restrict functionality:

#### Getting User Role

```javascript
const userContext = await zoomSdk.getUserContext();

// Response:
{
  screenName: "Host Name",
  role: "host",  // "host", "cohost", "participant", "panelist", "attendee"
  participantUUID: "xxx",
  status: "authorized"
}
```

#### Implementation Pattern

```javascript
async function handleRandomize() {
  const userContext = await zoomSdk.getUserContext();

  // Check if user is host or co-host
  if (userContext.role === 'host' || userContext.role === 'cohost') {
    // Proceed with randomization
    const participants = await zoomSdk.getMeetingParticipants();
    const selected = selectRandom(participants.participants);

    // Announce result via app invitation
    await zoomSdk.sendAppInvitationToAllParticipants({
      message: `Random selection: ${selected.screenName} has been chosen!`
    });
  } else {
    // Show error - only hosts/co-hosts can trigger
    alert("Only the host or co-host can trigger randomization");
  }
}
```

#### Role-Based UI

```javascript
async function renderUI() {
  const { role } = await zoomSdk.getUserContext();

  if (role === 'host' || role === 'cohost') {
    // Show randomize button
    showRandomizeButton();
  } else {
    // Show read-only view
    showParticipantView();
  }
}
```

**Sources:**
- [Zoom Roles and Permissions Documentation](https://developers.zoom.us/docs/zoom-apps/guides/roles-and-permissions/)
- [Understanding Roles in Zoom Meetings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0064033)

---

## 7. Development and Deployment Process

### Development Setup

#### 1. Create App on Zoom Marketplace

1. Go to [Zoom Marketplace](https://marketplace.zoom.us)
2. Navigate to **Develop** > **Build App**
3. Select **Zoom Apps** as app type
4. Configure:
   - App name
   - OAuth redirect URLs
   - Scopes and permissions
   - Home URL (your app's entry point)

#### 2. Local Development Environment

```bash
# Clone a sample app
git clone https://github.com/zoom/zoomapps-advancedsample-react

# Install dependencies
npm install

# Create .env file with credentials
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
REDIRECT_URL=https://your-ngrok-url.ngrok.io/auth

# Start development server
npm run dev

# Use ngrok for HTTPS tunnel
ngrok http 3000
```

#### 3. Required Configuration

| Setting | Description |
|---------|-------------|
| **Home URL** | Your app's main entry point (HTTPS required) |
| **Redirect URL** | OAuth callback URL |
| **Scopes** | API permissions (user:read, meeting:read, etc.) |
| **Capabilities** | SDK APIs your app will use |

### Deployment Options

#### Option A: Internal/Private App (Recommended for Internal Use)

For organization-internal apps that don't need public marketplace listing:

1. **Account-Level App**: Admin installs for entire organization
2. **No Public Review Required**: Skip marketplace review process
3. **Faster Deployment**: Direct installation via admin console

```
Developer Console > App Settings > Distribution > Publishable: No
```

#### Option B: Public Marketplace App

For apps available to all Zoom users:

1. **Full Review Process**: Zoom reviews app for quality and security
2. **Requirements**:
   - Deauthorization webhook URL
   - Privacy policy URL
   - Terms of service
   - Support contact
   - Demo credentials for review team
3. **Review Timeline**: Processed 9am-5pm PT, Monday-Friday
4. **Quality Standards**: Must meet Zoom's UX standards

### Deployment Requirements

| Requirement | Internal App | Public App |
|-------------|--------------|------------|
| HTTPS | Required | Required |
| OAuth Implementation | Required | Required |
| Deauthorization Webhook | Optional | Required |
| Privacy Policy | Optional | Required |
| Marketplace Review | No | Yes |
| Domain Verification | Optional | Required |

**Sources:**
- [Zoom App Distribution Guide](https://developers.zoom.us/docs/distribute/)
- [Enabling Publishing for Private Apps](https://developers.zoom.us/docs/distribute/app-submission/enabling-publishing-for-private-and-beta-apps/)
- [Prepare App for Production](https://developers.zoom.us/docs/build-flow/prep-app-for-prod/)

---

## 8. Pros and Cons for This Use Case

### Pros

| Advantage | Description |
|-----------|-------------|
| **Native In-Meeting Experience** | App appears directly in Zoom client, no context switching |
| **Real-time Participant Data** | Direct access to live participant list via `getMeetingParticipants()` |
| **Real-time Updates** | `onParticipantChange` event for instant participant updates |
| **Role-Based Access** | Built-in role detection (host, co-host, participant) |
| **In-Meeting Communication** | Can send app invitations with messages to chat |
| **Cross-Platform** | Works on desktop (Windows, macOS) and mobile (iOS, Android) |
| **No Meeting Bot Required** | No need to join meeting as a bot participant |
| **Internal Deployment** | Can deploy as internal app without marketplace review |
| **Modern Tech Stack** | JavaScript/TypeScript with React or any framework |
| **State Sync** | `sendMessage()` enables real-time state sync across all app instances |

### Cons

| Disadvantage | Description |
|--------------|-------------|
| **Host/Co-Host Restriction** | `getMeetingParticipants()` only available to host/co-host |
| **No Direct Chat API** | Cannot send arbitrary messages to meeting chat (only app invitations) |
| **App Installation Required** | Users must install the app or accept invitation |
| **Client Version Dependency** | SDK features depend on user's Zoom client version |
| **Limited Chat Formatting** | App invitation messages have fixed format |
| **Learning Curve** | New SDK/APIs to learn compared to REST API |
| **Development Complexity** | Requires frontend web app + backend server |
| **UUID Inconsistency** | `participantUUID` may change when user changes roles |
| **Mobile Limitations** | Some APIs may behave differently on mobile |
| **Network Dependency** | App needs to be hosted on HTTPS server |

### Critical Limitations for Randomizer Use Case

1. **Participant List Access**: Only host/co-host can get participant list - this works for our use case since only host/co-host should trigger randomization

2. **Chat Announcement**: No direct API to post to meeting chat. Workarounds:
   - Use `sendAppInvitationToAllParticipants()` with message (shows as app invitation)
   - Use Continuous Meeting Chat (CMC) integration with REST API
   - Display results in app UI and broadcast via `sendMessage()`

3. **User Installation**: Participants need the app installed or must accept invitation to see app content

---

## 9. Comparison: Zoom Apps vs REST API

| Aspect | Zoom Apps SDK | REST API + Webhooks |
|--------|---------------|---------------------|
| **Real-time participant list** | Yes, via `getMeetingParticipants()` | No (only past participants) |
| **Live participant updates** | Yes, via `onParticipantChange` | Yes, via webhooks |
| **In-meeting chat messages** | Limited (app invitations only) | No (team chat only) |
| **User experience** | In-client, seamless | External web app |
| **Requires bot participant** | No | No |
| **Host/co-host detection** | Yes, real-time | Yes, via meeting context |
| **Setup complexity** | Higher (web app + backend) | Moderate (server + webhooks) |
| **Internal deployment** | Yes (account-level app) | Yes (Server-to-Server OAuth) |
| **Mobile support** | Yes (with limitations) | Yes (via web interface) |

### Key Differentiator

**Zoom Apps can get live participant list in real-time** - the REST API cannot provide current participant list for ongoing meetings. This is a significant advantage for the randomizer use case.

---

## 10. Recommendation

### Verdict: **Zoom Apps SDK is SUITABLE for Participant Randomizer**

The Zoom Apps SDK meets all core requirements:

| Requirement | Met? | How |
|-------------|------|-----|
| Get participant list | YES | `getMeetingParticipants()` (host/co-host only) |
| Send message to chat | PARTIAL | App invitations with message, or display in app UI |
| Host/co-host trigger | YES | Role check via `getUserContext()` |
| Internal use | YES | Account-level app deployment |

### Recommended Architecture

```
+------------------------------------------+
|              Zoom Meeting                 |
|  +------------------------------------+   |
|  |         Zoom App Panel            |   |
|  |  +------------------------------+  |   |
|  |  |   Participant Randomizer    |  |   |
|  |  |                              |  |   |
|  |  |  [List of Participants]      |  |   |
|  |  |  - John Doe                  |  |   |
|  |  |  - Jane Smith                |  |   |
|  |  |  - Bob Wilson                |  |   |
|  |  |                              |  |   |
|  |  |  [RANDOMIZE] (Host only)     |  |   |
|  |  |                              |  |   |
|  |  |  Result: Jane Smith          |  |   |
|  |  +------------------------------+  |   |
|  +------------------------------------+   |
+------------------------------------------+
```

### Implementation Approach

1. **Frontend**: React/Vue web app using Zoom Apps SDK
2. **Backend**: Node.js server for OAuth handling
3. **Participant Access**: Use `getMeetingParticipants()` + `onParticipantChange`
4. **Randomization**: JavaScript random selection on frontend
5. **Result Announcement**:
   - Primary: Display in app UI + broadcast via `sendMessage()`
   - Secondary: Use `sendAppInvitationToAllParticipants()` with result message
6. **Access Control**: Check `getUserContext().role` before allowing randomization

### Next Steps

1. Set up Zoom Marketplace developer account
2. Create internal Zoom App
3. Implement using [Advanced React Sample](https://github.com/zoom/zoomapps-advancedsample-react) as starting point
4. Deploy to hosting platform (Vercel, AWS, etc.)
5. Install as account-level app for organization

---

## References

### Official Documentation
- [Zoom Apps Overview](https://developers.zoom.us/docs/zoom-apps/)
- [Zoom Apps SDK Reference](https://appssdk.zoom.us/)
- [ZoomSdk Class](https://appssdk.zoom.us/classes/ZoomSdk.ZoomSdk.html)
- [Zoom Apps SDK GitHub](https://github.com/zoom/appssdk)

### Sample Applications
- [Advanced React Sample](https://github.com/zoom/zoomapps-advancedsample-react)
- [Zoom OAuth Sample App](https://github.com/zoom/zoom-oauth-sample-app)

### Developer Community
- [Zoom Developer Forum - Zoom Apps](https://devforum.zoom.us/c/zoom-apps/)
- [getMeetingParticipants Discussion](https://devforum.zoom.us/t/getmeetingparticipants/115309)
- [In-Meeting Chat API Discussion](https://devforum.zoom.us/t/api-for-in-meeting-chat-message/83224)

### Related Resources
- [Random Zoomer (Third-Party)](https://github.com/osadavc/random-zoomer)
- [Feature Request: Random Participant Selector](https://devforum.zoom.us/t/random-participant-selector/15238)
