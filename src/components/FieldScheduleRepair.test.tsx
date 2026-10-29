import { useState } from 'react'
import { fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { FieldScheduleRepair } from './FieldScheduleRepair'
import { defaultClubFields } from '../lib/fields'
import type { ScoreGame } from '../lib/score-game'
afterEach(()=>vi.useRealTimers())
it('uses tournament dates beyond the regular season when repairing a closed field',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2030-05-31T12:00:00Z'))
  const fixture:ScoreGame={id:'t1',division:'U10',date:'2030-07-06',kickoff:'09:00',time:'9:00 AM',field:'1',durationMinutes:75,phase:'tournament',tournamentId:'t',tournamentRound:1,scheduleStatus:'scheduled',homeCoach:'A',awayCoach:'B',homeTeam:'A',awayTeam:'B',homeColor:'blue',awayColor:'red',homeScore:0,awayScore:0,homePlayers:0,awayPlayers:0,homeSigned:false,awaySigned:false,homeSignedAt:'',awaySignedAt:'',homeSignatureName:'',awaySignatureName:'',referee:'',finalized:false}
  const fields=defaultClubFields().map(f=>f.divisions.includes('U10')?{...f,closures:[{id:'closed',date:'2030-07-06',startTime:'',endTime:'',reason:'Unplayable'}]}:f)
  function Harness(){const[games,setGames]=useState([fixture]);return <><FieldScheduleRepair fields={fields} games={games} setGames={setGames} settings={{}} tournamentSetups={{U10:{lossLimit:1,byeSeeds:'',startDate:'2030-07-01',endDate:'2030-07-31',extraMatchMinutes:20}}} referees={[]} seasonStart="2030-06-01" seasonEnd="2030-06-30" fallRenewalDay="08-01"/><output aria-label="Fixtures">{JSON.stringify(games)}</output></>}
  render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Preview schedule repair'}));fireEvent.click(screen.getByRole('button',{name:'Apply schedule repair'}))
  const saved=JSON.parse(screen.getByLabelText('Fixtures').textContent!) as ScoreGame[]
  expect(saved[0].date).toBe('2030-07-13');expect(saved[0].durationMinutes).toBe(75);expect(saved[0].tournamentId).toBe('t')
})
it('repairs shared field closures across divisions, preserving a started zero-zero match',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2030-05-31T12:00:00Z'))
  const fixture=(id:string,division:string,time:string):ScoreGame=>({id,division,date:'2030-06-01',kickoff:time,time,field:'8',durationMinutes:65,scheduleStatus:'scheduled',homeCoach:id+' A',awayCoach:id+' B',homeTeam:id+' A',awayTeam:id+' B',homeColor:'blue',awayColor:'red',homeScore:0,awayScore:0,homePlayers:0,awayPlayers:0,homeSigned:false,awaySigned:false,homeSignedAt:'',awaySignedAt:'',homeSignatureName:'',awaySignatureName:'',referee:'',finalized:false})
  const initial=[fixture('u12','U12','09:00'),fixture('u14','U14','11:00'),{...fixture('started','U18','13:00'),actualStartedAt:'2030-06-01T18:00:00Z'}]
  const fields=defaultClubFields().map(f=>f.id==='8'?{...f,closures:[{id:'closed',date:'2030-06-01',startTime:'',endTime:'',reason:'Techform use'}]}:f)
  function Harness(){const[games,setGames]=useState(initial);return <><FieldScheduleRepair fields={fields} games={games} setGames={setGames} settings={{}} referees={[]} seasonStart="2030-06-01" seasonEnd="2030-08-31" fallRenewalDay="08-01"/><output aria-label="Fixtures">{JSON.stringify(games)}</output></>}
  render(<Harness/>);expect(screen.getByRole('alert')).toHaveTextContent('play is already recorded')
  fireEvent.click(screen.getByRole('button',{name:'Preview schedule repair'}));fireEvent.click(screen.getByRole('button',{name:'Apply schedule repair'}))
  const saved=JSON.parse(screen.getByLabelText('Fixtures').textContent!) as ScoreGame[]
  expect(saved.find(g=>g.id==='started')).toEqual(initial[2]);expect(saved.filter(g=>g.id!=='started').every(g=>g.date>'2030-06-01'&&g.field==='8')).toBe(true)
  expect(saved[0].date+saved[0].kickoff).not.toBe(saved[1].date+saved[1].kickoff)
  expect(saved[0].scheduleHistory?.[0].date).toBe('2030-06-01')
})
