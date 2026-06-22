# Beacon — Mini Issue Tracking System

A full-stack issue tracker built for a QA-focused take-home: users register, create projects, and track issues through a Todo → In Progress → Done lifecycle, with search, filtering, and a dashboard. The repository includes the working application, a layered REST API, and a complete QA suite — UI automation (Playwright), API automation (Postman/Newman), backend tests (JUnit), CI, and the QA documentation set.

## Stack

The backend is Spring Boot 3 (Java 17) with Spring Security, JWT auth, Spring Data JPA, and Bean Validation, over PostgreSQL. The frontend is React with Vite and React Router. UI tests use Playwright; API tests use Postman executed by Newman. Everything is containerised with Docker and wired into GitHub Actions.

## Quick start (one command)

With Docker installed:

```bash
docker compose up --build
```

This starts PostgreSQL, the backend (on :8080), and the frontend (on :3000), gating the backend on a healthy database. Open **http://localhost:3000**, register an account, and start creating projects and issues. The backend health check is at http://localhost:8080/actuator/health.

To stop and remove volumes:

```bash
docker compose down -v
```

## Running locally without Docker

Backend (requires JDK 17 and a local PostgreSQL, or point the env vars at any Postgres):

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
npm run dev                # serves on http://localhost:5173, proxies /api to :8080
```

## Running the tests

**Backend (JUnit + MockMvc, in-memory H2 — no database needed):**

```bash
cd backend
mvn verify
```

The suite also includes a Testcontainers integration test (`IssuePostgresIntegrationTest`) that runs the full project/issue flow against a real **PostgreSQL** container, so Postgres-specific behaviour (lazy-loaded associations with `open-in-view: false`, untyped nulls in the issue-search query) is exercised rather than only H2. It needs a running Docker daemon and is **skipped automatically** when Docker is unavailable, so `mvn verify` still passes without it. CI runs it on every push (the runner has Docker).

**UI automation (Playwright)** — needs the app running (e.g. `docker compose up`):

```bash
cd tests/playwright
npm install
npx playwright install --with-deps chromium
npx playwright test           # 21 UI test cases
npx playwright show-report    # view the HTML report
```

**API automation (Postman/Newman)** — needs the backend running:

```bash
npm install -g newman
newman run tests/postman/issue-tracker.postman_collection.json \
  -e tests/postman/local.postman_environment.json   # 30 API test cases
```

**Frontend lint and build:**

```bash
cd frontend
npm run lint
npm run build
```

All of the above run automatically on every pull request via `.github/workflows/ci.yml`.

## Project structure

```
issue-tracker/
├── backend/            Spring Boot API (controllers, services, repositories, security)
│   └── src/main/resources/db/schema.sql   canonical PostgreSQL DDL
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
Issues: `GET/POST /api/projects/:projectId/issues` (with `?title=&status=&priority=&assigneeId=` filters), `GET/PATCH/DELETE /api/issues/:id`.
Dashboard: `GET /api/dashboard/stats`.

Protected endpoints require `Authorization: Bearer <token>`.

## QA documentation

The `docs/` folder contains the Test Strategy (approach, risk analysis, regression focus), the Test Cases (21 UI + 30 API, mapped to the automated suites), the Bug Report Template (with two worked examples), and the System Design (architecture, tradeoffs, and a scaling plan for 100 / 10,000 / 1,000,000 users).

## Assumptions

A handful of product and scope decisions were made where the brief left room, and are recorded here so they are easy to challenge:

A user sees and manages only the projects they own; there is no sharing, team membership, or multi-user collaboration on a project, since the brief describes single-user ownership. Because there is no project membership, an issue's assignee is, in practice, the owner; the data model supports arbitrary assignees but the UI assigns to the owner. Logout is handled client-side by discarding the JWT, as is standard for stateless tokens; tokens remain valid until expiry, and server-side revocation is listed as a documented next step. Archiving a project is soft (a flag) rather than a delete, and an archived project becomes read-only — existing issues remain visible but no new issues can be added. Issue lists are returned unpaginated for the scope of this exercise; pagination is identified as the first scaling change. Email addresses are treated as the unique login identity and are stored lower-cased. The default issue priority is MEDIUM and the default status is TODO when omitted. The JWT secret and database credentials are supplied via environment variables; the values in `docker-compose.yml` are development defaults and must be overridden in any real deployment. Finally, the dashboard's "open" count is defined as every issue not in the DONE state (i.e. TODO and IN_PROGRESS together).
