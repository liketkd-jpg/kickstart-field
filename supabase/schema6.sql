-- KICKSTART UP 6단계: 관람객 실시간 결과
-- 현장 본부 노트북이 코트 진행 상황·입상 결과를 보내면(push_live), 누구나 홈페이지에서 봅니다 (로그인 없이)
create table if not exists public.live_view (
  comp_id    uuid primary key references public.comps(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.live_view enable row level security;
drop policy if exists p_live_read on public.live_view;
create policy p_live_read on public.live_view for select to anon, authenticated using (true);
drop policy if exists p_live_admin on public.live_view;
create policy p_live_admin on public.live_view for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.live_view to anon, authenticated;
grant insert, update, delete on public.live_view to authenticated;

create or replace function public.push_live(p_comp uuid, p_data jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if not public.is_admin() then raise exception '대회 본부(관리자) 계정만 보낼 수 있습니다'; end if;
  if not exists (select 1 from public.comps where id = p_comp) then raise exception '대회를 찾지 못했습니다'; end if;
  if length(coalesce(p_data, '{}'::jsonb)::text) > 1000000 then raise exception '보내는 자료가 너무 큽니다'; end if;
  insert into public.live_view (comp_id, data, updated_at) values (p_comp, coalesce(p_data, '{}'::jsonb), t)
    on conflict (comp_id) do update set data = excluded.data, updated_at = t;
  return t;
end $$;
revoke execute on function public.push_live(uuid, jsonb) from public, anon;
grant execute on function public.push_live(uuid, jsonb) to authenticated;
