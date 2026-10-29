export type LocalDraftSnapshot = { revision: number; values: Record<string, unknown> }
type Request = (values?: Record<string, unknown>, initialize?: boolean) => Promise<LocalDraftSnapshot>

/** One client per browser context; the dev server is authoritative across browser profiles. */
export class LocalDraftClient {
  private revision = -1
  private sequence = 0
  private pending = new Map<string, { value: unknown; sequence: number }>()
  private queue = Promise.resolve()
  constructor(private request: Request, private receive: (values: Record<string, unknown>) => void) {}
  accept(snapshot: LocalDraftSnapshot) {
    if (!Number.isInteger(snapshot.revision) || !snapshot.values || snapshot.revision < this.revision) return
    this.revision = snapshot.revision
    this.receive(Object.fromEntries(Object.entries(snapshot.values).filter(([key]) => !this.pending.has(key))))
  }
  async initialize(values: Record<string, unknown>) { this.accept(await this.request(values, true)) }
  async refresh() { this.accept(await this.request()); await this.flush() }
  write(key: string, value: unknown) {
    this.pending.set(key, { value, sequence: ++this.sequence })
    this.queue = this.queue.catch(() => {}).then(async () => {
      if (!this.pending.size) return
      const sent = new Map(this.pending)
      const snapshot = await this.request(Object.fromEntries([...sent].map(([name, update]) => [name, update.value])))
      sent.forEach((update, name) => { if (this.pending.get(name)?.sequence === update.sequence) this.pending.delete(name) })
      this.accept(snapshot)
    })
    // Keep failed writes queued for a reconnect, without unhandled promise rejections.
    void this.queue.catch(() => {})
  }
  async flush() {
    await this.queue.catch(() => {})
    if (this.pending.size) {
      const [key, update] = this.pending.entries().next().value!
      this.write(key, update.value)
      await this.queue
    }
  }
}
