# SoldOutAfrica Admin — Site Documentation

Internal admin dashboard for managing events, tickets, companies and platform operations on SoldOutAfrica.

- **Framework:** Next.js 15.5 (App Router, Turbopack) · React 19 · TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/Radix primitives · dark theme forced (`<html className="dark">`)
- **Data:** TanStack Query (auth mutations only) + plain `fetch` via `src/lib/api.ts`
- **Charts:** Recharts
- **Storage:** Contabo S3 (via `@aws-sdk/client-s3`) for poster uploads
- **Deploy:** Netlify (`@netlify/plugin-nextjs`), Node 20, pnpm
- **Public site:** `https://soldoutafrica.com` · **Admin:** `https://admin.soldoutafrica.com`

> **See also:** [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — every API call broken down page by
> page, with exact request bodies, response shapes and per-call error handling.

---

## Table of contents

1. [Architecture](#1-architecture)
2. [Authentication & session](#2-authentication--session)
3. [Route map](#3-route-map)
4. [Page documentation](#4-page-documentation)
5. [Internal API route reference](#5-internal-api-route-reference)
6. [Upstream (backend) endpoint index](#6-upstream-backend-endpoint-index)
7. [Shared library reference](#7-shared-library-reference)
8. [Shared components](#8-shared-components)
9. [Configuration & environment](#9-configuration--environment)
10. [Known gaps, dead code & risks](#10-known-gaps-dead-code--risks)

---

## 1. Architecture

```
Browser (client component)
      │  fetch('/api/...')  — credentials: 'include'
      ▼
Next.js Route Handler  (src/app/api/**)
      │  validates `auth_token` cookie
      │  attaches Basic auth (API_USERNAME:API_PASSWORD)
      ▼
External backend API   (NEXT_PUBLIC_API_BASE_URL)
```

Every page is a **client component** (`'use client'`). No server-side data fetching is used
anywhere. The internal `/api/*` routes exist as a **proxy layer** so the backend's Basic-auth
credentials never reach the browser, and so the session cookie can be validated per request.

**Key files**

| File | Role |
| --- | --- |
| `src/middleware.ts` | Edge auth gate — redirects unauthenticated users to `/login` |
| `src/app/layout.tsx` | Root layout, fonts, metadata, `Providers` |
| `src/providers.tsx` | Wraps the app in `QueryClientProvider` |
| `src/lib/api.ts` | All client-side API clients + shared response types |
| `src/lib/auth.ts` | `withErrorHandler`, token helpers for route handlers |
| `src/lib/rate-limit.ts` | In-memory IP + identifier rate limiting for OTP requests |
| `src/lib/types.ts` | Domain types (events, tickets, dashboard stats) |
| `src/components/layout/dashboard-shell.tsx` | Sidebar + header + scroll container |

---

## 2. Authentication & session

### Login flow (passwordless OTP, SUPER_ADMIN only)

```
1. User enters email                → POST /api/auth/login
                                       → backend POST /user/otp/login
                                       → OTP + user stored in httpOnly `auth_verification`
                                         cookie (5 min). OTP is NEVER returned to the browser.
2. User enters 4-digit code         → POST /api/auth/validate-otp
                                       → compares against cookie, checks 5-min expiry
                                       → rejects role !== 'SUPER_ADMIN' (403)
                                       → issues httpOnly `auth_token` cookie (8 h)
3. Redirect to /dashboard           (via useAuth → router.push)
```

### Cookies

| Cookie | Contents | Lifetime | Flags |
| --- | --- | --- | --- |
| `auth_verification` | `{ otp, user, timestamp }` | 300 s | httpOnly, sameSite=strict, secure in prod |
| `auth_token` | `{ userId, role, email, companyId, issuedAt }` | 8 h | httpOnly, sameSite=lax, secure in prod |

`auth_token` is **plain JSON, not signed or encrypted** — see [§10](#10-known-gaps-dead-code--risks).

### Guards (three layers)

| Layer | File | Behaviour |
| --- | --- | --- |
| Edge middleware | `src/middleware.ts` | Any non-`/login`, non-`/api/*` path without a valid, unexpired `auth_token` redirects to `/login?from=<path>`. Authenticated users hitting `/login` are redirected to `/dashboard`. |
| Client guard | `src/components/auth/auth-guard.tsx` | Wraps `/dashboard/*`. Calls `GET /api/auth/status`. Redirects to `/login` **only** on 401/403 — transient network/5xx errors keep the user on the page. |
| Route handlers | each `src/app/api/**/route.ts` | Re-reads and re-validates the `auth_token` cookie before proxying. |

### Sensitive-action OTP (step-up auth)

Suspending/activating an individual ticket type requires a second OTP:
`GET /api/user/challenge` → backend `/user/challange?userId=` sends a code, then
`POST /api/ticket/status/toggle?ticketId=` submits `{ otp, ticketStatus }`.

### OTP rate limiting (`src/lib/rate-limit.ts`)

In-memory `Map`s, checked in `POST /api/auth/login`:

| Scope | Threshold | Backoff | Block |
| --- | --- | --- | --- |
| IP | 10 requests | `30s × 1.5^(n-1)`, capped at 10 min | 30 min |
| Identifier (email) | 5 requests | `60s × 2^(n-1)` | 1 hour |

Reset on successful OTP validation and on logout. **Not shared across serverless instances.**

---

## 3. Route map

### Pages

| Path | File | Status |
| --- | --- | --- |
| `/` | `app/page.tsx` | Redirect → `/dashboard` |
| `/login` | `app/login/page.tsx` | ✅ Live |
| `/dashboard` | `app/dashboard/page.tsx` | ✅ Live (real API) |
| `/dashboard/events` | `app/dashboard/events/page.tsx` | ✅ Live |
| `/dashboard/events/create` | `app/dashboard/events/create/page.tsx` | ✅ Live |
| `/dashboard/events/approvals` | `app/dashboard/events/approvals/page.tsx` | ✅ Live |
| `/dashboard/events/sales` | `app/dashboard/events/sales/page.tsx` | ✅ Live |
| `/dashboard/events/[id]/edit` | `app/dashboard/events/[id]/edit/page.tsx` | ✅ Live |
| `/dashboard/companies` | `app/dashboard/companies/page.tsx` | ✅ Live |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | ⚠️ Hardcoded data |
| `/dashboard/users` | `app/dashboard/users/page.tsx` | ⚠️ Mock data |
| `/dashboard/finance` | `app/dashboard/finance/page.tsx` | ⚠️ Mock data |
| `/dashboard/b2b` | `app/dashboard/b2b/page.tsx` | ⚠️ Mock data |
| `/dashboard/b2b/[id]` | `app/dashboard/b2b/[id]/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/analytics` | `app/dashboard/b2b/analytics/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/companies` | `app/dashboard/b2b/companies/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/companies/[id]` | `.../companies/[id]/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/companies/[id]/events` | `.../events/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/companies/[id]/events/[eventId]` | `.../[eventId]/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/licenses` | `app/dashboard/b2b/licenses/page.tsx` | 🚧 Stub |
| `/dashboard/b2b/licenses/[id]` | `.../licenses/[id]/page.tsx` | 🚧 Stub |
| `/dashboard/finance/[id]` | `app/dashboard/finance/[id]/page.tsx` | 🚧 Stub |
| `/dashboard/finance/reports` | `.../reports/page.tsx` | 🚧 Stub |
| `/dashboard/finance/reports/[id]` | `.../reports/[id]/page.tsx` | 🚧 Stub |
| `/dashboard/finance/transactions` | `.../transactions/page.tsx` | 🚧 Stub |
| `/dashboard/finance/transactions/[id]` | `.../transactions/[id]/page.tsx` | 🚧 Stub |

**Sidebar navigation** (`components/layout/sidebar.tsx`) exposes only 7 of these:
Dashboard, Events, Approvals (with live pending-count badge), Sales, Create Event, Analytics, Companies.

> **Broken links:** `/dashboard/users/analytics`, `/dashboard/users/export`, `/dashboard/users/invite`,
> `/dashboard/users/[id]`, `/dashboard/users/[id]/edit` are pushed by the Users page but **do not exist**.

### API routes

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Request OTP |
| POST | `/api/auth/validate-otp` | Verify OTP, issue session |
| GET | `/api/auth/status` | Session check |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/user/challenge` | Step-up OTP for sensitive actions |
| GET | `/api/events` | Paginated admin event list |
| GET / PUT / POST | `/api/events/[id]` | Event detail / update |
| POST | `/api/events/activate` | Activate event *(unused)* |
| GET | `/api/active-events` | Public-shape active event list |
| POST | `/api/event/create` | Create event |
| POST | `/api/event/update?eventId=` | Update event |
| POST | `/api/tickets/create` | Create ticket type |
| PUT | `/api/tickets/[id]` | Update ticket *(unused)* |
| POST | `/api/ticket/update?ticketId=` | Update ticket |
| POST | `/api/ticket/status/toggle?ticketId=` | Suspend/activate ticket (OTP) |
| GET | `/api/companies` | Paginated company list |
| GET | `/api/company/[id]` | Company detail |
| GET | `/api/dashboard/stats` | Dashboard KPIs |
| GET | `/api/b2b-subscriptions/active` | Active B2B subscriptions |
| POST | `/api/transactions/detailed` | Transaction ledger *(unused)* |
| POST | `/api/upload-image` | Poster upload to S3 |

---

## 4. Page documentation

### 4.1 `/` — Root redirect
**File:** `src/app/page.tsx` · **Server component**

Single call to `redirect('/dashboard')`. No APIs.

---

### 4.2 `/login` — Sign in
**Files:** `app/login/page.tsx`, `app/login/layout.tsx`, `components/auth/login-form.tsx`

**Layout** (`login/layout.tsx`) renders a decorative background: an inline `<style>` block defining
three `blob-drift` keyframe animations, a radial dot-grid overlay, and three blurred gradient blobs.
Purely presentational.

**Page** renders the brand mark (`/bg-dark.svg`) and `<LoginForm />`.

#### `LoginForm` functions

| Function | Description |
| --- | --- |
| `validateEmail(email)` | Required + regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Returns error string or `undefined`. |
| `validateOtpInput(otp)` | Required, exactly 4 digits, numeric only. |
| `handleInputChange(field, value)` | Updates `formData`, clears the field's validation error and the global error. |
| `handleEmailSubmit(e)` | Validates email → `requestOtp()` → advances to `'otp'` step, sets `resendCount = 1`, starts a 60 s resend timer. Surfaces 429 rate-limit messages verbatim. |
| `submitOtp(otp)` | Validates → `validateOtp()` → asserts `user.role === 'SUPER_ADMIN'` → sets step `'login'` (full-screen loader while `useAuth` redirects). |
| `handleOtpSubmit(e)` | Form-submit wrapper around `submitOtp(formData.otp)`. |
| `handleResendOtp()` | No-ops while the timer runs. On success increments `resendCount` and sets the next timer to `2^(resendCount-1) × 60` s (exponential: 60 s → 120 s → 240 s …). |
| `formatTime(seconds)` | `m:ss` display for the resend countdown. |

**State:** `formData {email, otp}`, `step: 'email' | 'otp' | 'login'`, `error`, `validationErrors`,
`resendTimer`, `resendCount`. A `useEffect` decrements `resendTimer` every second.

**Auto-submit:** `OtpInput`'s `onComplete` fires `submitOtp` as soon as the 4th digit is entered.

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `authApi.requestOtp(email, 'email')` | `POST /api/auth/login` | `POST {API}/user/otp/login` |
| `authApi.validateOtp(otp)` | `POST /api/auth/validate-otp` | *(none — cookie comparison only)* |

---

### 4.3 `/dashboard` — Overview
**File:** `src/app/dashboard/page.tsx`

Landing page: greeting, four KPI tiles, active-event list, pending-approvals card,
B2B-subscription card, quick links.

#### Functions

| Function | Description |
| --- | --- |
| `getGreeting()` | "Good morning/afternoon/evening" from `new Date().getHours()` (<12 / <17 / else). |
| `formatDate()` | Today as `Weekday, Month D, YYYY` (`en-US`). |
| `formatCurrency(amount)` | `Intl.NumberFormat('en-KE', {style:'currency', currency:'KES', maximumFractionDigits:0})`. |
| `fetchData()` | Runs stats and active-events fetches in parallel via `Promise.allSettled`. The stats branch fetches dashboard stats then **optionally** overlays `activeB2BSubscriptions` from the B2B endpoint (array `.length`, or `count`/`total` field); a B2B failure is swallowed as non-critical. Sets a friendly message on HTTP 401. Active events are truncated to the first 6. |

**Derived:** `statCards` — Companies → `/dashboard/companies`, Active Events → `/dashboard/events`,
Revenue → `/dashboard/finance`, Users → `/dashboard/users`.

**Per-event fill %:** `Σ soldQuantity / Σ quantityAvailable`, rendered as a percentage plus
`sold/available`; shows a "Live" pill when no quantities are available.

**License utilization:** `activeB2BSubscriptions / totalCompanies × 100`, clamped to 100 %.

**Loading:** skeleton placeholders for tiles, event rows, and both right-column cards.
**Error:** destructive alert with a Retry button re-invoking `fetchData()`.

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `dashboardApi.getStats()` | `GET /api/dashboard/stats` | `GET {API}/admin/dashboard/stats` |
| `b2bApi.getActiveSubscriptions()` | `GET /api/b2b-subscriptions/active` | `GET {API}/admin/b2b-subscriptions/active` |
| `eventsApi.getActiveEvents()` | `GET /api/active-events` | `GET {API}/events/get/all` |

---

### 4.4 `/dashboard/events` — Event management
**File:** `src/app/dashboard/events/page.tsx`

Paginated card list of **all** events with per-page revenue/tickets totals, search, status toggling
and an activation dialog.

#### Components & functions

| Name | Description |
| --- | --- |
| `fmt(n)` / `fmtNum(n)` | KES currency (0 dp) / plain `en-KE` number. |
| `StatusBadge({status})` | `ACTIVE` → green pulsing dot; `ONHOLD` → amber clock; anything else → neutral chip. |
| `EventCard({event, onToggle, onEdit, toggling})` | Poster, title + status, company/location/date/category meta, a 4-tile metric grid (Revenue, Tickets Sold + type count, Platform Fee + commission %, This Week sales), and a collapsible per-ticket breakdown table with a totals footer. Local `expanded` state. |
| `fetchData(page, search, isPagination)` | Loads a page. Uses a separate `isLoadingPagination` flag so paging shows an overlay spinner instead of full skeletons. Mirrors the result into `localStorage['eventsCache']`. |
| `handleSearch()` | Resets to page 0 and refetches with `searchTerm`. |
| `handlePageChange(p)` | Refetches with `isPagination = true`. |
| `handleToggleEventStatus(event)` | If the event is **not** `ACTIVE`, opens the commission dialog instead of acting. If it **is** `ACTIVE`, sends `{status:'ONHOLD', isActive:false}` and refetches. |
| `handleActivateWithCommission()` | Validates commission ∈ [0,100], then sends `{status:'ACTIVE', isActive:true, percentageCommission, published}` and refetches. Success banner auto-clears after 5 s. |

**Activation dialog:** custom fixed-overlay modal (not Radix) with a numeric commission input
(default `5.0`) and a Published on/off switch (Live 🌐 / Hidden 👁). Backdrop click cancels.

**Row actions:** Hold/Activate · Edit → `/dashboard/events/{id}/edit` · External link →
`https://soldoutafrica.com/{slug}` in a new tab.

**Page summary tiles:** revenue and tickets summed over the **current page only**.

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `eventsApi.getAllEvents(page, 10, search)` | `GET /api/events?page&size&searchName` | `GET {API}/admin/events/get/all` |
| `eventsApi.updateEvent(id, payload)` | `POST /api/event/update?eventId=` | `POST {API}/event/update?eventId=` |

---

### 4.5 `/dashboard/events/approvals` — Event approvals
**File:** `src/app/dashboard/events/approvals/page.tsx`

Review queue for events with status `ONHOLD`. Page size 20.

#### Components & functions

| Name | Description |
| --- | --- |
| `fmt(n)` | KES currency (0 dp). |
| `EventCard({event, commission, published, onCommissionChange, onPublishedChange, onApprove, approving})` | Poster with an "On Hold" overlay badge, full metadata row (company, category, location, start date/time, ticket-sale window), 2-line description clamp, a collapsible ticket-type table (Type / Price / Available, using `originalTicketCount ?? ticketCount`), and the approval control bar. Validates commission inline (`0–100`) and disables Approve when invalid. |
| `fetchEvents(page)` | `useCallback`-memoised. Fetches `status=ONHOLD` and **seeds** `settings[eventId] = {commission:'5', published: event.published ?? false}` for events not already in state, so per-card edits survive refetches. |
| `handleApprove(event)` | Reads that event's settings, re-validates the commission, sends `{status:'ACTIVE', isActive:true, percentageCommission, published}`, then refetches the current page. Success banner clears after 6 s. |

**State model:** `settings: Record<eventId, {commission: string; published: boolean}>` — each card
carries independent, unsaved approval parameters.

**Empty state:** "No events awaiting approval — All caught up!"

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `eventsApi.getAllEvents(page, 20, undefined, 'ONHOLD')` | `GET /api/events?...&status=ONHOLD` | `GET {API}/admin/events/get/all` |
| `eventsApi.updateEvent(id, payload)` | `POST /api/event/update?eventId=` | `POST {API}/event/update?eventId=` |

---

### 4.6 `/dashboard/events/sales` — Event sales report
**File:** `src/app/dashboard/events/sales/page.tsx`

Read-only sales view of **upcoming and ongoing active** events, with CSV export.

#### Functions

| Name | Description |
| --- | --- |
| `fmt(n)` / `fmtNum(n)` | KES currency / plain number. |
| `downloadCSV(events)` | Builds a two-section CSV entirely client-side: a titled header with generation timestamp, a per-event table (name, company, category, location, start date, tickets sold, gross revenue, platform fee, week sales, status), a TOTAL row, then a `── PER-TICKET BREAKDOWN ──` section (event, company, ticket type, price, sold, revenue). Escapes `"` by doubling, joins with CRLF, and triggers a Blob download named `event-sales-YYYY-MM-DD.csv`. |
| `SalesCard({event, onEdit})` | Poster, metadata, headline gross revenue, 4 metric tiles (Tickets Sold, Platform Fee, This Week, Attendees), View/Edit actions, collapsible ticket breakdown. |
| `fetchData(searchName)` | Fetches **one large page** (`size=500`, `status=ACTIVE`) then filters client-side to `eventEndDate >= now`. Resets to page 0. |
| `handleSearch()` / `handlePageChange(p)` | Server-side search re-fetch; pagination is purely client-side slicing. |

**Pagination is derived, not server-driven:** `PAGE_SIZE = 20`, `totalPages = ceil(allEvents.length / 20)`,
`events = allEvents.slice(page*20, (page+1)*20)`. This keeps counts accurate after the date filter.

**Summary tiles** (Page Revenue, Platform Fees, Tickets Sold) reflect the **current page slice**,
while the CSV export covers **all** loaded events.

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `eventsApi.getAllEvents(0, 500, searchName, 'ACTIVE')` | `GET /api/events?...&status=ACTIVE` | `GET {API}/admin/events/get/all` |

---

### 4.7 `/dashboard/events/create` — Create event wizard
**File:** `src/app/dashboard/events/create/page.tsx`

Three-step wizard: **Event Details → Tickets → Review**.

#### Constants

- `CATEGORIES` — 9 hardcoded id/label pairs (1 Music … 9 Other).
- `CURRENCIES` — `KES, USD, UGX, TZS, RWF, ZAR, GHS, NGN, MWK, AUD, CAD`.
- `MINUTES` (5-min steps), `HOURS12`.

#### Functions & components

| Name | Description |
| --- | --- |
| `slugify(str)` | Lowercase, non-alphanumerics → `-`, trim leading/trailing dashes. |
| `toIso(local)` | `new Date(local).toISOString()`, `''` for empty. |
| `emptyTicket()` | New `TicketForm` with a random `key`, `ticketLimitPerPerson: '1'`, `numberOfComplementary: '0'`. |
| `Field({label, required, children})` | Label + required asterisk wrapper. |
| `DateTimePicker({value, onChange})` | Splits a `YYYY-MM-DDTHH:mm` string into a native `date` input plus hour/minute/AM-PM `<select>`s. Minutes snap to the nearest 5. `emit()` recomposes 12 h + meridiem back to 24 h. Built for mobile touch targets (44 px rows, 16 px text). |
| `Steps({current})` | Three-step indicator: completed = green check, active = filled, future = muted. |
| `setField(key, value)` | Updates the event form; **auto-fills `slug`** from `eventName` while the slug is still empty. |
| `setTicketField(idx, key, value)` | Immutable per-ticket update. |
| `addTicket()` / `removeTicket(idx)` | Ticket list management (remove hidden when only one remains). |
| `lookupCompany()` | Validates the numeric company ID, calls `companyApi.getById`, shows the resolved company name in a green confirmation row or an inline error. |
| `handlePosterUpload(file)` | Client-side validation (JPEG/JPG/PNG/GIF/WebP, ≤ 10 MB), `FormData` POST to `/api/upload-image`, writes the returned URL into `eventPosterUrl`. |
| `handleSubmit()` | Creates the event first, extracts `event_id ?? event.id`, then creates each ticket **sequentially**; any ticket failure throws with the ticket name. On success shows the confirmation screen. |

#### Validation (live, drives the Continue button)

- **Step 1** — company ID (numeric), event name, description, category, location, event start/end,
  ticket-sale start/end, slug.
- **Step 2** — ≥ 1 ticket; per ticket: name, price (unless Free), quantity.

Errors render as an amber hint box showing the first 3 plus a "+N more" line.

#### Submission payloads

`createEvent` — `{eventName, eventDescription, eventPosterUrl, eventCategory:{id}, ticketSaleStartDate,
ticketSaleEndDate, eventLocation, eventStartDate, eventEndDate, percentageComission, company:{id},
slug, currency}` (note the backend's spelling: **`percentageComission`**).

`createTicket` — `{event:{id}, ticketName, ticketPrice, quantityAvailable, ticketsToIssue,
ticketLimitPerPerson, numberOfComplementary, ticketSaleStartDate, ticketSaleEndDate, isFree}`.
`ticketsToIssue` falls back to `quantityAvailable`; ticket sale dates fall back to the event's window.

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `companyApi.getById(id)` | `GET /api/company/{id}` | `GET {API}/company/get?companyId=` |
| `fetch('/api/upload-image')` | `POST /api/upload-image` | Contabo S3 `PutObject` |
| `createEventApi.createEvent(...)` | `POST /api/event/create` | `POST {API}/event/create` |
| `createEventApi.createTicket(...)` | `POST /api/tickets/create` | `POST {API}/event/ticket/create` |

---

### 4.8 `/dashboard/events/[id]/edit` — Edit event & tickets
**File:** `src/app/dashboard/events/[id]/edit/page.tsx` (largest page, ~1120 lines)

Two independent sections: the event-details form, and a ticket manager (inline edit, create,
suspend/activate).

#### Constants

`CATEGORIES`, `CURRENCIES` (as in Create) plus
`STATUSES = ['ACTIVE','CLOSED','SOLDOUT','PENDING','ONHOLD','FLASHSALE','POSTPONED']`.

#### Functions

| Name | Description |
| --- | --- |
| `toLocalDt(s)` | ISO → `YYYY-MM-DDTHH:mm` in **local** time (for the pickers). |
| `toISO(s)` | Local datetime string → ISO for the API. |
| `Field`, `DateTimePicker` | Same implementations as the Create page. |
| `emptyNewTicket()` | Blank new-ticket form including SMS/email template fields. |
| `fetchEvent()` | Loads the event, maps `ApiEvent` → form state, maps `ApiTicket[]` → `Ticket[]` (renaming `id` → `ticketId`), and seeds a per-ticket draft in `ticketForms`. Falls back `status` to `isActive ? 'ACTIVE' : 'ONHOLD'` and reads commission from either `percentageCommission` or `percentageComission`. |
| `setF(key, value)` | Event-form setter. |
| `handlePosterUpload(file)` | Same validation + `/api/upload-image` flow as Create. |
| `updateTicketForm(id, key, value)` | Updates one ticket draft. |
| `handleSaveEvent(e)` | Builds the payload; `status`, `percentageCommission`, `currency`, `eventCategoryId` are **conditionally** included so blank fields mean "no change". Refetches on success. |
| `handleSaveTicket(ticketId)` | Sends the draft (price forced to 0 when `isFree`), exits edit mode, refetches. |
| `handleCreateTicket(e)` | Creates a ticket against the current event, closes the form, refetches. |
| `handleSuspendClick(id, name)` / `handleActivateClick(id, name)` | Open `SuspendTicketModal` in the respective mode. |
| `handleSuspendRequestOtp()` | `eventsApi.requestChallenge()` — sends the step-up OTP. |
| `handleSuspendConfirm(otp)` | Posts `{otp, ticketStatus: 'ONHOLD' \| 'ACTIVE'}`, refetches on success, otherwise surfaces the error inside the modal. |
| `handleSuspendModalClose()` | Blocked while a suspend request is in flight. |
| `toggleTicketExpand(id)` | Set-based expand/collapse. |

#### Event-details form fields

Name, Category, Description, Location, Event Start/End, Ticket Sale Start/End, Status
(`— no change —` default), Commission %, Currency, URL Slug, Poster (upload + URL fallback +
preview with `onError` hide), Published toggle.

#### Ticket manager

Each ticket row shows name, status chip (`ACTIVE` green / `ONHOLD` amber / other neutral), Free and
Sold Out badges, price, and `sold/available · N left` (amber when ≤ 0).

Row actions: expand/collapse · **PlayCircle** (activate, only when `ONHOLD`) or **PauseCircle**
(suspend, only when not sold out) · Pencil (edit) → Save/Cancel.

Expanded read view shows Available / Sold / Limit-per-Person / Complementary and "SMS template set" /
"Email template set" chips. Expanded edit view adds all editable fields plus SMS and email purchase
notification templates. Supported placeholders: `{first_name}`, `{event_name}`, `{ticket_name}`,
`{ticket_link}` (SMS only).

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `eventsApi.getEventById(id)` | `GET /api/events/{id}` | `GET {API}/event/get?eventId=` |
| `eventsApi.updateEvent(id, payload)` | `POST /api/event/update?eventId=` | `POST {API}/event/update?eventId=` |
| `eventsApi.updateTicket(id, payload)` | `POST /api/ticket/update?ticketId=` | `POST {API}/ticket/update?ticketId=` |
| `createEventApi.createTicket(...)` | `POST /api/tickets/create` | `POST {API}/event/ticket/create` |
| `eventsApi.requestChallenge()` | `GET /api/user/challenge` | `GET {API}/user/challange?userId=` |
| `eventsApi.toggleTicketStatus(id, {otp, ticketStatus})` | `POST /api/ticket/status/toggle?ticketId=` | `POST {API}/ticket/status/toggle?ticketId=&userId=` |
| `fetch('/api/upload-image')` | `POST /api/upload-image` | Contabo S3 `PutObject` |

---

### 4.9 `/dashboard/companies` — Company directory
**File:** `src/app/dashboard/companies/page.tsx`

Paginated, searchable company list (page size 20). Read-only.

#### Functions & components

| Name | Description |
| --- | --- |
| `fmtDate(s)` | `D Mon YYYY` (`en-KE`), `—` when null. |
| `fmtPhone(phone)` | Normalises Kenyan numbers: strips non-digits; `254XXXXXXXXX` (12 digits) → `0XXXXXXXXX`; already-`0`-prefixed numbers pass through; otherwise returns the original. |
| `ProfileTypeBadge({type})` | `EVENT_ORGANIZER` violet, `TICKETING_COMPANY` blue, else neutral. Underscores → spaces. |
| `CompanyCard({company})` | Name, `#id`, profile-type badge, Active/Inactive chip, email, click-to-call phone (`tel:` link), currency; expandable panel with physical/postal address, joined & updated dates, and bio. |
| `fetchData(page, searchTerm, paging)` | Loads a page; `paging` swaps skeletons for an overlay spinner. |
| `handleSearch()` / `handlePageChange(p)` | Reset to page 0 / paged refetch. |

**Summary pills:** Total (server `totalElements`), Active (count on this page), Showing (rows rendered).
Search covers name, email, and phone (server-side).

#### APIs used

| Client call | Internal route | Upstream |
| --- | --- | --- |
| `companyApi.getAll(page, 20, search)` | `GET /api/companies?page&size&search` | `GET {API}/admin/companies` |

---

### 4.10 `/dashboard/analytics` — Platform analytics
**File:** `src/app/dashboard/analytics/page.tsx` · ⚠️ **All data is hardcoded in the file** (May 2025 – Apr 2026)

No API calls, no state, no effects — a static financial report.

#### Data constants

- `monthly[12]` — `{month, gmv, commission, grossProfit, margin}`.
- `channelMix[4]` — M-Pesa 89.4 %, Paystack 9.7 %, LittlePay 0.7 %, Other 0.3 %.
- `kpis` — GMV 31,141,864 · income 3,492,186 · gross profit 3,400,494 · margin 97.4 % · direct costs
  91,692 · 234 events · 1,285,839 tickets · avg ticket 2,500 · check-in 86 % · 53 repeat organizers ·
  largest event 10,570 · best month 1,540,659.

#### Functions & components

| Name | Description |
| --- | --- |
| `fmt(n)` | `en-KE` number. |
| `fmtK(n)` | Compact axis labels: ≥1 M → `X.XM`, ≥1 K → `XK`. |
| `fmtC(n)` | KES currency, 0 dp. |
| `StatCard({label, value, icon, iconBg, iconColor, valueColor, note})` | KPI tile. |
| `GmvTip`, `IncomeTip`, `MarginTip`, `PieTip` | Custom Recharts tooltips. |

#### Sections

Financial KPI row · secondary KPI row (repeat organizers, best month, direct costs) · operational KPI
row · **AreaChart** monthly GMV (gradient fill) · **PieChart** donut of channel mix with a legend of
mini progress bars · **BarChart** monthly commission · **LineChart** gross margin (`domain [80,100]`,
filtered to `margin > 0`) · monthly summary table (direct cost derived as `commission − grossProfit`,
December highlighted as "Peak") · summary strip (avg monthly income, avg ex-December, repeat-organizer
rate, M-Pesa share).

---

### 4.11 `/dashboard/users` — Users dashboard
**File:** `src/app/dashboard/users/page.tsx` · ⚠️ **Mock data** (8 users, simulated 1 s delay)

#### Functions

| Name | Description |
| --- | --- |
| `fetchData()` (inside `useEffect`) | `await new Promise(setTimeout 1000)` then sets `mockStats` and `mockUsers`. Marked *"replace with actual API calls"*. |
| `filteredUsers` | Client filter across name/email/phone/location/company plus role, status and verification dropdowns. |
| `getRoleBadge(role)` | admin red · organizer blue · moderator purple · user green. |
| `getStatusBadge(status)` | active green · inactive neutral · suspended red · pending yellow. |
| `formatCurrency(amount)` | KES currency. |
| `formatDate(dateString)` | `Mon D, YYYY` (`en-KE`). |
| `getActivityStatus(lastActive)` | Day delta → `Today` (green) / `Nd ago` blue ≤7 / yellow ≤30 / red beyond. |

**UI:** 6 stat cards (total, active, new this month, suspended, verified, revenue), search + 3 Radix
`Select` filters, and a users table (User, Role, Status, Activity, Events, Spent, Actions).

**APIs used:** none. **Header/row buttons link to non-existent routes** — see [§3](#3-route-map).

---

### 4.12 `/dashboard/finance` — Finance dashboard
**File:** `src/app/dashboard/finance/page.tsx` · ⚠️ **Mock data** (8 transactions, simulated 1 s delay)

#### Functions

| Name | Description |
| --- | --- |
| `fetchData()` | Simulated delay, then sets `mockStats` / `mockTransactions`. |
| `filteredTransactions` | Filters on description/reference/event/company text plus type, status and category. |
| `getTypeBadge` / `getStatusBadge` / `getCategoryBadge` | Colour classes per enum value. |
| `getPaymentMethodIcon(method)` | Emoji: mpesa 📱 · bank_transfer 🏦 · card 💳 · paypal 💰. |
| `formatCurrency` / `formatDate` | KES currency / `Mon D, YYYY`. |

**UI:** 6 stat cards (revenue, expenses, net profit, pending payments, completed transactions, monthly
growth), search + 3 filter selects, transactions table. Amounts are prefixed `+` for
income/commission and `−` otherwise.

**APIs used:** none. Note that `transactionsApi.fetchDetailed` and `POST /api/transactions/detailed`
already exist and are the obvious wiring target for this page.

---

### 4.13 `/dashboard/b2b` — B2B dashboard
**File:** `src/app/dashboard/b2b/page.tsx` · ⚠️ **Mock data** (4 companies, simulated 1 s delay)

#### Functions

| Name | Description |
| --- | --- |
| `fetchData()` | Simulated delay → `mockStats` / `mockCompanies`. |
| `filteredCompanies` | Name/email search + status filter (`all\|active\|pending\|inactive`). |
| `getStatusBadge(status)` / `getLicenseBadge(license)` | Colour classes; enterprise licences render purple. |
| `formatCurrency(amount)` / `formatDate(dateString)` | KES currency / `Mon D`. |

**UI:** 6 stat cards, search + status pill buttons, companies table (Company, Status, License, Events,
Revenue, Activity, Actions). "View" → `/dashboard/b2b/companies/{id}` (a stub page).

**APIs used:** none — even though `/api/b2b-subscriptions/active` exists and is consumed by the main
dashboard.

---

### 4.14 Stub pages

Placeholder pages with no data fetching and no APIs:

| Page | Content |
| --- | --- |
| `b2b/analytics`, `b2b/companies`, `b2b/licenses`, `finance/reports`, `finance/transactions` | Title + "Coming soon…" / "will be displayed here". |
| `b2b/[id]`, `b2b/companies/[id]` | Client components with a fake 500 ms `setTimeout` loader, a back button, and an "under construction" card echoing the route id. |
| `b2b/licenses/[id]`, `b2b/companies/[id]/events`, `b2b/companies/[id]/events/[eventId]`, `finance/[id]`, `finance/reports/[id]`, `finance/transactions/[id]` | Title + echoed route params. |

> ⚠️ `b2b/licenses/[id]`, `finance/[id]`, `finance/reports/[id]` and `finance/transactions/[id]`
> type `params` as a plain object (`{ params: { id: string } }`). In Next.js 15 `params` is a Promise —
> these will need `await`/`use()` before they can render real data.

---

## 5. Internal API route reference

All routes return JSON with a `{ status: boolean, message: string }` envelope on error. Unless noted,
each one validates the `auth_token` cookie (8 h max age, deleted when expired) and forwards to the
backend with `Authorization: Basic base64(API_USERNAME:API_PASSWORD)`.

### Auth

#### `POST /api/auth/login`
Wrapped in `withErrorHandler`. Reads the client IP from `x-forwarded-for` / `x-real-ip`, applies
`checkRateLimit(ip, identifier)`, then proxies the body to `POST {API}/user/otp/login`.
**Strips the OTP from the response** and stores `{otp, user, timestamp}` in the httpOnly
`auth_verification` cookie (300 s). Always replies with a generic success message.
**Body:** `{ id: string, method: 'email' | 'phone' }` · **429** when rate-limited.

#### `POST /api/auth/validate-otp`
No upstream call. Reads `auth_verification`, checks the 5-minute window, compares the OTP, enforces
`user.role === 'SUPER_ADMIN'` (403), then issues the `auth_token` cookie and returns a sanitized user
object (role, email, phoneNumber, company_name, is_active, profile_type). Resets the identifier rate
limit and deletes the verification cookie.
**Errors:** 401 missing/expired session · 401 expired code · 401 wrong code · 403 non-admin.

#### `GET /api/auth/status`
Reads and parses `auth_token`, checks the 8 h window (deleting the cookie if stale).
Returns `{isAuthenticated, user:{userId, role, email}}` or `{isAuthenticated:false, message}`.
Notably returns **HTTP 200 with `isAuthenticated:false`** for unauthenticated users, which is what
lets `AuthGuard` distinguish real rejection from transient errors.

#### `POST /api/auth/logout`
Wrapped in `withErrorHandler`. Reads the email from `auth_token`, resets that identifier's rate limit,
deletes `auth_token`, returns `{success:true}`.

#### `GET /api/user/challenge`
Requires a session, extracts `userId`, calls `GET {API}/user/challange?userId={userId}`
(note the backend's spelling). Used for step-up OTP before suspending/activating tickets.

### Events

| Route | Upstream | Notes |
| --- | --- | --- |
| `GET /api/events` | `GET {API}/admin/events/get/all?page&size[&searchName][&status]` | Defaults `page=0`, `size=10`. Verbose `[Events API]` console logging. |
| `GET /api/events/[id]` | `GET {API}/event/get?eventId={id}` | Event detail incl. tickets. |
| `PUT\|POST /api/events/[id]` | `POST {API}/event/update?eventId={id}` | Shared `handleEventUpdate`. **No client currently calls this.** |
| `POST /api/events/activate` | `POST {API}/event/activate` | Body passed through. **Unused** — activation goes through `/api/event/update`. |
| `GET /api/active-events` | `GET {API}/events/get/all[?page&size]` | Public-shaped event list used by the dashboard. |
| `POST /api/event/create` | `POST {API}/event/create` | **Enriches the body** from the session: injects `users:{id:userId}` and `company:{id:companyId}` when absent. |
| `POST /api/event/update?eventId=` | `POST {API}/event/update?eventId=` | ⚠️ **Does not check the session cookie** — only requires `eventId`. |

### Tickets

| Route | Upstream | Notes |
| --- | --- | --- |
| `POST /api/tickets/create` | `POST {API}/event/ticket/create` | Session-checked. |
| `PUT /api/tickets/[id]` | `POST {API}/ticket/update?ticketId={id}` | **Unused** duplicate of the route below. |
| `POST /api/ticket/update?ticketId=` | `POST {API}/ticket/update?ticketId=` | Session-checked; 400 without `ticketId`. |
| `POST /api/ticket/status/toggle?ticketId=` | `POST {API}/ticket/status/toggle?ticketId=&userId=` | Appends `userId` from the session. Body `{otp, ticketStatus}`. |

### Companies, stats, transactions

| Route | Upstream | Notes |
| --- | --- | --- |
| `GET /api/companies` | `GET {API}/admin/companies?page&size[&search]` | Checks the cookie **exists** but does not verify its expiry. Defaults `page=0`, `size=20`. |
| `GET /api/company/[id]` | `GET {API}/company/get?companyId={id}` | ⚠️ **No session check at all.** Validates that the id is numeric (400 otherwise). |
| `GET /api/dashboard/stats` | `GET {API}/admin/dashboard/stats` | Session-checked. |
| `GET /api/b2b-subscriptions/active` | `GET {API}/admin/b2b-subscriptions/active` | Session-checked. |
| `POST /api/transactions/detailed` | `POST {API}/transactions/detailed` | Session-checked. Body `{id, idType:'company'\|'event'\|'user', transactionType, page, size}`. **Unused by any page.** |

### Uploads

#### `POST /api/upload-image`
Accepts `multipart/form-data` with a `file` field. Validates MIME type
(`jpeg/jpg/png/gif/webp`) and size (≤ 10 MB), generates the key
`events/{timestamp}-{random}.{ext}`, and uploads to Contabo S3 with `ACL: 'public-read'` and
`forcePathStyle: true`.
**Returns:** `{success:true, url:'https://eu2.contabostorage.com/{bucketFull}/{key}'}`.
⚠️ **No authentication check, and the S3 credentials are hardcoded in the file** — see [§10](#10-known-gaps-dead-code--risks).

---

## 6. Upstream (backend) endpoint index

Every backend call, authenticated with HTTP Basic.

| Backend endpoint | Method | Called from |
| --- | --- | --- |
| `/user/otp/login` | POST | `/api/auth/login` |
| `/user/challange?userId=` | GET | `/api/user/challenge` |
| `/admin/dashboard/stats` | GET | `/api/dashboard/stats` |
| `/admin/events/get/all` | GET | `/api/events` |
| `/admin/companies` | GET | `/api/companies` |
| `/admin/b2b-subscriptions/active` | GET | `/api/b2b-subscriptions/active` |
| `/events/get/all` | GET | `/api/active-events` |
| `/event/get?eventId=` | GET | `/api/events/[id]` |
| `/event/create` | POST | `/api/event/create` |
| `/event/update?eventId=` | POST | `/api/event/update`, `/api/events/[id]` |
| `/event/activate` | POST | `/api/events/activate` *(unused)* |
| `/event/ticket/create` | POST | `/api/tickets/create` |
| `/ticket/update?ticketId=` | POST | `/api/ticket/update`, `/api/tickets/[id]` |
| `/ticket/status/toggle?ticketId=&userId=` | POST | `/api/ticket/status/toggle` |
| `/company/get?companyId=` | GET | `/api/company/[id]` |
| `/transactions/detailed` | POST | `/api/transactions/detailed` *(unused)* |

---

## 7. Shared library reference

### `src/lib/api.ts`

`queryClient` — TanStack Query client, `staleTime` 5 min, `retry: 1`.

`ApiError extends Error` — carries `status` and `data`.

`fetchApi<T>(url, options)` — the single fetch wrapper. Generates a 7-char request id, sends
`Content-Type`/`Accept`/`X-Request-ID` headers with `credentials: 'include'`, **rejects non-JSON
responses**, parses JSON, and throws `ApiError` on `!response.ok`. Logs request, response headers and
a data preview to the console on every call.

| Client | Methods |
| --- | --- |
| `authApi` | `requestOtp(identifier, method)`, `validateOtp(otp)`, `checkAuth()`, `logout()` |
| `eventsApi` | `getAllEvents(page, size, searchName?, status?)`, `getAllActiveAdminEvents()` *(unused — auto-pages `size=50` until `hasNext` is false)*, `getEventById(id)`, `updateEvent(id, data)`, `updateTicket(id, data)`, `requestChallenge()`, `toggleTicketStatus(id, {otp, ticketStatus})`, `createTicket(data)`, `getActiveEvents()`, `activateEvent(id, commission)` *(unused)* |
| `b2bApi` | `getActiveSubscriptions()` |
| `dashboardApi` | `getStats()` |
| `transactionsApi` | `fetchDetailed({id, idType, transactionType='TICKET_SALE', page=0, size=50})` *(unused)* |
| `companyApi` | `getById(companyId)`, `getAll(page, size, search?)` |
| `createEventApi` | `createEvent(data)`, `createTicket(data)` |

**Exported types:** `LoginResponse`, `OtpValidationResponse`, `ActiveEvent`, `ActiveEventTicket`,
`AdminEvent`, `AdminEventTicketSummary`, `TransactionRecord`, `TransactionStats`, `Company`.

> `AdminEventTicketSummary` deliberately carries both shapes — `ticketsSold`/`revenue` from
> `/admin/events/get/all`, and `uniqueTicketCount`/`totalTicketSaleBalance`/`originalTicketCount`/
> `ticketCount` from the newer `/admin/events/all` — all optional.

### `src/lib/auth.ts`

| Export | Description |
| --- | --- |
| `withErrorHandler(handler)` | Wraps a route handler; catches everything and returns a JSON 500. Used by the login and logout routes. |
| `verifyAuth(authToken)` | Parses the token and enforces a **2-hour** expiry. **Currently unused** (routes inline an 8-hour check). |
| `hasRole(authData, role)` / `isSuperAdmin(authData)` | Role helpers. **Currently unused.** |

### `src/lib/rate-limit.ts`

`checkRateLimit(ip, identifier?)` → `{status:429, message}` or `null`; records the request when it
passes. Internals: `checkIpRateLimit`, `checkIdentifierRateLimit`, `recordIpRequest`,
`recordIdentifierRequest`. Also exports `resetRateLimitForIdentifier(identifier)` and
`cleanupRateLimits()` *(never called — no scheduler exists)*.

### `src/lib/utils.ts`

`cn(...inputs)` — `twMerge(clsx(...))`, used throughout the UI primitives.
`withErrorHandler` — a second, generic implementation that includes stack traces in development.
**Unused**; the route handlers import the `lib/auth.ts` version instead.

### `src/lib/types.ts`

Domain types: `DashboardStats(+Response)`, `EventCreator`, `EventAnalytics`, `TicketSummary`,
`Event`, `EventsData`, `EventsResponse`, `Ticket`, `EventDetail(+Response)`, `UpdateEventRequest`,
`UpdateTicketRequest`. Several pages redeclare local copies of these instead of importing them.

### `src/lib/hooks/useAuth.ts`

Wraps `authApi` in TanStack `useMutation`s.

| Export | Description |
| --- | --- |
| `requestOtp(identifier, method)` | `mutateAsync` for OTP request. |
| `validateOtp(otp)` | On success writes `userEmail` and `userName` to `localStorage` and pushes `/dashboard`. |
| `logout()` | Calls the API, clears those `localStorage` keys, pushes `/login`. |
| `isRequestingOtp`, `isValidatingOtp`, `isLoggingOut`, `requestOtpError`, `validateOtpError` | Status flags. |

---

## 8. Shared components

### Layout

| Component | Description |
| --- | --- |
| `DashboardShell` | Flex shell with a fixed 264 px sidebar (slide-in on mobile, `md:translate-x-0`), backdrop, and a scrollable `<main>` capped at `max-w-7xl`. Closes the sidebar on route change and locks `body` scroll while open. |
| `Sidebar` | Brand mark, 7 nav links with active highlighting, a live **Approvals** badge (fetched once on mount via `eventsApi.getAllEvents(0, 1, undefined, 'ONHOLD')` → `totalElements`), and a user/logout footer reading `localStorage.userEmail`. Logout goes through a Radix `AlertDialog`. |
| `Header` | 56 px bar. Mobile: hamburger + absolutely-centred page title. Desktop: breadcrumb trail derived from `usePathname()` against a `ROUTE_LABELS` map, falling back to capitalising the segment. |
| `Navbar` | Legacy 4-link nav bar. **Not imported anywhere.** |
| `breadcrumbs.tsx` | **Empty file (0 bytes).** |

### Auth

| Component | Description |
| --- | --- |
| `AuthGuard` | Session check before rendering `/dashboard/*`; see [§2](#2-authentication--session). |
| `LoginForm` | Two-step OTP form; see [§4.2](#42-login--sign-in). |

### UI primitives (`src/components/ui/`)

`alert`, `alert-dialog`, `button`, `card`, `input`, `label`, `select`, `tabs`, `tooltip` — shadcn/Radix
wrappers configured via `components.json`.

| Component | Description |
| --- | --- |
| `loader.tsx` | `Loader` (size/variant), `FullScreenLoader` (message + variant), `LoadingButton` (`isLoading`, `loadingText`, variant). |
| `otp-input.tsx` | 4-box code input with per-digit refs, auto-advance, backspace-to-previous, paste handling, and an `onComplete` callback. |
| `suspend-ticket-modal.tsx` | Two-step modal for ticket suspend/activate. Step `confirm` shows a colour-coded warning (red suspend / green activate) and a Continue button that calls `onRequestOtp()`; step `otp` renders `OtpInput`, a resend link, Back, and the confirm button. Auto-submits at 4 digits. All controls disable while `isLoading \|\| isRequestingOtp`. |

---

## 9. Configuration & environment

### Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | every proxy route | Backend base URL |
| `NEXT_PUBLIC_API_USERNAME` | every proxy route | Basic auth user |
| `NEXT_PUBLIC_API_PASSWORD` | every proxy route | Basic auth password |
| `NODE_ENV` | auth routes | Controls the `secure` cookie flag |

> ⚠️ These are read server-side only, but the `NEXT_PUBLIC_` prefix means Next.js **inlines them into
> the client bundle** wherever they are referenced. Rename them (drop the prefix) so the API password
> cannot leak.

### `next.config.ts`

- `serverExternalPackages: ['@aws-sdk/client-s3']`.
- Blanket CORS headers on `/api/:path*`: `Allow-Credentials: true` **with** `Allow-Origin: *`, plus a
  forced `Content-Type: application/json`.
- `images.remotePatterns`: `res.cloudinary.com`, `images.unsplash.com`, `eu2.contabostorage.com`
  (though pages use plain `<img>`, not `next/image`).

### Build & deploy

```bash
pnpm dev     # next dev --turbopack
pnpm build   # next build --turbopack
pnpm start
pnpm lint
```

Netlify: `corepack enable && corepack prepare pnpm@9 --activate && pnpm install && pnpm run build`,
publish `.next`, Node 20, `@netlify/plugin-nextjs`. Root `package.json` pins Node `>=20 <21`, pnpm `>=8`.

---

## 10. Known gaps, dead code & risks

### Security

| Issue | Location | Detail |
| --- | --- | --- |
| **Hardcoded S3 credentials** | `api/upload-image/route.ts` | Access key and secret are literals in source and committed to git. Rotate them and move to env vars. |
| **Unauthenticated upload endpoint** | `api/upload-image/route.ts` | Anyone can POST a ≤10 MB image to the public bucket. |
| **Unauthenticated proxies** | `api/company/[id]`, `api/event/update` | Neither checks the session cookie; `/api/event/update` can change any event given an id. |
| **Weak session check** | `api/companies/route.ts` | Checks the cookie exists but never validates `issuedAt`. |
| **Unsigned session token** | `auth/validate-otp` + `middleware.ts` | `auth_token` is plain JSON. It is httpOnly, so it is not readable from JS, but nothing detects tampering if it is ever writable. Sign it (JWT/HMAC). |
| **CORS `*` with credentials** | `next.config.ts` | `Allow-Origin: *` alongside `Allow-Credentials: true` is invalid and browser-rejected; specify the real origin. |
| **`NEXT_PUBLIC_` secrets** | all proxy routes | See [§9](#9-configuration--environment). |
| **Verbose logging** | most routes, `lib/api.ts` | Emails, tokens-adjacent data and response bodies are logged in production. |

### Correctness / consistency

- **Token lifetime drift** — the cookie and all route checks use 8 h; `lib/auth.ts:verifyAuth` uses 2 h;
  several routes carry stale `// 2 hours` comments next to 8-hour constants.
- **Duplicate routes** — `/api/tickets/[id]` (PUT) and `/api/ticket/update` hit the same backend
  endpoint; `/api/events/[id]` (POST/PUT) and `/api/event/update` likewise. Only one of each is used.
- **`params` typing** — the four stub pages listed in [§4.14](#414-stub-pages) type `params` as a plain
  object; Next.js 15 delivers a Promise.
- **Backend spelling quirks** — `percentageComission` (create) vs `percentageCommission` (update), and
  `/user/challange`. The edit page defensively reads both commission spellings.
- **`localStorage['eventsCache']`** — written by the Events page, never read.
- **Broken links** — the Users page routes to five pages that do not exist.

### Dead code

`Navbar` · `breadcrumbs.tsx` (empty) · `lib/utils.ts:withErrorHandler` ·
`lib/auth.ts:verifyAuth` / `hasRole` / `isSuperAdmin` · `rate-limit.ts:cleanupRateLimits` ·
`eventsApi.activateEvent` · `eventsApi.getAllActiveAdminEvents` · `transactionsApi.fetchDetailed` ·
`/api/events/activate` · `/api/tickets/[id]` · `/api/transactions/detailed` ·
`POST|PUT /api/events/[id]`.

### Not yet wired to real data

| Page | Current source | Available API |
| --- | --- | --- |
| `/dashboard/analytics` | Hardcoded 12-month dataset | — |
| `/dashboard/users` | 8 mock users | — |
| `/dashboard/finance` | 8 mock transactions | `transactionsApi.fetchDetailed` already exists |
| `/dashboard/b2b` | 4 mock companies | `b2bApi.getActiveSubscriptions`, `companyApi.getAll` |
| 13 stub pages | Static placeholders | — |

### Operational

- **Rate limiting is in-memory** — `Map`s do not survive redeploys and are not shared across serverless
  instances, so OTP limits are effectively per-instance on Netlify.
- **`cleanupRateLimits()` is never scheduled** — the maps grow unbounded within an instance's lifetime.
- **No test suite** and no CI configuration in the repo.
