import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, StreamChunk, ChatRequest } from '@/types/chat';

interface UseStreamChatOptions {
  apiUrl?: string;
  onChunk?: (chunk: StreamChunk) => void;
  onError?: (error: Error) => void;
  onComplete?: (fullContent: string) => void;
}

interface UseStreamChatReturn {
  messages: Message[];
  isStreaming: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  sendStreamMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  regenerateLastResponse: () => Promise<void>;
}

export function useStreamChat(options: UseStreamChatOptions = {}): UseStreamChatReturn {
  const { apiUrl = '/api/chat', onChunk, onError, onComplete } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        } as ChatRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || '',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    }
  }, [apiUrl, messages, onError]);

  const sendStreamMessage = useCallback(async (content: string) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    lastUserMessageRef.current = content;
    setMessages(prev => [...prev, userMessage]);

    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        } as ChatRequest),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';

              if (token) {
                fullContent += token;
                onChunk?.({ type: 'content', content: token });

                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch {
              // Ignore parse errors for non-JSON data
            }
          }
        }
      }

      onComplete?.(fullContent);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled
      } else {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [apiUrl, messages, isStreaming, onChunk, onError, onComplete]);

  const regenerateLastResponse = useCallback(async () => {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMsg) return;

    // Remove the last assistant message
    setMessages(prev => {
      const withoutLastAssistant = [...prev];
      const lastIdx = withoutLastAssistant.map((m, i) => m.id).lastIndexOf(
        withoutLastAssistant.filter(m => m.role === 'assistant').pop()?.id || ''
      );
      if (lastIdx > -1) {
        withoutLastAssistant.splice(lastIdx, 1);
      }
      return withoutLastAssistant;
    });

    // Re-send the message
    await sendStreamMessage(lastUserMsg.content);
  }, [messages, sendStreamMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    sendStreamMessage,
    clearMessages,
    regenerateLastResponse,
  };
}