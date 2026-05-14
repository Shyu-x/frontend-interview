import { Injectable } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ChatRequestDto } from '../dto/chat.dto';

export interface StreamHandler {
  write(data: string): void;
  end(): void;
}

@Injectable()
export class StreamingService {
  constructor(private readonly agentService: AgentService) {}

  async handleStreamChat(
    dto: ChatRequestDto,
    res: StreamHandler,
  ): Promise<void> {
    try {
      // Set headers for SSE
      res.write('event: connected\ndata: {"status":"connected"}\n\n');

      let fullContent = '';

      for await (const chunk of this.agentService.chatStream(dto.messages)) {
        fullContent += chunk;

        // Send SSE format
        const data = JSON.stringify({
          choices: [{
            index: 0,
            delta: { content: chunk },
            finish_reason: null,
          }],
        });

        res.write(`data: ${data}\n\n`);
      }

      // Send final message
      const doneData = JSON.stringify({
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      });

      res.write(`data: ${doneData}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      const errorData = JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'api_error',
        },
      });

      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
}