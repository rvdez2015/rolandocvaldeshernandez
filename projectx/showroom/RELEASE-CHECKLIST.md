# Project X Professional Showroom — owner release checklist

## Current state
The showroom is a static, curated public surface. It contains links to portfolio pages and an independently authored offline-only interactive lesson example. It does not read Firebase, Google Classroom, student data, or tuition submissions.

## Mandatory owner review before merging
- Open showroom/index.html and showroom/demo.html in a browser or local static server and check links, responsive layout, and keyboard interactions.
- Verify public linked pages are appropriate for recruiters, headteachers, and prospective employers; remove any confidential school, student, safeguarding, or private resource details.
- Use a private/incognito window and confirm both pages function without signing in.
- Confirm there are no fetch requests, Firebase SDK references, or form submissions on showroom pages.
- Audit all legacy public Project X routes separately. A showroom link does not make other routes read-only; server Firestore/Storage rules and connected API authorisation are the security boundary.
- Do not grant anonymous reads on catalogueLessons, ownerApprovedCurriculumLessons, ownerCurriculumReviewDrafts, classroomPublications, tuition enquiries, teacher keys, or private student records.
- Only introduce a separate publicShowroomResources collection after designing a bounded student-safe projection, an explicit owner publishing workflow, and emulator tests for anonymous reads and owner-only writes.
- Do not automatically merge or deploy changes until the owner has reviewed the curated content.

## Future owner preview
Add an owner-side staging preview showing exactly the curated publication payload. A URL query parameter or a hidden button is not authorisation, so do not use it to expose draft data.

## Existing tuition requirements
Public visitors may complete forms, but private pending submissions require a protected intake service; only owner-approved entries are persisted into ownerApprovedTuitionEnquiries.
