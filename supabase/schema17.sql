-- 17단계 (v1.7.4): 지도자 「대진 수정 요청」
-- 지도자는 자기 요청만 보고 보낼 수 있고, 대회 본부(운영진)는 모두 보고 반영·거절합니다.
create table if not exists public.draw_reqs (
  id         uuid primary key default gen_random_uuid(),
  comp_id    uuid not null references public.comps(id) on delete cascade,
  coach_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  entry_id   uuid references public.entries(id) on delete set null,
  kind       text not null default 'etc',
  body       text not null default '',
  want       jsonb not null default '{}'::jsonb,
  status     text not null default 'open' check (status in ('open','done','no')),
  answer     text not null default '',
  created_at timestamptz not null default now(),
  done_at    timestamptz
);
create index if not exists draw_reqs_comp on public.draw_reqs(comp_id);
alter table public.draw_reqs enable row level security;
drop policy if exists p_dreq_sel on public.draw_reqs;
create policy p_dreq_sel on public.draw_reqs for select to authenticated using (coach_id = auth.uid() or public.is_ops());
drop policy if exists p_dreq_ins on public.draw_reqs;
create policy p_dreq_ins on public.draw_reqs for insert to authenticated with check ((coach_id = auth.uid() and status = 'open' and answer = '') or public.is_ops());
drop policy if exists p_dreq_upd on public.draw_reqs;
create policy p_dreq_upd on public.draw_reqs for update to authenticated using (public.is_ops()) with check (public.is_ops());
drop policy if exists p_dreq_del on public.draw_reqs;
create policy p_dreq_del on public.draw_reqs for delete to authenticated using (public.is_ops());
grant select, insert, update, delete on public.draw_reqs to authenticated;
notify pgrst, 'reload schema';
