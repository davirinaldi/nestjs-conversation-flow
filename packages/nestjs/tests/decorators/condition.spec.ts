import 'reflect-metadata'
import { Condition, CONDITION_METADATA } from '../../src/decorators/condition.decorator'
import type { FlowSession } from '@conversation-flow/core'

describe('@Condition', () => {
  it('stores conditional routes in metadata', () => {
    const routes = [
      { when: async (_s: FlowSession) => true, then: 'step-a' },
      { when: async (_s: FlowSession) => false, then: 'step-b' },
    ]

    class TestFlow {
      @Condition(routes)
      async qualify() {
        return ''
      }
    }

    const stored = Reflect.getMetadata(CONDITION_METADATA, TestFlow.prototype, 'qualify')
    expect(stored).toEqual(routes)
    expect(stored).toHaveLength(2)
    expect(stored[0].then).toBe('step-a')
    expect(stored[1].then).toBe('step-b')
  })

  it('routes have callable when functions', async () => {
    const routes = [
      { when: async (s: FlowSession) => (s.data.score as number) > 0.5, then: 'next' },
    ]

    class TestFlow {
      @Condition(routes)
      async qualify() {
        return ''
      }
    }

    const stored = Reflect.getMetadata(CONDITION_METADATA, TestFlow.prototype, 'qualify')
    const session = { data: { score: 0.9 } } as FlowSession
    expect(await stored[0].when(session)).toBe(true)
  })
})
