# Test Strategy — Mini Issue Tracking System

## 1. Purpose and scope

This document defines how quality is assured for the Mini Issue Tracking System: a multi-user web application where authenticated users create projects and track issues through a Todo → In Progress → Done lifecycle. It covers what is tested, at which layer, the risks that drive test prioritisation, and the entry/exit criteria for a release.

Scope includes authentication, project management, issue management, search/filtering, the dashboard, and the supporting REST API. Out of scope: load/performance benchmarking beyond smoke level, penetration testing, and email delivery (no email features exist).

## 2. Testing approach and the test pyramid

Testing is layered so that fast, cheap checks catch most defects and slow, expensive checks confirm the system works end to end.

At the base sit backend unit and slice tests (JUnit + MockMvc against an in-memory H2 database) that validate validation rules, authorization, and error handling without standing up the full stack. In the middle sit API integration tests (Postman/Newman) that exercise the real running service against PostgreSQL, verifying contracts, status codes, and data persistence across endpoints. At the top sit end-to-end UI tests (Playwright) that drive the browser through the critical user journeys exactly as a person would.

The deliberate bias is toward the lower layers. UI tests are reserved for journeys where the integration of frontend and backend is itself the thing under test; everything that can be asserted at the API or unit level is asserted there, where feedback is faster and failures are easier to localise.

## 3. Functional Testing — what should be tested

Functional testing verifies that each feature behaves according to its requirement. The areas, in priority order:

**Authentication.** Registration with valid data; rejection of duplicate emails, malformed emails, and passwords under the minimum length; login with correct and incorrect credentials; logout clearing the session; and protection of authenticated routes from anonymous access. Passwords must never be returned in any response, and password hashing must be verified indirectly (a stored value that is not the plaintext).

**Projects.** Creating a project with and without a name; listing only the projects the requesting user owns; viewing a single project; renaming a project; and archiving a project. Archiving must be verified to flip the archived flag and to block new issue creation in that project.

**Issues.** Creating an issue with required and optional fields; default values for priority and status when omitted; editing title, description, priority, and status; assigning an issue; changing status across all three states; and deleting an issue. The updatedAt timestamp must change on update and createdAt must not.

**Search and filtering.** Searching issues by partial title (case-insensitive); filtering by status, priority, and assignee; and combinations of filters. Empty result sets must render an explicit empty state rather than an error.

**Dashboard.** Total projects, total issues, open issues, and completed issues must reflect the underlying data and update as projects and issues are created, completed, and deleted.

## 4. API Testing — which endpoints need validation

Every endpoint is validated for its happy path, its documented failure modes, and its authorization boundary.

The auth endpoints (`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`) are validated for correct token issuance, input validation messages, duplicate handling, and credential rejection. The project endpoints (`GET/POST /projects`, `GET/PATCH /projects/:id`, `POST /projects/:id/archive`) are validated for ownership scoping, validation, and not-found handling. The issue endpoints (`GET/POST /projects/:id/issues`, `PATCH/DELETE /issues/:id`) are validated for creation defaults, enum validation, filter query parameters, status transitions, and not-found/archived-project rejection. The dashboard endpoint (`GET /dashboard/stats`) is validated for response shape and numeric correctness.

For each endpoint the suite asserts the HTTP status code, the response body shape, the persisted side effect where applicable, and — critically — that protected endpoints reject requests carrying no token or a malformed token. Authorization is treated as a first-class test concern, not an afterthought: a user must not be able to read or mutate another user's projects or issues.

## 5. Regression Testing — high-risk areas

Regression effort concentrates where a change is most likely to silently break something a user depends on.

The highest-risk areas are authentication and authorization, because a regression there is both severe (data exposure) and easy to introduce when refactoring the security filter or token handling. Second is the issue search/filter query, because it combines several optional parameters into one database query and a single off-by-one in the predicate logic can silently return wrong data. Third is the status lifecycle and the dashboard counters that derive from it, since the counts are computed from status and a miscount erodes trust in the whole product. Fourth is the archived-project rule, an easily-forgotten cross-cutting constraint.

The full Playwright and Newman suites run on every pull request via CI, so these areas are re-verified continuously. Any defect found and fixed gains a dedicated regression test reproducing it, so the same bug cannot return unnoticed.

## 6. Risk Analysis — what could fail in production

The most consequential production risks, with the mitigation already built in or recommended:

A weak or leaked JWT secret would allow forged tokens; the secret is externalised to an environment variable and must be a long random value in production. Missing server-side validation would let a crafted client bypass the UI; all validation is enforced on the backend with Bean Validation, and the test suite includes negative cases that post directly to the API. Broken authorization could expose cross-tenant data; ownership is checked in the service layer on every project and issue access, and tested explicitly. SQL injection is mitigated by using parameterised JPA queries throughout rather than string concatenation. Unhandled errors leaking stack traces are caught by a global exception handler that returns a uniform `{ "error": ... }` shape. Finally, database unavailability at startup is handled by compose health checks that gate the backend on a ready database.

Residual risks accepted for this scope: no rate limiting on auth endpoints (brute-force protection), and no pagination on issue lists (large projects would return unbounded result sets). Both are documented as known limitations and recommended next steps.

## 7. Entry and exit criteria

Testing begins once the stack builds and starts via `docker compose up` and the backend health endpoint reports up. A release is considered passing when the backend test suite is green, the full Playwright suite passes, the Newman API suite passes with zero failed assertions, ESLint passes with zero warnings, and no open defect of Critical or High severity remains.

## 8. Tooling summary

Backend tests run on JUnit 5 with Spring MockMvc and H2. API automation runs on Postman collections executed headlessly by Newman against PostgreSQL. UI automation runs on Playwright driving Chromium. All three suites are wired into GitHub Actions and execute on every pull request, alongside lint and build, so quality gates are enforced before merge rather than after.
