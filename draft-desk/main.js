// 稿件台（draft-desk）：写稿时按步骤调用工具，挂在第二大脑的写作模式面板上（也都注册成命令）
//   ① 脉络：grill-me 压测稿子（Claudian）· 方向发散（claude -p）
//   ② 落实：填坑（claude -p，联网 + 读主库）· 概念锚点检索（Claudian）· QWS 追问补料（Claudian）
//   ④ 扩写：扩写 / 补充 · 正式化 · 文白交杂（claude -p）
//   ⑤ 修整：一键规范排版（My Text Tools 快捷指令）· 列表块连成段落（claude -p）
// 作用范围：选中了就只处理选中部分，没选中就处理整篇（属性区不动）
// 追问、发散、概念讨论的产出算素材，放主库 选题/_采访/<选题名>/；稿子正文只有改写和填坑会动
// 设计稿：仓库里的 draft-desk/DESIGN.md
const { Plugin, Notice, Menu, Modal, MarkdownView, MarkdownRenderer, Component, TFile, PluginSettingTab, Setting } = require("obsidian");
const nfs = require("fs"), npath = require("path"), nos = require("os");
const { spawn } = require("child_process");

const CLAUDIAN_ID = "realclaudian", MTT_ID = "my-text-tools", SB_ID = "second-brain";
const OUT_ROOT = "选题/_采访";
const STYLE_DIR = "写作与创作";
const TIDY_BATCH = { id: "draft-desk-tidy", name: "稿件台 · 规范排版" };
const EXPR_DIR = "素材库/";        // 表达与典故素材库：这个文件夹下带「类别」的页 + 全库标了 [[有趣的表达]] 的块
const FUNNY_RE = /\[\[(?:[^\]|]*\/)?(?:有趣的表达|搞笑的表达)(?:[|#\]])/;
const EXPR_NOTE = "<<<表达备注>>>";
const MAX_PACK = 150000;          // 概念材料包上限（和 QWS 素材包一样）
const MANY_HITS = 300;            // 命中超过这么多处先问一声
const PIT_PARALLEL = 3;           // 填坑同时查几个
const DEFAULTS = { mainVault: "", mainVaultName: "", claudePath: "~/.local/bin/claude", timeoutSec: 600 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = (f) => window.moment().format(f);
const safeName = (s) => String(s).replace(/[\\/:*?"<>|#^\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "未命名";

// ---------- 纯文本处理（不依赖 Obsidian，node 里能直接测） ----------
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s/;
const indentW = (s) => { let w = 0; for (const c of s.match(/^[ \t]*/)[0]) w += c === "\t" ? 4 : 1; return w; };

// 属性区和正文分开：body 从 offset 开始
function splitFrontmatter(text) {
    const m = text.match(/^---\n[\s\S]*?\n---[ \t]*(\n|$)/);
    return m ? { fm: m[0], body: text.slice(m[0].length), offset: m[0].length } : { fm: "", body: text, offset: 0 };
}

// 链接、网址、代码这些排版规则不该碰的东西换成占位符，处理完再换回
const PROTECT = [
    /(```|~~~)[\s\S]*?\1/g,             // 代码块
    /`[^`\n]+`/g,                       // 行内代码
    /!?\[\[[^\]\n]*\]\]/g,              // [[链接]] 和 ![[嵌入]]
    /!?\[[^\]\n]*\]\([^)\n]*\)/g,       // Markdown 链接 / 图片
    /\[\^[^\]\n]*\]/g,                  // 脚注
    /<[a-zA-Z/][^>\n]*>/g,              // HTML 标签
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>()（）\[\]【】"'，。；！？、]+/gi,   // 裸网址
];
function protect(text) {
    const saved = [];
    let t = text;
    for (const re of PROTECT) t = t.replace(re, (m) => { saved.push(m); return `${saved.length - 1}`; });
    const restore = (s) => {
        let r = s;
        for (let k = 0; k < 5 && /\d+/.test(r); k++) r = r.replace(/(\d+)/g, (_, i) => saved[+i]);
        return r;
    };
    return { text: t, restore };
}

// 规范排版的规则：存成 MTT 快捷指令里的一串「正则替换」，可以在 MTT 界面里增删
const CJK = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff";
const TIDY_RULES = [
    // 半角标点 → 全角（中文语境：前面是汉字；逗号分号问号叹号后面是汉字也算）
    ...[[",", "，"], [";", "；"], ["\\?", "？"], ["!", "！"]].flatMap(([h, f]) => [
        { find: `([${CJK}])[ \\t]*${h}[ \\t]*`, replace: `$1${f}` },
        { find: `[ \\t]*${h}[ \\t]*([${CJK}])`, replace: `${f}$1` },
    ]),
    { find: `([${CJK}])[ \\t]*:[ \\t]*`, replace: "$1：" },
    { find: `([${CJK}])\\.(?=[${CJK}]|[ \\t]*$)`, replace: "$1。", multiline: true },   // 句号只改两头都是汉字（或在行尾）的，小数、缩写不碰
    { find: `\\(([^()\\n]*[${CJK}][^()\\n]*)\\)`, replace: "（$1）" },
    // 中文和英文 / 数字之间加空格
    { find: `([${CJK}])([A-Za-z0-9])`, replace: "$1 $2" },
    { find: `([A-Za-z0-9%])([${CJK}])`, replace: "$1 $2" },
    // 行尾空格、连续空行
    { find: "[ \\t]+$", replace: "", multiline: true },
    { find: "\\n{3,}", replace: "\\n\\n" },
];
// 不经过 MTT 时（测试用）按同样的规则跑：MTT 的正则工具就是 replace(new RegExp(find, "g[m]"), replace)，replace 里的 \n 换成换行
function applyTidyRules(text, rules = TIDY_RULES) {
    let t = text;
    for (const r of rules) t = t.replace(new RegExp(r.find, "g" + (r.multiline ? "m" : "")), r.replace.replace(/\\n/g, "\n"));
    return t;
}

// 【坑：……】
const PIT_RE = /【坑[：:]\s*([^】\n]*?)\s*】/g;
function findPits(text) {
    const out = [];
    for (const m of text.matchAll(PIT_RE)) if (m[1] && !out.includes(m[1])) out.push(m[1]);
    return out;
}
const supplementTitle = (pit) => `[!补料]- 坑：${pit}（`;
const hasSupplement = (text, pit) => text.includes(supplementTitle(pit));

// 第 i 行所在的块：列表项（连同子项）或段落
function blockAt(lines, i) {
    let start = i;
    if (!LIST_RE.test(lines[i]) && indentW(lines[i]) > 0 && lines[i].trim()) {
        // 列表项里的续行：往上找它的列表项
        for (let k = i - 1; k >= 0 && lines[k].trim(); k--) if (LIST_RE.test(lines[k]) && indentW(lines[k]) < indentW(lines[i])) { start = k; break; }
    }
    if (LIST_RE.test(lines[start])) {
        const w0 = indentW(lines[start]);
        let end = start;
        for (let j = start + 1; j < lines.length; j++) { if (!lines[j].trim() || indentW(lines[j]) <= w0) break; end = j; }
        return { start, end, isList: true, indent: lines[start].match(/^[ \t]*/)[0] };
    }
    const plain = (l) => l != null && l.trim() && !LIST_RE.test(l) && !/^#{1,6}\s/.test(l);
    if (/^#{1,6}\s/.test(lines[i])) return { start: i, end: i, isList: false, indent: "" };
    let end = i;
    while (start > 0 && plain(lines[start - 1])) start--;
    while (plain(lines[end + 1])) end++;
    return { start, end, isList: false, indent: "" };
}

// 坑的上下文：所在的块 + 往上最近的标题
function pitContext(text, pit) {
    const lines = text.split("\n");
    const i = lines.findIndex((l) => l.includes(`坑：${pit}】`) || l.includes(`坑:${pit}】`) || new RegExp(`【坑[：:]\\s*${escRe(pit)}\\s*】`).test(l));
    if (i < 0) return "";
    const b = blockAt(lines, i);
    let head = "";
    for (let k = b.start - 1; k >= 0; k--) if (/^#{1,6}\s/.test(lines[k])) { head = lines[k]; break; }
    return [head, ...lines.slice(b.start, b.end + 1)].filter(Boolean).join("\n");
}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 补料标注插到坑所在的块下面；坑在列表项里，就作为那一项的子内容（多缩进一级）
function insertSupplement(text, pit, callout) {
    const lines = text.split("\n");
    const re = new RegExp(`【坑[：:]\\s*${escRe(pit)}\\s*】`);
    const i = lines.findIndex((l) => re.test(l));
    if (i < 0) return null;
    const b = blockAt(lines, i);
    let add;
    if (b.isList) {
        const unit = /^\t/m.test(text) || !/^ +([-*+]|\d+[.)])\s/m.test(text) ? "\t" : "    ";
        add = callout.map((l) => b.indent + unit + l);
    } else {
        add = ["", ...callout];
        if (lines[b.end + 1] != null && lines[b.end + 1].trim()) add.push("");
    }
    lines.splice(b.end + 1, 0, ...add);
    return lines.join("\n");
}

function formatSupplement(pit, res, date, mainVaultName) {
    const one = (s) => String(s || "").replace(/\s*\n\s*/g, " ").trim();
    const out = [`> ${supplementTitle(pit)}${date}）`];
    if (res.error) { out.push(`> - 查证失败：${one(res.error).slice(0, 200)}`); return out; }
    for (const w of res.web || []) {
        if (!one(w.text)) continue;
        out.push(w.url ? `> - ${one(w.text)} —— [${one(w.title) || "来源"}](${String(w.url).trim()})` : `> - ${one(w.text)}`);
    }
    for (const n of res.notes || []) {
        if (!one(n.text)) continue;
        const rel = String(n.path || "").replace(/^\/+/, "");
        const name = rel.split("/").pop().replace(/\.md$/, "");
        out.push(rel ? `> - ${one(n.text)} —— [${name}](obsidian://open?vault=${encodeURIComponent(mainVaultName)}&file=${encodeURIComponent(rel.replace(/\.md$/, ""))})` : `> - ${one(n.text)}`);
    }
    if (out.length === 1) out.push("> - 没查到可靠来源");
    return out;
}

// claude 的回答里取出 JSON（可能包着代码块围栏或前后有话）
function parseJsonLoose(s) {
    const t = String(s).replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/, "");
    try { return JSON.parse(t); } catch (e) { /* 往下找 */ }
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("返回的不是 JSON：" + t.slice(0, 120));
}
const stripFence = (s) => String(s).replace(/^\s*```[a-z]*\n/i, "").replace(/\n```\s*$/, "").replace(/^\s+|\s+$/g, "");

// 另存的版本名：「稿子 v3」→「稿子 v4」，没有版本号的从 v2 起，已有的往上加
function nextVersionName(basename, siblings) {
    const base = basename.replace(/\s+v\d+$/i, "");
    let n = 1;
    const m0 = basename.match(/\s+v(\d+)$/i);
    if (m0) n = +m0[1];
    const re = new RegExp(`^${escRe(base)} v(\\d+)$`, "i");
    for (const s of siblings) { const m = s.match(re); if (m) n = Math.max(n, +m[1]); }
    return `${base} v${Math.max(2, n + 1)}`;
}

// 改写后检查：标题、坑、★、> 标注的数量应该不变
function structureDiff(a, b) {
    const count = (t) => ({
        "标题": (t.match(/^#{1,6}\s/gm) || []).length,
        "【坑】": (t.match(/【坑[：:]/g) || []).length,
        "【★】": (t.match(/【★/g) || []).length,
        "> 标注行": (t.match(/^\s*>/gm) || []).length,
    });
    const x = count(a), y = count(b);
    return Object.keys(x).filter((k) => x[k] !== y[k]).map((k) => `${k} ${x[k]}→${y[k]}`);
}

// ---------- 主库扫描（概念锚点检索） ----------
function walkMd(root, skip) {
    const out = [];
    const walk = (dir, rel) => {
        let ents;
        try { ents = nfs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const e of ents) {
            if (e.name.startsWith(".")) continue;
            const r = rel ? `${rel}/${e.name}` : e.name;
            if (skip(r)) continue;
            if (e.isDirectory()) walk(npath.join(dir, e.name), r);
            else if (e.name.endsWith(".md")) out.push(r);
        }
    };
    walk(root, "");
    return out;
}
function parseAliases(fm) {
    const out = [];
    const m = fm.match(/^(aliases|alias):[ \t]*(.*)$/m);
    if (!m) return out;
    const inline = m[2].trim();
    if (inline) {
        inline.replace(/^\[|\]$/g, "").split(",").forEach((x) => out.push(x));
    } else {
        const rest = fm.slice(m.index + m[0].length).split("\n");
        for (const l of rest.slice(1)) { const k = l.match(/^\s+-\s+(.*)$/); if (!k) break; out.push(k[1]); }
    }
    return out.map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}
// 一篇笔记里提到任何一个名字的块（列表项连子项，或段落），按起始行去重
function mentionBlocks(text, names) {
    const { body, offset } = splitFrontmatter(text);
    const skipLines = offset ? text.slice(0, offset).split("\n").length - 1 : 0;
    const lines = text.split("\n");
    const tests = names.map((n) => /^[\x00-\x7f]+$/.test(n)
        ? ((re) => (l) => re.test(l))(new RegExp(`(?<![A-Za-z0-9])${escRe(n)}(?![A-Za-z0-9])`, "i"))
        : (l) => l.includes(n));
    const out = [], seen = new Set();
    let inCode = false;
    for (let i = skipLines; i < lines.length; i++) {
        if (/^\s*(```|~~~)/.test(lines[i])) { inCode = !inCode; continue; }
        if (inCode || !tests.some((t) => t(lines[i]))) continue;
        let b = blockAt(lines, i);
        // 子项命中：取到顶层列表项，上下文才完整（太长就只取命中的那一项）
        if (b.isList && indentW(lines[b.start]) > 0) {
            for (let k = b.start - 1; k >= 0 && lines[k].trim(); k--) if (LIST_RE.test(lines[k]) && indentW(lines[k]) === 0) { const top = blockAt(lines, k); if (top.end - top.start < 40) b = top; break; }
        }
        if (seen.has(b.start)) continue;
        seen.add(b.start);
        out.push({ line: b.start, text: lines.slice(b.start, b.end + 1).join("\n") });
        i = Math.max(i, b.end);
    }
    void body;
    return out;
}
const JOURNAL_RE = /^(\d{4})[_-](\d{1,2})[_-](\d{1,2})$/;

// ---------- 插件 ----------
const GROUPS = [
    { label: "① 脉络", items: [["grill", "grill-me 压测稿子"], ["diverge", "方向发散"]] },
    { label: "② 落实", items: [["pits", "填坑"], ["concept", "概念锚点检索"], ["qws", "QWS 追问补料"]] },
    { label: "④ 扩写", items: [["expand", "扩写 / 补充"], ["formal", "正式化"], ["wenbai", "文白交杂"]] },
    { label: "⑤ 修整", items: [["tidy", "一键规范排版"], ["join", "列表块连成段落"]] },
];
const NAMES = Object.fromEntries(GROUPS.flatMap((g) => g.items));

// 改写预设：风格提示词 + 要求
const REWRITE = {
    expand: { style: "form", expr: true, ask: "按风格提示词把它扩写、补充：说得简略的地方展开，补上过渡、必要的解释和例子。范围里以 `> [!补料]` 开头的折叠标注是查来的材料，可以拿来扩写（标注本身原样保留）。不改主张，不加稿子、补料和我的笔记里都没有的事实、数据、引语。" },
    formal: { style: "文章稿风格提示词", ask: "按文章稿风格提示词把它改得正式、书面：口语词、重复、语气词换成书面表达，句子更紧凑，意思和论证顺序不变。" },
    // 文白交杂以文章稿总章为底（总章「用词」一节的文白混杂是从博文里整理的真实用法），另一份只说要往前推多少
    wenbai: { style: ["文章稿风格提示词", "文白交杂风格提示词"], ask: "按风格提示词改写成文白交杂：底子是文章稿风格，文言词和文言句式自然地长在白话里，放在下判断、转折、收束的地方，不要处处都文。意思和论证顺序不变。" },
    join: { style: "form", ask: "把范围里的列表块（母块、子块的层级）改写成连贯的整段文字：每个信息点都保留、顺序不变，可以补连接词和过渡，不加新观点。范围里本来就不是列表的部分原样保留。" },
};
const IRON_RULES = [
    "铁规矩：",
    "- 只改正文句子。以 > 开头的行（引用、标注、[!补料] 等）、标题行（#）、表格行（|）、分隔线、【★……】和【坑：……】标记，一律原样保留，位置不变。",
    "- 只输出改写后的 Markdown 正文：不要解释，不要代码块围栏，不要属性区。",
].join("\n");

module.exports = class DraftDesk extends Plugin {
    async onload() {
        this.settings = Object.assign({}, DEFAULTS, await this.loadData());
        this.running = new Map();   // key -> { name, cancel() }
        this.statusEl = this.addStatusBarItem();
        this.statusEl.addClass("dd-status");
        this.statusEl.onclick = (e) => this.statusMenu(e);
        this.statusEl.hide();
        for (const g of GROUPS) for (const [id, name] of g.items)
            this.addCommand({ id, name, checkCallback: (checking) => {
                const v = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!v?.file) return false;
                if (!checking) this.run(id, v);
                return true;
            } });
        this.addSettingTab(new DDSettings(this.app, this));
        this.refreshWritingPanel();
    }
    onunload() {
        for (const r of this.running.values()) r.cancel();
        this.refreshWritingPanel();
    }
    async saveSettings() { await this.saveData(this.settings); }
    // 第二大脑的写作模式面板开着的话，重画一下按钮（启用 / 停用稿件台时）
    refreshWritingPanel() {
        setTimeout(() => this.app.workspace.getLeavesOfType("sb-related").forEach((l) => l.view?.renderTools?.()), 50);
    }

    // 写作模式面板（第二大脑 RelatedView.renderTools）调这个，在「🤖 Claudian」后面接四个下拉按钮
    renderButtons(el, getView) {
        for (const g of GROUPS) {
            const b = el.createEl("button", { text: `${g.label} ▾`, cls: "dd-btn" });
            b.onclick = (evt) => {
                const m = new Menu();
                for (const [id, name] of g.items) m.addItem((it) => {
                    const busy = [...this.running.keys()].some((k) => k.startsWith(id + ":"));
                    it.setTitle(busy ? `${name}（正在跑，点这里取消）` : name).onClick(() => {
                        const v = getView();
                        if (!v?.file) return new Notice("先打开要写的那篇稿子");
                        this.run(id, v);
                    });
                });
                m.showAtMouseEvent(evt);
            };
        }
    }

    // ----- 公共 -----
    // 主库：设置里填了就用，否则用第二大脑设置里的第一个「外部素材库」
    mainVault() {
        let root = String(this.settings.mainVault || "").trim().replace(/^~(?=\/)/, nos.homedir());
        let name = String(this.settings.mainVaultName || "").trim();
        if (!root) {
            const xv = this.app.plugins.plugins[SB_ID]?.extraVaults?.()?.[0];
            if (xv) { root = xv.root; name = name || xv.name; }
        }
        if (!root || !nfs.existsSync(root)) throw new Error("找不到主库：在稿件台设置里填主库路径（或在第二大脑设置里填「外部素材库」）");
        return { root, name: name || npath.basename(root) };
    }
    readStyle(name) {
        const p = npath.join(this.mainVault().root, STYLE_DIR, name + ".md");
        if (!nfs.existsSync(p)) throw new Error(`主库里找不到风格提示词：${STYLE_DIR}/${name}.md`);
        return { path: p, text: splitFrontmatter(nfs.readFileSync(p, "utf8")).body.trim() };
    }
    // 私密：第二大脑设置里的「私密链接」（比如「宝」）——同名文件夹和提到 [[它]] 的内容都不进补料、材料包
    privateNames() {
        return String(this.app.plugins.plugins[SB_ID]?.settings?.privateLinks || "").split(/[,，\n]/).map((x) => x.trim()).filter(Boolean);
    }
    isPrivate(rel, text = "") {
        return this.privateNames().some((n) => rel.startsWith(n + "/") || rel.split("/").pop().replace(/\.md$/, "") === n || text.includes(`[[${n}]]`) || text.includes(`[[${n}|`));
    }
    fm(file) { return this.app.metadataCache.getFileCache(file)?.frontmatter || {}; }
    // 风格：《文章稿风格提示词》是总章，所有稿子都读；口播稿再叠加《口播稿风格提示词》（看属性「形式」，没有就看文件名）
    styleForForm(file) {
        const form = [this.fm(file)["形式"]].flat().join(" ") || file.basename;
        return /口播|播客|视频|演讲/.test(form) ? ["文章稿风格提示词", "口播稿风格提示词"] : ["文章稿风格提示词"];
    }
    // 选题名：属性「选题」→ 主库选题页里 稿件: 写着这篇的 → 稿名
    topicName(file) {
        const raw = [this.fm(file)["选题"]].flat().filter(Boolean)[0];
        if (raw) {
            const m = String(raw).match(/\[\[([^\]|#]+)/);
            return safeName((m ? m[1] : String(raw)).split("/").pop());
        }
        try {
            const dir = npath.join(this.mainVault().root, "选题");
            for (const n of nfs.readdirSync(dir)) {
                if (!n.endsWith(".md")) continue;
                const fm = splitFrontmatter(nfs.readFileSync(npath.join(dir, n), "utf8")).fm;
                if (fm && fm.includes(file.path)) return safeName(n.replace(/\.md$/, ""));
            }
        } catch (e) { /* 主库读不了就用稿名 */ }
        return safeName(file.basename.replace(/\s+v\d+$/i, ""));
    }
    outFolder(file) {
        const mv = this.mainVault();
        const rel = `${OUT_ROOT}/${this.topicName(file)}`;
        nfs.mkdirSync(npath.join(mv.root, rel), { recursive: true });
        return { abs: npath.join(mv.root, rel), rel, mv };
    }
    mainLink(mv, rel) { return `obsidian://open?vault=${encodeURIComponent(mv.name)}&file=${encodeURIComponent(rel.replace(/\.md$/, ""))}`; }
    // 作用范围：选中了就是选中部分，否则整篇正文（属性区不动）
    scope(view) {
        const ed = view.editor;
        if (ed.somethingSelected()) {
            const from = ed.getCursor("from"), to = ed.getCursor("to");
            return { whole: false, text: ed.getSelection(), from: ed.posToOffset(from), to: ed.posToOffset(to) };
        }
        const all = ed.getValue(), { offset } = splitFrontmatter(all);
        return { whole: true, text: all.slice(offset), from: offset, to: all.length };
    }

    // 表达与典故素材库里和这段意思相近的卡片（第二大脑的语义检索）；没有第二大脑或检索失败就返回空
    async exprCandidates(text, limit = 15) {
        const sb = this.app.plugins.plugins[SB_ID];
        if (!sb?.searchExtra) return [];
        try {
            const mv = this.mainVault(), pages = new Set();
            try {
                for (const n of nfs.readdirSync(npath.join(mv.root, EXPR_DIR))) {
                    if (!n.endsWith(".md")) continue;
                    if (/^类别:/m.test(splitFrontmatter(nfs.readFileSync(npath.join(mv.root, EXPR_DIR, n), "utf8")).fm)) pages.add(EXPR_DIR + n);
                }
            } catch (e) { /* 没有素材库文件夹 */ }
            const keep = (rel, line, t) => (pages.has(rel) && line > 0) || FUNNY_RE.test(t || "");
            return (await sb.searchExtra(String(text).slice(0, 1500), { vault: mv.name, limit, perFile: limit, exclude: (rel, line, t) => !keep(rel, line, t) || this.isPrivate(rel, t) }))
                .map((h) => ({ rel: h.rel, text: h.text.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\s*\n\s*/g, " ").slice(0, 300) }));
        } catch (e) { console.warn("[draft-desk] 表达检索", e); return []; }
    }
    exprPrompt(cands, forBrainstorm) {
        if (!cands.length) return [];
        return [
            "下面是我记下的表达与典故素材（按意思从我的素材库里检索出来的候选，每条后面标着来源：自写 = 我自己写的；摘抄 = 别人的，带作者或书名；不确定、AI 补充 = 来路不清）：",
            ...cands.map((c, i) => `${i + 1}. ${c.text}`),
            forBrainstorm
                ? "每个方向如果有贴得上的，在「可以用的表达」里列一两条（原文 + 来源标记），贴不上就不写这一行，不要硬配。"
                : "适当用上贴得上的：自写的可以直接用或改几个字；摘抄的不能写成我的原话，要么当引用并注明出处，要么只借句式和意思；典故、诗句当典故用；不确定、AI 补充的不要直接用，放进「拿不准」。一处到几处点睛就够，不要为了用而堆。",
            "",
        ];
    }
    splitExprNote(result) {
        const i = result.lastIndexOf(EXPR_NOTE);
        return i < 0 ? { text: result, note: "" } : { text: stripFence(result.slice(0, i)), note: result.slice(i + EXPR_NOTE.length).trim() };
    }

    // 同一个操作重复点 = 取消
    async run(id, view) {
        const key = `${id}:${view.file.path}`;
        if (this.running.has(key)) { this.running.get(key).cancel(); new Notice(`已取消：${NAMES[id]}`); return; }
        const fn = { grill: this.grill, diverge: this.diverge, pits: this.fillPits, concept: this.concept, qws: this.qws,
                     expand: this.rewrite, formal: this.rewrite, wenbai: this.rewrite, join: this.rewrite, tidy: this.tidy }[id];
        try { await fn.call(this, view, id, key); }
        catch (e) {
            if (e?.cancelled) return;
            console.error("[draft-desk]", id, e);
            new Notice(`稿件台 · ${NAMES[id]}出错：${String(e?.message || e).slice(0, 300)}`, 10000);
        } finally { this.endTask(key); }
    }
    beginTask(key, label) {
        const task = { label, children: new Set(), cancelled: false };
        task.cancel = () => { task.cancelled = true; task.children.forEach((c) => { try { c.kill(); } catch (e) { /* 已经退出 */ } }); this.endTask(key); };
        this.running.set(key, task);
        this.updateStatus();
        return task;
    }
    endTask(key) { if (this.running.delete(key)) this.updateStatus(); }
    setTaskLabel(task, label) { task.label = label; this.updateStatus(); }
    updateStatus() {
        const ts = [...this.running.values()];
        if (!ts.length) { this.statusEl.hide(); return; }
        this.statusEl.setText(`稿件台：${ts.map((t) => t.label).join(" · ")}`);
        this.statusEl.setAttr("aria-label", "点这里取消");
        this.statusEl.show();
    }
    statusMenu(evt) {
        const m = new Menu();
        for (const [key, t] of this.running) m.addItem((it) => it.setTitle(`取消：${t.label}`).onClick(() => { t.cancel(); new Notice("已取消"); }));
        m.showAtMouseEvent(evt);
    }

    // 本机 claude -p（照 outline-block）：tools 为空就不给工具
    callClaude(prompt, task, { tools = [], cwd = nos.tmpdir() } = {}) {
        return new Promise((resolve, reject) => {
            const bin = String(this.settings.claudePath || DEFAULTS.claudePath).replace(/^~(?=\/)/, nos.homedir());
            const args = ["-p", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config"];
            if (tools.length) args.push("--allowedTools", tools.join(","));
            const env = { ...process.env, PATH: [npath.join(nos.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":") };
            let child;
            try { child = spawn(bin, args, { cwd, env }); }
            catch (e) { return reject(new Error(`启动 claude 失败（${bin}）：${e.message}`)); }
            task.children.add(child);
            let out = "", err = "";
            const sec = Number(this.settings.timeoutSec) || DEFAULTS.timeoutSec;
            const timer = setTimeout(() => { child.kill(); reject(new Error(`等了 ${sec} 秒没有结果，已放弃`)); }, sec * 1000);
            child.stdout.on("data", (d) => (out += d));
            child.stderr.on("data", (d) => (err += d));
            child.on("error", (e) => { clearTimeout(timer); reject(new Error(`启动 claude 失败（${bin}）：${e.message}`)); });
            child.on("close", (code) => {
                clearTimeout(timer);
                task.children.delete(child);
                if (task.cancelled) return reject({ cancelled: true });
                let d;
                try { d = JSON.parse(out); } catch (e) { return reject(new Error((err || out || `claude 退出码 ${code}`).trim().slice(0, 300))); }
                if (d.is_error) return reject(new Error(String(d.result || "claude 返回错误").slice(0, 300)));
                resolve(String(d.result || ""));
            });
            child.stdin.end(prompt);
        });
    }

    // 交给 Claudian：新开一个对话标签（照 qws-bridge）
    async sendToClaudian(prompt) {
        const cl = this.app.plugins.plugins[CLAUDIAN_ID];
        const fallback = async (why) => {
            await navigator.clipboard.writeText(prompt);
            if (cl) await this.app.commands.executeCommandById(`${CLAUDIAN_ID}:open-view`);
            new Notice(`提示词已复制到剪贴板（${why}），在 Claudian 里粘贴发送即可`, 8000);
        };
        if (!cl) return fallback("没找到 Claudian 插件");
        try {
            let view = cl.getView?.();
            if (!view) { await this.app.commands.executeCommandById(`${CLAUDIAN_ID}:open-view`); await sleep(800); view = cl.getView?.(); }
            if (!view) return fallback("Claudian 视图没打开");
            if (view.leaf) this.app.workspace.revealLeaf(view.leaf);
            if (cl.canCreateNewTab?.()) { await cl.openNewTab(); await sleep(500); }
            const tab = view.getTabManager?.()?.getActiveTab?.();
            if (!tab || tab.state?.isStreaming) return fallback("当前对话还在输出，没法新开标签");
            const el = tab.dom?.inputEl;
            if (!el) return fallback("找不到输入框");
            el.focus();
            el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            await sleep(80);
            const { EditorView } = require("@codemirror/view");
            const cm = EditorView.findFromDOM(el);
            if (!cm) return fallback("输入框编辑器没初始化");
            cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: prompt }, selection: { anchor: prompt.length } });
            cm.focus();
            const ctrl = tab.controllers?.inputController;
            if (ctrl?.sendMessage) { await sleep(120); await ctrl.sendMessage(); new Notice("已发给 Claudian"); }
            else new Notice("提示词已放进 Claudian 输入框，确认后发送");
        } catch (e) {
            console.error("[draft-desk] claudian", e);
            return fallback("自动填入失败");
        }
    }

    // ----- ⑤ 规范排版：MTT 快捷指令「稿件台 · 规范排版」-----
    tidyBatch(mtt) {
        const s = mtt.settings;
        s.savedBatches ||= [];
        let b = s.savedBatches.find((x) => x.id === TIDY_BATCH.id);
        if (b) return { batch: b, created: false };
        // 快照的其余字段照用户已有的快捷指令抄一份，MTT 认得
        const tpl = s.savedBatches.flatMap((x) => x.operations || []).find((o) => o.settingsSnapshot?.regex && o.settingsSnapshot?.whitespace)?.settingsSnapshot
            || { regex: {}, whitespace: { compress: true, trim: true, removeAll: false, removeTabs: false } };
        b = { ...TIDY_BATCH, operations: TIDY_RULES.map((r) => ({ toolId: "regex", settingsSnapshot: {
            ...JSON.parse(JSON.stringify(tpl)), savedBatches: [],
            regex: { findText: r.find, replaceText: r.replace, caseInsensitive: false, multiline: !!r.multiline },
        } })) };
        s.savedBatches.push(b);
        return { batch: b, created: true };
    }
    async tidy(view) {
        const mtt = this.app.plugins.plugins[MTT_ID];
        if (!mtt?.batchManager?.applyBatchOperationToText) throw new Error("需要 My Text Tools 插件（没装或没启用）");
        const { batch, created } = this.tidyBatch(mtt);
        if (created) { await mtt.saveSettings(); new Notice(`已在 My Text Tools 里建好快捷指令「${TIDY_BATCH.name}」，规则可以在那边增删`); }
        const ed = view.editor, sc = this.scope(view);
        const p = protect(sc.text);
        let t = p.text;
        for (const op of batch.operations) t = await mtt.batchManager.applyBatchOperationToText(op, t, "note");
        t = p.restore(t);
        if (t === sc.text) { new Notice("排版已经是规范的，没有要改的"); return; }
        ed.replaceRange(t, ed.offsetToPos(sc.from), ed.offsetToPos(sc.to));   // 一次编辑，⌘Z 一步撤回
        new Notice(`规范排版完成（${sc.whole ? "整篇" : "选中部分"}），⌘Z 可撤回`);
    }

    // ----- ④ 改写类 + ⑤ 连成段落 -----
    async rewrite(view, id, key) {
        const file = view.file, ed = view.editor, sc = this.scope(view);
        if (!sc.text.trim()) throw new Error("范围里没有内容");
        const preset = REWRITE[id];
        const styles = [preset.style].flat().flatMap((n) => (n === "form" ? this.styleForForm(file) : [n])).map((n) => this.readStyle(n));
        const task = this.beginTask(key, `正在${NAMES[id]}…`);
        const cands = preset.expr ? await this.exprCandidates(sc.text) : [];
        const prompt = [
            `下面是我的稿子《${file.basename.replace(/\s+v\d+$/i, "")}》的${sc.whole ? "全文" : "一段"}。${preset.ask}`,
            "", IRON_RULES, "",
            ...this.exprPrompt(cands, false),
            ...(cands.length ? [`正文写完后，另起一行写「${EXPR_NOTE}」，下面用两行交代（这部分不算正文）：`, "- 用了：哪几条（原文开头几个字 + 来源标记）、放在哪一段", "- 拿不准、没放进去：哪几条、可以放在哪、为什么拿不准", ""] : []),
            ...styles.flatMap((st) => [`风格提示词「${npath.basename(st.path, ".md")}」：`, "<<<", st.text, ">>>", ""]),
            sc.whole ? "稿子全文：" : "要改的这段：", "<<<", sc.text, ">>>",
        ].join("\n");
        const { text: result, note } = this.splitExprNote(stripFence(await this.callClaude(prompt, task)));
        if (!result) throw new Error("claude 没有返回内容");
        const diff = structureDiff(sc.text, result);
        if (sc.whole) {
            const f = await this.saveVersion(file, result, NAMES[id]);
            new Notice(`已另存为「${f.basename}」${diff.length ? `（注意：${diff.join("，")}，和原稿对不上，看一下）` : ""}`, 8000);
            if (note) new ResultModal(this.app, { title: `${NAMES[id]} · 用到的表达`, md: `${note}\n\n拿不准的那几条要不要用，你决定；要用就直接改「${f.basename}」。`, sourcePath: f.path }).open();
            return;
        }
        this.endTask(key);
        new PreviewModal(this.app, { title: NAMES[id], before: sc.text, after: result, note, warn: diff.length ? `标记和原文对不上：${diff.join("，")}` : "",
            onReplace: () => this.applyToSelection(view, file, sc, result, "replace"),
            onInsert: () => this.applyToSelection(view, file, sc, result, "insert") }).open();
    }
    // 等结果期间那段被改过就不动稿子，结果放进剪贴板
    async applyToSelection(view, file, sc, result, how) {
        const ed = view.editor;
        const doc = view.file === file ? ed.getValue() : null;
        const at = doc == null ? -1 : (doc.slice(sc.from, sc.to) === sc.text ? sc.from : (doc.indexOf(sc.text) >= 0 && doc.indexOf(sc.text) === doc.lastIndexOf(sc.text) ? doc.indexOf(sc.text) : -1));
        if (at < 0) {
            await navigator.clipboard.writeText(result);
            new Notice("那段在等结果期间被改过了，没替换；结果已复制到剪贴板", 8000);
            return;
        }
        const end = at + sc.text.length;
        if (how === "replace") ed.replaceRange(result, ed.offsetToPos(at), ed.offsetToPos(end));
        else ed.replaceRange("\n\n" + result, ed.offsetToPos(end));
        new Notice(how === "replace" ? "已替换，⌘Z 可撤回" : "已插在下面");
    }
    // 整篇另存 v2 / v3…：属性照抄，记上底稿、改写方式、作者
    async saveVersion(file, body, how) {
        const raw = await this.app.vault.read(file);
        const { fm } = splitFrontmatter(raw);
        const dir = file.parent?.path && file.parent.path !== "/" ? file.parent.path : "";
        const siblings = (file.parent?.children || []).filter((f) => f instanceof TFile).map((f) => f.basename);
        const name = nextVersionName(file.basename, siblings);
        const path = (dir ? dir + "/" : "") + name + ".md";
        if (this.app.vault.getAbstractFileByPath(path)) throw new Error(`「${path}」已存在`);
        const nf = await this.app.vault.create(path, (fm ? fm + (fm.endsWith("\n") ? "" : "\n") : "") + body.replace(/\n*$/, "\n"));
        await this.app.fileManager.processFrontMatter(nf, (m) => {
            m["底稿"] = `[[${file.basename}]]`;
            m["改写"] = how;
            m["作者"] = "AI 初稿";
        });
        await this.app.workspace.getLeaf("tab").openFile(nf);
        this.reindex();
        return nf;
    }
    // 稿子库新增了文件：重跑主库的索引脚本（选题台靠它核对稿件）
    reindex() {
        try {
            const sh = npath.join(this.mainVault().root, "scripts", "index-obsidian-vault.sh");
            if (!nfs.existsSync(sh)) return;
            const c = spawn("bash", [sh], { cwd: nos.tmpdir() });
            let err = "";
            c.stderr.on("data", (d) => (err += d));
            c.on("close", (code) => { if (code) new Notice("稿件索引脚本没跑成功：" + err.slice(0, 200)); });
        } catch (e) { new Notice("稿件索引脚本没跑成功：" + e.message); }
    }

    // ----- ① 方向发散 -----
    async diverge(view, id, key) {
        const file = view.file, sc = this.scope(view);
        if (!sc.text.trim()) throw new Error("范围里没有内容");
        const task = this.beginTask(key, "正在发散方向…");
        const cands = await this.exprCandidates(sc.text);
        const form = [this.fm(file)["形式"]].flat().filter(Boolean).join(" ");
        const prompt = [
            `下面是我正在写的稿子《${file.basename}》${form ? `（形式：${form}）` : ""}的${sc.whole ? "全文" : "一部分"}。`,
            "给出 3–5 个和现在不同的写法方向：可以换切入角度、换主张、换结构、换受众。方向之间要真的不一样，不要只是措辞不同。",
            "每个方向用这个格式：",
            "### 方向 N：<短名字>",
            "- 换了什么：……",
            "- 一句话主张：……",
            "- 开头第一句：……",
            "- 为什么值得试：……",
            ...(cands.length ? ["- 可以用的表达：……（贴得上才写）"] : []),
            "只输出这些方向，不要别的话。", "",
            ...this.exprPrompt(cands, true),
            "<<<", sc.text, ">>>",
        ].join("\n");
        const result = stripFence(await this.callClaude(prompt, task));
        const out = this.outFolder(file);
        const rel = `${out.rel}/方向发散.md`, abs = npath.join(out.mv.root, rel);
        const head = nfs.existsSync(abs) ? "" : `# 方向发散：${this.topicName(file)}\n\n> 稿件台生成。每跑一次在后面追加一节。\n`;
        nfs.appendFileSync(abs, `${head}\n## ${now("YYYY-MM-DD HH:mm")}（稿子：${file.path}）\n\n${result}\n`);
        this.endTask(key);
        new ResultModal(this.app, { title: "方向发散", md: result, sourcePath: file.path, link: this.mainLink(out.mv, rel), linkText: `在主库打开「${rel}」` }).open();
    }

    // ----- ② 填坑：每个坑单独查，最多 3 个并行，查完一个插一个 -----
    async fillPits(view, id, key) {
        const file = view.file, sc = this.scope(view);
        const mv = this.mainVault();
        const all = await this.app.vault.read(file);
        const pits = findPits(sc.text);
        if (!pits.length) { new Notice("范围里没有「【坑：……】」标记"); return; }
        const todo = pits.filter((p) => !hasSupplement(all, p));
        if (!todo.length) { new Notice(`范围里的 ${pits.length} 个坑都已经有补料了`); return; }
        const task = this.beginTask(key, `填坑 0/${todo.length}…`);
        const title = file.basename.replace(/\s+v\d+$/i, "");
        const sb = this.app.plugins.plugins[SB_ID];
        let done = 0, failed = 0;
        const one = async (pit) => {
            const ctx = pitContext(all, pit);
            let hits = [];
            if (sb?.searchExtra) { try { hits = (await sb.searchExtra(`${pit}\n${ctx}`, { vault: mv.name, limit: 10, exclude: (rel) => rel.startsWith(OUT_ROOT + "/") || rel.startsWith("Templates/") })).filter((h) => !this.isPrivate(h.rel, h.text)); } catch (e) { console.warn("[draft-desk] 语义检索", e); } }
            const prompt = [
                `我在写稿子《${title}》，稿子里留了一个坑，请你查证补料。`,
                `坑：${pit}`, "坑所在的段落：", "<<<", ctx, ">>>", "",
                "做两件事：",
                "1. 联网查（WebSearch / WebFetch）：找能填这个坑的事实、数据、案例。每条都要有可靠来源的网址，数字、时间、主体写具体。不要编，查不到就不写。",
                `2. 查我的主库（当前目录就是主库，可以用 Grep / Read）：找我自己笔记和日记里相关的记录。跳过 选题/_采访/ 和 Templates/。日记里有摘抄，摘抄也可以列，但要写明是摘抄。${this.privateNames().length ? `稿子要公开发表，私密内容一律不要：${this.privateNames().map((n) => `「${n}/」文件夹、提到 [[${n}]] 的段落`).join("、")}。` : ""}`,
                hits.length ? "下面是按意思从主库检索出的候选段落（路径相对主库根目录），先看这些，有用的直接列，不够再自己搜：\n" + hits.map((h, i) => `[${i + 1}] ${h.rel}\n${h.text.slice(0, 600)}`).join("\n\n") : "",
                "", "最后只输出一个 JSON，不要别的话：",
                '{"web":[{"text":"一句话写清事实或案例","title":"来源标题","url":"https://..."}],"notes":[{"text":"这条记录说了什么","path":"相对主库根目录的路径.md"}]}',
                "web 最多 5 条，notes 最多 5 条；没有就给空数组。",
            ].join("\n");
            let res;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    res = parseJsonLoose(await this.callClaude(prompt, task, { tools: ["WebSearch", "WebFetch", "Read", "Grep", "Glob"], cwd: mv.root }));
                    res.notes = (res.notes || []).filter((n) => !this.isPrivate(String(n.path || "").replace(/^\/+/, ""), String(n.text || "")));
                    break;
                } catch (e) {
                    if (e?.cancelled || task.cancelled) throw { cancelled: true };
                    res = { error: e.message || String(e) };
                }
            }
            if (task.cancelled) throw { cancelled: true };
            if (res.error) failed++;
            const callout = formatSupplement(pit, res, now("YYYY-MM-DD"), mv.name);
            let missing = false;
            await this.app.vault.process(file, (data) => {
                if (hasSupplement(data, pit)) return data;
                const t = insertSupplement(data, pit, callout);
                if (t == null) { missing = true; return data; }
                return t;
            });
            if (missing) new Notice(`坑「${pit}」在稿子里找不到了（被改掉了？），这条没插`);
            done++;
            this.setTaskLabel(task, `填坑 ${done}/${todo.length}…`);
        };
        const queue = [...todo];
        await Promise.all(Array.from({ length: Math.min(PIT_PARALLEL, queue.length) }, async () => { while (queue.length && !task.cancelled) await one(queue.shift()); }));
        new Notice(`填坑完成：${done} 个${failed ? `，其中 ${failed} 个查证失败（原因写在补料里）` : ""}`, 8000);
    }

    // ----- ② 概念锚点检索 -----
    conceptAtCursor(view) {
        const ed = view.editor;
        if (ed.somethingSelected()) return ed.getSelection().trim();
        const c = ed.getCursor(), line = ed.getLine(c.line);
        for (const m of line.matchAll(/\[\[([^\]]+)\]\]/g)) if (c.ch >= m.index && c.ch <= m.index + m[0].length) return m[1].split("|")[0].split("#")[0].split("/").pop().trim();
        return "";
    }
    async concept(view, id, key) {
        let name = this.conceptAtCursor(view);
        if (!name) name = await new InputModal(this.app, "概念锚点检索", "要检索哪个概念？（页面名或别名）").ask();
        if (!name) return;
        const file = view.file, mv = this.mainVault();
        const task = this.beginTask(key, `正在检索「${name}」…`);
        await sleep(0);
        const skip = (r) => r.startsWith(OUT_ROOT + "/") || r === OUT_ROOT || r.startsWith("Templates/") || r === "Templates" || this.privateNames().some((n) => r === n || r.startsWith(n + "/"));
        const rels = walkMd(mv.root, skip);
        const texts = new Map();
        const read = (r) => { if (!texts.has(r)) { try { texts.set(r, nfs.readFileSync(npath.join(mv.root, r), "utf8")); } catch (e) { texts.set(r, ""); } } return texts.get(r); };
        // 找概念页：页名一样，或别名里有
        const lower = name.toLowerCase();
        let page = rels.find((r) => r.split("/").pop().replace(/\.md$/, "").toLowerCase() === lower);
        let aliases = [];
        if (!page) for (const r of rels) {
            const fm = splitFrontmatter(read(r)).fm;
            if (fm && /alias/.test(fm) && parseAliases(fm).some((a) => a.toLowerCase() === lower)) { page = r; break; }
        }
        if (page) aliases = parseAliases(splitFrontmatter(read(page)).fm);
        const pageName = page ? page.split("/").pop().replace(/\.md$/, "") : name;
        const names = [...new Set([pageName, ...aliases, name].filter((n) => n && n.trim()))];
        // 扫全库
        const hits = [];
        for (let i = 0; i < rels.length; i++) {
            const r = rels[i];
            if (r === page) continue;
            const t = read(r);
            if (!names.some((n) => t.toLowerCase().includes(n.toLowerCase()))) continue;
            for (const b of mentionBlocks(t, names)) if (!this.isPrivate(r, b.text)) hits.push({ rel: r, ...b });
            if (i % 300 === 0) { await sleep(0); if (task.cancelled) return; }
        }
        if (hits.length > MANY_HITS) {
            this.endTask(key);
            const ok = await new ConfirmModal(this.app, "命中太多", `「${names.join(" / ")}」在主库里有 ${hits.length} 处，材料包会很大（上限 15 万字，超出的截掉）。继续吗？`).ask();
            if (!ok) return;
            this.beginTask(key, `正在整理「${name}」…`);
        }
        // 意思相近、但没点名的段落（第二大脑的语义检索）
        let near = [];
        const sb = this.app.plugins.plugins[SB_ID];
        if (sb?.searchExtra) {
            try {
                const seen = new Set(hits.map((h) => `${h.rel}:${h.line}`));
                const def = page ? splitFrontmatter(read(page)).body.slice(0, 600) : "";
                near = (await sb.searchExtra(`${names.join(" ")}\n${def}`, { vault: mv.name, limit: 15, exclude: (rel, line) => skip(rel) || rel === page || seen.has(`${rel}:${line}`) }))
                    .filter((h) => !names.some((n) => h.text.toLowerCase().includes(n.toLowerCase())));
            } catch (e) { console.warn("[draft-desk] 语义检索", e); }
        }
        if (this.running.get(key)?.cancelled) return;
        const jdate = (r) => { const m = r.split("/").pop().replace(/\.md$/, "").match(JOURNAL_RE); return m ? `${m[1]}${m[2].padStart(2, "0")}${m[3].padStart(2, "0")}` : null; };
        const link = (r) => `[[${r.replace(/\.md$/, "")}|${r.split("/").pop().replace(/\.md$/, "")}]]`;
        const journals = hits.filter((h) => jdate(h.rel)).sort((a, b) => jdate(a.rel).localeCompare(jdate(b.rel)) || a.line - b.line);
        const others = hits.filter((h) => !jdate(h.rel)).sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);
        const parts = [];
        let size = 0, cut = 0;
        const add = (s) => { if (size + s.length > MAX_PACK) { cut++; return; } parts.push(s); size += s.length; };
        add(`# 概念材料包：${pageName}\n\n> 稿件台生成 ${now("YYYY-MM-DD HH:mm")} · 名字：${names.join(" / ")} · 点名提到 ${hits.length} 处（${new Set(hits.map((h) => h.rel)).size} 篇）· 意思相近 ${near.length} 处 · 稿子：${file.path}\n`);
        if (page) {
            // 概念页常常只有属性（def、related 这些），属性也放进来
            const pg = splitFrontmatter(read(page)), props = pg.fm.replace(/^---\n|\n---[ \t]*\n?$/g, "").trim();
            add(`## 概念页：${link(page)}\n${props ? `\n属性：\n\n${props}\n` : ""}\n${pg.body.trim() || "（正文是空的）"}\n`);
        } else add(`## 概念页\n\n主库里没有叫「${name}」的页面，下面只按这个词检索。\n`);
        if (journals.length) { add("## 日记"); let last = ""; for (const h of journals) { add(`${h.rel !== last ? `\n### ${link(h.rel)}\n` : ""}\n${h.text}`); last = h.rel; } }
        if (others.length) { add("\n## 其他笔记"); let last = ""; for (const h of others) { add(`${h.rel !== last ? `\n### ${link(h.rel)}\n` : ""}\n${h.text}`); last = h.rel; } }
        if (near.length) { add("\n## 意思相近、但没点名的段落（语义检索）"); for (const h of near) add(`\n### ${link(h.rel)}\n\n${h.text}`); }
        if (cut) parts.push(`\n> 超过 15 万字，后面 ${cut} 段没放进来。`);
        const out = this.outFolder(file);
        const packRel = `${out.rel}/概念-${safeName(pageName)}.md`;
        nfs.writeFileSync(npath.join(out.mv.root, packRel), parts.join("\n") + "\n");
        this.endTask(key);
        await this.sendToClaudian([
            `我在写稿子「${file.path}」（就在当前库里）。请结合这篇稿子，围绕概念「${pageName}」和我展开讨论。`,
            `材料包在「${npath.join(out.mv.root, packRel)}」（主库）：概念页正文、我所有点名提到它（含别名 ${names.join(" / ")}）的日记和笔记段落（日记按时间排），以及意思相近但没点名的段落。先读完稿子和材料包再开始。`,
            "- 先讲清楚：在我的笔记里这个概念是什么意思、我是怎么用它的、前后有没有变化",
            "- 再看这篇稿子：它在稿子里该怎么用、放在哪一段、还能往哪延伸",
            "- 日记里有摘抄，摘抄不等于我的观点；拿不准某段是不是我写的，就当成问题问我",
            "- 一次只推进一个话题，等我回应",
            `- 我说「结束」或「写纪要」时，把纪要写成「${npath.join(out.abs, `概念-${safeName(pageName)}-讨论纪要.md`)}」：结论、可以放进稿子的句子和例子（注明放到哪一段）、还没想清楚的问题。不要改稿子。`,
        ].join("\n"));
    }

    // ----- ① grill-me 压测 / ② QWS 追问补料：交给 Claudian，不动稿子 -----
    async grill(view) {
        const file = view.file, out = this.outFolder(file);
        const styles = this.styleForForm(file).map((n) => this.readStyle(n).path);
        await this.sendToClaudian([
            `请用 grill-me 的方式压测我这篇稿子：「${file.path}」（就在当前库里）。风格标准见${styles.map((p) => `「${p}」`).join("和")}（第一份是总章）。先读完稿子和风格提示词再开始。`,
            "",
            "Interview me relentlessly about every aspect of this draft until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer. Ask the questions one at a time.",
            "",
            "要盘问的：一句话主张站不站得住、写给谁、论证顺序、开头钩子、哪里会被反驳、结尾落点。",
            "全程用中文，一次只问一个问题，并给出你推荐的答案。",
            `不要改稿子。达成共识后，把结论写成「${npath.join(out.abs, "稿件压测-修改建议.md")}」：每条建议写明改哪一段、怎么改、为什么。`,
        ].join("\n"));
    }
    async qws(view) {
        const file = view.file, out = this.outFolder(file);
        await this.sendToClaudian([
            "请调取 QWS（qws skill），对我做一次 AI 采访，给这篇稿子补料。",
            "",
            `稿子：「${file.path}」（就在当前库里），先完整读完再开始。`,
            "- 稿子里已经写清楚的不要问，从说得虚、缺例子、缺我自己经历的地方问起",
            "- 用途是之后公开发表，所以公开表达素材线请开启",
            `- 采访结束后，把挖出来的内容整理成「${npath.join(out.abs, "稿件追问-补充素材.md")}」：每条素材注明可以补到稿子的哪一段。不要改稿子。`,
            `- 采访文件保存到「${out.abs}/」`,
        ].join("\n"));
    }
};

// ---------- 弹窗 ----------
class PreviewModal extends Modal {
    constructor(app, o) { super(app); this.o = o; }
    onOpen() {
        const { contentEl, o } = this;
        this.modalEl.addClass("dd-preview");
        contentEl.createEl("h3", { text: `稿件台 · ${o.title}` });
        if (o.warn) contentEl.createDiv({ cls: "dd-warn", text: o.warn });
        const cols = contentEl.createDiv({ cls: "dd-cols" });
        for (const [h, t] of [["原文", o.before], ["结果", o.after]]) {
            const c = cols.createDiv({ cls: "dd-col" });
            c.createEl("b", { text: h });
            c.createEl("pre", { text: t });
        }
        if (o.note) {
            const n = contentEl.createDiv({ cls: "dd-note" });
            n.createEl("b", { text: "表达备注（拿不准的那几条要不要用，你决定）" });
            n.createEl("pre", { text: o.note });
        }
        const bar = contentEl.createDiv({ cls: "dd-bar" });
        const btn = (text, fn, cta) => { const b = bar.createEl("button", { text }); if (cta) b.addClass("mod-cta"); b.onclick = async () => { this.close(); await fn(); }; };
        btn("替换", o.onReplace, true);
        btn("插在下面", o.onInsert);
        btn("复制", async () => { await navigator.clipboard.writeText(o.after); new Notice("已复制"); });
        btn("取消", async () => {});
    }
    onClose() { this.contentEl.empty(); }
}
class ResultModal extends Modal {
    constructor(app, o) { super(app); this.o = o; this.comp = new Component(); }
    onOpen() {
        const { contentEl, o } = this;
        this.modalEl.addClass("dd-result");
        contentEl.createEl("h3", { text: `稿件台 · ${o.title}` });
        const body = contentEl.createDiv({ cls: "dd-md" });
        this.comp.load();
        MarkdownRenderer.render(this.app, o.md, body, o.sourcePath, this.comp);
        const bar = contentEl.createDiv({ cls: "dd-bar" });
        if (o.link) { const b = bar.createEl("button", { text: o.linkText || "在主库打开" }); b.onclick = () => window.open(o.link); }
        const c = bar.createEl("button", { text: "复制" }); c.onclick = async () => { await navigator.clipboard.writeText(o.md); new Notice("已复制"); };
    }
    onClose() { this.comp.unload(); this.contentEl.empty(); }
}
class InputModal extends Modal {
    constructor(app, title, label) { super(app); this.title = title; this.label = label; }
    ask() { return new Promise((r) => { this.resolve = r; this.open(); }); }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: this.title });
        contentEl.createDiv({ text: this.label });
        const inp = contentEl.createEl("input", { type: "text", cls: "dd-input" });
        const ok = () => { const v = inp.value.trim(); this.value = v; this.close(); };
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) ok(); });
        const bar = contentEl.createDiv({ cls: "dd-bar" });
        const b = bar.createEl("button", { text: "检索", cls: "mod-cta" }); b.onclick = ok;
        setTimeout(() => inp.focus(), 30);
    }
    onClose() { this.contentEl.empty(); this.resolve?.(this.value || ""); }
}
class ConfirmModal extends Modal {
    constructor(app, title, msg) { super(app); this.title = title; this.msg = msg; }
    ask() { return new Promise((r) => { this.resolve = r; this.open(); }); }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: this.title });
        contentEl.createDiv({ text: this.msg });
        const bar = contentEl.createDiv({ cls: "dd-bar" });
        const y = bar.createEl("button", { text: "继续", cls: "mod-cta" }); y.onclick = () => { this.ok = true; this.close(); };
        const n = bar.createEl("button", { text: "取消" }); n.onclick = () => this.close();
    }
    onClose() { this.contentEl.empty(); this.resolve?.(!!this.ok); }
}

class DDSettings extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    display() {
        const c = this.containerEl, s = this.plugin.settings;
        c.empty();
        let auto = "";
        try { const mv = this.plugin.mainVault(); auto = `现在用的：${mv.name}（${mv.root}）`; } catch (e) { auto = e.message; }
        new Setting(c).setName("主库路径").setDesc(`留空就用第二大脑设置里的「外部素材库」。${auto}`)
            .addText((t) => t.setPlaceholder("~/Library/Mobile Documents/…/马自立").setValue(s.mainVault).onChange(async (v) => { s.mainVault = v.trim(); await this.plugin.saveSettings(); }));
        new Setting(c).setName("主库名称").setDesc("Obsidian 里的库名，补料里「在主库打开」的链接要用。留空就跟着上面取")
            .addText((t) => t.setValue(s.mainVaultName).onChange(async (v) => { s.mainVaultName = v.trim(); await this.plugin.saveSettings(); }));
        new Setting(c).setName("claude 命令路径").addText((t) => t.setValue(s.claudePath).onChange(async (v) => { s.claudePath = v.trim() || DEFAULTS.claudePath; await this.plugin.saveSettings(); }));
        new Setting(c).setName("超时（秒）").setDesc("后台跑 claude 的单次上限；填坑要联网，整篇改写比较长")
            .addText((t) => t.setValue(String(s.timeoutSec)).onChange(async (v) => { s.timeoutSec = Math.max(60, +v || DEFAULTS.timeoutSec); await this.plugin.saveSettings(); }));
    }
}

module.exports._test = { splitFrontmatter, protect, applyTidyRules, TIDY_RULES, findPits, hasSupplement, blockAt, pitContext, insertSupplement, formatSupplement, parseJsonLoose, stripFence, nextVersionName, structureDiff, parseAliases, mentionBlocks };
