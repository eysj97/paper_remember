-- 종이기억 서버 테이블. Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하면 됩니다.
-- 계정마다 한 줄: 단어장 / 프로필(목표·설정) / 학습 기록을 앱과 같은 모양(JSON)으로 저장합니다.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  wordbook   jsonb not null default '[]'::jsonb,
  profile    jsonb not null default '{}'::jsonb,
  study_log  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at 은 서버 시계로 찍는다 (기기마다 시계가 달라도 어느 쪽이 최신인지 판단할 수 있게)
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before insert or update on public.user_data
  for each row execute function public.touch_updated_at();

-- 행 수준 보안: 로그인한 사람은 자기 줄만 읽고 쓸 수 있다
alter table public.user_data enable row level security;

drop policy if exists "user_data select own" on public.user_data;
create policy "user_data select own" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "user_data insert own" on public.user_data;
create policy "user_data insert own" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_data update own" on public.user_data;
create policy "user_data update own" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_data delete own" on public.user_data;
create policy "user_data delete own" on public.user_data
  for delete using (auth.uid() = user_id);

-- 탈퇴하기: 로그인한 본인 계정을 삭제한다 (user_data 줄도 on delete cascade 로 함께 지워짐).
-- 앱은 계정 삭제 권한이 없어서, 본인 것만 지울 수 있는 이 함수를 대신 부른다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
