// 第二大脑（自用）
//   · 每日回顾：随机漫步（只从 #card 卡片、==挖空==、Wiki 条目里抽）/ Wiki 回看 / 孤岛笔记（右侧栏，每天第一次打开 Obsidian 时自动放一个标签，不抢焦点）
//   · 写作模式：打开 Claudian + 「相关笔记」面板（按光标所在段落实时找库里相近的块），退出时收起。平时不建索引
//     可以把别的库当素材源（设置「外部素材库」）：在稿子库里写，右边列的是主库里的日记和笔记；插入的链接 / 引用会记进稿子的属性「素材」
//   · 库周报：每周第一次打开时生成 计划与总结/库周报.md（新笔记、长得最多的页、候选建页词、孤岛变化）
// 相关度 = 语义向量（本机 Ollama 的 embedding 模型，按意思找）+ BM25（中文按字的二元组切，按字面找）混合；Ollama 没开就只用 BM25。
// 向量按块内容的哈希缓存在 ~/.cache/second-brain/vectors/（不放进库里，免得 iCloud 同步），两个库共用。
const { Plugin, ItemView, Notice, Menu, TFile, MarkdownView, MarkdownRenderer, Modal, PluginSettingTab, Setting, Keymap, requestUrl } = require("obsidian");
const nfs = require("fs"), npath = require("path"), nos = require("os"), ncrypto = require("crypto");

const VIEW_REVIEW = "sb-daily-review";
const VIEW_RELATED = "sb-related";
const JOURNAL_RE = /^(\d{4})[_-](\d{1,2})[_-](\d{1,2})$/;
const REPORT_NOTE = "计划与总结/库周报.md";
const REPORT_SNAP = "计划与总结/.库周报快照.json";
const DEFAULTS = {
    journalFolder: "日记",
    excludeFolders: "Templates, scripts, Bases, 选题/_采访, 计划与总结/库周报.md",
    privateLinks: "宝a",
    reviewCount: 5,
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
    extraVaults: "",          // 每行一个：库名|绝对路径（把那个库当素材源）
 langPattern: "^.{1,4}[语文](记录|表达)$",   // 随机漫步：卡片本身、上层或下层链到名字符合这个规则的页（英文记录、日语记录、英文表达、拉丁语记录……）算语言类
    langExcept: "中文记录, 中文表达",        // 但这些不算（中文的记录 / 表达留在「知识」里）
    langGuess: true,                         // 没挂这类双链、但挖掉的全是外文生词 / 英文句子的挖空，也算语言类
    ankiReview: true,         // 随机漫步里的卡片 / 挖空可以直接作答，结果写进 Anki（走 AnkiConnect 的 answerCards）
    ankiUrl: "http://127.0.0.1:8765",
    ankiSeconds: 5,           // 写进 Anki 复习记录的用时（秒）；AnkiConnect 要打过补丁才认，原版会忽略、记成约 0 秒
    lastAutoOpen: "",
    dismissedOrphans: [],
};

const M = () => window.moment();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 小工具 ----------
function journalDate(basename) {
    const m = basename.match(JOURNAL_RE);
    return m ? window.moment(`${m[1]}-${m[2]}-${m[3]}`, "YYYY-M-D") : null;
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
// 挖空：和 Flashcards 一样编号（{{c2::…}}、{2:…} 用自己的号，==…== 按出现顺序 1、2、3…）；
// target = 要遮的那个号，null = 全遮，-1 = 全揭开（只去掉标记）
function clozeMask(text, target) {
    let auto = 0;
    return String(text).replace(/\{\{c(\d+)::([\s\S]*?)\}\}|\{(\d+):([^{}\n]*?)\}|==([^=\n]+)==/g, (m, n1, b1, n2, b2, b3) => {
        const num = n1 ? +n1 : n2 ? +n2 : ++auto;
        const body = b1 ?? b2 ?? b3;
        return target === null || num === target ? "［⋯］" : body;
    });
}
// 随机漫步里渲染用的 Markdown：去掉制卡标签、块 id、单独一行的 ^q-xxxx，整体去掉公共缩进（嵌套的卡不会被当成代码块）
function cardMd(text) {
    const L = cardText(text).split("\n").filter((l) => !/^\s*\^[\w-]+\s*$/.test(l)).map((l) => l.replace(/\s\^[\w-]+\s*$/, ""));
    const ind = Math.min(...L.filter((l) => l.trim()).map((l) => (l.match(/^[\t ]*/) || [""])[0].replace(/ {4}/g, "\t").length));
    return L.map((l) => l.replace(/ {4}/g, "\t").replace(new RegExp(`^\\t{0,${Number.isFinite(ind) ? ind : 0}}`), "")).join("\n").trim();
}
// 揭开后的挖空：{{c1::x}}、{1:x} 都显示成高亮
const clozeReveal = (s) => String(s).replace(/\{\{c\d+::([\s\S]*?)\}\}/g, "==$1==").replace(/\{(\d+):([^{}\n]*?)\}/g, "==$2==");
// 卡片显示用：去掉 #card 这类制卡标签
const cardText = (s) => String(s).replace(/\s*#(card|flashcard|reversed)\b/gi, "");
async function osa(script) {
    const { execFile } = require("child_process");
    return new Promise((res) => execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 4000 }, (err, out) => res(err ? "" : String(out).trim())));
}
// Bike 开着这篇的话，这边写进去会被 Bike 下次自动保存覆盖掉
async function bikeHasOpen(file) {
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
        const push = (line, s, title = false) => {
            const t = s.trim();
            if (t.replace(/\s/g, "").length < 8) return;
            if (priv && priv.test(t)) return;
            res.push({ line, end: line + s.replace(/\s+$/, "").split("\n").length - 1, text: t, title });
        };
        const isJournal = !!journalDate(file.basename);
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
                    push(it.position.start.line, L.slice(it.position.start.line, it.position.end.line + 1).join("\n"));
            } else push(b.start, joined);
        }
        if (!isJournal) for (const s of cache.sections || []) {
            if (s.type !== "paragraph" && s.type !== "blockquote" && s.type !== "callout") continue;
            if (inList.has(s.position.start.line)) continue;
            push(s.position.start.line, L.slice(s.position.start.line, s.position.end.line + 1).join("\n"));
        }
        return res;
    }
    addBlocks(file, list, ext = null) {
        const ids = [];
        for (const b of list) {
            const toks = tokenize(b.text);
            if (!toks.length) continue;
            const idx = this.blocks.length;
            const text = b.text.slice(0, 1200);
            const h = hashOf(text);
            const v = this.store ? this.store.idx(h) : -1;
            if (v < 0) this.missing = true;
            this.blocks.push({ path: file.path, line: b.line, text, len: toks.length, dead: false, h, v, ext });
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
                if (i >= 0) b.v = i; else if (!todo.has(b.h)) todo.set(b.h, b.text);
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
    // only：只要满足条件的块（写作模式用它把 Wiki 条目和普通笔记分开查）
    search(query, { excludePath = null, limit = 12, perFile = 2, onlyNotes = false, qvec = null, only = null } = {}) {
        if (!this.ready) return [];
        const qtf = new Map();
        for (const t of tokenize(query)) qtf.set(t, (qtf.get(t) || 0) + 1);
        const N = this.blocks.length, live = N - this.blocks.filter((b) => b.dead).length || 1;
        const avg = this.totalLen / live || 1;
        // 只用最有区分度的 48 个词，长段落也不会慢
        const terms = [...qtf.keys()].map((t) => { const p = this.post.get(t); const df = p ? p.length / 2 : 0; return { t, df, idf: df ? Math.log(1 + (N - df + 0.5) / (df + 0.5)) : 0 }; })
            .filter((x) => x.df && x.df < N * 0.2).sort((a, b) => b.idf - a.idf).slice(0, 48);
        const score = new Map();
        const k1 = 1.2, bb = 0.75;
        for (const { t, idf } of terms) {
            const p = this.post.get(t);
            const qw = Math.min(3, qtf.get(t));
            for (let i = 0; i < p.length; i += 2) {
                const b = this.blocks[p[i]];
                if (b.dead || b.path === excludePath) continue;
                const tf = p[i + 1];
                const s = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - bb + bb * b.len / avg)) * qw;
                score.set(p[i], (score.get(p[i]) || 0) + s);
            }
        }
        let ranked = null;
        // 有查询向量：每块的余弦相似度和 BM25 分各自标准化后相加（语义为主，字面命中加分）
        if (qvec && this.store && this.store.n) {
            const d = this.store.dims, data = this.store.data;
            const cos = new Float32Array(N);
            let sum = 0, sum2 = 0, cnt = 0;
            for (let i = 0; i < N; i++) {
                const b = this.blocks[i];
                if (b.dead || b.path === excludePath || b.v < 0) { cos[i] = NaN; continue; }
                let s = 0; const o = b.v * d;
                for (let k = 0; k < d; k++) s += qvec[k] * data[o + k];
                cos[i] = s; sum += s; sum2 += s * s; cnt++;
            }
            if (cnt > 50) {
                const mu = sum / cnt, sd = Math.sqrt(Math.max(1e-9, sum2 / cnt - mu * mu));
                let bs = 0, bs2 = 0;
                for (const v of score.values()) { bs += v; bs2 += v * v; }
                const bmu = bs / live, bsd = Math.sqrt(Math.max(1e-9, bs2 / live - bmu * bmu));
                const w = Number(this.plugin.settings.hybridWeight) || 0;
                const arr = [];
                for (let i = 0; i < N; i++) {
                    const b = this.blocks[i];
                    if (b.dead || b.path === excludePath) continue;
                    const f = (Number.isNaN(cos[i]) ? 0 : (cos[i] - mu) / sd) + w * (((score.get(i) || 0) - bmu) / bsd);
                    if (f > 1.5) arr.push([i, f]);
                }
                ranked = arr.sort((a, b) => b[1] - a[1]);
            }
        }
        if (!ranked) ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
        const out = [], perCount = new Map(), seen = new Set();
        for (const [i, s] of ranked) {
            const b = this.blocks[i];
            const key = b.text.replace(/\s+/g, "").slice(0, 80);
            if (seen.has(key)) continue;
            seen.add(key);
            if (onlyNotes && (b.ext || journalDate(b.path.split("/").pop().replace(/\.md$/, "")))) continue;
            if (only && !only(b)) continue;
            const c = perCount.get(b.path) || 0;
            if (c >= perFile) continue;
            perCount.set(b.path, c + 1);
            out.push({ ...b, score: s });
            if (out.length >= limit) break;
        }
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
class ReviewView extends ItemView {
    constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.shift = 0; this.orphanShift = 0; }
    getViewType() { return VIEW_REVIEW; }
    getDisplayText() { return "每日回顾"; }
    getIcon() { return "history"; }
    async onOpen() { await this.render(); }
    async render() {
        // 渲染是异步的，连着触发两次会交错、叠出两份：每次编号，等完异步回来发现有更新的一次就不再往面板里写
        const seq = (this.renderSeq = (this.renderSeq || 0) + 1);
        const stale = () => seq !== this.renderSeq;
        const el = this.contentEl; el.empty(); el.addClass("sb-view");
        const today = M().format("YYYY-MM-DD");
        const head = el.createDiv({ cls: "sb-head" });
        head.createEl("b", { text: `🗓 每日回顾 · ${today}` });
        const again = head.createEl("button", { text: "↻", attr: { "aria-label": "重新抽" } });
        again.onclick = () => { this.shift++; this.orphanShift++; this.render(); };

        await this.renderWalk(el, today, stale);
        if (stale()) return;
        await this.renderWiki(el, today, stale);
        if (stale()) return;
        await this.renderOrphans(el, today);
    }
    section(el, title, hint) {
        const s = el.createDiv({ cls: "sb-sec" });
        const h = s.createDiv({ cls: "sb-sec-h" });
        h.createEl("span", { text: title });
        if (hint) h.createEl("span", { text: hint, cls: "sb-hint" });
        return s;
    }
    card(parent, file, line, text, label) {
        const c = parent.createDiv({ cls: "sb-card" });
        const meta = c.createDiv({ cls: "sb-meta" });
        meta.createEl("span", { text: label || file.basename });
        const body = c.createDiv({ cls: "sb-text" });
        const t = plain(text);
        body.setText(t.length > 220 ? t.slice(0, 219) + "…" : t);
        c.onclick = (evt) => this.plugin.openAt(file, line, evt);
        c.addEventListener("mouseover", (evt) => this.app.workspace.trigger("hover-link", { event: evt, source: VIEW_REVIEW, hoverParent: this, targetEl: c, linktext: file.path, state: { scroll: line } }));
        return c;
    }
    // 随机漫步：只从 #card 卡片、==挖空==、Wiki 条目三处抽，三类轮流来；卡片先只给问题、挖空先遮住，点「揭开」再看
    // Anki 开着的话，今天到期的卡排在前面（最多占 n-1 个名额，给别的留一个），揭开后可以直接作答，结果写进 Anki
    // 三种，标题旁边切换：知识（默认，非语言类的卡片和挖空）/ 语言（语言类的卡片和挖空）/ Wiki（Wiki 条目）
    // 卡片 / 挖空里今天在 Anki 到期的排最前；先显示 n 条，答完一张就收走，从后面的队列里补一张
    async renderWalk(el, today, stale = () => false) {
        const p = this.plugin, n = p.settings.reviewCount;
        const mode = ["main", "lang", "wiki"].includes(this.walkMode) ? this.walkMode : "main";
        const pool = await p.walkPool();
        if (stale()) return;
        const lang = mode === "lang";
        const src = mode === "wiki" ? { wiki: pool.wiki } : { card: pool.card.filter((it) => !!it.lang === lang), cloze: pool.cloze.filter((it) => !!it.lang === lang) };
        let dueN = new Set();
        if (mode !== "wiki" && p.settings.ankiReview) { try { dueN = await p.ankiDueNotes(); } catch (e) { /* Anki 没开：照常随机 */ } }
        if (stale()) return;
        const rand = rng(today + "#" + this.shift + "#" + mode);
        const due = dueN.size ? shuffle([...src.card, ...src.cloze].filter((it) => dueN.has(p.nidOf(it))), rand) : [];
        const hint = mode === "wiki" ? `Wiki ${src.wiki.length}` : `卡片 ${src.card.length} · 挖空 ${src.cloze.length}` + (due.length ? ` · 今天到期 ${due.length}` : "");
        const s = this.section(el, "🎲 随机漫步", hint);
        const tabs = s.querySelector(".sb-sec-h > span").createSpan({ cls: "sb-walk-tabs" });
        for (const [m, label] of [["main", "知识"], ["lang", "语言"], ["wiki", "Wiki"]]) {
            const b = tabs.createEl("button", { text: label, cls: m === mode ? "is-active" : "" });
            b.onclick = () => { this.walkMode = m; this.render(); };
        }
        // 排好整条队列：到期的在前，其余几类轮流
        const order = [...due], taken = new Set(due);
        const lists = shuffle(Object.keys(src), rand).map((k) => shuffle(src[k], rand).filter((x) => !taken.has(x)));
        for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) order.push(l[i]);
        if (!order.length) { s.createDiv({ text: mode === "wiki" ? "没有 Wiki 条目" : lang ? "没有语言类的卡片或挖空" : "没有可抽的卡片或挖空", cls: "sb-hint" }); return; }
        this.walkBox = s;
        this.walkQueue = order.slice(n);
        for (const it of order.slice(0, n)) this.walkCard(s, it);
    }
    // 这张处理完了：收起来，后面的往上顶，从队列里补一张
    dismissWalk(c) {
        if (c.hasClass("is-leaving")) return;
        c.style.height = c.offsetHeight + "px";
        c.addClass("is-leaving");
        requestAnimationFrame(() => { c.style.height = "0px"; });
        setTimeout(() => {
            const box = c.parentElement;
            c.remove();
            const next = box === this.walkBox ? this.walkQueue?.shift() : null;
            if (next) this.walkCard(box, next);
            else if (box && !box.querySelector(".sb-walk")) box.createDiv({ text: "这一批做完了，点 ↻ 再来一批", cls: "sb-hint" });
        }, 260);
    }
    walkCard(parent, it) {
        const p = this.plugin;
        const c = parent.createDiv({ cls: `sb-card sb-walk is-${it.kind}` });
        const meta = c.createDiv({ cls: "sb-meta" });
        const jd = journalDate(it.file.basename);
        const where = jd ? jd.format("YYYY-MM-DD") : it.file.basename.replace(/（wiki）$/, "");
        meta.createEl("span", { text: `${{ card: "🃏 卡片", cloze: "✂️ 挖空", wiki: "📚 Wiki" }[it.kind]} · ${where}` });
        // 母块：包着这张卡的各层，从外到内；点哪一层跳到哪一层
        if (it.ctx?.length) {
            const bc = c.createDiv({ cls: "sb-crumbs" });
            it.ctx.forEach((x, i) => {
                if (i) bc.createSpan({ cls: "sb-crumb-sep", text: " › " });
                const t = plain(x.text);
                const a = bc.createSpan({ cls: "sb-crumb", text: t.length > 40 ? t.slice(0, 39) + "…" : t, attr: { "aria-label": t.length > 40 ? t : "" } });
                a.onclick = (evt) => { evt.stopPropagation(); p.openAt(it.file, x.line, evt); };
            });
        }
        // 按 Markdown 渲染（图片、加粗、链接、列表都正常显示）；点里面的双链跳过去，点别处打开原文
        const body = c.createDiv({ cls: "sb-text sb-md markdown-rendered" });
        body.addEventListener("click", (evt) => {
            const a = evt.target.closest("a.internal-link");
            if (!a) { if (evt.target.closest("a, img")) evt.stopPropagation(); return; }
            evt.preventDefault(); evt.stopPropagation();
            this.app.workspace.openLinkText(a.getAttribute("data-href") || a.getAttribute("href"), it.file.path, Keymap.isModEvent(evt));
        });
        const md = cardMd(it.text);
        const lines = md.split("\n");
        const full = it.kind === "wiki" ? md : clozeReveal(md);
        // 卡片：第一行是问题，子项是答案；挖空：遮住（一条笔记在 Anki 里有好几张卡时，只遮这次要复习的那个空）
        const hiddenOf = (target) => it.kind === "card" ? lines[0] + (lines.length > 1 ? "\n\n…" : "")
            : it.kind === "cloze" ? clozeMask(md, target)
            : full;
        const show = (m) => { body.empty(); MarkdownRenderer.render(this.app, m, body, it.file.path, this); };
        const st = { revealed: false, card: null, reviewable: false, done: () => this.dismissWalk(c) };
        show(hiddenOf(null));
        const row = c.createDiv({ cls: "sb-actions" });
        const anki = it.kind === "wiki" || !p.settings.ankiReview ? null : c.createDiv({ cls: "sb-anki", text: "Anki：查询中…" });
        const reveal = () => {
            st.revealed = true; show(full); row.empty();
            if (st.reviewable) this.answerButtons(row, anki, st);
        };
        if (hiddenOf(null) !== full) {
            const b = row.createEl("button", { text: "👁 揭开" });
            b.onclick = (evt) => { evt.stopPropagation(); reveal(); };
        } else st.revealed = true;
        if (anki) this.fillAnki(it, anki, row, st, () => { if (!st.revealed && it.kind === "cloze" && st.target) show(hiddenOf(st.target)); });
        c.onclick = (evt) => p.openAt(it.file, it.line, evt);
        // 右键：不再作为卡片（只去掉 #card / 挖空符号，文字留着）
        if (it.kind !== "wiki") c.addEventListener("contextmenu", (evt) => {
            evt.preventDefault(); evt.stopPropagation();
            const menu = new Menu();
            menu.addItem((i) => i.setTitle(it.kind === "card" ? "不再作为卡片（去掉 #card）" : "不再作为卡片（去掉挖空）").setIcon("eraser").onClick(async () => {
                if (await p.uncard(it)) this.dismissWalk(c);
            }));
            menu.addItem((i) => i.setTitle("打开原文").setIcon("file-text").onClick(() => p.openAt(it.file, it.line)));
            menu.showAtMouseEvent(evt);
        });
    }
    // 查这张卡在 Anki 里的状态；到期的和新卡可以作答
    async fillAnki(it, el, row, st, onTarget) {
        const p = this.plugin;
        el.empty(); el.removeClass("is-off");
        const nid = p.nidOf(it);
        if (!nid) { el.setText("还没同步到 Anki（先跑一次 Flashcards: Update Anki from vault）"); el.addClass("is-off"); return; }
        let cards;
        try {
            const ids = await p.anki("findCards", { query: `nid:${nid}` });
            if (!ids.length) { el.setText("Anki 里找不到这张卡（可能已经删了）"); el.addClass("is-off"); return; }
            cards = await p.anki("cardsInfo", { cards: ids });
            const due = await p.anki("areDue", { cards: ids });
            cards.forEach((x, i) => (x._due = due[i]));
        } catch (e) {
            el.addClass("is-off");
            el.createSpan({ text: "Anki 没开，打开 Anki 再复习 " });
            const open = el.createEl("button", { text: "打开 Anki" });
            open.onclick = (evt) => {
                evt.stopPropagation();
                require("child_process").exec("open -a Anki");
                el.setText("正在打开 Anki…");
                setTimeout(() => this.fillAnki(it, el, row, st, onTarget), 8000);
            };
            return;
        }
        const live = cards.filter((x) => x.queue >= 0);
        const card = live.find((x) => x._due) || live.find((x) => x.queue === 0) || live.sort((a, b) => a.due - b.due)[0] || cards[0];
        st.card = card;
        if (cards.length > 1 && it.kind === "cloze") { st.target = card.ord + 1; onTarget(); }
        const label = await p.ankiState(card);
        el.setText(`Anki：${label}`);
        st.reviewable = card.queue === 0 || (card.queue > 0 && card._due);
        if (!st.reviewable) el.addClass("is-off");
        if (st.reviewable && st.revealed) { row.empty(); this.answerButtons(row, el, st); }
    }
    answerButtons(row, el, st) {
        const p = this.plugin;
        for (const [ease, text] of [[1, "重来"], [2, "困难"], [3, "良好"], [4, "简单"]]) {
            const b = row.createEl("button", { text, cls: `sb-ease is-${ease}` });
            b.onclick = async (evt) => {
                evt.stopPropagation();
                row.querySelectorAll("button").forEach((x) => (x.disabled = true));
                try {
                    const ok = await p.anki("answerCards", { answers: [{ cardId: st.card.cardId, ease, duration: Number(p.settings.ankiSeconds) || 0 }] });
                    if (!ok?.[0]) throw new Error("Anki 没接受这次作答");
                    const [after] = await p.anki("cardsInfo", { cards: [st.card.cardId] });
                    p.dueCache = null;
                    row.empty();
                    el.removeClass("is-off"); el.addClass("is-done");
                    el.setText(`✓ 已记入 Anki（${text}）· ${after.queue === 2 ? `下次 ${after.interval} 天后` : "学习中，几分钟后再出现"}`);
                    setTimeout(() => st.done?.(), 900);   // 让人看一眼结果，再收走
                    // 核对用时有没有记上：AnkiConnect 从 AnkiWeb 自动更新后，本地补丁会被覆盖，用时又变回约 0 秒
                    if (Number(p.settings.ankiSeconds) > 0) {
                        try {
                            const rv = (await p.anki("getReviewsOfCards", { cards: [st.card.cardId] }))?.[String(st.card.cardId)] || [];
                            const last = rv.reduce((m, x) => (!m || x.id > m.id ? x : m), null);
                            if (last && last.time < 1000) el.setText(el.getText() + " · ⚠️ 用时没记上（AnkiConnect 更新后补丁没了，让 Claude 重新打一次）");
                        } catch (e) { /* 查不到就算了 */ }
                    }
                } catch (e) {
                    row.querySelectorAll("button").forEach((x) => (x.disabled = false));
                    new Notice(`没记进 Anki：${e.message || e}`);
                }
            };
        }
    }
    // Wiki 回看：LLM Wiki 页里「存疑」「冲突」「你自己的判断」「还没回答的问题」这些小节下的条目，每天抽两条
    async renderWiki(el, today, stale = () => false) {
        const items = await this.plugin.wikiReviewItems();
        if (!items.length || stale()) return;
        const s = this.section(el, "📚 Wiki 回看", "存疑 · 冲突 · 你的判断 · 没回答的问题");
        const rand = rng(today + "#w" + this.shift);
        for (const it of shuffle(items, rand).slice(0, 2)) this.card(s, it.file, it.line, it.text, `📚 ${it.page} · ${it.kind}`);
    }
    // 孤岛笔记：没有任何笔记链接到它的非日记笔记
    async renderOrphans(el, today) {
        const n = this.plugin.settings.orphanCount;
        const orphans = this.plugin.orphans();
        const s = this.section(el, "🏝 孤岛笔记", `共 ${orphans.length} 篇没人链接`);
        const rand = rng(today + "#o" + this.orphanShift);
        for (const f of shuffle(orphans, rand).slice(0, n)) {
            const fm = this.app.metadataCache.getFileCache(f)?.frontmatter || {};
            const text = await this.app.vault.cachedRead(f);
            const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
            const c = this.card(s, f, 0, fm.def ? String(fm.def) : body.slice(0, 200) || "（空页）", `📄 ${f.basename}`);
            const row = c.createDiv({ cls: "sb-actions" });
            const rel = row.createEl("button", { text: "🧭 找相关" });
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
        if (f && this.plugin.isTopic(f)) {
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
            // 上次退出时留下的相关笔记面板收掉（写作模式不跨重启保留）
            this.app.workspace.getLeavesOfType(VIEW_RELATED).forEach((l) => l.detach());
            const today = M().format("YYYY-MM-DD");
            if (!this.settings.enableReview) return;
            if (this.settings.autoOpenReview && this.settings.lastAutoOpen !== today) {
                this.settings.lastAutoOpen = today; await this.saveSettings();
                await this.openReview(false);
            }
            if (this.settings.autoWeeklyReport) setTimeout(() => this.weeklyReport(false), 20000);
        });
    }
    onunload() { document.body.removeClass("sb-writing"); clearTimeout(this.lookupTimer); }
    async saveSettings() { await this.saveData(this.settings); }
    // 外部素材库：设置里每行「库名|绝对路径」
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
    // 把一张卡变回普通文字：卡片去掉 #card（及 #reversed 等制卡标签），挖空去掉 ==…== / {{cN::…}} / {N:…} 的标记，文字原样留着
    // 改之前核对原文没变；成功后给一个可以撤销的提示
    async uncard(it) {
        const unCloze = (t) => t.replace(/\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\}\}/g, "$1").replace(/\{(\d+):([^{}\n]*?)\}/g, "$2").replace(/==([^=\n]+)==/g, "$1");
        const transform = (text) => {
            const L = text.split("\n");
            if (it.kind === "card") {
                const k = L.findIndex((l) => /#(card|flashcard|reversed)(-reminder|-reverse|\/reverse)?(?![\w-])/i.test(l));
                if (k < 0) return null;
                L[k] = L[k].replace(/\s*#(card|flashcard|reversed)(-reminder|-reverse|\/reverse)?(?![\w-])/gi, "");
                // 答案里的 ==高亮== 原来被这张卡包着，去掉 #card 后会被 Flashcards 当成新的挖空卡，一起去掉
                return unCloze(L.join("\n"));
            }
            const out = unCloze(text);
            return out === text ? null : out;
        };
        const swap = async (from, to) => {
            let ok = false;
            await this.app.vault.process(it.file, (data) => {
                const L = data.split("\n"), n = from.split("\n").length;
                if (L.slice(it.line, it.line + n).join("\n") !== from) return data;
                L.splice(it.line, n, ...to.split("\n"));
                ok = true;
                return L.join("\n");
            });
            return ok;
        };
        const next = transform(it.text);
        if (next == null) { new Notice("这一块里没找到 #card 或挖空标记"); return false; }
        if (!(await swap(it.text, next))) { new Notice("原文已经改过了，没动。刷新一下每日回顾再试"); return false; }
        this.pool = null;
        const frag = createFragment((f) => {
            f.appendText(`「${it.file.basename}」这一块已不再是卡片 `);
            const b = f.createEl("button", { text: "撤销" });
            b.onclick = async () => { if (await swap(next, it.text)) { this.pool = null; new Notice("已撤销"); } else new Notice("原文又改过了，没法撤销"); };
        });
        new Notice(frag, 10000);
        return true;
    }
    // ----- Anki（AnkiConnect）-----
    async anki(action, params = {}) {
        const r = await Promise.race([
            requestUrl({ url: this.settings.ankiUrl, method: "POST", contentType: "application/json", body: JSON.stringify({ action, version: 6, params }) }),
            sleep(4000).then(() => { throw new Error("Anki 没响应"); }),
        ]);
        if (r.json?.error) throw new Error(r.json.error);
        return r.json?.result;
    }
    // 块对应的 Anki 笔记：Flashcards 把「块 id → nid」记在笔记属性 flashcards 里；块 id 在块首行末尾，或紧跟在块后面单独一行（^q-xxxx）
    nidOf(it) {
        const c = this.app.metadataCache.getFileCache(it.file) || {};
        const fc = c.frontmatter?.flashcards;
        if (!fc || typeof fc !== "object") return null;
        const end = it.end ?? it.line;
        const cand = [];
        it.text.split("\n").forEach((l, i) => { const m = l.match(/\s\^([\w-]+)\s*$/) || l.match(/^\^([\w-]+)\s*$/); if (m) cand.push({ id: m[1], line: it.line + i }); });
        for (const [id, b] of Object.entries(c.blocks || {})) if (b.position.start.line >= it.line && b.position.start.line <= end + 1) cand.push({ id, line: b.position.start.line });
        const rank = (x) => (x.line === it.line ? 0 : x.line === end + 1 ? 1 : 2);
        cand.sort((a, b) => rank(a) - rank(b) || a.line - b.line);
        for (const x of cand) { const e = fc[x.id] || fc[x.id.toLowerCase()]; if (e?.nid) return Number(e.nid); }
        return null;
    }
    // 今天到期的卡所属的笔记（两分钟内复用）
    async ankiDueNotes() {
        if (this.dueCache && Date.now() - this.dueCache.at < 2 * 60 * 1000) return this.dueCache.notes;
        const ids = await this.anki("findCards", { query: "is:due -is:suspended -is:buried" });
        const info = ids.length ? await this.anki("cardsInfo", { cards: ids }) : [];
        this.dueCache = { at: Date.now(), notes: new Set(info.map((x) => x.note)) };
        return this.dueCache.notes;
    }
    // 卡片状态的说法；复习卡的「还有几天」用 Anki 搜索 prop:due<=k 二分出来（AnkiConnect 不直接给日期）
    async ankiState(card) {
        if (card.queue === -1) return "已暂停";
        if (card.queue < -1) return "已搁置";
        if (card.queue === 0) return "新卡 · 揭开后可以作答";
        if (card._due) return (card.queue === 2 ? "今天到期" : "学习中，到期了") + " · 揭开后可以作答";
        if (card.queue !== 2) return "学习中，稍后到期";
        let lo = 1, hi = Math.max(2, card.interval * 2 + 30), left = null;
        try {
            if ((await this.anki("findCards", { query: `cid:${card.cardId} prop:due<=${hi}` })).length) {
                while (lo < hi) { const mid = (lo + hi) >> 1; if ((await this.anki("findCards", { query: `cid:${card.cardId} prop:due<=${mid}` })).length) hi = mid; else lo = mid + 1; }
                left = lo;
            }
        } catch (e) { /* 算不出来就不写天数 */ }
        return `${left != null ? `还有 ${left} 天到期` : "没到期"} · 间隔 ${card.interval} 天 · 复习过 ${card.reps} 次`;
    }
    // 随机漫步的素材：#card 卡片、==挖空== 所在的列表项（连同子项），和 Wiki 页的顶层条目。全库扫一遍要读文件，结果留 10 分钟
    async walkPool() {
        if (this.pool && Date.now() - this.pool.at < 10 * 60 * 1000) return this.pool;
        const mc = this.app.metadataCache;
        const ex = this.excludeList(), priv = this.privateRe(), wf = this.wikiFolder() + "/";
        const isEx = (p) => ex.some((x) => p === x || p.startsWith(x.replace(/\/?$/, "/")));
        const pool = { card: [], cloze: [], wiki: [], at: Date.now() };
        const split = (v) => String(v || "").split(/[,，\n]/).map((x) => x.trim()).filter(Boolean);
        let langRe = null;
        try { langRe = new RegExp(this.settings.langPattern || "^$"); } catch (e) { console.warn("[second-brain] 语言类规则写错了", e); }
        const langExcept = new Set(split(this.settings.langExcept));
        const langName = (n) => !!langRe && langRe.test(n) && !langExcept.has(n);
        const CLOZE = /==[^=\s][^=\n]*==|\{\{c\d+::/;
        const CARD = /#(card|flashcard|reversed)\b/i;
        let n = 0;
        for (const f of this.app.vault.getMarkdownFiles()) {
            if (isEx(f.path)) continue;
            if (++n % 50 === 0) await sleep(0);   // 让出界面
            const c = mc.getFileCache(f) || {};
            const items = c.listItems || [];
            const isWiki = f.path.startsWith(wf);
            if (isWiki && !/（wiki）$/.test(f.basename)) continue;
            if (isWiki && !items.length) continue;
            const L = (await this.app.vault.cachedRead(f)).split("\n");
            const skip = new Set();
            for (const sec of c.sections || []) if (sec.type === "code" || sec.type === "yaml") for (let i = sec.position.start.line; i <= sec.position.end.line; i++) skip.add(i);
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
            // 语言类：卡片本身、上层或下层（同一块里）链到「X语 / X文 + 记录 / 表达」的页（中文的除外）；
            // langGuess 开着时，没挂这类双链、但挖掉的全是外文生词 / 英文句子的挖空也算（单词本里的生词常常不挂标签）
            const linksAt = new Map();
            for (const l of c.links || []) { const k = l.position.start.line; if (!linksAt.has(k)) linksAt.set(k, []); linksAt.get(k).push(l.link.split("|")[0].split("#")[0].trim()); }
            const lineItem = new Map(items.map((x) => [x.position.start.line, x]));
            const chain = (s0) => { const out = [s0]; let x = lineItem.get(s0), d = 0; while (x && x.parent >= 0 && x.parent !== x.position.start.line && d++ < 30) { out.push(x.parent); x = lineItem.get(x.parent); } return out; };
            const isLang = (kind, s0, e0, text) => {
                const lines = [...chain(s0)];
                for (let k = s0 + 1; k <= e0; k++) lines.push(k);
                const names = lines.flatMap((k) => linksAt.get(k) || []);
                if (names.some(langName)) return true;
                if (!this.settings.langGuess || kind !== "cloze") return false;
                // 链到 Concepts/ 下的知识概念页（如 [[Transformer]]），就是在学知识，不算背单词
                if (names.some((n) => this.app.metadataCache.getFirstLinkpathDest(n, f.path)?.path.startsWith("Concepts/"))) return false;
                const blanks = [...text.matchAll(/==([^=\n]+)==|\{\{c\d+::([^}]*)\}\}/g)].map((m) => (m[1] ?? m[2]).trim());
                // 外文：纯英文字母，或者是日文（带假名，可以夹汉字，如 知り合い）
                const foreign = (x) => /^[A-Za-z぀-ヿ][A-Za-z぀-ヿ\s'’.,!?-]*$/.test(x) || (/[぀-ヿ]/.test(x) && /^[぀-ヿ一-鿿\s]+$/.test(x));
                if (!blanks.length || !blanks.every(foreign)) return false;
                const first = plain(text.split("\n")[0]);
                const latin = (first.match(/[A-Za-z]/g) || []).length, cjk = (first.match(/[一-鿿]/g) || []).length;
                const sentence = (first.match(/[A-Za-z]+ +[A-Za-z]+/g) || []).length >= 2;   // 像英文句子，而不是用顿号隔开的一串术语
                return !names.length || (latin > cjk && sentence);
            };
            // 上下文：包着这块的各层母块那一行，从外到内
            const ctxOf = (s0) => chain(s0).slice(1).reverse().map((k) => ({ line: k, text: (L[k] || "").replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?/, "").replace(/(^|\s)\^[\w-]+\s*$/, "").replace(/\s*#(card|flashcard|reversed)\b/gi, "").trim() })).filter((x) => x.text);
            const seen = new Set(), taken = [];
            const add = (kind, k) => {
                const b = blockAt(k);
                // 和 Flashcards 一样：已经包含在上层卡片 / 挖空里的子项不再单算一张
                if (seen.has(b.s) || (kind !== "wiki" && taken.some((r) => b.s > r.s && b.s <= r.e))) return;
                seen.add(b.s);
                taken.push(b);
                const text = L.slice(b.s, b.e + 1).join("\n");
                if (plain(text).length < 6 || (priv && priv.test(text))) return;
                pool[kind].push({ kind, file: f, line: b.s, end: b.e, text, lang: kind !== "wiki" && isLang(kind, b.s, b.e, text), ctx: ctxOf(b.s) });
            };
            if (isWiki) {
                for (const it of items) if (it.parent < 0 && !/^\s*[-*+]\s+范围：/.test(L[it.position.start.line] || "")) add("wiki", it.position.start.line);
                continue;
            }
            // #card 按文字找：「自己#card」「。#card」这种前面没空格的，Obsidian 不认成标签，但 Flashcards 照样制卡
            L.forEach((line, k) => { if (!skip.has(k) && CARD.test(line)) add("card", k); });
            L.forEach((line, k) => { if (!skip.has(k) && CLOZE.test(line) && !CARD.test(line)) add("cloze", k); });
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
    async ensureIndex(onProgress) {
        if (!this.index) this.index = new BlockIndex(this);
        if (!this.index.ready) await this.index.build(onProgress);
        return this.index;
    }
    async openAt(file, line, evt) {
        // 写作模式下默认开新标签，免得把正在写的那篇换掉
        const leaf = this.app.workspace.getLeaf(evt && Keymap.isModEvent(evt) ? Keymap.isModEvent(evt) : "tab");
        await leaf.openFile(file, { eState: { line } });
    }
    async openReview(reveal) {
        let leaf = this.app.workspace.getLeavesOfType(VIEW_REVIEW)[0];
        if (!leaf) { leaf = this.app.workspace.getRightLeaf(false); await leaf.setViewState({ type: VIEW_REVIEW, active: reveal }); }
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
            new Notice("写作模式：已打开 Claudian 和相关笔记");
        } else {
            this.writing = false;
            document.body.removeClass("sb-writing");
            ws.getLeavesOfType(VIEW_RELATED).forEach((l) => l.detach());
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
        num("随机漫步条数", "reviewCount");
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
        new Setting(c).setName("随机漫步").setHeading();
        text("语言类双链（正则）", "卡片本身、上层或下层链到名字符合它的页就算语言类，连同下面的子块。默认 ^.{1,4}[语文](记录|表达)$：英文记录、日语记录、英文表达、拉丁语记录…", "langPattern");
        text("不算语言类的", "逗号分隔，默认中文记录、中文表达（留在「知识」里）", "langExcept");
        tog("没挂双链的外文挖空也算语言类", "挖掉的全是英文生词 / 日文、或整句是英文句子的挖空", "langGuess");
        new Setting(c).setName("Anki").setHeading();
        tog("随机漫步里复习 Anki 卡片", "卡片 / 挖空揭开后可以按「重来 / 困难 / 良好 / 简单」作答，直接写进 Anki 的复习记录（要 Anki 开着、装了 AnkiConnect）。没到期的卡只能看", "ankiReview");
        text("AnkiConnect 地址", "", "ankiUrl");
        num("复习用时（秒）", "ankiSeconds");
        new Setting(c).setName("外部素材库").setDesc("每行一个：库名|绝对路径。写作模式会把那个库里的笔记也当素材（只读）；库名要和 Obsidian 里的库名一致，点卡片才能跳过去").addTextArea((t) => {
            t.setValue(String(s.extraVaults || "")).onChange(async (v) => { s.extraVaults = v; await p.saveSettings(); });
            t.inputEl.rows = 3; t.inputEl.style.width = "100%";
        });
        new Setting(c).setName("清空「不再提醒」的孤岛").setDesc(`现在 ${s.dismissedOrphans.length} 篇`).addButton((b) => b.setButtonText("清空").onClick(async () => { s.dismissedOrphans = []; await p.saveSettings(); this.display(); }));
    }
}
