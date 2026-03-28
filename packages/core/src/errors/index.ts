/**
 * Base error class for all conversation flow errors.
 */
export class ConversationFlowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when a flow ID does not match any registered flow.
 */
export class FlowNotFoundError extends ConversationFlowError {
  constructor(flowId: string) {
    super(`Flow "${flowId}" is not registered`)
  }
}

/**
 * Thrown when a step cannot be found in a flow.
 */
export class StepNotFoundError extends ConversationFlowError {
  constructor(stepName: string, flowId: string) {
    super(`Step "${stepName}" not found in flow "${flowId}"`)
  }
}

/**
 * Thrown when a flow has already completed for a session and receives another message.
 */
export class FlowCompletedError extends ConversationFlowError {
  constructor(flowId: string, sessionId: string) {
    super(`Flow "${flowId}" has already completed for session "${sessionId}"`)
  }
}

/**
 * Thrown when a flow definition has structural problems
 * (e.g., multiple entry points, dangling references, duplicate step names).
 */
export class InvalidFlowError extends ConversationFlowError {
  constructor(flowId: string, reason: string) {
    super(`Flow "${flowId}" is invalid: ${reason}`)
  }
}
