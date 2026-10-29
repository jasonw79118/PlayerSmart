export const localTestAccounts = {
  'coach-john-test': { id: 'coach-john-test', name: 'John Test', role: 'Coach', section: 'Draft', division: 'U10' },
  'ref-chris-james': { id: 'ref-chris-james', name: 'Chris James', role: 'Referee', section: 'Referee' },
} as const
export type LocalTestAccount = typeof localTestAccounts[keyof typeof localTestAccounts]

export function localTestAccountFor(development: boolean, location: { hostname: string; search: string }): LocalTestAccount | null {
  if (!development || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return null
  const id = new URLSearchParams(location.search).get('testAccount')
  return id && Object.hasOwn(localTestAccounts, id) ? localTestAccounts[id as keyof typeof localTestAccounts] : null
}
