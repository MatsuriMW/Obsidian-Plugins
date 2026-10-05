const { Plugin, MarkdownView, Menu, Keymap, TFile, debounce, editorInfoField, editorLivePreviewField } = require("obsidian");
const { ViewPlugin, Decoration, WidgetType } = require("@codemirror/view");
const { StateEffect } = require("@codemirror/state");
const { syntaxTree } = require("@codemirror/language");

// 锚文本最多显示多少个字，完整内容放在鼠标悬停的 title 里
const SNIPPET_MAX = 40;
// [[页#^id]] / [[页#^id|别名]] / [[#^id]]；以 ! 开头的是嵌入，不处理
const LINK_RE = /(!?)\[\[([^\]|#]*)#\^([A-Za-z0-9-]+)(?:\|([^\]]*))?\]\]/g;
const BLOCK_ID_RE = /(?:^|\s)\^([A-Za-z0-9-]+)\s*$/;
// Logseq 迁移时自动生成的别名「页 > ^id」，等于没写别名
const AUTO_ALIAS_RE = /^.* > \^[A-Za-z0-9-]+$/;
const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s/;
const refresh = StateEffect.define();

// 把块的原文压成一行可读的锚文本
function cleanLine(line) {
  let s = line.trim();
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^(?:[-*+]|\d+[.)])\s+/, "")
      .replace(/^\[[ xX\-\/]\]\s+/, "")
      .replace(/^(?:TODO|DOING|DONE|LATER|NOW|WAITING|CANCELED|CANCELLED)\s+/, "")
      .replace(/^#{1,6}\s+/, "")
      .replace(/^(?:>\s*)+/, "");
  }
  if (/^[\w-]+::\s/.test(s) || /^\^[A-Za-z0-9-]+$/.test(s)) return "";   // Logseq 属性行、单独一行的块 id
  return s
    .replace(/\s\^[A-Za-z0-9-]+\s*$/, "")
    .replace(/!?\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/!?\[\[([^\]]*)\]\]/g, (m, p) => p.split("#")[0] || p)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[[^\[\]]+::[^\]]*\]/g, "")
    .replace(/==|\*\*|__|~~|`/g, "")
    .replace(/(^|\s)#(?:card|flashcard|reversed)(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
function cleanText(raw) {
  for (const line of raw.split("\n")) {
    const s = cleanLine(line);
    if (s) return s;
  }
  return "";
}
const truncate = (s) => (s.length > SNIPPET_MAX ? s.slice(0, SNIPPET_MAX) + "…" : s);

function inCode(state, pos) {
  for (let n = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (/code|math|frontmatter/i.test(n.name)) return true;
  }
  return false;
}

module.exports = class BlockRefPlus extends Plugin {
  onload() {
    this.snippets = new Map();   // "目标路径#id" -> 锚文本；null = 块不存在
    this.loading = new Set();
    this.refs = new Map();       // "目标路径#id" -> [{ source, line }]
    this.bySource = new Map();   // 来源路径 -> 它贡献过的 key
    this.refreshAll = debounce(() => this.refreshEditors(), 150, true);

    this.registerEditorExtension(this.buildExtension());
    this.registerMarkdownPostProcessor((el, ctx) => this.postProcess(el, ctx));

    const mc = this.app.metadataCache;
    this.registerEvent(mc.on("changed", (file, data, cache) => {
      this.indexFile(file, cache);
      this.forgetSnippets(file.path);
      this.refreshAll();
    }));
    this.registerEvent(mc.on("deleted", (file) => {
      this.unindexSource(file.path);
      this.forgetSnippets(file.path);
      this.refreshAll();
    }));
    this.registerEvent(this.app.vault.on("rename", () => {
      this.snippets.clear();
      this.rebuildIndex();
    }));

    this.addCommand({
      id: "rebuild-index",
      name: "重建块引用索引",
      callback: () => { this.snippets.clear(); this.rebuildIndex(); },
    });

    this.app.workspace.onLayoutReady(() => this.rebuildIndex());
  }

  // ---------- 引用索引 ----------

  rebuildIndex() {
    this.refs.clear();
    this.bySource.clear();
    for (const file of this.app.vault.getMarkdownFiles()) {
      this.indexFile(file, this.app.metadataCache.getFileCache(file));
    }
    this.refreshAll();
    // 阅读视图不会自己重画，索引建好后刷一遍，角标才出得来
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      const v = leaf.view;
      if (v instanceof MarkdownView && v.getMode() === "preview") v.previewMode.rerender(true);
    });
  }

  unindexSource(path) {
    for (const key of this.bySource.get(path) || []) {
      const list = (this.refs.get(key) || []).filter((r) => r.source !== path);
      if (list.length) this.refs.set(key, list);
      else this.refs.delete(key);
    }
    this.bySource.delete(path);
  }

  indexFile(file, cache) {
    this.unindexSource(file.path);
    if (!cache) return;
    const keys = new Set();
    for (const l of [...(cache.links || []), ...(cache.embeds || [])]) {
      const i = l.link.indexOf("#^");
      if (i < 0) continue;
      const target = this.resolve(l.link.slice(0, i), file.path);
      if (!target) continue;
      const key = target.path + "#" + l.link.slice(i + 2).toLowerCase();
      if (!this.refs.has(key)) this.refs.set(key, []);
      this.refs.get(key).push({ source: file.path, line: l.position.start.line });
      keys.add(key);
    }
    if (keys.size) this.bySource.set(file.path, keys);
  }

  count(key) {
    const list = this.refs.get(key);
    return list ? list.length : 0;
  }

  resolve(linkpath, sourcePath) {
    if (!linkpath) return this.app.vault.getAbstractFileByPath(sourcePath);
    return this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
  }

  // ---------- 块内容（动态锚文本） ----------

  forgetSnippets(path) {
    const prefix = path + "#";
    for (const key of [...this.snippets.keys()]) if (key.startsWith(prefix)) this.snippets.delete(key);
  }

  async loadSnippet(file, id) {
    const key = file.path + "#" + id;
    if (this.snippets.has(key)) return this.snippets.get(key);
    const block = this.app.metadataCache.getFileCache(file)?.blocks?.[id];
    let text = null;
    const content = await this.app.vault.cachedRead(file);
    if (block) {
      text = cleanText(content.slice(block.position.start.offset, block.position.end.offset)) || null;
    } else {
      // Logseq 迁移来的块：^id 后面还跟着 source:: 之类的续行，Obsidian 不认，退回按行找
      const escaped = id.replace(/[-]/g, "\\-");
      const m = new RegExp(`^(.*)\\s\\^${escaped}[ \\t]*$`, "im").exec(content);
      if (m) text = cleanText(m[1]) || null;
    }
    this.snippets.set(key, text);
    return text;
  }

  // 编辑器里要同步拿结果：有缓存就返回，没有就先去读，读完再刷新一次
  peekSnippet(file, id) {
    const key = file.path + "#" + id;
    if (this.snippets.has(key)) return this.snippets.get(key);
    if (!this.loading.has(key)) {
      this.loading.add(key);
      this.loadSnippet(file, id).finally(() => { this.loading.delete(key); this.refreshAll(); });
    }
    return undefined;
  }

  refreshEditors() {
    this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
      const cm = leaf.view?.editor?.cm;
      if (cm) cm.dispatch({ effects: refresh.of(null) });
    });
  }

  // ---------- 引用列表菜单 ----------

  async showRefsMenu(evt, key) {
    const list = this.refs.get(key) || [];
    const menu = new Menu();
    for (const r of list) {
      const file = this.app.vault.getAbstractFileByPath(r.source);
      if (!(file instanceof TFile)) continue;
      const lines = (await this.app.vault.cachedRead(file)).split("\n");
      const line = lines[r.line] || "";
      // 引用处如果只有一条链接，就显示它上级块的内容，好知道是在什么语境下引用的
      let text = cleanLine(line.replace(/!?\[\[[^\]]*#\^[^\]]*\]\]/g, ""));
      if (!text) {
        const indent = line.match(/^\s*/)[0].length;
        for (let i = r.line - 1; i >= 0; i--) {
          if (!lines[i].trim() || lines[i].match(/^\s*/)[0].length >= indent) continue;
          text = "↳ " + cleanLine(lines[i]);
          break;
        }
      }
      menu.addItem((item) => item
        .setTitle(`${file.basename}　${text.length > 50 ? text.slice(0, 50) + "…" : text}`)
        .setIcon("link")
        .onClick(() => this.app.workspace.getLeaf(Keymap.isModEvent(evt)).openFile(file, { eState: { line: r.line } })));
    }
    menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
  }

  makeBadge(key, n) {
    const el = createSpan({ cls: "brp-count", text: String(n), attr: { "aria-label": `被引用 ${n} 次，点开查看` } });
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); this.showRefsMenu(e, key); });
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    return el;
  }

  // ---------- 阅读视图 ----------

  postProcess(el, ctx) {
    // 动态锚文本：没写别名（或只有迁移时自动生成的别名）的块链接，显示成块内容
    el.querySelectorAll("a.internal-link").forEach((a) => {
      const href = a.getAttribute("data-href") || "";
      const i = href.indexOf("#^");
      if (i < 0) return;
      const shown = a.textContent;
      if (shown !== href && shown !== href.replace("#^", " > ^") && !AUTO_ALIAS_RE.test(shown)) return;
      const target = this.resolve(href.slice(0, i), ctx.sourcePath);
      if (!(target instanceof TFile)) return;
      this.loadSnippet(target, href.slice(i + 2).toLowerCase()).then((text) => {
        if (!text) return;
        a.textContent = truncate(text);
        a.addClass("brp-ref");
        a.setAttribute("aria-label", text);
      });
    });

    // 被引用计数
    const info = ctx.getSectionInfo(el);
    if (!info) return;
    const lines = info.text.split("\n");
    for (let ln = info.lineStart; ln <= info.lineEnd; ln++) {
      const m = BLOCK_ID_RE.exec(lines[ln] || "");
      if (!m) continue;
      const key = ctx.sourcePath + "#" + m[1].toLowerCase();
      const n = this.count(key);
      if (!n) continue;
      // 块 id 单独占一行时，归属于上面那个列表项
      let owner = ln;
      while (owner > info.lineStart && !LIST_LINE.test(lines[owner])) owner--;
      const li = LIST_LINE.test(lines[owner]) ? el.querySelector(`li[data-line="${owner - info.lineStart}"]`) : null;
      const host = li || el.firstElementChild || el;
      if (host.querySelector(":scope > .brp-count")) continue;
      const sub = li && li.querySelector(":scope > ul, :scope > ol");
      host.insertBefore(this.makeBadge(key, n), sub || null);
    }
  }

  // ---------- 编辑器（实时预览 / 源码） ----------

  buildExtension() {
    const plugin = this;

    class RefWidget extends WidgetType {
      constructor(text, linktext, sourcePath) {
        super();
        this.text = text;
        this.linktext = linktext;
        this.sourcePath = sourcePath;
      }
      eq(o) { return o.text === this.text && o.linktext === this.linktext; }
      toDOM() {
        const el = createSpan({ cls: "brp-ref cm-hmd-internal-link", text: truncate(this.text), attr: { "aria-label": this.text } });
        el.addEventListener("click", (e) => {
          e.preventDefault();
          plugin.app.workspace.openLinkText(this.linktext, this.sourcePath, Keymap.isModEvent(e));
        });
        el.addEventListener("mouseover", (e) => {
          plugin.app.workspace.trigger("hover-link", {
            event: e, source: "editor", hoverParent: plugin, targetEl: el,
            linktext: this.linktext, sourcePath: this.sourcePath,
          });
        });
        return el;
      }
      ignoreEvent() { return true; }
    }

    class CountWidget extends WidgetType {
      constructor(key, n) { super(); this.key = key; this.n = n; }
      eq(o) { return o.key === this.key && o.n === this.n; }
      toDOM() { return plugin.makeBadge(this.key, this.n); }
      ignoreEvent() { return true; }
    }

    return ViewPlugin.fromClass(class {
      constructor(view) { this.decorations = this.build(view); }
      update(u) {
        if (u.docChanged || u.viewportChanged || u.selectionSet ||
            u.transactions.some((t) => t.effects.some((e) => e.is(refresh)))) {
          this.decorations = this.build(u.view);
        }
      }
      build(view) {
        const file = view.state.field(editorInfoField, false)?.file;
        if (!file) return Decoration.none;
        const livePreview = view.state.field(editorLivePreviewField, false);
        const sel = view.state.selection.ranges;
        const decos = [];
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to;) {
            const line = view.state.doc.lineAt(pos);
            const text = line.text;
            if (livePreview) {
              LINK_RE.lastIndex = 0;
              let m;
              while ((m = LINK_RE.exec(text))) {
                if (m[1] || text.slice(m.index - 2, m.index) === "](") continue;
                const s = line.from + m.index, e = s + m[0].length;
                if (sel.some((r) => r.from <= e && r.to >= s)) continue;   // 光标在链接上时露出原文，方便改
                if (m[4] && !AUTO_ALIAS_RE.test(m[4])) continue;          // 手写了别名 = 静态锚文本，尊重它
                if (inCode(view.state, s)) continue;
                const target = plugin.resolve(m[2], file.path);
                if (!(target instanceof TFile)) continue;
                const snip = plugin.peekSnippet(target, m[3].toLowerCase());
                if (!snip) continue;
                const linktext = `${m[2]}#^${m[3]}`;
                decos.push(Decoration.replace({ widget: new RefWidget(snip, linktext, file.path) }).range(s, e));
              }
            }
            const bm = BLOCK_ID_RE.exec(text);
            if (bm && !inCode(view.state, line.to - 1)) {
              const key = file.path + "#" + bm[1].toLowerCase();
              const n = plugin.count(key);
              if (n) decos.push(Decoration.widget({ widget: new CountWidget(key, n), side: 1 }).range(line.to));
            }
            pos = line.to + 1;
          }
        }
        return Decoration.set(decos, true);
      }
    }, { decorations: (v) => v.decorations });
  }
};
