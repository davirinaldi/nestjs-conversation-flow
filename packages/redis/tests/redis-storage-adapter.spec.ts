import type { FlowSession } from '@conversation-flow/core'
import { RedisStorageAdapter } from '../src/redis-storage-adapter'

// Mock ioredis
const mockGet = jest.fn()
const mockSetex = jest.fn()
const mockDel = jest.fn()
const mockQuit = jest.fn()

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockGet,
    setex: mockSetex,
    del: mockDel,
    quit: mockQuit,
  }))
})

function createSession(overrides: Partial<FlowSession> = {}): FlowSession {
  return {
    id: 'session-1',
    flowId: 'test-flow',
    currentStep: 'step-1',
    data: { name: 'Alice' },
    history: [
      {
        stepName: 'greet',
        input: 'hello',
        response: 'Hi!',
        timestamp: new Date('2025-01-01T00:00:00Z'),
      },
    ],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('RedisStorageAdapter', () => {
  let adapter: RedisStorageAdapter

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = new RedisStorageAdapter({ redis: 'redis://localhost:6379' })
  })

  describe('get', () => {
    it('returns null when key does not exist', async () => {
      mockGet.mockResolvedValue(null)

      const result = await adapter.get('nonexistent')
      expect(result).toBeNull()
      expect(mockGet).toHaveBeenCalledWith('cf:session:nonexistent')
    })

    it('returns deserialized FlowSession with proper Date objects', async () => {
      const session = createSession()
      mockGet.mockResolvedValue(JSON.stringify(session))

      const result = await adapter.get('session-1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('session-1')
      expect(result!.data.name).toBe('Alice')
      expect(result!.createdAt).toBeInstanceOf(Date)
      expect(result!.updatedAt).toBeInstanceOf(Date)
      expect(result!.history[0].timestamp).toBeInstanceOf(Date)
    })
  })

  describe('set', () => {
    it('calls Redis SETEX with correct key, JSON, and TTL', async () => {
      mockSetex.mockResolvedValue('OK')
      const session = createSession()

      await adapter.set(session)

      expect(mockSetex).toHaveBeenCalledWith('cf:session:session-1', 3600, JSON.stringify(session))
    })

    it('uses the configured prefix', async () => {
      mockSetex.mockResolvedValue('OK')
      const customAdapter = new RedisStorageAdapter({
        redis: 'redis://localhost:6379',
        prefix: 'myapp:',
      })

      await customAdapter.set(createSession())
      expect(mockSetex).toHaveBeenCalledWith(
        'myapp:session-1',
        expect.any(Number),
        expect.any(String),
      )
    })

    it('uses the configured TTL', async () => {
      mockSetex.mockResolvedValue('OK')
      const customAdapter = new RedisStorageAdapter({
        redis: 'redis://localhost:6379',
        ttl: 7200,
      })

      await customAdapter.set(createSession())
      expect(mockSetex).toHaveBeenCalledWith(
        expect.any(String),
        7200,
        expect.any(String),
      )
    })
  })

  describe('delete', () => {
    it('calls Redis DEL with correct key', async () => {
      mockDel.mockResolvedValue(1)

      await adapter.delete('session-1')
      expect(mockDel).toHaveBeenCalledWith('cf:session:session-1')
    })

    it('is no-op for non-existent key (DEL returns 0)', async () => {
      mockDel.mockResolvedValue(0)

      await expect(adapter.delete('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('constructor', () => {
    it('accepts a connection URL string', () => {
      const Redis = require('ioredis')
      new RedisStorageAdapter({ redis: 'redis://localhost:6379' })
      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379')
    })

    it('accepts an ioredis instance', () => {
      const mockClient = { get: jest.fn(), setex: jest.fn(), del: jest.fn(), quit: jest.fn() }
      // Should not create a new Redis client
      const Redis = require('ioredis')
      const callCount = Redis.mock.calls.length
      new RedisStorageAdapter({ redis: mockClient as never })
      expect(Redis.mock.calls.length).toBe(callCount)
    })
  })

  describe('disconnect', () => {
    it('calls quit when adapter owns the client', async () => {
      mockQuit.mockResolvedValue('OK')

      await adapter.disconnect()
      expect(mockQuit).toHaveBeenCalled()
    })

    it('does not call quit when adapter does not own the client', async () => {
      const mockClient = { get: jest.fn(), setex: jest.fn(), del: jest.fn(), quit: jest.fn() }
      const externalAdapter = new RedisStorageAdapter({ redis: mockClient as never })

      await externalAdapter.disconnect()
      expect(mockClient.quit).not.toHaveBeenCalled()
    })
  })
})
