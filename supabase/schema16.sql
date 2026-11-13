-- KICKSTART UP 16단계 (v1.7.3): 「대회 설계」에서 종목마다 접수비를 따로 정합니다.
--   태권체조·팀 경연 접수비를 품새와 다르게 받을 수 있습니다 (fee.gymFee · fee.team100Fee).
--   15단계(지도자 고치기)는 그대로 들어 있습니다.
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만). 이미 있는 접수 자료는 그대로입니다.

create or replace function public.check_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare dl date; n int; fe jsonb;
begin
  if auth.uid() is null or public.is_ops() then return new; end if;
  if tg_op = 'INSERT' then
    select deadline, fee into dl, fe from public.comps where id = new.comp_id;
    if dl is null or dl < (now() at time zone 'Asia/Seoul')::date then
      raise exception '접수가 마감된 대회입니다';
    end if;
    select count(*) into n from public.athletes where id = any(new.athlete_ids) and coach_id = new.coach_id;
    if n <> coalesce(array_length(new.athlete_ids,1),0) then
      raise exception '내 선수만 접수할 수 있습니다';
    end if;
    new.status := 'wait';
    new.fee := coalesce(
      case when new.sport = 'poomsae' and new.f->>'type' = '태권체조' and fe ? 'gymFee' then (fe->>'gymFee')::int
           when new.sport = 'poomsae' and new.f->>'type' = '팀대항 종합경연' and fe ? 'team100Fee' then (fe->>'team100Fee')::int
      end,
      (fe->>new.sport)::int, 0);
    return new;
  end if;
  -- 고치기 · 취소 (지도자)
  if new.fee <> old.fee or new.comp_id <> old.comp_id or new.coach_id <> old.coach_id or new.sport <> old.sport then
    raise exception '참가비·대회·종목은 바꿀 수 없습니다 · 대회 본부에 문의해 주세요';
  end if;
  if new.status is distinct from old.status then
    if not (new.status = 'cancel' and old.status = 'wait') then
      raise exception '입금 확인 전 접수만 취소할 수 있습니다';
    end if;
    if new.f is distinct from old.f or new.athlete_ids is distinct from old.athlete_ids then
      raise exception '취소와 고치기는 따로 해 주세요';
    end if;
    return new;
  end if;
  if old.status = 'cancel' then
    raise exception '취소한 접수는 고칠 수 없습니다';
  end if;
  select deadline into dl from public.comps where id = new.comp_id;
  if dl is null or dl < (now() at time zone 'Asia/Seoul')::date then
    raise exception '접수가 마감되어 고칠 수 없습니다 · 대회 본부에 문의해 주세요';
  end if;
  select count(*) into n from public.athletes where id = any(new.athlete_ids) and coach_id = new.coach_id;
  if coalesce(array_length(new.athlete_ids,1),0) = 0 or n <> array_length(new.athlete_ids,1) then
    raise exception '내 선수만 넣을 수 있습니다';
  end if;
  new.f := (coalesce(new.f,'{}'::jsonb) - 'ageAdm')
           || case when old.f ? 'ageAdm' then jsonb_build_object('ageAdm', old.f->'ageAdm') else '{}'::jsonb end;
  return new;
end $$;
