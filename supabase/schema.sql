create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  readiness jsonb not null default '{}'::jsonb,
  garmin_data jsonb not null default '{}'::jsonb,
  planner jsonb not null default '{}'::jsonb,
  current_program jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  memory jsonb not null default '{}'::jsonb,
  strava_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_data
add column if not exists strava_data jsonb not null default '{}'::jsonb;

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

-- Enterprise challenge module
-- Collective participation index formula:
-- 40% active participation rate + 40% monthly goal completion + 20% regularity.
-- This compares companies without rewarding only the biggest teams.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_goal integer not null default 500,
  public_leaderboard boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique(company_id, user_id)
);

create table if not exists public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null unique,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_points (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('strava', 'manual')),
  source_activity_id text,
  activity_type text not null default 'activité',
  minutes integer not null default 0,
  distance_km numeric not null default 0,
  points integer not null default 0,
  activity_date timestamptz not null default now(),
  validation_log jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists activity_points_unique_strava
on public.activity_points(source, source_activity_id)
where source = 'strava' and source_activity_id is not null;

create unique index if not exists activity_points_unique_manual_source
on public.activity_points(source, source_activity_id)
where source = 'manual' and source_activity_id is not null;

create unique index if not exists activity_points_unique_manual_day
on public.activity_points(user_id, source, activity_type, activity_date)
where source = 'manual';

create table if not exists public.monthly_company_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  month text not null,
  active_participants integer not null default 0,
  total_members integer not null default 0,
  collective_score integer not null default 0,
  participation_rate integer not null default 0,
  participation_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, month)
);

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  month text not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique(company_id, month)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.activity_points enable row level security;
alter table public.monthly_company_scores enable row level security;
alter table public.monthly_reports enable row level security;

drop policy if exists "Members can read own company" on public.companies;
create policy "Members can read own company"
on public.companies for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = companies.id and cm.user_id = auth.uid() and cm.active
  )
);

drop policy if exists "Members can read own membership" on public.company_members;
create policy "Members can read own membership"
on public.company_members for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Members can update own active membership" on public.company_members;
create policy "Members can update own active membership"
on public.company_members for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read own points" on public.activity_points;
create policy "Users can read own points"
on public.activity_points for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read aggregate monthly scores" on public.monthly_company_scores;
create policy "Admins can read aggregate monthly scores"
on public.monthly_company_scores for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = monthly_company_scores.company_id
      and cm.user_id = auth.uid()
      and cm.active
      and cm.role = 'admin'
  )
);

drop policy if exists "Admins can read monthly reports" on public.monthly_reports;
create policy "Admins can read monthly reports"
on public.monthly_reports for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = monthly_reports.company_id
      and cm.user_id = auth.uid()
      and cm.active
      and cm.role = 'admin'
  )
);

create or replace function public.current_month_key()
returns text as $$
  select to_char(now(), 'YYYY-MM');
$$ language sql stable;

create or replace function public.get_active_company_member()
returns table(company_id uuid, role text)
security definer
set search_path = public
as $$
  select cm.company_id, cm.role
  from public.company_members cm
  where cm.user_id = auth.uid() and cm.active
  order by cm.joined_at desc
  limit 1;
$$ language sql;

create or replace function public.compute_company_participation_index(target_company_id uuid, target_month text)
returns integer
security definer
set search_path = public
as $$
declare
  total_members integer;
  active_participants integer;
  collective_points integer;
  goal_points integer;
  active_weeks integer;
  elapsed_weeks integer;
  participation_rate numeric;
  goal_rate numeric;
  regularity_rate numeric;
begin
  select count(*) into total_members
  from public.company_members
  where company_id = target_company_id and active;

  select count(distinct user_id), coalesce(sum(points), 0)
  into active_participants, collective_points
  from public.activity_points
  where company_id = target_company_id
    and to_char(activity_date, 'YYYY-MM') = target_month;

  select monthly_goal into goal_points
  from public.companies
  where id = target_company_id;

  select count(distinct extract(week from activity_date)) into active_weeks
  from public.activity_points
  where company_id = target_company_id
    and to_char(activity_date, 'YYYY-MM') = target_month;

  elapsed_weeks := greatest(1, extract(day from now())::integer / 7 + 1);
  participation_rate := case when total_members = 0 then 0 else active_participants::numeric / total_members end;
  goal_rate := least(1, collective_points::numeric / greatest(1, goal_points));
  regularity_rate := least(1, active_weeks::numeric / elapsed_weeks);

  return round(participation_rate * 40 + goal_rate * 40 + regularity_rate * 20)::integer;
end;
$$ language plpgsql;

create or replace function public.get_company_challenge_dashboard()
returns jsonb
security definer
set search_path = public
as $$
declare
  member_record record;
  month_key text := public.current_month_key();
  personal_score integer := 0;
  collective_score integer := 0;
  active_participants integer := 0;
  goal_points integer := 0;
  company_name text;
  index_score integer := 0;
begin
  select * into member_record from public.get_active_company_member();

  if member_record.company_id is null then
    return jsonb_build_object(
      'member', null,
      'month', month_key,
      'personalScore', 0,
      'collectiveScore', 0,
      'monthlyGoal', 0,
      'activeParticipants', 0,
      'participationIndex', 0,
      'message', 'Entre ton code entreprise pour rejoindre un challenge collectif.'
    );
  end if;

  select name, monthly_goal into company_name, goal_points
  from public.companies
  where id = member_record.company_id;

  select coalesce(sum(points), 0) into personal_score
  from public.activity_points
  where company_id = member_record.company_id
    and user_id = auth.uid()
    and to_char(activity_date, 'YYYY-MM') = month_key;

  select coalesce(sum(points), 0), count(distinct user_id)
  into collective_score, active_participants
  from public.activity_points
  where company_id = member_record.company_id
    and to_char(activity_date, 'YYYY-MM') = month_key;

  index_score := public.compute_company_participation_index(member_record.company_id, month_key);

  return jsonb_build_object(
    'member', jsonb_build_object('companyId', member_record.company_id, 'companyName', company_name, 'role', member_record.role),
    'month', month_key,
    'personalScore', personal_score,
    'collectiveScore', collective_score,
    'monthlyGoal', goal_points,
    'activeParticipants', active_participants,
    'participationIndex', index_score,
    'message', 'Tu as déjà apporté ' || personal_score || ' points au collectif ce mois-ci. Chaque séance compte, même courte.'
  );
end;
$$ language plpgsql;

create or replace function public.join_company_by_code(invite_code text)
returns jsonb
security definer
set search_path = public
as $$
declare
  invitation record;
begin
  select * into invitation
  from public.invitation_codes
  where upper(code) = upper(invite_code)
    and active
    and (expires_at is null or expires_at > now())
  limit 1;

  if invitation.id is null then
    raise exception 'Code entreprise invalide ou expiré.';
  end if;

  update public.company_members
  set active = false, left_at = now()
  where user_id = auth.uid() and active;

  insert into public.company_members(company_id, user_id, role, active, joined_at, left_at)
  values(invitation.company_id, auth.uid(), invitation.role, true, now(), null)
  on conflict(company_id, user_id)
  do update set active = true, role = excluded.role, joined_at = now(), left_at = null;

  return public.get_company_challenge_dashboard();
end;
$$ language plpgsql;

create or replace function public.leave_current_company()
returns jsonb
security definer
set search_path = public
as $$
begin
  update public.company_members
  set active = false, left_at = now()
  where user_id = auth.uid() and active;

  return jsonb_build_object('left', true);
end;
$$ language plpgsql;

create or replace function public.add_activity_points(
  point_source text,
  source_id text,
  activity_type text,
  moving_minutes integer,
  distance_km numeric,
  activity_date timestamptz
)
returns jsonb
security definer
set search_path = public
as $$
declare
  member_record record;
  week_start timestamptz := date_trunc('week', activity_date);
  weekly_points integer := 0;
  weekly_manual_count integer := 0;
  raw_points integer := 0;
  final_points integer := 0;
  weekly_cap integer := 120;
  manual_weekly_limit integer := 3;
begin
  select * into member_record from public.get_active_company_member();
  if member_record.company_id is null then
    raise exception 'Aucune entreprise active.';
  end if;

  if point_source = 'strava' and source_id is not null and exists (
    select 1 from public.activity_points where source = 'strava' and source_activity_id = source_id
  ) then
    return jsonb_build_object('counted', false, 'reason', 'Séance Strava déjà comptabilisée.');
  end if;

  select coalesce(sum(points), 0) into weekly_points
  from public.activity_points
  where user_id = auth.uid()
    and company_id = member_record.company_id
    and activity_date >= week_start
    and activity_date < week_start + interval '7 days';

  if weekly_points >= weekly_cap then
    return jsonb_build_object('counted', false, 'reason', 'Plafond hebdomadaire atteint.');
  end if;

  if point_source = 'manual' then
    select count(*) into weekly_manual_count
    from public.activity_points
    where user_id = auth.uid()
      and company_id = member_record.company_id
      and source = 'manual'
      and activity_date >= week_start
      and activity_date < week_start + interval '7 days';

    if weekly_manual_count >= manual_weekly_limit then
      return jsonb_build_object('counted', false, 'reason', 'Limite de déclarations manuelles atteinte cette semaine.');
    end if;
  end if;

  raw_points := greatest(5, least(40, ceil(greatest(10, moving_minutes)::numeric / 10) * 5))::integer;
  if point_source = 'manual' then
    raw_points := ceil(raw_points * 0.5)::integer;
  end if;

  final_points := least(raw_points, weekly_cap - weekly_points);

  insert into public.activity_points(
    company_id, user_id, source, source_activity_id, activity_type, minutes, distance_km, points, activity_date, validation_log
  )
  values(
    member_record.company_id,
    auth.uid(),
    point_source,
    source_id,
    activity_type,
    moving_minutes,
    distance_km,
    final_points,
    activity_date,
    jsonb_build_object(
      'source', point_source,
      'rawPoints', raw_points,
      'finalPoints', final_points,
      'weeklyPointsBefore', weekly_points,
      'manualDeclarationsBefore', weekly_manual_count,
      'validatedAt', now()
    )
  )
  on conflict do nothing;

  return jsonb_build_object('counted', true, 'points', final_points);
end;
$$ language plpgsql;

create or replace function public.validate_strava_activity_points(
  strava_activity_id text,
  activity_type text,
  moving_minutes integer,
  distance_km numeric,
  activity_date timestamptz
)
returns jsonb
security definer
set search_path = public
as $$
begin
  return public.add_activity_points('strava', strava_activity_id, activity_type, moving_minutes, distance_km, activity_date);
end;
$$ language plpgsql;

create or replace function public.declare_manual_activity_points(
  activity_type text,
  minutes integer,
  activity_date timestamptz
)
returns jsonb
security definer
set search_path = public
as $$
begin
  return public.add_activity_points('manual', 'manual-' || auth.uid() || '-' || activity_type || '-' || date_trunc('day', activity_date)::text, activity_type, minutes, 0, activity_date);
end;
$$ language plpgsql;

create or replace function public.refresh_monthly_company_score(target_company_id uuid, target_month text)
returns jsonb
security definer
set search_path = public
as $$
declare
  total_members integer;
  active_participants integer;
  collective_points integer;
  participation_rate integer;
  index_score integer;
begin
  select count(*) into total_members
  from public.company_members
  where company_id = target_company_id and active;

  select count(distinct user_id), coalesce(sum(points), 0)
  into active_participants, collective_points
  from public.activity_points
  where company_id = target_company_id
    and to_char(activity_date, 'YYYY-MM') = target_month;

  participation_rate := case when total_members = 0 then 0 else round((active_participants::numeric / total_members) * 100)::integer end;
  index_score := public.compute_company_participation_index(target_company_id, target_month);

  insert into public.monthly_company_scores(company_id, month, active_participants, total_members, collective_score, participation_rate, participation_index, updated_at)
  values(target_company_id, target_month, active_participants, total_members, collective_points, participation_rate, index_score, now())
  on conflict(company_id, month)
  do update set
    active_participants = excluded.active_participants,
    total_members = excluded.total_members,
    collective_score = excluded.collective_score,
    participation_rate = excluded.participation_rate,
    participation_index = excluded.participation_index,
    updated_at = now();

  return jsonb_build_object('updated', true);
end;
$$ language plpgsql;

create or replace function public.get_company_admin_dashboard()
returns jsonb
security definer
set search_path = public
as $$
declare
  member_record record;
  month_key text := public.current_month_key();
  previous_month text := to_char(now() - interval '1 month', 'YYYY-MM');
  company_record record;
  score_record record;
  previous_score integer := 0;
  ranking jsonb;
  latest_report jsonb;
begin
  select * into member_record from public.get_active_company_member();
  if member_record.company_id is null or member_record.role <> 'admin' then
    raise exception 'Accès admin entreprise requis.';
  end if;

  perform public.refresh_monthly_company_score(member_record.company_id, month_key);

  select * into company_record from public.companies where id = member_record.company_id;
  select * into score_record from public.monthly_company_scores where company_id = member_record.company_id and month = month_key;
  select coalesce(collective_score, 0) into previous_score from public.monthly_company_scores where company_id = member_record.company_id and month = previous_month;

  select coalesce(jsonb_agg(item order by (item->>'rank')::integer), '[]'::jsonb) into ranking
  from (
    select jsonb_build_object(
      'rank', row_number() over(order by public.compute_company_participation_index(c.id, month_key) desc),
      'companyName', case when c.public_leaderboard then c.name else 'Entreprise anonymisée' end,
      'participationIndex', public.compute_company_participation_index(c.id, month_key)
    ) as item
    from public.companies c
  ) ranked;

  select jsonb_build_object('month', month, 'content', content, 'createdAt', created_at)
  into latest_report
  from public.monthly_reports
  where company_id = member_record.company_id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'companyName', company_record.name,
    'month', month_key,
    'activeParticipants', coalesce(score_record.active_participants, 0),
    'totalMembers', coalesce(score_record.total_members, 0),
    'monthlyScore', coalesce(score_record.collective_score, 0),
    'previousMonthScore', previous_score,
    'participationRate', coalesce(score_record.participation_rate, 0),
    'participationIndex', coalesce(score_record.participation_index, 0),
    'ranking', ranking,
    'latestReport', latest_report
  );
end;
$$ language plpgsql;

create or replace function public.generate_company_monthly_report()
returns jsonb
security definer
set search_path = public
as $$
declare
  member_record record;
  dashboard jsonb;
  content text;
  month_key text := public.current_month_key();
begin
  select * into member_record from public.get_active_company_member();
  if member_record.company_id is null or member_record.role <> 'admin' then
    raise exception 'Accès admin entreprise requis.';
  end if;

  dashboard := public.get_company_admin_dashboard();
  content :=
    'Bravo à l’équipe, la participation progresse ce mois-ci.' || chr(10) ||
    'Participants actifs : ' || (dashboard->>'activeParticipants') || chr(10) ||
    'Score collectif : ' || (dashboard->>'monthlyScore') || ' points' || chr(10) ||
    'Indice de participation collective : ' || (dashboard->>'participationIndex') || chr(10) ||
    'Objectif simple : bouger régulièrement, chacun à son niveau.';

  insert into public.monthly_reports(company_id, month, content)
  values(member_record.company_id, month_key, content)
  on conflict(company_id, month)
  do update set content = excluded.content, created_at = now();

  return jsonb_build_object('month', month_key, 'content', content);
end;
$$ language plpgsql;
