# Build & Run Instructions

## Project: CPD/CE Concierge + Audit-Ready Tracker

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or pnpm

### Setup
```bash
# Frontend
cd webapp && npm install

# Backend
cd backend && npm install

# Crawler
cd crawler && npm install

# Scripts
cd scripts && npm install  # or pip install -r requirements.txt
```

### Development
```bash
# Start frontend (Next.js)
cd webapp && npm run dev

# Start backend API
cd backend && npm run dev

# Run crawler
cd crawler && node crawl.js

# Run scripts
cd scripts && node <script-name>.js
```

### Testing
```bash
# Frontend tests
cd webapp && npm test

# Backend tests
cd backend && npm test

# All tests
npm test
```

### Database
```bash
# Run migrations
cd backend && npm run migrate

# Seed data
cd backend && npm run seed
```

### Environment Variables
Copy `.env.example` to `.env` in each directory and fill in:
- `DATABASE_URL`  - PostgreSQL connection string
- `STRIPE_SECRET_KEY`  - Stripe API key
- `NEXTAUTH_SECRET`  - Auth secret
- `S3_BUCKET`  - Certificate vault storage
- `RESEND_API_KEY`  - Email service key

### Ralph (Autonomous Loop)
```bash
# Run Ralph with monitoring
./.ralph-tools/ralph_loop.sh --monitor

# Check status
./.ralph-tools/ralph_loop.sh --status
```
