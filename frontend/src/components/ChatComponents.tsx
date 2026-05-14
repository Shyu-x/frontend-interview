import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import type { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRegenerate }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isStreaming = message.isStreaming;

  const cursorClass = isStreaming ? 'typing-cursor' : '';

  return (
    <div className={clsx('message', `message--${message.role}`, {
      'message--streaming': isStreaming,
    })}>
      <div className="message__avatar">
        {isUser ? (
          <div className="avatar avatar--user">U</div>
        ) : (
          <div className="avatar avatar--assistant">AI</div>
        )}
      </div>

      <div className="message__content">
        <div className={clsx('message__text', cursorClass)}>
          {message.content || (isStreaming ? '思考中...' : '')}
        </div>

        {isAssistant && !isStreaming && (
          <div className="message__actions">
            <button
              className="message__action"
              onClick={onRegenerate}
              title="重新生成"
            >
              ↻ 重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  disabled = false,
  placeholder = '输入消息...',
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
      />
      <div className="chat-input__actions">
        {disabled ? (
          <button
            type="button"
            className="chat-input__button chat-input__button--stop"
            onClick={onStop}
          >
            ■ 停止
          </button>
        ) : (
          <button
            type="submit"
            className="chat-input__button chat-input__button--send"
            disabled={!value.trim()}
          >
            发送
          </button>
        )}
      </div>
    </form>
  );
};

interface ChatContainerProps {
  messages: Message[];
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isStreaming,
  onSend,
  onStop,
  onRegenerate,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onRegenerate={onRegenerate}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={onSend}
        onStop={onStop}
        disabled={isStreaming}
      />
    </div>
  );
};