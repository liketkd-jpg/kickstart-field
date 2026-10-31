-- =====================================================================
-- KICKSTART UP 대회 접수 홈페이지 · 데이터베이스
-- Supabase → 왼쪽 메뉴 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만)
-- 지도자는 자기 선수·자기 접수만 보고, 대회 본부(관리자)만 전체를 봅니다.
-- =====================================================================

-- 1) 회원 (지도자 · 관리자)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'coach' check (role in ('coach','admin')),
  name       text not null default '',
  org        text not null default '',
  phone      text not null default '',
  email      text not null default '',
  license    text not null default '',
  agreed_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2) 대회
create table if not exists public.comps (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  date       date not null,
  place      text not null default '',
  deadline   date not null,
  sports     text[] not null default '{}',
  fee        jsonb not null default '{}'::jsonb,
  account    text not null default '',
  host       text not null default 'KICKSTART UP',
  note       text not null default '',
  created_at timestamptz not null default now(),
  constraint comps_sports_ok check (sports <@ array['poomsae','kyorugi','gyeokpa']::text[])
);

-- 3) 선수 (지도자가 등록)
create table if not exists public.athletes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null,
  gender     text not null check (gender in ('남','여')),
  birth      date,
  org        text not null default '',
  weight     numeric,
  height     numeric,
  guardian   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists athletes_coach on public.athletes(coach_id);

-- 4) 접수
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  comp_id     uuid not null references public.comps(id) on delete cascade,
  coach_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  sport       text not null check (sport in ('poomsae','kyorugi','gyeokpa')),
  athlete_ids uuid[] not null,
  f           jsonb not null default '{}'::jsonb,
  fee         integer not null default 0,
  status      text not null default 'wait' check (status in ('wait','paid','cancel')),
  created_at  timestamptz not null default now()
);
create index if not exists entries_comp on public.entries(comp_id);
create index if not exists entries_coach on public.entries(coach_id);

-- 관리자인지 (보안 규칙 안에서 씀)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 가입하면 회원 정보를 자동으로 만듦 (가입 화면에서 적은 이름·소속·휴대폰)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, org, phone, email, license)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name',''),
          coalesce(new.raw_user_meta_data->>'org',''),
          coalesce(new.raw_user_meta_data->>'phone',''),
          coalesce(new.email,''),
          coalesce(new.raw_user_meta_data->>'license',''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 지도자가 스스로 관리자가 되지 못하게
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- 홈페이지에서 로그인한 지도자만 막음 (Supabase SQL Editor에서 관리자 지정은 허용)
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception '권한을 바꿀 수 없습니다';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- 접수: 마감이 지났거나 남의 선수를 넣으면 막음, 상태는 지도자가 「취소」로만 바꿈
create or replace function public.check_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare dl date; n int;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    select deadline into dl from public.comps where id = new.comp_id;
    if dl is null or dl < (now() at time zone 'Asia/Seoul')::date then
      raise exception '접수가 마감된 대회입니다';
    end if;
    select count(*) into n from public.athletes where id = any(new.athlete_ids) and coach_id = new.coach_id;
    if n <> coalesce(array_length(new.athlete_ids,1),0) then
      raise exception '내 선수만 접수할 수 있습니다';
    end if;
    new.status := 'wait';
    select coalesce((fee->>new.sport)::int,0) into new.fee from public.comps where id = new.comp_id;
  else
    if new.status <> 'cancel' or old.status <> 'wait'
       or new.f is distinct from old.f or new.athlete_ids is distinct from old.athlete_ids
       or new.fee <> old.fee or new.comp_id <> old.comp_id or new.coach_id <> old.coach_id then
      raise exception '입금 확인 전 접수만 취소할 수 있습니다';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists entries_check on public.entries;
create trigger entries_check before insert or update on public.entries
  for each row execute function public.check_entry();

-- ---------------- 보안 규칙 (RLS) ----------------
alter table public.profiles enable row level security;
alter table public.comps    enable row level security;
alter table public.athletes enable row level security;
alter table public.entries  enable row level security;

drop policy if exists p_profiles_sel on public.profiles;
create policy p_profiles_sel on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists p_comps_sel on public.comps;
create policy p_comps_sel on public.comps for select to anon, authenticated using (true);
drop policy if exists p_comps_admin on public.comps;
create policy p_comps_admin on public.comps for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_ath_own on public.athletes;
create policy p_ath_own on public.athletes for all to authenticated using (coach_id = auth.uid() or public.is_admin()) with check (coach_id = auth.uid() or public.is_admin());

drop policy if exists p_ent_sel on public.entries;
create policy p_ent_sel on public.entries for select to authenticated using (coach_id = auth.uid() or public.is_admin());
drop policy if exists p_ent_ins on public.entries;
create policy p_ent_ins on public.entries for insert to authenticated with check (coach_id = auth.uid() or public.is_admin());
drop policy if exists p_ent_upd on public.entries;
create policy p_ent_upd on public.entries for update to authenticated using (coach_id = auth.uid() or public.is_admin()) with check (coach_id = auth.uid() or public.is_admin());
drop policy if exists p_ent_del on public.entries;
create policy p_ent_del on public.entries for delete to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.comps to anon;
grant select, insert, update, delete on public.profiles, public.comps, public.athletes, public.entries to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- 첫 대회 하나 (화면 확인용 · 관리자 화면에서 고치거나 지울 수 있음)
insert into public.comps (name, date, place, deadline, sports, fee, account, note)
select '제1회 KICKSTART UP 오픈 태권도대회', date '2026-12-05', '경민대학교 체육관 (의정부)', date '2026-11-25',
       array['poomsae','kyorugi','gyeokpa'], '{"poomsae":30000,"kyorugi":40000,"gyeokpa":30000}'::jsonb,
       '계좌는 관리자 화면에서 고쳐 주세요', '품새는 공인·자유, 격파는 2026 격파 경기규칙을 따릅니다.'
where not exists (select 1 from public.comps);
