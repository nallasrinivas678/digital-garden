-- =====================================================================
-- AI Assistant add-on — Supabase schema
-- Adds conversations/messages, a profile for the job-application agent,
-- Google OAuth token storage, and an assistant-managed job tracker.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run; it does NOT touch any
-- existing tables. Reuses set_updated_at(), created by schema.sql.
--
-- NOTE: the existing Career feature already owns a table named
-- `job_applications` (see schema_career.sql) with a different shape
-- (company/role_title/status enum/salary/contact fields). The
-- assistant's job-application agent gets its own table,
-- `assistant_job_applications`, so it doesn't collide with or alter
-- the Career tracker.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Conversations & messages
-- ---------------------------------------------------------------------
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'tool')),
  content          text not null,
  tool_call_id     text,   -- set when role = 'tool' (links to the tool call it answers)
  tool_calls       jsonb,  -- set when role = 'assistant' and it requested tool calls
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages (conversation_id);
create index if not exists conversations_user_id_idx on conversations (user_id);

-- ---------------------------------------------------------------------
-- User profile (for the job-application agent)
-- ---------------------------------------------------------------------
create table if not exists user_profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  email          text,
  phone          text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  zip_code       text,
  resume_url     text,  -- Supabase Storage URL to resume PDF/doc
  resume_text    text,  -- extracted plain text for LLM tailoring; resume_url is the source of truth
  linkedin_url   text,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Google OAuth tokens (Gmail / Calendar / Docs / Drive connectors)
-- Encrypt access_token/refresh_token at the application layer before
-- insert, or use Supabase Vault if available on your plan.
-- ---------------------------------------------------------------------
create table if not exists google_tokens (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  access_token   text not null,
  refresh_token  text not null,
  scopes         text not null,  -- space-separated granted scopes
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Assistant-managed job applications (draft-only tracking; separate
-- from the Career feature's own `job_applications` table).
-- ---------------------------------------------------------------------
create table if not exists assistant_job_applications (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  job_url                 text not null,
  company                 text,
  job_title               text,
  status                  text not null default 'draft'
                            check (status in ('draft', 'tailored', 'applied', 'rejected', 'interview')),
  tailored_resume_text    text,
  tailored_cover_letter   text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists assistant_job_applications_user_id_idx
  on assistant_job_applications (user_id);

-- ---------------------------------------------------------------------
-- Auto-update updated_at. Reuses set_updated_at() created by the base
-- schema; redefined here so this file can run standalone.
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at
  before update on conversations
  for each row execute function set_updated_at();

drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

drop trigger if exists google_tokens_updated_at on google_tokens;
create trigger google_tokens_updated_at
  before update on google_tokens
  for each row execute function set_updated_at();

drop trigger if exists assistant_job_applications_updated_at on assistant_job_applications;
create trigger assistant_job_applications_updated_at
  before update on assistant_job_applications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security. llm-gateway connects with the service_role key,
-- which BYPASSES RLS (server is trusted) — this protects direct client
-- (mobile app) access via the Supabase client SDK. Same pattern as the
-- rest of the project: using + with check, both auth.uid() = user_id.
-- ---------------------------------------------------------------------
alter table conversations enable row level security;
alter table messages enable row level security;
alter table user_profiles enable row level security;
alter table google_tokens enable row level security;
alter table assistant_job_applications enable row level security;

drop policy if exists "own conversations" on conversations;
create policy "own conversations" on conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own messages" on messages;
create policy "own messages" on messages
  for all using (
    conversation_id in (select id from conversations where user_id = auth.uid())
  )
  with check (
    conversation_id in (select id from conversations where user_id = auth.uid())
  );

drop policy if exists "own profile" on user_profiles;
create policy "own profile" on user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own google tokens" on google_tokens;
create policy "own google tokens" on google_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own assistant job applications" on assistant_job_applications;
create policy "own assistant job applications" on assistant_job_applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
