# Zoom Bot/Chatbot Research for Participant Randomizer

## Executive Summary

Building a participant randomizer for Zoom meetings presents significant technical challenges due to the separation between Zoom Team Chat (where bots can operate) and In-Meeting Chat (where bots cannot directly interact via REST API). This document outlines the available approaches, their capabilities, and limitations.

---

## 1. How Zoom Team Chat Bots Work

### Overview
Zoom Chatbots operate exclusively within **Zoom Team Chat** - the persistent messaging platform that exists outside of meetings. They cannot directly interact with in-meeting chat.

### Key Capabilities
- **Send/receive messages** in Team Chat channels and direct messages
- **Edit and delete messages** programmatically
- **Automate tasks** and provide notifications
- **Connect third-party services** with Zoom Team Chat

### Authentication
- Uses **Client Credentials OAuth flow**
- POST to `/oauth/token` endpoint with `client_credentials` grant type
- Requires `imchat:bot` scope
- Rate limit: MEDIUM category

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `POST /im/chat/messages` | Send messages |
| `PUT /im/chat/messages/{message_id}` | Edit messages |
| `DELETE /im/chat/messages/{message_id}` | Delete messages |

### Important Limitation
**Team Chat bots cannot send messages to in-meeting chat.** The Chatbot API operates within Zoom Team Chat channels and direct messages, not the ephemeral chat that exists during a Zoom meeting.

### Sources
- [Zoom Chatbot APIs Documentation](https://developers.zoom.us/docs/api/chatbot/)
- [Zoom Chatbot API Reference](https://developers.zoom.us/docs/api/rest/reference/chatbot/methods/)

---

## 2. Can Bots Interact with Meeting Chat?

### Short Answer: No (via REST API)

The Zoom REST API does not provide endpoints to send messages to in-meeting chat. Multiple developer forum discussions confirm this limitation:

- "The existing API seems to be set up to use someone's email or a group ID rather than sending to a live meeting."
- "There is no API available for in-meeting chat messages." (As of 2023)
- "There is no separate Zoom API to send in-meeting chat without a bot."

### Alternative: Zoom Meeting SDK

The **Zoom Meeting SDK** (not REST API) can send in-meeting chat messages, but requires:
1. A bot/client that actually joins the meeting as a participant
2. Running the SDK on a server (Linux SDK recommended)
3. Handling threading constraints (SDK calls must run on main thread)

#### SDK Code Example (C++):
```cpp
IChatMsgInfoBuilder* b = meetingchatcontroller->GetChatMessageBuilder();
b->SetReceiver(0);
b->SetMessageType(SDKChatMessageType_To_All);
b->SetContent(L"Hello world!");
meetingchatcontroller->SendChatMsgTo(b->Build());
```

### Sources
- [Zoom Developer Forum: Use API to send chat messages to Zoom meeting](https://devforum.zoom.us/t/use-api-to-send-chat-messages-to-zoom-meeting/96951)
- [Recall.ai: Sending Chat Messages Through the Zoom SDK](https://www.recall.ai/blog/zoom-sdk-sending-chat-messages)

---

## 3. Can Bots Access Meeting Participant Lists?

### REST API Options

#### Dashboard/Metrics API (Recommended for Live Meetings)
```
GET /metrics/meetings/{meetingId}/participants
```

**Requirements:**
- **Business plan or higher** required
- Scope: `dashboard_meetings:read:admin` or `dashboard:read:admin`
- Rate limit: HEAVY
- Can query live meetings with `type=live` parameter

**Limitations:**
- Only available on paid Business+ accounts
- Rate limited heavily
- May have latency for real-time use cases

#### Past Meeting Participants API
```
GET /past_meetings/{meetingId}/participants
```
Only available after a meeting ends.

### Zoom Apps SDK (Client-Side)

The `getMeetingParticipants()` method is available but has restrictions:

**Capabilities:**
- Returns: `participantUUID`, `screenName`, `role`
- Works in real-time during meetings

**Limitations:**
- **Only works for Host and Co-Host roles**
- Returns limited data compared to webhooks
- Only works for meetings the user created

### Webhook-Based Tracking (Most Reliable for Real-Time)

Subscribe to participant events for real-time tracking:
- `meeting.participant_joined`
- `meeting.participant_left`

Maintain your own participant state in a database.

### Sources
- [Harvard API Portal: Zoom Metrics Endpoint](https://portal.apis.huit.harvard.edu/docs/ccs-zoom-api/1/routes/metrics/meetings/%7BmeetingId%7D/participants/get)
- [Zoom Developer Forum: getMeetingParticipants](https://devforum.zoom.us/t/getmeetingparticipants/115309)

---

## 4. Webhook-Based Approaches

### Available Webhook Events

| Event | Description |
|-------|-------------|
| `meeting.started` | Meeting has begun |
| `meeting.ended` | Meeting has ended |
| `meeting.participant_joined` | Participant joined meeting |
| `meeting.participant_left` | Participant left meeting |

### Participant Event Payload
Webhook payloads include:
- Participant UUID
- Email (if authenticated)
- Display name
- Join/leave timestamps
- Meeting UUID for correlation

### Implementation Pattern

```
1. Set up webhook endpoint to receive events
2. On participant_joined: Add to in-memory/database participant list
3. On participant_left: Remove from participant list
4. Maintain real-time participant state server-side
```

### Considerations
- Events may arrive out of order
- Response time must be under 3 seconds or Zoom will retry
- Host must be associated with the Zoom app for webhooks to fire
- Waiting room admits may trigger both leave and join events

### Sources
- [Medium: Implementing Webhooks for Real-Time Event Notifications in Zoom](https://medium.com/@harinimaruthasalam/blog-3-implementing-webhooks-for-real-time-event-notifications-in-zoom-2a79391f1faf)
- [Zoom Developer Forum: Meeting Participant Join/Left events](https://devforum.zoom.us/t/meeting-participant-join-left-events-and-multiple-deliveries/53977)

---

## 5. Pros and Cons Analysis

### Approach 1: Zoom Team Chat Bot + Webhooks

**How it would work:**
- Bot lives in Team Chat
- Webhooks track participant join/leave
- Host triggers randomization via Team Chat command
- Results displayed in Team Chat (NOT in-meeting chat)

| Pros | Cons |
|------|------|
| Simple REST API integration | Cannot post to in-meeting chat |
| No SDK required | Results not visible to non-Team-Chat users |
| Easy to implement | Requires separate Team Chat channel |
| Reliable message delivery | Disconnect between meeting and notification |

### Approach 2: Meeting SDK Bot

**How it would work:**
- Bot joins meeting as a participant using Meeting SDK
- Bot can read participant list directly
- Bot can send messages to in-meeting chat
- Host triggers via chat command (e.g., "!randomize")

| Pros | Cons |
|------|------|
| Direct in-meeting chat access | Requires server running SDK |
| Real-time participant list | Complex infrastructure (Linux server) |
| Seamless user experience | Bot appears as participant |
| Can respond to chat commands | Requires Marketplace app approval for external meetings |

### Approach 3: Zoom Apps (In-Meeting Panel)

**How it would work:**
- Build a Zoom App that runs in the meeting sidebar
- Use `getMeetingParticipants()` for participant list
- Display randomization UI in the app panel
- Use `sendMessage` API for app-to-app communication

| Pros | Cons |
|------|------|
| Native Zoom experience | Only host/co-host can use it |
| Real-time participant data | Requires Marketplace publication |
| No external server needed | Limited to app panel display |
| User-triggered interaction | Cannot send to main meeting chat |

### Approach 4: Third-Party Service (e.g., Recall.ai)

**How it would work:**
- Use Recall.ai's Meeting Bot API
- Bot joins meetings automatically
- Access participant list and send chat messages
- Respond to chat triggers

| Pros | Cons |
|------|------|
| Handles all complexity | Paid service |
| Cross-platform support | Third-party dependency |
| Full chat access | Requires Marketplace app setup |
| API for participant data | Additional service cost |

### Approach 5: Incoming Webhook to Team Chat

**How it would work:**
- Use Zoom's Incoming Webhook app
- External service sends randomization results to Team Chat channel
- Triggered via external API call

| Pros | Cons |
|------|------|
| Very simple setup | Only posts to Team Chat, not meeting |
| No custom app needed | One-way communication only |
| Works with existing tools | No in-meeting integration |

---

## 6. Alternative Approaches

### Browser Extension

**Concept:** Chrome/Firefox extension that manipulates the Zoom web client DOM.

**Challenges:**
- Zoom web client has limited features vs desktop
- DOM manipulation is fragile and breaks with updates
- Security concerns and marketplace restrictions
- Cannot be enforced for all meeting participants

**Security Warning:** Recent malware campaigns (Zoom Stealer) have targeted browser extensions to harvest meeting data, making users wary of extension permissions.

### Breakout Room Built-in Randomization

Zoom has built-in randomization for breakout rooms:
- Click "Recreate" in Breakout Rooms window
- Select "Automatically Assign People to Rooms"
- Zoom will re-randomize assignments

**Limitation:** This is for breakout room assignment only, not general participant randomization.

### Third-Party Meeting Platforms

Platforms like Jitsi Meet, MirrorFly, or ZEGOCLOUD offer more flexible APIs but require migrating away from Zoom.

---

## 7. Recommended Approach for Participant Randomizer

### For Simplest Implementation: Team Chat Bot + Webhooks

**Architecture:**
1. Create a Zoom Chatbot for Team Chat
2. Subscribe to `meeting.participant_joined` and `meeting.participant_left` webhooks
3. Maintain participant list in database/memory
4. Bot responds to slash command in Team Chat (e.g., `/randomize`)
5. Results posted to Team Chat channel

**Limitation:** Results appear in Team Chat, not in-meeting chat.

### For Best User Experience: Meeting SDK Bot

**Architecture:**
1. Create a server running Zoom Linux SDK
2. Bot joins meetings as a participant
3. Monitor in-meeting chat for trigger command
4. Query participant list via SDK
5. Post randomization results to in-meeting chat

**Complexity:** Requires significant infrastructure and Marketplace app approval.

### For Rapid Prototyping: Recall.ai

**Architecture:**
1. Use Recall.ai Meeting Bot API
2. Bot joins meetings and monitors chat
3. Use their participant list API
4. Send results via their chat API

**Trade-off:** Paid service, but handles all complexity.

---

## 8. Technical Requirements Summary

### Minimum Requirements for Any Approach

| Requirement | Team Chat Bot | SDK Bot | Zoom App |
|-------------|---------------|---------|----------|
| Zoom Developer Account | Yes | Yes | Yes |
| Marketplace App | Yes | Yes | Yes |
| Server Infrastructure | Minimal | Significant | Minimal |
| Business Plan Required | For Metrics API | No | No |
| Marketplace Approval | For production | For external meetings | For publication |

### API Scopes Needed

**For Webhook-based participant tracking:**
- `webhook:read`
- `meeting:read` or `meeting:read:admin`

**For Dashboard API participant list:**
- `dashboard_meetings:read:admin`

**For Team Chat bot:**
- `imchat:bot`
- `chat_message:write`

---

## 9. Conclusion

Building a participant randomizer for Zoom that posts results to in-meeting chat requires either:

1. **Meeting SDK Bot** - Most capable but complex
2. **Third-party service (Recall.ai)** - Simpler but adds cost/dependency

If posting to Team Chat (outside the meeting) is acceptable:

3. **Team Chat Bot + Webhooks** - Simplest to implement

The Zoom REST API alone cannot send messages to in-meeting chat, which is the primary technical barrier for this use case.

---

## References

### Official Zoom Documentation
- [Zoom Chatbot APIs](https://developers.zoom.us/docs/api/chatbot/)
- [Zoom Meeting SDK](https://developers.zoom.us/docs/meeting-sdk/)
- [Zoom Meeting API Reference](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/)
- [Zoom Developer APIs Overview](https://developers.zoom.us/docs/api/)

### Developer Forum Discussions
- [Use API to send chat messages to Zoom meeting](https://devforum.zoom.us/t/use-api-to-send-chat-messages-to-zoom-meeting/96951)
- [Sending messages via API to live meeting participants](https://devforum.zoom.us/t/sending-messages-via-api-to-live-meeting-participants/32191)
- [getMeetingParticipants](https://devforum.zoom.us/t/getmeetingparticipants/115309)
- [How can I create a Zoom Bot that joins meetings](https://devforum.zoom.us/t/how-can-i-create-a-zoom-bot-that-joins-meetings-and-interacts-as-a-participant/80937)

### Third-Party Resources
- [Recall.ai Meeting Bot API](https://www.recall.ai/product/meeting-bot-api)
- [Recall.ai Zoom Bot Documentation](https://www.recall.ai/product/meeting-bot-api/zoom)
- [Recall.ai: How to build a Zoom bot](https://www.recall.ai/blog/how-to-build-a-zoom-bot)

### Support Documentation
- [Zoom Incoming Webhook Chatbot](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067640)
- [Zoom Team Chat vs In-Meeting Chat](https://www.zoom.com/en/blog/zoom-team-chat-vs-in-meeting-chat/)
