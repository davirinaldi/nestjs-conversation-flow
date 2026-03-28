import type { FlowDefinition, FlowSession, StepDefinition } from '../types/index.js'
import { InvalidFlowError } from '../errors/index.js'

/**
 * Resolves step ordering within a flow based on StepDefinition.after declarations
 * and conditional routes.
 */
export class StepRouter {
  /**
   * Find the entry step of a flow (the step with no `after`).
   * Throws if there are zero or multiple entry steps.
   */
  getFirstStep(flow: FlowDefinition): StepDefinition {
    const entrySteps = flow.steps.filter((s) => s.after === undefined)

    if (entrySteps.length === 0) {
      throw new InvalidFlowError(flow.flowId, 'no entry step found (every step has an @After)')
    }

    if (entrySteps.length > 1) {
      const names = entrySteps.map((s) => s.name).join(', ')
      throw new InvalidFlowError(
        flow.flowId,
        `multiple entry steps found: ${names}. Exactly one step must have no @After`,
      )
    }

    return entrySteps[0]
  }

  /**
   * Find the step that comes after the given step via linear @After chain.
   * Returns null if the flow is complete (no step follows).
   * Throws if multiple steps declare the same predecessor.
   */
  getNextStep(flow: FlowDefinition, currentStepName: string): StepDefinition | null {
    const nextSteps = flow.steps.filter((s) => s.after === currentStepName)

    if (nextSteps.length === 0) return null

    if (nextSteps.length > 1) {
      const names = nextSteps.map((s) => s.name).join(', ')
      throw new InvalidFlowError(
        flow.flowId,
        `multiple steps declared @After("${currentStepName}"): ${names}`,
      )
    }

    return nextSteps[0]
  }

  /**
   * Resolve the next step after executing the current step.
   * If the current step has conditions, evaluates them in order (first true wins).
   * Otherwise falls back to linear @After resolution.
   * Returns null if the flow is complete.
   */
  async resolveNextStep(
    flow: FlowDefinition,
    currentStepName: string,
    session: FlowSession,
  ): Promise<StepDefinition | null> {
    const currentStep = flow.steps.find((s) => s.name === currentStepName)
    if (!currentStep) return null

    if (currentStep.conditions && currentStep.conditions.length > 0) {
      for (const route of currentStep.conditions) {
        if (await route.when(session)) {
          const target = flow.steps.find((s) => s.name === route.then)
          return target ?? null
        }
      }
      return null // no condition matched → flow completes
    }

    return this.getNextStep(flow, currentStepName)
  }

  /**
   * Validate a flow definition for structural integrity.
   * Checks: single entry point, no dangling references, no duplicate names, reachability.
   */
  validate(flow: FlowDefinition): void {
    if (flow.steps.length === 0) {
      throw new InvalidFlowError(flow.flowId, 'flow has no steps')
    }

    // Check for duplicate step names
    const names = new Set<string>()
    for (const step of flow.steps) {
      if (names.has(step.name)) {
        throw new InvalidFlowError(flow.flowId, `duplicate step name "${step.name}"`)
      }
      names.add(step.name)
    }

    // Check for dangling after references
    for (const step of flow.steps) {
      if (step.after !== undefined && !names.has(step.after)) {
        throw new InvalidFlowError(
          flow.flowId,
          `step "${step.name}" references non-existent step "${step.after}" in @After`,
        )
      }
    }

    // Check for dangling condition references
    for (const step of flow.steps) {
      if (step.conditions) {
        for (const route of step.conditions) {
          if (!names.has(route.then)) {
            throw new InvalidFlowError(
              flow.flowId,
              `step "${step.name}" has condition referencing non-existent step "${route.then}"`,
            )
          }
        }
      }
    }

    // Validates single entry point (throws if 0 or >1)
    this.getFirstStep(flow)

    // Check reachability by traversing all branches (BFS)
    const visited = new Set<string>()
    const queue: string[] = [this.getFirstStep(flow).name]

    while (queue.length > 0) {
      const stepName = queue.shift()!
      if (visited.has(stepName)) continue
      visited.add(stepName)

      const step = flow.steps.find((s) => s.name === stepName)!

      // Add linear successors
      const linearNext = flow.steps.filter((s) => s.after === stepName)
      for (const next of linearNext) {
        if (!visited.has(next.name)) {
          queue.push(next.name)
        }
      }

      // Add conditional successors
      if (step.conditions) {
        for (const route of step.conditions) {
          if (!visited.has(route.then)) {
            queue.push(route.then)
          }
        }
      }
    }

    // Check all steps are reachable
    if (visited.size !== flow.steps.length) {
      const unreachable = flow.steps.filter((s) => !visited.has(s.name)).map((s) => s.name)
      throw new InvalidFlowError(flow.flowId, `unreachable steps: ${unreachable.join(', ')}`)
    }
  }
}
