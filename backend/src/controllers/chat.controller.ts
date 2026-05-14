import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from '../services/chat.service';
import { ChatRequestDto } from '../dto/chat.dto';

@ApiTags('Chat')
@Controller('api')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({ summary: '发送消息（非流式）' })
  @ApiResponse({ status: 200, description: '返回完整响应' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async chat(@Body() dto: ChatRequestDto) {
    return this.chatService.chat(dto);
  }

  @Post('chat/stream')
  @HttpCode(200)
  @ApiOperation({ summary: '发送消息（流式 SSE）' })
  @ApiResponse({ status: 200, description: '返回 SSE 流' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async chatStream(
    @Body() dto: ChatRequestDto,
    @Res() res: Response,
  ) {
    // Disable default NestJS response handling
    res.flushHeaders();

    await this.chatService.chatStream(dto, res);
  }
}