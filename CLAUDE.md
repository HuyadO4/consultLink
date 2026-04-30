# CLAUDE.md — ConsultLink Agent Operating Manual

> This file is the single source of truth for every decision you make while building ConsultLink.
> Read this entire file before writing a single line of code. Re-read the relevant section before starting any new task.

---

## 1. WHAT YOU ARE BUILDING

**ConsultLink** is a consultation marketplace for Nigeria where business owners list consulting services and users can book paid sessions (physical or virtual). Payments are processed via Paystack. Virtual sessions use Google Calendar-generated Meet links.

**One-line pitch:** "Book paid business consultations from verified Nigerian business owners, online or in person."

**You are a solo build.** There is no team. Velocity matters. Do not gold-plate. Ship the vertical slice.

---

## 2. PERSONAS (READ BEFORE EVERY FEATURE)

| Persona | Who they are | What they need |
|---|---|---|
| **Customer (beachhead)** | 22–35, early-stage Nigerian entrepreneur, mobile-first | Fast access to expert advice, clear pricing, trust |
| **Consultant** | 25–45, Nigerian business owner monetising expertise | Structured scheduling, payment assurance, low overhead |
| **Admin** | Platform operator | Listing moderation, user management, booking visibility |

When in doubt about a design decision, ask: "Does this make it faster and clearer for the Customer?"

---

## 3. TECH STACK — LOCKED, NO EXCEPTIONS

| Layer | Decision |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password only) |
| Storage | Supabase Storage |
| Styling | Vanilla CSS + CSS Modules only |
| Payments | Paystack |
| Meeting links | Google Calendar API (service account) |
| Package manager | npm |
| Hosting | Vercel |

Do not suggest alternatives. Do not ask "should we use X instead?" These decisions are final for this MVP.

---

## 4. HARD RULES — NEVER VIOLATE THESE

### Installation rules
- **NO Tailwind.** Not as a dependency, not as a dev dependency, not "just for this one component."
- **NO UI libraries.** No MUI, Chakra, Radix, shadcn, Ant Design, or any component kit.
- **NO state management libraries.** No Redux, Zustand, Jotai, Recoil. Use React `useState`, `useContext`, and `useReducer` only.
- **NO testing frameworks.** No Jest, Vitest, Cypress, Playwright. Not yet.
- **NO ORM.** No Prisma, Drizzle. Use Supabase JS client directly.
- **NO external CSS utilities.** No Bootstrap, Bulma, or any CSS framework.
- **NO PWA tooling**, no i18n libraries, no dark mode, no Storybook.
- Before installing any package not already in the project, **STOP and state which package and why**. Wait for approval.

### TypeScript rules
- Strict mode is ON (`"strict": true` in tsconfig). Do not disable it.
- No `any` types. If you genuinely cannot avoid one, add an inline comment explaining why.
- All props interfaces must be explicitly typed. No implicit `{}` props.
- Server Components use `async` and `await` — do not add `'use client'` unless the component needs browser APIs or event handlers.

### CSS rules
- One `.module.css` file per component. No exceptions.
- All values come from CSS variables defined in `src/styles/tokens.css`. Do not hardcode colours, font sizes, or spacing values in component CSS.
- No inline `style={{}}` props except for truly dynamic values (e.g. progress bar width from state).
- No global class names from component files. CSS Modules enforce local scope — use it.

### Supabase client rules
- **Browser client** (`src/lib/supabase/client.ts`): use in Client Components only.
- **Server client** (`src/lib/supabase/server.ts`): use in Server Components, Server Actions, and Route Handlers that don't need elevated permissions.
- **Admin client** (`src/lib/supabase/admin.ts`): use ONLY in API routes that require bypassing RLS (admin operations, webhook handlers). Never expose the service role key to the browser.
- When in doubt which client to use — ask.

### Security rules
- Always verify Paystack webhook signatures using `PAYSTACK_WEBHOOK_SECRET`. Never skip this check.
- Never trust client-side payment success callbacks as confirmation. Only trust the verified webhook.
- Never return raw Supabase error messages to the browser. Log them server-side; return generic messages to users.
- The `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side code or be prefixed with `NEXT_PUBLIC_`.
- All protected routes must be enforced in `src/middleware.ts` — do not rely on client-side redirects alone.

---

## 5. ARCHITECTURE DECISIONS (FINAL)

### Routing — route groups by role
```
(auth)/     → login, register
(user)/     → customer-facing authenticated routes
(consultant)/ → consultant-facing authenticated routes
(admin)/    → admin-only routes
listings/   → public listing browse + detail
api/        → all API routes
```

### Data flow
- **Server Components fetch data** — pass it as props to Client Components.
- **Client Components handle interactivity** — forms, modals, UI state.
- **API routes handle mutations** — payments, booking creation, approvals, refunds.
- Do not fetch data in Client Components unless it is genuinely interactive (e.g. live search as user types).

### Money handling
- All prices are stored and processed in **kobo** (smallest NGN unit). ₦5,000 = 500,000 kobo.
- Convert to NGN only for display. Use `formatPrice()` from `src/lib/utils/format.ts`.
- Never store NGN floats. Kobo integers only.

### Timezone
- All times are **WAT (UTC+1)**. No timezone conversion logic is needed in MVP.
- Store all timestamps in Supabase as `timestamptz` (Supabase defaults to UTC — display as WAT by applying +1 offset in `src/lib/utils/date.ts`).

### Booking state machine
```
initiated → pending (payment confirmed via webhook)
pending → approved (consultant approves within 24h)
pending → rejected (consultant rejects → triggers refund)
pending → expired (24h deadline passes → triggers refund)
approved → completed (session date passes)
rejected/expired → refunded (Paystack refund API called)
```
Do not add states. Do not skip states. This is the contract.

---

## 6. WHAT IS IN SCOPE FOR MVP

Only build what is listed here. If a feature is not in this list, it does not exist.

| Feature | Notes |
|---|---|
| Email/password auth | Supabase Auth only |
| Consultant listing creation | Title, description, price, category, location, image, type, duration |
| Listing image upload | Supabase Storage, single image per listing |
| Listing approval by admin | Admin approves before public visibility |
| Keyword search on listings | ilike search on title + description |
| Category filter | Dropdown, listing page only |
| Weekly recurring availability | Day of week + time range |
| Double-booking prevention | Server-side check before booking creation |
| Booking flow (3 steps) | Select slot → Confirm → Pay |
| Paystack payment | Inline popup, webhook verification |
| Consultant booking approval | 24-hour window, auto-expire if no action |
| Auto-refund on rejection/expiry | Paystack Refund API |
| Rescheduling (pre-approval) | User can change slot; payment remains |
| Google Meet link generation | On approval of virtual booking |
| Manual Meet link fallback | Consultant inputs link if API fails |
| In-app notifications | Stored in DB, fetched on page load |
| 12-hour session reminder | Via cron job / Edge Function |
| Reviews after completed sessions | Star rating + optional comment |
| Admin: approve/reject listings | With rejection reason |
| Admin: suspend/reactivate users | Flag in profiles table |
| Admin: view all bookings | Read-only table |

---

## 7. WHAT IS OUT OF SCOPE — DO NOT BUILD

If a user story or feature is not in Section 6, do not build it. Specifically:

- Email/SMS notifications
- Social login (Google, Apple, etc.)
- Commission or payout system
- Subscription or recurring billing
- Multiple images per listing
- In-app video (link only, no WebRTC)
- Rich text editor (plain textarea)
- Public consultant profile pages
- Dark mode
- Analytics dashboard for consultants or admins
- Referral or discount system
- Advanced search filters beyond keyword + category
- Drag-and-drop interfaces
- Multi-language / i18n

If asked to build any of the above, respond: "This is deferred to a post-MVP phase. Not building it now."

---

## 8. UX PRINCIPLES (APPLY TO EVERY SCREEN)

1. **Clarity over decoration.** Every element must serve a purpose. If you cannot explain why it's there, remove it.
2. **White space is not wasted space.** Use `--space-16` between major sections. Breathe.
3. **Hierarchy through typography and spacing** — not colour. Use magenta only for CTAs, active states, and critical highlights.
4. **Max 3–4 steps for any core flow.** Booking, payment, listing creation — if it takes more, simplify.
5. **Always handle edge states.** Every list has an empty state. Every action has a loading state. Every failure has a clear error message.

### Microcopy standards
Use these exact strings for booking states (do not paraphrase):
- `"Awaiting Approval"` — pending
- `"Confirmed"` — approved
- `"Rejected – Refund Initiated"` — rejected
- `"Session Expired – Refund Initiated"` — expired
- `"Completed"` — completed

### Error messages shown to users
Never show raw error strings. Use:
- Payment issues: `"Payment was not completed. No charge was made."`
- Generic failure: `"Something went wrong. Please try again."`
- Slot taken: `"This time slot is no longer available. Please choose another."`
- Auth failure: `"Invalid email or password."`

---

## 9. CODE CONVENTIONS

### File naming
- Pages: `page.tsx` (Next.js App Router convention)
- Components: `PascalCase.tsx` in a folder with the same name (e.g. `Button/Button.tsx`)
- CSS Modules: `ComponentName.module.css`
- Utilities: `camelCase.ts`
- Types: `camelCase.ts` or `index.ts`

### Component structure
```tsx
// 1. Imports (React, Next.js, then local)
// 2. Types/interfaces
// 3. Component function
// 4. Export
```

### Server vs Client Components
- Default to Server Component (no directive needed)
- Add `'use client'` only when you need: `useState`, `useEffect`, `useRef`, browser APIs, or event handlers like `onClick`
- Never put data fetching inside a Client Component if it can be done in a Server Component

### API routes
- All API routes return `{ data, error }` shape
- All mutations are POST (not GET)
- Always check auth at the start of protected routes
- Webhook routes verify signature before any processing

### Imports
- Use `@/` alias for all internal imports (configured in `tsconfig.json`)
- No relative imports going up more than one level (use `@/` instead)

---

## 10. DESIGN TOKENS REFERENCE

These are the only values you may use in CSS. Do not hardcode anything.

### Colours
| Token | Value | Use for |
|---|---|---|
| `--color-black` | `#000000` | Text, borders, structure |
| `--color-white` | `#ffffff` | Backgrounds |
| `--color-magenta` | `#D600A0` | CTAs, active states, price highlights |
| `--color-magenta-light` | `#F5009120` | Hover backgrounds, selected states |
| `--color-gray-100` | `#F7F7F7` | Page backgrounds, subtle fills |
| `--color-gray-200` | `#EBEBEB` | Borders, dividers |
| `--color-gray-400` | `#9E9E9E` | Placeholder text, icons |
| `--color-gray-600` | `#5C5C5C` | Secondary text |
| `--color-gray-800` | `#1A1A1A` | Primary body text |
| `--color-success` | `#1A7A4A` | Approved badge, success messages |
| `--color-error` | `#C0392B` | Rejected badge, error messages |
| `--color-warning` | `#B7620A` | Pending badge, warning messages |

### Spacing (8px base grid)
`--space-1` (4px) · `--space-2` (8px) · `--space-3` (12px) · `--space-4` (16px) · `--space-5` (20px) · `--space-6` (24px) · `--space-8` (32px) · `--space-10` (40px) · `--space-12` (48px) · `--space-16` (64px) · `--space-20` (80px) · `--space-24` (96px)

### Typography
`--text-xs` (12px) · `--text-sm` (14px) · `--text-base` (16px) · `--text-lg` (18px) · `--text-xl` (20px) · `--text-2xl` (24px) · `--text-3xl` (30px) · `--text-4xl` (36px)

---

## 11. ENVIRONMENT VARIABLES REFERENCE

| Variable | Client/Server | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin operations — never expose |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Client | Paystack inline popup |
| `PAYSTACK_SECRET_KEY` | Server only | Paystack API calls |
| `PAYSTACK_WEBHOOK_SECRET` | Server only | Webhook signature verification |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Server only | Calendar API auth |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Server only | Calendar API auth |
| `GOOGLE_CALENDAR_ID` | Server only | Target calendar for events |
| `NEXT_PUBLIC_APP_URL` | Client + Server | Base URL for redirects |

---

## 12. WHEN IN DOUBT — DECISION FRAMEWORK

Ask yourself in order:

1. **Is it in scope?** Check Section 6. If not, don't build it.
2. **Does it add steps to a user flow?** If yes, find a simpler approach.
3. **Does it require a new package?** Stop and ask before installing.
4. **Does it change the database schema destructively?** Stop and ask.
5. **Does it involve the service role key, webhook secret, or payment logic?** Double-check Section 4 security rules.
6. **Are you unsure which Supabase client to use?** Default: server client. Admin client only for RLS-bypass. Browser client only in Client Components.

If still unsure: **stop, state what you are unsure about, and wait.** Do not guess on architectural decisions. Guessing on styling is fine. Guessing on data flow, auth, or payments is not.

---

## 13. ITERATION ORDER — DO NOT SKIP AHEAD

| Iteration | Theme | Must ship before next |
|---|---|---|
| 1 | Foundation & Auth | Register, login, profile creation, role-aware dashboards, middleware |
| 2 | Listings & Discovery | Create listing, image upload, search, listing detail, availability |
| 3 | Booking & Payments | Booking flow, Paystack, webhook, double-booking check, rescheduling |
| 4 | Approval, Meetings, Notifications, Reviews, Admin | Full end-to-end operational platform |

Do not start Iteration 2 until every item in Iteration 1's checklist passes manually. Same for all subsequent iterations.

---

*This file is a living document. If a decision changes, update this file first, then the code.*
*Last updated: April 30, 2026*