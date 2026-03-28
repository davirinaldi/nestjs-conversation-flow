import 'reflect-metadata'

/**
 * Metadata key used to store the flow identifier on a class.
 * @internal
 */
export const CONVERSATION_FLOW_METADATA = 'conversation-flow:flowId'

/**
 * Class decorator that registers a class as a conversation flow.
 * The flowId is used to route incoming messages to the correct flow.
 *
 * @param flowId - Unique identifier for this flow (e.g., 'lead-qualification')
 *
 * @example
 * ```typescript
 * @ConversationFlow('lead-qualification')
 * export class LeadFlow { ... }
 * ```
 */
export function ConversationFlow(flowId: string): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(CONVERSATION_FLOW_METADATA, flowId, target)
  }
}
