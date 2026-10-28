-- PlayerSmart multi-organization foundation. No real player records are seeded.
-- Apply to a dedicated Supabase project using Supabase CLI after reviewing this migration.
begin;

create extension if not exists pgcrypto;

create type public.organization_role as enum ('org_admin', 'commissioner', 'coach');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null,
  name text not null check (length(name) between 1 and 100),
  division text not null check (length(division) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, season_id, id),
  unique (organization_id, season_id, name),
  foreign key (organization_id, season_id) references public.seasons(organization_id, id) on delete cascade
);

create table public.team_coaches (
  organization_id uuid not null,
  team_id uuid not null,
  coach_user_id uuid not null,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  primary key (team_id, coach_user_id),
  foreign key (organization_id, team_id) references public.teams(organization_id, id) on delete cascade,
  foreign key (organization_id, coach_user_id) references public.organization_memberships(organization_id, user_id) on delete cascade
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null,
  team_id uuid,
  display_name text not null check (length(display_name) between 1 and 120),
  player_number text check (player_number is null or length(player_number) <= 16),
  division text not null check (length(division) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, season_id, id),
  foreign key (organization_id, season_id) references public.seasons(organization_id, id) on delete cascade,
  foreign key (organization_id, team_id) references public.teams(organization_id, id) on delete restrict
);

-- A jersey belongs to a roster assignment for one season; player_number remains
-- the evaluation/reference number and is deliberately not reused as the jersey field.
create table public.season_roster_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  season_id uuid not null,
  team_id uuid not null,
  player_id uuid not null,
  jersey_number text check (jersey_number is null or jersey_number ~ '^[0-9]{1,2}$'),
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, season_id, player_id),
  unique (organization_id, season_id, team_id, jersey_number),
  foreign key (organization_id, season_id, team_id) references public.teams(organization_id, season_id, id) on delete cascade,
  foreign key (organization_id, season_id, player_id) references public.players(organization_id, season_id, id) on delete cascade
);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public;
create trigger season_roster_assignments_touch_updated_at
  before update on public.season_roster_assignments
  for each row execute function public.set_updated_at();

create table public.evaluation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null,
  name text not null check (length(name) between 1 and 160),
  division text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'finalized')),
  rubric jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, season_id) references public.seasons(organization_id, id) on delete cascade
);

create table public.event_evaluators (
  organization_id uuid not null,
  event_id uuid not null,
  evaluator_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_id, evaluator_user_id),
  foreign key (organization_id, event_id) references public.evaluation_events(organization_id, id) on delete cascade,
  foreign key (organization_id, evaluator_user_id) references public.organization_memberships(organization_id, user_id) on delete cascade
);

create table public.event_players (
  organization_id uuid not null,
  event_id uuid not null,
  player_id uuid not null,
  primary key (event_id, player_id),
  foreign key (organization_id, event_id) references public.evaluation_events(organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references public.players(organization_id, id) on delete cascade
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  player_id uuid not null,
  evaluator_user_id uuid not null,
  notes text check (notes is null or length(notes) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id, evaluator_user_id),
  unique (organization_id, id),
  foreign key (organization_id, event_id) references public.evaluation_events(organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references public.players(organization_id, id) on delete cascade,
  foreign key (organization_id, evaluator_user_id) references public.organization_memberships(organization_id, user_id) on delete restrict
);

create table public.evaluation_scores (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  category_id text not null check (length(category_id) between 1 and 80),
  score smallint not null check (score between 1 and 10),
  primary key (evaluation_id, category_id)
);

-- SECURITY DEFINER helpers avoid recursive membership RLS. They only answer scoped
-- membership/assignment checks; platform operators are intentionally not a bypass.
create function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_org and m.user_id = (select auth.uid()) and m.active
  );
$$;

create function public.is_org_manager(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_org and m.user_id = (select auth.uid()) and m.active
      and m.role in ('org_admin', 'commissioner')
  );
$$;

create function public.is_assigned_coach(target_org uuid, target_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_coaches tc
    join public.organization_memberships m on m.organization_id = tc.organization_id and m.user_id = tc.coach_user_id and m.active
    where tc.organization_id = target_org and tc.team_id = target_team
      and tc.coach_user_id = (select auth.uid()) and tc.active
  );
$$;

create function public.is_event_evaluator(target_org uuid, target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_evaluators ee
    join public.organization_memberships m on m.organization_id = ee.organization_id and m.user_id = ee.evaluator_user_id and m.active
    where ee.organization_id = target_org and ee.event_id = target_event
      and ee.evaluator_user_id = (select auth.uid())
  );
$$;

create function public.is_event_player(target_org uuid, target_event uuid, target_player uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.event_players ep
    where ep.organization_id = target_org and ep.event_id = target_event and ep.player_id = target_player
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_manager(uuid) from public;
revoke all on function public.is_assigned_coach(uuid, uuid) from public;
revoke all on function public.is_event_evaluator(uuid, uuid) from public;
revoke all on function public.is_event_player(uuid, uuid, uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.is_assigned_coach(uuid, uuid) to authenticated;
grant execute on function public.is_event_evaluator(uuid, uuid) to authenticated;
grant execute on function public.is_event_player(uuid, uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.team_coaches enable row level security;
alter table public.players enable row level security;
alter table public.season_roster_assignments enable row level security;
alter table public.evaluation_events enable row level security;
alter table public.event_evaluators enable row level security;
alter table public.event_players enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "members read own organizations" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "members read organization membership" on public.organization_memberships for select to authenticated using (user_id = (select auth.uid()) or public.is_org_manager(organization_id));
-- No browser role may grant/revoke organization roles. Use an audited server-side
-- provisioning operation with explicit organization approval.

create policy "members read seasons" on public.seasons for select to authenticated using (public.is_org_member(organization_id));
create policy "managers manage seasons" on public.seasons for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy "members read teams" on public.teams for select to authenticated using (public.is_org_member(organization_id));
create policy "managers manage teams" on public.teams for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy "members read coach assignments" on public.team_coaches for select to authenticated using (public.is_org_member(organization_id));
create policy "managers manage coach assignments" on public.team_coaches for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

create policy "managers read all players coaches read assigned roster" on public.players for select to authenticated
  using (public.is_org_manager(organization_id) or (team_id is not null and public.is_assigned_coach(organization_id, team_id)));
create policy "managers manage players" on public.players for all to authenticated
  using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

create policy "managers and assigned coaches read season jersey assignments" on public.season_roster_assignments for select to authenticated
  using (public.is_org_manager(organization_id) or public.is_assigned_coach(organization_id, team_id));
create policy "managers or assigned team coaches create season jersey assignments" on public.season_roster_assignments for insert to authenticated
  with check (public.is_org_manager(organization_id) or (
    public.is_assigned_coach(organization_id, team_id) and exists (
      select 1 from public.players p where p.organization_id = season_roster_assignments.organization_id and p.season_id = season_roster_assignments.season_id and p.id = season_roster_assignments.player_id and p.team_id = season_roster_assignments.team_id
    )
  ));
create policy "managers or assigned team coaches update season jersey assignments" on public.season_roster_assignments for update to authenticated
  using (public.is_org_manager(organization_id) or (
    public.is_assigned_coach(organization_id, team_id) and exists (
      select 1 from public.players p where p.organization_id = season_roster_assignments.organization_id and p.season_id = season_roster_assignments.season_id and p.id = season_roster_assignments.player_id and p.team_id = season_roster_assignments.team_id
    )
  )) with check (public.is_org_manager(organization_id) or (
    public.is_assigned_coach(organization_id, team_id) and exists (
      select 1 from public.players p where p.organization_id = season_roster_assignments.organization_id and p.season_id = season_roster_assignments.season_id and p.id = season_roster_assignments.player_id and p.team_id = season_roster_assignments.team_id
    )
  ));
create policy "managers or assigned team coaches delete season jersey assignments" on public.season_roster_assignments for delete to authenticated
  using (public.is_org_manager(organization_id) or (
    public.is_assigned_coach(organization_id, team_id) and exists (
      select 1 from public.players p where p.organization_id = season_roster_assignments.organization_id and p.season_id = season_roster_assignments.season_id and p.id = season_roster_assignments.player_id and p.team_id = season_roster_assignments.team_id
    )
  ));

create policy "members read evaluation events" on public.evaluation_events for select to authenticated using (public.is_org_member(organization_id));
create policy "managers manage evaluation events" on public.evaluation_events for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy "members read event evaluator assignments" on public.event_evaluators for select to authenticated using (public.is_org_member(organization_id));
create policy "managers manage event evaluator assignments" on public.event_evaluators for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy "members read event players" on public.event_players for select to authenticated using (public.is_org_member(organization_id));
create policy "managers manage event players" on public.event_players for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

create policy "evaluators and managers read evaluations" on public.evaluations for select to authenticated
  using (public.is_org_manager(organization_id) or (evaluator_user_id = (select auth.uid()) and public.is_org_member(organization_id)));
create policy "assigned evaluators create own evaluation" on public.evaluations for insert to authenticated
  with check (evaluator_user_id = (select auth.uid()) and public.is_org_member(organization_id) and public.is_event_evaluator(organization_id, event_id) and public.is_event_player(organization_id, event_id, player_id));
create policy "evaluators edit own evaluation managers edit all" on public.evaluations for update to authenticated
  using (public.is_org_manager(organization_id) or (evaluator_user_id = (select auth.uid()) and public.is_org_member(organization_id) and public.is_event_evaluator(organization_id, event_id)))
  with check (public.is_org_manager(organization_id) or (evaluator_user_id = (select auth.uid()) and public.is_org_member(organization_id) and public.is_event_evaluator(organization_id, event_id) and public.is_event_player(organization_id, event_id, player_id)));
create policy "managers delete evaluations" on public.evaluations for delete to authenticated using (public.is_org_manager(organization_id));

create policy "score owner and managers read ratings" on public.evaluation_scores for select to authenticated using (
  exists (select 1 from public.evaluations e where e.id = evaluation_id and (e.evaluator_user_id = (select auth.uid()) or public.is_org_manager(e.organization_id)))
);
create policy "score owner and managers insert ratings" on public.evaluation_scores for insert to authenticated with check (
  exists (select 1 from public.evaluations e where e.id = evaluation_id and (e.evaluator_user_id = (select auth.uid()) or public.is_org_manager(e.organization_id)))
);
create policy "score owner and managers update ratings" on public.evaluation_scores for update to authenticated using (
  exists (select 1 from public.evaluations e where e.id = evaluation_id and (e.evaluator_user_id = (select auth.uid()) or public.is_org_manager(e.organization_id)))
) with check (
  exists (select 1 from public.evaluations e where e.id = evaluation_id and (e.evaluator_user_id = (select auth.uid()) or public.is_org_manager(e.organization_id)))
);
create policy "score owner and managers delete ratings" on public.evaluation_scores for delete to authenticated using (
  exists (select 1 from public.evaluations e where e.id = evaluation_id and (e.evaluator_user_id = (select auth.uid()) or public.is_org_manager(e.organization_id)))
);

-- RLS is not a substitute for grants; expose only the intended browser operations.
grant select on public.profiles, public.organizations, public.organization_memberships,
  public.seasons, public.teams, public.team_coaches, public.players,
  public.season_roster_assignments,
  public.evaluation_events, public.event_evaluators, public.event_players, public.evaluations, public.evaluation_scores to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on public.seasons, public.teams,
  public.team_coaches, public.players, public.season_roster_assignments, public.evaluation_events, public.event_evaluators,
  public.event_players, public.evaluations, public.evaluation_scores to authenticated;

commit;
