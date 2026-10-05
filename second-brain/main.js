// 第二大脑（自用）
//   · 每日回顾：那年今日 / 随机旧块 / 孤岛笔记（右侧栏，每天第一次打开 Obsidian 时自动放一个标签，不抢焦点）
//   · 写作模式：打开 Claudian + 「相关笔记」面板（按光标所在段落实时找库里相近的块），退出时收起。平时不建索引
//     可以把别的库当素材源（设置「外部素材库」）：在稿子库里写，右边列的是主库里的日记和笔记；插入的链接 / 引用会记进稿子的属性「素材」
//   · 库周报：每周第一次打开时生成 计划与总结/库周报.md（新笔记、长得最多的页、候选建页词、孤岛变化）
// 相关度 = 语义向量（本机 Ollama 的 embedding 模型，按意思找）+ BM25（中文按字的二元组切，按字面找）混合；Ollama 没开就只用 BM25。
// 向量按块内容的哈希缓存在 ~/.cache/second-brain/vectors/（不放进库里，免得 iCloud 同步），两个库共用。
const { Plugin, ItemView, Notice, TFile, MarkdownView, Modal, PluginSettingTab, Setting, Keymap, requestUrl } = require("obsidian");
const nfs = require("fs"), npath = require("path"), nos = require("os"), ncrypto = require("crypto");

const VIEW_REVIEW = "sb-daily-review";
const VIEW_RELATED = "sb-related";
const JOURNAL_RE = /^(\d{4})[_-](\d{1,2})[_-](\d{1,2})$/;
const TASK_RE = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX\/\-]\]\s+|(?:TODO|DOING|DONE|NOW|LATER|WAITING|CANCELL?ED|FAILED)\b)/;
const CARD_RE = /#card\b|#flashcard\b|#reversed\b/;
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
class VectorStore {
    constructor(model, dims) {
        this.dims = dims;
        this.dir = npath.join(nos.homedir(), ".cache", "second-brain", "vectors", `${String(model).replace(/[^\w.-]+/g, "_")}-${dims}`);
        this.map = new Map();
        this.n = 0;
        this.data = new Float32Array(dims * 4096);
        this.load();
    }
    load() {
        const hp = npath.join(this.dir, "hashes.txt"), vp = npath.join(this.dir, "vecs.bin");
        if (!nfs.existsSync(hp) || !nfs.existsSync(vp)) return;
        const hashes = nfs.readFileSync(hp, "utf8").split("\n").filter(Boolean);
        const buf = nfs.readFileSync(vp);
        const n = Math.min(hashes.length, Math.floor(buf.byteLength / 4 / this.dims));
        this.data = new Float32Array(Math.max(4096, n * 2) * this.dims);
        this.data.set(new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + n * this.dims * 4)));
        for (let i = 0; i < n; i++) this.map.set(hashes[i], i);
        this.n = n;
        // 上次写到一半断掉的话，两个文件对不齐：截到对齐的长度
        if (hashes.length !== n || buf.byteLength !== n * this.dims * 4) {
            nfs.writeFileSync(hp, hashes.slice(0, n).join("\n") + (n ? "\n" : ""));
            nfs.truncateSync(vp, n * this.dims * 4);
        }
    }
    idx(h) { const i = this.map.get(h); return i == null ? -1 : i; }
    addMany(list) {
        list = list.filter((x) => !this.map.has(x.h) && x.vec && x.vec.length === this.dims);
        if (!list.length) return;
        nfs.mkdirSync(this.dir, { recursive: true });
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
    async blocksOf(file) {
        const cache = this.app.metadataCache.getFileCache(file) || {};
        const text = await this.app.vault.cachedRead(file);
        const L = text.split("\n");
        const priv = this.plugin.privateRe();
        const res = [];
        const push = (line, s) => {
            const t = s.trim();
            if (t.replace(/\s/g, "").length < 8) return;
            if (priv && priv.test(t)) return;
            res.push({ line, text: t });
        };
        const isJournal = !!journalDate(file.basename);
        if (!isJournal) {
            const fm = cache.frontmatter || {};
            push(0, `${file.basename} ${fm.def || ""} ${[fm.aliases].flat().filter(Boolean).join(" ")}`);
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
    search(query, { excludePath = null, limit = 12, perFile = 2, onlyNotes = false, qvec = null } = {}) {
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

// ---------- 每日回顾 ----------
class ReviewView extends ItemView {
    constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.shift = 0; this.orphanShift = 0; }
    getViewType() { return VIEW_REVIEW; }
    getDisplayText() { return "每日回顾"; }
    getIcon() { return "history"; }
    async onOpen() { await this.render(); }
    async render() {
        const el = this.contentEl; el.empty(); el.addClass("sb-view");
        const today = M().format("YYYY-MM-DD");
        const head = el.createDiv({ cls: "sb-head" });
        head.createEl("b", { text: `🗓 每日回顾 · ${today}` });
        const again = head.createEl("button", { text: "↻", attr: { "aria-label": "重新抽" } });
        again.onclick = () => { this.shift++; this.orphanShift++; this.render(); };

        const journals = this.plugin.journals();
        await this.renderOnThisDay(el, journals);
        await this.renderRandom(el, journals, today);
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
    // 那年今日：往年同月同日的日记，每年最多 3 条顶层块
    async renderOnThisDay(el, journals) {
        const now = M();
        const hits = journals.filter((j) => j.date.month() === now.month() && j.date.date() === now.date() && j.date.year() < now.year())
            .sort((a, b) => b.date.valueOf() - a.date.valueOf());
        const s = this.section(el, "📅 那年今日", hits.length ? `${hits.length} 年` : "往年今天没写日记");
        for (const j of hits) {
            const blocks = (await this.plugin.reviewBlocks(j.file)).slice(0, 3);
            if (!blocks.length) continue;
            const y = s.createDiv({ cls: "sb-year" });
            y.createEl("div", { text: `${j.date.year()}（${now.year() - j.date.year()} 年前）`, cls: "sb-year-h" });
            for (const b of blocks) this.card(y, j.file, b.line, b.text, j.date.format("YYYY-MM-DD ddd"));
        }
    }
    // 随机旧块：30 天前的日记里，不是任务、不是 Anki 卡片、不私密的顶层块
    async renderRandom(el, journals, today) {
        const n = this.plugin.settings.reviewCount;
        const s = this.section(el, "🎲 随机旧块", "30 天前的日记");
        const old = journals.filter((j) => M().diff(j.date, "days") > 30);
        const rand = rng(today + "#" + this.shift);
        let got = 0, tries = 0;
        for (const j of shuffle(old, rand)) {
            if (got >= n || tries++ > 60) break;
            const blocks = await this.plugin.reviewBlocks(j.file);
            if (!blocks.length) continue;
            const b = blocks[Math.floor(rand() * blocks.length)];
            this.card(s, j.file, b.line, b.text, j.date.format("YYYY-MM-DD"));
            got++;
        }
        if (!got) s.createDiv({ text: "没抽到合适的块", cls: "sb-hint" });
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
        const res = idx.search(q, { excludePath: view.file?.path, limit: 14, perFile: 2, qvec });
        this.list.empty();
        if (!q.trim()) { this.list.createDiv({ text: "开始写，这里会列出库里和这段相近的内容。", cls: "sb-hint" }); return; }
        if (!res.length) { this.list.createDiv({ text: "这段没找到相近的内容。", cls: "sb-hint" }); return; }
        for (const r of res) {
            // 外部库的块：没有 TFile，用 obsidian:// 链接跳到那个库
            const ext = r.ext;
            const f = ext ? null : this.app.vault.getAbstractFileByPath(r.path);
            if (!ext && !(f instanceof TFile)) continue;
            const base = ext ? ext.rel.split("/").pop().replace(/\.md$/, "") : f.basename;
            const uri = ext ? `obsidian://open?vault=${encodeURIComponent(ext.vault)}&file=${encodeURIComponent(ext.rel.replace(/\.md$/, ""))}` : "";
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
    onunload() { document.body.removeClass("sb-writing"); }
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
    // 回顾用的块：顶层列表项里，不是任务、不是卡片、不私密、有点内容的
    async reviewBlocks(file) {
        const cache = this.app.metadataCache.getFileCache(file) || {};
        const L = (await this.app.vault.cachedRead(file)).split("\n");
        const priv = this.privateRe();
        const items = cache.listItems || [];
        const tops = [];
        for (const it of items) {
            if (it.parent < 0) tops.push({ line: it.position.start.line, end: it.position.end.line });
            else if (tops.length) tops[tops.length - 1].end = Math.max(tops[tops.length - 1].end, it.position.end.line);
        }
        const out = [];
        for (const b of tops) {
            const first = L[b.line] || "";
            if (TASK_RE.test(first)) continue;
            const text = L.slice(b.line, b.end + 1).join("\n");
            if (CARD_RE.test(text) || (priv && priv.test(text))) continue;
            const p = plain(text);
            if (p.length < 12 || p.length > 900) continue;
            if (/^(\[\[[^\]]*\]\]\s*)+$/.test(first.replace(/^\s*[-*+]\s+/, "").trim()) && b.end === b.line) continue;   // 只有一个双链
            out.push({ line: b.line, text });
        }
        return out;
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
        else if (leaf.view?.render) await leaf.view.render();
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
        const since = M().subtract(7, "days");
        const mc = this.app.metadataCache;
        const files = this.app.vault.getMarkdownFiles();
        const ex = this.excludeList();
        const isEx = (p) => ex.some((x) => p === x || p.startsWith(x.replace(/\/?$/, "/")));

        // 新建 / 长大的笔记
        const sizes = {};
        for (const f of files) sizes[f.path] = f.stat.size;
        const created = files.filter((f) => f.stat.ctime >= since.valueOf() && !journalDate(f.basename) && !isEx(f.path));
        const byFolder = {};
        for (const f of created) { const k = f.path.includes("/") ? f.path.split("/")[0] : "（根目录）"; byFolder[k] = (byFolder[k] || 0) + 1; }
        const prevSizes = snap.last?.sizes || {};
        const grown = files.filter((f) => prevSizes[f.path] != null && !journalDate(f.basename) && !isEx(f.path))
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
        const prevUnres = snap.last?.unres || {};
        // 看板标记词、命名空间路径、残缺链接不算「候选建页」（学生等缩写照常列出）
        const ignore = new Set(["towatch", "tolisten", "toread", "tobuy", "toinstall", "podcast", "cue", "todo", "待续", ...String(this.settings.privateLinks).split(/[,，]\s*/)]);
        const candidate = (k) => !ignore.has(k.toLowerCase()) && !/[\/\[\]]/.test(k);
        const rising = Object.entries(unres).filter(([k, n]) => n >= 2 && n > (prevUnres[k] || 0) && candidate(k)).sort((a, b) => b[1] - a[1]).slice(0, 15);
        const bigUnres = Object.entries(unres).filter(([k, n]) => n >= 3 && candidate(k)).length;
        // 孤岛
        const orphans = this.orphans().map((f) => f.path);
        const prevOrph = new Set(snap.last?.orphans || []);
        const newOrph = orphans.filter((p) => !prevOrph.has(p));
        // 空页面（常被引用）
        const inbound = {};
        for (const [src, t] of Object.entries(mc.resolvedLinks)) for (const p of Object.keys(t)) if (p !== src) inbound[p] = (inbound[p] || 0) + 1;
        const thin = files.filter((f) => f.stat.size < 300 && (inbound[f.path] || 0) >= 3 && !journalDate(f.basename) && !isEx(f.path)
            && !/书|论文|人物|媒体|组织|作品|课程/.test(String(mc.getFileCache(f)?.frontmatter?.type || ""))).length;
        // 卡片
        let cards = 0;
        for (const f of files) for (const t of mc.getFileCache(f)?.tags || []) if (t.tag === "#card") cards++;

        const d = (a, b) => b == null ? "" : ` (${a - b >= 0 ? "+" : ""}${a - b})`;
        const link = (p) => `[[${p.replace(/\.md$/, "")}|${p.split("/").pop().replace(/\.md$/, "")}]]`;
        const L = [];
        L.push(`## ${week}（${since.clone().add(1, "day").format("MM-DD")} ~ ${M().format("MM-DD")}）`, "");
        L.push(`- 📓 日记写了 **${js.length}** 天，顶层块 ${jBlocks} 条，约 ${(jChars / 1024).toFixed(0)} KB`);
        L.push(`- 🆕 新笔记 **${created.length}** 篇${created.length ? "：" + Object.entries(byFolder).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("、") : ""}`);
        if (created.length) L.push(`\t- ${created.slice(0, 20).map((f) => link(f.path)).join(" · ")}${created.length > 20 ? " …" : ""}`);
        if (grown.length) L.push(`- 🌱 长得最多：${grown.map((x) => `${link(x.f.path)} +${(x.d / 1024).toFixed(1)}KB`).join(" · ")}`);
        L.push(`- 🔗 未解析链接：${Object.keys(unres).length} 个${d(Object.keys(unres).length, snap.last ? Object.keys(prevUnres).length : null)}，其中被提到 ≥3 次、像是概念的 ${bigUnres} 个`);
        if (rising.length) L.push(`\t- 本周被提得更多、还没建页的：${rising.map(([k, n]) => `[[${k}]]×${n}`).join(" · ")}`);
        L.push(`- 🏝 孤岛笔记：${orphans.length} 篇${d(orphans.length, snap.last ? prevOrph.size : null)}${newOrph.length && snap.last ? `，新增 ${newOrph.slice(0, 10).map(link).join(" · ")}` : ""}`);
        L.push(`- 📭 常被引用的空页面：${thin} 篇（见 [[Bases/待充实页面.base|待充实页面]]）`);
        L.push(`- 🃏 Anki 卡片：${cards} 张${d(cards, snap.last?.cards)}`);
        L.push("");

        // 写进报告：最新一周放最上面，保留 8 周
        let old = "";
        const f = this.app.vault.getAbstractFileByPath(REPORT_NOTE);
        if (f instanceof TFile) old = await this.app.vault.read(f);
        const oldWeeks = old.split(/\n(?=## \d{4}-W\d{2})/).filter((s) => /^## \d{4}-W\d{2}/.test(s) && !s.startsWith(`## ${week}`)).slice(0, 7);
        const headTxt = `---\ntype: 看板\ncssclasses: [no-backlinks]\n---\n\n> 由「第二大脑」插件每周第一次打开 Obsidian 时生成（命令「生成本周库周报」可手动刷新）。只统计，不评价。\n\n`;
        const content = headTxt + [L.join("\n"), ...oldWeeks].join("\n");
        if (f instanceof TFile) await this.app.vault.modify(f, content); else await this.app.vault.create(REPORT_NOTE, content);
        snap.last = { week, date: M().format("YYYY-MM-DD"), sizes, unres, orphans, cards };
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
        num("随机旧块条数", "reviewCount");
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
        new Setting(c).setName("外部素材库").setDesc("每行一个：库名|绝对路径。写作模式会把那个库里的笔记也当素材（只读）；库名要和 Obsidian 里的库名一致，点卡片才能跳过去").addTextArea((t) => {
            t.setValue(String(s.extraVaults || "")).onChange(async (v) => { s.extraVaults = v; await p.saveSettings(); });
            t.inputEl.rows = 3; t.inputEl.style.width = "100%";
        });
        new Setting(c).setName("清空「不再提醒」的孤岛").setDesc(`现在 ${s.dismissedOrphans.length} 篇`).addButton((b) => b.setButtonText("清空").onClick(async () => { s.dismissedOrphans = []; await p.saveSettings(); this.display(); }));
    }
}
