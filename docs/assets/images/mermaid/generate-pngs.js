const fs = require('fs');
const path = require('path');
const https = require('https');

const INPUT_FILE = process.argv[2];
const SECTION_PREFIX = process.argv[3] || 'section-13-20';
const OUTPUT_DIR = 'C:/Users/Xu/Desktop/someText/docs/assets/images/mermaid';

const themeConfig = {
    primaryColor: '#e8eaf6',
    primaryBorderColor: '#5c6bc0',
    primaryTextColor: '#333333',
    lineColor: '#7986cb'
};

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const content = fs.readFileSync(INPUT_FILE, 'utf8');
const lines = content.split(/\r?\n/);

const diagrams = [];
let currentDiagram = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '```mermaid') {
        currentDiagram = { startLine: i + 1, content: [] };
    } else if (currentDiagram !== null) {
        if (line.trim() === '```') {
            currentDiagram.endLine = i + 1;
            diagrams.push({
                index: diagrams.length,
                startLine: currentDiagram.startLine,
                endLine: currentDiagram.endLine,
                content: currentDiagram.content.join('\n').trim()
            });
            currentDiagram = null;
        } else {
            currentDiagram.content.push(line);
        }
    }
}

console.log('Found ' + diagrams.length + ' mermaid diagrams');

function downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: 30000 }, (res) => {
            if (res.statusCode === 200) {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    fs.writeFileSync(outputPath, buffer);
                    resolve(buffer.length);
                });
            } else {
                reject(new Error('HTTP ' + res.statusCode));
            }
        }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
}

async function main() {
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < diagrams.length; i++) {
        const diagram = diagrams[i];
        const outputPath = path.join(OUTPUT_DIR, SECTION_PREFIX + '-' + i + '.png');

        if (fs.existsSync(outputPath)) {
            console.log('  Skipped (exists): ' + path.basename(outputPath));
            successCount++;
            continue;
        }

        const encoded = Buffer.from(diagram.content)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const url = 'https://mermaid.ink/img/' + encoded;

        try {
            await downloadImage(url, outputPath);
            console.log('  Downloaded: ' + path.basename(outputPath));
            successCount++;
        } catch (err) {
            console.error('  Error: ' + err.message);
            failCount++;
        }

        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\nCompleted: ' + successCount + ' succeeded, ' + failCount + ' failed');
}

main().catch(console.error);
