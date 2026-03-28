import type { FlowSession } from './index.js'

/**
 * Defines a single step within a conversation flow.
 * Built by the adapter layer (e.g., NestJS decorator reader) and consumed by the core engine.
 */
export interface StepDefinition {
  /** Unique step name within the flow (matches @Step argument) */
  name: string

  /** Name of the step that must complete before this one. Undefined for the entry step. */
  after?: string

  /** The handler function to execute for this step. Receives the session, returns response text. */
  handler: (session: FlowSession) => Promise<string>
}

/**
 * Complete definition of a conversation flow.
 * The core engine operates exclusively on this interface — it has no knowledge of decorators.
 */
export interface FlowDefinition {
  /** Unique flow identifier (matches @ConversationFlow argument) */
  flowId: string

  /** Collection of steps that make up this flow */
  steps: StepDefinition[]

  /** Optional handoff evaluation function. Returns true to trigger handoff. */
  handoffHandler?: (session: FlowSession) => Promise<boolean>
}
