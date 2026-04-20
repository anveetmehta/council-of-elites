-- Archetype Personas
INSERT INTO personas (id, name, tagline, archetype, color_hex, persona_type) VALUES
  ('strategic-leader',       'The Strategic Leader',       'Practical, execution-focused, systems-thinking',      'leader',      '#2563EB', 'archetype'),
  ('reflective-philosopher', 'The Reflective Philosopher', 'Wisdom, questioning assumptions, depth',              'philosopher', '#7C3AED', 'archetype'),
  ('scientific-analyst',     'The Scientific Analyst',     'Evidence-based, data-driven, skeptical',              'analyst',     '#059669', 'archetype'),
  ('empathetic-coach',       'The Empathetic Coach',       'Emotionally intelligent, supportive, human-centered', 'coach',       '#DC2626', 'archetype'),
  ('sharp-contrarian',       'The Sharp Contrarian',       'Challenges everything, devil''s advocate',             'contrarian',  '#D97706', 'archetype'),
  ('creative-builder',       'The Creative Builder',       'Innovative, unconventional, first principles',         'builder',     '#DB2477', 'archetype');

-- Domain Expert Personas
INSERT INTO personas (id, name, tagline, archetype, color_hex, persona_type, disclaimer_text, source_attribution) VALUES
  ('naval-style',    'The Naval Ravikant Perspective', 'Wealth creation, leverage, long-term thinking',             'philosopher', '#1D4ED8', 'domain_expert',
   'This perspective is inspired by Naval Ravikant''s publicly available podcasts, essays, and tweetstorms. Not affiliated with or endorsed by Naval Ravikant. AI-generated for educational purposes only.',
   'Based on publicly available podcasts, essays, and social media posts'),
  ('pg-style',       'The Paul Graham Perspective',    'Startups, contrarian ideas, clear writing',                 'builder',     '#7C3AED', 'domain_expert',
   'This perspective is inspired by Paul Graham''s publicly available essays at paulgraham.com. Not affiliated with or endorsed by Paul Graham or Y Combinator. AI-generated for educational purposes only.',
   'Based on publicly available essays at paulgraham.com'),
  ('munger-style',   'The Charlie Munger Perspective', 'Mental models, latticework thinking, long-term wisdom',     'analyst',     '#065F46', 'domain_expert',
   'This perspective is inspired by Charlie Munger''s publicly available speeches, interviews, and the book Poor Charlie''s Almanack. Not affiliated with or endorsed by the Munger family or Berkshire Hathaway. AI-generated for educational purposes only.',
   'Based on Poor Charlie''s Almanack and publicly available speeches'),
  ('buffett-style',  'The Warren Buffett Perspective', 'Value investing, patience, business fundamentals',          'analyst',     '#166534', 'domain_expert',
   'This perspective is inspired by Warren Buffett''s publicly available shareholder letters and interviews. Not affiliated with or endorsed by Warren Buffett or Berkshire Hathaway. AI-generated for educational purposes only.',
   'Based on Berkshire Hathaway shareholder letters and public interviews'),
  ('jobs-style',     'The Steve Jobs Perspective',     'Product vision, simplicity, insane standards',              'builder',     '#374151', 'domain_expert',
   'This perspective is inspired by Steve Jobs'' publicly available interviews, the Stanford commencement speech, and authorized biographies. Not affiliated with or endorsed by Apple Inc. or the Jobs estate. AI-generated for educational purposes only.',
   'Based on public interviews, Stanford speech, and Walter Isaacson''s authorized biography'),
  ('aurelius-style', 'The Marcus Aurelius Perspective','Stoic leadership, duty, inner resilience',                  'philosopher', '#78350F', 'domain_expert',
   'Marcus Aurelius'' Meditations is in the public domain. This perspective draws directly from his documented writing.',
   'Based on Meditations (public domain)'),
  ('seneca-style',   'The Seneca Perspective',         'Confronting mortality, time, equanimity',                   'philosopher', '#7C2D12', 'domain_expert',
   'Seneca''s letters and essays are in the public domain. This perspective draws directly from his documented writing.',
   'Based on Letters to Lucilius and Essays (public domain)'),
  ('dalio-style',    'The Ray Dalio Perspective',      'Radical transparency, principles, macro thinking',          'analyst',     '#1E3A5F', 'domain_expert',
   'This perspective is inspired by Ray Dalio''s published book Principles and publicly available writings. Not affiliated with or endorsed by Ray Dalio or Bridgewater Associates. AI-generated for educational purposes only.',
   'Based on Principles (published book) and public writings');
