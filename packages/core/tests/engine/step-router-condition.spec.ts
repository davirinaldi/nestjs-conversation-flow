import { StepRouter } from '../../src/engine/step-router'
import { InvalidFlowError } from '../../src/errors'
import type { FlowDefinition, FlowSession, StepDefinition } from '../../src/types'

const noop = async () => ''

function step(name: string, after?: string): StepDefinition {
  return { name, after, handler: noop }
}

function session(data: Record<string, unknown> = {}): FlowSession {
  return {
    id: 'test',
    flowId: 'test',
    currentStep: '',
    data,
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('StepRouter — conditional routing', () => {
  let router: StepRouter

  beforeEach(() => {
    router = new StepRouter()
  })

  describe('resolveNextStep', () => {
    it('returns first matching condition target step', async () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [
          {
            name: 'qualify',
            handler: noop,
            conditions: [
              { when: async (s) => (s.data.score as number) > 0.8, then: 'handoff' },
              { when: async (s) => (s.data.score as number) > 0.5, then: 'nurture' },
            ],
          },
          { name: 'handoff', after: 'qualify', handler: noop },
          { name: 'nurture', after: 'qualify', handler: noop },
        ],
      }

      const result = await router.resolveNextStep(flow, 'qualify', session({ score: 0.9 }))
      expect(result?.name).toBe('handoff')
    })

    it('evaluates conditions in order — first true wins', async () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [
          {
            name: 'qualify',
            handler: noop,
            conditions: [
              { when: async (s) => (s.data.score as number) > 0.5, then: 'nurture' },
              { when: async (s) => (s.data.score as number) > 0.8, then: 'handoff' },
            ],
          },
          { name: 'handoff', after: 'qualify', handler: noop },
          { name: 'nurture', after: 'qualify', handler: noop },
        ],
      }

      // Score 0.9 matches both, but nurture comes first
      const result = await router.resolveNextStep(flow, 'qualify', session({ score: 0.9 }))
      expect(result?.name).toBe('nurture')
    })

    it('returns null when no condition matches', async () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [
          {
            name: 'qualify',
            handler: noop,
            conditions: [
              { when: async (s) => (s.data.score as number) > 0.8, then: 'handoff' },
            ],
          },
          { name: 'handoff', after: 'qualify', handler: noop },
        ],
      }

      const result = await router.resolveNextStep(flow, 'qualify', session({ score: 0.3 }))
      expect(result).toBeNull()
    })

    it('falls back to linear getNextStep for steps without conditions', async () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [step('a'), step('b', 'a'), step('c', 'b')],
      }

      const result = await router.resolveNextStep(flow, 'a', session())
      expect(result?.name).toBe('b')
    })

    it('returns null for last step without conditions (flow completes)', async () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [step('a'), step('b', 'a')],
      }

      const result = await router.resolveNextStep(flow, 'b', session())
      expect(result).toBeNull()
    })
  })

  describe('validate with conditions', () => {
    it('accepts a flow with conditional branches', () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [
          {
            name: 'start',
            handler: noop,
            conditions: [
              { when: async () => true, then: 'a' },
              { when: async () => true, then: 'b' },
            ],
          },
          { name: 'a', after: 'start', handler: noop },
          { name: 'b', after: 'start', handler: noop },
        ],
      }

      expect(() => router.validate(flow)).not.toThrow()
    })

    it('throws for condition referencing non-existent step', () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [
          {
            name: 'start',
            handler: noop,
            conditions: [{ when: async () => true, then: 'nonexistent' }],
          },
        ],
      }

      expect(() => router.validate(flow)).toThrow(InvalidFlowError)
      expect(() => router.validate(flow)).toThrow('non-existent step "nonexistent"')
    })

    it('detects unreachable steps in conditional flows', () => {
      const flow: FlowDefinition = {
        flowId: 'test',
        steps: [
          {
            name: 'start',
            handler: noop,
            conditions: [{ when: async () => true, then: 'a' }],
          },
          { name: 'a', after: 'start', handler: noop },
          { name: 'orphan', after: 'start', handler: noop },
          { name: 'island', handler: noop }, // no after, but start exists → multiple entry
        ],
      }

      expect(() => router.validate(flow)).toThrow(InvalidFlowError)
    })
  })
})
