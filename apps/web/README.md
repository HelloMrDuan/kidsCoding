# Kids Coding Web App

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
3. Install dependencies: `npm install`
4. Start Supabase locally: `npx supabase db start`
5. Run migrations: `npx supabase migration up`
6. Start the app: `npm run dev`

## Commands

- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`
- `npm run build`

## Main Routes

- `/`
- `/onboarding/age`
- `/onboarding/check`
- `/learn/map`
- `/learn/lesson/move-character`
- `/project/move-character/complete`
- `/cards`
- `/auth/bind`
- `/parent/overview`
