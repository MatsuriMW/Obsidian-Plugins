const { Plugin, MarkdownRenderer, Component, Notice, setIcon, Keymap, resolveSubpath } = require("obsidian");

// 反链排序（2026-10-05 起取代原来的「按修改时间从新到旧」——迁移、挪文件夹、批量改属性把所有日记的修改时间都刷新了，
// 按它排基本是乱序）：
//   · 非日记的「页面」排在前，按关系紧密度：互相链接 > 属性里写了指向当前页的链接（related/father/domain…）> 正文提到次数，再按名字
//   · 「日记」排在后，按文件名里的日期从新到旧；最近 12 个月按月分段，更早的按年折叠，点年份标题展开
//   · 面板自带的排序菜单会被忽略
const CUSTOM_SORT = true;
const JOURNAL_RE = /^日记\/(\d{4})_(\d{2})_(\d{2})\.md$/;
const RECENT_MONTHS = 12;
const EXTRA_CONTEXT = true;
// 「链接到当前文件」默认展开，「提到当前文件」（未链接提及）默认折叠
const BACKLINK_COLLAPSED = false;
const UNLINKED_COLLAPSED = true;
// 这些文件夹里的笔记，正文底部不显示反链（给视图加 no-backlinks 类，样式在 styles.css）
const NO_BACKLINK_FOLDERS = ["日记/"];
// Roam 式面包屑：命中块上方一行灰字，列出它所在的完整路径（所属标题 › 各级母块），点任意一级跳到那一行
const SHOW_BREADCRUMBS = true;
// 面包屑里带上命中块所在的标题层级（Roam 没有标题，Obsidian 里标题就是块的上级）
const CRUMB_HEADINGS = true;
// 命中的是标题行时，像 Roam 的块带子块一样，把这个标题下的整节内容一起显示
const HEADING_SECTION = true;
// 反链片段按 Markdown 渲染（列表、加粗、链接、复选框等），而不是原样显示源码
const RENDER_MARKDOWN = true;
// 反链条目右上角的 ✎：就地编辑这一块的源码并写回原笔记（⌘↩ 保存，Esc 取消）
const INLINE_EDIT = true;
// 命中块的子块超过这么多行时先折叠，点「展开」再看全部
const FOLD_LINES = 8;
// Roam 式共现页面筛选：反链顶部的「共现筛选」按钮，列出这些引用里还一起出现了哪些页面（带次数），点=只看含它的，Shift 点=排除它
const SHOW_COOCCUR = true;
// 笔记正文底部那份反链加一个就地文字筛选框（侧栏面板自带搜索，这里只给底部补上）
const TEXT_FILTER = true;
// Roam 式块引用计数：命中块若带 ^id，右下角显示它被引用几次，点开看谁在引用
const BLOCK_REFCOUNT = true;
// Shift 点反链面板里的链接/块/文件标题：在右侧栏往下叠放一页，几页并排对照
const SHIFT_STACK = true;
// Shift 点开的块：用 Bullet 插件的「Zoom into list」聚焦进去（只对列表块有效；其余块滚到顶格）
const STACK_ZOOM = true;
// 「共现筛选」默认展开
const COOCCUR_OPEN = true;
// 共现 chip 按「关联紧密度」排序（co 次数 × idf），而不是原始次数——把到处出现的高频页压下去
const RANK_BY_STRENGTH = true;
// 「分组」：按最紧密的几个共现页把反链聚成可折叠的簇，一屏扫完主题交叉
const GROUP_BACKLINKS = true;
// 分组时最多取前几个共现页做簇（其余归入「其它」）
const GROUP_MAX = 8;
// AI 维护的 wiki 层（LLM Wiki）：这里的文件不进反链列表、不参与共现和分组，改在工具栏下方单独列成「📘 Wiki」入口
const WIKI_FOLDER = "Wiki/";
// 名字筛选：当前页有别名时，反链顶部列出「文件名 + 各个别名」，点=只看用这个名字的，Shift 点=排除用这个名字的。
// 「链接当前文件」按链接实际显示的名字算（[[资金成本|资本成本]] 算「资本成本」，[[资金成本]] 算「资金成本」），
// 「提到当前文件名」按提到的文字算。两个列表一起生效
const NAME_FILTER = true;
// 「提到当前文件名」要不要区分大小写：在那篇笔记的属性里写 大小写敏感: true（也认 case-sensitive）。
// 开了之后，只有和文件名 / 别名一字不差（含大小写）的提及才显示。Obsidian 自己没有这个开关，一律不分大小写
const CASE_KEYS = ["大小写敏感", "case-sensitive"];

module.exports = class BacklinkDefaults extends Plugin {
  onload() {
    // 每个面板只设置一次，之后你在该面板里手动切换的选项会保留
    this.applied = new WeakSet();
    this.openInit = new WeakSet();
    this.toolbars = [];   // 顶部筛选栏，卸载时移除（同上，要在 onLayoutReady 之前建好）
    this.backlinkDoms = new WeakSet();   // 只改反链面板，不影响全局搜索（要在 onLayoutReady 之前建好：重载插件时它会立刻执行）
    const apply = () => {
      this.applyAll();
      setTimeout(() => this.applyAll(), 50);
      setTimeout(() => this.applyAll(), 600);   // 反链是异步算出来的，晚一点再补一次
    };
    this.registerEvent(this.app.workspace.on("layout-change", apply));
    this.registerEvent(this.app.workspace.on("active-leaf-change", apply));
    this.registerEvent(this.app.workspace.on("file-open", apply));

    if (BLOCK_REFCOUNT) {
      // 全库扫一遍 ^id 块引用建索引，之后按文件增量更新
      this.app.workspace.onLayoutReady(() => this.buildBlockIndex());
      this.registerEvent(this.app.metadataCache.on("changed", (f) => { if (this.blockCounts) this.indexFile(f); }));
      this.registerEvent(this.app.metadataCache.on("deleted", (f) => { if (this.blockCounts) this.removeFile(f.path); }));
      this.registerEvent(this.app.vault.on("rename", () => { if (this.blockCounts) this.buildBlockIndex(); }));
    }

    // 当前笔记属性变了（开 / 关大小写敏感、改别名）：重画反链
    this.caseSig = new Map();
    this.registerEvent(this.app.metadataCache.on("changed", (f) => {
      const sig = this.caseSignature(f);
      if (this.caseSig.has(f.path) && this.caseSig.get(f.path) !== sig) { this.caseSig.set(f.path, sig); this.rerenderAll(); this.applyAll(); }
    }));
    this.addCommand({
      id: "toggle-case-sensitive",
      name: "切换：「提到当前文件名」区分大小写（写进当前笔记属性）",
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md") return false;
        if (!checking) this.app.fileManager.processFrontMatter(f, (fm) => {
          const on = CASE_KEYS.some((k) => fm[k] === true || fm[k] === "true");
          for (const k of CASE_KEYS) delete fm[k];
          if (!on) fm[CASE_KEYS[0]] = true;
          new Notice(on ? "提到当前文件名：不区分大小写" : "提到当前文件名：区分大小写");
        });
        return true;
      },
    });
    // 让这个属性在属性面板里是个勾选框
    try { const tm = this.app.metadataTypeManager; if (tm && typeof tm.setType === "function") tm.setType(CASE_KEYS[0], "checkbox"); } catch (e) {}

    // 跳到当前笔记的反向链接（去设置里给它绑快捷键）
    this.addCommand({
      id: "goto-backlinks",
      name: "跳到当前笔记的反向链接",
      callback: () => this.gotoBacklinks(),
    });

    // 关联紧密度用到的「每页被引用总数」缓存，库有变动就重算
    if (RANK_BY_STRENGTH || GROUP_BACKLINKS) {
      const dirty = () => { this._df = null; this._udf = null; this._tags = null; };
      this.registerEvent(this.app.metadataCache.on("resolved", dirty));
      this.registerEvent(this.app.metadataCache.on("changed", dirty));
    }
    // 放在最后：布局已就绪时（比如重载插件）它会立刻执行，上面的初始化得先做完
    this.app.workspace.onLayoutReady(apply);
  }

  onunload() {
    this.unloaded = true;
    this.app.workspace.iterateAllLeaves((leaf) => {
      for (const c of [leaf.view && leaf.view.backlink, leaf.view && leaf.view.backlinks]) {
        for (const dom of c ? [c.backlinkDom, c.unlinkedDom] : []) {
          if (!dom || !dom.__bdSorted) continue;
          delete dom.onChange; delete dom.__bdSorted;
          this.eachFileDom(dom, (fd) => { fd.el.querySelectorAll(":scope > .bd-heads").forEach((x) => x.remove()); fd.el.removeClass("bd-year-fold", "bd-year-hidden"); });
          try { dom.onChange(); } catch (e) { /* 面板已关 */ }
        }
      }
    });
    for (const el of this.toolbars || []) el.remove();
    this.app.workspace.iterateAllLeaves((leaf) => {
      const root = leaf.view && leaf.view.containerEl;
      if (root) root.querySelectorAll(".bd-hidden").forEach((el) => el.removeClass("bd-hidden"));
    });
    if (this.matchProto && this.origRender) {
      this.matchProto.render = this.origRender;
      delete this.matchProto.__bdAncestors;
      this.rerenderAll();
    }
  }

  applyAll() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!view) return;
      // 日记等文件夹：整个视图挂 no-backlinks
      if (view.getViewType && view.getViewType() === "markdown" && view.containerEl) {
        const path = view.file ? view.file.path : "";
        view.containerEl.toggleClass("no-backlinks", NO_BACKLINK_FOLDERS.some((f) => path.startsWith(f)));
      }
      // view.backlink：侧边栏反向链接面板；view.backlinks：笔记底部的反向链接
      for (const component of [view.backlink, view.backlinks]) {
        if (!component) continue;
        component.__bdEmbedded = component === view.backlinks;
        component.__bdTarget = view.file || component.file || null;
        component.__bdTargetPath = component.__bdTarget ? component.__bdTarget.path : "";
        component.__bdCaseNames = this.caseNames(component.__bdTarget);
        if (component.__bdTarget) this.caseSig.set(component.__bdTargetPath, this.caseSignature(component.__bdTarget));
        if (!component.__bd) component.__bd = { include: new Set(), exclude: new Set(), text: "", open: COOCCUR_OPEN, group: false, groupCollapsed: new Set() };
        component.__bd.nameInc = component.__bd.nameInc || new Set();
        component.__bd.nameExc = component.__bd.nameExc || new Set();
        component.__bdNames = this.targetNames(component.__bdTarget);
        // 插件加载后第一次碰到这个面板：按默认值设一次「共现筛选」展开（之后你手动开关的会保留）
        if (!this.openInit.has(component)) { component.__bd.open = COOCCUR_OPEN; this.openInit.add(component); }
        // 换了当前文件就重置筛选（Roam 是按页筛选）
        if (component.__bdPrevTarget !== component.__bdTargetPath) {
          component.__bd.include.clear(); component.__bd.exclude.clear(); component.__bd.text = "";
          component.__bd.nameInc.clear(); component.__bd.nameExc.clear();
          if (component.__bdInput) component.__bdInput.value = "";
          component.__bdPrevTarget = component.__bdTargetPath;
        }
        for (const dom of [component.backlinkDom, component.unlinkedDom]) if (dom) { this.backlinkDoms.add(dom); dom.__bdComponent = component; this.hookChanged(dom); if (CUSTOM_SORT) this.hookSort(dom); }
        if (!this.matchProto) this.patchMatchRender(component);
        if (!this.applied.has(component)) {
          if (typeof component.setExtraContext === "function") component.setExtraContext(EXTRA_CONTEXT);
          this.setCollapsed(component);
          this.applied.add(component);
        } else if (!component.__bdCollapseDone) {
          this.setCollapsed(component);   // 第一次时 DOM 可能还没画出来
        }
        if (SHOW_COOCCUR || TEXT_FILTER) {
          const rootEl = component.__bdEmbedded
            ? view.containerEl && view.containerEl.querySelector(".embedded-backlinks")
            : (view.containerEl && view.containerEl.querySelector(".backlink-pane")) || view.containerEl;
          if (rootEl) { this.setupToolbar(component, rootEl); this.refresh(component); }
        }
      }
    });
  }

  setCollapsed(c) {
    let ok = false;
    try {
      if (typeof c.setUnlinkedCollapsed === "function") { c.setUnlinkedCollapsed(UNLINKED_COLLAPSED, false); ok = true; }
      else if ("unlinkedCollapsed" in c) { c.unlinkedCollapsed = UNLINKED_COLLAPSED; ok = true; }
      if (typeof c.setBacklinkCollapsed === "function") c.setBacklinkCollapsed(BACKLINK_COLLAPSED, false);
    } catch (e) { ok = false; }
    if (!ok) ok = this.domCollapse(c);
    if (ok) c.__bdCollapseDone = true;
  }

  // 兜底：找到「提到当前文件 / Unlinked mentions」标题，没折叠就点一下
  domCollapse(c) {
    const root = c.containerEl || c.el;
    if (!root) return false;
    const heads = root.querySelectorAll(".tree-item-self, .backlink-pane > div");
    for (const h of heads) {
      const t = (h.textContent || "").trim();
      if (!/^(提到当前文件|未链接|Unlinked mentions)/i.test(t)) continue;
      const item = h.closest(".tree-item") || h.parentElement;
      const collapsed = (item && item.classList.contains("is-collapsed")) || h.classList.contains("is-collapsed");
      if (UNLINKED_COLLAPSED !== collapsed) h.click();
      return true;
    }
    return false;
  }

  // 反链里每一条命中（search-result-file-match）的类没有导出，只能从现成的实例上拿原型
  patchMatchRender(component) {
    let match = null;
    for (const dom of [component.backlinkDom, component.unlinkedDom]) {
      for (const fileDom of (dom && dom.vChildren && dom.vChildren._children) || []) {
        const m = fileDom.vChildren && fileDom.vChildren._children && fileDom.vChildren._children[0];
        if (m && typeof m.render === "function" && "start" in m && "cache" in m) { match = m; break; }
      }
      if (match) break;
    }
    if (!match) return;
    const proto = Object.getPrototypeOf(match);
    if (proto.__bdAncestors) { this.matchProto = proto; return; }
    const plugin = this;
    const orig = proto.render;
    proto.render = function (...args) {
      orig.apply(this, args);
      try {
        const fileDom = this.parentDom;
        if (fileDom && plugin.backlinkDoms.has(fileDom.parentDom)) plugin.decorate(this);
      } catch (e) { console.error("[backlink-defaults] render", e); }
    };
    proto.__bdAncestors = true;
    this.matchProto = proto;
    this.origRender = orig;
    this.rerenderAll();
  }

  rerenderAll() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!view) return;
      for (const component of [view.backlink, view.backlinks]) {
        if (!component) continue;
        for (const dom of [component.backlinkDom, component.unlinkedDom]) {
          for (const fileDom of (dom && dom.vChildren && dom.vChildren._children) || []) {
            if (typeof fileDom.renderContentMatches === "function") fileDom.renderContentMatches();
          }
        }
      }
    });
  }

  // 找命中所在的列表项和它的全部母块。返回 { item, chain }，chain 从最外层往里
  listContext(m) {
    const items = m.cache && m.cache.listItems;
    if (!items || !items.length) return null;
    const lineStart = (it) => it.position.start.offset - it.position.start.col;
    // 列表项的 position 只包自己那几行，不含子块；取包住命中开头的最深那个
    let item = null;
    for (const it of items) {
      if (lineStart(it) > m.start) break;
      if (m.start <= it.position.end.offset) item = it;
    }
    if (!item) return null;
    // 「- 3. xxx」这种圆点后面紧跟编号的行，Obsidian 会在同一行解析出两个列表项，内层那个的 parent 就是这一行自己。
    // 所以同一行只取最外层（第一个）那项，并且往上找时碰到走过的行就停，免得绕圈
    const byLine = new Map();
    for (const it of items) if (!byLine.has(it.position.start.line)) byLine.set(it.position.start.line, it);
    const chain = [];   // 从直接母块往上
    const seen = new Set([item.position.start.line]);
    const from = byLine.get(item.position.start.line) || item;   // 从这一行最外层那项开始往上找
    for (let p = from.parent; p >= 0 && byLine.has(p) && !seen.has(p) && chain.length < 100; p = byLine.get(p).parent) {
      seen.add(p);
      chain.push(byLine.get(p));
    }
    chain.reverse();    // 最外层在前
    return { item, items, chain, lineStart };
  }

  // 这一条实际显示（也是就地编辑）的源码范围：列表项 = 自己 + 全部子块；标题行 = 整节；其余 = Obsidian 给的范围
  displayRange(m, ctx) {
    const c = m.content;
    let start = m.start, end = m.end, heading = null;
    if (ctx) {
      if (m.start === ctx.lineStart(ctx.item)) end = Math.max(m.end, ctx.item.position.end.offset);
    } else if (HEADING_SECTION) {
      const hs = (m.cache && m.cache.headings) || [];
      const i = hs.findIndex((h) => h.position.start.offset === m.start);
      if (i >= 0) {
        heading = hs[i];
        const next = hs.slice(i + 1).find((h) => h.level <= heading.level);
        end = Math.max(m.end, next ? next.position.start.offset : c.length);
      }
    }
    while (end > start && /\s/.test(c[end - 1])) end--;
    return { start, end, heading };
  }

  // Roam 式面包屑：所在的各级标题 + 各级母块，从外到内。每项 { line, text }
  breadcrumbs(m, ctx, range) {
    const content = m.content, crumbs = [];
    const blockStart = ctx ? ctx.lineStart(ctx.chain[0] || ctx.item) : range.start;
    if (CRUMB_HEADINGS) {
      const stack = [];
      for (const h of (m.cache && m.cache.headings) || []) {
        if (h.position.start.offset >= blockStart) break;
        while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
        stack.push(h);
      }
      // 命中的本身是标题：同级或更低级的前一个标题不是它的上级
      if (range.heading) while (stack.length && stack[stack.length - 1].level >= range.heading.level) stack.pop();
      for (const h of stack) crumbs.push({ line: h.position.start.line, text: h.heading });
    }
    if (ctx) {
      for (const it of ctx.chain) {
        const first = content.substring(ctx.lineStart(it), it.position.end.offset).split("\n")[0];
        crumbs.push({ line: it.position.start.line, text: first.replace(/^\s*([-*+]|\d+[.)])\s+(\[.\]\s+)?/, "") });
      }
    }
    return crumbs;
  }

  // 同一个文件里排在前面、而且没被藏起来的那一条
  prevShown(m) {
    const sibs = (m.parentDom && m.parentDom.vChildren && m.parentDom.vChildren._children) || [];
    // 首次渲染时这一条可能还没挂进 vChildren（indexOf = -1），那时已有的兄弟都排在它前面
    let at = sibs.indexOf(m);
    if (at < 0) at = sibs.length;
    for (let i = at - 1; i >= 0; i--) if (sibs[i].__bdRange && !sibs[i].__bdDup) return sibs[i];
    return null;
  }

  // 这篇笔记开了大小写敏感 → 返回允许的写法（文件名 + 别名）；没开返回 null
  // 当前页的所有名字：文件名 + 别名（和「区分大小写」开关无关），按不分大小写去重
  targetNames(file) {
    if (!file) return [];
    const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
    const al = fm.aliases == null ? (fm.alias == null ? [] : fm.alias) : fm.aliases;
    const list = (Array.isArray(al) ? al : String(al).split(",")).map((x) => String(x).trim()).filter(Boolean);
    const out = [];
    for (const n of [file.basename, ...list]) if (!out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n);
    return out;
  }

  // 这一条命中用到了当前页的哪些名字（链接看显示出来的那个名字，纯文字看文字本身）
  formsOf(component, m) {
    const names = component.__bdNames || [];
    const sig = names.join("\u0001");
    if (m.__bdForms && m.__bdFormsSig === sig) return m.__bdForms;
    const out = new Set();
    const low = names.map((n) => [n, n.toLowerCase()]);
    for (const p of m.matches || []) {
      const raw = (m.content || "").substring(p[0], p[1]);
      let shown = raw, isLink = false, mm;
      if ((mm = raw.match(/^!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]$/))) { isLink = true; shown = (mm[2] && mm[2].trim()) || mm[1].split(/[#^]/)[0].split("/").pop().trim(); }
      else if ((mm = raw.match(/^!?\[([^\]]*)\]\([^)]*\)$/))) { isLink = true; shown = mm[1].trim(); }
      const l = shown.toLowerCase();
      let hit = low.find((x) => x[1] === l);
      // 显示文字不是任何一个名字（比如 [[资金成本|那个概念]]）：链接按目标算文件名；纯文字找包含的名字
      if (!hit) hit = isLink ? low[0] : low.find((x) => l.includes(x[1]));
      if (hit) out.add(hit[0]);
    }
    m.__bdForms = out;
    m.__bdFormsSig = sig;
    return out;
  }

  caseNames(file) {
    if (!file) return null;
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = (cache && cache.frontmatter) || {};
    if (!CASE_KEYS.some((k) => fm[k] === true || fm[k] === "true")) return null;
    const al = fm.aliases == null ? (fm.alias == null ? [] : fm.alias) : fm.aliases;
    const list = Array.isArray(al) ? al : String(al).split(",");
    return new Set([file.basename, ...list.map((x) => String(x).trim()).filter(Boolean)]);
  }
  caseSignature(file) {
    const n = this.caseNames(file);
    return n ? [...n].join("\u0001") : "";
  }
  // 「提到当前文件名」的一条命中，大小写对不上 → 不显示
  caseMiss(m, fd) {
    if (!fd || !fd.separateMatches || typeof m.content !== "string") return false;
    const comp = fd.parentDom && fd.parentDom.__bdComponent;
    const names = comp && comp.__bdCaseNames;
    if (!names || !m.matches || !m.matches.length) return false;
    return m.matches.every((p) => !names.has(m.content.substring(p[0], p[1])));
  }

  // 命中落在哪一块：列表项按它自己那一行算（不含子块），其余按 Obsidian 给的范围开头算
  blockKey(m, ctx) {
    return ctx ? "li:" + ctx.item.position.start.line : "p:" + m.start;
  }

  // 这一条要不要并进上一条。
  // 「链接当前文件」（Roam）：母块已经作为引用显示了，它子块里的引用不再单独列一条。
  // 「提到当前文件」：同一个列表项自己的文字里出现几次关键词只显示一次；子块里再出现的，子块另算一条。
  isDup(m, prev, fd) {
    if (!prev) return false;
    if (fd && fd.separateMatches) return prev.__bdBlockKey === m.__bdBlockKey;
    return m.start >= prev.__bdRange.start && m.start < prev.__bdRange.end;
  }

  decorate(m) {
    const content = m.content;
    if (typeof content !== "string") return;
    const ctx = this.listContext(m);
    const range = (m.__bdRange = this.displayRange(m, ctx));
    const prev = this.prevShown(m);
    m.__bdBlockKey = this.blockKey(m, ctx);
    const miss = this.caseMiss(m, m.parentDom);
    m.__bdDup = miss || this.isDup(m, prev, m.parentDom);
    m.el.toggleClass("bd-dup", m.__bdDup);
    if (m.__bdDup) {
      for (const n of Array.from(m.el.childNodes)) n.remove();
      if (miss) { const c = m.parentDom && m.parentDom.parentDom && m.parentDom.parentDom.__bdComponent; if (c && c.__bd) this.refresh(c); }
      return;
    }
    const crumbs = SHOW_BREADCRUMBS ? this.breadcrumbs(m, ctx, range) : [];
    // 和上一条的路径完全相同就不再重复显示面包屑，接在上一条下面
    const key = crumbs.map((c) => c.line).join(",");
    const cont = !!(prev && crumbs.length && prev.__bdCrumbKey === key);
    m.__bdCrumbKey = key;
    m.el.toggleClass("bd-cont", cont);
    const crumbEl = crumbs.length && !cont ? this.renderCrumbs(m, crumbs) : null;
    if (RENDER_MARKDOWN) this.renderMarkdown(m, ctx, range, crumbEl);
    else if (crumbEl) m.el.insertBefore(crumbEl, m.el.firstChild);
    if (INLINE_EDIT) this.addEditButton(m, ctx);
    if (BLOCK_REFCOUNT) this.addRefBadges(m, range);
    this.shrinkTitleHitArea(m.parentDom);
    const dom = m.parentDom && m.parentDom.parentDom;
    const comp = dom && dom.__bdComponent;
    if (comp && comp.__bd) {
      m.el.toggleClass("bd-hidden", !this.matchVisible(comp, m));
      this.refresh(comp);
    }
  }

  renderCrumbs(m, crumbs) {
    const el = createDiv({ cls: "bd-crumbs" });
    // 面包屑行里点空白处什么也不做（不进编辑、不跳转）
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
    crumbs.forEach((c, i) => {
      if (i) el.createSpan({ cls: "bd-crumb-sep", text: "›" });
      const span = el.createSpan({ cls: "bd-crumb", attr: { "aria-label": "跳到这一行（⌘点 = 新标签）" } });
      this.inlineText(span, c.text);
      span.title = span.textContent;
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (SHIFT_STACK && e.shiftKey) this.openStackedFile(m.parentDom.file, c.line);
        else this.openAt(m.parentDom.file, c.line, Keymap.isModEvent(e));
      });
    });
    return el;
  }

  // 面包屑里的一行文字：去掉 Markdown 记号，双链只留显示文字（样式上仍像链接）
  inlineText(el, text) {
    const t = text.replace(/\s\^[\w-]+\s*$/, "").replace(/(\*\*|__|==|~~)/g, "").trim();
    const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]*)\]\([^)]*\)|#[^\s#,.;:!?，。；：！？、]+/g;
    let last = 0, mt;
    while ((mt = re.exec(t))) {
      if (mt.index > last) el.appendText(t.substring(last, mt.index));
      const shown = mt[2] || (mt[1] ? mt[1].split("#")[0] : null) || mt[3] || mt[0];
      el.createSpan({ cls: mt[0][0] === "#" ? "bd-crumb-tag" : "bd-crumb-link", text: shown });
      last = re.lastIndex;
    }
    if (last < t.length) el.appendText(t.substring(last));
  }

  openAt(file, line, newLeaf) {
    if (!file) return;
    this.app.workspace.getLeaf(newLeaf).openFile(file, { active: true, eState: { line } });
  }

  // 文件标题行：只有标题文字（和折叠小三角）能点开文件，行里其他地方是空白，点了什么也不做
  shrinkTitleHitArea(fileDom) {
    const row = fileDom && fileDom.selfEl;
    if (!row || row.__bdTitleBound) return;
    row.__bdTitleBound = true;
    row.addClass("bd-title-row");
    row.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest && t.closest(".tree-item-inner, .collapse-icon")) {
        if (SHIFT_STACK && e.shiftKey && t.closest(".tree-item-inner")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.openStackedFile(fileDom.file, -1);
        }
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();   // 捕获阶段拦下，原来「点整行打开文件」的处理器收不到
    }, true);
  }

  // ---------- 就地编辑 ----------
  // 可编辑的范围：命中的列表项连同子块（不含母块）；标题行 = 整节；其余就是命中所在的段落 / 整行
  editRange(m, ctx) {
    const c = m.content;
    let start, end;
    if (ctx) {
      start = ctx.lineStart(ctx.item);
      end = Math.max(m.end, ctx.item.position.end.offset);
      if (m.start !== start) end = ctx.item.position.end.offset;   // 没开「更多上下文」：只编辑这一项自己
    } else if (m.__bdRange) {
      start = m.__bdRange.start; end = m.__bdRange.end;
    } else {
      start = m.start; end = m.end;
    }
    while (start > 0 && c.charCodeAt(start - 1) !== 10) start--;
    while (end < c.length && c.charCodeAt(end) !== 10) end++;
    while (end > start && /\s/.test(c[end - 1])) end--;
    const indent = c.substring(start, end).match(/^[ \t]*/)[0];
    return { start, end, indent, text: c.substring(start, end) };
  }

  // 点条目任意位置 = 编辑；右上角 ↗ 或 ⌘/Ctrl+点 = 跳到原文（原来的行为）
  addEditButton(m, ctx) {
    const file = m.parentDom && m.parentDom.file;
    if (!file || file.extension !== "md") return;
    m.__bdCtx = ctx;
    const btn = createDiv({ cls: "bd-jump-btn clickable-icon", attr: { "aria-label": "跳到原文（⌘点 = 新标签）" } });
    setIcon(btn, "lucide-arrow-up-right");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      m.onResultClick(e);
    });
    m.el.appendChild(btn);
    m.el.addClass("bd-click-edit");
    if (m.__bdClickBound) return;
    m.__bdClickBound = true;
    // 捕获阶段先拦下，preventDefault 后原来的「跳到原文」处理器会自己跳过
    m.el.addEventListener("click", (e) => {
      const t = e.target;
      // Shift 点空白处 = 把这一块的原文在右侧栏叠放一页（点链接/按钮等交给它们自己的处理器）
      if (SHIFT_STACK && e.button === 0 && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (t.closest && t.closest(".bd-jump-btn, .bd-expand, .search-result-hover-button, .search-result-file-match-replace-button, .bd-crumbs a, .bd-crumb, .bd-md a, .bd-md input, .bd-refcount")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.openStackedFile(m.parentDom.file, this.offsetToLine(m, (m.__bdRange || {}).start));
        return;
      }
      if (!INLINE_EDIT || m.el.hasClass("bd-editing")) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
      // 链接、标签、复选框、面包屑、「链接」按钮各有各的处理，不进编辑
      if (t.closest && t.closest(".bd-jump-btn, .bd-expand, .search-result-hover-button, .search-result-file-match-replace-button, .bd-crumbs, .bd-md a, .bd-md input")) return;
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && m.el.contains(sel.anchorNode)) return;   // 在选文字，不进编辑
      this.startEdit(m, m.__bdCtx);
    }, true);
  }

  startEdit(m, ctx) {
    const file = m.parentDom.file;
    const range = this.editRange(m, ctx);
    const ind = range.indent;
    // 去掉整体缩进再给你编辑，保存时加回去
    const shown = range.text.split("\n").map((l) => (l.startsWith(ind) ? l.slice(ind.length) : l)).join("\n");

    const keep = new Set([m.showMoreBeforeEl, m.showMoreAfterEl]);
    for (const n of Array.from(m.el.childNodes)) if (!keep.has(n)) n.remove();
    m.__bdToken = (m.__bdToken || 0) + 1;   // 作废还没画完的渲染
    m.el.addClass("bd-editing");
    const wrap = m.el.createDiv({ cls: "bd-edit" });
    const ta = wrap.createEl("textarea", { cls: "bd-edit-input" });
    ta.value = shown;
    ta.spellcheck = false;
    const bar = wrap.createDiv({ cls: "bd-edit-bar" });
    bar.createSpan({ cls: "bd-edit-hint", text: "⌘↩/⌘S 保存 · Esc 取消 · ⌘B 粗 ⌘I 斜 ⌘E 码 ⌘⇧H 高亮" });
    const cancelBtn = bar.createEl("button", { text: "取消" });
    const saveBtn = bar.createEl("button", { cls: "mod-cta", text: "保存" });

    const scroll = m.parentDom.parentDom && m.parentDom.parentDom.infinityScroll;
    const grow = () => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + 2 + "px";
      if (scroll) scroll.invalidate(m);
    };
    // 编辑框里的点击、按键都不要冒泡到结果条目（否则会跳走或触发面板快捷键）
    for (const type of ["click", "mousedown", "mouseup", "dblclick", "contextmenu", "keydown", "keyup", "keypress"]) {
      wrap.addEventListener(type, (e) => { e.stopPropagation(); if (type === "click" && e.target !== ta) e.preventDefault(); });
    }
    // 结果条目上的 click 处理器挂在 m.el 上，会看 defaultPrevented；编辑框的 click 已经被 stopPropagation 挡住了
    const doc = m.el.ownerDocument || document;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      doc.removeEventListener("mousedown", onOutside, true);
      m.el.removeClass("bd-editing");
      m.render();
    };
    // 编辑中点了框外任何地方：没改过就取消，改过就自动保存（保存失败会留在编辑状态）
    const onOutside = (e) => {
      if (!m.el.isConnected) { doc.removeEventListener("mousedown", onOutside, true); return; }
      if (saving || m.el.contains(e.target)) return;
      if (ta.value === shown) finish();
      else save();
    };
    let saving = false;
    setTimeout(() => { if (!done) doc.addEventListener("mousedown", onOutside, true); }, 0);
    const save = async () => {
      saveBtn.disabled = cancelBtn.disabled = true;
      saving = true;
      const next = ta.value.replace(/\s+$/, "").split("\n").map((l) => (l.length ? ind + l : l)).join("\n");
      try {
        let changed = false;
        await this.app.vault.process(file, (data) => {
          let at = -1;
          if (data.substring(range.start, range.end) === range.text) at = range.start;
          else {
            const first = data.indexOf(range.text);
            if (first >= 0 && data.indexOf(range.text, first + 1) < 0) at = first;
          }
          if (at < 0) throw new Error("原文在别处被改过，找不到这一段");
          changed = next !== range.text;
          return data.substring(0, at) + next + data.substring(at + range.text.length);
        });
        if (changed) {
          // 反链稍后会按新内容自动刷新；先把本条的内容就地更新
          m.content = m.content.substring(0, range.start) + next + m.content.substring(range.end);
          const delta = next.length - range.text.length;
          if (m.end >= range.end) m.end += delta;
          else m.end = Math.min(m.end, range.start + next.length);
          m.matches = (m.matches || []).filter(([a, b]) => b <= range.start || a >= range.end).map(([a, b]) => (a >= range.end ? [a + delta, b + delta] : [a, b]));
          const cache = this.app.metadataCache.getFileCache(file);
          if (cache) m.cache = cache;
          new Notice("已保存到 " + file.basename);
        }
        finish();
      } catch (e) {
        console.error("[backlink-defaults] save", e);
        new Notice("没保存：" + e.message, 6000);
        saveBtn.disabled = cancelBtn.disabled = false;
        saving = false;
      }
    };
    saveBtn.addEventListener("click", (e) => { e.preventDefault(); save(); });
    cancelBtn.addEventListener("click", (e) => { e.preventDefault(); finish(); });
    const toggleWrap = (mark) => {
      const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd, ml = mark.length, sel = v.substring(a, b);
      if (sel.length >= ml * 2 && sel.startsWith(mark) && sel.endsWith(mark)) {
        // 选区两端就是记号：去掉（再按一次取消）
        const inner = sel.slice(ml, -ml);
        ta.value = v.substring(0, a) + inner + v.substring(b);
        ta.selectionStart = a; ta.selectionEnd = a + inner.length;
      } else if (v.substring(a - ml, a) === mark && v.substring(b, b + ml) === mark) {
        // 记号在选区外侧：也当作取消
        ta.value = v.substring(0, a - ml) + sel + v.substring(b + ml);
        ta.selectionStart = a - ml; ta.selectionEnd = b - ml + sel.length;
      } else {
        ta.value = v.substring(0, a) + mark + sel + mark + v.substring(b);
        ta.selectionStart = a + ml; ta.selectionEnd = a + ml + sel.length;
      }
      grow();
    };
    ta.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") { e.preventDefault(); save(); }
      else if (mod && (e.key === "s" || e.key === "S")) { e.preventDefault(); save(); }
      else if (mod && !e.shiftKey && (e.key === "b" || e.key === "B")) { e.preventDefault(); toggleWrap("**"); }
      else if (mod && !e.shiftKey && (e.key === "i" || e.key === "I")) { e.preventDefault(); toggleWrap("*"); }
      else if (mod && e.shiftKey && (e.key === "h" || e.key === "H")) { e.preventDefault(); toggleWrap("=="); }
      else if (mod && (e.key === "e" || e.key === "E")) { e.preventDefault(); toggleWrap("`"); }
      else if (e.key === "Escape") { e.preventDefault(); finish(); }
      else if (e.key === "Tab") {
        // Tab / ⇧Tab 调整所选行的缩进
        e.preventDefault();
        const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
        const ls = v.lastIndexOf("\n", a - 1) + 1;
        const block = v.substring(ls, b);
        const out = e.shiftKey ? block.replace(/^\t/gm, "") : block.replace(/^/gm, "\t");
        ta.value = v.substring(0, ls) + out + v.substring(b);
        const d = out.length - block.length;
        ta.selectionStart = Math.max(ls, a + (e.shiftKey ? (block.startsWith("\t") ? -1 : 0) : 1));
        ta.selectionEnd = b + d;
        grow();
      }
    });
    ta.addEventListener("input", grow);
    grow();
    ta.focus();
  }

  // 把一段以某个缩进开头的多行文本整体挪到新的层级
  reindent(text, oldIndent, depth) {
    const pad = "\t".repeat(depth);
    return text.split("\n").map((l) => pad + (l.startsWith(oldIndent) ? l.slice(oldIndent.length) : l.replace(/^[ \t]+/, ""))).join("\n");
  }

  // 命中块本身（连同子块 / 整节）按 Markdown 渲染；母块不再画成列表，改在上方的面包屑里
  renderMarkdown(m, ctx, range, crumbEl) {
    const content = m.content;
    let lines, folded = 0, foldable = false, line0 = -1;
    if (ctx && m.start === ctx.lineStart(ctx.item)) {
      const indent = content.substring(ctx.lineStart(ctx.item), ctx.item.position.start.offset);
      lines = this.reindent(content.substring(range.start, range.end), indent, 0).split("\n");
      line0 = ctx.item.position.start.line;
    } else if (ctx) {
      // 没开「更多上下文」时只截了一行里的一段
      let t = content.substring(m.start, m.end).trim().replace(/\n[ \t]*/g, " ");
      if (!/^([-*+]|\d+[.)])\s/.test(t)) t = "- " + t;
      lines = [t];
    } else {
      let s = range.start;
      while (s < range.end && /\s/.test(content[s])) s++;
      lines = content.substring(s, range.end).split("\n");
      if (s === 0 || content[s - 1] === "\n") line0 = content.substring(0, s).split("\n").length - 1;
    }
    // 子块太长先折叠
    if (FOLD_LINES > 0 && lines.length > FOLD_LINES + 1) {
      foldable = true;
      if (!m.__bdExpanded) {
        folded = lines.length - FOLD_LINES;
        lines = lines.slice(0, FOLD_LINES);
      }
    }
    const md = lines.join("\n");
    m.__bdLine0 = line0;   // 渲染结果第 0 行对应原文的行号（复选框写回用），-1 = 对不上

    // 保留原来的「更多上下文」悬浮按钮和「提到当前文件」的「链接」按钮，其余换成渲染结果
    const keep = new Set([m.showMoreBeforeEl, m.showMoreAfterEl]);
    for (const n of Array.from(m.el.childNodes)) {
      if (keep.has(n) || (n.classList && n.classList.contains("search-result-file-match-replace-button"))) continue;
      n.remove();
    }
    const box = createDiv({ cls: "bd-md markdown-rendered" });
    m.el.insertBefore(box, m.el.firstChild);
    if (crumbEl) m.el.insertBefore(crumbEl, box);
    if (foldable) {
      const tog = createDiv({ cls: "bd-expand", text: folded ? `展开其余 ${folded} 行` : "收起" });
      tog.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        m.__bdExpanded = !!folded;
        m.render();
      });
      box.after(tog);
    }

    if (m.__bdComp) m.__bdComp.unload();
    const comp = (m.__bdComp = new Component());
    comp.load();
    const token = (m.__bdToken = (m.__bdToken || 0) + 1);
    const sourcePath = m.parentDom && m.parentDom.file ? m.parentDom.file.path : "";
    MarkdownRenderer.render(this.app, md, box, sourcePath, comp).then(() => {
      if (m.__bdToken !== token) return;
      this.afterRender(m, box, sourcePath);
      const scroll = m.parentDom && m.parentDom.parentDom && m.parentDom.parentDom.infinityScroll;
      if (scroll) scroll.invalidate(m);
    }).catch((e) => console.error("[backlink-defaults] markdown", e));
  }

  afterRender(m, box, sourcePath) {
    // 像 Roam 一样：点链接 = 去那一页（⌘点 = 新标签），悬停 = 预览；点其他地方 = 编辑（↗ 跳原文）
    const hoverParent = (m.__bdHover = m.__bdHover || { hoverPopover: null });
    box.querySelectorAll("a").forEach((a) => {
      if (a.hasClass("internal-link")) {
        const target = a.getAttribute("data-href") || a.getAttribute("href") || "";
        a.removeAttribute("href");
        a.removeAttribute("target");
        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (SHIFT_STACK && e.shiftKey) this.openStackedLink(target, sourcePath);
          else this.app.workspace.openLinkText(target, sourcePath, Keymap.isModEvent(e));
        });
        a.addEventListener("mouseover", (e) => {
          this.app.workspace.trigger("hover-link", { event: e, source: "search", hoverParent, targetEl: a, linktext: target, sourcePath });
        });
      } else if (a.hasClass("tag")) {
        const tag = a.getAttribute("href") || a.textContent || "";
        a.removeAttribute("href");
        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const search = this.app.internalPlugins && this.app.internalPlugins.getPluginById("global-search");
          if (search && search.instance) search.instance.openGlobalSearch("tag:" + tag);
        });
      } else {
        // 外部链接照常在浏览器打开，只是别让它冒泡成「编辑」或「跳原文」
        a.addEventListener("click", (e) => e.stopPropagation());
      }
    });
    // 复选框可以直接勾（写回原文那一行）；行号对不上时禁用
    box.querySelectorAll("input.task-list-item-checkbox").forEach((cb) => {
      const holder = cb.closest("[data-line]");
      const rel = parseInt(cb.getAttribute("data-line") || (holder && holder.getAttribute("data-line")), 10);
      if (m.__bdLine0 < 0 || isNaN(rel)) { cb.disabled = true; return; }
      cb.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleTask(m.parentDom.file, m.__bdLine0 + rel);
      });
    });
    box.querySelectorAll("input:not(.task-list-item-checkbox)").forEach((i) => { i.disabled = true; });

    // 高亮命中：双链按目标文件比对，其余按文字比对
    const mc = this.app.metadataCache;
    const hitFiles = new Set();
    const hitTexts = [];
    for (const [s, e] of m.matches || []) {
      const raw = m.content.substring(s, e);
      const lk = raw.match(/^\[\[([^\]|#^]*)/) || raw.match(/^\[[^\]]*\]\(([^)#\s]*)/);
      if (lk) {
        const f = mc.getFirstLinkpathDest(decodeURIComponent(lk[1]).trim(), sourcePath);
        if (f) hitFiles.add(f.path);
      } else if (raw.trim()) hitTexts.push(raw);
    }
    if (hitFiles.size) {
      box.querySelectorAll("a.internal-link").forEach((a) => {
        const href = (a.getAttribute("data-href") || "").split(/[#|]/)[0];
        const f = mc.getFirstLinkpathDest(href, sourcePath);
        if (f && hitFiles.has(f.path)) a.addClass("search-result-file-matched-text");
      });
    }
    if (hitTexts.length) this.highlightText(box, hitTexts);
  }

  async toggleTask(file, line) {
    try {
      await this.app.vault.process(file, (data) => {
        const ls = data.split("\n");
        const mt = ls[line] !== undefined && ls[line].match(/^(\s*(?:[-*+]|\d+[.)])\s+\[)(.)(\])/);
        if (!mt) throw new Error("原文这一行已经变了");
        ls[line] = mt[1] + (mt[2] === " " ? "x" : " ") + mt[3] + ls[line].slice(mt[0].length);
        return ls.join("\n");
      });
    } catch (e) {
      new Notice("没勾上：" + e.message, 5000);
    }
  }

  highlightText(root, texts) {
    const lower = texts.map((t) => t.toLowerCase());
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue, cur = node;
      for (;;) {
        const low = text.toLowerCase();
        let best = -1, len = 0;
        lower.forEach((t) => { const i = low.indexOf(t); if (i >= 0 && (best < 0 || i < best)) { best = i; len = t.length; } });
        if (best < 0) break;
        const hit = cur.splitText(best);
        const rest = hit.splitText(len);
        const span = createSpan({ cls: "search-result-file-matched-text", text: hit.nodeValue });
        hit.replaceWith(span);
        cur = rest; text = rest.nodeValue;
      }
    }
  }

  // ---------- 排序：页面按关系紧密度，日记按日期并按月 / 年分段 ----------
  journalDate(file) {
    const m = file && file.path.match(JOURNAL_RE);
    return m ? { y: +m[1], mo: +m[2], key: +m[1] * 10000 + +m[2] * 100 + +m[3] } : null;
  }

  // 页面 src 和当前页 target 的关系紧密度，以及显示用的理由
  relation(srcFile, target) {
    const rl = this.app.metadataCache.resolvedLinks || {};
    const n = (rl[srcFile.path] && rl[srcFile.path][target]) || 0;
    const mutual = !!(rl[target] && rl[target][srcFile.path]);
    const fmKeys = [];
    const cache = this.app.metadataCache.getFileCache(srcFile);
    for (const l of (cache && cache.frontmatterLinks) || []) {
      const lp = (l.link || "").split("#")[0].split("|")[0].trim();
      const dest = lp && this.app.metadataCache.getFirstLinkpathDest(lp, srcFile.path);
      if (dest && dest.path === target) { const k = String(l.key || "").split(".")[0]; if (k && !fmKeys.includes(k)) fmKeys.push(k); }
    }
    const score = (mutual ? 1000 : 0) + (fmKeys.length ? 500 : 0) + n;
    const why = [];
    if (mutual) why.push("互链");
    if (fmKeys.length) why.push("属性·" + fmKeys.join("/"));
    if (n > 1) why.push(`提到 ${n} 次`);
    return { score, why };
  }

  // 给结果列表换上自己的比较函数（原生 onChange 只是按 sortOrder 排 vChildren 再刷新滚动）
  hookSort(dom) {
    if (dom.__bdSorted) return;
    dom.__bdSorted = true;
    const plugin = this;
    dom.onChange = function () {
      const c = this.__bdComponent;
      const target = (c && c.__bdTargetPath) || "";
      const rel = new Map();
      const relOf = (f) => { let r = rel.get(f.path); if (!r) { r = plugin.relation(f, target); rel.set(f.path, r); } return r; };
      this.vChildren.sort((a, b) => {
        const da = plugin.journalDate(a.file), db = plugin.journalDate(b.file);
        if (!da !== !db) return da ? 1 : -1;               // 页面在前，日记在后
        if (da) return db.key - da.key;                    // 日记：日期从新到旧
        return relOf(b.file).score - relOf(a.file).score || a.file.basename.localeCompare(b.file.basename, "zh");
      });
      if (this.vChildren.hasChildren() || this.working) this.emptyStateEl.detach(); else this.el.appendChild(this.emptyStateEl);
      plugin.markSections(this, relOf);
      this.infinityScroll.queueCompute();
    };
    dom.onChange();
  }

  // 在条目上方挂分段标题：「页面 · N」「日记 · N」「2026 年 9 月 · N」「2024 年 · N（点开）」
  markSections(dom, relOf) {
    const c = dom.__bdComponent;
    const st = c && c.__bd;
    const open = (st && (st.yearOpen || (st.yearOpen = new Set()))) || new Set();
    const now = new Date();
    const cutoff = (now.getFullYear() * 12 + now.getMonth()) - (RECENT_MONTHS - 1);   // 最近 12 个月（含本月）
    const kids = dom.vChildren._children || [];
    const info = kids.map((fd) => {
      const d = this.journalDate(fd.file);
      if (!d) return { fd, kind: "page" };
      const recent = d.y * 12 + (d.mo - 1) >= cutoff;
      return { fd, kind: "journal", d, bucket: recent ? `m${d.y}-${d.mo}` : `y${d.y}`, recent };
    });
    const count = (pred) => info.filter(pred).length;
    const pages = count((x) => x.kind === "page"), journals = count((x) => x.kind === "journal");
    let prevKind = null, prevBucket = null;
    for (const x of info) {
      const heads = [];
      if (x.kind !== prevKind) heads.push({ cls: "bd-head-sec", text: x.kind === "page" ? `页面 · ${pages}` : `日记 · ${journals}` });
      let fold = false, hidden = false;
      if (x.kind === "journal") {
        const yearOpen = open.has(x.d.y);
        if (x.bucket !== prevBucket) {
          const n = count((y) => y.bucket === x.bucket);
          if (x.recent) heads.push({ cls: "bd-head-month", text: `${x.d.y} 年 ${x.d.mo} 月 · ${n}` });
          else heads.push({ cls: "bd-head-year", text: `${x.d.y} 年 · ${n} 条`, year: x.d.y, open: yearOpen });
          if (!x.recent && !yearOpen) fold = true;
        } else if (!x.recent && !yearOpen) hidden = true;
        if (!x.recent && yearOpen && x.d.mo !== (prevMonth(x))) heads.push({ cls: "bd-head-month", text: `${x.d.mo} 月` });
      }
      this.renderHeads(dom, x.fd, heads, x.kind === "page" ? relOf(x.fd.file).why : null);
      x.fd.el.toggleClass("bd-year-fold", fold);
      x.fd.el.toggleClass("bd-year-hidden", hidden);
      prevKind = x.kind;
      prevBucket = x.bucket || null;
    }
    // 展开的旧年份里按月再分一层：上一条是同一年同一月就不重复
    function prevMonth(x) {
      const i = info.indexOf(x), p = info[i - 1];
      return p && p.kind === "journal" && p.d.y === x.d.y ? p.d.mo : -1;
    }
  }

  renderHeads(dom, fd, heads, why) {
    fd.el.querySelectorAll(":scope > .bd-heads").forEach((el) => el.remove());
    const title = fd.selfEl;
    title.querySelectorAll(".bd-why").forEach((el) => el.remove());
    if (why && why.length) {
      const w = title.createSpan({ cls: "bd-why", text: why.join(" · ") });
      const inner = title.querySelector(".tree-item-inner");
      if (inner) inner.after(w);
    }
    if (!heads.length) return;
    const box = createDiv({ cls: "bd-heads" });
    for (const h of heads) {
      const el = box.createDiv({ cls: "bd-head " + h.cls, text: h.text });
      if (h.year != null) {
        el.addClass("is-clickable");
        el.toggleClass("is-open", !!h.open);
        el.setAttribute("aria-label", h.open ? "点=折叠这一年" : "点=展开这一年");
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const st = dom.__bdComponent && dom.__bdComponent.__bd;
          if (!st) return;
          const set = st.yearOpen || (st.yearOpen = new Set());
          if (set.has(h.year)) set.delete(h.year); else set.add(h.year);
          dom.onChange();
          if (dom.infinityScroll.invalidateAll) dom.infinityScroll.invalidateAll();
        });
      }
    }
    fd.el.insertBefore(box, fd.el.firstChild);
  }

  // ---------- 共现页面筛选 / 就地文字筛选 ----------
  eachFileDom(dom, cb) {
    for (const fd of (dom && dom.vChildren && dom.vChildren._children) || []) cb(fd);
  }
  eachMatch(dom, cb) {
    this.eachFileDom(dom, (fd) => {
      for (const m of (fd.vChildren && fd.vChildren._children) || []) cb(m, fd);
    });
  }

  // 结果列表每次加/删结果都会调 changed()；包一层，顺便刷新共现统计
  hookChanged(dom) {
    if (dom.__bdHooked || typeof dom.changed !== "function") return;
    dom.__bdHooked = true;
    const plugin = this, orig = dom.changed;
    dom.changed = function (...args) {
      const r = orig.apply(this, args);
      const c = this.__bdComponent;
      if (!plugin.unloaded && c && c.__bd) plugin.refresh(c);
      return r;
    };
  }

  // 反链是懒渲染的：文件条目滚进视口才生成命中条目（vChildren）。共现统计、分组、按文件隐藏都要覆盖全部，
  // 所以没渲染的文件直接用它的原始命中位置（fd.result.content），按 Obsidian 同样的规则切范围、合并
  fileMatches(fd) {
    const kids = (fd.vChildren && fd.vChildren._children) || [];
    if (fd.rendered && kids.length) return kids.filter((m) => !m.__bdDup && typeof m.content === "string");
    return this.virtualMatches(fd);
  }
  virtualMatches(fd) {
    const content = fd.content, file = fd.file;
    const vcomp = fd.parentDom && fd.parentDom.__bdComponent;
    const caseSig = vcomp && vcomp.__bdCaseNames ? [...vcomp.__bdCaseNames].join("\u0001") : "";
    if (fd.__bdVirt && fd.__bdVirt.content === content && fd.__bdVirt.caseSig === caseSig) return fd.__bdVirt.list;
    const list = [];
    const pos = ((fd.result && fd.result.content) || []).slice().sort((a, b) => a[0] - b[0]);
    const cache = file && this.app.metadataCache.getFileCache(file);
    if (typeof content === "string" && cache && pos.length) {
      let i = 0, prev = null;
      while (i < pos.length) {
        let [s, e] = fd.extraContext && typeof fd.getMatchExtraPositions === "function" ? fd.getMatchExtraPositions(content, pos[i], cache) : pos[i];
        let h = i + 1;
        if (!fd.separateMatches) while (h < pos.length) { const q = pos[h]; if (q[0] >= e) break; if (q[1] > e) { e = q[1]; h++; break; } h++; }
        const m = { parentDom: fd, content, cache, start: s, end: e, matches: pos.slice(i, h), __bdVirtual: true };
        const vctx = this.listContext(m);
        m.__bdRange = this.displayRange(m, vctx);
        m.__bdBlockKey = this.blockKey(m, vctx);
        // 和 decorate 一样的合并规则
        if (!this.caseMiss(m, fd) && !this.isDup(m, prev, fd)) { list.push(m); prev = m; }
        i = h;
      }
    }
    fd.__bdVirt = { content, list, caseSig };
    return list;
  }

  // 命中块显示范围内一起出现的其它页面/标签。返回 Map(key -> 显示名)，已排除当前页
  matchPages(m, targetPath) {
    const out = new Map();
    if (!m || !m.cache || typeof m.content !== "string") return out;
    let range = m.__bdRange;
    if (!range) { const ctx = this.listContext(m); range = this.displayRange(m, ctx); }
    const s = range.start, e = range.end;
    const inRange = (p) => p && p.start.offset >= s && p.start.offset < e;
    const src = m.parentDom && m.parentDom.file ? m.parentDom.file.path : "";
    for (const l of (m.cache.links || []).concat(m.cache.embeds || [])) {
      if (!inRange(l.position)) continue;
      const lp = (l.link || "").split("#")[0].split("|")[0].trim();
      if (!lp) continue;   // 同文件的块/标题引用，不算共现
      const dest = this.app.metadataCache.getFirstLinkpathDest(lp, src);
      if (dest) {
        if (dest.path === targetPath || (dest.extension && dest.extension !== "md")) continue;
        out.set("f:" + dest.path, dest.basename);
      } else out.set("l:" + lp, lp);
    }
    for (const t of (m.cache.tags || [])) {
      if (!inRange(t.position)) continue;
      out.set("t:" + t.tag, t.tag);
    }
    return out;
  }

  matchText(m) {
    let range = m.__bdRange;
    if (!range) { const ctx = this.listContext(m); range = this.displayRange(m, ctx); }
    return (m.content || "").substring(range.start, range.end).toLowerCase();
  }

  matchVisible(component, m) {
    const st = component.__bd;
    if (!st) return true;
    if (NAME_FILTER && ((st.nameInc && st.nameInc.size) || (st.nameExc && st.nameExc.size))) {
      const forms = this.formsOf(component, m);
      if (st.nameInc.size && ![...forms].some((f) => st.nameInc.has(f))) return false;
      for (const f of forms) if (st.nameExc.has(f)) return false;
    }
    if (st.text && !this.matchText(m).includes(st.text)) return false;
    if (st.include.size || st.exclude.size) {
      const pages = this.matchPages(m, component.__bdTargetPath);
      for (const k of st.include) if (!pages.has(k)) return false;
      for (const k of st.exclude) if (pages.has(k)) return false;
    }
    return true;
  }

  applyFilter(component) {
    const st = component.__bd;
    if (!st) return;
    const active = !!(st.text || st.include.size || st.exclude.size || (st.nameInc && st.nameInc.size) || (st.nameExc && st.nameExc.size));
    for (const dom of [component.backlinkDom, component.unlinkedDom]) {
      if (!dom) continue;
      this.eachFileDom(dom, (fd) => {
        if (this.isWiki(fd)) {
          const it = fd.selfEl && (fd.selfEl.closest(".tree-item") || fd.selfEl);
          if (it) it.addClass("bd-hidden");
          return;
        }
        let anyVisible = false;
        for (const m of (fd.vChildren && fd.vChildren._children) || []) {
          if (!m.el || m.__bdDup) continue;
          const vis = this.matchVisible(component, m);
          m.el.toggleClass("bd-hidden", !vis);
          if (vis) anyVisible = true;
        }
        // 还没渲染的文件：按原始命中判断整个文件要不要藏
        if (!(fd.rendered && fd.vChildren && fd.vChildren._children.length)) anyVisible = this.virtualMatches(fd).some((m) => this.matchVisible(component, m));
        const item = fd.selfEl && (fd.selfEl.closest(".tree-item") || fd.selfEl);
        // 开了大小写敏感：「提到当前文件名」里一条都对不上的文件整个藏起来
        if (item) item.toggleClass("bd-hidden", !anyVisible && (active || !!(fd.separateMatches && component.__bdCaseNames)));
      });
    }
  }

  refresh(component) {
    clearTimeout(component.__bdTimer);
    component.__bdTimer = setTimeout(() => this.refreshNow(component), 120);
  }
  refreshNow(component) {
    if (!component.__bd) return;
    try {
      const data = (SHOW_COOCCUR || GROUP_BACKLINKS) ? this.collectCooccur(component) : null;
      if (WIKI_FOLDER) this.renderWikiLinks(component);
      if (NAME_FILTER) this.refreshNameChips(component);
      if (SHOW_COOCCUR) this.refreshChips(component, data);
      if (GROUP_BACKLINKS) this.renderGroups(component, data);
      this.applyFilter(component);
    } catch (e) { console.error("[backlink-defaults] filter", e); }
  }

  // 扫一遍反链命中，得到每个共现页的次数，以及每条命中带哪些共现页（分组复用）
  collectCooccur(component) {
    const counts = new Map();
    const items = [];
    this.eachFileDom(component.backlinkDom, (fd) => { if (this.isWiki(fd)) return; for (const m of this.fileMatches(fd)) {
      const pages = this.matchPages(m, component.__bdTargetPath);
      for (const [k, label] of pages) {
        const e = counts.get(k) || { label, count: 0 };
        e.count++; counts.set(k, e);
      }
      items.push({ m, pages });
    } });
    return { counts, items };
  }

  // 每页被引用总数（idf 的分母），从 resolvedLinks 反向汇总，缓存
  pageDf(path) {
    if (!this._df) {
      this._df = new Map();
      const rl = this.app.metadataCache.resolvedLinks || {};
      for (const src in rl) { const t = rl[src]; for (const tgt in t) this._df.set(tgt, (this._df.get(tgt) || 0) + t[tgt]); }
    }
    return this._df.get(path) || 0;
  }
  keyDf(key) {
    if (key[0] === "t") { if (!this._tags) this._tags = (this.app.metadataCache.getTags && this.app.metadataCache.getTags()) || {}; return this._tags[key.slice(2)] || 0; }
    if (key[0] === "f") return this.pageDf(key.slice(2));
    if (!this._udf) {
      this._udf = new Map();
      const ul = this.app.metadataCache.unresolvedLinks || {};
      for (const src in ul) { const t = ul[src]; for (const tgt in t) this._udf.set(tgt, (this._udf.get(tgt) || 0) + t[tgt]); }
    }
    return this._udf.get(key.slice(2)) || 0;
  }
  // 关联紧密度 = 共现次数 × log(1 + 总笔记数 / 该页被引用总数)：稀有而专属的共现分高，无处不在的高频页被压低
  strength(key, co, N) {
    return co * Math.log(1 + N / Math.max(1, this.keyDf(key)));
  }

  setupToolbar(component, rootEl) {
    let bar = component.__bdToolbar;
    if (bar && bar.isConnected) return;
    if (bar) { bar.remove(); const i = this.toolbars.indexOf(bar); if (i >= 0) this.toolbars.splice(i, 1); }
    bar = createDiv({ cls: "bd-toolbar" });
    const row = bar.createDiv({ cls: "bd-toolbar-row" });
    if (SHOW_COOCCUR) {
      const toggle = row.createEl("button", { cls: "bd-filter-toggle", text: "共现筛选" });
      toggle.addEventListener("click", (e) => { e.preventDefault(); component.__bd.open = !component.__bd.open; this.refreshNow(component); });
      component.__bdToggle = toggle;
    }
    if (GROUP_BACKLINKS) {
      const gb = row.createEl("button", { cls: "bd-group-toggle", text: "分组" });
      gb.addEventListener("click", (e) => { e.preventDefault(); component.__bd.group = !component.__bd.group; gb.toggleClass("is-active", component.__bd.group); this.refreshNow(component); });
      component.__bdGroupBtn = gb;
    }
    const clear = row.createEl("button", { cls: "bd-filter-clear", text: "清除" });
    clear.addEventListener("click", (e) => {
      e.preventDefault();
      component.__bd.include.clear(); component.__bd.exclude.clear(); component.__bd.text = "";
      if (component.__bd.nameInc) { component.__bd.nameInc.clear(); component.__bd.nameExc.clear(); }
      if (component.__bdInput) component.__bdInput.value = "";
      this.refreshNow(component);
    });
    component.__bdClear = clear;
    if (TEXT_FILTER && component.__bdEmbedded) {
      const input = row.createEl("input", { cls: "bd-filter-input", attr: { type: "text", placeholder: "筛选反链文字…" } });
      input.value = component.__bd.text || "";
      input.addEventListener("input", () => { component.__bd.text = input.value.trim().toLowerCase(); this.applyFilter(component); this.updateClear(component); });
      input.addEventListener("keydown", (e) => e.stopPropagation());
      component.__bdInput = input;
    }
    component.__bdNameBar = bar.createDiv({ cls: "bd-names" });
    component.__bdWiki = bar.createDiv({ cls: "bd-wiki" });
    component.__bdChips = bar.createDiv({ cls: "bd-chips" });
    component.__bdGroups = bar.createDiv({ cls: "bd-groups" });
    rootEl.insertBefore(bar, rootEl.firstChild);
    component.__bdToolbar = bar;
    this.toolbars.push(bar);
  }

  // 名字按钮：只有当前页有别名时才出现。次数分「链接 / 提到」两列统计（「提到当前文件名」折叠时 Obsidian 不算它，次数为 0）
  refreshNameChips(component) {
    const bar = component.__bdNameBar;
    if (!bar) return;
    const names = component.__bdNames || [];
    const st = component.__bd;
    bar.empty();
    bar.toggle(names.length > 1);
    if (names.length < 2) return;
    const counts = new Map(names.map((n) => [n, { linked: 0, unlinked: 0 }]));
    for (const [dom, key] of [[component.backlinkDom, "linked"], [component.unlinkedDom, "unlinked"]]) {
      this.eachFileDom(dom, (fd) => { if (this.isWiki(fd)) return; for (const m of this.fileMatches(fd)) for (const f of this.formsOf(component, m)) counts.get(f) && counts.get(f)[key]++; });
    }
    bar.createSpan({ cls: "bd-names-label", text: "名字" });
    names.forEach((n, i) => {
      const c = counts.get(n);
      const chip = bar.createSpan({ cls: "bd-chip bd-name-chip" });
      chip.toggleClass("bd-chip-inc", st.nameInc.has(n));
      chip.toggleClass("bd-chip-exc", st.nameExc.has(n));
      chip.createSpan({ cls: "bd-chip-name", text: n });
      chip.createSpan({ cls: "bd-chip-count", text: String(c.linked + c.unlinked) });
      chip.setAttribute("aria-label", `${i === 0 ? "文件名" : "别名"} · 链接 ${c.linked} 条 · 提到 ${c.unlinked} 条\n点=只看用这个名字的 · Shift 点=排除`);
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        if (e.shiftKey) { if (st.nameExc.has(n)) st.nameExc.delete(n); else { st.nameExc.add(n); st.nameInc.delete(n); } }
        else { if (st.nameInc.has(n)) st.nameInc.delete(n); else { st.nameInc.add(n); st.nameExc.delete(n); } }
        this.refreshNow(component);
      });
    });
  }

  refreshChips(component, data) {
    const chips = component.__bdChips;
    if (!chips) return;
    const st = component.__bd;
    const counts = (data && data.counts) || this.collectCooccur(component).counts;
    // 已选中的即使当前计数为 0 也保留，方便取消
    for (const k of st.include) if (!counts.has(k)) counts.set(k, { label: this.keyLabel(k), count: 0 });
    for (const k of st.exclude) if (!counts.has(k)) counts.set(k, { label: this.keyLabel(k), count: 0 });
    const N = this.app.vault.getMarkdownFiles().length;
    const entries = Array.from(counts.entries());
    if (RANK_BY_STRENGTH) entries.sort((a, b) => this.strength(b[0], b[1].count, N) - this.strength(a[0], a[1].count, N) || b[1].count - a[1].count || a[1].label.localeCompare(b[1].label));
    else entries.sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label));
    const active = st.include.size + st.exclude.size;
    if (component.__bdToggle) component.__bdToggle.setText(active ? `共现筛选 · ${active}` : (entries.length ? `共现筛选 · ${entries.length}` : "共现筛选"));
    this.updateClear(component);
    chips.toggle(st.open && entries.length > 0);
    chips.empty();
    if (!st.open) return;
    for (const [k, info] of entries) {
      const chip = chips.createSpan({ cls: "bd-chip" });
      chip.toggleClass("bd-chip-inc", st.include.has(k));
      chip.toggleClass("bd-chip-exc", st.exclude.has(k));
      chip.createSpan({ cls: "bd-chip-name", text: info.label });
      chip.createSpan({ cls: "bd-chip-count", text: String(info.count) });
      chip.setAttribute("aria-label", `共现 ${info.count} 次 · 紧密度 ${this.strength(k, info.count, N).toFixed(1)} · 点=只看含它 · Shift点=排除`);
      chip.addEventListener("click", (e) => { e.preventDefault(); this.onChipClick(component, k, e.shiftKey); });
    }
  }

  isWiki(fd) {
    return !!(WIKI_FOLDER && fd && fd.file && fd.file.path.startsWith(WIKI_FOLDER));
  }

  // 链到当前页的 wiki 页，列成一行入口：点=打开，⌘点=新标签，Shift点=右侧栏叠放
  renderWikiLinks(component) {
    const box = component.__bdWiki;
    if (!box) return;
    box.empty();
    const files = [];
    this.eachFileDom(component.backlinkDom, (fd) => { if (this.isWiki(fd)) files.push(fd.file); });
    box.toggle(files.length > 0);
    if (!files.length) return;
    box.createSpan({ cls: "bd-wiki-label", text: "📘 Wiki" });
    for (const f of files) {
      const a = box.createEl("a", { cls: "bd-wiki-link", text: f.basename, attr: { "aria-label": "点=打开 · ⌘点=新标签 · Shift点=右侧栏叠放" } });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (SHIFT_STACK && e.shiftKey) this.openStackedFile(f, 0);
        else this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(f);
      });
      a.addEventListener("mouseover", (e) => this.app.workspace.trigger("hover-link", { event: e, source: "search", hoverParent: box, targetEl: a, linktext: f.path, sourcePath: component.__bdTargetPath || "" }));
    }
  }

  updateClear(component) {
    const st = component.__bd, btn = component.__bdClear;
    if (!st || !btn) return;
    const on = !!(st.include.size || st.exclude.size || st.text || (st.nameInc && st.nameInc.size) || (st.nameExc && st.nameExc.size));
    btn.toggleClass("is-idle", !on);
    btn.disabled = !on;
  }

  keyLabel(k) {
    const body = k.slice(2);
    if (k[0] === "f") { const parts = body.split("/"); return parts[parts.length - 1].replace(/\.md$/, ""); }
    return body;
  }

  onChipClick(component, key, shift) {
    const st = component.__bd;
    if (shift) {
      if (st.exclude.has(key)) st.exclude.delete(key);
      else { st.exclude.add(key); st.include.delete(key); }
    } else {
      if (st.include.has(key)) st.include.delete(key);
      else { st.include.add(key); st.exclude.delete(key); }
    }
    this.refreshNow(component);
  }

  // 「分组」：按最紧密的几个共现页把反链聚成簇（一条命中若含多个共现页会出现在多个簇里），其余归「其它」
  renderGroups(component, data) {
    const box = component.__bdGroups;
    if (!box) return;
    const st = component.__bd;
    box.toggle(!!st.group);
    box.empty();
    if (!st.group) return;
    if (!data) data = this.collectCooccur(component);
    const N = this.app.vault.getMarkdownFiles().length;
    const scored = Array.from(data.counts.entries()).sort((a, b) => this.strength(b[0], b[1].count, N) - this.strength(a[0], a[1].count, N) || b[1].count - a[1].count);
    const top = scored.slice(0, GROUP_MAX);
    const topSet = new Set(top.map((x) => x[0]));
    const groups = new Map(); for (const [k] of top) groups.set(k, []);
    const other = [];
    for (const it of data.items) {
      let hit = false;
      for (const k of it.pages.keys()) if (topSet.has(k)) { groups.get(k).push(it); hit = true; }
      if (!hit) other.push(it);
    }
    if (!top.length && !other.length) { box.createDiv({ cls: "bd-group-empty", text: "没有可分组的共现页" }); return; }
    for (const [k, info] of top) this.renderGroup(component, box, k, info.label, groups.get(k), topSet);
    if (other.length) this.renderGroup(component, box, "__other", "其它", other, topSet);
  }

  // 「只看这簇」：普通簇 = 只含这个共现页；「其它」= 排除所有做了簇的共现页。再点一次取消
  clusterActive(st, key, topSet) {
    if (key === "__other") return st.include.size === 0 && st.exclude.size === topSet.size && [...topSet].every((k) => st.exclude.has(k));
    return st.include.size === 1 && st.include.has(key) && st.exclude.size === 0;
  }
  onlyCluster(component, key, topSet) {
    const st = component.__bd;
    const on = this.clusterActive(st, key, topSet);
    st.include.clear(); st.exclude.clear();
    if (!on) {
      if (key === "__other") for (const k of topSet) st.exclude.add(k);
      else st.include.add(key);
    }
    this.refreshNow(component);
  }

  renderGroup(component, box, key, label, items, topSet) {
    const st = component.__bd;
    const collapsed = st.groupCollapsed && st.groupCollapsed.has(key);
    const sec = box.createDiv({ cls: "bd-group" });
    const head = sec.createDiv({ cls: "bd-group-head" });
    head.toggleClass("is-collapsed", !!collapsed);
    const tw = head.createSpan({ cls: "bd-group-twist" });
    setIcon(tw, "right-triangle");
    head.createSpan({ cls: "bd-group-name", text: label });
    const cnt = head.createSpan({ cls: "bd-group-count", text: String(items.length) });
    const only = this.clusterActive(st, key, topSet || new Set());
    cnt.toggleClass("is-active", only);
    cnt.setAttribute("aria-label", only ? "正在只看这簇 · 点=取消" : "只看这簇（下面的反链也跟着收成这一簇）");
    cnt.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();   // 不触发标题的折叠
      this.onlyCluster(component, key, topSet || new Set());
    });
    const list = sec.createDiv({ cls: "bd-group-list" });
    list.toggle(!collapsed);
    head.addEventListener("click", (e) => {
      e.preventDefault();
      const s = st.groupCollapsed || (st.groupCollapsed = new Set());
      const now = !head.hasClass("is-collapsed");
      head.toggleClass("is-collapsed", now);
      list.toggle(!now);
      if (now) s.add(key); else s.delete(key);
    });
    for (const it of items) {
      const m = it.m;
      const file = m.parentDom && m.parentDom.file;
      const line = this.offsetToLine(m, (m.__bdRange || {}).start);
      const row = list.createDiv({ cls: "bd-group-item", attr: { "aria-label": "点=跳转 · ⌘点=新标签 · Shift点=右侧栏叠放" } });
      if (file) row.createSpan({ cls: "bd-group-file", text: file.basename });
      row.createSpan({ cls: "bd-group-snip", text: this.snippetText(m) });
      row.addEventListener("click", (e) => {
        e.preventDefault();
        if (SHIFT_STACK && e.shiftKey) this.openStackedFile(file, line);
        else this.openAt(file, line, Keymap.isModEvent(e));
      });
    }
  }

  // 一条命中的一行摘要：取显示范围里第一行有内容的，去掉列表记号/双链括号/强调号
  snippetText(m) {
    let r = m.__bdRange;
    if (!r) { const ctx = this.listContext(m); r = this.displayRange(m, ctx); }
    const raw = (m.content || "").substring(r.start, r.end);
    let line = raw.split("\n").map((s) => s.trim()).find(Boolean) || "";
    line = line
      .replace(/^(#+\s+|>\s*)/, "")
      .replace(/^([-*+]|\d+[.)])\s+(\[.\]\s+)?/, "")
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (s, a, b) => b || a.split("#")[0])
      .replace(/\[([^\]]*)\]\([^)]*\)/g, (s, a) => a)
      .replace(/[*_=~`#]+/g, "")
      .replace(/\s\^[\w-]+\s*$/, "")
      .trim();
    return line.slice(0, 100);
  }

  // ---------- 块引用计数 ----------
  buildBlockIndex() {
    this.blockCounts = new Map();   // "path#^id" -> 次数
    this.blockSrc = new Map();      // 源文件 -> 它贡献的 key 列表
    for (const f of this.app.vault.getMarkdownFiles()) this.indexFile(f);
  }
  removeFile(path) {
    if (!this.blockCounts) return;
    const prev = this.blockSrc.get(path);
    if (prev) for (const k of prev) { const n = (this.blockCounts.get(k) || 0) - 1; if (n <= 0) this.blockCounts.delete(k); else this.blockCounts.set(k, n); }
    this.blockSrc.delete(path);
  }
  indexFile(f) {
    if (!this.blockCounts) return;
    this.removeFile(f.path);
    const c = this.app.metadataCache.getFileCache(f);
    const keys = [];
    if (c) for (const l of (c.links || []).concat(c.embeds || [])) {
      const mm = /^([^#|]*)#\^([\w-]+)/.exec(l.link || "");
      if (!mm) continue;
      const lp = mm[1].trim();
      const dest = lp ? this.app.metadataCache.getFirstLinkpathDest(lp, f.path) : f;
      if (dest) keys.push(dest.path + "#^" + mm[2]);
    }
    this.blockSrc.set(f.path, keys);
    for (const k of keys) this.blockCounts.set(k, (this.blockCounts.get(k) || 0) + 1);
  }
  addRefBadges(m, range) {
    if (!this.blockCounts) return;
    const file = m.parentDom && m.parentDom.file;
    const blocks = m.cache && m.cache.blocks;
    if (!file || !blocks) return;
    const found = [];
    for (const id in blocks) {
      const b = blocks[id];
      if (!b.position) continue;
      const off = b.position.start.offset;
      if (off >= range.start && off < range.end) {
        const n = this.blockCounts.get(file.path + "#^" + id) || 0;
        if (n > 0) found.push([id, n]);
      }
    }
    if (!found.length) return;
    const wrap = m.el.createDiv({ cls: "bd-refcounts" });
    for (const [id, n] of found) {
      const badge = wrap.createSpan({ cls: "bd-refcount", attr: { "aria-label": `这一块被引用 ${n} 次 · 点开看谁引用` } });
      setIcon(badge, "lucide-corner-down-left");
      badge.createSpan({ cls: "bd-refcount-n", text: String(n) });
      badge.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); this.openSearch('"#^' + id + '"'); });
    }
  }
  openSearch(query) {
    const s = this.app.internalPlugins && this.app.internalPlugins.getPluginById("global-search");
    if (s && s.instance) s.instance.openGlobalSearch(query);
  }

  // 跳到反向链接：优先滚到正文底部那份并聚焦筛选框；没有就唤出侧栏反链面板
  gotoBacklinks() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    const root = view && view.containerEl && view.containerEl.querySelector(".embedded-backlinks");
    if (root && root.offsetParent !== null) {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { const f = root.querySelector(".bd-filter-input"); if (f) f.focus(); }, 150);
      return;
    }
    const leaves = this.app.workspace.getLeavesOfType("backlink");
    if (leaves.length) {
      this.app.workspace.revealLeaf(leaves[0]);
      setTimeout(() => { const f = leaves[0].view.containerEl.querySelector(".search-input-container input"); if (f) f.focus(); }, 150);
      return;
    }
    if (this.app.commands && this.app.commands.executeCommandById) this.app.commands.executeCommandById("backlink:open");
  }

  // ---------- Shift 点：右侧栏叠放 ----------
  offsetToLine(m, off) {
    if (off == null || typeof m.content !== "string") return -1;
    return m.content.substring(0, off).split("\n").length - 1;
  }
  // 右侧栏叠放：第一块开在右侧栏最上面那组的新标签里；之后每块接在上一块下面（往下切分）
  stackLeaf() {
    const ws = this.app.workspace;
    const alive = (this.__bdStack || []).filter((l) => l && l.parent && l.view && l.getRoot && l.getRoot() === ws.rightSplit);
    this.__bdStack = alive;
    const last = alive[alive.length - 1];
    let leaf = null;
    if (last) {
      try { leaf = ws.createLeafBySplit(last, "horizontal", false); } catch (e) {}
    }
    if (!leaf) {
      const top = ws.rightSplit && ws.rightSplit.children && ws.rightSplit.children[0];
      try { if (top) leaf = ws.createLeafInParent(top, 0); } catch (e) {}
      if (!leaf) leaf = ws.getRightLeaf(true);
    }
    alive.push(leaf);
    return leaf;
  }
  async openStackedFile(file, line) {
    if (!file) return;
    const ws = this.app.workspace;
    if (ws.rightSplit && ws.rightSplit.collapsed) ws.rightSplit.expand();
    const leaf = this.stackLeaf();
    // 用实时预览打开：Zoom 是编辑器命令，阅读视图里用不了
    await leaf.setViewState({ type: "markdown", state: { file: file.path, mode: "source", source: false }, active: true });
    ws.revealLeaf(leaf);
    if (line < 0) return;
    ws.setActiveLeaf(leaf, { focus: true });
    const editor = leaf.view && leaf.view.editor;
    if (!editor) return;
    await new Promise((r) => setTimeout(r, 60));   // 等编辑器把文档解析完
    editor.setCursor({ line, ch: 0 });
    const cache = this.app.metadataCache.getFileCache(file);
    const isList = !!(cache && cache.listItems && cache.listItems.some((it) => it.position.start.line === line));
    const zoom = this.app.commands && this.app.commands.commands["bullet:zoom-in"];
    if (STACK_ZOOM && isList && zoom && this.app.commands.executeCommandById("bullet:zoom-in")) return;
    // 不是列表块、或没装 Bullet：把这一行滚到顶格
    const cm = editor.cm;
    if (cm && cm.constructor && cm.constructor.scrollIntoView) {
      cm.dispatch({ effects: cm.constructor.scrollIntoView(editor.posToOffset({ line, ch: 0 }), { y: "start" }) });
    } else editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
  }
  openStackedLink(linktext, sourcePath) {
    const hash = linktext.indexOf("#");
    const path = (hash < 0 ? linktext : linktext.slice(0, hash)).trim();
    const subpath = hash < 0 ? "" : linktext.slice(hash);
    const dest = this.app.metadataCache.getFirstLinkpathDest(path || "", sourcePath);
    if (!dest) return;
    let line = -1;
    if (subpath) {
      const c = this.app.metadataCache.getFileCache(dest);
      const r = c && resolveSubpath(c, subpath);
      if (r) { const p = (r.block && r.block.position) || (r.current && r.current.position); if (p) line = p.start.line; }
    }
    this.openStackedFile(dest, line);
  }
};
