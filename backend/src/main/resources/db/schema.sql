-- Reference schema for the Mini Issue Tracking System (PostgreSQL).
-- Hibernate generates these at runtime (ddl-auto=update); this file documents
-- the canonical schema for reviewers.

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    archived    BOOLEAN NOT NULL DEFAULT FALSE,
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

CREATE TABLE IF NOT EXISTS issues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    priority    VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status      VARCHAR(20) NOT NULL DEFAULT 'TODO'
                CHECK (status IN ('TODO','IN_PROGRESS','DONE')),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_issues_project  ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status   ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON issues(assignee_id);
