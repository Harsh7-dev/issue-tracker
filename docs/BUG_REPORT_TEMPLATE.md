# Bug Report Template — Mini Issue Tracking System

A good bug report lets someone who's never seen the bug reproduce it in a few
minutes and understand how bad it is without having to ask. This is the template I
use for this project. Two filled-in examples follow.

---

## Template

**Title:** A one-line summary in the form "[area] what is wrong, under what condition". Specific enough to be searchable.

**Environment:** Build/commit, browser and OS (for UI), API base URL or service version (for API), and the database state if relevant (e.g. fresh vs seeded).

**Severity:** How badly it breaks the product, independent of who is affected — Critical (data loss, security exposure, core flow unusable), High (major feature broken, no workaround), Medium (feature impaired, workaround exists), Low (cosmetic or minor).

**Priority:** How soon it should be fixed, given business context — P1 (fix now / block release), P2 (fix this cycle), P3 (backlog).

**Preconditions:** The state the system must be in before the steps (e.g. "logged in as a user who owns at least one project").

**Steps to Reproduce:** Numbered, minimal, deterministic steps. Anyone should be able to follow them exactly.

**Expected Result:** What should happen according to the requirement.

**Actual Result:** What actually happens, including exact error text, status codes, or screenshots.

**Evidence / Notes:** Logs, request/response payloads, screenshots, video, or a failing test reference. Note any suspected cause or recent change if known.

---

## Sample bug 1 — UI

**Title:** [Issues] Status change via inline select is lost after page reload

**Environment:** Build `main@a1b2c3d`; Chrome 124 on macOS 14; frontend at http://localhost:3000; backend at http://localhost:8080; seeded with one project and one issue.

**Severity:** High — a primary workflow (moving an issue through its lifecycle) does not persist.

**Priority:** P1 — core to the product's purpose; no workaround.

**Preconditions:** Logged in; viewing a project that contains at least one issue with status TODO.

**Steps to Reproduce:**
1. In the issue table, change the row's status dropdown from "Todo" to "In Progress".
2. Observe the dropdown now shows "In Progress".
3. Reload the page.

**Expected Result:** The issue remains "In Progress" after reload, because the change was saved to the backend.

**Actual Result:** After reload the issue reverts to "Todo". The PATCH request to `/api/issues/:id` returned 200 but the body still showed `"status":"TODO"`.

**Evidence / Notes:** Network tab shows the PATCH payload was `{}` rather than `{"status":"IN_PROGRESS"}`, suggesting the select's onChange value was not included in the request. Covered by regression case UI-16.

---

## Sample bug 2 — API

**Title:** [Issues] Creating an issue on an archived project succeeds instead of returning 409

**Environment:** API `main@a1b2c3d` against PostgreSQL 16; verified via Newman.

**Severity:** Medium — violates a business rule but does not corrupt unrelated data.

**Priority:** P2 — should be fixed this cycle; archived projects are expected to be read-only.

**Preconditions:** A valid token; a project that has been archived via `POST /api/projects/:id/archive`.

**Steps to Reproduce:**
1. Archive a project and confirm `archived` is `true`.
2. Send `POST /api/projects/:id/issues` with body `{"title":"should fail"}`.

**Expected Result:** `409 Conflict` with an error explaining issues cannot be added to an archived project.

**Actual Result:** `201 Created`; the issue is added to the archived project.

**Evidence / Notes:** Suggests the archived check is missing or short-circuited in the issue-creation service path. Covered by regression case API-29.
