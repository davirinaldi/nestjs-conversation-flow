import type { FlowDefinition, StorageAdapter, ProcessInput, ProcessResult } from '../types/index.js'
import { StepRouter } from './step-router.js'
import { FlowNotFoundError, FlowCompletedError, StepNotFoundError } from '../errors/index.js'

/** Sentinel value for currentStep when a flow has completed. */
export const FLOW_COMPLETED = '__completed__'

/**
 * Core execution engine for conversation flows.
 * Framework-agnostic — operates on FlowDefinition objects, not decorators.
 */
export class FlowEngine {
  private constructor(
    private readonly storage: StorageAdapter,
    private readonly flows: Map<string, FlowDefinition>,
    private readonly stepRouter: StepRouter,
  ) {}

  /**
   * Create a FlowEngine instance. Validates all flow definitions on creation.
   */
  static create(storage: StorageAdapter, flows: FlowDefinition[]): FlowEngine {
    const router = new StepRouter()
    const flowMap = new Map<string, FlowDefinition>()

    for (const flow of flows) {
      router.validate(flow)
      flowMap.set(flow.flowId, flow)
    }

    return new FlowEngine(storage, flowMap, router)
  }

  /**
   * Process a single user message through a conversation flow.
   */
  async process(input: ProcessInput): Promise<ProcessResult> {
    const flow = this.flows.get(input.flowId)
    if (!flow) {
      throw new FlowNotFoundError(input.flowId)
    }

    let session = await this.storage.get(input.sessionId)

    if (!session) {
      const firstStep = this.stepRouter.getFirstStep(flow)
      session = {
        id: input.sessionId,
        flowId: input.flowId,
        currentStep: firstStep.name,
        data: {},
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    if (session.currentStep === FLOW_COMPLETED) {
      throw new FlowCompletedError(input.flowId, input.sessionId)
    }

    const stepDef = flow.steps.find((s) => s.name === session.currentStep)
    if (!stepDef) {
      throw new StepNotFoundError(session.currentStep, input.flowId)
    }

    // Push history entry with input BEFORE handler runs,
    // so handlers can read session.history.at(-1)?.input to access the user's message.
    const historyEntry = {
      stepName: session.currentStep,
      input: input.input,
      response: '',
      timestamp: new Date(),
    }
    session.history.push(historyEntry)

    const response = await stepDef.handler(session)
    historyEntry.response = response

    if (flow.onStepComplete) {
      await flow.onStepComplete({
        flowId: flow.flowId,
        stepName: session.currentStep,
        input: input.input,
        response,
        session,
      })
    }

    const nextStep = await this.stepRouter.resolveNextStep(flow, session.currentStep, session)
    session.currentStep = nextStep ? nextStep.name : FLOW_COMPLETED

    let handoff = false
    if (flow.handoffHandler) {
      handoff = await flow.handoffHandler(session)
    }

    session.updatedAt = new Date()
    await this.storage.set(session)

    return { response, session, handoff }
  }
}
