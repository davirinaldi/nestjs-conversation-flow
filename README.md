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

### Conditional branching

Use `@Condition` to route the conversation to different steps based on session data. Conditions are evaluated in order after the step handler runs — the first `when` that returns `true` wins. If no condition matches, the flow completes.

```typescript
@Step('qualify')
@After('collect-info')
@Condition([
  { when: async (session) => (session.data.score as number) > 0.8, then: 'handoff-to-sales' },
  { when: async (session) => (session.data.score as number) > 0.5, then: 'nurture-campaign' },
])
async qualify(@Session() session: FlowSession) {
  session.data.score = 0.9
  return 'Scoring complete.'
}
```

### Handoff

The `@HandoffTrigger()` decorator marks a method that decides whether to hand off the conversation to a human agent. When the method returns `true`, the engine sets `handoff: true` in the result and invokes the `onHandoff` callback.

### Step completion hook

The `onStepComplete` hook fires after each step handler runs but before the next step is resolved. Use it for LLM scoring, logging, or data enrichment:

```typescript
ConversationFlowModule.forRoot({
  flows: [LeadFlow],
  storage: 'memory',
  onStepComplete: async (context) => {
    // context: { flowId, stepName, input, response, session }
    const score = await myLLM.score(context.response)
    context.session.data.score = score  // mutations persist and influence @Condition routing
  },
})
```

## Express adapter

Use conversation flows without NestJS:

```bash
npm install @conversation-flow/core @conversation-flow/express
```

```typescript
import express from 'express'
import { FlowEngine, MemoryStorageAdapter } from '@conversation-flow/core'
import { createConversationFlowRouter } from '@conversation-flow/express'

const engine = FlowEngine.create(new MemoryStorageAdapter(), [myFlowDefinition])

const app = express()
app.use(express.json())
app.use('/chat', createConversationFlowRouter({ engine }))
app.listen(3000)
// POST /chat/my-flow/message { sessionId: "u1", input: "hello" }
```

## API reference

### Decorators

| Decorator | Target | Description |
|---|---|---|
| `@ConversationFlow(flowId)` | class | Registers a class as a conversation flow |
| `@Step(stepName)` | method | Marks a method as a conversation step |
| `@After(stepName)` | method | Declares which step precedes this one |
| `@Condition(routes)` | method | Defines conditional branching after this step |
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
- `RedisStorageAdapter` — Redis-backed storage with native TTL via `ioredis`. Install separately:

```bash
npm install @conversation-flow/redis ioredis
```

```typescript
import { RedisStorageAdapter } from '@conversation-flow/redis'

ConversationFlowModule.forRoot({
  storage: new RedisStorageAdapter({
    redis: 'redis://localhost:6379',
    prefix: 'cf:session:',  // default
    ttl: 3600,              // default, in seconds
  }),
  flows: [LeadFlow],
})
```

You can implement your own adapter for any storage backend by implementing the `StorageAdapter` interface.

## Packages

| Package | npm | Description |
|---|---|---|
| `@conversation-flow/core` | [![npm](https://img.shields.io/npm/v/@conversation-flow/core)](https://www.npmjs.com/package/@conversation-flow/core) | Pure TS engine, zero dependencies |
| `@conversation-flow/nestjs` | [![npm](https://img.shields.io/npm/v/@conversation-flow/nestjs)](https://www.npmjs.com/package/@conversation-flow/nestjs) | NestJS module + decorators |
| `@conversation-flow/redis` | [![npm](https://img.shields.io/npm/v/@conversation-flow/redis)](https://www.npmjs.com/package/@conversation-flow/redis) | Redis storage adapter |
| `@conversation-flow/express` | [![npm](https://img.shields.io/npm/v/@conversation-flow/express)](https://www.npmjs.com/package/@conversation-flow/express) | Express adapter |

## Roadmap

### v1.0

- [x] Monorepo scaffold
- [x] `FlowSession` type + `MemoryStorageAdapter`
- [x] `FlowEngine.process()` — core execution loop
- [x] `StepRouter` — resolves next step from `@After` metadata
- [x] All decorators: `@ConversationFlow`, `@Step`, `@After`, `@Session`, `@HandoffTrigger`
- [x] `ConversationFlowModule.forRoot()`
- [x] `FlowRunner` injectable service
- [x] Jest tests (>80% coverage)
- [x] GitHub Actions CI

### v1.1

- [x] `RedisStorageAdapter`
- [x] `@Condition` decorator for branching steps
- [x] LLM scoring hook (`onStepComplete` middleware)
- [x] Express adapter

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
