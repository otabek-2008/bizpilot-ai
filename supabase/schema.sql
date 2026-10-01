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

-- Bu loyihada SQL orqali yaratilgan jadvallar Data API'ga avtomatik ochilmaydi (aks holda PGRST205).
grant select, insert on public.projects to authenticated;
grant select, insert, update on public.project_documents to authenticated;
grant select, insert on public.support_messages to authenticated;
notify pgrst, 'reload schema';

-- =====================================================================
-- Admin panel
-- =====================================================================

-- Foydalanuvchilar faoliyati (qaysi vositadan qachon foydalangan).
-- Foydalanuvchi faqat o'z nomidan yoza oladi; o'qish faqat admin panel (service role) orqali.
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  title text not null check (char_length(title) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_idx
  on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_created_idx
  on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "Users log own activity" on public.activity_log;
create policy "Users log own activity"
  on public.activity_log for insert
  with check (auth.uid() = user_id);

grant insert on public.activity_log to authenticated;

-- Admin hujjatlari uchun yopiq bucket (faqat service role kira oladi).
insert into storage.buckets (id, name, public, file_size_limit)
values ('admin-files', 'admin-files', false, 52428800)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- =====================================================================
-- Prava (haydovchilik guvohnomasi) testlari
-- =====================================================================

-- Savollar bazasi admin panel orqali to'ldiriladi. correct — to'g'ri javob indeksi (0 dan).
create table if not exists public.prava_questions (
  id bigint generated always as identity primary key,
  ticket int check (ticket between 1 and 9999),
  position int check (position between 1 and 9999),
  topic text check (char_length(topic) <= 120),
  question text not null check (char_length(question) between 1 and 2000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct smallint not null check (correct >= 0 and correct < jsonb_array_length(options)),
  explanation text check (char_length(explanation) <= 3000),
  image text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prava_questions_ticket_idx on public.prava_questions (ticket, position);

alter table public.prava_questions enable row level security;

drop policy if exists "Users read active prava questions" on public.prava_questions;
create policy "Users read active prava questions"
  on public.prava_questions for select to authenticated
  using (active);

-- Foydalanuvchining xato javoblari ("Xatolarim" bo'limi): xato → qo'shiladi, keyin to'g'ri javob → o'chiriladi.
create table if not exists public.prava_mistakes (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references public.prava_questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.prava_mistakes enable row level security;

drop policy if exists "Users read own prava mistakes" on public.prava_mistakes;
create policy "Users read own prava mistakes"
  on public.prava_mistakes for select using (auth.uid() = user_id);

drop policy if exists "Users add own prava mistakes" on public.prava_mistakes;
create policy "Users add own prava mistakes"
  on public.prava_mistakes for insert with check (auth.uid() = user_id);

drop policy if exists "Users remove own prava mistakes" on public.prava_mistakes;
create policy "Users remove own prava mistakes"
  on public.prava_mistakes for delete using (auth.uid() = user_id);

-- Test natijalari (bilet bo'yicha eng so'nggi natija va admin statistikasi uchun).
create table if not exists public.prava_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('exam', 'ticket', 'topic', 'mistakes')),
  ticket int,
  topic text,
  total int not null check (total between 1 and 1000),
  correct int not null check (correct between 0 and total),
  passed boolean,
  duration_sec int check (duration_sec >= 0),
  created_at timestamptz not null default now()
);

create index if not exists prava_results_user_idx on public.prava_results (user_id, created_at desc);

alter table public.prava_results enable row level security;

drop policy if exists "Users read own prava results" on public.prava_results;
create policy "Users read own prava results"
  on public.prava_results for select using (auth.uid() = user_id);

drop policy if exists "Users add own prava results" on public.prava_results;
create policy "Users add own prava results"
  on public.prava_results for insert with check (auth.uid() = user_id);

grant select on public.prava_questions to authenticated;
grant select, insert, delete on public.prava_mistakes to authenticated;
grant select, insert on public.prava_results to authenticated;

-- Savol rasmlari uchun ochiq bucket (yuklash faqat admin panel orqali).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prava-images', 'prava-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';
