# C-Monitoring — Web (Next.js) etest

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
- Attachments: pick photos (sent as-is; your backend converts them to PDF, so no
  client-side conversion is done here)
- Notifications bell + page (`collection/notif`), marks items viewed on leaving the page
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
```
