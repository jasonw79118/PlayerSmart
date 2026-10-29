import { useState } from 'react'
import { fireEvent,render,screen,within } from '@testing-library/react'
import { expect,it } from 'vitest'
import { U6Teams } from './U6Teams'
it('assigns children automatically, supports direct placement and flags conflicting parents',()=>{
  function Harness(){
    const[players,setPlayers]=useState([{id:'p1',name:'Zoe Adams',grade:'U6',coachChild:'',assistantCoachChild:'',assignedCoach:''},{id:'p2',name:'Alex Brown',grade:'U6',coachChild:'',assistantCoachChild:'',assignedCoach:''}])
    const[coaches,setCoaches]=useState(['Head A','Head B']);const[count,setCount]=useState(2)
    const[staff,setStaff]=useState<Record<string,{headCoach:string;assistantCoach:string;teamNickname:string;jerseyColor:string}>>({'U6:Head A':{headCoach:'Head A',assistantCoach:'Assistant A',teamNickname:'A',jerseyColor:'blue'},'U6:Head B':{headCoach:'Head B',assistantCoach:'',teamNickname:'B',jerseyColor:'red'}})
    return <U6Teams players={players} setPlayers={setPlayers} coaches={coaches} setCoaches={setCoaches} count={count} setCount={setCount} directory={['Head A','Head B','Assistant A']} staff={staff} setStaff={setStaff} onImport={()=>{}} />
  }
  render(<Harness/>);
  const rows=screen.getAllByRole('row');expect(rows[1]).toHaveTextContent('Zoe Adams');expect(rows[2]).toHaveTextContent('Alex Brown')
  fireEvent.change(screen.getByLabelText('Assign Alex Brown'),{target:{value:'Head B'}})
  expect(screen.getByLabelText('Assign Alex Brown')).toHaveValue('Head B')
  fireEvent.change(screen.getByLabelText('Zoe Adams assistantCoachChild'),{target:{value:'Assistant A'}})
  expect(within(rows[1]).getByText('Head A (automatic)')).toBeTruthy();expect(screen.queryByLabelText('Assign Zoe Adams')).toBeNull()
  fireEvent.change(screen.getByLabelText('Zoe Adams coachChild'),{target:{value:'Head B'}})
  expect(screen.getByRole('alert')).toHaveTextContent('Resolve parent links')
  expect(screen.queryByText(/evaluation areas rated/)).toBeNull()
})
