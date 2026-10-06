---
title: RAG：代码实现与展望
description: RAG 完整代码实现、总结与前沿展望。
tags:
  - ai-agent
  - rag
date: 2026-05-17
---

# RAG：代码实现与展望

> 本文是「RAG」系列第 4 篇（共 4 篇）。上一篇：[RAG：Agent 集成与高级 RAG](rag-agent-advanced.md)

## 1. 代码实现

### 1.1 Embedding 实现

完整的 Embedding pipeline：

```python
import numpy as np
from typing import Optional

class EmbeddingPipeline:
    """完整的 Embedding 处理流水线"""
    
    def __init__(
        self,
        model_name: str = "bge-large-zh",
        device: str = None,
        batch_size: int = 32,
        normalize: bool = True
    ):
        """
        Args:
            model_name: 模型名称
            device: 运行设备
            batch_size: 批处理大小
            normalize: 是否归一化向量
        """
        from sentence_transformers import SentenceTransformer
        
        if device is None:
            device = "cuda" if np.random.random() > 0.5 else "cpu"
        
        self.model = SentenceTransformer(model_name, device=device)
        self.batch_size = batch_size
        self.normalize = normalize
        self.dimension = self.model.get_sentence_embedding_dimension()
    
    def encode(
        self,
        texts: str | list[str],
        batch_size: int = None,
        show_progress: bool = False,
        task: str = "semantic_search"
    ) -> np.ndarray:
        """
        编码文本
        
        Args:
            texts: 文本或文本列表
            batch_size: 批大小
            show_progress: 显示进度
            task: 任务类型（semantic_search / retrieval_task / similarity）
        
        Returns:
            嵌入向量
        """
        if isinstance(texts, str):
            texts = [texts]
        
        # 任务特定前缀（某些模型需要）
        if "e5" in self.model.model_name.lower():
            texts = [
                f"query: {t}" if task == "semantic_search" else f"passage: {t}"
                for t in texts
            ]
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size or self.batch_size,
            show_progress_bar=show_progress,
            normalize_embeddings=self.normalize,
            convert_to_numpy=True
        )
        
        return embeddings
    
    def encode_query(self, query: str) -> np.ndarray:
        """编码查询"""
        return self.encode(query, task="semantic_search")[0]
    
    def encode_corpus(
        self,
        corpus: list[str],
        show_progress: bool = True
    ) -> np.ndarray:
        """编码语料库"""
        return self.encode(corpus, task="retrieval_task", show_progress=show_progress)
    
    def compute_similarity(
        self,
        query_embedding: np.ndarray,
        doc_embeddings: np.ndarray
    ) -> np.ndarray:
        """计算余弦相似度"""
        if self.normalize:
            return np.dot(doc_embeddings, query_embedding)
        else:
            norm_q = np.linalg.norm(query_embedding)
            norm_d = np.linalg.norm(doc_embeddings, axis=1)
            return np.dot(doc_embeddings, query_embedding) / (norm_d * norm_q)
    
    def find_similar(
        self,
        query: str,
        documents: list[str],
        top_k: int = 5
    ) -> list[dict]:
        """查找最相似的文档"""
        query_emb = self.encode_query(query)
        doc_embs = self.encode_corpus(documents, show_progress=False)
        
        similarities = self.compute_similarity(query_emb, doc_embs)
        
        # 排序
        indices = np.argsort(similarities)[::-1][:top_k]
        
        return [
            {
                "index": int(idx),
                "document": documents[idx],
                "similarity": float(similarities[idx])
            }
            for idx in indices
        ]


# OpenAI Embedding
class OpenAIEmbedding:
    """OpenAI Embedding 封装"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        dimensions: int = 1536
    ):
        """
        Args:
            api_key: OpenAI API Key
            model: 嵌入模型
            dimensions: 向量维度（支持缩减）
        """
        import openai
        
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
        self.dimensions = dimensions
    
    def encode(self, texts: str | list[str]) -> np.ndarray:
        """编码文本"""
        if isinstance(texts, str):
            texts = [texts]
        
        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
            encoding_format="float",
            dimensions=self.dimensions
        )
        
        return np.array([item.embedding for item in response.data])
    
    def encode_query(self, query: str) -> np.ndarray:
        """编码查询"""
        return self.encode(query)[0]
    
    def encode_corpus(self, corpus: list[str]) -> np.ndarray:
        """编码语料库"""
        return self.encode(corpus)
```

### 1.2 Vector Store 实现

完整向量存储实现：

```python
import json
import hashlib
from pathlib import Path
from typing import Optional, Iterator
import numpy as np

class VectorStore:
    """向量存储基类"""
    
    def __init__(self, dimension: int):
        self.dimension = dimension
    
    def add(self, id: str, embedding: np.ndarray, metadata: dict = None):
        """添加向量"""
        raise NotImplementedError
    
    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        filter: dict = None
    ) -> list[dict]:
        """搜索相似向量"""
        raise NotImplementedError
    
    def delete(self, ids: list[str]):
        """删除向量"""
        raise NotImplementedError
    
    def save(self, path: str):
        """保存到磁盘"""
        raise NotImplementedError
    
    @classmethod
    def load(cls, path: str) -> "VectorStore":
        """从磁盘加载"""
        raise NotImplementedError


class InMemoryVectorStore(VectorStore):
    """内存向量存储"""
    
    def __init__(self, dimension: int):
        super().__init__(dimension)
        self.vectors: dict[str, np.ndarray] = {}
        self.metadatas: dict[str, dict] = {}
    
    def add(self, id: str, embedding: np.ndarray, metadata: dict = None):
        """添加向量"""
        assert len(embedding) == self.dimension, f"Dimension mismatch: {len(embedding)} vs {self.dimension}"
        
        self.vectors[id] = embedding
        self.metadatas[id] = metadata or {}
    
    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        filter: dict = None
    ) -> list[dict]:
        """搜索"""
        if not self.vectors:
            return []
        
        # 计算所有相似度
        ids = list(self.vectors.keys())
        vectors = np.array([self.vectors[id] for id in ids])
        
        # 余弦相似度
        similarities = np.dot(vectors, query_embedding) / (
            np.linalg.norm(vectors, axis=1) * np.linalg.norm(query_embedding)
        )
        
        # 排序
        sorted_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in sorted_indices:
            doc_id = ids[idx]
            metadata = self.metadatas[doc_id]
            
            # 应用过滤
            if filter and not self._match_filter(metadata, filter):
                continue
            
            results.append({
                "id": doc_id,
                "score": float(similarities[idx]),
                "metadata": metadata,
                "embedding": self.vectors[doc_id]
            })
            
            if len(results) >= k:
                break
        
        return results
    
    def _match_filter(self, metadata: dict, filter: dict) -> bool:
        """匹配过滤条件"""
        for key, value in filter.items():
            if key not in metadata:
                return False
            if isinstance(value, list):
                if metadata[key] not in value:
                    return False
            elif metadata[key] != value:
                return False
        return True
    
    def delete(self, ids: list[str]):
        """删除"""
        for id in ids:
            if id in self.vectors:
                del self.vectors[id]
                del self.metadatas[id]
    
    def save(self, path: str):
        """保存"""
        data = {
            "dimension": self.dimension,
            "vectors": {k: v.tolist() for k, v in self.vectors.items()},
            "metadatas": self.metadatas
        }
        
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
    
    @classmethod
    def load(cls, path: str) -> "InMemoryVectorStore":
        """加载"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        store = cls(dimension=data["dimension"])
        store.vectors = {k: np.array(v) for k, v in data["vectors"].items()}
        store.metadatas = data["metadatas"]
        
        return store


class PersistentVectorStore(InMemoryVectorStore):
    """持久化向量存储"""
    
    def __init__(self, path: str, dimension: int = None):
        """
        Args:
            path: 存储路径
            dimension: 向量维度（首次创建时需要）
        """
        self.path = Path(path)
        
        if self.path.exists():
            # 加载已有存储
            store = self.load(str(self.path))
            super().__init__(store.dimension)
            self.vectors = store.vectors
            self.metadatas = store.metadatas
        else:
            # 新建
            if dimension is None:
                raise ValueError("dimension required for new store")
            super().__init__(dimension)
            self.path.parent.mkdir(parents=True, exist_ok=True)
    
    def add(self, id: str, embedding: np.ndarray, metadata: dict = None):
        """添加并自动保存"""
        super().add(id, embedding, metadata)
        self.save()
    
    def delete(self, ids: list[str]):
        """删除并自动保存"""
        super().delete(ids)
        self.save()
    
    def save(self, path: str = None):
        """保存"""
        path = path or str(self.path)
        super().save(path)
```

### 1.3 RAG Chain 实现

完整的 RAG Chain 实现：

```python
from dataclasses import dataclass
from typing import Optional, Callable
import numpy as np

@dataclass
class RAGConfig:
    """RAG 配置"""
    # 检索配置
    retrieval_top_k: int = 10
    rerank_top_k: int = 5
    
    # 检索器配置
    embedding_model: str = "bge-large-zh"
    vector_store_type: str = "memory"  # memory / pinecone / chroma
    
    # 生成配置
    llm_model: str = "gpt-4"
    max_tokens: int = 4000
    temperature: float = 0.7
    
    # 高级配置
    use_reranker: bool = True
    use_query_rewrite: bool = True
    usehyde: bool = False


class RAGChain:
    """完整的 RAG Chain"""
    
    def __init__(
        self,
        config: RAGConfig,
        embedding_pipeline,
        vector_store: VectorStore,
        llm,
        reranker = None
    ):
        """
        Args:
            config: RAG 配置
            embedding_pipeline: Embedding 处理流水线
            vector_store: 向量存储
            llm: 大语言模型
            reranker: 重排序器（可选）
        """
        self.config = config
        self.embedding = embedding_pipeline
        self.vector_store = vector_store
        self.llm = llm
        self.reranker = reranker
        
        # 缓存
        self._query_cache: dict[str, list[dict]] = {}
    
    def invoke(self, query: str, **kwargs) -> dict:
        """
        执行 RAG 查询
        
        Args:
            query: 用户查询
            **kwargs: 额外参数
        
        Returns:
            RAG 结果
        """
        # 1. 查询处理
        processed_query = self._process_query(query)
        
        # 2. 检索
        retrieved_docs = self._retrieve(processed_query)
        
        # 3. 重排序
        if self.config.use_reranker and self.reranker:
            reranked = self._rerank(query, retrieved_docs)
        else:
            reranked = retrieved_docs[:self.config.rerank_top_k]
        
        # 4. 上下文构建
        context = self._build_context(reranked)
        
        # 5. 生成回答
        answer = self._generate(query, context)
        
        return {
            "answer": answer,
            "retrieved_docs": reranked,
            "query": query,
            "processed_query": processed_query
        }
    
    def _process_query(self, query: str) -> str:
        """查询处理"""
        # 可扩展：查询改写、扩展等
        if self.config.use_query_rewrite:
            # 简单的查询清理
            return query.strip()
        return query
    
    def _retrieve(self, query: str) -> list[dict]:
        """检索"""
        # 编码查询
        query_embedding = self.embedding.encode_query(query)
        
        # 搜索
        results = self.vector_store.search(
            query_embedding=query_embedding,
            k=self.config.retrieval_top_k
        )
        
        return results
    
    def _rerank(self, query: str, documents: list[dict]) -> list[dict]:
        """重排序"""
        if not documents:
            return documents
        
        doc_texts = [d.get("metadata", {}).get("content", d.get("content", "")) for d in documents]
        
        reranked = self.reranker.rerank(query, doc_texts, top_k=self.config.rerank_top_k)
        
        # 合并结果
        for i, result in enumerate(reranked):
            documents[i]["rerank_score"] = result["score"]
        
        return documents[:self.config.rerank_top_k]
    
    def _build_context(self, documents: list[dict]) -> str:
        """构建上下文"""
        if not documents:
            return "（无相关检索内容）"
        
        parts = []
        for i, doc in enumerate(documents, 1):
            content = doc.get("metadata", {}).get("content", doc.get("content", ""))
            source = doc.get("metadata", {}).get("source", "")
            
            parts.append(f"【参考 {i}】\n{content}\n来源：{source}")
        
        return "\n\n".join(parts)
    
    def _generate(self, query: str, context: str) -> str:
        """生成回答"""
        prompt = f"""基于以下参考内容回答用户问题。

要求：
1. 只使用参考内容回答，不要添加外部知识
2. 如果参考内容中没有相关信息，明确指出
3. 引用参考内容时标注编号
4. 回答简洁、有条理

参考内容：
{context}

问题：{query}

回答："""
        
        response = self.llm.generate(
            prompt,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature
        )
        
        return response.text
    
    def add_documents(self, documents: list[dict]):
        """
        添加文档到知识库
        
        Args:
            documents: [{content, metadata}, ...]
        """
        for doc in documents:
            content = doc["content"]
            metadata = doc.get("metadata", {})
            
            # 生成 ID
            doc_id = hashlib.md5(content[:100].encode()).hexdigest()[:12]
            
            # 编码
            embedding = self.embedding.encode_corpus([content])[0]
            
            # 添加
            self.vector_store.add(doc_id, embedding, metadata)
    
    def clear_cache(self):
        """清除缓存"""
        self._query_cache.clear()


# LangChain 集成
class LangChainRAGChain:
    """LangChain 风格 RAG Chain"""
    
    def __init__(self, retriever, llm, chain_type: str = "stuff"):
        """
        Args:
            retriever: LangChain retriever
            llm: LangChain LLM
            chain_type: chain 类型 (stuff / map_rerank / refine)
        """
        self.retriever = retriever
        self.llm = llm
        self.chain_type = chain_type
    
    def _create_chain(self):
        """创建 LangChain 链"""
        try:
            from langchain.chains import RetrievalQA
            
            return RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type=self.chain_type,
                retriever=self.retriever,
                return_source_documents=True
            )
        except ImportError:
            raise ImportError("LangChain not installed")
    
    def invoke(self, query: str) -> dict:
        """执行查询"""
        chain = self._create_chain()
        result = chain.invoke(query)
        
        return {
            "answer": result["result"],
            "source_documents": result.get("source_documents", [])
        }
```

## 2. 总结与展望

### 2.1 RAG 技术要点总结

| 环节 | 关键点 | 最佳实践 |
|------|--------|----------|
| **文档处理** | 格式解析、内容清洗 | 针对不同格式使用专用解析器 |
| **分块策略** | 块大小、重叠度 | 根据内容类型选择策略 |
| **Embedding** | 模型选择、维度 | 中文场景推荐 BGE 系列 |
| **向量存储** | 索引类型、过滤 | 根据规模选择合适的数据库 |
| **检索策略** | 混合检索、重排序 | 语义 + 关键词混合效果好 |
| **生成优化** | 提示词工程、引用标注 | 明确要求引用来源 |
| **评估优化** | 离线评估、在线 A/B | 多维度评估系统效果 |

### 2.2 未来发展方向

1. **多模态 RAG**：支持图像、音频、视频等非文本内容的检索
2. **知识图谱增强**：结合知识图谱的结构化信息
3. **Agent + RAG 深度融合**：更智能的自主检索和验证
4. **实时更新机制**：流式数据接入和增量更新
5. **可解释性增强**：更透明的检索和生成过程

### 2.3 参考资源

- **论文**：
  - [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
  - [Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection](https://arxiv.org/abs/2310.11511)
  - [Corrective Retrieval Augmented Generation](https://arxiv.org/abs/2401.13284)

- **工具**：
  - LangChain / LlamaIndex：RAG 应用框架
  - Haystack：端到端 RAG 框架
  - RAGAS：RAG 评估框架

---

*文档版本：1.0*
*更新时间：2024*

## 深入阅读与参考

!!! tip "怎么用这些资料"
    先读「官方文档与规范」建立准确的概念，再读「源码与示例」核对细节，最后用「教程、书籍与视频」换一种讲法加深理解。每条都写明了读哪一节、带着什么问题读。

### 官方文档与规范

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [RAG 综述（Gao et al.）](https://arxiv.org/abs/2312.10997) | 领域权威综述，给出 Naive/Advanced/Modular 的清晰分类。 | 读分类与模块化章节，整理一张三阶段对比表，作为后续选型参照。 |
| [Ragas 文档](https://docs.ragas.io/) | 评测 RAG 的官方工具文档，把效果量化为可比较的指标。 | 读指标定义章节，用 faithfulness 与 context precision 评测自己的 RAG。 |

### 源码与示例

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) | 可运行 notebook 展示 tool_use 与 RAG 的真实工程写法。 | 克隆仓库跑通 RAG 与 tool_use 目录的 notebook，再把数据换成自己的语料。 |
| [RAG_Techniques（NirDiamant）](https://github.com/NirDiamant/RAG_Techniques) | 同一数据集上多种 RAG 技巧的开源实现，便于横向比较。 | 依次运行基础 RAG、重排序、查询改写三个 notebook，记录并比较结果差异。 |

### 教程、书籍与视频

| 资源 | 为什么读 | 怎么读 |
|---|---|---|
| [All-in-RAG（Datawhale）](https://github.com/datawhalechina/all-in-rag) | 中文全流程实战，从数据处理到应用搭建一条线走通。 | 按章节顺序实现检索与生成模块，边写边对照代码，走通完整 RAG 应用。 |
| [LlamaIndex 博客](https://www.llamaindex.ai/blog) | agentic RAG 策略前沿，能拓展检索环节的设计思路。 | 精选一篇 agentic RAG 文章，挑一种检索策略加进自己的 RAG 并对比效果。 |
| [DeepLearning.AI 短课程](https://www.deeplearning.ai/short-courses/) | 短小精悍的视频课，适合边看边动手调参数。 | 选 Agent 或 RAG 一门，跟做 notebook 并改参数，观察检索与生成的变化。 |
| [Pinecone RAG 系列](https://www.pinecone.io/learn/series/rag/) | 系列文章由浅入深，每篇文末都附可复现实验。 | 按系列顺序读，每篇文末实验自己复现一次，重点看检索质量变化。 |
| [Retrieval-Augmented Generation（Prompt Guide 中文）](https://www.promptingguide.ai/zh/research/rag) | 中文入门材料，可快速建立 RAG 的基本概念框架。 | 通读全文，用自己的话写出一句 Naive 与 Advanced RAG 的核心区别。 |

## 应用与行业实践

### 应用场景地图

| 场景 | 用到本页哪个知识点 | 典型技术选型 | 注意事项 |
| --- | --- | --- | --- |
| 客服工单系统检索历史工单并起草回复 | 混合检索、重排、引用溯源 | BM25 + 向量召回，RRF 融合，交叉编码器重排 | 租户过滤放召回阶段，答案必须带工单号 |
| 电商后台万行商品表格问答 | 元数据过滤、结构化字段抽取 | 先按类目和 SKU 过滤，再检索描述字段 | 求和、计数类问题交给 SQL，别让模型口算 |
| 律所合同条款比对与出处定位 | 父子文档切分、重排 | 小块建索引，命中后返回整条条款 | 版本号与签署方写进元数据 |
| 车间平板查设备维修手册 | 缓存、上下文压缩、流式输出 | 本地索引兜底，按 token 预算裁剪上下文 | 断网时要有降级路径，别白屏 |
| 多人协作白板旁的会议纪要问答 | 查询改写、多跳检索 | 把"他说的那个方案"改写成带人名的检索式 | 代词指代依赖会话状态，跨会话要清空 |
| 低端安卓机上的离线知识问答 | 分块、首段优先流式输出 | 量化小模型加本地向量索引 | 首屏只送一段原文，别等全部召回完成 |
| 银行内部制度问答 | 元数据过滤、拒答 | 检索前按部门和密级裁剪候选集 | 权限过滤写在召回阶段，不能只靠提示词 |
| 代码仓库的 Issue 与 PR 检索 | Agent 工具路由、多跳检索 | 代码搜索与 Issue 搜索各做一个工具 | 两个工具的返回结构要统一，便于拼接 |
| 检验报告解读辅助 | 引用溯源、拒答 | 只允许引用报告原文与指南条目 | 证据缺失时必须拒答，不给推断结论 |

### 三个场景拆解

#### 场景 1：客服工单的历史检索与回复草稿

**业务背景**：一线客服要在几万条历史工单里找同类问题，靠关键词搜索命中率低，写回复要来回翻页。规模量级可用工单条数和日均咨询量估计，方法是从后台导出最近 90 天工单计数。

**怎么用本页知识解决**：思路是两路召回加融合，再用重排压候选，最后让模型带着工单号生成草稿。

```python
def answer_ticket(question, tenant_id, top_k=8):
    # 1) 查询改写：把口语问题补成带产品名和错误码的检索式
    queries = rewrite(question, hints=["产品名", "错误码"])
    # 2) 两路召回：BM25 走关键词，向量索引走语义
    bm25_hits = bm25.search(queries, where={"tenant": tenant_id}, k=top_k)
    vec_hits = vec.search(queries, where={"tenant": tenant_id}, k=top_k)
    # 3) RRF 融合：只用名次求和，不比较两路的分数量纲
    fused = rrf_fuse([bm25_hits, vec_hits], rank_constant=60)
    # 4) 重排：交叉编码器逐条打分，候选从 30 条压到 5 条
    top = rerank(question, fused[:30])[:5]
    # 5) 带工单号拼上下文，生成时要求给出引用
    ctx = [{"text": h.text, "cite": h.ticket_id} for h in top]
    return generate(question, context=ctx, require_citation=True)
```

- RRF 只读名次，绕开 BM25 分数与向量余弦值不可比的问题，融合规则不随语料变化。
- 租户过滤写在 `where` 里，属于召回阶段约束，避免把别的客户工单混进上下文。
- 重排把候选从 30 条压到 5 条，上下文长度可控，生成阶段的延迟随之下限稳定。
- `require_citation=True` 让每条草稿带工单号，客服复核时能点回原文，采纳前不用猜来源。

**怎么度量收益**：检索侧看 Recall@5 与 MRR，生成侧看引用命中率和客服采纳率，性能侧看首字延迟 p95。测量方法是用 RAGAS 的 context_recall 与 faithfulness 跑批量评估，用 OpenTelemetry 打点后进 Prometheus，用 Grafana 看分位数曲线。回归集固定为 100 条带标准答案的历史工单。

**什么时候不该用**：工单集中在 20 条固定话术时，规则匹配直接返回模板，加检索层只会引入措辞漂移。涉及退款金额、账户变更等写操作时，草稿可以出，但下发必须走人工审批流。知识库三个月以上未更新、政策已变更的问题，先修数据再上模型。

#### 场景 2：车间平板查维修手册

**业务背景**：维修工在设备旁用平板查手册，车间网络时断时续，翻 PDF 定位一段话要几分钟。规模量级可按单本手册页数和日查询次数估算，方法是统计现场平板的页面停留时长。

**怎么用本页知识解决**：思路是本地缓存加本地索引兜底，上下文按预算压缩，输出先给原文片段再给解释。

```python
def workshop_answer(question, device_model):
    key = cache_key(question, device_model)   # 缓存键含设备型号，避免跨型号串答案
    if key in local_cache:
        return local_cache[key]               # 命中本地缓存，不发起检索
    if net_ok():
        hits = remote_index.search(question, k=10)   # 网络正常时多召回
    else:
        hits = local_index.search(question, k=3)     # 弱网只走本地索引
    hits = compress(hits, token_budget=1200)         # 按预算裁掉无关句子
    yield {"type": "cite", "text": hits[0].snippet}  # 先推原文片段，用户先看到出处
    for token in stream(question, context=hits):     # 再流转模型生成的解释
        yield {"type": "token", "text": token}
```

- 缓存键带上设备型号，同一句话问不同机型不会复用同一答案。
- 网络探测失败时切本地索引，召回条数从 10 降到 3，换取可用性。
- 上下文压缩按 token 预算丢句，保留含零件编号和步骤序号的片段。
- 先输出原文片段再输出解释，用户在首字延迟内就能读到可执行的内容。

**怎么度量收益**：看 p95 首字延迟、缓存命中率、离线请求成功率、上下文压缩前后的 token 数。测量方法是用浏览器 Performance API 打 `performance.mark` 上报首字时间，用 Prometheus 直方图统计延迟分布，用 RAGAS faithfulness 对抽样答案做一致性检查。

**什么时候不该用**：手册里的安全强制条款要求原文照抄，不能让模型改写措辞。设备型号不在收录范围内时，模型不许外推到相近机型，应提示查纸质手册。需要实时读设备传感器数据的诊断，检索层给不出结论。

#### 场景 3：代码仓库助手的跨文件多跳问答

**业务背景**：新同事问"这个配置项从哪读进来的"，答案散在配置文件、调用方和某个历史 Issue 里。规模量级用仓库文件数与 Issue 数估计，方法是跑一次仓库统计脚本。

**怎么用本页知识解决**：思路是把代码搜索和 Issue 搜索各做成一个工具，由路由决定调用顺序，最多三跳。

```python
TOOLS = {"code_search": code_search, "issue_search": issue_search}

def repo_answer(question, repo):
    plan = router(question)            # 判断该查代码、查 Issue，还是两者都查
    evidence = []
    for step in plan[:3]:              # 最多三跳，防止来回调用停不下来
        tool = TOOLS[step["tool"]]
        evidence.append(tool(step["query"], repo=repo, k=5))
    # 下一跳的查询由上一跳结果改写，例如补上返回的文件名
    return generate(question, context=evidence, require_citation=True)
```

- 两个工具分开，是因为代码按符号匹配，Issue 按自然语言匹配，混在一个索引里两边都受伤。
- 路由先做一次判断，简单问题一跳结束，不必为所有问题付三跳成本。
- 每跳的查询由上一跳结果改写，文件名、函数名从上一跳结果里取，不靠模型凭空补。
- 跳数上限写在循环里，超时和死循环都能被截断，成本上限可预期。

**怎么度量收益**：看 answer correctness、平均工具调用次数、无引用答案占比、端到端 p95。测量方法是把历史 Issue 里已解决的 50 条做成回归集，用 RAGAS 的 answer_correctness 批量评分，用 trace 统计每条的调用次数分布。

**什么时候不该用**：需要运行代码才能回答的问题，比如某分支会不会抛异常，检索给不出结论，应接执行环境。单文件的小仓库把所有内容放进上下文就够，加检索层只多一跳延迟。

### 行业先进实践

上下文检索（出处：Anthropic 工程博客的 Contextual Retrieval 一文）。做法是在切块阶段让模型为每个块生成一句所属上下文，再把这句话和块一起做向量化与 BM25 索引。原因是块脱离原文后指代丢失，补上上下文能让块独立被检索到。借鉴方式是在离线切块流水线里加这一步，原文与生成前缀分字段存储，便于回滚。

倒数排名融合 RRF（出处：Elasticsearch 官方文档的 RRF 章节，Weaviate 官方文档的 hybrid search 说明）。做法是用名次而非分数融合多路召回。原因是不同检索器的分数量纲不可比，名次可比，权重调参的负担下降。借鉴方式是先固定两路召回做融合，稳定后再考虑加第三路。

父子文档检索（出处：LangChain 官方文档的 ParentDocumentRetriever）。做法是用小块建索引，命中后取回该块所属的大块送模型。原因是小块检索命中率高，大块给模型足够上下文。借鉴方式是在元数据里存 parent_id，检索分两段式完成。需核对官方文档：核对当前版本能否在不重新切块的前提下更换父块切分粒度。

无参考批量评估（出处：RAGAS 开源项目文档）。做法是用 faithfulness、answer_relevancy、context_precision、context_recall 这类指标批量打分，替代逐条人工看。原因是人工抽检覆盖不了每次改动带来的回归。借鉴方式是把 50 到 100 条回归集和评分脚本接进流水线，每次改动跑同一套。

生成强制引用与拒答（出处：Anthropic Citations 官方文档）。做法是让模型输出带原文区间的引用，证据不足时不作答。原因是引用可被核查，审核者不必逐句判断真伪。借鉴方式是把 citations 设为输出结构的必填字段，解析失败就降级为只回原文片段。需核对官方文档：核对当前接口返回的引用区间字段结构。

### 从学到用：落地路线

第 1 步，选一个日志齐全、有标准答案、影响面小的场景做试点，比如客服工单检索。验收标准是 50 条回归问题集建成，检索侧基线指标有数。

第 2 步，每次只改一个变量做对照实验，先加重排，再考虑改切分粒度。验收标准是同一套回归集上指标不低于基线，人工抽检的引用可定位比例达标。

第 3 步，把召回、融合、重排、评估封装成服务，新场景只提交数据源与过滤字段。验收标准是接入新场景不需要改检索核心代码，只改配置。

第 4 步，把回归集与指标阈值接进发布流水线，指标跌破阈值就阻断上线。验收标准是每次发布都能产出一份新旧指标对比报告。

### 动手作业

**目标**：搭一个本地制度文档问答小系统，答案必带引用，证据缺失时拒答。

**步骤**：

1. 准备 20 到 50 篇公开制度类文档，切成小块，元数据记录 doc_id、章节、版本号。
2. 建两路索引：文本索引与向量索引，两路都支持按 doc_id 过滤。
3. 实现 RRF 融合，把两路各 15 条候选合成一个列表。
4. 实现重排，把候选从 30 条压到 5 条，记录压缩前后 token 数。
5. 写生成调用，输出 answer 与 citations 两个字段，citations 为空时改输出拒答。
6. 造 30 条回归问题，20 条文档里有答案，10 条文档里没有答案。
7. 只改一个变量，比如关闭重排，再跑一次，把两次结果写进同一张对比表。

**验收标准**：

- 10 条无答案问题里，拒答条数不低于 8 条。
- 有答案问题抽检 20 条，引用能在原文中定位到原文句子。
- 关闭重排与开启重排各跑一次，context_recall 有数，对比表可复现。
- 端到端 p95 延迟有记录，记录脚本在 README 里写明执行命令。
- 脚本与回归集入库，换一台机器能按 README 跑出同样表格。

