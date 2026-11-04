-- KICKSTART UP 12단계: 권한 세 단계(대표 · 관리자 · 직원) · 대회 숨기기 · 공지사항 · 첫 화면 팝업
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 9 → 10 → 11단계를 먼저 실행해 두어야 합니다.
--   · 대표(admin): 모든 일 + 허가 코드 · 회계 · 권한 바꾸기
--   · 관리자(manager): 대회 만들기·고치기·숨기기, 경기 앱으로 명단 보내기, 대진표·결과·상장, 공지·팝업, 회원(지도자) 관리
--   · 직원(staff): 접수 현황 보기, 선수·접수 내역 고치기, 입금 확인
--   · 끝난 대회는 지우지 않고 「숨기기」: 첫 화면 대회 목록에서만 빠지고 접수·결과·상장 기록은 그대로 남습니다

-- 1) 권한 이름에 「관리자(manager)」 추가
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('coach','staff','manager','admin'));

-- 대회 본부 사람인지 (대표 + 관리자 + 직원)
create or replace function public.is_ops() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','manager','staff'));
$$;
-- 관리자 이상 (대표 + 관리자): 지금까지 is_admin() 으로 지킨 일(대회·명단·대진표·결과·생중계)은 관리자부터
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'));
$$;
grant execute on function public.is_ops() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) 직원도 하는 일은 is_ops() 로: 회원·선수·접수 보기, 선수·접수 고치기, 입금 확인
drop policy if exists p_profiles_sel on public.profiles;
create policy p_profiles_sel on public.profiles for select to authenticated using (id = auth.uid() or public.is_ops());
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_owner() or (public.is_admin() and role = 'coach'))
  with check (id = auth.uid() or public.is_owner() or (public.is_admin() and role = 'coach'));

drop policy if exists p_ath_own on public.athletes;
create policy p_ath_own on public.athletes for all to authenticated using (coach_id = auth.uid() or public.is_ops()) with check (coach_id = auth.uid() or public.is_ops());

drop policy if exists p_ent_sel on public.entries;
create policy p_ent_sel on public.entries for select to authenticated using (coach_id = auth.uid() or public.is_ops());
drop policy if exists p_ent_ins on public.entries;
create policy p_ent_ins on public.entries for insert to authenticated with check (coach_id = auth.uid() or public.is_ops());
drop policy if exists p_ent_upd on public.entries;
create policy p_ent_upd on public.entries for update to authenticated using (coach_id = auth.uid() or public.is_ops()) with check (coach_id = auth.uid() or public.is_ops());
drop policy if exists p_ent_del on public.entries;
create policy p_ent_del on public.entries for delete to authenticated using (public.is_ops());

do $$ begin
  execute 'drop policy if exists p_mus_sel on public.entry_music';
  execute 'create policy p_mus_sel on public.entry_music for select to authenticated using (coach_id = auth.uid() or public.is_ops())';
exception when others then null; end $$;

-- 접수 검사: 대회 본부(대표·관리자·직원)는 입금 확인 등 상태를 바꿀 수 있음
create or replace function public.check_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare dl date; n int;
begin
  if auth.uid() is null or public.is_ops() then return new; end if;
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

-- 3) 대회 만들기·고치기·숨기기와 요강 파일은 관리자부터 (지우기는 홈페이지에서 대표만)
alter table public.comps add column if not exists hidden boolean not null default false;
drop policy if exists p_comps_admin on public.comps;
create policy p_comps_admin on public.comps for all to authenticated using (public.is_admin()) with check (public.is_admin());
do $$
begin
  execute 'drop policy if exists p_docs_ins on storage.objects';
  execute 'create policy p_docs_ins on storage.objects for insert to authenticated with check (bucket_id = ''comp-docs'' and public.is_admin())';
  execute 'drop policy if exists p_docs_upd on storage.objects';
  execute 'create policy p_docs_upd on storage.objects for update to authenticated using (bucket_id = ''comp-docs'' and public.is_admin())';
  execute 'drop policy if exists p_docs_del on storage.objects';
  execute 'create policy p_docs_del on storage.objects for delete to authenticated using (bucket_id = ''comp-docs'' and public.is_admin())';
exception when others then raise notice '요강 저장소 규칙을 바꾸지 못했습니다 (%)', sqlerrm;
end $$;

-- 4) 공지사항 (누구나 보기 · 관리자부터 쓰기)
create table if not exists public.site_notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  link       text not null default '',
  pinned     boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.site_notices enable row level security;
drop policy if exists p_ntc_read on public.site_notices;
create policy p_ntc_read on public.site_notices for select to anon, authenticated using (true);
drop policy if exists p_ntc_admin on public.site_notices;
create policy p_ntc_admin on public.site_notices for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.site_notices to anon, authenticated;
grant insert, update, delete on public.site_notices to authenticated;

-- 5) 홈페이지 설정 (첫 화면 팝업 등 · 누구나 보기 · 관리자부터 고치기)
create table if not exists public.site_config (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;
drop policy if exists p_cfg_read on public.site_config;
create policy p_cfg_read on public.site_config for select to anon, authenticated using (true);
drop policy if exists p_cfg_admin on public.site_config;
create policy p_cfg_admin on public.site_config for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.site_config to anon, authenticated;
grant insert, update, delete on public.site_config to authenticated;
