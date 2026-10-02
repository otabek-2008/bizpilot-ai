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
-- Soxta natijalarga qarshi: bitta testdan ko'pi bilan 100 ball, har to'g'ri javobga kamida 1 soniya va kuniga ko'pi bilan 300 ball.
-- Testlar vaqt bo'yicha ustma-ust tushmaydi (pastdagi check_test_result triggeri).
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
    select p.user_id, p.created_at, least(p.correct, 100) as pts
      from prava_results p, since
     where p.created_at >= since.t and coalesce(p.duration_sec, 0) >= p.correct
    union all
    select e.user_id, e.created_at, least(e.correct, 100)
      from exam_results e, since
     where e.created_at >= since.t and e.mode in ('practice', 'mock') and coalesce(e.duration_sec, 0) >= e.correct
  ),
  -- Bir kunda (Toshkent vaqti) ko'pi bilan 300 ball
  daily as (
    select user_id, least(sum(pts), 300) as pts, count(*) as n
      from r group by user_id, (created_at at time zone 'Asia/Tashkent')::date
  )
  select user_id, sum(pts)::bigint, sum(n)::bigint from daily group by user_id having sum(pts) > 0
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


-- ================= Himoya: test natijalari, profil, xabarlar =================

-- Testlar vaqt bo'yicha ustma-ust tushmaydi: natijadagi davomiylik oldingi natijadan beri o'tgan vaqtdan oshmaydi.
-- Shunda soxta natija yozish uchun ham haqiqiy vaqt sarflash kerak; kuniga ko'pi bilan 100 ta natija.
create or replace function public.check_test_result()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  last_at timestamptz;
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('test_result:' || new.user_id::text));
  select max(t), count(*) filter (where t > now() - interval '1 day') into last_at, n from (
    select created_at as t from prava_results where user_id = new.user_id
    union all
    select created_at from exam_results where user_id = new.user_id
  ) x;
  if n >= 100 then
    raise exception 'Bir kunda juda ko''p test natijasi.';
  end if;
  last_at := coalesce(last_at, (select created_at from auth.users where id = new.user_id), now());
  new.duration_sec := greatest(0, least(coalesce(new.duration_sec, 0), floor(extract(epoch from now() - last_at))::int));
  new.created_at := now();
  return new;
end
$$;

drop trigger if exists check_prava_result on public.prava_results;
create trigger check_prava_result before insert on public.prava_results
  for each row execute function public.check_test_result();
drop trigger if exists check_exam_result on public.exam_results;
create trigger check_exam_result before insert on public.exam_results
  for each row execute function public.check_test_result();

-- Reytingda boshqalarga ko'rinadigan avatar faqat ishonchli manzillardan bo'ladi (aks holda ko'ruvchilarning IP'si begona saytga ketadi).
create or replace function public.clean_profile()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.avatar_url is not null and new.avatar_url !~ '^https://([a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/|lh[0-9]\.googleusercontent\.com/|t\.me/i/userpic/)' then
    new.avatar_url := null;
  end if;
  return new;
end
$$;

drop trigger if exists clean_profile on public.profiles;
create trigger clean_profile before insert or update on public.profiles
  for each row execute function public.clean_profile();

update public.profiles
   set avatar_url = null
 where avatar_url !~ '^https://([a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/|lh[0-9]\.googleusercontent\.com/|t\.me/i/userpic/)';

-- Ilgari ismsiz hisoblar reytingda email boshi bilan chiqardi — olib tashlaymiz.
update public.profiles p
   set full_name = null
  from auth.users u
 where p.id = u.id and p.full_name = split_part(u.email, '@', 1);

-- Uzunlik cheklovlari (eski yozuvlar tekshirilmaydi — NOT VALID).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_messages_lengths') then
    alter table public.support_messages add constraint support_messages_lengths check (
      char_length(name) <= 200 and char_length(contact) <= 200 and char_length(subject) <= 300
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'activity_log_module_length') then
    alter table public.activity_log add constraint activity_log_module_length check (char_length(module) <= 40) not valid;
  end if;
end
$$;

-- Bazani axlat bilan to'ldirishga qarshi: kuniga ko'pi bilan 50 ta murojaat va 500 ta faoliyat yozuvi.
create or replace function public.limit_daily_rows()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  n int;
  max_rows int := tg_argv[0]::int;
begin
  execute format('select count(*) from %I.%I where user_id = $1 and created_at > now() - interval ''1 day''', tg_table_schema, tg_table_name)
    into n using new.user_id;
  if n >= max_rows then
    raise exception 'Kunlik chegara tugadi.';
  end if;
  return new;
end
$$;

drop trigger if exists limit_support_messages on public.support_messages;
create trigger limit_support_messages before insert on public.support_messages
  for each row execute function public.limit_daily_rows(50);
drop trigger if exists limit_activity_log on public.activity_log;
create trigger limit_activity_log before insert on public.activity_log
  for each row execute function public.limit_daily_rows(500);

revoke all on function public.check_test_result() from public, anon, authenticated;
revoke all on function public.limit_daily_rows() from public, anon, authenticated;


-- ================= Obuna: 30 kunlik bepul sinov + Payme =================
-- Pullik bo'limlarga kirish: ro'yxatdan o'tgandan keyin 30 kun bepul, keyin paid_until gacha.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text check (plan in ('month', 'year')),
  paid_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

grant select on public.subscriptions to authenticated;

create or replace function public.trial_end(p_user uuid)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select created_at + interval '30 days' from auth.users where id = p_user
$$;

create or replace function public.user_has_access(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(trial_end(p_user) > now(), false)
      or exists (select 1 from subscriptions where user_id = p_user and paid_until > now())
$$;

/** Joriy foydalanuvchi uchun (RLS va brauzer). */
create or replace function public.has_access()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and user_has_access(auth.uid())
$$;

create or replace function public.my_access()
returns table (trial_ends_at timestamptz, paid_until timestamptz, plan text, active boolean)
language sql stable security definer set search_path = public
as $$
  select trial_end(auth.uid()), s.paid_until, s.plan, user_has_access(auth.uid())
    from (select auth.uid() as id) me
    left join subscriptions s on s.user_id = me.id
   where me.id is not null
$$;

-- Prava savollari — faqat sinov yoki obuna davrida.
drop policy if exists "Users read active prava questions" on public.prava_questions;
create policy "Users read active prava questions"
  on public.prava_questions for select to authenticated
  using (active and public.has_access());

-- AI so'rovlari: kunlik limit (Toshkent vaqti bo'yicha). Faqat server (service role) chaqiradi.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

/** 'ok' | 'no_access' | 'limit' */
create or replace function public.ai_take(p_user uuid, p_limit int)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Tashkent')::date;
  used int;
begin
  if not user_has_access(p_user) then
    return 'no_access';
  end if;
  insert into ai_usage (user_id, day, count) values (p_user, today, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
  returning count into used;
  if used > p_limit then
    update ai_usage set count = count - 1 where user_id = p_user and day = today;
    return 'limit';
  end if;
  return 'ok';
end
$$;

-- To'lovlar: har bir buyurtma (id = Payme'dagi order_id) ko'pi bilan bitta Payme tranzaksiyasiga ega.
-- state: 0 — buyurtma yaratildi, 1 — Payme tranzaksiyasi ochildi, 2 — to'landi, -1 — bekor (to'lovsiz), -2 — to'lovdan keyin bekor.
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('month', 'year')),
  amount bigint not null check (amount > 0),
  usd numeric(8, 2) not null,
  rate numeric(12, 2) not null,
  state smallint not null default 0,
  payme_id text unique,
  payme_time bigint,
  create_time bigint,
  perform_time bigint,
  cancel_time bigint,
  reason int,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_create_time_idx on public.payments (create_time);

alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments"
  on public.payments for select using (auth.uid() = user_id);

grant select on public.payments to authenticated;

/** To'lov tasdiqlanadi va obuna uzaytiriladi — bitta tranzaksiyada. Sinov kunlari kuyib ketmaydi. */
create or replace function public.payme_perform(p_payme_id text, p_time bigint)
returns setof public.payments
language plpgsql security definer set search_path = public
as $$
declare
  p payments;
begin
  update payments set state = 2, perform_time = p_time
   where payme_id = p_payme_id and state = 1
  returning * into p;
  if p.id is null then
    return query select * from payments where payme_id = p_payme_id;
    return;
  end if;
  insert into subscriptions (user_id, plan, paid_until, updated_at)
  values (
    p.user_id, p.plan,
    greatest(now(), coalesce(trial_end(p.user_id), now())) + case p.plan when 'year' then interval '365 days' else interval '30 days' end,
    now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    paid_until = greatest(now(), coalesce(subscriptions.paid_until, now()), coalesce(trial_end(p.user_id), now()))
                 + case p.plan when 'year' then interval '365 days' else interval '30 days' end,
    updated_at = now();
  return next p;
end
$$;

/** Bekor qilish; to'langan bo'lsa obuna muddati qaytarib olinadi. */
create or replace function public.payme_cancel(p_payme_id text, p_time bigint, p_reason int)
returns setof public.payments
language plpgsql security definer set search_path = public
as $$
declare
  p payments;
begin
  update payments
     set state = case state when 2 then -2 else -1 end, cancel_time = p_time, reason = p_reason
   where payme_id = p_payme_id and state in (1, 2)
  returning * into p;
  if p.id is not null and p.state = -2 then
    update subscriptions
       set paid_until = paid_until - case p.plan when 'year' then interval '365 days' else interval '30 days' end,
           updated_at = now()
     where user_id = p.user_id;
  end if;
  return query select * from payments where payme_id = p_payme_id;
end
$$;

revoke all on function public.trial_end(uuid) from public, anon, authenticated;
revoke all on function public.user_has_access(uuid) from public, anon, authenticated;
revoke all on function public.ai_take(uuid, int) from public, anon, authenticated;
revoke all on function public.payme_perform(text, bigint) from public, anon, authenticated;
revoke all on function public.payme_cancel(text, bigint, int) from public, anon, authenticated;
revoke all on function public.has_access() from public, anon;
revoke all on function public.my_access() from public, anon;
grant execute on function public.has_access() to authenticated;
grant execute on function public.my_access() to authenticated;
grant execute on function public.ai_take(uuid, int) to service_role;
grant execute on function public.payme_perform(text, bigint) to service_role;
grant execute on function public.payme_cancel(text, bigint, int) to service_role;
grant all on public.payments, public.subscriptions, public.ai_usage to service_role;

notify pgrst, 'reload schema';
