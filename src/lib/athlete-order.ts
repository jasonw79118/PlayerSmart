const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true, ignorePunctuation: true })
type AthleteName = { name: string; firstName?: string; lastName?: string; id?: string }

function nameParts(athlete: AthleteName) {
  const name = athlete.name.trim().replace(/\s+/g, ' ')
  if (athlete.lastName?.trim()) return [athlete.lastName.trim(), athlete.firstName?.trim() || name]
  if (name.includes(',')) {
    const [last, ...first] = name.split(',')
    return [last.trim(), first.join(' ').trim()]
  }
  const parts = name.split(' ')
  if (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(parts.at(-1)!)) parts.pop()
  const last = parts.pop() ?? ''
  return [last, parts.join(' ')]
}

/** Alphabetical surname order, then given name and ID for consistent ties. */
export function compareAthletes(left: AthleteName, right: AthleteName) {
  const [leftLast, leftFirst] = nameParts(left)
  const [rightLast, rightFirst] = nameParts(right)
  return collator.compare(leftLast, rightLast) || collator.compare(leftFirst, rightFirst) || collator.compare(left.id ?? '', right.id ?? '')
}
