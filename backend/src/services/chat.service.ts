import { Injectable } from '@nestjs/common';
import { AgentService } from './agent.service';
import { StreamingService } from './streaming.service';
import { ChatRequestDto, ChatResponseDto } from '../dto/chat.dto';
import { Response } from 'express';

@Injectable()
export class ChatService {
  constructor(
    private readonly agentService: AgentService,
    private readonly streamingService: StreamingService,
  ) {}

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const content = await this.agentService.chat(dto.messages);

    return {
      id: `chat_${Date.now()}`,
      model: dto.model || 'claude-3-5-sonnet-20241022',
      created: Math.floor(Date.now() / 1000),
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      }],
    };
  }

  async chatStream(dto: ChatRequestDto, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    await this.streamingService.handleStreamChat(dto, {
      write: (data: string) => {
        res.write(data);
      },
      end: () => {
        res.end();
      },
    });
  }
}