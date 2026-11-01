-- 0001_init: saved verdicts, share links and the waitlist.
--
-- What:   three tables (ideas, judgments, waitlist), locked so only the server can touch them.
-- Why:    verdicts live in sessionStorage today, so they vanish on reload elsewhere and cannot be shared.
-- Apply:  Supabase dashboard > SQL Editor > paste this file > Run. Safe to run once; it is not idempotent.
-- Verify: Table Editor shows the three tables with the lock icon (RLS on), and the checks at the bottom return as noted.
-- Not here: the corpus (hackathons, projects, vector(768) embeddings) arrives in 0002 when ingestion is built.

create extension if not exists vector with schema extensions; -- already on; kept so a fresh project works too

-- An idea is the thing a person keeps coming back to; each run of the panel on it is a judgment.
create table public.ideas (
  id         uuid primary key default gen_random_uuid(),
  is_public  boolean not null default false, -- set true only when the person clicks Share
  created_at timestamptz not null default now()
);

create table public.judgments (
  id             uuid primary key default gen_random_uuid(),
  idea_id        uuid not null references public.ideas (id) on delete cascade,
  version        int  not null default 1,     -- 1 for the first run, +1 for each revised resubmission
  idea_text      text not null check (char_length(idea_text) between 1 and 8000),
  hackathon_url  text not null check (char_length(hackathon_url) <= 2000),
  rules          text not null check (char_length(rules) <= 20000),
  debate         jsonb,                       -- Debate (lib/types.ts); null until the debate finishes
  review         jsonb,                       -- GemmaReview (server/gemma/prompt.ts); arrives ~minutes later
  model          text,
  prompt_version text,                        -- for the eval loop: which prompt produced this
  rubric_version text,
  tokens_in      int,                         -- cost per verdict, measured from day one
  tokens_out     int,
  tts_chars      int,
  latency_ms     int,
  created_at     timestamptz not null default now(),
  unique (idea_id, version)
);

create index judgments_idea_idx on public.judgments (idea_id, version desc);

-- Organizer / Muse interest. One row per email; consent time kept for GDPR.
create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null check (char_length(email) between 3 and 320 and email like '%@%'),
  source       text not null check (source in ('organizer', 'muse', 'newsletter')),
  consented_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create unique index waitlist_email_source_idx on public.waitlist (lower(email), source);

-- Lock everything. RLS on with no policies means the browser (anon / authenticated keys) can read
-- and write nothing; the server uses the secret key, which bypasses RLS, and decides what is public.
alter table public.ideas     enable row level security;
alter table public.judgments enable row level security;
alter table public.waitlist  enable row level security;

revoke all on public.ideas, public.judgments, public.waitlist from anon, authenticated;

-- Checks after running:
--   select count(*) from public.ideas;                                                 -- 0
--   select relname, relrowsecurity from pg_class
--     where relname in ('ideas', 'judgments', 'waitlist') and relkind = 'r';           -- all true
--   select extname, extversion from pg_extension where extname = 'vector';             -- 0.8.2
