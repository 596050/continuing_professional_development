# Ralph Fix Plan  - CPD/CE Concierge + Audit-Ready Tracker

## High Priority

### Phase 1: Foundation + Landing Page (MVP)
- [x] Initialize Next.js project in `webapp/` with Tailwind CSS
- [x] Initialize backend API (Next.js API routes)
- [x] Set up database schema (Prisma + SQLite with 12 models)
- [x] Build landing page (above-the-fold: headline, CTA, trust bar)
  - [x] Hero section with urgency badge (CFP 40h change 2027)
  - [x] TrustBar (audit-ready exports, reminders, evidence vault, compliance brief)
  - [x] WhatYouGet (6 deliverables in card grid)
  - [x] WhoThisIsFor (12 credentials across US/UK/AU/CA/SG/HK)
  - [x] HowItWorks (4-step vertical timeline)
  - [ ] Add per-segment landing pages (CFP, IAR, UK, AU, etc.)
- [x] Build pricing comparison section (DIY / Setup / Managed / Firm tiers)
  - [x] Connect pricing CTAs to Stripe checkout
- [x] Build "How it works" section (4-step flow)
- [x] Build FAQ section (8 expandable questions with compliance guardrails)
  - [ ] Add FAQ schema markup for SEO
- [x] Implement Stripe checkout integration (Tier 1: $149 one-time)
  - [x] Checkout page with plan selection
  - [x] Success/failure redirect pages
  - [x] Webhook handler for payment confirmation
- [x] Implement real auth (NextAuth.js)
  - [x] Email/password sign-up + login
  - [ ] Magic link option
  - [ ] SSO for firm tier
- [x] Build onboarding questionnaire (4-step wizard: About You, Credentials, Preferences, Review)
  - [x] Save answers to backend API
  - [ ] Trigger plan generation on submit
- [x] "Try Now" demo mode with feature flag (`NEXT_PUBLIC_DEMO_MODE`)
  - [x] Feature flag system (`src/lib/features.ts`)
  - [x] Mock user credentials (`DEMO_USER`)
  - [x] Try Now button in Nav + Hero
  - [x] Mock dashboard page (`/dashboard`)

### Phase 2: Requirements Engine + Dashboard
- [x] Build requirements database (CPD rules by credential and jurisdiction)
  - [x] US: CFP Board (25h/2yr → 40h/2yr from Q1 2027), ethics requirements
  - [x] US: FINRA (Regulatory Element + Firm Element)
  - [x] US: IAR/NASAA (state-by-state adoption tracker)
  - [x] UK: FCA (35h/year, 21 structured for retail investment)
  - [x] UK: CII/PFS membership CPD requirements
  - [x] UK: CISI membership CPD requirements
  - [x] AU: FASEA/ASIC (40h/year)
  - [x] CA: FP Canada (CFP: 25h/year, QAFP: 12h/year)
  - [x] SG: MAS (30h/year, 6h ethics + 8h rules & regs)
  - [x] HK: SFC (10h/year, 12h for Responsible Officers)
  - [x] Credential table with category constraints per jurisdiction
  - [x] Renewal period / reporting cycle logic
  - [x] Ethics / structured / verifiable / participatory tagging rules
  - [ ] Multi-credential support (user holds CFP + insurance)
- [x] Build "Your CPD Gap" calculator (required vs completed, by category)
- [ ] Generate 1-page compliance brief (PDF + dashboard view)
- [x] Build real user dashboard (replace mock)
  - [x] Real-time progress by category
  - [x] Deadline countdown with escalation reminders
  - [ ] Next actions panel
  - [x] Activity feed (recent completions)
- [ ] Multi-vertical requirement rules
  - [ ] Health: NMC 35h/3yr (20h participatory), GPhC revalidation, HCPC audit profiles
  - [ ] Engineering: IET 30h/year, Engineering Council mandatory recording, ICE competence-based
  - [ ] Legal: SRA continuing competence (reflection-based), CILEX 8h + professionalism
  - [ ] Chartered: ICAEW category-based, ACCA 40 units (21 verifiable), CIPD ~30h planned

### Phase 3: Tracking + Evidence Vault
- [x] Build CPD activity logging (auto + manual)
  - [ ] Auto-log from platform modules on completion
  - [x] Manual log for external activities (form + evidence upload)
  - [ ] Bulk import (CSV upload)
- [ ] Implement evidence upload (certificates, attendance records, reflections)
  - [ ] S3 storage with signed URLs
  - [ ] Auto file naming conventions
  - [ ] Metadata extraction (date, duration, learning outcome)
- [ ] Structured vs unstructured tagging (UK-specific)
- [ ] Verifiable vs non-verifiable tagging (ACCA/ICAEW)
- [ ] Participatory vs non-participatory tagging (NMC)
- [ ] Reflection / peer discussion entry workflows (GPhC, SRA)
- [ ] Certificate vault with metadata (date, duration, learning outcome)
- [ ] Build audit report export (PDF + CSV)
  - [ ] Credential-specific report templates
  - [ ] One-click export for all evidence
  - [ ] HCPC-style CPD profile builder
- [ ] Implement reminder system (email + calendar integration)
  - [ ] Email reminders (Resend/SendGrid)
  - [ ] .ics calendar invite generation
  - [ ] Escalation reminders near deadline

## Medium Priority

### Phase 4: Content Layer + Certificate Engine
- [ ] Content model (modules, webinars, articles with CPD metadata)
  - [ ] Learning objectives / outcomes fields
  - [ ] Duration / CPD minutes
  - [ ] Audience level tagging (intro/intermediate/advanced)
  - [ ] Provider / accreditation body linkage
  - [ ] "What changed / why it matters / what to do next" template
- [ ] Micro-module player (10-20 min video/text units)
- [ ] Live webinar scheduling + registration
- [ ] Assessment engine (quiz mechanic to unlock certificates)
  - [ ] Question bank per module
  - [ ] Pass threshold configuration
  - [ ] Retry logic
- [ ] Certificate generator (PDF: name, date, duration, outcomes, provider)
  - [ ] Template system (branded per provider/accreditor)
  - [ ] Auto-issue on quiz pass
  - [ ] Manual issue for webinar attendance
  - [ ] Certificate claiming as lead capture moment (name/email = certificate trail)
- [ ] Content editorial calendar tooling
- [ ] Accreditation relationship management (CII, CISI, etc.)

### Phase 5: Crawler + Data Pipeline
- [ ] Build crawler framework in `crawler/` (Puppeteer/Playwright)
- [ ] Crawl regulatory body pages for requirement updates
  - [ ] CFP Board announcements
  - [ ] FCA regulatory updates
  - [ ] NASAA state adoption tracker
  - [ ] FASEA/ASIC updates
  - [ ] NMC / GMC / GPhC / HCPC guidance changes
  - [ ] Engineering Council / IET updates
  - [ ] SRA / CILEX guidance changes
  - [ ] ICAEW / ACCA / CIPD / CMI / CIMA updates
- [ ] Build content aggregation pipeline (approved course providers)
- [ ] Deadline calendar generator by credential
- [ ] "State of CPD/CE" annual report generator
- [ ] CPD hours remaining calculator (embeddable widget for SEO)

### Phase 6: Firm Dashboard (B2B)
- [ ] Multi-tenancy (firm -> advisers)
- [ ] Seat management (users, roles, invitations)
- [ ] Compliance admin dashboard
- [ ] Per-adviser completion status views
- [ ] Audit report packs per adviser
- [ ] Policy templates + CPD policy acknowledgment tracking
- [ ] Consolidated billing (Stripe per-seat)

### Phase 6b: White-Label Platform
- [ ] Firm white-label configuration
  - [ ] Custom brand name, logo, colours (primary/secondary hex)
  - [ ] Custom domain support (e.g. cpd.zurich.co.uk) with SSL
  - [ ] Branded login/signup pages with firm identity
  - [ ] Remove AuditReadyCPD branding when white-label enabled
- [ ] White-label certificate engine
  - [ ] Firm-branded certificate PDF templates (logo, colours, firm name)
  - [ ] Certificate template builder (admin UI for firm to customise)
  - [ ] Co-branded certificates (firm + accreditation body)
  - [ ] Certificate serial numbers with firm prefix
  - [ ] Bulk certificate issuance for webinar attendance
- [ ] Firm API access
  - [ ] API key generation and management per firm
  - [ ] REST API for reading user CPD progress, certificates, analytics
  - [ ] Webhook endpoint configuration (real-time event push to firm systems)
  - [ ] Rate limiting and usage metering per API key
- [ ] Firm analytics dashboard
  - [ ] Total users, active users, completion rates
  - [ ] CPD hours by category breakdown (structured/unstructured/ethics)
  - [ ] Module completion funnel (started -> in progress -> completed -> certified)
  - [ ] User engagement metrics (login frequency, time on platform, pages visited)
  - [ ] Deadline compliance view (on track / at risk / overdue per user)
  - [ ] Export analytics as CSV/PDF reports
  - [ ] Scheduled analytics email (daily/weekly/monthly digest)

### Phase 6c: Usage Analytics System
- [ ] Per-user analytics tracking
  - [ ] Page view tracking (which pages, time on page, scroll depth)
  - [ ] Module engagement (start, pause, resume, complete timestamps)
  - [ ] Quiz attempt tracking (attempts, scores, pass/fail, time per question)
  - [ ] Certificate download/view events
  - [ ] Export/report generation events
  - [ ] Login/session tracking (frequency, duration, device type)
  - [ ] Onboarding funnel tracking (step completion, drop-off points)
  - [ ] Search/filter usage patterns
- [ ] Firm integration data sharing
  - [ ] Firm-specific tracking IDs (prefix-based, e.g. ZUR-00123)
  - [ ] Tracking ID assignment on user registration (auto or manual)
  - [ ] Tracking ID lookup API for firms to map to their internal systems
  - [ ] Real-time webhook events for: user registration, module completion, certificate issued, CPD hours logged, audit export generated
  - [ ] Batch data export API (daily/weekly aggregated user data)
  - [ ] SFTP/S3 data drop option for firms without API capability
  - [ ] Data format options: JSON, CSV, XML
  - [ ] PII handling: configurable data fields per firm (some firms want email, others just tracking ID)
  - [ ] GDPR/data processing agreement support per firm integration
- [ ] Analytics aggregation and reporting
  - [ ] Daily rollup job (aggregate events into summary tables)
  - [ ] Cohort analysis (users by signup date, plan, credential)
  - [ ] Retention metrics (30-day, 90-day, annual return rates)
  - [ ] Content performance metrics (which modules drive most completions)
  - [ ] A/B testing framework for onboarding and content paths

### Phase 7: Scripts + Analysis
- [ ] Build regulatory data scrapers in `scripts/`
- [ ] Content analysis pipeline (identify gaps in approved courses)
- [ ] Annual report data compiler
- [ ] Market participant content tracker (monitor what Aviva, L&G, Zurich, etc. publish)

## Low Priority

### Phase 8: Marketing + SEO Infrastructure
- [ ] Build SEO topic cluster pages per vertical
  - [ ] `/finance/cfp-ce/`
  - [ ] `/finance/iar-ce/`
  - [ ] `/finance/uk-adviser-cpd/`
  - [ ] `/health/nmc-revalidation/`
  - [ ] `/engineering/iet-cpd/`
  - [ ] `/legal/sra-competence/`
  - [ ] `/chartered/icaew-cpd/`
- [ ] Create 5 "answer pages" per vertical (high-intent search targets)
- [ ] Implement robots.txt (allow OAI-SearchBot)
- [ ] Add schema markup (FAQ, Organization, Course, Event)
- [ ] Build downloadable audit checklist (lead magnet)
- [ ] Build CPD policy template for firms (lead magnet)
- [ ] Set up Google Ads conversion tracking
- [ ] Set up retargeting pixel (Google + Meta)
- [ ] Email capture + nurture sequences

### Phase 9: Advanced Features
- [ ] Managed tier: monthly check-in email automation
- [ ] "Deadline rescue" sprint workflow
- [ ] CPD helpdesk (chat/email support interface)
- [ ] Knowledge base: "What counts?" articles per credential
- [ ] Office hours scheduling (group Q&A)
- [ ] Desktop/mobile notifications
- [ ] Submission concierge workflow (credential-specific)
- [ ] Annual CPD declaration support (pre-filled where possible)
- [ ] "CPD file" retention flywheel (Zurich pattern: people return to keep records in one place)

### Phase 10: Distribution Engine (Market Participant Pattern)
- [ ] Email list growth loops
  - [ ] Register for webinar -> capture
  - [ ] Claim certificate -> capture
  - [ ] Download guide + CPD questionnaire -> capture
- [ ] Retention loops
  - [ ] "New CPD module this week" email
  - [ ] "You're X hours short of structured CPD" nudge
  - [ ] "Export your CPD pack" quarterly reminder
- [ ] Content QA and compliance sign-off workflow
- [ ] Education vs promotion separation (governance)

## Completed
- [x] Project enabled for Ralph
- [x] Central README.md with full product spec, pricing, marketing plan
- [x] Project directory structure created (webapp/, backend/, crawler/, scripts/)
- [x] Agent instruction files created (CLAUDE.md, CODEX.md, GEMINI.md)
- [x] Next.js + Tailwind CSS webapp initialised
- [x] Landing page with all conversion sections (9 components)
- [x] Onboarding questionnaire (4-step wizard)
- [x] "Try Now" button with mock auth + feature flag
- [x] Mock dashboard (stats, activities, profile, deadlines, quick actions)
- [x] Feature flag system (src/lib/features.ts)
- [x] README.md updated with market participant analysis + multi-vertical expansion plan
- [x] Backend API (Next.js API routes) with Prisma + SQLite (12 models)
- [x] Auth system (NextAuth.js v5 - email/password sign-up + login)
- [x] Stripe checkout integration (one-time + subscription, webhook handler, success/cancel pages)
- [x] Onboarding wizard connected to backend API (upserts OnboardingSubmission)
- [x] Pricing CTAs wired to Stripe checkout (auth-gated)
- [x] Marketing outreach plan (MARKETING_OUTREACH.md - 24+ organisations)
- [x] White-label + usage analytics feature spec (Phase 6b, 6c in fix_plan)
- [x] Crawl sources specification (crawler/crawl-sources.ts - 34 sources, 153 URLs)
- [x] Credential database seeded (14 credentials: CFP, FINRA, IAR, FCA, CII/PFS, CISI, FASEA, FP Canada CFP/QAFP, MAS, SFC, NMC, ACCA, ICAEW)
- [x] Onboarding wizard wired to backend API (POST to /api/onboarding, creates UserCredential, redirects to dashboard)
- [x] Real dashboard with live DB data (GET /api/dashboard, progress bars, deadline countdown, CPD gap analysis)
- [x] CPD activity logging (POST /api/cpd-records, modal form with activity type/category/hours/provider)
- [x] CPD Gap calculator (GapBar component with colour-coded progress for total/ethics/structured hours)

## Next Sprint: "Audit-Ready MVP" (Evidence Vault + Export + Reminders)

This sprint delivers the core value proposition -- "audit-ready" -- making the product genuinely usable beyond tracking:

### Sprint Items
1. **Evidence upload** - file upload for certificates/attendance records
   - Local/S3 storage with signed URLs
   - Auto file naming conventions (credential_date_title.pdf)
   - Metadata fields (date, duration, learning outcome)
   - Link evidence to CPD records

2. **Audit report export** - PDF + CSV one-click export
   - Credential-specific report templates
   - Summary page + detailed activity log
   - Evidence inventory with file links
   - "Audit binder" ZIP export (report + all evidence files)

3. **Compliance brief PDF** - 1-page summary
   - Credential name, jurisdiction, requirements
   - Current progress (total, ethics, structured)
   - Deadline and gap analysis
   - Downloadable/shareable

4. **Email reminder system** - deadline and progress nudges
   - Resend/SendGrid integration
   - .ics calendar invite generation
   - Configurable reminder schedule (30d, 14d, 7d, 1d before deadline)
   - "You're X hours short" progress nudges

### Why This Sprint
- Completes the "audit-ready" promise (the product name)
- Removes the #1 barrier to paying: "Can I actually use this for my audit?"
- Evidence vault is the retention flywheel (people return to keep records in one place)
- Export + compliance brief are shareable proof of value (word-of-mouth driver)
- Reminders reduce churn by keeping users engaged between login sessions

## Notes
- **Guardrails are critical**: We do NOT complete coursework or assessments. We do NOT falsify logs. We provide admin support, planning, tracking, and audit packaging.
- Focus on Tier 1 (Setup) first  - impulse buy that proves demand
- Landing page conversion is priority #1 before building the full platform
- Copy the insurer pattern: Article/webinar -> quiz/attestation -> certificate -> vault (high leverage, low cost)
- Certificate claiming is simultaneously a lead capture moment and a compliance moment
- "CPD file/vault" concept is a retention flywheel (people return to keep records in one place)
- Split "consume content" and "request certificate" to reduce friction (Scottish Widows pattern)
- Calendar-first navigation is a simple retention mechanic (always an upcoming next event)
- Update this file after each major milestone
