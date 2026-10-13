// Incrementally parse UTF-8 SSE bytes; TextDecoder's stream mode preserves split multibyte characters.
export class SseParser {
  #decoder = new TextDecoder(); #buffer = ''; #data = []; #event = ''; #id = ''; #retry; #ended = false;
  push(bytes, { final = false } = {}) {
    if (this.#ended) throw new Error('stream has ended; create a new parser for a reconnect');
    this.#buffer += this.#decoder.decode(bytes, { stream: !final });
    const events = [];
    if (final) this.#buffer += this.#decoder.decode();
    let start = 0;
    for (let i = 0; i < this.#buffer.length; i++) {
      const char = this.#buffer[i];
      if (char !== '\r' && char !== '\n') continue;
      // A trailing CR may be the first half of CRLF in the next network chunk.
      if (char === '\r' && i === this.#buffer.length - 1 && !final) break;
      this.#line(this.#buffer.slice(start, i), events);
      if (char === '\r' && this.#buffer[i + 1] === '\n') i++;
      start = i + 1;
    }
    this.#buffer = final ? '' : this.#buffer.slice(start);
    // EOF is not a blank-line event delimiter; discard any unterminated event as the standard requires.
    if (final) { this.#data = []; this.#event = ''; this.#ended = true; }
    return events;
  }
  #line(line, events) {
    if (line === '') return this.#dispatch(events);
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'data') this.#data.push(value);
    else if (field === 'event') this.#event = value;
    else if (field === 'id' && !value.includes('\0')) this.#id = value;
    else if (field === 'retry' && /^\d+$/.test(value)) {
      const retry = Number(value);
      if (Number.isSafeInteger(retry)) this.#retry = retry;
    }
  }
  #dispatch(events) {
    const data = this.#data.join('\n');
    // One empty data line still contributes a newline, which dispatch removes to produce data: "".
    if (this.#data.length) events.push({ data, event: this.#event || 'message', id: this.#id, retry: this.#retry });
    this.#data = []; this.#event = '';
  }
}
