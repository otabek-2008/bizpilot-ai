-- BizPilot AI Supabase schema
-- Run this in the Supabase SQL editor once.

-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Generated documents (business plan / marketing / finance)
create table if not exists public.project_documents (
  project_id uuid primary key references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_plan jsonb not null default '{}'::jsonb,
  marketing jsonb not null default '{}'::jsonb,
  finance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.projects enable row level security;
alter table public.project_documents enable row level security;

-- Projects policies
drop policy if exists "Users read own projects" on public.projects;
create policy "Users read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own projects" on public.projects;
create policy "Users insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

-- Project documents policies
drop policy if exists "Users read own documents" on public.project_documents;
create policy "Users read own documents"
  on public.project_documents for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own documents" on public.project_documents;
create policy "Users upsert own documents"
  on public.project_documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own documents" on public.project_documents;
create policy "Users update own documents"
  on public.project_documents for update
  using (auth.uid() = user_id);
