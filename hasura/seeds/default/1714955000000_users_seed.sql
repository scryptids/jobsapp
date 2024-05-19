SET check_function_bodies = false;
INSERT INTO public.users (id) VALUES (1);
SELECT pg_catalog.setval('public.users_id_seq', 1, true);
