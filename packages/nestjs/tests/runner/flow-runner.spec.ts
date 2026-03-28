import { FlowRunner } from '../../src/runner/flow-runner.service'
import { FlowEngine, MemoryStorageAdapter } from '@conversation-flow/core'
import type { FlowDefinition, FlowSession } from '@conversation-flow/core'

const testFlow: FlowDefinition = {
  flowId: 'test-flow',
  steps: [
    { name: 'greet', handler: async () => 'Hello!' },
    { name: 'bye', after: 'greet', handler: async () => 'Goodbye!' },
  ],
  handoffHandler: async (session: FlowSession) => (session.data.handoff as boolean) === true,
}

describe('FlowRunner', () => {
  let engine: FlowEngine
  let runner: FlowRunner

  beforeEach(() => {
    const storage = new MemoryStorageAdapter()
    engine = FlowEngine.create(storage, [testFlow])
  })

  it('delegates to FlowEngine.process()', async () => {
    runner = new FlowRunner(engine)
    const result = await runner.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: '',
    })

    expect(result.response).toBe('Hello!')
    expect(result.session.id).toBe('user-1')
  })

  it('calls onHandoff callback when handoff is true', async () => {
    const onHandoff = jest.fn()
    runner = new FlowRunner(engine, onHandoff)

    // First call sets up the session
    await runner.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })

    // Manually set handoff data before second call
    const storage = new MemoryStorageAdapter()
    engine = FlowEngine.create(storage, [
      {
        ...testFlow,
        handoffHandler: async () => true,
      },
    ])
    runner = new FlowRunner(engine, onHandoff)

    await runner.process({ flowId: 'test-flow', sessionId: 'user-1', input: 'hi' })
    expect(onHandoff).toHaveBeenCalledTimes(1)
    expect(onHandoff).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }))
  })

  it('does not call onHandoff when handoff is false', async () => {
    const onHandoff = jest.fn()
    runner = new FlowRunner(engine, onHandoff)

    await runner.process({ flowId: 'test-flow', sessionId: 'user-1', input: '' })
    expect(onHandoff).not.toHaveBeenCalled()
  })

  it('works without onHandoff callback', async () => {
    runner = new FlowRunner(engine)
    const result = await runner.process({
      flowId: 'test-flow',
      sessionId: 'user-1',
      input: '',
    })

    expect(result.handoff).toBe(false)
  })
})
