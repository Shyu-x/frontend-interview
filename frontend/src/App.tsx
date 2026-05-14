import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatContainer } from './components/ChatComponents';
import { useStreamChat } from './hooks/useStreamChat';
import './index.css';

function App() {
  const {
    messages,
    isStreaming,
    error,
    sendStreamMessage,
    regenerateLastResponse,
  } = useStreamChat({
    apiUrl: '/api/chat',
    onError: (err) => console.error('Chat error:', err),
  });

  const handleStop = () => {
    // Stop streaming handled internally
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Agent 对话</h1>
        <span className="status">
          {isStreaming ? '● 流式响应中' : '○ 空闲'}
        </span>
      </header>

      <ChatContainer
        messages={messages}
        isStreaming={isStreaming}
        onSend={sendStreamMessage}
        onStop={handleStop}
        onRegenerate={regenerateLastResponse}
      />

      {error && (
        <div className="error-toast">
          错误: {error.message}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);