import 'reflect-metadata'

/**
 * Metadata key used to store the step name on a method.
 * @internal
 */
export const STEP_METADATA = 'conversation-flow:step'

/**
 * Method decorator that marks a method as a conversation step.
 * Steps are the atomic units of a conversation flow. Each step receives
 * the current session and returns a string response to the user.
 *
 * @param stepName - Unique name for this step within the flow (e.g., 'collect-name')
 *
 * @example
 * ```typescript
 * @Step('collect-name')
 * async collectName(@Session() session: FlowSession) {
 *   return 'What is your name?'
 * }
 * ```
 */
export function Step(stepName: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(STEP_METADATA, stepName, target, propertyKey)
  }
}
