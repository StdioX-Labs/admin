# API Documentation — Page by Page

Every API call the admin dashboard makes, organised by the page that makes it.
For architecture, page functions and UI behaviour see [`DOCUMENTATION.md`](./DOCUMENTATION.md).

**How to read this doc.** Each entry documents one call in four hops:

```
Trigger          what the user did, or which lifecycle hook fired
Client function  the helper in src/lib/api.ts the page calls
Internal route   the Next.js route handler under src/app/api/**
Upstream         the backend endpoint that route proxies to
```

Notation: `{API}` = `process.env.NEXT_PUBLIC_API_BASE_URL`. All internal routes are same-origin and
sent with `credentials: 'include'`; all upstream calls carry
`Authorization: Basic base64(NEXT_PUBLIC_API_USERNAME:NEXT_PUBLIC_API_PASSWORD)`.

---

## Contents

| Page | Calls |
| --- | --- |
| [`/login`](#login) | 2 |
| [`/dashboard`](#dashboard) | 3 |
| [`/dashboard/events`](#dashboardevents) | 2 |
| [`/dashboard/events/approvals`](#dashboardeventsapprovals) | 2 |
| [`/dashboard/events/sales`](#dashboardeventssales) | 1 |
| [`/dashboard/events/create`](#dashboardeventscreate) | 4 |
| [`/dashboard/events/[id]/edit`](#dashboardeventsidedit) | 7 |
| [`/dashboard/companies`](#dashboardcompanies) | 1 |
| [Sidebar (every dashboard page)](#sidebar--every-dashboard-page) | 1 |
| [`AuthGuard` (every dashboard page)](#authguard--every-dashboard-page) | 1 |
| [Sidebar logout](#sidebar-logout) | 1 |
| [Pages that make no API calls](#pages-that-make-no-api-calls) | 0 |
| [Unused endpoints](#unused-endpoints) | — |

**Cross-reference:** [call matrix](#appendix-a--callpage-matrix) · [shared envelopes](#appendix-b--shared-response-envelopes) · [shared error semantics](#appendix-c--shared-error-semantics) · [type/runtime mismatches](#appendix-d--declared-vs-actual-response-shapes)

---

## `/login`

**File:** `src/components/auth/login-form.tsx` (rendered by `src/app/login/page.tsx`)

### 1. Request OTP

| | |
| --- | --- |
| **Trigger** | Submitting the email form (`handleEmailSubmit`) **or** clicking "Resend code" (`handleResendOtp`) |
| **Client** | `authApi.requestOtp(email, 'email')` |
| **Internal** | `POST /api/auth/login` |
| **Upstream** | `POST {API}/user/otp/login` |

**Request body**

```json
{ "id": "admin@example.com", "method": "email" }
```

`method` is typed `'email' | 'phone'`; the login form always passes `'email'`.

**Server-side processing**

1. Client IP is read from `x-forwarded-for`, falling back to `x-real-ip`, then `'unknown-ip'`.
2. `checkRateLimit(ip, identifier)` runs — IP limit 10 requests / 30 min block, identifier limit
   5 requests / 1 h block. A hit short-circuits with **429** and never reaches the backend.
3. The body is forwarded verbatim to the backend.
4. The backend's response is destructured to `{ otp, user }`. **The OTP is removed from the client
   response** and stored, with the user object, in the httpOnly `auth_verification` cookie.

**Cookie set**

| Name | Value | Max-Age | Flags |
| --- | --- | --- | --- |
| `auth_verification` | `JSON.stringify({ otp, user, timestamp: Date.now() })` | `300` (5 min) | `httpOnly`, `sameSite=strict`, `secure` in production, `path=/` |

**Response 200**

```json
{
  "message": "A verification code has been sent to your email address",
  "status": true
}
```

The message is a fixed string — the backend's own message is discarded.

**Errors**

| Status | Body | Cause |
| --- | --- | --- |
| 429 | `{ message: "<rate-limit message>", status: false }` | IP or email over the limit; the message names the remaining wait in minutes |
| 500 | `{ message: "Invalid response from authentication service", status: false }` | Backend returned non-JSON |
| 500 | `{ message: "<error.message>", status: false }` | Any thrown error (`withErrorHandler`) |

**Page handling** — on `status: true` the form advances to the OTP step, sets `resendCount = 1` and
starts a 60 s timer. A thrown `ApiError` with `status === 429` has its message shown verbatim;
anything else falls back to `'Failed to send verification code'`.

---

### 2. Validate OTP

| | |
| --- | --- |
| **Trigger** | The 4th digit is entered (`OtpInput.onComplete`) or "Verify & sign in" is clicked |
| **Client** | `authApi.validateOtp(otp)` |
| **Internal** | `POST /api/auth/validate-otp` |
| **Upstream** | **None** — validated entirely against the cookie |

**Request body**

```json
{ "otp": "1234" }
```

**Server-side processing**

1. Reads `auth_verification`; missing → 401.
2. Rejects if `Date.now() - timestamp > 5 * 60 * 1000`, deleting the cookie.
3. Compares `otp` by strict equality (`!==`).
4. Rejects `user.role !== 'SUPER_ADMIN'` with 403.
5. Builds the session token, calls `resetRateLimitForIdentifier(user.email)`, deletes
   `auth_verification`.

**Cookie set**

| Name | Value | Max-Age | Flags |
| --- | --- | --- | --- |
| `auth_token` | `JSON.stringify({ userId, role, email, companyId, issuedAt })` | `28800` (8 h) | `httpOnly`, `sameSite=lax`, `secure` in production, `path=/` |

**Response 200**

```json
{
  "message": "Login successful",
  "user": {
    "role": "SUPER_ADMIN",
    "email": "admin@example.com",
    "phoneNumber": "254700000000",
    "company_name": "SoldOutAfrica",
    "is_active": true,
    "profile_type": "ADMIN"
  },
  "status": true
}
```

**Errors**

| Status | Message | Cause |
| --- | --- | --- |
| 401 | `Verification session expired or invalid. Please request a new OTP.` | No `auth_verification` cookie |
| 401 | `Verification code has expired. Please request a new one.` | Older than 5 minutes |
| 401 | `Invalid verification code. Please try again.` | Mismatch |
| 403 | `Access denied. Only administrators can access this portal.` | `role !== 'SUPER_ADMIN'` |

**Page handling** — `useAuth`'s `onSuccess` writes `userEmail` and `userName` to `localStorage` and
pushes `/dashboard`. The form separately re-asserts `user.role === 'SUPER_ADMIN'` before switching to
the `'login'` loading step (a redundant client-side check — the server already enforces it).

---

## `/dashboard`

**File:** `src/app/dashboard/page.tsx` · All three calls fire from `fetchData()` on mount and on Retry.

Stats and active events run concurrently through `Promise.allSettled`; the B2B call is nested
**inside** the stats branch and awaited only after stats resolve.

### 1. Dashboard stats

| | |
| --- | --- |
| **Trigger** | Mount / Retry |
| **Client** | `dashboardApi.getStats()` |
| **Internal** | `GET /api/dashboard/stats` |
| **Upstream** | `GET {API}/admin/dashboard/stats` |

**Request** — no body, no query parameters.

**Response 200**

```ts
{
  data: {
    totalCompanies: number;
    activeEvents: number;
    totalRevenue: number;
    totalUsers: number;
    pendingApprovals: number;
    activeB2BSubscriptions: number;
  };
  message: string;
  status: boolean;
}
```

**Consumed by** — the four KPI tiles (`totalCompanies`, `activeEvents`, `totalRevenue`,
`totalUsers`), the Pending Approvals card (`pendingApprovals`), and the B2B card
(`activeB2BSubscriptions`, plus `totalCompanies` for the utilization bar).

**Page handling** — a rejection with `status === 401` renders
`'You are not authorized. Please log in again.'`; anything else shows `err.message`. Both render a
destructive alert with a Retry button.

---

### 2. Active B2B subscriptions

| | |
| --- | --- |
| **Trigger** | Immediately after stats resolve, inside the same async branch |
| **Client** | `b2bApi.getActiveSubscriptions()` |
| **Internal** | `GET /api/b2b-subscriptions/active` |
| **Upstream** | `GET {API}/admin/b2b-subscriptions/active` |

**Response 200**

```ts
{ data: unknown; message: string; status: boolean }
```

`data` is deliberately untyped because the backend shape is unsettled. The page normalises it:

```ts
if (Array.isArray(d))            merged.activeB2BSubscriptions = d.length;
else if (typeof d === 'object')  merged.activeB2BSubscriptions =
                                   d.count ?? d.total ?? merged.activeB2BSubscriptions;
```

**Failure is non-fatal** — the call sits in its own `try { } catch { /* non-critical */ }`, so the
dashboard falls back to the `activeB2BSubscriptions` value already supplied by the stats endpoint.

---

### 3. Active events

| | |
| --- | --- |
| **Trigger** | Mount / Retry, in parallel with stats |
| **Client** | `eventsApi.getActiveEvents()` |
| **Internal** | `GET /api/active-events` |
| **Upstream** | `GET {API}/events/get/all` |

**Query parameters** — the route forwards `page` and `size` when present, but the dashboard sends
neither, so the backend's defaults apply.

**Response 200**

```ts
{
  events: ActiveEvent[];   // see below
  message: string;
  status: boolean;
}
```

```ts
interface ActiveEvent {
  id: number; eventName: string; eventDescription: string; eventPosterUrl: string;
  eventCategoryId: number; ticketSaleStartDate: string; ticketSaleEndDate: string;
  eventLocation: string; eventStartDate: string; eventEndDate: string;
  isActive: boolean; published: boolean; tickets: ActiveEventTicket[];
  createdById: number; companyId: number; companyName: string; comission: number;
  category: string; date: string; time: string; isFeatured: boolean;
  price: number; slug: string; currency: string;
}

interface ActiveEventTicket {
  id: number; ticketName: string; ticketPrice: number; quantityAvailable: number;
  soldQuantity: number; isActive: boolean; ticketsToIssue: number;
  isSoldOut: boolean; isFree: boolean; ticketStatus: string; createAt: string;
}
```

> This is the **public-site event shape** (`id`, `category`, `comission`), not the admin shape
> (`eventId`, `eventCategory`, `percentageCommission`) returned by `/api/events`.

**Consumed by** — the Active Events list, truncated to `.slice(0, 6)`. Fill percentage is computed
from `tickets`: `Σ soldQuantity / Σ quantityAvailable`.

**Page handling** — a rejection is silently ignored; the list simply stays empty and renders the
"No active events" state. Only a stats failure sets the page-level error.

---

## `/dashboard/events`

**File:** `src/app/dashboard/events/page.tsx`

### 1. List events

| | |
| --- | --- |
| **Trigger** | Mount, Search, page change, and after every successful status toggle |
| **Client** | `eventsApi.getAllEvents(page, 10, searchName)` |
| **Internal** | `GET /api/events` |
| **Upstream** | `GET {API}/admin/events/get/all` |

**Query parameters**

| Param | Sent by this page | Route default | Notes |
| --- | --- | --- | --- |
| `page` | current page index | `0` | zero-based |
| `size` | `10` (fixed `pageSize`) | `10` | |
| `searchName` | search box value, URL-encoded | — | omitted when empty |
| `status` | *not sent* — this page lists **all** statuses | — | |

**Response 200**

```ts
{
  data: {
    data: AdminEvent[];
    page: number; size: number;
    totalElements: number; totalPages: number;
    hasNext: boolean; hasPrevious: boolean;
  };
  message: string;
  status: boolean;
}
```

```ts
interface AdminEvent {
  eventId: number; eventName: string; slug: string; eventDescription: string;
  eventPosterUrl: string; eventCategory: string; eventLocation: string;
  ticketSaleStartDate: string; ticketSaleEndDate: string;
  eventStartDate: string; eventEndDate: string;
  active: boolean; status: string;              // 'ACTIVE' | 'ONHOLD' | …
  createdAt: string | null; updatedAt: string | null;
  companyId: number; companyName: string;
  percentageCommission: number | null;
  totalTicketsSold: number; totalRevenue: number; totalPlatformFee: number;
  analytics: {
    dailySalesGraph: string; currentWeekSales: number;
    totalAttendees: number; totalTicketTypes: number;
  };
  ticketSummaries: AdminEventTicketSummary[];
}

interface AdminEventTicketSummary {
  ticketId: number; ticketName: string; ticketPrice: number; ticketStatus?: string;
  ticketsSold?: number; revenue?: number;               // from /admin/events/get/all
  uniqueTicketCount?: number; totalTicketSaleBalance?: number;
  originalTicketCount?: number; ticketCount?: number;   // from the newer /admin/events/all
}
```

**Side effect** — the events array is mirrored to `localStorage['eventsCache']`. Nothing reads it.

**Errors** — 401 `Please log in to continue` (no cookie) / `Your session has expired…` (stale, cookie
deleted) / `Invalid session…` (unparseable); 500 for non-JSON or thrown errors. The page renders
`response.message` in a destructive alert with Retry.

---

### 2. Change event status

| | |
| --- | --- |
| **Trigger** | "Hold" button (`handleToggleEventStatus`) or "Activate" in the commission dialog (`handleActivateWithCommission`) |
| **Client** | `eventsApi.updateEvent(eventId, payload)` |
| **Internal** | `POST /api/event/update?eventId={id}` |
| **Upstream** | `POST {API}/event/update?eventId={id}` |

**Request body — putting an event on hold**

```json
{ "status": "ONHOLD", "isActive": false }
```

**Request body — activating an event**

```json
{
  "status": "ACTIVE",
  "isActive": true,
  "percentageCommission": 5.0,
  "published": false
}
```

`percentageCommission` comes from the dialog input (default `"5.0"`), parsed with `parseFloat` and
validated to `0 ≤ n ≤ 100` before the request is sent. `published` is the dialog's Live/Hidden toggle.

**Response 200**

```ts
{ data: unknown; message: string; status: boolean }
```

The page checks `response.status === true` strictly, then refetches the current page and shows a
success banner that auto-clears after 5 s.

**Errors**

| Status | Body | Cause |
| --- | --- | --- |
| 400 | `{ status: false, message: "Event ID is required" }` | Missing `eventId` query param |
| 500 | `{ status: false, message: "API returned non-JSON response (n)", details }` | Non-JSON upstream |
| *passthrough* | backend body, backend status | Upstream `!response.ok` — the body is returned untouched |

> ⚠️ **This route performs no session check.** Unlike every other proxy it never reads `auth_token`;
> `eventId` alone is enough to mutate an event.

---

## `/dashboard/events/approvals`

**File:** `src/app/dashboard/events/approvals/page.tsx`

### 1. List on-hold events

| | |
| --- | --- |
| **Trigger** | Mount, Refresh, pagination, and after every approval |
| **Client** | `eventsApi.getAllEvents(page, 20, undefined, 'ONHOLD')` |
| **Internal** | `GET /api/events?page={n}&size=20&status=ONHOLD` |
| **Upstream** | `GET {API}/admin/events/get/all?page&size&status=ONHOLD` |

Same route and response envelope as [`/dashboard/events` §1](#1-list-events); the differences are
`size=20`, the `status=ONHOLD` filter, and no `searchName`.

**Fields this page reads that the events list does not** — `eventDescription` (2-line clamp),
`ticketSaleStartDate` / `ticketSaleEndDate` (sale window), `published` (seeds the toggle), and
`ticketSummaries[].originalTicketCount ?? ticketCount` for the Available column.

**Post-fetch side effect** — for each event **not already in state**, seeds
`settings[eventId] = { commission: '5', published: event.published ?? false }`. Existing entries are
preserved, so unsaved per-card edits survive a refetch.

---

### 2. Approve an event

| | |
| --- | --- |
| **Trigger** | "Approve" on a card (`handleApprove`) |
| **Client** | `eventsApi.updateEvent(eventId, payload)` |
| **Internal** | `POST /api/event/update?eventId={id}` |
| **Upstream** | `POST {API}/event/update?eventId={id}` |

**Request body**

```json
{
  "status": "ACTIVE",
  "isActive": true,
  "percentageCommission": 5,
  "published": false
}
```

Values come from that card's `settings` entry. The commission is re-validated (`0–100`) immediately
before sending, in addition to the inline validation that disables the button.

**Response / errors** — identical to [`/dashboard/events` §2](#2-change-event-status). A falsy
`res.status` is thrown as `res.message || 'Failed to approve event'`. On success the banner clears
after 6 s and the current page is refetched.

---

## `/dashboard/events/sales`

**File:** `src/app/dashboard/events/sales/page.tsx` — read-only; the CSV export is generated
client-side and makes no request.

### 1. Load all active events

| | |
| --- | --- |
| **Trigger** | Mount, Refresh, Search, Clear |
| **Client** | `eventsApi.getAllEvents(0, 500, searchName, 'ACTIVE')` |
| **Internal** | `GET /api/events?page=0&size=500&status=ACTIVE[&searchName=…]` |
| **Upstream** | `GET {API}/admin/events/get/all` |

Same envelope as [`/dashboard/events` §1](#1-list-events).

**Why one 500-row request** — the page filters out finished events client-side
(`new Date(e.eventEndDate) >= now`) and then paginates the remainder itself at 20/page. Server-side
pagination would report counts that include the filtered-out events, so the whole active set is
fetched once instead.

**Consequences**

- Page changes make **no** request — they slice `allEvents` in memory.
- Search **does** re-request (server-side `searchName`) and resets to page 0.
- Events beyond the 500th active event are silently missing.

**Fields consumed** — `totalRevenue`, `totalPlatformFee`, `totalTicketsSold`, `percentageCommission`,
`analytics.currentWeekSales`, `analytics.totalAttendees`, `analytics.totalTicketTypes`,
`ticketSummaries[]` (`ticketName`, `ticketPrice`, `ticketsSold`, `revenue`), plus `slug` for the
public link and `eventId` for the edit link.

---

## `/dashboard/events/create`

**File:** `src/app/dashboard/events/create/page.tsx` — a 3-step wizard; calls fire at different steps.

### 1. Company lookup (step 1, optional)

| | |
| --- | --- |
| **Trigger** | "Lookup" button (`lookupCompany`) |
| **Client** | `companyApi.getById(companyId)` |
| **Internal** | `GET /api/company/{id}` |
| **Upstream** | `GET {API}/company/get?companyId={id}` |

**Response 200**

```ts
{
  company?: {
    id: number; companyName: string; emailAddress: string; phoneNumber: string;
    physicalAddress: string; postalAddress: string; profileType: string;
    currency: string; bio: string | null; profilePhoto: string | null;
    isActive: boolean; createdAt: string; updatedAt: string;
  };
  data?: unknown;
  message: string;
  status: boolean;
}
```

The page reads only `resp.company?.companyName` and displays it in a green confirmation row.

**Errors** — 400 `Valid company ID is required` when the id is missing or non-numeric; 500 on
non-JSON or parse failure; otherwise the backend body is passed through. Failures set
`companyLookupError` but **do not block submission** — the lookup is purely a confirmation aid.

> ⚠️ **This route performs no session check.**

---

### 2. Poster upload (step 1, optional)

| | |
| --- | --- |
| **Trigger** | Selecting a file in the drop zone (`handlePosterUpload`) |
| **Client** | Raw `fetch` — not routed through `lib/api.ts` |
| **Internal** | `POST /api/upload-image` |
| **Upstream** | Contabo S3 `PutObject` (`https://eu2.contabostorage.com`, bucket `bv-kenya`) |

**Request** — `multipart/form-data` with a single `file` field. No JSON headers are set.

**Validation** — enforced twice, client-side before sending and again in the route:

| Rule | Value |
| --- | --- |
| MIME types | `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp` |
| Max size | 10 MB (`10 * 1024 * 1024`) |

**Object key** — `events/{Date.now()}-{random7}.{originalExtension}`, uploaded with
`ACL: 'public-read'` and `forcePathStyle: true`.

**Response 200**

```json
{
  "success": true,
  "url": "https://eu2.contabostorage.com/b418dbb4d7c942e5b311c172a41d1db8:bv-kenya/events/1730000000000-a1b2c3d.jpg"
}
```

**Errors** — 400 `No file provided` · 400 `Invalid file type…` · 400 `File too large. Maximum size is 10MB.` · 500 `{ success: false, error }`. The URL is written into `form.eventPosterUrl`; a plain URL field is offered as a fallback.

> ⚠️ **No authentication check, and the S3 credentials are hardcoded in the route file.**

---

### 3. Create the event (step 3)

| | |
| --- | --- |
| **Trigger** | "Create Event" (`handleSubmit`), first of the submission sequence |
| **Client** | `createEventApi.createEvent(data)` |
| **Internal** | `POST /api/event/create` |
| **Upstream** | `POST {API}/event/create` |

**Request body**

```ts
{
  eventName: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategory: { id: number };          // 1 Music … 9 Other, hardcoded in the page
  ticketSaleStartDate: string;            // ISO 8601
  ticketSaleEndDate: string;              // ISO 8601
  eventLocation: string;
  eventStartDate: string;                 // ISO 8601
  eventEndDate: string;                   // ISO 8601
  percentageComission: number;            // ← backend spelling: one 'm'
  company: { id: number };
  slug: string;
  currency: string;                       // KES | USD | UGX | TZS | RWF | ZAR | GHS | NGN | MWK | AUD | CAD
  users?: { id: number };                 // optional — injected server-side
}
```

All datetimes are converted from the picker's `YYYY-MM-DDTHH:mm` local format with
`new Date(local).toISOString()`.

**Server-side enrichment** — before proxying, the route injects from the session cookie:

```ts
if (!body.users   && authData.userId)    body.users   = { id: authData.userId };
if (!body.company && authData.companyId) body.company = { id: authData.companyId };
```

The page always sends `company` explicitly, so in practice only `users` is injected.

**Response 200**

```ts
{
  message: string;
  event_id?: number;                                    // primary
  event?: { id: number; eventName: string; slug: string };  // fallback
  status: boolean;
}
```

The page resolves the id as `eventResp.event_id ?? eventResp.event?.id` and throws
`'Event created but ID not returned'` if both are absent.

**Errors** — 401 `Please log in to continue` / `Session expired. Please log in again.` /
`Invalid session.`; 500 `Invalid response from API`; otherwise `{ status: false, message }` with the
upstream status.

---

### 4. Create each ticket (step 3)

| | |
| --- | --- |
| **Trigger** | Immediately after the event is created — one call per ticket, **sequentially** in a `for…of` loop |
| **Client** | `createEventApi.createTicket(data)` |
| **Internal** | `POST /api/tickets/create` |
| **Upstream** | `POST {API}/event/ticket/create` |

**Request body**

```ts
{
  event: { id: number };                  // the id returned by createEvent
  ticketName: string;
  ticketPrice: number;                    // 0 when isFree
  quantityAvailable: number;
  ticketsToIssue: number;                 // falls back to quantityAvailable
  ticketLimitPerPerson: number;           // parseInt(...) || 0  → 0 means unlimited
  numberOfComplementary: number;
  ticketSaleStartDate: string;            // ISO; falls back to the event's window
  ticketSaleEndDate: string;              // ISO; falls back to the event's window
  isFree: boolean;
  smsPurchaseMessageTemplate?: string;    // not sent by this page
  emailPurchaseMessageTemplate?: string;  // not sent by this page
}
```

**Response 200**

```ts
{ message: string; ticket?: { id: number; ticketName: string }; status: boolean }
```

**Failure behaviour — important.** The loop throws on the first failure with
`Ticket "<name>" failed: <message>`. Because the event was already created, **a partial failure
leaves the event persisted with only the tickets created up to that point.** There is no rollback;
recovery is to open the event in the edit page and add the missing tickets.

---

## `/dashboard/events/[id]/edit`

**File:** `src/app/dashboard/events/[id]/edit/page.tsx` — the most API-dense page (7 distinct calls).

### 1. Load the event

| | |
| --- | --- |
| **Trigger** | Mount and after **every** successful mutation on this page (`fetchEvent`) |
| **Client** | `eventsApi.getEventById(eventId)` |
| **Internal** | `GET /api/events/{id}` |
| **Upstream** | `GET {API}/event/get?eventId={id}` |

**Response 200**

```ts
{ event?: unknown; data?: unknown; message: string; status: boolean }
```

The client type is deliberately loose; the page reads `resp.event` and casts it to `ApiEvent`:

```ts
interface ApiEvent {
  id: number; eventName: string; slug: string; eventDescription: string;
  eventPosterUrl: string; category: string; eventLocation: string;
  ticketSaleStartDate: string; ticketSaleEndDate: string;
  eventStartDate: string; eventEndDate: string;
  isActive: boolean; published?: boolean; status?: string;
  percentageCommission?: number;    // either spelling may arrive
  percentageComission?: number;
  currency?: string; eventCategoryId?: number;
  companyId?: number; companyName?: string;
  tickets: ApiTicket[];
}

interface ApiTicket {
  id: number;                       // ← mapped to ticketId in page state
  ticketName: string; ticketPrice: number;
  quantityAvailable: number; soldQuantity: number;
  isActive: boolean; ticketsToIssue: number; isSoldOut: boolean;
  ticketLimitPerPerson: number; numberOfComplementary: number;
  ticketSaleStartDate: string; ticketSaleEndDate: string;
  isFree: boolean; ticketStatus: string; createAt: string;
  smsPurchaseMessageTemplate?: string | null;
  emailPurchaseMessageTemplate?: string | null;
}
```

**Defensive mapping**

| Field | Fallback |
| --- | --- |
| `status` | `e.status || (e.isActive ? 'ACTIVE' : 'ONHOLD')` |
| commission | `e.percentageCommission ?? e.percentageComission ?? ''` |
| `published` | `e.published ?? false` |
| ticket id | `t.id` → `ticketId` |

This response is a **different shape** from `/api/events` (`id` not `eventId`, `category` not
`eventCategory`, a full `tickets[]` array instead of `ticketSummaries[]`).

**Errors** — 401 trio as elsewhere; 500 on non-JSON. A falsy `status` sets the page error, and an
empty `form.eventName` after loading renders the "Event not found" state.

---

### 2. Save event details

| | |
| --- | --- |
| **Trigger** | "Save" in the Event Details form (`handleSaveEvent`) |
| **Client** | `eventsApi.updateEvent(eventId, payload)` |
| **Internal** | `POST /api/event/update?eventId={id}` |
| **Upstream** | `POST {API}/event/update?eventId={id}` |

**Request body — always sent**

```ts
{
  eventName: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventLocation: string;
  ticketSaleStartDate: string;  // ISO
  ticketSaleEndDate: string;    // ISO
  eventStartDate: string;       // ISO
  eventEndDate: string;         // ISO
  published: boolean;
  slug: string;
}
```

**Conditionally added** — omitted entirely when blank, so an empty field means "leave unchanged":

| Field | Condition |
| --- | --- |
| `status` | `form.status !== ''` — the Status select defaults to `— no change —` |
| `percentageCommission` | `form.percentageCommission !== ''` → `parseFloat(...) \|\| 0` |
| `currency` | `form.currency` truthy |
| `eventCategoryId` | `form.eventCategoryId` truthy → `parseInt(...)` |

Valid `status` values: `ACTIVE`, `CLOSED`, `SOLDOUT`, `PENDING`, `ONHOLD`, `FLASHSALE`, `POSTPONED`.

**Response / errors** — same as [`/dashboard/events` §2](#2-change-event-status). On
`status === true` the page refetches and clears the banner after 5 s.

---

### 3. Save an existing ticket

| | |
| --- | --- |
| **Trigger** | "Save" on a ticket in edit mode (`handleSaveTicket`) |
| **Client** | `eventsApi.updateTicket(ticketId, payload)` |
| **Internal** | `POST /api/ticket/update?ticketId={id}` |
| **Upstream** | `POST {API}/ticket/update?ticketId={id}` |

**Request body**

```ts
{
  ticketName: string;
  ticketPrice: number;                     // forced to 0 when isFree
  quantityAvailable: number;
  isActive: boolean;
  ticketsToIssue: number;
  ticketLimitPerPerson: number;
  numberOfComplementary: number;
  ticketSaleStartDate?: string;            // ISO, omitted when blank
  ticketSaleEndDate?: string;              // ISO, omitted when blank
  isFree: boolean;
  smsPurchaseMessageTemplate?: string;     // undefined when null
  emailPurchaseMessageTemplate?: string;   // undefined when null
}
```

Template placeholders supported by the backend: `{first_name}`, `{event_name}`, `{ticket_name}`,
and `{ticket_link}` (SMS only).

**Response 200**

```ts
{ data: unknown; message: string; status: boolean }
```

**Errors** — 400 `Ticket ID is required`; 401 trio (this route **does** validate the session);
500 `API returned non-JSON response (n)` with `details`; otherwise passthrough. On success the page
exits edit mode, refetches, and clears the banner after 4 s.

---

### 4. Create a ticket

| | |
| --- | --- |
| **Trigger** | "Create Ticket" in the Add Ticket form (`handleCreateTicket`) |
| **Client** | `createEventApi.createTicket(data)` |
| **Internal** | `POST /api/tickets/create` |
| **Upstream** | `POST {API}/event/ticket/create` |

Same contract as [create wizard §4](#4-create-each-ticket-step-3), with two differences:

- `event.id` is `parseInt(eventId)` from the route params rather than a freshly created id.
- This page **does** send `smsPurchaseMessageTemplate` and `emailPurchaseMessageTemplate`
  (`|| undefined` when empty).

---

### 5. Request step-up OTP

| | |
| --- | --- |
| **Trigger** | "Continue" in `SuspendTicketModal`, step `confirm` (`handleSuspendRequestOtp`) |
| **Client** | `eventsApi.requestChallenge()` |
| **Internal** | `GET /api/user/challenge` |
| **Upstream** | `GET {API}/user/challange?userId={sessionUserId}` |

**Request** — no body. `userId` is taken from the `auth_token` cookie, never from the client.

**Response 200**

```ts
{ status: boolean; message: string }
```

**Errors** — 401 `Please log in to continue` / `Your session has expired. Please log in again.` /
`Invalid session. Please log in again.` / `User ID not found in session`; 500 on non-JSON, parse
failure, or a thrown error.

> The backend path is spelled **`/user/challange`** (sic). The internal route is spelled correctly.
> The modal advances to the OTP step in a `finally` block, so it proceeds even if this call rejects.

---

### 6. Suspend / activate ticket sales

| | |
| --- | --- |
| **Trigger** | Confirm in `SuspendTicketModal`, step `otp` (`handleSuspendConfirm`) |
| **Client** | `eventsApi.toggleTicketStatus(ticketId, { otp, ticketStatus })` |
| **Internal** | `POST /api/ticket/status/toggle?ticketId={id}` |
| **Upstream** | `POST {API}/ticket/status/toggle?ticketId={id}&userId={sessionUserId}` |

**Request body**

```json
{ "otp": "1234", "ticketStatus": "ONHOLD" }
```

`ticketStatus` is `'ONHOLD'` for suspend and `'ACTIVE'` for activate, derived from
`suspendActionType`. The route appends `userId` from the session as a **query parameter**
(`userId ? '&userId=' + userId : ''`).

**Response 200**

```ts
{ data: unknown; message: string; status: boolean }
```

**Errors** — 400 `Ticket ID is required`; the 401 trio; 500 `API returned non-JSON response (n)`;
otherwise the backend body passes through with its status (this is how a wrong OTP surfaces).
Failures set `suspendError`, which renders **inside the modal** so the user can retry or resend
without losing context. Success closes the modal and refetches.

This is the only **step-up-authenticated** mutation in the app.

---

### 7. Poster upload

Identical to [create wizard §2](#2-poster-upload-step-1-optional) — same `POST /api/upload-image`,
same validation, same response. The returned URL is written to `form.eventPosterUrl` and persists
only when the Event Details form is saved via §2.

---

## `/dashboard/companies`

**File:** `src/app/dashboard/companies/page.tsx`

### 1. List companies

| | |
| --- | --- |
| **Trigger** | Mount, Refresh, Search, Clear, pagination |
| **Client** | `companyApi.getAll(page, 20, search)` |
| **Internal** | `GET /api/companies` |
| **Upstream** | `GET {API}/admin/companies` |

**Query parameters**

| Param | Sent | Route default |
| --- | --- | --- |
| `page` | current page | `0` |
| `size` | `20` (`PAGE_SIZE`) | `20` |
| `search` | search box, URL-encoded; omitted when empty | — |

Search matches company name, email and phone server-side.

**Response 200**

```ts
{
  data?: {
    companies: Company[];
    page: number; size: number;
    totalElements: number; totalPages: number;
    hasNext: boolean; hasPrevious: boolean;
  };
  message: string;
  status: boolean;
}
```

```ts
interface Company {
  id: number; companyName: string; emailAddress: string; phoneNumber: string;
  physicalAddress: string; postalAddress: string;
  profileType: string;        // 'EVENT_ORGANIZER' | 'TICKETING_COMPANY' | …
  currency: string; bio: string | null; profilePhoto: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}
```

> Note the key is `companies`, not the nested `data` used by the events endpoint.

**Errors** — 401 `Unauthorized` (no cookie); 500 `Backend returned HTTP n (non-JSON)` — this route
logs the first 500 characters of the non-JSON body; 500 `Failed to parse response`; otherwise
passthrough.

> ⚠️ This route checks only that the cookie **exists** — it never validates `issuedAt`, so an
> expired session still reaches the backend here.

---

## Sidebar — every dashboard page

**File:** `src/components/layout/sidebar.tsx`

### 1. Pending-approvals badge count

| | |
| --- | --- |
| **Trigger** | Sidebar mount — fires **once per full page load**, on every `/dashboard/*` route |
| **Client** | `eventsApi.getAllEvents(0, 1, undefined, 'ONHOLD')` |
| **Internal** | `GET /api/events?page=0&size=1&status=ONHOLD` |
| **Upstream** | `GET {API}/admin/events/get/all` |

`size=1` is intentional — only `data.totalElements` is read, so the smallest possible page is
requested and the returned row is discarded.

```ts
eventsApi.getAllEvents(0, 1, undefined, 'ONHOLD')
  .then(res => { if (res.status) setPendingCount(res.data?.totalElements ?? 0); })
  .catch(() => {});   // silent — the badge simply stays at 0
```

The count renders as an amber pill on the Approvals nav link, hidden when `0`. Because the effect has
an empty dependency array, the badge is **not** refreshed after approving an event on the Approvals
page — it updates on the next full reload.

---

## `AuthGuard` — every dashboard page

**File:** `src/components/auth/auth-guard.tsx` (mounted by `src/app/dashboard/layout.tsx`)

### 1. Session check

| | |
| --- | --- |
| **Trigger** | Mount of any `/dashboard/*` route, before children render |
| **Client** | `authApi.checkAuth()` |
| **Internal** | `GET /api/auth/status` |
| **Upstream** | **None** — cookie inspection only |

**Response 200 — authenticated**

```json
{
  "isAuthenticated": true,
  "user": { "userId": 12, "role": "SUPER_ADMIN", "email": "admin@example.com" }
}
```

**Response 200 — not authenticated** (note: still HTTP 200)

```json
{ "isAuthenticated": false, "message": "Not authenticated" }
```

`message` is one of `Not authenticated`, `Session expired` (the cookie is deleted), or
`Invalid session`. A thrown error returns **500** with
`{ isAuthenticated: false, message: 'Error checking authentication', error }`.

**Why the 200-with-`false` design matters** — it lets the guard distinguish a real rejection from a
transient outage:

```ts
if (!isAuthenticated) router.push('/login');          // definitive answer → redirect
// on throw:
if (err instanceof ApiError && (err.status === 401 || err.status === 403))
  router.push('/login');                              // explicit rejection → redirect
else setIsAuthenticated(true);                        // network/5xx → stay put
```

A 500 or network failure therefore keeps the user on the page rather than bouncing them to `/login`,
since the middleware has already confirmed a cookie exists.

---

## Sidebar logout

**File:** `src/lib/hooks/useAuth.ts`, invoked from the sidebar's logout `AlertDialog`

### 1. Log out

| | |
| --- | --- |
| **Trigger** | Confirming "Sign out" |
| **Client** | `authApi.logout()` |
| **Internal** | `POST /api/auth/logout` |
| **Upstream** | **None** |

**Request** — no body.

**Server-side processing** — reads the email from `auth_token`, calls
`resetRateLimitForIdentifier(email)` so the user is not rate-limited on the next login, then deletes
the cookie. Parse errors are swallowed.

**Response 200**

```json
{ "success": true, "message": "Logged out successfully" }
```

**Client-side** — removes `userEmail` and `userName` from `localStorage` and pushes `/login`. A
rejection is logged to the console; `isLoggingOut` resets in `finally` but **no navigation occurs**,
so a failed logout leaves the user on the page.

---

## Pages that make no API calls

These render entirely from hardcoded constants, mock arrays, or static markup.

| Page | Data source | Endpoint that could serve it |
| --- | --- | --- |
| `/dashboard/analytics` | 12-month `monthly[]`, `channelMix[]`, `kpis` literals in the file | — |
| `/dashboard/users` | 8 mock users + `mockStats`, behind `setTimeout(1000)` | — |
| `/dashboard/finance` | 8 mock transactions + `mockStats`, behind `setTimeout(1000)` | `transactionsApi.fetchDetailed` |
| `/dashboard/b2b` | 4 mock companies + `mockStats`, behind `setTimeout(1000)` | `b2bApi.getActiveSubscriptions`, `companyApi.getAll` |
| `/dashboard/b2b/[id]` | Static "under construction" card, fake 500 ms loader | — |
| `/dashboard/b2b/analytics` | "Coming soon…" | — |
| `/dashboard/b2b/companies` | Static placeholder | — |
| `/dashboard/b2b/companies/[id]` | Static card, fake 500 ms loader | `companyApi.getById` |
| `/dashboard/b2b/companies/[id]/events` | Static placeholder | — |
| `/dashboard/b2b/companies/[id]/events/[eventId]` | Echoes route params | — |
| `/dashboard/b2b/licenses` | "Coming soon…" | — |
| `/dashboard/b2b/licenses/[id]` | Echoes route params | — |
| `/dashboard/finance/[id]` | Echoes route params | — |
| `/dashboard/finance/reports` | "Coming soon…" | — |
| `/dashboard/finance/reports/[id]` | Echoes route params | — |
| `/dashboard/finance/transactions` | "Coming soon…" | `transactionsApi.fetchDetailed` |
| `/dashboard/finance/transactions/[id]` | Echoes route params | `transactionsApi.fetchDetailed` |
| `/` | `redirect('/dashboard')` | — |

---

## Unused endpoints

Implemented and reachable, but no page calls them.

### `POST /api/transactions/detailed`

The most complete unused endpoint — the obvious backing for `/dashboard/finance`.

| | |
| --- | --- |
| **Client** | `transactionsApi.fetchDetailed(params)` |
| **Upstream** | `POST {API}/transactions/detailed` |

**Request body**

```ts
{
  id: number;
  idType: 'company' | 'event' | 'user';
  transactionType?: string;   // default 'TICKET_SALE'
  page?: number;              // default 0
  size?: number;              // default 50
}
```

**Response 200**

```ts
{
  data: {
    data: TransactionRecord[];
    page: number; size: number;
    totalElements: number; totalPages: number;
    hasNext: boolean; hasPrevious: boolean;
  };
  stats: { ticketsSold: number; platformLiability: number; totalSales: number };
  message: string;
  status: boolean;
}

interface TransactionRecord {
  id: number; companyId: number;
  event:  { id: number; eventName: string; eventPosterUrl: string; eventLocation: string;
            eventStartDate: string; comission: number; currency: string };
  ticket: { id: number; ticketName: string; ticketPrice: number;
            soldQuantity: number; quantityAvailable: number };
  buyer:  { id: number; email: string | null; mobileNumber: string;
            firstName: string | null; lastName: string | null; createdAt: string };
  barcode: string; transactionId: string; transactionType: string;
  transactionAmount: number; platformFee: number; createdAt: string;
}
```

### Others

| Endpoint | Client helper | Note |
| --- | --- | --- |
| `POST /api/events/activate` → `POST {API}/event/activate` | `eventsApi.activateEvent(id, commission)` | Superseded — activation goes through `/api/event/update` with `{status:'ACTIVE', isActive:true, percentageCommission, published}`, which also carries the `published` flag |
| `PUT /api/tickets/[id]` → `POST {API}/ticket/update?ticketId=` | — | Duplicate of `/api/ticket/update` |
| `POST\|PUT /api/events/[id]` → `POST {API}/event/update?eventId=` | — | Duplicate of `/api/event/update`; unlike that route it **does** validate the session |
| — | `eventsApi.getAllActiveAdminEvents()` | Auto-pages `/api/events?status=ACTIVE` at `size=50` until `hasNext` is false. Written for the sales report, which instead fetches one `size=500` page |
| `GET /api/active-events?page&size` | `eventsApi.getActiveEvents()` | The route forwards pagination params, but the only caller sends none |

> `/api/events/[id]` (POST/PUT) is the better-secured of each duplicate pair — the routes currently in
> use (`/api/event/update`) skip the session check entirely.

---

## Appendix A — call/page matrix

| Internal route | login | dash | events | approvals | sales | create | edit | companies | sidebar | guard |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `POST /api/auth/login` | ● | | | | | | | | | |
| `POST /api/auth/validate-otp` | ● | | | | | | | | | |
| `GET /api/auth/status` | | | | | | | | | | ● |
| `POST /api/auth/logout` | | | | | | | | | ● | |
| `GET /api/dashboard/stats` | | ● | | | | | | | | |
| `GET /api/b2b-subscriptions/active` | | ● | | | | | | | | |
| `GET /api/active-events` | | ● | | | | | | | | |
| `GET /api/events` | | | ● | ● | ● | | | | ● | |
| `GET /api/events/[id]` | | | | | | | ● | | | |
| `POST /api/event/create` | | | | | | ● | | | | |
| `POST /api/event/update` | | | ● | ● | | | ● | | | |
| `POST /api/tickets/create` | | | | | | ● | ● | | | |
| `POST /api/ticket/update` | | | | | | | ● | | | |
| `POST /api/ticket/status/toggle` | | | | | | | ● | | | |
| `GET /api/user/challenge` | | | | | | | ● | | | |
| `GET /api/companies` | | | | | | | | ● | | |
| `GET /api/company/[id]` | | | | | | ● | | | | |
| `POST /api/upload-image` | | | | | | ● | ● | | | |

---

## Appendix B — shared response envelopes

Three envelope shapes cover almost every endpoint.

**Simple** — mutations (`updateEvent`, `updateTicket`, `toggleTicketStatus`, `getStats`, B2B):

```ts
{ data: T; message: string; status: boolean }
```

**Paginated** — `/api/events`, `/api/companies`, `/api/transactions/detailed`:

```ts
{
  data: {
    data: T[];              // ← `companies: T[]` for /api/companies
    page: number; size: number;
    totalElements: number; totalPages: number;
    hasNext: boolean; hasPrevious: boolean;
  };
  message: string;
  status: boolean;
}
```

**Error** — every proxy route on failure:

```ts
{ status: false; message: string; error?: string; details?: string }
```

`status: boolean` is the success flag on **every** endpoint. Pages check it before trusting `data`,
and the two mutation-heavy pages check it strictly (`response.status === true`) because a truthy
non-boolean would otherwise slip through.

---

## Appendix C — shared error semantics

### `fetchApi` (client, `src/lib/api.ts`)

Every call except the two `/api/upload-image` uploads goes through this wrapper, which:

1. Generates a 7-character request id and sends it as `X-Request-ID`.
2. Sets `Content-Type`, `Accept`, and `credentials: 'include'`.
3. **Throws `ApiError` if the response is not JSON**, logging status, content type and a 500-character
   body preview.
4. Throws `ApiError(500, 'Invalid JSON response')` on a parse failure.
5. Throws `ApiError(status, data.message ?? 'HTTP error <status>', data)` when `!response.ok`.
6. Wraps network failures as `ApiError(500, error.message ?? 'Network error')`.

```ts
class ApiError extends Error {
  status: number;      // HTTP status, or 500 for network/parse failures
  data: unknown;       // parsed error body when available
}
```

Because a non-`ok` response **throws**, `try/catch` is the primary error path on every page;
`response.status === false` only catches HTTP-200-with-failure responses.

### Session validation in route handlers

Nine routes repeat the same inline block:

```ts
const authTokenCookie = cookieStore.get('auth_token');
if (!authTokenCookie?.value) return 401 'Please log in to continue';
const authData = JSON.parse(authTokenCookie.value);
if (Date.now() - (authData.issuedAt || 0) > 8 * 60 * 60 * 1000) {
  cookieStore.delete('auth_token');
  return 401 'Your session has expired. Please log in again.';
}
```

Coverage is inconsistent:

| Coverage | Routes |
| --- | --- |
| Full check (existence + expiry) | `/api/events`, `/api/events/[id]`, `/api/events/activate`, `/api/active-events`, `/api/event/create`, `/api/tickets/create`, `/api/tickets/[id]`, `/api/ticket/update`, `/api/ticket/status/toggle`, `/api/dashboard/stats`, `/api/b2b-subscriptions/active`, `/api/transactions/detailed`, `/api/user/challenge` |
| Existence only | `/api/companies` |
| **No check** | `/api/event/update`, `/api/company/[id]`, `/api/upload-image` |

Several routes still carry a stale `// 2 hours` comment beside the 8-hour constant, and
`lib/auth.ts:verifyAuth` — which enforces 2 hours — is never called.

### Non-JSON upstream responses

Every route guards against an HTML error page from the backend, in two styles:

- **Read-then-parse** (`/api/companies`, `/api/company/[id]`, `/api/event/update`,
  `/api/ticket/update`, `/api/ticket/status/toggle`, `/api/user/challenge`) — reads `.text()` first
  so the raw body can be returned as `details` or logged.
- **Check-then-json** (the rest) — inspects `content-type` and returns a generic
  `Invalid response from API` without the body.

---

## Appendix D — declared vs actual response shapes

Four client type declarations in `src/lib/api.ts` are wider than what the route actually returns.
They are harmless today because the pages read only the narrow subset, but they will mislead anyone
relying on the types.

| Client function | Declared | Actually returned | Impact |
| --- | --- | --- | --- |
| `authApi.requestOtp` | `LoginResponse` — includes a full `user` object | `{ message, status }` only | `response.user` is typed non-optional but is always `undefined`. The login form never reads it. |
| `authApi.validateOtp` | `OtpValidationResponse.user` with `user_id`, `company_id`, `kycStatus` | Sanitized: `{ role, email, phoneNumber, company_name, is_active, profile_type }` | Reading `user.user_id` would compile and return `undefined`. |
| `eventsApi.getEventById` | `{ event?: unknown; data?: unknown; … }` | Backend body, with the event under `event` | Deliberately loose; the page casts to a locally-declared `ApiEvent`. |
| `b2bApi.getActiveSubscriptions` | `data: unknown` | Array or `{count}`/`{total}` object | Intentional — the dashboard normalises all three shapes. |

Related shape inconsistencies worth knowing when wiring new pages:

- **Two event shapes.** `/api/events` returns `AdminEvent` (`eventId`, `eventCategory`,
  `percentageCommission`, `ticketSummaries[]`); `/api/active-events` returns `ActiveEvent`
  (`id`, `category`, `comission`, `tickets[]`); `/api/events/[id]` returns a third
  (`id`, `category`, full `tickets[]`).
- **Commission spelling.** `percentageComission` on create, `percentageCommission` on update. The
  edit page reads both.
- **Backend typo.** `/user/challange`.
- **Pagination key.** `data.data[]` for events, `data.companies[]` for companies.
- **Redeclared types.** `src/lib/types.ts` defines `Event`, `Ticket`, `EventDetail` and friends, but
  the events, approvals and edit pages each declare their own local copies instead of importing them.
