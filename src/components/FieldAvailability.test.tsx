import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FieldAvailability } from './FieldAvailability'
import { defaultClubFields } from '../lib/fields'

function Harness() {
  const [fields, setFields] = useState(defaultClubFields)
  return <><FieldAvailability fields={fields} setFields={setFields} /><output aria-label="Saved fields">{JSON.stringify(fields)}</output></>
}
it('saves physical field hours and closures once for all sharing divisions', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: /Field 8/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Add field availability window' }))
  fireEvent.change(screen.getByLabelText('Field availability start 1'), { target: { value: '10:00' } })
  fireEvent.change(screen.getByLabelText('Field unavailable dates'), { target: { value: '2030-06-08' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add field closure' }))
  fireEvent.change(screen.getByLabelText('Field closure date 1'), { target: { value: '2030-06-01' } })
  fireEvent.change(screen.getByLabelText('Field closure startTime 1'), { target: { value: '10:00' } })
  fireEvent.change(screen.getByLabelText('Field closure endTime 1'), { target: { value: '11:30' } })
  fireEvent.change(screen.getByLabelText('Field closure reason 1'), { target: { value: 'Maintenance' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save field availability' }))
  const field = JSON.parse(screen.getByLabelText('Saved fields').textContent!).find((entry: { id: string }) => entry.id === '8')
  expect(field.divisions).toEqual(['U12', 'U14', 'U18'])
  expect(field.availability[0].startTime).toBe('10:00')
  expect(field.unavailableDates).toEqual(['2030-06-08'])
  expect(field.closures[0]).toMatchObject({ date: '2030-06-01', reason: 'Maintenance' })
})
