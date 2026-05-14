// Script to insert chapters 7 and 8
const fs = require('fs');
const filePath = 'C:/Users/Xu/Desktop/someText/frontend-interview-master.md';
const content = fs.readFileSync(filePath, 'utf8');

const ch9Pos = content.indexOf('\n## Chapter 9:');
if (ch9Pos === -1) { console.error('Chapter 9 not found'); process.exit(1); }

// Find closing fence of last section before Chapter 9
const sectionEnd = content.lastIndexOf('\n---\n\n*Chapters 5 & 6 — 完*\n\n---\n', ch9Pos);
const insertAt = sectionEnd !== -1 ? sectionEnd : ch9Pos;

console.log('Inserting at position:', insertAt);
console.log('Chapter 9 at:', ch9Pos);

// Read chapters content from both separate files
const ch7 = fs.readFileSync('C:/Users/Xu/Desktop/someText/_chapters78.md', 'utf8');
const ch8 = fs.readFileSync('C:/Users/Xu/Desktop/someText/_chapter8.md', 'utf8');
const chContent = ch7 + '\n\n---\n\n' + ch8;

const before = content.slice(0, insertAt);
const after = content.slice(insertAt);
const newContent = before + '\n\n---\n\n' + chContent + '\n\n' + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Done! New length:', newContent.length);
