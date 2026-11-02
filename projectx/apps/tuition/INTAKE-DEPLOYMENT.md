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
