-- KICKSTART UP 접수 홈페이지 2단계: 대회 고치기·공지·요강, 비밀번호 도움, 대회 앱 명단 가져오기
alter table public.comps add column if not exists notice text not null default '';
alter table public.comps add column if not exists doc_url text not null default '';
alter table public.comps add column if not exists doc_name text not null default '';
alter table public.comps add column if not exists contact text not null default '';

create or replace function public.get_roster(p_comp uuid, p_sport text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '대회 본부(관리자) 계정만 명단을 가져올 수 있습니다';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'f', e.f, 'status', e.status, 'fee', e.fee, 'at', e.created_at,
      'coach', jsonb_build_object('name', p.name, 'org', p.org, 'phone', p.phone),
      'athletes', (select coalesce(jsonb_agg(jsonb_build_object('name', a.name, 'gender', a.gender, 'org', a.org,
                     'birth', a.birth, 'weight', a.weight, 'height', a.height) order by k.ord), '[]'::jsonb)
                   from unnest(e.athlete_ids) with ordinality as k(id, ord) join public.athletes a on a.id = k.id)
    ) order by e.created_at)
    from public.entries e left join public.profiles p on p.id = e.coach_id
    where e.comp_id = p_comp and e.sport = p_sport and e.status <> 'cancel'), '[]'::jsonb);
end $$;
revoke execute on function public.get_roster(uuid, text) from public, anon;
grant execute on function public.get_roster(uuid, text) to authenticated;

create or replace function public.admin_set_password(p_user uuid, p_pw text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception '관리자만 할 수 있습니다'; end if;
  if length(coalesce(p_pw, '')) < 6 then raise exception '비밀번호는 6자 이상으로 해 주세요'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_pw, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now())
   where id = p_user;
end $$;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

do $$
begin
  insert into storage.buckets (id, name, public) values ('comp-docs', 'comp-docs', true)
    on conflict (id) do update set public = true;
  execute 'drop policy if exists p_docs_read on storage.objects';
  execute 'create policy p_docs_read on storage.objects for select to anon, authenticated using (bucket_id = ''comp-docs'')';
  execute 'drop policy if exists p_docs_ins on storage.objects';
  execute 'create policy p_docs_ins on storage.objects for insert to authenticated with check (bucket_id = ''comp-docs'' and public.is_admin())';
  execute 'drop policy if exists p_docs_upd on storage.objects';
  execute 'create policy p_docs_upd on storage.objects for update to authenticated using (bucket_id = ''comp-docs'' and public.is_admin())';
  execute 'drop policy if exists p_docs_del on storage.objects';
  execute 'create policy p_docs_del on storage.objects for delete to authenticated using (bucket_id = ''comp-docs'' and public.is_admin())';
exception when others then
  raise notice '요강 파일 저장소를 만들지 못했습니다 (%). 요강은 링크로 넣어 주세요', sqlerrm;
end $$;
