import type { ProcessInput, ProcessResult, FlowSession } from '@conversation-flow/core'
import { FlowEngine } from '@conversation-flow/core'

/**
 * Injectable service that processes incoming user messages through conversation flows.
 * Delegates to FlowEngine and invokes the onHandoff callback when handoff is triggered.
 *
 * @example
 * ```typescript
 * @Controller()
 * export class ChatController {
 *   constructor(private readonly flowRunner: FlowRunner) {}
 *
 *   @Post('/message')
 *   async handle(@Body() dto: MessageDto) {
 *     return this.flowRunner.process({
 *       flowId: 'lead-qualification',
 *       sessionId: dto.userId,
 *       input: dto.message,
 *     })
 *   }
 * }
 * ```
 */
export class FlowRunner {
  constructor(
    private readonly engine: FlowEngine,
    private readonly onHandoff?: (session: FlowSession) => void,
  ) {}

  /**
   * Process a single user message through the identified flow.
   * After engine processing, invokes the onHandoff callback if handoff was triggered.
   */
  async process(input: ProcessInput): Promise<ProcessResult> {
    const result = await this.engine.process(input)

    if (result.handoff && this.onHandoff) {
      this.onHandoff(result.session)
    }

    return result
  }
}
