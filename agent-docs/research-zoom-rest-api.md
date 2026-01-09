# Zoom REST API Research for Participant Randomizer

## Overview

This document outlines the research findings for building a participant randomizer feature for Zoom meetings. The solution is intended for internal organizational use via an external web application.

---

## 1. Zoom REST API Endpoints

### 1.1 Listing Meeting Participants (Live Meeting)

#### Primary Endpoint: Dashboard/Metrics API

**Endpoint:** `GET https://api.zoom.us/v2/metrics/meetings/{meetingId}/participants`

| Property | Details |
|----------|---------|
| **HTTP Method** | GET |
| **Required Scope** | `dashboard_meetings:read:admin` |
| **Rate Limit Label** | Heavy |
| **Prerequisites** | Business plan or higher |

**Query Parameters:**
- `type` - Set to `live` for active meetings (default), or `past` for completed meetings
- `from` / `to` - Date range for dashboard data (within last 6 months)
- `page_size` - Number of records per page
- `next_page_token` - Pagination token

**Response Fields (per participant):**
- `id` - Participant ID
- `user_id` - User ID (if authenticated)
- `user_name` - Display name
- `email` - Email address (if available)
- `join_time` - When the participant joined
- `leave_time` - When the participant left (null if still in meeting)
- `share_application` - Whether sharing application
- `share_desktop` - Whether sharing desktop
- QoS metrics (audio, video, screen share quality)

**Important Notes:**
- To identify participants currently in the meeting, filter for records where `leave_time` is null/empty
- This endpoint lists ALL participants who have joined, including those who left and rejoined
- Requires Business, Education, or API plan

#### Alternative Endpoint: Quality of Service API

**Endpoint:** `GET https://api.zoom.us/v2/metrics/meetings/{meetingId}/participants/qos`

Same requirements as above, but includes additional quality of service metrics.

#### Past Meeting Participants (for reference)

**Endpoint:** `GET https://api.zoom.us/v2/past_meetings/{meetingId}/participants`

| Property | Details |
|----------|---------|
| **Required Scope** | `meeting:read:admin` or `meeting:read` |
| **Use Case** | Retrieving participants after meeting ends |

---

### 1.2 Sending Chat Messages to Meeting

#### Critical Limitation

**There is NO direct REST API endpoint to send chat messages to an in-progress Zoom meeting.**

The Zoom REST API Chat endpoints (`/chat/users/{userId}/messages`) are designed for Zoom Team Chat (persistent chat channels), NOT for in-meeting chat.

#### Available Options

**Option A: Zoom Meeting SDK (Recommended for in-meeting chat)**

The Meeting SDK provides the `sendChat` function for sending messages within a meeting:

```javascript
ZoomMtg.sendChat({
  message: 'Your randomization result: ...',
  userId: targetUserId, // Optional: for private messages
  success: function() { console.log('Message sent'); },
  error: function(error) { console.log('Error:', error); }
});
```

**Limitations:**
- Requires embedding the Meeting SDK in your application
- Does not work for webinars
- SDK calls must run on the main thread
- Requires the user to be joined to the meeting via the SDK

**Option B: Chatbot API (Team Chat only)**

The Zoom Chatbot API allows sending messages to Team Chat channels but **cannot send messages to in-meeting chat**.

**Endpoint:** `POST https://api.zoom.us/v2/im/chat/messages`

| Property | Details |
|----------|---------|
| **Scope** | `imchat:bot` |
| **Limitation** | Team Chat only, not in-meeting chat |

**Option C: Third-Party Meeting Bot Platforms**

Platforms like Recall.ai, MeetingBaaS, or Attendee.dev provide unified APIs that can work around native Zoom limitations for in-meeting interactions.

---

## 2. Authentication Options

### 2.1 Server-to-Server OAuth (Recommended)

**Status:** Active and recommended for internal/backend applications

Server-to-Server OAuth is the preferred method for applications that don't require user interaction for authentication.

#### Credentials Required
- **Account ID**
- **Client ID**
- **Client Secret**

#### Token Request

**Endpoint:** `POST https://zoom.us/oauth/token`

**Headers:**
```
Authorization: Basic {base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded
```

**Body:**
```
grant_type=account_credentials&account_id={your_account_id}
```

**Token Properties:**
- Expires in 1 hour (3600 seconds)
- No refresh tokens available - request new token when expired
- Multiple simultaneous tokens allowed
- Tokens tied to specific app scopes

#### When to Use
- Backend services without user interaction
- Scheduled tasks and automation
- Internal organizational tools
- Server-side integrations

### 2.2 OAuth 2.0 (User Authorization)

**Status:** Active

Standard OAuth 2.0 flow for applications that need to act on behalf of specific users.

#### Flow
1. Redirect user to Zoom authorization URL
2. User authorizes the application
3. Receive authorization code
4. Exchange code for access/refresh tokens
5. Use tokens for API requests

#### When to Use
- User-facing applications
- When actions need to be attributed to specific users
- Multi-tenant applications serving multiple organizations

### 2.3 JWT Authentication

**Status:** DEPRECATED (as of September 8, 2023)**

- No longer possible to create new JWT apps
- Existing JWT apps should migrate to Server-to-Server OAuth
- JWT was deprecated due to lack of granular scope control

---

## 3. Required OAuth Scopes

### For Participant Listing (Dashboard API)

| Scope | Description | Required Plan |
|-------|-------------|---------------|
| `dashboard_meetings:read:admin` | Read meeting dashboard data | Business+ |
| `dashboard:read:admin` | General dashboard access | Business+ |

### For Meeting Management

| Scope | Description |
|-------|-------------|
| `meeting:read` | Read user's meetings |
| `meeting:read:admin` | Read all account meetings |
| `meeting:write` | Create/update user's meetings |
| `meeting:write:admin` | Create/update all account meetings |

### For User Information

| Scope | Description |
|-------|-------------|
| `user:read` | Read user information |
| `user:read:admin` | Read all users in account |

### Scope Notes

- **Granular Scopes:** Zoom uses a format like `<service>:<action>:<data_claim>:<access>`
- Some scope names have changed (e.g., `meeting:write:admin` may appear as `meeting:write:meeting:admin`)
- Dashboard scopes require Business plan or higher
- Admin-level scopes may be grayed out on Basic (free) plans

---

## 4. Rate Limits and Restrictions

### Rate Limit Categories

| Category | Free | Pro | Business+ |
|----------|------|-----|-----------|
| **Light** | 4/sec, 6K/day | 30/sec | 80/sec |
| **Medium** | 2/sec, 2K/day | 20/sec | 60/sec |
| **Heavy** | 1/sec, 1K/day | 10/sec | 40/sec |
| **Resource-intensive** | 10/min, 30K/day | 10/min | 20/min |

**Daily Limits (Pro/Business+):**
- Pro: 30,000 requests/day (combined heavy + resource-intensive)
- Business+: 60,000 requests/day (combined heavy + resource-intensive)

### Dashboard API Rate Limits

The `/metrics/meetings/{meetingId}/participants` endpoint is classified as **Heavy**, meaning:
- Free: 1 request/second, 1,000/day
- Pro: 10 requests/second
- Business+: 40 requests/second

### Handling Rate Limit Errors

When limits are exceeded:
- HTTP 429 (Too Many Requests) is returned
- Check `Retry-After` response header for wait duration
- Implement exponential backoff for retries

### Best Practices

1. **Cache responses** where appropriate
2. **Use webhooks** instead of polling when possible
3. **Implement retry logic** with exponential backoff
4. **Monitor daily usage** to avoid hitting daily caps
5. **Rate limits are account-level** - shared across all users and apps

---

## 5. Pros and Cons of External Web App Approach

### Pros

| Advantage | Description |
|-----------|-------------|
| **Separation of Concerns** | Web app logic separate from Zoom meeting experience |
| **Familiar Development** | Use standard web technologies (React, Vue, etc.) |
| **Flexible Hosting** | Deploy on any infrastructure (AWS, Azure, GCP, on-prem) |
| **Easy Updates** | Update app without Zoom Marketplace review process |
| **Broader Access** | Users can access from any browser, not just Zoom client |
| **Server-to-Server OAuth** | Simple authentication for internal tools |
| **Dashboard API Access** | Can use metrics endpoints for real-time participant data |

### Cons

| Disadvantage | Description |
|--------------|-------------|
| **No In-Meeting Chat** | REST API cannot send messages to in-meeting chat directly |
| **Context Switching** | Users must switch between Zoom and web browser |
| **No Real-Time Updates** | Must poll API for participant changes (no push) |
| **Business Plan Required** | Dashboard API requires Business plan or higher |
| **Rate Limits** | Heavy endpoint classification limits polling frequency |
| **No Breakout Room Access** | Dashboard API may not include breakout room participants |
| **Manual Trigger** | Host must manually access web app to trigger randomization |

### Alternative Architectures

#### Option 1: Zoom App (In-Client)

Embed web app inside Zoom client using Zoom Apps framework.

**Pros:**
- No context switching
- Can use Meeting SDK for in-meeting chat
- Better user experience

**Cons:**
- Requires Marketplace submission
- More complex OAuth flow
- WebView limitations vary by platform

#### Option 2: Webhook + Web App Hybrid

Use webhooks for real-time participant tracking, web app for triggering randomization.

**Pros:**
- Real-time participant updates
- Reduces API polling
- More accurate participant list

**Cons:**
- Webhooks only fire when your account is meeting host
- Requires webhook endpoint infrastructure
- Still cannot send in-meeting chat via REST API

#### Option 3: Meeting SDK Integration

Build a custom meeting interface using the Zoom Meeting SDK.

**Pros:**
- Full access to in-meeting features
- Can send chat messages
- Complete control over UI

**Cons:**
- Participants must join via your app
- Significant development effort
- Different user experience from native Zoom

---

## 6. Recommended Architecture for Participant Randomizer

Based on research findings, here is the recommended approach:

### Architecture

```
+-------------------+     +------------------+     +-------------+
|  External Web App | --> | Backend Server   | --> | Zoom API    |
|  (React/Vue/etc)  |     | (Node.js/Python) |     | REST        |
+-------------------+     +------------------+     +-------------+
         |                        |
         v                        v
    Host/Co-host           S2S OAuth Token
    Triggers via           API Calls
    Browser
```

### Implementation Steps

1. **Authentication:** Use Server-to-Server OAuth for backend API calls
2. **Participant List:** Poll `GET /metrics/meetings/{meetingId}/participants` endpoint
3. **Randomization:** Implement selection logic on backend
4. **Display Results:** Show results in web app interface
5. **Communication:** Host announces results verbally or shares screen

### Workaround for Chat Limitation

Since REST API cannot send to in-meeting chat:

1. **Screen Share:** Host shares randomizer web app results
2. **Verbal Announcement:** Host announces selected participant(s)
3. **Copy to Clipboard:** Web app provides copy button for results
4. **External Notification:** Send result via email or Team Chat (if configured)

### Required Plan

**Business plan or higher** is required for the Dashboard API access needed to get live meeting participants.

---

## 7. Webhook Events (Alternative Approach)

For real-time participant tracking, consider using webhooks:

### Relevant Events

| Event | Description |
|-------|-------------|
| `meeting.started` | Meeting has started |
| `meeting.ended` | Meeting has ended |
| `meeting.participant_joined` | Participant joined the meeting |
| `meeting.participant_left` | Participant left the meeting |
| `meeting.participant_jbh_joined` | Participant joined before host |

### Webhook Implementation Notes

- Register webhook endpoint in Zoom App settings
- Validate webhook signatures for security
- Respond with 2xx status within 3 seconds
- Maintain your own participant state based on events
- Webhooks only fire for meetings you host

---

## 8. Summary and Recommendations

### Key Findings

1. **Participant List:** Use Dashboard API (`/metrics/meetings/{meetingId}/participants`) - requires Business plan
2. **Chat Messages:** NOT possible via REST API - would require Meeting SDK integration
3. **Authentication:** Use Server-to-Server OAuth for backend services
4. **Rate Limits:** Dashboard endpoints are "Heavy" - plan polling frequency accordingly

### Recommended Approach

For an internal organizational tool with minimal development effort:

1. Build external web app with Server-to-Server OAuth
2. Use Dashboard API to get live participant list
3. Display randomization results in web app
4. Host shares results via screen share or verbal announcement
5. Consider webhooks for real-time participant tracking (optional)

### Limitations to Accept

- Cannot send results directly to in-meeting chat
- Requires Business plan or higher
- Host must manually trigger and communicate results
- Slight delay in participant data (API polling vs real-time)

---

## References

- [Zoom Meeting API Reference](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/)
- [Zoom Server-to-Server OAuth](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)
- [Zoom OAuth Scopes Overview](https://developers.zoom.us/docs/integrations/oauth-scopes-overview/)
- [Zoom Rate Limits](https://developers.zoom.us/docs/api/rate-limits/)
- [Zoom Webhooks](https://developers.zoom.us/docs/api/webhooks/)
- [Zoom Meeting SDK - sendChat](https://marketplacefront.zoom.us/sdk/meeting/web/functions/ZoomMtg.sendChat.html)
- [Zoom Apps Architecture](https://developers.zoom.us/docs/zoom-apps/architecture/)
- [Zoom Meetings APIs](https://developers.zoom.us/docs/api/meetings/)
- [Zoom Developer Forum - Participant List Discussion](https://devforum.zoom.us/t/list-of-participants-currently-in-meeting/34804)
- [Zoom Developer Forum - In-Meeting Chat API Discussion](https://devforum.zoom.us/t/use-api-to-send-chat-messages-to-zoom-meeting/96951)
