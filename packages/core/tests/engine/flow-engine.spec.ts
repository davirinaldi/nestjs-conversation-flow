import { FlowEngine, FLOW_COMPLETED } from '../../src/engine/flow-engine'
import { MemoryStorageAdapter } from '../../src/session/memory-storage-adapter'
import { FlowNotFoundError, FlowCompletedError } from '../../src/errors'
import type { FlowDefinition, FlowSession } from '../../src/types'

function createFlow(overrides: Partial<FlowDefinition> = {}): FlowDefinition {
  return {
    flowId: 'test-flow',
    steps: [
      {
        name: 'greet',
        handler: async () => 'Hello! What is your name?',
      },
      {
        name: 'ask-email',
        after: 'greet',
        handler: async (session: FlowSession) => {
          session.data.name = session.history.at(-1)?.input
          return `Nice to meet you, ${session.data.name}! What is your email?`
        },
      },
      {
        name: 'confirm',
        after: 'ask-email',
        handler: async (session: FlowSession) => {
          session.data.email = session.history.at(-1)?.input
          return `Got it. Name: ${session.data.name}, Email: ${session.data.email}`
        },
      },
    ],
    ...overrides,
  }
}

describe('FlowEngine', () => {
  let storage: MemoryStorageAdapter
  let engine: FlowEngine

  beforeEach(() => {
    storage = new MemoryStorageAdapter()
    engine = FlowEngine.create(storage, [createFlow()])
  })

  it('executes the first step for a new session', async () => {
    const result = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: '',
    })

    expect(result.response).toBe('Hello! What is your name?')
    expect(result.handoff).toBe(false)
  })

  it('creates session with correct fields on first interaction', async () => {
    const result = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: '',
    })

    expect(result.session.id).toBe('user-1')
    expect(result.session.flowId).toBe('test-flow')
    expect(result.session.history).toHaveLength(1)
    expect(result.session.createdAt).toBeInstanceOf(Date)
    expect(result.session.updatedAt).toBeInstanceOf(Date)
  })

  it('advances to the next step on subsequent calls', async () => {
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })

    const result = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'Alice',
    })

    expect(result.response).toBe('Nice to meet you, Alice! What is your email?')
    expect(result.session.data.name).toBe('Alice')
  })

  it('processes through all steps sequentially', async () => {
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'Alice' })

    const result = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'alice@example.com',
    })

    expect(result.response).toBe('Got it. Name: Alice, Email: alice@example.com')
    expect(result.session.currentStep).toBe(FLOW_COMPLETED)
    expect(result.session.history).toHaveLength(3)
  })

  it('throws FlowCompletedError on extra message after flow ends', async () => {
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'Alice' })
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'alice@example.com' })

    await expect(
      engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'extra' }),
    ).rejects.toThrow(FlowCompletedError)
  })

  it('throws FlowNotFoundError for unknown flowId', async () => {
    await expect(
      engine.process({ flowId: 'nonexistent', sessionId: 'user-1', input: '' }),
    ).rejects.toThrow(FlowNotFoundError)
  })

  it('records history with input and response for each step', async () => {
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'start' })

    const result = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'Alice',
    })

    expect(result.session.history[0]).toMatchObject({
      stepName: 'greet',
      input: 'start',
      response: 'Hello! What is your name?',
    })
    expect(result.session.history[1]).toMatchObject({
      stepName: 'ask-email',
      input: 'Alice',
      response: 'Nice to meet you, Alice! What is your email?',
    })
  })

  it('persists session data across calls', async () => {
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })

    const r2 = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'Alice',
    })
    expect(r2.session.data.name).toBe('Alice')

    const r3 = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'alice@example.com',
    })
    expect(r3.session.data.name).toBe('Alice')
    expect(r3.session.data.email).toBe('alice@example.com')
  })

  it('updates updatedAt on each process call', async () => {
    const r1 = await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
    const t1 = r1.session.updatedAt.getTime()

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10))

    const r2 = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'Alice',
    })
    const t2 = r2.session.updatedAt.getTime()

    expect(t2).toBeGreaterThanOrEqual(t1)
  })

  describe('handoff', () => {
    it('returns handoff: true when handoffHandler returns true', async () => {
      const flowWithHandoff = createFlow({
        handoffHandler: async () => true,
      })
      const engine = FlowEngine.create(storage, [flowWithHandoff])

      const result = await engine.process({
        flowId: 'test-flow',
        sessionId: 'user-1',
        input: '',
      })

      expect(result.handoff).toBe(true)
    })

    it('returns handoff: false when handoffHandler returns false', async () => {
      const flowWithHandoff = createFlow({
        handoffHandler: async () => false,
      })
      const engine = FlowEngine.create(storage, [flowWithHandoff])

      const result = await engine.process({
        flowId: 'test-flow',
        sessionId: 'user-1',
        input: '',
      })

      expect(result.handoff).toBe(false)
    })

    it('returns handoff: false when no handoffHandler defined', async () => {
      const result = await engine.process({
        flowId: 'test-flow',
        sessionId: 'user-1',
        input: '',
      })

      expect(result.handoff).toBe(false)
    })
  })

  describe('onStepComplete hook', () => {
    it('fires after step executes with correct context', async () => {
      const hook = jest.fn()
      const flowWithHook = createFlow({ onStepComplete: hook })
      const engine = FlowEngine.create(storage, [flowWithHook])

      await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'hi' })

      expect(hook).toHaveBeenCalledTimes(1)
      expect(hook).toHaveBeenCalledWith(
        expect.objectContaining({
          flowId: 'test-flow',
          stepName: 'greet',
          input: 'hi',
          response: 'Hello! What is your name?',
        }),
      )
    })

    it('can mutate session.data and mutations persist', async () => {
      const hook = jest.fn(async (ctx: { session: { data: Record<string, unknown> } }) => {
        ctx.session.data.hookRan = true
      })
      const flowWithHook = createFlow({ onStepComplete: hook })
      const engine = FlowEngine.create(storage, [flowWithHook])

      const result = await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
      expect(result.session.data.hookRan).toBe(true)
    })

    it('mutations influence @Condition evaluation', async () => {
      const flow: FlowDefinition = {
        flowId: 'hook-condition',
        steps: [
          {
            name: 'start',
            handler: async () => 'Hello',
            conditions: [
              { when: async (s) => s.data.routed === true, then: 'branch-a' },
            ],
          },
          { name: 'branch-a', after: 'start', handler: async () => 'Branch A!' },
        ],
        onStepComplete: async (ctx) => {
          ctx.session.data.routed = true
        },
      }
      const engine = FlowEngine.create(storage, [flow])

      const r1 = await engine.process({ flowId: 'hook-condition', sessionId: 'u1', input: '' })
      expect(r1.session.currentStep).toBe('branch-a')
    })

    it('works normally when no hook is defined', async () => {
      const result = await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
      expect(result.response).toBe('Hello! What is your name?')
    })
  })

  it('supports multiple independent sessions', async () => {
    await engine.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
    await engine.process({ flowId: 'test-flow', sessionId: 'user-2', input: '' })

    const r1 = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: 'Alice',
    })
    const r2 = await engine.process({
      flowId: 'test-flow',
      sessionId: 'user-2',
      input: 'Bob',
    })

    expect(r1.session.data.name).toBe('Alice')
    expect(r2.session.data.name).toBe('Bob')
  })
})
