-- Rows were seeded with explicit ids, leaving these sequences behind.
SELECT setval(pg_get_serial_sequence('public.positions', 'id'), (SELECT COALESCE(MAX(id), 0) + 1 FROM "public"."positions"), false);
SELECT setval(pg_get_serial_sequence('public.employers', 'id'), (SELECT COALESCE(MAX(id), 0) + 1 FROM "public"."employers"), false);