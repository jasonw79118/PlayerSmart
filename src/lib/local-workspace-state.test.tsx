import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLocalWorkspaceState } from './local-workspace-state'

describe('local cross-tab draft state', () => {
  it('shares local changes without sharing account identity and receives other-tab updates', () => {
    const key = 'sharing-test'
    const first = renderHook(() => useLocalWorkspaceState(key, [] as string[], true))
    const second = renderHook(() => useLocalWorkspaceState(key, [] as string[], true))
    act(() => first.result.current[1](['player-1']))
    expect(second.result.current[0]).toEqual(['player-1'])
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'playersmart-local-draft-v1:' + key, newValue: JSON.stringify(['player-1', 'player-2']) })))
    expect(first.result.current[0]).toEqual(['player-1', 'player-2'])
    expect(second.result.current[0]).toEqual(['player-1', 'player-2'])
  })
  it('keeps ordinary non-development state isolated from local fixtures', () => {
    const first = renderHook(() => useLocalWorkspaceState('isolation-test', 0, false))
    const second = renderHook(() => useLocalWorkspaceState('isolation-test', 0, false))
    act(() => first.result.current[1](1))
    expect(first.result.current[0]).toBe(1)
    expect(second.result.current[0]).toBe(0)
    expect(window.localStorage.getItem('playersmart-local-draft-v1:isolation-test')).toBeNull()
  })
})
