# AWS Deployment Plan: Zoom Participant Randomizer

## Executive Summary

This document provides a comprehensive implementation plan for deploying the Zoom Participant Randomizer to AWS. Each decision includes specific reasoning to ensure maintainability and knowledge transfer.

---

## Table of Contents

1. [Architecture Decision Records](#1-architecture-decision-records)
2. [Infrastructure Overview](#2-infrastructure-overview)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [Workflow 1: AWS Account Setup](#workflow-1-aws-account-setup)
5. [Workflow 2: Codebase Preparation](#workflow-2-codebase-preparation)
6. [Workflow 3: Infrastructure Provisioning](#workflow-3-infrastructure-provisioning)
7. [Workflow 4: Application Deployment](#workflow-4-application-deployment)
8. [Workflow 5: Domain and SSL Configuration](#workflow-5-domain-and-ssl-configuration)
9. [Workflow 6: Zoom Marketplace Updates](#workflow-6-zoom-marketplace-updates)
10. [Workflow 7: Monitoring and Maintenance](#workflow-7-monitoring-and-maintenance)
11. [Cost Analysis](#cost-analysis)
12. [Rollback Procedures](#rollback-procedures)

---

## 1. Architecture Decision Records

### ADR-001: Why AWS Elastic Beanstalk over ECS/EC2/Lambda

| Option | Considered | Decision |
|--------|------------|----------|
| **EC2 (Raw)** | Full control, manual scaling | ❌ Rejected - Too much operational overhead |
| **ECS/Fargate** | Container orchestration | ❌ Rejected - Overkill for single-app deployment |
| **Lambda** | Serverless, pay-per-use | ❌ Rejected - Sessions don't persist across invocations |
| **Elastic Beanstalk** | Managed PaaS | ✅ Selected |

**Reasoning:**
1. **Zero code changes required** - EB runs Node.js apps as-is with `npm start`
2. **Managed infrastructure** - AWS handles OS patching, scaling policies, load balancing
3. **Built-in monitoring** - CloudWatch integration without additional setup
4. **Easy rollback** - EB maintains deployment history for instant rollbacks
5. **Cost-effective** - Single t3.micro instance sufficient for internal org use
6. **Session persistence** - Unlike Lambda, the Express server stays running, maintaining in-memory sessions

---

### ADR-002: Why Single Instance over Load-Balanced Environment

| Option | Considered | Decision |
|--------|------------|----------|
| **Load-balanced** | Multiple instances, high availability | ❌ Rejected for initial deployment |
| **Single instance** | One EC2, simpler architecture | ✅ Selected |

**Reasoning:**
1. **Session simplicity** - In-memory sessions work without Redis
2. **Cost optimization** - ~$10/month vs ~$30/month for load-balanced
3. **Sufficient for use case** - Internal org tool doesn't need 99.99% uptime
4. **Easy upgrade path** - Can migrate to load-balanced later if needed
5. **Zoom App context** - App runs inside Zoom client; traffic is inherently limited

**Future consideration:** If scaling is needed, add ElastiCache Redis for sessions and switch to load-balanced environment.

---

### ADR-003: Why CloudFront over Direct Elastic Beanstalk Access

| Option | Considered | Decision |
|--------|------------|----------|
| **Direct EB URL** | Simple, no CDN | ❌ Rejected |
| **CloudFront + EB** | CDN, custom domain, SSL | ✅ Selected |

**Reasoning:**
1. **Custom domain requirement** - Zoom needs a professional URL, not `*.elasticbeanstalk.com`
2. **Free SSL** - ACM certificates are free when used with CloudFront
3. **HTTPS enforcement** - CloudFront handles SSL termination
4. **Caching** - Static assets (JS/CSS) cached at edge locations
5. **Security** - Can add WAF rules if needed later
6. **Zoom compliance** - Professional URL improves trust for OAuth consent screen

---

### ADR-004: Why In-Memory Sessions over Redis (Initially)

| Option | Considered | Decision |
|--------|------------|----------|
| **Redis (ElastiCache)** | Distributed sessions | ❌ Rejected for MVP |
| **DynamoDB** | Serverless session store | ❌ Rejected - Overkill |
| **In-memory** | Built into express-session | ✅ Selected |

**Reasoning:**
1. **Single instance deployment** - No need for distributed sessions
2. **Cost savings** - ElastiCache minimum ~$12/month
3. **Simplicity** - No additional infrastructure to manage
4. **Acceptable trade-off** - Server restart clears sessions (users re-auth)
5. **Session lifetime is short** - OAuth tokens are the real state (stored per request)

**Trade-off acknowledged:** Server deployments will log out active users. Acceptable for internal tool with small user base.

---

### ADR-005: Why No Database (Initially)

| Option | Considered | Decision |
|--------|------------|----------|
| **RDS PostgreSQL** | Persistent token storage | ❌ Rejected for MVP |
| **DynamoDB** | Serverless database | ❌ Rejected for MVP |
| **No database** | Stateless operation | ✅ Selected |

**Reasoning:**
1. **Current app is stateless** - No data persistence required by design
2. **OAuth tokens in session** - Sufficient for single-session use
3. **Cost savings** - RDS minimum ~$15/month
4. **"Fire and forget" requirement** - User specified no history needed
5. **Can add later** - If analytics/history needed, add DynamoDB

---

## 2. Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐                                                         │
│    │   Route 53   │  DNS: zoom-randomizer.yourdomain.com                    │
│    │    (DNS)     │  A Record → CloudFront Distribution                     │
│    └──────┬───────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│    ┌──────────────┐     ┌─────────────────┐                                 │
│    │  CloudFront  │◄────│  ACM Certificate │  SSL/TLS Termination           │
│    │    (CDN)     │     │     (Free)       │  HTTPS Enforcement             │
│    └──────┬───────┘     └─────────────────┘                                 │
│           │                                                                  │
│           │  Origin: EB Environment URL                                      │
│           ▼                                                                  │
│    ┌──────────────────────────────────────┐                                 │
│    │       Elastic Beanstalk              │                                 │
│    │  ┌────────────────────────────────┐  │                                 │
│    │  │      EC2 Instance (t3.micro)   │  │                                 │
│    │  │  ┌──────────────────────────┐  │  │                                 │
│    │  │  │     Node.js 20 LTS       │  │  │                                 │
│    │  │  │  ┌────────────────────┐  │  │  │                                 │
│    │  │  │  │   Express Server   │  │  │  │                                 │
│    │  │  │  │                    │  │  │  │                                 │
│    │  │  │  │  /api/*  → Routes  │  │  │  │                                 │
│    │  │  │  │  /*      → Static  │  │  │  │                                 │
│    │  │  │  │          (React)   │  │  │  │                                 │
│    │  │  │  └────────────────────┘  │  │  │                                 │
│    │  │  └──────────────────────────┘  │  │                                 │
│    │  └────────────────────────────────┘  │                                 │
│    └──────────────────────────────────────┘                                 │
│                       │                                                      │
│                       ▼                                                      │
│    ┌──────────────────────────────────────┐                                 │
│    │           CloudWatch                  │                                 │
│    │    Logs, Metrics, Alarms             │                                 │
│    └──────────────────────────────────────┘                                 │
│                                                                              │
│    External Services:                                                        │
│    ┌──────────────┐                                                         │
│    │  Zoom APIs   │  OAuth, Apps SDK                                        │
│    └──────────────┘                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Pre-Deployment Checklist

### AWS Account Requirements
- [ ] AWS account with admin access
- [ ] AWS CLI installed and configured
- [ ] EB CLI installed (`pip install awsebcli`)
- [ ] Credit card on file (for any charges beyond free tier)

### Domain Requirements
- [ ] Domain name decided (e.g., `zoom-randomizer.yourcompany.com`)
- [ ] Access to DNS management (Route 53 or external)

### Code Requirements
- [ ] All code committed to GitHub
- [ ] Application runs locally without errors
- [ ] Environment variables documented

### Zoom Requirements
- [ ] Current Zoom App credentials available
- [ ] Access to Zoom Marketplace developer dashboard

---

## Workflow 1: AWS Account Setup

### Step 1.1: Verify AWS CLI Configuration

**Command:**
```bash
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

**If not configured:**
```bash
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

**Why us-east-1?**
- ACM certificates for CloudFront MUST be in us-east-1
- Simplifies architecture by keeping everything in one region
- Generally has the best service availability

---

### Step 1.2: Install Elastic Beanstalk CLI

**Command:**
```bash
pip install awsebcli --upgrade
eb --version
```

**Expected Output:**
```
EB CLI 3.x.x (Python 3.x.x)
```

---

### Step 1.3: Create IAM Role for Elastic Beanstalk (If Not Exists)

**Why needed:** EB needs permissions to create EC2 instances, security groups, etc.

**Command:**
```bash
# Check if service role exists
aws iam get-role --role-name aws-elasticbeanstalk-service-role 2>/dev/null

# If it doesn't exist, EB CLI will create it automatically during `eb create`
```

---

## Workflow 2: Codebase Preparation

### Step 2.1: Update Root package.json

**File:** `/package.json`

**Why:** Elastic Beanstalk needs a single entry point. We'll build frontend, copy to backend, and serve everything from Express.

```json
{
  "name": "zoom-participant-randomizer",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "build": "npm run build:frontend && npm run build:backend",
    "start": "cd backend && node dist/index.js",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Reasoning:**
- `engines.node` ensures EB uses Node.js 20
- `build` script creates production bundles
- `start` script is what EB will run
- Single `npm start` entry point simplifies deployment

---

### Step 2.2: Update Backend for Production Static Serving

**File:** `/backend/src/index.ts`

**Current code (already correct):**
```typescript
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}
```

**Why this works:**
- In production, Express serves the built React app
- API routes (`/api/*`) are handled first (defined earlier in code)
- All other routes fall through to React's `index.html` (SPA routing)

---

### Step 2.3: Create Elastic Beanstalk Configuration

**File:** `/.ebextensions/01_node.config`

```yaml
option_settings:
  # Use Node.js 20
  aws:elasticbeanstalk:container:nodejs:
    NodeVersion: 20

  # Environment type
  aws:elasticbeanstalk:environment:
    EnvironmentType: SingleInstance

  # Instance type (free tier eligible)
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.micro

  # Health check path
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /api/health
    MatcherHTTPCode: 200
```

**Why these settings:**
- `SingleInstance` - No load balancer needed, reduces cost
- `t3.micro` - Free tier eligible, sufficient for internal app
- `HealthCheckPath` - EB monitors app health via this endpoint

---

### Step 2.4: Create Procfile

**File:** `/Procfile`

```
web: npm start
```

**Why needed:**
- Tells EB exactly how to start the application
- Explicit is better than implicit

---

### Step 2.5: Create .ebignore File

**File:** `/.ebignore`

```
# Dependencies (installed on EB)
node_modules/
frontend/node_modules/
backend/node_modules/

# Development files
.env
.env.local
*.log

# Git
.git/
.gitignore

# IDE
.idea/
.vscode/

# OS
.DS_Store
Thumbs.db

# Build artifacts (rebuilt on EB)
frontend/dist/
backend/dist/

# Documentation (not needed in deployment)
agent-docs/
*.md
!README.md

# Screenshots
*.png
*.jpg

# Local development
.claude/
```

**Why ignore these:**
- `node_modules` - Reinstalled via `npm install` on EB
- `dist` folders - Rebuilt via `npm run build` on EB
- `.env` - Environment variables set in EB console (security)
- `agent-docs` - Not needed in production, saves deployment size

---

### Step 2.6: Update Backend package.json

**File:** `/backend/package.json`

**Add/verify these scripts:**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

---

### Step 2.7: Create Production Environment Template

**File:** `/.env.production.example`

```bash
# ===========================================
# PRODUCTION ENVIRONMENT VARIABLES
# ===========================================
# Copy these to Elastic Beanstalk Environment Properties
# DO NOT commit actual values to git
# ===========================================

# Zoom App Credentials (from Zoom Marketplace)
ZOOM_CLIENT_ID=your_production_client_id
ZOOM_CLIENT_SECRET=your_production_client_secret

# Application URLs (replace with your domain)
ZOOM_REDIRECT_URL=https://zoom-randomizer.yourdomain.com/api/auth/callback
ZOOM_HOME_URL=https://zoom-randomizer.yourdomain.com
FRONTEND_URL=https://zoom-randomizer.yourdomain.com

# Server Configuration
NODE_ENV=production
PORT=8080
SESSION_SECRET=generate-64-char-random-string-here

# ===========================================
# Generate SESSION_SECRET with:
# openssl rand -hex 32
# ===========================================
```

**Why PORT=8080:**
- Elastic Beanstalk's nginx proxy expects the app on port 8080 by default
- This is configured automatically, but explicit is better

---

## Workflow 3: Infrastructure Provisioning

### Step 3.1: Initialize Elastic Beanstalk Application

**Commands:**
```bash
cd /Users/tony.arashiro/Documents/Agile-6/enterprise_automation_requests/zoom_participant_randomizer

# Initialize EB application
eb init

# Interactive prompts:
# 1. Select region: us-east-1
# 2. Application name: zoom-participant-randomizer
# 3. Platform: Node.js
# 4. Platform branch: Node.js 20
# 5. SSH: Yes (for debugging access)
# 6. Keypair: Create new or select existing
```

**Why these choices:**
- `us-east-1` - Required for ACM/CloudFront integration
- `Node.js 20` - LTS version, matches local development
- `SSH enabled` - Allows debugging if deployment issues occur

---

### Step 3.2: Create Elastic Beanstalk Environment

**Command:**
```bash
eb create zoom-randomizer-prod \
  --single \
  --instance-type t3.micro \
  --region us-east-1
```

**Flags explained:**
- `--single` - Single instance (no load balancer)
- `--instance-type t3.micro` - Free tier eligible
- `--region us-east-1` - Same region as ACM certificate

**Expected output:**
```
Creating application version archive "app-xxxxx-xxxxxx".
Uploading zoom-participant-randomizer/app-xxxxx-xxxxxx.zip to S3.
Creating environment zoom-randomizer-prod...
... (several minutes of provisioning)
Successfully launched environment: zoom-randomizer-prod
```

---

### Step 3.3: Set Environment Variables

**Command:**
```bash
eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  ZOOM_CLIENT_ID=ADCP8FmhS6OUSht0_WIrIw \
  ZOOM_CLIENT_SECRET=your_actual_secret \
  ZOOM_REDIRECT_URL=https://your-eb-url.elasticbeanstalk.com/api/auth/callback \
  ZOOM_HOME_URL=https://your-eb-url.elasticbeanstalk.com \
  FRONTEND_URL=https://your-eb-url.elasticbeanstalk.com \
  SESSION_SECRET=$(openssl rand -hex 32)
```

**Security note:** We'll update these URLs after setting up CloudFront with custom domain.

**Why set via CLI:**
- Environment variables in EB are encrypted at rest
- Not stored in code repository
- Can be changed without redeployment

---

### Step 3.4: Verify Deployment

**Commands:**
```bash
# Check environment status
eb status

# Open in browser
eb open

# View logs if issues
eb logs
```

**Expected:** App loads at `http://zoom-randomizer-prod.us-east-1.elasticbeanstalk.com`

**Note:** The app won't fully work yet because:
1. Zoom OAuth requires HTTPS
2. URLs in Zoom Marketplace need updating

---

## Workflow 4: Application Deployment

### Step 4.1: Build and Deploy

**Commands:**
```bash
# Build locally first to verify
npm run build

# Deploy to Elastic Beanstalk
eb deploy
```

**What happens during `eb deploy`:**
1. EB CLI creates a ZIP of your code (respecting `.ebignore`)
2. ZIP uploaded to S3
3. EB downloads ZIP to EC2 instance
4. Runs `npm install`
5. Runs `npm run build` (if postinstall script exists)
6. Runs `npm start`

---

### Step 4.2: Verify Health Check

**Command:**
```bash
curl http://zoom-randomizer-prod.us-east-1.elasticbeanstalk.com/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2024-01-09T..."}
```

---

## Workflow 5: Domain and SSL Configuration

### Step 5.1: Request SSL Certificate (ACM)

**AWS Console Steps:**
1. Go to **AWS Certificate Manager** (must be in us-east-1)
2. Click **Request a certificate**
3. Select **Request a public certificate**
4. Enter domain: `zoom-randomizer.yourdomain.com`
5. Select validation method: **DNS validation** (recommended)
6. Click **Request**

**Why DNS validation:**
- No email required
- Certificate auto-renews
- Works with any DNS provider

---

### Step 5.2: Validate Certificate

**If using Route 53:**
- Click **Create records in Route 53** (automatic)

**If using external DNS (Cloudflare, etc.):**
1. Copy the CNAME record name and value from ACM
2. Add CNAME record in your DNS provider
3. Wait for validation (usually 5-30 minutes)

---

### Step 5.3: Create CloudFront Distribution

**AWS Console Steps:**

1. Go to **CloudFront** → **Create Distribution**

2. **Origin Settings:**
   - Origin domain: `zoom-randomizer-prod.us-east-1.elasticbeanstalk.com`
   - Protocol: HTTP only (EB doesn't have SSL)
   - HTTP Port: 80

3. **Default Cache Behavior:**
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
   - Cache policy: **CachingDisabled** (for dynamic content)
   - Origin request policy: **AllViewer**

4. **Settings:**
   - Alternate domain name (CNAME): `zoom-randomizer.yourdomain.com`
   - Custom SSL certificate: Select your ACM certificate
   - Default root object: (leave empty)

5. Click **Create Distribution**

**Why these settings:**
- `Redirect HTTP to HTTPS` - Zoom requires HTTPS
- `CachingDisabled` - App is dynamic, shouldn't cache API responses
- `AllViewer` - Forward all headers to origin (needed for sessions)
- All HTTP methods - Needed for OAuth POST requests

---

### Step 5.4: Configure DNS

**Add DNS Record:**
- Type: **CNAME** (or A with Alias if Route 53)
- Name: `zoom-randomizer`
- Value: CloudFront distribution domain (e.g., `d1234567890.cloudfront.net`)

**Wait for propagation:** 5-15 minutes

---

### Step 5.5: Update Environment Variables with Final Domain

**Command:**
```bash
eb setenv \
  ZOOM_REDIRECT_URL=https://zoom-randomizer.yourdomain.com/api/auth/callback \
  ZOOM_HOME_URL=https://zoom-randomizer.yourdomain.com \
  FRONTEND_URL=https://zoom-randomizer.yourdomain.com
```

---

## Workflow 6: Zoom Marketplace Updates

### Step 6.1: Update OAuth Redirect URL

1. Go to **Zoom Marketplace** → Your App → **App Credentials**
2. Update **OAuth Redirect URL**: `https://zoom-randomizer.yourdomain.com/api/auth/callback`
3. Update **OAuth Allow List**: Add `zoom-randomizer.yourdomain.com`

---

### Step 6.2: Update Home URL

1. Go to **Features** section
2. Update **Home URL**: `https://zoom-randomizer.yourdomain.com`

---

### Step 6.3: Update Domain Allow List

1. Go to **Features** → **Zoom App SDK**
2. Add domain: `zoom-randomizer.yourdomain.com`

---

### Step 6.4: Re-authorize App

1. Go to **Local Test**
2. Click **Add App Now** to re-authorize with new URLs
3. Test in Zoom client

---

## Workflow 7: Monitoring and Maintenance

### Step 7.1: Set Up CloudWatch Alarms

**Create alarm for unhealthy environment:**

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "ZoomRandomizer-EnvironmentHealth" \
  --metric-name EnvironmentHealth \
  --namespace AWS/ElasticBeanstalk \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThan \
  --dimensions Name=EnvironmentName,Value=zoom-randomizer-prod \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT:alerts
```

---

### Step 7.2: View Logs

**Commands:**
```bash
# Stream logs in real-time
eb logs --stream

# Download all logs
eb logs --all
```

---

### Step 7.3: SSH into Instance (Debugging)

**Command:**
```bash
eb ssh
```

---

## Cost Analysis

### Monthly Cost Breakdown (After Free Tier)

| Service | Usage | Cost |
|---------|-------|------|
| EC2 t3.micro | 730 hours | ~$8.50 |
| CloudFront | 10GB transfer | ~$0.85 |
| Route 53 | 1 hosted zone | $0.50 |
| ACM | SSL Certificate | FREE |
| S3 (EB artifacts) | <1GB | ~$0.02 |
| **Total** | | **~$10/month** |

### Free Tier (First 12 Months)

| Service | Free Allocation |
|---------|-----------------|
| EC2 t3.micro | 750 hours/month |
| CloudFront | 1TB transfer + 10M requests |
| S3 | 5GB storage |

**First year cost: ~$0.50/month** (Route 53 only)

---

## Rollback Procedures

### Rollback to Previous Version

```bash
# List application versions
eb appversion

# Deploy specific version
eb deploy --version app-xxxxx-xxxxxx
```

### Emergency: Terminate Environment

```bash
# Terminate (destroys all resources)
eb terminate zoom-randomizer-prod

# Re-create from scratch
eb create zoom-randomizer-prod --single --instance-type t3.micro
```

---

## Appendix: Quick Reference Commands

```bash
# Deploy latest code
eb deploy

# View environment status
eb status

# Open app in browser
eb open

# View logs
eb logs

# SSH into instance
eb ssh

# Set environment variable
eb setenv KEY=value

# View current environment variables
eb printenv

# Scale to multiple instances (upgrade)
eb scale 2

# Switch to load-balanced (upgrade)
eb upgrade
```

---

## Next Steps After Deployment

1. [ ] Create app logo (160x160px PNG)
2. [ ] Upload logo to Zoom Marketplace
3. [ ] Test with multiple users
4. [ ] Document internal usage instructions
5. [ ] Set up monitoring alerts
6. [ ] Schedule regular security reviews
