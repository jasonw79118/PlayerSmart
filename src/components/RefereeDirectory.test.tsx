import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2030-05-31T12:00:00Z')) })
afterEach(() => vi.useRealTimers())
import { RefereeDirectory } from './RefereeDirectory'
import type { RefereeProfile } from '../lib/referees'

function Harness() {
  const [referees, setReferees] = useState<RefereeProfile[]>([])
  return <><RefereeDirectory referees={referees} setReferees={setReferees} divisions={['U8 Boys', 'U10', 'U12']} seasonStart="2030-06-01" seasonEnd="2030-08-31" /><output aria-label="Saved referees">{JSON.stringify(referees)}</output></>
}
it('saves and edits contact preferences, eligible divisions, weekly availability and date exceptions', () => {
  render(<Harness />)
  fireEvent.change(screen.getByLabelText('Referee full name'), { target: { value: 'Pat Example' } })
  fireEvent.change(screen.getByLabelText('Referee phone'), { target: { value: '555-010-1234' } })
  fireEvent.change(screen.getByLabelText('Referee email'), { target: { value: 'pat@example.test' } })
  fireEvent.change(screen.getByLabelText('Referee preferred contact method'), { target: { value: 'text' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'U10' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add availability window' }))
  const window = screen.getByRole('group', { name: 'Availability window 1' })
  expect(within(window).getByRole('checkbox', { name: 'Saturday' })).toBeChecked()
  fireEvent.change(screen.getByLabelText('Availability end 1'), { target: { value: '13:00' } })
  fireEvent.change(screen.getByLabelText('Referee unavailable dates'), { target: { value: '2030-06-08' } })
  fireEvent.change(screen.getByLabelText('Referee scheduling notes'), { target: { value: 'Available for morning games.' } })
  fireEvent.change(screen.getByLabelText('Referee background check fall year'), { target: { value: '2029' } })
  fireEvent.change(screen.getByLabelText('Referee first practice or duty date'), { target: { value: '2030-06-01' } })
  fireEvent.change(screen.getByLabelText('Background check conducted on for Pat Example'), { target: { value: '2029-08-01' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Club background check complete for Pat Example' }))
  expect(screen.getByLabelText('Background check for Pat Example')).toHaveTextContent('Fall 2029 / Spring 2030')
  fireEvent.click(screen.getByRole('button', { name: 'Save referee' }))
  const saved = JSON.parse(screen.getByLabelText('Saved referees').textContent!) as RefereeProfile[]
  expect(saved).toHaveLength(1)
  expect(saved[0]).toMatchObject({ name: 'Pat Example', phone: '555-010-1234', email: 'pat@example.test', preferredContact: 'text', divisions: ['U10'], unavailableDates: ['2030-06-08'] })
  expect(saved[0].availability[0]).toMatchObject({ weekdays: [6], endTime: '13:00', startDate: '2030-06-01' })
  expect(saved[0].backgroundChecks?.['fall-2029']).toMatchObject({ conductedOn: '2029-08-01', verifiedBy: 'Administrator' })
  fireEvent.click(screen.getByRole('button', { name: 'New referee' }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit referee Pat Example' }))
  expect(screen.getByLabelText('Referee phone')).toHaveValue('555-010-1234')
  expect(screen.getByLabelText('Referee preferred contact method')).toHaveValue('text')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Active referee' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save referee' }))
  expect(JSON.parse(screen.getByLabelText('Saved referees').textContent!)[0].active).toBe(false)
})
it('requires usable contact details when a preferred contact method is selected', () => {
  render(<Harness />)
  fireEvent.change(screen.getByLabelText('Referee full name'), { target: { value: 'Chris Example' } })
  fireEvent.change(screen.getByLabelText('Referee preferred contact method'), { target: { value: 'email' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save referee' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter an email address for the preferred contact method')
  expect(JSON.parse(screen.getByLabelText('Saved referees').textContent!)).toHaveLength(0)
})
