import { expect,it } from 'vitest'
import { u6Assignment } from './u6-teams'
it('automatically follows coach and assistant children while flagging conflicting links',()=>{
  const coaches=['Head A','Head B'];const staff={'U6:Head A':{headCoach:'Head A',assistantCoach:'Assistant A'},'U6:Head B':{headCoach:'Head B',assistantCoach:'Assistant B'}}
  const player={id:'p',grade:'U6',coachChild:'',assistantCoachChild:'',assignedCoach:'Head B'}
  expect(u6Assignment(player,coaches,staff).coach).toBe('Head B')
  expect(u6Assignment({...player,coachChild:'Head A'},coaches,staff)).toEqual({coach:'Head A',automatic:true,conflict:false})
  expect(u6Assignment({...player,assistantCoachChild:'Assistant A'},coaches,staff).coach).toBe('Head A')
  expect(u6Assignment({...player,coachChild:'Head B',assistantCoachChild:'Assistant A'},coaches,staff).conflict).toBe(true)
  expect(u6Assignment({...player,assistantCoachChild:'Assistant A'},coaches,{'U6:Head B':{headCoach:'Head B',assistantCoach:'Assistant A'}}).coach).toBe('Head B')
})
