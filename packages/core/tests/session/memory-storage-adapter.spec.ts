import { MemoryStorageAdapter } from '../../src/session/memory-storage-adapter'
import type { FlowSession } from '../../src/types'

function createSession(overrides: Partial<FlowSession> = {}): FlowSession {
  return {
    id: 'session-1',
    flowId: 'test-flow',
    currentStep: 'step-1',
    data: {},
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
  })

  it('returns null for non-existent session', async () => {
    const result = await adapter.get('non-existent')
    expect(result).toBeNull()
  })

  it('stores and retrieves a session', async () => {
    const session = createSession()
    await adapter.set(session)

    const result = await adapter.get('session-1')
    expect(result).toEqual(session)
  })

  it('stores a clone — mutating original does not affect stored copy', async () => {
    const session = createSession()
    await adapter.set(session)

    session.data.modified = true

    const result = await adapter.get('session-1')
    expect(result!.data.modified).toBeUndefined()
  })

  it('returns a clone — mutating returned value does not affect stored copy', async () => {
    const session = createSession()
    await adapter.set(session)

    const result1 = await adapter.get('session-1')
    result1!.data.modified = true

    const result2 = await adapter.get('session-1')
    expect(result2!.data.modified).toBeUndefined()
  })

  it('overwrites existing session with same ID', async () => {
    await adapter.set(createSession({ data: { version: 1 } }))
    await adapter.set(createSession({ data: { version: 2 } }))

    const result = await adapter.get('session-1')
    expect(result!.data.version).toBe(2)
  })

  it('deletes a session', async () => {
    await adapter.set(createSession())
    await adapter.delete('session-1')

    const result = await adapter.get('session-1')
    expect(result).toBeNull()
  })

  it('delete is a no-op for non-existent session', async () => {
    await expect(adapter.delete('non-existent')).resolves.toBeUndefined()
  })

  it('reports size correctly', async () => {
    expect(adapter.size).toBe(0)
    await adapter.set(createSession({ id: 'a' }))
    await adapter.set(createSession({ id: 'b' }))
    expect(adapter.size).toBe(2)
  })

  describe('TTL', () => {
    it('returns null for expired session', async () => {
      const adapter = new MemoryStorageAdapter({ ttl: 1 })
      await adapter.set(createSession())

      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now + 2000)

      const result = await adapter.get('session-1')
      expect(result).toBeNull()

      jest.restoreAllMocks()
    })

    it('returns session that has not expired', async () => {
      const adapter = new MemoryStorageAdapter({ ttl: 10 })
      await adapter.set(createSession())

      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now + 5000)

      const result = await adapter.get('session-1')
      expect(result).not.toBeNull()

      jest.restoreAllMocks()
    })

    it('cleans up expired session from internal map on get', async () => {
      const adapter = new MemoryStorageAdapter({ ttl: 1 })
      await adapter.set(createSession())
      expect(adapter.size).toBe(1)

      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now + 2000)

      await adapter.get('session-1')
      expect(adapter.size).toBe(0)

      jest.restoreAllMocks()
    })

    it('defaults to 3600 seconds TTL', async () => {
      const adapter = new MemoryStorageAdapter()
      await adapter.set(createSession())

      const now = Date.now()
      // At 3599 seconds: still valid
      jest.spyOn(Date, 'now').mockReturnValue(now + 3599 * 1000)
      expect(await adapter.get('session-1')).not.toBeNull()

      // At 3601 seconds: expired
      jest.spyOn(Date, 'now').mockReturnValue(now + 3601 * 1000)
      expect(await adapter.get('session-1')).toBeNull()

      jest.restoreAllMocks()
    })
  })
})
