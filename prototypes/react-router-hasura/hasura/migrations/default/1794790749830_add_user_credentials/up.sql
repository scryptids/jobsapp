ALTER TABLE "public"."users"
  ADD COLUMN "email" TEXT UNIQUE,
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now();

-- Store emails lowercased so uniqueness is case-insensitive.
ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));

-- Existing rows were inserted with explicit ids, leaving the id sequence
-- behind; resync it so new sign-ups don't collide on the primary key.
SELECT setval(
  pg_get_serial_sequence('public.users', 'id'),
  (SELECT COALESCE(MAX(id), 0) + 1 FROM "public"."users"),
  false
);
