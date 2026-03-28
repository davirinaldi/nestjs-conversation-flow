import type { ProcessInput, ProcessResult } from '@conversation-flow/core'

/**
 * Injectable service that processes incoming user messages through conversation flows.
 * This is the main entry point for controllers to interact with the conversation engine.
 *
 * Inject this service in your controller and call `.process()` with the user's message.
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
  /**
   * Process a single user message through the identified flow.
   *
   * 1. Load or create the session from storage
   * 2. Resolve the current step using StepRouter
   * 3. Execute the step handler
   * 4. Check HandoffTrigger
   * 5. Persist updated session
   * 6. Return ProcessResult
   *
   * TODO: Implement the execution pipeline.
   */
  async process(_input: ProcessInput): Promise<ProcessResult> {
    throw new Error('FlowRunner.process() is not yet implemented')
  }
}
