import { FlowEngine, MemoryStorageAdapter } from '@conversation-flow/core'
import type { FlowDefinition, FlowSession } from '@conversation-flow/core'
import { createConversationFlowRouter } from '../src/router'

const testFlow: FlowDefinition = {
  flowId: 'test',
  steps: [
    { name: 'greet', handler: async () => 'Hello!' },
    { name: 'bye', after: 'greet', handler: async () => 'Goodbye!' },
  ],
}

function mockReqRes(params: Record<string, string> = {}, body: Record<string, unknown> = {}) {
  const req = { params, body } as unknown as import('express').Request
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  } as unknown as import('express').Response
  return { req, res }
}

describe('createConversationFlowRouter', () => {
  let engine: FlowEngine

  beforeEach(() => {
    engine = FlowEngine.create(new MemoryStorageAdapter(), [testFlow])
  })

  it('POST returns ProcessResult JSON', async () => {
    const router = createConversationFlowRouter({ engine })
    // Extract the route handler directly
    const handler = (router as { stack: { route: { path: string; methods: { post: boolean } }; handle: Function }[] }).stack
      .find((layer) => layer.route?.path === '/:flowId/message')

    const { req, res } = mockReqRes(
      { flowId: 'test' },
      { sessionId: 'u1', input: '' },
    )

    await handler!.route!.methods.post
    // Actually, let's use the handler directly from the router stack
    const routeHandler = handler!.handle as unknown as { stack: { handle: Function }[] }
    // Router internals are complex. Let's test via a simpler approach.

    // Direct approach: call the route handler function
    const routeLayer = (router as unknown as { stack: { route?: { stack: { handle: Function }[] }; handle: Function }[] }).stack[0]
    const postHandler = routeLayer.route!.stack[0].handle as (req: unknown, res: unknown, next: unknown) => Promise<void>

    await postHandler(req, res, jest.fn())

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        response: 'Hello!',
        handoff: false,
      }),
    )
  })

  it('calls onHandoff when handoff is true', async () => {
    const flowWithHandoff: FlowDefinition = {
      ...testFlow,
      handoffHandler: async () => true,
    }
    const engine = FlowEngine.create(new MemoryStorageAdapter(), [flowWithHandoff])
    const onHandoff = jest.fn()
    const router = createConversationFlowRouter({ engine, onHandoff })

    const routeLayer = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack[0]
    const postHandler = routeLayer.route!.stack[0].handle as (req: unknown, res: unknown, next: unknown) => Promise<void>

    const { req, res } = mockReqRes({ flowId: 'test' }, { sessionId: 'u1', input: '' })
    await postHandler(req, res, jest.fn())

    expect(onHandoff).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }))
  })

  it('returns 400 on ConversationFlowError', async () => {
    const router = createConversationFlowRouter({ engine })
    const routeLayer = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack[0]
    const postHandler = routeLayer.route!.stack[0].handle as (req: unknown, res: unknown, next: unknown) => Promise<void>

    const { req, res } = mockReqRes({ flowId: 'nonexistent' }, { sessionId: 'u1', input: '' })
    await postHandler(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('not registered') }),
    )
  })
})
