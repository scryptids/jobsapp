SET check_function_bodies = false;
INSERT INTO public.employers (id, name) VALUES (1, 'Evil Corp');
INSERT INTO public.employers (id, name) VALUES (2, 'NEET GmbH');
INSERT INTO public.employers (id, name) VALUES (3, 'Temple of Iron');
SELECT pg_catalog.setval('public.employers_id_seq', 3, true);
