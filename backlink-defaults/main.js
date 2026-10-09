const { Plugin, MarkdownRenderer, Component, Notice, setIcon, Keymap, resolveSubpath, MarkdownView, Modal, Setting, getLinkpath } = require("obsidian");

// ---------- 跳到某一行：稳定地停在视口正中，并选中这一行的文字（Hover Outline、第二大脑里有同一份） ----------
//   · 编辑模式：选中行内文字（不含缩进、列表符号、复选框、#、行尾 ^块ID）；高度是边滚边量的，对中后再量几次，偏了就补
//   · 阅读模式：先滚到附近让它渲染出来，再按段落 / 列表项（data-line）找到对应元素，对中后用浏览器选区选中
//   · 靠近文首文末滚不动的时候，停在能到的最近位置
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LINE_PREFIX_RE = /^\s*(?:>\s*)*(?:(?:[-*+]|\d+[.)])\s+)?(?:\[.\]\s+)?(?:#{1,6}\s+)?/;

async function centerOn(sc, measure) {
  for (let i = 0; i < 10; i++) {
    await nextFrame();
    await nextFrame();
    const m = measure();
    if (!m) return;
    const s = sc.getBoundingClientRect();
    const delta = m.top + m.height / 2 - (s.top + s.height / 2);
    if (Math.abs(delta) < 2) return;
    const before = sc.scrollTop;
    sc.scrollTop = before + delta;
    if (Math.abs(sc.scrollTop - before) < 1) return;   // 到顶 / 到底了
  }
}

// 阅读模式里第 line 行对应的元素：列表项按 data-line（相对段落开头），其余取段落本身；顶上文件名那一栏也挂在第 0 行、但只占 0 行，跳过
function previewElAt(renderer, line) {
  const sec = (renderer.sections || []).find((s) => s.start && s.end && s.lines !== 0 && s.start.line <= line && line <= s.end.line);
  if (!sec || !sec.el || !sec.el.isConnected || !sec.el.firstElementChild) return null;
  // 「- - 文字」这种一行套几层的，每层都是这一行，取最里面那层（外层自己没有文字）
  const lis = sec.el.querySelectorAll(`li[data-line="${line - sec.start.line}"]`);
  return lis.length ? lis[lis.length - 1] : sec.el.firstElementChild;
}

// 元素自己的文字（列表项不含子列表）
function ownRange(el) {
  const range = document.createRange();
  if (el.tagName === "LI") {
    range.setStart(el, 0);
    const sub = [...el.children].find((c) => /^(UL|OL)$/.test(c.tagName) || c.classList.contains("list-children"));
    if (sub) range.setEndBefore(sub);
    else range.setEnd(el, el.childNodes.length);
  } else range.selectNodeContents(el);
  return range;
}

async function revealLine(view, line, select = true) {
  if (!view || !view.getMode) return;
  if (view.getMode() === "source") {
    const ed = view.editor;
    const cm = ed && ed.cm;
    if (!cm) return;
    line = Math.max(0, Math.min(line, ed.lastLine()));
    const text = ed.getLine(line);
    if (select) {
      const from = text.match(LINE_PREFIX_RE)[0].length;
      const to = Math.max(from, text.replace(/\s+\^[\w-]+\s*$/, "").replace(/\s+$/, "").length);
      ed.setSelection({ line, ch: from }, { line, ch: to });
    } else ed.setCursor({ line, ch: text.length });
    ed.focus();
    const pos = cm.state.doc.line(line + 1).from;
    cm.dispatch({ effects: cm.constructor.scrollIntoView(pos, { y: "center" }) });
    await centerOn(cm.scrollDOM, () => {
      const b = cm.lineBlockAt(pos);
      return { top: cm.documentTop + b.top, height: b.height };
    });
    return;
  }
  const pm = view.previewMode;
  const rd = pm && pm.renderer;
  const sc = rd && rd.previewEl;
  if (!sc) return;
  pm.applyScroll(line);
  let el = null;
  for (let i = 0; i < 12 && !el; i++) { await wait(i ? 80 : 30); el = previewElAt(rd, line); }
  if (!el) return;
  await centerOn(sc, () => {
    const cur = previewElAt(rd, line);
    return cur ? ownRange(cur).getBoundingClientRect() : null;
  });
  if (!select) return;
  const target = previewElAt(rd, line);
  if (!target) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(ownRange(target));
}

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
// Roam 式面包屑：命中块上方一行灰字，列出它所在的完整路径（所属标题 › 各级母块）。
// 点某一级 = 就地展开到那一级（连同和命中块并列的兄弟块一起显示），可以再点更外一级继续展开；⌘点 = 跳到原文；Shift 点 = 右侧栏打开
const SHOW_BREADCRUMBS = true;
// 面包屑里带上命中块所在的标题层级（Roam 没有标题，Obsidian 里标题就是块的上级）
const CRUMB_HEADINGS = true;
// 命中的是标题行时，像 Roam 的块带子块一样，把这个标题下的整节内容一起显示
const HEADING_SECTION = true;
// 反链片段按 Markdown 渲染（列表、加粗、链接、复选框等），而不是原样显示源码
const RENDER_MARKDOWN = true;
// 反链条目右上角的 ✎：就地编辑这一块的源码并写回原笔记（⌘↩ 保存，Esc 取消）
const INLINE_EDIT = true;
// 命中块的子块超过这么多行时先折叠，点「展开」再看全部（列表块开了 FOLD_CHILDREN 时改按子块结构折叠，不按行数）
const FOLD_LINES = 8;
// 命中的是列表项时按子块结构显示（像 Logseq）：一级子块全部列出，超过 CHILD_LIMIT 个的后面收成「…」；
// 一级子块下面还有子块的，只显示它自己那一行，圆点带灰圈、行尾「…」，点「…」展开。
// 子块里另有链接当前页的地方会自动展开到那一层，不会被折叠藏掉
const FOLD_CHILDREN = true;
const CHILD_LIMIT = 6;
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
// 「提到当前文件名」里点「转为链接」后，反链面板先不刷新、不重排（光标和滚动位置留在原地，不打断思路）：
// 按钮换成「已链接 ✓」，同一篇里再点别的也照样能转（位置按已经改过的地方顺延）。
// 离开这一页再回来、或者重新打开这一页时，再整体重新读取
const FREEZE_AFTER_LINK = true;
// Obsidian 自带的「导出为 PDF」对话框里加一个开关「包含反链（链接到当前文件）」：
// 打开时，正文后面接上「链接到当前文件」的全部内容，按来源笔记分组（顺序和反链面板一样：页面按关系紧密度在前，日记从新到旧在后），
// 每一条是引用所在的整块（列表项连子块、标题连整节、其余是所在段落），上方一行灰字是它的面包屑路径
const PDF_BACKLINKS = true;
// 同一个对话框里再加「排版」：精致排版开关、正文字体、标题字体、字号、强调色。只作用于导出的 PDF，不改笔记和主题
const PDF_STYLE = true;
// 字体候选：[显示名, CSS 字体栈]。打开对话框时用画布量字宽，只列出本机装了的（按栈里第一个字体判断）
const PDF_FONTS = [
  ["宋体", '"Songti SC", "STSong", serif'],
  ["思源宋体", '"Source Han Serif SC", "Noto Serif CJK SC", "Noto Serif SC", serif'],
  ["霞鹜文楷", '"LXGW WenKai", "LXGW WenKai GB", serif'],
  ["楷体", '"Kaiti SC", "STKaiti", serif'],
  ["方正书宋", '"FZShuSong-Z01", "FZShuSong-Z01S", serif'],
  ["苹方", '"PingFang SC", sans-serif'],
  ["思源黑体", '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", sans-serif'],
  ["冬青黑体", '"Hiragino Sans GB", sans-serif'],
  ["Georgia + 宋体", 'Georgia, "Songti SC", serif'],
  ["Charter + 宋体", 'Charter, "Songti SC", serif'],
  ["Charter + 苹方", 'Charter, "PingFang SC", serif'],
];
const PDF_SIZES = { small: ["小", "13px"], medium: ["中", "14.5px"], large: ["大", "16px"] };
// 精致排版的样式：只在导出窗口里生效（挂在 .print.bd-pdf 下面），颜色和字体走变量
const PDF_CSS = `
.print.bd-pdf { --bd-accent: #3a6ea5; --bd-ink: #1f2328; --bd-muted: #6b7280; --bd-line: #e5e7eb; --bd-soft: color-mix(in srgb, var(--bd-accent) 7%, white); }
.print.bd-pdf .markdown-preview-view, .print.bd-pdf .markdown-rendered {
  font-family: var(--bd-font, var(--font-text)); font-size: var(--bd-size, 14.5px); line-height: 1.8;
  color: var(--bd-ink); letter-spacing: 0.01em; text-align: justify; -webkit-font-smoothing: antialiased;
}
.print.bd-pdf p { margin: 0 0 0.9em; orphans: 3; widows: 3; }
.print.bd-pdf h1, .print.bd-pdf h2, .print.bd-pdf h3, .print.bd-pdf h4, .print.bd-pdf h5, .print.bd-pdf h6 {
  font-family: var(--bd-head-font, var(--bd-font, var(--font-text))); color: var(--bd-ink);
  line-height: 1.35; break-after: avoid; text-align: left;
}
.print.bd-pdf h1 { font-size: 1.95em; font-weight: 700; margin: 0 0 1.1em; padding-bottom: 0.35em; border-bottom: 2px solid var(--bd-accent); }
.print.bd-pdf h2 { font-size: 1.45em; font-weight: 700; margin: 1.8em 0 0.7em; padding-left: 0.55em; border-left: 4px solid var(--bd-accent); }
.print.bd-pdf h3 { font-size: 1.2em; font-weight: 650; margin: 1.5em 0 0.6em; color: var(--bd-accent); }
.print.bd-pdf h4, .print.bd-pdf h5, .print.bd-pdf h6 { font-size: 1.05em; font-weight: 650; margin: 1.2em 0 0.5em; color: #374151; }
.print.bd-pdf a, .print.bd-pdf .internal-link, .print.bd-pdf .external-link { color: var(--bd-accent); text-decoration: none; }
.print.bd-pdf strong { color: #111; font-weight: 700; }
.print.bd-pdf em { color: #374151; }
.print.bd-pdf mark { background: color-mix(in srgb, var(--bd-accent) 18%, white); color: inherit; padding: 0 0.15em; border-radius: 3px; }
.print.bd-pdf ul, .print.bd-pdf ol { padding-left: 1.4em; margin: 0.3em 0 0.9em; }
.print.bd-pdf li { margin: 0.2em 0; }
.print.bd-pdf li::marker { color: var(--bd-accent); }
.print.bd-pdf .list-bullet::after { background-color: var(--bd-accent); }
.print.bd-pdf input[type=checkbox] { accent-color: var(--bd-accent); }
.print.bd-pdf blockquote {
  margin: 1em 0; padding: 0.6em 1em; color: #4b5563; background: var(--bd-soft);
  border-left: 3px solid var(--bd-accent); border-radius: 0 6px 6px 0; break-inside: avoid;
}
.print.bd-pdf blockquote > :last-child { margin-bottom: 0; }
.print.bd-pdf code { font-size: 0.86em; padding: 0.12em 0.38em; border-radius: 4px; background: #f3f4f6; color: #be185d; }
.print.bd-pdf pre { background: #f8f9fa; border: 1px solid var(--bd-line); border-radius: 8px; padding: 0.9em 1.1em; break-inside: avoid; }
.print.bd-pdf pre code { background: none; color: inherit; padding: 0; font-size: 0.84em; }
.print.bd-pdf table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.93em; break-inside: avoid; }
.print.bd-pdf th { background: color-mix(in srgb, var(--bd-accent) 10%, white); color: var(--bd-ink); font-weight: 650; }
.print.bd-pdf th, .print.bd-pdf td { border: 1px solid var(--bd-line); padding: 0.45em 0.7em; text-align: left; }
.print.bd-pdf hr { border: none; border-top: 1px solid var(--bd-line); margin: 2em 0; }
.print.bd-pdf img { max-width: 100%; border-radius: 6px; break-inside: avoid; }
.print.bd-pdf .tag { background: color-mix(in srgb, var(--bd-accent) 12%, white); color: var(--bd-accent); border: none; border-radius: 999px; padding: 0.05em 0.55em; font-size: 0.85em; }
.print.bd-pdf .callout { border-radius: 8px; break-inside: avoid; }
.print.bd-pdf .bd-print-backlinks { margin-top: 2.5em; }
.print.bd-pdf .bd-print-backlinks > hr { border-top: 2px solid var(--bd-accent); margin: 0 0 1.2em; }
.print.bd-pdf .bd-print-backlinks h3 { color: var(--bd-ink); border-bottom: 1px solid var(--bd-line); padding-bottom: 0.25em; }
.print.bd-pdf .bd-print-backlinks h3 .internal-link { color: var(--bd-ink); }
.print.bd-pdf .bd-print-crumbs { color: var(--bd-muted); font-size: 0.82em; margin: 0.9em 0 0.15em; padding-left: 0.6em; border-left: 2px solid color-mix(in srgb, var(--bd-accent) 45%, white); }
`;

// 反链里就地编辑（✎）时：选中文字后输入成对符号 = 包起来，不替换（中文、英文输入法都一样）。
// 和「编辑体验 Logseq 化」插件、Keyboard Maestro 快速记录框同一套规则：
// 选中「文字」输入 [ → [文字]，再输入 [ → [[文字]]；中文输入法下 【 也一样，【文字】 再输入 【 → [[文字]]
const PAIR_WRAP = true;
const PAIRS = { "(": ")", "[": "]", "{": "}", "<": ">", '"': '"', "'": "'", "`": "`",
  "（": "）", "【": "】", "「": "」", "『": "』", "《": "》", "〈": "〉", "“": "”", "‘": "’" };
const CLOSE_TO_OPEN = {};
for (const o in PAIRS) if (o !== PAIRS[o]) CLOSE_TO_OPEN[PAIRS[o]] = o;

// 给一个 textarea 装上「成对符号包裹」。不管字符是直接输入还是输入法上屏，都是事后看：
// 「选中的文字被换成了一个成对符号」就改成包裹（走 execCommand，⌘Z 能撤销）
function watchPairWrap(ta) {
  const doc = ta.ownerDocument || document;
  let snap = null, composing = false;
  const takeSnap = () => { snap = { value: ta.value, s: ta.selectionStart, e: ta.selectionEnd, back: ta.selectionDirection === "backward" }; };
  const snapNow = (e) => { if (!composing && !(e && e.isComposing)) takeSnap(); };
  const wrapIfReplaced = (o) => {
    takeSnap();
    if (!o || o.s === o.e || !ta.isConnected) return;
    const v = ta.value;
    if (v.length !== o.value.length - (o.e - o.s) + 1) return;
    if (v.slice(0, o.s) !== o.value.slice(0, o.s) || v.slice(o.s + 1) !== o.value.slice(o.e)) return;
    const ch = v.charAt(o.s), open = PAIRS[ch] ? ch : CLOSE_TO_OPEN[ch];
    if (!open) return;
    const text = o.value.slice(o.s, o.e), before = o.value.charAt(o.s - 1), after = o.value.charAt(o.e);
    let from = o.s, to = o.s + 1, ins, a;
    if ((open === "[" || open === "【") && o.s > 0 && ((before === "[" && after === "]") || (before === "【" && after === "】"))) {
      from = o.s - 1; to = o.s + 2; ins = "[[" + text + "]]"; a = o.s + 1;   // 第二次按：[文字] / 【文字】 → [[文字]]
    } else {
      ins = open + text + PAIRS[open]; a = o.s + open.length;
    }
    ta.setSelectionRange(from, to);
    doc.execCommand("insertText", false, ins);
    ta.setSelectionRange(a, a + text.length, o.back ? "backward" : "forward");
    takeSnap();
  };
  // 「改动前」的快照：选区变了、按键前、输入前都记一次（WebKit 和 Chromium 触发的事件不完全一样）
  const onSel = () => { if (!ta.isConnected) doc.removeEventListener("selectionchange", onSel); else if (doc.activeElement === ta) snapNow(); };
  doc.addEventListener("selectionchange", onSel);
  ta.addEventListener("keydown", snapNow);
  ta.addEventListener("beforeinput", snapNow);
  ta.addEventListener("compositionstart", () => { takeSnap(); composing = true; });
  // 放到下一个时刻做：输入事件还在分发时调 execCommand 会被忽略
  ta.addEventListener("input", (e) => { if (composing || e.isComposing) return; const o = snap; setTimeout(() => wrapIfReplaced(o), 0); });
  ta.addEventListener("compositionend", () => { composing = false; const o = snap; setTimeout(() => wrapIfReplaced(o), 0); });
  takeSnap();
}

module.exports = class BacklinkDefaults extends Plugin {
  async onload() {
    this.settings = Object.assign({ pdfBacklinks: false, pdfPretty: true, pdfFont: "", pdfHeadFont: "", pdfSize: "medium", pdfAccent: "#3a6ea5" }, await this.loadData());
    if (PDF_BACKLINKS) this.patchPdfExport();
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
    // 重新打开同一页 = 刷新：解冻并重新读取反链
    if (FREEZE_AFTER_LINK) this.registerEvent(this.app.workspace.on("file-open", (f) => { if (f) this.thawFor(f.path); }));

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
    this.eachComponent((c) => this.thaw(c, true));
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
          // 离开了冻结时的那一页：解冻（Obsidian 换页时自己会整体重算）
          if (component.__bdFrozen) this.thaw(component, false);
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

  // 点面包屑展开到的那一级（m.__bdRoot = 那一级母块 / 标题的行号）：显示它连同全部子块，也就是命中块和它并列的兄弟块一起。
  // 返回 { ctx, range }，ctx 换成以那一级为「命中项」的上下文，面包屑随之少掉这一级；原文变了对不上就退回默认显示
  expandedView(m, ctx) {
    const line = m.__bdRoot, c = m.content;
    if (line == null) return null;
    const trim = (start, end) => { while (end > start && /\s/.test(c[end - 1])) end--; return end; };
    const i = ctx ? ctx.chain.findIndex((it) => it.position.start.line === line) : -1;
    if (i >= 0) {
      const root = ctx.chain[i], start = ctx.lineStart(root);
      return {
        ctx: { item: root, items: ctx.items, chain: ctx.chain.slice(0, i), lineStart: ctx.lineStart },
        range: { start, end: trim(start, this.subtreeEnd(ctx.items, root)), heading: null },
      };
    }
    const hs = (m.cache && m.cache.headings) || [];
    const h = hs.find((x) => x.position.start.line === line);
    if (h && h.position.start.offset <= m.start) {
      const next = hs.slice(hs.indexOf(h) + 1).find((x) => x.level <= h.level);
      const start = h.position.start.offset;
      return { ctx: null, range: { start, end: trim(start, next ? next.position.start.offset : c.length), heading: h } };
    }
    m.__bdRoot = null;
    return null;
  }

  // 列表项连同全部子块的结尾（列表项的 position 不含子块，要把后面挂在它下面的项都算上）
  subtreeEnd(items, root) {
    const rootLine = root.position.start.line;
    const byLine = new Map();
    for (const it of items) if (!byLine.has(it.position.start.line)) byLine.set(it.position.start.line, it);
    const under = (it) => {
      const seen = new Set();
      for (let p = it.parent; p >= 0 && !seen.has(p); p = byLine.has(p) ? byLine.get(p).parent : -1) {
        if (p === rootLine) return true;
        seen.add(p);
      }
      return false;
    };
    let end = root.position.end.offset;
    for (let i = items.indexOf(root) + 1; i < items.length; i++) {
      const it = items[i];
      // 「- 1. xxx」同一行解析出的内层项（parent 是负数）：这一行已经算进来了，跟着算
      const sameLine = byLine.get(it.position.start.line) !== it;
      if (!sameLine && it.position.start.line !== rootLine && !under(it)) break;
      end = Math.max(end, it.position.end.offset);
    }
    return end;
  }

  // 展开 / 收起到某一级后，这一条和同一篇里排在后面的都重画：被展开范围包进去的后续命中会并进来，收起后再分出去
  expandTo(m, line) {
    m.__bdRoot = line;
    if (line != null) m.__bdExpanded = true;   // 展开上下文就是为了看全，不再按行数折叠
    const sibs = (m.parentDom && m.parentDom.vChildren && m.parentDom.vChildren._children) || [];
    const at = sibs.indexOf(m);
    m.render();
    if (at >= 0) for (const s of sibs.slice(at + 1)) s.render();
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
    let ctx = this.listContext(m);
    let range = this.displayRange(m, ctx);
    m.__bdBlockKey = this.blockKey(m, ctx);
    m.__bdHitLine = ctx ? ctx.item.position.start.line : null;   // 展开到上一级后，原来的命中块要一路展开着
    const ex = this.expandedView(m, ctx);
    if (ex) ({ ctx, range } = ex);
    m.__bdRange = range;
    const prev = this.prevShown(m);
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
    const expanded = m.__bdRoot != null;
    const cont = !!(prev && crumbs.length && prev.__bdCrumbKey === key && !expanded);
    m.__bdCrumbKey = key;
    m.el.toggleClass("bd-cont", cont);
    const crumbEl = (crumbs.length && !cont) || expanded ? this.renderCrumbs(m, crumbs) : null;
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
    if (FREEZE_AFTER_LINK && comp && dom === comp.unlinkedDom) this.takeOverLinkButton(m, comp);
  }

  // ---------- 「转为链接」之后不刷新 ----------

  eachComponent(fn) {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const v = leaf.view;
      for (const c of [v && v.backlink, v && v.backlinks]) if (c) fn(c);
    });
  }

  // 冻结：把 Obsidian 反链面板的两个更新队列换成空的，文件改动、元数据变化都不再触发重算和重排
  freeze(c) {
    if (c.__bdFrozen) return;
    const dummy = { add() {}, remove() {}, runnable: { isCancelled: () => true, cancel() {} } };
    c.__bdQueues = { b: c.backlinkQueue, u: c.unlinkedQueue, dummy };
    c.backlinkQueue = dummy;
    c.unlinkedQueue = dummy;
    c.__bdEdits = new Map();     // 文件路径 → [{ at, delta }]：冻结期间在这篇里已经改过的地方（按原来的位置记）
    c.__bdLinked = new Set();    // 「文件路径:位置」：已经转成链接的提及
    c.__bdFrozen = true;
  }

  // 解冻；recompute 为真时立刻重新读取（重新打开同一页时用）
  thaw(c, recompute) {
    if (!c.__bdFrozen) return;
    const q = c.__bdQueues;
    c.__bdFrozen = false;
    c.__bdQueues = c.__bdEdits = c.__bdLinked = null;
    if (c.backlinkQueue === q.dummy) c.backlinkQueue = q.b;
    if (c.unlinkedQueue === q.dummy) c.unlinkedQueue = q.u;
    if (!recompute) return;
    const f = c.file || c.__bdTarget;
    try { c.recomputeBacklink(f); c.recomputeUnlinked(f); } catch (e) { console.error("[backlink-defaults] thaw", e); }
  }

  thawFor(path) {
    this.eachComponent((c) => { if (c.__bdFrozen && c.__bdTargetPath === path) this.thaw(c, true); });
  }

  // 把 Obsidian 的「转为链接」按钮换成自己的：改完原文不删这一行、不重算面板
  takeOverLinkButton(m, comp) {
    const btn = m.el.querySelector(".search-result-file-match-replace-button");
    const file = m.parentDom && m.parentDom.file;
    const range = m.matches && m.matches[0];
    if (!btn || !file || !range || typeof m.content !== "string") return;
    const nb = btn.cloneNode(true);   // 克隆不带原来的点击事件
    btn.replaceWith(nb);
    if (comp.__bdLinked && comp.__bdLinked.has(file.path + ":" + range[0])) this.markLinked(nb);
    nb.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!nb.hasClass("bd-linked")) this.linkMention(comp, m, file, range, nb);
    });
  }

  async linkMention(comp, m, file, range, btn) {
    const target = comp.__bdTarget;
    if (!target) return;
    this.freeze(comp);
    const text = m.content.slice(range[0], range[1]);
    const edits = comp.__bdEdits.get(file.path) || [];
    const at = range[0] + edits.reduce((s, x) => s + (x.at < range[0] ? x.delta : 0), 0);
    const link = this.app.fileManager.generateMarkdownLink(target, file.path, "", text);
    let ok = false;
    await this.app.vault.process(file, (data) => {
      if (data.slice(at, at + text.length) !== text) return data;   // 原文在这期间被改过：不动
      ok = true;
      return data.slice(0, at) + link + data.slice(at + text.length);
    });
    if (!ok) { new Notice("这一处原文已经变了，没有改动。重新打开这一页、刷新反链后再试"); return; }
    edits.push({ at: range[0], delta: link.length - text.length });
    comp.__bdEdits.set(file.path, edits);
    comp.__bdLinked.add(file.path + ":" + range[0]);
    this.markLinked(btn);
  }

  markLinked(btn) {
    btn.addClass("bd-linked");
    btn.setText("已链接 ✓");
    btn.setAttribute("aria-label", "已转为链接；离开或重新打开这一页后刷新");
  }

  renderCrumbs(m, crumbs) {
    const el = createDiv({ cls: "bd-crumbs" });
    // 面包屑行里点空白处什么也不做（不进编辑、不跳转）
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
    // 点 = 展开到这一级（连同它下面并列的子块一起显示，可以一级级往外点）· ⌘点 = 跳到原文 · Shift 点 = 在右侧栏打开
    crumbs.forEach((c, i) => {
      if (i) el.createSpan({ cls: "bd-crumb-sep", text: "›" });
      const span = el.createSpan({ cls: "bd-crumb" });   // 不加悬停提示
      this.inlineText(span, c.text);
      span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (SHIFT_STACK && e.shiftKey) this.openStackedFile(m.parentDom.file, c.line);
        else if (e.metaKey || e.ctrlKey) this.openAt(m.parentDom.file, c.line, false);
        else this.expandTo(m, c.line);
      });
    });
    if (m.__bdRoot != null) {
      const back = el.createSpan({ cls: "bd-crumb-reset", text: "收起" });
      back.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        m.__bdExpanded = false;
        this.expandTo(m, null);
      });
    }
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

  // 跳到原文：打开后那一行停在正中、选中它的文字（上方内容不够时停在能到的最近位置）
  async openAt(file, line, newLeaf) {
    if (!file) return;
    const leaf = this.app.workspace.getLeaf(newLeaf);
    await leaf.openFile(file, { active: true, eState: { line } });
    if (line == null || line < 0) return;
    await wait(60);
    await revealLine(leaf.view, line);
  }
  // 反链条目命中的那一行（链接所在行）；拿不到就用这一块的首行
  hitLine(m) {
    const l = this.offsetToLine(m, m.start);
    return l >= 0 ? l : this.offsetToLine(m, (m.__bdRange || {}).start);
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
    if (m.__bdRoot != null && m.__bdRange) {
      // 展开到上一级时，编辑的就是显示出来的整块
      start = m.__bdRange.start; end = m.__bdRange.end;
    } else if (ctx) {
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
      this.openAt(file, this.hitLine(m), Keymap.isModEvent(e));
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
        if (t.closest && t.closest(".bd-jump-btn, .bd-expand, .bd-ctl, .search-result-hover-button, .search-result-file-match-replace-button, .bd-crumbs a, .bd-crumb, .bd-md a, .bd-md input, .bd-refcount")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.openStackedFile(m.parentDom.file, this.offsetToLine(m, (m.__bdRange || {}).start));
        return;
      }
      if (m.el.hasClass("bd-editing")) return;
      // ⌘ 点空白处 = 跳到原文（新标签），居中并选中命中的那一行；链接、面包屑等交给它们自己的处理器
      if (e.button === 0 && (e.metaKey || e.ctrlKey)) {
        if (t.closest && t.closest(".bd-jump-btn, .bd-expand, .bd-ctl, .search-result-hover-button, .search-result-file-match-replace-button, .bd-crumbs, .bd-md a, .bd-md input, .bd-refcount")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.openAt(file, this.hitLine(m), Keymap.isModEvent(e));
        return;
      }
      if (!INLINE_EDIT) return;
      if (e.button !== 0) return;
      // 链接、标签、复选框、面包屑、「链接」按钮各有各的处理，不进编辑
      if (t.closest && t.closest(".bd-jump-btn, .bd-expand, .bd-ctl, .search-result-hover-button, .search-result-file-match-replace-button, .bd-crumbs, .bd-md a, .bd-md input")) return;
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
    if (PAIR_WRAP) watchPairWrap(ta);
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
    // 长行会折行：面板宽度变了（拖侧栏、开关限制行宽）就重新算高度；编辑框移出页面后自动停掉
    if (typeof ResizeObserver === "function") {
      let lastW = 0;
      const ro = new ResizeObserver(() => {
        if (!ta.isConnected) { ro.disconnect(); return; }
        if (ta.clientWidth !== lastW) { lastW = ta.clientWidth; grow(); }
      });
      ro.observe(ta);
    }
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
    let lines, folded = 0, foldable = false, line0 = -1, tree = null;
    m.__bdLineMap = null;
    if (ctx && (m.__bdRoot != null || m.start === ctx.lineStart(ctx.item))) {
      const indent = content.substring(ctx.lineStart(ctx.item), ctx.item.position.start.offset);
      tree = FOLD_CHILDREN ? this.foldedList(m, ctx, range) : null;
      lines = this.reindent(tree ? tree.text : content.substring(range.start, range.end), indent, 0).split("\n");
      line0 = ctx.item.position.start.line;
      if (tree) m.__bdLineMap = tree.map;
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
    // 子块太长先折叠（列表块已经按子块结构折叠了，不再按行数）
    if (!tree && FOLD_LINES > 0 && lines.length > FOLD_LINES + 1) {
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
      if (tree) this.bindFoldMarks(m, box, tree.marks);
      this.afterRender(m, box, sourcePath);
      const scroll = m.parentDom && m.parentDom.parentDom && m.parentDom.parentDom.infinityScroll;
      if (scroll) scroll.invalidate(m);
    }).catch((e) => console.error("[backlink-defaults] markdown", e));
  }

  // 命中列表项按子块结构挑出要显示的行：自己 + 一级子块（最多 CHILD_LIMIT 个，其余收成「…」）；
  // 有子块的一级子块默认只显示自己那几行，行尾挂「…」，点开后它的子块照同样的规则显示。
  // 返回 { text, map, marks }：text 是挑出来的原文行，map[i] = 第 i 行对应的原文行号（-1 = 补出来的「…」行），marks 是要绑定点击的标记，顺序和渲染结果里一致
  foldedList(m, ctx, range) {
    const c = m.content, all = c.split("\n");
    const root = ctx.item, rootLine = root.position.start.line;
    const lastLine = this.offsetToLine(m, range.end);
    const byLine = new Map();
    for (const it of ctx.items) if (!byLine.has(it.position.start.line)) byLine.set(it.position.start.line, it);
    const nodes = [...byLine.values()].filter((it) => it.position.start.line >= rootLine && it.position.start.line <= lastLine)
      .sort((a, b) => a.position.start.line - b.position.start.line);
    const kidsOf = new Map();
    for (const it of nodes) {
      if (it === byLine.get(rootLine) || it.parent < 0) continue;
      if (!kidsOf.has(it.parent)) kidsOf.set(it.parent, []);
      kidsOf.get(it.parent).push(it);
    }
    const lineOf = (it) => it.position.start.line;

    // 一定要露出来的行：子块里链接当前页的地方（母块显示了，它们就不再单独列一条），展开到上一级时原来的命中块
    const need = new Set(), open = new Set();
    const ownerOf = (l) => { let o = null; for (const it of nodes) { if (lineOf(it) > l) break; o = it; } return o; };
    const reveal = (l, self) => {
      const o = ownerOf(l);
      if (!o || lineOf(o) === rootLine) return;
      if (self) open.add(lineOf(o));
      for (let it = o, n = 0; it && lineOf(it) !== rootLine && n < 100; it = byLine.get(it.parent), n++) {
        need.add(lineOf(it));
        if (it !== o) open.add(lineOf(it));
      }
    };
    const comp = m.parentDom && m.parentDom.parentDom && m.parentDom.parentDom.__bdComponent;
    const target = comp && comp.__bdTarget;
    const src = m.parentDom && m.parentDom.file ? m.parentDom.file.path : "";
    if (target && m.cache) {
      for (const l of (m.cache.links || []).concat(m.cache.embeds || [])) {
        const p = l.position;
        if (!p || p.start.offset < range.start || p.start.offset >= range.end) continue;
        const lp = (l.link || "").split("#")[0].split("|")[0].trim();
        const dest = lp && this.app.metadataCache.getFirstLinkpathDest(lp, src);
        if (dest && dest.path === target.path) reveal(p.start.line, false);
      }
    }
    if (m.__bdRoot != null && m.__bdHitLine != null) reveal(m.__bdHitLine, true);

    const fold = (m.__bdFold = m.__bdFold || new Map());   // 手动点过的：行号 → 展开与否
    const more = (m.__bdMore = m.__bdMore || new Set());   // 点过「…」露出全部子块的母块
    const text = [], map = [], marks = [];
    const mark = (cls, label, extra) => `<span class="bd-ctl ${cls}"${extra || ""}>${label}</span>`;
    const walk = (it, depth) => {
      if (depth > 100) return;
      const L = lineOf(it), kids = kidsOf.get(L) || [];
      const isOpen = L === rootLine || (fold.has(L) ? fold.get(L) : open.has(L));
      // 自己的行：到第一个子块之前；没有子块就到下一个块之前；去掉末尾空行
      const next = kids.length ? lineOf(kids[0]) : (nodes.find((x) => lineOf(x) > L) ? lineOf(nodes.find((x) => lineOf(x) > L)) : lastLine + 1);
      let last = Math.min(next - 1, lastLine);
      while (last > L && !all[last].trim()) last--;
      const own = [];
      for (let l = L; l <= last; l++) own.push(l);
      if (kids.length && L !== rootLine) {
        // 「…」挂在自己最后一行末尾（行尾的 ^块ID 之前）；自己那几行里有代码块 / 公式 / 表格时挂在第一行
        const at = own.slice(1).some((l) => /^\s*(```|~~~|\$\$|\|)/.test(all[l])) ? L : last;
        marks.push({ kind: "fold", line: L, open: isOpen });
        const tag = isOpen ? mark("bd-fold-mark is-open", "收起", ' aria-label="收起子块"') : mark("bd-fold-mark", "…", ` aria-label="展开 ${kids.length} 个子块"`);
        for (const l of own) {
          text.push(l === at ? all[l].replace(/(\s+\^[\w-]+)?\s*$/, (t) => " " + tag + t) : all[l]);
          map.push(l);
        }
      } else for (const l of own) { text.push(all[l]); map.push(l); }
      if (!kids.length || !isOpen) return;
      let n = kids.length;
      if (!more.has(L) && n > CHILD_LIMIT) {
        let lastNeed = -1;
        kids.forEach((k, i) => { if (need.has(lineOf(k))) lastNeed = i; });
        n = Math.max(CHILD_LIMIT, lastNeed + 1);
      }
      for (const k of kids.slice(0, n)) walk(k, depth + 1);
      if (n < kids.length) {
        const pre = all[lineOf(kids[n])].match(/^(\s*)([-*+]|\d+[.)])\s/);
        marks.push({ kind: "more", line: L });
        text.push((pre ? pre[1] + pre[2] : "-") + " " + mark("bd-more-mark", `… 还有 ${kids.length - n} 项`));
        map.push(-1);
      }
    };
    walk(byLine.get(rootLine) || root, 0);
    return { text: text.join("\n"), map, marks };
  }

  // 给渲染结果里的「…」接上点击：折叠的子块展开 / 收起，「还有 N 项」露出其余子块
  bindFoldMarks(m, box, marks) {
    const els = box.querySelectorAll(".bd-fold-mark, .bd-more-mark");
    els.forEach((el, i) => {
      const mk = marks[i];
      if (!mk) return;
      const li = el.closest("li");
      if (mk.kind === "more") {
        if (li) li.addClass("bd-more-li");
      } else if (li) li.toggleClass("bd-folded", !mk.open);
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (mk.kind === "more") m.__bdMore.add(mk.line);
        else m.__bdFold.set(mk.line, !mk.open);
        m.render();
      });
    });
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
      // 按子块结构折叠时渲染的行和原文不连续，按对照表找原文行号
      const src = m.__bdLineMap ? (m.__bdLineMap[rel] ?? -1) : m.__bdLine0 < 0 ? -1 : m.__bdLine0 + rel;
      if (src < 0 || isNaN(rel)) { cb.disabled = true; return; }
      cb.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleTask(m.parentDom.file, src);
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

  // ---------- 导出 PDF 时带上「链接到当前文件」 ----------

  // 自带的导出对话框是内部类，拿不到；在 MarkdownView.printToPdf 新建并打开它的那一刻接住这个实例
  patchPdfExport() {
    const proto = MarkdownView && MarkdownView.prototype;
    if (!proto || typeof proto.printToPdf !== "function" || !Modal) return;
    const plugin = this, orig = proto.printToPdf;
    proto.printToPdf = function (...args) {
      const origOpen = Modal.prototype.open;
      Modal.prototype.open = function (...a) {
        Modal.prototype.open = origOpen;
        try { plugin.enhancePdfModal(this); } catch (e) { console.error("[backlink-defaults] pdf modal", e); }
        return origOpen.apply(this, a);
      };
      try { return orig.apply(this, args); } finally { Modal.prototype.open = origOpen; }
    };
    this.register(() => { proto.printToPdf = orig; });
  }

  enhancePdfModal(modal) {
    if (typeof modal.print !== "function" || !modal.file) return;   // 不是导出 PDF 的对话框
    modal.__bdBacklinks = !!this.settings.pdfBacklinks;
    const count = this.collectBacklinkFiles(modal.file).length;
    new Setting(modal.contentEl)
      .setName("包含反链（链接到当前文件）")
      .setDesc(count ? `正文后面接上 ${count} 篇笔记里引用这一页的内容` : "没有笔记链接到这一页")
      .addToggle((t) => t.setValue(modal.__bdBacklinks).setDisabled(!count).onChange((v) => {
        modal.__bdBacklinks = v;
        this.settings.pdfBacklinks = v;
        this.saveData(this.settings);
      }));
    if (PDF_STYLE) this.addPdfStyleSettings(modal);
    const origPrint = modal.print;
    const plugin = this;
    modal.print = async function (el, comp, includeName) {
      if (PDF_STYLE) plugin.applyPdfStyle(el);
      const body = await origPrint.call(this, el, comp, includeName);
      if (this.__bdBacklinks) {
        try { await plugin.appendPrintBacklinks(body || el, this.file, comp); }
        catch (e) { console.error("[backlink-defaults] pdf backlinks", e); new Notice("反链没能加进 PDF，只导出了正文"); }
      }
      return body;
    };
  }

  addPdfStyleSettings(modal) {
    const st = this.settings, save = () => this.saveData(st);
    const el = modal.contentEl;
    new Setting(el).setName("排版").setHeading();
    const rows = [];
    new Setting(el)
      .setName("精致排版")
      .setDesc("关掉 = 和阅读视图一样，原样导出")
      .addToggle((t) => t.setValue(st.pdfPretty).onChange((v) => { st.pdfPretty = v; save(); rows.forEach((r) => r.settingEl.toggle(v)); }));
    const fonts = this.availablePdfFonts();
    const fontDropdown = (key) => (d) => {
      d.addOption("", "跟随 Obsidian");
      for (const [name, stack] of fonts) d.addOption(stack, name);
      if (st[key] && !fonts.some(([, s]) => s === st[key])) st[key] = "";   // 之前选的字体已经不在了
      d.setValue(st[key]).onChange((v) => { st[key] = v; save(); });
    };
    rows.push(new Setting(el).setName("正文字体").addDropdown(fontDropdown("pdfFont")));
    rows.push(new Setting(el).setName("标题字体").setDesc("不选 = 和正文一样").addDropdown(fontDropdown("pdfHeadFont")));
    rows.push(new Setting(el).setName("字号").addDropdown((d) => {
      for (const k in PDF_SIZES) d.addOption(k, PDF_SIZES[k][0] + "（" + PDF_SIZES[k][1] + "）");
      d.setValue(st.pdfSize).onChange((v) => { st.pdfSize = v; save(); });
    }));
    rows.push(new Setting(el).setName("强调色").setDesc("标题装饰线、链接、列表符号、引用块、表头").addColorPicker((c) =>
      c.setValue(st.pdfAccent).onChange((v) => { st.pdfAccent = v; save(); })));
    rows.forEach((r) => r.settingEl.toggle(st.pdfPretty));
  }

  // 本机装了哪些候选字体：同一段文字，用「这个字体, 兜底字体」和只用兜底字体各量一次宽度，不一样就是装了
  availablePdfFonts() {
    if (this._pdfFonts) return this._pdfFonts;
    const ctx = document.createElement("canvas").getContext("2d");
    const sample = "永和九年岁在癸丑 The quick brown fox 0123";
    const width = (font) => { ctx.font = "40px " + font; return ctx.measureText(sample).width; };
    const has = (family) => ["monospace", "serif", "sans-serif"].some((fb) => width(`${family}, ${fb}`) !== width(fb));
    this._pdfFonts = PDF_FONTS.filter(([, stack]) => has(stack.split(",")[0].trim()));
    return this._pdfFonts;
  }

  // 导出窗口里的 .print 容器：挂上样式和变量（只影响这次导出的 PDF）
  applyPdfStyle(el) {
    const st = this.settings;
    if (!st.pdfPretty) return;
    const doc = el.ownerDocument;
    if (!doc.getElementById("bd-pdf-style")) {
      const style = doc.createElement("style");
      style.id = "bd-pdf-style";
      style.textContent = PDF_CSS;
      doc.head.appendChild(style);
    }
    el.classList.add("bd-pdf");
    el.style.setProperty("--bd-accent", st.pdfAccent || "#3a6ea5");
    el.style.setProperty("--bd-size", (PDF_SIZES[st.pdfSize] || PDF_SIZES.medium)[1]);
    if (st.pdfFont) el.style.setProperty("--bd-font", st.pdfFont);
    if (st.pdfHeadFont) el.style.setProperty("--bd-head-font", st.pdfHeadFont);
  }

  // 链接到 target 的笔记，按反链面板的顺序
  collectBacklinkFiles(target) {
    const rl = this.app.metadataCache.resolvedLinks || {};
    const files = [];
    for (const src in rl) {
      if (src === target.path || !rl[src][target.path]) continue;
      if (WIKI_FOLDER && src.startsWith(WIKI_FOLDER)) continue;
      const f = this.app.vault.getAbstractFileByPath(src);
      if (f && f.extension === "md") files.push(f);
    }
    const rel = new Map();
    const relOf = (f) => { if (!rel.has(f.path)) rel.set(f.path, this.relation(f, target.path)); return rel.get(f.path); };
    return files.sort((a, b) => {
      const da = this.journalDate(a), db = this.journalDate(b);
      if (!da !== !db) return da ? 1 : -1;
      if (da) return db.key - da.key;
      return relOf(b).score - relOf(a).score || a.basename.localeCompare(b.basename, "zh");
    });
  }

  // 一篇笔记里指向 target 的每一处引用所在的块：{ start, end, indent, crumbs }，按位置排好、去掉被别的块包住的
  backlinkBlocks(content, cache, src, target) {
    const mc = this.app.metadataCache;
    const hits = [...(cache.links || []), ...(cache.embeds || [])]
      .filter((l) => { const d = mc.getFirstLinkpathDest(getLinkpath(l.link), src.path); return d && d.path === target.path; })
      .map((l) => l.position.start.offset)
      .sort((a, b) => a - b);
    const items = cache.listItems || [];
    const lineStart = (it) => it.position.start.offset - it.position.start.col;
    const byLine = new Map();
    for (const it of items) if (!byLine.has(it.position.start.line)) byLine.set(it.position.start.line, it);
    const firstLine = (it) => content.substring(it.position.start.offset, it.position.end.offset).split("\n")[0]
      .replace(/^\s*([-*+]|\d+[.)])\s+(\[.\]\s+)?/, "");
    const blocks = [];
    for (const off of hits) {
      let item = null;
      for (const it of items) { if (lineStart(it) > off) break; if (off <= it.position.end.offset) item = it; }
      let b;
      if (item) {
        item = byLine.get(item.position.start.line) || item;
        // 子块：紧跟在后面、祖先里有它的列表项
        const inTree = new Set([item.position.start.line]);
        let end = item.position.end.offset;
        for (const it of items) {
          if (it.position.start.line <= item.position.start.line) continue;
          if (!inTree.has(it.parent)) break;
          inTree.add(it.position.start.line);
          end = Math.max(end, it.position.end.offset);
        }
        const crumbs = [], seen = new Set([item.position.start.line]);
        for (let p = item.parent; p >= 0 && byLine.has(p) && !seen.has(p); p = byLine.get(p).parent) { seen.add(p); crumbs.unshift(firstLine(byLine.get(p))); }
        const start = lineStart(item);
        b = { start, end, indent: content.substring(start, item.position.start.offset), crumbs };
      } else {
        const secs = cache.sections || [];
        const sec = secs.find((x) => x.position.start.offset <= off && off <= x.position.end.offset);
        if (!sec) continue;
        let end = sec.position.end.offset;
        if (sec.type === "heading") {
          // 标题行：连同整节
          const h = (cache.headings || []).find((x) => x.position.start.offset === sec.position.start.offset);
          const next = h && (cache.headings || []).find((x) => x.position.start.offset > h.position.start.offset && x.level <= h.level);
          end = next ? next.position.start.offset : content.length;
        }
        b = { start: sec.position.start.offset, end, indent: "", crumbs: [] };
      }
      if (sec0(cache, b.start)) b.crumbs.unshift(...sec0(cache, b.start));
      const last = blocks[blocks.length - 1];
      if (last && b.start >= last.start && b.end <= last.end) continue;   // 已经包在上一块里
      blocks.push(b);
    }
    return blocks;
    // 块所在的标题层级（面包屑最前面）
    function sec0(cache, at) {
      if (!CRUMB_HEADINGS) return null;
      const stack = [];
      for (const h of cache.headings || []) {
        if (h.position.start.offset >= at) break;
        while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
        stack.push(h);
      }
      return stack.length ? stack.map((h) => h.heading) : null;
    }
  }

  async appendPrintBacklinks(el, target, comp) {
    const files = this.collectBacklinkFiles(target);
    if (!files.length) return;
    const plain = (t) => t.replace(/\s\^[\w-]+\s*$/, "").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|==|~~)/g, "").trim();
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const parts = [];
    for (const f of files) {
      const cache = this.app.metadataCache.getFileCache(f);
      if (!cache) continue;
      const content = await this.app.vault.cachedRead(f);
      const blocks = this.backlinkBlocks(content, cache, f, target);
      const fm = this.relation(f, target.path).why.filter((w) => w.startsWith("属性"));
      if (!blocks.length && !fm.length) continue;
      parts.push(`### [[${f.path.replace(/\.md$/, "")}|${f.basename}]]`);
      if (fm.length) parts.push(`<div class="bd-print-crumbs">${esc(fm.join(" · "))} 链接到这里</div>`);
      for (const b of blocks) {
        if (b.crumbs.length) parts.push(`<div class="bd-print-crumbs">${esc(b.crumbs.map(plain).join(" › "))}</div>`);
        const text = this.reindent(content.substring(b.start, b.end), b.indent, 0)
          .split("\n").map((l) => l.replace(/\s\^[\w-]+\s*$/, "")).join("\n").replace(/\s+$/, "");
        parts.push(text);
      }
    }
    if (!parts.length) return;
    const n = files.length;
    const md = `## 链接到当前文件（${n}）\n\n` + parts.join("\n\n");
    const box = el.createDiv({ cls: "bd-print-backlinks markdown-preview-view markdown-rendered" });
    box.createEl("hr");
    await MarkdownRenderer.render(this.app, md, box, target.path, comp);
    await new Promise((r) => setTimeout(r, 300));   // 等嵌入、图片之类的后处理
    box.querySelectorAll("a.internal-link").forEach((a) => a.removeAttribute("href"));
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
  async gotoBacklinks() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    const find = () => {
      const r = view && view.containerEl && view.containerEl.querySelector(".embedded-backlinks");
      return r && r.offsetParent !== null ? r : null;
    };
    let root = find();
    // 阅读视图是边滚边渲染的：长笔记要滚到底，正文底部那份反链才会画出来（以前找不到就退去开侧栏面板了）
    if (!root && view && view.getMode && view.getMode() === "preview" && !view.containerEl.hasClass("no-backlinks")) {
      const opt = this.app.internalPlugins.getPluginById("backlink");
      const sc = view.previewMode.renderer && view.previewMode.renderer.previewEl;
      if (sc && opt && opt.enabled && opt.instance.options.backlinkInDocument) {
        for (let i = 0; i < 10 && !root; i++) { sc.scrollTop = sc.scrollHeight; await wait(100); root = find(); }
        if (root) await wait(150);   // 等反链条目填进来，高度稳定一点再算居中
      }
    }
    if (root) {
      // 放到视口正中：面板比一屏矮就整个居中，比一屏高就把面板顶部（标题和筛选框）放到正中
      const sc = root.closest(".cm-scroller, .markdown-preview-view");
      if (sc) {
        const r = root.getBoundingClientRect(), s = sc.getBoundingClientRect();
        const mid = r.height < s.height ? r.top + r.height / 2 : r.top + 24;
        sc.scrollTo({ top: sc.scrollTop + mid - (s.top + s.height / 2), behavior: "smooth" });
      } else root.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => { const f = root.querySelector(".bd-filter-input"); if (f) f.focus({ preventScroll: true }); }, 150);   // 聚焦不能带滚动，会打断上面的居中
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
