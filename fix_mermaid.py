import re

with open('docs/css/hyper-frequencies.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to replace the Module Federation mermaid block
pattern = r'### 10\.18 Module Federation 原理（webpack5\)\n\n```mermaid\nflowchart TB\n.*?```'
replacement = '''### 10.18 Module Federation 原理（webpack5）

**Module Federation = webpack5 内置的微前端/微模块方案：**
- 允许在运行时从远程构建加载模块（无需构建时依赖）

**架构：**

| 组件 | 说明 |
|------|------|
| Host (主应用) | 动态加载远程模块 |
| Remote (远程构建) | 暴露模块供 Host 使用 |

**Host 配置：**
```javascript
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    remote_app: 'remote_app@http://localhost:3000/remoteEntry.js',
  },
  shared: ['vue']
})
```

**Remote 配置：**
```javascript
new ModuleFederationPlugin({
  name: 'remote_app',
  filename: 'remoteEntry.js',
  exposes: {
    './Button': './src/Button.vue'
  },
  shared: ['vue']
})
```

**Module Federation vs qiankun：**
- qiankun：运行在主应用框架内，需要注册子应用，框架无关但需要适配
- MF：webpack 原生支持，无需框架适配，直接 import 远程模块'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('docs/css/hyper-frequencies.md', 'w', encoding='utf-8') as f:
    f.write(content)
print('Module Federation replaced')