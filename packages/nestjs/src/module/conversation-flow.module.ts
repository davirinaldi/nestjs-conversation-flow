import type { DynamicModule } from '@nestjs/common'
import type { StorageAdapter, FlowSession } from '@conversation-flow/core'

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
   *
   * TODO: Implement provider registration, flow discovery, and storage adapter initialization.
   */
  static forRoot(_options: ConversationFlowModuleOptions): DynamicModule {
    return {
      module: ConversationFlowModule,
      providers: [],
      exports: [],
    }
  }
}
