import 'reflect-metadata'
import { FlowDiscoveryService } from '../../src/discovery/flow-discovery.service'
import { ConversationFlow } from '../../src/decorators/conversation-flow.decorator'
import { Step } from '../../src/decorators/step.decorator'
import { After } from '../../src/decorators/after.decorator'
import { HandoffTrigger } from '../../src/decorators/handoff-trigger.decorator'
import { Session } from '../../src/decorators/session.decorator'
import type { FlowSession } from '@conversation-flow/core'

@ConversationFlow('test-flow')
class TestFlow {
  @Step('greet')
  async greet(@Session() _session: FlowSession) {
    return 'Hello!'
  }

  @Step('ask-name')
  @After('greet')
  async askName(@Session() session: FlowSession) {
    session.data.name = session.history.at(-1)?.input
    return `Hi ${session.data.name}`
  }

  @HandoffTrigger()
  async shouldHandoff(@Session() session: FlowSession): Promise<boolean> {
    return (session.data.score as number) > 0.5
  }
}

class NotDecoratedClass {
  async doSomething() {
    return 'nope'
  }
}

describe('FlowDiscoveryService', () => {
  it('builds correct FlowDefinition from a decorated class', () => {
    const def = FlowDiscoveryService.buildFlowDefinition(TestFlow)

    expect(def.flowId).toBe('test-flow')
    expect(def.steps).toHaveLength(2)
    expect(def.handoffHandler).toBeDefined()
  })

  it('reads step names and after ordering', () => {
    const def = FlowDiscoveryService.buildFlowDefinition(TestFlow)

    const greetStep = def.steps.find((s) => s.name === 'greet')
    const askNameStep = def.steps.find((s) => s.name === 'ask-name')

    expect(greetStep).toBeDefined()
    expect(greetStep!.after).toBeUndefined()

    expect(askNameStep).toBeDefined()
    expect(askNameStep!.after).toBe('greet')
  })

  it('handler correctly injects session via @Session parameter', async () => {
    const def = FlowDiscoveryService.buildFlowDefinition(TestFlow)

    const greetStep = def.steps.find((s) => s.name === 'greet')!
    const session: FlowSession = {
      id: 'test',
      flowId: 'test-flow',
      currentStep: 'greet',
      data: {},
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const response = await greetStep.handler(session)
    expect(response).toBe('Hello!')
  })

  it('handoff handler correctly receives session', async () => {
    const def = FlowDiscoveryService.buildFlowDefinition(TestFlow)

    const session: FlowSession = {
      id: 'test',
      flowId: 'test-flow',
      currentStep: 'greet',
      data: { score: 0.9 },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await def.handoffHandler!(session)
    expect(result).toBe(true)
  })

  it('throws if class has no @ConversationFlow decorator', () => {
    expect(() => FlowDiscoveryService.buildFlowDefinition(NotDecoratedClass)).toThrow(
      'not decorated with @ConversationFlow',
    )
  })
})
