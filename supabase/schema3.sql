-- KICKSTART UP 접수 홈페이지 3단계: 대회 결과·상장
alter table public.comps add column if not exists results_open boolean not null default false;
alter table public.comps add column if not exists cert jsonb not null default '{}'::jsonb;

create table if not exists public.results (
  id         uuid primary key default gen_random_uuid(),
  comp_id    uuid not null references public.comps(id) on delete cascade,
  sport      text not null check (sport in ('poomsae','kyorugi','gyeokpa')),
  kind       text not null default 'medal' check (kind in ('medal','team')),
  div        text not null default '',
  rank       integer not null,
  name       text not null,
  team       text not null default '',
  coach      text not null default '',
  members    text not null default '',
  coach_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists results_comp on public.results(comp_id);
create index if not exists results_coach on public.results(coach_id);
alter table public.results enable row level security;
drop policy if exists p_res_sel on public.results;
create policy p_res_sel on public.results for select to authenticated
  using (public.is_admin() or (coach_id = auth.uid() and exists (select 1 from public.comps c where c.id = comp_id and c.results_open)));
drop policy if exists p_res_admin on public.results;
create policy p_res_admin on public.results for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.results to authenticated;

-- 대회 앱이 결과를 보냄: 같은 대회·종목의 이전 결과를 바꾸고, 접수 명단으로 지도자를 찾아 연결
create or replace function public.publish_results(p_comp uuid, p_sport text, p_rows jsonb, p_meta jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; cid uuid; nm text; tm text; n int := 0; m int := 0;
begin
  if not public.is_admin() then raise exception '대회 본부(관리자) 계정만 결과를 보낼 수 있습니다'; end if;
  if not exists (select 1 from public.comps where id = p_comp) then raise exception '대회를 찾지 못했습니다'; end if;
  delete from public.results where comp_id = p_comp and sport = p_sport;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    nm := trim(split_part(coalesce(r->>'name', ''), ',', 1));
    tm := trim(regexp_replace(coalesce(nullif(r->>'team', ''), case when r->>'kind' = 'team' then r->>'name' end, ''), '\s*팀$', ''));
    cid := null;
    if coalesce(r->>'kind', 'medal') = 'medal' then
      select e.coach_id into cid
        from public.entries e join public.athletes a on a.id = any(e.athlete_ids) join public.profiles p on p.id = e.coach_id
       where e.comp_id = p_comp and e.sport = p_sport and e.status <> 'cancel' and a.name = nm
       order by (a.org = tm or p.org = tm) desc, e.created_at
       limit 1;
    end if;
    if cid is null and tm <> '' then
      select case when count(*) = 1 then (array_agg(id))[1] end into cid from public.profiles where org = tm and role = 'coach';
    end if;
    insert into public.results (comp_id, sport, kind, div, rank, name, team, coach, members, coach_id)
    values (p_comp, p_sport, coalesce(r->>'kind', 'medal'), coalesce(r->>'div', ''), coalesce((r->>'rank')::int, 0),
            coalesce(r->>'name', ''), coalesce(r->>'team', ''), coalesce(r->>'coach', ''), coalesce(r->>'members', ''), cid);
    n := n + 1; if cid is not null then m := m + 1; end if;
  end loop;
  if p_meta is not null and p_meta <> '{}'::jsonb then
    update public.comps set cert = cert || p_meta where id = p_comp;
  end if;
  return jsonb_build_object('rows', n, 'matched', m);
end $$;
revoke execute on function public.publish_results(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.publish_results(uuid, text, jsonb, jsonb) to authenticated;
