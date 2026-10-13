const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });
function folded(text) {
  // Fold each grapheme independently so final-sigma casing cannot vary by word position.
  return [...segmenter.segment(text)].map(({ segment }) => segment.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('und').replace(/\u03c2/gu, '\u03c3')).join('');
}
// Returns original UTF-16 offsets. This is simple per-grapheme lowercase matching, not full Unicode case folding or collation.
export function findFolded(text, query) {
  const needle = folded(query);
  if (!needle) return [];
  // Segment graphemes so a decomposed mark stays inside its base letter's source range.
  const chars = [...segmenter.segment(text)].map((part) => part.segment);
  const offsets = [];
  let cursor = 0;
  for (const char of chars) { offsets.push(cursor); cursor += char.length; }
  const normalized = chars.map((char) => folded(char));
  const hits = [];
  for (let i = 0; i < normalized.length; i += 1) {
    let candidate = '';
    for (let j = i; j < normalized.length && candidate.length <= needle.length; j += 1) {
      candidate += normalized[j];
      if (candidate === needle) { hits.push([offsets[i], offsets[j] + chars[j].length]); break; }
      if (!needle.startsWith(candidate)) break;
    }
  }
  return hits;
}
