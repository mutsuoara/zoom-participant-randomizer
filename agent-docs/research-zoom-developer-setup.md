# Zoom Developer Account Setup - Research Documentation

**Last Updated:** January 2026
**Purpose:** Guide for setting up a Zoom Developer account and registering apps for the Zoom Participant Randomizer project

---

## Table of Contents
1. [Creating a Zoom Developer Account](#1-creating-a-zoom-developer-account)
2. [Account Types and Requirements](#2-account-types-and-requirements)
3. [How to Register/Create a New App](#3-how-to-registercreate-a-new-app)
4. [App Types Available](#4-app-types-available)
5. [Internal Apps: Process and Approval](#5-internal-apps-process-and-approval)
6. [Development vs Production Credentials](#6-development-vs-production-credentials)
7. [Costs and Rate Limits](#7-costs-and-rate-limits)

---

## 1. Creating a Zoom Developer Account

### Prerequisites
- An active Zoom account (free or paid)
- Appropriate permissions within your organization

### Step-by-Step Process

1. **Navigate to the Zoom App Marketplace**
   - Go to [marketplace.zoom.us](https://marketplace.zoom.us/)

2. **Sign In**
   - Click "Sign In" and use your existing Zoom account credentials
   - If you don't have a Zoom account, create one first at [zoom.us](https://zoom.us)

3. **Access Developer Tools**
   - Once signed in, hover over the "Develop" dropdown in the top-right corner
   - Select "Build App" to access the app creation interface

4. **Role Requirements**
   - To create apps, you need one of the following roles:
     - **Account Owner**
     - **Admin**
     - **"Zoom for developers" role** - This is enabled via: Zoom web portal > User Management > Roles > Role Settings > Advanced Features

### Developer Resources
- **Zoom Developer Platform:** [developers.zoom.us](https://developers.zoom.us)
- **Developer Documentation:** [developers.zoom.us/docs](https://developers.zoom.us/docs/)
- **Developer Forum:** [devforum.zoom.us](https://devforum.zoom.us/)

---

## 2. Account Types and Requirements

### Zoom Account Tiers

| Account Type | Rate Limits | Notes |
|--------------|-------------|-------|
| **Free/Basic** | Lower limits (see below) | Can use many API endpoints for free |
| **Pro** | Medium limits | Required for some endpoints (e.g., Create Users) |
| **Business+** | Higher limits | Includes Business, Enterprise, Education, Partners |

### Role-Based Permissions

For **Server-to-Server OAuth Apps**, additional permissions are required:
- Administrator must enable "View" and "Edit" permissions for developers
- Path: User Management > Roles > Role Settings > Advanced Features > Server-to-Server OAuth app

### Key Considerations
- Different pricing plans have different rate limits
- Some API endpoints require a Pro or higher plan (noted in "Prerequisites" on endpoint documentation)
- Rate limits are shared across all apps created on an account

---

## 3. How to Register/Create a New App

### General App Creation Process

1. **Log into Zoom App Marketplace**
   - Visit [marketplace.zoom.us](https://marketplace.zoom.us/)
   - Sign in with your Zoom credentials

2. **Navigate to Build App**
   - Click "Develop" dropdown (top-right)
   - Select "Build App"

3. **Choose App Type**
   - Select from available options:
     - General App (OAuth)
     - Server-to-Server OAuth App
     - Webhook Only

4. **Complete Basic Information**
   - Enter app name
   - Provide description
   - Add developer contact information (name and email - required for activation)
   - Select how the app will be managed (admin-managed or user-managed)

5. **Configure OAuth Settings** (for OAuth apps)
   - Provide redirect URL (required)
   - Optionally enable Strict Mode URL or Subdomain check
   - Add OAuth allow lists for approved redirect URLs

6. **Add Scopes**
   - Select required permissions/scopes for your app
   - Scopes define which API methods your app can call
   - The Zoom Security Review team evaluates scope requests based on necessity

7. **Test Your App**
   - Test locally using development credentials
   - Preview the Marketplace listing page

8. **Activate (for Server-to-Server OAuth)**
   - Address any activation errors
   - Note: You cannot generate access tokens until the app is activated

---

## 4. App Types Available

### Overview of App Types

| App Type | Use Case | User Interaction | Marketplace Required |
|----------|----------|------------------|---------------------|
| **General App (OAuth)** | External users, third-party integrations | Yes - user authorization | Yes (for sharing) |
| **Server-to-Server OAuth** | Internal automation, no user interaction | No | No |
| **Zoom Apps (SDK)** | Embedded apps within Zoom client | Yes | Yes (for distribution) |
| **Webhook Only** | Event notifications | No | No |

### Detailed Descriptions

#### Server-to-Server OAuth App
- **Best for:** Internal tools, backend integrations, automation
- **Authentication:** Account-level credentials (Account ID, Client ID, Client Secret)
- **Key feature:** Securely generates access tokens without user interaction
- **Approval:** Can be activated without marketplace publishing
- **Documentation:** [Server-to-Server OAuth docs](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)

#### General App (OAuth)
- **Best for:** Apps used by users outside your account, third-party integrations
- **Authentication:** User-level OAuth authorization
- **Key feature:** Users explicitly authorize access to their data
- **Management options:**
  - Admin-managed: Account admins control installation
  - User-managed: Individual users can install
- **Documentation:** [OAuth App docs](https://developers.zoom.us/docs/integrations/create/)

#### Zoom Apps (SDK)
- **Best for:** Apps that run inside the Zoom client during/outside meetings
- **Technology:** Embedded browser running webviews
- **Platforms:** Windows 7+, macOS 10.13+, iOS, Android
- **Key feature:** Transform the meeting experience with custom integrations
- **Documentation:** [Zoom Apps docs](https://developers.zoom.us/docs/zoom-apps/)

#### Webhook Only
- **Best for:** Receiving event notifications from Zoom
- **Key feature:** Subscribe to events (meeting started, participant joined, etc.)

### Which App Type to Choose?

**Choose Server-to-Server OAuth if:**
- Building internal tools for your organization
- No user interaction/authorization needed
- Automating account-level operations
- Accessing data for your own Zoom account only

**Choose OAuth (General App) if:**
- Building for users outside your Zoom account
- Need user-specific authorization
- Creating a third-party integration

**For the Zoom Participant Randomizer project:**
**Recommendation: Server-to-Server OAuth** - This allows automated access to meeting participant data without requiring individual user authorization, ideal for internal tools.

---

## 5. Internal Apps: Process and Approval

### Server-to-Server OAuth for Internal Use

**Good News:** Server-to-Server OAuth apps do NOT require Marketplace approval for internal use.

#### Process:
1. Create the app in the Zoom App Marketplace
2. Configure required scopes
3. Activate the app (no review needed)
4. Start using the API

#### Key Points:
- These are classified as "internal apps"
- Only accessible within your Zoom account
- Submitting for Zoom review is optional (only if you want review of scope usage)
- Can be activated immediately after configuration

### App Visibility Options

| Visibility | Marketplace Review | Who Can Use |
|------------|-------------------|-------------|
| **Private** | No | Only your account |
| **Beta** | No | Selected testers |
| **Public** | Yes | Anyone on Marketplace |
| **Unlisted** | Yes | Anyone with direct link |

### What Requires Marketplace Approval?

**Requires Review:**
- Public apps listed on Zoom App Marketplace
- Unlisted apps (available via direct link to anyone)

**Does NOT Require Review:**
- Private apps (internal use only)
- Beta apps (testing phase)
- Server-to-Server OAuth apps (for internal account use)

### Review Process (When Required)

If you do need to publish publicly:

1. **Submission Completeness & Branding**
   - Metadata accuracy verification
   - Technical documentation review
   - Compliance with Zoom branding guidelines

2. **Functionality & Usability**
   - App works as described
   - Installation and configuration tested
   - User experience evaluation

3. **Security Review**
   - Technical design assessment
   - OAuth scope evaluation (minimum necessary permissions)
   - OWASP Top 10 vulnerability testing

**Timeline:** Review duration varies based on app quality, feature complexity, and listing information quality. No specific timeline guaranteed.

**Hours:** Requests processed 9am-5pm Pacific Time, Monday-Friday (excluding US holidays)

---

## 6. Development vs Production Credentials

### Credential Types

The Zoom build flow automatically generates both development and production credentials.

#### Development Credentials
- **Use for:** Building, testing, local development
- **Environment:** Sandbox/testing
- **Access:** Only developers on your account
- **Reviewer access:** Used by Zoom to assess updates to already-published apps

#### Production Credentials
- **Use for:** Live/published applications
- **Environment:** Production
- **Access:** End users (if published)
- **Reviewer access:** Used by Zoom for first-time publish requests

### UI Organization

The Zoom Marketplace UI uses Development and Production filters:
- **Development fields:** Focus on app creation
- **Production fields:** Prepare apps for marketplace publishing

### Best Practices

1. Always use development credentials during testing
2. Never expose credentials in client-side code
3. Store credentials securely (environment variables, secrets manager)
4. Rotate credentials if compromised
5. Use different apps for different environments when possible

---

## 7. Costs and Rate Limits

### Developer Account Costs

**Creating apps is FREE.** There is no cost to:
- Create a Zoom developer account
- Register/create apps
- Use development credentials for testing

### API Rate Limits by Account Type

#### Free Plan
| API Category | Per Second | Per Day |
|--------------|------------|---------|
| Light APIs | 4 requests | 6,000 |
| Medium APIs | 2 requests | 2,000 |
| Heavy APIs | 1 request | 1,000 |
| Resource-intensive | 10/minute | 30,000 |

#### Pro Plan
| API Category | Per Second | Daily Cap |
|--------------|------------|-----------|
| Light APIs | 30 requests | - |
| Medium APIs | 20 requests | - |
| Heavy APIs | 10 requests | 30,000 combined |
| Resource-intensive | 10/minute | 30,000 combined |

#### Business+ Plan (Business, Enterprise, Education, Partners)
| API Category | Per Second | Daily Cap |
|--------------|------------|-----------|
| Light APIs | 80 requests | - |
| Medium APIs | 60 requests | - |
| Heavy APIs | 40 requests | 60,000 combined |
| Resource-intensive | 20/minute | 60,000 combined |

### Special User-Level Rate Limits
- Meeting/webinar creation or updates: **100 requests per day per user**
- Registration requests: **3 per day** for same registrant per meeting
- Registrant status updates: **10 per day** for same registrant per meeting

### Rate Limit Headers

When rate-limited (HTTP 429), check these response headers:
- `X-RateLimit-Reset`: When the limit resets
- `X-RateLimit-Remaining`: Requests remaining
- `Retry-After`: Seconds to wait before retrying

### SDK/Video Usage Costs

If using Zoom Video SDK (not standard APIs):
- SDK Universal Credit: All-in-one bundled solution
- After free minutes: $0.0035 per minute per participant

### Important Notes
- Rate limits are applied at the **account level**
- Limits are shared across **all apps** on an account
- Some endpoints require Pro or higher plan (check endpoint documentation)
- Consider using webhooks instead of polling to conserve API requests

---

## Quick Start for Zoom Participant Randomizer

### Recommended Setup

1. **App Type:** Server-to-Server OAuth
2. **Why:**
   - No user interaction needed
   - Internal tool for your organization
   - No marketplace approval required
   - Can access meeting participant data

### Required Scopes (Likely Needed)
- `meeting:read:admin` - Read meeting information
- `user:read:admin` - Read user information
- Possibly `meeting:read:list_participants` - List meeting participants

### Steps
1. Sign in to [marketplace.zoom.us](https://marketplace.zoom.us/)
2. Develop > Build App > Server-to-Server OAuth App
3. Name your app (e.g., "Participant Randomizer")
4. Copy credentials (Account ID, Client ID, Client Secret)
5. Add required scopes
6. Fill in app information
7. Activate the app
8. Start making API calls

---

## Sources

- [Zoom App Marketplace](https://marketplace.zoom.us/)
- [Zoom Developer Platform](https://developers.zoom.us)
- [Server-to-Server OAuth Documentation](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)
- [Create a Server-to-Server OAuth App](https://developers.zoom.us/docs/internal-apps/create/)
- [Create an OAuth App](https://developers.zoom.us/docs/integrations/create/)
- [Internal Apps Documentation](https://developers.zoom.us/docs/internal-apps/)
- [App Review Process](https://developers.zoom.us/docs/distribute/app-review-process/)
- [API Rate Limits](https://developers.zoom.us/docs/api/rate-limits/)
- [Zoom Apps SDK](https://developers.zoom.us/docs/zoom-apps/)
- [Build Flow Documentation](https://developers.zoom.us/docs/build-flow/)
- [Zoom Developer Forum](https://devforum.zoom.us/)
