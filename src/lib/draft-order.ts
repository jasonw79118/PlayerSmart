/** Return the coach for a zero-based pick, reversing direction each round. */
export function snakeDraftCoach<T>(order: readonly T[], pickIndex: number): T | undefined {
  if (!order.length) return undefined
  const round = Math.floor(pickIndex / order.length)
  const position = pickIndex % order.length
  return order[round % 2 === 0 ? position : order.length - 1 - position]
}
