export function evaluate(source) {
  const tokens = []; const scanner = /\s*(\d+(?:\.\d+)?|[()+*/-])/gy;
  while (scanner.lastIndex < source.length) {
    scanner.lastIndex = source.slice(scanner.lastIndex).search(/\S/) < 0 ? source.length : scanner.lastIndex + source.slice(scanner.lastIndex).search(/\S/);
    if (scanner.lastIndex === source.length) break;
    const match = scanner.exec(source);
    if (!match) throw new SyntaxError(`invalid character at ${scanner.lastIndex}`);
    tokens.push({ text: match[1], at: match.index + match[0].length - match[1].length });
  }
  let cursor = 0; const peek = () => tokens[cursor]?.text; const take = () => tokens[cursor++];
  function primary() {
    if (peek() === '(') { take(); const value = expression(); if (take()?.text !== ')') throw new SyntaxError(`expected ) at ${tokens[cursor - 1]?.at ?? source.length}`); return value; }
    const token = take(); if (!token || !/^\d/.test(token.text)) throw new SyntaxError(`expected number at ${token?.at ?? source.length}`); return Number(token.text);
  }
  function product() { let value = primary(); while (peek() === '*' || peek() === '/') { const op = take().text; const right = primary(); value = op === '*' ? value * right : value / right; } return value; }
  function expression() { let value = product(); while (peek() === '+' || peek() === '-') { const op = take().text; const right = product(); value = op === '+' ? value + right : value - right; } return value; }
  const result = expression(); if (cursor !== tokens.length) throw new SyntaxError(`unexpected ${peek()} at ${tokens[cursor].at}`); return result;
}
