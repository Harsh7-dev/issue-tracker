# System Design — Mini Issue Tracking System

## 1. Overview

This is a fairly standard three-tier web app: a React single-page frontend, a
stateless Spring Boot REST API, and a PostgreSQL database. You log in, get a JWT,
and use it to manage projects and the issues inside them. I kept the design simple
and the tiers clearly separated, and I made the app layer stateless on purpose so
that the most likely future change — running more than one backend instance —
doesn't need any rework.

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

The **frontend** is built by Vite and served as static files by nginx, which also
proxies `/api` to the backend. It keeps the JWT in local storage, sends it with
every request, does a first pass of validation so the user gets quick feedback,
and renders the dashboard, project, and issue views. It treats the backend as the
source of truth — every check it does on the client is repeated on the server.

The **backend** is split into the usual layers. Controllers deal with HTTP and the
shape of requests and responses. Services hold the business logic and the
authorization checks. Repositories (Spring Data JPA) handle persistence. A JWT
filter authenticates each request by checking the token signature and loading the
user. A global exception handler turns errors into one consistent
`{ "error": ... }` JSON shape. There's no session state anywhere — identity rides
in the token — which is what makes scaling out simple.

The **database** has three tables: users, projects, and issues. Projects point at
their owner, and issues point at their project and an optional assignee. There are
indexes on the foreign keys and on the issue columns used for filtering (status,
priority). Primary keys are UUIDs.

## 3. Data model

A user owns many projects, a project has many issues, and an issue can optionally
point at an assignee. Issues have a status (TODO/IN_PROGRESS/DONE) and a priority
(LOW/MEDIUM/HIGH/CRITICAL) from a fixed set, plus created and updated timestamps.
Deleting a project removes its issues, and deleting a user removes their projects.
The actual DDL is in `backend/src/main/resources/db/schema.sql`.

## 4. Design decisions and tradeoffs

**REST, not GraphQL.** The access patterns here are small and predictable: list
projects, list a project's issues with a couple of filters, and plain CRUD. REST
covers that directly with endpoints that are easy to cache and debug, and it
doesn't need a query layer on top. GraphQL earns its keep when lots of different
clients each want different slices of a deep graph; that's not the case here, so
it would mostly add schema and resolver work plus N+1 and query-cost headaches for
no real payoff. If a richer client ever needs it, GraphQL can go in later.

**PostgreSQL, not a document store.** The data is relational by nature — users own
projects own issues, and the dashboard filters and counts across those relations.
A relational database gives me foreign-key integrity, transactions for multi-row
changes, and fast indexed filtering and counting, which is exactly what the
dashboard and issue views need. A document store would push all of that into
application code and make inconsistency more likely. Postgres also has room to grow
(JSONB, full-text search) without switching engines.

**Stateless JWT, not server sessions.** With a signed token, any backend instance
can authenticate a request without a shared session store, so scaling out is just
adding instances behind a load balancer. The catch is that you can't revoke a token
before it expires. For this scope I accept that and keep token lifetimes short; the
next step for stricter security would be short-lived access tokens with refresh
tokens and a revocation list.

**A layered monolith, not microservices.** At this size, one deployable with clean
internal layers is faster to build, test, and run, and it skips the networking and
data-consistency cost of distributed services. The layering still leaves room to
pull a piece out into its own service later if it ends up needing to scale on its
own.

## 5. Security

Passwords are hashed with BCrypt and never sent back in a response. All input is
validated on the server with Bean Validation, so a client that skips the UI still
can't submit junk. Authorization happens in the service layer: every project and
issue access checks that the caller actually owns the resource, and returns 404/403
otherwise, which stops one user from reaching another's data. Queries go through
parameterised JPA, so there's no SQL injection surface. The JWT secret comes from
an environment variable and needs to be a long random value in production. CORS is
locked to the known frontend origins.

## 6. Scaling

The idea is that each stage of growth changes how you run the thing more than it
changes the code.

**Around 100 users.** One backend instance, one Postgres, and the static frontend
behind nginx handle this fine — basically the `docker compose up` setup. The focus
is correctness, decent indexes (already there), and basic observability like health
checks and structured logs. No caching or replication needed; the working set fits
in memory and the queries are simple indexed lookups.

**Around 10,000 users.** More concurrency and read traffic, so the app tier scales
horizontally: several stateless backend instances behind a load balancer. That
works precisely because the backend keeps no session state. The database becomes
the bottleneck before the app does, so add read replicas and send read-heavy
traffic (dashboards, issue lists) to them while writes go to the primary, with a
connection pool sized to the database. This is also where pagination on issue lists
needs to land so big projects don't return everything at once, plus a cache (Redis,
say) for hot read-mostly data like dashboard counts, invalidated on write. Add rate
limiting on the auth endpoints to slow down brute-force attempts.

**Around 1,000,000 users.** A single primary can't hold all the data and write load
comfortably anymore, so shard it — by tenant/owner, so each shard owns a slice of
users and their projects and issues, which keeps each shard's working set bounded
and most queries local. Put a CDN in front of the static frontend. Move slow or
async work (notifications, search indexing, analytics) onto a message queue and
background workers so request latency stays low. Stand up a real search service
(Elasticsearch/OpenSearch) for issue search at that scale instead of running `LIKE`
against the operational database, fed asynchronously from the primary store. Token
revocation moves to the short-lived-access-token-plus-refresh model backed by a fast
store. Observability gets serious: distributed tracing, per-shard metrics,
autoscaling on load. By this point the pieces with the most different scaling needs
— search, notifications, auth — are the obvious candidates to split into their own
services, and the existing layer boundaries make that doable.

The common thread is that the early choices — statelessness, a relational core with
real indexes, clean layering — are what turn each later stage into an incremental
ops change instead of a rewrite.

## 7. Known limitations and next steps

For this scope I left out pagination on issue lists, rate limiting on auth,
server-side token revocation, and real-time updates (an issue change doesn't push to
other people looking at it). Each one is a deliberate tradeoff and has an obvious
place to slot into the scaling plan above. If I were doing a production hardening
pass next, I'd start with pagination, then refresh tokens with revocation, then auth
rate limiting.