import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatRequestDto } from '../dto/chat.dto';

@Injectable()
export class AgentService {
  private llm: ChatAnthropic;

  constructor() {
    this.llm = new ChatAnthropic({
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(messages: ChatRequestDto['messages']): Promise<string> {
    const langchainMessages = messages.map((msg) => {
      if (msg.role === 'system') {
        return new SystemMessage(msg.content);
      } else if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    const outputParser = new StringOutputParser();
    const chain = this.llm.pipe(outputParser);

    const response = await chain.invoke(langchainMessages);
    return response;
  }

  async *chatStream(messages: ChatRequestDto['messages']): AsyncGenerator<string> {
    const langchainMessages = messages.map((msg) => {
      if (msg.role === 'system') {
        return new SystemMessage(msg.content);
      } else if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    const stream = await this.llm.stream(langchainMessages);

    for await (const chunk of stream) {
      if (chunk.content && typeof chunk.content === 'string') {
        yield chunk.content;
      } else if (chunk.content && Array.isArray(chunk.content)) {
        for (const item of chunk.content) {
          if (item.type === 'text') {
            yield item.text;
          }
        }
      }
    }
  }

  updateModel(model: string, temperature?: number) {
    this.llm = new ChatAnthropic({
      model,
      temperature: temperature ?? 0.7,
      maxTokens: 4096,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
}