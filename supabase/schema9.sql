-- KICKSTART UP 9단계: 음원 제출 (자유 품새 · 태권체조 · 팀 대항 종합경연)
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 이미 있는 자료는 그대로입니다.
--   · 지도자는 자기 접수의 음원을 올리고 바꿀 수 있습니다 (한 곡 10MB까지, 음악 파일만)
--   · 음원 제출 마감: 대회마다 정할 수 있고, 비워 두면 대회 7일 전
--   · 대회가 끝나고 7일이 지나면 지도자는 그 대회 음원을 받을 수 없고, 관리자가 홈페이지에 들어올 때 자동으로 지워집니다

-- 1) 대회별 음원 제출 마감일
alter table public.comps add column if not exists music_due date;

-- 음원을 올릴 수 있는 날인지 (마감일까지, 관리자는 언제나)
create or replace function public.music_open(p_comp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists(select 1 from public.comps c where c.id = p_comp
    and (now() at time zone 'Asia/Seoul')::date <= coalesce(c.music_due, c.date - 7));
$$;
-- 대회가 끝나고 7일이 지났는지 (지나면 음원을 지움)
create or replace function public.music_expired(p_comp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.comps c where c.id = p_comp and (now() at time zone 'Asia/Seoul')::date > c.date + 7);
$$;
-- 이 접수가 내 것이고 음원이 필요한 종목인지
create or replace function public.music_entry_ok(p_entry uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.entries e where e.id = p_entry and e.status <> 'cancel'
    and (e.coach_id = auth.uid() or public.is_admin())
    and e.sport = 'poomsae' and coalesce(e.f->>'type','') in ('자유','태권체조','팀대항 종합경연'));
$$;
-- 저장소 규칙용 (파일 자리 글자로 받음: 다른 저장소 파일에서 오류가 나지 않게)
create or replace function public.music_obj_ok(p_name text, p_write boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare f text[] := storage.foldername(p_name); c uuid; e uuid;
begin
  if array_length(f,1) is null or array_length(f,1) < 2 then return false; end if;
  begin c := f[1]::uuid; e := f[2]::uuid; exception when others then return false; end;
  if not exists(select 1 from public.entries x where x.id = e and x.comp_id = c) then return false; end if;
  if p_write then return public.music_open(c) and public.music_entry_ok(e); end if;
  return not public.music_expired(c) and (public.is_admin() or exists(select 1 from public.entries x where x.id = e and x.coach_id = auth.uid()));
end $$;
grant execute on function public.music_open(uuid), public.music_expired(uuid), public.music_entry_ok(uuid), public.music_obj_ok(text, boolean) to authenticated;

-- 2) 접수별 음원 정보
create table if not exists public.entry_music (
  entry_id   uuid primary key references public.entries(id) on delete cascade,
  comp_id    uuid not null references public.comps(id) on delete cascade,
  coach_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  path       text not null,
  name       text not null default '',
  size       integer not null default 0 check (size <= 10485760),
  mime       text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists entry_music_comp on public.entry_music(comp_id);
alter table public.entry_music enable row level security;
drop policy if exists p_mus_sel on public.entry_music;
create policy p_mus_sel on public.entry_music for select to authenticated using (coach_id = auth.uid() or public.is_admin());
drop policy if exists p_mus_ins on public.entry_music;
create policy p_mus_ins on public.entry_music for insert to authenticated
  with check (public.music_entry_ok(entry_id) and public.music_open(comp_id) and (coach_id = auth.uid() or public.is_admin()));
drop policy if exists p_mus_upd on public.entry_music;
create policy p_mus_upd on public.entry_music for update to authenticated
  using ((coach_id = auth.uid() or public.is_admin()) and public.music_open(comp_id))
  with check (public.music_entry_ok(entry_id) and public.music_open(comp_id));
drop policy if exists p_mus_del on public.entry_music;
create policy p_mus_del on public.entry_music for delete to authenticated
  using (public.is_admin() or (coach_id = auth.uid() and public.music_open(comp_id)));
grant select, insert, update, delete on public.entry_music to authenticated;

-- 3) 음원 저장소 (비공개 · 한 곡 10MB · 음악 파일만). 파일 자리: 대회번호/접수번호/파일
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('comp-music', 'comp-music', false, 10485760,
            array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/aac','audio/wav','audio/x-wav','audio/wave','audio/ogg','audio/webm','audio/flac','audio/x-flac'])
    on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;
  execute 'drop policy if exists p_mus_obj_sel on storage.objects';
  execute $p$create policy p_mus_obj_sel on storage.objects for select to authenticated using (bucket_id = 'comp-music' and (public.is_admin() or public.music_obj_ok(name, false)))$p$;
  execute 'drop policy if exists p_mus_obj_ins on storage.objects';
  execute $p$create policy p_mus_obj_ins on storage.objects for insert to authenticated with check (bucket_id = 'comp-music' and public.music_obj_ok(name, true))$p$;
  execute 'drop policy if exists p_mus_obj_upd on storage.objects';
  execute $p$create policy p_mus_obj_upd on storage.objects for update to authenticated using (bucket_id = 'comp-music' and public.music_obj_ok(name, true))$p$;
  execute 'drop policy if exists p_mus_obj_del on storage.objects';
  execute $p$create policy p_mus_obj_del on storage.objects for delete to authenticated using (bucket_id = 'comp-music' and (public.is_admin() or public.music_obj_ok(name, true)))$p$;
exception when others then
  raise notice '음원 저장소를 만들지 못했습니다 (%). Storage 메뉴에서 comp-music 버킷을 확인해 주세요', sqlerrm;
end $$;

-- 4) 경기 앱이 명단을 가져올 때 음원 정보도 함께 (접수 번호 · 파일 자리 · 파일 이름)
create or replace function public.get_roster(p_comp uuid, p_sport text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '대회 본부(관리자) 계정만 명단을 가져올 수 있습니다';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'f', e.f, 'status', e.status, 'fee', e.fee, 'at', e.created_at,
      'music', (select jsonb_build_object('path', m.path, 'name', m.name, 'size', m.size) from public.entry_music m where m.entry_id = e.id),
      'coach', jsonb_build_object('name', p.name, 'org', p.org, 'phone', p.phone, 'country', p.country),
      'athletes', (select coalesce(jsonb_agg(jsonb_build_object('name', a.name, 'gender', a.gender, 'org', a.org,
                     'birth', a.birth, 'weight', a.weight, 'height', a.height,
                     'country', coalesce(nullif(a.country, ''), p.country, 'KOR'), 'name_en', a.name_en) order by k.ord), '[]'::jsonb)
                   from unnest(e.athlete_ids) with ordinality as k(id, ord) join public.athletes a on a.id = k.id)
    ) order by e.created_at)
    from public.entries e left join public.profiles p on p.id = e.coach_id
    where e.comp_id = p_comp and e.sport = p_sport and e.status <> 'cancel'), '[]'::jsonb);
end $$;
revoke execute on function public.get_roster(uuid, text) from public, anon;
grant execute on function public.get_roster(uuid, text) to authenticated;
