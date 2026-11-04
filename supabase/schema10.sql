-- KICKSTART UP 10단계: 대진표 · 출전 순서를 홈페이지에 올리기
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 이미 있는 자료는 그대로입니다.
--   · 경기 앱(관리자 로그인)에서 「대진표를 홈페이지로 보내기」를 누르면 종목별로 저장됩니다 (다시 보내면 새 대진으로 바뀜)
--   · 누구나(로그인 없이) 대회 안내 화면에서 대진표와 출전 순서를 볼 수 있습니다

create table if not exists public.draws (
  comp_id    uuid not null references public.comps(id) on delete cascade,
  sport      text not null check (sport in ('poomsae','kyorugi','gyeokpa','hero')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (comp_id, sport)
);
alter table public.draws enable row level security;
drop policy if exists p_draws_read on public.draws;
create policy p_draws_read on public.draws for select to anon, authenticated using (true);
drop policy if exists p_draws_admin on public.draws;
create policy p_draws_admin on public.draws for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.draws to anon, authenticated;
grant insert, update, delete on public.draws to authenticated;

-- 경기 앱이 부르는 함수 (관리자만)
create or replace function public.publish_draws(p_comp uuid, p_sport text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := coalesce(jsonb_array_length(p_data->'divs'), 0);
begin
  if not public.is_admin() then
    raise exception '대회 본부(관리자) 계정만 대진표를 올릴 수 있습니다';
  end if;
  if not exists(select 1 from public.comps where id = p_comp) then
    raise exception '대회를 찾지 못했습니다';
  end if;
  insert into public.draws (comp_id, sport, data, updated_at) values (p_comp, p_sport, p_data, now())
    on conflict (comp_id, sport) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true, 'divs', n, 'at', now());
end $$;
revoke execute on function public.publish_draws(uuid, text, jsonb) from public, anon;
grant execute on function public.publish_draws(uuid, text, jsonb) to authenticated;
