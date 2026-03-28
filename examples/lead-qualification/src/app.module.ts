// @ts-nocheck
import { Module } from '@nestjs/common'
import { ConversationFlowModule } from '@conversation-flow/nestjs'
import { LeadFlow } from './lead-flow'
import { ChatController } from './chat.controller'

@Module({
  imports: [
    ConversationFlowModule.forRoot({
      flows: [LeadFlow],
      storage: 'memory',
      sessionTtl: 3600,
      onHandoff: (session) => console.log('Handoff triggered for', session.id),
    }),
  ],
  controllers: [ChatController],
})
export class AppModule {}
