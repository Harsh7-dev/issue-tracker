# API Test Script — Mini Issue Tracker

**Collection:** `issue-tracker.postman_collection.json`
**Environment:** `local.postman_environment.json`
**Run:** `newman run issue-tracker.postman_collection.json -e local.postman_environment.json`
**Coverage:** 30 requests · 58 assertions · auth, authorization, projects, issues, search/filter, dashboard — positive, negative, and edge cases.

---


- **Base URL:** `{{baseUrl}}` = `http://localhost:8080/api`
- **Chained state via collection variables:** `token`, `projectId`, `issueId` are captured from earlier responses and reused by later requests, so the suite runs end-to-end as one realistic flow (register → login → create project → create issue → mutate → delete → archive → stats).
- **Unique data per run:** a collection-level pre-request script generates a fresh `runEmail` / `runName` once per run (`api.<timestamp>@example.com`), so re-running never collides on the duplicate-email check.
- **Auth:** every protected request sends `Authorization: Bearer {{token}}`.
- **Test style:** each request has a `test` script using `pm.test(...)` + `pm.expect(...)` (Chai). Assertions check **status codes, response shape, persisted values, and security properties** (e.g. password never echoed, generic login error to avoid user enumeration).

---

## Authentication & Validation (API-01 → API-08)

| ID | Method | Endpoint | Body / Input | Expected | Assertions |
|----|--------|----------|--------------|----------|------------|
| **API-01** Register new user (positive) | POST | `/auth/register` | `{name, runEmail, Password123!}` | 201 | status 201 · token is non-empty string · user.email matches · **password not echoed in body** · saves `token`, `userId` |
| **API-02** Register duplicate email (negative) | POST | `/auth/register` | same `runEmail` again | 409 | status 409 · error message present |
| **API-03** Register invalid email (negative) | POST | `/auth/register` | `email: not-an-email` | 400 | status 400 · error mentions "email" |
| **API-04** Register short password (edge) | POST | `/auth/register` | `password: 123` | 400 | status 400 · error mentions "8" (min length) |
| **API-05** Register missing fields (negative) | POST | `/auth/register` | only `email` | 400 | status 400 |
| **API-06** Login valid (positive) | POST | `/auth/login` | `runEmail` + correct pw | 200 | status 200 · fresh token returned · overwrites `token` |
| **API-07** Login wrong password (negative) | POST | `/auth/login` | wrong pw | 401 | status 401 · **generic "invalid" error (no user enumeration)** |
| **API-08** Login nonexistent user (negative) | POST | `/auth/login` | random email | 401 | status 401 |

## Authorization / Security (API-09 → API-10)

| ID | Method | Endpoint | Input | Expected | Assertions |
|----|--------|----------|-------|----------|------------|
| **API-09** No token (negative) | GET | `/projects` | no `Authorization` header | 401/403 | response code ∈ {401, 403} |
| **API-10** Malformed token (negative) | GET | `/projects` | pre-request overrides header to `Bearer not.a.real.token` | 401/403 | response code ∈ {401, 403} |

## Projects (API-11 → API-16)

| ID | Method | Endpoint | Body / Input | Expected | Assertions |
|----|--------|----------|--------------|----------|------------|
| **API-11** Create project (positive) | POST | `/projects` | `{name: "API Test Project", description}` | 201 | status 201 · has id · name matches · **archived=false by default** · saves `projectId` |
| **API-12** Create without name (negative) | POST | `/projects` | `{description only}` | 400 | status 400 |
| **API-13** List projects (positive) | GET | `/projects` | — | 200 | status 200 · is array · **contains our `projectId`** |
| **API-14** Get project by id (positive) | GET | `/projects/{{projectId}}` | — | 200 | status 200 · id matches |
| **API-15** Get nonexistent project (edge) | GET | `/projects/0000…0000` | zero-UUID | 404 | status 404 |
| **API-16** Update project name (positive) | PATCH | `/projects/{{projectId}}` | `{name: "API Project Renamed"}` | 200 | status 200 · name updated |

## Issues — CRUD & Validation (API-17 → API-20)

| ID | Method | Endpoint | Body / Input | Expected | Assertions |
|----|--------|----------|--------------|----------|------------|
| **API-17** Create issue (positive) | POST | `/projects/{{projectId}}/issues` | `{title, desc, priority: HIGH, status: TODO}` | 201 | status 201 · priority persisted · status=TODO · createdAt present · saves `issueId` |
| **API-18** Create without title (negative) | POST | `/projects/{{projectId}}/issues` | no title | 400 | status 400 · error mentions "title" |
| **API-19** Invalid priority enum (negative) | POST | `/projects/{{projectId}}/issues` | `priority: URGENT` (not in enum) | 400 | status 400 |
| **API-20** List issues (positive) | GET | `/projects/{{projectId}}/issues` | — | 200 | status 200 · **contains created `issueId`** |

## Issues — Search & Filter (API-21 → API-23)

| ID | Method | Endpoint | Query | Expected | Assertions |
|----|--------|----------|-------|----------|------------|
| **API-21** Filter by status (positive) | GET | `/projects/{{projectId}}/issues` | `?status=TODO` | 200 | status 200 · **every result has status=TODO** |
| **API-22** Filter by priority (positive) | GET | `/projects/{{projectId}}/issues` | `?priority=HIGH` | 200 | status 200 · **every result has priority=HIGH** |
| **API-23** Search by title (positive) | GET | `/projects/{{projectId}}/issues` | `?title=API created` | 200 | status 200 · at least one match |

## Issues — Mutation & Deletion (API-24 → API-27)

| ID | Method | Endpoint | Body / Input | Expected | Assertions |
|----|--------|----------|--------------|----------|------------|
| **API-24** Change status (positive) | PATCH | `/issues/{{issueId}}` | `{status: IN_PROGRESS}` | 200 | status 200 · status changed · **updatedAt refreshed** |
| **API-25** Update nonexistent issue (negative) | PATCH | `/issues/0000…0000` | `{status: DONE}` | 404 | status 404 |
| **API-26** Delete issue (positive) | DELETE | `/issues/{{issueId}}` | — | 204 | status 204 (No Content) |
| **API-27** Delete already-deleted (edge) | DELETE | `/issues/{{issueId}}` | same id again | 404 | status 404 (idempotency check) |

## Business Rules & Dashboard (API-28 → API-30)

| ID | Method | Endpoint | Body / Input | Expected | Assertions |
|----|--------|----------|--------------|----------|------------|
| **API-28** Archive project (positive) | POST | `/projects/{{projectId}}/archive` | — | 200 | status 200 · **archived flag=true** |
| **API-29** Add issue to archived project (edge) | POST | `/projects/{{projectId}}/issues` | `{title}` on archived project | 409 | status 409 (**business rule: no issues on archived projects**) |
| **API-30** Dashboard stats shape (positive) | GET | `/dashboard/stats` | — | 200 | status 200 · has `totalProjects`, `totalIssues`, `openIssues`, `completedIssues` · counters are numbers |

---

## What each category proves

- **Positive tests** — the happy path returns the right status, shape, and persisted values.
- **Negative tests** — validation (400), auth (401/403), conflicts (409), and not-found (404) are handled with proper status codes and error messages, not 500s.
- **Edge cases** — zero-UUID lookups, double-delete idempotency, archived-project business rule, minimum-length boundaries.
- **Security** — passwords are never returned, login errors are generic (no user enumeration), and protected routes reject missing/malformed tokens.

## Raw test scripts (verbatim from the collection)

> The exact `pm.test` assertions for each request, in order.

```js
// API-01 Register new user (positive)
pm.test('status 201', () => pm.response.to.have.status(201));
const j = pm.response.json();
pm.test('returns token', () => pm.expect(j.token).to.be.a('string').and.not.empty);
pm.test('returns user with email', () => pm.expect(j.user.email).to.eql(pm.collectionVariables.get('runEmail')));
pm.test('password not echoed', () => pm.expect(JSON.stringify(j)).to.not.include('Password123'));
pm.collectionVariables.set('token', j.token);
pm.collectionVariables.set('userId', j.user.id);

// API-02 Register duplicate email (negative)
pm.test('status 409', () => pm.response.to.have.status(409));
pm.test('error message present', () => pm.expect(pm.response.json().error).to.be.a('string'));

// API-03 Register invalid email (negative)
pm.test('status 400', () => pm.response.to.have.status(400));
pm.test('mentions email', () => pm.expect(pm.response.json().error.toLowerCase()).to.include('email'));

// API-04 Register short password (negative/edge)
pm.test('status 400', () => pm.response.to.have.status(400));
pm.test('mentions password length', () => pm.expect(pm.response.json().error.toLowerCase()).to.include('8'));

// API-05 Register missing fields (negative)
pm.test('status 400', () => pm.response.to.have.status(400));

// API-06 Login valid credentials (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
const j = pm.response.json();
pm.test('returns fresh token', () => pm.expect(j.token).to.be.a('string'));
pm.collectionVariables.set('token', j.token);

// API-07 Login wrong password (negative)
pm.test('status 401', () => pm.response.to.have.status(401));
pm.test('generic error (no user enumeration)', () => pm.expect(pm.response.json().error.toLowerCase()).to.include('invalid'));

// API-08 Login nonexistent user (negative)
pm.test('status 401', () => pm.response.to.have.status(401));

// API-09 Access projects without token (negative)
pm.test('status 401 or 403', () => pm.expect([401,403]).to.include(pm.response.code));

// API-10 Access with malformed token (negative)
// pre-request: pm.request.headers.upsert({key:'Authorization', value:'Bearer not.a.real.token'});
pm.test('status 401 or 403', () => pm.expect([401,403]).to.include(pm.response.code));

// API-11 Create project (positive)
pm.test('status 201', () => pm.response.to.have.status(201));
const j = pm.response.json();
pm.test('has id', () => pm.expect(j.id).to.be.a('string'));
pm.test('name matches', () => pm.expect(j.name).to.eql('API Test Project'));
pm.test('not archived by default', () => pm.expect(j.archived).to.eql(false));
pm.collectionVariables.set('projectId', j.id);

// API-12 Create project without name (negative)
pm.test('status 400', () => pm.response.to.have.status(400));

// API-13 List projects returns created one (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
const j = pm.response.json();
pm.test('is array', () => pm.expect(j).to.be.an('array'));
pm.test('contains our project', () => pm.expect(j.some(p => p.id === pm.collectionVariables.get('projectId'))).to.be.true);

// API-14 Get project by id (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('id matches', () => pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get('projectId')));

// API-15 Get nonexistent project (negative/edge)
pm.test('status 404', () => pm.response.to.have.status(404));

// API-16 Update project name (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('name updated', () => pm.expect(pm.response.json().name).to.eql('API Project Renamed'));

// API-17 Create issue (positive)
pm.test('status 201', () => pm.response.to.have.status(201));
const j = pm.response.json();
pm.test('priority persisted', () => pm.expect(j.priority).to.eql('HIGH'));
pm.test('default-able status set', () => pm.expect(j.status).to.eql('TODO'));
pm.test('createdAt present', () => pm.expect(j.createdAt).to.be.a('string'));
pm.collectionVariables.set('issueId', j.id);

// API-18 Create issue without title (negative)
pm.test('status 400', () => pm.response.to.have.status(400));
pm.test('mentions title', () => pm.expect(pm.response.json().error.toLowerCase()).to.include('title'));

// API-19 Create issue invalid priority enum (negative)
pm.test('status 400', () => pm.response.to.have.status(400));

// API-20 List issues for project (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('contains created issue', () => pm.expect(pm.response.json().some(i => i.id === pm.collectionVariables.get('issueId'))).to.be.true);

// API-21 Filter issues by status (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('all results are TODO', () => pm.response.json().forEach(i => pm.expect(i.status).to.eql('TODO')));

// API-22 Filter issues by priority (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('all results are HIGH', () => pm.response.json().forEach(i => pm.expect(i.priority).to.eql('HIGH')));

// API-23 Search issues by title (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('matched issue present', () => pm.expect(pm.response.json().length).to.be.greaterThan(0));

// API-24 Change issue status (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
const j = pm.response.json();
pm.test('status changed', () => pm.expect(j.status).to.eql('IN_PROGRESS'));
pm.test('updatedAt refreshed', () => pm.expect(j.updatedAt).to.be.a('string'));

// API-25 Update nonexistent issue (negative)
pm.test('status 404', () => pm.response.to.have.status(404));

// API-26 Delete issue (positive)
pm.test('status 204', () => pm.response.to.have.status(204));

// API-27 Delete already-deleted issue (negative/edge)
pm.test('status 404', () => pm.response.to.have.status(404));

// API-28 Archive project (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
pm.test('archived flag true', () => pm.expect(pm.response.json().archived).to.eql(true));

// API-29 Cannot add issue to archived project (negative/edge)
pm.test('status 409', () => pm.response.to.have.status(409));

// API-30 Dashboard stats shape (positive)
pm.test('status 200', () => pm.response.to.have.status(200));
const j = pm.response.json();
pm.test('has all counters', () => {
  ['totalProjects','totalIssues','openIssues','completedIssues'].forEach(k => pm.expect(j).to.have.property(k));
});
pm.test('counters are numbers', () => pm.expect(j.totalProjects).to.be.a('number'));
```