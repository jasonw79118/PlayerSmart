import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Bell, BookOpenText, CalendarDays, ChevronDown, ClipboardCheck, Eye, FileUp, Goal, LayoutDashboard, LogOut, Maximize2, Menu, Minimize2, Moon, Plus, Search, ShieldCheck, Sparkles, Sun, Users, X, Radio, PenLine, Trophy } from 'lucide-react'
import type { FormEvent } from 'react'
import { calculateWeightedScore, playerLetterGrade, scoringAnchors, u10Rubric } from './lib/evaluation'
import { getNeonAuthToken, neonAuth, neonAuthConfigured } from './lib/neon-auth'
import { pdsaRulesKnowledge } from './lib/pdsa-rules'

type Section = 'Overview' | 'Evaluations' | 'Draft' | 'My Team' | 'Develop' | 'Awards' | 'Announcements' | 'Referee' | 'ScoreBoard' | 'AskRef' | 'Admin'
type Division = 'U8 Boys' | 'U8 Girls' | 'U10' | 'U12' | 'U14' | 'U18'
const DIVISIONS: Division[] = ['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18']
type Player = { id: string; name: string; number: string; team: string; grade: Division; assignedCoach?: string; ratings: Record<string, number>; coachRatings: Record<string, Record<string, number>>; draftEligible: boolean; coachChild: string; assistantCoachChild: string; linkedPlayerId: string; linkedPlayerRelationship: '' | 'Sibling' | 'Friend request' | 'Household' | 'Other'; previousSeasonGrade: '' | 'A' | 'B' | 'C'; developmentGoals: string; developmentGoalTwo?: string; change: number; status: string }
type ScoreGame = { id: string; date: string; time: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; homePlayers: number; awayPlayers: number; homeCoach: string; awayCoach: string; homeColor: string; awayColor: string; referee: string; homeSignatureName: string; awaySignatureName: string; homeSignedAt: string; awaySignedAt: string; homeSigned: boolean; awaySigned: boolean; finalized: boolean }
type PeriodicReview = { id: string; playerId: string; division: Division; date: string; context: string; coach: string; effort: number; teamwork: number; sportsmanship: number; skillApplication: number; feedback: number; encouragement: number; evidence: string }
type TeamStaff = { headCoach: string; assistantCoach: string; jerseyColor: string; teamNickname: string }
type SeasonArchive = { id: string; seasonName: string; archivedAt: string; seasonEndDate: string; players: Player[]; reviews: PeriodicReview[]; coachDirectory: string[]; draftAssignments: Record<string, string> }
type ArchiveAccessLog = { id: string; requestedBy: string; subject: string; reason: string; accessedAt: string }
type Announcement = { id: string; title: string; body: string; attachmentUrl: string; attachmentName?: string; publishedAt: string }
type AdminTab = 'Coaches' | 'Users & Access' | 'Season' | 'Announcements' | 'Archives'
type DemoAccess = 'Admin' | 'Coach' | 'Referee' | 'Volunteer'
const SHIRT_COLORS = [{name:'Blue',hex:'#2878d0'},{name:'Light Blue',hex:'#65b9ed'},{name:'Dark Blue',hex:'#173d8a'},{name:'Purple',hex:'#7738a8'},{name:'Orange',hex:'#e87524'},{name:'Bright Orange',hex:'#ff5e16'},{name:'Soft Orange',hex:'#f2a36b'},{name:'Yellow',hex:'#f1d32f'},{name:'Red',hex:'#d9333f'},{name:'Pink',hex:'#ed77ad'},{name:'Maroon',hex:'#711f3c'},{name:'Gray',hex:'#80858d'},{name:'Neon',hex:'#c8f20a'},{name:'Green',hex:'#229653'},{name:'Light Green',hex:'#89c95a'},{name:'Turquoise',hex:'#19b7ad'},{name:'Silver',hex:'#c1c5cc'},{name:'Black',hex:'#202124'},{name:'White',hex:'#f7f7f7'},{name:'Navy',hex:'#102a43'},{name:'Gold',hex:'#d3a820'},{name:'Other',hex:'#4b72d7'}] as const
const shirtColorName = (hex: string) => SHIRT_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Other'
type RulesKnowledgeEntry = { id: string; title: string; sourceName: string; sourceUrl: string; edition: string; section: string; text: string; reviewedBy: string; reviewedOn: string; verified: boolean; keywords?: string[] }
type AskRefCitation = { id: string; authority: 'PDSA' | 'IFAB'; version: string; label: string; url?: string }
type AskRefResponse = { division: string; explanation: string; citations: AskRefCitation[]; ballPlacement: string | null; diagramId: string | null; recommendCoordinator: boolean; sourceVersions?: { PDSA: string; IFAB: string } }
const IFAB_LAWS_URL = 'https://www.theifab.com/laws/latest/'
const ruleStopWords = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'give', 'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'please', 'rule', 'rules', 'should', 'tell', 'the', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'would'])
const ruleSynonyms: Record<string, string[]> = {
  game: ['match'], games: ['match'], period: ['quarter', 'half'], periods: ['quarter', 'half'], quarters: ['quarter'], halves: ['half', 'halftime'], length: ['duration', 'time'], long: ['duration', 'minutes'], minutes: ['minute'],
  ref: ['referee'], refs: ['referee'], linesman: ['assistant'], boots: ['footwear'], cleats: ['footwear'], jewelry: ['earrings'], jewellery: ['earrings'], throwin: ['throw', 'throw-in'], throwins: ['throw', 'throw-in'],
  restart: ['kickoff'], kickoffs: ['kickoff'], keeper: ['goalkeeper'], keepers: ['goalkeeper'], sendoff: ['card', 'suspension'], sentoff: ['card', 'suspension'], thunder: ['lightning'],
}

function ruleWords(value: string) {
  return (value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((word) => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word)
}

function editDistanceAtMost(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) return false
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row]
    let minimum = row
    for (let column = 1; column <= right.length; column += 1) {
      const value = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1))
      current[column] = value
      minimum = Math.min(minimum, value)
    }
    if (minimum > maxDistance) return false
    previous = current
  }
  return previous[right.length] <= maxDistance
}

function matchesRuleTerm(term: string, indexedWords: Set<string>) {
  const alternatives = [term, ...(ruleSynonyms[term] ?? [])].flatMap(ruleWords)
  return alternatives.some((alternative) => [...indexedWords].some((word) => word === alternative || (alternative.length >= 5 && editDistanceAtMost(alternative, word, alternative.length >= 6 ? 2 : 1))))
}

const awardCriteria = [
  { id: 'technical', title: 'Technical Skill Award', evalSkills: ['first-touch', 'passing', 'dribbling', 'shooting'], reviewSkills: ['skillApplication', 'effort'], description: 'Technical evaluation themes supported by repeated game or training observations.' },
  { id: 'game-awareness', title: 'Game Awareness Award', evalSkills: ['awareness', 'decisions', 'positioning'], reviewSkills: ['skillApplication', 'teamwork'], description: 'Awareness, decisions, and positioning supported by observations of applying skills and helping teammates.' },
  { id: 'teammate', title: 'Positive Teammate Award', evalSkills: ['listening', 'confidence'], reviewSkills: ['teamwork', 'sportsmanship'], description: 'Development behaviors supported by repeated teamwork and sportsmanship observations.' },
  { id: 'growth', title: 'Effort and Learning Award', evalSkills: ['attention', 'confidence', 'listening'], reviewSkills: ['effort', 'feedback'], description: 'Evaluation themes supported by consistent effort and response to coaching feedback.' },
  { id: 'leadership', title: 'Leadership Award', evalSkills: ['awareness', 'decisions', 'listening'], reviewSkills: ['teamwork', 'feedback'], description: 'Game understanding and listening supported by observed teamwork and constructive response to guidance.' },
  { id: 'encouragement', title: 'Encouragement Award', evalSkills: ['listening', 'confidence'], reviewSkills: ['encouragement', 'teamwork'], description: 'Evaluation themes supported by repeated, specific observations of encouraging and including teammates.' },
  { id: 'ball-handling', title: 'Ball Handling Award', evalSkills: ['first-touch', 'dribbling'], reviewSkills: ['skillApplication', 'effort'], description: 'Consolidated first-touch and dribbling ratings supported by observed ball skill in play or practice.' },
] as const

const initialPlayers: Player[] = [
  { id: 'p-001', name: 'Jordan Lee', number: '12', team: 'Blue Comets', grade: 'U10', assignedCoach: 'Coach 1', ratings: { passing: 8, dribbling: 7, 'first-touch': 8, shooting: 6, 'speed-movement': 7, defending: 6, awareness: 8, decisions: 7, positioning: 7, listening: 8, attention: 7, alertness: 7, confidence: 8 }, coachRatings: {}, draftEligible: true, coachChild: '', assistantCoachChild: '', linkedPlayerId: '', linkedPlayerRelationship: '', previousSeasonGrade: 'B', developmentGoals: 'Improve shooting accuracy and finishing confidence', developmentGoalTwo: 'Build comfort using the non-dominant foot', change: 0.8, status: 'Complete' },
  { id: 'p-002', name: 'Riley Morgan', number: '04', team: 'Red Rockets', grade: 'U10', assignedCoach: 'Riley Morgan', ratings: { passing: 6, dribbling: 8, 'first-touch': 7, shooting: 8, 'speed-movement': 8, defending: 5, awareness: 7, decisions: 7, positioning: 6, listening: 8, attention: 8, alertness: 7, confidence: 7 }, coachRatings: {}, draftEligible: true, coachChild: '', assistantCoachChild: '', linkedPlayerId: '', linkedPlayerRelationship: '', previousSeasonGrade: 'A', developmentGoals: 'Build passing accuracy with both feet', developmentGoalTwo: 'Scan for an open teammate before receiving', change: 0.4, status: 'Complete' },
  { id: 'p-003', name: 'Casey Rivera', number: '21', team: 'Blue Comets', grade: 'U10', assignedCoach: 'Coach 1', ratings: { passing: 7, dribbling: 6, 'first-touch': 6, shooting: 7, 'speed-movement': 8, defending: 7, awareness: 6, decisions: 6, positioning: 7, listening: 7, attention: 6, alertness: 8 }, coachRatings: {}, draftEligible: true, coachChild: '', assistantCoachChild: '', linkedPlayerId: '', linkedPlayerRelationship: '', previousSeasonGrade: 'C', developmentGoals: '', change: 1.2, status: 'In progress' },
  { id: 'p-004', name: 'Taylor Brooks', number: '09', team: 'Green Strikers', grade: 'U10', assignedCoach: 'Coach 1', ratings: {}, coachRatings: {}, draftEligible: true, coachChild: '', assistantCoachChild: '', linkedPlayerId: '', linkedPlayerRelationship: '', previousSeasonGrade: '', developmentGoals: '', change: 0, status: 'Needs evaluation' },
]
const sampleDivisionData: { division: Division; coach: string; assistant: string; players: string[] }[] = [
  { division: 'U8 Boys', coach: 'Avery Hill', assistant: 'Morgan Reed', players: ['Alex Carter', 'Jamie Flores', 'Robin Ellis'] },
  { division: 'U8 Girls', coach: 'Jordan Blake', assistant: 'Taylor Nguyen', players: ['Casey Parker', 'Drew Bennett', 'Quinn Rivera'] },
  { division: 'U10', coach: 'Coach 1', assistant: 'Riley Morgan', players: ['Skyler James', 'Emerson Cruz', 'Harper Lane'] },
  { division: 'U12', coach: 'Sam Patel', assistant: 'Casey Young', players: ['Finley Brooks', 'Reese Cooper', 'Rowan Kim'] },
  { division: 'U14', coach: 'Taylor Brooks', assistant: 'Alex Murphy', players: ['Parker Diaz', 'Cameron Wells', 'Devon Price'] },
  { division: 'U18', coach: 'Riley Stone', assistant: 'Jamie Fox', players: ['Ari Bennett', 'Sage Collins', 'Remy Foster'] },
]
const extraDivisionPlayers: Player[] = sampleDivisionData.flatMap(({ division, coach, players }, divisionIndex) => players.map((name, playerIndex) => ({
  id: `sample-${divisionIndex}-${playerIndex}`, name, number: `${divisionIndex + 1}${playerIndex + 1}`, team: `${coach.split(' ').at(-1)} FC`, grade: division, assignedCoach: coach,
  ratings: Object.fromEntries(u10Rubric.map(({ id }) => [id, 5 + ((divisionIndex + playerIndex) % 5)])), coachRatings: {}, draftEligible: true, coachChild: '', assistantCoachChild: '', linkedPlayerId: '', linkedPlayerRelationship: '', previousSeasonGrade: '', developmentGoals: 'Practice scanning before receiving the ball', developmentGoalTwo: 'Build confidence using both feet', change: 0, status: 'Complete',
})))
const activeSeasonId = 'fall-2026-demo'
const demoSeasonEndDate = '2026-12-31'
const demoGameDay = '2026-10-27'
const initialGames: ScoreGame[] = [
  { id: 'match-1', date: demoGameDay, time: '9:00 AM', homeTeam: 'Blue Comets', awayTeam: 'Red Rockets', homeScore: 2, awayScore: 1, homePlayers: 8, awayPlayers: 7, homeCoach: 'Coach Avery', awayCoach: 'Coach Jordan', homeColor: '#4b72d7', awayColor: '#d64b50', referee: 'Referee Demo', homeSignatureName: '', awaySignatureName: '', homeSignedAt: '', awaySignedAt: '', homeSigned: false, awaySigned: false, finalized: false },
  { id: 'match-2', date: demoGameDay, time: '10:30 AM', homeTeam: 'Green Strikers', awayTeam: 'Gold Eagles', homeScore: 0, awayScore: 0, homePlayers: 7, awayPlayers: 8, homeCoach: 'Coach Riley', awayCoach: 'Coach Casey', homeColor: '#43966b', awayColor: '#d1ad3d', referee: 'Referee Demo', homeSignatureName: '', awaySignatureName: '', homeSignedAt: '', awaySignedAt: '', homeSigned: false, awaySigned: false, finalized: false },
]

function aggregatePlayerRatings(player: Player) {
  const evaluatorRatings = [player.ratings, ...Object.values(player.coachRatings)]
  return Object.fromEntries(u10Rubric.flatMap(({ id }) => {
    const scores = evaluatorRatings.flatMap((ratings) => ratings[id] ? [ratings[id]] : [])
    return scores.length ? [[id, Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 100) / 100]] : []
  })) as Record<string, number>
}

function completedCoachReviews(player: Player) {
  return [player.ratings, ...Object.values(player.coachRatings)].filter((ratings) => Object.keys(ratings).length === u10Rubric.length).length
}

const drillLibrary: Record<string, string> = {
  'first-touch': 'Receive through gates: check a shoulder, control across the body, then pass to a target.',
  dribbling: '1v1 gate dribbling: attack an open gate, change direction, and accelerate into space.',
  passing: 'Pass-and-move triangles: receive on the back foot, pass with both feet, and move to a new angle.',
  shooting: 'Target finishing: dribble or receive, choose a corner, and shoot with controlled technique.',
  'speed-movement': 'Mirror-and-react: partner leads changes of direction; react, recover, and find space.',
  defending: '1v1 channel defending: approach under control, stay goal-side, and guide the attacker wide.',
  awareness: 'Color-call rondo: scan before receiving and find the called color or open teammate.',
  decisions: '3v2 transition game: recognize overloads and choose when to pass, dribble, or defend.',
  positioning: '3v3 end-zone game: create width, support the ball, and recover to defend.',
  listening: 'Listen-and-play: respond to short coach cues while continuing a simple ball activity.',
  attention: 'Two-ball focus circuit: track the active ball and transition on a clear cue.',
  alertness: 'Scan-and-react: check both shoulders before receiving; react to a visual cue after the pass.',
  confidence: 'Skill ladder: choose a manageable challenge, try it, and repeat after mistakes with encouragement.',
}

const drillPlans: Record<string, { setup: string; progression: string; cue: string }> = {
  'first-touch': { setup: 'Pairs, one ball, and two small gates about 5�7 yards apart.', progression: 'Start with a gentle feed; then vary the angle and ask the receiver to choose a gate.', cue: 'Can your first touch take the ball away from pressure?' },
  dribbling: { setup: 'One ball per player in a safe 10-by-10-yard space; add a partner only when ready.', progression: 'Begin unopposed, then add a shadow defender, then a short 1v1 challenge.', cue: 'Change direction or pace when the defender shifts.' },
  passing: { setup: 'Groups of three or four in a square with one ball; keep spare balls nearby.', progression: 'Move from two touches to an optional one-touch challenge, then add a passive interceptor.', cue: 'Look before receiving and offer a new angle after the pass.' },
  shooting: { setup: 'Small groups, a safe shooting lane, balls, and simple target zones in a goal.', progression: 'Start with a stationary ball, then a pass to finish, then add a passive defender.', cue: 'Can the player balance, look up, and choose a target?' },
  'speed-movement': { setup: 'Pairs with a ball each in a small open grid; keep the effort brief.', progression: 'Mirror a partner first, then react to a color or direction call with the ball.', cue: 'Use small steps to change direction, then accelerate into space.' },
  defending: { setup: 'Pairs in a short, wide channel with a line to protect; rotate roles often.', progression: 'Attacker starts slowly, then can choose either side; defender focuses on delaying.', cue: 'Stay balanced and guide play; winning the ball is not the only success.' },
  awareness: { setup: 'Four or five players keep a ball moving in a small grid; use colored cones as targets.', progression: 'Call a target before the pass, then add a gentle defender or second ball if safe.', cue: 'Can the player scan before the ball arrives?' },
  decisions: { setup: 'Small 2v1 or 3v2 game toward end zones with quick rotations.', progression: 'Start with a numerical advantage, then adjust space or add a recovering defender.', cue: 'Ask what options were available before asking what they chose.' },
  positioning: { setup: '3v3 or 4v4 in a wide grid with end zones; no fixed positions.', progression: 'Award a point for supporting at a new angle, then remove the bonus and play freely.', cue: 'Where can you move to help the player on the ball?' },
  listening: { setup: 'Everyone has a ball in a grid; use a few simple verbal or visual cues.', progression: 'Begin with one cue at a time; add a choice only when players are comfortable.', cue: 'Keep instructions short and praise attempts, not just perfect responses.' },
  attention: { setup: 'Small groups in a marked area with one ball and clear boundaries.', progression: 'Change the direction or target on a predictable signal before making it less predictable.', cue: 'Reset calmly after a missed cue; avoid elimination games.' },
  alertness: { setup: 'Pairs passing through gates, with a coach showing a color or number.', progression: 'Use a single signal first, then let the receiver choose between two targets.', cue: 'Scan, receive, and respond at a comfortable speed.' },
  confidence: { setup: 'Create three simple skill stations with a clear �choose your challenge� option.', progression: 'Let athletes choose a level and move up or down freely; finish with a favorite game.', cue: 'Notice brave attempts and persistence, not only successful outcomes.' },
}

const professionalStyleReferences = [
  { name: 'Lionel Messi', skills: ['dribbling', 'awareness', 'decisions'], focus: 'Notice close control, changes of rhythm, and how he looks for a useful next action.', source: 'UEFA feature on Messi�s dribbling and passing', href: 'https://www.uefa.com/uefachampionsleague/news/01fa-0e7ba79e0275-8acda08ad811-1000--messi-s-sixth-sense-explained/' },
  { name: 'Kevin De Bruyne', skills: ['passing', 'awareness', 'decisions'], focus: 'Watch how he scans, spots a forward option, and varies the weight and timing of a pass.', source: 'Opta Analyst player analysis', href: 'https://theanalyst.com/articles/kevin-de-bruyne-peaking-at-the-perfect-time' },
  { name: 'N�Golo Kant�', skills: ['defending', 'awareness', 'speed-movement'], focus: 'Look for anticipation, recovery effort, and how he helps close space for teammates.', source: 'Opta Analyst player profile', href: 'https://theanalyst.com/players/8887/ngolo-kante' },
]

function styleStudySuggestions(player: Player) {
  const ratings = aggregatePlayerRatings(player)
  return professionalStyleReferences.map((reference) => ({ ...reference, overlap: reference.skills.filter((skill) => (ratings[skill] ?? 0) >= 7).length }))
    .filter((reference) => reference.overlap >= 2).sort((a, b) => b.overlap - a.overlap).slice(0, 2)
}

function individualDrillSuggestions(player: Player) {
  const ratings = aggregatePlayerRatings(player)
  const goalText = `${player.developmentGoals} ${player.developmentGoalTwo ?? ''}`.toLowerCase()
  const goalTerms: Record<string, string[]> = {
    'first-touch': ['first touch', 'ball control', 'receiving'], dribbling: ['dribbl'], passing: ['pass', 'distribution'], shooting: ['shoot', 'finish', 'scoring'],
    'speed-movement': ['speed', 'movement', 'agility'], defending: ['defend', 'tackle', 'mark'], awareness: ['awareness', 'scan', 'vision'], decisions: ['decision', 'choice'],
    positioning: ['position', 'space'], listening: ['listen', 'instruction'], attention: ['attention', 'focus'], alertness: ['alert', 'react'], confidence: ['confidence', 'confident'],
  }
  const goalMatches = u10Rubric.filter(({ id }) => (goalTerms[id] ?? [id]).some((term) => goalText.includes(term)))
  const weaknesses = u10Rubric.filter(({ id }) => ratings[id] !== undefined).sort((a, b) => ratings[a.id] - ratings[b.id])
  const ordered = [...goalMatches, ...weaknesses.filter((category) => !goalMatches.some((goal) => goal.id === category.id))].slice(0, 3)
  return ordered.map((category) => ({ id: category.id, category: category.label, drill: drillLibrary[category.id], plan: drillPlans[category.id], reason: goalMatches.some((goal) => goal.id === category.id) ? 'Matches a goal entered on the evaluation form' : `A practice idea for a skill with a lower recorded score (${ratings[category.id]}/10)` }))
}

function teamDrillSuggestions(roster: Player[]) {
  const ratings = roster.map(aggregatePlayerRatings)
  return u10Rubric.map((category) => {
    const scores = ratings.flatMap((playerRatings) => playerRatings[category.id] === undefined ? [] : [playerRatings[category.id]])
    return { category, average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null }
  }).filter((entry) => entry.average !== null).sort((a, b) => a.average! - b.average!).slice(0, 2)
    .map(({ category, average }) => ({ id: category.id, category: category.label, drill: drillLibrary[category.id], plan: drillPlans[category.id], reason: `One of the lower recorded team averages (${average!.toFixed(1)}/10)` }))
}

function positionSuggestions(player: Player) {
  const ratings = aggregatePlayerRatings(player)
  const roles: { role: string; skills: string[] }[] = [
    { role: 'Attacking player', skills: ['shooting', 'dribbling', 'speed-movement'] },
    { role: 'Midfielder', skills: ['passing', 'awareness', 'decisions', 'positioning'] },
    { role: 'Defender', skills: ['defending', 'awareness', 'positioning'] },
  ]
  if (player.grade !== 'U8 Boys' && player.grade !== 'U8 Girls') roles.push({ role: 'Goalkeeper (exploratory)', skills: ['awareness', 'confidence', 'speed-movement'] })
  return roles.map(({ role, skills }) => {
    const scores = skills.flatMap((skill) => ratings[skill] === undefined ? [] : [ratings[skill]])
    return { role, score: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null }
  }).filter((entry) => entry.score !== null).sort((a, b) => b.score! - a.score!).slice(0, 2)
}

const navigation: { label: Section; icon: typeof LayoutDashboard; tag?: string }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Evaluations', icon: ClipboardCheck },
  { label: 'Draft', icon: Users, tag: 'SOON' },
  { label: 'My Team', icon: Users },
  { label: 'Develop', icon: Goal, tag: 'SOON' },
  { label: 'Awards', icon: Trophy },
  { label: 'Announcements', icon: Bell },
  { label: 'Referee', icon: PenLine },
  { label: 'ScoreBoard', icon: Trophy, tag: 'DEMO' },
  { label: 'AskRef', icon: BookOpenText, tag: 'BETA' },
  { label: 'Admin', icon: ShieldCheck, tag: 'DEMO' },
]

function App() {
  const [section, setSection] = useState<Section>('Overview')
  const [players, setPlayers] = useState([...initialPlayers, ...extraDivisionPlayers])
  const [selectedId, setSelectedId] = useState(initialPlayers[0].id)
  const [query, setQuery] = useState('')
  const [evaluationFilter, setEvaluationFilter] = useState<'all' | 'needs-evaluation' | 'in-progress' | 'complete'>('all')
  const [bulkEvaluationOpen, setBulkEvaluationOpen] = useState(true)
  const [bulkGrade, setBulkGrade] = useState<Player['grade']>('U10')
  const [developmentDivision, setDevelopmentDivision] = useState<Player['grade']>('U10')
  const [activeEvaluator, setActiveEvaluator] = useState('Coach 1')
  const [coachNames, setCoachNames] = useState<Record<Division, string[]>>({ 'U8 Boys': ['Avery Hill', 'Morgan Reed'], 'U8 Girls': ['Jordan Blake', 'Taylor Nguyen'], U10: ['Coach 1'], U12: ['Sam Patel', 'Casey Young'], U14: ['Taylor Brooks', 'Alex Murphy'], U18: ['Riley Stone', 'Jamie Fox'] })
  const [headCoachDirectory, setHeadCoachDirectory] = useState<string[]>(['Avery Hill', 'Morgan Reed', 'Jordan Blake', 'Taylor Nguyen', 'Coach 1', 'Sam Patel', 'Casey Young', 'Taylor Brooks', 'Alex Murphy', 'Riley Stone', 'Jamie Fox'])
  const [completedEvaluators, setCompletedEvaluators] = useState<Record<string, boolean>>({})
  const [consolidatedDivisions, setConsolidatedDivisions] = useState<Record<Division, boolean>>({ 'U8 Boys': false, 'U8 Girls': false, U10: false, U12: false, U14: false, U18: false })
  const [periodicReviews, setPeriodicReviews] = useState<PeriodicReview[]>([])
  const [reviewDraft, setReviewDraft] = useState({ date: demoGameDay, context: '', effort: 3, teamwork: 3, sportsmanship: 3, skillApplication: 3, feedback: 3, encouragement: 3, evidence: '' })
  const [awardDivision, setAwardDivision] = useState<Division>('U10')
  const [seasonStartDate, setSeasonStartDate] = useState('2026-08-01')
  const [seasonEndDate, setSeasonEndDate] = useState(demoSeasonEndDate)
  const [evaluationDates, setEvaluationDates] = useState<Record<Division, string>>({ 'U8 Boys': '', 'U8 Girls': '', U10: '2026-11-01', U12: '', U14: '', U18: '' })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', body: '', attachmentUrl: '', attachmentName: '' })
  const [adminTab, setAdminTab] = useState<AdminTab>('Season')
  const [demoAccess, setDemoAccess] = useState<DemoAccess>('Admin')
  const [demoUserAccess, setDemoUserAccess] = useState<Record<string, DemoAccess>>({ 'Board Demo': 'Admin', 'Coach 1': 'Coach', 'Referee Demo': 'Referee', 'Volunteer Demo': 'Volunteer' })
  const [teamStaff, setTeamStaff] = useState<Record<string, TeamStaff>>({ 'U8 Boys:Avery Hill': { headCoach: 'Avery Hill', assistantCoach: 'Morgan Reed', jerseyColor: '#2878d0', teamNickname: 'Blue Comets' }, 'U8 Girls:Jordan Blake': { headCoach: 'Jordan Blake', assistantCoach: 'Taylor Nguyen', jerseyColor: '#ed77ad', teamNickname: 'Pink Panthers' }, 'U10:Coach 1': { headCoach: 'Coach 1', assistantCoach: 'Riley Morgan', jerseyColor: '#2878d0', teamNickname: 'Blue Comets' }, 'U12:Sam Patel': { headCoach: 'Sam Patel', assistantCoach: 'Casey Young', jerseyColor: '#e87524', teamNickname: 'Orange Owls' }, 'U14:Taylor Brooks': { headCoach: 'Taylor Brooks', assistantCoach: 'Alex Murphy', jerseyColor: '#229653', teamNickname: 'Green Strikers' }, 'U18:Riley Stone': { headCoach: 'Riley Stone', assistantCoach: 'Jamie Fox', jerseyColor: '#d9333f', teamNickname: 'Red Rockets' } })
  const [coachDirectory, setCoachDirectory] = useState<string[]>(['Avery Hill', 'Morgan Reed', 'Jordan Blake', 'Taylor Nguyen', 'Coach 1', 'Riley Morgan', 'Sam Patel', 'Casey Young', 'Taylor Brooks', 'Alex Murphy', 'Riley Stone', 'Jamie Fox'])
  const [newCoachName, setNewCoachName] = useState('')
  const [coachDivision, setCoachDivision] = useState<Division>('U10')
  const [newAssistantCoach, setNewAssistantCoach] = useState('')
  const [newDemoUser, setNewDemoUser] = useState('')
  const [missingAssistantName, setMissingAssistantName] = useState('')
  const [myTeamSelection, setMyTeamSelection] = useState('')
  const [certificate, setCertificate] = useState<{ playerId: string; awardTitle: string } | null>(null)
  const [draftDivision, setDraftDivision] = useState<Player['grade']>('U10')
  const [draftOperator, setDraftOperator] = useState('Board Demo')
  const [draftCoachTeam, setDraftCoachTeam] = useState('Coach 1')
  const [draftPlayerPickId, setDraftPlayerPickId] = useState('')
  const [draftTeamAssignments, setDraftTeamAssignments] = useState<Record<string, string>>({})
  const [draftCompleted, setDraftCompleted] = useState<Record<Division, boolean>>({ 'U8 Boys': false, 'U8 Girls': false, U10: false, U12: false, U14: false, U18: false })
  const [draftOrder, setDraftOrder] = useState<Record<Division, string[]>>({ 'U8 Boys': ['Avery Hill', 'Morgan Reed'], 'U8 Girls': ['Jordan Blake', 'Taylor Nguyen'], U10: ['Coach 1'], U12: ['Sam Patel', 'Casey Young'], U14: ['Taylor Brooks', 'Alex Murphy'], U18: ['Riley Stone', 'Jamie Fox'] })
  const [draftStartedAt, setDraftStartedAt] = useState<Record<Division, string>>({} as Record<Division, string>)
  const [draftEndedAt, setDraftEndedAt] = useState<Record<Division, string>>({} as Record<Division, string>)
  const [draftClockTick, setDraftClockTick] = useState(Date.now())
  const [seasonArchives, setSeasonArchives] = useState<SeasonArchive[]>([])
  const [archiveAccessLog, setArchiveAccessLog] = useState<ArchiveAccessLog[]>([])
  const [archiveRequest, setArchiveRequest] = useState({ subject: '', reason: '' })
  const [archiveQuerySubject, setArchiveQuerySubject] = useState('')
  const [archiveRequestResult, setArchiveRequestResult] = useState('')
  const [tradePlayers, setTradePlayers] = useState({ first: '', second: '' })
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [evaluationFullscreen, setEvaluationFullscreen] = useState(false)
  const [ruleQuestion, setRuleQuestion] = useState('')
  const [rulesKnowledge, setRulesKnowledge] = useState<RulesKnowledgeEntry[]>(pdsaRulesKnowledge)
  const [rulesKnowledgeDraft, setRulesKnowledgeDraft] = useState<Omit<RulesKnowledgeEntry, 'id' | 'verified'>>({ title: '', sourceName: '', sourceUrl: '', edition: '', section: '', text: '', reviewedBy: '', reviewedOn: '' })
  const [rulesSearchSubmitted, setRulesSearchSubmitted] = useState(false)
  const [askRefLoading, setAskRefLoading] = useState(false)
  const [askRefAnswer, setAskRefAnswer] = useState('')
  const [askRefSources, setAskRefSources] = useState<AskRefCitation[]>([])
  const [askRefResponse, setAskRefResponse] = useState<AskRefResponse | null>(null)
  const [askRefError, setAskRefError] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [draftJerseysBySeason, setDraftJerseysBySeason] = useState<Record<string, Record<string, string>>>({})
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('playersmart-theme') === 'light' ? 'light' : 'dark')
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(neonAuthConfigured)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [registrationMode, setRegistrationMode] = useState(false)
  const [passwordResetRequestMode, setPasswordResetRequestMode] = useState(false)
  const [passwordResetToken, setPasswordResetToken] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  const [authMessage, setAuthMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importKind, setImportKind] = useState<'file' | 'image' | null>(null)
  const [importRows, setImportRows] = useState<{ name: string; team: string }[]>([])
  const [imagePreview, setImagePreview] = useState('')
  const [imageRosterText, setImageRosterText] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [databaseStatus, setDatabaseStatus] = useState<'not-checked' | 'checking' | 'connected' | 'unavailable'>('not-checked')
  const [games, setGames] = useState(initialGames)
  const [activeGameId, setActiveGameId] = useState(initialGames[0].id)
  const [scoreDay, setScoreDay] = useState(demoGameDay)
  const [guestScoreView, setGuestScoreView] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('playersmart-theme', theme)
  }, [theme])

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  useEffect(() => {
    const timer = window.setInterval(() => setDraftClockTick(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkReset = () => {
      if (!seasonEndDate) return
      const resetAt = new Date(`${seasonEndDate}T23:59:59`).getTime() + 7 * 24 * 60 * 60 * 1000
      if (Date.now() >= resetAt && !seasonArchives.some((archive) => archive.seasonName === activeSeasonId)) resetSeasonData()
    }
    checkReset()
    const timer = window.setInterval(checkReset, 60_000)
    return () => window.clearInterval(timer)
  }, [seasonEndDate, seasonArchives, players, periodicReviews, coachDirectory, draftTeamAssignments])

  useEffect(() => {
    if (!neonAuth) return
    neonAuth.getSession().then(({ data, error }) => {
      if (error) setAuthMessage('Could not check your sign-in session. Please try again.')
      setUser(data?.user ? { email: data.user.email, name: data.user.name } : null)
      setAuthLoading(false)
    }).catch(() => {
      setAuthMessage('Could not reach Neon Auth. Please try again.')
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    const syncFullscreenState = () => {
      const isEvaluationFullscreen = document.fullscreenElement?.classList.contains('bulk-evaluation-panel') ?? false
      setEvaluationFullscreen(isEvaluationFullscreen)
      if (!isEvaluationFullscreen) {
        try { window.screen.orientation?.unlock?.() } catch { /* Orientation unlock is optional across browsers. */ }
      }
    }
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!neonAuth) return
    setAuthMessage('')
    try {
      if (passwordResetToken) {
        const { error } = await neonAuth.resetPassword({ newPassword: authPassword, token: passwordResetToken })
        if (error) {
          setAuthMessage('Password reset link is invalid or expired. Request a new reset email and try again.')
          return
        }
        window.history.replaceState({}, '', window.location.pathname)
        setPasswordResetToken('')
        setAuthPassword('')
        setPasswordResetRequestMode(false)
        setRegistrationMode(false)
        setAuthMessage('Password updated. You can now sign in with your new password.')
        return
      }
      if (passwordResetRequestMode) {
        const { error } = await neonAuth.requestPasswordReset({ email: authEmail, redirectTo: `${window.location.origin}/?password-reset=1` })
        if (error) {
          setAuthMessage('Could not request a password reset. Check your email address and try again.')
          return
        }
        setAuthMessage('If an account exists for that email, a password reset link has been sent.')
        return
      }
      if (registrationMode) {
        const { error } = await neonAuth.signUp.email({ email: authEmail, password: authPassword, name: authName })
        if (error) {
          setAuthMessage('Registration could not be completed. Check your details or try another email address.')
          return
        }
        setRegistrationMode(false)
        setAuthPassword('')
        setAuthMessage('Account created. You can now sign in with your email and password.')
        return
      }
      const { error } = await neonAuth.signIn.email({ email: authEmail, password: authPassword })
      if (error) {
        setAuthMessage('Sign-in failed. Check your details or contact your organization administrator.')
        return
      }
      const { data } = await neonAuth.getSession()
      const token = await getNeonAuthToken()
      if (!token) {
        setAuthMessage('Sign-in succeeded, but the application could not verify your session.')
        return
      }
      const verification = await fetch('/api/me', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (!verification.ok) {
        setAuthMessage('Sign-in succeeded, but PlayerSmart could not verify this session with its API.')
        return
      }
      setUser(data?.user ? { email: data.user.email, name: data.user.name } : null)
    } catch {
      setAuthMessage('Sign-in could not be completed. Please try again.')
    }
  }

  async function signOut() {
    if (!neonAuth) return
    try {
      const { error } = await neonAuth.signOut()
      if (error) setAuthMessage('Could not sign out right now. Please retry.')
      else setUser(null)
    } catch {
      setAuthMessage('Could not sign out right now. Please retry.')
    }
  }

  if (neonAuthConfigured && authLoading) return <div className="auth-screen" role="status">Checking secure sign-in�</div>
  if (neonAuthConfigured && !user) return <main className="auth-screen"><form className="auth-card" onSubmit={signIn}><img className="auth-brand-logo" src={theme === 'dark' ? '/playersmart-logo-player-v2-dark.png' : '/playersmart-logo-player-v2.png'} alt="PlayerSmart" /><p className="eyebrow">PLAYER DEVELOPMENT WORKSPACE</p><h1>{passwordResetToken ? 'Choose a new password' : passwordResetRequestMode ? 'Reset your password' : registrationMode ? 'Create your account' : 'Welcome to PlayerSmart'}</h1><p>{passwordResetToken ? 'Enter a new password for your PlayerSmart account.' : passwordResetRequestMode ? 'We will email a reset link if an account matches this address.' : registrationMode ? 'Register with your email to get started.' : 'Sign in or create an account to continue.'}</p>{registrationMode && <label>Name<input autoComplete="name" type="text" value={authName} onChange={(event) => setAuthName(event.target.value)} required /></label>}<label>Email<input autoComplete="username" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required /></label>{!passwordResetRequestMode && <label>{passwordResetToken ? 'New password' : 'Password'}<input autoComplete={registrationMode || passwordResetToken ? 'new-password' : 'current-password'} minLength={registrationMode || passwordResetToken ? 8 : undefined} type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required /></label>}{authMessage && <div className="auth-error" role="status">{authMessage}</div>}<button className="button-primary" type="submit">{passwordResetToken ? 'Update password' : passwordResetRequestMode ? 'Send reset link' : registrationMode ? 'Create account' : 'Sign in'}</button>{!passwordResetToken && <>{!passwordResetRequestMode && !registrationMode && <button className="auth-mode-toggle" type="button" onClick={() => { setPasswordResetRequestMode(true); setAuthMessage('') }}>Forgot password?</button>}<button className="auth-mode-toggle" type="button" onClick={() => { setRegistrationMode((mode) => !mode); setPasswordResetRequestMode(false); setAuthMessage('') }}>{registrationMode ? 'Already registered? Sign in' : 'New to PlayerSmart? Create an account'}</button></>}<small>Account registration does not grant access to private organization or player data.</small></form></main>

  const playerTeamName = (player: Player) => draftTeamAssignments[player.id] ?? player.assignedCoach ?? coachNames[player.grade][0] ?? ''
  const evaluationTeams = [...new Set(players.filter((player) => player.grade === bulkGrade).map(playerTeamName).filter(Boolean))]
  const myTeamNames = [...new Set([...coachNames[bulkGrade], ...evaluationTeams])]
  const myTeamName = myTeamNames.includes(myTeamSelection) ? myTeamSelection : myTeamNames[0] ?? ''
  const seasonHasEnded = new Date().toISOString().slice(0, 10) > seasonEndDate
  const myTeamPlayers = players.filter((player) => player.grade === bulkGrade && playerTeamName(player) === myTeamName)
  const myTeamFilteredPlayers = myTeamPlayers.filter((player) => {
    const matchesQuery = `${player.name} ${player.team} ${player.number}`.toLowerCase().includes(query.toLowerCase())
    const scoreCount = Object.keys(aggregatePlayerRatings(player)).length
    const matchesStatus = evaluationFilter === 'all' || (evaluationFilter === 'complete' && scoreCount === u10Rubric.length) || (evaluationFilter === 'needs-evaluation' && scoreCount === 0) || (evaluationFilter === 'in-progress' && scoreCount > 0 && scoreCount < u10Rubric.length)
    return matchesQuery && matchesStatus
  })
  const coachVisiblePlayers = seasonHasEnded ? players : myTeamPlayers
  const selectedPlayer = myTeamPlayers.find(({ id }) => id === selectedId) ?? myTeamPlayers[0]
  const developmentRoster = coachVisiblePlayers.filter((player) => player.grade === developmentDivision)
  const developmentPlayer = developmentRoster.find((player) => player.id === selectedId) ?? developmentRoster[0]
  const filteredPlayers = players.filter((player) => {
    const matchesQuery = `${player.name} ${player.team} ${player.number}`.toLowerCase().includes(query.toLowerCase())
    const scoreCount = Object.keys(aggregatePlayerRatings(player)).length
    const matchesStatus = evaluationFilter === 'all' || (evaluationFilter === 'complete' && scoreCount === u10Rubric.length) || (evaluationFilter === 'needs-evaluation' && scoreCount === 0) || (evaluationFilter === 'in-progress' && scoreCount > 0 && scoreCount < u10Rubric.length)
    return matchesQuery && matchesStatus
  })
  const ratedCount = players.filter((player) => Object.keys(aggregatePlayerRatings(player)).length === u10Rubric.length).length
  const playerAverage = (player: Player) => calculateWeightedScore(u10Rubric.flatMap((category) => aggregatePlayerRatings(player)[category.id] ? [{ score: aggregatePlayerRatings(player)[category.id], weight: category.weight }] : []), u10Rubric.length)
  const evaluatorOptionsFor = (division: Division) => coachNames[division].map((name) => name.trim()).filter(Boolean)

  function updateRating(categoryId: string, value: number) {
    if (completedEvaluators[`${selectedPlayer.grade}:${activeEvaluator}`]) return
    setPlayers((current) => current.map((player) => {
      if (player.id !== selectedId) return player
      const ratings = activeEvaluator === evaluatorOptionsFor(selectedPlayer.grade)[0] ? { ...player.ratings, [categoryId]: value } : player.ratings
      const coachRatings = activeEvaluator === evaluatorOptionsFor(selectedPlayer.grade)[0] ? player.coachRatings : { ...player.coachRatings, [activeEvaluator]: { ...player.coachRatings[activeEvaluator], [categoryId]: value } }
      const updated = { ...player, ratings, coachRatings }
      return { ...updated, status: Object.keys(aggregatePlayerRatings(updated)).length === u10Rubric.length ? 'Complete' : 'In progress' }
    }))
  }

  function updateBulkRating(playerId: string, categoryId: string, value: number | null) {
    if (completedEvaluators[`${bulkGrade}:${activeEvaluator}`]) return
    setPlayers((current) => current.map((player) => {
      if (player.id !== playerId) return player
      const currentRatings = activeEvaluator === evaluatorOptions[0] ? player.ratings : player.coachRatings[activeEvaluator] ?? {}
      const nextRatings = { ...currentRatings }
      if (value === null) delete nextRatings[categoryId]
      else nextRatings[categoryId] = value
      const ratings = activeEvaluator === evaluatorOptions[0] ? nextRatings : player.ratings
      const coachRatings = activeEvaluator === evaluatorOptions[0] ? player.coachRatings : { ...player.coachRatings, [activeEvaluator]: nextRatings }
      const updated = { ...player, ratings, coachRatings }
      return { ...updated, status: Object.keys(aggregatePlayerRatings(updated)).length === u10Rubric.length ? 'Complete' : 'In progress' }
    }))
  }

  function updatePlayerMetadata(playerId: string, changes: Partial<Player>) {
    setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, ...changes } : player))
  }

  function updateJerseyColor(color: string) {
    setTeamStaff((current) => ({ ...current, [activeTeamStaffKey]: { ...activeTeamStaff, jerseyColor: color } }))
    const nicknames = new Set(myTeamPlayers.map((player) => player.team))
    setGames((current) => current.map((game) => ({ ...game, ...(game.homeCoach === activeTeamStaff.headCoach || nicknames.has(game.homeTeam) ? { homeColor: color } : {}), ...(game.awayCoach === activeTeamStaff.headCoach || nicknames.has(game.awayTeam) ? { awayColor: color } : {}) })))
    setNotice('Team jersey color updated on the matching demo referee scorecard.')
  }

  function updateDraftOrder(division: Division, index: number, direction: -1 | 1) {
    setDraftOrder((current) => {
      const next = [...current[division]]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, [division]: next }
    })
  }

  function randomizeDraftOrder(division: Division) {
    setDraftOrder((current) => {
      const next = [...current[division]]
      for (let index = next.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1))
        ;[next[index], next[target]] = [next[target], next[index]]
      }
      return { ...current, [division]: next }
    })
    setNotice(`${division} coach draft order randomized for this demo session.`)
  }

  function startDraft() {
    const activeDivision = DIVISIONS.find((division) => draftStartedAt[division] && !draftEndedAt[division])
    if (demoAccess !== 'Admin' || demoUserAccess[draftOperator] !== 'Admin' || coachNames[draftDivision].includes(draftOperator)) {
      setNotice('This demo draft requires a listed Admin who is not coaching in this division. The app does not enforce real user permissions.')
      return
    }
    if (activeDivision || draftStartedAt[draftDivision] || !coachNames[draftDivision].length) {
      setNotice(activeDivision ? `The ${activeDivision} draft is already active. Only one division draft can run in this browser session.` : 'This division draft has already started or has no assigned head coaches.')
      return
    }
    const startedAt = new Date().toISOString()
    setDraftClockTick(Date.now())
    setDraftStartedAt((current) => ({ ...current, [draftDivision]: startedAt }))
    setDraftEndedAt((current) => ({ ...current, [draftDivision]: '' }))
    setNotice(`${draftDivision} draft started. The demo timer is running.`)
  }

  function endDraft() {
    if (!draftOperatorEligible) {
      setNotice('Only the assigned eligible Admin demo operator can end this division draft.')
      return
    }
    if (!draftStartedAt[draftDivision] || draftEndedAt[draftDivision]) return
    const endedAt = new Date().toISOString()
    setDraftClockTick(Date.now())
    setDraftEndedAt((current) => ({ ...current, [draftDivision]: endedAt }))
    setDraftCompleted((current) => ({ ...current, [draftDivision]: true }))
    const firstPick = picked.find((id) => players.find((player) => player.id === id)?.grade === draftDivision)
    if (firstPick) setSelectedId(firstPick)
    setNotice(`${draftDivision} draft ended. Selections now populate each selecting coach's My Team roster. Coaches may trade for 60 hours.`)
  }

  function resetSeasonData() {
    if (seasonArchives.some((archive) => archive.seasonName === activeSeasonId)) return
    setSeasonArchives((current) => [{ id: `archive-${Date.now()}`, seasonName: activeSeasonId, archivedAt: new Date().toISOString(), seasonEndDate, players: players.map((player) => ({ ...player, ratings: { ...player.ratings }, coachRatings: { ...player.coachRatings } })), reviews: [...periodicReviews], coachDirectory: [...coachDirectory], draftAssignments: { ...draftTeamAssignments } }, ...current])
    setPlayers((current) => current.map((player) => ({ ...player, assignedCoach: undefined, ratings: {}, coachRatings: {}, team: 'Unassigned', status: 'Needs evaluation' })))
    setPeriodicReviews([])
    setPicked([])
    setDraftTeamAssignments({})
    setDraftCompleted({ 'U8 Boys': false, 'U8 Girls': false, U10: false, U12: false, U14: false, U18: false })
    setDraftStartedAt({} as Record<Division, string>)
    setDraftEndedAt({} as Record<Division, string>)
    setNotice('Season snapshot archived. Coach rosters and draft state reset; player profiles and goals carry forward.')
  }

  function requestArchiveAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = archiveRequest.subject.trim()
    const reason = archiveRequest.reason.trim()
    if (!subject || reason.length < 12) {
      setArchiveRequestResult('Enter a player/coach name and a specific reason of at least 12 characters.')
      return
    }
    const access = { id: `archive-access-${Date.now()}`, requestedBy: 'Demo board member', subject, reason, accessedAt: new Date().toISOString() }
    setArchiveAccessLog((current) => [access, ...current])
    setArchiveQuerySubject(subject)
    setArchiveRequestResult(`Demo access recorded for ${subject}. ${seasonArchives.length} archive(s) available; this preview has no role check or durable audit log.`)
    setArchiveRequest({ subject: '', reason: '' })
  }

  function tradeDemoPlayers() {
    const endedAt = draftEndedAt[draftDivision] ? new Date(draftEndedAt[draftDivision]).getTime() : 0
    if (!endedAt || Date.now() > endedAt + 60 * 60 * 1000 * 60) {
      setNotice('The coach trade window is closed. Administration must make further roster moves.')
      return
    }
    const first = players.find((player) => player.id === tradePlayers.first)
    const second = players.find((player) => player.id === tradePlayers.second)
    if (!first || !second || first.id === second.id || first.grade !== draftDivision || second.grade !== draftDivision || playerTeamName(first) === playerTeamName(second)) {
      setNotice('Select two different players from different coaches in this division.')
      return
    }
    setDraftTeamAssignments((current) => ({ ...current, [first.id]: playerTeamName(second), [second.id]: playerTeamName(first) }))
    setTradePlayers({ first: '', second: '' })
    setNotice('Demo coach trade recorded. Both players moved to the other coach roster.')
  }

  function savePeriodicReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reviewDraft.context.trim() || reviewDraft.evidence.trim().length < 12) {
      setNotice('Add the match or practice context and a short, specific observation before saving.')
      return
    }
    const review: PeriodicReview = { ...reviewDraft, id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, playerId: selectedPlayer.id, division: selectedPlayer.grade, context: reviewDraft.context.trim(), coach: activeEvaluator, evidence: reviewDraft.evidence.trim() }
    setPeriodicReviews((current) => [...current, review])
    setReviewDraft((current) => ({ ...current, context: '', evidence: '' }))
    setNotice(`Periodic review saved for ${selectedPlayer.name}. Demo review is kept in memory for this session only.`)
  }

  function saveRulesKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entry = { ...rulesKnowledgeDraft, id: `rule-${Date.now()}`, verified: false }
    setRulesKnowledge((current) => [entry, ...current])
    setRulesKnowledgeDraft({ title: '', sourceName: '', sourceUrl: '', edition: '', section: '', text: '', reviewedBy: '', reviewedOn: '' })
    setNotice('Knowledge-base draft saved in this session. It is not searchable until an authorized PDSA reviewer verifies it.')
  }

  function submitAskRefQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void askRefQuestion(ruleQuestion)
  }

  async function askRefQuestion(questionText: string) {
    const question = questionText.trim()
    if (!question) {
      setAskRefError('Type a rules question first.')
      return
    }
    setRulesSearchSubmitted(true)
    setAskRefLoading(true)
    setAskRefAnswer('')
    setAskRefSources([])
    setAskRefError('')
    try {
      const token = await getNeonAuthToken()
      if (!token) throw new Error('Sign in to ask AskRef a question.')
      const response = await fetch('/api/askref', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
        cache: 'no-store',
      })
      const result = await response.json() as AskRefResponse & { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'AskRef could not answer right now.')
      if (!result.explanation) throw new Error('AskRef returned an empty answer. Please try asking another way.')
      setAskRefResponse(result)
      setAskRefAnswer(result.explanation)
      setAskRefSources(result.citations ?? [])
    } catch (error) {
      setAskRefError(error instanceof Error ? error.message : 'AskRef is temporarily unavailable.')
    } finally {
      setAskRefLoading(false)
    }
  }

  function handleAnnouncementFile(file?: File) { if (!file) return; if (file.size > 5 * 1024 * 1024) { setNotice('Choose an announcement attachment under 5 MB.'); return } const reader = new FileReader(); reader.onload = () => setAnnouncementDraft((current) => ({ ...current, attachmentUrl: String(reader.result ?? ''), attachmentName: file.name })); reader.readAsDataURL(file) }

  function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const attachmentUrl = announcementDraft.attachmentUrl.trim()
    if (attachmentUrl && !announcementDraft.attachmentName && !/^https:\/\//i.test(attachmentUrl)) {
      setNotice('Attachment must be selected from a local file or use an HTTPS link.')
      return
    }
    setAnnouncements((current) => [{ ...announcementDraft, title: announcementDraft.title.trim(), body: announcementDraft.body.trim(), attachmentUrl, id: `announcement-${Date.now()}`, publishedAt: new Date().toISOString() }, ...current])
    setAnnouncementDraft({ title: '', body: '', attachmentUrl: '', attachmentName: '' })
    setNotice('Announcement published to the fictional coach announcement board. No email or text was sent.')
  }

  function completeDraft() { endDraft() }

  const evaluatorOptions = evaluatorOptionsFor(bulkGrade)
  const rulesSearchTerms = [...new Set(ruleWords(ruleQuestion).filter((term) => !ruleStopWords.has(term)))]
  const rulesSearchResults = rulesKnowledge.map((entry) => {
    if (!entry.verified || !rulesSearchTerms.length) return { entry, score: 0 }
    const indexedWords = new Set(ruleWords(`${entry.title} ${entry.section} ${entry.text} ${(entry.keywords ?? []).join(' ')}`))
    const matchedTerms = rulesSearchTerms.filter((term) => matchesRuleTerm(term, indexedWords))
    const coverage = matchedTerms.length / rulesSearchTerms.length
    const titleMatches = matchedTerms.filter((term) => matchesRuleTerm(term, new Set(ruleWords(entry.title)))).length
    return { entry, score: coverage + (titleMatches ? 0.12 : 0) }
  }).filter(({ entry, score }) => entry.verified && rulesSearchTerms.length > 0 && score >= (rulesSearchTerms.length > 3 ? 0.56 : 0.5))
    .sort((first, second) => second.score - first.score)
    .slice(0, 10)
    .map(({ entry }) => entry)
  const activeCoachRatings = (player: Player) => activeEvaluator === evaluatorOptionsFor(player.grade)[0] ? player.ratings : player.coachRatings[activeEvaluator] ?? {}
  const divisionEvaluationsDone = (division: Division) => evaluatorOptionsFor(division).length > 0 && evaluatorOptionsFor(division).every((name) => completedEvaluators[`${division}:${name}`])
  const toggleDivisionHeadCoach = (division: Division, coach: string, checked: boolean) => {
    const selected = coachNames[division]
    const next = checked ? [...new Set([...selected, coach])] : selected.filter((name) => name !== coach)
    setCoachNames((current) => ({ ...current, [division]: next }))
    setDraftOrder((current) => ({ ...current, [division]: checked ? [...new Set([...current[division], coach])] : current[division].filter((name) => name !== coach) }))
    if (division === bulkGrade && !checked && activeEvaluator === coach) setActiveEvaluator(next[0] ?? '')
    if (division === bulkGrade && checked && !selected.length) setActiveEvaluator(coach)
  }
  const setCoachName = (division: Division, index: number, name: string) => {
    const oldName = coachNames[division][index]
    setCoachNames((current) => ({ ...current, [division]: Array.from({ length: Math.max(current[division].length, index + 1) }, (_, currentIndex) => currentIndex === index ? name : current[division][currentIndex] ?? `Coach ${currentIndex + 1}`) }))
    setDraftOrder((current) => ({ ...current, [division]: current[division].map((coach) => coach === oldName ? name : coach) }))
    const trimmed = name.trim()
    if (trimmed) {
      setCoachDirectory((current) => current.includes(trimmed) ? current : [...current, trimmed])
      setHeadCoachDirectory((current) => [...new Set([...current.filter((coach) => coach !== oldName), trimmed])])
    }
  }
  const consolidatedGrade = (player: Player) => {
    const coachScores = evaluatorOptionsFor(player.grade).map((name, index) => {
      const ratings = index === 0 ? player.ratings : player.coachRatings[name] ?? {}
      if (u10Rubric.some(({ id }) => ratings[id] === undefined)) return null
      return calculateWeightedScore(u10Rubric.map(({ id, weight }) => ({ score: ratings[id], weight })), u10Rubric.length)
    })
    return playerLetterGrade(playerAverage(player), coachScores)
  }
  const gradeRank: Record<string, number> = { 'A+': 4, A: 3, B: 2, C: 1, Incomplete: 0 }
  const draftReady = (player: Player) => evaluatorOptionsFor(player.grade).length > 0 && completedCoachReviews(player) >= evaluatorOptionsFor(player.grade).length
  const suggestedTier = (player: Player) => !draftReady(player) || consolidatedGrade(player) === 'Incomplete' ? 'Pending coach reviews' : `${consolidatedGrade(player)} suggested`
  const draftSuggestions = players.filter((player) => player.grade === draftDivision && player.draftEligible && player.status === 'Complete' && draftReady(player) && consolidatedGrade(player) !== 'Incomplete' && !picked.includes(player.id)).sort((first, second) => gradeRank[consolidatedGrade(second)] - gradeRank[consolidatedGrade(first)] || Number(second.number) - Number(first.number))

  function selectNextIncomplete() {
    const currentIndex = myTeamPlayers.findIndex(({ id }) => id === selectedId)
    for (let offset = 1; offset <= myTeamPlayers.length; offset += 1) {
      const candidate = myTeamPlayers[(currentIndex + offset) % myTeamPlayers.length]
      if (Object.keys(aggregatePlayerRatings(candidate)).length < u10Rubric.length) {
        setSelectedId(candidate.id)
        setNotice('')
        return
      }
    }
    setNotice('All demo players have complete evaluations.')
  }

  function openRosterImport() {
    setImportOpen(true)
    setImportKind(null)
    setImportRows([])
    setImagePreview('')
    setImageRosterText('')
    setImportMessage('')
  }

  function parseRosterFile(file: File) {
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setImportMessage('For spreadsheet exports, save as CSV first. This demo accepts CSV files only.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const lines = String(reader.result ?? '').split(/\r?\n/).filter((line) => line.trim())
      if (lines.length < 2) {
        setImportMessage('The CSV needs a header row and at least one player row.')
        return
      }
      const cells = (line: string) => {
        const values: string[] = []
        let value = ''
        let quoted = false
        for (let index = 0; index < line.length; index += 1) {
          const char = line[index]
          if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1 }
          else if (char === '"') quoted = !quoted
          else if (char === ',' && !quoted) { values.push(value.trim()); value = '' }
          else value += char
        }
        values.push(value.trim())
        return values
      }
      const headers = cells(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z]/g, ''))
      const nameIndex = headers.findIndex((header) => ['name', 'playername', 'fullname', 'participantname'].includes(header))
      const firstIndex = headers.findIndex((header) => ['firstname', 'first'].includes(header))
      const lastIndex = headers.findIndex((header) => ['lastname', 'last', 'surname'].includes(header))
      const teamIndex = headers.findIndex((header) => ['team', 'teamname', 'squad'].includes(header))
      if (nameIndex < 0 && (firstIndex < 0 || lastIndex < 0)) {
        setImportMessage('Could not find a player name column. Use �Name� or both �First Name� and �Last Name�.')
        return
      }
      const rows = lines.slice(1).map(cells).map((row) => ({
        name: (nameIndex >= 0 ? row[nameIndex] : `${row[firstIndex] ?? ''} ${row[lastIndex] ?? ''}`).trim(),
        team: teamIndex >= 0 ? row[teamIndex]?.trim() || 'Unassigned' : 'Unassigned',
      })).filter((row) => row.name)
      if (!rows.length) {
        setImportMessage('No player names were found in the CSV rows.')
        return
      }
      setImportRows(rows)
      setImportKind('file')
      setImportMessage(`${rows.length} rows ready for review. Confirm names and teams before adding to this temporary demo.`)
    }
    reader.onerror = () => setImportMessage('Could not read this file. Try exporting it as a UTF-8 CSV.')
    reader.readAsText(file)
  }

  function addImportedPlayers() {
    const existing = new Set(players.map((player) => player.name.toLowerCase()))
    const uniqueRows = importRows.filter((row) => {
      const key = row.name.trim().toLowerCase()
      if (!key || existing.has(key)) return false
      existing.add(key)
      return true
    })
    if (!uniqueRows.length) {
      setImportMessage('No new names to add. Blank rows and names already on this roster are skipped.')
      return
    }
    const additions: Player[] = uniqueRows.map((row, index) => ({
      id: `import-${Date.now()}-${index}`,
      name: row.name.trim(),
      number: String(100 + players.length + index),
      team: row.team.trim() || 'Unassigned',
      grade: bulkGrade,
      assignedCoach: coachNames[bulkGrade][0] ?? '',
      ratings: {},
      coachRatings: {},
      draftEligible: true,
      coachChild: '',
      assistantCoachChild: '',
      linkedPlayerId: '',
      linkedPlayerRelationship: '',
      previousSeasonGrade: '',
      developmentGoals: '',
      change: 0,
      status: 'Needs evaluation',
    }))
    setPlayers((current) => [...current, ...additions])
    setSelectedId(additions[0].id)
    setImportOpen(false)
    setNotice(`${additions.length} fictional demo players added in memory. They will be cleared when this page is refreshed.`)
  }

  function prepareRosterImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setImportMessage('Choose a JPEG, PNG, or other image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportMessage('Image is too large. Choose an image under 10 MB.')
      return
    }
    setImagePreview(URL.createObjectURL(file))
    setImportKind('image')
    setImportRows([])
    setImageRosterText('')
    setImportMessage('Image preview stays in this browser. This demo does not run OCR; transcribe the roster below and review it before adding fictional sample rows.')
  }

  function updateImageRosterText(text: string) {
    setImageRosterText(text)
    setImportRows(text.split(/\r?\n/).map((line) => {
      const [name, ...teamParts] = line.split(',')
      return { name: name.trim(), team: teamParts.join(',').trim() || 'Unassigned' }
    }).filter((row) => row.name))
  }

  async function checkNeonDatabase() {
    setDatabaseStatus('checking')
    try {
      const response = await fetch('/api/health', { cache: 'no-store' })
      const health = await response.json() as { database?: string }
      setDatabaseStatus(response.ok && health.database === 'connected' ? 'connected' : 'unavailable')
    } catch {
      setDatabaseStatus('unavailable')
    }
  }

  const activeGame = games.find((game) => game.id === activeGameId) ?? games[0]
  const todaysGames = games.filter((game) => game.date === scoreDay)
  const activeTeamStaffKey = `${bulkGrade}:${myTeamName}`
  const activeTeamStaff = teamStaff[activeTeamStaffKey] ?? { headCoach: myTeamName, assistantCoach: '', jerseyColor: '#2878d0', teamNickname: myTeamPlayers[0]?.team ?? '' }
  const myTeamEvaluators = [activeTeamStaff.headCoach, activeTeamStaff.assistantCoach].map((name) => name.trim()).filter(Boolean)
  const activeTeamEvaluator = myTeamEvaluators.includes(activeEvaluator) ? activeEvaluator : myTeamEvaluators[0] ?? ''
  const certificatePlayer = certificate ? players.find((player) => player.id === certificate.playerId) : null
  const certificateTeamStaff = certificatePlayer ? teamStaff[`${certificatePlayer.grade}:${playerTeamName(certificatePlayer)}`] ?? { headCoach: playerTeamName(certificatePlayer), assistantCoach: '', jerseyColor: '#2878d0', teamNickname: certificatePlayer.team } : { headCoach: '', assistantCoach: '', jerseyColor: '#2878d0', teamNickname: '' }
  const draftTeams = draftOrder[draftDivision] ?? evaluatorOptionsFor(draftDivision)
  const activeDraftDivision = DIVISIONS.find((division) => !!draftStartedAt[division] && !draftEndedAt[division])
  const coachesInDraftDivision = new Set([...draftTeams, ...Object.entries(teamStaff).filter(([key]) => key.startsWith(`${draftDivision}:`)).flatMap(([, staff]) => [staff.headCoach, staff.assistantCoach]).filter(Boolean)])
  const draftOperatorConflict = coachesInDraftDivision.has(draftOperator)
  const draftOperatorEligible = demoAccess === 'Admin' && demoUserAccess[draftOperator] === 'Admin' && !draftOperatorConflict
  const draftPicksThisDivision = picked.filter((id) => players.find((player) => player.id === id)?.grade === draftDivision)
  const activeDraftTeam = draftTeams.length ? draftTeams[draftPicksThisDivision.length % draftTeams.length] : ''
  const draftEvaluationPlayers = players.filter((player) => player.grade === draftDivision).sort((first, second) => {
    const gradeDifference = gradeRank[consolidatedGrade(second)] - gradeRank[consolidatedGrade(first)]
    return gradeDifference || Number(second.number) - Number(first.number)
  })
  const draftBestAvailable = draftSuggestions[0]
  const developmentTeam = developmentPlayer ? developmentRoster.filter((player) => player.team === developmentPlayer.team) : []
  const developmentIndividualDrills = developmentPlayer ? individualDrillSuggestions(developmentPlayer) : []
  const developmentTeamDrills = teamDrillSuggestions(developmentTeam)
  const developmentStyles = developmentPlayer ? styleStudySuggestions(developmentPlayer) : []
  const developmentPositions = developmentPlayer ? positionSuggestions(developmentPlayer) : []
  const playerReviews = periodicReviews.filter((review) => review.playerId === selectedPlayer.id).sort((a, b) => b.date.localeCompare(a.date))
  const awardRecommendations = awardCriteria.map((award) => ({ ...award, candidates: coachVisiblePlayers.filter((player) => seasonHasEnded && consolidatedDivisions[player.grade] && Object.keys(aggregatePlayerRatings(player)).length === u10Rubric.length && periodicReviews.filter((review) => review.playerId === player.id).length >= 2).map((player) => {
    const ratings = aggregatePlayerRatings(player)
    const reviews = periodicReviews.filter((review) => review.playerId === player.id)
    const evaluationScore = award.evalSkills.reduce((sum, key) => sum + (ratings[key] ?? 0), 0) / award.evalSkills.length
    const gameScore = award.reviewSkills.reduce((sum, key) => sum + reviews.reduce((reviewSum, review) => reviewSum + review[key as keyof Pick<PeriodicReview, 'effort' | 'teamwork' | 'sportsmanship' | 'skillApplication' | 'feedback' | 'encouragement'>] as number, 0) / reviews.length, 0) / award.reviewSkills.length * 2
    return { player, reviews, evaluationScore, gameScore, score: evaluationScore * 0.6 + gameScore * 0.4 }
  }).sort((a, b) => b.score - a.score).slice(0, 3) }))

  function updateGame(gameId: string, changes: Partial<ScoreGame>) {
    setGames((current) => current.map((game) => {
      if (game.id !== gameId || game.finalized) return game
      const isSignatureUpdate = 'homeSigned' in changes || 'awaySigned' in changes || 'homeSignatureName' in changes || 'awaySignatureName' in changes
      return { ...game, ...(isSignatureUpdate ? {} : { homeSigned: false, awaySigned: false, homeSignedAt: '', awaySignedAt: '' }), ...changes }
    }))
  }

  function changeGameScore(side: 'home' | 'away', amount: number) {
    if (!activeGame || activeGame.finalized) return
    const key = side === 'home' ? 'homeScore' : 'awayScore'
    updateGame(activeGame.id, { [key]: Math.max(0, activeGame[key] + amount) })
  }

  function signOffGame(side: 'home' | 'away') {
    if (!activeGame || activeGame.finalized) return
    const signatureName = side === 'home' ? activeGame.homeSignatureName.trim() : activeGame.awaySignatureName.trim()
    if (!signatureName) {
      setNotice(`Enter the ${side} coach's name in the signature field before signing.`)
      return
    }
    const signedAt = new Date().toISOString()
    updateGame(activeGame.id, side === 'home' ? { homeSigned: true, homeSignatureName: signatureName, homeSignedAt: signedAt } : { awaySigned: true, awaySignatureName: signatureName, awaySignedAt: signedAt })
    setNotice(`${side === 'home' ? activeGame.homeTeam : activeGame.awayTeam} score confirmation recorded for this session.`)
  }

  function finalizeGame() {
    if (!activeGame || !activeGame.homeSigned || !activeGame.awaySigned) {
      setNotice('Both coaches must confirm the score before the referee can finalize this demo card.')
      return
    }
    setGames((current) => current.map((game) => game.id === activeGame.id ? { ...game, finalized: true } : game))
    setNotice('Demo score finalized and locked for this session. No audit record was persisted.')
  }

  function selectNavigation(label: Section) {
    setSection(label)
    setMobileMenu(false)
  }

  async function toggleEvaluationFullscreen() {
    const panel = document.querySelector<HTMLElement>('.bulk-evaluation-panel')
    if (!panel) return
    if (document.fullscreenElement === panel) {
      await document.exitFullscreen().catch(() => setNotice('Use the browser Escape key to leave full-screen view.'))
      return
    }
    if (!panel.requestFullscreen) {
      setNotice('Full-screen chart view is not supported by this browser. You can still rotate your device to widen the chart.')
      return
    }
    try {
      await panel.requestFullscreen({ navigationUI: 'hide' })
      try {
        const orientation = window.screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> }
        await orientation.lock?.('landscape')
      } catch { /* Full-screen remains available even if orientation lock is unsupported. */ }
    } catch {
      setNotice('Could not enter full-screen chart view. Try the browser full-screen control instead.')
    }
  }

  function addDraftPick() {
    const available = draftSuggestions.find((player) => player.id === draftPlayerPickId) ?? draftSuggestions[0]
    if (!available || !activeDraftTeam || demoAccess !== 'Coach' || draftCoachTeam !== activeDraftTeam || draftCompleted[draftDivision] || !draftStartedAt[draftDivision] || draftEndedAt[draftDivision]) return
    setPicked((current) => [...current, available.id])
    setDraftTeamAssignments((current) => ({ ...current, [available.id]: draftCoachTeam }))
    setMyTeamSelection(draftCoachTeam)
    setDraftPlayerPickId('')
    setNotice(`${available.name} selected by ${draftCoachTeam}. The coach's My Team demo roster updates immediately in this browser.`)
  }

  function updateDraftJersey(playerId: string, value: string) {
    if (value && !/^\d{1,2}$/.test(value)) {
      setNotice('Enter a jersey number from 0 to 99.')
      return
    }
    const seasonJerseys = draftJerseysBySeason[activeSeasonId] ?? {}
    const duplicate = value && Object.entries(seasonJerseys).some(([id, jersey]) => id !== playerId && jersey === value)
    if (duplicate) {
      setNotice(`Jersey #${value} is already assigned to this demo roster.`)
      return
    }
    setDraftJerseysBySeason((current) => ({ ...current, [activeSeasonId]: { ...current[activeSeasonId], [playerId]: value } }))
    setNotice('')
  }

  return (
    <div className="app-shell">
      <aside id="workspace-sidebar" className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); selectNavigation('Overview') }} aria-label="PlayerSmart home">
          <img className="brand-logo" src={theme === 'dark' ? '/playersmart-logo-player-v2-dark.png' : '/playersmart-logo-player-v2.png'} alt="PlayerSmart" />
        </a>
        <div className="org-switcher"><img className="org-logo" src="/pdsa-logo.png" alt="PDSA" /><span className="org-name"><strong>PDSA</strong><small>Palo Duro Soccer Association</small></span><ChevronDown size={16} /></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, tag }) => <button key={label} type="button" aria-label={tag ? `${label} ${tag}` : label} title={label} className={`nav-item ${section === label ? 'nav-active' : ''}`} onClick={() => selectNavigation(label)}><Icon size={18} /><span>{label}</span>{tag && <span className={`nav-tag ${tag === 'BETA' ? 'tag-beta' : ''}`}>{tag}</span>}</button>)}
        </nav>
      </aside>

      {mobileMenu && <button className="mobile-scrim" aria-label="Dismiss navigation drawer" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" type="button" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu} aria-controls="workspace-sidebar" onClick={() => setMobileMenu((open) => !open)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{section}</strong></div>
          <div className="topbar-actions"><span className="season-pill"><CalendarDays size={15} /> Fall 2026 � Demo</span><button className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'light'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You�re all caught up.')}><Bell size={18} /><i /></button><button className="top-account-button" aria-label={user ? `Sign out ${user.email}` : 'Sign out Coach Demo'} title={user?.email ?? 'Coach Demo'} onClick={neonAuthConfigured ? signOut : () => setNotice('This fictional demo has no signed-in account.')}><span className="top-avatar">{user?.email?.slice(0, 2).toUpperCase() ?? 'CD'}</span><span className="top-account-label">{user?.email ?? 'Coach Demo'}</span><LogOut size={14} /></button></div>
        </header>
        <div className="page-content">
          <div className="demo-warning"><ShieldCheck size={16} /><span><strong>DEMO WORKSPACE</strong> � All names and ratings are fictional. Do not enter real youth information.</span><button aria-label="Dismiss demo notice" onClick={(event) => event.currentTarget.parentElement?.remove()}><X size={15} /></button></div>
          {notice && <div className="toast" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15} /></button></div>}

          {section === 'Overview' && <>
            <div className="page-heading"><div><p className="eyebrow">DEMO ORGANIZATION � U10 SAMPLE <span className="live-dot" /></p><h1>Good morning, Coach.</h1><p className="heading-subtitle">A quick look at your player development workspace.</p></div><div className="overview-actions"><button className="button-secondary" onClick={checkNeonDatabase} disabled={databaseStatus === 'checking'}>{databaseStatus === 'checking' ? 'Checking Neon�' : 'Check Neon connection'}</button><button className="button-primary" onClick={() => selectNavigation('Evaluations')}><Plus size={17} /> Start evaluation</button>{databaseStatus !== 'not-checked' && <span className={`database-status database-${databaseStatus}`} role="status">{databaseStatus === 'connected' ? 'Neon database connected' : databaseStatus === 'checking' ? 'Checking database�' : 'Neon database unavailable'}</span>}</div></div>
            <section className="stats-grid" aria-label="Workspace summary">
              <StatCard label="Players evaluated" value={`${ratedCount} / ${players.length}`} caption="Across all demo teams" icon={<ClipboardCheck size={18} />} trend="12%" up />
              <StatCard label="Avg. skill snapshot" value="7.2" caption="U10 � current event" icon={<Activity size={18} />} trend="0.4" up />
              <StatCard label="Development goals" value="18" caption="Across your assigned roster" icon={<Goal size={18} />} trend="3 new" />
              <StatCard label="Next event" value="Nov 01" caption="U10 evaluation � Field 2" icon={<CalendarDays size={18} />} trend="5 days" />
            </section>
            <div className="overview-grid">
              <section className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">KEEP THE MOMENTUM</p><h2>Player snapshots</h2></div><button className="text-button" onClick={() => selectNavigation('Evaluations')}>View evaluations <span>?</span></button></div>
                <div className="player-table-wrap"><table className="player-table"><thead><tr><th>PLAYER</th><th>TEAM</th><th>SKILL SNAPSHOT</th><th>CHANGE</th><th>STATUS</th></tr></thead><tbody>{coachVisiblePlayers.slice(0, 4).map((player, index) => <tr key={player.id} onClick={() => { setSelectedId(player.id); selectNavigation('Evaluations') }}><td><span className={`player-avatar avatar-${index}`}>{player.name.split(' ').map((part) => part[0]).join('')}</span><span className="player-name">{player.name}<small>U10 � #{player.number}</small></span></td><td>{player.team}</td><td>{playerAverage(player) ?? '�'} <span className="out-of">/ 10</span></td><td className={player.change ? 'positive-change' : 'muted'}>{player.change ? <><ArrowUpRight size={14} /> {player.change.toFixed(1)}</> : '�'}</td><td><span className={`status-badge ${player.status === 'Complete' ? 'status-complete' : player.status === 'In progress' ? 'status-in-progress' : 'status-needs-evaluation'}`}><i />{player.status}</span></td></tr>)}</tbody></table></div>
              </section>
              <section className="panel next-panel"><div className="panel-heading"><div><p className="eyebrow">UP NEXT � SAMPLE EVENTS</p><h2>Upcoming</h2></div><span className="calendar-icon"><CalendarDays size={17} /></span></div><div className="event-card"><span className="event-date"><strong>01</strong><small>NOV</small></span><div><strong>U10 evaluation event</strong><small>Sunday � 9:00 AM</small><small>Demo field � Field 2</small></div><span className="event-chevron">�</span></div><div className="event-card event-card-muted"><span className="event-date"><strong>08</strong><small>NOV</small></span><div><strong>Coach development huddle</strong><small>Sunday � 10:30 AM</small><small>Demo clubhouse � Meeting room</small></div><span className="event-chevron">�</span></div><button className="full-width-button" onClick={() => setNotice('Calendar view is coming soon.')}>Open calendar <span>?</span></button></section>
            </div>
            <section className="insight-banner"><span className="insight-spark"><Sparkles size={18} /></span><div><strong>Small steps build confident players.</strong><p>Pick one strength to celebrate and one skill to practice this week.</p></div><button onClick={() => selectNavigation('Develop')}>Open development board <span>?</span></button></section>
          </>}

          {section === 'Evaluations' && <>
            <div className="page-heading"><div><p className="eyebrow">EVALUATION EVENT � {bulkGrade}</p><h1>Evaluations</h1><p className="heading-subtitle">A development snapshot, not a measure of a player�s potential.</p></div><button className="button-secondary" onClick={openRosterImport}><FileUp size={17} /> Import roster</button></div>
            <section className="panel evaluation-participants" aria-labelledby="participants-heading"><div className="participants-title"><div><p className="eyebrow">SCHEDULED EVENT ? {evaluationDates[bulkGrade] || 'Date not set in Admin'}</p><h2 id="participants-heading">Division group evaluation</h2><p>Evaluation dates are set by the PDSA Board in Admin. Team-level player reviews are in My Team.</p></div><span className="participants-division">{bulkGrade}</span></div><div className="participant-controls"><label>Age division<select aria-label="Evaluation division" value={bulkGrade} onChange={(event) => { const division = event.target.value as Player['grade']; setBulkGrade(division); setActiveEvaluator(evaluatorOptionsFor(division)[0] ?? 'Coach 1') }}>{(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const).map((division) => <option key={division} value={division}>{division}</option>)}</select></label><div className="coach-team-count" aria-live="polite"><strong>{evaluatorOptions.length}</strong> {evaluatorOptions.length === 1 ? 'team' : 'teams'} from selected head coaches</div><label>Scoring as<select aria-label="Current evaluating coach" value={activeEvaluator} onChange={(event) => setActiveEvaluator(event.target.value)}>{evaluatorOptions.map((coach) => <option key={coach} value={coach}>{coach}</option>)}</select></label></div><div className="participant-roster"><div className="participant-coaches"><div className="participant-coaches-heading"><strong>Select head coaches</strong><span>One selected head coach creates one team.</span></div><div className="participant-name-fields coach-selection-list">{[...new Set([...headCoachDirectory, ...coachNames[bulkGrade]])].map((coach) => <label key={coach} className="coach-selection-option"><input type="checkbox" aria-label={`Select head coach ${coach}`} checked={coachNames[bulkGrade].includes(coach)} onChange={(event) => toggleDivisionHeadCoach(bulkGrade, coach, event.target.checked)} /><span>{coach}</span></label>)}</div><span className="participant-count">{evaluatorOptions.length} {evaluatorOptions.length === 1 ? 'team' : 'teams'} configured for {bulkGrade}</span></div></div><div className="participant-footer"><span className={completedEvaluators[`${bulkGrade}:${activeEvaluator}`] ? 'participant-done' : ''}>{completedEvaluators[`${bulkGrade}:${activeEvaluator}`] ? `${activeEvaluator} marked this evaluation done` : `${activeEvaluator} has not marked this evaluation done`}</span><small>Each coach scores independently. Consolidation is available after all listed coaches finish.</small></div></section>

            <div className="bulk-evaluation-entry"><div><strong>Evaluate multiple players</strong><small>Score a whole evaluation roster in a spreadsheet-style view. Individual player evaluation and goal setting are available in My Team.</small></div><button className="button-secondary" onClick={() => setBulkEvaluationOpen((open) => !open)}>{bulkEvaluationOpen ? 'Close group evaluation' : 'Open scheduled group evaluation'}</button></div>
{bulkEvaluationOpen && <section className="panel bulk-evaluation-panel"><div className="bulk-evaluation-heading"><div><p className="eyebrow">BATCH SCORING � DRAFT PREPARATION</p><h2>{bulkGrade} player evaluations</h2><p>Record independent ratings from each coach. Draft eligibility, relationships and prior-season level are notes for human decision-makers�not automatic placement rules.</p></div><div className="batch-controls"><label>Age division<select aria-label="Batch evaluation age division" value={bulkGrade} onChange={(event) => setBulkGrade(event.target.value as Player['grade'])}>{(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label><label>Evaluator<select aria-label="Batch evaluation coach" value={activeEvaluator} onChange={(event) => setActiveEvaluator(event.target.value)}>{evaluatorOptions.map((coach) => <option key={coach} value={coach}>{coach}</option>)}</select></label><button className="button-secondary evaluation-fullscreen-toggle" type="button" aria-label={evaluationFullscreen ? 'Exit full screen chart' : 'Show evaluation chart full screen'} aria-pressed={evaluationFullscreen} onClick={toggleEvaluationFullscreen}>{evaluationFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{evaluationFullscreen ? 'Exit full screen' : 'Full screen chart'}</button></div><button className="button-secondary" disabled={completedEvaluators[`${bulkGrade}:${activeEvaluator}`] || players.filter((player) => player.grade === bulkGrade).some((player) => Object.keys(activeCoachRatings(player)).length !== u10Rubric.length)} onClick={() => setCompletedEvaluators((current) => ({ ...current, [`${bulkGrade}:${activeEvaluator}`]: true }))}>{completedEvaluators[`${bulkGrade}:${activeEvaluator}`] ? `${activeEvaluator} evaluation done` : `Mark ${activeEvaluator} evaluation done`}</button><p className="coach-progress-note">Scheduled division evaluation data is demo-only. Production must enforce scorer access and consolidated visibility server-side.</p></div><div className="batch-evaluation-table-wrap"><table className="batch-evaluation-table"><thead><tr><th scope="col">Player</th><th scope="col">Eval #</th><th scope="col">Draft?</th><th scope="col">Coach's child</th><th scope="col">Assistant coach's child</th><th scope="col">Keep linked with</th><th scope="col">Relationship</th><th scope="col">Prior season</th><th scope="col">Goals from form</th>{u10Rubric.map((category) => <th scope="col" key={category.id} title={category.description}>{category.label}</th>)}<th scope="col">Avg. level</th><th scope="col">Suggested tier</th></tr></thead><tbody>{filteredPlayers.filter((player) => player.grade === bulkGrade).map((player) => <tr key={player.id}><th scope="row">{player.name}</th><td>{player.number}</td><td><select aria-label={`${player.name} draft eligible`} value={player.draftEligible ? 'yes' : 'no'} onChange={(event) => updatePlayerMetadata(player.id, { draftEligible: event.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></select></td><td><select aria-label={`${player.name} coach parent`} value={player.coachChild} onChange={(event) => updatePlayerMetadata(player.id, { coachChild: event.target.value })}><option value="">No</option>{evaluatorOptions.map((coach) => <option key={coach} value={coach}>{coach}</option>)}</select></td><td><select aria-label={`${player.name} assistant coach parent`} value={player.assistantCoachChild} onChange={(event) => updatePlayerMetadata(player.id, { assistantCoachChild: event.target.value })}><option value="">No</option>{evaluatorOptions.map((coach) => <option key={coach} value={coach}>{coach}</option>)}</select></td><td><select aria-label={`${player.name} linked player`} value={player.linkedPlayerId} onChange={(event) => updatePlayerMetadata(player.id, { linkedPlayerId: event.target.value })}><option value="">No link</option>{players.filter((other) => other.id !== player.id && other.grade === bulkGrade).map((other) => <option key={other.id} value={other.id}>{other.name} (#{other.number})</option>)}</select></td><td><select aria-label={`${player.name} relationship type`} value={player.linkedPlayerRelationship} onChange={(event) => updatePlayerMetadata(player.id, { linkedPlayerRelationship: event.target.value as Player['linkedPlayerRelationship'] })}><option value="">Type</option><option value="Sibling">Sibling</option><option value="Friend request">Friend request</option><option value="Household">Household</option><option value="Other">Other</option></select></td><td><select aria-label={`${player.name} prior season grade`} value={player.previousSeasonGrade} onChange={(event) => updatePlayerMetadata(player.id, { previousSeasonGrade: event.target.value as Player['previousSeasonGrade'] })}><option value="">No prior season grade</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></td><td><input aria-label={`${player.name} development goals from form`} value={player.developmentGoals} onChange={(event) => updatePlayerMetadata(player.id, { developmentGoals: event.target.value })} placeholder="Add athlete goal" /></td>{u10Rubric.map((category) => <td key={category.id}><select aria-label={`${player.name} ${category.label} rating`} value={(activeEvaluator === evaluatorOptions[0] ? player.ratings : player.coachRatings[activeEvaluator] ?? {})[category.id] ?? ''} onChange={(event) => { updateBulkRating(player.id, category.id, event.target.value ? Number(event.target.value) : null) }}><option value="">�</option>{Array.from({ length: 10 }, (_, index) => index + 1).map((score) => <option value={score} key={score}>{score}</option>)}</select></td>)}<td className="batch-snapshot">{playerAverage(player) ?? 'Incomplete'}</td><td className="batch-tier">{suggestedTier(player)}</td></tr>)}</tbody></table>{filteredPlayers.filter((player) => player.grade === bulkGrade).length === 0 && <p className="empty-state">No players in {bulkGrade} match this search and evaluation filter. Import a fictional roster for this division or change the filter.</p>}</div><p className="bulk-demo-note"><ShieldCheck size={14} /> Draft tiers are provisional suggestions based on the mean of recorded coach ratings (A &gt;= 8, B &gt;= 6, C &lt; 6). They do not replace coach review. Fictional data only; nothing is saved to Neon.</p><div className="consolidation-toolbar"><button className="button-primary" disabled={!divisionEvaluationsDone(bulkGrade)} onClick={() => setConsolidatedDivisions((current) => ({ ...current, [bulkGrade]: true }))}>Consolidate {bulkGrade} coach evaluations</button><span>{divisionEvaluationsDone(bulkGrade) ? "All participating coaches are done" : "Each participating coach must mark the evaluation done first"}</span></div>{consolidatedDivisions[bulkGrade] && <section className="consolidated-results" aria-label="Consolidated player grades"><h3>Consolidated player grades - {bulkGrade}</h3><p>Combined across completed evaluator ratings. Individual coach grades and scores are not shown here.</p><table><thead><tr><th>Player</th><th>Consolidated grade</th><th>Prior season grade</th></tr></thead><tbody>{players.filter((player) => player.grade === bulkGrade).map((player) => <tr key={player.id}><th scope="row">{player.name}</th><td>{consolidatedGrade(player)}</td><td>{player.previousSeasonGrade || "Not recorded"}</td></tr>)}</tbody></table></section>}</section>}

          </>}

          {section === 'Draft' && <><div className="page-heading"><div><p className="eyebrow">DRAFT WORKSPACE</p><h1>Draft board</h1><p className="heading-subtitle">Admins manage the draft clock; coaches select players in turn. Picks update My Team immediately in this browser session only.</p></div></div><section className="panel draft-preview"><div className="draft-toolbar"><div><span className="draft-live"><i /> DEMO SUGGESTIONS � HUMAN REVIEW REQUIRED</span><h2>{draftDivision} draft workspace {draftCompleted[draftDivision] && <span className="final-status">COMPLETED</span>}</h2><p>Separate division view � Coaches select players in the displayed turn order; scores and grades support a human decision.</p></div></div><div className="draft-setup"><label>Draft division<select aria-label="Draft division" value={draftDivision} disabled={!!activeDraftDivision} onChange={(event) => { const division = event.target.value as Division; setDraftDivision(division); setDraftCoachTeam(draftOrder[division]?.[0] ?? evaluatorOptionsFor(division)[0] ?? '') }}>{(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const).map((division) => <option key={division} value={division}>{division}</option>)}</select></label><label>Demo role preview<select aria-label="Draft demo access" value={demoAccess} onChange={(event)=>setDemoAccess(event.target.value as DemoAccess)}>{(['Admin','Coach','Referee','Volunteer'] as const).map((role)=><option key={role}>{role}</option>)}</select></label><p className="draft-turn-indicator" aria-live="polite">On the clock: <strong>{activeDraftTeam || 'No coach configured'}</strong> ? pick {draftPicksThisDivision.length + 1}</p>{demoAccess === 'Admin' && <section className="panel draft-admin-controls"><div className="draft-admin-heading"><h3>Admin draft controls</h3><span>Admin preview only ? session state</span></div><label>Draft operator<select aria-label="Draft operator" value={draftOperator} disabled={!!activeDraftDivision} onChange={(event) => setDraftOperator(event.target.value)}>{Object.entries(demoUserAccess).filter(([, role]) => role === 'Admin').map(([name]) => <option key={name} value={name}>{name}</option>)}</select></label>{draftOperatorConflict && <p className="draft-operator-warning" role="alert">This Admin is a head coach in {draftDivision} and cannot run this division draft.</p>}<div className="admin-draft-order"><strong>Coach draft order ? one team per head coach</strong>{draftTeams.map((coach,index)=><div key={coach}><span>{index+1}. {coach}</span><button className="button-secondary" aria-label={`Move ${coach} up`} disabled={index===0||!!draftStartedAt[draftDivision]} onClick={()=>updateDraftOrder(draftDivision,index,-1)}>Move up</button><button className="button-secondary" aria-label={`Move ${coach} down`} disabled={index===draftTeams.length-1||!!draftStartedAt[draftDivision]} onClick={()=>updateDraftOrder(draftDivision,index,1)}>Move down</button></div>)}<button className="button-secondary" disabled={!!draftStartedAt[draftDivision]} onClick={()=>randomizeDraftOrder(draftDivision)}>Randomize draft order</button></div><div className="admin-draft-actions"><span>{draftStartedAt[draftDivision] ? draftEndedAt[draftDivision] ? `Draft ended ${new Date(draftEndedAt[draftDivision]).toLocaleString()}` : `Draft running ? ${Math.floor((draftClockTick-new Date(draftStartedAt[draftDivision]).getTime())/60000)} minutes` : 'Draft not started'}</span><button className="button-primary" disabled={!!draftStartedAt[draftDivision] || !!activeDraftDivision || !draftTeams.length || !draftOperatorEligible} onClick={startDraft}>Start draft</button><button className="button-secondary" disabled={!draftStartedAt[draftDivision]||!!draftEndedAt[draftDivision]||!draftOperatorEligible} onClick={endDraft}>End draft</button></div></section>}{demoAccess !== 'Admin' && <p className="admin-note">Coach demo picks are limited to the coach currently on the clock. This preview cannot enforce real user identity or cross-device permissions.</p>}<span className="coach-team-count">{draftTeams.length} head coach{draftTeams.length===1?'':'es'} ? {draftTeams.length} team{draftTeams.length===1?'':'s'}</span><div className="draft-participants-summary"><strong>Evaluation participants for {draftDivision}</strong><span>{evaluatorOptionsFor(draftDivision).join(", ") || "No coaches configured"}</span><span>Coach draft order: {draftTeams.join(", ") || "No coaches listed"}</span></div><span className="draft-division-note">Counts and coach names above are shared with Evaluate. U8 Boys and U8 Girls are separate drafts.</span></div><section className="panel live-draft-board" aria-labelledby="live-draft-board-heading"><div className="live-draft-board-heading"><div><p className="eyebrow">LIVE DIVISION BOARD</p><h3 id="live-draft-board-heading">{draftDivision} player assignments</h3><p>All evaluation players are listed. A grade appears as soon as that player has a complete score from every participating coach.</p></div><span className="live-board-count">{draftEvaluationPlayers.length} players</span></div>{activeDraftDivision && <p className="draft-lock-notice" role="status">{activeDraftDivision} has the only active draft in this browser session. Operator: {draftOperator}.</p>}<div className="live-draft-table-wrap"><table className="live-draft-table"><thead><tr><th>PLAYER</th><th>EVALUATION</th><th>LETTER GRADE</th><th>TEAM STATUS</th></tr></thead><tbody>{draftEvaluationPlayers.map((player) => { const currentTeam = draftTeamAssignments[player.id] ?? (draftTeams.includes(player.assignedCoach ?? '') ? player.assignedCoach : ''); const grade = consolidatedGrade(player); const committed = Boolean(draftTeamAssignments[player.id]); return <tr key={player.id} className={committed ? 'draft-assignment-committed' : ''}><th scope="row">{player.name}<small>Eval #{player.number}</small></th><td>{playerAverage(player)?.toFixed(2) ?? 'Not fully scored'} <small>/ 10</small></td><td><span className={grade === 'Incomplete' ? 'draft-grade draft-grade-incomplete' : 'draft-grade'}>{grade}</span></td><td>{currentTeam || 'Available'}</td></tr> })}{draftEvaluationPlayers.length === 0 && <tr><td colSpan={4}>No evaluation players in {draftDivision} yet.</td></tr>}</tbody></table></div>{!draftStartedAt[draftDivision] && <p className="admin-note">After Admin starts the draft, coaches make picks in turn. The committed player row is greyed out and the My Team demo roster updates immediately in this browser.</p>}</section><section className="panel coach-pick-queue" aria-labelledby="coach-pick-queue-heading"><div className="live-draft-board-heading"><div><p className="eyebrow">COACH PICK QUEUE</p><h3 id="coach-pick-queue-heading">On the clock</h3><p>The queue shows the coach whose turn it is and the highest-rated fully evaluated player still available.</p></div></div><div className="live-draft-table-wrap"><table className="live-draft-table"><thead><tr><th>PICK</th><th>COACH ON THE CLOCK</th><th>BEST AVAILABLE PLAYER</th><th>GRADE</th><th>EVALUATION</th></tr></thead><tbody><tr><td>{draftPicksThisDivision.length + 1}</td><td>{activeDraftTeam || 'No coach configured'}</td><td>{draftBestAvailable ? <>{draftBestAvailable.name}<small>Eval #{draftBestAvailable.number}</small></> : 'No fully scored player available'}</td><td>{draftBestAvailable ? consolidatedGrade(draftBestAvailable) : '?'}</td><td>{draftBestAvailable ? playerAverage(draftBestAvailable)?.toFixed(2) ?? '?' : '?'}</td></tr></tbody></table></div>{demoAccess === 'Coach' && <div className="coach-pick-controls"><p className="coach-pick-help">Coach demo view only. Select a player on your turn; picks are assigned to the team whose turn is active.</p><label>Coach team<select aria-label="Coach team for draft pick" value={draftCoachTeam} onChange={(event) => setDraftCoachTeam(event.target.value)}>{draftTeams.map((coach) => <option key={coach} value={coach}>{coach}</option>)}</select></label><label>Player selection<select aria-label="Select player to draft" value={draftPlayerPickId || draftBestAvailable?.id || ''} onChange={(event) => setDraftPlayerPickId(event.target.value)}><option value="">Select available player</option>{draftSuggestions.map((player) => <option key={player.id} value={player.id}>{player.name} ? Eval #{player.number} ? {consolidatedGrade(player)} ? {playerAverage(player)?.toFixed(2)}/10</option>)}</select></label><button className="button-primary" type="button" disabled={!draftStartedAt[draftDivision] || !!draftEndedAt[draftDivision] || !draftBestAvailable || draftCoachTeam !== activeDraftTeam} onClick={addDraftPick}>Make coach pick</button>{draftCoachTeam !== activeDraftTeam && <span className="coach-pick-help" role="status">It is {activeDraftTeam || 'no coach'}?s turn; picks are locked to the coach on the clock.</span>}</div>}{demoAccess === 'Admin' && <p className="admin-note">The Admin controls the draft clock only. Player selection is reserved for the coach whose turn is active.</p>}</section><div className="draft-suggestion-wrap"><table className="draft-suggestion-table"><thead><tr><th>Suggested order</th><th>Player</th><th>Average score</th><th>Consolidated grade</th><th>Suggested skill tier</th><th>Prior season</th><th>Coach reviews</th><th>Draft notes</th></tr></thead><tbody>{draftSuggestions.map((player, index) => <tr key={player.id}><td>{index + 1}</td><th scope="row">{player.name} � #{player.number}</th><td>{playerAverage(player)?.toFixed(2) ?? 'Pending'}</td><td>{consolidatedGrade(player)}</td><td>{suggestedTier(player)}</td><td>{player.previousSeasonGrade || 'No prior season grade'}</td><td>{completedCoachReviews(player)} / {evaluatorOptionsFor(player.grade).length || '?'}</td><td>{[player.coachChild && `Coach parent: ${player.coachChild}`, player.assistantCoachChild && `Assistant coach parent: ${player.assistantCoachChild}`, player.linkedPlayerId && `Linked with ${players.find((other) => other.id === player.linkedPlayerId)?.name ?? 'another player'}`].filter(Boolean).join(' � ') || '�'}</td></tr>)}</tbody></table>{draftSuggestions.length === 0 && <p className="empty-state">No fully scored, draft-eligible players are available in {draftDivision} yet.</p>}</div><div className="draft-completion"><p>{draftCompleted[draftDivision] ? `Draft finalized for ${draftDivision}.` : `${picked.filter((id) => players.find((player) => player.id === id)?.grade === draftDivision).length} provisional selections`}</p><button className="button-primary" disabled={!draftOperatorEligible || draftCompleted[draftDivision] || !picked.some((id) => players.find((player) => player.id === id)?.grade === draftDivision)} onClick={completeDraft}>Complete {draftDivision} draft</button></div><div className="draft-columns"><div><h3>AVAILABLE � {draftDivision} <span>{draftSuggestions.length}</span></h3>{draftSuggestions.map((player) => <div className="draft-player" key={player.id}><span className="draft-number">Eval #{player.number}</span><strong>{player.name}</strong><span>{playerAverage(player)?.toFixed(2)} � {completedCoachReviews(player)} coach reviews</span></div>)}</div><div><h3>DEMO PICKS � {draftDivision} <span>{picked.filter((id) => players.find((player) => player.id === id)?.grade === draftDivision).length} picks</span></h3>{picked.filter((id) => players.find((player) => player.id === id)?.grade === draftDivision).map((id, index) => { const player = players.find((entry) => entry.id === id)!; return <div className="draft-player drafted-player" key={id}><span className="pick-number">{index + 1}</span><span className="draft-number" aria-label={`Evaluation number ${player.number}`}>Eval #{player.number}</span><strong>{player.name}</strong><span className="drafted-team-readonly">Selected by {draftTeamAssignments[player.id] ?? activeDraftTeam}</span><label className="jersey-field">Season jersey<input aria-label={`Jersey number for ${player.name} in Fall 2026`} inputMode="numeric" maxLength={2} placeholder="�" value={draftJerseysBySeason[activeSeasonId]?.[id] ?? ''} onChange={(event) => updateDraftJersey(id, event.target.value)} /></label></div> })}{picked.filter((id) => players.find((player) => player.id === id)?.grade === draftDivision).length === 0 && <p className="empty-state">No demo picks in this division.</p>}</div></div><p className="draft-disclaimer"><ShieldCheck size={16} /> Draft order requires a complete review from every configured participating coach; scores are averaged across those reviews. Letter grades use the displayed one-decimal score: A = 9.0?10.0, B = 8.0?8.9, C = 0.0?7.9. A+ is reserved for players whose complete individual weighted average is 9.7?10.0 with every participating coach. Relationship flags are visible to authorized draft reviewers only and do not auto-link or place players. Demo changes are session-only.</p></section></>}

          {section === 'My Team' && <><div className="page-heading"><div><p className="eyebrow">COACH WORKSPACE ? DEMO TEAM SELECTOR</p><h1>My Team</h1><p className="heading-subtitle">Your assigned roster and coaching staff. Draft assignments appear here as soon as the Admin updates the board.</p></div></div><div className="season-access-banner"><ShieldCheck size={17} /><span>{seasonHasEnded ? 'SEASON COMPLETE - season-wide player visibility is configured in Admin.' : 'IN SEASON - this demo filters to the selected team only.'} <small>This preview filter is not an authorization boundary; production access must be enforced by verified team assignments and server-side policies.</small></span></div><section className="panel my-team-panel" aria-labelledby="my-team-heading"><div className="my-team-heading"><div><p className="eyebrow">TEAM ROSTER</p><h2 id="my-team-heading">My Team</h2><p>This roster follows the current team assignment, including selections made during an active draft.</p></div><span className="my-team-count">{myTeamPlayers.length} players</span></div><div className="my-team-controls"><label>Division<select aria-label="My Team division" value={bulkGrade} onChange={(event) => { const division = event.target.value as Division; setBulkGrade(division); setMyTeamSelection('') }}>{(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const).map((division) => <option key={division} value={division}>{division}</option>)}</select></label><label>Coach roster<select aria-label="My Team coach roster" value={myTeamName} onChange={(event)=>setMyTeamSelection(event.target.value)}>{myTeamNames.map((coach)=><option key={coach} value={coach}>{coach}</option>)}</select></label><p className="assigned-team-label"><strong>Coach last name ? team nickname</strong><span>{myTeamName.trim().split(/\s+/).at(-1) || 'Coach not assigned'}</span></p><label>Team nickname<input aria-label="Team nickname" value={activeTeamStaff.teamNickname} maxLength={40} placeholder="Choose a team nickname" onChange={(event)=>{const teamNickname=event.target.value;const previousNickname=activeTeamStaff.teamNickname;setTeamStaff((current)=>({...current,[activeTeamStaffKey]:{...activeTeamStaff,teamNickname}}));setPlayers((current)=>current.map((player)=>player.grade===bulkGrade&&playerTeamName(player)===myTeamName?{...player,team:teamNickname}:player));setGames((current)=>current.map((game)=>({...game,homeTeam:game.homeTeam===previousNickname?teamNickname:game.homeTeam,awayTeam:game.awayTeam===previousNickname?teamNickname:game.awayTeam})))}} /></label><label>Head coach<select aria-label="My Team head coach" value={activeTeamStaff.headCoach} onChange={(event) => setTeamStaff((current) => ({ ...current, [activeTeamStaffKey]: { ...activeTeamStaff, headCoach: event.target.value } }))}><option value="">Select assigned head coach</option>{coachDirectory.map((coach) => <option key={coach}>{coach}</option>)}</select></label><label>Shirt color<select aria-label="Team shirt color" value={activeTeamStaff.jerseyColor} onChange={(event)=>updateJerseyColor(event.target.value)}>{SHIRT_COLORS.map((color)=><option key={color.name} value={color.hex}>{color.name}</option>)}</select></label>{activeTeamStaff.jerseyColor===SHIRT_COLORS.find((color)=>color.name==='Other')?.hex&&<label>Custom shirt color<input aria-label="Custom shirt color" type="color" value={activeTeamStaff.jerseyColor} onChange={(event)=>updateJerseyColor(event.target.value)}/></label>}<label>Assistant coach<select aria-label="My Team assistant coach" value={activeTeamStaff.assistantCoach} onChange={(event) => setTeamStaff((current) => ({ ...current, [activeTeamStaffKey]: { ...activeTeamStaff, assistantCoach: event.target.value } }))}><option value="">Not assigned</option>{coachDirectory.map((coach) => <option key={coach}>{coach}</option>)}</select></label>{!activeTeamStaff.assistantCoach && <div className="assistant-entry"><label>Assistant coach name (if not listed)<input aria-label="Missing assistant coach name" value={missingAssistantName} onChange={(event) => setMissingAssistantName(event.target.value)} maxLength={80}/></label><button className="button-secondary" disabled={!missingAssistantName.trim()} onClick={() => { const name = missingAssistantName.trim(); setCoachDirectory((current) => current.includes(name) ? current : [...current, name]); setTeamStaff((current) => ({...current, [activeTeamStaffKey]: {...activeTeamStaff, assistantCoach: name}})); setMissingAssistantName('') }}>Add assistant to team</button></div>}</div>{selectedPlayer && <section className="team-goal-editor" aria-labelledby="team-goal-heading"><div><p className="eyebrow">PLAYER DEVELOPMENT</p><h3 id="team-goal-heading">Goal setting ? {selectedPlayer.name}</h3><p>Agree on one practical goal with the player. This goal is available to the development workspace.</p></div><label>Goal 1<textarea aria-label={`Goal 1 for ${selectedPlayer.name}`} value={selectedPlayer.developmentGoals} maxLength={500} onChange={(event) => updatePlayerMetadata(selectedPlayer.id, {developmentGoals: event.target.value})} placeholder="Example: Practice receiving with the first touch into open space." /></label><label>Goal 2<textarea aria-label={`Goal 2 for ${selectedPlayer.name}`} value={selectedPlayer.developmentGoalTwo ?? ''} maxLength={500} onChange={(event) => updatePlayerMetadata(selectedPlayer.id, {developmentGoalTwo: event.target.value})} placeholder="Add a second player-centered development goal." /></label></section>}{myTeamPlayers.length ? <div className="my-team-roster" role="list" aria-label={myTeamName + ' players'}>{myTeamPlayers.map((player) => <article className="my-team-player" role="listitem" key={player.id} onClick={() => setSelectedId(player.id)}><span className="my-team-jersey">#{player.number}</span><div><strong>{player.name}</strong><small>{player.grade} ? {Object.keys(aggregatePlayerRatings(player)).length} / {u10Rubric.length} evaluation areas rated</small></div><span className={draftTeamAssignments[player.id] ? 'team-player-drafted' : player.status === 'Complete' ? 'team-player-complete' : 'team-player-incomplete'}>{draftTeamAssignments[player.id] ? 'Drafted' : player.status}</span></article>)}</div> : <p className="empty-state">No players are listed for this team in the selected division.</p>}<small className="my-team-demo-note">Fictional coach assignments only. Team colors are copied to matching demo referee scorecards; this is not authorization.</small>{draftEndedAt[bulkGrade] && draftClockTick <= new Date(draftEndedAt[bulkGrade]).getTime() + 60 * 60 * 1000 * 60 && <section className="panel trade-panel"><h3>Coach trade window ? open for 60 hours after draft end</h3><label>Player from this coach<select aria-label="First trade player" value={tradePlayers.first} onChange={(event) => setTradePlayers((current) => ({...current, first: event.target.value}))}><option value="">Select player</option>{players.filter((player) => player.grade === bulkGrade && playerTeamName(player) === myTeamName).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label>Player from another coach<select aria-label="Second trade player" value={tradePlayers.second} onChange={(event) => setTradePlayers((current) => ({...current, second: event.target.value}))}><option value="">Select player</option>{players.filter((player) => player.grade === bulkGrade && playerTeamName(player) !== myTeamName).map((player) => <option key={player.id} value={player.id}>{player.name} ? {playerTeamName(player)}</option>)}</select></label><button className="button-secondary" onClick={tradeDemoPlayers}>Propose and apply demo trade</button></section>}</section>
<div className="evaluation-layout"><section className="panel roster-panel"><div className="roster-toolbar"><div><strong>Evaluation queue</strong><small>{players.length} fictional players � {ratedCount} complete � U10 demo event</small></div><div className="roster-tools"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or #" aria-label="Search players" /></label><select aria-label="Filter evaluation roster" value={evaluationFilter} onChange={(event) => setEvaluationFilter(event.target.value as typeof evaluationFilter)}><option value="all">All players</option><option value="needs-evaluation">Needs evaluation</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select></div></div><div className="roster-list">{myTeamFilteredPlayers.map((player, index) => <button key={player.id} className={`roster-row ${selectedId === player.id ? 'roster-selected' : ''}`} onClick={() => setSelectedId(player.id)}><span className={`player-avatar avatar-${index % 4}`}>{player.name.split(' ').map((part) => part[0]).join('')}</span><span className="roster-player"><strong>{player.name}</strong><small>{player.team} � #{player.number}</small></span><span className="roster-score">{Object.keys(aggregatePlayerRatings(player)).length}<small>/{u10Rubric.length}</small></span></button>)}{myTeamFilteredPlayers.length === 0 && <p className="empty-state">No players on this selected demo team match this search or filter.</p>}</div><div className="rubric-key"><strong>SCORING ANCHORS</strong>{scoringAnchors.map(({ score, label }) => <p key={score}><b>{score}</b><span>{label}</span></p>)}</div></section>
              <section className="panel evaluator-panel"><div className="evaluator-header"><div><p className="eyebrow">PLAYER PROFILE � #{selectedPlayer.number}</p><h2>{selectedPlayer.name}</h2><p>{selectedPlayer.team} <span className="dot-separator">�</span> U10</p></div><span className={`status-badge ${selectedPlayer.status === 'Complete' ? 'status-complete' : selectedPlayer.status === 'In progress' ? 'status-in-progress' : 'status-needs-evaluation'}`}><i />{selectedPlayer.status}</span></div><div className="evaluation-controls"><label>Evaluator<select aria-label="Individual evaluation coach" value={activeTeamEvaluator} onChange={(event) => setActiveEvaluator(event.target.value)}>{myTeamEvaluators.map((coach) => <option key={coach} value={coach}>{coach}</option>)}</select></label><span>{Object.keys(activeCoachRatings(selectedPlayer)).length} of {u10Rubric.length} categories scored</span><button onClick={selectNextIncomplete}>Next incomplete <span>?</span></button></div><div className="rating-guidance"><Eye size={16} /><span>Rate observable soccer behaviors from 1�10. A missing score stays blank; discuss uncertainty with another authorized evaluator.</span></div><div className="rubric-groups">{['Technical skills', 'Game understanding', 'Development and behavior'].map((group) => <div className="rubric-group" key={group}><h3>{group}</h3>{u10Rubric.filter((category) => category.group === group).map((category) => <div className="rating-row" key={category.id}><div className="rating-description"><strong>{category.label}</strong><small>{category.description}</small></div><div className="score-options" role="group" aria-label={`${category.label} rating`}>{Array.from({ length: 10 }, (_, index) => index + 1).map((score) => <button key={score} aria-label={`${category.label}: ${score}`} aria-pressed={activeCoachRatings(selectedPlayer)[category.id] === score} className={activeCoachRatings(selectedPlayer)[category.id] === score ? 'score-selected' : ''} onClick={() => updateRating(category.id, score)}>{score}</button>)}</div></div>)}</div>)}</div><div className="evaluation-footer"><span>Overall snapshot <strong>{playerAverage(selectedPlayer) ?? 'Incomplete'}</strong><small>{Object.keys(activeCoachRatings(selectedPlayer)).length} of {u10Rubric.length} categories rated</small></span><span className="private-note">Demo changes are session-only</span></div></section></div>
<section className="panel periodic-review-panel" aria-labelledby="periodic-review-heading"><div className="review-panel-heading"><div><p className="eyebrow">ONGOING COACH OBSERVATIONS</p><h2 id="periodic-review-heading">Add a periodic player review</h2><p>Record what you observed at a game or practice. Use specific behaviors, not labels or comparisons.</p></div><span className="review-count">{playerReviews.length} {playerReviews.length === 1 ? 'review' : 'reviews'}</span></div><form className="periodic-review-form" onSubmit={savePeriodicReview}><label>Review date<input type="date" aria-label="Periodic review date" value={reviewDraft.date} onChange={(event) => setReviewDraft((current) => ({ ...current, date: event.target.value }))} required /></label><label>Game or practice<input aria-label="Review game or practice" value={reviewDraft.context} onChange={(event) => setReviewDraft((current) => ({ ...current, context: event.target.value }))} placeholder="e.g. Saturday match or Tuesday practice" required maxLength={100} /></label><div className="review-rating-grid">{([{ key: 'effort', label: 'Effort and persistence' }, { key: 'teamwork', label: 'Teamwork' }, { key: 'sportsmanship', label: 'Sportsmanship' }, { key: 'skillApplication', label: 'Applying soccer skills' }, { key: 'feedback', label: 'Responding to feedback' }, { key: 'encouragement', label: 'Encourages teammates' }] as const).map(({ key, label }) => <label key={key}>{label}<select aria-label={label} value={reviewDraft[key]} onChange={(event) => setReviewDraft((current) => ({ ...current, [key]: Number(event.target.value) }))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} - {['Rarely', 'Occasionally', 'Sometimes', 'Usually', 'Consistently'][value - 1]} observed</option>)}</select></label>)}</div><label className="review-evidence">Specific observation<textarea aria-label="Periodic review evidence" value={reviewDraft.evidence} onChange={(event) => setReviewDraft((current) => ({ ...current, evidence: event.target.value }))} placeholder="What did the player do? Describe a specific moment or behavior." minLength={12} maxLength={500} required /></label><div className="review-submit-row"><span>Coach: {activeEvaluator} ? {selectedPlayer.name} ? {selectedPlayer.grade}</span><button type="submit" className="button-primary"><Plus size={16} /> Save periodic review</button></div></form><div className="periodic-review-history"><h3>Review history for {selectedPlayer.name}</h3>{playerReviews.length ? playerReviews.map((review) => <article className="periodic-review-entry" key={review.id}><div className="review-entry-meta"><strong>{review.context}</strong><span>{review.date} ? {review.coach}</span></div><p>{review.evidence}</p><div className="review-score-chips"><span>Effort {review.effort}/5</span><span>Teamwork {review.teamwork}/5</span><span>Sportsmanship {review.sportsmanship}/5</span><span>Skill use {review.skillApplication}/5</span><span>Feedback {review.feedback}/5</span><span>Encouragement {review.encouragement}/5</span></div></article>) : <p className="empty-state">No periodic reviews yet. Add one after a game or practice; award suggestions need multiple dated observations.</p>}</div></section></>}


          {section === 'Announcements' && <><div className="page-heading"><div><p className="eyebrow">LEAGUE COMMUNICATIONS</p><h1>Coach announcements</h1><p className="heading-subtitle">Board-published information for coaches. This demo does not send email or text messages.</p></div></div><div className="season-access-banner"><ShieldCheck size={17}/><span>Fictional announcement board only. Do not post private player/family information. Production publishing requires an authorized PDSA role.</span></div>{announcements.length ? announcements.map((item) => <article className="panel announcement-card" key={item.id}><p className="eyebrow">PDSA ? {new Date(item.publishedAt).toLocaleDateString()}</p><h2>{item.title}</h2><p>{item.body}</p>{item.attachmentUrl && <a href={item.attachmentUrl} download={item.attachmentName || 'announcement-attachment'}>View attachment: {item.attachmentName || 'file'}</a>}</article>) : <p className="empty-state">No demo announcements have been posted.</p>}</>}

          {section === 'Admin' && <><div className="page-heading"><div><p className="eyebrow">BOARD WORKSPACE ? DEMO ONLY</p><h1>League administration</h1><p className="heading-subtitle">Manage coaches, user access, season settings, announcements, and archives.</p></div><div className="admin-wake-control"><button className="button-secondary" type="button" onClick={checkNeonDatabase} disabled={databaseStatus === 'checking'}>{databaseStatus === 'checking' ? 'Waking Neon database?' : 'Wake Neon database'}</button><small>Runs a read-only health check; it may wake an idle compute.</small>{databaseStatus !== 'not-checked' && <span className={`database-status database-${databaseStatus}`} role="status">{databaseStatus === 'connected' ? 'Neon database is awake and responding.' : databaseStatus === 'checking' ? 'Checking database?' : 'Database unavailable. Check that the API and Neon are reachable.'}</span>}</div></div><div className="season-access-banner"><ShieldCheck size={17}/><span>All Admin controls are fictional, session-only previews. Demo access levels are not authentication or authorization. Do not use real player data.</span></div><nav className="admin-subnav" aria-label="Admin menus">{(['Coaches','Users & Access','Season','Announcements','Archives'] as const).map((tab)=><button key={tab} className={adminTab===tab?'admin-subnav-active':''} aria-current={adminTab===tab?'page':undefined} onClick={()=>setAdminTab(tab)}>{tab}</button>)}</nav>
{adminTab==='Coaches' && <><section className="panel admin-panel"><h2>Coaches and divisions</h2><div className="admin-grid"><label>Division to manage<select aria-label="Coach division" value={coachDivision} onChange={(event)=>setCoachDivision(event.target.value as Division)}>{DIVISIONS.map((division)=><option key={division}>{division}</option>)}</select></label><form className="admin-inline-form" onSubmit={(event)=>{event.preventDefault();const name=newCoachName.trim();if(!name)return;setCoachDirectory((current)=>current.includes(name)?current:[...current,name]);setHeadCoachDirectory((current)=>current.includes(name)?current:[...current,name]);setCoachNames((current)=>({...current,[coachDivision]:[...current[coachDivision],name]}));setDraftOrder((current)=>({...current,[coachDivision]:[...current[coachDivision],name]}));setNewCoachName('')}}><label>Add head coach<input aria-label="Add head coach" value={newCoachName} onChange={(event)=>setNewCoachName(event.target.value)} required maxLength={80} placeholder="Coach name"/></label><button className="button-primary" type="submit">Add coach to division</button></form><form className="admin-inline-form" onSubmit={(event)=>{event.preventDefault();const name=newAssistantCoach.trim();if(name&&!coachDirectory.includes(name))setCoachDirectory((current)=>[...current,name]);setNewAssistantCoach('')}}><label>Add assistant coach<input aria-label="Add assistant coach" value={newAssistantCoach} onChange={(event)=>setNewAssistantCoach(event.target.value)} required maxLength={80} placeholder="Assistant name"/></label><button className="button-secondary" type="submit">Add assistant</button></form></div><p className="admin-note">Each head coach represents one team. Assign a division here; team nicknames and jersey colors are configured in My Team.</p><div className="coach-assignment-list">{coachNames[coachDivision].map((coach,index)=>{const key=`${coachDivision}:${coach}`;const staff=teamStaff[key]??{headCoach:coach,assistantCoach:'',jerseyColor:'#2878d0',teamNickname:''};return <article className="coach-assignment-card" key={`${coach}-${index}`}><label>Head coach<input aria-label={`${coachDivision} head coach ${index+1}`} value={coach} onChange={(event)=>setCoachName(coachDivision,index,event.target.value)}/></label><span>Division: <strong>{coachDivision}</strong> ? Team 1:1 with this head coach</span><label>Assistant coach<select aria-label={`Assistant for ${coach}`} value={staff.assistantCoach} onChange={(event)=>setTeamStaff((current)=>({...current,[key]:{...staff,assistantCoach:event.target.value}}))}><option value="">Unassigned</option>{coachDirectory.filter((name)=>!coachNames[coachDivision].includes(name)||name===staff.assistantCoach).map((name)=><option key={name}>{name}</option>)}</select></label></article>})}</div></section></>}
{adminTab==='Users & Access' && <section className="panel admin-panel"><h2>Users and access levels</h2><p className="admin-note">Sample user directory only. Role labels do not grant or verify access.</p><form className="admin-inline-form" onSubmit={(event)=>{event.preventDefault();const name=newDemoUser.trim();if(name&&!demoUserAccess[name])setDemoUserAccess((current)=>({...current,[name]:'Volunteer'}));setNewDemoUser('')}}><label>Add demo user<input aria-label="Add demo user" value={newDemoUser} onChange={(event)=>setNewDemoUser(event.target.value)} placeholder="Name or email" required/></label><button className="button-secondary">Add user</button></form><div className="access-user-list">{Object.entries(demoUserAccess).map(([name,role])=><label key={name}>{name}<select aria-label={`Access level for ${name}`} value={role} onChange={(event)=>setDemoUserAccess((current)=>({...current,[name]:event.target.value as DemoAccess}))}>{(['Admin','Coach','Referee','Volunteer'] as const).map((level)=><option key={level}>{level}</option>)}</select></label>)}</div></section>}
{adminTab==='Season' && <><section className="panel admin-panel"><h2>Season and evaluation schedule</h2><div className="admin-grid"><label>Season starts<input aria-label="Season start date" type="date" value={seasonStartDate} onChange={(event)=>setSeasonStartDate(event.target.value)}/></label><label>Season ends<input aria-label="Season end date" type="date" value={seasonEndDate} onChange={(event)=>setSeasonEndDate(event.target.value)}/></label>{DIVISIONS.map((division)=><label key={division}>{division} evaluation date<input aria-label={division+' evaluation date'} type="date" value={evaluationDates[division]} onChange={(event)=>setEvaluationDates((current)=>({...current,[division]:event.target.value}))}/></label>)}</div><p className="admin-note">Evaluation schedule is set by Admin. Teams per division follow the number of head coaches; there is no separate team count.</p></section><section className="panel admin-panel"><h2>Match schedule and referees</h2>{games.map((game)=><div className="admin-grid" key={game.id}><label>{game.homeTeam} vs {game.awayTeam} date<input aria-label={game.homeTeam+' match date'} type="date" value={game.date} onChange={(event)=>setGames((current)=>current.map((entry)=>entry.id===game.id?{...entry,date:event.target.value}:entry))}/></label><label>Referee<input aria-label={game.homeTeam+' assigned referee'} value={game.referee} onChange={(event)=>setGames((current)=>current.map((entry)=>entry.id===game.id?{...entry,referee:event.target.value}:entry))}/></label></div>)}</section><section className="panel admin-panel"><h2>AskRef verified knowledge ? demo</h2><p className="admin-note">The supplied 2025/2026 PDSA rulebook is built in. Admin-added excerpts are session-only and require review before they become searchable.</p><form className="admin-announcement-form rules-entry-form" onSubmit={saveRulesKnowledge}><label>Entry title<input aria-label="Rule entry title" value={rulesKnowledgeDraft.title} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,title:event.target.value}))} required/></label><label>Source publisher<input aria-label="Rule source publisher" value={rulesKnowledgeDraft.sourceName} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,sourceName:event.target.value}))} required/></label><label>Official URL<input aria-label="Rule source URL" type="url" value={rulesKnowledgeDraft.sourceUrl} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,sourceUrl:event.target.value}))} required/></label><label>Edition<input aria-label="Rule source edition" value={rulesKnowledgeDraft.edition} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,edition:event.target.value}))} required/></label><label>Section<input aria-label="Rule section citation" value={rulesKnowledgeDraft.section} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,section:event.target.value}))} required/></label><label>Reviewed by<input aria-label="Rule reviewer name" value={rulesKnowledgeDraft.reviewedBy} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,reviewedBy:event.target.value}))} required/></label><label>Review date<input aria-label="Rule review date" type="date" value={rulesKnowledgeDraft.reviewedOn} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,reviewedOn:event.target.value}))} required/></label><label>Verified excerpt<textarea aria-label="Rule entry text" value={rulesKnowledgeDraft.text} onChange={(event)=>setRulesKnowledgeDraft((current)=>({...current,text:event.target.value}))} required/></label><button className="button-primary">Save rule draft</button></form>{rulesKnowledge.filter((entry)=>!entry.id.startsWith('pdsa-')).map((entry)=><article className="rule-admin-entry" key={entry.id}><strong>{entry.title}</strong><button className="button-secondary" disabled={entry.verified||!entry.sourceUrl.startsWith('https://')} onClick={()=>setRulesKnowledge((current)=>current.map((item)=>item.id===entry.id?{...item,verified:true}:item))}>Mark verified</button></article>)}</section></>}
{adminTab==='Announcements' && <><section className="panel admin-panel"><h2>Create announcement</h2><p className="admin-note">Attachment is held in this browser session only. The prototype does not upload or send it.</p><form className="admin-announcement-form" onSubmit={publishAnnouncement}><label>Title<input aria-label="Announcement title" required maxLength={120} value={announcementDraft.title} onChange={(event)=>setAnnouncementDraft((current)=>({...current,title:event.target.value}))}/></label><label>Message<textarea aria-label="Announcement message" required maxLength={2000} value={announcementDraft.body} onChange={(event)=>setAnnouncementDraft((current)=>({...current,body:event.target.value}))}/></label><label>Attachment (optional)<input aria-label="Announcement attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event)=>handleAnnouncementFile(event.currentTarget.files?.[0])}/></label>{announcementDraft.attachmentName&&<p>Attached locally: {announcementDraft.attachmentName}</p>}<button className="button-primary" type="submit">Publish demo announcement</button></form></section><section className="panel admin-panel"><h2>Recent announcements</h2>{announcements.map((item)=><article className="announcement-card" key={item.id}><strong>{item.title}</strong><p>{item.body}</p>{item.attachmentUrl&&<a href={item.attachmentUrl} download={item.attachmentName||'announcement-attachment'}>{item.attachmentName||'Download attachment'}</a>}</article>)}{!announcements.length&&<p>No announcements yet.</p>}</section></>}
{adminTab==='Archives' && <section className="panel admin-panel"><h2>Season archives</h2><p className="admin-note">The demo snapshots and resets one week after season end. Player history carries forward. Board archive lookups require a reason here but are not protected by verified access controls.</p><button className="button-secondary" disabled={seasonArchives.some((archive)=>archive.seasonName===activeSeasonId)} onClick={resetSeasonData}>Archive and reset current season now</button><form className="admin-announcement-form archive-access-form" onSubmit={requestArchiveAccess}><h3>Board archive access request</h3><label>Player or coach<input aria-label="Archive subject name" value={archiveRequest.subject} onChange={(event)=>setArchiveRequest((current)=>({...current,subject:event.target.value}))} required/></label><label>Reason<textarea aria-label="Archive access reason" value={archiveRequest.reason} onChange={(event)=>setArchiveRequest((current)=>({...current,reason:event.target.value}))} minLength={12} required/></label><button className="button-secondary">Record reason and view archives</button></form>{archiveRequestResult&&<p role="status">{archiveRequestResult}</p>}{archiveAccessLog.length?seasonArchives.map((archive)=><article className="archive-list" key={archive.id}><strong>{archive.seasonName}</strong>{archive.players.filter((player)=>`${player.name} ${player.assignedCoach??''}`.toLowerCase().includes(archiveQuerySubject.toLowerCase())).slice(0,15).map((player)=><p key={player.id}>{player.name} ? {player.grade} ? {archive.draftAssignments[player.id]??player.assignedCoach??'unassigned'}</p>)}</article>):<p className="admin-note">Archive records remain hidden until a reason is recorded.</p>}<h3>Access audit (session only)</h3>{archiveAccessLog.map((entry)=><p key={entry.id}>{entry.subject} ? {entry.reason} ? {new Date(entry.accessedAt).toLocaleString()}</p>)}</section>}
</>}{section === 'Develop' && <><div className="page-heading"><div><p className="eyebrow">COACH DEVELOPMENT TOOLKIT</p><h1>Ideas to help players grow</h1><p className="heading-subtitle">Turn evaluation themes and athlete goals into approachable practice ideas. Use your judgment and adapt to the people in front of you.</p></div></div><div className="develop-intro"><Sparkles size={20} /><div><strong>Start with one useful focus</strong><p>Keep activities active, brief, and connected to a game decision. Offer an easier and harder version so each athlete can participate with confidence.</p></div></div><div className="development-filters"><label>Division<select aria-label="Development division" value={developmentDivision} onChange={(event) => { const division = event.target.value as Player['grade']; setDevelopmentDivision(division); const first = players.find((player) => player.grade === division); if (first) setSelectedId(first.id) }}>{(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const).map((division) => <option key={division} value={division}>{division}</option>)}</select></label><label>Athlete<select aria-label="Development player" value={developmentPlayer?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)}>{developmentRoster.map((player) => <option key={player.id} value={player.id}>{player.name} - #{player.number}</option>)}</select></label></div>{!developmentPlayer && <p className="empty-state">No players in this demo division yet. Import a fictional roster in Evaluate.</p>}{developmentPlayer && <><section className="panel develop-player-summary"><div><p className="eyebrow">INDIVIDUAL DEVELOPMENT SNAPSHOT</p><h2>{developmentPlayer.name}</h2><p>{developmentPlayer.team} - {developmentDivision}</p></div><div className="develop-goal"><strong>Athlete goals from My Team</strong><ol><li>{developmentPlayer.developmentGoals || 'Goal 1 not set yet.'}</li><li>{developmentPlayer.developmentGoalTwo || 'Goal 2 not set yet.'}</li></ol></div></section><div className="development-recommendations"><section className="panel recommendation-panel"><div className="develop-section-heading"><span className="develop-section-icon"><Goal size={18} /></span><div><p className="eyebrow">PERSONAL PRACTICE</p><h2>Ideas for this athlete</h2><p>Prioritized from their stated goal, then lower available skill ratings.</p></div></div>{developmentIndividualDrills.map((item) => <article className="recommendation-item" key={item.category}><div className="drill-card-heading"><h3>{item.category}</h3><span className="recommendation-tag">{item.reason}</span></div><p className="drill-name">{item.drill}</p><dl className="drill-guidance"><div><dt>Set up</dt><dd>{item.plan.setup}</dd></div><div><dt>Try</dt><dd>{item.plan.progression}</dd></div><div><dt>Coach cue</dt><dd>{item.plan.cue}</dd></div></dl></article>)}{developmentIndividualDrills.length === 0 && <p className="empty-state">Add a form goal or evaluation ratings to get more tailored practice ideas.</p>}</section><section className="panel recommendation-panel"><div className="develop-section-heading"><span className="develop-section-icon"><Users size={18} /></span><div><p className="eyebrow">TEAM PRACTICE</p><h2>{developmentPlayer.team}</h2><p>Group ideas based on lower recorded averages across this team's sample ratings.</p></div></div>{developmentTeamDrills.map((item) => <article className="recommendation-item" key={item.category}><div className="drill-card-heading"><h3>{item.category}</h3><span className="recommendation-tag">{item.reason}</span></div><p className="drill-name">{item.drill}</p><dl className="drill-guidance"><div><dt>Set up</dt><dd>{item.plan.setup}</dd></div><div><dt>Progress</dt><dd>{item.plan.progression}</dd></div><div><dt>Coach cue</dt><dd>{item.plan.cue}</dd></div></dl></article>)}{developmentTeamDrills.length === 0 && <p className="empty-state">No team ratings are available yet. Add evaluations for this division and team.</p>}<p className="develop-small-note">Keep groups small and rotate often to reduce waiting. Adapt space and activity to the available players and equipment.</p></section><section className="panel recommendation-panel style-study-panel"><div className="develop-section-heading"><span className="develop-section-icon"><Eye size={18} /></span><div><p className="eyebrow">OPTIONAL VIDEO STUDY</p><h2>Professional examples to observe</h2><p>Suggested from broad skill themes in this demo profile. These are study references, not comparisons, role assignments, or predictions.</p></div></div>{developmentStyles.map((reference) => <article className="style-study-card" key={reference.name}><div><h3>{reference.name}</h3><p>{reference.focus}</p><small>Explore: {reference.skills.filter((skill) => (aggregatePlayerRatings(developmentPlayer)[skill] ?? 0) >= 7).join(', ')}</small></div><a href={reference.href} target="_blank" rel="noreferrer">{reference.source} <span aria-hidden="true">&gt;</span></a><p className="coach-reflection"><strong>Coach prompt:</strong> What did the player notice? Which one small action could they try in their own way?</p></article>)}{developmentStyles.length === 0 && <p className="empty-state">More ratings are needed before suggesting a professional study example. Start with the practice ideas above.</p>}<p className="develop-small-note">Professional players are examples to learn from, not standards young athletes are expected to match.</p></section><section className="panel recommendation-panel position-panel"><div className="develop-section-heading"><span className="develop-section-icon"><ArrowUpRight size={18} /></span><div><p className="eyebrow">TRY DIFFERENT ROLES</p><h2>Possible areas to explore</h2><p>These are conversation starters based on limited rubric data, not position recommendations.</p></div></div>{developmentPositions.map((item) => <div className="position-suggestion" key={item.role}><strong>{item.role}</strong><span>{item.score?.toFixed(1)}/10 rubric theme</span></div>)}<p className="position-caveat">The current rubric does not assess goalkeeper-specific handling or distribution. U8 outfield-only recommendations follow the current PDSA rules; confirm seasonal rules with the commissioner. IFAB Laws govern how the game is played, not which position a child should play.</p><p className="recommendation-sources"><a href="https://www.palodurosoccer.com/about/pdsa-official-rules/19175" target="_blank" rel="noreferrer">PDSA Official Rules</a> | <a href="https://www.theifab.com/laws/latest/the-players/" target="_blank" rel="noreferrer">IFAB Law 3: The Players</a></p></section></div><section className="develop-sources"><strong>Drill design references</strong><span>Activities here are original summaries, not copied drill instructions. The guidance draws on general coaching principles such as active participation, clear objectives, and gradually adding decisions or pressure.</span><a href="https://www.renderfoot.com/blog/soccer-drills" target="_blank" rel="noreferrer">RenderFoot - Soccer Drills</a><a href="https://elitechampionscoaching.com/drills/" target="_blank" rel="noreferrer">Elite Champions Coaching - Soccer Drills</a></section></>}</>}{section === 'Awards' && <><div className="page-heading"><div><p className="eyebrow">END-OF-SEASON RECOGNITION</p><h1>Player award board</h1><p className="heading-subtitle">Evidence-based nominations to help coaches recognize development and contributions throughout the season.</p></div></div><div className="awards-notice"><ShieldCheck size={18} /><p><strong>Coach review required.</strong> These are suggested candidates, not automatic awards or a player ranking. Suggestions combine consolidated evaluation themes with repeated, coach-entered observations from games or practices. Team match scores are not attributed to individual players.</p></div><div className="award-division-control"><label>Division<select aria-label="Awards division" value={awardDivision} onChange={(event) => setAwardDivision(event.target.value as Division)}>{(['U8 Boys', 'U8 Girls', 'U10', 'U12', 'U14', 'U18'] as const).map((division) => <option key={division} value={division}>{division}</option>)}</select></label><span>Minimum evidence: completed consolidated evaluation + 2 periodic observations</span></div><div className="award-board-grid">{awardRecommendations.map((award) => { const candidates = award.candidates.filter(({ player }) => player.grade === awardDivision); return <section className="panel award-card" key={award.id}><div className="award-card-heading"><span className="award-icon"><Trophy size={18} /></span><div><p className="eyebrow">SUGGESTED AWARD</p><h2>{award.title}</h2></div></div><p>{award.description}</p>{candidates.length ? <ol className="award-candidate-list">{candidates.map(({ player, reviews, evaluationScore, gameScore, score }) => <li key={player.id}><div className="award-candidate-name"><strong>{player.name}</strong><span>{player.team}</span></div><div className="award-evidence-grid"><span><strong>{score.toFixed(1)}</strong> combined signal / 10</span><span><strong>{evaluationScore.toFixed(1)}</strong> evaluation / 10</span><span><strong>{(gameScore / 2).toFixed(1)}</strong> observations / 5</span><span><strong>{reviews.length}</strong> dated reviews</span></div><div className="award-observation-excerpts">{reviews.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).map((review) => <p key={review.id}><strong>{review.date} ? {review.context}</strong><span>{review.evidence}</span></p>)}</div><button className="certificate-create-button" disabled={!teamStaff[`${player.grade}:${playerTeamName(player)}`]?.headCoach.trim() || !teamStaff[`${player.grade}:${playerTeamName(player)}`]?.assistantCoach.trim()} onClick={() => setCertificate({ playerId: player.id, awardTitle: award.title })}>Prepare certificate</button>{(!teamStaff[`${player.grade}:${player.team}`]?.headCoach.trim() || !teamStaff[`${player.grade}:${player.team}`]?.assistantCoach.trim()) && <small>Enter both coaches under Evaluate ? My Team before preparing the certificate.</small>}<small>Review the full history in Evaluate before deciding.</small></li>)}</ol> : <div className="award-empty"><strong>No eligible candidates yet</strong><span>Complete and consolidate the {awardDivision} evaluation, then add at least two dated game/practice reviews per player.</span></div>}<p className="award-human-note">Use as a conversation starter. Coaches should consider context, access to playing opportunities, athlete preference, and the full season.</p></section>})}</div>{certificate && certificatePlayer && <section className="certificate-preview-panel" aria-label="Award certificate preview"><div className="certificate-preview-toolbar"><div><p className="eyebrow">PRINT PREVIEW ? LETTER LANDSCAPE</p><h2>Certificate draft</h2><p>Check names and signatures before printing.</p></div><div><button className="button-secondary" onClick={() => setCertificate(null)}>Close preview</button><button className="button-primary" onClick={() => window.print()}>Print certificate</button></div></div><article className="award-certificate"><div className="certificate-brand"><img src="/pdsa-logo.png" alt="Palo Duro Soccer Association" /><span><strong>PALO DURO SOCCER ASSOCIATION</strong><small>PLAYER RECOGNITION</small></span></div><p className="certificate-kicker">CERTIFICATE OF ACHIEVEMENT</p><h1>Presented to</h1><h2>{certificatePlayer.name}</h2><div className="certificate-rule" /><p className="certificate-award-title">{certificate.awardTitle}</p><p className="certificate-description">In recognition of dedication, development, and positive contribution to the team throughout the season.</p><p className="certificate-season">{certificatePlayer.grade} ? {certificatePlayer.team} ? Fall 2026</p><div className="certificate-signatures"><div><span className="certificate-signature-space" /><strong>{certificateTeamStaff.headCoach || 'Head Coach'}</strong><small>Head Coach Signature</small></div><div><span className="certificate-signature-space" /><strong>{certificateTeamStaff.assistantCoach || 'Assistant Coach'}</strong><small>Assistant Coach Signature</small></div></div><div className="certificate-footer">PALO DURO SOCCER ASSOCIATION ? PLAYERSMART DEMO TEMPLATE</div></article></section>}<p className="awards-session-note">Fictional demo data only. Reviews and award suggestions are stored in browser memory for this session; refresh clears them.</p></>}

          {section === 'Referee' && <><div className="page-heading"><div><p className="eyebrow">MATCH OFFICIAL TOOLS</p><h1>Referee</h1><p className="heading-subtitle">Choose what you need for today?s match.</p></div></div><section className="referee-launchpad" aria-label="Referee tools"><button className="referee-launch-button" onClick={() => selectNavigation('AskRef')}><BookOpenText size={28} /><span><strong>AskRef</strong><small>Study the Laws and find rules guidance</small></span><ArrowUpRight size={20} /></button><button className="referee-launch-button" onClick={() => selectNavigation('ScoreBoard')}><Trophy size={28} /><span><strong>GameCard</strong><small>Open the match GameScore Card</small></span><ArrowUpRight size={20} /></button></section><p className="referee-demo-note">Fictional demo only. Do not enter real match or player information.</p></>}

          {section === 'ScoreBoard' && <>
            <div className="page-heading"><div><p className="eyebrow">REFEREE WORKSPACE � FICTIONAL MATCHES</p><h1>ScoreBoard</h1><p className="heading-subtitle">GameScore Card for match officials � AskRef remains available in the navigation.</p></div><div className="overview-actions"><button className="button-secondary" onClick={() => setGuestScoreView((current) => !current)}>{guestScoreView ? 'Return to referee card' : 'Preview guest ScoreBoard'}</button><span className="scoreboard-live-pill"><Radio size={13} /> DEMO LIVE</span></div></div>
            <div className="scoreboard-safety"><ShieldCheck size={16} /><span><strong>Demo only.</strong> Scores update only in this browser session. Guest preview is not authenticated or private; never use real matches or player details.</span></div>
            {guestScoreView ? <section className="guest-score-view"><div className="guest-score-header"><div><p className="eyebrow">READ-ONLY GUEST PREVIEW</p><h2>Scores for the day</h2></div><label>Game day<input aria-label="Guest score date" type="date" value={scoreDay} onChange={(event) => setScoreDay(event.target.value)} /></label></div>{todaysGames.length ? <div className="guest-score-list">{todaysGames.map((game) => <article className="panel guest-score-card" key={game.id}><div className="guest-fixture"><span className="color-coded-team"><i style={{backgroundColor:game.homeColor}} aria-label={`${game.homeTeam} jersey color`}/>{game.homeTeam}<small>{shirtColorName(game.homeColor)}</small></span><small>vs</small><span className="color-coded-team"><i style={{backgroundColor:game.awayColor}} aria-label={`${game.awayTeam} jersey color`}/>{game.awayTeam}<small>{shirtColorName(game.awayColor)}</small></span></div><div className="guest-scoreline" aria-label={`${game.homeTeam} ${game.homeScore}, ${game.awayTeam} ${game.awayScore}`}><strong>{game.homeScore}</strong><span>�</span><strong>{game.awayScore}</strong></div><div className="guest-match-status"><span>{game.time}</span><span className={game.finalized ? 'final-status' : 'live-status'}>{game.finalized ? 'Final' : 'In progress'}</span></div></article>)}</div> : <p className="empty-state">No demo scores for this date.</p>}<p className="scoreboard-footnote">Guest access in the real service will be restricted to that day's published scores only.</p></section> : <div className="scoreboard-layout"><section className="panel scoreboard-games"><div className="panel-heading"><div><p className="eyebrow">SCHEDULE</p><h2>Match list</h2></div><CalendarDays size={17} /></div><label className="score-day-picker">Game day<input aria-label="Referee score date" type="date" value={scoreDay} onChange={(event) => setScoreDay(event.target.value)} /></label>{todaysGames.map((game) => <button className={`score-game-choice ${game.id === activeGameId ? 'score-game-active' : ''}`} key={game.id} onClick={() => setActiveGameId(game.id)}><span><strong>{game.homeTeam} vs {game.awayTeam}</strong><small>{game.time}</small></span><span className="score-game-mini">{game.homeScore}�{game.awayScore}</span></button>)}{todaysGames.length === 0 && <p className="empty-state">No demo games on this date.</p>}</section>
              {todaysGames.some((game) => game.id === activeGameId) && activeGame && <section className="panel gamescore-card"><div className="gamescore-card-head"><div><p className="eyebrow">GAMESCORE CARD � {activeGame.time}</p><h2>{activeGame.finalized ? 'Final score' : 'Match in progress'}</h2></div><span className={activeGame.finalized ? 'final-status' : 'live-status'}>{activeGame.finalized ? 'FINAL' : 'LIVE'}</span></div><div className="gamescore-meta"><label>Referee<input aria-label="Referee name" value={activeGame.referee} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { referee: event.target.value })} /></label></div><div className="gamescore-teams"><div className="gamescore-team"><label>Home team<input aria-label="Home team name" value={activeGame.homeTeam} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { homeTeam: event.target.value })} /></label><p className="jersey-color-indicator"><i style={{backgroundColor:activeGame.homeColor}}/>Jersey color: {shirtColorName(activeGame.homeColor)}</p><div className="gamescore-score"><button aria-label="Decrease home score" disabled={activeGame.finalized || activeGame.homeScore === 0} onClick={() => changeGameScore('home', -1)}>-</button><strong aria-label="Home score">{activeGame.homeScore}</strong><button aria-label="Increase home score" disabled={activeGame.finalized} onClick={() => changeGameScore('home', 1)}>+</button></div><label>Players present<input aria-label="Home players present" type="number" min="0" max="99" value={activeGame.homePlayers} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { homePlayers: Math.min(99, Math.max(0, Number(event.target.value))) })} /></label><label>Coach<input aria-label="Home coach" value={activeGame.homeCoach} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { homeCoach: event.target.value })} /></label></div><div className="gamescore-divider">VS</div><div className="gamescore-team"><label>Away team<input aria-label="Away team name" value={activeGame.awayTeam} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { awayTeam: event.target.value })} /></label><p className="jersey-color-indicator"><i style={{backgroundColor:activeGame.awayColor}}/>Jersey color: {shirtColorName(activeGame.awayColor)}</p><div className="gamescore-score"><button aria-label="Decrease away score" disabled={activeGame.finalized || activeGame.awayScore === 0} onClick={() => changeGameScore('away', -1)}>-</button><strong aria-label="Away score">{activeGame.awayScore}</strong><button aria-label="Increase away score" disabled={activeGame.finalized} onClick={() => changeGameScore('away', 1)}>+</button></div><label>Players present<input aria-label="Away players present" type="number" min="0" max="99" value={activeGame.awayPlayers} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { awayPlayers: Math.min(99, Math.max(0, Number(event.target.value))) })} /></label><label>Coach<input aria-label="Away coach" value={activeGame.awayCoach} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { awayCoach: event.target.value })} /></label></div></div><div className="coach-signoffs"><p className="eyebrow"><PenLine size={13} /> DIGITAL SCORE CONFIRMATION</p><p className="signature-explainer">Each team coach reviews the displayed score and signs by entering their name. This demo records an in-session acknowledgment and time only; it is not a verified legal e-signature.</p><div className="signature-grid"><div className="signature-card"><div><strong>{activeGame.homeTeam}</strong><span>{activeGame.homeScore} goals</span></div>{activeGame.homeSigned ? <p className="signature-recorded"><ShieldCheck size={16} /> Signed by {activeGame.homeSignatureName}<small>{new Date(activeGame.homeSignedAt).toLocaleString()}</small></p> : <><label>Coach?s full name<input aria-label="Home coach signature name" value={activeGame.homeSignatureName} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { homeSignatureName: event.target.value })} /></label><button className="button-secondary signature-button" disabled={activeGame.finalized} onClick={() => signOffGame('home')}><PenLine size={15} /> Sign score confirmation</button></>}</div><div className="signature-card"><div><strong>{activeGame.awayTeam}</strong><span>{activeGame.awayScore} goals</span></div>{activeGame.awaySigned ? <p className="signature-recorded"><ShieldCheck size={16} /> Signed by {activeGame.awaySignatureName}<small>{new Date(activeGame.awaySignedAt).toLocaleString()}</small></p> : <><label>Coach?s full name<input aria-label="Away coach signature name" value={activeGame.awaySignatureName} disabled={activeGame.finalized} onChange={(event) => updateGame(activeGame.id, { awaySignatureName: event.target.value })} /></label><button className="button-secondary signature-button" disabled={activeGame.finalized} onClick={() => signOffGame('away')}><PenLine size={15} /> Sign score confirmation</button></>}</div></div><small>Changing any match detail clears both confirmations, so both coaches must review and sign the updated card.</small></div><div className="gamescore-actions"><span>{activeGame.finalized ? 'Locked for this demo session' : 'Both coach confirmations are required'}</span><button className="button-primary" disabled={activeGame.finalized || !activeGame.homeSigned || !activeGame.awaySigned} onClick={finalizeGame}><Trophy size={15} /> Finalize game</button></div></section>}</div>}
          </>}

          {section === 'AskRef' && <><div className="page-heading"><div><p className="eyebrow">RULES LEARNING � PREVIEW</p><h1>AskRef</h1><p className="heading-subtitle">AI explanations grounded in versioned PDSA and IFAB rules.</p></div><span className="askref-status"><span /> AI preview</span></div><section className="askref-layout"><div className="panel askref-panel"><div className="askref-icon"><BookOpenText size={23} /></div><h2>Get clearer on the Laws of the Game.</h2><p>Ask a question for a sourced explanation and verified restart diagram. PDSA modifications take precedence for local play.</p><form className="askref-search" role="search" onSubmit={submitAskRefQuestion}><Search size={18} /><input value={ruleQuestion} onChange={(event) => setRuleQuestion(event.target.value)} placeholder="Try: How long is a quarter in U8?" aria-label="Ask a soccer rules question" /><button type="submit" aria-label="Submit rule question" disabled={askRefLoading}><span>{askRefLoading ? 'Asking?' : 'Ask'}</span> ?</button></form><div className="source-note"><ShieldCheck size={16} /><span>Cloudflare AI answers from cited PDSA/IFAB sources. Do not include player names or personal details; check uncertain calls with an experienced referee.</span></div></div><div className="panel askref-topics"><p className="eyebrow">STUDY TOPICS</p><h2>Start with a topic</h2>{['Match duration', 'Offside', 'Restarts', 'Fouls and cards', 'Throw-ins', 'Weather'].map((topic) => <button key={topic} onClick={() => { setRuleQuestion(topic); void askRefQuestion(topic) }}><span><BookOpenText size={16} />{topic}</span><span>?</span></button>)}<p className="source-link">PDSA local rules are prioritized. For the underlying Laws, consult <a href={IFAB_LAWS_URL} target="_blank" rel="noreferrer">IFAB Laws of the Game</a>.</p></div></section><section className="panel askref-results" aria-live="polite"><h2>Related rulebook excerpts</h2>{!rulesSearchSubmitted && <p>Ask a question or choose a study topic to search the PDSA rulebook.</p>}{askRefLoading && <p className="askref-ai-status" role="status">AskRef is checking the PDSA rulebook and current IFAB source?</p>}{askRefError && <p className="askref-ai-error" role="alert">{askRefError}</p>}{askRefAnswer && <article className="askref-ai-answer"><p className="eyebrow">CLOUDFLARE AI ? SOURCE-GROUNDED EXPLANATION</p><p className="askref-ai-answer-text">{askRefAnswer}</p><p><strong>Applicable division:</strong> {askRefResponse?.division ?? "Not specified"}</p>{askRefResponse?.ballPlacement && <div><p><strong>Ball placement:</strong> {askRefResponse.ballPlacement}</p>{askRefResponse.diagramId && <img className="askref-restart-diagram" src={`/askref-diagrams/${askRefResponse.diagramId}.svg`} alt={`Verified diagram: ${askRefResponse.diagramId.replaceAll("-", " ")}`} />}</div>}{askRefResponse?.recommendCoordinator && <p role="note">Sources are missing or unclear. Check with the PDSA Referee Coordinator before making the call.</p>}{askRefSources.length > 0 && <div className="askref-ai-citations"><strong>Sources checked</strong><ul>{askRefSources.map((source, index) => <li key={source.id + index}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</li>)}</ul></div>}</article>}{rulesSearchSubmitted && rulesSearchResults.map((entry) => <article className="rule-result" key={entry.id}><h3>{entry.title}</h3><p>{entry.text}</p><p className="rule-citation">{entry.sourceName} ? {entry.edition} ? {entry.section}</p>{entry.sourceUrl ? <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Open cited source</a> : <p className="source-link">Cited from the PDSA PDF provided for this workspace. <a href={IFAB_LAWS_URL} target="_blank" rel="noreferrer">Open IFAB Laws of the Game</a></p>}</article>)}{rulesSearchSubmitted && rulesKnowledge.some((entry) => entry.verified) && rulesSearchResults.length === 0 && <p>No verified entry matched that search. Ask the referee coordinator; no answer was generated.</p>}</section></>}

          <footer className="page-footer"><span>PlayerSmart <span>�</span> working name</span><span><ShieldCheck size={14} /> Fictional demo � no live player records</span></footer>
        </div>
      </main>
      {importOpen && <div className="import-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setImportOpen(false) }}><section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="import-dialog-head"><div><p className="eyebrow">ROSTER SETUP � DEMO ONLY</p><h2 id="import-title">Import player roster</h2></div><button className="icon-button" aria-label="Close roster import" onClick={() => setImportOpen(false)}><X size={18} /></button></div><div className="import-caution"><ShieldCheck size={17} /><span><strong>Fictional data only.</strong> Do not select registration exports or images containing real youth information. This prototype processes files in your browser and does not save or upload them.</span></div><div className="import-options"><label className={`import-choice ${importKind === 'file' ? 'import-choice-active' : ''}`}><FileUp size={19} /><strong>CSV file</strong><small>Use a �Name� column (optional �Team�), or �First Name� and �Last Name�.</small><input aria-label="Choose fictional roster CSV" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) parseRosterFile(file); event.currentTarget.value = '' }} /></label><label className={`import-choice ${importKind === 'image' ? 'import-choice-active' : ''}`}><Activity size={19} /><strong>Roster image</strong><small>Upload a screenshot or photo, then review and transcribe rows manually.</small><input aria-label="Choose fictional roster image" type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) prepareRosterImage(file); event.currentTarget.value = '' }} /></label></div>{imagePreview && <div className="roster-image-preview"><img src={imagePreview} alt="Local preview of the uploaded fictional roster image" /><button className="text-button" onClick={() => { URL.revokeObjectURL(imagePreview); setImagePreview(''); setImportKind(null) }}>Remove image</button></div>}{importKind === 'image' && <label className="image-transcription">Roster rows <small>Enter one fictional player per line: <code>Name, Team</code>. Team can be omitted.</small><textarea aria-label="Transcribe fictional roster rows" rows={5} value={imageRosterText} onChange={(event) => updateImageRosterText(event.target.value)} placeholder={'Alex Sample, Blue Comets\nJamie Example, Red Rockets'} /></label>}{importKind === 'file' && importRows.length > 0 && <div className="import-review"><strong>Review rows � {importRows.length} found</strong><div>{importRows.slice(0, 8).map((row, index) => <p key={`${row.name}-${index}`}>{row.name}<small>{row.team}</small></p>)}{importRows.length > 8 && <small>and {importRows.length - 8} more�</small>}</div></div>}{importMessage && <p className="import-message" role="status">{importMessage}</p>}<div className="import-dialog-actions"><button className="button-secondary" onClick={() => setImportOpen(false)}>Cancel</button><button className="button-primary" disabled={!importRows.some((row) => row.name.trim())} onClick={addImportedPlayers}><Plus size={16} /> Add {importRows.filter((row) => row.name.trim()).length || ''} demo players</button></div></section></div>}
    </div>
  )
}

function StatCard({ label, value, caption, icon, trend, up }: { label: string; value: string; caption: string; icon: React.ReactNode; trend: string; up?: boolean }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot"><span>{caption}</span><span className={up ? 'trend-positive' : 'trend-neutral'}>{up && <ArrowUpRight size={13} />}{trend}</span></div></article>
}

export default App
