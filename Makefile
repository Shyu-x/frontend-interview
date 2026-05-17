.PHONY: help install dev build clean lint test

help:
	@echo "前端面试全家桶 - Makefile"
	@echo ""
	@echo "可用命令:"
	@echo "  make install    安装依赖 (使用 uv)"
	@echo "  make dev        启动开发服务器"
	@echo "  make build      构建生产版本"
	@echo "  make clean      清理构建产物"
	@echo "  make lint       检查文档"

install:
	uv sync

dev:
	uv run mkdocs serve --dev-addr 127.0.0.1:8000

build:
	uv run mkdocs build --clean

clean:
	rm -rf site/
	uv run mkdocs build --clean

lint:
	uv run mkdocs build 2>&1 | grep -E "(WARNING|ERROR)" || echo "构建通过，无警告"