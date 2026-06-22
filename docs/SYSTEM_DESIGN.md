# System Design — Mini Issue Tracking System

## 1. Overview

The system is a three-tier web application: a React single-page frontend, a stateless Spring Boot REST API, and a PostgreSQL database. A user authenticates, receives a JWT, and uses it to manage projects and the issues within them. The design favours simplicity, clear boundaries between tiers, and statelessness in the application layer so that the most likely future need — running more than one backend instance — requires no rearchitecting.

## 2. Architecture

```
┌──────────────┐     HTTPS      ┌───────────────────┐    JDBC    ┌──────────────┐
│   Browser    │ ─────────────► │   Spring Boot API │ ─────────► │  PostgreSQL  │
│ React (Vite) │ ◄───────────── │  (stateless, JWT) │ ◄───────── │              │
└──────────────┘    JSON        └───────────────────┘            └──────────────┘
        │                                  │
        │ static assets via nginx          │ Bearer JWT verified per request
        ▼                                  ▼
  SPA routing                       Service layer enforces
  client validation                ownership + business rules
```

The **frontend** is built by Vite and served as static files by nginx, which also proxies `/api` to the backend. It holds the JWT in local storage, attaches it to each request, performs first-pass validation for fast feedback, and renders the dashboard, project, and issue views. It trusts the backend as the source of truth; all of its validation is duplicated server-side.

The **backend** is organised in layers: controllers handle HTTP and shape requests/responses; services hold business logic and authorization; repositories (Spring Data JPA) handle persistence. A JWT filter authenticates each request by verifying the token signature and loading the user. A global exception handler converts errors into a uniform `{ "error": ... }` JSON shape. The application holds no session state — the token carries identity — which is the key property that makes horizontal scaling straightforward.

The **database** holds three tables: users, projects, and issues, with foreign keys from projects to their owner and from issues to their project and optional assignee. Indexes exist on the foreign keys and on the issue columns used for filtering (status, priority). The schema uses UUID primary keys.

## 3. Data model

A user owns many projects; a project contains many issues; an issue optionally references an assignee. Issues carry a status (TODO/IN_PROGRESS/DONE) and priority (LOW/MEDIUM/HIGH/CRITICAL) as constrained values, timestamps for creation and last update, and cascade rules so that deleting a project removes its issues and deleting a user removes their projects. The canonical DDL lives in `backend/src/main/resources/db/schema.sql`.

## 4. Key design decisions and tradeoffs

**Why REST rather than GraphQL.** The data has a small, well-understood set of access patterns: list projects, list issues for a project with a few filters, and standard CRUD. REST expresses these directly with cacheable, debuggable endpoints and needs no extra query-parsing layer. GraphQL shines when clients need to compose widely varying queries over a deep graph or when many client types each want different field sets; here that flexibility would add schema and resolver complexity, plus N+1 and query-cost concerns, for little benefit. REST is the proportionate choice, with the option to add GraphQL later if a rich client demands it.

**Why PostgreSQL rather than a document store.** The domain is inherently relational — users own projects own issues, with filtering and aggregate counts across those relations. A relational database gives foreign-key integrity, transactional consistency for multi-row changes, and efficient indexed filtering and counting, all of which the dashboard and issue views rely on. A document database would push that relational logic into application code and risk inconsistency. PostgreSQL also leaves room to grow (JSONB columns, full-text search) without a migration to a different engine.

**Why stateless JWT rather than server sessions.** A signed token lets any backend instance authenticate a request without shared session storage, so scaling out is a matter of adding instances behind a load balancer. The tradeoff is that tokens cannot be invalidated server-side before they expire; this is accepted at this scope by keeping token lifetimes short, and the documented next step for higher-security needs is a short-lived access token paired with a refresh token and a revocation list.

**Why a layered monolith rather than microservices.** At this size a single deployable with clean internal layers is faster to build, test, and operate, and avoids the network and data-consistency overhead of distributed services. The layering keeps the door open to extracting a service later if one part develops independent scaling needs.

## 5. Security

Passwords are hashed with BCrypt and never returned. All input is validated server-side with Bean Validation, so a client that bypasses the UI cannot submit invalid data. Authorization is enforced in the service layer: every project and issue access checks that the requesting user owns the resource, returning 404/403 otherwise, which prevents cross-tenant data access. Queries use parameterised JPA, avoiding SQL injection. The JWT secret is supplied via environment variable and must be a long random value in production. CORS is restricted to the known frontend origins.

## 6. Scaling

The architecture is designed so that each stage of growth changes the operational posture more than the code.

**Around 100 users.** A single backend instance, a single PostgreSQL instance, and the static frontend behind nginx comfortably handle this load — it is effectively the `docker compose up` topology. Focus is on correctness, sensible indexes (already present), and basic observability (health checks, structured logs). No caching or replication is needed; the database working set fits in memory and queries are simple indexed lookups.

**Around 10,000 users.** Concurrency and read volume grow, so the application tier scales horizontally: run several stateless backend instances behind a load balancer. This is possible precisely because the backend keeps no session state — the JWT carries identity. The database becomes the bottleneck before the app tier does, so introduce read replicas and route read-heavy traffic (dashboards, issue lists) to them while writes go to the primary, and add a connection pool sized to the database. Add pagination to issue lists (a known current limitation) so large projects do not return unbounded results, and introduce a cache (e.g. Redis) for hot, read-mostly data such as dashboard counts, invalidated on write. Add rate limiting on auth endpoints to blunt brute-force attempts.

**Around 1,000,000 users.** The single primary database can no longer hold all data and write load comfortably, so partition it: shard by tenant/owner so each shard owns a slice of users and their projects and issues, keeping the per-shard working set bounded and queries local to a shard. Put a CDN in front of the static frontend and serve assets from the edge. Move expensive or asynchronous work (notifications, search indexing, analytics) onto a message queue and background workers so request latency stays low. Introduce a dedicated search service (e.g. Elasticsearch/OpenSearch) for issue search across very large datasets, fed asynchronously from the primary store, rather than running `LIKE` queries against the operational database. Token revocation moves to a short-lived-access-token-plus-refresh model backed by a fast store. Observability becomes first-class: distributed tracing, per-shard metrics, and autoscaling driven by load. At this point the parts with the most divergent scaling needs — search, notifications, auth — are the natural candidates to extract into independent services, which the existing layered boundaries make tractable.

The throughline is that the early decisions — statelessness, a relational core with proper indexes, clean layering — are exactly what make each later stage an incremental operational change rather than a rewrite.

## 7. Known limitations and next steps

The current scope omits pagination on issue lists, rate limiting on authentication, server-side token revocation, and real-time updates (issues do not push to other viewers). Each is a deliberate, documented tradeoff for a take-home scope, and each has a clear insertion point in the scaling plan above. The recommended immediate next steps for a production hardening pass would be pagination, refresh tokens with revocation, and auth rate limiting.
