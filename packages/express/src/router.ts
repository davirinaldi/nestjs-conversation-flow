import { Router } from 'express'
import type { FlowSession } from '@conversation-flow/core'
import { FlowEngine, ConversationFlowError } from '@conversation-flow/core'

/**
 * Options for creating a conversation flow Express router.
 */
export interface ConversationFlowRouterOptions {
  /** The FlowEngine instance to process messages through. */
  engine: FlowEngine

  /** Optional callback invoked when a handoff is triggered. */
  onHandoff?: (session: FlowSession) => void
}

/**
 * Creates an Express Router with a POST `/:flowId/message` endpoint.
 *
 * Request body must contain `{ sessionId: string, input: string }`.
 * Returns the ProcessResult as JSON.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { FlowEngine, MemoryStorageAdapter } from '@conversation-flow/core'
 * import { createConversationFlowRouter } from '@conversation-flow/express'
 *
 * const engine = FlowEngine.create(new MemoryStorageAdapter(), [myFlow])
 * const app = express()
 * app.use(express.json())
 * app.use('/chat', createConversationFlowRouter({ engine }))
 * // POST /chat/my-flow/message { sessionId: "u1", input: "hello" }
 * ```
 */
export function createConversationFlowRouter(options: ConversationFlowRouterOptions): Router {
  const router = Router()

  router.post('/:flowId/message', async (req, res) => {
    try {
      const { flowId } = req.params
      const { sessionId, input } = req.body as { sessionId: string; input: string }

      const result = await options.engine.process({ flowId, sessionId, input })

      if (result.handoff && options.onHandoff) {
        options.onHandoff(result.session)
      }

      res.json(result)
    } catch (error) {
      if (error instanceof ConversationFlowError) {
        res.status(400).json({ error: (error as Error).message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })

  return router
}
