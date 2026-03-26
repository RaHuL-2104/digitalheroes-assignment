# Golf Charity Subscription Platform (Assignment Build)

Full-stack implementation of the Digital Heroes PRD using Next.js, Supabase, and Stripe (test mode).

## Stack
- Next.js 15 (App Router, TypeScript)
- Supabase (Auth, Postgres, Storage)
- Stripe Subscriptions (Checkout + webhook sync)
- Tailwind CSS
- Vitest for business-rule unit tests

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy environment file:
```bash
cp .env.example .env.local
```
3. Fill `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `APP_URL`

4. Apply SQL in Supabase SQL editor:
- `supabase/migrations/001_init.sql`
- `supabase/seed.sql`

5. Run dev server:
```bash
npm run dev
```

## Stripe Webhook
- Endpoint: `POST /api/stripe/webhook`
- Events handled:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## Payment Mode
- If Stripe env vars are configured, checkout uses Stripe subscriptions.
- If Stripe env vars are missing, app runs in **mock payment mode**:
  - subscription actions remain fully interactive
  - plans are activated directly in database for assignment/demo purposes
  - optional envs: `MOCK_PRICE_MONTHLY`, `MOCK_PRICE_YEARLY`

## Core Routes
- `/` Public landing page
- `/charities` Charity directory
- `/charities/[id]` Charity profile
- `/login` Signup/login
- `/dashboard` Subscriber dashboard
- `/admin` Admin dashboard

## Required Credentials for Demo
- Create users manually in Supabase Auth.
- Promote admin user by updating `profiles.role = 'admin'`.
- Use Stripe test cards in checkout.

## PRD Feature Mapping
- Subscription plans + Stripe billing: implemented.
- Access control + role guards: implemented.
- Rolling last 5 scores (1-45): implemented via `insert_user_score` RPC + UI.
- Monthly draw engine:
  - Random mode.
  - Frequency-weighted algorithmic modes.
  - Simulation and publish flow.
  - 40/35/25 prize split.
  - Jackpot rollover when no 5-match winner.
- Charity system:
  - Directory and profile pages.
  - User charity selection and min 10% contribution.
  - Contribution accounting ledger.
- Winner verification:
  - Proof upload to Supabase Storage bucket `winner-proofs`.
  - Admin approval/rejection and payout status updates.
- Dashboards:
  - Subscriber and Admin panels with required modules.
- Reports/analytics:
  - Totals for users, prize pool, charity, published draws.
- Scalability-ready fields:
  - `country_code`, `currency_code`, optional `team_id`, campaign-ready nullable refs.

## Testing
Run:
```bash
npm run test
```
Includes:
- Score rolling logic
- Draw logic + match count
- Prize distribution + rollover
- Charity/prize accounting allocation
