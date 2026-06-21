# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

Credify is a SaaS tool for music professionals to clean up and verify song
credits (producer/songwriter/engineer roles, ISRC/UPC/ISWC codes) using
Claude, and to check DSP (streaming platform) availability for a track. It's
a Next.js 15 (App Router) application deployed on Vercel, backed by a Neon
Postgres database via Prisma.

## Tech stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Auth**: Clerk (`@clerk/nextjs`) — handles sign-in/up, sessions, and route protection via `middleware.ts`
- **Database**: PostgreSQL (Neon) via Prisma (`prisma/schema.prisma`)
- **Billing**: Stripe (subscriptions, customer portal)
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) for credit cleanup/suggestions
- **Integrations**: Google Calendar and Notion OAuth, used for reminder sync
- **Styling**: Tailwind CSS

## Project structure

```
app/
  (auth)/            Clerk sign-in/sign-up pages (route group, no auth required)
  (dashboard)/        Authenticated dashboard shell: /dashboard, /reminders, /settings/*
  app/                 The core product flow: conversational credit-fix + availability checker (app/app/page.tsx)
  api/                 Route handlers (see below)
  onboarding/          Post-signup workspace creation
  invite/[token]/      Workspace invite acceptance landing page
  pricing/             Public pricing page
  layout.tsx, page.tsx Root layout and marketing landing page
components/            Shared React components (currently just Sidebar.tsx)
lib/
  auth.ts              getCurrentUser() / getWorkspaceContext() helpers
  db.ts                Prisma client singleton
  config/plans.ts       PLANS constant: credits, seats, pricing per plan tier
  availability.ts       DSP availability-check logic
  google-calendar.ts     Google Calendar OAuth + API helpers
  notion.ts              Notion OAuth + API helpers
  ics.ts                 .ics calendar file generation
prisma/
  schema.prisma          Data model (see below)
  seed.ts                 Seed script
middleware.ts            Clerk route protection
```

### API routes (`app/api/`)

- `fix-credits/` — submits raw credit text to Claude, decrements a workspace credit, stores a `MetadataJob`
- `availability/` — checks DSP availability for a track
- `billing/checkout/`, `billing/portal/` — Stripe Checkout + customer portal sessions
- `webhooks/clerk/`, `webhooks/stripe/` — inbound webhooks (user sync, subscription state)
- `integrations/google/*`, `integrations/notion/*` — OAuth flows for calendar integrations
- `reminders/`, `reminders/[id]/`, `reminders/[id]/push/` — reminder CRUD + calendar push
- `workspace/`, `workspace/me/`, `workspace/members/[id]/`, `workspace/invites/*` — workspace and team management

## Data model (Prisma)

Core entities and how they relate:

- `User` — synced from Clerk via webhook (`clerkId` is the link)
- `Workspace` — has a `plan` (FREE/PRO/BUSINESS), a `credits` balance that's
  decremented per AI job, and Stripe subscription fields
- `WorkspaceMember` — join table with `role` (OWNER/EDITOR/VIEWER); a user can
  belong to one workspace via this relation
- `WorkspaceInvite` — pending email invites with expiring tokens
- `MetadataJob` — one record per credit-fix request; stores raw input,
  Claude's cleaned output, issues/suggestions, and parsed metadata (ISRC/UPC/ISWC)
- `Reminder` — workspace to-dos, optionally pushed to a connected calendar
- `CalendarConnection` — OAuth tokens for a user's Google or Notion calendar link

Run `npx prisma studio` (`npm run db:studio`) to browse data locally.

## Auth & authorization pattern

Every API route handler follows the same shape — there's no shared
middleware wrapper for this, so replicate it explicitly in new routes:

```ts
const { userId } = await auth();                                   // Clerk session
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const user = await prisma.user.findUnique({ where: { clerkId: userId } });
if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });
```

Notes:
- Every user belongs to at most one workspace in the current model (lookups
  use `findFirst`, not a workspace ID from the request).
- `lib/auth.ts` exposes `getCurrentUser()` and `getWorkspaceContext()` as
  shortcuts for the same pattern in server components/pages.
- Page-level route protection (redirect-to-sign-in) is handled centrally in
  `middleware.ts` via `createRouteMatcher` over `/dashboard`, `/app`,
  `/settings`, `/onboarding`, `/reminders`. New protected top-level routes
  must be added to that matcher.
- Credit-consuming actions (e.g. `fix-credits`) must check
  `workspace.credits <= 0` and return `402` with
  `{ error: "INSUFFICIENT_CREDITS", code: "INSUFFICIENT_CREDITS" }` before
  decrementing.

## Conventions

- API route handlers return `NextResponse.json(...)` directly; errors are
  `{ error: string }` with an appropriate status code (401/400/402/404).
- Server-only secrets (Stripe, Clerk, Anthropic, OAuth client secrets) are
  read via `process.env` inside route handlers/lib files, never exposed to
  client components. `NEXT_PUBLIC_*` vars are the only ones safe client-side.
- `process.env.USE_MOCK_DATA === "true"` short-circuits the Anthropic call in
  `fix-credits` with a canned `MOCK_RESULT`, useful for local dev/testing
  without burning API credits.
- Client components doing multi-step flows (see `app/app/page.tsx`) model the
  flow as a `Step` union type plus a chat-message transcript array, not as a
  traditional multi-page form.
- Plan/pricing constants live only in `lib/config/plans.ts` — don't hardcode
  credit counts or prices elsewhere.

## Development workflow

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev             # Next.js dev server
npm run db:push          # push schema.prisma changes to the database (no migrations dir in use)
npm run db:seed           # run prisma/seed.ts
npm run db:studio          # Prisma Studio GUI
npm run lint                # eslint via next lint
npm run build                # production build
```

Required environment variables are documented in `.env.local.example` —
copy it to `.env.local` and fill in Database (Neon), Anthropic, Clerk,
Stripe, Google OAuth, and Notion OAuth credentials.

There is no automated test suite in this repo currently; verify changes via
`npm run build`, `npm run lint`, and manual testing through `npm run dev`.

## Deployment

Deployed on Vercel (`vercel.json`, `.vercelignore` present). `prisma generate`
runs in `postinstall` specifically to avoid exceeding Vercel's Hobby plan
build CPU limit (see commit `101f77a`) — don't move it into a separate build
step without checking that constraint still applies.
