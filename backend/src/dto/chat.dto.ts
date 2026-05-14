import { IsArray, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: '消息角色', enum: ['user', 'assistant', 'system'] })
  @IsString()
  role: string;

  @ApiProperty({ description: '消息内容' })
  @IsString()
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({ description: '消息历史', type: [ChatMessageDto] })
  @IsArray()
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ description: '是否流式返回', default: true })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ description: '模型名称', default: 'claude-3-5-sonnet-20241022' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '温度参数', default: 0.7 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: '最大Token数', default: 4096 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;
}

export class ChatResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  created: number;

  @ApiProperty()
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}