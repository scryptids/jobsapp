ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_email_lowercase",
  DROP COLUMN "created_at",
  DROP COLUMN "password_hash",
  DROP COLUMN "email";