/* ==========================================================================
   图表渲染器：网页与 PDF 书籍共用。
   职责：用 Mermaid 渲染，再按"层级"给图上色。
   - 嵌套子图：每个顶层子图一个色相，嵌套越深底色越浓；
   - 子图内的节点继承所在子图的色相；
   - 不在子图里的节点按"层级位置"循环取色，菱形（判断）统一用琥珀色；
   - 时序图的参与者按顺序取色；
   - 浅色 / 深色 / 印刷三套取值，网页随主题切换重绘。
   用户在图里显式写的 style / classDef 优先，不被覆盖。
   ========================================================================== */
(function () {
  "use strict";

  // 色相表：蓝 紫 青 琥珀 玫红 绿，相邻色相差异足够大且整体和谐
  var HUES = [212, 262, 172, 34, 336, 142];
  var RANK_HUES = [212, 262, 172, 142]; // 无子图时，按层级循环
  var AMBER = 34;

  var hsl = function (h, s, l, a) {
    return "hsl(" + h + " " + s + "% " + l + "%" + (a === undefined ? "" : " / " + a) + ")";
  };

  // 每个色相在三种模式下的取值
  function tone(h, mode) {
    if (mode === "dark") {
      return {
        nodeFill: hsl(h, 38, 21), nodeStroke: hsl(h, 55, 56), nodeText: hsl(h, 45, 92),
        c0Fill: hsl(h, 26, 15), c0Stroke: hsl(h, 30, 32), c0Text: hsl(h, 40, 80),
        c1Fill: hsl(h, 28, 19), c1Stroke: hsl(h, 34, 38), c1Text: hsl(h, 45, 85),
      };
    }
    var print = mode === "print";
    return {
      nodeFill: hsl(h, 92, print ? 95 : 96), nodeStroke: hsl(h, print ? 55 : 60, print ? 55 : 62), nodeText: hsl(h, 55, 17),
      c0Fill: hsl(h, 70, 97.5), c0Stroke: hsl(h, 40, print ? 74 : 82), c0Text: hsl(h, 45, 32),
      c1Fill: hsl(h, 65, 94.5), c1Stroke: hsl(h, 42, print ? 68 : 76), c1Text: hsl(h, 50, 28),
    };
  }

  function palette(mode) {
    var dark = mode === "dark";
    return {
      edge: dark ? "#9a9aa4" : "#6b6f7a",
      label: dark ? "#16161a" : "#ffffff",
      labelText: dark ? "#d8d8de" : "#3a3a40",
      noteFill: dark ? "hsl(40 32% 19%)" : "hsl(44 100% 93%)",
      noteStroke: dark ? "hsl(40 45% 45%)" : "hsl(42 75% 62%)",
      noteText: dark ? "hsl(42 70% 85%)" : "hsl(38 70% 20%)",
      lifeline: dark ? "#55555e" : "#b9bcc6",
    };
  }

  function themeVariables(mode, fontFamily, fontSize) {
    var p = palette(mode), t = tone(212, mode), dark = mode === "dark";
    return {
      fontFamily: fontFamily, fontSize: fontSize,
      darkMode: dark, background: "transparent",
      primaryColor: t.nodeFill, primaryTextColor: t.nodeText, primaryBorderColor: t.nodeStroke,
      lineColor: p.edge, secondaryColor: t.c0Fill, tertiaryColor: t.c0Fill,
      noteBkgColor: p.noteFill, noteTextColor: p.noteText, noteBorderColor: p.noteStroke,
      actorBkg: t.nodeFill, actorBorder: t.nodeStroke, actorTextColor: t.nodeText, actorLineColor: p.lifeline,
      signalColor: p.edge, signalTextColor: p.labelText,
      labelBoxBkgColor: t.c0Fill, labelBoxBorderColor: t.c0Stroke, labelTextColor: p.labelText,
      loopTextColor: p.labelText, activationBkgColor: t.c1Fill, activationBorderColor: t.c1Stroke,
      sequenceNumberColor: dark ? "#16161a" : "#ffffff",
      edgeLabelBackground: p.label,
    };
  }

  function box(el) { return el.getBoundingClientRect(); }
  function contains(a, b) {
    var e = 1.5;
    return a.left <= b.left + e && a.right >= b.right - e && a.top <= b.top + e && a.bottom >= b.bottom - e &&
      a.width * a.height > b.width * b.height;
  }
  function setStyle(el, props) {
    if (!el) return;
    for (var k in props) el.style.setProperty(k, props[k], "important");
  }
  function hasOwnFill(shape) {
    var s = shape && shape.getAttribute("style");
    return !!(s && /fill\s*:/.test(s) && !/!important/.test(s));
  }

  function shapeOf(node) {
    return node.querySelector("rect, polygon, circle, ellipse, path.label-container, path");
  }

  function colorize(svg, mode, source) {
    var p = palette(mode);

    // 全局：连线、箭头、连线标签、文字。
    // 只用行内样式：SVG 里的 <style> 对整个文档生效，几十张图重复注入会拖垮分页引擎。
    var each = function (sel, fn) { Array.prototype.forEach.call(svg.querySelectorAll(sel), fn); };
    each(".edgePath path, .flowchart-link, .messageLine0, .messageLine1, .transition, .relation, path.path", function (e) { setStyle(e, { stroke: p.edge }); });
    each("marker path, .arrowheadPath, .arrowMarkerPath", function (e) { setStyle(e, { fill: p.edge, stroke: p.edge }); });
    each(".edgeLabel, .edgeLabel p, .edgeLabel span, .labelBkg, .edgeLabel .label", function (e) { setStyle(e, { "background-color": p.label, color: p.labelText }); });
    each(".edgeLabel rect", function (e) { setStyle(e, { fill: p.label }); });
    each("foreignObject", function (e) { e.style.overflow = "visible"; });
    each(".actor-line, line.actor-line", function (e) { setStyle(e, { stroke: p.lifeline }); });
    each(".messageText, .labelText, .loopText, .loopText > tspan", function (e) { setStyle(e, { fill: p.labelText }); });
    each(".loopLine", function (e) { setStyle(e, { stroke: p.edge }); });
    each(".note", function (e) { setStyle(e, { fill: p.noteFill, stroke: p.noteStroke }); });
    each(".noteText, .noteText > tspan", function (e) { setStyle(e, { fill: p.noteText }); });
    // 给一个分组里的文字上色（HTML 标签与 SVG 文字两种）
    var paintText = function (g, color, bold) {
      Array.prototype.forEach.call(g.querySelectorAll(".nodeLabel, .nodeLabel p, span, text, tspan, foreignObject div"), function (e) {
        var o = { color: color, fill: color };
        if (bold) o["font-weight"] = "600";
        setStyle(e, o);
      });
    };

    // ---- 子图 ----
    var clusters = Array.prototype.map.call(svg.querySelectorAll("g.cluster"), function (g) {
      var r = g.querySelector("rect") || g.querySelector("path");
      return { g: g, rect: r, b: r ? box(r) : null };
    }).filter(function (c) { return c.b && c.b.width > 0; });
    clusters.forEach(function (c) {
      c.parent = null;
      clusters.forEach(function (o) {
        if (o !== c && contains(o.b, c.b) && (!c.parent || contains(c.parent.b, o.b))) c.parent = o;
      });
      var d = 0; for (var q = c.parent; q; q = q.parent) d++;
      c.depth = d;
    });
    var rootIndex = 0;
    clusters.forEach(function (c) {
      var root = c; while (root.parent) root = root.parent;
      if (root.hue === undefined) root.hue = HUES[rootIndex++ % HUES.length];
      c.hue = root.hue;
      var t = tone(c.hue, mode), lvl = c.depth === 0 ? "c0" : "c1";
      setStyle(c.rect, { fill: t[lvl + "Fill"], stroke: t[lvl + "Stroke"], "stroke-width": "1.2px", rx: "12px", ry: "12px" });
      paintText(c.g, t[lvl + "Text"], true);
    });

    // ---- 节点 ----
    var nodes = Array.prototype.map.call(svg.querySelectorAll("g.node"), function (g) {
      var s = shapeOf(g);
      return { g: g, shape: s, b: box(g) };
    }).filter(function (n) { return n.shape && n.b.width > 0; });
    var horizontal = /^\s*(flowchart|graph)\s+(LR|RL)/i.test(source || "");
    var plain = nodes.filter(function (n) {
      n.cluster = null;
      var cx = n.b.left + n.b.width / 2, cy = n.b.top + n.b.height / 2;
      clusters.forEach(function (c) {
        if (cx >= c.b.left && cx <= c.b.right && cy >= c.b.top && cy <= c.b.bottom && (!n.cluster || c.depth > n.cluster.depth)) n.cluster = c;
      });
      return !n.cluster;
    });
    // 层级位置：沿主方向把中心坐标聚类
    var centers = plain.map(function (n) { return horizontal ? n.b.left + n.b.width / 2 : n.b.top + n.b.height / 2; }).sort(function (a, b) { return a - b; });
    var ranks = [];
    centers.forEach(function (v) { if (!ranks.length || v - ranks[ranks.length - 1] > 10) ranks.push(v); });
    nodes.forEach(function (n, i) {
      if (hasOwnFill(n.shape)) return;
      var hue, poly = n.g.querySelector("polygon");
      var diamond = poly && (poly.getAttribute("points") || "").trim().split(/\s+/).length === 4;
      if (diamond) hue = AMBER; // 判断节点统一用琥珀色
      else if (n.cluster) hue = n.cluster.hue;
      else {
        var v = horizontal ? n.b.left + n.b.width / 2 : n.b.top + n.b.height / 2, r = 0;
        for (var k = 0; k < ranks.length; k++) if (Math.abs(ranks[k] - v) <= 10) { r = k; break; }
        hue = RANK_HUES[r % RANK_HUES.length];
      }
      var t = tone(hue, mode);
      var targets = n.g.querySelectorAll("rect, polygon, circle, ellipse, path.label-container");
      if (!targets.length) targets = [n.shape];
      Array.prototype.forEach.call(targets, function (el) { setStyle(el, { fill: t.nodeFill, stroke: t.nodeStroke, "stroke-width": "1.3px" }); if (el.tagName === "rect") { el.setAttribute("rx", "7"); el.setAttribute("ry", "7"); } });
      paintText(n.g, t.nodeText, false);
    });

    // ---- 时序图：参与者按出场顺序取色 ----
    var actors = {}, ai = 0;
    Array.prototype.forEach.call(svg.querySelectorAll("rect.actor"), function (r) {
      var name = r.getAttribute("name") || String(ai);
      if (actors[name] === undefined) actors[name] = HUES[ai++ % HUES.length];
      var t = tone(actors[name], mode);
      setStyle(r, { fill: t.nodeFill, stroke: t.nodeStroke, "stroke-width": "1.3px", rx: "8px", ry: "8px" });
      if (r.parentNode) paintText(r.parentNode, t.nodeText, false);
    });
    Array.prototype.forEach.call(svg.querySelectorAll("rect[class^='activation']"), function (r) {
      var t = tone(212, mode);
      setStyle(r, { fill: t.c1Fill, stroke: t.c1Stroke });
    });
  }

  // ---- 渲染 ----
  var uid = 0;
  var state = { mode: "light", font: "sans-serif", size: "16px", inited: false };

  function currentMode() {
    return document.body && document.body.getAttribute("data-md-color-scheme") === "slate" ? "dark" : "light";
  }

  function initMermaid(mode, opts) {
    var cs = getComputedStyle(document.documentElement);
    state.font = (cs.getPropertyValue("--font-sans") || "").trim() || "sans-serif";
    state.size = (opts && opts.fontSize) || "16px";
    window.mermaid.initialize({
      startOnLoad: false, securityLevel: "loose", theme: "base",
      themeVariables: themeVariables(mode, state.font, state.size),
      flowchart: { htmlLabels: true, curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 44 },
      sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 60 },
      state: { useMaxWidth: true }, class: { useMaxWidth: true },
    });
    state.mode = mode;
  }

  async function draw(fig, mode, opts) {
    var src = fig._src;
    if (state.mode !== mode || !state.inited) { initMermaid(mode, opts); state.inited = true; }
    var out = await window.mermaid.render("fi-d" + (++uid), src);
    fig.innerHTML = out.svg;
    fig.classList.remove("diagram-failed");
    var svg = fig.querySelector("svg");
    if (svg) { try { colorize(svg, mode, src); } catch (e) { /* 配色失败时保留 Mermaid 默认主题 */ } }
    fig._mode = mode;
  }

  // 把 pre.diagram 变成 figure.diagram；返回 figure 列表
  function prepare(root) {
    var figs = [];
    Array.prototype.forEach.call((root || document).querySelectorAll("pre.diagram"), function (pre) {
      var fig = document.createElement("figure");
      fig.className = "diagram";
      fig._src = (pre.querySelector("code") || pre).textContent;
      fig.setAttribute("aria-label", "图表");
      pre.replaceWith(fig);
      figs.push(fig);
    });
    return figs;
  }

  /** 渲染一页（或一个容器）里的全部图。opts: {mode, eager, fontSize, onError} */
  async function renderAll(root, opts) {
    opts = opts || {};
    var mode = opts.mode || currentMode();
    // 字体就绪后再量字，否则标签宽度按回退字体计算会被裁切
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* 忽略 */ } }
    var figs = prepare(root);
    var stats = { ok: 0, bad: 0, fails: [] };
    var one = async function (fig) {
      try { await draw(fig, mode, opts); stats.ok++; }
      catch (e) {
        stats.bad++; fig.classList.add("diagram-failed");
        var msg = String((e && e.message) || e).split("\n")[0].slice(0, 120);
        stats.fails.push({ err: msg, src: fig._src.trim().split("\n").slice(0, 2).join(" | ").slice(0, 100) });
        fig.textContent = "图表渲染失败：" + msg;
      }
    };
    if (opts.eager || !("IntersectionObserver" in window)) {
      for (var i = 0; i < figs.length; i++) await one(figs[i]);
    } else {
      // 网页：进入视口附近再渲染，长页面不卡
      var queue = Promise.resolve();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          queue = queue.then(function () { return one(en.target); });
        });
      }, { rootMargin: "600px 0px" });
      figs.forEach(function (f) { f.style.minHeight = "6rem"; io.observe(f); });
    }
    return stats;
  }

  /** 切换主题后，重绘页面上已渲染的图 */
  async function redraw(mode) {
    var figs = document.querySelectorAll("figure.diagram");
    for (var i = 0; i < figs.length; i++) {
      var f = figs[i];
      if (f._src && f._mode && f._mode !== mode) { try { await draw(f, mode); } catch (e) { /* 保留旧图 */ } }
    }
  }

  window.FIDiagrams = { renderAll: renderAll, redraw: redraw, tone: tone, palette: palette, HUES: HUES };

  // ---- 网页自动启动（书籍构建会自己调用 renderAll，不走这里）----
  function boot() {
    if (!window.mermaid || window.__FI_BOOK__) return;
    renderAll(document, {});
  }
  if (typeof window.document$ !== "undefined" && window.document$.subscribe) window.document$.subscribe(boot);
  else document.addEventListener("DOMContentLoaded", boot);
  if (typeof MutationObserver !== "undefined") {
    var wait = setInterval(function () {
      if (!document.body) return;
      clearInterval(wait);
      new MutationObserver(function () { redraw(currentMode()); }).observe(document.body, { attributes: true, attributeFilter: ["data-md-color-scheme"] });
    }, 50);
  }
})();
