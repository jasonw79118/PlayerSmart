import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/202610270001_foundation.sql', 'utf8')

describe('database security migration guardrails (static checks only)', () => {
  it('enables RLS for every foundation table', () => {
    for (const table of ['profiles', 'organizations', 'organization_memberships', 'seasons', 'teams', 'team_coaches', 'players', 'season_roster_assignments', 'evaluation_events', 'event_evaluators', 'event_players', 'evaluations', 'evaluation_scores']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it('keeps membership role assignment out of browser grants and limits coach rosters', () => {
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete|all)[^;]*organization_memberships/i)
    expect(migration).toContain('public.is_assigned_coach(organization_id, team_id)')
    expect(migration).toContain('public.is_event_evaluator(organization_id, event_id)')
    expect(migration).toContain('public.is_event_player(organization_id, event_id, player_id)')
  })

  it('scopes related records by organization in composite foreign keys', () => {
    expect(migration).toContain('foreign key (organization_id, season_id) references public.seasons(organization_id, id)')
    expect(migration).toContain('foreign key (organization_id, team_id) references public.teams(organization_id, id)')
    expect(migration).toContain('foreign key (organization_id, player_id) references public.players(organization_id, id)')
  })

  it('stores a new jersey number separately for each season roster assignment', () => {
    expect(migration).toContain('create table public.season_roster_assignments')
    expect(migration).toContain('unique (organization_id, season_id, player_id)')
    expect(migration).toContain('unique (organization_id, season_id, team_id, jersey_number)')
    expect(migration).toContain('jersey_number text check (jersey_number is null or jersey_number ~')
  })
})
