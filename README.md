# nestjs-conversation-flow

A stateful conversation flow engine for Node.js, with a first-class NestJS adapter.

## The problem

Every developer building a chatbot with NestJS ends up writing a hand-rolled state machine to track conversation steps — collect name, validate input, qualify lead, handoff to human. This logic is always custom, always brittle, and always duplicated across projects.

`nestjs-conversation-flow` provides that state machine as a reusable library. Define your conversation steps with decorators, and the engine handles session persistence, step routing, and human handoff.

## Installation

```bash
npm install @conversation-flow/core @conversation-flow/nestjs
```

## Quick start

Define a conversation flow:

```typescript
import { ConversationFlow, Step, After, HandoffTrigger, Session } from '@conversation-flow/nestjs'
import { FlowSession } from '@conversation-flow/core'

@ConversationFlow('lead-qualification')
export class LeadFlow {
  @Step('collect-name')
  async collectName(@Session() session: FlowSession) {
    return 'Hello! What is your name?'
  }

  @Step('collect-cnpj')
  @After('collect-name')
  async collectCnpj(@Session() session: FlowSession) {
    session.data.name = session.history.at(-1)?.input
    return `Nice to meet you, ${session.data.name}! What is your company CNPJ?`
  }

  @HandoffTrigger()
  async shouldHandoff(@Session() session: FlowSession): Promise<boolean> {
    return (session.data.score as number) > 0.8
  }
}
```

Register the module:

```typescript
import { ConversationFlowModule } from '@conversation-flow/nestjs'

@Module({
  imports: [
    ConversationFlowModule.forRoot({
      flows: [LeadFlow],
      storage: 'memory',
      sessionTtl: 3600,
    }),
  ],
})
export class AppModule {}
```

Process messages in a controller:

```typescript
@Post('message')
async handle(@Body() dto: MessageDto) {
  return this.flowRunner.process({
    flowId: 'lead-qualification',
    sessionId: dto.userId,
    input: dto.message,
  })
}
```

## Core concepts

### Session

A `FlowSession` is the state object that persists between messages for a given user. It tracks the current step, accumulated data, and a history of all executed steps. Sessions are stored via a `StorageAdapter` and expire after a configurable TTL.

### Steps

Steps are methods decorated with `@Step(name)`. Each step receives the current session and returns a string response. Use `@After(previousStep)` to declare ordering — the engine uses this to build the step execution graph.

### Handoff

The `@HandoffTrigger()` decorator marks a method that decides whether to hand off the conversation to a human agent. When the method returns `true`, the engine sets `handoff: true` in the result and invokes the `onHandoff` callback.

## API reference

### Decorators

| Decorator | Target | Description |
|---|---|---|
| `@ConversationFlow(flowId)` | class | Registers a class as a conversation flow |
| `@Step(stepName)` | method | Marks a method as a conversation step |
| `@After(stepName)` | method | Declares which step precedes this one |
| `@HandoffTrigger()` | method | Marks the handoff decision method |
| `@Session()` | parameter | Injects the current `FlowSession` |

### ConversationFlowModule.forRoot(options)

| Option | Type | Default | Description |
|---|---|---|---|
| `storage` | `'memory' \| StorageAdapter` | — | Storage backend for sessions |
| `flows` | `Function[]` | — | Flow classes to register |
| `sessionTtl` | `number` | `3600` | Session TTL in seconds |
| `onHandoff` | `(session: FlowSession) => void` | — | Callback when handoff triggers |

### FlowRunner.process(input)

```typescript
interface ProcessInput {
  flowId: string     // Which flow to execute
  sessionId: string  // User/chat identifier
  input: string      // User's message
}

interface ProcessResult {
  response: string       // Bot's response
  session: FlowSession   // Updated session state
  handoff: boolean       // Whether handoff was triggered
}
```

## Storage adapters

The library uses a `StorageAdapter` interface for session persistence:

```typescript
interface StorageAdapter {
  get(sessionId: string): Promise<FlowSession | null>
  set(session: FlowSession): Promise<void>
  delete(sessionId: string): Promise<void>
}
```

**Built-in adapters:**

- `'memory'` — In-memory storage using a `Map`. Good for development and testing. Sessions are lost on restart.

**Planned adapters (v1.1):**

- `RedisStorageAdapter` — Redis-backed storage with native TTL support.

You can implement your own adapter for any storage backend by implementing the `StorageAdapter` interface.

## Packages

| Package | npm | Description |
|---|---|---|
| `@conversation-flow/core` | [![npm](https://img.shields.io/npm/v/@conversation-flow/core)](https://www.npmjs.com/package/@conversation-flow/core) | Pure TS engine, zero dependencies |
| `@conversation-flow/nestjs` | [![npm](https://img.shields.io/npm/v/@conversation-flow/nestjs)](https://www.npmjs.com/package/@conversation-flow/nestjs) | NestJS module + decorators |

## Roadmap

### v1.0

- [x] Monorepo scaffold
- [ ] `FlowSession` type + `MemoryStorageAdapter`
- [ ] `FlowEngine.process()` — core execution loop
- [ ] `StepRouter` — resolves next step from `@After` metadata
- [ ] All decorators: `@ConversationFlow`, `@Step`, `@After`, `@Session`, `@HandoffTrigger`
- [ ] `ConversationFlowModule.forRoot()`
- [ ] `FlowRunner` injectable service
- [ ] Jest tests (>80% coverage)
- [ ] GitHub Actions CI

### v1.1

- [ ] `RedisStorageAdapter`
- [ ] `@Condition` decorator for branching steps
- [ ] LLM scoring hook (`onStepComplete` middleware)
- [ ] Express adapter

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `npm install`
4. Make your changes and add tests
5. Run the checks: `npm run build && npm test && npm run lint`
6. Commit and push: `git push origin feature/my-feature`
7. Open a pull request

Please ensure all tests pass and coverage remains above 80%.

## License

MIT
