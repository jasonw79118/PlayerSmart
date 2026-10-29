import { useState } from 'react'
import { fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { ScheduleBreaks } from './ScheduleBreaks'
import { FieldScheduleRepair } from './FieldScheduleRepair'
import { defaultClubFields } from '../lib/fields'
import type { ScheduleBreak } from '../lib/schedule-breaks'
import type { ScoreGame } from '../lib/score-game'
afterEach(()=>vi.useRealTimers())
it('saves a break, postpones affected unplayed cards and repairs them beyond the skipped weekend',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2030-06-07T12:00:00Z'))
  const fixture=(id:string):ScoreGame=>({id,division:'U10',date:'2030-06-08',kickoff:'09:00',time:'9:00 AM',field:'1',durationMinutes:55,scheduleStatus:'scheduled',homeCoach:id+' A',awayCoach:id+' B',homeTeam:id+' A',awayTeam:id+' B',homeColor:'blue',awayColor:'red',homeScore:0,awayScore:0,homePlayers:0,awayPlayers:0,homeSigned:false,awaySigned:false,homeSignedAt:'',awaySignedAt:'',homeSignatureName:'',awaySignatureName:'',referee:'',finalized:false})
  function Harness(){
    const[breaks,setBreaks]=useState<ScheduleBreak[]>([])
    const[games,setGames]=useState([fixture('unplayed'),{...fixture('started'),actualStartedAt:'2030-06-08T14:00:00Z'}])
    return <><ScheduleBreaks breaks={breaks} setBreaks={setBreaks} divisions={['U6','U10']} games={games} setGames={setGames}/><FieldScheduleRepair fields={defaultClubFields()} games={games} setGames={setGames} settings={{}} scheduleBreaks={breaks} referees={[]} seasonStart="2030-06-01" seasonEnd="2030-06-30" fallRenewalDay="08-01"/><output aria-label="Stored fixtures">{JSON.stringify(games)}</output></>
  }
  render(<Harness/>);
  fireEvent.change(screen.getByLabelText('Holiday or break name'),{target:{value:'Spring break'}})
  fireEvent.change(screen.getByLabelText('Break starts'),{target:{value:'2030-06-03'}})
  fireEvent.change(screen.getByLabelText('Break ends'),{target:{value:'2030-06-07'}})
  expect(screen.getByRole('checkbox',{name:/Include the weekend/})).toBeChecked()
  expect(screen.getByText(/No games:/)).toHaveTextContent('2030-06-09')
  fireEvent.click(screen.getByRole('button',{name:'Add no-game period'}))
  expect(screen.getByText('2 existing upcoming matches fall in a no-game period.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Postpone affected unplayed games'}))
  let saved=JSON.parse(screen.getByLabelText('Stored fixtures').textContent!) as ScoreGame[]
  expect(saved[0].scheduleStatus).toBe('postponed');expect(saved[0].scheduleReason).toContain('Spring break')
  expect(saved[1].scheduleStatus).toBe('scheduled')
  fireEvent.click(screen.getByRole('button',{name:'Preview schedule repair'}))
  fireEvent.click(screen.getByRole('button',{name:'Apply schedule repair'}))
  saved=JSON.parse(screen.getByLabelText('Stored fixtures').textContent!) as ScoreGame[]
  expect(saved[0].date).toBe('2030-06-15');expect(saved[0].scheduleStatus).toBe('scheduled');expect(saved[1].date).toBe('2030-06-08')
  expect(saved[0].scheduleHistory?.[0].reason).toBe('Holiday/break closure')
  fireEvent.click(screen.getByRole('button',{name:'Edit Spring break'}))
  expect(screen.getByLabelText('Break ends')).toHaveValue('2030-06-07')
  fireEvent.click(screen.getByRole('button',{name:'Remove Spring break'}))
  expect(screen.queryByRole('button',{name:'Edit Spring break'})).toBeNull()
})
