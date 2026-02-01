# AuditReadyCPD

A CPD (Continuing Professional Development) tracking, compliance, and certification platform for regulated professionals: financial advisers, accountants, healthcare practitioners, engineers, and legal professionals.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** NextAuth.js v5 (JWT sessions, Credentials provider)
- **Database:** SQLite via Prisma 7 + `@prisma/adapter-libsql`
- **Styling:** Tailwind CSS 4 with custom `@theme` variables
- **Testing:** Vitest (584 integration tests across 111 test sections)
- **Payments:** Stripe (checkout + webhooks)
- **PDF:** PDFKit for audit reports and certificates
- **Email:** Nodemailer with HTML/text templates
- **Validation:** Zod schemas (28 schemas) for all API input
- **Storage:** Abstraction layer (local filesystem / S3-compatible)

## Quick Start

```bash
npm install
npx prisma db push
npm run dev     # dev server at localhost:3000
npm run build   # vitest run && next build
```

## Project Structure

```
src/
  app/
    api/              # 58 API routes
      activities/     # CRUD + publish workflow + credit mappings
      allocations/    # multi-credential hour allocation
      auth/           # signup, forgot-password, reset-password, verify-email
      certificates/   # CRUD + verify + download + export + batch
      checkout/       # Stripe checkout session
      completion/     # completion rules + evaluation
      cpd-records/    # CRUD for CPD activity records
      cron/           # automated deadline scanning + reminder delivery
      dashboard/      # aggregation endpoint
      evidence/       # upload + CRUD + strength auto-detection + batch extraction
      export/         # audit-report (PDF), audit-csv, compliance-brief, audit-pack (ZIP)
      firm/           # firm admin dashboard API
      ingest/         # email forwarding ingestion addresses
      notifications/  # in-app notification system
      onboarding/     # wizard submission
      provider/       # firm reporting + verified completion events
      push/           # push notification subscription management
      quizzes/        # CRUD + attempt submission + grading
      recommendations/# smart gap analysis + activity suggestions
      reminders/      # CRUD + .ics calendar export
      rule-packs/     # credential rule versioning + resolution
      settings/       # profile + password + notification preferences
      transcripts/    # transcript import hub + parsers
      webhooks/       # Stripe webhook handler
    activities/       # activity catalog + admin pages
    auth/             # signin, signup, forgot-password, reset-password
    billing/          # plan management + Stripe checkout
    checkout/         # success + cancel pages
    dashboard/        # main dashboard + firm admin + transcript import
    evidence/         # evidence inbox + management
    onboarding/       # 4-step onboarding wizard
    quizzes/          # quiz list + quiz player
    reminders/        # reminder management
    settings/         # profile + credentials + integrations + security
    verify/           # public certificate verification
    */loading.tsx      # 7 loading.tsx route loading states
  components/
    ui/               # 23 components (Button, Modal, Card, Badge, Skeleton, etc.)
  lib/                # auth, db, email, storage, rate-limit, PDF, parsers, push, extract, deadline-scanner
  __tests__/          # 584 integration tests + 15 state helpers
```

## Current Status (All PRDs Implemented)

- ~573 integration tests passing across 110 test sections
- 15 user state helpers for testing
- 14 pages, 58 API routes, 25 UI components
- All 9 PRDs fully implemented

### Core Platform
- Full CRUD for all entities (CPD records, evidence, certificates, quizzes, reminders)
- Platform record immutability (quiz-generated records cannot be edited/deleted)
- Certificate soft-delete (revocation instead of hard delete)
- Quiz engine with auto-grading, attempt limiting, and auto-certificate generation
- PDF audit reports, CSV exports, .ics calendar files

### PRD Features
- **Evidence Inbox** (PRD-001): Upload without linking, classify, assign to records, create records from evidence
- **Transcript Import Hub** (PRD-002): Parsers for CFP Board, FinPro, Sircon, CE Broker, CME, NABP, Open Badges, generic CSV
- **Audit Pack 2.0** (PRD-003): ZIP export with evidence strength scoring (manual_only → url_only → certificate_attached → provider_verified)
- **Rule Pack Versioning** (PRD-004): Date-effective rule resolution per credential
- **Multi-Credential Allocation** (PRD-005): Split hours across credentials with allocation UI
- **Email Forwarding** (PRD-006): Unique ingestion addresses per user, webhook endpoint
- **Provider Verified Events** (PRD-007): API key auth, idempotent completion events
- **Certificate Registry** (PRD-008): QR codes on PDFs, batch verification, public verification page
- **Open Badges Import** (PRD-009): JSON-LD assertion parsing on import page

### Operations & Polish
- **Authentication hardening**: Rate limiting, email verification, password reset flow
- **Notification system**: In-app notifications with bell icon dropdown
- **Firm admin dashboard**: Member progress tracking, compliance stats, seat management
- **Billing page**: Plan display, Stripe checkout for upgrades
- **Activity catalog**: Browse, search, filter; admin page for create/publish
- **Mobile responsiveness**: Hamburger menu, responsive layouts
- **Email delivery**: Nodemailer with deadline reminders, import confirmations, certificate notifications
- **Storage abstraction**: Local filesystem (dev) + S3-compatible (production)
- **Zod schema validation**: 28 schemas covering all API inputs
- **Security headers**: CSP, X-Frame-Options, HSTS, X-Content-Type-Options via middleware
- **Health check**: Liveness probe at /api/health with DB connectivity verification
- **Dark mode**: Tailwind CSS 4 dark variant with localStorage persistence
- **GDPR data export**: Full user data download at /api/settings/export
- **Database indexes**: Composite indexes on CpdRecord, Evidence, QuizAttempt
- **Custom error pages**: 404 and 500 error pages with dark mode support
- **ARIA accessibility attributes**: All UI components include proper ARIA roles, labels, and states
- **Rate limiting**: 15 mutation endpoints with configurable limits
- **Standardized auth pattern**: requireAuth/requireRole across all 34 protected routes
- **Production config**: Lazy Stripe init, configurable DATABASE_PATH, standalone output
- **Route-level loading states**: loading.tsx skeletons for 7 page groups

---

# Market Research: Feature Opportunities

## What Became "Systemic" Across Regulated Professions

Across multiple regulated industries, the features that became centralized are:

1. **A transcript / compliance view**
2. **Automatic posting/reporting of completions from providers**
3. **A self-report fallback for anything not automatically posted**
4. **One-click export / audit pack**

This pattern is visible across CE Broker (500+ professions, 90M+ completions), IAR CE transcripts in FinPro (FINRA), CFP Board sponsor reporting, Sircon insurance CE transcripts, ACCME CME Passport, AMA Ed Hub, and NABP CPE Monitor.

**Conclusion:** The "killer app" is not a library of courses. It is the **credit wallet + transcript + evidence + reporting** layer. Content is optional; proof is mandatory.

## Ranked Feature Opportunities

Scored 1-5 for Crossover / User Value / Marketing Clarity / Adoption Friction:

| Rank | Feature | Cross | Value | Mktg | Adopt | Total |
|------|---------|-------|-------|------|-------|-------|
| 1 | Evidence Inbox ("Never lose a certificate") | 5 | 5 | 5 | 5 | 20 |
| 2 | Transcript imports from official hubs | 5 | 5 | 5 | 4 | 19 |
| 3 | Rules engine: effective dates + multi-credential allocation | 5 | 5 | 4 | 4 | 18 |
| 4 | Audit Pack 2.0: ZIP + evidence-strength scoring | 5 | 4 | 5 | 5 | 19 |
| 5 | Email forwarding + attachment parsing | 5 | 4 | 5 | 5 | 19 |
| 6 | Provider verified completion events | 4 | 4 | 4 | 3 | 15 |
| 7 | Approved-course finder + gap fill recommendations | 4 | 4 | 5 | 3 | 16 |
| 8 | Digital credential import (Open Badges) | 5 | 3 | 3 | 3 | 14 |

## The "Killer App" Feature Set (End State)

1. **Meta-transcript:** import official posted credits + unify in one wallet
2. **Evidence Inbox:** auto-capture certificates (upload, email forward, browser downloads)
3. **Rule-aware gap engine:** tells you exactly what counts, by date-effective rules
4. **Audit Pack:** one click, defensible bundle (transcript + evidence + provenance)
5. **Verified layer:** providers can mark completions verified via lightweight events
6. **Firm view:** compliance dashboard + risk scoring + exports per adviser

---

# Product Backlog (PRDs)

## Implementation Order

| Sprint | Priority | PRDs | Focus |
|--------|----------|------|-------|
| 1-2 | P0 | PRD-001, PRD-003 | Evidence Inbox + Audit Pack ZIP |
| 3-4 | P0 | PRD-004, PRD-005 | Rule pack versioning + multi-credential allocation |
| 5 | P1 | PRD-006 | Email forwarding ingestion |
| 6-7 | P1 | PRD-002, PRD-007 | Transcript imports + provider verified events |
| 8+ | P2 | PRD-008, PRD-009 | Course finder + digital badges + integrations |

---

## PRD-001: Evidence Inbox (Unassigned Evidence Queue) ✅ DONE

### Problem
Users lose certificates. Evidence exists before CPD records are created. No staging area for "I have proof but haven't logged it yet."

### User Stories
- Upload evidence without linking to a CPD record (goes to Inbox)
- "File" evidence into an existing record or create a new record from it
- Search/filter evidence by date, provider, type, credential
- "Create CPD record from evidence" pre-fills title, date, hours, provider from filename/extracted text

### Schema Changes
```
Evidence model additions:
  kind    String @default("unknown")  // certificate | transcript | agenda | screenshot | other
  status  String @default("inbox")    // inbox | assigned | deleted
  extracted Json?                     // best-effort metadata extraction
```

### API Changes
- `POST /api/evidence` - allow missing cpdRecordId (status=inbox)
- `GET /api/evidence?status=inbox` - inbox listing
- `PATCH /api/evidence/:id` - assign to record, update kind/extracted

### UI
- `/dashboard/evidence` - Evidence Inbox page
  - EvidenceInboxList, EvidencePreviewPanel
  - AssignToRecordModal, CreateRecordFromEvidenceModal
- Dashboard sidebar badge: "Evidence Inbox (N)"

---

## PRD-002: Transcript Import Hub (File-Based Connectors) ✅ DONE

### Problem
Users' official credits live in external systems (FinPro, CFP Board, Sircon, CME Passport). No way to consolidate.

### User Stories
- Select a source (e.g., "IAR CE / FinPro transcript") and upload PDF/CSV export
- System parses transcript and shows review screen before importing
- Map imported items to credentials; duplicates detected on re-import

### Supported Sources (Launch)
- IAR CE transcript (FinPro export)
- CFP Board CE summary/certificate bundle
- Insurance CE transcript (Sircon/Vertafore)
- (Expansion) CME Passport, CPE Monitor

### Schema Changes
```
model ExternalTranscriptSource {
  id        String @id @default(cuid())
  code      String @unique  // FINPRO_IAR_CE, CFP_BOARD, SIRCON_CE
  name      String
}

model ExternalTranscriptImport {
  id          String @id @default(cuid())
  userId      String
  sourceId    String
  evidenceId  String
  status      String @default("parsed")  // uploaded | parsed | needs_review | imported | failed
  parsed      String                     // JSON of parsed entries
  importedAt  DateTime?
}
```

### API
- `POST /api/transcripts/import` - multipart: sourceCode + file
- `GET /api/transcripts/import/:importId` - parsed preview
- `POST /api/transcripts/import/:importId/confirm` - apply mapping

### UI
- `/dashboard/import` - SelectSourceCardGrid, UploadTranscriptDropzone, ParsedPreviewTable, MappingPanel, ConfirmImportButton

---

## PRD-003: Audit Pack 2.0 (ZIP Export + Evidence-Strength Scoring) ✅ DONE

### Problem
Current PDF/CSV exports don't include actual evidence files. Auditors need a complete defensible bundle.

### User Stories
- Export ZIP containing: transcript PDF, CSV log, evidence folder with all attached files
- Each CPD record has an "evidence strength" indicator
- Export can filter by credential, cycle date range, minimum evidence strength

### Evidence Strength Levels
- `manual_only` - self-reported, no attachments
- `url_only` - has a URL reference
- `certificate_attached` - has uploaded certificate/proof
- `provider_verified` - provider confirmed via API

### Schema Changes
```
CpdRecord model addition:
  evidenceStrength String @default("manual_only")
```

### API
- `GET /api/export/audit-pack?credentialId=...&from=...&to=...&minStrength=...` - returns ZIP stream

### UI
- Dashboard: "Export audit pack" modal with filters and strength summary

---

## PRD-004: Rule Pack Versioning + Effective Dates ✅ DONE

### Problem
Requirements change over time. Historical records must be evaluated under the rules that were in effect when the activity occurred.

### User Stories
- When requirements change, historical records remain evaluated under correct rules
- See which ruleset is applied to current cycle
- Rules resolve by cycle start/end + activity date

### Schema Changes
```
model CredentialRulePack {
  id           String @id @default(cuid())
  credentialId String
  version      String
  effectiveFrom DateTime
  effectiveTo   DateTime?
  rules        String    // JSON rule definitions
}
```

### API
- `GET /api/credentials/:id/rules?at=YYYY-MM-DD`
- Dashboard aggregator updated to resolve rule pack by date

### UI
- Credential detail: RulePackBadge ("CFP v2027-effective")

---

## PRD-005: Multi-Credential Credit Allocation ✅ DONE

### Problem
Users with multiple credentials cannot allocate one activity's hours across credentials where permitted.

### User Stories
- Allocate one CPD record's hours to multiple credentials
- See "this activity counts toward X and Y"
- UI prevents allocating more than recorded hours

### Schema Changes
```
model CpdAllocation {
  id               String @id @default(cuid())
  cpdRecordId      String
  userCredentialId String
  hours            Float
}
```

### API
- `POST /api/cpd-records/:id/allocations`
- `GET /api/cpd-records/:id/allocations`

### UI
- CPD record detail drawer: AllocationEditor

---

## PRD-006: Forward-to-Wallet Email Ingestion ✅ DONE

### Problem
Most certificates arrive via email. Users forget to upload them.

### User Stories
- Unique inbound email per user; forward certificate emails
- Attachments extracted, classified, and placed in Evidence Inbox
- Basic PDF text extraction for metadata suggestions

### Schema Changes
```
model IngestionAddress {
  id      String @id @default(cuid())
  userId  String @unique
  address String @unique
  active  Boolean @default(true)
}
```

### API
- `POST /api/ingest/email` - inbound webhook from email provider
- `GET /api/ingest/address` - user's ingestion address

### UI
- Settings page: "Forward certificates to: ____@yourdomain"
- Evidence Inbox: "Source: Email forward" badge

---

## PRD-007: Provider Verified Completion Events ✅ DONE

### Problem
Self-reported CPD entries have weak audit defensibility. Provider verification is the gold standard.

### User Stories
- Providers send signed completion events via API
- Verified entries show "Provider verified" badge
- Events are idempotent (no duplicates)

### Schema Changes
```
model ProviderTenant {
  id        String @id @default(cuid())
  name      String
  apiKeyHash String
}

model CompletionEvent {
  id              String @id @default(cuid())
  providerId      String
  userId          String
  externalUserRef String?
  payload         String    // JSON
  idempotencyKey  String @unique
  createdAt       DateTime @default(now())
}
```

### API
- `POST /api/provider/events/completion` - X-Provider-Key + Idempotency-Key headers

### UI
- CPD record row: VerifiedBadge + "View completion details"

---

## PRD-008: Certificate Registry + Verification Page ✅ DONE

Public verification page at `/verify/[code]`. API at `/api/certificates/verify/[code]`. QR codes embedded in certificate PDFs. Batch verification endpoint for firm admins. Certificates support active/revoked status.

---

## PRD-009: Integrations Inventory ✅ DONE

### Import-First Sources (File Upload Parsers)
- FinPro IAR CE transcript
- CFP Board CE summary
- Sircon insurance CE transcript
- CE Broker transcript export
- CME Passport transcript
- NABP CPE Monitor transcript

### Issuer Formats (Strategic)
- Open Badges / Badge Connect (OB 3.0)

### Integration Approach
1. File-based import first (PDF/CSV upload + parse)
2. Reconciliation into CPD wallet
3. Optional later: API partnerships

---

# Tasks Remaining

All PRDs and core features are implemented. Remaining work is production-readiness:

- [x] Stripe webhook integration tests (payment lifecycle, plan activation, signature validation)
- [x] Rate limiting on all mutation endpoints
- [x] Zod schema validation on all API routes
- [x] Standardized auth (requireAuth/requireRole) across all routes
- [x] Production config (standalone output, lazy Stripe, configurable DB path)
- [x] ARIA accessibility attributes on UI components
- [x] Route-level loading states
- [ ] Real S3 pre-signed URL generation
- [ ] SMTP configuration for production email delivery
- [ ] Production environment variables and deployment config
- [ ] End-to-end browser tests (Playwright)
- [ ] Quiz content library per credential/jurisdiction
- [x] AI-powered evidence metadata extraction
- [x] Automated deadline reminder cron jobs
- [x] Smart gap recommendations engine
- [x] Progressive Web App (PWA) with service worker, push notifications, camera capture

---

# Value-Add Feature Opportunities

Features not yet implemented that would add significant value, organized by priority.

## P0 - High Impact, High Demand (IMPLEMENTED)

- **AI-Powered Evidence Extraction** (done): Pattern-matching extraction engine (`src/lib/extract.ts`) that auto-extracts title, date, hours, provider, category, and credential from uploaded evidence. API endpoint `POST /api/evidence/[id]/extract`. Auto-runs on upload. 16 tests.
- **Smart Gap Recommendations** (done): `GET /api/recommendations` analyzes user's credential progress, calculates gaps for total/ethics/structured hours, scores available activities by relevance, includes urgency levels (critical/high/medium/low) based on deadline proximity. 6 tests.
- **Mobile App / PWA** (done): `manifest.json`, service worker (`sw.js`) with cache-first static + network-first navigation, push notification handling, `PWAInstall` prompt component, `CameraCapture` component for mobile evidence photos, `POST /api/push/subscribe` endpoint. 4 tests.
- **Automated Deadline Reminders** (done): Cron-based scanner (`src/lib/deadline-scanner.ts`) checks all user credentials at 90/60/30/7-day thresholds. `POST /api/cron/reminders` endpoint (admin or CRON_SECRET auth). `GET /api/cron/reminders/preview` for dry-run. Vercel cron config (`vercel.json`). Escalating urgency in email messaging. 5 tests.
## P1 - Differentiation

- **CPE/CPD Credit Marketplace**: Partner with providers to list accredited courses. Users can browse, enroll, and have completion auto-posted. Revenue share model.
- **Firm Compliance Risk Scoring**: Score each adviser's audit-readiness (0-100) based on hours, evidence strength, deadline proximity. Firm dashboard heatmap.
- **Peer Benchmarking**: Anonymous comparison - "You're ahead of 73% of CFP holders in your state." Motivation driver.
- **API for Employers/Firms**: REST API for firms to pull compliance data for their advisers. Webhook notifications when advisers fall behind.
- **Browser Extension**: Capture certificates from provider websites with one click. Auto-detect completion pages.

## P2 - Ecosystem Expansion

- **Additional Professions**: Expand beyond financial services to healthcare (NMC already seeded), legal (CLE requirements), engineering (PE/PDH), IT (CISSP, PMP), education (teacher CPD). Each requires credential rules + quiz content.
- **Multi-Language Support**: i18n for UK, AU, CA, SG, HK markets. Date/currency localization.
- **CE Provider Portal**: Self-service for training providers to register, submit activities, manage credit mappings, and view completion analytics.
- **Audit Simulation**: "Mock audit" feature - generates the exact document bundle an auditor would request. Identifies gaps before they become problems.
- **Calendar Integration**: Google Calendar / Outlook sync for upcoming CPD activities and deadlines. Two-way sync with reminder system.
- **Team Learning Plans**: Firm admins create learning paths for team members. Track completion across the team. Assign specific quizzes/activities.

## P3 - Long-term Vision

- **Blockchain Credential Verification**: Immutable proof of CPD completion on-chain. Verifiable credentials standard (W3C VC).
- **AI Study Assistant**: Chatbot that helps users understand credential requirements, answers "does this count?" questions, and suggests optimal learning paths.
- **Cross-Platform SSO**: SAML/OIDC for enterprise customers. Active Directory integration for firms.
- **Regulatory Change Alerts**: Monitor regulatory bodies for rule changes. Auto-update rule packs. Notify affected users.
