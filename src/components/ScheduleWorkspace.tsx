import { useId, useState, type ReactNode } from 'react'
import { CalendarDays, CalendarOff, Wrench } from 'lucide-react'
import './MatchScheduler.css'

export function ScheduleWorkspace({matches,holidays,repairs,breakCount}: {matches:ReactNode;holidays:ReactNode;repairs:ReactNode;breakCount:number}) {
  const [view,setView]=useState(0)
  const id=useId()
  const sections=[{label:'Matches',icon:CalendarDays,content:matches},{label:'Holidays & breaks',icon:CalendarOff,content:holidays},{label:'Schedule repair',icon:Wrench,content:repairs}]
  return <section className="schedule-workspace" aria-label="Schedule workspace">
    <div className="schedule-workspace-heading"><div><h2>Schedule</h2><p>Manage division matches, no-game dates and schedule changes.</p></div><span className="schedule-timezone">America/Chicago</span></div>
    <div className="schedule-workspace-tabs" role="tablist" aria-label="Schedule sections">{sections.map(({label,icon:Icon},index)=><button key={label} role="tab" id={`${id}-tab-${index}`} aria-selected={view===index} aria-controls={`${id}-panel-${index}`} tabIndex={view===index?0:-1} onClick={()=>setView(index)} onKeyDown={event=>{
      const next=event.key==='ArrowRight'?(index+1)%sections.length:event.key==='ArrowLeft'?(index+sections.length-1)%sections.length:event.key==='Home'?0:event.key==='End'?sections.length-1:undefined
      if(next===undefined)return
      event.preventDefault();setView(next);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
    }}><Icon size={17} aria-hidden="true"/><span>{label}</span>{index===1 && breakCount>0 && <span className="schedule-tab-count" aria-label={`${breakCount} saved periods`}>{breakCount}</span>}</button>)}</div>
    {sections.map(({label,content},index)=><div key={label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={view!==index}>{content}</div>)}
  </section>
}
