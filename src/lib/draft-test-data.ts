import { u10Rubric } from './evaluation'

const coachGroups = [
  ['Avery Hill', 'Morgan Reed', 'Sam Patel', 'Casey Young', 'Riley Stone'],
  ['Jordan Blake', 'Taylor Nguyen', 'Alex Murphy', 'Jamie Fox', 'Drew Wilson'],
  ['Coach 1', 'Cameron Scott', 'Reese Cooper', 'Quinn Davis', 'Emery Bell'],
  ['Parker Diaz', 'Hayden Ellis', 'Robin Carter', 'Logan Kim', 'Skyler James'],
  ['Finley Brooks', 'Dakota Miller', 'Adrian Flores', 'Blake Foster', 'Lane Torres'],
  ['Sage Phillips', 'Rowan Hayes', 'Peyton Cruz', 'Harper King', 'Devon Price'],
  ['Bailey Hart', 'Charlie Dean', 'Dallas Quinn', 'Ellis Grant', 'Frankie West'],
]
const firstNames = ['Alex', 'Jamie', 'Jordan', 'Casey', 'Taylor', 'Riley', 'Sam', 'Quinn', 'Avery', 'Drew', 'Emery', 'Finley', 'Hayden', 'Logan', 'Peyton', 'Reese', 'Rowan', 'Skyler', 'Adrian', 'Blake', 'Cameron', 'Dakota', 'Elliot', 'Frankie', 'Harper', 'Jules', 'Kai', 'Lane', 'Micah', 'Nico']
const lastNames = ['Carter', 'Flores', 'Lee', 'Rivera', 'Brooks', 'Morgan', 'Chen', 'Parker', 'James', 'Wilson', 'Stone', 'Reed', 'Blake', 'Ellis', 'Cruz', 'Young', 'Bell', 'Hayes', 'Cooper', 'Scott', 'Miller', 'Allen', 'King', 'Moore', 'Turner', 'Bennett', 'Foster', 'Collins', 'Ramirez', 'Adams']
const colors = ['#2878d0', '#d3a820', '#229653', '#d9333f', '#7738a8']
const teams = ['Blue Comets', 'Gold Eagles', 'Green Strikers', 'Red Rockets', 'Purple Falcons']

/** Local draft practice data. No players start assigned to a coach. */
export function createDraftTestData<D extends string>(divisions: readonly D[], options: { primaryCoach?: string } = {}) {
  const coachNames = Object.fromEntries(divisions.map((division, index) => [division, [...coachGroups[index]]])) as Record<D, string[]>
  const u10 = divisions.find((division) => division === 'U10')
  if (u10 && options.primaryCoach) coachNames[u10][0] = options.primaryCoach
  const teamStaff = Object.fromEntries(divisions.flatMap((division) => coachNames[division].map((coach, index) => [
    `${division}:${coach}`, { headCoach: coach, assistantCoach: '', jerseyColor: colors[index], teamNickname: teams[index] },
  ])))
  const players = divisions.flatMap((division, divisionIndex) => Array.from({ length: 30 }, (_, index) => {
    const reviews = coachNames[division].map((_, coachIndex) => Object.fromEntries(u10Rubric.map(({ id }, skillIndex) => [
      id, Math.min(10, Math.max(1, 5 + (index % 5) + ((skillIndex + coachIndex + divisionIndex) % 3 - 1))),
    ])))
    return {
      id: `draft-test-${divisionIndex}-${index}`, name: `${firstNames[index]} ${lastNames[(index + divisionIndex * 3) % lastNames.length]}`,
      number: String([...lastNames].sort().indexOf(lastNames[(index + divisionIndex * 3) % lastNames.length]) + 1).padStart(2, '0'), team: 'Unassigned', grade: division, assignedCoach: undefined,
      ratings: division === 'U6' ? {} : reviews[0], coachRatings: division === 'U6' ? {} : Object.fromEntries(coachNames[division].slice(1).map((coach, coachIndex) => [coach, reviews[coachIndex + 1]])),
      draftEligible: division !== 'U6', coachChild: '', assistantCoachChild: '', linkedPlayerId: '', linkedPlayerRelationship: '' as const,
      previousSeasonGrade: '' as const, developmentGoals: '', developmentGoalTwo: '', change: 0, status: division === 'U6' ? 'Assigned by Admin' : 'Complete',
    }
  }))
  return { coachNames, teamStaff, players, coachDirectory: Object.values<string[]>(coachNames).flat() }
}
