# NDTECH ISP Collector

Android app for NDTECH field collectors. It works **online**: every screen reads
from and writes to the NDTECH-ISP-MANAGEMENT API in real time.

Built with Expo (SDK 57) + React Native, Expo Router, and TanStack Query.

## What collectors can do

- **Today** — amount collected today by method, visits, cash on hand, assigned balance.
- **Accounts** — unpaid invoices assigned to them (or all), with search by name,
  account no., mobile, or invoice no.; overdue filter; sort by due date, balance, or name.
- **Account** — balance, invoice lines, other unpaid months, collection status,
  recent payments; call the customer or open the address in Maps.
- **Collect payment** — cash, GCash, bank transfer, check; partial payments;
  reference no. required for non-cash. Safe to retry on bad signal (see below).
- **Receipt** — payment details, share as text.
- **GCash QR** — generate a PayMongo checkout, show it as a QR code, and wait
  for the payment to post.
- **Log visit** — not home / talked / promised to pay (with date) / escalate,
  with optional GPS.
- **Collections** — their payments today or all time.
- **Me** — profile, cash on hand, remittance history, sign out.

## Backend

The app only uses the collector-only API at `/mobile/v1/collector`, added in
NDTECH-ISP-MANAGEMENT on branch `feature/mobile-collector-api`
(see `docs/mobile-collector-api.md` there). That branch must be deployed before
the app can sign in.

## Setup

```bash
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL
npm start
```

Scan the QR code with **Expo Go** on an Android phone on the same network, or
press `a` for an Android emulator.

`EXPO_PUBLIC_API_URL` is the API root without the `/mobile/v1/collector` suffix,
e.g. `https://billing.ndtech.ph/isp-billing/backend`. It is baked into the app at
build time.

## Checks

```bash
npm run typecheck
npm run lint
npm run doctor
```

## Retry-safe writes

Mobile data drops. Every payment, visit, and follow-up is sent with a
`requestId` created when the collector taps save. If the response is lost, the
app keeps the same `requestId` and the collector can tap again — the server
returns the original result instead of posting a second payment. The ID is
replaced only when the server rejects the request (4xx), since nothing was
recorded.

## Project layout

```
src/
  app/                  Screens (Expo Router, file-based)
    (tabs)/             Today, Accounts, Collections, Me
    account/[invoiceId] Account detail
    collect/[invoiceId] Record a payment
    gcash/[invoiceId]   GCash / online checkout QR
    visit/[invoiceId]   Log a visit / follow-up
    receipt/[paymentId] Payment receipt
    remittances.tsx     Cash turn-in history
  components/           Shared UI
  lib/
    api.ts              fetch wrapper (auth header, device ID, timeouts, errors)
    auth.tsx            Session: login, logout, token in SecureStore
    queries.ts          TanStack Query hooks for every endpoint
    types.ts            API response types
```

## Bluetooth receipt printer (ESC/POS)

Collectors can print a payment acknowledgement on a Bluetooth thermal printer
(58 mm or 80 mm, ESC/POS, Bluetooth Classic / SPP — e.g. PT-210, Goojprt,
Xprinter, Zjiang).

- **Me → Printer settings**: pick a paired printer, paper size, auto-print, test page.
- The receipt prints automatically after **Collect payment** (if auto-print is on),
  and can be printed again from the receipt screen. Copies after the first are
  marked `*** REPRINT ***`.
- Pair the printer in Android Bluetooth settings first (PIN usually `0000` or `1234`).

How it works: `src/lib/escpos.ts` builds the ESC/POS bytes and
`src/lib/receipt-printout.ts` lays out the receipt; the local native module
`modules/escpos-printer` (Kotlin) sends the bytes over an RFCOMM/SPP socket.

**Printing does not work in Expo Go** (it has no Bluetooth module). Use a
development build instead:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

Install the APK from the link EAS gives you, then run `npx expo start` and open
the project from the installed **NDTECH Collector** app instead of Expo Go.
Rebuild only when native code (`modules/`) or native dependencies change.

## Building an APK

Use EAS Build (no local Android Studio or Java needed):

```bash
npx eas-cli@latest build --platform android --profile preview
```

Release builds block plain `http://` URLs, so the API must be served over HTTPS
first.
