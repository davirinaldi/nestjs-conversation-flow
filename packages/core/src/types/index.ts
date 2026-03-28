/**
 * Record of a single step execution within a conversation flow.
 * Captures both the user's input and the bot's response for audit and replay.
 */
export interface StepHistory {
  /** Name of the step that was executed (matches @Step decorator argument) */
  stepName: string

  /** Raw input from the user that triggered this step */
  input: string

  /** Response returned by the step handler method */
  response: string

  /** ISO timestamp when this step was executed */
  timestamp: Date
}

/**
 * The persistent state object for a single conversation session.
 * Created when a user first interacts with a flow and updated after every step.
 *
 * @example
 * ```typescript
 * // Accessing session data inside a step handler
 * async collectName(@Session() session: FlowSession) {
 *   const previousInput = session.history.at(-1)?.input
 *   session.data.name = previousInput
 * }
 * ```
 */
export interface FlowSession {
  /** Unique session identifier (e.g., userId, chatId, or any external correlation ID) */
  id: string

  /** Identifier of the flow this session is running (matches @ConversationFlow argument) */
  flowId: string

  /** Name of the step that will execute on the next interaction */
  currentStep: string

  /** Accumulated data collected throughout the conversation. Step handlers read and write here. */
  data: Record<string, unknown>

  /** Ordered log of all steps that have been executed in this session */
  history: StepHistory[]

  /** When this session was first created */
  createdAt: Date

  /** When this session was last updated (after the most recent step execution) */
  updatedAt: Date
}

/**
 * Abstraction for session persistence.
 * Implement this interface to store sessions in any backend (Redis, DynamoDB, PostgreSQL, etc.).
 *
 * The library ships with `MemoryStorageAdapter` for development and testing.
 *
 * @example
 * ```typescript
 * class MyRedisAdapter implements StorageAdapter {
 *   async get(sessionId: string) { ... }
 *   async set(session: FlowSession) { ... }
 *   async delete(sessionId: string) { ... }
 * }
 * ```
 */
export interface StorageAdapter {
  /** Retrieve a session by ID. Returns null if the session does not exist or has expired. */
  get(sessionId: string): Promise<FlowSession | null>

  /** Persist a session. If a session with the same ID exists, it is overwritten. */
  set(session: FlowSession): Promise<void>

  /** Remove a session by ID. No-op if the session does not exist. */
  delete(sessionId: string): Promise<void>
}

/**
 * Input payload for processing a single user message through a conversation flow.
 * Passed to `FlowEngine.process()` or `FlowRunner.process()`.
 */
export interface ProcessInput {
  /** Identifier of the flow to execute (matches @ConversationFlow argument) */
  flowId: string

  /** Session identifier — typically the userId or chatId */
  sessionId: string

  /** The raw text input from the user */
  input: string
}

/**
 * Result returned after processing a single user message.
 * Contains the bot's response, the updated session state, and a handoff flag.
 */
export interface ProcessResult {
  /** The text response to send back to the user */
  response: string

  /** The updated session state after executing the current step */
  session: FlowSession

  /** Whether a handoff to a human agent was triggered by this step */
  handoff: boolean
}

export type { StepDefinition, FlowDefinition } from './flow-definition.js'
