# C-Monitoring — Web (Next.js)

A responsive web version of the collectionMS mobile app (Xamarin.Forms), rebuilt with
Next.js 15 (App Router) + TypeScript + Tailwind. Works on desktop and mobile browsers.

It talks **directly to your existing production API** — no mock/demo data:

- Collection API: `https://agi-cmonitoring.atlanticgrains.com/api/`
- Ordering API (principal accounts): `https://agi-ordering.atlanticgrains.com/api/`

Both use the same literal Basic auth header your mobile app sends (`Username:Password`),
and login passwords are encrypted server-side using the exact same PBKDF2 (SHA1, 1000
iterations) + AES-128-CBC scheme as `Encryption_Descryption.cs`, so your existing backend
needs no changes.

## What's included

- Login (against `collection/login`)
- Dashboard with all 10 collection types (Cash, Check, Customer/Agent variants, CWT-only, CM, Others)
- Dynamic entry form per type — same required fields, same conditional Bank/Check No/Check
  Date/Location visibility, same With-CWT and With-Variance/Partial-Payment logic as the
  mobile app
- Password re-confirmation modal before every submit (checked locally against your session,
  same as `GlobalVariable.password` in the app — no extra round trip)
- Attachments: pick photos, which are converted to a single-page PDF **and uploaded to
  Google Cloud Storage** server-side — the backend receives GCS URLs instead of raw file
  bytes (see "Attachments & Google Cloud Storage" below)
- Bank and Principal Account are restricted to the live backend lists — nothing off-list
  can be typed in and submitted (see "Off-list bank / principal account restriction" below)
- Notifications bell + page (`collection/notif`) share a single cached poller (60s, paused
  while the tab is hidden) instead of each polling independently — see "Notifications
  polling" below — and mark items viewed on leaving the page
- Account page — change username/password (`collection/user/changeusernamepassword`)
- Responsive layout: fixed sidebar on desktop, slide-out drawer on mobile

## Getting started

```bash
npm install
cp .env.local.example .env.local   # edit SESSION_SECRET at minimum
npm run dev                        # http://localhost:3000
```

For production:

```bash
npm run build
npm run start
```

### Environment variables (`.env.local`)

| Variable | Default | Notes |
|---|---|---|
| `SESSION_SECRET` | (dev fallback, insecure) | **Set this** to a long random string in production — signs the session cookie. |
| `COLLECTION_API_BASE_URL` | `https://agi-cmonitoring.atlanticgrains.com/api/` | Override if you point at staging/local API. |
| `ORDERING_API_BASE_URL` | `https://agi-ordering.atlanticgrains.com/api/` | Same, for the principal-account lookup. |
| `BACKEND_BASIC_AUTH` | `Username:Password` | Matches the literal value currently hardcoded in `GlobalVariable.cs`. |
| `GCS_SERVICE_ACCOUNT_KEY_BASE64` | — | **Required.** Base64 of your GCS service account JSON key (`base64 -w0 key.json`). |
| `GCS_BUCKET_NAME` | — | **Required.** Bucket attachments are uploaded to. |
| `GCS_PROJECT_ID` | (from key) | Optional override; normally read from the key itself. |

## Attachments & Google Cloud Storage

Previously, picture attachments were sent as-is through this app's API straight to the
collection backend, which converted them to PDF on its side. That's been flipped:

1. The browser uploads the original photo(s) to `POST /api/collections` like before.
2. The server (`src/lib/image-to-pdf.ts`) normalizes the image (EXIF-rotates it, and
   handles jpg/png/webp/heic uniformly via `sharp`) and embeds it into a single-page PDF
   with `pdf-lib`.
3. A fresh GUID is generated per submission, and every converted PDF for that submission is
   uploaded to Google Cloud Storage (`src/lib/gcs.ts`) under a folder named after that GUID
   (`collections/<guid>/...`), authenticated with a service account key you provide as a
   **base64-encoded** env var (`GCS_SERVICE_ACCOUNT_KEY_BASE64`) — no key file needs to ship
   with the app.
4. Instead of forwarding the raw file bytes to the collection backend, the app sends just
   that folder GUID in a field named `AttachmentGuid`. **This field name is an assumption**
   — update `out.set("AttachmentGuid", …)` in `src/app/api/collections/route.ts` if your
   backend expects a different key, and make sure whatever consumes it on your backend knows
   to look up `collections/<guid>/` in the bucket.

By default, uploaded objects are addressed as `https://storage.googleapis.com/<bucket>/<path>`,
which assumes the bucket (or a public-read IAM binding) allows that. If you'd rather keep the
bucket private, swap in `getSignedAttachmentUrl()` (already in `src/lib/gcs.ts`) for
time-limited signed URLs instead.

## Off-list bank / principal account restriction

Both Bank and Principal Account must come from the backend's live lists
(`collection/banklist` and `principalaccount/filter2`) — free-typing an arbitrary value is
no longer possible:

- **Client-side:** Bank is a plain `<select>` with no manual-entry fallback; Principal
  Account is validated against the full fetched list on submit, even though it's still a
  text input with autocomplete (so it stays fast to type in).
- **Server-side (defense in depth):** `src/app/api/collections/route.ts` re-fetches both
  lists and rejects the submission with a 400 if the value doesn't match, regardless of
  what the client sent.

If either list fails to load, submission is blocked (or shows a "Retry" control) rather
than falling back to free text.

## Notifications polling

`src/lib/notifications-client.ts` is a small shared store used by both the topbar bell and
the notifications page:

- **One poller for the whole app** — previously each mounted component ran its own
  `setInterval`; now there's a single shared one.
- **Paused while the tab is in the background** (`visibilitychange`), and resumes with an
  immediate refresh if the cached data is stale when the tab regains focus.
- **60s interval** (was 20s), and concurrent callers share one in-flight request instead of
  firing duplicate ones.
- Marking notifications viewed updates the local cache immediately rather than waiting for
  the next poll.

This meaningfully cuts down on `/api/notifications` invocations, which matters on Vercel's
usage-based billing.

## Installing on mobile (Add to Home Screen)

The app is now a lightweight installable PWA — no service worker, just a proper manifest +
icons, so people can add it to their home screen and launch it without retyping the URL in
Chrome each time:

- `src/app/manifest.ts` — Next.js metadata route, auto-served at `/manifest.webmanifest`
  and auto-linked in `<head>`. Declares name, colors, and icons.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — generated from the
  existing `public/logo.png`. The maskable variant has extra padding so Android's adaptive
  icon shapes don't crop the logo.
- `src/app/layout.tsx` — adds `appleWebApp` metadata (iOS Safari doesn't read the web
  manifest for "Add to Home Screen" the way Chrome/Android does) and a `themeColor`.

On Android/Chrome, people can tap the menu → "Install app" (or the install icon in the
address bar). On iOS Safari, it's Share → "Add to Home Screen". Once installed it opens in
`standalone` mode (no address bar).

I deliberately skipped a service worker / offline caching — for a live collection-entry
tool with session cookies and frequently-changing bank/principal-account lists, caching
could easily serve someone a stale form or stale auth state, which is worse than just
requiring a network connection. If you want offline support later, that's a separate,
deliberate addition, not something to bolt on quietly.

## Notes / things worth knowing

- **Session cookie stores your plaintext password (httpOnly, signed, 12h expiry).** This
  mirrors what the mobile app does by keeping it in memory (`GlobalVariable.password`) so the
  password-confirmation step before each submit doesn't need a server round trip. It's never
  sent to the browser as JSON and only readable server-side. If you'd rather avoid this, say
  so and I can switch confirmation to a real server-side re-auth call instead.
- **The mobile app's APK auto-update / version-check flow was intentionally left out** — it's
  Android-specific and doesn't apply to a web app.
- I could not test an actual login against your production API from my sandbox (it only has
  egress to package registries, not your domain) — the request/response shapes are built
  directly from your C# source, but please do a real end-to-end test after deploying.
- Deploy anywhere that runs Node.js (Vercel, your own server, Docker, IIS w/ iisnode, etc.).
  It needs a Node runtime — this is a server-rendered app, not a static export.

## Project structure

```
src/
  app/
    login/                     Public login page
    (app)/                     Authenticated shell (sidebar + topbar)
      page.tsx                 Dashboard
      collection/[type]/       Dynamic entry form per collection type
      account/                 Change username/password
      notifications/           Notification list
    api/                       Server routes that proxy to your real backend
  components/                  UI components (form, sidebar, topbar, modals, etc.)
  lib/
    collection-config.ts       Per-type field configuration (the "business rules")
    collection-crypto.ts       Password encryption matching Encryption_Descryption.cs
    backend-config.ts          API base URLs + Basic auth header
    session.ts                 Signed httpOnly session cookie helpers
    image-to-pdf.ts            Picture → single-page PDF conversion (sharp + pdf-lib)
    gcs.ts                     Google Cloud Storage upload (base64 service-account key)
    notifications-client.ts    Shared/cached notification polling store
```
