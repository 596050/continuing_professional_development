# AuditReadyCPD

A CPD (Continuing Professional Development) tracking, compliance, and certification platform for regulated professionals — financial advisers, accountants, healthcare practitioners, engineers, and legal professionals.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** NextAuth.js v5 (JWT sessions, Credentials provider)
- **Database:** SQLite via Prisma 7 + `@prisma/adapter-libsql`
- **Styling:** Tailwind CSS 4 with custom `@theme` variables
- **Testing:** Vitest (259 integration tests)
- **Payments:** Stripe (checkout + webhooks)
- **PDF:** PDFKit for audit reports and certificates

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
    api/              # 29 API routes
      auth/           # signup
      certificates/   # CRUD + verify + download + export
      checkout/       # Stripe checkout session
      completion/     # completion rules + evaluation
      cpd-records/    # CRUD for CPD activity records
      dashboard/      # aggregation endpoint
      evidence/       # upload + CRUD
      export/         # audit-report (PDF), audit-csv, compliance-brief
      onboarding/     # wizard submission
      provider/       # firm reporting
      quizzes/        # CRUD + attempt submission + grading
      reminders/      # CRUD + .ics calendar export
      settings/       # profile + password
      webhooks/       # Stripe webhook handler
    auth/             # signin + signup pages
    checkout/         # success + cancel pages
    dashboard/        # main dashboard
    onboarding/       # 4-step onboarding wizard
    quizzes/          # quiz list + quiz player
    reminders/        # reminder management
    settings/         # profile + credentials + security
    verify/           # public certificate verification
  components/         # shared UI components (Nav, Hero, FAQ, Pricing, etc.)
  lib/                # auth config, db client, features, PDF generation
  __tests__/          # integration tests + state helpers
```

## Current Status (Sprint 3 Complete)

- 259 integration tests passing
- 15 user state helpers for testing
- Full CRUD for all entities (CPD records, evidence, certificates, quizzes, reminders)
- Platform record immutability (quiz-generated records cannot be edited/deleted)
- Certificate soft-delete (revocation instead of hard delete)
- Evidence upload with file validation
- Quiz engine with auto-grading, attempt limiting, and auto-certificate generation
- PDF audit reports + CSV exports
- .ics calendar file generation for reminders
- Interactive CSS feedback (cursor, hover, active states)
- Session pre-fill and datalist autocomplete for form efficiency

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

## PRD-001: Evidence Inbox (Unassigned Evidence Queue)

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
- `POST /api/evidence` — allow missing cpdRecordId (status=inbox)
- `GET /api/evidence?status=inbox` — inbox listing
- `PATCH /api/evidence/:id` — assign to record, update kind/extracted

### UI
- `/dashboard/evidence` — Evidence Inbox page
  - EvidenceInboxList, EvidencePreviewPanel
  - AssignToRecordModal, CreateRecordFromEvidenceModal
- Dashboard sidebar badge: "Evidence Inbox (N)"

---

## PRD-002: Transcript Import Hub (File-Based Connectors)

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
- `POST /api/transcripts/import` — multipart: sourceCode + file
- `GET /api/transcripts/import/:importId` — parsed preview
- `POST /api/transcripts/import/:importId/confirm` — apply mapping

### UI
- `/dashboard/import` — SelectSourceCardGrid, UploadTranscriptDropzone, ParsedPreviewTable, MappingPanel, ConfirmImportButton

---

## PRD-003: Audit Pack 2.0 (ZIP Export + Evidence-Strength Scoring)

### Problem
Current PDF/CSV exports don't include actual evidence files. Auditors need a complete defensible bundle.

### User Stories
- Export ZIP containing: transcript PDF, CSV log, evidence folder with all attached files
- Each CPD record has an "evidence strength" indicator
- Export can filter by credential, cycle date range, minimum evidence strength

### Evidence Strength Levels
- `manual_only` — self-reported, no attachments
- `url_only` — has a URL reference
- `certificate_attached` — has uploaded certificate/proof
- `provider_verified` — provider confirmed via API

### Schema Changes
```
CpdRecord model addition:
  evidenceStrength String @default("manual_only")
```

### API
- `GET /api/export/audit-pack?credentialId=...&from=...&to=...&minStrength=...` — returns ZIP stream

### UI
- Dashboard: "Export audit pack" modal with filters and strength summary

---

## PRD-004: Rule Pack Versioning + Effective Dates

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

## PRD-005: Multi-Credential Credit Allocation

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

## PRD-006: Forward-to-Wallet Email Ingestion

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
- `POST /api/ingest/email` — inbound webhook from email provider
- `GET /api/ingest/address` — user's ingestion address

### UI
- Settings page: "Forward certificates to: ____@yourdomain"
- Evidence Inbox: "Source: Email forward" badge

---

## PRD-007: Provider Verified Completion Events

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
- `POST /api/provider/events/completion` — X-Provider-Key + Idempotency-Key headers

### UI
- CPD record row: VerifiedBadge + "View completion details"

---

## PRD-008: Certificate Registry + Verification Page

**Status: Partially implemented.** Public verification page exists at `/verify/[code]`. API at `/api/certificates/verify/[code]`. Certificates support active/revoked status.

### Remaining Work
- QR code generation on certificate PDFs linking to verification URL
- Batch verification for firm admins
- Certificate download with embedded verification QR

---

## PRD-009: Integrations Inventory

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

## Immediate (Current Sprint)

- [ ] Build local component library (Button, Modal, Card, Input, Badge, PageLayout, TopBar, EmptyState, Spinner)
- [ ] Refactor existing pages to use shared components
- [ ] Implement PRD-001: Evidence Inbox (schema changes, inbox API, inbox UI page)
- [ ] Implement PRD-003: Audit Pack ZIP export (evidence strength field, ZIP API)

## Next Sprint

- [ ] PRD-004: Rule pack versioning (schema + date-effective resolution)
- [ ] PRD-005: Multi-credential allocation (schema + allocation UI)
- [ ] Evidence strength auto-detection (upgrade on evidence attachment)
- [ ] Dashboard filtering and search for CPD records

## Future Sprints

- [ ] PRD-006: Email forwarding ingestion
- [ ] PRD-002: Transcript import hub (file-based parsers)
- [ ] PRD-007: Provider verified completion events
- [ ] PRD-008: QR codes on certificates
- [ ] PRD-009: Open Badges import
- [ ] Firm admin dashboard
- [ ] Billing/subscription management page
- [ ] Activity catalog browsing
