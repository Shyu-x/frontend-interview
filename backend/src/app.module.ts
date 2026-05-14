import { Module } from '@nestjs/common';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { AgentService } from './services/agent.service';
import { StreamingService } from './services/streaming.service';

@Module({
  imports: [],
  controllers: [ChatController],
  providers: [ChatService, AgentService, StreamingService],
})
export class AppModule {}