-- ───────────────────────────────────────────────────────────────────
-- 0004_seed.sql  —  Reference data for the public quote form
-- ───────────────────────────────────────────────────────────────────

insert into public.services (slug, name, description, sort_order) values
  ('renovation',  'Home Renovation',
    'Interior and exterior renovations',                         10),
  ('fencing',     'Fencing',
    'Cedar, vinyl, and chain-link fence installation',           20),
  ('decking',     'Decking',
    'Cedar and composite decks',                                 30),
  ('landscaping', 'Landscaping',
    'Garden design, sod, irrigation, and hardscaping',           40),
  ('roofing',     'Roofing',
    'Repair and replacement',                                    50),
  ('other',       'Other',
    'Something else — tell us in the description',               99);

insert into public.cities (slug, name, sort_order) values
  ('vancouver',       'Vancouver',         10),
  ('burnaby',         'Burnaby',           20),
  ('richmond',        'Richmond',          30),
  ('surrey',          'Surrey',            40),
  ('coquitlam',       'Coquitlam',         50),
  ('north-vancouver', 'North Vancouver',   60),
  ('west-vancouver',  'West Vancouver',    70),
  ('new-westminster', 'New Westminster',   80),
  ('delta',           'Delta',             90),
  ('langley',         'Langley',          100),
  ('port-coquitlam',  'Port Coquitlam',   110),
  ('port-moody',      'Port Moody',       120);
