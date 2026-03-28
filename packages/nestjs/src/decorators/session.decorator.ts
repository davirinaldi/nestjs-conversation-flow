import 'reflect-metadata'

/**
 * Metadata key used to store the parameter index for session injection.
 * @internal
 */
export const SESSION_METADATA = 'conversation-flow:session-param'

/**
 * Parameter decorator that injects the current FlowSession into a step handler method.
 * The FlowRunner resolves this at runtime before invoking the step.
 *
 * @example
 * ```typescript
 * @Step('collect-name')
 * async collectName(@Session() session: FlowSession) {
 *   return 'What is your name?'
 * }
 * ```
 */
export function Session(): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(SESSION_METADATA, parameterIndex, target, propertyKey)
    }
  }
}
