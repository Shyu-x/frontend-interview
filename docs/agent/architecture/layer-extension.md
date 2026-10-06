---
title: 扩展层
description: Agent 分层架构之扩展层：插件、技能与生态扩展机制。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 扩展层

扩展层提供 Agent 的可扩展性和集成能力。

## 1. MCP 协议 (Model Context Protocol)

MCP 是标准化 Agent 与外部工具/资源交互的协议。

```typescript
// MCP 协议定义
interface MCPMessage {
  jsonrpc: '2.0';
  id: string | number | null;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// MCP 客户端
class MCPClient {
  private transport: MCPTransport;
  private handlers: Map<string, MethodHandler> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor(config: MCPClientConfig) {
    this.transport = this.createTransport(config);
  }

  async connect(): Promise<void> {
    await this.transport.connect();

    this.transport.onmessage = (message: MCPMessage) => {
      this.handleMessage(message);
    };
  }

  async request<T>(method: string, params?: any): Promise<T> {
    const id = this.generateId();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.transport.send(message);

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async notify(method: string, params?: any): Promise<void> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: null,
      method,
      params
    };

    this.transport.send(message);
  }

  private handleMessage(message: MCPMessage): void {
    if (message.id === null) {
      // 通知消息
      this.handleNotification(message);
    } else if (message.result !== undefined) {
      // 响应
      const pending = this.pendingRequests.get(String(message.id));
      if (pending) {
        pending.resolve(message.result);
        this.pendingRequests.delete(String(message.id));
      }
    } else if (message.error) {
      // 错误响应
      const pending = this.pendingRequests.get(String(message.id));
      if (pending) {
        pending.reject(new Error(message.error.message));
        this.pendingRequests.delete(String(message.id));
      }
    } else if (message.method) {
      // 请求
      this.handleRequest(message);
    }
  }

  private async handleRequest(message: MCPMessage): Promise<void> {
    const handler = this.handlers.get(message.method!);

    if (!handler) {
      this.transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: 'Method not found' }
      } as MCPMessage);
      return;
    }

    try {
      const result = await handler(message.params);
      this.transport.send({
        jsonrpc: '2.0',
        id: message.id,
        result
      } as MCPMessage);
    } catch (error) {
      this.transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32603, message: (error as Error).message }
      } as MCPMessage);
    }
  }

  private handleNotification(message: MCPMessage): void {
    const handler = this.handlers.get(message.method!);
    if (handler) {
      handler(message.params);
    }
  }

  registerHandler(method: string, handler: MethodHandler): void {
    this.handlers.set(method, handler);
  }

  private createTransport(config: MCPClientConfig): MCPTransport {
    switch (config.transport) {
      case 'stdio':
        return new StdioTransport(config);

      case 'http':
        return new HTTPTransport(config);

      case 'websocket':
        return new WebSocketTransport(config);

      default:
        throw new UnsupportedTransportError(config.transport);
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// MCP 传输层接口
interface MCPTransport {
  connect(): Promise<void>;
  send(message: MCPMessage): void;
  onmessage: (message: MCPMessage) => void;
  disconnect(): void;
}

// MCP 工具定义
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

// MCP 资源定义
interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP 服务器
class MCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private handlers: Map<string, RequestHandler> = new Map();

  constructor(private name: string) {}

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  registerHandler(method: string, handler: RequestHandler): void {
    this.handlers.set(method, handler);
  }

  async handleRequest(message: MCPMessage): Promise<MCPMessage> {
    const handler = this.handlers.get(message.method!);

    if (!handler) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: 'Method not found' }
      };
    }

    try {
      const result = await handler(message.params);
      return {
        jsonrpc: '2.0',
        id: message.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32603, message: (error as Error).message }
      };
    }
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  getManifest(): ServerManifest {
    return {
      name: this.name,
      tools: this.getTools().map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      })),
      resources: this.getResources().map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description
      }))
    };
  }
}

interface MethodHandler {
  (params?: any): Promise<any>;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
}

interface RequestHandler {
  (params?: any): Promise<any>;
}

interface ServerManifest {
  name: string;
  tools: Array<{ name: string; description: string; inputSchema: JSONSchema }>;
  resources: Array<{ uri: string; name: string; description?: string }>;
}
```

## 2. 插件系统 (Plugin System)

插件系统允许动态扩展 Agent 功能。

```typescript
// 插件定义
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies: string[];
  permissions: Permission[];
  hooks: PluginHooks;
  lifecycle: PluginLifecycle;
}

interface PluginHooks {
  beforeRequest?: HookHandler;
  afterRequest?: HookHandler;
  onError?: ErrorHandler;
  onMessage?: MessageHandler;
}

type HookHandler = (context: HookContext) => Promise<HookContext>;
type ErrorHandler = (error: Error, context: HookContext) => Promise<void>;
type MessageHandler = (message: any, context: HookContext) => Promise<any>;

interface PluginLifecycle {
  onLoad: () => Promise<void>;
  onUnload: () => Promise<void>;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
}

// 插件管理器
class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private hooks: Map<string, HookHandler[]> = new Map();

  constructor(private config: PluginManagerConfig) {
    this.initializeHookMap();
  }

  private initializeHookMap(): void {
    this.hooks.set('beforeRequest', []);
    this.hooks.set('afterRequest', []);
    this.hooks.set('onError', []);
    this.hooks.set('onMessage', []);
  }

  async load(plugin: Plugin): Promise<void> {
    // 检查依赖
    await this.checkDependencies(plugin);

    // 检查权限
    await this.checkPermissions(plugin);

    // 注册钩子
    this.registerHooks(plugin);

    // 存储插件
    this.plugins.set(plugin.id, plugin);

    // 调用生命周期
    await plugin.lifecycle.onLoad();
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new PluginNotFoundError(pluginId);
    }

    // 调用生命周期
    await plugin.lifecycle.onUnload();

    // 移除钩子
    this.unregisterHooks(plugin);

    // 移除插件
    this.plugins.delete(pluginId);
    this.enabledPlugins.delete(pluginId);
  }

  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new PluginNotFoundError(pluginId);
    }

    await plugin.lifecycle.onEnable();
    this.enabledPlugins.add(pluginId);
  }

  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new PluginNotFoundError(pluginId);
    }

    await plugin.lifecycle.onDisable();
    this.enabledPlugins.delete(pluginId);
  }

  private registerHooks(plugin: Plugin): void {
    for (const [hookName, handler] of Object.entries(plugin.hooks)) {
      if (handler && this.hooks.has(hookName)) {
        this.hooks.get(hookName)!.push(handler);
      }
    }
  }

  private unregisterHooks(plugin: Plugin): void {
    for (const hookName of Object.keys(plugin.hooks)) {
      const handlers = this.hooks.get(hookName);
      if (handlers) {
        const index = handlers.findIndex(h =>
          plugin.hooks[hookName as keyof PluginHooks] === h
        );
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  async executeHooks(hookName: string, context: HookContext): Promise<HookContext> {
    const handlers = this.hooks.get(hookName) || [];
    let currentContext = context;

    for (const handler of handlers) {
      if (this.enabledPlugins.has(handler.pluginId)) {
        currentContext = await handler(currentContext);
      }
    }

    return currentContext;
  }

  private async checkDependencies(plugin: Plugin): Promise<void> {
    for (const depId of plugin.dependencies) {
      if (!this.plugins.has(depId)) {
        throw new MissingDependencyError(plugin.id, depId);
      }
    }
  }

  private async checkPermissions(plugin: Plugin): Promise<void> {
    const allowed = this.config.allowedPermissions || [];
    const requested = plugin.permissions.map(p => p.name);

    for (const permission of requested) {
      if (!allowed.includes(permission)) {
        throw new UnauthorizedPermissionError(plugin.id, permission);
      }
    }
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.enabledPlugins).map(id => this.plugins.get(id)!);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

interface HookContext {
  [key: string]: any;
}

interface Permission {
  name: string;
  description?: string;
}
```

## 3. 技能系统 (Skill System)

技能系统管理和执行 Agent 的技能。

```typescript
// 技能定义
interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  trigger: SkillTrigger;
  steps: SkillStep[];
  parameters: SkillParameter[];
  returns: SkillReturn;
  examples?: SkillExample[];
}

type SkillCategory = 'web' | 'code' | 'data' | 'communication' | 'system' | 'custom';

interface SkillTrigger {
  type: 'keyword' | 'pattern' | 'intent' | 'event';
  config: any;
}

interface SkillStep {
  id: string;
  action: SkillAction;
  condition?: StepCondition;
  retry?: StepRetry;
}

interface SkillAction {
  type: 'tool' | 'http' | 'transform' | 'condition';
  config: any;
}

interface StepCondition {
  field: string;
  operator: string;
  value: any;
}

interface StepRetry {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
}

// 技能执行器
class SkillExecutor {
  private skills: Map<string, Skill> = new Map();
  private skillMatcher: SkillMatcher;
  private contextBuilder: ContextBuilder;

  constructor(config: SkillConfig) {
    this.skillMatcher = new SkillMatcher();
    this.contextBuilder = new ContextBuilder();
  }

  async execute(skillId: string, input: any, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(skillId);

    if (!skill) {
      throw new SkillNotFoundError(skillId);
    }

    const startTime = Date.now();
    const results: StepResult[] = [];

    for (const step of skill.steps) {
      // 检查条件
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        results.push({
          stepId: step.id,
          success: false,
          skipped: true
        });
        continue;
      }

      // 执行步骤
      const stepResult = await this.executeStep(step, input, context);
      results.push(stepResult);

      if (!stepResult.success && !step.retry) {
        break;
      }
    }

    return {
      skillId,
      success: results.every(r => r.success),
      results,
      duration: Date.now() - startTime
    };
  }

  private async executeStep(
    step: SkillStep,
    input: any,
    context: SkillContext
  ): Promise<StepResult> {
    let attempts = 0;
    const maxAttempts = step.retry?.maxAttempts || 1;

    while (attempts < maxAttempts) {
      try {
        const result = await this.executeAction(step.action, input, context);

        return {
          stepId: step.id,
          success: true,
          output: result
        };
      } catch (error) {
        attempts++;

        if (attempts >= maxAttempts) {
          return {
            stepId: step.id,
            success: false,
            error: error as Error
          };
        }

        // 等待重试
        const delay = this.calculateRetryDelay(step.retry!, attempts);
        await this.sleep(delay);
      }
    }

    return {
      stepId: step.id,
      success: false
    };
  }

  private async executeAction(
    action: SkillAction,
    input: any,
    context: SkillContext
  ): Promise<any> {
    switch (action.type) {
      case 'tool':
        return this.executeTool(action.config, input, context);

      case 'http':
        return this.executeHTTP(action.config, input, context);

      case 'transform':
        return this.transformData(action.config, input);

      case 'condition':
        return this.evaluateCondition(action.config, context);

      default:
        throw new UnknownActionTypeError(action.type);
    }
  }

  private async executeTool(
    config: any,
    input: any,
    context: SkillContext
  ): Promise<any> {
    // 调用工具
    return {};
  }

  private async executeHTTP(
    config: any,
    input: any,
    context: SkillContext
  ): Promise<any> {
    // HTTP 请求
    return {};
  }

  private transformData(config: any, input: any): any {
    // 数据转换
    return input;
  }

  private evaluateCondition(condition: any, context: SkillContext): boolean {
    // 条件评估
    return true;
  }

  private calculateRetryDelay(retry: StepRetry, attempt: number): number {
    if (retry.backoff === 'exponential') {
      return retry.delay * Math.pow(2, attempt - 1);
    }
    return retry.delay * attempt;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  async match(input: any, context: SkillContext): Promise<Skill[]> {
    return this.skillMatcher.match(input, context, this.skills);
  }

  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getSkillsByCategory(category: SkillCategory): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.category === category);
  }
}

// 技能匹配器
class SkillMatcher {
  async match(
    input: any,
    context: SkillContext,
    skills: Map<string, Skill>
  ): Promise<Skill[]> {
    const matches: Array<{ skill: Skill; score: number }> = [];

    for (const skill of skills.values()) {
      const score = await this.calculateMatchScore(skill, input, context);
      if (score > 0.5) {
        matches.push({ skill, score });
      }
    }

    return matches.sort((a, b) => b.score - a.score).map(m => m.skill);
  }

  private async calculateMatchScore(
    skill: Skill,
    input: any,
    context: SkillContext
  ): Promise<number> {
    switch (skill.trigger.type) {
      case 'keyword':
        return this.matchKeyword(skill.trigger.config, input);

      case 'pattern':
        return this.matchPattern(skill.trigger.config, input);

      case 'intent':
        return this.matchIntent(skill.trigger.config, context);

      default:
        return 0;
    }
  }

  private matchKeyword(config: any, input: any): number {
    const keywords = config.keywords || [];
    const text = typeof input === 'string' ? input : JSON.stringify(input);

    let matches = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) matches++;
    }

    return matches / keywords.length;
  }

  private matchPattern(config: any, input: any): number {
    const pattern = new RegExp(config.pattern);
    return pattern.test(input.toString()) ? 1 : 0;
  }

  private async matchIntent(config: any, context: SkillContext): Promise<number> {
    // 基于意图匹配
    return context.intent === config.intent ? 1 : 0;
  }
}

interface SkillContext {
  [key: string]: any;
}

interface SkillResult {
  skillId: string;
  success: boolean;
  results: StepResult[];
  duration: number;
}

interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: Error;
  skipped?: boolean;
}
```

## 4. API 网关 (API Gateway)

API 网关管理外部 API 的访问。

```typescript
// API 端点
interface APIEndpoint {
  path: string;
  method: string;
  handler: RequestHandler;
  middleware: Middleware[];
  rateLimit?: RateLimitConfig;
  auth?: AuthConfig;
}

// API 网关
class APIGateway {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private middleware: Middleware[] = [];
  private rateLimiter: RateLimiter;
  private authenticator: Authenticator;

  constructor(config: GatewayConfig) {
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.authenticator = new Authenticator(config.auth);
  }

  register(endpoint: APIEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  async handle(request: Request): Promise<Response> {
    const key = `${request.method}:${request.path}`;
    const endpoint = this.endpoints.get(key);

    if (!endpoint) {
      return this.notFound();
    }

    // 认证检查
    if (endpoint.auth) {
      const authResult = await this.authenticator.authenticate(request, endpoint.auth);
      if (!authResult.success) {
        return this.unauthorized(authResult.message);
      }
    }

    // 速率限制
    if (endpoint.rateLimit) {
      const limitResult = await this.rateLimiter.check(request, endpoint.rateLimit);
      if (!limitResult.allowed) {
        return this.rateLimitExceeded(limitResult);
      }
    }

    // 中间件链
    const context = await this.executeMiddleware(request);

    // 端点处理器
    try {
      const result = await endpoint.handler(context);
      return this.ok(result);
    } catch (error) {
      return this.internalError(error as Error);
    }
  }

  private async executeMiddleware(request: Request): Promise<RequestContext> {
    let context: RequestContext = { request };

    for (const mw of this.middleware) {
      context = await mw.execute(context);
    }

    return context;
  }

  private ok(data: any): Response {
    return {
      status: 200,
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  private notFound(): Response {
    return {
      status: 404,
      body: JSON.stringify({ error: 'Not found' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  private unauthorized(message: string): Response {
    return {
      status: 401,
      body: JSON.stringify({ error: message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  private rateLimitExceeded(info: LimitResult): Response {
    return {
      status: 429,
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: info.retryAfter
      }),
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(info.retryAfter)
      }
    };
  }

  private internalError(error: Error): Response {
    return {
      status: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
}

// 速率限制器
class RateLimiter {
  private limits: Map<string, number> = new Map();
  private timestamps: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  async check(request: Request, limit: RateLimitConfig): Promise<LimitResult> {
    const key = this.getKey(request);

    const now = Date.now();
    const windowMs = limit.windowMs || 60000;
    const maxRequests = limit.maxRequests || 100;

    // 获取时间窗口内的请求
    const times = this.timestamps.get(key) || [];
    const validTimes = times.filter(t => now - t < windowMs);

    if (validTimes.length >= maxRequests) {
      const oldestTime = validTimes[0];
      const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter
      };
    }

    // 记录新请求
    validTimes.push(now);
    this.timestamps.set(key, validTimes);

    return {
      allowed: true,
      remaining: maxRequests - validTimes.length,
      retryAfter: 0
    };
  }

  private getKey(request: Request): string {
    return request.ip || request.headers['x-api-key'] || 'anonymous';
  }
}

// 认证器
class Authenticator {
  async authenticate(request: Request, config: AuthConfig): Promise<AuthResult> {
    const token = this.extractToken(request);

    if (!token) {
      return { success: false, message: 'No token provided' };
    }

    // 验证令牌
    const valid = await this.verifyToken(token, config);

    if (!valid) {
      return { success: false, message: 'Invalid token' };
    }

    return { success: true };
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return request.headers['x-api-key'] || null;
  }

  private async verifyToken(token: string, config: AuthConfig): Promise<boolean> {
    // 令牌验证逻辑
    return true;
  }
}

interface Middleware {
  execute(context: RequestContext): Promise<RequestContext>;
}

interface RequestContext {
  request: Request;
  [key: string]: any;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface AuthConfig {
  type: 'bearer' | 'apikey' | 'oauth';
  // 其他配置
}

interface Request {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  ip?: string;
}

interface Response {
  status: number;
  body: string;
  headers: Record<string, string>;
}

interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

interface AuthResult {
  success: boolean;
  message?: string;
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Model Context Protocol 文档](https://modelcontextprotocol.io/) | MCP 官方入口，先弄清客户端与服务器角色及工具调用全貌。 | 读 Introduction 并跑通 quickstart，画出一次工具调用时序，再对照自己的接入场景。 |
| [MCP 规范（最新版本）](https://modelcontextprotocol.io/specification/latest) | 规范定义消息语义与版本差异，是排查兼容问题的最终依据。 | 查版本变更记录，确认 SDK 对应协议版本与能力协商字段是否一致。 |
| [MCP Tools 概念](https://modelcontextprotocol.io/docs/concepts/tools) | 工具是 MCP 最常用的扩展点，讲清 schema 与调用契约。 | 为一个真实 API 写 tool schema，含描述与输入校验，再让模型试调一次。 |
| [Plugin API](https://vite.dev/guide/api-plugin) | 插件 API 导览，说明插件形态、注册方式与生命周期。 | 按目录读 guide/api-plugin.md，边读边记关键钩子出现的时机。 |
| [Plugin API](https://rolldown.rs/apis/plugin-api) | API 参考逐项列出钩子签名与参数，写插件时的常查字典。 | 先查你要用的钩子签名与返回值约定，再补全插件实现。 |
| [Claude Agent SDK 概览](https://docs.claude.com/en/api/agent-sdk/overview) | SDK 把工具调用封装成可编程接口，适合做最小可运行实验。 | 写一个读本地目录并总结的小 Agent，观察工具调用日志与终止条件。 |
| [502 Bad Gateway](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/502) | 网关最常见错误码，理解上游失败如何被代理层呈现。 | 读成因与排查一节，对照自己网关日志定位一次真实报错。 |
| [504 Gateway Timeout](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/504) | 超时是网关与上游的边界问题，直接决定重试与熔断策略。 | 读 504 成因，检查网关超时配置与上游响应时间是否匹配。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | 真实接入案例，能看清 MCP 在编码 Agent 中如何落地。 | 接一个文件系统或 GitHub 服务器，完成任务并观察权限提示与调用日志。 |
| [anthropics/skills 仓库](https://github.com/anthropics/skills) | 官方技能仓库，目录结构本身就是技能约定的最佳范例。 | 读两个官方 skill 的结构与说明文件，仿写一个自己的技能并试运行。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Vite：插件 API（中文）](https://cn.vitejs.dev/guide/api-plugin.html) | 中文教程动手成本低，是建立插件直觉的最快路径。 | 写一个 transform 钩子插件并打印执行顺序，观察钩子何时被调用。 |
| [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) | 以 Babel 插件讲透访问者模式这一插件系统通用范式。 | 读 Plugin Handbook，回答访问者如何遍历 AST，再写删除 console.log 的插件。 |
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 上下文工程方法，决定技能与工具描述怎么写才不浪费 token。 | 读完检查自己的 Agent 提示，删掉重复上下文并记录 token 变化。 |
| [Richardson Maturity Model（Martin Fowler）](https://martinfowler.com/articles/richardsonMaturityModel.html) | 用成熟度模型判断网关暴露的 API 设计是否值得抽象。 | 评估现有 API 处在第几级，写出升一级需要改动哪些接口。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
|---|---|---|---|
| 后台管理的万行表格导出 | 技能系统 + API 网关 | 前端虚拟滚动，网关提供同步与异步两条导出接口 | 单次导出行数设上限，超时返回任务 ID 供轮询 |
| 低端安卓机首次启动 | 插件系统 | 启动只装核心插件，其余按页面或命令加载 | 插件清单要能在无网时读本地缓存 |
| 多人协作白板里的 Agent 助手 | MCP 协议 | 白板接口包成 MCP server，走长连接推送变更 | 写操作带幂等键，重试不会重复插入图形元素 |
| 客服工单自动分类 | MCP 协议 + 技能系统 | MCP server 包装工单系统的查询与打标接口 | 按工单队列做权限隔离，越权请求直接拒绝 |
| 电商大促风控规则热更新 | 插件系统 + API 网关 | 网关插件链挂载风控插件，按版本切换 | 插件加载失败要回退到默认规则集 |
| 内部开发者门户接多个 SaaS | API 网关 + MCP 协议 | 网关统一鉴权，MCP server 封装各 SaaS 工具 | 令牌不下发到浏览器，只在服务端换取 |
| CI 流水线里的代码审查 Agent | 技能系统 | 审查技能包按仓库提交哈希锁定版本 | 技能升级要能回滚，否则审查结论不可复现 |
| 桌面 IDE 插件市场 | 插件系统 | 插件清单声明权限与激活事件 | 权限按最小集申请，安装前向用户展示 |

### 三个场景拆解

#### 场景 1：客服工单自动分类接入工单系统

**业务背景**：客服 Agent 要读取工单系统里待处理的工单，按队列和历史标签分类。工单量随活动波动，峰值时每分钟新增条数是平峰的十倍量级，靠人工刷新页面跟不上。

**怎么用本页知识解决**：把工单系统的查询和打标能力包成 MCP 工具，Agent 只看到工具名与参数，不接触工单系统的鉴权细节。工具在服务端做权限校验、条数上限和幂等处理。

```python
# 伪代码：MCP server 注册两个工单工具
@mcp.tool(name="ticket.search")            # 向 Agent 暴露工具名与参数说明
def search_ticket(queue: str, limit: int = 20):
    assert queue in caller.allowed_queues  # 调用方只能查自己授权的队列
    limit = min(limit, 50)                 # 卡住返回条数，避免撑爆模型上下文
    rows = ticket_db.query(queue, limit)   # 只取分类需要的字段
    return [{"id": r.id, "title": r.title, "tags": r.tags} for r in rows]

@mcp.tool(name="ticket.tag")
def tag_ticket(ticket_id: str, tag: str, idem_key: str):
    if seen(idem_key):                     # 幂等键去重，重试不重复打标
        return {"ok": True}
    return ticket_db.tag(ticket_id, tag)
```

- 工具名用「动作.对象」形式，Agent 读描述就能判断该调哪个。
- 队列白名单写在服务端，模型改参数也越不了权。
- `limit` 在服务端再夹一次，模型传 1000 也只返回 50 条。
- 写操作要求带 `idem_key`，网络重试不会产生重复标签。
- 返回值只保留分类需要的字段，减少无关信息占用上下文。

**怎么度量收益**：

- 工具调用成功率：MCP server 日志按 `tool_name` 分组统计成功与失败条数。
- 单条工单处理耗时：用日志时间戳相减，算 `ticket.search` 发起至 `ticket.tag` 返回的 P50 与 P95。
- 人工介入率：统计被人工改写标签的工单占比，数据来自工单系统的操作审计表。
- 越权拦截次数：服务端断言失败计数，接 Grafana 看板。

**什么时候不该用**：

- 分类逻辑与调用方在同一进程内，包一层 MCP 只多一次网络跳数。
- 延迟预算在毫秒级、必须同步返回的调用，走协议栈不划算。

#### 场景 2：后台管理的万行表格导出

**业务背景**：运营在后台筛选订单后导出表格，筛选条件多变，导出行数从几千到几十万。原接口同步拼 SQL 再序列化，页面等待超过网关超时时间就断开，用户拿不到结果也看不到原因。

**怎么用本页知识解决**：把导出做成可注册、可版本化的技能，网关负责限流、鉴权和超时控制。超过行数阈值的导出走异步任务，先返回任务 ID，客户端轮询结果。

```yaml
# 伪代码：API 网关路由与插件配置片段
routes:
  - path: /api/orders/export
    plugins: [rate-limit, auth]   # 限流加鉴权，挡住重复点击与未登录请求
    rate_limit: 1/minute          # 按用户维度计数
    timeout: 10s                  # 同步接口只等 10 秒，超时快速失败
  - path: /api/orders/export/async
    plugins: [rate-limit, auth]
    rate_limit: 5/minute          # 异步入口放宽，避免用户建不了任务
    timeout: 3s                   # 只负责落任务并返回任务 ID
```

- 同步与异步拆成两条路由，前端先调同步，收到超时错误码再调异步。
- 限流放在网关，后端服务不必为每个接口重复实现计数器。
- 鉴权插件把用户 ID 注入请求头，下游按 ID 过滤数据，避免全表扫描。
- 导出技能注册时声明最大行数与字段范围，超范围直接拒绝而不是截断。
- 任务落库后由后台 worker 消费，客户端轮询任务状态接口。

**怎么度量收益**：

- 网关侧看 `http_request_duration_seconds` 的 P95 与 P99，按 `path` 标签分组，用 Prometheus 加 Grafana。
- 超时率：网关访问日志里状态码 504 的条数除以总条数。
- 任务排队时长：任务表 `created_at` 到 `finished_at` 的差值分布。
- 重复点击次数：限流插件的拒绝计数，观察前端改动后是否下降。

**什么时候不该用**：

- 内网批处理脚本自己拉数据，不经过用户请求链路，加网关只多一层配置。
- 导出量固定且小于单页大小，同步接口够用，异步反而让用户多点两次。

#### 场景 3：桌面客户端的插件按需加载

**业务背景**：桌面客户端安装包随功能增加变大，用户首次启动要等全部模块初始化。低配机器上首屏可交互时间随模块数增加而拉长，冷启动体验下滑。

**怎么用本页知识解决**：非首屏功能拆成插件，启动只加载核心插件，进入对应页面或触发对应命令时再拉取插件包。插件清单声明激活条件与权限，加载失败降级到占位提示。

```jsonc
// 伪代码：客户端插件清单
{
  "core": ["shell", "settings"],        // 启动即加载，决定窗口能否出现
  "lazy": {                             // 按激活条件加载的插件
    "chart":  { "activateOn": "route:/report" },
    "export": { "activateOn": "command:export" }
  },
  "permissions": ["fs.read:workspace"], // 插件声明的权限，安装前展示给用户
  "fallback": "show-placeholder"        // 加载失败显示占位，不白屏
}
```

- 核心插件只留窗口框架和设置页，启动路径上的模块数减少。
- `activateOn` 把加载时机交给路由与命令，用户不进该页面就不下载。
- 权限写在清单里，安装或首次启用时展示，运行时不临时提权。
- 加载失败走 `fallback`，用户看到占位与重试按钮，功能缺失不外溢到主界面。
- 插件声明兼容的主程序版本区间，不匹配时拒绝加载并提示升级。

**怎么度量收益**：

- 冷启动可交互时间：用 Chrome DevTools Performance 面板录制启动过程，读 `First Contentful Paint` 与 `Time to Interactive`。
- 首屏加载的插件数与字节数：用构建产物体积分析工具（如 webpack-bundle-analyzer）看各 chunk 大小。
- 插件加载失败率：客户端埋点上报 `plugin_load_result`，按插件名分组。
- 页面切换等待占比：统计路由切换开始到插件就绪的耗时分布。

**什么时候不该用**：

- 首屏就要用到的功能拆成懒加载，用户点击后多等一次网络往返。
- 插件之间共享状态频繁，拆包后跨插件通信成本高于省下的加载时间。

### 行业先进实践

1. 用 MCP 统一外部工具接入（出处：Model Context Protocol 官方文档）
   把外部系统的读接口包成 MCP server，工具名、参数、返回结构由 server 声明，客户端只做发现与调用。接入逻辑集中在一处，换客户端不用重写适配层。借鉴时先做一个只读工具，跑通再扩写操作。
   需核对官方文档：当前协议版本号，以及支持的传输方式在文档里的确切名称。

2. 插件清单声明权限与激活事件（出处：Visual Studio Code 官方文档 Extension Manifest）
   扩展在清单文件里声明激活事件与能力范围，宿主按声明决定何时加载、能访问哪些接口。加载时机和权限都能静态检查，用户安装前看得到扩展要什么。借鉴时把权限收成白名单枚举，不接受字符串通配。
   需核对官方文档：清单中权限与能力字段的确切名称。

3. 网关层统一鉴权与限流（出处：Envoy 官方文档 HTTP filters 章节 / Kubernetes Gateway API 官方文档）
   令牌校验与计数放在网关过滤器链，后端服务只读网关注入的身份头。策略改动只动一处配置，服务不用逐个发版。借鉴时先给一个接口接上网关，用压测对比接入前后的失败率再铺开。

4. 技能包以目录形式版本化（出处：Anthropic Agent Skills 官方文档）
   一个技能放一个目录，带说明文件与可选脚本，宿主按目录加载。技能可以像代码一样评审、锁定版本。借鉴时把技能目录纳入仓库，用提交哈希标记版本。
   需核对官方文档：技能目录必须包含的文件名与元数据字段。

5. 灰度发布放在网关做（出处：Istio 官方文档 Traffic Management 章节）
   按请求头或权重把流量分到不同版本的服务，出问题时改权重回滚。回滚动作是改配置而不是重新部署。借鉴时给每个插件版本留一个可回退的权重位。

### 从学到用：落地路线

1. 第 1 步定点试点：选一个只读内部查询接口，包成 MCP 工具或注册成技能。验收标准：该工具能被 Agent 发现并成功调用一次，日志里有工具名与耗时。
2. 第 2 步量化验证：用同一批请求对比接入前后的成功率与 P95 耗时。验收标准：留下两份可复现的测量记录，差异方向与预期一致，或能说清偏差原因。
3. 第 3 步横向推广：把鉴权与限流下沉到网关，插件与技能按清单声明权限。验收标准：新增接口的改动只涉及配置与清单，不改动已有服务代码。
4. 第 4 步防止回退：把工具清单、插件权限、技能版本纳入仓库评审并接入 CI。验收标准：清单缺字段或权限超范围时，流水线失败。

### 动手作业

**目标**：写一个本地 MCP server，暴露两个工具（一个只读查询、一个带幂等键的写操作），用最小客户端调用它们；同一个写请求重试两次，表里只留一条记录。

**步骤**：

1. 建一张 SQLite 表，字段为 id、title、tag、idem_key，给 idem_key 加唯一索引。
2. 写 MCP server，注册 `note.search` 与 `note.tag`，把参数类型和是否必填写进工具描述。
3. 在 `note.tag` 里先按 idem_key 查表，命中直接返回，未命中再插入。
4. 写最小客户端，依次调用两个工具，打印每次调用的入参与返回。
5. 用同一个 idem_key 连续调用 `note.tag` 两次，观察返回内容与表内行数。
6. 给 `note.search` 加返回条数上限，传一个超过上限的值，确认返回被夹住。
7. 记录每次调用耗时，输出一张按工具名分组的统计表。

**验收标准**：

- 客户端能列出两个工具的名称与参数说明，说明里看得到类型与是否必填。
- 同一个 idem_key 调用两次后，`note` 表中该 key 对应行数为 1。
- 传入超过上限的条数参数时，实际返回行数等于上限值。
- 统计表按工具名分组，每组给出调用次数、成功次数、耗时中位数。
- 删掉 idem_key 唯一索引后重跑第 5 步能看到重复行，证明索引在起作用。

