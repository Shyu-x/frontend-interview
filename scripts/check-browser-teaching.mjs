// Start browser-server.mjs first. Uses the real Chromium UI and Web APIs.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const binary = process.env.AGENT_BROWSER_EXECUTABLE ?? 'agent-browser';
const session = 'teaching-regression';
const root = 'http://127.0.0.1:8123';
const run = (...args) => execFileSync(binary, ['--session', session, ...args], { encoding: 'utf8', timeout: 35_000 }).trim();
const check = (expression) => assert.equal(JSON.parse(run('eval', expression)), true, expression);
const wait = (expression) => run('wait', '--fn', expression);
const click = (selector) => run('click', selector);

try {
  run('--executable-path', process.env.CHROME_PATH ?? '/usr/bin/chromium', 'open', `${root}/scripts/teaching-labs/web/network-demo.html`);
  click('#xhr-success');
  wait('document.querySelector("#xhr-result").textContent.includes("ready")');
  check('document.querySelector("#xhr-status").textContent.includes("200")');
  click('#xhr-failure');
  wait('document.querySelector("#xhr-status").textContent.includes("503")');
  click('#xhr-cancel-start'); click('#xhr-cancel');
  wait('document.querySelector("#xhr-status").textContent.includes("已取消")');
  click('#fetch-success');
  wait('document.querySelector("#fetch-result").textContent.includes("ready")');
  click('#fetch-failure');
  wait('document.querySelector("#fetch-status").textContent.includes("404")');
  click('#fetch-cancel-start'); click('#fetch-cancel');
  wait('document.querySelector("#fetch-status").textContent.includes("已取消")');
  click('#search-old'); click('#search-new');
  wait('document.querySelector("#search-status").textContent.includes("当前结果：new")');
  console.log('PASS native XHR/fetch: success, HTTP failures, abort, latest-wins');

  run('open', `${root}/scripts/teaching-labs/web/demo.html`);
  click('#add-row');
  check('document.querySelectorAll("#orders li").length === 2');
  click('#orders li:last-child .cancel');
  check('document.querySelector("#list-status").textContent.includes("取消")');
  click('#toggle');
  check('document.querySelector("#toggle").getAttribute("aria-expanded") === "true" && !document.querySelector("#details").hidden');
  run('scrollintoview', '#open-dialog');
  click('#open-dialog');
  wait('document.querySelector("#refund-dialog").open');
  check('document.querySelector("#refund-dialog").open');
  click('#close-dialog');
  wait('document.activeElement.id === "open-dialog"');
  check('!document.querySelector("#refund-dialog").open && document.activeElement.id === "open-dialog"');
  run('focus', '#city'); run('press', 'ArrowDown');
  check('document.querySelector("#city").getAttribute("aria-activedescendant") === "city-0"');
  run('scrollintoview', '#lazy-image');
  wait('document.querySelector("#lazy-image").hasAttribute("src")');
  check('(async () => { const {deepClone} = await import("/scripts/teaching-labs/web/core.mjs"); return deepClone(document.querySelector("#toggle")) === document.querySelector("#toggle"); })()');
  console.log('PASS native DOM: delegation, disclosure, dialog focus, combobox, IntersectionObserver');

  check(`(async () => {
    const {SseParser} = await import('/scripts/implementation-labs/systems/sse-parser.mjs');
    const endpoint = '/api/sse-parsing-reference';
    const native = await new Promise((resolve, reject) => {
      const source = new EventSource(endpoint);
      const rows = [];
      const timer = setTimeout(() => { source.close(); reject(new Error('native SSE did not reach EOF')); }, 3000);
      source.onmessage = event => rows.push({data:event.data,id:event.lastEventId,event:event.type});
      source.onerror = () => { clearTimeout(timer); source.close(); resolve(rows); };
    });
    const response = await fetch(endpoint);
    const reader = response.body.getReader();
    const parser = new SseParser();
    const custom = [];
    try {
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        custom.push(...parser.push(value));
      }
      custom.push(...parser.push(new Uint8Array(),{final:true}));
    } finally { reader.releaseLock(); }
    const expected = [{data:'',id:'fixture-1',event:'message'},{data:'一\\n二',id:'fixture-1',event:'message'}];
    const observed = custom.map(({data,id,event}) => ({data,id,event}));
    return JSON.stringify(native) === JSON.stringify(expected) && JSON.stringify(observed) === JSON.stringify(native);
  })()`);
  console.log('PASS native EventSource agrees with handwritten SSE on byte-chunked UTF-8, empty data, CRLF, multiline data and EOF');

  for (const [width, height] of [[1440, 1000], [1024, 768], [390, 844], [320, 700]]) {
    run('set', 'viewport', String(width), String(height));
    run('open', `${root}/site/coding/practice-distributed-sync/`);
    check('!document.querySelector("article").innerText.includes("**30 秒")');
    check('document.documentElement.scrollWidth <= innerWidth + 1');
    if (width <= 1024) {
      click('.md-header__button[for="__drawer"]');
      wait('document.querySelector("#__drawer").checked');
      wait('Math.abs(document.querySelector(".md-sidebar--primary").getBoundingClientRect().left) < 1');
      check(`(() => { const headers=Array.from(document.querySelectorAll('label.md-nav__title')).filter(x => {
        const r=x.getBoundingClientRect(); return r.width>0 && r.left>=0 && r.left<innerWidth;
      }); return headers.length>0 && headers.every(x => {
        const icon=x.querySelector('.md-nav__icon'); if(!icon) return true;
        const range=document.createRange(); const node=Array.from(x.childNodes).find(n=>n.nodeType===3 && n.textContent.trim());
        if(!node) return true; range.selectNode(node);
        return range.getBoundingClientRect().left >= icon.getBoundingClientRect().right + 5;
      }); })()`);
      const backTarget = JSON.parse(run('eval', `Array.from(document.querySelectorAll('label.md-nav__title[for]'))
        .find(x => x.textContent.includes('前端与全栈进阶题册'))?.getAttribute('for')`));
      assert.ok(backTarget, 'expected nested navigation back control');
      click(`label.md-nav__title[for="${backTarget}"]`);
      check(`document.getElementById(${JSON.stringify(backTarget)}).checked === false`);
    }
    console.log(`PASS site layout and prose at ${width}x${height}`);
  }
  for (const width of [1440, 390]) {
    run('set', 'viewport', String(width), '900');
    for (const path of ['agent/mcp/mcp-integration', 'api/json-rpc-and-mcp', 'js/event-loop',
      'browser/http-cache', 'coding/implementation-paths']) {
      run('open', `${root}/site/${path}/`);
      check(`(() => {
        const article=document.querySelector('article');
        if (!article || !article.querySelector('h1')) return false;
        const copy=article.cloneNode(true);
        copy.querySelectorAll('pre,code,script,style').forEach(node=>node.remove());
        return !/\\*\\*[^*\\n]{1,70}\\*\\*|!!!\\s+(?:tip|note|warning)/.test(copy.textContent)
          && document.documentElement.scrollWidth <= innerWidth + 1;
      })()`);
      console.log(`PASS revised tutorial ${path} at width ${width}`);
    }
  }
} finally {
  run('close');
}
