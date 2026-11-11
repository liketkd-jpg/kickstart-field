-- KICKSTART UP 14단계: 대표 전용 「견적서」 저장소
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 11단계(schema11.sql)를 먼저 실행해 두어야 합니다.
--   · 단가표(prices) · 회사 정보와 직인(company) · 견적서(q:번호)를 한 표에 저장합니다.
--   · 대표(admin) 계정만 보고 고칠 수 있습니다. 관리자·직원·지도자는 볼 수 없습니다.

create table if not exists public.quote_store (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.quote_store enable row level security;
drop policy if exists p_quote_owner on public.quote_store;
create policy p_quote_owner on public.quote_store for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant select, insert, update, delete on public.quote_store to authenticated;
