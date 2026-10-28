export type RestartType = 'kickoff' | 'throw-in' | 'goal-kick' | 'free-kick' | 'penalty-kick' | 'corner-kick' | 'dropped-ball'

export type VerifiedRestartPlacement = {
  id: string
  restartType: RestartType
  text: string
  diagramId: string
  sourceIds: string[]
  divisions: string[]
  keywords: string[]
}

// These phrases and diagrams are fixed to cited 2025/26 law text. The model
// selects an ID; it never writes placement instructions or SVG markup.
export const verifiedRestartPlacements: VerifiedRestartPlacement[] = [
  { id: 'kickoff-center-mark', restartType: 'kickoff', text: 'Place the ball on the centre mark.', diagramId: 'kickoff', sourceIds: ['pdsa-law-8-restarts', 'IFAB-2025-26-LAW-8'], divisions: ['All divisions'], keywords: ['kickoff', 'kick-off', 'start', 'restart', 'centre', 'center'] },
  { id: 'throw-in-exit-point', restartType: 'throw-in', text: 'Take the throw-in from the point where the ball left the field, on the touchline.', diagramId: 'throw-in', sourceIds: ['pdsa-law-15-throw-in', 'IFAB-2025-26-LAW-15'], divisions: ['All divisions'], keywords: ['throw-in', 'throw in', 'touchline', 'sideline', 'out of bounds'] },
  { id: 'goal-kick-general', restartType: 'goal-kick', text: 'Place the ball at any point within the goal area.', diagramId: 'goal-kick', sourceIds: ['pdsa-law-16-goal-kick'], divisions: ['U10', 'U12', 'U14', 'U18'], keywords: ['goal kick', 'goal-kick'] },
  { id: 'goal-kick-u6-u8', restartType: 'goal-kick', text: 'For U6/U8, place the ball anywhere on the goal line, not in the goal box. Opponents remain in their own half until the ball is in play.', diagramId: 'goal-kick-u6-u8', sourceIds: ['pdsa-law-16-goal-kick'], divisions: ['U6', 'U8'], keywords: ['goal kick', 'goal-kick', 'goal line', 'goal box'] },
  { id: 'free-kick-offence-location', restartType: 'free-kick', text: 'The free kick is taken from the location of the offence, subject to the applicable Law 13 exceptions.', diagramId: 'free-kick', sourceIds: ['IFAB-2025-26-LAW-13'], divisions: ['All divisions'], keywords: ['free kick', 'free-kick', 'foul', 'offence', 'offense'] },
  { id: 'free-kick-u6-u8-goal-box', restartType: 'free-kick', text: 'For U6/U8 free kicks awarded near the goal box, place the ball 4 yards from the goal-box line, directly away from the goal.', diagramId: 'free-kick-u6-u8-goal-box', sourceIds: ['pdsa-law-13-free-kicks'], divisions: ['U6', 'U8'], keywords: ['free kick', 'free-kick', 'goal box', 'near goal', '4 yards'] },
  { id: 'penalty-kick-mark', restartType: 'penalty-kick', text: 'Place the ball stationary on the penalty mark. The supplied PDSA rulebook does not state a measurement from the goal line.', diagramId: 'penalty-kick', sourceIds: ['pdsa-law-14-penalty'], divisions: ['U10', 'U12', 'U14', 'U18'], keywords: ['penalty', 'penalty kick', 'penalty-kick', 'spot', 'mark'] },
  { id: 'corner-kick-nearest-area', restartType: 'corner-kick', text: 'Place the ball in the corner area nearest to where it crossed the goal line.', diagramId: 'corner-kick', sourceIds: ['pdsa-law-17-corner'], divisions: ['All divisions'], keywords: ['corner', 'corner kick', 'corner-kick'] },
  { id: 'dropped-ball-stoppage-location', restartType: 'dropped-ball', text: 'The dropped ball is at the position where the ball was when play was stopped, following the applicable IFAB Law 8 procedure.', diagramId: 'dropped-ball', sourceIds: ['IFAB-2025-26-LAW-8'], divisions: ['All divisions'], keywords: ['dropped ball', 'drop ball', 'restart after referee', 'referee touched'] },
]
