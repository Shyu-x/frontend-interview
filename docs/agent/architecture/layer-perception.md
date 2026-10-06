---
title: 感知层
description: Agent 分层架构之感知层：输入解析、多模态感知与上下文采集。
tags:
  - ai-agent
  - langchain
date: 2026-05-17
---

# 感知层

感知层是 AI Agent 的"感官系统"，负责将各种输入源（文本、语音、代码等）转换为系统可处理的标准化格式。这一层决定了 Agent 理解世界的基础能力。

## 1. 输入解析器 (Input Parser)

输入解析器是多模态输入的处理核心，它统一处理来自不同渠道的原始数据。

```typescript
// 输入类型定义
interface InputSource {
  type: 'text' | 'voice' | 'code' | 'image' | 'file';
  raw: string | ArrayBuffer;
  metadata: {
    timestamp: number;
    source: string;
    userId?: string;
    sessionId: string;
  };
}

interface ParsedInput {
  normalizedText: string;
  language?: string;
  format?: 'markdown' | 'json' | 'xml' | 'plain';
  entities: ExtractedEntity[];
  embeddings?: number[];
}

// 核心解析器类
class InputParser {
  private parsers: Map<string, Parser> = new Map();
  private preprocessors: Preprocessor[] = [];

  constructor() {
    this.registerDefaultParsers();
  }

  private registerDefaultParsers(): void {
    // 文本解析器
    this.parsers.set('text', new TextParser());

    // 代码解析器
    this.parsers.set('code', new CodeParser());

    // 语音解析器（ASR输出）
    this.parsers.set('voice', new VoiceParser());

    // 图像解析器（OCR输出）
    this.parsers.set('image', new ImageParser());

    // 文件解析器
    this.parsers.set('file', new FileParser());
  }

  async parse(input: InputSource): Promise<ParsedInput> {
    // 预处理
    let normalized = await this.preprocess(input.raw);

    // 选择对应解析器
    const parser = this.parsers.get(input.type);
    if (!parser) {
      throw new UnsupportedInputTypeError(input.type);
    }

    // 解析
    const parsed = await parser.parse(normalized, input.metadata);

    // 后处理
    return this.postprocess(parsed);
  }

  private async preprocess(raw: string | ArrayBuffer): Promise<string> {
    for (const preprocessor of this.preprocessors) {
      raw = await preprocessor.process(raw);
    }
    return raw as string;
  }

  private async postprocess(parsed: ParsedInput): Promise<ParsedInput> {
    // 规范化处理
    parsed.normalizedText = this.normalizeWhitespace(parsed.normalizedText);
    parsed.normalizedText = this.removeHiddenCharacters(parsed.normalizedText);

    // 实体提取
    parsed.entities = await this.extractEntities(parsed.normalizedText);

    return parsed;
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  private removeHiddenCharacters(text: string): string {
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
}

// 文本解析器实现
class TextParser implements Parser {
  async parse(raw: string, metadata: InputSource['metadata']): Promise<ParsedInput> {
    return {
      normalizedText: raw.trim(),
      format: this.detectFormat(raw),
      language: this.detectLanguage(raw),
      entities: []
    };
  }

  private detectFormat(text: string): 'markdown' | 'json' | 'xml' | 'plain' {
    const trimmed = text.trim();

    if (/^\s*[{[]/.test(trimmed)) return 'json';
    if (/^\s*<[a-zA-Z]/.test(trimmed)) return 'xml';
    if (/^#{1,6}\s/m.test(trimmed) || /\*\*[^*]+\*\*/.test(trimmed)) return 'markdown';

    return 'plain';
  }

  private detectLanguage(text: string): string {
    // 基于字符集和模式检测语言
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    return chineseChars / totalChars > 0.3 ? 'zh' : 'en';
  }
}

// 代码解析器实现
class CodeParser implements Parser {
  private languageDetectors: Map<string, RegExp> = new Map([
    ['typescript', /:\s*(string|number|boolean|any)\b|interface\s+\w+|<\w+>/],
    ['python', /def\s+\w+|import\s+\w+|:\s*$/m],
    ['rust', /fn\s+\w+|let\s+mut|impl\s+\w+/],
    ['go', /func\s+\w+|package\s+\w+|:\s*\w+\s*{/],
    ['java', /public\s+(class|static)|void\s+\w+\(/],
  ]);

  async parse(raw: string, metadata: InputSource['metadata']): Promise<ParsedInput> {
    const language = this.detectLanguage(raw);
    const codeBlocks = this.extractCodeBlocks(raw);

    return {
      normalizedText: this.normalizeCode(raw),
      language,
      entities: codeBlocks
    };
  }

  private detectLanguage(code: string): string {
    for (const [lang, pattern] of this.languageDetectors) {
      if (pattern.test(code)) return lang;
    }
    return 'unknown';
  }

  private extractCodeBlocks(text: string): ExtractedEntity[] {
    const blocks: ExtractedEntity[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        type: 'code_block',
        language: match[1] || 'plain',
        content: match[2],
        position: { start: match.index, end: match.index + match[0].length }
      });
    }

    return blocks;
  }

  private normalizeCode(code: string): string {
    return code
      .replace(/```\w*\n?/g, '')  // 移除代码块标记
      .replace(/^\s+$/gm, '')      // 移除空行
      .trim();
  }
}
```

## 2. 上下文提取器 (Context Extractor)

上下文提取器负责从输入中识别和提取关键信息，为后续处理提供结构化的上下文数据。

```typescript
// 第 1 段：顶层上下文契约（Context）——整个提取器的"出口数据结构"
// 设计意图：把"这一轮对话要用的全部状态"收敛成一个不可变快照传给下游（规划器/执行器），
// 下游只读它、不回头再查 session，从而避免隐式全局状态。entities/references 由后面的
// 阶段填充，所以这里先给空容器（Map/[]），保证 Context 一创建就是"结构完整、内容待补"的。
interface Context {
  session: SessionContext;      // 会话级状态：历史、轮次、上一轮意图/话题
  user: UserContext;            // 用户级状态：偏好、权限、画像特征
  task: TaskContext;            // 本轮任务级状态：类型、要求、约束
  entities: Map<string, EntityValue>;   // 实体表，用 Map 而非对象：key 可能含任意字符串且需高频查改
  references: Reference[];      // 代词/省略指代的解析结果，与 entities 分离便于单独回溯
}

// 第 2 段：会话上下文（SessionContext）——跨轮次的"短期记忆"
// 为什么单拎出来：history 会随轮次线性增长，是内存与延迟的主要来源；
// turnCount 与 lastIntent/lastTopic 则是给"指代消解"和"意图继承"用的轻量线索，
// 代价 O(1)，因此即使不重放整个 history 也能做基本的上下文延续。
interface SessionContext {
  id: string;
  history: Message[];
  turnCount: number;
  lastIntent?: string;   // 可选：首轮无历史，用 undefined 表示"无先验"，而非空字符串
  lastTopic?: string;
}

// 第 3 段：用户上下文（UserContext）——跨会话的"长期记忆"
// 与 SessionContext 的关键区别：这份数据来自外部用户画像系统（见 extractUserContext），
// 属于慢变数据，通常可缓存；permissions 参与后续的安全裁决，缺失会导致越权，
// 所以提取阶段宁可让上游报错，也不做静默兜底。
interface UserContext {
  id: string;
  preferences: UserPreferences;
  permissions: Permission[];
  characteristics: UserCharacteristics;
}

// 第 4 段：任务上下文（TaskContext）——从本轮输入推导出的"意图结构化结果"
// requirements 是"用户想要的"（如"前 10 条""输出 JSON"），constraints 是"不能违反的"，
// 两者语义不同不能合并；deadline 用可选数字时间戳，表示"可执行的任务"才有截止时间。
interface TaskContext {
  type: TaskType;
  requirements: Requirement[];
  constraints: Constraint[];
  deadline?: number;
}

// 上下文提取器
// 第 5 段：ContextExtractor 的字段——策略可插拔的依赖注入点
// 用意：把"实体识别"和"指代消解"做成可注册的数组，算法升级时只替换策略对象，
// 不改 extract 主流程（开闭原则）。注意这两个数组在构造后按顺序被遍历，顺序即优先级。
class ContextExtractor {
  private entityExtractors: EntityExtractor[] = [];
  private referenceResolvers: ReferenceResolver[] = [];

  // 第 6 段：extract —— 主流程编排（唯一对外入口）
  // 数据流：session 直接透传 → 并发/串行拉取 user 与 task → 建空 Context →
  //         实体提取填充 entities → 指代消解填充 references → 返回完整快照。
  // 易错点：entities 必须早于 references 完成，因为消解"它/那个"要查实体表；
  // 因此这里的 await 顺序是有依赖的，不能为了提速而并行成 Promise.all。
  async extract(input: ParsedInput, session: SessionContext): Promise<Context> {
    const context: Context = {
      session,   // 直接引用而非深拷贝：session 是上游持有的可变状态，拷贝反而会丢增量
      user: await this.extractUserContext(session.userId),
      task: await this.extractTaskContext(input),
      entities: new Map(),   // 占位，下一步被整体替换
      references: []
    };

    // 实体提取
    context.entities = await this.extractEntities(input, context);   // 整体赋值，避免浅合并的残留脏数据

    // 引用解析
    context.references = await this.resolveReferences(input, context);   // 依赖上一步的 entities，必须串行

    return context;
  }

  // 第 7 段：extractUserContext —— 外部画像数据的"投影"
  // 为什么只挑偏好/权限/特征：画像系统返回的字段远多于本轮所需，
  // 在这里做一次收窄（projection）可以让下游对 UserContext 的依赖稳定，
  // 画像系统加字段时不会污染上下文体积。I/O 边界只有一个 await，失败应向上抛。
  private async extractUserContext(userId: string): Promise<UserContext> {
    // 从用户画像系统获取
    const userProfile = await this.userProfileService.getProfile(userId);

    return {
      id: userId,
      preferences: userProfile.preferences,
      permissions: userProfile.permissions,
      characteristics: userProfile.characteristics
    };
  }

  // 第 8 段：extractTaskContext —— 三段式推导：意图 → 要求 → 约束
  // 顺序无关，但三者的输入都只是 input（不依赖 user），所以此处本身可以并行；
  // 真正串行的是 mapIntentToTaskType，它把意图枚举映射成任务类型枚举，
  // 两套枚举分离是为了让"用户怎么说"与"系统怎么做"解耦（意图可多对一）。
  private async extractTaskContext(input: ParsedInput): Promise<TaskContext> {
    const intent = this.classifyIntent(input);
    const requirements = this.extractRequirements(input);
    const constraints = this.extractConstraints(input);

    return {
      type: this.mapIntentToTaskType(intent),
      requirements,
      constraints
    };
  }

  // 第 9 段：classifyIntent —— 基于规则的动作词匹配（first-match-wins）
  // 为什么用规则而不是模型：动作词在句首、集合封闭、延迟要求高，规则 O(模式数) 且可解释可回归。
  // 关键点：数组顺序即优先级，命中即 return，所以更具体的模式必须排在更泛的模式之前。
  // 易错点：只匹配句首（^），因此依赖 input.normalizedText 已做前处理（去空格/寒暄），
  // "帮我删除"这类前缀会让规则失效；兜底 'general' 保证永远有返回值，调用方无需判空。
  private classifyIntent(input: ParsedInput): Intent {
    // 基于规则的意图分类
    const intentPatterns: Array<{ pattern: RegExp; intent: Intent }> = [
      { pattern: /^(搜索|查找|找)/, intent: 'search' },
      { pattern: /^(创建|新增|添加)/, intent: 'create' },
      { pattern: /^(修改|更新|编辑)/, intent: 'update' },
      { pattern: /^(删除|移除)/, intent: 'delete' },
      { pattern: /^(解释|说明|什么是)/, intent: 'explain' },
      { pattern: /^(比较|对比)/, intent: 'compare' },
      { pattern: /^(执行|运行|运行)/, intent: 'execute' },   // 易错点："运行"重复，疑似想写"跑"之类的同义词，属可清理项
    ];

    for (const { pattern, intent } of intentPatterns) {   // 顺序遍历，首个命中即胜出
      if (pattern.test(input.normalizedText)) {
        return intent;
      }
    }

    return 'general';   // 兜底分支：分类器不返回 undefined，避免下游到处判空
  }

  // 第 10 段：extractRequirements 之"数量类要求"——全局扫描多命中
  // 数据流：对每条正则做 matchAll，逐个命中压入 requirements，并保留 index 作为
  // 位置信息（下游排序/去重/高亮时要用）。
  // 复杂度：O(模式数 × 文本长度)；模式必须带 /g，否则 matchAll 会直接抛错（不是返回首个）。
  // 易错点：/g 正则有 lastIndex 状态，若把这些正则提到模块级复用，跨次调用会漏匹配，
  // 所以这里每次调用都新建字面量，是"越短命越安全"的刻意写法；
  // 另外 `(\d+)\s*个?` 会把时间、编号等任意数字也当成数量，是召回优先、精度次之的取舍。
  private extractRequirements(input: ParsedInput): Requirement[] {
    const requirements: Requirement[] = [];

    // 提取数量要求
    const quantityPatterns = [
      { pattern: /(\d+)\s*个?/g, type: 'quantity' },
      { pattern: /前\s*(\d+)/g, type: 'limit' },
      { pattern: /至少\s*(\d+)/g, type: 'minimum' },
    ];

    for (const { pattern, type } of quantityPatterns) {
      const matches = input.normalizedText.matchAll(pattern);   // matchAll 惰性迭代，全量收集需内层 for
      for (const match of matches) {
        requirements.push({
          type,
          value: parseInt(match[1]),        // 捕获组 1 即数字；parseInt 默认十进制、遇非数字截断
          position: match.index             // 易错点：TS 中 index 类型为 number | undefined，此处未做断言
        });
      }
    }

    // 第 11 段：extractRequirements 之"格式类要求"——判定式而非多次匹配
    // 与数量类的区别：格式是"有/无"的布尔语义，同一类只需一条记录，
    // 因此用 test() 做存在性判断，再用 search() 反查位置（search 不受 /g 的 lastIndex 影响）；
    // 注意 format 与正则右半段并非一一对应（/以 (JSON|XML|Markdown|表格)/ 统一写成 'json'），
    // 说明格式枚举被刻意粗化：下游只按 json/list 两种渲染器分发，丢失了具体格式的细节。
    const formatPatterns = [
      { pattern: /以\s*(JSON|XML|Markdown|表格)/gi, format: 'json' },   // /i：用户可能写小写 json
      { pattern: /输出\s*(列表|树形|层级)/gi, format: 'list' },
    ];

    for (const { pattern, format } of formatPatterns) {
      if (pattern.test(input.normalizedText)) {
        requirements.push({
          type: 'format',
          value: format,
          position: input.normalizedText.search(pattern)   // 边界：理论上不会为 -1，因为刚 test 通过
        });
      }
    }

    return requirements;   // 返回顺序：数量类在前、格式类在后，下游若按序展示会体现这种分组
  }
}
```
## 3. 意图识别器 (Intent Recognizer)

意图识别是感知层的核心功能，决定了系统如何理解和响应用户请求。

```typescript
// 意图定义
interface Intent {
  type: IntentType;
  confidence: number;
  parameters: Map<string, any>;
  slots: IntentSlot[];
  alternatives?: Intent[];
}

type IntentType =
  | 'search'
  | 'create'
  | 'update'
  | 'delete'
  | 'explain'
  | 'execute'
  | 'compare'
  | 'summarize'
  | 'translate'
  | 'analyze'
  | 'general';

interface IntentSlot {
  name: string;
  type: SlotType;
  value: any;
  source: 'extracted' | 'default' | 'inferred';
  confidence: number;
}

// 意图识别器
class IntentRecognizer {
  private model: IntentModel;
  private slotExtractors: Map<SlotType, SlotExtractor> = new Map();
  private confidenceThresholds = {
    high: 0.85,
    medium: 0.60,
    low: 0.40
  };

  constructor(config: IntentRecognizerConfig) {
    this.model = this.loadModel(config.modelPath);
    this.initializeSlotExtractors();
  }

  async recognize(input: ParsedInput, context: Context): Promise<Intent> {
    // 1. 初步意图分类
    const preliminaryIntent = await this.classify(input, context);

    // 2. 槽位填充
    const slots = await this.extractSlots(input, preliminaryIntent.type, context);

    // 3. 置信度校准
    const confidence = this.calibrateConfidence(preliminaryIntent, slots);

    // 4. 备选意图生成
    const alternatives = await this.generateAlternatives(input, context);

    return {
      type: preliminaryIntent.type,
      confidence,
      parameters: this.buildParameters(slots),
      slots,
      alternatives
    };
  }

  private async classify(input: ParsedInput, context: Context): Promise<{ type: IntentType; confidence: number }> {
    // 使用模型进行分类
    const embedding = await this.model.embed(input.normalizedText);

    // 上下文增强
    const contextEmbedding = this.enhanceWithContext(embedding, context);

    // 最近邻分类
    const predictions = await this.model.predict(contextEmbedding);

    // 解析预测结果
    const topPrediction = predictions[0];

    return {
      type: topPrediction.label as IntentType,
      confidence: topPrediction.score
    };
  }

  private async extractSlots(
    input: ParsedInput,
    intentType: IntentType,
    context: Context
  ): Promise<IntentSlot[]> {
    const slots: IntentSlot[] = [];

    // 根据意图类型确定需要的槽位
    const requiredSlots = this.getRequiredSlots(intentType);

    for (const slotDef of requiredSlots) {
      const extractor = this.slotExtractors.get(slotDef.type);
      if (!extractor) continue;

      const result = await extractor.extract(input, context);

      slots.push({
        name: slotDef.name,
        type: slotDef.type,
        value: result.value,
        source: result.source,
        confidence: result.confidence
      });
    }

    return slots;
  }

  private calibrateConfidence(
    preliminaryIntent: { type: IntentType; confidence: number },
    slots: IntentSlot[]
  ): number {
    let confidence = preliminaryIntent.confidence;

    // 槽位填充度调整
    const filledRatio = slots.filter(s => s.value !== null).length / slots.length;
    confidence *= 0.7 + (filledRatio * 0.3);

    // 槽位平均置信度调整
    const avgSlotConfidence = slots.reduce((sum, s) => sum + s.confidence, 0) / slots.length;
    confidence *= 0.8 + (avgSlotConfidence * 0.2);

    return Math.min(confidence, 1);
  }

  private getRequiredSlots(intentType: IntentType): SlotDefinition[] {
    const slotTemplates: Record<IntentType, SlotDefinition[]> = {
      search: [
        { name: 'query', type: 'text' },
        { name: 'target', type: 'entity' },
        { name: 'limit', type: 'number' },
        { name: 'filters', type: 'collection' }
      ],
      create: [
        { name: 'entity_type', type: 'category' },
        { name: 'properties', type: 'object' },
        { name: 'name', type: 'text' }
      ],
      update: [
        { name: 'target', type: 'entity' },
        { name: 'changes', type: 'object' }
      ],
      delete: [
        { name: 'target', type: 'entity' },
        { name: 'cascade', type: 'boolean' }
      ],
      explain: [
        { name: 'concept', type: 'entity' },
        { name: 'depth', type: 'enum' },
        { name: 'audience', type: 'category' }
      ],
      execute: [
        { name: 'action', type: 'text' },
        { name: 'params', type: 'object' }
      ],
      general: []
    };

    return slotTemplates[intentType] || [];
  }

  private initializeSlotExtractors(): void {
    this.slotExtractors.set('text', new TextSlotExtractor());
    this.slotExtractors.set('entity', new EntitySlotExtractor());
    this.slotExtractors.set('number', new NumberSlotExtractor());
    this.slotExtractors.set('boolean', new BooleanSlotExtractor());
    this.slotExtractors.set('category', new CategorySlotExtractor());
    this.slotExtractors.set('object', new ObjectSlotExtractor());
  }

  private buildParameters(slots: IntentSlot[]): Map<string, any> {
    const params = new Map<string, any>();

    for (const slot of slots) {
      if (slot.value !== null && slot.value !== undefined) {
        params.set(slot.name, slot.value);
      }
    }

    return params;
  }

  private async generateAlternatives(
    input: ParsedInput,
    context: Context
  ): Promise<Intent[]> {
    // 生成top-3备选意图
    const embedding = await this.model.embed(input.normalizedText);
    const predictions = await this.model.predict(embedding, { topK: 4 });

    return predictions
      .slice(1) // 排除主意图
      .filter(p => p.score > this.confidenceThresholds.low)
      .map(p => ({
        type: p.label as IntentType,
        confidence: p.score,
        parameters: new Map(),
        slots: []
      }));
  }
}

// 槽位提取器接口
interface SlotExtractor {
  extract(input: ParsedInput, context: Context): Promise<SlotExtractionResult>;
}

interface SlotExtractionResult {
  value: any;
  source: 'extracted' | 'default' | 'inferred';
  confidence: number;
}

// 文本槽位提取器
class TextSlotExtractor implements SlotExtractor {
  async extract(input: ParsedInput, context: Context): Promise<SlotExtractionResult> {
    // 提取主要文本内容作为值
    const textValue = input.normalizedText.replace(/\s+/g, ' ').trim();

    return {
      value: textValue,
      source: 'extracted',
      confidence: 0.9
    };
  }
}

// 实体槽位提取器
class EntitySlotExtractor implements SlotExtractor {
  async extract(input: ParsedInput, context: Context): Promise<SlotExtractionResult> {
    // 从已提取的实体中查找
    const targetEntity = input.entities.find(e => e.type === 'entity');

    if (targetEntity) {
      return {
        value: targetEntity.value,
        source: 'extracted',
        confidence: targetEntity.confidence
      };
    }

    // 尝试从上下文推断
    const inferredEntity = this.inferFromContext(input, context);

    return {
      value: inferredEntity?.value || null,
      source: inferredEntity ? 'inferred' : 'default',
      confidence: inferredEntity?.confidence || 0
    };
  }

  private inferFromContext(input: ParsedInput, context: Context): EntityValue | null {
    // 基于会话历史推断实体
    const recentEntities = context.session.history
      .flatMap(msg => msg.entities || [])
      .filter(e => e.type === 'entity');

    // 返回最近的实体作为推断值
    return recentEntities[0] || null;
  }
}
```

## 4. 敏感信息检测器 (Sensitive Information Detector)

敏感信息检测是安全架构的重要组成部分，防止敏感数据泄露到不安全的通道。

```typescript
// 敏感信息类型定义
type SensitiveType =
  | 'password'
  | 'api_key'
  | 'token'
  | 'credit_card'
  | 'phone_number'
  | 'id_number'
  | 'email'
  | 'address'
  | 'medical_record'
  | 'social_security';

interface SensitiveInfo {
  type: SensitiveType;
  value: string;
  maskedValue: string;
  position: { start: number; end: number };
  confidence: number;
  action: 'mask' | 'block' | 'warn';
}

// 敏感信息检测器
class SensitiveInfoDetector {
  private detectors: Map<SensitiveType, PatternDetector> = new Map();
  private actions: Map<SensitiveType, SensitiveAction> = new Map();

  constructor(config: DetectorConfig) {
    this.initializeDetectors(config);
    this.setDefaultActions();
  }

  private initializeDetectors(config: DetectorConfig): void {
    // 密码检测
    this.detectors.set('password', {
      patterns: [
        /password\s*[=:]\s*\S+/i,
        /pwd\s*[=:]\s*\S+/i,
        /passwd\s*[=:]\s*\S+/i
      ],
      context: ['password', 'pwd', 'pass', '口令']
    });

    // API密钥检测
    this.detectors.set('api_key', {
      patterns: [
        /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*["']?([a-zA-Z0-9_\-]{20,})/i,
        /sk-[a-zA-Z0-9]{48}/,  // OpenAI
        /AI[a-zA-Z0-9]{32,}/,   // Anthropic
        /ghp_[a-zA-Z0-9]{36}/,  // GitHub
      ],
      context: ['api', 'key', 'secret', 'token']
    });

    // 手机号检测（中国大陆）
    this.detectors.set('phone_number', {
      patterns: [
        /1[3-9]\d{9}/g,
        /\+86\s*1[3-9]\d{9}/g,
        /\d{3,4}[-\s]?\d{7,8}/g
      ],
      context: ['电话', '手机', '号码']
    });

    // 身份证号检测
    this.detectors.set('id_number', {
      patterns: [
        /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g
      ],
      context: ['身份证', 'ID', '证件']
    });

    // 邮箱检测
    this.detectors.set('email', {
      patterns: [
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      ],
      context: ['邮箱', 'email', '邮件']
    });

    // 信用卡检测
    this.detectors.set('credit_card', {
      patterns: [
        /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
        /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/
      ],
      context: ['信用卡', 'card', '卡号']
    });
  }

  private setDefaultActions(): void {
    this.actions.set('password', { action: 'block', severity: 'high' });
    this.actions.set('api_key', { action: 'block', severity: 'high' });
    this.actions.set('token', { action: 'block', severity: 'high' });
    this.actions.set('credit_card', { action: 'mask', severity: 'high' });
    this.actions.set('phone_number', { action: 'mask', severity: 'medium' });
    this.actions.set('id_number', { action: 'mask', severity: 'high' });
    this.actions.set('email', { action: 'mask', severity: 'low' });
  }

  async detect(text: string): Promise<SensitiveInfo[]> {
    const results: SensitiveInfo[] = [];

    for (const [type, detector] of this.detectors) {
      const detected = await this.detectType(text, type, detector);
      results.push(...detected);
    }

    // 按位置排序
    return results.sort((a, b) => a.position.start - b.position.start);
  }

  private async detectType(
    text: string,
    type: SensitiveType,
    detector: PatternDetector
  ): Promise<SensitiveInfo[]> {
    const results: SensitiveInfo[] = [];
    const action = this.actions.get(type)!;

    for (const pattern of detector.patterns) {
      const matches = text.matchAll(new RegExp(pattern, 'g'));

      for (const match of matches) {
        const maskedValue = this.mask(type, match[0]);

        results.push({
          type,
          value: match[0],
          maskedValue,
          position: {
            start: match.index!,
            end: match.index! + match[0].length
          },
          confidence: this.calculateConfidence(type, match[0], detector.context),
          action: action.action
        });
      }
    }

    return results;
  }

  private mask(type: SensitiveType, value: string): string {
    switch (type) {
      case 'phone_number':
        return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

      case 'email':
        return value.replace(/([a-zA-Z0-9._%+-]+)@/, '***@');

      case 'id_number':
        return value.replace(/(\d{6})\d{8}(\d{3}[\dXx])/, '$1********$2');

      case 'credit_card':
        return value.replace(/\d{4}[-\s]?(\d{4})/, '****-****-$1');

      case 'api_key':
      case 'token':
      case 'password':
        return '***MASKED***';

      default:
        return '***';
    }
  }

  private calculateConfidence(
    type: SensitiveType,
    value: string,
    context: string[]
  ): number {
    // 基础置信度
    let confidence = 0.9;

    // 模式匹配质量调整
    const hasContext = context.some(ctx => {
      const searchRange = 50;
      // 检查周围上下文
      return true; // 简化实现
    });

    if (!hasContext) {
      confidence *= 0.7;
    }

    // 格式验证
    if (this.validateFormat(type, value)) {
      confidence *= 1.1;
    }

    return Math.min(confidence, 1);
  }

  private validateFormat(type: SensitiveType, value: string): boolean {
    switch (type) {
      case 'phone_number':
        return /^1[3-9]\d{9}$/.test(value.replace(/\D/g, ''));

      case 'id_number':
        return /^[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(value);

      case 'credit_card':
        return this.luhnCheck(value.replace(/\D/g, ''));

      default:
        return true;
    }
  }

  private luhnCheck(number: string): boolean {
    let sum = 0;
    let isEven = false;

    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  async process(input: ParsedInput): Promise<ProcessedInput> {
    const sensitiveInfos = await this.detect(input.normalizedText);

    let processedText = input.normalizedText;

    for (const info of sensitiveInfos) {
      switch (info.action) {
        case 'mask':
          processedText = processedText.replace(info.value, info.maskedValue);
          break;

        case 'block':
          throw new SensitiveDataBlockedError(info.type, info.position);

        case 'warn':
          // 记录但不替换
          this.logWarning(info);
          break;
      }
    }

    return {
      ...input,
      normalizedText: processedText,
      sensitiveInfos
    };
  }
}
```

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Model Context Protocol 文档](https://modelcontextprotocol.io/) | MCP 规范定义了上下文与工具的传递方式，是提取器的接口依据 | 读 Introduction 并跑 quickstart，带着「上下文从哪来」看客户端服务器分工 |
| [Ragas 文档](https://docs.ragas.io/) | Ragas 的 faithfulness 与 context precision 可量化上下文提取质量 | 读指标定义，用 faithfulness 与 context precision 评测你的 RAG 管线 |
| [Input validation](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Input_validation) | 输入校验是解析器与敏感信息检测的第一道防线 | 读校验策略一节，列出自己管线中该拒绝与清洗的输入并落地 |
| [`<input>` HTML input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input) | 梳理各类输入元素与属性，是输入解析器类型映射的基础 | 按 type 列表过一遍，标记自己系统需支持的输入类型与解析规则 |
| ['`<input type="password">` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/password) | password 字段的取值与安全注意事项，对应敏感信息检测场景 | 读属性与安全说明，检查自己日志与上下文中是否残留口令 |
| ['`<input type="hidden">` HTML attribute value'](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/hidden) | hidden 字段常被误当安全存储，是敏感信息检测的典型盲区 | 读安全提示一节，排查自己表单把敏感数据放进 hidden 的做法 |
| [<input>](https://react.dev/reference/react-dom/components/input) | React 受控 input 的取值与事件模型，对应前端输入解析实现 | 读受控组件与事件部分，用 onChange 写出一次解析到状态更新的流程 |
| [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) | 讲清 Context 的传递与消费，可类比上下文提取器的注入逻辑 | 读 Provider 与 useContext 示例，画出自己管线的上下文传递路径 |
| [Reacting to Input with State](https://react.dev/learn/reacting-to-input-with-state) | 用状态机描述输入到界面反应，可迁移到意图识别的状态设计 | 读状态设计步骤，把用户输入到意图判定的状态迁移列成表 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [AST Explorer](https://astexplorer.net/) | 在线对比不同 parser 的 AST，直观理解输入解析器的切分方式 | 粘贴一段真实输入，切换 parser 看 AST 差异，再写下解析规则 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | 系统讲解上下文工程，帮你界定提取器该保留哪些信息 | 读原则部分，对照自己的 Agent 列出上下文来源，删冗余后记录 token 变化 |
| [Context Engineering（Philipp Schmid）](https://www.philschmid.de/context-engineering) | 给出上下文来源分类，可直接映射到提取器的输入类型 | 读分类框架，检查自己应用的上下文来源并归入各类，删掉无用部分 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 后台管理的万行表格导入 | 输入解析器、敏感信息检测器 | CSV 解析、列名别名映射、正则脱敏 | 合并单元格与多表头要先摊平，否则列错位 |
| 客服热线 8 分钟通话转工单 | 输入解析器、上下文提取器、意图识别器 | 语音转写、说话人分离、候选标签分类 | 转写文本带填充词，先清再进模型 |
| 低端安卓手机上的离线语音记账 | 输入解析器、意图识别器 | 端侧语音识别、规则槽位抽取 | 端侧算力有限，意图集合要收敛到十条以内 |
| 多人协作白板的手写便签转待办 | 输入解析器、上下文提取器 | 手写识别、画板坐标聚类 | 同一区域的手写块要合并成一条待办 |
| 研发值班群里粘贴的报错堆栈分流 | 输入解析器、上下文提取器、意图识别器 | 堆栈帧正则、服务元数据关联、按时间分桶 | 先脱敏 token 与内网 IP 再外发模型 |
| 医院导诊台的身份证与医保卡录入 | 输入解析器、敏感信息检测器 | OCR 字段定位、校验位算法 | 证件号只留后四位，原图单独加密存放 |
| 跨境电商店铺评论的多语言分流 | 输入解析器、意图识别器 | 语言检测、多语言分类模型 | 语言检测错会把评论送进错误的模型 |
| 招聘系统的简历批量解析 | 输入解析器、上下文提取器 | PDF 文本抽取、段落切分、字段抽取 | 双栏排版会被读成一行，需按坐标重排 |

### 三个场景拆解

#### 场景 1：客服热线的语音工单转派

**业务背景**：坐席接完电话手工填单，再凭经验选部门，选错要二次回访。规模用「单班次通话条数 × 平均填单秒数」即可测量。

**怎么用本页知识解决**：思路是先转写、再规范化、再脱敏，最后让意图识别器输出部门标签与置信度。低置信度的单子不自动派，进人工队列。

```python
SENSITIVE = {"phone": r"1\d{10}", "idcard": r"\d{17}[\dXx]"}  # 需脱敏字段的正则表

def parse(text):
    text = re.sub(r"\s+", "", text)            # 转写文本常带停顿空格，先去掉
    return text.replace("嗯", "").replace("那个", "")  # 去口语填充词

def build_context(text, history, n=3):
    return {"current": text, "recent": history[-n:]}  # 只带最近 n 轮，控制长度

def redact(text):
    for name, pat in SENSITIVE.items():
        text = re.sub(pat, f"<{name}>", text)  # 命中就替换成占位符
    return text

def route(raw, history, intent_model, threshold=0.7):
    text = redact(parse(raw))                  # 先脱敏再进模型，避免原文外发
    payload = build_context(text, history)
    label, score = intent_model(payload)       # 返回部门与置信度
    return label if score >= threshold else "人工复核"  # 低置信度不自动派
```

- 脱敏放在解析之后、模型之前，是唯一能保证原文不外发的位置。
- 上下文只保留最近 3 轮，多轮追问的场景才需要，单轮报修可关掉。
- 阈值单独配置，按上线后的人工改派率回调，不改管道主干。
- 函数各自独立，节奏上可以先只做 parse 与 redact，两周后再接模型。

**怎么度量收益**：看自动转派准确率、人工改派率、单通处理时长。把系统输出与坐席最终选择的部门逐条对照，用混淆矩阵列出错分去向。

**什么时候不该用**：涉及投诉举报、需要法律留证的通话，必须人工判定。通话质量差、转写错误率高时，先补录音链路，别上模型。客户情绪激烈需要安抚时，不该让系统先派单。

#### 场景 2：财务共享中心的批量表格导入

**业务背景**：每月的报销单来自多个业务线，表头写法不同，还有扫描件转出的表格。人工录一次错一个字段，整单要重跑流程。

**怎么用本页知识解决**：思路是把不同表头映射到统一字段名，逐行做必填校验，卡号一类字段脱敏后落库。校验不通过的行带上错误码进复核队列，不阻断整批。

```python
COLUMN_ALIAS = {"金额": "amount", "报销金额": "amount", "合计": "amount"}  # 表头归一
MASK_FIELDS = {"card_no"}                        # 这些列脱敏后再入库

def normalize_columns(row):
    return {COLUMN_ALIAS.get(k.strip(), k.strip()): v for k, v in row.items()}

def check(row):
    errs = []
    if not row.get("amount"):                    # 缺金额，进复核队列
        errs.append("amount_missing")
    if not row.get("date"):
        errs.append("date_missing")
    return errs

def to_record(row):
    rec = normalize_columns(row)
    for f in MASK_FIELDS:
        if f in rec:
            rec[f] = mask(rec[f])                # 卡号只保留后四位
    rec["_errors"] = check(rec)                  # 错误码随行落库，供复核页读取
    return rec
```

- 表头别名写成配置表，新增业务线只加映射，不动代码。
- 错误码随行落库，复核页按错误码排序，优先处理缺金额的行。
- 脱敏在落库前完成，导出报表时不用再处理一次。
- 同一批数据先跑一遍 dry run，只输出错误统计，确认后再写库。

**怎么度量收益**：看直通率、复核队列长度、字段级错误率。抽 200 行人工标注作为对照集，按字段统计准确率，每周复跑一次同样的对照集。

**什么时候不该用**：需要签字原件承担法律责任的单据，电子化不能替代纸质流程。扫描件模糊到字段不可辨时，先退回重新扫描。每份单据版式都不同且无固定字段时，先规范上游模板。

#### 场景 3：研发值班群的报错堆栈分流

**业务背景**：值班群每天涌入大量复制的报错文本，人工判断归属模块要翻代码。重复报错会淹没真正的新问题。

**怎么用本页知识解决**：思路是从堆栈里抽出异常类型与顶层调用帧，关联部署元数据得到服务名与版本，再按时间窗口折叠重复项。意图识别器的标签就是负责团队。

```python
FRAME = re.compile(r"at ([\w.$]+)\(([\w.]+):(\d+)\)")   # 匹配一行调用帧
SECRET = {"token": r"Bearer\s+\S+", "ip": r"\d+\.\d+\.\d+\.\d+"}

def parse_stack(log):
    frames = FRAME.findall(log)                # 抽出全部调用帧
    top = frames[0] if frames else ("", "", "")  # 第一帧定位出错点
    exc = log.splitlines()[0].strip()          # 首行是异常类型与消息
    return {"exc": exc, "top": top, "depth": len(frames)}

def build_context(log, meta):
    return {"service": meta["service"],        # 服务名来自部署元数据
            "version": meta["version"],
            "bucket": meta["ts"] // 300}       # 按 5 分钟分桶，用于折叠重复

def redact(log):
    for name, pat in SECRET.items():
        log = re.sub(pat, f"<{name}>", log)    # 凭证与内网地址先替换
    return log
```

- 用顶层帧而不是整段文本做特征，长度稳定且与代码结构对应。
- 按 5 分钟分桶后，同服务同异常只留一条，其余计数累加。
- 脱敏在入群机器人回复之前执行，避免凭证在群里二次扩散。
- 分桶长度可调，告警密集时加大，排障时缩小。

**怎么度量收益**：看分流准确率、重复告警折叠率、首次响应时间。把分流结果与最终修复提交所在的模块路径比对，用混淆矩阵看跨团队错分。

**什么时候不该用**：只在单机偶发的环境问题，堆栈里没有业务线索，交给人工。需要看完整调用链的性能问题，单条堆栈不足以下结论。日志已被上游截断时，先修采集端。

### 行业先进实践

**结构化输出约束（出处：OpenAI 官方文档 Structured Outputs）**：用 JSON Schema 约束模型返回的字段与类型，模型不再返回自由文本。这样下游拿到的是可直接校验的对象，解析失败能立刻重试。借鉴方式是在意图识别器出口定义固定字段，并把校验失败计入指标。

**PII 识别与匿名化分离（出处：Microsoft Presidio 开源项目）**：Presidio 把识别器与匿名化算子分成两个阶段，识别器可预置也可自定义，匿名化支持替换、掩码、哈希。分离的好处是识别准确率和脱敏策略能各自迭代、各自测试。借鉴方式是在输入解析器后插入独立的脱敏阶段，并给每个识别器单独写测试用例。

**转写与说话人分离分开做（出处：OpenAI Whisper 开源项目、pyannote-audio 开源项目）**：Whisper 负责把语音转成带时间戳的文本，pyannote-audio 负责切分说话人片段。工单场景需要区分客户与坐席各自说了什么，先切分再做意图判断能减少相互干扰。借鉴方式是先产出带说话人标记的中间文件，再做文本层处理。

**候选标签零样本分类（出处：Hugging Face Transformers 文档的 zero-shot-classification pipeline）**：把部门名或业务类型作为候选标签，由模型对每个标签打分，不需要训练数据。新团队上线时标签可以直接加，适合冷启动阶段。借鉴方式是用候选标签跑冷启动，积累到足够标注后，再换成有监督分类器，两者在同一测试集上对比。

**递归字符切分（出处：LangChain 官方文档中的文本切分器）**：按分隔符优先级递归切分长文本，优先在段落、句子边界断开，并保留相邻块的重叠。这样能在控制上下文长度的同时减少语义被切断。借鉴方式是在上下文提取器里设定切分长度与重叠长度两个参数，并用同一批长文档回放对比效果。

### 从学到用：落地路线

**第 1 步：选单入口试点**。挑每天都会发生、字段固定、人工判定耗时的一个入口接入感知层管道。验收标准：试点范围内全部流量经过管道并留下可回查的日志。

**第 2 步：离线回放验证**。取一周历史数据跑一遍，与人工结果逐条对照。验收标准：产出字段级准确率与混淆矩阵，错误样本能定位到原始行号。

**第 3 步：复制到第二入口**。接入新入口时只改配置，不改管道主干代码。验收标准：新增入口的改动量集中在配置表，回归测试全绿。

**第 4 步：上线监控防回退**。把回放脚本挂到每日定时任务，指标跌破阈值时告警。验收标准：指标曲线连续可查，每次阈值调整都有记录和负责人的签字。

### 动手作业

**目标**：搭一条把客服聊天记录分流到部门的感知层管道，含解析、脱敏、上下文、意图四段。

**步骤**：

1. 准备 200 条聊天记录，写成 jsonl，每条标注真实部门与是否含手机号。
2. 写输入解析器：统一全角半角、去掉多余空白与口语填充词。
3. 写敏感信息检测器：用正则识别手机号与身份证号，替换为占位符。
4. 写上下文提取器：取当前消息加最近 3 条历史，输出固定结构。
5. 写意图识别器：先用关键词打分做基线，再用候选标签零样本分类。
6. 写命令行入口，读 jsonl 输出 jsonl，每行带部门、置信度、命中的敏感字段名。
7. 写离线评估脚本，生成混淆矩阵与错误清单。

**验收标准**：

- 管道对 200 条记录全部产出结果，无异常退出，无空字段。
- 输出文件中检索不到原始手机号与身份证号。
- 评估报告含字段级准确率与混淆矩阵，错误样本可定位到原始行号。
- 关键词基线与零样本分类在同一测试集上的结果可直接对比。
- 换一批 50 条新数据，不改代码即可运行并产出报告。

