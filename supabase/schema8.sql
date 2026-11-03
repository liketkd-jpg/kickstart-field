-- KICKSTART UP 8단계: 사용 권한 (일주일 · 한 달 · 1년 · 평생) · 금액표 · 인터넷 전용 / 파일 사용
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 이미 만든 허가 코드는 그대로 쓰입니다.

-- 1) 허가 코드 종류 늘리기 + 사용 방식
alter table public.licenses drop constraint if exists licenses_kind_check;
alter table public.licenses add constraint licenses_kind_check check (kind in ('event','week','month','year','life'));
alter table public.licenses add column if not exists app text not null default 'all';          -- 'all' 또는 'hero' 등 앱 하나
alter table public.licenses add column if not exists mode text not null default 'file';        -- 'online' 인터넷 주소에서만 · 'file' 파일·현장 모드에서도
alter table public.licenses drop constraint if exists licenses_mode_check;
alter table public.licenses add constraint licenses_mode_check check (mode in ('online','file'));
alter table public.licenses add column if not exists grace_days integer not null default 3;   -- 파일 사용: 인터넷 확인 없이 쓸 수 있는 날 수

-- 2) 금액표 (관리자가 홈페이지에서 정함, 누구나 볼 수 있음)
create table if not exists public.license_plans (
  kind       text primary key check (kind in ('week','month','year','life')),
  price      numeric not null default 0,
  currency   text not null default 'USD',
  note       text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.license_plans (kind, price) values ('week',20),('month',50),('year',300),('life',800) on conflict (kind) do nothing;
alter table public.license_plans enable row level security;
drop policy if exists p_plan_read on public.license_plans;
create policy p_plan_read on public.license_plans for select to anon, authenticated using (true);
drop policy if exists p_plan_admin on public.license_plans;
create policy p_plan_admin on public.license_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.license_plans to anon, authenticated;
grant insert, update, delete on public.license_plans to authenticated;

-- 3) 앱이 코드를 확인할 때 사용 방식·앱·인터넷 없이 쓰는 날 수도 알려 줌
create or replace function public.check_license(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l public.licenses; c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if length(c) < 12 then return jsonb_build_object('ok', false, 'reason', '코드 형식이 맞지 않습니다'); end if;
  select * into l from public.licenses where upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = c;
  if not found then return jsonb_build_object('ok', false, 'reason', '없는 코드입니다'); end if;
  if l.revoked then return jsonb_build_object('ok', false, 'reason', '사용이 중지된 코드입니다'); end if;
  update public.licenses set seen_count = seen_count + 1, last_seen = now() where code = l.code;
  return jsonb_build_object('ok', today <= l.ends and today >= l.starts,
    'reason', case when today > l.ends then '사용 기간이 끝난 코드입니다' when today < l.starts then '아직 사용 기간 전입니다' else '' end,
    'code', l.code, 'kind', l.kind, 'holder', l.holder, 'starts', l.starts, 'ends', l.ends, 'today', today,
    'app', l.app, 'mode', l.mode, 'grace_days', l.grace_days);
end $$;
revoke execute on function public.check_license(text) from public;
grant execute on function public.check_license(text) to anon, authenticated;
