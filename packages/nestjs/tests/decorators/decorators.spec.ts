import 'reflect-metadata'
import { ConversationFlow, CONVERSATION_FLOW_METADATA } from '../../src/decorators/conversation-flow.decorator'
import { Step, STEP_METADATA } from '../../src/decorators/step.decorator'
import { After, AFTER_METADATA } from '../../src/decorators/after.decorator'
import { HandoffTrigger, HANDOFF_TRIGGER_METADATA } from '../../src/decorators/handoff-trigger.decorator'
import { Session, SESSION_METADATA } from '../../src/decorators/session.decorator'
import type { FlowSession } from '@conversation-flow/core'

describe('@ConversationFlow', () => {
  it('stores flowId on the class', () => {
    @ConversationFlow('my-flow')
    class TestFlow {}

    const flowId = Reflect.getMetadata(CONVERSATION_FLOW_METADATA, TestFlow)
    expect(flowId).toBe('my-flow')
  })

  it('stores different flowIds on different classes', () => {
    @ConversationFlow('flow-a')
    class FlowA {}

    @ConversationFlow('flow-b')
    class FlowB {}

    expect(Reflect.getMetadata(CONVERSATION_FLOW_METADATA, FlowA)).toBe('flow-a')
    expect(Reflect.getMetadata(CONVERSATION_FLOW_METADATA, FlowB)).toBe('flow-b')
  })
})

describe('@Step', () => {
  it('stores stepName on the method', () => {
    class TestFlow {
      @Step('collect-name')
      async collectName() {
        return ''
      }
    }

    const stepName = Reflect.getMetadata(STEP_METADATA, TestFlow.prototype, 'collectName')
    expect(stepName).toBe('collect-name')
  })

  it('stores different stepNames on different methods', () => {
    class TestFlow {
      @Step('step-a')
      async a() { return '' }

      @Step('step-b')
      async b() { return '' }
    }

    expect(Reflect.getMetadata(STEP_METADATA, TestFlow.prototype, 'a')).toBe('step-a')
    expect(Reflect.getMetadata(STEP_METADATA, TestFlow.prototype, 'b')).toBe('step-b')
  })
})

describe('@After', () => {
  it('stores the preceding step name on the method', () => {
    class TestFlow {
      @After('collect-name')
      async collectEmail() {
        return ''
      }
    }

    const afterStep = Reflect.getMetadata(AFTER_METADATA, TestFlow.prototype, 'collectEmail')
    expect(afterStep).toBe('collect-name')
  })
})

describe('@HandoffTrigger', () => {
  it('stores true on the method', () => {
    class TestFlow {
      @HandoffTrigger()
      async shouldHandoff() {
        return true
      }
    }

    const isHandoff = Reflect.getMetadata(
      HANDOFF_TRIGGER_METADATA,
      TestFlow.prototype,
      'shouldHandoff',
    )
    expect(isHandoff).toBe(true)
  })
})

describe('@Session', () => {
  it('stores the parameter index on the method', () => {
    class TestFlow {
      async greet(@Session() _session: FlowSession) {
        return ''
      }
    }

    const paramIndex = Reflect.getMetadata(SESSION_METADATA, TestFlow.prototype, 'greet')
    expect(paramIndex).toBe(0)
  })

  it('stores the correct index for non-first parameter', () => {
    class TestFlow {
      async greet(_other: string, @Session() _session: FlowSession) {
        return ''
      }
    }

    const paramIndex = Reflect.getMetadata(SESSION_METADATA, TestFlow.prototype, 'greet')
    expect(paramIndex).toBe(1)
  })
})
