import { useState } from 'react'
import { fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { TournamentManager } from './TournamentManager'
import { CoachSchedule } from './CoachSchedule'
import { defaultClubFields } from '../lib/fields'
import type { Tournament, TournamentSetup } from '../lib/tournament'
import type { ScoreGame } from '../lib/score-game'
afterEach(()=>vi.useRealTimers())
it('publishes all five teams with a selected seed bye, shares coach fixtures and waits for round results',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2030-05-31T12:00:00Z'))
  function Harness(){
    const [setups,setSetups]=useState<Record<string,TournamentSetup>>({})
    const [games,setGames]=useState<ScoreGame[]>([]);const [tournaments,setTournaments]=useState<Record<string,Tournament>>({})
    return <><TournamentManager scheduleBreaks={[{id:'holiday',name:'Holiday weekend',startDate:'2030-06-01',endDate:'2030-06-02',includeFollowingWeekend:true,divisions:[]}]} divisions={['U10']} coaches={{U10:['A','B','C','D','E']}} games={games} setGames={setGames} tournaments={tournaments} setTournaments={setTournaments} setups={setups} setSetups={setSetups} settings={{}} fields={defaultClubFields()} referees={[]} staff={{}} seasonStart="2030-06-01" seasonEnd="2030-08-31" fallRenewalDay="08-01" /><CoachSchedule games={games} division="U10" coach="B" tournament={tournaments.U10}/><output aria-label="Fixtures">{JSON.stringify(games)}</output><button onClick={()=>setGames(c=>c.map(g=>({...g,finalized:true,homeScore:1,awayScore:0})))}>Confirm round results</button></>
  }
  render(<Harness/>);
  fireEvent.change(screen.getByLabelText('First tournament date'),{target:{value:'2030-06-01'}})
  fireEvent.change(screen.getByLabelText('Opening bye seed numbers'),{target:{value:'1'}})
  fireEvent.change(screen.getByLabelText('Losses before elimination'),{target:{value:'2'}})
  fireEvent.click(screen.getByRole('checkbox',{name:/I confirm all teams/}))
  fireEvent.click(screen.getByRole('button',{name:'Preview opening round'}))
  expect(screen.getByRole('region',{name:'Tournament schedule preview'})).toHaveTextContent('Byes: A')
  fireEvent.click(screen.getByRole('button',{name:'Publish tournament round'}))
  const games=JSON.parse(screen.getByLabelText('Fixtures').textContent!) as ScoreGame[]
  expect(games).toHaveLength(2);expect(games.every(g=>g.date >= '2030-06-08')).toBe(true);expect(games.every(g=>g.durationMinutes===75&&g.phase==='tournament')).toBe(true)
  expect(screen.getByRole('region',{name:'Tournament schedule'})).toHaveTextContent('Round 1')
  expect(screen.getByRole('button',{name:'Preview next round'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button',{name:'Confirm round results'}))
  expect(screen.getByRole('button',{name:'Preview next round'})).toBeEnabled()
  fireEvent.click(screen.getByRole('button',{name:'Preview next round'}))
  expect(screen.getByRole('region',{name:'Tournament schedule preview'})).toHaveTextContent('Round 2 preview')
})
