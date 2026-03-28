import type { Request, Response, NextFunction } from 'express'
import { FlowEngine } from '@conversation-flow/core'

/**
 * Creates Express middleware that processes a conversation flow message.
 *
 * Reads `{ flowId, sessionId, input }` from `req.body`, runs the engine,
 * and stores the result in `res.locals.flowResult`. Calls `next()` on success
 * or `next(error)` on failure.
 *
 * @example
 * ```typescript
 * app.post('/message',
 *   createConversationFlowMiddleware(engine),
 *   (req, res) => {
 *     res.json(res.locals.flowResult)
 *   }
 * )
 * ```
 */
export function createConversationFlowMiddleware(engine: FlowEngine) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flowId, sessionId, input } = req.body as {
        flowId: string
        sessionId: string
        input: string
      }

      const result = await engine.process({ flowId, sessionId, input })
      res.locals.flowResult = result
      next()
    } catch (error) {
      next(error)
    }
  }
}
