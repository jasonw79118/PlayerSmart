import { describe,expect,it } from 'vitest'
import { breakEndDate,breaksOnDate,validateScheduleBreak,type ScheduleBreak } from './schedule-breaks'
import { availableSlots,defaultScheduleSettings,planMatches,slotFits } from './match-scheduler'
const spring:ScheduleBreak={id:'spring',name:'Spring break',startDate:'2030-06-03',endDate:'2030-06-07',includeFollowingWeekend:true,divisions:[]}
describe('holiday and school break exclusions',()=>{
  it('includes a Friday-ending break weekend and resumes Monday',()=>{
    expect(breakEndDate(spring)).toBe('2030-06-09')
    for(const date of ['2030-06-03','2030-06-07','2030-06-08','2030-06-09'])expect(breaksOnDate([spring],date,'U10')).toHaveLength(1)
    expect(breaksOnDate([spring],'2030-06-10','U10')).toEqual([])
    expect(breaksOnDate([{...spring,includeFollowingWeekend:false}],'2030-06-08','U10')).toEqual([])
  })
  it('does not add another weekend when the range already ends on Sunday',()=>{
    const easter={...spring,name:'Holiday weekend',startDate:'2030-04-19',endDate:'2030-04-21'}
    expect(breakEndDate(easter)).toBe('2030-04-21')
    for(const date of ['2030-04-19','2030-04-20','2030-04-21'])expect(breaksOnDate([easter],date,'U6')).toHaveLength(1)
    expect(breaksOnDate([easter],'2030-04-27','U6')).toHaveLength(0)
  })
  it('blocks only the following weekend, keeping intervening weekdays available',()=>{
    const monday={...spring,startDate:'2030-06-03',endDate:'2030-06-03'}
    expect(breaksOnDate([monday],'2030-06-04','U10')).toHaveLength(0)
    expect(breaksOnDate([monday],'2030-06-08','U10')).toHaveLength(1)
    expect(breaksOnDate([{...spring,divisions:['U6']}],'2030-06-08','U10')).toHaveLength(0)
  })
  it('rejects reversed or invalid dates and preserves overlap when one break is removed',()=>{
    expect(validateScheduleBreak({...spring,endDate:'2030-02-30'})).not.toHaveLength(0)
    expect(validateScheduleBreak({...spring,endDate:'2030-06-02'})).not.toHaveLength(0)
    const holiday={...spring,id:'holiday',name:'Holiday',startDate:'2030-06-08',endDate:'2030-06-09'}
    expect(breaksOnDate([spring,holiday],'2030-06-08','U10')).toHaveLength(2)
    expect(breaksOnDate([holiday],'2030-06-08','U10')).toHaveLength(1)
  })
  it('skips no-game weekends in regular, tournament-sized and replacement planning',()=>{
    const settings={...defaultScheduleSettings('U10','2030-06-01','2030-06-30'),scheduleBreaks:[spring],dayPriority:[6,0],weekdays:[6,0],avoidedWeekdays:[]}
    expect(availableSlots(settings,'U10','2030-06-03').some(s=>['2030-06-08','2030-06-09'].includes(s.date))).toBe(false)
    const pair={id:'new',division:'U10',homeCoach:'A',awayCoach:'B'}
    expect(planMatches([pair],[],settings,'2030-06-03').placed[0].slot.date).toBe('2030-06-15')
    expect(planMatches([{...pair,durationMinutes:75}],[],settings,'2030-06-03').placed[0].slot.date).toBe('2030-06-15')
    expect(slotFits(pair,{date:'2030-06-08',kickoff:'09:00',field:'1',durationMinutes:55,turnaroundMinutes:10},[],settings)).toBe(false)
  })
})
