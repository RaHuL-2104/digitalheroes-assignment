# Deployment Guide (Option 1)

This project is prepared for deployment on a **new Vercel project** + **new Supabase project** with Stripe test mode.

## 1) Create Supabase Project
1. Create a new Supabase project.
2. Run SQL files in order:
   - `supabase/migrations/001_init.sql`
   - `supabase/seed.sql`
3. In Storage, confirm bucket `winner-proofs` exists and is public.

## 2) Create Stripe Test Products
1. In Stripe test mode, create two recurring prices:
   - Monthly plan -> save as `STRIPE_PRICE_MONTHLY`
   - Yearly plan -> save as `STRIPE_PRICE_YEARLY`
2. Copy:
   - `STRIPE_SECRET_KEY`
   - Webhook signing secret (`STRIPE_WEBHOOK_SECRET`) after webhook is created.

### If Stripe is unavailable in your region (India invite flow)
- Leave Stripe variables unset.
- App automatically switches to **mock payment mode**.
- Optional envs:
  - `MOCK_PRICE_MONTHLY` (default `99`)
  - `MOCK_PRICE_YEARLY` (default `999`)
- In mock mode, subscription buttons activate plans directly for assignment/demo usage.

## 3) Deploy to Vercel
1. Create a new Vercel account/project and import this repo/folder.
2. Add environment variables from `.env.example`.
3. Set `APP_URL` to production domain (e.g. `https://<project>.vercel.app`).
4. Set a strong random value for `CRON_SECRET`.

## 4) Configure Stripe Webhook
1. In Stripe, add webhook endpoint:
   - `https://<project>.vercel.app/api/stripe/webhook`
2. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Paste webhook secret into Vercel env: `STRIPE_WEBHOOK_SECRET`.

## 5) Trigger Monthly Draw Cron
- Vercel cron path is pre-configured in `vercel.json`:
  - `/api/internal/monthly-draw` on `0 4 1 * *`
- Ensure call includes:
  - `Authorization: Bearer <CRON_SECRET>`

## 6) Post-Deploy Validation
1. Open `/api/health` and confirm `status: ok`.
2. Signup + login.
3. Run Stripe checkout using test cards.
4. Confirm webhook inserts/updates `subscriptions`.
5. Enter 6 scores and verify only 5 latest remain.
6. Run draw simulation/publish from admin.
7. Upload winner proof and update winner status to paid.
