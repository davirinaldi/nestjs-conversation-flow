import type { DynamicModule } from '@nestjs/common'
import type { StorageAdapter, FlowSession } from '@conversation-flow/core'
import { MemoryStorageAdapter, FlowEngine } from '@conversation-flow/core'
import { FlowRunner } from '../runner/flow-runner.service.js'
import { FlowDiscoveryService } from '../discovery/flow-discovery.service.js'

/**
 * Configuration options for ConversationFlowModule.forRoot().
 */
export interface ConversationFlowModuleOptions {
  /** Storage backend: 'memory' for built-in, or a custom StorageAdapter instance */
  storage: 'memory' | StorageAdapter

  /** Flow classes decorated with @ConversationFlow to register */
  // eslint-disable-next-line @typescript-eslint/ban-types
  flows: Function[]

  /** Time-to-live for sessions in seconds. Default: 3600 */
  sessionTtl?: number

  /** Callback invoked when a @HandoffTrigger method returns true */
  onHandoff?: (session: FlowSession) => void
}

/**
 * Root module for the conversation flow engine.
 * Call `.forRoot()` in your AppModule to configure storage, register flows, and set options.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     ConversationFlowModule.forRoot({
 *       flows: [LeadFlow],
 *       storage: 'memory',
 *       sessionTtl: 3600,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export class ConversationFlowModule {
  /**
   * Configures the module with the given options and returns a DynamicModule.
   */
  static forRoot(options: ConversationFlowModuleOptions): DynamicModule {
    const flowDefinitions = options.flows.map((flowClass) =>
      FlowDiscoveryService.buildFlowDefinition(flowClass),
    )

    const storage: StorageAdapter =
      options.storage === 'memory'
        ? new MemoryStorageAdapter({ ttl: options.sessionTtl })
        : options.storage

    const engine = FlowEngine.create(storage, flowDefinitions)
    const flowRunner = new FlowRunner(engine, options.onHandoff)

    return {
      module: ConversationFlowModule,
      providers: [
        { provide: FlowRunner, useValue: flowRunner },
        { provide: FlowEngine, useValue: engine },
      ],
      exports: [FlowRunner, FlowEngine],
    }
  }
}
