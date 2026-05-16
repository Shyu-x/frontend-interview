const fs = require('fs');
const content = fs.readFileSync('docs/network/section-13-20.md', 'utf-8');

// 找到 WebSocket 章节的 mermaid 块
const chapterStart = content.indexOf('6.12 WebSocket');
const mermaidStart = content.indexOf('```mermaid', chapterStart);
const mermaidEnd = content.indexOf('```', mermaidStart + 10);

const newMermaid = `\`\`\`mermaid
flowchart TB
    N0["HTTP vs WebSocket 对比"]
    N1["HTTP/1.1: Client -> Server -> 关闭"]
    N2["WebSocket: Client <==> Server (双向)"]
    N3["WebSocket 握手"]
    N4["Step 1: HTTP Upgrade 请求"]
    N5["GET /ws HTTP/1.1"]
    N6["Upgrade: websocket"]
    N7["Step 2: 服务器响应"]
    N8["HTTP/1.1 101 Switching"]
    N9["Sec-WebSocket-Accept"]
    N10["Step 3: 双向通信开始"]
    N11["WebSocket 帧结构"]
    N12["FIN + opcode + MASK"]
    N13["opcode: 0x1=文本 0x2=二进制"]
    N14["0x8=Close 0x9=Ping 0xA=Pong"]

    N0 --> N1
    N0 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N3 --> N7
    N7 --> N8
    N8 --> N9
    N2 --> N10
    N10 --> N11
    N11 --> N12
    N11 --> N13
    N11 --> N14
\`\`\``;

const newContent = content.slice(0, mermaidStart) + newMermaid + content.slice(mermaidEnd + 4);
fs.writeFileSync('docs/network/section-13-20.md', newContent);
console.log('修改完成，mermaid 块从', mermaidStart, '到', mermaidEnd, '被替换');