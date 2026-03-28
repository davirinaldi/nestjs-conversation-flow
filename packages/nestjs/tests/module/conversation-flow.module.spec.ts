import 'reflect-metadata'
import { ConversationFlowModule } from '../../src/module/conversation-flow.module'
import { FlowRunner } from '../../src/runner/flow-runner.service'
import { FlowEngine, MemoryStorageAdapter } from '@conversation-flow/core'
import type { StorageAdapter, FlowSession } from '@conversation-flow/core'
import { ConversationFlow } from '../../src/decorators/conversation-flow.decorator'
import { Step } from '../../src/decorators/step.decorator'
import { After } from '../../src/decorators/after.decorator'
import { Session } from '../../src/decorators/session.decorator'

@ConversationFlow('simple-flow')
class SimpleFlow {
  @Step('greet')
  async greet(@Session() _session: FlowSession) {
    return 'Hello!'
  }

  @Step('done')
  @After('greet')
  async done(@Session() _session: FlowSession) {
    return 'Bye!'
  }
}

describe('ConversationFlowModule', () => {
  it('forRoot returns a DynamicModule with FlowRunner provider', () => {
    const module = ConversationFlowModule.forRoot({
      flows: [SimpleFlow],
      storage: 'memory',
    })

    expect(module.module).toBe(ConversationFlowModule)
    expect(module.providers).toBeDefined()

    const runnerProvider = (module.providers as { provide: unknown; useValue: unknown }[]).find(
      (p) => p.provide === FlowRunner,
    )
    expect(runnerProvider).toBeDefined()
    expect(runnerProvider!.useValue).toBeInstanceOf(FlowRunner)
  })

  it('FlowRunner is functional end-to-end', async () => {
    const module = ConversationFlowModule.forRoot({
      flows: [SimpleFlow],
      storage: 'memory',
      sessionTtl: 60,
    })

    const runnerProvider = (module.providers as { provide: unknown; useValue: unknown }[]).find(
      (p) => p.provide === FlowRunner,
    )
    const runner = runnerProvider!.useValue as FlowRunner

    const r1 = await runner.process({
      flowId: 'simple-flow',
      sessionId: 'user-1',
      input: '',
    })
    expect(r1.response).toBe('Hello!')

    const r2 = await runner.process({
      flowId: 'simple-flow',
      sessionId: 'user-1',
      input: 'hi',
    })
    expect(r2.response).toBe('Bye!')
  })

  it('accepts custom StorageAdapter instance', () => {
    const customStorage: StorageAdapter = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
    }

    const module = ConversationFlowModule.forRoot({
      flows: [SimpleFlow],
      storage: customStorage,
    })

    expect(module.providers).toBeDefined()
    const engineProvider = (module.providers as { provide: unknown; useValue: unknown }[]).find(
      (p) => p.provide === FlowEngine,
    )
    expect(engineProvider).toBeDefined()
  })
})
