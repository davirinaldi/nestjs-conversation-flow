import type { FlowSession } from './index.js'

/**
 * A conditional route that determines the next step based on session state.
 * Conditions are evaluated in order — first `when` that returns true wins.
 */
export interface ConditionalRoute {
  /** Condition function evaluated after the step handler runs. */
  when: (session: FlowSession) => Promise<boolean>

  /** Name of the target step if the condition is true. */
  then: string
}

/**
 * Defines a single step within a conversation flow.
 * Built by the adapter layer (e.g., NestJS decorator reader) and consumed by the core engine.
 */
export interface StepDefinition {
  /** Unique step name within the flow (matches @Step argument) */
  name: string

  /** Name of the step that must complete before this one. Undefined for the entry step. */
  after?: string

  /** Conditional routes evaluated after this step. First matching condition determines next step. */
  conditions?: ConditionalRoute[]

  /** The handler function to execute for this step. Receives the session, returns response text. */
  handler: (session: FlowSession) => Promise<string>
}

/**
 * Context passed to the onStepComplete hook after a step handler executes.
 */
export interface StepCompleteContext {
  /** Flow identifier */
  flowId: string

  /** Name of the step that just executed */
  stepName: string

  /** The user's input that triggered this step */
  input: string

  /** The response returned by the step handler */
  response: string

  /** The current session — mutations to session.data will persist and influence routing */
  session: FlowSession
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

  /** Optional hook called after each step completes. Runs before next step resolution. */
  onStepComplete?: (context: StepCompleteContext) => Promise<void>
}
