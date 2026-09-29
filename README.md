# Meltech Invoices & Quotations

This app creates Meltech-styled invoices and quotations, includes sequential document numbers, VAT, eTIMS receipt details and QR codes, sales and payment reports, and browser-local document history.

## Vercel deployment

This project is prepared for Vercel Functions. The account API is in `api/`; the static interface is `index.html`.

1. Push the **contents of this folder** to a GitHub repository and import that repository into Vercel.
2. Create a PostgreSQL database through a Vercel Marketplace provider and connect it to the project. Add its connection string as `POSTGRES_URL`.
3. Set these Vercel environment variables for Production (and Preview if needed):
   - `POSTGRES_URL` — PostgreSQL connection string.
   - `SESSION_SECRET` — long random secret, at least 32 random bytes.
   - `ADMIN_SETUP_SECRET` — separate one-time bootstrap secret.
   - `APP_URL` — deployed app origin, such as `https://your-app.vercel.app`.
   - `RESEND_API_KEY` and `MAIL_FROM` — Resend email API key and verified sender address, used for password setup/reset emails.
4. Deploy. Bootstrap the first administrator once by POSTing JSON to `/api/setup-admin` with `setupSecret`, `email`, `fullName`, and a password of at least 12 characters. Use HTTPS and a secret request body; do not put the setup secret in a public URL or commit it. Remove `ADMIN_SETUP_SECRET` from the Vercel project after bootstrap.
5. Sign in with the administrator account. Admins can invite accounts with the Staff, User, or Admin role. Invitees set their password through the emailed one-time link. Accounts can request password resets from the sign-in screen.

Vercel Functions provide the backend runtime; Vercel Postgres is no longer offered as a first-party database product, so use a Marketplace database integration. See [Vercel Functions](https://vercel.com/docs/functions), [Vercel Postgres guidance](https://vercel.com/docs/postgres), and [Marketplace storage integrations](https://vercel.com/docs/marketplace-storage).

## Current data behavior

The current invoice and quotation records, numbering counters, and payment entries are saved in that browser's local storage. They are not shared across staff accounts or devices yet. The account API provides server-backed login, roles, invitations, and reset emails, but shared cloud documents and cloud-synchronized numbering still need a document-storage API before the app is suitable for coordinated multi-user production use. Reports summarize the documents available in the current browser.

The app shows eTIMS receipt details and a supplied QR image or verification link; it does not connect to KRA eTIMS or submit tax invoices. Local preview does not provide secure accounts. Use the deployed Vercel API for account flows.
