CREATE TABLE "public"."positions" (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    posting_url VARCHAR(255),
    pay_range_upper NUMERIC(10, 2),
    pay_range_lower NUMERIC(10, 2),
    employer_id INTEGER REFERENCES "public"."employers" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT
);