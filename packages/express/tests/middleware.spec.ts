import { FlowEngine, MemoryStorageAdapter } from '@conversation-flow/core'
import type { FlowDefinition } from '@conversation-flow/core'
import { createConversationFlowMiddleware } from '../src/middleware'

const testFlow: FlowDefinition = {
  flowId: 'test',
  steps: [
    { name: 'greet', handler: async () => 'Hello!' },
  ],
}

describe('createConversationFlowMiddleware', () => {
  let engine: FlowEngine

  beforeEach(() => {
    engine = FlowEngine.create(new MemoryStorageAdapter(), [testFlow])
  })

  it('sets res.locals.flowResult and calls next()', async () => {
    const middleware = createConversationFlowMiddleware(engine)
    const req = { body: { flowId: 'test', sessionId: 'u1', input: '' } }
    const res = { locals: {} } as { locals: Record<string, unknown> }
    const next = jest.fn()

    await middleware(req as never, res as never, next)

    expect(res.locals.flowResult).toBeDefined()
    expect((res.locals.flowResult as { response: string }).response).toBe('Hello!')
    expect(next).toHaveBeenCalledWith()
  })

  it('calls next(error) on engine error', async () => {
    const middleware = createConversationFlowMiddleware(engine)
    const req = { body: { flowId: 'nonexistent', sessionId: 'u1', input: '' } }
    const res = { locals: {} }
    const next = jest.fn()

    await middleware(req as never, res as never, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(res.locals).not.toHaveProperty('flowResult')
  })
})
