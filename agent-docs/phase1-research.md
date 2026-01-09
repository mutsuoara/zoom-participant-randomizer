# Phase 1: Research Summary & Recommendation

**Project:** Zoom Participant Randomizer
**Date:** January 2026
**Purpose:** Determine the best approach for building a participant randomizer for Zoom meetings

---

## Executive Summary

After researching 4 integration approaches (Zoom Apps SDK, REST API, Chatbot, Developer Setup), the **recommended approach is Zoom Apps SDK** for building an in-client app that runs directly inside Zoom.

---

## Requirements Recap

| Requirement | Description |
|-------------|-------------|
| Get participant list | All current participants in a live meeting |
| Randomize | Shuffle/randomize the order |
| Post to chat | Display results in Zoom chat for all to see |
| Multiple times | Can be triggered multiple times per meeting |
| Host/co-host trigger | Only host/co-host can trigger |
| Organization use | Internal tool for your organization |

---

## Approach Comparison

| Capability | Zoom Apps SDK | REST API | Chatbot | Meeting SDK Bot |
|------------|---------------|----------|---------|-----------------|
| **Live participant list** | YES | NO* | NO | YES |
| **Send to meeting chat** | PARTIAL** | NO | NO | YES |
| **Host/co-host detection** | YES | YES | YES | YES |
| **In-meeting experience** | YES | NO | NO | YES |
| **No bot joins meeting** | YES | YES | YES | NO |
| **Internal deployment** | YES | YES | YES | YES |
| **Development complexity** | Medium | Medium | Low | High |

*REST API Dashboard endpoint requires Business plan and only returns historical data with delay
**Zoom Apps can send "app invitations" with messages, not arbitrary chat messages

---

## Recommended Approach: Zoom Apps SDK

### Why Zoom Apps SDK?

1. **Real-time participant list access** - `getMeetingParticipants()` API gives live participant data (host/co-host only)
2. **Native in-meeting experience** - App panel appears directly in Zoom, no context switching
3. **No bot required** - Unlike Meeting SDK, no bot joins as a participant
4. **Internal deployment** - Can deploy as account-level app without marketplace review
5. **Real-time updates** - `onParticipantChange` event fires when participants join/leave

### Chat Limitation Workaround

The SDK cannot send arbitrary text to meeting chat. However:

**Option A (Recommended):** Display results in the app panel + broadcast to all app instances via `sendMessage()`. Host can verbally announce or share screen.

**Option B:** Use `sendAppInvitationToAllParticipants()` with a message - appears in chat as an app invitation with your custom message.

**Option C:** Integrate with Continuous Meeting Chat (CMC) via REST API if CMC is enabled.

---

## Alternative: REST API Approach (Backup)

If Zoom Apps proves too complex, a simpler REST API approach is possible:

- Use Server-to-Server OAuth (no marketplace approval)
- Dashboard API for participant list (requires Business plan)
- External web app that host accesses
- Host copies results to chat manually

**Trade-offs:** No in-meeting integration, requires Business plan, host must copy/paste results.

---

## Zoom Developer Account Setup

### Steps to Create Developer Account

1. Go to [marketplace.zoom.us](https://marketplace.zoom.us/)
2. Sign in with your organization's Zoom account
3. Navigate to **Develop** > **Build App**
4. Select **Zoom Apps** as app type
5. Configure app name, OAuth settings, and scopes

### Required Credentials

For Zoom Apps:
- **Client ID** - OAuth application identifier
- **Client Secret** - OAuth application secret
- **Account ID** - Your Zoom account identifier

### Required Permissions/Scopes

- `zoomapp:inmeeting` - In-meeting context
- `user:read` - Read user information

### No Marketplace Approval Required

For internal/organization apps, you can deploy without public marketplace review by keeping the app as "private" or "account-level."

---

## Cost Analysis

| Item | Cost |
|------|------|
| Zoom Developer Account | FREE |
| Creating Zoom Apps | FREE |
| API Usage | FREE (within rate limits) |
| Zoom Plan | Your existing plan works |
| Hosting | ~$0-20/month (Vercel, Netlify free tier) |

**Note:** REST API Dashboard endpoint requires Business plan. Zoom Apps SDK does NOT require Business plan.

---

## Next Steps

1. **Phase 0:** Set up Zoom Developer account and create Zoom App credentials
2. **Phase 2:** Design the architecture (React frontend + Node.js backend)
3. **Phase 3:** Implement using Zoom's sample app as starting point
4. **Phase 4:** Test in development environment
5. **Phase 5:** Deploy and install as account-level app

---

## Detailed Research Documents

- [research-zoom-apps.md](./research-zoom-apps.md) - Zoom Apps SDK deep dive
- [research-zoom-rest-api.md](./research-zoom-rest-api.md) - REST API analysis
- [research-zoom-bot.md](./research-zoom-bot.md) - Chatbot/Bot approaches
- [research-zoom-developer-setup.md](./research-zoom-developer-setup.md) - Developer account setup guide

---

## Recommendation

**Proceed with Zoom Apps SDK approach.**

This provides the best user experience with real-time participant access, native in-meeting integration, and straightforward internal deployment. The chat limitation is acceptable since the host can display results in the app panel and announce them verbally, or use the app invitation workaround.
