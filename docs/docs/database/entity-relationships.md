---
sidebar_position: 1
---

# Entity Relationships

The app stores its data in SQLite (`app/src/db/schema.ts`, migrations in
`app/drizzle/`). The Hasura/Postgres schema in `prototypes/` is kept for
reference only.

```mermaid
erDiagram
    users {
        integer id PK
        text email UK "lowercase"
        text password_hash
        integer created_at "unix seconds"
    }
    employers {
        integer id PK
        text name "≤100"
        text notes
        integer user_id FK
    }
    positions {
        integer id PK
        text title "≤100"
        text posting_url "≤255"
        integer pay_range_lower_cents
        integer pay_range_upper_cents
        text notes
        integer employer_id FK
        integer user_id FK
    }

    employers                  || -- o{ positions     : opens
    users                      || -- o{ employers     : enters
    users                      || -- o{ positions     : tracks
```

- Every query for employers and positions is scoped to the signed-in user's
  id in `app/src/db/repository.server.ts`. This replaces Hasura's row
  permissions. A position can only point at an employer owned by the same
  user.
- An employer can only be deleted once it has no positions. The foreign key
  is `ON DELETE RESTRICT`, and the app checks first.
- Pay is stored as whole cents. The repository converts it to and from
  currency units.
- Migrations must be **expand/contract**. During a blue/green deploy or a
  rollback, the previous app version runs against the new schema. See
  [Deployment](../operations/deployment.md#migrations).
