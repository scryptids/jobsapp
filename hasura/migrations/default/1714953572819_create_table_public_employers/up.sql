CREATE TABLE "public"."employers" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES "public"."users" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);
