# Test Cases — Mini Issue Tracking System

This is the list of test cases for the system. Each one has an ID, a title,
preconditions, steps, and an expected result. The UI cases (UI-01..21) line up
one-to-one with the Playwright suite in `tests/playwright`, and the API cases
(API-01..30) line up with the Postman/Newman collection in `tests/postman`. There's
a mix of happy paths, failure cases, and edge cases.

Enums: priority is one of {LOW, MEDIUM, HIGH, CRITICAL}; status is one of
{TODO, IN_PROGRESS, DONE}.

---

## UI Test Cases (21)

### Authentication

**UI-01 — Register with valid data**
Preconditions: none.
Steps: Go to /register; enter name, unique email, password ≥ 8 chars; submit.
Expected: Redirected to dashboard (/); the user's name appears in the top bar.

**UI-02 — Register with short password**
Preconditions: none.
Steps: Go to /register; enter name, email, password "123"; submit.
Expected: Inline password error shown; stays on /register; no account created.

**UI-03 — Register with invalid email format**
Preconditions: none.
Steps: Go to /register; enter name, email "not-an-email", valid password; submit.
Expected: Inline email error shown; stays on /register.

**UI-04 — Login with valid credentials**
Preconditions: a registered user exists.
Steps: From /login, enter that user's email and password; submit.
Expected: Redirected to dashboard.

**UI-05 — Login with wrong password**
Preconditions: a registered user exists.
Steps: From /login, enter correct email but wrong password; submit.
Expected: Server error banner shown; remains on /login.

**UI-06 — Logout and route protection**
Preconditions: logged in.
Steps: Click Log out; then manually navigate to /.
Expected: Logout redirects to /login; navigating to / while logged out redirects back to /login.

**UI-07 — Anonymous access to a project page**
Preconditions: logged out.
Steps: Navigate directly to /projects/some-id.
Expected: Redirected to /login.

### Projects

**UI-08 — Create project**
Preconditions: logged in.
Steps: Click New project; enter name "Apollo Project"; save.
Expected: Project appears in the dashboard grid.

**UI-09 — Create project without a name**
Preconditions: logged in.
Steps: Click New project; leave name blank; save.
Expected: Inline name-required error; modal stays open; nothing created.

**UI-10 — Project count stat updates**
Preconditions: logged in, zero projects.
Steps: Note Total projects = 0; create a project.
Expected: Total projects stat increments to 1.

**UI-11 — Open project detail**
Preconditions: at least one project exists.
Steps: Click a project card.
Expected: Project detail page opens; the project title matches the card.

**UI-12 — Archive project**
Preconditions: a non-archived project exists.
Steps: Open project; click Archive; confirm; return to dashboard.
Expected: Project shows an ARCHIVED tag.

### Issues

**UI-13 — Create issue**
Preconditions: a project is open.
Steps: Click New issue; enter title "Login button broken"; save.
Expected: Issue appears in the issue table.

**UI-14 — Create issue without a title**
Preconditions: a project is open.
Steps: Click New issue; leave title blank; save.
Expected: Inline title-required error; nothing created.

**UI-15 — Edit issue title**
Preconditions: an issue exists.
Steps: Click the issue title; change title to "Updated title"; save.
Expected: Table reflects the new title.

**UI-16 — Change status via inline select**
Preconditions: an issue with status TODO exists.
Steps: Change the row's status select to IN_PROGRESS; reload the page.
Expected: Status persists as IN_PROGRESS after reload.

**UI-17 — Delete issue**
Preconditions: exactly one issue exists.
Steps: Click Delete on the row; confirm.
Expected: Issue removed; empty-state message shown.

**UI-18 — Filter by status**
Preconditions: a TODO issue and a DONE issue exist.
Steps: Set the status filter to DONE.
Expected: Only the DONE issue is listed.

**UI-19 — Filter by priority**
Preconditions: a CRITICAL issue and a LOW issue exist.
Steps: Set the priority filter to CRITICAL.
Expected: Only the CRITICAL issue is listed.

**UI-20 — Search by title**
Preconditions: issues "Payment gateway timeout" and "Navbar alignment" exist.
Steps: Type "payment" into the title search.
Expected: Only the payment issue is listed (case-insensitive match).

**UI-21 — Dashboard open/completed counts**
Preconditions: a project is open.
Steps: Create one TODO issue and one DONE issue; return to dashboard.
Expected: Open = 1, Completed = 1, Total issues = 2.

---

## API Test Cases (30)

All requests target the REST API under `/api`. Auth is via `Authorization: Bearer <token>` unless noted. Each case asserts the HTTP status and, where relevant, the response body and persisted effect.

### Authentication

**API-01 — Register new user (positive).** POST /auth/register with valid name/email/password → 201; body contains a token and the user's email; password is not echoed anywhere in the response. Token is captured for later requests.

**API-02 — Register duplicate email (negative).** POST /auth/register reusing an existing email → 409 with an error message.

**API-03 — Register invalid email (negative).** POST /auth/register with "not-an-email" → 400; error mentions email.

**API-04 — Register short password (edge).** POST /auth/register with password "123" → 400; error references the 8-character minimum.

**API-05 — Register missing fields (negative).** POST /auth/register with only an email → 400.

**API-06 — Login valid credentials (positive).** POST /auth/login with correct credentials → 200; returns a fresh token.

**API-07 — Login wrong password (negative).** POST /auth/login with wrong password → 401; generic "invalid" message (no user enumeration).

**API-08 — Login nonexistent user (negative).** POST /auth/login with an unknown email → 401.

### Authorization

**API-09 — Projects without token (negative).** GET /projects with no Authorization header → 401 or 403.

**API-10 — Malformed token (negative).** GET /projects with "Bearer not.a.real.token" → 401 or 403.

### Projects

**API-11 — Create project (positive).** POST /projects with a name → 201; returns an id; archived defaults to false. Project id captured.

**API-12 — Create project without name (negative).** POST /projects with no name → 400.

**API-13 — List projects (positive).** GET /projects → 200; an array containing the created project.

**API-14 — Get project by id (positive).** GET /projects/:id → 200; id matches.

**API-15 — Get nonexistent project (edge).** GET /projects/<all-zero UUID> → 404.

**API-16 — Update project name (positive).** PATCH /projects/:id with a new name → 200; name updated.

### Issues

**API-17 — Create issue (positive).** POST /projects/:id/issues with title and priority HIGH → 201; priority persisted; status defaults to TODO; createdAt present. Issue id captured.

**API-18 — Create issue without title (negative).** POST /projects/:id/issues with no title → 400; error mentions title.

**API-19 — Create issue invalid priority (negative).** POST /projects/:id/issues with priority "URGENT" → 400.

**API-20 — List issues (positive).** GET /projects/:id/issues → 200; array contains the created issue.

**API-21 — Filter by status (positive).** GET /projects/:id/issues?status=TODO → 200; every returned issue has status TODO.

**API-22 — Filter by priority (positive).** GET /projects/:id/issues?priority=HIGH → 200; every returned issue has priority HIGH.

**API-23 — Search by title (positive).** GET /projects/:id/issues?title=API created → 200; at least one matching issue returned.

**API-24 — Change issue status (positive).** PATCH /issues/:id with status IN_PROGRESS → 200; status changed; updatedAt refreshed.

**API-25 — Update nonexistent issue (negative).** PATCH /issues/<all-zero UUID> → 404.

**API-26 — Delete issue (positive).** DELETE /issues/:id → 204.

**API-27 — Delete already-deleted issue (edge).** DELETE /issues/:id again → 404.

**API-28 — Archive project (positive).** POST /projects/:id/archive → 200; archived flag true.

**API-29 — Add issue to archived project (edge).** POST /projects/:id/issues after archiving → 409.

**API-30 — Dashboard stats shape (positive).** GET /dashboard/stats → 200; body has totalProjects, totalIssues, openIssues, completedIssues, all numeric.

---

## Coverage summary

That's 21 UI cases and 30 API cases, 51 in total, which clears the 20-each
minimum. The happy paths show the features work, the failure cases show that
validation and authorization actually reject bad input, and the edge cases
(all-zero UUIDs, deleting something twice, writing to an archived project, empty
result sets) show the boundaries are handled cleanly. Auth and authorization are
covered at both the UI and API layers, since those are the highest-risk areas in
the risk analysis.
