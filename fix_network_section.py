#!/usr/bin/env python3
"""
Replace Mermaid code blocks in network/section-13-20.md with image references.
"""

import re
from pathlib import Path

# Define the mermaid blocks and their corresponding images for network/section-13-20.md
# Based on actual content analysis
MERMAID_TO_IMAGE = {
    # Line 15-27: HTTP 版本演进 timeline
    "http-version-timeline": "assets/images/mermaid/network-http-versions.png",

    # Line 29-42: HTTP/1.1 队头阻塞 sequence
    "http11-head-block": "assets/images/mermaid/network-http11-head-block.png",

    # Line 44-57: HTTP/2 多路复用 sequence
    "http2-multiplexing": "assets/images/mermaid/network-http2-multiplexing.png",

    # Line 59-68: HTTP/2 TCP 层队头阻塞 sequence
    "http2-tcp-block": "assets/images/mermaid/network-http2-tcp-block.png",

    # Line 70-93: HTTP/3 协议栈 flowchart
    "http3-protocol-stack": "assets/images/mermaid/network-http3-stack.png",

    # Line 210-239: HTTP 无状态与 keep-alive flowchart
    "http-stateless-keepalive": "assets/images/mermaid/network-http-stateless.png",

    # Line 375-383: QUIC 为什么用 UDP
    "quic-udp-reason": "assets/images/mermaid/network-quic-udp.png",

    # Line 385-406: QUIC 丢包检测与恢复
    "quic-packet-loss": "assets/images/mermaid/network-quic-packet-loss.png",

    # Line 408-423: QUIC 连接迁移
    "quic-migration": "assets/images/mermaid/network-quic-migration.png",

    # Line 425-433: QUIC 包结构
    "quic-packet-structure": "assets/images/mermaid/network-quic-packet.png",
}


def process_network_section():
    file_path = Path("C:/Users/Xu/Desktop/someText/docs/network/section-13-20.md")

    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')

    new_lines = []
    i = 0
    replaced = []

    while i < len(lines):
        line = lines[i]

        # Detect mermaid block
        if line.strip() == '```mermaid':
            # Get the next few lines to determine the diagram type
            next_lines = []
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith('```'):
                next_lines.append(lines[j])
                j += 1

            code = '\n'.join(next_lines)

            # Determine which diagram this is
            image_ref = None
            desc = ""

            if 'HTTP 版本演进' in code or 'timeline' in code.lower():
                image_ref = "assets/images/mermaid/network-http-versions.png"
                desc = "HTTP 版本演进时间线"
            elif 'HTTP/1.1 队头阻塞' in code:
                image_ref = "assets/images/mermaid/network-http11-head-block.png"
                desc = "HTTP/1.1 队头阻塞示意"
            elif 'HTTP/2 多路复用' in code:
                image_ref = "assets/images/mermaid/network-http2-multiplexing.png"
                desc = "HTTP/2 多路复用示意"
            elif 'HTTP/2 TCP 层队头阻塞' in code:
                image_ref = "assets/images/mermaid/network-http2-tcp-block.png"
                desc = "HTTP/2 TCP 层队头阻塞"
            elif 'HTTP/3' in code and 'QUIC' in code:
                image_ref = "assets/images/mermaid/network-http3-stack.png"
                desc = "HTTP/3 协议栈"
            elif 'HTTP 无状态设计' in code or 'keep-alive' in code:
                image_ref = "assets/images/mermaid/network-http-stateless.png"
                desc = "HTTP 无状态与 keep-alive"
            elif '重新设计传输层协议' in code or 'UDP' in code:
                image_ref = "assets/images/mermaid/network-quic-udp.png"
                desc = "QUIC 选择 UDP 的原因"
            elif '丢包检测' in code or 'ACK Ranges' in code:
                image_ref = "assets/images/mermaid/network-quic-packet-loss.png"
                desc = "QUIC 丢包检测与恢复"
            elif '连接迁移' in code:
                image_ref = "assets/images/mermaid/network-quic-migration.png"
                desc = "QUIC 连接迁移"
            elif '公共头部' in code and '认证标签' in code:
                image_ref = "assets/images/mermaid/network-quic-packet.png"
                desc = "QUIC 包结构"

            if image_ref:
                new_lines.append(f'![{desc}]({image_ref})')
                new_lines.append('')
                replaced.append(desc)
                # Skip to end of mermaid block
                i = j + 1
                continue
            else:
                # Keep the original block if no match
                new_lines.append(line)
                i += 1
                continue
        else:
            new_lines.append(line)
        i += 1

    # Write the result
    file_path.write_text('\n'.join(new_lines), encoding='utf-8')

    print(f"Replaced {len(replaced)} mermaid blocks in network/section-13-20.md")
    for r in replaced:
        print(f"  - {r}")

    return replaced


if __name__ == "__main__":
    process_network_section()