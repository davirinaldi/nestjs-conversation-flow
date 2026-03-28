import 'reflect-metadata'
import type {
  ConditionalRoute,
  FlowDefinition,
  StepDefinition,
  FlowSession,
} from '@conversation-flow/core'
import {
  CONVERSATION_FLOW_METADATA,
  STEP_METADATA,
  AFTER_METADATA,
  CONDITION_METADATA,
  HANDOFF_TRIGGER_METADATA,
  SESSION_METADATA,
} from '../decorators/index.js'

/**
 * Reads decorator metadata from flow classes and builds FlowDefinition objects
 * that the core FlowEngine can consume.
 */
export class FlowDiscoveryService {
  /**
   * Build a FlowDefinition from a decorated class.
   * Reads all @ConversationFlow, @Step, @After, @HandoffTrigger, and @Session metadata.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  static buildFlowDefinition(flowClass: Function): FlowDefinition {
    const flowId = Reflect.getMetadata(CONVERSATION_FLOW_METADATA, flowClass) as string | undefined
    if (!flowId) {
      throw new Error(`Class ${flowClass.name} is not decorated with @ConversationFlow`)
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    const instance = new (flowClass as { new (): object })()
    const prototype = flowClass.prototype as Record<string, unknown>

    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== 'constructor',
    )

    const steps: StepDefinition[] = []
    let handoffHandler: ((session: FlowSession) => Promise<boolean>) | undefined

    for (const methodName of methodNames) {
      const stepName = Reflect.getMetadata(STEP_METADATA, prototype, methodName) as
        | string
        | undefined
      if (stepName) {
        const afterStep = Reflect.getMetadata(AFTER_METADATA, prototype, methodName) as
          | string
          | undefined
        const sessionParamIndex = Reflect.getMetadata(SESSION_METADATA, prototype, methodName) as
          | number
          | undefined

        const handler = async (session: FlowSession): Promise<string> => {
          const args: unknown[] = []
          if (sessionParamIndex !== undefined) {
            args[sessionParamIndex] = session
          }
          return (instance as Record<string, (...args: unknown[]) => Promise<string>>)[methodName](
            ...args,
          )
        }

        const conditions = Reflect.getMetadata(CONDITION_METADATA, prototype, methodName) as
          | ConditionalRoute[]
          | undefined

        steps.push({ name: stepName, after: afterStep, conditions, handler })
      }

      const isHandoff = Reflect.getMetadata(HANDOFF_TRIGGER_METADATA, prototype, methodName) as
        | boolean
        | undefined
      if (isHandoff) {
        const sessionParamIndex = Reflect.getMetadata(SESSION_METADATA, prototype, methodName) as
          | number
          | undefined

        handoffHandler = async (session: FlowSession): Promise<boolean> => {
          const args: unknown[] = []
          if (sessionParamIndex !== undefined) {
            args[sessionParamIndex] = session
          }
          return (instance as Record<string, (...args: unknown[]) => Promise<boolean>>)[methodName](
            ...args,
          )
        }
      }
    }

    return { flowId, steps, handoffHandler }
  }
}
