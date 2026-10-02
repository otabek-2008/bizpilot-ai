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


-- ================= Abituriyent bo'limi (DTM, Milliy sertifikat, IELTS, CEFR, SAT) =================
-- Savollar bazasi admin panel orqali to'ldiriladi; exam/subject — lib/exams.ts dagi id'lar.
create table if not exists public.exam_questions (
  id bigint generated always as identity primary key,
  exam text not null check (exam in ('dtm', 'milliy', 'ielts', 'cefr', 'sat')),
  subject text not null check (char_length(subject) between 1 and 40),
  topic text check (char_length(topic) <= 120),
  question text not null check (char_length(question) between 1 and 4000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct smallint not null check (correct >= 0 and correct < jsonb_array_length(options)),
  explanation text check (char_length(explanation) <= 3000),
  passage text check (char_length(passage) <= 12000),
  image text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_questions_subject_idx on public.exam_questions (exam, subject);

alter table public.exam_questions enable row level security;

drop policy if exists "Users read active exam questions" on public.exam_questions;
create policy "Users read active exam questions"
  on public.exam_questions for select to authenticated
  using (active);

-- Mashq va mock test natijalari.
create table if not exists public.exam_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam text not null check (char_length(exam) <= 20),
  subject text check (char_length(subject) <= 40),
  mode text not null check (mode in ('practice', 'mock', 'ai', 'writing')),
  total int not null check (total between 0 and 1000),
  correct int not null check (correct between 0 and total),
  points numeric(6, 1),
  max_points numeric(6, 1),
  duration_sec int check (duration_sec >= 0),
  created_at timestamptz not null default now()
);

create index if not exists exam_results_user_idx on public.exam_results (user_id, created_at desc);

alter table public.exam_results enable row level security;

drop policy if exists "Users read own exam results" on public.exam_results;
create policy "Users read own exam results"
  on public.exam_results for select using (auth.uid() = user_id);

drop policy if exists "Users add own exam results" on public.exam_results;
create policy "Users add own exam results"
  on public.exam_results for insert with check (auth.uid() = user_id);

-- O'quv materiallari (PDF, qo'llanma, havola) — admin yuklaydi.
create table if not exists public.exam_materials (
  id bigint generated always as identity primary key,
  exam text not null check (exam in ('dtm', 'milliy', 'ielts', 'cefr', 'sat')),
  subject text check (char_length(subject) <= 40),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  kind text not null check (kind in ('file', 'link')),
  url text not null check (char_length(url) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists exam_materials_exam_idx on public.exam_materials (exam, subject);

alter table public.exam_materials enable row level security;

drop policy if exists "Users read exam materials" on public.exam_materials;
create policy "Users read exam materials"
  on public.exam_materials for select to authenticated
  using (true);

grant select on public.exam_questions to authenticated;
grant select on public.exam_materials to authenticated;
grant select, insert on public.exam_results to authenticated;

-- Savol rasmlari va materiallar uchun ochiq bucket (yuklash faqat admin panel orqali).
insert into storage.buckets (id, name, public, file_size_limit)
values ('exam-files', 'exam-files', true, 52428800)
on conflict (id) do nothing;


-- ================= Profil (o'qish ma'lumotlari) va reyting =================
-- Har bir foydalanuvchi ro'yxatdan o'tgach to'ldiradi: talaba / abituriyent / shaxsiy foydalanish.
-- university_id — lib/universities.ts dagi id; ro'yxatda yo'q bo'lsa null va university_name qo'lda yoziladi.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text check (char_length(avatar_url) <= 1000),
  status text not null check (status in ('talaba', 'abituriyent', 'shaxsiy')),
  university_id text check (char_length(university_id) <= 80),
  university_name text check (char_length(university_name) <= 200),
  faculty text check (char_length(faculty) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_student_fields check (
    status <> 'talaba' or (university_name is not null and faculty is not null)
  )
);

create index if not exists profiles_university_idx on public.profiles (university_id);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users add own profile" on public.profiles;
create policy "Users add own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;

-- Natija turlari o'zgarsa "create or replace" ishlamaydi — avval o'chirib, qayta yaratamiz (ruxsatlar pastda qayta beriladi).
drop function if exists public.rating_users(text, text, text, int);
drop function if exists public.rating_me(text);
drop function if exists public.rating_universities(text);
drop function if exists public.rating_points(text);

-- Reyting ballari: har bir to'g'ri javob = 1 ball (prava va abituriyent testlari).
-- Soxta natijalarga qarshi: bitta testdan ko'pi bilan 100 ball va har to'g'ri javobga kamida 1 soniya sarflangan bo'lishi kerak.
create or replace function public.rating_points(period text)
returns table (user_id uuid, points bigint, tests bigint)
language sql stable security definer set search_path = public
as $$
  with since as (
    select case period
      when 'week' then now() - interval '7 days'
      when 'month' then now() - interval '30 days'
      else '-infinity'::timestamptz
    end as t
  ),
  r as (
    select p.user_id, least(p.correct, 100) as pts
      from prava_results p, since
     where p.created_at >= since.t and coalesce(p.duration_sec, 0) >= p.correct
    union all
    select e.user_id, least(e.correct, 100)
      from exam_results e, since
     where e.created_at >= since.t and e.mode in ('practice', 'mock') and coalesce(e.duration_sec, 0) >= e.correct
  )
  select user_id, sum(pts)::bigint, count(*)::bigint from r group by user_id having sum(pts) > 0
$$;

revoke all on function public.rating_points(text) from public, anon, authenticated;

-- Foydalanuvchilar reytingi.
create or replace function public.rating_users(
  period text default 'week',
  p_status text default null,
  p_university text default null,
  p_limit int default 100
)
returns table (
  rank bigint, user_id uuid, full_name text, avatar_url text, status text,
  university_id text, university_name text, faculty text, points bigint, tests bigint
)
language sql stable security definer set search_path = public
as $$
  select rank() over (order by a.points desc), p.id, p.full_name, p.avatar_url, p.status,
         p.university_id, p.university_name, p.faculty, a.points, a.tests
    from rating_points(period) a
    join profiles p on p.id = a.user_id
   where (p_status is null or p.status = p_status)
     and (p_university is null or p.university_id = p_university or (p.university_id is null and p.university_name = p_university))
   order by a.points desc, a.tests asc
   limit least(greatest(p_limit, 1), 200)
$$;

-- Joriy foydalanuvchining o'rni (umumiy reytingda).
create or replace function public.rating_me(period text default 'week')
returns table (rank bigint, points bigint, tests bigint, participants bigint)
language sql stable security definer set search_path = public
as $$
  with ranked as (
    select a.user_id, a.points, a.tests, rank() over (order by a.points desc) as rank
      from rating_points(period) a
      join profiles p on p.id = a.user_id
  )
  select r.rank, r.points, r.tests, (select count(*) from ranked)
    from ranked r where r.user_id = auth.uid()
$$;

-- Oliygohlar reytingi: talabalar soni, faol talabalar va jami ball.
create or replace function public.rating_universities(period text default 'week')
returns table (university_id text, university_name text, students bigint, active bigint, points bigint)
language sql stable security definer set search_path = public
as $$
  select max(p.university_id), max(p.university_name),
         count(*)::bigint,
         count(a.user_id)::bigint,
         coalesce(sum(a.points), 0)::bigint
    from profiles p
    left join rating_points(period) a on a.user_id = p.id
   where p.status = 'talaba' and p.university_name is not null
   group by coalesce(p.university_id, lower(trim(p.university_name)))
   order by 5 desc, 3 desc
   limit 300
$$;

revoke all on function public.rating_users(text, text, text, int) from public, anon;
revoke all on function public.rating_me(text) from public, anon;
revoke all on function public.rating_universities(text) from public, anon;
grant execute on function public.rating_users(text, text, text, int) to authenticated;
grant execute on function public.rating_me(text) to authenticated;
grant execute on function public.rating_universities(text) to authenticated;

notify pgrst, 'reload schema';


-- ================= Username (takrorlanmas) =================
-- Email orqali ro'yxatdan o'tishda kiritiladi (user_metadata.username). Katta-kichik harf farqlanmaydi: "Ali" va "ali" bir xil.
-- Jadvalga to'g'ridan-to'g'ri ruxsat yo'q — faqat trigger yozadi va username_available() tekshiradi.
create table if not exists public.usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-zA-Z0-9_.]{3,30}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists usernames_lower_idx on public.usernames (lower(username));

alter table public.usernames enable row level security;

create or replace function public.handle_new_user_username()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  u text := nullif(trim(new.raw_user_meta_data->>'username'), '');
begin
  -- Band bo'lsa unique index xato beradi va hisob yaratilmaydi
  if u is not null then
    insert into public.usernames (user_id, username) values (new.id, u);
  end if;
  return new;
end
$$;

drop trigger if exists on_auth_user_username on auth.users;
create trigger on_auth_user_username
  after insert on auth.users
  for each row execute function public.handle_new_user_username();

create or replace function public.username_available(p_username text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from usernames where lower(username) = lower(trim(p_username)))
$$;

revoke all on function public.handle_new_user_username() from public, anon, authenticated;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

notify pgrst, 'reload schema';
