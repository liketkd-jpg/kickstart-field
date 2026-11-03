-- KICKSTART UP 7단계: 태권 히어로 (유아 장애물 스피드 경기) 종목 추가
-- Supabase → 「SQL Editor」 → 이 글 전체를 붙여 넣고 「Run」 (한 번만)
-- 대회 · 접수 · 결과에 'hero' 종목을 쓸 수 있게 합니다. 이미 있는 품새·겨루기·격파 자료는 그대로입니다.

alter table public.comps drop constraint if exists comps_sports_ok;
alter table public.comps add constraint comps_sports_ok
  check (sports <@ array['poomsae','kyorugi','gyeokpa','hero']::text[]);

alter table public.entries drop constraint if exists entries_sport_check;
alter table public.entries add constraint entries_sport_check
  check (sport in ('poomsae','kyorugi','gyeokpa','hero'));

alter table public.results drop constraint if exists results_sport_check;
alter table public.results add constraint results_sport_check
  check (sport in ('poomsae','kyorugi','gyeokpa','hero'));
