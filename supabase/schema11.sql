-- KICKSTART UP 11단계: 직원 권한 · 회계 장부
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 이미 있는 자료는 그대로입니다.
--   · 권한 3가지: 대표(admin) · 직원(staff) · 지도자(coach)
--     직원: 접수 현황·선수·접수 내역 고치기, 입금 확인, 명단 가져오기, 대진표·결과 올리기
--     대표만: 대회 만들기·고치기, 허가 코드, 회계, 권한 바꾸기, 직원·대표 비밀번호 바꾸기
--   · 회계: 참가비(입금 확인된 접수)·허가 코드 판매는 자동으로 수입, 지출·기타 수입은 영수증과 함께 기록

-- 1) 직원 권한
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('coach','staff','admin'));

-- 대표인지
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
-- 대회 운영 권한 (대표 + 직원): 지금까지의 모든 관리자 규칙이 직원에게도 열립니다
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','staff'));
$$;
grant execute on function public.is_owner() to authenticated;

-- 권한은 대표만 바꿈
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_owner() then
    raise exception '권한은 대표만 바꿀 수 있습니다';
  end if;
  return new;
end $$;

-- 회원 정보 고치기: 본인 · 대표 · (직원은 지도자 정보만)
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_owner() or (public.is_admin() and role = 'coach'))
  with check (id = auth.uid() or public.is_owner() or (public.is_admin() and role = 'coach'));

-- 대회 만들기·고치기·지우기와 요강 파일은 대표만 (보기는 누구나)
drop policy if exists p_comps_admin on public.comps;
create policy p_comps_admin on public.comps for all to authenticated using (public.is_owner()) with check (public.is_owner());
do $$
begin
  execute 'drop policy if exists p_docs_ins on storage.objects';
  execute 'create policy p_docs_ins on storage.objects for insert to authenticated with check (bucket_id = ''comp-docs'' and public.is_owner())';
  execute 'drop policy if exists p_docs_upd on storage.objects';
  execute 'create policy p_docs_upd on storage.objects for update to authenticated using (bucket_id = ''comp-docs'' and public.is_owner())';
  execute 'drop policy if exists p_docs_del on storage.objects';
  execute 'create policy p_docs_del on storage.objects for delete to authenticated using (bucket_id = ''comp-docs'' and public.is_owner())';
exception when others then raise notice '요강 저장소 규칙을 바꾸지 못했습니다 (%)', sqlerrm;
end $$;

-- 허가 코드 · 금액표는 대표만
drop policy if exists p_lic_admin on public.licenses;
create policy p_lic_admin on public.licenses for all to authenticated using (public.is_owner()) with check (public.is_owner());
do $$ begin
  execute 'drop policy if exists p_plan_admin on public.license_plans';
  execute 'create policy p_plan_admin on public.license_plans for all to authenticated using (public.is_owner()) with check (public.is_owner())';
exception when others then null; end $$;

-- 비밀번호 바꿔 주기: 대표는 누구나, 직원은 지도자만
create or replace function public.admin_set_password(p_user uuid, p_pw text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not (public.is_owner() or (public.is_admin() and exists(select 1 from public.profiles where id = p_user and role = 'coach'))) then
    raise exception '이 회원의 비밀번호는 대표만 바꿀 수 있습니다';
  end if;
  if length(coalesce(p_pw, '')) < 6 then raise exception '비밀번호는 6자 이상으로 해 주세요'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_pw, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now())
   where id = p_user;
end $$;

-- 2) 입금 확인한 날 (회계 월별 합계용)
alter table public.entries add column if not exists paid_at timestamptz;
create or replace function public.entry_paid_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then new.paid_at := now();
  elsif new.status <> 'paid' then new.paid_at := null; end if;
  return new;
end $$;
drop trigger if exists entries_paid_at on public.entries;
create trigger entries_paid_at before insert or update on public.entries for each row execute function public.entry_paid_at();

-- 3) 허가 코드 판매 금액
alter table public.licenses add column if not exists price numeric not null default 0;

-- 4) 회계 장부 (대표만): 지출 · 기타 수입
create table if not exists public.ledger (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('in','out')),
  category   text not null default '',
  amount     numeric not null check (amount >= 0),
  day        date not null default ((now() at time zone 'Asia/Seoul')::date),
  comp_id    uuid references public.comps(id) on delete set null,
  memo       text not null default '',
  receipt    text not null default '',
  receipt_name text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists ledger_day on public.ledger(day);
alter table public.ledger enable row level security;
drop policy if exists p_ledger_owner on public.ledger;
create policy p_ledger_owner on public.ledger for all to authenticated using (public.is_owner()) with check (public.is_owner());
grant select, insert, update, delete on public.ledger to authenticated;

-- 영수증 저장소 (비공개 · 대표만 · 10MB)
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit) values ('receipts', 'receipts', false, 10485760)
    on conflict (id) do update set public = false, file_size_limit = 10485760;
  execute 'drop policy if exists p_rcpt_all on storage.objects';
  execute 'create policy p_rcpt_all on storage.objects for all to authenticated using (bucket_id = ''receipts'' and public.is_owner()) with check (bucket_id = ''receipts'' and public.is_owner())';
exception when others then raise notice '영수증 저장소를 만들지 못했습니다 (%)', sqlerrm;
end $$;
