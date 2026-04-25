# Supabase

This project uses Supabase for Auth and data.

## Environment variables

1. Copy `.env.example` to `.env.local`
2. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (only needed for local scripts like admin seeding; never commit/expose it)

## Migrations

Migrations are in `supabase/migrations/`.

Suggested order:
- Apply `supabase/migrations/20260419100000_init.sql`
- (Optional) Seed with `supabase/seed.sql`

After you run the migration, you can mark an account as admin by setting `profiles.is_admin = true` for that user in the Supabase dashboard (Table editor).

## Edge Functions

This repo now includes `supabase/functions/create-user`, which lets admins create active users with a chosen password from the dashboard.

- Deploy it with the Supabase CLI or dashboard after applying migrations.
- The function uses `SUPABASE_SERVICE_ROLE_KEY` inside the Edge Function runtime. Never expose that key in the browser.

## Seed an admin user (dev only)

This uses the Supabase **service role** key to create/update an Auth user and set `profiles.is_admin = true`.

- Run: `npm run seed:admin`
- Or: `npm run seed:admin -- --email you@example.com --password "YourPassword123"`

Do not commit `SUPABASE_SERVICE_ROLE_KEY` or any real passwords.
