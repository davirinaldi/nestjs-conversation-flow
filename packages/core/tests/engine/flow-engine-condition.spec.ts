import { FlowEngine, FLOW_COMPLETED } from '../../src/engine/flow-engine'
import { MemoryStorageAdapter } from '../../src/session/memory-storage-adapter'
import type { FlowDefinition, FlowSession } from '../../src/types'

function branchingFlow(): FlowDefinition {
  return {
    flowId: 'branching',
    steps: [
      {
        name: 'qualify',
        handler: async (session: FlowSession) => {
          session.data.score = session.history.at(-1)?.input === 'high' ? 0.9 : 0.3
          return `Score: ${session.data.score}`
        },
        conditions: [
          {
            when: async (s) => (s.data.score as number) > 0.8,
            then: 'handoff',
          },
          {
            when: async (s) => (s.data.score as number) > 0.5,
            then: 'nurture',
          },
        ],
      },
      {
        name: 'handoff',
        after: 'qualify',
        handler: async () => 'Connecting you to sales!',
      },
      {
        name: 'nurture',
        after: 'qualify',
        handler: async () => 'We will follow up by email.',
      },
    ],
  }
}

describe('FlowEngine — conditional branching', () => {
  let storage: MemoryStorageAdapter

  beforeEach(() => {
    storage = new MemoryStorageAdapter()
  })

  it('routes to correct branch when condition is true', async () => {
    const engine = FlowEngine.create(storage, [branchingFlow()])

    const r1 = await engine.process({ flowId: 'branching', sessionId: 'u1', input: 'high' })
    expect(r1.response).toBe('Score: 0.9')
    expect(r1.session.currentStep).toBe('handoff')

    const r2 = await engine.process({ flowId: 'branching', sessionId: 'u1', input: '' })
    expect(r2.response).toBe('Connecting you to sales!')
    expect(r2.session.currentStep).toBe(FLOW_COMPLETED)
  })

  it('completes flow when no condition matches', async () => {
    const engine = FlowEngine.create(storage, [branchingFlow()])

    const r1 = await engine.process({ flowId: 'branching', sessionId: 'u1', input: 'low' })
    expect(r1.response).toBe('Score: 0.3')
    expect(r1.session.currentStep).toBe(FLOW_COMPLETED)
  })

  it('different sessions take different paths', async () => {
    const engine = FlowEngine.create(storage, [branchingFlow()])

    // User 1 goes high → handoff
    await engine.process({ flowId: 'branching', sessionId: 'u1', input: 'high' })
    const r1 = await engine.process({ flowId: 'branching', sessionId: 'u1', input: '' })
    expect(r1.response).toBe('Connecting you to sales!')

    // User 2 goes low → flow completes (no branch matched)
    const r2 = await engine.process({ flowId: 'branching', sessionId: 'u2', input: 'low' })
    expect(r2.session.currentStep).toBe(FLOW_COMPLETED)
  })

  it('condition has access to session data set by the step handler', async () => {
    const engine = FlowEngine.create(storage, [branchingFlow()])

    // The qualify handler sets score based on input, then condition reads it
    const result = await engine.process({ flowId: 'branching', sessionId: 'u1', input: 'high' })
    expect(result.session.data.score).toBe(0.9)
    expect(result.session.currentStep).toBe('handoff')
  })

  it('mixed flow: linear steps followed by conditional branch', async () => {
    const flow: FlowDefinition = {
      flowId: 'mixed',
      steps: [
        {
          name: 'greet',
          handler: async () => 'Hello!',
        },
        {
          name: 'collect',
          after: 'greet',
          handler: async (session: FlowSession) => {
            session.data.answer = session.history.at(-1)?.input
            return 'Got it.'
          },
          conditions: [
            { when: async (s) => s.data.answer === 'yes', then: 'confirm' },
            { when: async (s) => s.data.answer === 'no', then: 'reject' },
          ],
        },
        { name: 'confirm', after: 'collect', handler: async () => 'Confirmed!' },
        { name: 'reject', after: 'collect', handler: async () => 'Cancelled.' },
      ],
    }

    const engine = FlowEngine.create(storage, [flow])

    // Linear: greet
    await engine.process({ flowId: 'mixed', sessionId: 'u1', input: '' })
    // Linear → conditional: collect with input "yes"
    const r2 = await engine.process({ flowId: 'mixed', sessionId: 'u1', input: 'yes' })
    expect(r2.response).toBe('Got it.')
    expect(r2.session.currentStep).toBe('confirm')

    // Branch: confirm
    const r3 = await engine.process({ flowId: 'mixed', sessionId: 'u1', input: '' })
    expect(r3.response).toBe('Confirmed!')
  })
})
