# Beacon — Mini Issue Tracking System

Beacon is a small issue tracker. You register an account, create projects, and
move issues through Todo → In Progress → Done, with search, filtering, and a
dashboard on top. It was built as a QA-focused take-home, so the repo ships with
the working app plus a full test setup: Playwright for the UI, Postman/Newman for
the API, JUnit for the backend, CI to run it all, and the QA docs under `docs/`.

## Stack

The backend is Spring Boot 3 on Java 17, using Spring Security with JWT auth,
Spring Data JPA, and Bean Validation, backed by PostgreSQL. The frontend is React
with Vite and React Router. UI tests run on Playwright and API tests run on
Postman via Newman. The whole thing runs in Docker and has a GitHub Actions
pipeline.

## Quick start

If you have Docker:

```bash
docker compose up --build
```

That brings up PostgreSQL, the backend on `:8080`, and the frontend on `:3000`,
and it waits for the database to be healthy before starting the backend. Open
**http://localhost:3000**, register, and you're in. Backend health lives at
http://localhost:8080/actuator/health.

To stop everything and wipe the database volume:

```bash
docker compose down -v
```

Leave off `-v` if you want to keep your data between runs.

## Running locally without Docker

Backend — you'll need JDK 17 and a Postgres to point at:

```bash
cd backend
DB_URL=jdbc:postgresql://localhost:5432/tracker DB_USER=tracker DB_PASSWORD=tracker \
JWT_SECRET=a-long-random-development-secret-value-at-least-32-bytes \
./mvnw spring-boot:run     # or: mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :8080
```

## Running the tests

**Backend (JUnit + MockMvc on in-memory H2 — no database required):**

```bash
cd backend
mvn verify
```

There's also a Testcontainers test (`IssuePostgresIntegrationTest`) that runs the
full project/issue flow against a real PostgreSQL container. The point is to catch
the Postgres-specific things H2 lets slide — lazy-loaded associations under
`open-in-view: false`, and untyped nulls in the issue-search query. It needs Docker
running and skips itself when Docker isn't there, so `mvn verify` still passes
without it. CI runs it on every push since the runner has Docker.

**UI tests (Playwright)** — the app needs to be running first (e.g. `docker compose up`):

```bash
cd tests/playwright
npm install
npx playwright install --with-deps chromium
npx playwright test           # 21 UI cases
npx playwright show-report    # open the HTML report
```

**API tests (Postman/Newman)** — needs the backend running:

```bash
npm install -g newman
newman run tests/postman/issue-tracker.postman_collection.json \
  -e tests/postman/local.postman_environment.json   # 30 API cases
```

**Frontend lint and build:**

```bash
cd frontend
npm run lint
npm run build
```

All of these also run on every pull request through `.github/workflows/ci.yml`.

## Project structure

```
issue-tracker/
├── backend/            Spring Boot API (controllers, services, repositories, security)
│   └── src/main/resources/db/schema.sql   PostgreSQL DDL
├── frontend/           React + Vite SPA
├── tests/
│   ├── playwright/     UI automation (21 cases)
│   └── postman/        API automation (30 cases)
├── docs/
│   ├── TEST_STRATEGY.md
│   ├── TEST_CASES.md
│   ├── BUG_REPORT_TEMPLATE.md
│   └── SYSTEM_DESIGN.md
├── docker-compose.yml  one-command local stack
└── .github/workflows/ci.yml
```

## API summary

Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.
Projects: `GET/POST /api/projects`, `GET/PATCH /api/projects/:id`, `POST /api/projects/:id/archive`.
Issues: `GET/POST /api/projects/:projectId/issues` (filters: `?title=&status=&priority=&assigneeId=`), `GET/PATCH/DELETE /api/issues/:id`.
Dashboard: `GET /api/dashboard/stats`.

Anything that isn't an auth route needs `Authorization: Bearer <token>`.

## QA documentation

The `docs/` folder has the Test Strategy (approach, risks, what to watch on
regression), the Test Cases (21 UI + 30 API, mapped to the automated suites), a
Bug Report Template with two worked examples, and the System Design (architecture,
the tradeoffs behind it, and how it would scale to 100 / 10,000 / 1,000,000 users).

## Assumptions

The brief left some things open, so here are the calls I made, written down so
they're easy to argue with:

- A user only sees and manages their own projects. There's no sharing, teams, or
  collaboration on a project, since the brief described single-user ownership.
- Because projects have no members, an issue's assignee is effectively the owner.
  The data model allows any assignee, but the UI assigns to the owner.
- Logout just throws away the JWT on the client, which is normal for stateless
  tokens. Tokens stay valid until they expire; server-side revocation is on the
  "next steps" list.
- Archiving is a soft flag, not a delete. An archived project goes read-only —
  you can still see its issues but can't add new ones.
- Issue lists aren't paginated yet. That's the first thing I'd add when projects
  get big.
- Email is the login identity and is stored lower-cased.
- Default priority is MEDIUM and default status is TODO when you leave them out.
- The JWT secret and DB credentials come from environment variables. The values
  in `docker-compose.yml` are dev defaults and need to be replaced for anything
  real.
- The dashboard's "open" count means anything not DONE, so TODO and IN_PROGRESS
  together.