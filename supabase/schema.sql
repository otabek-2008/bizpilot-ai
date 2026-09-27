-- CampusAI Supabase schema (BizPilot biznes reja jadvallari + CampusAI)
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

-- =====================================================================
-- CampusAI qo'shimchalari
-- =====================================================================

-- Chat va aloqa formasi xabarlari. Admin javobini Supabase dashboard'da
-- `reply` va `replied_at` ustunlariga yozadi — foydalanuvchi uni chatda ko'radi.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('chat', 'contact')),
  name text,
  contact text,
  subject text,
  message text not null check (char_length(message) between 1 and 5000),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_user_idx
  on public.support_messages (user_id, created_at);

alter table public.support_messages enable row level security;

drop policy if exists "Users read own support messages" on public.support_messages;
create policy "Users read own support messages"
  on public.support_messages for select
  using (auth.uid() = user_id);

-- Foydalanuvchi faqat o'z nomidan va javobsiz xabar yoza oladi.
drop policy if exists "Users send support messages" on public.support_messages;
create policy "Users send support messages"
  on public.support_messages for insert
  with check (auth.uid() = user_id and reply is null and replied_at is null);

-- Avatarlar uchun ochiq storage bucket (fayl yo'li: <user_id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
