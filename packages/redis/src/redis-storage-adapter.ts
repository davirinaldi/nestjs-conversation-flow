import Redis from 'ioredis'
import type { FlowSession, StorageAdapter } from '@conversation-flow/core'

export interface RedisStorageAdapterOptions {
  /** An existing ioredis client instance or a Redis connection URL string. */
  redis: Redis | string

  /** Key prefix for session keys. Default: 'cf:session:' */
  prefix?: string

  /** Time-to-live for sessions in seconds. Default: 3600 */
  ttl?: number
}

/**
 * Redis-backed implementation of StorageAdapter.
 * Sessions are stored as JSON strings with native Redis TTL expiry.
 *
 * @example
 * ```typescript
 * // Using a connection URL
 * const adapter = new RedisStorageAdapter({
 *   redis: 'redis://localhost:6379',
 *   ttl: 3600,
 * })
 *
 * // Using an existing ioredis client
 * const client = new Redis()
 * const adapter = new RedisStorageAdapter({ redis: client })
 * ```
 */
export class RedisStorageAdapter implements StorageAdapter {
  private readonly client: Redis
  private readonly prefix: string
  private readonly ttl: number
  private readonly ownsClient: boolean

  constructor(options: RedisStorageAdapterOptions) {
    if (typeof options.redis === 'string') {
      this.client = new Redis(options.redis)
      this.ownsClient = true
    } else {
      this.client = options.redis
      this.ownsClient = false
    }

    this.prefix = options.prefix ?? 'cf:session:'
    this.ttl = options.ttl ?? 3600
  }

  async get(sessionId: string): Promise<FlowSession | null> {
    const data = await this.client.get(this.key(sessionId))
    if (!data) return null

    return this.deserialize(data)
  }

  async set(session: FlowSession): Promise<void> {
    const data = JSON.stringify(session)
    await this.client.setex(this.key(session.id), this.ttl, data)
  }

  async delete(sessionId: string): Promise<void> {
    await this.client.del(this.key(sessionId))
  }

  /** Disconnect from Redis. Only disconnects if the adapter created the client. */
  async disconnect(): Promise<void> {
    if (this.ownsClient) {
      await this.client.quit()
    }
  }

  private key(sessionId: string): string {
    return `${this.prefix}${sessionId}`
  }

  private deserialize(data: string): FlowSession {
    const parsed = JSON.parse(data) as FlowSession
    parsed.createdAt = new Date(parsed.createdAt)
    parsed.updatedAt = new Date(parsed.updatedAt)
    for (const entry of parsed.history) {
      entry.timestamp = new Date(entry.timestamp)
    }
    return parsed
  }
}
