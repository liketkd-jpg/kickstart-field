-- KICKSTART UP 4단계: 대회 앱 허가 코드 (대회 1회권 · 1년권)
create table if not exists public.licenses (
  code       text primary key,
  kind       text not null check (kind in ('event','year')),
  holder     text not null default '',
  contact    text not null default '',
  starts     date not null,
  ends       date not null,
  note       text not null default '',
  revoked    boolean not null default false,
  seen_count integer not null default 0,
  last_seen  timestamptz,
  created_at timestamptz not null default now(),
  constraint licenses_dates check (ends >= starts)
);
alter table public.licenses enable row level security;
drop policy if exists p_lic_admin on public.licenses;
create policy p_lic_admin on public.licenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.licenses to authenticated;

-- 대회 앱이 코드를 확인함 (로그인 없이). 코드 목록은 보이지 않고, 넣은 코드 하나만 확인
create or replace function public.check_license(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l public.licenses; c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if length(c) < 12 then return jsonb_build_object('ok', false, 'reason', '코드 형식이 맞지 않습니다'); end if;
  select * into l from public.licenses where upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = c;
  if not found then return jsonb_build_object('ok', false, 'reason', '없는 코드입니다'); end if;
  if l.revoked then return jsonb_build_object('ok', false, 'reason', '사용이 중지된 코드입니다'); end if;
  update public.licenses set seen_count = seen_count + 1, last_seen = now() where code = l.code;
  return jsonb_build_object('ok', today <= l.ends, 'reason', case when today > l.ends then '사용 기간이 끝난 코드입니다' else '' end,
    'code', l.code, 'kind', l.kind, 'holder', l.holder, 'starts', l.starts, 'ends', l.ends, 'today', today);
end $$;
revoke execute on function public.check_license(text) from public;
grant execute on function public.check_license(text) to anon, authenticated;
