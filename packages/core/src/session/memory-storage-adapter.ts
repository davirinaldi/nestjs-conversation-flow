import type { FlowSession, StorageAdapter } from '../types/index.js'

interface StoredSession {
  session: FlowSession
  expiresAt: number
}

export interface MemoryStorageAdapterOptions {
  /** Time-to-live for sessions in seconds. Default: 3600 */
  ttl?: number
}

/**
 * In-memory implementation of StorageAdapter using a Map.
 * Sessions are cloned on read/write to prevent reference sharing.
 * Expired sessions are lazily cleaned up on access.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, StoredSession>()
  private readonly ttl: number

  constructor(options: MemoryStorageAdapterOptions = {}) {
    this.ttl = (options.ttl ?? 3600) * 1000
  }

  async get(sessionId: string): Promise<FlowSession | null> {
    const entry = this.store.get(sessionId)
    if (!entry) return null

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(sessionId)
      return null
    }

    return structuredClone(entry.session)
  }

  async set(session: FlowSession): Promise<void> {
    this.store.set(session.id, {
      session: structuredClone(session),
      expiresAt: Date.now() + this.ttl,
    })
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId)
  }

  /** Number of sessions currently stored (including expired but not yet cleaned up). */
  get size(): number {
    return this.store.size
  }
}
