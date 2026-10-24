PROJECT X — CURRICULUM IMPORT CENTRE V2

Only this PUBLIC_UPLOAD folder belongs in the project GitHub Pages repository.
Use the locally downloaded PRIVATE_IMPORT_PAYLOAD.json in your browser; never upload it to GitHub Pages.

Owner sign-in -> choose private JSON -> local validation -> Firestore remote dry-run ->
review checks -> import immutable private revisions -> verify and create private index.

Requirements before import:
* Existing Firestore rules reviewed and tightened for all new paths (see private setup guide).
* Firebase emulator owner/non-owner/anonymous access tests passed.
* Authorized Domains in Firebase Authentication include your GitHub Pages domain.
* Owner Firebase UID is verified against the configured account.

What it does NOT do:
* Nothing is deployed by simply downloading this app ZIP.
* Does not make questions or answers public.
* Does not update the legacy active Curriculum Centre lesson head or Student Classroom.
* Does not perform teacher moderation, full tenant isolation, or exam reference verification.

The Firestore Web config is public project identification, not an administrative secret.
Security must come from deployed Firestore rules and identity checks.
