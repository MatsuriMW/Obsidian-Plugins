// 第二大脑（自用）
//   · 每日回顾：Wiki 漫步（从 LLM Wiki 的条目里抽）/ Wiki 回看 / 孤岛笔记（右侧栏，每天第一次打开 Obsidian 时自动放一个标签，不抢焦点）
//     刷卡（#card 卡片、==挖空==、Anki 作答、手机同步）2026-10-29 拆成了单独的插件 Card Walk（card-walk）；这里留一个 embedCached() 给它按意思归学科
//   · 写作模式：打开 Claudian + 「相关笔记」面板（按光标所在段落实时找库里相近的块），面板上的「🧰 文本工具」在稿子右边分屏开 My Text Tools 工作台；退出时一起收起。平时不建索引
//     可以把别的库当素材源（设置「外部素材库」）：在稿子库里写，右边列的是主库里的日记和笔记；插入的链接 / 引用会记进稿子的属性「素材」
//   · 库周报：每周第一次打开时生成 计划与总结/库周报.md（新笔记、长得最多的页、候选建页词、孤岛变化）
// 相关度 = 语义向量（本机 Ollama 的 embedding 模型，按意思找）+ BM25（中文按字的二元组切，按字面找）混合；Ollama 没开就只用 BM25。
// 向量按块内容的哈希缓存在 ~/.cache/second-brain/vectors/（不放进库里，免得 iCloud 同步），两个库共用。
const { Plugin, ItemView, Notice, Menu, TFile, MarkdownView, MarkdownRenderer, Modal, PluginSettingTab, Setting, Keymap, Scope, requestUrl, Platform } = require("obsidian");
// 手机上（Obsidian 移动版）只开每日回顾：没有 Node 的 fs / path / os / crypto，也连不上本机的 Ollama
const MOBILE = !!Platform?.isMobile;
const nfs = MOBILE ? null : require("fs"), npath = MOBILE ? null : require("path"), nos = MOBILE ? null : require("os"), ncrypto = MOBILE ? null : require("crypto");
const { EditorView } = require("@codemirror/view");

const VIEW_REVIEW = "sb-daily-review";
const VIEW_RELATED = "sb-related";
const MTT_ID = "my-text-tools", VIEW_MTT = "my-text-tools-view";   // My Text Tools 工作台，收进写作模式里，不单独常驻
const JOURNAL_RE = /^(\d{4})[_-](\d{1,2})[_-](\d{1,2})$/;
const REPORT_NOTE = "计划与总结/库周报.md";
const REPORT_SNAP = "计划与总结/.库周报快照.json";
const DEFAULTS = {
    journalFolder: "日记",
    excludeFolders: "Templates, scripts, Bases, 选题/_采访, 计划与总结/库周报.md",
    privateLinks: "宝a",
    reviewCount: 5,           // Wiki 漫步同时摆几条
    recentBoost: 3,           // Wiki 漫步：近一年的条目被抽到的权重是其余的几倍（1 = 不偏向）
    boostLinks: "AI, LLM, ChatGPT, Agent, Transformer, prompt, 提示词, 机器学习, 神经网络, Claude, Claude Code, Codex, DeepSeek, Gemini, OpenAI, Anthropic, AGI, embedding, vibe coding, Cursor, MCP, skill, rule, memory, context engineering, Andrej Karpathy, Karpathy",   // Wiki 漫步：条目本身或它上层的母块链到这些页的，权重再乘 linkBoost（不分大小写，逗号分隔）
    linkBoost: 3,
    orphanCount: 3,
    autoOpenReview: true,
    autoWeeklyReport: true,
    collapseLeftInWriting: true,
    enableReview: true,       // 稿子库这种没有日记的库关掉：不出每日回顾和库周报
    semantic: true,
    ollamaUrl: "http://127.0.0.1:11434",
    embedModel: "embeddinggemma",
    embedDims: 768,
    hybridWeight: 0.15,
    minTopCos: 0.58,          // 拒答门槛：返回的块里最相近那块的余弦相似度低于它，就当库里没有，什么都不列（0 = 不设）。0.58 是 EmbeddingGemma 在评测集上定的，换模型要重定
    ctxPrefix: "notes",       // 切块带上下文：false 不加；"notes" 日记以外的笔记每块都加「页名 › 小标题」、日记只给从长块里拆出来的子块加（再带各层母块首行）；"nested" 只给拆出来的子块加；true 每块都加（日记块前面加日期会冲淡语义，评测里变差）。只影响算向量和字面检索，显示的原文不变；改了要重算向量
    queryFilters: true,       // 从问题里认时间和文件夹：「2023 年 3 月」「去年」「上个月」「日记里」先圈范围再排序（只对 searchExtra(..., { question: true }) 这类「问题」生效，写作模式按段落找相近内容时不认）
    aliasExpand: false,       // 别名扩展：查询里出现某页的页名或别名时，把这页的其他名字也加进字面检索（RAG ⇄ 检索增强生成）
    shellPenalty: 3,          // 空壳块降权：去掉格式后不到 shellMinChars 个字的块（只有标题的列表项、只有页名的标题块），混合分减去这个数（0 = 不降）
    shellMinChars: 12,
    extraVaults: "",          // 每行一个：库名|绝对路径（把那个库当素材源）
    lastAutoOpen: "",
    secFold: { wiki: true, orphans: true },   // 每日回顾里折叠着的小节（点小节标题开合，记住）
    dismissedOrphans: [],
};

const M = () => window.moment();
// 手机上单独存的设置（只这几项，写进 sync/mobile-state.json），免得和电脑一起写 data.json 被 iCloud 互相覆盖
const DEVICE_KEYS = ["secFold", "lastAutoOpen"];
const SYNC_DIR = "sync";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 跳到某一行：稳定地停在视口正中，并选中这一行的文字（Hover Outline 插件里有同一份） ----------
//   · 编辑模式：选中行内文字（不含缩进、列表符号、复选框、#、行尾 ^块ID）；高度是边滚边量的，对中后再量几次，偏了就补
//   · 阅读模式：先滚到附近让它渲染出来，再按段落 / 列表项（data-line）找到对应元素，对中后用浏览器选区选中
//   · 靠近文首文末滚不动的时候，停在能到的最近位置
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
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
        cm.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "center" }) });
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
    for (let i = 0; i < 12 && !el; i++) { await sleep(i ? 80 : 30); el = previewElAt(rd, line); }
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

// ---------- 小工具 ----------
function journalDate(basename) {
    const m = basename.match(JOURNAL_RE);
    return m ? window.moment(`${m[1]}-${m[2]}-${m[3]}`, "YYYY-M-D") : null;
}
// 块所在笔记的日期（YYYYMMDD 数字）：只有日记有，日期取自文件名；别的笔记返回 0
function blockDay(b) {
    const m = (b.ext ? b.ext.rel : b.path).split("/").pop().replace(/\.md$/, "").match(JOURNAL_RE);
    return m ? +m[1] * 10000 + +m[2] * 100 + +m[3] : 0;
}
const dayNum = (m) => m.year() * 10000 + (m.month() + 1) * 100 + m.date();
// 从问题里认出时间和文件夹（纯规则，不调模型）：「2023 年 3 月」「去年」「上个月」「最近两周」「日记里」……
// 返回 { query: 去掉这些说法后的问题, dateFrom, dateTo: YYYYMMDD 数字（含两端）, folder, label: 给人看的过滤说明 }；什么都没认出就原样返回 query
// 只认明确的说法：没写年份的「3 月」、「2023」不带「年」都不认，免得把正文里的数字当成过滤条件
function parseQueryFilters(query, { now = window.moment(), folders = [] } = {}) {
    let q = String(query);
    const res = { query: q };
    const CN = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const num = (s) => {
        if (/^\d+$/.test(s)) return +s;
        if (s === "半") return 0.5;
        if (s.includes("十")) { const [a, b] = s.split("十"); return (a ? CN[a] : 1) * 10 + (b ? CN[b] : 0); }
        return CN[s];
    };
    const N = "(\\d{1,2}|[一二两三四五六七八九十]{1,3}|半)";
    const M = window.moment;
    const yearsAgo = (w) => ({ 今年: 0, 去年: 1, 前年: 2 })[w];
    const rules = [
        // 2023 年 3 月 16 日 / 2023-03-16 / 2023/3/16 / 2023.3.16
        [/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?|(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/, (m) => { const d = M([+(m[1] || m[4]), (m[2] || m[5]) - 1, +(m[3] || m[6])]); return d.isValid() && [d, d.clone()]; }],
        // 2023 年 3 月 / 2023-03 / 2023/3（后面不能再跟数字）
        [/(\d{4})\s*年\s*(\d{1,2})\s*月份?|(\d{4})[-/.](\d{1,2})(?![\d./-])/, (m) => { const d = M([+(m[1] || m[3]), (m[2] || m[4]) - 1, 1]); return d.isValid() && [d, d.clone().endOf("month")]; }],
        // 去年 3 月 / 今年五月
        [/(今年|去年|前年)\s*(\d{1,2}|[一二三四五六七八九十]{1,2})\s*月份?/, (m) => { const mo = num(m[2]); if (!(mo >= 1 && mo <= 12)) return null; const d = now.clone().subtract(yearsAgo(m[1]), "year").month(mo - 1).startOf("month"); return [d, d.clone().endOf("month")]; }],
        // 2023 年上半年 / 去年下半年
        [/(\d{4}\s*年|今年|去年|前年)\s*(上|下)半年/, (m) => { const y = /\d/.test(m[1]) ? +m[1].match(/\d{4}/)[0] : now.year() - yearsAgo(m[1]); const d = M([y, m[2] === "上" ? 0 : 6, 1]); return [d, d.clone().add(5, "month").endOf("month")]; }],
        // 2023 年（不是「2023 年代」）/ 去年 / 今年 / 前年
        [/(\d{4})\s*年(?!代)|(今年|去年|前年)/, (m) => { const y = m[1] ? +m[1] : now.year() - yearsAgo(m[2]); const d = M([y, 0, 1]); return [d, d.clone().endOf("year")]; }],
        // 上个月 / 这个月
        [/上个?月|这个月|本月/, (m) => { const d = now.clone().subtract(m[0].startsWith("上") ? 1 : 0, "month").startOf("month"); return [d, d.clone().endOf("month")]; }],
        // 上周 / 这周（周一到周日）
        [/上个?(?:周|星期|礼拜)|(?:这|本)个?(?:周|星期|礼拜)/, (m) => { const d = now.clone().subtract(m[0].startsWith("上") ? 1 : 0, "week").startOf("isoWeek"); return [d, d.clone().endOf("isoWeek")]; }],
        // 最近 / 过去 / 近 N 天、周、个月、年
        [new RegExp(`(?:最近|过去|近)\\s*${N}\\s*(天|日|周|个?星期|个?礼拜|个?月|年)`), (m) => { const n = num(m[1]); if (!n) return null; const u = /天|日/.test(m[2]) ? "day" : /周|星期|礼拜/.test(m[2]) ? "week" : /月/.test(m[2]) ? "month" : "year"; return [now.clone().subtract(n, u).add(1, "day"), now.clone()]; }],
        // 今天 / 昨天 / 前天
        [/今天|昨天|前天/, (m) => { const d = now.clone().subtract({ 今天: 0, 昨天: 1, 前天: 2 }[m[0]], "day"); return [d, d.clone()]; }],
    ];
    let hit = null;
    for (const [re, fn] of rules) {
        const m = q.match(re);
        const r = m && fn(m);
        if (!r) continue;
        res.dateFrom = dayNum(r[0]); res.dateTo = dayNum(r[1]); hit = m[0];
        q = q.replace(hit, " ");
        break;
    }
    // 文件夹：「日记里」「在阅读收藏中」「读书笔记文件夹下」……名字得是库里真有的文件夹（两个字以上），后面得跟 里 / 中 / 下 / 文件夹 / 目录
    const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const f of [...folders].sort((a, b) => b.length - a.length)) {
        if (f.length < 2) continue;
        const fm = q.match(new RegExp(`(?:在\\s*)?「?${reEsc(f)}」?\\s*(?:(?:文件夹|目录)\\s*)?(?:里面|里|中|下面|下)的?|(?:在\\s*)?「?${reEsc(f)}」?\\s*(?:文件夹|目录)`));
        if (!fm) continue;
        res.folder = f;
        q = q.replace(fm[0], " ");
        break;
    }
    if (hit || res.folder) {
        const rest = q.replace(/\s+/g, " ").replace(/^[\s,，。、的在]+|[\s,，。、]+$/g, "").trim();
        res.query = rest.length >= 2 ? rest : String(query);
        const fmt = (n) => `${Math.floor(n / 10000)}-${String(Math.floor(n / 100) % 100).padStart(2, "0")}-${String(n % 100).padStart(2, "0")}`;
        res.label = [hit ? (res.dateFrom === res.dateTo ? fmt(res.dateFrom) : `${fmt(res.dateFrom)} ~ ${fmt(res.dateTo)}`) : "", res.folder ? `${res.folder}/` : ""].filter(Boolean).join(" · ");
    }
    return res;
}
// 可复现的随机数：同一天同一个种子，抽到的东西一样（刷新不变，点「换一批」才变）
function rng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
// 加权打乱：权重大的更容易排到前面（每项取 rand^(1/w) 从大到小排，等于按权重不放回地抽）
function weightedShuffle(arr, rand, weight) {
    return arr.map((x) => [Math.pow(rand(), 1 / Math.max(weight(x), 1e-6)), x]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}
// 显示用：去掉列表前缀、任务关键字、块 ID、双链语法
function plain(s) {
    return String(s)
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
        .replace(/\s\^[\w-]+\s*$/gm, "")
        .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/==|\*\*|__/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
// Wiki 漫步里渲染用的 Markdown：去掉制卡标签、块 id、单独一行的 ^q-xxxx，整体去掉公共缩进（嵌套的卡不会被当成代码块）
function cardMd(text) {
    const L = cardText(text).split("\n").filter((l) => !/^\s*\^[\w-]+\s*$/.test(l)).map((l) => l.replace(/\s\^[\w-]+\s*$/, ""));
    const ind = Math.min(...L.filter((l) => l.trim()).map((l) => (l.match(/^[\t ]*/) || [""])[0].replace(/ {4}/g, "\t").length));
    return L.map((l) => l.replace(/ {4}/g, "\t").replace(new RegExp(`^\\t{0,${Number.isFinite(ind) ? ind : 0}}`), "")).join("\n").trim();
}
// 卡片显示用：去掉 #card 这类制卡标签
const cardText = (s) => String(s).replace(/\s*#(card|flashcard|reversed)\b/gi, "");
async function osa(script) {
    const { execFile } = require("child_process");
    return new Promise((res) => execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 4000 }, (err, out) => res(err ? "" : String(out).trim())));
}
// Bike 开着这篇的话，这边写进去会被 Bike 下次自动保存覆盖掉
async function bikeHasOpen(file) {
    if (MOBILE) return false;
    const r = await osa(`const b = Application("Bike"); b.running() && b.documents.byName(${JSON.stringify(file.name)}).exists() ? "yes" : "no"`);
    return r === "yes";
}

// ---------- 语义向量 ----------
const hashOf = (s) => ncrypto.createHash("sha1").update(s).digest("hex").slice(0, 20);
// 不同模型要求的查询 / 文档前缀
const MODEL_PROMPT = [
    [/^qwen3-embedding/, "Instruct: 根据正在写作的一段话，检索笔记库中意思相关的笔记片段\nQuery: ", ""],
    [/^embeddinggemma/, "task: search result | query: ", "title: none | text: "],
];
// 追加式的向量缓存：hashes.txt 一行一个块哈希，vecs.bin 顺序放 Float32 向量（已归一化）
// lazy = 只读哈希表，向量用到哪条从磁盘读哪条（给 LLM Wiki 查少量块用，不把近 200 MB 读进内存）
class VectorStore {
    constructor(model, dims, lazy = false) {
        this.dims = dims;
        this.lazy = lazy;
        this.dir = npath.join(nos.homedir(), ".cache", "second-brain", "vectors", `${String(model).replace(/[^\w.-]+/g, "_")}-${dims}`);
        this.map = new Map();
        this.n = 0;
        this.data = lazy ? null : new Float32Array(dims * 4096);
        this.load();
    }
    load() {
        const hp = npath.join(this.dir, "hashes.txt"), vp = npath.join(this.dir, "vecs.bin");
        if (!nfs.existsSync(hp) || !nfs.existsSync(vp)) return;
        const hashes = nfs.readFileSync(hp, "utf8").split("\n").filter(Boolean);
        const size = nfs.statSync(vp).size;
        const n = Math.min(hashes.length, Math.floor(size / 4 / this.dims));
        if (!this.lazy) {
            const buf = nfs.readFileSync(vp);
            this.data = new Float32Array(Math.max(4096, n * 2) * this.dims);
            this.data.set(new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + n * this.dims * 4)));
        }
        for (let i = 0; i < n; i++) this.map.set(hashes[i], i);
        this.n = n;
        // 上次写到一半断掉的话，两个文件对不齐：截到对齐的长度
        if (hashes.length !== n || size !== n * this.dims * 4) {
            nfs.writeFileSync(hp, hashes.slice(0, n).join("\n") + (n ? "\n" : ""));
            nfs.truncateSync(vp, n * this.dims * 4);
        }
    }
    idx(h) { const i = this.map.get(h); return i == null ? -1 : i; }
    // 按序号取向量；lazy 时从 vecs.bin 里读
    vecsOf(ids) {
        if (!this.lazy) return ids.map((i) => (i < 0 ? null : this.data.subarray(i * this.dims, (i + 1) * this.dims)));
        const fd = nfs.openSync(npath.join(this.dir, "vecs.bin"), "r");
        try {
            return ids.map((i) => {
                if (i < 0) return null;
                const buf = Buffer.alloc(this.dims * 4);
                nfs.readSync(fd, buf, 0, buf.length, i * this.dims * 4);
                return new Float32Array(buf.buffer, buf.byteOffset, this.dims);
            });
        } finally { nfs.closeSync(fd); }
    }
    addMany(list) {
        list = list.filter((x) => !this.map.has(x.h) && x.vec && x.vec.length === this.dims);
        if (!list.length) return;
        nfs.mkdirSync(this.dir, { recursive: true });
        if (this.lazy) {
            // 序号以文件里的实际条数为准（写作模式那份缓存可能也往里追加过）
            const vp = npath.join(this.dir, "vecs.bin");
            const base = nfs.existsSync(vp) ? Math.floor(nfs.statSync(vp).size / 4 / this.dims) : 0;
            const out = new Float32Array(list.length * this.dims);
            list.forEach((x, k) => { out.set(x.vec, k * this.dims); this.map.set(x.h, base + k); });
            this.n = base + list.length;
            nfs.appendFileSync(npath.join(this.dir, "vecs.bin"), Buffer.from(out.buffer));
            nfs.appendFileSync(npath.join(this.dir, "hashes.txt"), list.map((x) => x.h).join("\n") + "\n");
            return;
        }
        if ((this.n + list.length) * this.dims > this.data.length) {
            const bigger = new Float32Array(Math.max(this.data.length * 2, (this.n + list.length) * this.dims * 2));
            bigger.set(this.data.subarray(0, this.n * this.dims));
            this.data = bigger;
        }
        const out = new Float32Array(list.length * this.dims);
        list.forEach((x, k) => { out.set(x.vec, k * this.dims); this.data.set(x.vec, (this.n + k) * this.dims); this.map.set(x.h, this.n + k); });
        this.n += list.length;
        nfs.appendFileSync(npath.join(this.dir, "vecs.bin"), Buffer.from(out.buffer));
        nfs.appendFileSync(npath.join(this.dir, "hashes.txt"), list.map((x) => x.h).join("\n") + "\n");
    }
}
// 外部库没有 Obsidian 的索引，自己按行切块：顶格列表项连同缩进的子项算一块；别的笔记再加上标题块和段落
function fsBlocks(text, basename, priv) {
    const res = [];
    const L = text.split("\n");
    let i = 0, fm = "";
    if (L[0] === "---") { let e = 1; while (e < L.length && L[e] !== "---") e++; fm = L.slice(1, e).join("\n"); i = e + 1; }
    const push = (line, s) => { const t = s.trim(); if (t.replace(/\s/g, "").length < 8) return; if (priv && priv.test(t)) return; res.push({ line, text: t }); };
    const isJournal = !!journalDate(basename);
    if (!isJournal) push(0, `${basename} ${(fm.match(/^def:\s*"?(.*?)"?\s*$/m) || [])[1] || ""}`);
    let cur = null, curLine = 0, para = null, paraLine = 0, inCode = false;
    const flush = () => {
        if (cur !== null) { push(curLine, cur); cur = null; }
        if (para !== null) { if (!isJournal) push(paraLine, para); para = null; }
    };
    for (; i < L.length; i++) {
        const l = L[i];
        if (/^\s*(```|~~~)/.test(l)) { inCode = !inCode; flush(); continue; }
        if (inCode) continue;
        if (/^([-*+]|\d+[.)])\s/.test(l)) { flush(); cur = l; curLine = i; }
        else if (cur !== null && l.trim() && /^\s/.test(l)) cur += "\n" + l;
        else if (!l.trim() || /^#{1,6}\s/.test(l) || /^\|/.test(l)) flush();
        else { if (cur !== null) flush(); if (para === null) { para = l; paraLine = i; } else para += "\n" + l; }
    }
    flush();
    return res;
}
function walkMd(root, isEx) {
    const out = [];
    const rec = (dir, rel) => {
        for (const e of nfs.readdirSync(dir, { withFileTypes: true })) {
            if (e.name.startsWith(".")) continue;
            const r = rel ? rel + "/" + e.name : e.name;
            if (isEx(r)) continue;
            if (e.isDirectory()) rec(npath.join(dir, e.name), r);
            else if (e.name.endsWith(".md")) out.push(r);
        }
    };
    try { rec(root, ""); } catch (e) { console.warn("[second-brain] 外部库读不到", root, e); }
    return out;
}
// 给一篇笔记的属性里的列表加一项（不经过 Obsidian，直接改文本；键写成行内值的不动）
function fmListAdd(text, key, value) {
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const L = m[1].split("\n");
    const item = `  - "${value}"`;
    const i = L.findIndex((l) => l.startsWith(key + ":"));
    if (i < 0) L.push(key + ":", item);
    else {
        if (L[i].trim() !== key + ":") return null;
        let j = i + 1;
        while (j < L.length && /^\s+-/.test(L[j])) { if (L[j].trim() === item.trim()) return null; j++; }
        L.splice(j, 0, item);
    }
    return "---\n" + L.join("\n") + "\n---" + text.slice(m[0].length);
}

// ---------- 分词 + BM25 块索引 ----------
const CJK = /[㐀-鿿豈-﫿]/;
function tokenize(text) {
    const out = [];
    const s = String(text).toLowerCase().replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, " $2 ").replace(/https?:\/\/\S+/g, " ");
    for (const m of s.matchAll(/[a-z][a-z0-9+#.-]{1,}|[㐀-鿿豈-﫿]+/g)) {
        const w = m[0];
        if (CJK.test(w[0])) {
            if (w.length === 1) out.push(w);
            for (let i = 0; i + 1 < w.length; i++) out.push(w.slice(i, i + 2));
        } else if (!STOP_EN.has(w)) out.push(w.replace(/[.-]+$/, ""));
    }
    return out;
}
// 去掉列表符号、任务框、块 ID、#card、双链括号、高亮 / 加粗记号和标点之后剩几个字：用来认出空壳块
function contentLen(text) {
    return String(text).replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").replace(/\^[\w-]+/g, "").replace(/#card\b/g, "")
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?/gm, "").replace(/[\s\p{P}\p{S}]/gu, "").length;
}
// 母块的第一行，拿来当子块的上下文：去掉列表符号、任务框、块 ID、标题井号和强调记号
function ctxLine(line) {
    return String(line || "").replace(LINE_PREFIX_RE, "").replace(/\s\^[\w-]+\s*$/, "").replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
        .replace(/(\*\*|==|__)/g, "").trim().slice(0, 60);
}
const STOP_EN = new Set("the and for are but not you with this that from have was were will would can could what when where which who how all any your our their its his her they them then than there here into onto about just also very more most some such only other of to in on at by is it be as or an if so do does did no yes we he she i me my".split(" "));

class BlockIndex {
    constructor(plugin) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.blocks = [];            // {path, line, text, len, dead, h 内容哈希, v 向量序号(-1=还没有), ext 外部库 {vault, rel}}
        this.store = null;           // VectorStore；没开语义就是 null
        this.missing = false;        // 有块还没算向量
        this.embedding = false;
        this.stopEmbed = false;
        this.post = new Map();       // token -> [blockIdx, tf, blockIdx, tf, ...]
        this.fileBlocks = new Map(); // path -> [blockIdx]
        this.totalLen = 0;
        this.ready = false;
        this.building = null;
        this.dirty = new Set();
    }
    excluded(path) {
        return this.plugin.excludeList().some((x) => path === x || path.startsWith(x.endsWith("/") ? x : x + "/"));
    }
    // 一篇笔记切成块：日记 = 每个顶层列表项（连子项）；其它笔记 = 标题/定义当一块 + 每个顶层列表项 + 每个段落
    // keepPrivate：私密块也要（LLM Wiki 摄入用，wiki 本来就在自己库里）
    async blocksOf(file, keepPrivate = false) {
        const cache = this.app.metadataCache.getFileCache(file) || {};
        const text = await this.app.vault.cachedRead(file);
        const L = text.split("\n");
        const priv = keepPrivate ? null : this.plugin.privateRe();
        const res = [];
        const push = (line, s, title = false, ctx = "") => {
            const t = s.trim();
            if (t.replace(/\s/g, "").length < 8) return;
            if (priv && priv.test(t)) return;
            res.push({ line, end: line + s.replace(/\s+$/, "").split("\n").length - 1, text: t, title, ctx });
        };
        const isJournal = !!journalDate(file.basename);
        // 切块带上下文（设置 ctxPrefix）：页名（日记是日期）› 所在小标题 › 子项单独成块时各层母块的第一行
        // 评测里给日记的每块都加日期会冲淡语义；概念笔记的单行列表项加上页名和小标题则能找回来，所以默认 "notes"
        const ctxMode = this.plugin.settings.ctxPrefix, ctxOn = !!ctxMode;
        const page = isJournal ? journalDate(file.basename).format("YYYY-MM-DD") : file.basename;
        const heads = (cache.headings || []).map((h) => ({ line: h.position.start.line, text: h.heading }));
        const itemAt = new Map((cache.listItems || []).map((it) => [it.position.start.line, it]));
        const ctxOf = (line, nested) => {
            if (!ctxOn || (ctxMode === "nested" && !nested) || (ctxMode === "notes" && !nested && isJournal)) return "";
            const parts = [page];
            let h = ""; for (const x of heads) { if (x.line < line) h = x.text; else break; }
            if (h) parts.push(h);
            if (nested) {
                const chain = [];
                // 只往上找、最多 8 层：母块必须在当前块上面，防止异常的列表结构让循环停不下来
                for (let it = itemAt.get(line), k = 0; it && it.parent >= 0 && k < 8; k++) { const pa = itemAt.get(it.parent); if (!pa || pa.position.start.line >= it.position.start.line) break; chain.unshift(ctxLine(L[pa.position.start.line])); it = pa; }
                parts.push(...chain.filter(Boolean));
            }
            return parts.join(" › ").slice(0, 200);
        };
        if (!isJournal) {
            const fm = cache.frontmatter || {};
            push(0, `${file.basename} ${fm.def || ""} ${[fm.aliases].flat().filter(Boolean).join(" ")}`, true);   // 标题块：页名 + 定义 + 别名，不是正文
        }
        const items = cache.listItems || [];
        const skip = new Set();
        for (const s of cache.sections || []) if (s.type === "code" || s.type === "yaml" || s.type === "math")
            for (let i = s.position.start.line; i <= s.position.end.line; i++) skip.add(i);
        // 顶层列表项 + 所有子孙
        const top = [];
        for (const it of items) {
            if (it.parent < 0) top.push({ start: it.position.start.line, end: it.position.end.line });
            else if (top.length) top[top.length - 1].end = Math.max(top[top.length - 1].end, it.position.end.line);
        }
        const inList = new Set();
        for (const b of top) {
            const lines = [];
            for (let i = b.start; i <= b.end; i++) { inList.add(i); if (!skip.has(i)) lines.push(L[i]); }
            const joined = lines.join("\n");
            // 太长的块（整页只有一个大列表）按子项再切，免得一整篇算一块
            if (joined.length > 1500) {
                for (const it of items) if (it.position.start.line >= b.start && it.position.start.line <= b.end && !skip.has(it.position.start.line))
                    push(it.position.start.line, L.slice(it.position.start.line, it.position.end.line + 1).join("\n"), false, ctxOf(it.position.start.line, true));
            } else push(b.start, joined, false, ctxOf(b.start, false));
        }
        if (!isJournal) for (const s of cache.sections || []) {
            if (s.type !== "paragraph" && s.type !== "blockquote" && s.type !== "callout") continue;
            if (inList.has(s.position.start.line)) continue;
            push(s.position.start.line, L.slice(s.position.start.line, s.position.end.line + 1).join("\n"), false, ctxOf(s.position.start.line, false));
        }
        return res;
    }
    addBlocks(file, list, ext = null) {
        const ids = [];
        for (const b of list) {
            if (!tokenize(b.text).length) continue;
            const et = b.ctx ? b.ctx + "\n" + b.text : b.text;   // 带上下文的文字：只用来算向量和字面检索
            const toks = tokenize(et);
            const idx = this.blocks.length;
            const text = b.text.slice(0, 1200), etx = et.slice(0, 1200);
            const h = hashOf(etx);
            const v = this.store ? this.store.idx(h) : -1;
            if (v < 0) this.missing = true;
            this.blocks.push({ path: file.path, line: b.line, text, et: etx !== text ? etx : undefined, clen: contentLen(text), len: toks.length, dead: false, h, v, ext });
            this.totalLen += toks.length;
            const tf = new Map();
            for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
            for (const [t, n] of tf) { let p = this.post.get(t); if (!p) this.post.set(t, (p = [])); p.push(idx, n); }
            ids.push(idx);
        }
        this.fileBlocks.set(file.path, ids);
    }
    async build(onProgress) {
        if (this.building) return this.building;
        this.building = (async () => {
            const t0 = Date.now();
            this.blocks = []; this.post = new Map(); this.fileBlocks = new Map(); this.totalLen = 0; this.dirty.clear(); this.missing = false;
            const st = this.plugin.settings;
            this.store = null;
            if (st.semantic && st.embedModel) { try { this.store = new VectorStore(st.embedModel, st.embedDims); } catch (e) { console.warn("[second-brain] 向量缓存打不开", e); } }
            const files = this.app.vault.getMarkdownFiles().filter((f) => !this.excluded(f.path));
            // 别名表：[页名, 别名…]，别名扩展用
            this.aliases = [];
            for (const f of files) {
                const al = [this.app.metadataCache.getFileCache(f)?.frontmatter?.aliases].flat().filter((x) => typeof x === "string" && x.trim());
                if (al.length) this.aliases.push([f.basename, ...al].map((x) => x.trim()));
            }
            for (let i = 0; i < files.length; i++) {
                try { this.addBlocks(files[i], await this.blocksOf(files[i])); } catch (e) { console.warn("[second-brain] index", files[i].path, e); }
                if (i % 150 === 0) { onProgress && onProgress(i, files.length); await sleep(0); }
            }
            // 外部素材库：直接读磁盘上的 .md
            const priv = this.plugin.privateRe();
            for (const xv of this.plugin.extraVaults()) {
                const rels = walkMd(xv.root, (r) => this.excluded(r));
                for (let i = 0; i < rels.length; i++) {
                    try {
                        const text = await nfs.promises.readFile(npath.join(xv.root, rels[i]), "utf8");
                        const base = rels[i].split("/").pop().replace(/\.md$/, "");
                        this.addBlocks({ path: `${xv.name}::${rels[i]}` }, fsBlocks(text, base, priv), { vault: xv.name, rel: rels[i] });
                    } catch (e) { /* 读不了就跳过 */ }
                    if (i % 150 === 0) { onProgress && onProgress(i, rels.length, xv.name); await sleep(0); }
                }
            }
            this.ready = true;
            this.builtMs = Date.now() - t0;
            onProgress && onProgress(files.length, files.length);
        })();
        try { await this.building; } finally { this.building = null; }
    }
    // 改过的文件：旧块作废、新块追加（df 不回退，影响很小）；作废太多就整体重建
    async refreshDirty() {
        if (!this.ready || !this.dirty.size) return;
        const paths = [...this.dirty]; this.dirty.clear();
        for (const p of paths) {
            for (const i of this.fileBlocks.get(p) || []) { if (!this.blocks[i].dead) { this.blocks[i].dead = true; this.totalLen -= this.blocks[i].len; } }
            this.fileBlocks.delete(p);
            const f = this.app.vault.getAbstractFileByPath(p);
            if (f instanceof TFile && f.extension === "md" && !this.excluded(p)) this.addBlocks(f, await this.blocksOf(f));
        }
        const dead = this.blocks.filter((b) => b.dead).length;
        if (dead > this.blocks.length * 0.25) await this.build();
    }
    // 给还没有向量的块算向量（按内容哈希去重、分批；写作模式退出时 stopEmbed 置真就停，下次接着算）
    async embedMissing(onProgress) {
        if (!this.store || this.embedding) return;
        this.embedding = true; this.stopEmbed = false;
        try {
            const todo = new Map();
            for (const b of this.blocks) {
                if (b.dead || b.v >= 0) continue;
                const i = this.store.idx(b.h);
                if (i >= 0) b.v = i; else if (!todo.has(b.h)) todo.set(b.h, b.et || b.text);
            }
            const items = [...todo.entries()];
            for (let i = 0; i < items.length && !this.stopEmbed; i += 32) {
                const batch = items.slice(i, i + 32);
                const vecs = await this.plugin.embedTexts(batch.map((x) => x[1]), false);
                this.store.addMany(batch.map((x, k) => ({ h: x[0], vec: vecs[k] })));
                onProgress && onProgress(Math.min(i + 32, items.length), items.length);
            }
            let miss = false;
            for (const b of this.blocks) { if (b.dead) continue; if (b.v < 0) b.v = this.store.idx(b.h); if (b.v < 0) miss = true; }
            this.missing = miss;
        } finally { this.embedding = false; }
    }
    coverage() {
        let live = 0, have = 0;
        for (const b of this.blocks) if (!b.dead) { live++; if (b.v >= 0) have++; }
        return { live, have };
    }
    // 查询里出现某页的页名或别名（3 个字以上；英文要整词）时，把这页的其他名字也拿来做字面检索，比如 RAG ⇄ 检索增强生成
    expandQuery(query) {
        if (!this.plugin.settings.aliasExpand || !this.aliases?.length) return query;
        const q = String(query).toLowerCase(), add = new Set();
        const has = (x) => (CJK.test(x) ? q.includes(x) : new RegExp(`(^|[^a-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`).test(q));
        for (const names of this.aliases) {
            if (!names.some((n) => n.length >= 3 && has(n.toLowerCase()))) continue;
            for (const n of names) if (!q.includes(n.toLowerCase())) add.add(n);
            if (add.size > 12) break;
        }
        return add.size ? query + "\n" + [...add].join(" ") : query;
    }
    // 每块的分：BM25（bm）、余弦（cos，没有查询向量时为 null）、混合分（f = 余弦和 BM25 各自 z-score 标准化后加权相加，空壳块再减 shellPenalty）
    // search 和评测脚本（~/claude/rag-eval）共用这一份
    scoreAll(query, qvec = null, excludePath = null) {
        const st = this.plugin.settings;
        const N = this.blocks.length;
        let dead = 0; for (const b of this.blocks) if (b.dead) dead++;
        const live = N - dead || 1;
        const qtf = new Map();
        for (const t of tokenize(this.expandQuery(query))) qtf.set(t, (qtf.get(t) || 0) + 1);
        const avg = this.totalLen / live || 1;
        // 只用最有区分度的 48 个词，长段落也不会慢
        const terms = [...qtf.keys()].map((t) => { const p = this.post.get(t); const df = p ? p.length / 2 : 0; return { t, df, idf: df ? Math.log(1 + (N - df + 0.5) / (df + 0.5)) : 0 }; })
            .filter((x) => x.df && x.df < N * 0.2).sort((a, b) => b.idf - a.idf).slice(0, 48);
        const bm = new Float64Array(N);
        const k1 = 1.2, bb = 0.75;
        for (const { t, idf } of terms) {
            const p = this.post.get(t);
            const qw = Math.min(3, qtf.get(t));
            for (let i = 0; i < p.length; i += 2) {
                const b = this.blocks[p[i]];
                if (b.dead || b.path === excludePath) continue;
                const tf = p[i + 1];
                bm[p[i]] += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - bb + bb * b.len / avg)) * qw;
            }
        }
        let cos = null, f = null, mu = 0, sd = 1;
        if (qvec && this.store && this.store.n) {
            const d = this.store.dims, data = this.store.data;
            cos = new Float32Array(N);
            let sum = 0, sum2 = 0, cnt = 0;
            for (let i = 0; i < N; i++) {
                const b = this.blocks[i];
                if (b.dead || b.path === excludePath || b.v < 0) { cos[i] = NaN; continue; }
                let s = 0; const o = b.v * d;
                for (let k = 0; k < d; k++) s += qvec[k] * data[o + k];
                cos[i] = s; sum += s; sum2 += s * s; cnt++;
            }
            if (cnt > 50) {
                mu = sum / cnt; sd = Math.sqrt(Math.max(1e-9, sum2 / cnt - mu * mu));
                let bs = 0, bs2 = 0;
                for (let i = 0; i < N; i++) if (bm[i]) { bs += bm[i]; bs2 += bm[i] * bm[i]; }
                const bmu = bs / live, bsd = Math.sqrt(Math.max(1e-9, bs2 / live - bmu * bmu));
                const w = Number(st.hybridWeight) || 0;
                const pen = Number(st.shellPenalty) || 0, minc = Number(st.shellMinChars) || 0;
                f = new Float64Array(N);
                for (let i = 0; i < N; i++) {
                    const b = this.blocks[i];
                    if (b.dead || b.path === excludePath) { f[i] = -Infinity; continue; }
                    f[i] = (Number.isNaN(cos[i]) ? 0 : (cos[i] - mu) / sd) + w * ((bm[i] - bmu) / bsd) - (pen && b.clen < minc ? pen : 0);
                }
            } else cos = null;
        }
        return { bm, cos, f, mu, sd };
    }
    // only：只要满足条件的块（写作模式用它把 Wiki 条目和普通笔记分开查）
    // dateFrom / dateTo：只要这段日期里的日记（YYYYMMDD 数字或 "YYYY-MM-DD"，含两端；日期取自日记文件名，别的笔记没有日期，一律不要）
    // folder：只要这个文件夹里的（外部素材库按它库里的相对路径算）。过滤在排序前做：先圈范围，再在范围里按混合分排
    search(query, { excludePath = null, limit = 12, perFile = 2, onlyNotes = false, qvec = null, only = null, dateFrom = null, dateTo = null, folder = null } = {}) {
        if (!this.ready) return [];
        const S = this.scoreAll(query, qvec, excludePath);
        const toDay = (x) => (x == null || x === "" ? null : typeof x === "number" ? x : +String(x).replace(/\D/g, "").slice(0, 8) || null);
        const dFrom = toDay(dateFrom), dTo = toDay(dateTo);
        const fold = folder ? String(folder).replace(/^\/+|\/+$/g, "") + "/" : null;
        const inScope = dFrom || dTo || fold ? (b) => {
            if (fold && !(b.ext ? b.ext.rel : b.path).startsWith(fold)) return false;
            if (dFrom || dTo) { const d = blockDay(b); if (!d || (dFrom && d < dFrom) || (dTo && d > dTo)) return false; }
            return true;
        } : null;
        const arr = [];
        // 有查询向量：混合分 > 1.5 才算；没有就只按 BM25
        if (S.f) { for (let i = 0; i < S.f.length; i++) if (S.f[i] > 1.5) arr.push([i, S.f[i]]); }
        else for (let i = 0; i < S.bm.length; i++) if (S.bm[i] > 0) arr.push([i, S.bm[i]]);
        const ranked = arr.sort((a, b) => b[1] - a[1]);
        const out = [], perCount = new Map(), seen = new Set();
        for (const [i, s] of ranked) {
            const b = this.blocks[i];
            if (inScope && !inScope(b)) continue;
            const key = b.text.replace(/\s+/g, "").slice(0, 80);
            if (seen.has(key)) continue;
            seen.add(key);
            if (onlyNotes && (b.ext || journalDate(b.path.split("/").pop().replace(/\.md$/, "")))) continue;
            if (only && !only(b)) continue;
            const c = perCount.get(b.path) || 0;
            if (c >= perFile) continue;
            perCount.set(b.path, c + 1);
            out.push({ ...b, score: s, cos: S.cos ? S.cos[i] : null });
            if (out.length >= limit) break;
        }
        // 拒答门槛：相对分数总能排出前几名，库里根本没有的东西也会列出来。前 10 条里最相近的那块也不够像，就当没找到
        // （只看前 10 条，结果不随 limit 变；0.58 取自 48 题评测集：应拒答题前 10 最高 ≤ 0.561（goroutine 一道 0.598 例外），应答题最低 0.597）
        const minCos = Number(this.plugin.settings.minTopCos) || 0;
        if (minCos > 0 && S.cos && out.length && Math.max(...out.slice(0, 10).map((b) => (Number.isNaN(b.cos) ? -1 : b.cos))) < minCos) return [];
        return out;
    }
}

// ---------- 确认框 ----------
class ConfirmModal extends Modal {
    constructor(app, title, body, onOk) { super(app); this.t = title; this.b = body; this.ok = onOk; }
    onOpen() {
        this.titleEl.setText(this.t);
        this.contentEl.createEl("p", { text: this.b });
        const row = this.contentEl.createDiv({ cls: "sb-modal-row" });
        row.createEl("button", { text: "取消" }).onclick = () => this.close();
        const go = row.createEl("button", { text: "继续", cls: "mod-cta" });
        go.onclick = () => { this.close(); this.ok(); };
    }
    onClose() { this.contentEl.empty(); }
}

// ---------- LLM Wiki 条目 ----------
const obsUri = (vault, rel) => `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(String(rel).replace(/\.md$/, ""))}`;
// wiki 条目末尾全角括号里的双链是出处：（[[2026_08_26#^q-9hqk|2026-08-26]] · [[mr dang|mr dang]]）
// 返回去掉出处括号的说法，和出处列表 { target 含 #^块, file 文件名, alias, label }
function wikiSources(text) {
    const sources = [], seen = new Set();
    const claim = String(text).replace(/（([^（）]*\[\[[^（）]*)）/g, (m, inner) => {
        for (const x of inner.matchAll(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g)) {
            const target = x[1].trim(), file = target.split("#")[0].trim();
            if (/（wiki）$/.test(file) || seen.has(target)) continue;
            seen.add(target);
            sources.push({ target, file, alias: x[2] || "", label: x[2] || file });
        }
        return "";
    });
    return { claim: claim.replace(/\s+$/gm, ""), sources };
}

// ---------- 每日回顾 ----------
// 聚焦：和 Bullet 的 focus in / out 同一套动效——那张卡用 transform 从原来的位置滑到可视区正中，260ms、同一条缓动曲线；
// 聚焦时只留这一张（其余条目和 Wiki 回看、孤岛都收起）；换一张时旧的往上翻走、新的从下面翻上来；退出时滑回列表里的位置，其余的淡入
const GLIDE_MS = 260, GLIDE_EASE = "cubic-bezier(.2,.8,.2,1)";
const LIVE_WALK = ".sb-walk:not(.is-leaving):not(.is-exiting)";
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
// dy = 从多远滑过来（像素，正数 = 从下面）；from = 没有原来的位置时（新换上来的一张）从下面 / 上面多远淡入
function glide(el, dy, from = 28) {
    if (!el?.animate || reducedMotion()) return;
    if (dy == null) el.animate([{ transform: `translateY(${from}px)`, opacity: 0.2 }, { transform: "none", opacity: 1 }], { duration: GLIDE_MS, easing: GLIDE_EASE });
    else if (Math.abs(dy) >= 2) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: GLIDE_MS, easing: GLIDE_EASE });
}
// 翻页：dir = 1 往后翻（旧的绕上沿往上翻走、新的绕下沿从下面翻上来），-1 往前翻（倒过来）。两张同时动，翻的时候往后倒、变淡
const flipPose = (dy, deg) => `perspective(900px) translateY(${dy}px) rotateX(${deg}deg) scale(${dy ? 0.97 : 1})`;
function flipIn(el, dir = 1) {
    if (!el?.animate || reducedMotion()) return;
    el.animate([{ transform: flipPose(36 * dir, 26 * dir), transformOrigin: dir > 0 ? "50% 100%" : "50% 0%", opacity: 0 },
        { transform: flipPose(0, 0), transformOrigin: dir > 0 ? "50% 100%" : "50% 0%", opacity: 1 }], { duration: GLIDE_MS, easing: GLIDE_EASE });
}
class ReviewView extends ItemView {
    constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.shift = 0; this.orphanShift = 0; }
    getViewType() { return VIEW_REVIEW; }
    getDisplayText() { return "每日回顾"; }
    getIcon() { return "history"; }
    async onOpen() {
        this.registerDomEvent(document, "keydown", (evt) => this.onKey(evt));
        // 聚焦时 Esc 退出（capture，先于别的 Esc 处理）
        this.registerDomEvent(document, "keydown", (evt) => this.onFocusKey(evt), true);
        // ⌥⌘→ / ⌥⌘← 是 Bullet 命令的热键，Obsidian 的热键系统在 window 捕获阶段就接走了，DOM 监听收不到；
        // 挂在视图自己的 scope 上：这个视图是当前标签页时（主区或侧边栏都算）它排在全局热键前面
        this.scope = new Scope(this.app.scope);
        // 聚焦着的卡片变高变矮（图片加载完）或面板改了大小（拖侧边栏）：重新居中
        this.focusRO = new ResizeObserver(() => this.recenter());
        this.register(() => this.focusRO.disconnect());
        await this.render();
    }
    // 聚焦 / 退出聚焦：和 Bullet 的 zoom-in / zoom-out 用同一组键（默认 ⌥⌘→ / ⌥⌘←），跟着热键设置走，每次渲染重新绑一遍
    bindFocusKeys() {
        for (const h of this.focusHandlers || []) this.scope.unregister(h);
        const hm = this.app.hotkeyManager;
        const keysOf = (id, fallback) => hm?.getHotkeys?.(id) || hm?.getDefaultHotkeys?.(id) || fallback;
        const bind = (keys, fn) => (keys || []).map((h) => this.scope.register(h.modifiers || [], h.key, () => { fn(); return false; }));
        this.focusHandlers = [
            ...bind(keysOf("bullet:zoom-in", [{ modifiers: ["Alt", "Mod"], key: "ArrowRight" }]), () => this.focusIn()),
            ...bind(keysOf("bullet:zoom-out", [{ modifiers: ["Alt", "Mod"], key: "ArrowLeft" }]), () => this.focusOut()),
        ];
    }
    onFocusKey(evt) {
        if (!this.focused || evt.key !== "Escape" || evt.metaKey || evt.ctrlKey || evt.altKey || evt.shiftKey || evt.isComposing) return;
        if (this.app.workspace.getActiveViewOfType(ReviewView) !== this) return;
        this.focusOut();
        evt.preventDefault(); evt.stopPropagation();
    }
    focusIn() {
        const sel = this.selected?.isConnected && this.selected.matches(LIVE_WALK) ? this.selected : null;
        const c = sel || this.contentEl.querySelector(LIVE_WALK);
        if (!c) { new Notice("没有可以聚焦的卡片"); return; }
        if (this.focused && c.hasClass("is-focus")) return;
        const before = c.getBoundingClientRect().top;
        this.focused = true;
        this.contentEl.addClass("sb-focus-mode");
        this.focusOn(c, before);
    }
    // 让 c 成为聚焦的那一张。before = 它原来在屏幕上的 top（滑过来）；null = 新换上来的，按 dir 翻上来（1 从下面，-1 从上面）
    focusOn(c, before, dir = 1) {
        this.contentEl.querySelectorAll(".sb-walk.is-focus").forEach((x) => { if (x !== c) { x.removeClass("is-focus", "has-more"); x.style.marginTop = ""; } });
        c.addClass("is-focus");
        c.toggleClass("has-more", this.contentEl.querySelectorAll(LIVE_WALK).length > 1 || !!this.walkQueue?.length);
        this.select(c);
        this.contentEl.scrollTop = 0;
        this.placeFocus(c);
        if (before == null) flipIn(c, dir);
        else glide(c, before - c.getBoundingClientRect().top);
        this.focusRO.disconnect();
        this.focusRO.observe(this.contentEl);
        this.focusRO.observe(c);
    }
    // 落点：放得下就让卡片中线对齐可视区中线（不管卡片多大）；放不下就贴着标题下面，往下滚着看
    // 用布局位置量（offsetTop / offsetHeight），不用 getBoundingClientRect：翻页、滑动动画正在播时后者带着 transform，落点会偏
    placeFocus(c) {
        c.style.marginTop = "";
        const el = this.contentEl;
        const topOf = () => { let y = 0, n = c; for (; n && n !== el; n = n.offsetParent) y += n.offsetTop; return n === el ? y : null; };
        const y = topOf();
        if (y == null) return;   // 量不出来（还没挂进面板）就不动
        const want = el.scrollTop + (el.clientHeight - c.offsetHeight) / 2;
        if (want <= y) return;   // 放不下：留在原位（标题下面），往下滚着看
        // marginTop 换掉的是卡片自带的外边距，要加回来；再复量一次，把外边距合并之类的误差补掉
        const base = parseFloat(getComputedStyle(c).marginTop) || 0;
        let push = base + want - y;
        c.style.marginTop = Math.round(push) + "px";
        push += want - topOf();
        c.style.marginTop = Math.round(Math.max(0, push)) + "px";
    }
    recenter() {
        const c = this.focused && this.contentEl.querySelector(".sb-walk.is-focus:not(.is-exiting)");
        if (!c) return;
        // 用 offsetTop 量（不含正在播的 transform）；正在翻 / 滑的时候只摆位置，不另起动画，免得两段动画抢
        const before = c.offsetTop;
        this.placeFocus(c);
        if (!c.getAnimations?.().length) glide(c, before - c.offsetTop);
    }
    // 换一张时旧的那张：复制一份浮在原处往上（dir = -1 往下）翻走，原来那张马上让位，新的同时翻上来
    flipOut(c, dir = 1) {
        if (!c?.isConnected || !c.animate || reducedMotion()) return;
        const el = this.contentEl, box = el.getBoundingClientRect(), r = c.getBoundingClientRect();
        const ghost = c.cloneNode(true);
        ghost.className = "sb-card sb-flip-ghost";
        Object.assign(ghost.style, { top: `${r.top - box.top - el.clientTop + el.scrollTop}px`, left: `${r.left - box.left - el.clientLeft}px`, width: `${r.width}px`, height: `${r.height}px`, marginTop: "0" });
        el.appendChild(ghost);
        const origin = dir > 0 ? "50% 0%" : "50% 100%";
        ghost.animate([{ transform: flipPose(0, 0), transformOrigin: origin, opacity: 1 },
            { transform: flipPose(-32 * dir, -34 * dir), transformOrigin: origin, opacity: 0 }], { duration: GLIDE_MS, easing: GLIDE_EASE, fill: "forwards" })
            .finished.catch(() => {}).then(() => ghost.remove());
    }
    focusOut() {
        if (!this.focused) return;
        const c = this.contentEl.querySelector(".sb-walk.is-focus");
        const before = c?.getBoundingClientRect().top;
        this.focused = false;
        this.focusRO.disconnect();
        this.contentEl.removeClass("sb-focus-mode");
        if (!c) return;
        c.removeClass("is-focus", "has-more");
        c.style.marginTop = "";
        c.scrollIntoView({ block: "nearest" });
        glide(c, before - c.getBoundingClientRect().top);
        // 其余的淡入，和 Bullet 退出聚焦时上下文变回来一样
        if (!reducedMotion()) for (const x of this.contentEl.querySelectorAll(".sb-sec, .sb-walk")) {
            if (x !== c && x !== c.parentElement) x.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: GLIDE_MS, easing: "ease" });
        }
    }
    // 键盘：点一下卡片选中它，↑↓ 换一张。只在这个面板是当前焦点时生效
    onKey(evt) {
        if (this.app.workspace.getActiveViewOfType(ReviewView) !== this) return;
        if (evt.metaKey || evt.ctrlKey || evt.altKey || evt.isComposing) return;
        if (evt.key !== "ArrowDown" && evt.key !== "ArrowUp") return;
        if (evt.target instanceof HTMLElement && evt.target.closest("input, textarea, select, [contenteditable='true']")) return;
        const cards = [...this.contentEl.querySelectorAll(LIVE_WALK)];
        if (!cards.length) return;
        const c = this.selected?.isConnected && this.selected.matches(LIVE_WALK) ? this.selected : null;
        evt.preventDefault();
        const i = c ? cards.indexOf(c) + (evt.key === "ArrowDown" ? 1 : -1) : 0;
        const to = cards[Math.max(0, Math.min(cards.length - 1, i))];
        // 聚焦时换一张：↓ 旧的往上翻走、下一张从下面翻上来；↑ 反过来
        if (this.focused) { if (to !== c) { const dir = evt.key === "ArrowDown" ? 1 : -1; this.flipOut(c, dir); this.focusOn(to, null, dir); } }
        else this.select(to, true);
    }
    select(c, scroll) {
        if (this.selected && this.selected !== c) this.selected.removeClass("is-selected");
        this.selected = c || null;
        if (!c) return;
        c.addClass("is-selected");
        if (scroll) c.scrollIntoView({ block: "nearest" });
    }
    async render() {
        // 渲染是异步的，连着触发两次会交错、叠出两份：每次编号，等完异步回来发现有更新的一次就不再往面板里写
        const seq = (this.renderSeq = (this.renderSeq || 0) + 1);
        const stale = () => seq !== this.renderSeq;
        const el = this.contentEl; el.empty(); el.addClass("sb-view", "sb-review");
        this.selected = null;
        this.bindFocusKeys();
        const today = M().format("YYYY-MM-DD");
        // 标题钉在面板顶上，条目在下面滚
        const top = el.createDiv({ cls: "sb-top" });
        const head = top.createDiv({ cls: "sb-head" });
        head.createEl("b", { text: `🗓 每日回顾 · ${today}` });
        const btns = head.createSpan({ cls: "sb-head-btns" });
        const fz = btns.createEl("button", { text: "◎", cls: "sb-focus-btn", attr: { "aria-label": "聚焦：只看一张（⌥⌘→ 进，⌥⌘← 或 Esc 出）" } });
        fz.onclick = () => (this.focused ? this.focusOut() : this.focusIn());
        const again = btns.createEl("button", { text: "↻", attr: { "aria-label": "重新抽" } });
        again.onclick = () => { this.shift++; this.orphanShift++; this.render(); };

        await this.renderWalk(el, today, stale);
        if (stale()) return;
        // 聚焦着重新抽：直接聚焦到新的第一张
        if (this.focused) { const f = el.querySelector(LIVE_WALK); if (f) this.focusOn(f, null); }
        await this.renderWiki(el, today, stale);
        if (stale()) return;
        await this.renderOrphans(el, today);
    }
    // fold = 能折叠的小节的键：点标题开合，记在设置 secFold 里
    section(el, title, hint, fold) {
        const s = el.createDiv({ cls: "sb-sec" });
        const h = s.createDiv({ cls: "sb-sec-h" });
        h.createEl("span", { text: title });
        if (hint) h.createEl("span", { text: hint, cls: "sb-hint" });
        if (fold) {
            const p = this.plugin, folds = (p.settings.secFold ||= {});
            s.addClass("is-foldable");
            s.toggleClass("is-folded", !!folds[fold]);
            h.onclick = async () => { folds[fold] = !folds[fold]; s.toggleClass("is-folded", folds[fold]); await p.saveSettings(); };
        }
        return s;
    }
    card(parent, file, line, text, label) {
        const c = parent.createDiv({ cls: "sb-card" });
        const meta = c.createDiv({ cls: "sb-meta" });
        meta.createEl("span", { text: label || file.basename });
        const body = c.createDiv({ cls: "sb-text" });
        const t = plain(text);
        body.setText(t.length > 220 ? t.slice(0, 219) + "…" : t);
        // 只有 ⌘ 点击才打开原文：平时点、拖着选文字都不跳
        c.onclick = (evt) => { if (Keymap.isModEvent(evt)) this.plugin.openAt(file, line, evt); };
        c.addEventListener("mouseover", (evt) => this.app.workspace.trigger("hover-link", { event: evt, source: VIEW_REVIEW, hoverParent: this, targetEl: c, linktext: file.path, state: { scroll: line } }));
        return c;
    }
    // Wiki 漫步：从 LLM Wiki 的条目里抽（近一年的、链到 boostLinks 那些页的更容易抽到），同一天抽到的固定，点 ↻ 换一批
    // 刷卡（#card 卡片、==挖空==、Anki 作答）在 Card Walk 插件里
    async renderWalk(el, today, stale = () => false) {
        const p = this.plugin, n = p.settings.reviewCount;
        const pool = await p.walkPool();
        if (stale()) return;
        const rand = rng(today + "#" + this.shift + "#wiki");
        // 近一年记的权重乘上 recentBoost；链到 boostLinks 里那些页的再乘 linkBoost。两样都占就相乘
        const yearAgo = Date.now() - 365 * 864e5, boost = Math.max(1, Number(p.settings.recentBoost) || 1);
        const hot = new Set(String(p.settings.boostLinks || "").split(/[,，\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean));
        const lboost = Math.max(1, Number(p.settings.linkBoost) || 1);
        const list = weightedShuffle(pool.wiki, rand, (it) => (it.at >= yearAgo ? boost : 1) * (it.links?.some((x) => hot.has(x)) ? lboost : 1));
        const s = this.section(el, "🎲 Wiki 漫步", `Wiki ${pool.wiki.length}`);
        s.addClass("sb-walk-sec");
        if (!list.length) { s.createDiv({ text: "没有 Wiki 条目", cls: "sb-hint" }); return; }
        for (const it of list.slice(0, n)) this.walkCard(s, it);
    }
    walkCard(parent, it) {
        const p = this.plugin;
        const c = parent.createDiv({ cls: "sb-card sb-walk is-wiki" });
        const meta = c.createDiv({ cls: "sb-meta" });
        meta.createEl("span", { text: `📚 Wiki · ${it.file.basename.replace(/（wiki）$/, "")}` });
        // 母块：包着这一条的各层，从外到内；⌘ 点哪一层跳到哪一层
        if (it.ctx?.length) {
            const bc = c.createDiv({ cls: "sb-crumbs" });
            it.ctx.forEach((x, i) => {
                if (i) bc.createSpan({ cls: "sb-crumb-sep", text: " › " });
                const t = plain(x.text);
                const a = bc.createSpan({ cls: "sb-crumb", text: t.length > 40 ? t.slice(0, 39) + "…" : t, attr: { "aria-label": t.length > 40 ? t : "" } });
                a.onclick = (evt) => { evt.stopPropagation(); if (Keymap.isModEvent(evt)) p.openAt(it.file, x.line, evt); };
            });
        }
        // 按 Markdown 渲染（图片、加粗、链接、列表都正常显示）；点里面的双链跳过去，⌘ 点别处打开原文
        const body = c.createDiv({ cls: "sb-text sb-md markdown-rendered" });
        body.addEventListener("click", (evt) => {
            const a = evt.target.closest("a.internal-link");
            if (!a) { if (evt.target.closest("a, img")) evt.stopPropagation(); return; }
            evt.preventDefault(); evt.stopPropagation();
            this.app.workspace.openLinkText(a.getAttribute("data-href") || a.getAttribute("href"), it.file.path, Keymap.isModEvent(evt));
        });
        MarkdownRenderer.render(this.app, cardMd(it.text), body, it.file.path, this);
        // 点一下 = 选中，好用键盘换卡；只有 ⌘ 点击才打开原文，平时点、拖着选文字都不跳
        c.addEventListener("mousedown", () => this.select(c));
        c.onclick = (evt) => { if (Keymap.isModEvent(evt)) p.openAt(it.file, it.line, evt); };
    }
    // Wiki 回看：LLM Wiki 页里「存疑」「冲突」「你自己的判断」「还没回答的问题」这些小节下的条目，每天抽两条
    async renderWiki(el, today, stale = () => false) {
        const items = await this.plugin.wikiReviewItems();
        if (!items.length || stale()) return;
        const s = this.section(el, "📚 Wiki 回看", "", "wiki");
        const rand = rng(today + "#w" + this.shift);
        for (const it of shuffle(items, rand).slice(0, 2)) this.card(s, it.file, it.line, it.text, `📚 ${it.page} · ${it.kind}`);
    }
    // 孤岛笔记：没有任何笔记链接到它的非日记笔记
    async renderOrphans(el, today) {
        const n = this.plugin.settings.orphanCount;
        const orphans = this.plugin.orphans();
        const s = this.section(el, "🏝 孤岛笔记", `${orphans.length} 篇`, "orphans");
        const rand = rng(today + "#o" + this.orphanShift);
        for (const f of shuffle(orphans, rand).slice(0, n)) {
            const fm = this.app.metadataCache.getFileCache(f)?.frontmatter || {};
            const text = await this.app.vault.cachedRead(f);
            const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
            const c = this.card(s, f, 0, fm.def ? String(fm.def) : body.slice(0, 200) || "（空页）", `📄 ${f.basename}`);
            const row = c.createDiv({ cls: "sb-actions" });
            const rel = row.createEl("button", { text: "🧭 找相关" });
            if (MOBILE) rel.hide();
            const dis = row.createEl("button", { text: "不再提醒" });
            const out = c.createDiv({ cls: "sb-rel" });
            rel.onclick = async (evt) => { evt.stopPropagation(); await this.suggestLinks(f, fm, body, out); };
            dis.onclick = async (evt) => {
                evt.stopPropagation();
                this.plugin.settings.dismissedOrphans.push(f.path);
                await this.plugin.saveSettings();
                c.remove();
            };
        }
    }
    async suggestLinks(f, fm, body, out) {
        out.empty();
        const idx = await this.plugin.ensureIndex((i, n) => out.setText(`建索引中… ${i}/${n}`));
        out.empty();
        const q = `${f.basename} ${f.basename} ${fm.def || ""} ${body.slice(0, 800)}`;
        const res = idx.search(q, { excludePath: f.path, limit: 4, perFile: 1, onlyNotes: true });
        if (!res.length) { out.setText("没找到明显相关的笔记"); return; }
        for (const r of res) {
            const tf = this.app.vault.getAbstractFileByPath(r.path);
            if (!(tf instanceof TFile)) continue;
            const row = out.createDiv({ cls: "sb-rel-row" });
            const a = row.createEl("a", { text: tf.basename });
            a.onclick = (evt) => { evt.stopPropagation(); this.plugin.openAt(tf, r.line, evt); };
            const add = row.createEl("button", { text: "在它末尾加链接" });
            add.onclick = async (evt) => {
                evt.stopPropagation();
                if (await bikeHasOpen(tf)) { await navigator.clipboard.writeText(`[[${f.basename}]]`); new Notice(`Bike 开着「${tf.basename}」，没直接写。链接已复制，去 Bike 里粘贴。`, 6000); return; }
                await this.app.vault.process(tf, (t) => t.replace(/\s*$/, "") + `\n- 相关：[[${f.basename}]]\n`);
                new Notice(`已在「${tf.basename}」末尾加上 [[${f.basename}]]`);
                add.disabled = true; add.setText("✓ 已加");
            };
        }
    }
}

// ---------- 相关笔记（写作模式） ----------
class RelatedView extends ItemView {
    constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.lastQuery = ""; this.seq = 0; this.semErr = ""; }
    getViewType() { return VIEW_RELATED; }
    getDisplayText() { return "相关笔记"; }
    getIcon() { return "sparkles"; }
    async onOpen() {
        const el = this.contentEl; el.empty(); el.addClass("sb-view");
        const head = el.createDiv({ cls: "sb-head" });
        head.createEl("b", { text: "✍️ 写作模式 · 相关笔记" });
        const exit = head.createEl("button", { text: "退出" });
        exit.onclick = () => this.plugin.setWriting(false);
        this.tools = el.createDiv({ cls: "sb-tools" });
        this.status = el.createDiv({ cls: "sb-hint" });
        this.list = el.createDiv();
        this.renderTools();
        await this.plugin.ensureIndex((i, n, name) => this.status.setText(`建索引… ${name ? name + " " : ""}${i}/${n}`));
        this.setStatus();
        this.update(true);
        this.runEmbed();
    }
    setStatus() {
        const idx = this.plugin.index;
        if (!idx) return;
        const c = idx.coverage();
        const sem = !idx.store ? "只按字面找" : this.semErr ? this.semErr : `按意思找 ${c.live ? Math.round(c.have / c.live * 100) : 0}%（${this.plugin.settings.embedModel}）`;
        this.status.setText(`${c.live} 块 · ${sem} · 跟着光标所在段落更新`);
    }
    // 后台补算向量：算好的部分立刻能用，不用等全部算完
    async runEmbed() {
        const idx = this.plugin.index;
        if (!idx || !idx.store || idx.embedding || !idx.missing) return;
        try {
            this.semErr = "";
            await idx.embedMissing((d, n) => this.status.setText(`正在算语义向量 ${d}/${n}（第一次要十来分钟，可以先写）`));
        } catch (e) {
            console.warn("[second-brain] embed", e);
            this.semErr = "连不上 Ollama，暂时只按字面找";
        }
        this.setStatus();
        this.lastQuery = ""; this.update(true);
    }
    renderTools() {
        const t = this.tools; t.empty();
        const f = this.plugin.writingFile();
        const b1 = t.createEl("button", { text: "🤖 Claudian" });
        b1.onclick = () => this.plugin.openClaudian();
        if (this.plugin.app.plugins.plugins[MTT_ID]) {
            const bt = t.createEl("button", { text: "🧰 文本工具" });
            bt.onclick = () => this.plugin.openTextTools();
        }
        const dd = this.plugin.app.plugins.plugins["draft-desk"];
        if (dd?.renderButtons) dd.renderButtons(t, () => this.plugin.writingView());
        // 追问成稿：qws-bridge 自己画按钮（带进度，在稿子里也认得出原选题）；老版本没有这个钩子时退回两个按钮
        const qb = this.plugin.app.plugins.plugins["qws-bridge"];
        if (f && qb?.renderButtons) qb.renderButtons(t, f, this.plugin.isTopic(f));
        else if (f && this.plugin.isTopic(f)) {
            const b2 = t.createEl("button", { text: "🎤 QWS 采访" });
            b2.onclick = () => this.plugin.runQws(f, "qws");
            const b3 = t.createEl("button", { text: "🔥 grill-me" });
            b3.onclick = () => this.plugin.runQws(f, "grill");
        }
    }
    async update(force = false) {
        const view = this.plugin.writingView();
        if (!view || !this.plugin.index?.ready) return;
        const idx = this.plugin.index;
        await idx.refreshDirty();
        if (idx.missing && !idx.embedding && !this.semErr) this.runEmbed();
        const q = this.plugin.queryAtCursor(view);
        if (!force && q === this.lastQuery) return;
        this.lastQuery = q;
        const seq = ++this.seq;
        let qvec = null;
        if (idx.store && idx.store.n && q.trim() && !this.semErr) {
            try { qvec = (await this.plugin.embedTexts([q.slice(0, 1200)], true))[0]; } catch (e) { this.semErr = "连不上 Ollama，暂时只按字面找"; this.setStatus(); }
            if (seq !== this.seq || !this.plugin.index) return;   // 等向量的时候光标又动了 / 已经退出
        }
        const isWiki = (b) => this.plugin.isWikiBlock(b);
        // LLM Wiki 的条目是整理过、带出处的，单列在最前；普通笔记照旧
        const wres = idx.search(q, { excludePath: view.file?.path, limit: 3, perFile: 1, qvec, only: (b) => isWiki(b) && b.line > 0 });
        const res = idx.search(q, { excludePath: view.file?.path, limit: 14, perFile: 2, qvec, only: (b) => !this.plugin.inWikiFolder(b) });   // Wiki 的目录、日志、规则页不当素材
        this.list.empty();
        if (!q.trim()) { this.list.createDiv({ text: "开始写，这里会列出库里和这段相近的内容。", cls: "sb-hint" }); return; }
        if (!res.length && !wres.length) { this.list.createDiv({ text: "这段没找到相近的内容。", cls: "sb-hint" }); return; }
        if (wres.length) {
            this.list.createDiv({ cls: "sb-group-h", text: "📚 Wiki" });
            for (const r of wres) this.wikiCard(r);
            if (res.length) this.list.createDiv({ cls: "sb-group-h", text: "📝 笔记" });
        }
        for (const r of res) {
            // 外部库的块：没有 TFile，用 obsidian:// 链接跳到那个库
            const ext = r.ext;
            const f = ext ? null : this.app.vault.getAbstractFileByPath(r.path);
            if (!ext && !(f instanceof TFile)) continue;
            const base = ext ? ext.rel.split("/").pop().replace(/\.md$/, "") : f.basename;
            const uri = ext ? obsUri(ext.vault, ext.rel) : "";
            const linkText = ext ? `[${base}](${uri})` : `[[${base}]]`;
            const jd = journalDate(base);
            const c = this.list.createDiv({ cls: "sb-card" });
            const meta = c.createDiv({ cls: "sb-meta" });
            meta.createEl("span", { text: (jd ? `📓 ${jd.format("YYYY-MM-DD")}` : `📄 ${base}`) + (ext ? ` · ${ext.vault}` : "") });
            const t = plain(r.text);
            c.createDiv({ cls: "sb-text", text: t.length > 200 ? t.slice(0, 199) + "…" : t });
            const row = c.createDiv({ cls: "sb-actions" });
            const link = row.createEl("button", { text: "↪ 插入链接" });
            link.onclick = (evt) => { evt.stopPropagation(); this.plugin.insertAtCursor(linkText); this.plugin.recordSource(base, ext); };
            const quote = row.createEl("button", { text: "❝ 引用" });
            quote.onclick = (evt) => { evt.stopPropagation(); this.plugin.insertAtCursor(`\n> ${t.slice(0, 300)}\n> —— ${linkText}\n`); this.plugin.recordSource(base, ext); };
            c.onclick = (evt) => (ext ? window.open(uri) : this.plugin.openAt(f, r.line, evt));
            if (!ext) c.addEventListener("mouseover", (evt) => this.app.workspace.trigger("hover-link", { event: evt, source: VIEW_RELATED, hoverParent: this, targetEl: c, linktext: f.path, state: { scroll: r.line } }));
        }
    }
    // Wiki 条目：引用 / 插入链接时，出处用条目后面括号里的原笔记块链接（你自己的原话），不用 wiki 页这个二手转述
    wikiCard(r) {
        const ext = r.ext;
        const f = ext ? null : this.app.vault.getAbstractFileByPath(r.path);
        if (!ext && !(f instanceof TFile)) return;
        const rel = ext ? ext.rel : r.path;
        const page = rel.split("/").pop().replace(/\.md$/, "");
        const pageUri = ext ? obsUri(ext.vault, rel) : "";
        const pageLink = ext ? `[${page}](${pageUri})` : `[[${page}]]`;
        const { claim, sources } = wikiSources(r.text);
        // 外部库：块链接在稿子库里跳不过去，改成 obsidian:// 打开那篇
        const srcLinks = sources.map((x) => (ext ? `[${x.label}](${obsUri(ext.vault, x.file)})` : `[[${x.target}${x.alias ? "|" + x.alias : ""}]]`));
        const c = this.list.createDiv({ cls: "sb-card sb-wiki" });
        const meta = c.createDiv({ cls: "sb-meta" });
        meta.createEl("span", { text: `📚 ${page.replace(/（wiki）$/, "")}` + (ext ? ` · ${ext.vault}` : "") });
        meta.createEl("span", { cls: "sb-hint", text: sources.length ? `出处 ${sources.length}` : "无出处" });
        const t = plain(claim);
        c.createDiv({ cls: "sb-text", text: t.length > 220 ? t.slice(0, 219) + "…" : t });
        const row = c.createDiv({ cls: "sb-actions" });
        const record = () => { if (sources.length) for (const x of sources) this.plugin.recordSource(x.file, ext); else this.plugin.recordSource(page, ext); };
        const link = row.createEl("button", { text: sources.length ? "↪ 链出处" : "↪ 插入链接", attr: { "aria-label": sources.length ? "插入原笔记的块链接" : "这条没有出处（多半是 wiki 的通识补充），插入 wiki 页链接" } });
        link.onclick = (evt) => { evt.stopPropagation(); this.plugin.insertAtCursor(srcLinks.length ? srcLinks.join(" · ") : pageLink); record(); };
        const quote = row.createEl("button", { text: "❝ 引用" });
        quote.onclick = (evt) => { evt.stopPropagation(); this.plugin.insertAtCursor(`\n> ${t.slice(0, 300)}\n> —— ${srcLinks.length ? srcLinks.join(" · ") : pageLink + "（wiki 整理，无原笔记出处）"}\n`); record(); };
        c.onclick = (evt) => (ext ? window.open(pageUri) : this.plugin.openAt(f, r.line, evt));
        if (!ext) c.addEventListener("mouseover", (evt) => this.app.workspace.trigger("hover-link", { event: evt, source: VIEW_RELATED, hoverParent: this, targetEl: c, linktext: f.path, state: { scroll: r.line } }));
    }
}

// ---------- 插件 ----------
module.exports = class SecondBrain extends Plugin {
    async onload() {
        this.settings = Object.assign({}, DEFAULTS, await this.loadData());
        if (MOBILE) return this.onloadMobile();
        this.index = null;
        this.writing = false;
        this.registerView(VIEW_REVIEW, (leaf) => new ReviewView(leaf, this));
        this.registerView(VIEW_RELATED, (leaf) => new RelatedView(leaf, this));
        this.registerHoverLinkSource(VIEW_REVIEW, { display: "每日回顾", defaultMod: true });
        this.registerHoverLinkSource(VIEW_RELATED, { display: "相关笔记", defaultMod: true });
        this.addSettingTab(new SBSettings(this.app, this));

        if (this.settings.enableReview) this.addRibbonIcon("history", "每日回顾", () => this.openReview(true));
        this.addRibbonIcon("pen-tool", "写作模式：开 / 关", () => this.setWriting(!this.writing));
        this.addCommand({ id: "open-review", name: "打开每日回顾", callback: () => this.openReview(true) });
        this.addCommand({ id: "toggle-writing", name: "写作模式：开 / 关", callback: () => this.setWriting(!this.writing) });
        this.addCommand({ id: "weekly-report", name: "生成本周库周报", callback: () => this.weeklyReport(true) });
        this.addCommand({ id: "rebuild-index", name: "重建相关笔记索引", callback: async () => { this.index = null; await this.ensureIndex(); new Notice(`索引完成：${this.index.blocks.length} 块`); } });
        this.addCommand({ id: "build-vectors", name: "建立 / 更新语义索引（后台算向量）", callback: () => this.buildVectors() });

        this.statusEl = this.addStatusBarItem();
        this.statusEl.addClass("sb-status");
        this.statusEl.onclick = () => this.setWriting(false);
        this.statusEl.hide();

        this.registerEvent(this.app.vault.on("modify", (f) => { if (this.index) this.index.dirty.add(f.path); }));
        this.registerEvent(this.app.vault.on("delete", (f) => { if (this.index) this.index.dirty.add(f.path); }));
        this.registerEvent(this.app.vault.on("rename", (f, old) => { if (this.index) { this.index.dirty.add(old); this.index.dirty.add(f.path); } }));
        this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
            if (leaf?.view instanceof MarkdownView) { this.lastMd = leaf.view; if (this.writing) this.relatedViews().forEach((v) => { v.renderTools(); v.update(true); }); }
        }));
        // 光标移动没有事件，写作模式下每 1.5 秒看一眼光标所在段落有没有变
        this.registerInterval(window.setInterval(() => { if (this.writing) this.relatedViews().forEach((v) => v.update()); }, 1500));

        this.app.workspace.onLayoutReady(async () => {
            // 上次退出时留下的相关笔记面板、文本工具工作台收掉（写作模式不跨重启保留，免得一打开库就冒出来）
            this.closeWritingPanes();
            const today = M().format("YYYY-MM-DD");
            if (!this.settings.enableReview) return;
            if (this.settings.autoOpenReview && this.settings.lastAutoOpen !== today) {
                this.settings.lastAutoOpen = today; await this.saveSettings();
                await this.openReview(false);
            }
            if (this.settings.autoWeeklyReport) setTimeout(() => this.weeklyReport(false), 20000);
        });
    }
    // 手机上：只有每日回顾
    async onloadMobile() {
        const own = await this.readSync("mobile-state.json");
        for (const k of DEVICE_KEYS) if (own && own[k] !== undefined) this.settings[k] = own[k];
        this.registerView(VIEW_REVIEW, (leaf) => new ReviewView(leaf, this));
        if (this.settings.enableReview) this.addRibbonIcon("history", "每日回顾", () => this.openReview(true));
        this.addCommand({ id: "open-review", name: "打开每日回顾", callback: () => this.openReview(true) });
    }
    onunload() {
        if (MOBILE) return;
        document.body.removeClass("sb-writing"); clearTimeout(this.lookupTimer);
    }
    async saveSettings() {
        if (MOBILE) return this.writeSync("mobile-state.json", Object.fromEntries(DEVICE_KEYS.map((k) => [k, this.settings[k]])));
        await this.saveData(this.settings);
    }
    // ----- 手机上自己的那几项设置写进插件目录下的 sync/mobile-state.json（跟着库走 iCloud，只有手机写）-----
    syncPath(name) { return `${this.manifest.dir}/${SYNC_DIR}/${name}`; }
    async readSync(name) {
        try { const a = this.app.vault.adapter, f = this.syncPath(name); return (await a.exists(f)) ? JSON.parse(await a.read(f)) : null; }
        catch (e) { console.warn("[second-brain] 读不了", name, e); return null; }
    }
    async writeSync(name, data) {
        const a = this.app.vault.adapter, dir = `${this.manifest.dir}/${SYNC_DIR}`;
        if (!(await a.exists(dir))) await a.mkdir(dir);
        await a.write(this.syncPath(name), JSON.stringify(data));
    }
    extraVaults() {
        return String(this.settings.extraVaults || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
            const k = l.indexOf("|");
            return k > 0 ? { name: l.slice(0, k).trim(), root: l.slice(k + 1).trim().replace(/^~(?=\/)/, nos.homedir()) } : null;
        }).filter((x) => x && nfs.existsSync(x.root));
    }
    // 调本机 Ollama 算向量，返回归一化的 Float32Array
    async embedTexts(texts, isQuery) {
        const s = this.settings;
        const [, qp, dp] = MODEL_PROMPT.find(([re]) => re.test(s.embedModel)) || [null, "", ""];
        const body = { model: s.embedModel, input: texts.map((t) => (isQuery ? qp : dp) + t), truncate: true };
        if (s.embedDims) body.dimensions = s.embedDims;
        const r = await requestUrl({ url: String(s.ollamaUrl).replace(/\/$/, "") + "/api/embed", method: "POST", contentType: "application/json", body: JSON.stringify(body) });
        return r.json.embeddings.map((v) => {
            const a = Float32Array.from(v);
            let n = 0; for (let i = 0; i < a.length; i++) n += a[i] * a[i];
            n = Math.sqrt(n) || 1; for (let i = 0; i < a.length; i++) a[i] /= n;
            return a;
        });
    }
    async buildVectors() {
        const keep = this.writing;
        const idx = await this.ensureIndex();
        if (!idx.store) { new Notice("设置里没开语义检索"); return; }
        const note = new Notice("语义索引：准备中…", 0);
        try {
            await idx.embedMissing((d, n) => note.setMessage(`语义索引：${d}/${n}`));
            const c = idx.coverage();
            note.setMessage(`语义索引完成：${c.have}/${c.live} 块有向量`);
        } catch (e) { note.setMessage("语义索引失败：连不上 Ollama（" + (e.message || e) + "）"); }
        setTimeout(() => note.hide(), 6000);
        if (!keep && !this.writing) this.index = null;
    }
    // ----- 给 Card Walk 用（按意思把卡片归到学科）：一组文字的单位向量，按内容哈希缓存（和以前刷卡归学科是同一份缓存，不用重算）；没开语义检索返回 null -----
    async embedCached(texts) {
        if (MOBILE || !this.settings.semantic) return null;
        const store = (this.cardVecs ||= new VectorStore(this.settings.embedModel + "-cards", this.settings.embedDims || 768));
        const hs = texts.map((x) => hashOf(x));
        const byH = new Map(texts.map((x, i) => [hs[i], x]));
        const need = [...new Set(hs.filter((h) => store.idx(h) < 0))];
        for (let i = 0; i < need.length; i += 32) {
            const batch = need.slice(i, i + 32);
            const vs = await this.embedTexts(batch.map((h) => byH.get(h)), false);
            store.addMany(batch.map((h, k) => ({ h, vec: vs[k] })));
        }
        return store.vecsOf(hs.map((h) => store.idx(h)));
    }
    // ----- 给别的插件用（LLM Wiki 找「待摄入」）-----
    // 把 files 切成块，算每块和每组查询的语义相似度（组内取最高）：queries = { 组名: [查询句…] }
    // 返回 [{ path, line, end, title 是不是标题块, text, h, sims: { 组名: 0~1 } }]。缓存里没有向量的块现算；没开语义 / 连不上 Ollama 就抛错，调用方自己退回按关键词找
    async semanticBlocks(files, queries) {
        const s = this.settings;
        if (!s.semantic || !s.embedModel) throw new Error("第二大脑没开语义检索");
        const store = this.index?.store || (this.lookup ||= new VectorStore(s.embedModel, s.embedDims, true));
        clearTimeout(this.lookupTimer);
        this.lookupTimer = setTimeout(() => { this.lookup = null; }, 10 * 60 * 1000);   // 十分钟没人用就放掉
        const qkeys = Object.keys(queries), qtexts = [], qgroup = [];
        for (const k of qkeys) for (const q of queries[k]) { qtexts.push(String(q).slice(0, 1200)); qgroup.push(k); }
        this.qcache ||= new Map();
        const needQ = [...new Set(qtexts.filter((q) => !this.qcache.has(q)))];
        for (let i = 0; i < needQ.length; i += 32) {
            const vs = await this.embedTexts(needQ.slice(i, i + 32), true);
            needQ.slice(i, i + 32).forEach((q, k) => this.qcache.set(q, vs[k]));
        }
        const qv = qtexts.map((q) => this.qcache.get(q));
        const tmp = new BlockIndex(this);
        const out = [];
        for (const f of files) {
            for (const b of await tmp.blocksOf(f, true)) {
                const text = b.text.slice(0, 1200);   // 和建索引时一样截断，哈希才对得上缓存
                if (!tokenize(text).length) continue;
                out.push({ path: f.path, line: b.line, end: b.end, title: b.title, text, h: hashOf(text) });
            }
            await sleep(0);
        }
        const todo = [...new Map(out.filter((b) => store.idx(b.h) < 0).map((b) => [b.h, b.text])).entries()];
        for (let i = 0; i < todo.length; i += 32) {
            const batch = todo.slice(i, i + 32);
            const vs = await this.embedTexts(batch.map((x) => x[1]), false);
            store.addMany(batch.map((x, k) => ({ h: x[0], vec: vs[k] })));
        }
        const vecs = store.vecsOf(out.map((b) => store.idx(b.h)));
        out.forEach((b, j) => {
            const v = vecs[j];
            b.sims = {};
            for (const k of qkeys) b.sims[k] = 0;
            if (!v) return;
            qv.forEach((q, qi) => {
                let d = 0; for (let x = 0; x < q.length; x++) d += q[x] * v[x];
                if (d > b.sims[qgroup[qi]]) b.sims[qgroup[qi]] = d;
            });
        });
        return out;
    }
    // ----- 给别的插件用（稿件台：填坑、概念锚点检索）-----
    // 在素材库里找和 query 意思相近的块：[{ vault, rel, line, text, score }]。vault 是外部素材库的名字就搜那个库，是本库的名字就搜本库；没开语义 / 连不上 Ollama 就只按字面找
    // 不在写作模式时借用索引，十分钟没人用就放掉
    // question：query 是一个问题（不是一段正文）。设置 queryFilters 开着时，从里面认出时间和文件夹先圈范围（见 parseQuery），剩下的部分再去找
    // dateFrom / dateTo / folder：直接指定范围，和 IndexStore.search 一样。返回的数组带 .filter（实际用的范围，给人看的说明），没圈范围就没有
    async searchExtra(query, { vault = null, limit = 12, perFile = 2, exclude = null, question = false, dateFrom = null, dateTo = null, folder = null } = {}) {
        const pq = question && this.settings.queryFilters ? this.parseQuery(query) : { query: String(query) };
        query = pq.query;
        const range = { dateFrom: dateFrom ?? pq.dateFrom ?? null, dateTo: dateTo ?? pq.dateTo ?? null, folder: folder ?? pq.folder ?? null };
        const idx = await this.ensureIndex();
        if (!this.writing) {
            clearTimeout(this.idxTimer);
            this.idxTimer = setTimeout(() => { if (!this.writing) this.index = null; }, 10 * 60 * 1000);
        }
        let qvec = null;
        if (idx.store && idx.store.n) { try { qvec = (await this.embedTexts([String(query).slice(0, 1200)], true))[0]; } catch (e) { /* 连不上 Ollama：只按字面找 */ } }
        const self = this.app.vault.getName();
        const where = (b) => (b.ext ? { vault: b.ext.vault, rel: b.ext.rel } : { vault: self, rel: b.path });
        const res = idx.search(String(query), { limit, perFile, qvec, ...range, only: (b) => { const w = where(b); return (!vault || w.vault === vault) && !(exclude && exclude(w.rel, b.line, b.text)); } })
            .map((b) => ({ ...where(b), line: b.line, text: b.text, score: b.score }));
        if (range.dateFrom || range.dateTo || range.folder) res.filter = { ...range, query, label: pq.label || "" };
        return res;
    }
    // 从问题里认出时间和文件夹（规则见 parseQueryFilters）。文件夹只认库里的顶层文件夹；「今天」按螺旋日程的日期分界（凌晨分界前算前一天）
    parseQuery(query) {
        const folders = (this.app.vault.getRoot().children || []).filter((f) => f.children).map((f) => f.name);
        const ns = this.app.plugins.plugins["nautilus-spiral"];
        let now = window.moment();
        if (ns?.today) { try { now = window.moment(ns.today()); } catch (e) { /* 用本机日期 */ } }
        return parseQueryFilters(query, { now, folders });
    }
    // 插入了哪条素材：记进正在写的这篇的属性「素材」；在稿子库里，再记到主库里挂着这篇稿子的选题页（属性「用到的素材」）
    async recordSource(base, ext) {
        const v = this.writingView();
        if (!v?.file) return;
        const label = `[[${base}]]`;
        try {
            await this.app.fileManager.processFrontMatter(v.file, (fm) => {
                const cur = [fm["素材"]].flat().filter(Boolean).map(String);
                if (!cur.includes(label)) cur.push(label);
                fm["素材"] = cur;
            });
        } catch (e) { console.warn("[second-brain] 素材", e); }
        // 稿子在本库（单库写作）：选题页的 稿件: 链到这篇的，记进它的「用到的素材」
        const topics = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("选题/") && !f.path.startsWith("选题/_采访/")
            && (this.app.metadataCache.getFileCache(f)?.frontmatterLinks || []).some((l) => /^稿件(\.\d+)?$/.test(l.key)
                && this.app.metadataCache.getFirstLinkpathDest(l.link, f.path)?.path === v.file.path));
        if (topics.length === 1) {
            try {
                await this.app.fileManager.processFrontMatter(topics[0], (fm) => {
                    const cur = [fm["用到的素材"]].flat().filter(Boolean).map(String);
                    if (!cur.includes(label)) cur.push(label);
                    fm["用到的素材"] = cur;
                });
            } catch (e) { console.warn("[second-brain] 选题页", e); }
            return;
        }
        if (!ext) return;
        const xv = this.extraVaults().find((x) => x.name === ext.vault);
        if (!xv) return;
        try {
            const dir = npath.join(xv.root, "选题");
            const draft = v.file.path;
            const hits = [];
            for (const name of nfs.readdirSync(dir)) {
                if (!name.endsWith(".md")) continue;
                const p = npath.join(dir, name);
                const text = nfs.readFileSync(p, "utf8");
                const fm = (text.match(/^---\n([\s\S]*?)\n---/) || [])[1] || "";
                const m = fm.match(/^稿件:([\s\S]*?)(?=^\S|\s*$(?![\s\S]))/m);
                if (m && m[1].includes(draft)) hits.push({ p, text });
            }
            if (hits.length !== 1) return;   // 没挂选题，或者挂了好几个，就不猜
            const nt = fmListAdd(hits[0].text, "用到的素材", label);
            if (nt) nfs.writeFileSync(hits[0].p, nt);
        } catch (e) { console.warn("[second-brain] 选题页", e); }
    }
    // LLM Wiki 的文件夹（装了 llm-wiki 就跟它的设置走）
    wikiFolder() { return String(this.app.plugins.plugins["llm-wiki"]?.settings?.folder || "Wiki").replace(/\/$/, ""); }
    // 每日回顾用：wiki 页里值得回头看的条目（小节标题里有这些字的，取下面的顶层列表项连同子项）
    async wikiReviewItems() {
        const KINDS = [[/存疑/, "存疑"], [/冲突/, "冲突"], [/你自己的判断|你的判断/, "你的判断"], [/没回答|没展开/, "没回答的问题"]];
        const folder = this.wikiFolder() + "/";
        const out = [];
        for (const f of this.app.vault.getMarkdownFiles()) {
            if (!f.path.startsWith(folder) || !/（wiki）$/.test(f.basename)) continue;
            const c = this.app.metadataCache.getFileCache(f) || {};
            const hs = c.headings || [];
            if (!hs.some((h) => KINDS.some(([re]) => re.test(h.heading)))) continue;
            const L = (await this.app.vault.cachedRead(f)).split("\n");
            const tops = [];
            for (const it of c.listItems || []) {
                if (it.parent < 0) tops.push({ s: it.position.start.line, e: it.position.end.line });
                else if (tops.length) tops[tops.length - 1].e = Math.max(tops[tops.length - 1].e, it.position.end.line);
            }
            hs.forEach((h, i) => {
                const kind = KINDS.find(([re]) => re.test(h.heading))?.[1];
                if (!kind) return;
                const next = hs.slice(i + 1).find((x) => x.level <= h.level);
                const a = h.position.start.line, b = next ? next.position.start.line : L.length;
                for (const t of tops) if (t.s > a && t.s < b) {
                    const text = L.slice(t.s, t.e + 1).join("\n");
                    if (plain(text).length >= 12) out.push({ file: f, line: t.s, text, page: f.basename.replace(/（wiki）$/, ""), kind });
                }
            });
        }
        return out;
    }
    inWikiFolder(b) { return (b.ext ? b.ext.rel : b.path).startsWith(this.wikiFolder() + "/"); }
    isWikiBlock(b) { return this.inWikiFolder(b) && /（wiki）\.md$/.test(b.ext ? b.ext.rel : b.path); }
    excludeList() { return String(this.settings.excludeFolders).split(/[,，]\s*/).map((s) => s.trim()).filter(Boolean); }
    privateRe() {
        const names = String(this.settings.privateLinks).split(/[,，]\s*/).map((s) => s.trim()).filter(Boolean);
        return names.length ? new RegExp(`\\[\\[(?:[^\\]|]*/)?(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?:[|#\\]])`) : null;
    }
    journals() {
        const folder = this.settings.journalFolder.replace(/\/$/, "") + "/";
        const out = [];
        for (const f of this.app.vault.getMarkdownFiles()) {
            if (!f.path.startsWith(folder)) continue;
            const d = journalDate(f.basename);
            if (d && d.isValid()) out.push({ file: f, date: d });
        }
        return out;
    }
    // Wiki 漫步的素材：Wiki 页的顶层条目。结果留 10 分钟
    async walkPool() {
        if (this.pool && Date.now() - this.pool.at < 10 * 60 * 1000) return this.pool;
        const mc = this.app.metadataCache;
        const ex = this.excludeList(), priv = this.privateRe(), wf = this.wikiFolder() + "/";
        const isEx = (p) => ex.some((x) => p === x || p.startsWith(x.replace(/\/?$/, "/")));
        const pool = { wiki: [], at: Date.now() };
        let n = 0;
        for (const f of this.app.vault.getMarkdownFiles()) {
            if (isEx(f.path)) continue;
            if (++n % 50 === 0) await sleep(0);   // 让出界面
            const c = mc.getFileCache(f) || {};
            const items = c.listItems || [];
            if (!f.path.startsWith(wf) || !/（wiki）$/.test(f.basename) || !items.length) continue;
            const L = (await this.app.vault.cachedRead(f)).split("\n");
            // 这块是哪天记的：日记按日记的日期，别的笔记按文件建立的时间
            const jd = journalDate(f.basename), born = jd ? jd.valueOf() : f.stat.ctime;
            // 第 k 行所在的列表项，连同它的子项；不在列表里就取那一段。先一遍算好每行属于谁、每项的子树到哪一行（大文件上逐行去找会卡死界面）
            const owner = new Array(L.length).fill(null), endOf = new Map(), byLine = new Map();
            for (const sec of c.sections || []) for (let i = sec.position.start.line; i <= sec.position.end.line && i < L.length; i++) owner[i] = { s: sec.position.start.line, e: sec.position.end.line };
            for (const it of items) {
                const st = it.position.start.line;
                byLine.set(st, it);
                endOf.set(st, it.position.end.line);
                for (let i = st; i <= it.position.end.line && i < L.length; i++) owner[i] = st;
            }
            for (let i = items.length - 1; i >= 0; i--) {
                const it = items[i], p = it.parent;
                if (p >= 0 && endOf.has(p)) endOf.set(p, Math.max(endOf.get(p), endOf.get(it.position.start.line)));
            }
            const blockAt = (k) => {
                const o = owner[k];
                if (o == null) return { s: k, e: k };
                return typeof o === "number" ? { s: o, e: endOf.get(o) } : o;
            };
            const linksAt = new Map();
            for (const l of c.links || []) { const k = l.position.start.line; if (!linksAt.has(k)) linksAt.set(k, []); linksAt.get(k).push(l.link.split("|")[0].split("#")[0].trim()); }
            const lineItem = new Map(items.map((x) => [x.position.start.line, x]));
            const chain = (s0) => { const out = [s0]; let x = lineItem.get(s0), d = 0; while (x && x.parent >= 0 && x.parent !== x.position.start.line && d++ < 30) { out.push(x.parent); x = lineItem.get(x.parent); } return out; };
            // 上下文：包着这块的各层母块那一行，从外到内
            const ctxOf = (s0) => chain(s0).slice(1).reverse().map((k) => ({ line: k, text: (L[k] || "").replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?/, "").replace(/(^|\s)\^[\w-]+\s*$/, "").replace(/\s*#(card|flashcard|reversed)\b/gi, "").trim() })).filter((x) => x.text);
            const seen = new Set(), taken = [];
            const add = (kind, k) => {
                const b = blockAt(k);
                if (seen.has(b.s)) return;
                seen.add(b.s);
                taken.push(b);
                const text = L.slice(b.s, b.e + 1).join("\n");
                if (plain(text).length < 6 || (priv && priv.test(text))) return;
                // 这块连同上层母块链到的页（小写，给随机漫步按关键词加权用）
                const links = [...chain(b.s)];
                for (let k = b.s + 1; k <= b.e; k++) links.push(k);
                pool[kind].push({ kind, file: f, line: b.s, end: b.e, text, ctx: ctxOf(b.s), at: born,
                    links: [...new Set(links.flatMap((k) => linksAt.get(k) || []).map((n) => n.split("/").pop().toLowerCase()))] });
            };
            for (const it of items) if (it.parent < 0 && !/^\s*[-*+]\s+范围：/.test(L[it.position.start.line] || "")) add("wiki", it.position.start.line);
        }
        this.pool = pool;
        return pool;
    }
    orphans() {
        const inbound = new Set();
        const ex = this.excludeList(), dis = new Set(this.settings.dismissedOrphans);
        const isEx = (p) => ex.some((x) => p === x || p.startsWith(x.replace(/\/?$/, "/")));
        for (const [src, targets] of Object.entries(this.app.metadataCache.resolvedLinks)) if (!isEx(src)) for (const t of Object.keys(targets)) if (t !== src) inbound.add(t);
        return this.app.vault.getMarkdownFiles().filter((f) => {
            if (inbound.has(f.path) || dis.has(f.path) || journalDate(f.basename)) return false;
            if (isEx(f.path)) return false;
            const fm = this.app.metadataCache.getFileCache(f)?.frontmatter || {};
            if (fm.type === "看板" || [fm.cssclasses].flat().includes("no-backlinks")) return false;
            return true;
        });
    }
    // 切块方式改了：已经建好的索引按新切法重建，缺的向量后台补算；没建过就等下次用到时按新设置建
    async rebuildIndex() {
        if (!this.index) return;
        const n = new Notice("第二大脑：切块方式改了，重建索引…", 0);
        try {
            await this.index.build();
            if (this.index?.store) await this.index.embedMissing((d, t) => n.setMessage(`第二大脑：重算向量 ${d}/${t}`));
            n.setMessage("第二大脑：索引已按新切块重建");
        } catch (e) { n.setMessage("第二大脑：重建失败（" + (e.message || e) + "）"); }
        setTimeout(() => n.hide(), 6000);
    }
    async ensureIndex(onProgress) {
        if (!this.index) this.index = new BlockIndex(this);
        if (!this.index.ready) await this.index.build(onProgress);
        return this.index;
    }
    async openAt(file, line, evt) {
        const ws = this.app.workspace;
        const mod = evt && Keymap.isModEvent(evt);
        // 这篇已经在主区开着：切过去定位，不再开一个新标签（⌘⌥ 拆分 / 新窗口照旧另开）
        let leaf = mod === "split" || mod === "window" ? null : ws.getLeavesOfType("markdown").find((l) => {
            const root = l.getRoot();
            return root !== ws.leftSplit && root !== ws.rightSplit && (l.view?.file?.path || l.getViewState().state?.file) === file.path;
        });
        if (leaf) {
            await leaf.loadIfDeferred?.();
            ws.setActiveLeaf(leaf, { focus: true });
            await ws.revealLeaf(leaf);
            leaf.view.setEphemeralState?.({ line });
        } else {
            // 默认开新标签，免得把正在写 / 正在看的那篇换掉
            leaf = ws.getLeaf(mod || "tab");
            await leaf.openFile(file, { eState: { line } });
        }
        await this.settleScroll(leaf.view, line);
        // 跳过去之后让那一行停在正中、选中它的文字
        await sleep(60);
        await revealLine(leaf.view, line);
    }
    // 阅读视图是边滚边渲染的：大文件第一次打开，前面段落的高度还是估的，一次滚不到位（以前要点第二次才对）。
    // 滚完看顶上是不是那一行，不是就再定位一次，直到对上或者滚不动了（快到文末时顶不上去）
    async settleScroll(view, line) {
        if (view?.getMode?.() !== "preview") return;
        let last;
        for (let i = 0; i < 6; i++) {
            await sleep(i ? 120 : 60);
            const at = view.currentMode?.getScroll?.();
            if (at == null) continue;
            if (Math.abs(at - line) < 1 || at === last) return;
            last = at;
            view.setEphemeralState({ line });
        }
    }
    async openReview(reveal) {
        let leaf = this.app.workspace.getLeavesOfType(VIEW_REVIEW)[0];
        if (!leaf) { leaf = MOBILE ? this.app.workspace.getLeaf("tab") : this.app.workspace.getRightLeaf(false); await leaf.setViewState({ type: VIEW_REVIEW, active: reveal }); }
        else { await leaf.loadIfDeferred?.(); if (leaf.view?.render) await leaf.view.render(); }   // 后台标签是延迟加载的，先加载出来才能重画
        if (reveal) this.app.workspace.revealLeaf(leaf);
    }

    // ----- 写作模式 -----
    relatedViews() { return this.app.workspace.getLeavesOfType(VIEW_RELATED).map((l) => l.view).filter((v) => v instanceof RelatedView); }
    writingView() {
        const v = this.app.workspace.getActiveViewOfType(MarkdownView) || this.lastMd;
        return v && v.file ? v : null;
    }
    writingFile() { return this.writingView()?.file || null; }
    isTopic(f) {
        if (f.path.startsWith("选题/_采访/")) return false;
        const fm = this.app.metadataCache.getFileCache(f)?.frontmatter || {};
        const cat = [fm.category].flat().join(" ");
        if (fm.type === "看板" || /选题台|选题洞察/.test(f.basename)) return false;
        return f.path.startsWith("选题/") || fm.type === "选题" || /选题/.test(cat) || String(fm.主题 || "") === "小说选题";
    }
    async setWriting(on) {
        if (on === this.writing) return;
        const ws = this.app.workspace;
        if (on) {
            if (!this.writingView()) { new Notice("先打开要写的那篇笔记，再进写作模式"); return; }
            this.writing = true;
            this.lastMd = this.writingView();
            this.prevLayout = { left: ws.leftSplit?.collapsed, right: ws.rightSplit?.collapsed };
            document.body.addClass("sb-writing");
            if (this.settings.collapseLeftInWriting) ws.leftSplit?.collapse();
            await this.openClaudian();
            // 相关笔记放在右侧栏的下半截（和 Claudian 上下分开，两个都看得见）
            let leaf = ws.getLeavesOfType(VIEW_RELATED)[0];
            if (!leaf) { leaf = ws.getRightLeaf(true); await leaf.setViewState({ type: VIEW_RELATED, active: false }); }
            ws.rightSplit?.expand();
            this.statusEl.setText("✍️ 写作模式（点这里退出）"); this.statusEl.show();
            new Notice("写作模式：已打开 Claudian 和相关笔记（文本工具在面板上）");
        } else {
            this.writing = false;
            document.body.removeClass("sb-writing");
            this.closeWritingPanes();
            if (this.prevLayout) {
                if (!this.prevLayout.left) ws.leftSplit?.expand();
                if (this.prevLayout.right) ws.rightSplit?.collapse();
            }
            this.statusEl.hide();
            if (this.index) this.index.stopEmbed = true;   // 没算完的向量下次进写作模式接着算
            this.index = null;   // 平时不占内存
            this.lookup = null;  // 写作模式往缓存里追加过向量，查询用的那份哈希表要重读
        }
    }
    closeWritingPanes() {
        [VIEW_RELATED, VIEW_MTT].forEach((t) => this.app.workspace.getLeavesOfType(t).forEach((l) => l.detach()));
    }
    // My Text Tools 工作台：在正在写的那篇右边分屏打开，输入框带上这篇（或选中的部分）；已开着就切过去
    async openTextTools() {
        const mtt = this.app.plugins.plugins[MTT_ID];
        if (!mtt) { new Notice("没找到 My Text Tools 插件"); return; }
        const ws = this.app.workspace, md = this.writingView();
        let leaf = ws.getLeavesOfType(VIEW_MTT)[0];
        if (!leaf) {
            if (md?.leaf) ws.setActiveLeaf(md.leaf, { focus: false });
            leaf = ws.getLeaf("split", "vertical");
            await leaf.setViewState({ type: VIEW_MTT, active: true });
        }
        await leaf.loadIfDeferred?.();
        ws.revealLeaf(leaf);
        if (md?.editor) leaf.view?.updateInput?.(md.editor, md.file);
    }
    async openClaudian() {
        const id = "realclaudian";
        if (!this.app.plugins.plugins[id]) { new Notice("没找到 Claudian 插件"); return; }
        const cl = this.app.plugins.plugins[id];
        let view = cl.getView?.();
        if (!view) { await this.app.commands.executeCommandById(`${id}:open-view`); await sleep(500); view = cl.getView?.(); }
        if (view?.leaf) this.app.workspace.revealLeaf(view.leaf);
        // Claudian 打开时会抢焦点，把光标还给正在写的那篇
        if (this.lastMd?.leaf) { this.app.workspace.setActiveLeaf(this.lastMd.leaf, { focus: true }); }
    }
    runQws(file, mode) {
        const qws = this.app.plugins.plugins["qws-bridge"];
        if (!qws) { new Notice("没找到「追问成稿」插件（qws-bridge）"); return; }
        new ConfirmModal(this.app, mode === "qws" ? "QWS 采访" : "grill-me",
            `会把「${file.basename}」的正文和所有反链整理成素材包（选题/_采访/ 下），正文会搬进素材包，原处只留一行链接。然后在 Claudian 里开始${mode === "qws" ? "采访" : "盘问写作方案"}。`,
            () => qws.run(file, mode)).open();
    }
    // 光标所在的块：列表项连同子项；普通段落取整段；太短就往上下各带 3 行
    queryAtCursor(view) {
        const ed = view.editor;
        if (!ed) return "";
        const cur = ed.getCursor().line;
        const n = ed.lineCount();
        const line = (i) => ed.getLine(i) ?? "";
        const isItem = (s) => /^\s*(?:[-*+]|\d+[.)])\s/.test(s);
        const ind = (s) => (s.match(/^\s*/) || [""])[0].replace(/ {4}/g, "\t").length;
        let a = cur, b = cur;
        if (isItem(line(cur)) || /^\s+\S/.test(line(cur))) {
            while (a > 0 && !isItem(line(a)) && line(a).trim()) a--;
            const base = ind(line(a));
            while (b + 1 < n && line(b + 1).trim() && (!isItem(line(b + 1)) || ind(line(b + 1)) > base)) b++;
        } else {
            while (a > 0 && line(a - 1).trim() && !isItem(line(a - 1))) a--;
            while (b + 1 < n && line(b + 1).trim() && !isItem(line(b + 1))) b++;
        }
        let text = [];
        for (let i = a; i <= b; i++) text.push(line(i));
        let q = text.join("\n");
        if (plain(q).length < 20) { text = []; for (let i = Math.max(0, cur - 3); i <= Math.min(n - 1, cur + 3); i++) text.push(line(i)); q = text.join("\n"); }
        if (line(0) === "---") { let e = 1; while (e < n && line(e) !== "---") e++; if (cur <= e) q = ""; }   // 光标在属性区
        return plain(q).length < 6 ? view.file.basename : q;
    }
    insertAtCursor(s) {
        const v = this.writingView();
        if (!v?.editor) { new Notice("没找到正在写的笔记"); return; }
        v.editor.replaceSelection(s);
        this.app.workspace.setActiveLeaf(v.leaf, { focus: true });
    }

    // ----- 库周报 -----
    async weeklyReport(force) {
        const week = M().format("GGGG-[W]WW");
        const adapter = this.app.vault.adapter;
        let snap = {};
        try { snap = JSON.parse(await adapter.read(REPORT_SNAP)); } catch (e) { snap = {}; }
        if (!force && snap.last && snap.last.week === week) return;
        // 对比的基准是上一周的快照；同一周里手动刷新时用 prev，免得和本周自己比、变化量全成 0
        const base = snap.last && snap.last.week === week ? snap.prev : snap.last;
        const since = M().subtract(7, "days");
        const mc = this.app.metadataCache;
        const files = this.app.vault.getMarkdownFiles();
        const ex = this.excludeList();
        const isEx = (p) => ex.some((x) => p === x || p.startsWith(x.replace(/\/?$/, "/")));

        // 新建 / 长大的笔记
        const sizes = {};
        for (const f of files) sizes[f.path] = f.stat.size;
        const inWiki = (p) => p.startsWith(this.wikiFolder() + "/");   // Wiki 页在下面单独一节，这里不重复算
        const created = files.filter((f) => f.stat.ctime >= since.valueOf() && !journalDate(f.basename) && !isEx(f.path) && !inWiki(f.path));
        const byFolder = {};
        for (const f of created) { const k = f.path.includes("/") ? f.path.split("/")[0] : "（根目录）"; byFolder[k] = (byFolder[k] || 0) + 1; }
        const prevSizes = base?.sizes || {};
        const grown = files.filter((f) => prevSizes[f.path] != null && !journalDate(f.basename) && !isEx(f.path) && !inWiki(f.path))
            .map((f) => ({ f, d: f.stat.size - prevSizes[f.path] })).filter((x) => x.d > 200).sort((a, b) => b.d - a.d).slice(0, 10);
        // 日记
        const js = this.journals().filter((j) => j.date.isAfter(since) && j.date.isSameOrBefore(M(), "day"));
        let jBlocks = 0, jChars = 0;
        for (const j of js) { const c = mc.getFileCache(j.file); jBlocks += (c?.listItems || []).filter((x) => x.parent < 0).length; jChars += j.file.stat.size; }
        // 未解析链接
        const unres = {};
        for (const [src, t] of Object.entries(mc.unresolvedLinks)) {
            if (isEx(src)) continue;
            for (const [name, n] of Object.entries(t)) {
                if (/\.(png|jpe?g|gif|webp|pdf|mp4|mov|svg|canvas|base|excalidraw)$/i.test(name) || /^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/.test(name)) continue;
                unres[name] = (unres[name] || 0) + n;
            }
        }
        const prevUnres = base?.unres || {};
        // 看板标记词、命名空间路径、残缺链接不算「候选建页」（学生等缩写照常列出）
        const ignore = new Set(["towatch", "tolisten", "toread", "tobuy", "toinstall", "podcast", "cue", "todo", "待续", ...String(this.settings.privateLinks).split(/[,，]\s*/)]);
        const candidate = (k) => !ignore.has(k.toLowerCase()) && !/[\/\[\]]/.test(k);
        const rising = Object.entries(unres).filter(([k, n]) => n >= 2 && n > (prevUnres[k] || 0) && candidate(k)).sort((a, b) => b[1] - a[1]).slice(0, 15);
        const bigUnres = Object.entries(unres).filter(([k, n]) => n >= 3 && candidate(k)).length;
        // 孤岛
        const orphans = this.orphans().map((f) => f.path);
        const prevOrph = new Set(base?.orphans || []);
        const newOrph = orphans.filter((p) => !prevOrph.has(p));
        // 空页面（常被引用）
        const inbound = {};
        for (const [src, t] of Object.entries(mc.resolvedLinks)) for (const p of Object.keys(t)) if (p !== src) inbound[p] = (inbound[p] || 0) + 1;
        const thin = files.filter((f) => f.stat.size < 300 && (inbound[f.path] || 0) >= 3 && !journalDate(f.basename) && !isEx(f.path)
            && !/书|论文|人物|媒体|组织|作品|课程/.test(String(mc.getFileCache(f)?.frontmatter?.type || ""))).length;
        // 卡片
        // 已同步到 Anki 的卡片（含挖空）：Flashcards 记在属性 flashcards 里的条数。不数 #card 标签：「自己#card」这种 Obsidian 不认成标签，会漏掉一大半
        let ankiNotes = 0;
        for (const f of files) { const fc = mc.getFileCache(f)?.frontmatter?.flashcards; if (fc && typeof fc === "object") ankiNotes += Object.values(fc).filter((x) => x?.nid).length; }

        const d = (a, b) => b == null ? "" : ` (${a - b >= 0 ? "+" : ""}${a - b})`;
        const link = (p) => `[[${p.replace(/\.md$/, "")}|${p.split("/").pop().replace(/\.md$/, "")}]]`;
        const L = [];
        L.push(`## ${week}（${since.clone().add(1, "day").format("MM-DD")} ~ ${M().format("MM-DD")}）`, "");
        L.push(`- 📓 日记写了 **${js.length}** 天，顶层块 ${jBlocks} 条，约 ${(jChars / 1024).toFixed(0)} KB`);
        L.push(`- 🆕 新笔记 **${created.length}** 篇${created.length ? "：" + Object.entries(byFolder).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("、") : ""}`);
        if (created.length) L.push(`\t- ${created.slice(0, 20).map((f) => link(f.path)).join(" · ")}${created.length > 20 ? " …" : ""}`);
        if (grown.length) L.push(`- 🌱 长得最多：${grown.map((x) => `${link(x.f.path)} +${(x.d / 1024).toFixed(1)}KB`).join(" · ")}`);
        L.push(`- 🔗 未解析链接：${Object.keys(unres).length} 个${d(Object.keys(unres).length, base ? Object.keys(prevUnres).length : null)}，其中被提到 ≥3 次、像是概念的 ${bigUnres} 个`);
        if (rising.length) L.push(`\t- 本周被提得更多、还没建页的：${rising.map(([k, n]) => `[[${k}]]×${n}`).join(" · ")}`);
        L.push(`- 🏝 孤岛笔记：${orphans.length} 篇${d(orphans.length, base ? prevOrph.size : null)}${newOrph.length && base ? `，新增 ${newOrph.slice(0, 10).map(link).join(" · ")}` : ""}`);
        L.push(`- 📭 常被引用的空页面：${thin} 篇（见 [[Bases/待充实页面.base|待充实页面]]）`);
        L.push(`- 🃏 已同步到 Anki 的卡片（含挖空）：${ankiNotes} 条${d(ankiNotes, base?.ankiNotes)}`);
        // LLM Wiki 的这一周（装了 llm-wiki 才有）；上面「还没建页」列过的词，wiki 的新主题建议里不再重复
        const wiki = this.app.plugins.plugins["llm-wiki"];
        if (wiki?.weeklyLines) { try { L.push(...await wiki.weeklyLines(new Set(rising.map(([k]) => k)))); } catch (e) { console.warn("[second-brain] 周报 wiki", e); } }
        L.push("");

        // 写进报告：最新一周放最上面，保留 8 周
        let old = "";
        const f = this.app.vault.getAbstractFileByPath(REPORT_NOTE);
        if (f instanceof TFile) old = await this.app.vault.read(f);
        const oldWeeks = old.split(/\n(?=## \d{4}-W\d{2})/).filter((s) => /^## \d{4}-W\d{2}/.test(s) && !s.startsWith(`## ${week}`)).slice(0, 7);
        const headTxt = `---\ntype: 看板\ncssclasses: [no-backlinks]\n---\n\n> 由「第二大脑」插件每周第一次打开 Obsidian 时生成（命令「生成本周库周报」可手动刷新）。只统计，不评价。\n\n`;
        const content = headTxt + [L.join("\n"), ...oldWeeks].join("\n");
        if (f instanceof TFile) await this.app.vault.modify(f, content); else await this.app.vault.create(REPORT_NOTE, content);
        if (snap.last && snap.last.week !== week) snap.prev = snap.last;
        snap.last = { week, date: M().format("YYYY-MM-DD"), sizes, unres, orphans, ankiNotes };
        await adapter.write(REPORT_SNAP, JSON.stringify(snap));
        if (force) new Notice(`库周报已更新：${REPORT_NOTE}`);
    }
};

class SBSettings extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    display() {
        const c = this.containerEl; c.empty();
        const p = this.plugin, s = p.settings;
        const text = (name, desc, key) => new Setting(c).setName(name).setDesc(desc).addText((t) => t.setValue(String(s[key])).onChange(async (v) => { s[key] = v; await p.saveSettings(); }));
        const num = (name, key) => new Setting(c).setName(name).addText((t) => t.setValue(String(s[key])).onChange(async (v) => { const n = parseInt(v); if (n > 0) { s[key] = n; await p.saveSettings(); } }));
        const tog = (name, desc, key) => new Setting(c).setName(name).setDesc(desc).addToggle((t) => t.setValue(!!s[key]).onChange(async (v) => { s[key] = v; await p.saveSettings(); }));
        tog("每日回顾和库周报", "没有日记的库（比如稿子库）关掉，只留写作模式。改了要重新加载插件", "enableReview");
        text("日记文件夹", "", "journalFolder");
        text("不参与的文件夹 / 文件", "逗号分隔", "excludeFolders");
        text("私密链接", "带这些双链的块不进回顾、不进相关笔记（逗号分隔）", "privateLinks");
        num("Wiki 漫步条数", "reviewCount");
        new Setting(c).setName("近一年的 Wiki 条目更容易抽到").setDesc("近一年建的 Wiki 页里的条目，被抽到的权重是更早那些的几倍；1 = 不偏向")
            .addText((t) => t.setValue(String(s.recentBoost)).onChange(async (v) => { const n = parseFloat(v); if (n >= 1) { s.recentBoost = n; await p.saveSettings(); } }));
        new Setting(c).setName("这些双链的 Wiki 条目更容易抽到").setDesc("条目本身或它上层的母块链到这些页（逗号分隔，不分大小写），被抽到的权重乘下面的倍数；和「近一年」那条同时占就相乘")
            .addTextArea((t) => t.setValue(String(s.boostLinks)).onChange(async (v) => { s.boostLinks = v; await p.saveSettings(); }));
        new Setting(c).setName("上面这些双链的倍数").setDesc("1 = 不偏向")
            .addText((t) => t.setValue(String(s.linkBoost)).onChange(async (v) => { const n = parseFloat(v); if (n >= 1) { s.linkBoost = n; await p.saveSettings(); } }));
        num("孤岛笔记条数", "orphanCount");
        tog("每天自动放一个每日回顾标签", "每天第一次打开 Obsidian 时，在右侧栏加一个标签（不抢焦点）", "autoOpenReview");
        tog("每周自动生成库周报", REPORT_NOTE, "autoWeeklyReport");
        tog("写作模式收起左侧栏", "", "collapseLeftInWriting");
        new Setting(c).setName("语义检索").setHeading();
        tog("按意思找（语义向量）", "关掉就只按字面找。需要本机 Ollama 开着；向量缓存在 ~/.cache/second-brain/vectors/", "semantic");
        text("Ollama 地址", "", "ollamaUrl");
        text("向量模型", "Ollama 里的模型名。换模型要重新算一遍向量（旧的缓存留着，换回来不用重算）", "embedModel");
        num("向量维度", "embedDims");
        text("字面命中的加分权重", "0 = 纯语义；默认 0.15", "hybridWeight");
        text("拒答门槛（余弦）", "列出来的块里最相近的那块，余弦相似度低于它就当库里没有，什么都不列。默认 0.58（按 EmbeddingGemma 定的，换模型要重定）；0 = 不设", "minTopCos");
        new Setting(c).setName("切块带上下文").setDesc("算向量和字面检索时，在块前面加上「页名（日记是日期）› 小标题 › 各层母块的第一行」，显示的原文不变。改了要重算受影响的向量，Ollama 后台跑几分钟")
            .addDropdown((d) => d.addOptions({ off: "不加", notes: "日记以外每块都加，日记只给拆出来的子块加", nested: "只给拆出来的子块加", all: "每块都加" })
                .setValue(s.ctxPrefix === "notes" || s.ctxPrefix === "nested" ? s.ctxPrefix : s.ctxPrefix ? "all" : "off")
                .onChange(async (v) => { s.ctxPrefix = v === "off" ? false : v === "all" ? true : v; await p.saveSettings(); p.rebuildIndex(); }));
        tog("从问题里认时间和文件夹", "问题里有「2023 年 3 月」「去年」「上个月」「最近两周」「日记里」这类说法时，先把范围圈到那段时间的日记 / 那个文件夹，再在里面排序。日期取自日记文件名，别的笔记没有日期。只对别的插件按「问题」来查时生效，写作模式按段落找相近内容时不认", "queryFilters");
        tog("别名扩展", "查询里出现某页的页名或别名（3 个字以上）时，把这页的其他名字也加进字面检索，比如 RAG ⇄ 检索增强生成", "aliasExpand");
        text("空壳块降权", "去掉格式后不到「空壳字数」的块（只有标题的列表项、只有页名的标题块），混合分减去这个数。默认 3；0 = 不降", "shellPenalty");
        text("空壳字数", "", "shellMinChars");
        new Setting(c).setName("外部素材库").setDesc("每行一个：库名|绝对路径。写作模式会把那个库里的笔记也当素材（只读）；库名要和 Obsidian 里的库名一致，点卡片才能跳过去").addTextArea((t) => {
            t.setValue(String(s.extraVaults || "")).onChange(async (v) => { s.extraVaults = v; await p.saveSettings(); });
            t.inputEl.rows = 3; t.inputEl.style.width = "100%";
        });
        new Setting(c).setName("清空「不再提醒」的孤岛").setDesc(`现在 ${s.dismissedOrphans.length} 篇`).addButton((b) => b.setButtonText("清空").onClick(async () => { s.dismissedOrphans = []; await p.saveSettings(); this.display(); }));
    }
}
