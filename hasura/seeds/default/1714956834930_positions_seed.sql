SET check_function_bodies = false;
INSERT INTO public.positions (id, title, posting_url, pay_range_upper, pay_range_lower, employer_id, user_id) VALUES (1, 'Worshipper', 'https://example.com', 0.00, 0.00, 3, 1);
INSERT INTO public.positions (id, title, posting_url, pay_range_upper, pay_range_lower, employer_id, user_id) VALUES (2, 'Principal Solutions Architect', NULL, 0.00, 0.00, 2, 1);
INSERT INTO public.positions (id, title, posting_url, pay_range_upper, pay_range_lower, employer_id, user_id) VALUES (3, 'Code Monkey', NULL, 30000.00, 40000.00, 1, 1);
INSERT INTO public.positions (id, title, posting_url, pay_range_upper, pay_range_lower, employer_id, user_id) VALUES (4, 'Code Monkey', NULL, 30000.00, 40000.00, 1, 1);
INSERT INTO public.positions (id, title, posting_url, pay_range_upper, pay_range_lower, employer_id, user_id) VALUES (5, 'Vice President of Global Manipulation', NULL, 400000.00, 500000.00, 1, 1);
INSERT INTO public.positions (id, title, posting_url, pay_range_upper, pay_range_lower, employer_id, user_id) VALUES (6, 'Director of Corporate Espionage', NULL, NULL, NULL, 1, 1);
SELECT pg_catalog.setval('public.positions_id_seq', 6, true);
