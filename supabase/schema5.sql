-- KICKSTART UP 5단계: 국제 대회 (나라 코드 · 영문 이름)
-- 지도자 나라 · 선수 나라와 영문 이름 · 결과에 나라와 영문 이름
alter table public.profiles add column if not exists country text not null default 'KOR';
alter table public.athletes add column if not exists country text not null default '';
alter table public.athletes add column if not exists name_en text not null default '';
alter table public.results add column if not exists nat text not null default '';
alter table public.results add column if not exists name_en text not null default '';

-- 가입할 때 고른 나라도 저장
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, org, phone, email, license, country)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name',''),
          coalesce(new.raw_user_meta_data->>'org',''),
          coalesce(new.raw_user_meta_data->>'phone',''),
          coalesce(new.email,''),
          coalesce(new.raw_user_meta_data->>'license',''),
          coalesce(nullif(upper(new.raw_user_meta_data->>'country'),''),'KOR'))
  on conflict (id) do nothing;
  return new;
end $$;

-- 대회 앱으로 보내는 명단에 나라 · 영문 이름
create or replace function public.get_roster(p_comp uuid, p_sport text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception '대회 본부(관리자) 계정만 명단을 가져올 수 있습니다';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'f', e.f, 'status', e.status, 'fee', e.fee, 'at', e.created_at,
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

-- 결과를 받을 때 선수의 나라 · 영문 이름도 붙임
create or replace function public.publish_results(p_comp uuid, p_sport text, p_rows jsonb, p_meta jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; cid uuid; nm text; tm text; nat text; nen text; n int := 0; m int := 0;
begin
  if not public.is_admin() then raise exception '대회 본부(관리자) 계정만 결과를 보낼 수 있습니다'; end if;
  if not exists (select 1 from public.comps where id = p_comp) then raise exception '대회를 찾지 못했습니다'; end if;
  delete from public.results where comp_id = p_comp and sport = p_sport;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    nm := trim(split_part(coalesce(r->>'name', ''), ',', 1));
    tm := trim(regexp_replace(coalesce(nullif(r->>'team', ''), case when r->>'kind' = 'team' then r->>'name' end, ''), '\s*팀$', ''));
    cid := null; nat := ''; nen := '';
    if coalesce(r->>'kind', 'medal') = 'medal' then
      select e.coach_id, coalesce(nullif(a.country, ''), p.country, ''), a.name_en into cid, nat, nen
        from public.entries e join public.athletes a on a.id = any(e.athlete_ids) join public.profiles p on p.id = e.coach_id
       where e.comp_id = p_comp and e.sport = p_sport and e.status <> 'cancel' and a.name = nm
       order by (a.org = tm or p.org = tm) desc, e.created_at
       limit 1;
      if position(',' in coalesce(r->>'name', '')) > 0 then nen := ''; end if;
    end if;
    if cid is null and tm <> '' then
      select case when count(*) = 1 then (array_agg(id))[1] end into cid from public.profiles where org = tm and role = 'coach';
    end if;
    if coalesce(nat, '') = '' and cid is not null then select coalesce(country, '') into nat from public.profiles where id = cid; end if;
    insert into public.results (comp_id, sport, kind, div, rank, name, team, coach, members, coach_id, nat, name_en)
    values (p_comp, p_sport, coalesce(r->>'kind', 'medal'), coalesce(r->>'div', ''), coalesce((r->>'rank')::int, 0),
            coalesce(r->>'name', ''), coalesce(r->>'team', ''), coalesce(r->>'coach', ''), coalesce(r->>'members', ''), cid,
            coalesce(nullif(upper(r->>'nat'), ''), nat, ''), coalesce(nullif(r->>'name_en', ''), nen, ''));
    n := n + 1; if cid is not null then m := m + 1; end if;
  end loop;
  if p_meta is not null and p_meta <> '{}'::jsonb then
    update public.comps set cert = cert || p_meta where id = p_comp;
  end if;
  return jsonb_build_object('rows', n, 'matched', m);
end $$;
revoke execute on function public.publish_results(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.publish_results(uuid, text, jsonb, jsonb) to authenticated;
