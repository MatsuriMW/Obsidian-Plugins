/* 日记整理：手动触发（快捷键 / 命令 / 左侧按钮），不会自动运行。
 *
 * 1. 任务分区：顶格任务块（连同子块）按状态排成 DONE → DOING → TODO → 没状态的（原样在最下面），区之间用「- ---」隔开。
 *    规则和 done-to-top 插件的「一键整理」（⌃⇧F）是同一份（用它的 core，含「明天 / 后天 / 大后天」搬到那天日记）；那个插件没开时退回旧的「待办上移」。
 * 2. 问题汇总：找出日记里的问句，交给本机的 Claude（claude -p，可联网）判断哪些是真在问、并写回答；
 *    真问题整行从原处挪走（不是复制），集中到文件末尾的「问题汇总」块，回答写在各自下面。
 *    自言自语 / 感叹、游戏相关、提醒式、摘抄里的反问、一行里还有别的内容的，都不动。
 *
 * 3. SuperTag 字段：列表项里写了 [[标签名]]（比如「- [[菜谱]]毛血旺」），而 SuperTags 插件给这个标签定义了字段，
 *    就把还没有的字段作为子项「键:: 默认值」插在这一项下面（比如「学会:: 否」），留给你填。已经有的字段不重复插。
 *
 * 每次改动前会备份原文，「撤销上一次日记整理」可以恢复。
 */
const { Plugin, Modal, Notice, Setting, TFile, FuzzySuggestModal, PluginSettingTab, moment } = require("obsidian");
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");

const DEFAULTS = {
    journalFolder: "日记",
    claudePath: "~/.local/bin/claude",
    model: "",
    timeoutSec: 600,
    questionBlockTitle: "问题汇总｜[[等待尝试]]",
    moveTodos: true,
    answerQuestions: true,
    fillFields: true,
    backups: [],
};
const MAX_BACKUPS = 5;
const RECENT_LIMIT = 15;

const LIST_ITEM = /^(?:[-*+]|\d+[.)])[ \t]/;
const TODO_TOP = /^(?:[-*+]|\d+[.)])[ \t]+(?:(?:\[ \][ \t]+)?(?:TODO|DOING|NOW|LATER|WAITING)\b|\[ \][ \t]+)|^(?:[-*+]|\d+[.)])[ \t].*(?:#待办(?![\w一-鿿])|\[\[待办(?:\|[^\]]*)?\]\])/;
const PREFIX = /^[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+)?(?:\[.\][ \t]+)?(?:(?:TODO|DOING|NOW|LATER|WAITING|DONE|CANCELLED|CANCELED)[ \t]+)?/;
const indentOf = (l) => (l.match(/^[ \t]*/) || [""])[0].replace(/\t/g, "    ").length;
const isBlank = (l) => l.trim() === "";

// ---------------- 文本处理（纯函数，方便单独测） ----------------
function splitFrontmatter(text) {
    const lines = text.split("\n");
    if (lines[0] === "---") {
        const end = lines.indexOf("---", 1);
        if (end > 0) return { fm: lines.slice(0, end + 1), body: lines.slice(end + 1) };
    }
    return { fm: [], body: lines };
}

// 把正文切成段：顶格列表块（含子块和块内空行）一段，其余每行一段
function segment(body) {
    const segs = [];
    let i = 0;
    while (i < body.length) {
        if (!LIST_ITEM.test(body[i])) { segs.push({ todo: false, lines: [body[i]] }); i++; continue; }
        let j = i + 1;
        while (j < body.length) {
            const l = body[j];
            if (isBlank(l)) {
                let k = j;
                while (k < body.length && isBlank(body[k])) k++;
                if (k < body.length && /^[ \t]/.test(body[k])) { j = k; continue; }
                break;
            }
            if (/^[ \t]/.test(l)) { j++; continue; }
            break;
        }
        segs.push({ todo: TODO_TOP.test(body[i]), lines: body.slice(i, j) });
        i = j;
    }
    return segs;
}

function moveTodos(text) {
    const { fm, body } = splitFrontmatter(text);
    const segs = segment(body);
    const todos = segs.filter(s => s.todo);
    if (!todos.length) return { text, moved: 0 };
    const rest = segs.filter(s => !s.todo).flatMap(s => s.lines);
    while (rest.length && isBlank(rest[0])) rest.shift();
    const top = todos.flatMap(s => s.lines);
    while (top.length && isBlank(top[top.length - 1])) top.pop();
    const lead = fm.length ? [] : [];
    let out = [...fm, ...lead, ...top];
    if (rest.length) out.push("", ...rest);
    let result = out.join("\n").replace(/\n{3,}/g, "\n\n");
    if (text.endsWith("\n") && !result.endsWith("\n")) result += "\n";
    return { text: result, moved: todos.length };
}

// SuperTag 字段：defsOf(名字) 返回 [{ key, def }]（来自 SuperTags 插件），没有就是空数组
function fillSupertagFields(text, defsOf) {
    const lines = text.split("\n");
    const fmLen = splitFrontmatter(text).fm.length;
    // 缩进单位跟着这篇日记：有 Tab 缩进就用 Tab，否则用 4 个空格
    const unit = lines.some(l => /^\t/.test(l)) || !lines.some(l => /^ {2,}\S/.test(l)) ? "\t" : "    ";
    const out = [];
    let inCode = false, added = 0, items = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        out.push(line);
        if (i < fmLen) continue;
        if (/^\s*(```|~~~)/.test(line)) { inCode = !inCode; continue; }
        if (inCode) continue;
        const m = line.match(/^([ \t]*)(?:[-*+]|\d+[.)])[ \t]/);
        if (!m) continue;
        let defs = null;
        for (const mm of line.matchAll(/\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
            const d = defsOf(mm[1].trim());
            if (d.length) { defs = d; break; }
        }
        if (!defs) continue;
        // 这一项已经写了的字段：行内 [键:: 值] 和子项「键:: 值」
        const have = new Set([...line.matchAll(/\[([^\[\]:]+?)::/g)].map(f => f[1].trim()));
        const ind = indentOf(line);
        for (let j = i + 1; j < lines.length; j++) {
            if (isBlank(lines[j])) continue;
            if (indentOf(lines[j]) <= ind) break;
            const f = lines[j].match(/^\s*(?:[-*+]\s+)?([^:：\s][^:：]*?)::/);
            if (f) have.add(f[1].trim());
        }
        const miss = defs.filter(d => !have.has(d.key));
        if (!miss.length) continue;
        items++;
        for (const d of miss) { out.push(`${m[1]}${unit}- ${d.key}:: ${d.def}`.replace(/\s+$/, " ")); added++; }
    }
    return { text: out.join("\n"), added, items };
}

// 问题汇总块的范围（顶格那行 + 子块）
function findSummaryBlock(lines, title) {
    const head = "- " + title;
    const i = lines.findIndex(l => l.startsWith(head));
    if (i < 0) return null;
    let j = i + 1;
    while (j < lines.length && (/^[ \t]/.test(lines[j]) || (isBlank(lines[j]) && j + 1 < lines.length && /^[ \t]/.test(lines[j + 1])))) j++;
    return { start: i, end: j };
}

function findQuestionCandidates(text, title) {
    const lines = text.split("\n");
    const { fm } = splitFrontmatter(text);
    const sum = findSummaryBlock(lines, title);
    const out = [];
    let inFence = false;
    for (let i = fm.length; i < lines.length; i++) {
        const l = lines[i];
        if (/^[ \t]*(```|~~~)/.test(l)) { inFence = !inFence; continue; }
        if (inFence || isBlank(l)) continue;
        if (sum && i >= sum.start && i < sum.end) continue;
        const bare = l.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "").replace(/!?\[\[[^\]]*\]\]/g, "").replace(/`[^`]*`/g, "");
        if (!/[?？]/.test(bare)) continue;
        if (/#card(?:[-/][\w-]+)?\b/.test(l) || /\^[A-Za-z0-9-]+\s*$/.test(l)) continue;      // 闪卡、带块标识的
        const next = lines.slice(i + 1).find(x => !isBlank(x));
        if (next !== undefined && indentOf(next) > indentOf(l) && lines[i + 1] !== undefined && !isBlank(lines[i + 1])) continue; // 下面已经有子项（多半是回答）
        const content = l.replace(PREFIX, "").trim();
        if (!content || content.length > 120) continue;                                       // 太长的多半是摘抄
        if (!content.replace(/!?\[\[[^\]]*\]\]|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+/g, "").replace(/[\s?？]/g, "")) continue; // 只有链接
        // 上下文：所在的顶格块第一行 + 直接父项
        let parent = "", top = "";
        for (let k = i - 1; k >= fm.length; k--) {
            if (isBlank(lines[k])) continue;
            if (!parent && indentOf(lines[k]) < indentOf(l)) parent = lines[k].trim();
            if (indentOf(lines[k]) === 0) { top = lines[k].trim(); break; }
        }
        out.push({ id: out.length + 1, line: l, content, parent: parent.slice(0, 120), top: top === l.trim() ? "" : top.slice(0, 120) });
    }
    return out;
}

function buildPrompt(cands, filePath) {
    const list = cands.map(c => JSON.stringify({ id: c.id, 原文: c.content, 所在块: c.top || undefined, 父项: c.parent && c.parent !== c.top ? c.parent : undefined })).join("\n");
    return `你在帮我整理 Obsidian 日记「${filePath}」里的问题。下面每一行 JSON 是日记里一行含问号的原文（已去掉列表符号和 TODO 前缀），附带它所在的上下文。全部用中文。

第一步：逐条判断 keep（这一行要不要挪出来回答）。只有「我自己真在求答案」的才 keep=true。以下一律 keep=false，并在 skip 里用几个字说明原因：
- 自言自语、自我感叹：不是真在求答案，而是抒发情绪或自问（例如「什么时候去旅行？」「我到底在干嘛？」「这样下去怎么办？」「为什么总是这样？」）。拿不准时宁可不收
- 和游戏相关的（游戏里的地点、道具、攻略、角色等，例如「封印坑道在哪？」）
- 写给自己的待办或提醒式问句（例如「要不要改一下？」「tun 模式？」只是记一笔）
- 摘抄里的反问句、作者自问自答（例如「知道问题在哪么？在于超配了」）
- 这一行除了问句还有别的实质内容（前半句在记事、后半句才是问题）——因为要整行挪走，会把别的内容一起带走

第二步：对 keep=true 的逐条回答。
- 需要事实、数据、定义的，先联网查证（WebSearch / WebFetch）；查不到就写「没查到可靠来源」，绝对不要编造
- 精准、精简：每个问题 1～3 条，每条一两句话，先给结论再给必要的解释
- 能结合上下文的就结合（比如是在读某段投资摘抄时提的，就按那段的语境解释）
- 有可靠来源的，在最后一条末尾附 （来源：[标题](URL)）
- 一行里有好几个问句就拆开，一个问题一条；q 写问题原话

只输出一个 JSON 数组，不要任何别的文字，格式：
[{"id":1,"keep":true,"skip":"","items":[{"q":"问题原话","answers":["第一条","第二条（来源：[标题](URL)）"]}]},{"id":2,"keep":false,"skip":"自言自语","items":[]}]

待判断的问题：
${list}`;
}

function parseJsonArray(s) {
    const a = s.indexOf("["), b = s.lastIndexOf("]");
    if (a < 0 || b < a) throw new Error("Claude 的回复里没有 JSON");
    return JSON.parse(s.slice(a, b + 1));
}

// 把挪出来的问题和回答写进文件：原行删掉，汇总块放在文件末尾（已有就往里追加）
function applyAnswers(text, kept, title) {
    const lines = text.split("\n");
    const removed = [];
    for (const c of kept) {
        const idx = lines.indexOf(c.line);
        if (idx < 0) continue;   // 这段时间里被改过了，跳过
        lines.splice(idx, 1);
        removed.push(c);
    }
    if (!removed.length) return { text, written: 0 };
    const children = [];
    for (const c of removed) for (const it of c.items) {
        children.push("\t- " + String(it.q || c.content).trim());
        for (const a of (it.answers || [])) children.push("\t\t- " + String(a).trim());
    }
    const sum = findSummaryBlock(lines, title);
    if (sum) {
        lines.splice(sum.end, 0, ...children);
    } else {
        while (lines.length && isBlank(lines[lines.length - 1])) lines.pop();
        lines.push("", "- " + title, ...children, "");
    }
    return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n"), written: removed.length };
}

// ---------------- 插件 ----------------
module.exports = class JournalTidy extends Plugin {
    async onload() {
        this.settings = Object.assign({}, DEFAULTS, await this.loadData());
        this.addCommand({ id: "open", name: "整理日记…（选文件）", hotkeys: [{ modifiers: ["Mod", "Shift"], key: "J" }], callback: () => new TidyModal(this).open() });
        this.addCommand({ id: "today", name: "整理今天的日记", callback: () => this.runOn(this.todayFile(), this.settings) });
        this.addCommand({
            id: "current", name: "整理当前打开的日记",
            checkCallback: (checking) => {
                const f = this.app.workspace.getActiveFile();
                if (!f || f.extension !== "md") return false;
                if (!checking) this.runOn(f, this.settings);
                return true;
            },
        });
        this.addCommand({ id: "undo", name: "撤销上一次日记整理", callback: () => this.undo() });
        this.addRibbonIcon("list-checks", "整理日记", () => new TidyModal(this).open());
        this.addSettingTab(new TidySettings(this));
    }

    async save() { await this.saveData(this.settings); }

    todayName() { return moment().format("YYYY_MM_DD"); }
    todayPath() { return `${this.settings.journalFolder}/${this.todayName()}.md`; }
    todayFile() { return this.app.vault.getAbstractFileByPath(this.todayPath()); }

    recentJournals() {
        const folder = this.settings.journalFolder.replace(/\/$/, "") + "/";
        return this.app.vault.getMarkdownFiles()
            .filter(f => f.path.startsWith(folder) && /^\d{4}_\d{2}_\d{2}$/.test(f.basename))
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, RECENT_LIMIT);
    }

    async backup(file, content) {
        this.settings.backups = [{ path: file.path, content, time: Date.now() }, ...(this.settings.backups || [])].slice(0, MAX_BACKUPS);
        await this.save();
    }

    async undo() {
        const b = (this.settings.backups || [])[0];
        if (!b) return new Notice("没有可撤销的整理");
        const f = this.app.vault.getAbstractFileByPath(b.path);
        if (!(f instanceof TFile)) return new Notice(`找不到 ${b.path}`);
        await this.app.vault.modify(f, b.content);
        this.settings.backups.shift();
        await this.save();
        new Notice(`已恢复 ${f.basename} 到 ${moment(b.time).format("HH:mm:ss")} 整理之前的样子`);
    }

    async runOn(file, opt) {
        if (!(file instanceof TFile)) return new Notice("没找到这篇日记（今天的可能还没建）");
        if (this.running) return new Notice("上一次整理还在进行中");
        this.running = true;
        const original = await this.app.vault.read(file);
        await this.backup(file, original);
        const report = [];
        try {
            // 0. SuperTag 字段（纯本地）：[[菜谱]] 之类的项下面补上字段，让你填
            if (opt.fillFields) {
                const st = this.app.plugins.plugins["supertags-local"];
                if (st && typeof st.fieldDefs === "function") {
                    let r = null;
                    await this.app.vault.process(file, (data) => { r = fillSupertagFields(data, (n) => st.fieldDefs(n)); return r.text; });
                    if (r.added) report.push(`${r.items} 处 SuperTag（如 [[菜谱]]）下面补了 ${r.added} 个字段，记得去填`);
                }
            }
            // 1. 任务分区（纯本地，马上完成）
            if (opt.moveTodos) {
                const dtt = this.app.plugins.plugins["done-to-top"];
                const zones = dtt?.core;
                if (zones) {
                    // 带「明天 / 后天 / 大后天」的先搬到那几天的日记（done-to-top 较新版本才有）
                    const moved = dtt.moveDayItems ? await dtt.moveDayItems(file, await this.app.vault.read(file)) : [];
                    let c = null, changed = false;
                    await this.app.vault.process(file, (data) => { const r = zones.organize(moved.length ? zones.dropBlocks(data, moved.map(m => m.orig)) : data); c = r.counts; changed = r.text !== data; return r.text; });
                    report.push(changed ? `任务已分区：DONE ${c.DONE} · DOING ${c.DOING} · TODO ${c.TODO}` : "任务分区本来就是整理好的");
                    if (moved.length) report.push(`搬到以后的日记：${dtt.movedSummary(moved)}`);
                } else {
                    let moved = 0;
                    await this.app.vault.process(file, (data) => { const r = moveTodos(data); moved = r.moved; return r.text; });
                    report.push(moved ? `${moved} 个待办块移到了元信息下方（done-to-top 插件没开，用的旧规则）` : "没有需要移动的待办");
                }
            }
            // 2. 问题汇总 + AI 回答
            if (opt.answerQuestions) {
                const text = await this.app.vault.read(file);
                const cands = findQuestionCandidates(text, this.settings.questionBlockTitle);
                if (!cands.length) report.push("没有找到需要回答的问句");
                else {
                    const wait = new Notice(`正在请 Claude 判断并联网查证 ${cands.length} 个问句…（大约一两分钟，可以继续写）`, 0);
                    let result;
                    try { result = parseJsonArray(await this.runClaude(buildPrompt(cands, file.path))); }
                    finally { wait.hide(); }
                    const byId = new Map(result.map(r => [Number(r.id), r]));
                    const kept = cands.map(c => ({ ...c, ...(byId.get(c.id) || {}) })).filter(c => c.keep && Array.isArray(c.items) && c.items.length);
                    const skipped = cands.length - kept.length;
                    let written = 0;
                    await this.app.vault.process(file, (data) => { const r = applyAnswers(data, kept, this.settings.questionBlockTitle); written = r.written; return r.text; });
                    report.push(written ? `${written} 行问题挪进了「问题汇总」并写好回答` : "没有需要挪出来回答的问题");
                    if (skipped) report.push(`${skipped} 行没动（自言自语 / 游戏 / 提醒 / 摘抄等）`);
                }
            }
            new Notice(`${file.basename} 整理完了：\n` + report.join("\n") + "\n（撤销：命令「撤销上一次日记整理」）", 10000);
        } catch (e) {
            console.error("[journal-tidy]", e);
            new Notice("日记整理出错：" + (e.message || e) + (report.length ? "\n已完成：" + report.join("；") : ""), 12000);
        } finally {
            this.running = false;
        }
    }

    runClaude(prompt) {
        return new Promise((resolve, reject) => {
            const bin = this.settings.claudePath.replace(/^~(?=\/)/, os.homedir());
            const args = ["-p", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config"];
            if (this.settings.model) args.push("--model", this.settings.model);
            args.push("--allowedTools", "WebSearch", "WebFetch");
            const env = { ...process.env, PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":") };
            let child;
            try { child = spawn(bin, args, { cwd: os.tmpdir(), env }); }
            catch (e) { return reject(new Error(`启动 claude 失败（${bin}）：${e.message}`)); }
            let out = "", err = "";
            child.stdout.on("data", d => { out += d; });
            child.stderr.on("data", d => { err += d; });
            const timer = setTimeout(() => { child.kill(); reject(new Error(`等了 ${this.settings.timeoutSec} 秒还没回来，已取消`)); }, this.settings.timeoutSec * 1000);
            child.on("error", e => { clearTimeout(timer); reject(new Error(`启动 claude 失败（${bin}）：${e.message}`)); });
            child.on("close", code => {
                clearTimeout(timer);
                let d;
                try { d = JSON.parse(out); } catch (e) { return reject(new Error((err || out || `claude 退出码 ${code}`).trim().slice(0, 300))); }
                if (d.is_error) return reject(new Error(String(d.result || "claude 返回错误").slice(0, 300)));
                resolve(String(d.result || ""));
            });
            child.stdin.write(prompt);
            child.stdin.end();
        });
    }
};

// ---------------- 选文件的小窗 ----------------
class TidyModal extends Modal {
    constructor(plugin) { super(plugin.app); this.plugin = plugin; }
    onOpen() {
        const p = this.plugin, s = p.settings;
        this.setTitle ? this.setTitle("整理日记") : this.titleEl.setText("整理日记");
        const files = [];
        const seen = new Set();
        const add = (f, label) => { if (f instanceof TFile && !seen.has(f.path)) { seen.add(f.path); files.push({ f, label }); } };
        const today = p.todayFile();
        add(today, `今天 · ${p.todayName()}`);
        const active = this.app.workspace.getActiveFile();
        if (active && active.extension === "md") add(active, `当前打开 · ${active.basename}`);
        for (const f of p.recentJournals()) add(f, `${f.basename} · ${moment(f.stat.mtime).fromNow ? moment(f.stat.mtime).format("MM-DD HH:mm") : ""} 改过`);
        let chosen = files[0] ? files[0].f : null;

        const pick = new Setting(this.contentEl).setName("日记").setDesc(today ? "" : `今天的日记（${p.todayName()}）还没建`);
        let dd;
        pick.addDropdown(d => {
            dd = d;
            files.forEach((x, i) => d.addOption(String(i), x.label));
            d.addOption("other", "选择其它文件…");
            d.onChange(v => {
                if (v !== "other") { chosen = files[+v].f; return; }
                new FilePicker(this.app, (f) => {
                    add(f, `指定 · ${f.path}`);
                    const i = files.findIndex(x => x.f === f);
                    if (!dd.selectEl.querySelector(`option[value="${i}"]`)) {
                        const o = document.createElement("option"); o.value = String(i); o.text = files[i].label;
                        dd.selectEl.insertBefore(o, dd.selectEl.lastChild);
                    }
                    dd.setValue(String(i)); chosen = f;
                }).open();
            });
        });
        const opt = { moveTodos: s.moveTodos, answerQuestions: s.answerQuestions, fillFields: s.fillFields };
        new Setting(this.contentEl).setName("补 SuperTag 字段").setDesc("写了 [[菜谱]] 这类 SuperTag 的项，下面插上还没有的字段（如「学会:: 否」），留给你填")
            .addToggle(t => t.setValue(opt.fillFields).onChange(v => { opt.fillFields = v; }));
        new Setting(this.contentEl).setName("任务按状态分区").setDesc("顶格任务块连同子块排成 DONE → DOING → TODO → 其它，区之间用「- ---」隔开")
            .addToggle(t => t.setValue(opt.moveTodos).onChange(v => { opt.moveTodos = v; }));
        new Setting(this.contentEl).setName("汇总问题并用 AI 回答").setDesc("问句挪到文末「问题汇总」，Claude 联网查证后写回答；自言自语、游戏相关的不动")
            .addToggle(t => t.setValue(opt.answerQuestions).onChange(v => { opt.answerQuestions = v; }));
        new Setting(this.contentEl).addButton(b => b.setButtonText("开始整理").setCta().onClick(async () => {
            if (!chosen) return new Notice("先选一篇日记");
            s.moveTodos = opt.moveTodos; s.answerQuestions = opt.answerQuestions; await p.save();
            this.close();
            p.runOn(chosen, opt);
        }));
    }
    onClose() { this.contentEl.empty(); }
}

class FilePicker extends FuzzySuggestModal {
    constructor(app, onPick) { super(app); this.onPick = onPick; this.setPlaceholder("输入文件名…"); }
    getItems() { return this.app.vault.getMarkdownFiles(); }
    getItemText(f) { return f.path; }
    onChooseItem(f) { this.onPick(f); }
}

class TidySettings extends PluginSettingTab {
    constructor(plugin) { super(plugin.app, plugin); this.plugin = plugin; }
    display() {
        const { containerEl } = this, s = this.plugin.settings;
        containerEl.empty();
        const text = (name, desc, key, num = false) => new Setting(containerEl).setName(name).setDesc(desc).addText(t => t.setValue(String(s[key])).onChange(async v => { s[key] = num ? (parseInt(v, 10) || DEFAULTS[key]) : v.trim(); await this.plugin.save(); }));
        text("日记文件夹", "日记文件名是 YYYY_MM_DD", "journalFolder");
        text("claude 命令路径", "本机 Claude Code 的命令行（要先登录过）", "claudePath");
        text("模型", "留空用 Claude Code 的默认模型；也可以填 opus / sonnet 或完整的模型 ID", "model");
        text("超时（秒）", "问题多、要联网时会久一些", "timeoutSec", true);
        text("问题汇总块的标题", "顶格那一行 `- ` 后面的文字；已有这个块就往里追加", "questionBlockTitle");
    }
}

module.exports.__test = { moveTodos, findQuestionCandidates, applyAnswers, segment, splitFrontmatter };
