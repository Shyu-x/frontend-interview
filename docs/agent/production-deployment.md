# AI Agent 生产部署指南

> 本文档涵盖 AI Agent 系统的生产环境部署架构、扩展策略、监控方案、安全配置和成本优化。

<!--toc-->

## 1. 部署架构概述

### 1.1 架构选型对比

| 部署方式 | 适用场景 | 优点 | 缺点 |
|----------|----------|------|------|
| **Serverless** | 低流量、突发性负载 | 自动扩缩容、按需付费、冷启动快 | 超时限制、状态管理复杂 |
| **容器化 (Docker)** | 中等流量、需要状态持久化 | 可移植性强、环境一致 | 需要手动扩缩容管理 |
| **Kubernetes** | 大规模、高可用要求 | 自动扩缩容、自愈能力、滚动更新 | 运维复杂度高 |

### 1.2 Serverless 架构

#### AWS Lambda + API Gateway

```
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐
│   Client    │────▶│ API Gateway   │────▶│  Lambda Function │
└─────────────┘     └───────────────┘     └─────────────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  Claude API     │
                                        │  (via LangChain) │
                                        └─────────────────┘
```

**配置示例 (serverless.yml)**:

```yaml
service: ai-agent-serverless
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  stage: production
  region: us-east-1
  environment:
    ANTHROPIC_API_KEY: ${env:ANTHROPIC_API_KEY}
    REDIS_URL: ${env:REDIS_URL}
  timeout: 30
  memorySize: 1024
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - ssm:GetParameter
          Resource: 'arn:aws:ssm:*:*:parameter/ai-agent/*'

functions:
  chat:
    handler: handler.chat
    events:
      - http:
          path: /chat
          method: post
          cors: true
    layers:
      - arn:aws:lambda:us-east-1:123456789012:layer:langchain-layer:1
    reservedConcurrency: 100

  streamChat:
    handler: handler.streamChat
    events:
      - http:
          path: /chat/stream
          method: post
          cors: true
    timeout: 60

plugins:
  - serverless-plugin-warmup
  - serverless-不谈-plugin

custom:
  warmup:
    default:
      enabled: true
      events:
        - schedule: cron(0/5 8-20 ? * MON-FRI *)
```

**LangChain Lambda Handler**:

```typescript
// handler.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { ConversationChain } from 'langchain/chains';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { BufferMemory } from 'langchain/memory';
import { CallbackManager } from 'langchain/callbacks';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const chat = async (event: APIGatewayEvent) => {
  const { messages, sessionId } = JSON.parse(event.body);

  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: 'history',
  });

  const model = new ChatAnthropic({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
  });

  const chain = new ConversationChain({ llm: model, memory });

  const response = await chain.invoke({ input: messages[messages.length - 1].content });
  return {
    statusCode: 200,
    body: JSON.stringify({ response: response.response }),
  };
};

export const streamChat = async (event: APIGatewayEvent) => {
  const { messages } = JSON.parse(event.body);

  const stream = await anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages,
    stream: true,
  });

  return {
    statusCode: 200,
    body: stream.toReadableStream(),
    isBase64Encoded: false,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  };
};
```

#### Vercel AI SDK 部署

```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: 'You are a helpful assistant.',
    messages,
  });

  return result.toDataStreamResponse();
}
```

### 1.3 容器化部署 (Docker)

#### Dockerfile 最佳实践

```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app

# 安全：使用非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 4000

CMD ["node", "dist/main.js"]
```

#### Docker Compose 本地开发

```yaml
# docker-compose.yml
version: '3.8'

services:
  agent-api:
    build:
      context: .
      target: builder
    ports:
      - "4000:4000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  redis_data:
```

### 1.4 Kubernetes 部署

#### Deployment 配置

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-agent
  labels:
    app: ai-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-agent
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: ai-agent
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "4000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: ai-agent-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: agent
          image: your-registry.com/ai-agent:v1.2.0
          ports:
            - containerPort: 4000
              name: http
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: ai-agent-secrets
                  key: anthropic-api-key
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: ai-agent-config
                  key: redis-url
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
          envFrom:
            - configMapRef:
                name: ai-agent-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: ai-agent
                topologyKey: kubernetes.io/hostname
```

#### HPA 自动扩缩容

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-agent
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

#### Service 配置

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-agent-service
  labels:
    app: ai-agent
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 4000
      protocol: TCP
      name: http
  selector:
    app: ai-agent
---
apiVersion: v1
kind: Service
metadata:
  name: ai-agent-pdb
spec:
  selector:
    app: ai-agent
  minAvailable: 2
```

## 2. 扩展策略

### 2.1 水平扩展

```typescript
// 负载均衡器健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/ready', async (req, res) => {
  try {
    // 检查 Redis 连接
    await redis.ping();
    // 检查 API key 有效性
    await checkApiKey();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});
```

### 2.2 垂直扩展配置

```yaml
# Kubernetes 资源配额
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ai-agent-quota
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "10"
```

### 2.3 地理分布扩展

```
┌─────────────────────────────────────────────────────────────┐
│                      Global Load Balancer                    │
│                    (CloudFlare / Route53)                   │
└─────────────────┬─────────────────────┬─────────────────────┘
                  │                     │
        ┌─────────▼─────────┐ ┌────────▼─────────┐
        │   US East Region   │ │   EU West Region │
        │   ┌───────────┐    │ │   ┌───────────┐  │
        │   │ K8s Pool  │    │ │   │ K8s Pool  │  │
        │   └───────────┘    │ │   └───────────┘  │
        └────────────────────┘ └────────────────────┘
```

### 2.4 队列驱动的扩展模式

```typescript
// 使用 SQS + Lambda 实现背压处理
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });
const queueUrl = process.env.AGENT_QUEUE_URL;

export const processQueue = async () => {
  const command = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 60,
  });

  const { Messages } = await sqs.send(command);

  for (const message of Messages ?? []) {
    try {
      const { messages, sessionId, traceId } = JSON.parse(message.Body);

      const result = await agent.process(messages);

      // 处理成功，删除消息
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }));

      // 发送结果到回调队列
      await sendToCallbackQueue({ sessionId, result, traceId });
    } catch (error) {
      // 处理失败，增加 VisibilityTimeout 重试
      console.error('Processing failed:', error);
    }
  }
};
```

## 3. 监控与可观测性

### 3.1 LangSmith 集成

```typescript
// tracing.ts
import { Client } from '@langchain/langsmith';

const langsmithClient = new Client({
  apiUrl: process.env.LANGSMITH_API_URL,
  apiKey: process.env.LANGSMITH_API_KEY,
});

// LangChain 回调处理器
import { CallbackManager } from 'langchain/callbacks';

export const getTracingHandler = () => {
  return CallbackManager.fromHandlers({
    async handleLLMStart(llm, prompts) {
      console.log('LLM Start:', prompts);
    },
    async handleLLMEnd(output) {
      console.log('LLM End:', output);
    },
    async handleToolStart(tool, input) {
      console.log('Tool Start:', tool.name, input);
    },
    async handleToolEnd(output) {
      console.log('Tool End:', output);
    },
  });
};

// 使用示例
const model = new ChatAnthropic({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  callbacks: getTracingHandler(),
});
```

### 3.2 Weights & Biases (W&B) 集成

```typescript
// wandb_integration.ts
import wandb from 'wandb';

class AgentMetrics {
  private run: any;

  constructor() {
    this.run = wandb.init({
      project: 'ai-agent-production',
      name: `agent-${process.env.HOSTNAME}`,
      config: {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        max_tokens: 4096,
      },
    });
  }

  logConversation(messages: Message[], response: string, metadata: {
    duration: number;
    tokens_used: number;
    success: boolean;
  }) {
    this.run.log({
      'conversation_length': messages.length,
      'response_length': response.length,
      'duration_ms': metadata.duration,
      'tokens_used': metadata.tokens_used,
      'success': metadata.success,
      'timestamp': new Date().toISOString(),
    });
  }

  logToolUsage(toolName: string, duration: number, success: boolean) {
    this.run.log({
      [`tool_${toolName}_duration`]: duration,
      [`tool_${toolName}_success`]: success ? 1 : 0,
    });
  }

  finish() {
    this.run.finish();
  }
}

export const metrics = new AgentMetrics();
```

### 3.3 Prometheus 指标

```typescript
// metrics.ts
import client, { Counter, Histogram, Gauge } from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// 请求计数器
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// 请求延迟直方图
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Agent 指标
export const agentConversationsTotal = new Counter({
  name: 'agent_conversations_total',
  help: 'Total number of agent conversations',
  labelNames: ['status'],
  registers: [register],
});

export const agentConversationDuration = new Histogram({
  name: 'agent_conversation_duration_seconds',
  help: 'Agent conversation duration in seconds',
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

// Token 使用量
export const tokensUsedTotal = new Counter({
  name: 'tokens_used_total',
  help: 'Total tokens used',
  labelNames: ['type'], // 'input' | 'output'
  registers: [register],
});

// 活跃会话数
export const activeSessions = new Gauge({
  name: 'active_sessions',
  help: 'Number of active conversations',
  registers: [register],
});

// 中间件
export const metricsMiddleware = async (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, path: req.path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, path: req.path }, duration);
  });

  next();
};

// /metrics 端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

### 3.4 分布式追踪 (OpenTelemetry)

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { LangChainInstrumentation } from '@opentelemetry/instrumentation-langchain';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'ai-agent',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    new LangChainInstrumentation(),
  ],
});

sdk.start();

// 手动创建 span
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('ai-agent');

export const tracedAgentCall = async (messages: Message[]) => {
  return tracer.startActiveSpan('agent.process', async (span) => {
    try {
      span.setAttributes({
        'conversation.length': messages.length,
        'model': 'claude-3-5-sonnet-20241022',
      });

      const result = await agent.process(messages);

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({ 'response.length': result.length });

      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
};
```

## 4. 安全考虑

### 4.1 API Key 管理

#### AWS Secrets Manager

```typescript
// secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

export const getSecret = async (secretName: string): Promise<string> => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await secretsClient.send(command);
  return response.SecretString;
};

// Kubernetes Secret
// k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ai-agent-secrets
type: Opaque
stringData:
  anthropic-api-key: "${ANTHROPIC_API_KEY}"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-agent-config
data:
  model: "claude-3-5-sonnet-20241022"
  max-tokens: "4096"
  temperature: "0.7"
```

#### 环境变量注入

```typescript
// 安全加载配置
import { z } from 'zod';

const configSchema = z.object({
  anthropicApiKey: z.string().min(1),
  redisUrl: z.string().url(),
  nodeEnv: z.enum(['development', 'production']).default('production'),
});

const config = configSchema.parse({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  redisUrl: process.env.REDIS_URL,
  nodeEnv: process.env.NODE_ENV,
});
```

### 4.2 速率限制

```typescript
// rate_limiter.ts
import Redis from 'ioredis';
import rateLimit from 'express-rate-limit';

const redis = new Redis(process.env.REDIS_URL);

// Sliding Window 限流
export const slidingWindowLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟窗口
  max: async (req) => {
    // 根据用户等级动态限制
    const userId = req.headers['x-user-id'];
    const tier = await redis.hget(`user:${userId}`, 'tier') || 'free';
    const limits = { free: 20, pro: 100, enterprise: 1000 };
    return limits[tier] || 20;
  },
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Token Bucket 算法（更平滑的限流）
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens: number): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Redis 分布式限流
export const distributedRateLimit = async (
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zadd(key, now, `${now}-${Math.random()}`);
  multi.zcard(key);
  multi.expire(key, windowSeconds);
  const results = await multi.exec();

  const count = results[2][1];
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);

  return {
    allowed,
    remaining,
    resetAt: now + windowSeconds * 1000,
  };
};
```

### 4.3 输入验证与净化

```typescript
// validation.ts
import { z } from 'zod';

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
    .min(1)
    .max(100000) // 限制消息长度
    .transform(s => s.trim())
    .refine(s => !s.match(/[<>]/), 'HTML tags not allowed'),
});

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  stream: z.boolean().default(false),
  sessionId: z.string().uuid().optional(),
  model: z.string().default('claude-3-5-sonnet-20241022'),
});

// 内容安全检查
export const contentFilter = (text: string): { safe: boolean; categories: string[] } => {
  const sensitivePatterns = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, category: 'ssn' }, // SSN
    { pattern: /\b\d{16}\b/, category: 'credit_card' }, // Credit card
    { pattern: /password\s*[=:]\s*\S+/gi, category: 'password' },
  ];

  const detected = sensitivePatterns
    .filter(p => p.pattern.test(text))
    .map(p => p.category);

  return {
    safe: detected.length === 0,
    categories: detected,
  };
};
```

### 4.4 认证与授权

```typescript
// auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthUser {
  id: string;
  tier: 'free' | 'pro' | 'enterprise';
  organizationId?: string;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...allowedTiers: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedTiers.includes(req.user.tier)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// 使用示例
app.post('/api/chat',
  authenticate,
  authorize('pro', 'enterprise'),
  rateLimiter,
  async (req, res) => {
    // 处理请求
  }
);
```

### 4.5 TLS 与传输安全

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://ai-agent;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 5. 成本管理

### 5.1 Token 使用追踪

```typescript
// cost_tracking.ts
import { Redis } from 'ioredis';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

const redis = new Redis(process.env.REDIS_URL);

export const trackTokenUsage = async (
  userId: string,
  usage: TokenUsage,
  model: string
) => {
  const date = new Date().toISOString().split('T')[0];
  const key = `usage:${userId}:${date}`;

  const multi = redis.multi();
  multi.hincrby(key, 'input_tokens', usage.inputTokens);
  multi.hincrby(key, 'output_tokens', usage.outputTokens);
  multi.hincrbyfloat(key, 'cost', usage.cost);
  multi.expire(key, 90 * 24 * 60 * 60); // 保留 90 天

  await multi.exec();
};

export const getUserUsage = async (userId: string, date: string) => {
  const key = `usage:${userId}:${date}`;
  const usage = await redis.hgetall(key);
  return {
    inputTokens: parseInt(usage.input_tokens || '0'),
    outputTokens: parseInt(usage.output_tokens || '0'),
    cost: parseFloat(usage.cost || '0'),
  };
};

export const getMonthlyCost = async (userId: string) => {
  const dates = getLast30Days();
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;

  for (const date of dates) {
    const usage = await getUserUsage(userId, date);
    totalInput += usage.inputTokens;
    totalOutput += usage.outputTokens;
    totalCost += usage.cost;
  }

  return { totalInput, totalOutput, totalCost };
};
```

### 5.2 成本优化策略

```typescript
// 智能模型选择
const MODEL_COSTS = {
  'claude-opus-4-20250514': { input: 0.015, output: 0.075, per1k: true },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015, per1k: true },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004, per1k: true },
};

export const selectOptimalModel = (
  taskComplexity: 'simple' | 'medium' | 'complex',
  userTier: string
): string => {
  const modelMap = {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-20250514',
    complex: 'claude-opus-4-20250514',
  };

  // Enterprise 用户可以使用更强大的模型
  if (userTier === 'enterprise' && taskComplexity === 'medium') {
    return 'claude-opus-4-20250514';
  }

  return modelMap[taskComplexity];
};

// 缓存重复查询
export const createResponseCache = (ttlSeconds = 3600) => {
  const cache = new Map<string, { response: string; timestamp: number }>();

  return {
    get: (key: string): string | null => {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > ttlSeconds * 1000) {
        cache.delete(key);
        return null;
      }
      return entry.response;
    },
    set: (key: string, response: string) => {
      cache.set(key, { response, timestamp: Date.now() });
    },
    clear: () => cache.clear(),
  };
};

// 上下文窗口优化
export const summarizeHistory = async (
  messages: Message[],
  maxMessages: number = 20
): Promise<Message[]> => {
  if (messages.length <= maxMessages) return messages;

  // 保留系统消息和最近的消息
  const systemMessages = messages.filter(m => m.role === 'system');
  const recentMessages = messages.slice(-(maxMessages - systemMessages.length));

  const summaryPrompt = `请总结以下对话的主要内容和关键信息（不超过100字）：\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

  const summary = await llm.invoke(summaryPrompt);

  return [
    ...systemMessages,
    { role: 'system', content: `对话摘要：${summary}` },
    ...recentMessages.slice(-3), // 保留最近3条
  ];
};
```

### 5.3 预算告警

```typescript
// alerting.ts
interface BudgetAlert {
  userId: string;
  threshold: number; // 百分比
  email: string;
}

export const checkBudgetAndAlert = async (
  userId: string,
  monthlyLimit: number
): Promise<void> => {
  const usage = await getMonthlyCost(userId);
  const percentage = (usage.totalCost / monthlyLimit) * 100;

  if (percentage >= 80) {
    await sendAlert({
      type: 'budget_warning',
      userId,
      threshold: percentage,
      email: await getUserEmail(userId),
    });
  }

  if (percentage >= 100) {
    // 禁用用户或切换到免费配额
    await setUserTier(userId, 'frozen');
  }
};
```

## 6. 高可用模式

### 6.1 多区域部署

```yaml
# k8s/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

replicas:
  - name: us-east
    newName: us-east-1
  - name: eu-west
    newName: eu-west-1
  - name: ap-south
    newName: ap-southeast-1
```

### 6.2 断路器模式

```typescript
// circuit_breaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.log('Circuit breaker opened');
    }
  }
}

export const anthropicBreaker = new CircuitBreaker(5, 60000);

// 使用
const result = await anthropicBreaker.execute(() =>
  anthropic.messages.create({ messages, model })
);
```

### 6.3 重试策略

```typescript
// retry.ts
import { retry } from 'async-retry';

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
  } = {}
): Promise<T> => {
  const { maxAttempts = 3, delay = 1000, backoff = 'exponential' } = options;

  return retry(
    async () => {
      try {
        return await fn();
      } catch (error) {
        // 只对可重试的错误重试
        if (!isRetryableError(error)) {
          throw error;
        }
        throw error;
      }
    },
    {
      retries: maxAttempts,
      minTimeout: delay,
      maxTimeout: 30000,
      factor: backoff === 'exponential' ? 2 : 1,
      onRetry: (error, attempt) => {
        console.log(`Retry attempt ${attempt}: ${error.message}`);
      },
    }
  );
};

const isRetryableError = (error: any): boolean => {
  // 网络错误、限流错误可以重试
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', '429', '503'];
  return retryableCodes.includes(error.code) ||
         retryableCodes.some(c => error.message?.includes(c));
};
```

### 6.4 健康检查与自愈

```typescript
// health.ts
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    redis: boolean;
    anthropic: boolean;
    memory: boolean;
  };
  uptime: number;
}

export const comprehensiveHealthCheck = async (): Promise<HealthStatus> => {
  const checks = {
    redis: await checkRedis(),
    anthropic: await checkAnthropicApi(),
    memory: checkMemory(),
  };

  const allHealthy = Object.values(checks).every(Boolean);
  const anyHealthy = Object.values(checks).some(Boolean);

  return {
    status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
    checks,
    uptime: process.uptime(),
  };
};

const checkAnthropicApi = async (): Promise<boolean> => {
  try {
    await anthropic.messages.create({
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    });
    return true;
  } catch {
    return false;
  }
};
```

### 6.5 数据持久化策略

```typescript
// persistence.ts
export class ConversationStore {
  constructor(
    private redis: Redis,
    private ttlSeconds: number = 86400 // 24 hours
  ) {}

  async save(sessionId: string, messages: Message[]): Promise<void> {
    const key = `conversation:${sessionId}`;
    await this.redis.setex(key, this.ttlSeconds, JSON.stringify(messages));
  }

  async load(sessionId: string): Promise<Message[]> {
    const key = `conversation:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : [];
  }

  async append(sessionId: string, message: Message): Promise<void> {
    const messages = await this.load(sessionId);
    messages.push(message);
    await this.save(sessionId, messages);
  }

  async archive(sessionId: string): Promise<void> {
    const messages = await this.load(sessionId);
    const date = new Date().toISOString();
    await this.redis.set(`archive:${sessionId}:${date}`, JSON.stringify(messages));
    await this.redis.del(`conversation:${sessionId}`);
  }
}
```

## 7. 配置参考

### 7.1 环境变量模板

```bash
# .env.production
# API 配置
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# LLM 配置
ANTHROPIC_API_KEY=sk-ant-xxxxx
MODEL=claude-3-5-sonnet-20241022
MAX_TOKENS=4096
TEMPERATURE=0.7

# Redis
REDIS_URL=redis://localhost:6379

# 认证
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# 速率限制
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# 监控
LANGSMITH_API_KEY=ls-xxxxx
LANGSMITH_PROJECT=ai-agent
WANDB_API_KEY=xxxxx

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=ai-agent
```

### 7.2 Kubernetes 完整配置

```yaml
# k8s/full-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ai-agent
  labels:
    name: ai-agent
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-agent-config
  namespace: ai-agent
data:
  MODEL: "claude-3-5-sonnet-20241022"
  MAX_TOKENS: "4096"
  TEMPERATURE: "0.7"
  LOG_LEVEL: "info"
  NODE_ENV: "production"
---
apiVersion: v1
kind: Secret
metadata:
  name: ai-agent-secrets
  namespace: ai-agent
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}"
  JWT_SECRET: "${JWT_SECRET}"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-agent-network-policy
  namespace: ai-agent
spec:
  podSelector:
    matchLabels:
      app: ai-agent
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 4000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

### 7.3 CI/CD 部署流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/ai-agent:${{ github.sha }}
            ghcr.io/${{ github.repository }}/ai-agent:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: azure/k8s-deploy@v4
        with:
          namespace: ai-agent
          manifests: |
            k8s/namespace.yaml
            k8s/configmap.yaml
            k8s/deployment.yaml
            k8s/service.yaml
            k8s/hpa.yaml
          images: |
            ghcr.io/${{ github.repository }}/ai-agent:${{ github.sha }}
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/ai-agent -n ai-agent
          kubectl get pods -n ai-agent
```

## 8. 故障排查清单

### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 响应超时 | API 限流/网络问题 | 增加超时配置，启用断路器 |
| 内存溢出 | 会话未清理 | 检查 TTL 配置，增加内存限制 |
| 连接失败 | Redis 不可用 | 检查网络策略，启用熔断 |
| 认证失败 | Token 过期 | 刷新 token，检查时钟同步 |
| 部署失败 | 镜像拉取失败 | 检查 imagePullSecrets 配置 |

### 监控仪表板关键指标

1. **延迟**: P50/P95/P99 响应时间
2. **吞吐量**: QPS、会话数
3. **错误率**: 5xx、API 错误
4. **资源**: CPU、内存、连接池
5. **成本**: Token 消耗、日费用

---

*文档版本: 1.0.0 | 最后更新: 2026-05-15*