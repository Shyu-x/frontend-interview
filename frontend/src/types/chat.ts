// SSE 流式对话类型定义

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface StreamChunk {
  type: 'content' | 'error' | 'done';
  content?: string;
  error?: string;
}

export interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools?: AgentTool[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface StreamEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}