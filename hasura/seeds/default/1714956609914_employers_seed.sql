SET check_function_bodies = false;
INSERT INTO public.employers (id, name, user_id) VALUES (1, 'Evil Corp', 1);
INSERT INTO public.employers (id, name, user_id) VALUES (2, 'NEET GmbH', 1);
INSERT INTO public.employers (id, name, user_id) VALUES (3, 'Temple of Iron', 1);
SELECT pg_catalog.setval('public.employers_id_seq', 3, true);
