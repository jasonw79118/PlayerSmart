import { useState } from 'react'
import { fireEvent,render,screen,within } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { ScheduleWorkspace } from './ScheduleWorkspace'
import { MatchScheduler } from './MatchScheduler'
import { ScheduleBreaks } from './ScheduleBreaks'
import { FieldScheduleRepair } from './FieldScheduleRepair'
import { defaultClubFields } from '../lib/fields'
import type { ScheduleSettings } from '../lib/match-scheduler'
import type { ScheduleBreak } from '../lib/schedule-breaks'
import type { ScoreGame } from '../lib/score-game'
afterEach(()=>vi.useRealTimers())
it('separates schedule tasks and retains settings, previews and break drafts when switching sections',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2030-05-31T12:00:00Z'))
  function Harness(){
    const[games,setGames]=useState<ScoreGame[]>([])
    const[settings,setSettings]=useState<Record<string,ScheduleSettings>>({})
    const[breaks,setBreaks]=useState<ScheduleBreak[]>([])
    return <><ScheduleWorkspace breakCount={breaks.length} matches={<MatchScheduler divisions={['U10']} coaches={{U10:['A','B']}} teamCounts={{U10:2}} staff={{}} games={games} setGames={setGames} settingsByDivision={settings} setSettings={setSettings} seasonStart="2030-06-01" seasonEnd="2030-06-30" scheduleBreaks={breaks}/>} holidays={<ScheduleBreaks divisions={['U10']} breaks={breaks} setBreaks={setBreaks} games={games} setGames={setGames}/>} repairs={<FieldScheduleRepair fields={defaultClubFields()} games={games} setGames={setGames} settings={settings} referees={[]} seasonStart="2030-06-01" seasonEnd="2030-06-30" fallRenewalDay="08-01" scheduleBreaks={breaks}/>}/><output aria-label="Published matches">{games.length}</output></>
  }
  render(<Harness/>);
  const tabs=within(screen.getByRole('tablist',{name:'Schedule sections'}))
  expect(tabs.getByRole('tab',{name:'Matches'})).toHaveAttribute('aria-selected','true')
  expect(screen.queryByRole('region',{name:'Holidays and school breaks'})).toBeNull()
  expect(screen.queryByRole('region',{name:'Repair field schedules'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Edit scheduling settings'}))
  fireEvent.change(screen.getByLabelText('First match date'),{target:{value:'2030-06-02'}})
  fireEvent.click(screen.getByRole('button',{name:'Done editing settings'}))
  fireEvent.click(screen.getByRole('button',{name:'Build schedule preview'}))
  expect(screen.getByRole('region',{name:'Schedule preview'})).toBeVisible()
  fireEvent.click(tabs.getByRole('tab',{name:'Holidays & breaks'}))
  expect(screen.queryByRole('region',{name:'Schedule preview'})).toBeNull()
  fireEvent.change(screen.getByLabelText('Holiday or break name'),{target:{value:'Fall break'}})
  fireEvent.keyDown(tabs.getByRole('tab',{name:'Holidays & breaks'}),{key:'ArrowRight'})
  expect(tabs.getByRole('tab',{name:'Schedule repair'})).toHaveFocus()
  expect(screen.getByRole('region',{name:'Repair field schedules'})).toBeVisible()
  fireEvent.click(tabs.getByRole('tab',{name:'Holidays & breaks'}))
  expect(screen.getByLabelText('Holiday or break name')).toHaveValue('Fall break')
  fireEvent.click(tabs.getByRole('tab',{name:'Matches'}))
  expect(screen.getByRole('region',{name:'Schedule preview'})).toBeVisible()
  expect(screen.getByRole('button',{name:'Edit scheduling settings'})).toHaveAttribute('aria-expanded','false')
  fireEvent.click(screen.getByRole('button',{name:'Edit scheduling settings'}))
  expect(screen.getByLabelText('First match date')).toHaveValue('2030-06-02')
  expect(screen.getByLabelText('Published matches')).toHaveTextContent('0')
})
