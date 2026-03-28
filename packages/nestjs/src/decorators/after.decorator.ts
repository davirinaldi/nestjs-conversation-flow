import 'reflect-metadata'

/**
 * Metadata key used to store the preceding step name on a method.
 * @internal
 */
export const AFTER_METADATA = 'conversation-flow:after'

/**
 * Method decorator that declares step ordering.
 * Specifies which step must complete before this step can execute.
 * The StepRouter uses this metadata to build the step execution graph.
 *
 * @param stepName - The name of the preceding step
 *
 * @example
 * ```typescript
 * @Step('collect-cnpj')
 * @After('collect-name')
 * async collectCnpj(@Session() session: FlowSession) { ... }
 * ```
 */
export function After(stepName: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(AFTER_METADATA, stepName, target, propertyKey)
  }
}
