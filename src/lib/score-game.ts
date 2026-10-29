import type { SignatureStroke } from '../components/SignaturePad'
import type { ScheduleInfo } from './match-scheduler'

export type ScoreGame = ScheduleInfo & {
  phase?: 'regular' | 'tournament'; tournamentId?: string; tournamentRound?: number
  actualStartedAt?: string; actualEndedAt?: string
  homeShootout?: number; awayShootout?: number
  id: string; date: string; time: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
  homePlayers: number; awayPlayers: number; homeCoach: string; awayCoach: string; homeColor: string; awayColor: string; referee: string
  homeSignatureName: string; awaySignatureName: string; homeSignedAt: string; awaySignedAt: string; homeSigned: boolean; awaySigned: boolean
  homeSignature?: SignatureStroke[]; awaySignature?: SignatureStroke[]; finalized: boolean
}
