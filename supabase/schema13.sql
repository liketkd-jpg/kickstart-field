-- KICKSTART UP 13단계: 현장 프로그램 자동 백업 (본부 노트북 → Supabase)
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 12단계(schema12.sql)를 먼저 실행해 두어야 합니다.
--   · 본부 노트북이 코트별·종목별 대회 데이터(명단·부문·점수·기록)를 몇 분마다 올립니다.
--   · 대회·코트·종목마다 가장 최근 것 하나만 남깁니다 (덮어쓰기).
--   · 대표·관리자·직원 계정만 올리고 볼 수 있습니다.

create table if not exists public.field_backups (
  comp       text not null,
  court      text not null,
  app        text not null,
  file       text,
  data       jsonb not null,
  saved_at   timestamptz,
  updated_at timestamptz not null default now(),
  primary key (comp, court, app)
);

alter table public.field_backups enable row level security;
drop policy if exists p_fb_ops on public.field_backups;
create policy p_fb_ops on public.field_backups for all to authenticated
  using (public.is_ops()) with check (public.is_ops());
grant select, insert, update, delete on public.field_backups to authenticated;
