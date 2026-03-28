import 'reflect-metadata'

/**
 * Metadata key used to mark a method as the handoff decision point.
 * @internal
 */
export const HANDOFF_TRIGGER_METADATA = 'conversation-flow:handoff-trigger'

/**
 * Method decorator that marks a method as the handoff decision point.
 * The decorated method must return a Promise<boolean>. When it returns true,
 * the FlowRunner emits a handoff event and sets `ProcessResult.handoff = true`.
 *
 * Only one method per flow class should have this decorator.
 *
 * @example
 * ```typescript
 * @HandoffTrigger()
 * async shouldHandoff(@Session() session: FlowSession): Promise<boolean> {
 *   return (session.data.score as number) > 0.8
 * }
 * ```
 */
export function HandoffTrigger(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(HANDOFF_TRIGGER_METADATA, true, target, propertyKey)
  }
}
