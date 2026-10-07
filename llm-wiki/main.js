const { Plugin, ItemView, PluginSettingTab, Setting, TFile, Notice, MarkdownRenderer, debounce } = require("obsidian");
const { spawn } = require("child_process");
const os = require("os");

const VIEW_TYPE = "llm-wiki-view";

// 主题和关键词，取自 Wiki/log.md 里每次 ingest 用过的关键词；新主题在设置里加
const DEFAULT_TOPICS = [
  { name: "国债", keywords: ["国债", "美债", "国债收益率", "国债回购", "长债", "Treasury", "T-bill", "期限溢价"] },
  { name: "黄金与美元流动性", since: "2026-01-01", keywords: ["黄金", "金价", "白银", "美元指数", "DXY", "美元霸权", "石油美元", "美元流动性", "SOFR", "TGA", "回购市场", "缩表", "扩表", "铸币税", "布雷顿", "稳定币"] },
  { name: "激素", keywords: ["激素", "荷尔蒙", "内分泌", "hormone", "多巴胺", "内啡肽", "皮质醇", "血清素", "催产素", "睾酮", "雌激素", "褪黑素", "肾上腺素", "胰岛素", "瘦素"] },
];
const DEFAULTS = {
  folder: "Wiki",
  claudePath: "~/.local/bin/claude",
  timeoutMin: 30,
  topics: DEFAULT_TOPICS,
  baselines: {},   // 主题 -> 上次摄入的时间戳；之后改过的相关笔记算「新材料」
  lastResult: null,
  dismissed: [],   // 「建议新增」里点了 × 的
};
// 「开新主题」建议里不算的：标记类双链、看板 / 人物 / 书之类
const SUGGEST_STOP = new Set(["等待尝试", "toread", "towatch", "tolisten", "toinstall", "文章选题", "视频选题", "小说选题", "英文记录", "中文记录", "中文表达", "出色的表达", "英文表达", "打扮", "穿搭", "鞋", "化妆", "yyt", "宝a", "important", "重要", "菜谱", "card", "待办", "inbox", "长期计划", "2026", "等待考虑", "生活常识", "问题汇总", "宝的培养计划"].map((s) => s.toLowerCase()));
const SUGGEST_SKIP_TYPES = new Set(["人物", "书", "媒体", "组织", "工具", "作品", "看板", "选题", "清单", "课程", "入门课", "单品", "衣物", "穿搭", "菜谱", "已发表", "wiki"]);
// Wiki/CLAUDE.md 第 7 条：wiki 页里不许出现的东西
const FORBIDDEN_PROPS = ["def", "medium", "author", "category", "flashcards"];
const FORBIDDEN_LINKS = ["小说选题", "视频选题", "toread"];
const SKIP_PREFIX = ["Templates/"];

const PREAMBLE = "你在维护这个 Obsidian 库里的 LLM Wiki。开始前先完整读 Wiki/CLAUDE.md 并严格遵守：只写 Wiki/ 文件夹，出处写成块链接，笔记之间有冲突就并列、不替用户下结论，不是来自笔记的内容要标明；页面里标题下面的内容一律写成无序 / 有序列表块（不写段落、不用表格，缩进用 Tab），详见 CLAUDE.md「展现形式」。";

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class WikiView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.expanded = new Set(); // 展开了「新材料」列表的主题（别叫 open：那是 Obsidian View 自带的方法，覆盖了面板就挂不上）
    this.lintIssues = null;
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Wiki"; }
  getIcon() { return "library"; }
  async onOpen() { this.containerEl.children[1].addClass("wiki-root"); await this.render(); }

  async render() {
    const p = this.plugin;
    const root = this.containerEl.children[1];
    const scroll = root.scrollTop;
    root.empty();

    const head = root.createDiv({ cls: "wiki-head" });
    head.createSpan({ cls: "wiki-title", text: "Wiki" });
    for (const [text, name] of [["目录", "index"], ["日志", "log"], ["规则", "CLAUDE"]]) {
      const b = head.createEl("button", { text });
      b.onclick = () => p.openPath(`${p.settings.folder}/${name}.md`);
    }

    // 正在跑的任务
    if (p.job) {
      const st = root.createDiv({ cls: "wiki-status is-running" });
      this.statusEl = st.createSpan({ text: `⏳ ${p.job.label} · ${fmtElapsed(Date.now() - p.job.start)}` });
      const stop = st.createEl("button", { text: "停止" });
      stop.onclick = () => p.stopJob();
    }

    // ---------- 总览 ----------
    const pages = p.pages();
    const topics = [...p.settings.topics];
    for (const t of Object.keys(pages)) if (!topics.some((x) => x.name === t)) topics.push({ name: t, keywords: [] });
    const all = Object.values(pages).flat();
    const fmOf = (f) => this.app.metadataCache.getFileCache(f)?.frontmatter || {};
    const pending = {};
    for (const t of topics) pending[t.name] = t.keywords.length ? await p.pendingFor(t) : [];
    const totalPending = Object.values(pending).reduce((s, a) => s + a.length, 0);
    const lastUpd = all.map((f) => String(fmOf(f).updated || "")).filter(Boolean).sort().at(-1);
    const stats = root.createDiv({ cls: "wiki-stats" });
    const stat = (n, label, cls = "") => { const d = stats.createDiv({ cls: "wiki-stat " + cls }); d.createDiv({ cls: "wiki-stat-n", text: String(n) }); d.createDiv({ cls: "wiki-stat-l", text: label }); return d; };
    stat(all.length, "条目");
    stat(topics.filter((t) => (pages[t.name] || []).length).length, "主题");
    stat(all.reduce((s, f) => s + (Number(fmOf(f).sources) || 0), 0), "来源笔记");
    const pd = stat(totalPending, "待摄入", totalPending ? "is-accent" : "");
    pd.setAttr("aria-label", "上次摄入之后改过、又提到主题关键词的笔记");
    if (lastUpd) root.createDiv({ cls: "wiki-muted wiki-sub", text: `最近更新 ${lastUpd} · ${window.moment(lastUpd).fromNow()}` });

    // ---------- 提问 ----------
    const ask = root.createDiv({ cls: "wiki-ask" });
    const input = ask.createEl("textarea", { attr: { rows: 2, placeholder: "问 wiki 一个问题（⌘↩ 提交）…" } });
    input.value = this.draft || "";   // 面板会随文件变化重画，保住没提交的问题
    input.addEventListener("input", () => { this.draft = input.value; });
    const go = ask.createEl("button", { text: "问", cls: "mod-cta" });
    const submit = () => { const q = input.value.trim(); if (q && !p.job) { this.draft = ""; p.ask(q); } };
    go.onclick = submit;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } });
    go.disabled = !!p.job;

    // ---------- 条目 ----------
    const sec = (title, sub) => { const h = root.createDiv({ cls: "wiki-sec" }); h.createSpan({ text: title }); if (sub) h.createSpan({ cls: "wiki-muted", text: sub }); return h; };
    sec(`📚 条目 · ${all.length}`, "悬停看摘要");
    for (const t of topics) {
      const list = (pages[t.name] || []).slice().sort((a, b) => String(fmOf(b).updated || "").localeCompare(String(fmOf(a).updated || "")) || a.basename.localeCompare(b.basename, "zh"));
      const box = root.createDiv({ cls: "wiki-topic" });
      const th = box.createDiv({ cls: "wiki-topic-head" });
      th.createSpan({ cls: "wiki-topic-name", text: `${t.name}` });
      th.createSpan({ cls: "wiki-muted", text: `${list.length} 条` });
      const pend = pending[t.name];
      if (pend.length) {
        const badge = th.createEl("button", { cls: "wiki-pending", text: `${pend.length} 新材料` });
        badge.onclick = () => { this.expanded.has(t.name) ? this.expanded.delete(t.name) : this.expanded.add(t.name); this.render(); };
        const ing = th.createEl("button", { text: "摄入" });
        ing.disabled = !!p.job;
        ing.onclick = () => p.ingest(t, pend);
      } else if (t.keywords.length) th.createSpan({ cls: "wiki-ok", text: "✓ 最新" });
      if (this.expanded.has(t.name) && pend.length) {
        const ul = box.createDiv({ cls: "wiki-pending-list" });
        for (const f of pend) { const row = ul.createDiv({ cls: "wiki-row is-pending", text: f.basename }); row.onclick = () => p.openPath(f.path); }
      }
      for (const pg of list) {
        const fm = fmOf(pg);
        const row = box.createDiv({ cls: "wiki-row wiki-entry", attr: { "aria-label": fm.summary || "" } });
        const line = row.createDiv({ cls: "wiki-entry-line" });
        line.createSpan({ cls: "wiki-page", text: pg.basename.replace(/（wiki）$/, "") });
        const age = fm.updated ? window.moment().diff(window.moment(String(fm.updated)), "day") : null;
        line.createSpan({ cls: "wiki-meta" + (age != null && age > 30 ? " is-stale" : ""), text: `${fm.sources ?? "?"} 源 · ${fm.updated ? String(fm.updated).slice(5) : "—"}` });
        if (fm.summary) row.createDiv({ cls: "wiki-summary", text: String(fm.summary) });
        row.onclick = () => p.openPath(pg.path);
      }
    }

    // ---------- 建议新增 ----------
    const sug = await p.suggestions(pages, topics);
    sec("💡 建议新增", "× = 不再提示");
    const sugRow = (host, name, meta, btnText, onGo, why) => {
      const row = host.createDiv({ cls: "wiki-row wiki-sug", attr: { "aria-label": why || "" } });
      row.createSpan({ cls: "wiki-page", text: name });
      row.createSpan({ cls: "wiki-meta", text: meta });
      const b = row.createEl("button", { text: btnText });
      b.disabled = !!p.job;
      b.onclick = (e) => { e.stopPropagation(); onGo(); };
      const x = row.createEl("button", { cls: "wiki-x", text: "×", attr: { "aria-label": "不再提示" } });
      x.onclick = async (e) => { e.stopPropagation(); p.settings.dismissed = [...new Set([...(p.settings.dismissed || []), name])]; await p.saveSettings(); this.render(); };
      row.onclick = () => { const f = this.app.metadataCache.getFirstLinkpathDest(name, ""); if (f) p.openPath(f.path); };
    };
    const a = root.createDiv({ cls: "wiki-topic" });
    a.createDiv({ cls: "wiki-topic-head" }).createSpan({ cls: "wiki-topic-name", text: "补条目 · 好几个 wiki 页都提到、自己还没有条目" });
    if (!sug.entries.length) a.createDiv({ cls: "wiki-muted wiki-sub", text: "暂时没有" });
    for (const s of sug.entries) sugRow(a, s.name, `${s.citedBy.length} 页引用${s.type ? " · " + s.type : ""}`, "写",
      () => p.writeEntry(s.name, s.topic, s.citedBy), `引用它的：${s.citedBy.join("、")}\n会归到主题「${s.topic}」`);
    const b = root.createDiv({ cls: "wiki-topic" });
    b.createDiv({ cls: "wiki-topic-head" }).createSpan({ cls: "wiki-topic-name", text: "开新主题 · 最近 60 天日记里常出现、wiki 还没覆盖" });
    if (!sug.topics.length) b.createDiv({ cls: "wiki-muted wiki-sub", text: "暂时没有" });
    for (const s of sug.topics) sugRow(b, s.name, `近 60 天 ${s.count} 次`, "开", () => {
      if (window.confirm(`新开主题「${s.name}」？\nClaude 会找相关笔记定关键词、写进 CLAUDE.md 主题表、建入口页并做首次摄入。`)) p.newTopic(s.name);
    }, `最近提到它的日记：${s.days.slice(0, 5).join("、")}`);

    // ---------- 最近动态 ----------
    sec("🕒 最近动态");
    if (p.settings.lastResult && !p.job) {
      const r = p.settings.lastResult;
      const box = root.createDiv({ cls: `wiki-result ${r.ok ? "" : "is-error"}` });
      const bar = box.createDiv({ cls: "wiki-result-bar" });
      bar.createSpan({ text: `${r.ok ? "✅" : "⚠️"} ${r.label} · ${window.moment(r.at).format("M/D HH:mm")}` });
      const open = !!this.resultOpen;
      const tg = bar.createEl("button", { text: open ? "收起" : "展开" });
      tg.onclick = () => { this.resultOpen = !open; this.render(); };
      const close = bar.createEl("button", { text: "×", attr: { "aria-label": "清掉这条结果" } });
      close.onclick = async () => { p.settings.lastResult = null; await p.saveSettings(); this.render(); };
      if (open) {
        const body = box.createDiv({ cls: "wiki-result-body markdown-rendered" });
        await MarkdownRenderer.render(this.app, r.text || "(没有输出)", body, `${p.settings.folder}/index.md`, this);
      }
    }
    const log = await p.recentLog(6);
    if (!log.length) root.createDiv({ cls: "wiki-muted wiki-sub", text: "日志里还没有记录" });
    const KIND = { ingest: "摄入", ask: "问答", lint: "体检", create: "新建", fix: "修复" };
    for (const e of log) {
      const row = root.createDiv({ cls: "wiki-row wiki-log" });
      row.createSpan({ cls: "wiki-meta", text: e.date.slice(5) });
      row.createSpan({ cls: `wiki-kind is-${e.kind}`, text: KIND[e.kind] || e.kind });
      row.createSpan({ cls: "wiki-page", text: e.title, attr: { "aria-label": e.title } });
      row.onclick = () => p.openPath(`${p.settings.folder}/log.md`, e.line);
    }

    // ---------- 体检 ----------
    const lint = root.createDiv({ cls: "wiki-lint" });
    const lh = lint.createDiv({ cls: "wiki-sec" });
    lh.createSpan({ text: "🩺 体检" });
    const run = lh.createEl("button", { text: this.lintIssues ? "重新检查" : "检查" });
    run.onclick = async () => { this.lintIssues = await p.lint(); this.render(); };
    if (this.lintIssues) {
      if (!this.lintIssues.length) lint.createDiv({ cls: "wiki-muted wiki-sub", text: "没有发现问题" });
      else {
        const fix = lh.createEl("button", { text: "交给 Claude 修" });
        fix.disabled = !!p.job;
        fix.onclick = () => p.fixLint(this.lintIssues);
        for (const it of this.lintIssues) {
          const row = lint.createDiv({ cls: "wiki-row is-issue" });
          row.createSpan({ cls: "wiki-page", text: it.file.replace(/^.*\//, "").replace(/\.md$/, "") });
          row.createSpan({ cls: "wiki-issue", text: it.msg });
          row.onclick = () => p.openPath(it.file, it.line);
        }
      }
    }
    root.scrollTop = scroll;
  }
}

module.exports = class LlmWiki extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    // 第一次装上时，把现有 wiki 当作已经摄入到此刻
    let changed = false;
    for (const t of this.settings.topics) if (!this.settings.baselines[t.name]) { this.settings.baselines[t.name] = Date.now(); changed = true; }
    if (changed) await this.saveSettings();

    this.registerView(VIEW_TYPE, (leaf) => new WikiView(leaf, this));
    this.addRibbonIcon("library", "Wiki", () => this.activate());
    this.addCommand({ id: "open", name: "打开 Wiki 面板", callback: () => this.activate() });
    this.addCommand({
      id: "ingest-current",
      name: "把当前笔记送进 Wiki 摄入",
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md" || f.path.startsWith(this.settings.folder + "/")) return false;
        if (!checking) this.ingestNote(f);
        return true;
      },
    });
    this.registerEvent(this.app.workspace.on("file-menu", (menu, f) => {
      if (!(f instanceof TFile) || f.extension !== "md" || f.path.startsWith(this.settings.folder + "/")) return;
      menu.addItem((i) => i.setTitle("送进 Wiki 摄入").setIcon("library").onClick(() => this.ingestNote(f)));
    }));
    this.addSettingTab(new WikiSettings(this.app, this));

    this.refresh = debounce(() => this.views().forEach((v) => v.render()), 1500, true);
    for (const ev of ["modify", "create", "delete", "rename"]) this.registerEvent(this.app.vault.on(ev, () => this.refresh()));
    this.registerInterval(window.setInterval(() => {
      if (!this.job) return;
      for (const v of this.views()) if (v.statusEl) v.statusEl.setText(`⏳ ${this.job.label} · ${fmtElapsed(Date.now() - this.job.start)}`);
    }, 1000));
  }

  onunload() { this.stopJob(); }
  async saveSettings() { await this.saveData(this.settings); }
  views() { return this.app.workspace.getLeavesOfType(VIEW_TYPE).map((l) => l.view).filter((v) => v instanceof WikiView); }

  async activate() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = this.app.workspace.getLeftLeaf(false); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    this.app.workspace.revealLeaf(leaf);
  }

  async openPath(path, line) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (f instanceof TFile) await this.app.workspace.getLeaf(false).openFile(f, line != null ? { eState: { line } } : undefined);
  }

  pages() {
    const out = {};
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(this.settings.folder + "/") || !/（wiki）$/.test(f.basename)) continue;
      const topic = this.app.metadataCache.getFileCache(f)?.frontmatter?.topic || "未分组";
      (out[topic] ||= []).push(f);
    }
    for (const k in out) out[k].sort((a, b) => a.basename.localeCompare(b.basename, "zh"));
    return out;
  }

  // 上次摄入之后改过、又提到这个主题关键词的笔记
  async pendingFor(topic) {
    const since = this.settings.baselines[topic.name] || 0;
    const kws = topic.keywords.map((k) => k.toLowerCase());
    const out = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.stat.mtime <= since) continue;
      if (f.path.startsWith(this.settings.folder + "/") || SKIP_PREFIX.some((p) => f.path.startsWith(p))) continue;
      if (topic.since) {
        const d = window.moment(f.basename, "YYYY_MM_DD", true);
        if (d.isValid() && d.isBefore(topic.since)) continue;
      }
      const text = (await this.app.vault.cachedRead(f)).toLowerCase();
      if (kws.some((k) => text.includes(k))) out.push(f);
    }
    return out.sort((a, b) => b.stat.mtime - a.stat.mtime);
  }

  // ---------- 面板用的统计 ----------

  // 建议新增：entries = 被 ≥2 个 wiki 页引用、自己还没有 wiki 页的笔记 / 概念；topics = 近 60 天日记里常出现、没被任何主题覆盖的
  async suggestions(pages, topics) {
    const mc = this.app.metadataCache;
    const folder = this.settings.folder + "/";
    const dismissed = new Set(this.settings.dismissed || []);
    const isDate = (n) => /^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/.test(n);
    const wikiNames = new Set(Object.values(pages).flat().map((f) => f.basename.replace(/（wiki）$/, "").toLowerCase()));
    const keyOf = (link, from) => {
      const lp = link.split(/[#|]/)[0].trim();
      if (!lp || isDate(lp)) return null;
      const d = mc.getFirstLinkpathDest(lp, from);
      if (d && (isDate(d.basename) || d.path.startsWith(folder))) return null;
      return { key: d ? d.basename : lp, file: d };
    };
    const cited = new Map();   // key -> { citedBy:Set, topics:Map, file }
    for (const f of Object.values(pages).flat()) {
      const topic = mc.getFileCache(f)?.frontmatter?.topic || "未分组";
      for (const l of mc.getFileCache(f)?.links || []) {
        if (/（wiki）/.test(l.link)) continue;
        const k = keyOf(l.link, f.path);
        if (!k) continue;
        if (!cited.has(k.key)) cited.set(k.key, { citedBy: new Set(), topics: new Map(), file: k.file });
        const c = cited.get(k.key);
        c.citedBy.add(f.basename.replace(/（wiki）$/, ""));
        c.topics.set(topic, (c.topics.get(topic) || 0) + 1);
      }
    }
    const entries = [...cited.entries()]
      .filter(([k, c]) => c.citedBy.size >= 2 && !wikiNames.has(k.toLowerCase()) && !dismissed.has(k))
      .map(([k, c]) => ({ name: k, citedBy: [...c.citedBy], topic: [...c.topics.entries()].sort((a, b) => b[1] - a[1])[0][0], type: c.file ? mc.getFileCache(c.file)?.frontmatter?.type || "" : "还没建页" }))
      .sort((a, b) => b.citedBy.length - a.citedBy.length).slice(0, 8);

    const covered = new Set([...wikiNames, ...cited.keys()].map((s) => s.toLowerCase()));
    for (const t of topics) { covered.add(t.name.toLowerCase()); for (const k of t.keywords || []) covered.add(String(k).toLowerCase()); }
    // 人物 / 书的名字和别名（日记里常写别名，链接解析不到页面）
    for (const f of this.app.vault.getMarkdownFiles()) {
      const fm = mc.getFileCache(f)?.frontmatter || {};
      if (!/^(人物|Books)\//.test(f.path) && !SUGGEST_SKIP_TYPES.has(String(fm.type || ""))) continue;
      covered.add(f.basename.toLowerCase());
      for (const a of [].concat(fm.aliases || fm.alias || [])) covered.add(String(a).trim().toLowerCase());
    }
    const since = window.moment().subtract(60, "day").format("YYYY_MM_DD");
    const counts = new Map();
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith("日记/") || f.basename < since) continue;
      for (const l of mc.getFileCache(f)?.links || []) {
        const k = keyOf(l.link, f.path);
        if (!k || covered.has(k.key.toLowerCase()) || SUGGEST_STOP.has(k.key.toLowerCase()) || dismissed.has(k.key)) continue;
        const type = k.file ? mc.getFileCache(k.file)?.frontmatter?.type : null;
        if (type && SUGGEST_SKIP_TYPES.has(String(type))) continue;
        if (k.file && /^(人物|Books|已发表|选题|穿搭|宝)\//.test(k.file.path)) continue;
        if (!counts.has(k.key)) counts.set(k.key, { count: 0, days: new Set() });
        const c = counts.get(k.key);
        c.count++;
        c.days.add(f.basename);
      }
    }
    const newTopics = [...counts.entries()].filter(([, c]) => c.count >= 5)
      .map(([k, c]) => ({ name: k, count: c.count, days: [...c.days].sort().reverse() }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
    return { entries, topics: newTopics };
  }

  // Wiki/log.md 里最近的几条：## [2026-09-28] ingest | 标题
  async recentLog(n) {
    const f = this.app.vault.getAbstractFileByPath(`${this.settings.folder}/log.md`);
    if (!(f instanceof TFile)) return [];
    const out = [];
    (await this.app.vault.cachedRead(f)).split("\n").forEach((l, i) => {
      const m = l.match(/^##\s*\[(\d{4}-\d{2}-\d{2})\]\s*(\S+)\s*\|\s*(.+?)\s*$/);
      if (m) out.push({ date: m[1], kind: m[2], title: m[3], line: i });
    });
    return out.reverse().slice(0, n);
  }

  writeEntry(name, topic, citedBy) {
    const prompt = `${PREAMBLE}

任务：新建 wiki 条目「${name}（wiki）」，归入主题「${topic}」（frontmatter 的 topic 写这个）。
现在引用了「${name}」的 wiki 页：${citedBy.map((c) => `${c}（wiki）`).join("、")}。先读这几页里关于它的说法，再回到原笔记（全库搜「${name}」和它的别名）逐条核对、补充。
按 CLAUDE.md 的格式写：属性（type / topic / summary / sources / updated）、开头的摘要引用块、每条说法带出处块链接；笔记之间有冲突就并列。在上面几页提到它的地方补一个 [[${name}（wiki）]] 链接。同步 Wiki/index.md，在 Wiki/log.md 末尾追加一条 create 记录（格式照旧）。
最后用中文两三句话汇报。`;
    this.runClaude(`新条目：${name}`, prompt);
  }

  async newTopic(name) {
    if (!this.settings.topics.some((t) => t.name === name)) {
      this.settings.topics.push({ name, keywords: [name] });
      await this.saveSettings();
    }
    const prompt = `${PREAMBLE}

任务：用户刚刚同意新开一个主题「${name}」。
1. 全库搜索和「${name}」相关的笔记（日记里的块也算），定一组关键词（包括同义词、英文、常见写法），排除无关用法。
2. 把主题和关键词写进 Wiki/CLAUDE.md 的主题表。
3. 建入口页「${name}（wiki）」，按规则做首次摄入；内容多就拆子页。
4. 更新 Wiki/index.md（新分组），在 Wiki/log.md 末尾追加一条 ingest 记录。
最后用中文汇报：用了哪些关键词、建了哪些页、有什么冲突或存疑。关键词请单独列一行「关键词：a、b、c」。`;
    this.runClaude(`新主题：${name}`, prompt, () => { this.settings.baselines[name] = Date.now(); });
  }

  // ---------- 调本机 Claude ----------

  runClaude(label, prompt, onSuccess) {
    if (this.job) { new Notice("Wiki 已经有一个任务在跑了"); return; }
    const bin = this.settings.claudePath.replace(/^~(?=\/)/, os.homedir());
    const cwd = this.app.vault.adapter.getBasePath();
    const folder = this.settings.folder;
    // 只放行读，以及 Wiki/ 里的写；-p 模式下其他写操作会被直接拒绝
    const tools = ["Read", "Grep", "Glob", `Edit(${folder}/**)`, `Write(${folder}/**)`, `MultiEdit(${folder}/**)`].join(",");
    const args = ["-p", prompt, "--output-format", "json", "--allowedTools", tools];
    const env = { ...process.env, PATH: `${os.homedir()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}` };
    let child;
    try { child = spawn(bin, args, { cwd, env }); }
    catch (e) { new Notice(`启动 claude 失败：${e.message}`); return; }
    const job = (this.job = { label, start: Date.now(), child, out: "", err: "" });
    child.stdout.on("data", (d) => (job.out += d));
    child.stderr.on("data", (d) => (job.err += d));
    const timer = setTimeout(() => { job.timedOut = true; child.kill(); }, this.settings.timeoutMin * 60 * 1000);
    const finish = async (ok, text) => {
      clearTimeout(timer);
      if (this.job !== job) return;
      this.job = null;
      this.settings.lastResult = { label, ok, text, at: Date.now() };
      if (ok && onSuccess) onSuccess(job.start);
      await this.saveSettings();
      new Notice(`Wiki：${label}${ok ? "完成" : "没有成功"}`);
      this.views().forEach((v) => v.render());
    };
    child.on("error", (e) => finish(false, `启动 claude 失败（${bin}）：${e.message}`));
    child.on("close", (code) => {
      if (job.stopped) return finish(false, "已手动停止。已经写进 Wiki/ 的改动会保留，可以在「日志」里核对。");
      if (job.timedOut) return finish(false, `超过 ${this.settings.timeoutMin} 分钟，已停止。`);
      let d;
      try { d = JSON.parse(job.out); } catch (e) { return finish(false, (job.err || job.out || `claude 退出码 ${code}`).trim().slice(0, 2000)); }
      finish(!d.is_error, String(d.result || "").trim());
    });
    this.views().forEach((v) => v.render());
  }

  stopJob() {
    if (!this.job) return;
    this.job.stopped = true;
    this.job.child.kill();
  }

  ingest(topic, files) {
    const list = files.map((f) => `- ${f.path}`).join("\n");
    const prompt = `${PREAMBLE}

任务：对主题「${topic.name}」做一次增量 ingest。
上次摄入之后，下面这些笔记改动过，而且提到了这个主题的关键词（${topic.keywords.join("、")}）：
${list}

逐篇读，只挑和这个主题有关的块（关键词的无关用法要排除）。已经收进 wiki 的说法不要重复加；新的说法按规则补进对应页面，需要时新建子页。改过的页面更新属性 sources 和 updated，同步 Wiki/index.md，在 Wiki/log.md 末尾追加一条 ingest 记录（格式照旧）。
如果这些笔记里其实没有新东西，就不要改页面，只在 log.md 记一句「无新增」。
最后用中文三到五句话汇报：改了哪些页、新增了什么、有什么冲突或存疑。`;
    this.runClaude(`摄入：${topic.name}`, prompt, (start) => { this.settings.baselines[topic.name] = start; });
  }

  ingestNote(file) {
    const topics = this.settings.topics.map((t) => `「${t.name}」`).join("、");
    const prompt = `${PREAMBLE}

任务：把 ${file.path} 这篇笔记里和现有主题（${topics}）相关的内容摄入 wiki。和任何主题都无关就直说，不要自己新建主题（新主题要用户点头）。
摄入的做法和平时一样：不重复、补出处、更新 sources / updated、同步 Wiki/index.md、在 Wiki/log.md 追加记录。
最后用中文两三句话汇报。`;
    this.runClaude(`摄入：${file.basename}`, prompt);
    this.activate();
  }

  ask(question) {
    const prompt = `${PREAMBLE}

用户的问题：${question}

先查 Wiki/ 里的页面，再回到原笔记核对。回答用中文，先说结论；每条说法带出处双链（wiki 页，或原笔记的块链接）；笔记里没有的内容要说明是通识补充；不确定就说不确定。
如果查的过程中发现 wiki 页该补充或修正，按规则改 Wiki/ 里的页面，并在 Wiki/log.md 追加一条 ask 记录；不需要改就不要改。
最后只输出给用户的回答（Markdown）。`;
    this.runClaude(`提问：${question.slice(0, 30)}`, prompt);
  }

  fixLint(issues) {
    const list = issues.map((i) => `- ${i.file}${i.line != null ? `（第 ${i.line + 1} 行）` : ""}：${i.msg}`).join("\n");
    const prompt = `${PREAMBLE}

本地体检发现了下面这些问题：
${list}

逐条处理：Wiki/ 里能修的按规则修（失效的块链接先找原块的新位置，找不到就改成只链到文件）；不在 Wiki/ 里的问题只报告、不改。改完在 Wiki/log.md 追加一条 lint 记录。
最后用中文列出修了什么、哪些没修以及原因。`;
    this.runClaude("体检修复", prompt);
  }

  // ---------- 本地体检（不调模型） ----------

  async lint() {
    const mc = this.app.metadataCache;
    const folder = this.settings.folder;
    const issues = [];
    const idxFile = this.app.vault.getAbstractFileByPath(`${folder}/index.md`);
    const idx = idxFile instanceof TFile ? await this.app.vault.cachedRead(idxFile) : "";
    const add = (file, msg, line) => issues.push({ file, msg, line });

    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(folder + "/")) continue;
      const cache = mc.getFileCache(f) || {};
      const fm = cache.frontmatter || {};
      const isPage = !["index", "log", "CLAUDE"].includes(f.basename);
      for (const k of FORBIDDEN_PROPS) if (k in fm) add(f.path, `属性里有 ${k}（规则 7）`, 0);
      for (const t of cache.tags || []) add(f.path, `有标签 ${t.tag}（规则 7）`, t.position.start.line);
      let brokenBlocks = 0, firstBroken = null;
      for (const l of [...(cache.links || []), ...(cache.embeds || [])]) {
        const [pathPart, sub] = l.link.split("#");
        const dest = pathPart ? mc.getFirstLinkpathDest(pathPart, f.path) : f;
        if (!dest) { add(f.path, `未解析的链接 [[${l.link}]]`, l.position.start.line); continue; }
        if (dest.path.startsWith("选题/")) add(f.path, `链到了选题页 [[${pathPart}]]（规则 7）`, l.position.start.line);
        if (FORBIDDEN_LINKS.includes(pathPart)) add(f.path, `用了标记 [[${pathPart}]]（规则 7）`, l.position.start.line);
        if (sub && sub.startsWith("^")) {
          const blocks = mc.getFileCache(dest)?.blocks || {};
          if (!blocks[sub.slice(1).toLowerCase()]) { brokenBlocks++; firstBroken ??= l; }
        }
      }
      if (brokenBlocks) add(f.path, `${brokenBlocks} 个块链接跳不到块（如 [[${firstBroken.link}]]）`, firstBroken.position.start.line);
      if (!isPage) continue;
      if (!/（wiki）$/.test(f.basename)) add(f.path, "页面名没有「（wiki）」后缀（规则 2）");
      // 展现形式：正文写成列表块；段落、表格都不行，引用块只许是第一个标题前的摘要
      const firstHeading = (cache.sections || []).find((s) => s.type === "heading");
      const loose = (cache.sections || []).filter((s) => s.type === "paragraph" || s.type === "table" ||
        (s.type === "blockquote" && firstHeading && s.position.start.line > firstHeading.position.start.line));
      if (loose.length && /（wiki）$/.test(f.basename)) add(f.path, `${loose.length} 处正文不是列表块（段落 / 表格），要改成无序或有序列表（CLAUDE.md「展现形式」）`, loose[0].position.start.line);
      for (const k of ["type", "topic", "summary", "updated", "sources"]) if (fm[k] == null) add(f.path, `缺属性 ${k}`, 0);
      if (idx && !idx.includes(`[[${f.basename}]]`)) add(f.path, "没有收进 index.md");
      const m = idx.match(new RegExp(`\\[\\[${esc(f.basename)}\\]\\][^\\n]*（(\\d+) 条来源笔记）`));
      if (m && fm.sources != null && +m[1] !== +fm.sources) add(f.path, `index.md 写 ${m[1]} 条来源，页面属性是 ${fm.sources}`);
    }
    return issues;
  }
};

class WikiSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    new Setting(containerEl).setName("Wiki 文件夹").addText((t) => t.setValue(s.folder).onChange(async (v) => { s.folder = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("claude 命令路径").setDesc("本机 Claude Code 的命令行（要先登录过）").addText((t) => t.setValue(s.claudePath).onChange(async (v) => { s.claudePath = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("单次任务超时（分钟）").addText((t) => t.setValue(String(s.timeoutMin)).onChange(async (v) => { const n = +v; if (n > 0) { s.timeoutMin = n; await this.plugin.saveSettings(); } }));
    new Setting(containerEl)
      .setName("主题和关键词")
      .setDesc("一行一个主题：主题名 | 关键词1, 关键词2 | 可选的起始日期（只看这天以后的日记）。主题名要和 wiki 页属性 topic 一致。")
      .addTextArea((t) => {
        t.inputEl.rows = 8;
        t.inputEl.style.width = "100%";
        t.setValue(s.topics.map((x) => [x.name, x.keywords.join(", "), x.since || ""].join(" | ").replace(/ \| $/, "")).join("\n"));
        t.onChange(async (v) => {
          s.topics = v.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]).map(([name, kw = "", since]) => ({
            name, keywords: kw.split(/[,，、]/).map((k) => k.trim()).filter(Boolean), ...(since ? { since } : {}),
          }));
          for (const t2 of s.topics) s.baselines[t2.name] ||= Date.now();
          await this.plugin.saveSettings();
          this.plugin.refresh();
        });
      });
  }
}
