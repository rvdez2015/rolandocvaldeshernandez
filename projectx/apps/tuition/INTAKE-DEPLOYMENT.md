# Tuition online intake — implementation and release gate

**Status: development only; not deployed or connected to the public enquiry form.**

The public form currently uses a mailto fallback. The proposed `intake-worker.mjs` receives online submissions after Cloudflare Turnstile verification, writes them only to a **temporary** Cloudflare KV queue (seven-day TTL), and provides a protected owner-only read/delete interface. **This queue is storage** (temporary personal data) and needs an appropriate privacy notice and retention policy. Nothing reaches `ownerApprovedTuitionEnquiries` until the owner separately approves it using the existing authenticated approval form.

## Production prerequisites
1. Create a Cloudflare Worker and bind `TUITION_PENDING` to a dedicated KV namespace.
2. Configure `TURNSTILE_SECRET` using a Worker secret and configure `ADMIN_FIREBASE_PROJECT=project-x-personal`. Never expose the secret to client code.
3. Create a Turnstile site key restricted to the real GitHub Pages hostname; embed the public key on the enquiry form only after deployment.
4. Review and test Firebase ID-token owner authentication on the worker's `/owner/pending` and DELETE routes. Browser owner console must use Firebase Auth ID tokens; no service account secrets in the browser.
5. Add an owner review page that preloads a pending item, verifies original consent, explicitly approves and writes it into the owner-approved Firestore collection, verifies the write, then removes the queue entry. Never delete the pending item before verifying the approved write.
6. Add rate limiting at Cloudflare edge in addition to Turnstile; assess abuse, privacy notice, contact information, and UK GDPR data-processing practices.
7. Test rejected anonymous reads, attempts to bypass Turnstile, expired entries, invalid owners, mixed-origin requests, large payloads, duplicate submissions, and failed writes.
8. Do not enable public form POST until the complete flow works with staging data.

## Separation of duties
Public visitors: permitted to submit a verified form; cannot list/read queue or write approved Firestore.
Authenticated Project X owner: permitted to inspect temporary queue and approve Firestore records via established owner-only rules.
No one else: permitted to inspect tuition correspondence.

## Academy website connection (3 November 2026)
The live academy GitHub Pages repository `rolando-cs-tuition/rolando-cs-tuition.github.io` now serves a bilingual enquiry form and `intake-settings.js`. The online button is **disabled** unless `enabled: true`, a public HTTPS `workerOrigin`, and public `turnstileSiteKey` are configured. Email fallback must remain available.

The Worker permits only `https://rolando-cs-tuition.github.io` and `https://rvdez2015.github.io` browser Origins. The Turnstile response hostname must match the browser Origin; configure Turnstile site domains for the desired hostname(s). Do not set the Turnstile secret in the academy repository. Cloudflare's Worker secret is named `TURNSTILE_SECRET`.

**Do not enable online submissions until:** deployed Worker KV binding, Turnstile secret, public site key, `ADMIN_FIREBASE_PROJECT` binding, full security regression tests, approval and queue-removal checks, privacy review, and abuse-rate limiting are verified.

### Manual Cloudflare setup
1. Create a KV namespace solely for pending tuition enquiries, with seven-day TTL on records.
2. Create/deploy the Worker using `projectx/apps/tuition/intake-worker.mjs` from the development branch; bind the namespace `TUITION_PENDING`.
3. Add Worker secret `TURNSTILE_SECRET` and environment setting `ADMIN_FIREBASE_PROJECT=project-x-personal`.
4. Create a Cloudflare Turnstile widget allowing `rolando-cs-tuition.github.io` (and optionally `rvdez2015.github.io`). Record its **public site key**.
5. Test POST and anonymous denial in staging, authenticated owner list/delete, one explicit approval into Firebase and queue cleanup.
6. Only then update the public academy `intake-settings.js` (site key and Worker origin are public values) and set `enabled:true`. Never commit private secrets.

**Caveats:** CORS is a browser control, not an abuse or authentication mechanism. Turnstile provides bot resistance, not a complete submission throttle. KV can be eventually consistent; robust duplicate prevention and receipt reconciliation are required before production usage.
