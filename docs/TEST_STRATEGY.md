# Test Strategy — Mini Issue Tracking System

## 1. Purpose and scope

This is how I test Beacon, a multi-user web app where logged-in users create
projects and track issues through Todo → In Progress → Done. It covers what gets
tested, at which layer, the risks that decide where to spend testing effort, and
what has to be true before a release goes out.

In scope: authentication, projects, issues, search/filtering, the dashboard, and
the REST API behind them. Out of scope: real load/performance testing beyond a
smoke check, penetration testing, and email (there are no email features).

## 2. Approach and the test pyramid

Tests are layered so the fast, cheap ones catch most problems and the slow,
expensive ones just confirm the system holds together end to end.

The base is backend unit and slice tests — JUnit and MockMvc against an in-memory
H2 database — that check validation, authorization, and error handling without
booting the whole stack. Above that are the API integration tests (Postman/Newman)
that hit the real running service on PostgreSQL and check contracts, status codes,
and that data actually persists across endpoints. At the top are the end-to-end UI
tests (Playwright) that drive a browser through the main user journeys the way a
person would.

The weighting is intentionally bottom-heavy. UI tests are saved for journeys where
the frontend-backend integration is the thing being tested; anything I can assert
at the API or unit level, I assert there, because the feedback is faster and a
failure is easier to pin down.

## 3. Functional testing — what gets checked

Functional testing is about each feature doing what it's supposed to. Roughly in
priority order:

**Authentication.** Register with valid data; reject duplicate emails, malformed
emails, and passwords below the minimum length; log in with right and wrong
credentials; log out and clear the session; and keep anonymous users off
authenticated routes. Passwords should never come back in a response, and you can
check hashing indirectly — the stored value isn't the plaintext.

**Projects.** Create a project with and without a name; list only the projects the
caller owns; view one project; rename one; and archive one. Archiving needs to both
flip the archived flag and block new issues on that project.

**Issues.** Create with the required and optional fields; default priority and
status when they're left out; edit title, description, priority, and status; assign
an issue; move it through all three statuses; and delete it. `updatedAt` should
change on an update and `createdAt` shouldn't.

**Search and filtering.** Search issues by partial title (case-insensitive); filter
by status, priority, and assignee; and combine filters. An empty result should show
a clear empty state, not an error.

**Dashboard.** Total projects, total issues, open issues, and completed issues
should match the data and update as things get created, completed, and deleted.

## 4. API testing — what to validate

Every endpoint gets checked for its happy path, its known failure modes, and its
authorization boundary.

The auth endpoints (`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`)
get checked for correct token issuance, validation messages, duplicate handling,
and credential rejection. The project endpoints (`GET/POST /projects`,
`GET/PATCH /projects/:id`, `POST /projects/:id/archive`) get checked for ownership
scoping, validation, and not-found handling. The issue endpoints
(`GET/POST /projects/:id/issues`, `PATCH/DELETE /issues/:id`) get checked for
creation defaults, enum validation, filter query params, status changes, and
not-found / archived-project rejection. The dashboard endpoint
(`GET /dashboard/stats`) gets checked for response shape and correct numbers.

For each endpoint the suite asserts the status code, the body shape, the persisted
side effect where there is one, and — the one I care most about — that protected
endpoints reject requests with no token or a bad token. Authorization isn't an
afterthought here: one user must not be able to read or change another user's
projects or issues.

## 5. Regression testing — the risky spots

Regression effort goes where a change is most likely to quietly break something
people rely on.

The riskiest area is auth and authorization, because a regression there is both
serious (data exposure) and easy to slip in while refactoring the security filter
or token handling. Next is the issue search/filter query, since it folds several
optional parameters into one database query and a single wrong predicate can return
wrong data without erroring. Third is the status lifecycle and the dashboard counts
that come from it — the counts are derived from status, and a miscount quietly
undermines trust in the whole app. Fourth is the archived-project rule, a
cross-cutting constraint that's easy to forget.

The full Playwright and Newman suites run on every pull request in CI, so these
areas get re-checked all the time. Anytime a bug is found and fixed, it gets a
regression test that reproduces it, so it can't come back unnoticed.

## 6. Risk analysis — what could break in production

The risks I worry about most, with the mitigation that's already in or recommended:

- A weak or leaked JWT secret would let someone forge tokens. The secret lives in
  an environment variable and has to be a long random value in production.
- Missing server-side validation would let a hand-rolled client skip the UI. All
  validation runs on the backend with Bean Validation, and the suite has negative
  cases that POST straight to the API.
- Broken authorization could expose another tenant's data. Ownership is checked in
  the service layer on every project and issue access, and it's tested directly.
- SQL injection is handled by using parameterised JPA everywhere instead of string
  concatenation.
- Unhandled errors leaking stack traces are caught by the global exception handler,
  which returns a uniform `{ "error": ... }` shape.
- The database not being ready at startup is handled by compose health checks that
  hold the backend until the database is up.

Risks I'm accepting at this scope: no rate limiting on the auth endpoints
(brute-force protection), and no pagination on issue lists (a huge project would
return everything). Both are written down as known limitations and next steps.

## 7. Entry and exit criteria

Testing starts once the stack builds and runs with `docker compose up` and the
backend health endpoint says it's up. A release passes when the backend suite is
green, the full Playwright suite passes, the Newman suite passes with zero failed
assertions, ESLint is clean, and there's no open Critical or High bug left.

## 8. Tooling

Backend tests use JUnit 5 with Spring MockMvc and H2. API automation is Postman
collections run headlessly by Newman against PostgreSQL. UI automation is Playwright
driving Chromium. All three run in GitHub Actions on every pull request alongside
lint and build, so the quality gates run before a merge, not after.