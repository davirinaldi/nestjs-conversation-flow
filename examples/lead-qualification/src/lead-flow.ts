// @ts-nocheck
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

  @Step('qualify')
  @After('collect-cnpj')
  async qualify(@Session() session: FlowSession) {
    // User can call their own LLM/CRM here
    session.data.score = 0.9
    return 'Thank you! Let me connect you with our team.'
  }

  @HandoffTrigger()
  async shouldHandoff(@Session() session: FlowSession): Promise<boolean> {
    return (session.data.score as number) > 0.8
  }
}
