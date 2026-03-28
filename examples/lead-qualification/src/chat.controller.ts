import { Controller, Post, Body } from '@nestjs/common'
import { FlowRunner } from '@conversation-flow/nestjs'

interface MessageDto {
  userId: string
  message: string
}

@Controller('chat')
export class ChatController {
  constructor(private readonly flowRunner: FlowRunner) {}

  @Post('message')
  async handle(@Body() dto: MessageDto) {
    return this.flowRunner.process({
      flowId: 'lead-qualification',
      sessionId: dto.userId,
      input: dto.message,
    })
  }
}
