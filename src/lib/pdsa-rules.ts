export type RuleSourceEntry = {
  id: string
  title: string
  sourceName: string
  sourceUrl: string
  edition: string
  section: string
  text: string
  reviewedBy: string
  reviewedOn: string
  verified: boolean
  keywords: string[]
  documentUrl?: string
}

const sourceName = 'Palo Duro Soccer Association Official Laws of the Game (provided PDF)'
const edition = '2025/2026, Issue 09 (02/2026)'
export const PDSA_RULEBOOK_VERSION = '2025/2026 Issue 09 (02/2026)'
export const IFAB_RULES_VERSION = '2025/26'
const lawLink = (law: string) => `https://www.theifab.com/laws/2025-26/${law}/`

export const pdsaRulesKnowledge: RuleSourceEntry[] = [
  {
    id: 'pdsa-law-1-field', title: 'Field locations, flags, and coach areas', sourceName, sourceUrl: '', edition, section: 'Law 1 – The Field of Play, page 7',
    text: 'PDSA fields: U6 fields 3–5, U8 fields 6–7a, U10 fields 1–2, and U12/U14/U18 field 8. Corner flags are used in all divisions. Halfway flags are not used for U6 or U8; they are used for U10 and older. U8 coaches remain between the halfway line and the corner arc. Coaches should stay on the sideline in their team area. One U6 coach may be on the field throughout the game.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['field', 'coach', 'sideline', 'corner', 'flag', 'halfway', 'location', 'where'],
  },
  {
    id: 'pdsa-law-2-ball', title: 'Approved ball sizes by division', sourceName, sourceUrl: '', edition, section: 'Law 2 – The Ball, page 7',
    text: 'PDSA match ball sizes: U6 size 3, U8 size 3, U10 size 4, and U12/U14/U18 size 5.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['ball', 'size', 'equipment'],
  },
  {
    id: 'pdsa-law-3-players', title: 'Players on the field, playing time, substitutions, and goalkeeper', sourceName, sourceUrl: '', edition, section: 'Law 3 – The Players, page 8',
    text: 'PDSA player formats are U6 3v3, U8 4v4, U10 9v9, U12 9v9, U14 8v8, and U18 8v8, subject to change based on final player count. Each player must play at least 50% of game time. Substitutions are unlimited. U6 substitutions may be made anytime; older divisions substitute during stoppages under the listed procedure. Any player may become goalkeeper if the referee is informed and the change is made during a stoppage. Confirm final roster-dependent player counts with the Commissioner or Referee Coordinator.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['players', 'number', 'format', '3v3', '4v4', '9v9', '8v8', 'subs', 'substitution', 'goalkeeper', 'keeper', 'play time', '50 percent'],
  },
  {
    id: 'pdsa-law-4-equipment', title: 'Player equipment, jewelry, footwear, and uniforms', sourceName, sourceUrl: '', edition, section: 'Law 4 – The Players’ Equipment, page 9',
    text: 'Required equipment: shirt with sleeves, shorts or athletic pants (no jeans), socks, shin guards of suitable material and size covered by socks, and closed-toe footwear. No toe-cleats or boots of any type. Jewelry is prohibited except small stud earrings approved by the Referee Coordinator or Board Member and covered with tape or equivalent. Hard casts or braces must be approved and padded. Teams and goalkeepers must wear distinguishable colors; a goalkeeper pinnie is used if needed.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['equipment', 'jewelry', 'earrings', 'shoes', 'cleats', 'boots', 'shin guards', 'uniform', 'colors', 'pinnie', 'cast', 'brace'],
  },
  {
    id: 'pdsa-law-5-referee', title: 'Referee authority, decisions, and concerns', sourceName, sourceUrl: '', edition, section: 'Law 5 – The Referee, page 10',
    text: 'The referee has full authority to enforce PDSA Official Laws during the match. Referee decisions are based on the referee’s opinion and the spirit of the game. Once the match score card is signed, decisions about facts of play, goals, and results are final. Direct performance or outcome concerns to the Referee Coordinator, not the match official.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['referee', 'authority', 'decision', 'complaint', 'dispute', 'score card', 'coordinator'],
  },
  {
    id: 'pdsa-law-6-officials', title: 'Assistant referees and video assistance', sourceName, sourceUrl: '', edition, section: 'Law 6 – The Other Match Officials, page 10',
    text: 'Assistant referees will be used whenever possible for U10–U18 matches. Video assistance referees and other videography are not used to make match decisions.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['assistant referee', 'linesman', 'video', 'var', 'officials'],
  },
  {
    id: 'pdsa-law-7-duration', title: 'Match duration and breaks by division', sourceName, sourceUrl: lawLink('the-duration-of-the-match'), edition, section: 'Law 7 – Duration of the Match, page 10',
    text: 'U6 games have four 8-minute quarters. U8 games have four 10-minute quarters. U6 and U8 quarter breaks are 2 minutes and halftime is 5 minutes. U10 games have two 25-minute halves; U12, U14, and U18 games have two 30-minute halves; halftime is 5 minutes. Game times can change based on final player count or weather. U10–U18 teams without substitutes or playing in extreme heat or wind may agree with the center referee to add a 2-minute water break in the middle of each half; the PDSA Board makes final decisions about water breaks game by game. No added time is applied for ordinary stoppages. A game may be delayed up to 10 minutes for a team short of players; delay time is subtracted from play time. Check with the Commissioner or Referee Coordinator after rosters are sent or during extreme weather.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['duration', 'length', 'long', 'time', 'quarter', 'period', 'half', 'halftime', 'break', 'water', 'minutes', 'game', 'match', 'delay', 'stoppage', 'clock'],
  },
  {
    id: 'pdsa-law-8-restarts', title: 'Kick-off, dropped ball, and restarts', sourceName, sourceUrl: lawLink('the-start-and-restart-of-play'), edition, section: 'Law 8 – The Start and Restart of Play, page 12',
    text: 'At a kick-off, the team winning rock-paper-scissors or a coin toss chooses which goal to attack or to take the kick-off. The other team takes the remaining option. The team that chose the end takes the second-half kick-off, and teams change ends. All players except the kicker must be in their own half; opponents must be outside the center circle until the ball is in play. For U6 and U8, a goal cannot be scored directly from kick-off; award a goal kick if the ball enters the goal. U6 and U8 handballs and other offences result in indirect free kicks. PDSA refers to IFAB for dropped-ball rules and procedure.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['kickoff', 'kick off', 'coin toss', 'rock paper scissors', 'center circle', 'dropped ball', 'restart', 'goal directly'],
  },
  {
    id: 'pdsa-law-9-ball-play', title: 'When the ball is in or out of play', sourceName, sourceUrl: lawLink('the-ball-in-and-out-of-play'), edition, section: 'Law 9 – The Ball In and Out of Play, page 12',
    text: 'The ball is out when it wholly passes over the goal line or touchline on the ground or in the air. If the ball touches a match official, stays on the field, and a promising attack, goal, or possession change results, play is stopped and a dropped ball is awarded.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['ball', 'out', 'touchline', 'goal line', 'official', 'referee', 'dropped ball', 'possession'],
  },
  {
    id: 'pdsa-law-10-goals', title: 'Goals, mercy rule, and U6/U8 goal-box rules', sourceName, sourceUrl: lawLink('determining-the-outcome-of-a-match'), edition, section: 'Law 10 – Determining the Outcome of a Match, page 13',
    text: 'A goal is scored when the whole ball passes over the goal line. Tournament overtime is governed by Appendix A. The mercy rule suspends the match when more than half the game is complete and a team leads by more than eight goals; the match then becomes a scrimmage with an official. U6/U8: no player may touch the ball within the goal box, though a player may move through it. If a defender touches the ball in the box, a goal is awarded to the attacking team. If an attacker touches it in the box, or the ball stops there, award a goal kick to the defending team. U6 has an additional no-own-goal rule.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['goal', 'scoring', 'mercy rule', 'eight goals', 'goal box', 'own goal', 'tournament', 'overtime'],
  },
  {
    id: 'pdsa-law-11-offside', title: 'Offside by division', sourceName, sourceUrl: lawLink('offside'), edition, section: 'Law 11 – Offside, page 14',
    text: 'PDSA does not call offside in U6 or U8. Offside applies in U10, U12, U14, and U18. Refer to IFAB Laws or the Referee Coordinator for offside rulings. When an offside offence occurs, the referee awards an indirect free kick where the offence occurred.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['offside', 'offsides', 'position', 'trap', 'flag', 'assistant referee'],
  },
  {
    id: 'pdsa-law-12-fouls', title: 'Fouls, misconduct, cards, and goalkeeper restrictions', sourceName, sourceUrl: lawLink('fouls-and-misconduct'), edition, section: 'Law 12 – Fouls and Misconduct, pages 14–15',
    text: 'PDSA U6/U8: all fouls result in an indirect free kick, the offence must be explained to the player, and no cards are awarded. Headers are not allowed; intentionally heading the ball results in an indirect free kick. A red card or second yellow sends the player or coach off and results in a one-match suspension, subject to review. PDSA does not adopt IFAB temporary dismissals. A goalkeeper who controls the ball with hands/arms for more than eight seconds is penalized with a corner kick. Goalkeeper handball offences also include touching the ball after a deliberate teammate pass-back or teammate throw-in. Refer to IFAB for other foul definitions and details.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['foul', 'misconduct', 'yellow card', 'red card', 'send off', 'suspension', 'header', 'heading', 'handball', 'goalkeeper', 'keeper', 'eight seconds', 'temporary dismissal'],
  },
  {
    id: 'pdsa-law-13-free-kicks', title: 'Direct and indirect free kicks', sourceName, sourceUrl: lawLink('free-kicks'), edition, section: 'Law 13 – Free Kicks, page 16',
    text: 'A direct free kick kicked directly into the opponents’ goal scores a goal. An indirect free kick kicked directly into the opponents’ goal results in a goal kick. A direct or indirect free kick kicked directly into a team’s own goal results in a corner kick. Defensive wall distance is 4 yards for U6/U8 and 8 yards for U10 and older. For U6/U8 free kicks near the goal box, place the ball 4 yards directly away from the goal-box line.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['free kick', 'direct', 'indirect', 'wall', 'distance', 'yards', 'goal kick', 'corner kick'],
  },
  {
    id: 'pdsa-law-14-penalty', title: 'Penalty kicks (U10 and older)', sourceName, sourceUrl: lawLink('the-penalty-kick'), edition, section: 'Law 14 – The Penalty Kick, page 16',
    text: 'PDSA penalty kicks apply in U10, U12, U14, and U18. The ball must be stationary on the penalty mark. The defending goalkeeper must remain on the goal line until the ball is kicked. Other players must be at least 10 yards from the mark, behind the mark, inside the field, and outside the penalty area. The ball must move forward and the kicker cannot touch it again until another player touches it.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['penalty', 'penalty kick', 'pk', 'goalkeeper', 'goal line', '10 yards', 'mark'],
  },
  {
    id: 'pdsa-law-15-throw-in', title: 'Throw-in procedure and U8 mulligan', sourceName, sourceUrl: lawLink('the-throw-in'), edition, section: 'Law 15 – The Throw-In, page 17',
    text: 'A goal cannot be scored directly from a throw-in. The thrower takes it from the point where the ball left the field, faces the field, has part of each foot on the touchline or ground outside it, and throws with both hands from behind and over the head. The ball must touch another player before the thrower touches it again. U8 receives a mulligan to retake an illegal throw-in throughout the season unless coaches, commissioner, and referee coordinator agree otherwise. U6 uses kick-ins instead of throw-ins. In the 2025/2026 issue, throw-in mulligans were removed for U10–U18.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['throw in', 'throw-in', 'throwin', 'mulligan', 'illegal throw', 'kick in', 'kick-in', 'touchline'],
  },
  {
    id: 'pdsa-law-16-goal-kick', title: 'Goal-kick placement and opponents', sourceName, sourceUrl: lawLink('the-goal-kick'), edition, section: 'Law 16 – The Goal Kick, page 18',
    text: 'A goal kick is awarded when the whole ball crosses the goal line after last touching an attacker and no goal is scored. In U6/U8, place the ball anywhere on the goal line (not the goal box), and opponents must remain in their own half until the ball is in play. The ball does not have to leave the penalty area before being touched by either team under the listed general rule.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['goal kick', 'goal-kick', 'goal line', 'goal box', 'penalty area'],
  },
  {
    id: 'pdsa-law-17-corner', title: 'Corner-kick procedure', sourceName, sourceUrl: lawLink('the-corner-kick'), edition, section: 'Law 17 – The Corner Kick, page 18',
    text: 'A corner kick is awarded when the whole ball crosses the goal line, last touched by a defender, and no goal is scored. Place the ball in the corner area nearest where it crossed the goal line. The corner flag must not be moved or held by referees.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['corner', 'corner kick', 'flag', 'goal line'],
  },
  {
    id: 'pdsa-appendix-a-overtime', title: 'Tournament overtime and penalty shootout', sourceName, sourceUrl: '', edition, section: 'Appendix A – Match Overtime, pages 19–20',
    text: 'Overtime applies only to tournament matches tied after normal time. Play two consecutive five-minute halves, changing ends as in normal time; both halves are completed regardless of the first-half overtime score. If still tied, use a penalty shootout. U8 tournament shootout kicks are taken from center field with no goalkeeper or defender; the fifth kicker may be selected from an eligible player not on the field if identified beforehand.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['overtime', 'extra time', 'tournament', 'tie', 'shootout', 'penalty shootout', 'sudden death'],
  },
  {
    id: 'pdsa-appendix-b-weather', title: 'Weather and field-condition suspensions', sourceName, sourceUrl: '', edition, section: 'Appendix B – Weather and Field Condition Policy, page 21',
    text: 'Weather/field suspension guidelines include actual temperature below 32°F or feels-like temperature above 95°F; sustained winds of 35 mph or gusts above 50 mph; an alarming field lightning-detection alarm; standing water, snow, or a field condition deemed unsuitable by a PDSA Board Member. If a match is suspended after at least 50% is complete, it is complete unless coaches and commissioner agree otherwise. If less than 50% is complete, it is rescheduled and resumes at the suspension point unless otherwise agreed. Check the PDSA website and WBGT for playable weather.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['weather', 'lightning', 'thunder', 'heat', 'temperature', 'wind', 'rain', 'snow', 'field closure', 'suspend', 'reschedule', 'wbgt'],
  },
  {
    id: 'pdsa-appendix-c-standings', title: 'Standings, points, and tournament tiebreakers', sourceName, sourceUrl: '', edition, section: 'Appendix C – Regular Season Standings & Tournament Seedings, page 22',
    text: 'Regular-season standings points: win = 3, tie = 1, loss = 0. Tournament seeding tiebreakers, in order: overall standings points, goal differential, head-to-head results (when two teams are tied), then goals scored.',
    reviewedBy: 'Provided PDSA rulebook', reviewedOn: '2026-02-01', verified: true, keywords: ['standings', 'points', 'win', 'loss', 'tie', 'tiebreaker', 'seed', 'goal differential'],
  },
]

// Additional details checked against the publicly available Issue 09 PDF on
// 2026-10-29. This source check is not a coordinator approval of answer drafts.
const originalDocumentUrl = 'https://crossbar.s3.amazonaws.com/organizations/1035/uploads/c76604f7-8063-4404-aa0a-86e5f9c0080b.pdf?versionId=f4H7l_ZjFXeughCbE._w4H6JYF59lRrp'
const checkedDetails: Record<string, string> = {
  'pdsa-law-3-players': ' U6 and U8 have no goalkeeper; U10 and older use a goalkeeper. Older divisions may substitute on either team’s goal kick, goal, caution or injury; on their own corner or throw-in; and the opponents may also substitute if the team taking that corner or throw-in substitutes. Substitutes wait at midfield and enter when summoned. Halftime substitutions do not require alerting the referee. If a coach enters for an injury, that player leaves and may re-enter after play restarts through the proper substitution procedure. A team may play down at most one player when short, not for convenient subbing; inform the center referee and change at the start or a quarter/halftime break, with injury exceptions. Both coaches match the reduced numbers.',
  'pdsa-law-4-equipment': ' Original Law 4 check: small stud earrings may be worn if covered with tape or equivalent. The text otherwise requires Referee Coordinator or Board approval for jewellery exceptions. Confirm ambiguous equipment or safety questions with those officials; ordinary tape is not blanket permission for all jewellery.',
  'pdsa-law-12-fouls': ' The match clock must not be stopped for injury regardless of severity; stopping play for safety is separate. PDSA does not adopt the IFAB non-deliberate-handball goal/promising-attack disciplinary exception; confirm its application with the Referee Coordinator for a specific incident.',
  'pdsa-law-15-throw-in': ' For U6 kick-ins, put the ball on or outside the touchline and play it onto the field. Another player must touch it before the kicker plays it again. U6 kick-in mulligans are unlimited all season; after multiple unsuccessful attempts the coach should choose another kicker. A throw directly into the opponents’ goal gives a goal kick; directly into the thrower’s own goal gives a corner.',
  'pdsa-law-16-goal-kick': ' A goal may be scored from a goal kick. The general location is within the goal area and opponents stay outside the penalty area until it is in play; the stated U6/U8 goal-line and own-half modifications take priority.',
}
for (const [id, text] of Object.entries(checkedDetails)) {
  const source = pdsaRulesKnowledge.find((entry) => entry.id === id)!
  if (id === 'pdsa-law-4-equipment') source.text = source.text.replace('Jewelry is prohibited except small stud earrings approved by the Referee Coordinator or Board Member and covered with tape or equivalent.', 'PDSA permits small stud earrings covered with tape or equivalent; other jewelry exceptions require Referee Coordinator or Board approval.')
  source.text += text
  source.documentUrl = originalDocumentUrl
  source.reviewedOn = '2026-10-29'
  source.reviewedBy = 'Source check against public Issue 09 PDF; answer approval remains separate'
}
