import { describe,it,expect } from 'vitest'
import { nextTournamentRound,standings,tournamentProgress,winner,type Tournament } from './tournament'
import type { ScoreGame } from './score-game'
const game=(homeCoach:string,awayCoach:string,homeScore=1,awayScore=0):ScoreGame=>({id:crypto.randomUUID(),date:'2030-06-01',time:'09:00',division:'U10',homeCoach,awayCoach,homeTeam:homeCoach,awayTeam:awayCoach,homeScore,awayScore,homeColor:'blue',awayColor:'red',referee:'',homePlayers:0,awayPlayers:0,homeSigned:true,awaySigned:true,homeSignedAt:'',awaySignedAt:'',homeSignatureName:'',awaySignatureName:'',finalized:true})
describe('tournament rules and progression',()=>{
  it('seeds only official regular results, with PDSA points and goal difference',()=>{
    const regular=[game('A','B',2,0),game('B','C',1,1),{...game('C','A',9,0),finalized:false},{...game('C','A',5,0),phase:'tournament' as const}]
    expect(standings('U10',['A','B','C'],regular).map(r=>[r.coach,r.points,r.wins,r.losses,r.draws])).toEqual([['A',3,1,0,0],['C',1,0,0,1],['B',1,0,1,1]])
  })
  it('keeps every team and honors selected opening seed byes without awarding wins',()=>{
    const tournament:Tournament={id:'t',division:'U10',seeds:['A','B','C','D','E'],lossLimit:1,openingByes:['A','B','C'],rounds:[]}
    const next=nextTournamentRound(tournament,[])
    expect(next.byes).toEqual(['A','B','C']);expect(next.pairs).toEqual([{homeCoach:'D',awayCoach:'E'}]);expect(tournamentProgress(tournament,[]).alive).toHaveLength(5)
    expect(()=>nextTournamentRound({...tournament,openingByes:[]},[])).toThrow('Opening byes')
  })
  for(const lossLimit of [1,2,3]) it(`completes a five-team tournament at ${lossLimit} losses with every eliminated team reaching the limit`,()=>{
    let tournament:Tournament={id:'t',division:'U10',seeds:['A','B','C','D','E'],lossLimit,openingByes:['A'],rounds:[]};const games:ScoreGame[]=[]
    for(let i=0;i<40&&!tournamentProgress(tournament,games).champion;i++){
      const round=nextTournamentRound(tournament,games)
      const matches=round.pairs.map(p=>({...game(p.homeCoach,p.awayCoach),phase:'tournament' as const,tournamentId:'t',tournamentRound:round.number}))
      games.push(...matches);tournament={...tournament,rounds:[...tournament.rounds,{number:round.number,byes:round.byes,gameIds:matches.map(g=>g.id)}]}
    }
    const result=tournamentProgress(tournament,games);expect(result.champion).toBeTruthy();for(const coach of tournament.seeds.filter(c=>c!==result.champion))expect(result.losses[coach]).toBe(lossLimit)
  })
  it('requires a finalized winner, using shootout kicks separately from match goals',()=>{
    const match={...game('A','B',1,1),phase:'tournament' as const,tournamentId:'t'}
    const tournament:Tournament={id:'t',division:'U10',seeds:['A','B'],lossLimit:1,openingByes:[],rounds:[{number:1,byes:[],gameIds:[match.id]}]}
    expect(winner(match)).toBeUndefined();expect(()=>nextTournamentRound(tournament,[match])).toThrow('Finalize')
    expect(winner({...match,homeShootout:4,awayShootout:3})).toBe('A')
    expect(tournamentProgress(tournament,[{...match,homeShootout:4,awayShootout:3}]).champion).toBe('A')
  })
})
