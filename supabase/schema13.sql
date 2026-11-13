-- KICKSTART UP 13단계: 태권 히어로 공식 코스 · 세계 랭킹 (히어로 아이디 · 공인 도장 승인 · 부모 동의)
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 12단계까지 먼저 실행해 두어야 합니다.
--
-- 개인정보 원칙
--   · 아이의 실명·연락처는 서버에 올리지 않습니다. 실명은 도장 노트북(앱) 안에만 있고, 서버에는 별명·출생 연도·성별만 올라갑니다.
--   · 공개 랭킹표에는 별명 · 히어로 아이디 · 나라 · 도장 이름 · 나이 · 기록만 보입니다.
--   · 부모가 휴대폰 링크로 직접 동의해야 기록이 랭킹에 올라갑니다. 동의 날짜·시간과 보호자 이름은 동의 증빙으로 본사만 봅니다.
--   · 부모가 같은 링크에서 동의를 철회하면 그 아이의 기록은 바로 지워지고 랭킹에서 빠집니다.
--
-- 흐름
--   1) 도장: 히어로 앱의 허가 코드로 「공인 도장」을 신청 → 본사(대표·관리자)가 승인
--   2) 본사: 「공식 코스」(장애물 종류·순서·감점·설치 기준)를 만들어 둠 → 도장이 앱에서 불러옴
--   3) 도장: 선수마다 히어로 아이디를 만들고 부모에게 동의 링크를 보냄 → 부모가 휴대폰으로 동의
--   4) 앱: 공식 코스로 뛴 동의 받은 선수의 기록을 자동으로 보냄 → 세계 랭킹(선수마다 가장 좋은 기록)

-- 1) 공인 도장 (허가 코드 하나 = 도장 하나)
create table if not exists public.hero_dojangs (
  id           uuid primary key default gen_random_uuid(),
  license_code text not null unique,
  name         text not null check (length(btrim(name)) between 2 and 60),
  country      text not null default 'KR' check (country ~ '^[A-Z]{2}$'),
  city         text not null default '' check (length(city) <= 60),
  coach        text not null default '' check (length(coach) <= 40),
  status       text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  decided_at   timestamptz
);

-- 2) 공식 코스 (본사가 정함). stations 는 앱 설정과 같은 모양: [{id,ko,en,pen,ic}, ...]
create table if not exists public.hero_courses (
  code       text primary key check (code ~ '^[A-Z0-9-]{3,20}$'),
  name       text not null,
  name_en    text not null default '',
  stations   jsonb not null check (jsonb_typeof(stations) = 'array' and jsonb_array_length(stations) between 1 and 12),
  setup      text not null default '',   -- 설치 기준 (거리·높이 등) — 도장 지도자에게 보여 줌
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) 히어로 아이디 (아이 한 명). 실명·연락처 칸은 일부러 없습니다.
create table if not exists public.hero_kids (
  hero_id           text primary key,
  dojang_id         uuid not null references public.hero_dojangs(id) on delete cascade,
  nickname          text not null check (length(btrim(nickname)) between 2 and 20),
  birth_year        int  not null check (birth_year between 2005 and 2030),
  gender            text not null check (gender in ('M','F')),
  consent_token     uuid not null unique default gen_random_uuid(),
  consent_status    text not null default 'pending' check (consent_status in ('pending','given','withdrawn')),
  consent_version   text not null default '',
  guardian_name     text not null default '',
  guardian_relation text not null default '',
  consent_at        timestamptz,
  withdrawn_at      timestamptz,
  hidden            boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists hero_kids_dojang on public.hero_kids(dojang_id);

-- 4) 공식 기록 (id 는 앱이 만든 번호 — 같은 기록을 두 번 보내도 한 번만 저장)
create table if not exists public.hero_records (
  id          uuid primary key,
  hero_id     text not null references public.hero_kids(hero_id) on delete cascade,
  dojang_id   uuid not null references public.hero_dojangs(id) on delete cascade,
  course_code text not null references public.hero_courses(code) on update cascade,
  time_ms     int  not null check (time_ms between 1000 and 600000),
  pen_ms      int  not null default 0 check (pen_ms between 0 and 600000),
  total_ms    int  not null check (total_ms between 1000 and 1200000),
  event_name  text not null default '' check (length(event_name) <= 120),
  app         text not null default '' check (app in ('','hero','hero2')),
  recorded_at timestamptz not null default now(),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists hero_records_rank on public.hero_records(course_code, total_ms);
create index if not exists hero_records_kid on public.hero_records(hero_id);

-- 화면에서 직접 읽고 쓰기는 본사(대표·관리자)만. 도장 앱·부모·랭킹 화면은 아래 함수로만 씁니다.
alter table public.hero_dojangs enable row level security;
alter table public.hero_courses enable row level security;
alter table public.hero_kids    enable row level security;
alter table public.hero_records enable row level security;
drop policy if exists p_hd_admin on public.hero_dojangs;
create policy p_hd_admin on public.hero_dojangs for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_hc_admin on public.hero_courses;
create policy p_hc_admin on public.hero_courses for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_hk_admin on public.hero_kids;
create policy p_hk_admin on public.hero_kids for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_hr_admin on public.hero_records;
create policy p_hr_admin on public.hero_records for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 안쪽에서만 쓰는 도우미 ----------
-- 쓸 수 있는 허가 코드인지 (히어로 앱용 · 기간 안 · 중지 아님) → 코드 원문 또는 null
create or replace function public.hero_license(p_code text) returns text
language plpgsql stable security definer set search_path = public as $$
declare l public.licenses; c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
        today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if length(c) < 12 then return null; end if;
  select * into l from public.licenses where upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = c;
  if not found or l.revoked or today > l.ends or today < l.starts then return null; end if;
  if coalesce(l.app, 'all') not in ('all','hero','hero2') then return null; end if;
  return l.code;
end $$;
revoke execute on function public.hero_license(text) from public, anon, authenticated;

create or replace function public.hero_new_id() returns text
language plpgsql volatile security definer set search_path = public as $$
declare a text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; v text; i int; b bytea;
begin
  loop
    b := uuid_send(gen_random_uuid()); v := 'TH-';
    for i in 0..5 loop v := v || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.hero_kids where hero_id = v);
  end loop;
  return v;
end $$;
revoke execute on function public.hero_new_id() from public, anon, authenticated;

-- ---------- 도장 앱이 부르는 함수 (허가 코드로 확인) ----------
-- 내 도장 상태
create or replace function public.hero_dojang_me(p_license text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.hero_license(p_license); d public.hero_dojangs;
begin
  if c is null then return jsonb_build_object('ok', false, 'reason', 'license'); end if;
  select * into d from public.hero_dojangs where license_code = c;
  if not found then return jsonb_build_object('ok', true, 'dojang', null); end if;
  return jsonb_build_object('ok', true, 'dojang', jsonb_build_object('name', d.name, 'country', d.country, 'city', d.city,
    'coach', d.coach, 'status', d.status, 'note', d.note));
end $$;

-- 공인 도장 신청 · 정보 고치기 (이름이나 나라를 바꾸면 다시 승인을 기다립니다)
create or replace function public.hero_dojang_apply(p_license text, p_name text, p_country text, p_city text, p_coach text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.hero_license(p_license); d public.hero_dojangs;
        n text := btrim(coalesce(p_name, '')); k text := upper(btrim(coalesce(p_country, 'KR')));
begin
  if c is null then return jsonb_build_object('ok', false, 'reason', 'license'); end if;
  if length(n) < 2 or length(n) > 60 then return jsonb_build_object('ok', false, 'reason', 'name'); end if;
  if k !~ '^[A-Z]{2}$' then return jsonb_build_object('ok', false, 'reason', 'country'); end if;
  select * into d from public.hero_dojangs where license_code = c;
  if not found then
    insert into public.hero_dojangs (license_code, name, country, city, coach)
    values (c, n, k, left(btrim(coalesce(p_city, '')), 60), left(btrim(coalesce(p_coach, '')), 40));
  else
    if d.status = 'suspended' then return jsonb_build_object('ok', false, 'reason', 'suspended'); end if;
    update public.hero_dojangs set name = n, country = k, city = left(btrim(coalesce(p_city, '')), 60),
      coach = left(btrim(coalesce(p_coach, '')), 40), updated_at = now(),
      status = case when d.status = 'approved' and (d.name <> n or d.country <> k) then 'pending'
                    when d.status = 'rejected' then 'pending' else d.status end
    where id = d.id;
  end if;
  return public.hero_dojang_me(p_license);
end $$;

-- 공식 코스 목록 (누구나)
create or replace function public.hero_courses_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'name_en', name_en, 'stations', stations, 'setup', setup)
         order by created_at), '[]'::jsonb) from public.hero_courses where active;
$$;

-- 히어로 아이디 만들기 (p_hero_id 를 주면: 부모 동의 전까지 별명·출생 연도·성별 고치기)
create or replace function public.hero_kid_save(p_license text, p_nickname text, p_birth_year int, p_gender text, p_hero_id text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.hero_license(p_license); d public.hero_dojangs; k public.hero_kids; v text;
        n text := btrim(coalesce(p_nickname, '')); g text := upper(coalesce(p_gender, ''));
begin
  if c is null then return jsonb_build_object('ok', false, 'reason', 'license'); end if;
  select * into d from public.hero_dojangs where license_code = c;
  if not found or d.status <> 'approved' then return jsonb_build_object('ok', false, 'reason', 'dojang'); end if;
  if length(n) < 2 or length(n) > 20 then return jsonb_build_object('ok', false, 'reason', 'nickname'); end if;
  if p_birth_year is null or p_birth_year < 2005 or p_birth_year > 2030 then return jsonb_build_object('ok', false, 'reason', 'birth_year'); end if;
  if g not in ('M','F') then return jsonb_build_object('ok', false, 'reason', 'gender'); end if;
  if p_hero_id is not null and p_hero_id <> '' then
    select * into k from public.hero_kids where hero_id = upper(p_hero_id) and dojang_id = d.id;
    if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    if k.consent_status = 'given' and (k.nickname <> n or k.birth_year <> p_birth_year or k.gender <> g) then
      return jsonb_build_object('ok', false, 'reason', 'locked');
    end if;
    update public.hero_kids set nickname = n, birth_year = p_birth_year, gender = g,
      consent_status = case when consent_status = 'withdrawn' then 'pending' else consent_status end
    where hero_id = k.hero_id returning * into k;
  else
    v := public.hero_new_id();
    insert into public.hero_kids (hero_id, dojang_id, nickname, birth_year, gender)
    values (v, d.id, n, p_birth_year, g) returning * into k;
  end if;
  return jsonb_build_object('ok', true, 'hero_id', k.hero_id, 'token', k.consent_token, 'status', k.consent_status);
end $$;

-- 우리 도장 아이들의 동의 상태
create or replace function public.hero_kids_status(p_license text, p_ids text[]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c text := public.hero_license(p_license); d public.hero_dojangs;
begin
  if c is null then return jsonb_build_object('ok', false, 'reason', 'license'); end if;
  select * into d from public.hero_dojangs where license_code = c;
  if not found then return jsonb_build_object('ok', false, 'reason', 'dojang'); end if;
  return jsonb_build_object('ok', true, 'kids', coalesce((select jsonb_agg(jsonb_build_object('hero_id', hero_id, 'status', consent_status,
    'nickname', nickname, 'birth_year', birth_year, 'gender', gender, 'token', consent_token))
    from public.hero_kids where dojang_id = d.id and hero_id = any(coalesce(p_ids, '{}'::text[]))), '[]'::jsonb));
end $$;

-- 기록 보내기 (여러 개 한 번에). p_recs = [{id, hero_id, course, time_ms, pen_ms, event, at, app}, ...]
create or replace function public.hero_records_submit(p_license text, p_recs jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := public.hero_license(p_license); d public.hero_dojangs; r jsonb; k public.hero_kids; cr public.hero_courses;
        saved int := 0; skipped jsonb := '[]'::jsonb; tm int; pm int; rid uuid; at timestamptz;
begin
  if c is null then return jsonb_build_object('ok', false, 'reason', 'license'); end if;
  select * into d from public.hero_dojangs where license_code = c;
  if not found or d.status <> 'approved' then return jsonb_build_object('ok', false, 'reason', 'dojang'); end if;
  if jsonb_typeof(p_recs) <> 'array' or jsonb_array_length(p_recs) > 200 then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  for r in select * from jsonb_array_elements(p_recs) loop
    begin
      rid := (r->>'id')::uuid; tm := (r->>'time_ms')::int; pm := coalesce((r->>'pen_ms')::int, 0);
      at := least(now(), coalesce((r->>'at')::timestamptz, now()));
    exception when others then
      skipped := skipped || jsonb_build_object('id', r->>'id', 'reason', 'format'); continue;
    end;
    select * into k from public.hero_kids where hero_id = upper(r->>'hero_id') and dojang_id = d.id;
    if not found then skipped := skipped || jsonb_build_object('id', rid, 'reason', 'kid'); continue; end if;
    if k.consent_status <> 'given' then skipped := skipped || jsonb_build_object('id', rid, 'reason', 'consent'); continue; end if;
    select * into cr from public.hero_courses where code = r->>'course' and active;
    if not found then skipped := skipped || jsonb_build_object('id', rid, 'reason', 'course'); continue; end if;
    if tm is null or tm < 1000 or tm > 600000 or pm < 0 or pm > 600000 then
      skipped := skipped || jsonb_build_object('id', rid, 'reason', 'time'); continue;
    end if;
    insert into public.hero_records (id, hero_id, dojang_id, course_code, time_ms, pen_ms, total_ms, event_name, app, recorded_at)
    values (rid, k.hero_id, d.id, cr.code, tm, pm, tm + pm, left(coalesce(r->>'event', ''), 120),
            case when r->>'app' in ('hero','hero2') then r->>'app' else '' end, at)
    on conflict (id) do nothing;
    saved := saved + 1;
  end loop;
  return jsonb_build_object('ok', true, 'saved', saved, 'skipped', skipped);
end $$;

-- ---------- 부모가 휴대폰 링크로 부르는 함수 (링크 속 비밀 번호로 확인) ----------
create or replace function public.hero_consent_info(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k public.hero_kids; d public.hero_dojangs;
begin
  select * into k from public.hero_kids where consent_token = p_token;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into d from public.hero_dojangs where id = k.dojang_id;
  return jsonb_build_object('ok', true, 'hero_id', k.hero_id, 'nickname', k.nickname, 'birth_year', k.birth_year, 'gender', k.gender,
    'status', k.consent_status, 'consent_at', k.consent_at, 'dojang', d.name, 'country', d.country, 'city', d.city,
    'records', (select count(*) from public.hero_records where hero_id = k.hero_id));
end $$;

-- 동의(p_agree = true) 또는 철회(false). 철회하면 기록을 지우고 랭킹에서 뺍니다.
create or replace function public.hero_consent_set(p_token uuid, p_agree boolean, p_guardian text default '', p_relation text default '', p_version text default 'v1') returns jsonb
language plpgsql security definer set search_path = public as $$
declare k public.hero_kids; g text := btrim(coalesce(p_guardian, ''));
begin
  select * into k from public.hero_kids where consent_token = p_token;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_agree then
    if length(g) < 2 or length(g) > 40 then return jsonb_build_object('ok', false, 'reason', 'guardian'); end if;
    if coalesce(p_relation, '') not in ('father','mother','guardian') then return jsonb_build_object('ok', false, 'reason', 'relation'); end if;
    update public.hero_kids set consent_status = 'given', guardian_name = g, guardian_relation = p_relation,
      consent_version = left(coalesce(p_version, 'v1'), 20), consent_at = now(), withdrawn_at = null where hero_id = k.hero_id;
  else
    delete from public.hero_records where hero_id = k.hero_id;
    update public.hero_kids set consent_status = 'withdrawn', withdrawn_at = now(), guardian_name = '', guardian_relation = ''
    where hero_id = k.hero_id;
  end if;
  return public.hero_consent_info(p_token);
end $$;

-- ---------- 공개 세계 랭킹 (누구나) ----------
-- 선수마다 가장 좋은 기록 하나. 나이 = 기록한 해 - 출생 연도.
create or replace function public.hero_ranking(p_course text, p_birth_year int default null, p_gender text default null,
                                               p_country text default null, p_limit int default 100) returns jsonb
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (r.hero_id) r.hero_id, r.total_ms, r.time_ms, r.pen_ms, r.recorded_at, r.event_name, r.dojang_id
    from public.hero_records r
    where r.course_code = p_course and not r.hidden
    order by r.hero_id, r.total_ms, r.recorded_at
  ), rows as (
    select b.*, k.nickname, k.birth_year, k.gender, d.name as dojang, d.country,
           extract(year from b.recorded_at at time zone 'Asia/Seoul')::int - k.birth_year as age
    from best b join public.hero_kids k on k.hero_id = b.hero_id join public.hero_dojangs d on d.id = k.dojang_id
    where k.consent_status = 'given' and not k.hidden and d.status = 'approved'
      and (p_birth_year is null or k.birth_year = p_birth_year)
      and (p_gender is null or p_gender = '' or k.gender = upper(p_gender))
      and (p_country is null or p_country = '' or d.country = upper(p_country))
  ), ranked as (
    select rank() over (order by total_ms) as rank, * from rows
  )
  select jsonb_build_object('ok', true, 'total', (select count(*) from ranked), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'rank', rank, 'hero_id', hero_id, 'nickname', nickname, 'country', country, 'dojang', dojang, 'birth_year', birth_year,
      'age', age, 'gender', gender, 'total_ms', total_ms, 'pen_ms', pen_ms, 'at', recorded_at) order by rank, recorded_at)
    from (select * from ranked order by rank, recorded_at limit least(greatest(coalesce(p_limit, 100), 1), 500)) x), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(distinct country) from ranked), '[]'::jsonb),
    'years', coalesce((select jsonb_agg(distinct birth_year) from ranked), '[]'::jsonb));
$$;

-- 히어로 아이디 하나의 기록 (공개 · 별명만)
create or replace function public.hero_profile(p_hero_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('ok', true, 'hero_id', k.hero_id, 'nickname', k.nickname, 'country', d.country, 'dojang', d.name,
      'birth_year', k.birth_year, 'gender', k.gender,
      'best', (select coalesce(jsonb_agg(jsonb_build_object('course', x.course_code, 'total_ms', x.total_ms, 'at', x.recorded_at)), '[]'::jsonb)
               from (select distinct on (course_code) course_code, total_ms, recorded_at from public.hero_records
                     where hero_id = k.hero_id and not hidden order by course_code, total_ms) x))
    from public.hero_kids k join public.hero_dojangs d on d.id = k.dojang_id
    where k.hero_id = upper(p_hero_id) and k.consent_status = 'given' and not k.hidden and d.status = 'approved'),
    jsonb_build_object('ok', false, 'reason', 'not_found'));
$$;

-- 함수 사용 권한: 앱·부모·랭킹 화면은 로그인 없이(anon) 부릅니다
revoke execute on function public.hero_dojang_me(text) from public;
revoke execute on function public.hero_dojang_apply(text, text, text, text, text) from public;
revoke execute on function public.hero_courses_list() from public;
revoke execute on function public.hero_kid_save(text, text, int, text, text) from public;
revoke execute on function public.hero_kids_status(text, text[]) from public;
revoke execute on function public.hero_records_submit(text, jsonb) from public;
revoke execute on function public.hero_consent_info(uuid) from public;
revoke execute on function public.hero_consent_set(uuid, boolean, text, text, text) from public;
revoke execute on function public.hero_ranking(text, int, text, text, int) from public;
revoke execute on function public.hero_profile(text) from public;
grant execute on function public.hero_dojang_me(text) to anon, authenticated;
grant execute on function public.hero_dojang_apply(text, text, text, text, text) to anon, authenticated;
grant execute on function public.hero_courses_list() to anon, authenticated;
grant execute on function public.hero_kid_save(text, text, int, text, text) to anon, authenticated;
grant execute on function public.hero_kids_status(text, text[]) to anon, authenticated;
grant execute on function public.hero_records_submit(text, jsonb) to anon, authenticated;
grant execute on function public.hero_consent_info(uuid) to anon, authenticated;
grant execute on function public.hero_consent_set(uuid, boolean, text, text, text) to anon, authenticated;
grant execute on function public.hero_ranking(text, int, text, text, int) to anon, authenticated;
grant execute on function public.hero_profile(text) to anon, authenticated;

-- 첫 공식 코스 하나 (본사 관리 화면에서 고치거나 끌 수 있음) — 앱 기본 6개 장애물
insert into public.hero_courses (code, name, name_en, stations, setup)
select 'HERO-STD-1', '히어로 표준 코스 1', 'Hero Standard Course 1',
  '[{"id":"s1","ko":"허들 점프","en":"Hurdle Jump","pen":3,"ic":"hurdle"},
    {"id":"s2","ko":"터널 기어가기","en":"Tunnel Crawl","pen":2,"ic":"tunnel"},
    {"id":"s3","ko":"지그재그 콘","en":"Zigzag Cones","pen":3,"ic":"cone"},
    {"id":"s4","ko":"발 격파","en":"Kick Break","pen":5,"ic":"kick"},
    {"id":"s5","ko":"링 점프","en":"Ring Hop","pen":2,"ic":"ring"},
    {"id":"s6","ko":"주먹 격파","en":"Punch Break","pen":5,"ic":"punch"}]'::jsonb,
  '총 길이 20m · 허들 높이 20cm 2개 · 터널 2m · 콘 5개(1m 간격) · 발 격파판 1장(높이: 배꼽) · 링 4개 · 주먹 격파판 1장. 출발·도착선은 같은 곳.'
where not exists (select 1 from public.hero_courses);
