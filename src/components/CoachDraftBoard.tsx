import './CoachDraftBoard.css'

export type DraftBoardPlayer = { id: string; name: string; number: string | number; score?: string; division?: string; letterGrade?: string }

export function rankedCoachBoard<T extends { id: string }>(available: readonly T[], preferences: readonly string[]): T[] {
  const availableById = new Map(available.map((player) => [player.id, player]))
  const preferred = [...new Set(preferences)].flatMap((id) => {
    const player = availableById.get(id)
    return player ? [player] : []
  })
  const preferredIds = new Set(preferred.map((player) => player.id))
  return [...preferred, ...available.filter((player) => !preferredIds.has(player.id))]
}

export function CoachDraftBoard({ coach, available, preferences, onPreferencesChange, selectedId, onSelect, disabled = false }: {
  coach: string
  available: DraftBoardPlayer[]
  preferences: string[]
  onPreferencesChange: (ids: string[]) => void
  selectedId?: string
  onSelect: (id: string) => void
  disabled?: boolean
}) {
  const ranked = rankedCoachBoard(available, preferences)
  const preferred = ranked.filter((player) => preferences.includes(player.id))
  function move(id: string, direction: number) {
    const ids = preferred.map((player) => player.id)
    const index = ids.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    onPreferencesChange(ids)
  }
  return <section className="coach-preference-board" aria-label={`Suggested draft board for ${coach}`}>
    <h3>Your suggested draft order</h3>
    <p>Prioritize your choices and move them into your preferred order. Remaining players follow evaluation order. Drafted players leave this board automatically; planning does not assign a player.</p>
    <p className="coach-board-summary" aria-live="polite">{preferred.length} preferred choices available · {ranked.length} players available</p>
    {ranked.length ? <ol aria-label={`Ranked available players for ${coach}`}>{ranked.map((player, index) => {
      const priority = preferred.findIndex((entry) => entry.id === player.id)
      return <li key={player.id} className={selectedId === player.id ? 'coach-board-selected' : ''}>
        <span className="coach-board-rank">{index + 1}</span>
        <button type="button" className="coach-board-player" aria-label={`Select ${player.name} for ${coach}`} aria-pressed={selectedId === player.id} disabled={disabled} onClick={() => onSelect(player.id)}><strong>{player.name}</strong><small>Eval #{player.number}{player.division ? ' · ' + player.division : ''}{player.letterGrade ? ' · Grade ' + player.letterGrade : ''}{player.score ? ` · ${player.score}/10` : ''}{priority >= 0 ? ` · Preference ${priority + 1}` : ' · Evaluation suggestion'}</small></button>
        <div className="coach-board-actions">{priority < 0 ? <button type="button" disabled={disabled} aria-label={`Prioritize ${player.name} for ${coach}`} onClick={() => { onPreferencesChange([...preferred.map((entry) => entry.id), player.id]); onSelect(preferred[0]?.id ?? player.id) }}>Prioritize</button> : <>
          <button type="button" aria-label={`Move ${player.name} earlier for ${coach}`} disabled={disabled || priority === 0} onClick={() => move(player.id, -1)}>↑</button>
          <button type="button" aria-label={`Move ${player.name} later for ${coach}`} disabled={disabled || priority === preferred.length - 1} onClick={() => move(player.id, 1)}>↓</button>
          <button type="button" disabled={disabled} aria-label={`Remove preference ${player.name} for ${coach}`} onClick={() => onPreferencesChange(preferred.filter((entry) => entry.id !== player.id).map((entry) => entry.id))}>Remove</button>
        </>}</div>
      </li>
    })}</ol> : <p>No eligible players remain.</p>}
  </section>
}
