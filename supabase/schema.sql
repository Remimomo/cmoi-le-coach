create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  readiness jsonb not null default '{}'::jsonb,
  garmin_data jsonb not null default '{}'::jsonb,
  planner jsonb not null default '{}'::jsonb,
  current_program jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  memory jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_data enable row level security;

drop policy if exists "Users can read own app data" on public.user_app_data;
create policy "Users can read own app data"
on public.user_app_data
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own app data" on public.user_app_data;
create policy "Users can insert own app data"
on public.user_app_data
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own app data" on public.user_app_data;
create policy "Users can update own app data"
on public.user_app_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_user_app_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_app_data_updated_at on public.user_app_data;
create trigger set_user_app_data_updated_at
before update on public.user_app_data
for each row
execute function public.set_user_app_data_updated_at();
