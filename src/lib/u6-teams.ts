export type U6Athlete = { id: string; grade: string; coachChild: string; assistantCoachChild: string; assignedCoach?: string }
export function u6Assignment(player: U6Athlete, coaches: string[], staff: Record<string,{headCoach: string; assistantCoach: string}>) {
  const parents = [player.coachChild,player.assistantCoachChild].filter(Boolean)
  const linked = coaches.filter(coach => parents.some(parent => parent === coach || parent === staff['U6:'+coach]?.headCoach || parent === staff['U6:'+coach]?.assistantCoach))
  if (linked.length>1) return {coach:'',conflict:true,automatic:true}
  if (linked.length===1) return {coach:linked[0],conflict:false,automatic:true}
  if(parents.length) return {coach:'',conflict:true,automatic:true}
  return {coach:coaches.includes(player.assignedCoach ?? '') ? player.assignedCoach! : '',conflict:false,automatic:false}
}
