import 'reflect-metadata'
import type { FlowSession } from '@conversation-flow/core'

/**
 * Metadata key used to store conditional routes on a method.
 * @internal
 */
export const CONDITION_METADATA = 'conversation-flow:condition'

/**
 * A conditional route definition for the decorator.
 */
export interface ConditionRoute {
  /** Condition function evaluated after the step handler runs. */
  when: (session: FlowSession) => Promise<boolean>

  /** Name of the target step if the condition is true. */
  then: string
}

/**
 * Method decorator that defines conditional branching after a step executes.
 * Conditions are evaluated in order — the first `when` that returns true determines
 * the next step. If no condition matches, the flow completes.
 *
 * @param routes - Array of conditional routes with `when` and `then` properties
 *
 * @example
 * ```typescript
 * @Step('qualify')
 * @After('collect-info')
 * @Condition([
 *   { when: async (session) => (session.data.score as number) > 0.8, then: 'handoff' },
 *   { when: async (session) => (session.data.score as number) > 0.5, then: 'nurture' },
 * ])
 * async qualify(@Session() session: FlowSession) {
 *   session.data.score = 0.9
 *   return 'Scoring complete.'
 * }
 * ```
 */
export function Condition(routes: ConditionRoute[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CONDITION_METADATA, routes, target, propertyKey)
  }
}
