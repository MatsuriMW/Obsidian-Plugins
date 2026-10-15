/* 日记整理：整理由你手动触发（快捷键 / 命令 / 左侧按钮），分两种方式。
 *
 * 基础整理（纯本地，马上完成）：下面的 0、1 和 3，整理完把 DONE 区折起来。
 * 进阶整理（要问本机的 Claude，一两分钟）：先做一遍基础整理，再做 2、4、5、6。
 *
 * 另有一件自己在后台做的事：你在 Claude 桌面 app 里归档一个会话，今天的日记里记一笔（见文件后面「归档记一笔」）。
 *
 * 1. 任务分区：顶格任务块（连同子块）按状态排成 DONE → DOING → TODO → 没状态的（原样在最下面），区之间用「- ---」隔开。
 *    块内部自己用「- ---」分了栏的，子项也在块内排成 DONE → DOING → TODO，只在块内部排，不会跨块、也不会提到文件级。
 *    顶格只写「- [[信息增量]]」的那一块归 TODO 区，排在 TODO 区最后（问题汇总、摘录都不碰它）。
 *    链接类条目（孤零零一条：没有母块、也没有子块，不超过两行，里面有小红书 / 知乎 / X / GitHub / B 站 / 抖音这类链接）
 *    聚成「链接」区，放在 TODO 区下面；有任务关键字的算任务，优先级更高。
 *    规则和 done-to-top 插件的「一键整理」（⌥1 / ⌃⇧F）是同一份（用它的 core，含「明天 / 后天 / 大后天」搬到那天日记）；那个插件没开时退回旧的「待办上移」。
 * 2. 问题汇总：找出日记里的问句，交给本机的 Claude（claude -p，可联网）判断哪些是真在问、并写回答；
 *    真问题整行从原处挪走（不是复制），集中到文件末尾的「问题汇总」块，回答写在各自下面。
 *    自言自语 / 感叹、游戏相关、提醒式、摘抄里的反问、一行里还有别的内容的，都不动。
 *
 * 0. 编号改成有序列表：「- 1. 内容」「- 1.内容」「- 1、内容」「- 1）内容」这种在无序列表里手打编号的，改成标准的「1. 内容」，
 *    缩进和编号原样保留；「- 5.25 平安里」「- 10.a」这种后面紧贴数字、字母的（小数、时刻、小节号）不动，代码块里的不动。基础整理第一步就做。
 *
 * 3. SuperTag 字段：列表项里写了 [[标签名]]（比如「- [[菜谱]]毛血旺」），而 SuperTags 插件给这个标签定义了字段，
 *    就把还没有的字段作为子项「键:: 默认值」插在这一项下面（比如「学会:: 否」），留给你填。已经有的字段不重复插。
 *
 * 4. 机器行按主题归类：全篇机器写的行（🤖 开头的任务行）超过门槛（默认 10 条）时，把顶格的、已经结束的机器行（DONE / SUSPENDED / FAILED / CANCELLED，和任务分区里归 DONE 区的是同一批）
 *    连同下面的 ⏱ 子项收到各自主题的母块下面（「- 🤖 Obsidian 改造 · 6 条 · 共 2h13m」），母块留在 DONE 栏里，整理完折起来。
 *    主题先用螺旋日程自动记日记时归好的大方向，对不上的才问 Claude。DOING / TODO 的机器行还在动，留在原处。
 *
 * 5. 摘录记号：从别处原样搬来的别人的话，顶格那一行末尾挂「#quote」。进阶整理时由 Claude 判断哪些块是摘录（拿不准不标），
 *    也可以用命令「把光标所在的块标成摘录 / 取消」手动标。
 *
 * 6. 念头记号：挂着 TODO 的条目里，口述的想法、疑问、还没想清楚做不做的事不是任务，行尾挂「#thoughts」（TODO 留着不动）。
 *    进阶整理时由 Claude 判断（拿不准算任务），也可以用命令「把光标所在的行标成念头 / 取消」手动标。
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
    fixNumbered: true,
    answerQuestions: true,
    fillFields: true,
    groupMachine: true,
    machineThreshold: 10,
    markExcerpts: true,
    excerptTag: "#quote",
    markThoughts: true,
    thoughtTag: "#thoughts",
    lastMode: "basic",
    archiveLog: true,
    archiveReady: false,   // 第一次扫过了没有：扫之前就归档了的会话算旧账，不补记
    archiveSeen: {},       // 会话号 → 记下的时刻（毫秒）；记过的不再记，取消归档再归档也不重复
    backups: [],
};
const MODE_LABEL = { basic: "基础整理", deep: "进阶整理" };
const MAX_BACKUPS = 5;
const RECENT_LIMIT = 15;

const LIST_ITEM = /^(?:[-*+]|\d+[.)])[ \t]/;
const TODO_TOP = /^(?:[-*+]|\d+[.)])[ \t]+(?:(?:\[ \][ \t]+)?(?:TODO|DOING|NOW|LATER|PAUSED|WAITING|WAIT|SUSPENDED)\b|\[ \][ \t]+)|^(?:[-*+]|\d+[.)])[ \t].*(?:#待办(?![\w一-鿿])|\[\[待办(?:\|[^\]]*)?\]\])/;
const PREFIX = /^[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+)?(?:\[.\][ \t]+)?(?:(?:TODO|DOING|NOW|LATER|PAUSED|WAITING|WAIT|SUSPENDED|DONE|CANCELLED|CANCELED)[ \t]+)?/;
const indentOf = (l) => (l.match(/^[ \t]*/) || [""])[0].replace(/\t/g, "    ").length;
const isBlank = (l) => l.trim() === "";
const INFO_HEAD_RE = /^[-*+][ \t]+\[\[信息增量\]\][ \t]*$/;   // 「- [[信息增量]]」母块：块去向把它归在 TODO 区最后
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


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

// 「- 1. 内容」→「1. 内容」：无序列表里手打的编号改成标准有序列表。后面紧贴数字或英文字母的（5.25、6.10、10.a）不算编号
const NUMBERED_BULLET = /^([ \t]*)[-*+][ \t]+(\d{1,3})[.．)）、](?![\dA-Za-z])[ \t]*(.*)$/;
function fixNumberedBullets(text) {
    const { fm, body } = splitFrontmatter(text);
    let fence = null, count = 0;
    const out = body.map((l) => {
        const f = l.match(/^[ \t]*(?:[-*+][ \t]+)?(`{3,}|~{3,})/);
        if (f) { if (!fence) fence = f[1]; else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null; return l; }
        if (fence) return l;
        const m = l.match(NUMBERED_BULLET);
        if (!m) return l;
        count++;
        return `${m[1]}${m[2]}.${m[3] ? " " + m[3] : ""}`;
    });
    return { text: [...fm, ...out].join("\n"), count };
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
    let inFence = false, inInfo = false;
    for (let i = fm.length; i < lines.length; i++) {
        const l = lines[i];
        if (/^[ \t]*(```|~~~)/.test(l)) { inFence = !inFence; continue; }
        if (inFence || isBlank(l)) continue;
        if (sum && i >= sum.start && i < sum.end) continue;
        if (!/^[ \t]/.test(l)) inInfo = INFO_HEAD_RE.test(l);
        if (inInfo) continue;                                                                   // 信息增量是记下来的结论，不是问题
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

// ---------------- 机器行按主题归类 ----------------
// 机器行 = 螺旋日程自动记日记、下面「归档记一笔」写的任务行：状态词（和时间）后面以 🤖 开头，
// 比如「- DONE 09:17-09:50 🤖 让 done-to-top 移动时带上块标识符」。主题母块没有状态词：「- 🤖 Obsidian 改造 · 6 条 · 共 2h13m」。
const MACHINE_RE = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+(?:\[.\][ \t]+)?(TODO|DOING|NOW|LATER|PAUSED|WAITING|WAIT|SUSPENDED|DONE|CANCELLED|CANCELED|FAILED)[ \t]+(?:\d{1,2}[:：]\d{2}(?:[ \t]*[-–~～][ \t]*\d{1,2}[:：]\d{2})?[ \t]+)?🤖[ \t]*(.*)$/;
const THEME_HEAD_RE = /^- 🤖 (.+?)(?: · \d+ 条(?: · 共 [\dhm]+)?)?[ \t]*$/;
const CLOCK_TOTAL_RE = /^[ \t]*[-*+][ \t]+⏱.*共[ \t]*(?:(\d+)h)?(?:(\d+)m)?/;
const NO_THEME = "杂事";
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? (m % 60) + "m" : ""}` : `${m}m`);
const machineKey = (s) => s.replace(/🤖/g, "").replace(/\s*←\s*\[\[[^\]]*\]\]\s*$/, "").replace(/\s+/g, "");
const cleanTheme = (s) => String(s || "").replace(/[\r\n\[\]#·`*=~]/g, " ").replace(/\s+/g, " ").trim().slice(0, 12);

// 归 DONE 区的状态词（和 done-to-top 的分区一致）
const ENDED = new Set(["DONE", "SUSPENDED", "FAILED", "CANCELLED", "CANCELED"]);

// 全篇的机器行。top = 顶格；done = 已经结束（顶格又结束了的才会被收进主题）
function machineLines(text) {
    const out = [];
    for (const l of splitFrontmatter(text).body) {
        const m = l.match(MACHINE_RE);
        if (m) out.push({ line: l, top: m[1] === "", done: ENDED.has(m[2]), label: m[3].replace(/\s*←\s*\[\[[^\]]*\]\]\s*$/, "").trim() });
    }
    return out;
}

// themes：Map(那一行原文 → 主题名)，没给主题的行不动。新母块放在它第一条成员原来的位置，已有的母块往里追加
function groupMachine(text, themes) {
    const { fm, body } = splitFrontmatter(text);
    const unit = body.some(l => /^\t/.test(l)) || !body.some(l => /^ {2,}\S/.test(l)) ? "\t" : "    ";
    const segs = segment(body);
    const heads = new Map();
    for (const s of segs) { const h = s.lines[0].match(THEME_HEAD_RE); if (h && !heads.has(h[1].trim())) heads.set(h[1].trim(), s); }
    const out = [];
    let grouped = 0;
    for (const s of segs) {
        const m = s.lines[0].match(MACHINE_RE);
        const theme = m && m[1] === "" && ENDED.has(m[2]) ? cleanTheme(themes.get(s.lines[0])) : "";
        if (!theme) { out.push(s); continue; }
        let head = heads.get(theme);
        if (!head) { head = { todo: false, lines: [`- 🤖 ${theme}`] }; heads.set(theme, head); out.push(head); }
        head.lines.push(...s.lines.map(l => (isBlank(l) ? l : unit + l)));
        grouped++;
    }
    // 母块那一行的条数和用时每次重算（螺旋日程之后还会改里面的 ⏱）
    for (const [theme, head] of heads) {
        const kids = head.lines.slice(1).filter(l => !isBlank(l));
        const depth = kids.length ? Math.min(...kids.map(indentOf)) : 0;
        const n = kids.filter(l => indentOf(l) === depth && MACHINE_RE.test(l)).length;
        let min = 0;
        for (const l of kids) { const c = l.match(CLOCK_TOTAL_RE); if (c) min += (+c[1] || 0) * 60 + (+c[2] || 0); }
        if (n) head.lines[0] = `- 🤖 ${theme} · ${n} 条` + (min ? ` · 共 ${fmtMin(min)}` : "");
    }
    return { text: [...fm, ...out.flatMap(s => s.lines)].join("\n").replace(/\n{3,}/g, "\n\n"), grouped, themes: [...new Set([...themes.values()].map(cleanTheme).filter(Boolean))] };
}

// ---------------- 摘录记号 ----------------
const SEP_LINE = /^[-*+][ \t]+-{3,}[ \t]*$/;
const TASK_TOP = /^(?:[-*+]|\d+[.)])[ \t]+(?:\*\*\d{1,2}[:：]\d{2}\*\*[ \t]*)?(?:\[.\][ \t]+|(?:TODO|DOING|NOW|LATER|PAUSED|WAITING|WAIT|SUSPENDED|DONE|CANCELLED|CANCELED|FAILED)\b)/;
const hasTag = (line, tag) => line.split(/\s+/).includes(tag);
const bareText = (s) => s.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "").replace(/!?\[\[[^\]]*\]\]/g, "").replace(/[\s\-*+>#=|]/g, "");

// 可能是摘录的顶格块：不是任务、不是卡片 / 待读、不是问题汇总和主题母块、还没标过、去掉链接后够长
function findExcerptCandidates(text, tag, summaryTitle) {
    const out = [];
    for (const s of segment(splitFrontmatter(text).body)) {
        const first = s.lines[0];
        if (!LIST_ITEM.test(first) || SEP_LINE.test(first) || TASK_TOP.test(first) || THEME_HEAD_RE.test(first) || INFO_HEAD_RE.test(first)) continue;
        if (hasTag(first, tag) || first.startsWith("- " + summaryTitle)) continue;
        const all = s.lines.join("\n");
        if (/#(?:card|toread|towatch)\b/.test(all) || /^[ \t]*(```|~~~)/m.test(all)) continue;
        if (bareText(all).length < 60) continue;
        const kids = s.lines.slice(1).filter(l => !isBlank(l)).slice(0, 3).map(l => l.trim().slice(0, 160));
        out.push({ id: out.length + 1, line: first, sample: [first.replace(/^[-*+][ \t]+/, "").slice(0, 240), ...kids].join("\n  ") });
        if (out.length >= 30) break;
    }
    return out;
}

// 在这一行末尾挂上 / 摘掉记号；行尾的块 ID（ ^abc）留在最后
function setTag(line, tag, on) {
    const m = line.match(/^(.*?)([ \t]\^[A-Za-z0-9-]+)?[ \t]*$/);
    const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const body = m[1].replace(new RegExp(`(^|[ \\t]+)${esc}(?=[ \\t]|$)`, "g"), "").replace(/[ \t]+$/, "");
    return (on ? `${body} ${tag}` : body) + (m[2] || "");
}

// 可能是念头的行：顶格、挂着 TODO / LATER 或空复选框、不是机器行、还没标过
const OPEN_TOP = /^(?:[-*+]|\d+[.)])[ \t]+(?:\*\*\d{1,2}[:：]\d{2}\*\*[ \t]*)?(?:\[ \][ \t]+|(?:TODO|LATER)[ \t]+)(.*)$/;
function findThoughtCandidates(text, tag) {
    const out = [];
    for (const l of splitFrontmatter(text).body) {
        const m = l.match(OPEN_TOP);
        if (!m || MACHINE_RE.test(l) || hasTag(l, tag) || !bareText(m[1])) continue;
        out.push({ id: out.length + 1, line: l, content: m[1].trim().slice(0, 300) });
        if (out.length >= 40) break;
    }
    return out;
}

// 给挑出来的行在行尾挂上记号（摘录、念头共用）
function applyExcerpts(text, picked, tag) {
    const lines = text.split("\n");
    let marked = 0;
    for (const c of picked) {
        const idx = lines.indexOf(c.line);
        if (idx < 0 || hasTag(lines[idx], tag)) continue;   // 这段时间里被改过了，跳过
        lines[idx] = setTag(lines[idx], tag, true);
        marked++;
    }
    return { text: lines.join("\n"), marked };
}

function buildClassifyPrompt(filePath, machine, knownThemes, excerpts, thoughts = []) {
    const parts = [`你在帮我整理 Obsidian 日记「${filePath}」。全部用中文，只做下面列出的判断。`];
    if (machine.length) parts.push("",
        "【一、机器行归主题】下面每一行是 AI 助手替我做完的一件事，给每一行归一个主题。",
        `已有的主题：${knownThemes.join(" / ") || "（还没有）"}`,
        `优先用已有的名字；都不合适才自己起一个不超过 6 个字的（比如「投资研究」「健康」），同一类事用同一个名字；纯粹的杂事填「${NO_THEME}」。`,
        ...machine.map(m => `${m.id}: ${m.label}`));
    if (excerpts.length) parts.push("",
        "【二、哪些是摘录】下面每一项是日记里的一块（首行 + 前几条子项，可能被截断）。判断它是不是「摘录」：从别处原样搬来的、别人写的话，",
        "比如书摘、文章或帖子的段落、别人视频的简介和字幕、歌词台词、别人的评论。只有明显是别人原话的才填 true，拿不准一律 false。",
        "以下都不算摘录：我自己写的记录、想法、计划、口述的念头；我自己作品的文案和简介；AI 回答我的解释、整理出来的知识点和表格；只有标题和链接的条目。",
        ...excerpts.map(e => `${e.id}: ${e.sample}`));
    if (thoughts.length) parts.push("",
        "【三、哪些是念头】下面每一行是日记里挂着 TODO 的条目。判断它是「任务」还是「念头」：任务 = 知道要做什么、做完能勾掉的事（哪怕很大）；",
        "念头 = 口述的想法、疑问、感受，或者还没想清楚做不做、怎么做的事（常见说法：「是否有办法…」「我感觉…」「要不要…」「能不能…」）。是念头填 true，拿不准填 false。",
        ...thoughts.map(t => `${t.id}: ${t.content}`));
    parts.push("", "只输出一个 JSON 对象，不要任何别的文字，格式：", '{"themes":{"m1":"主题名"},"excerpts":{"e1":false},"thoughts":{"t1":false}}');
    return parts.join("\n");
}

function parseJsonObject(s) {
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a < 0 || b < a) throw new Error("Claude 的回复里没有 JSON");
    return JSON.parse(s.slice(a, b + 1));
}

// ---------------- 归档记一笔：Claude 桌面 app 里的会话 ----------------
// app 给每个会话存一份 claude-code-sessions/<账号>/<组织>/local_….json，归档就是把里面的 isArchived 设成 true。
// cache：路径 → { mtime, sid, title, archived }，没变的文件不重读。返回 Map(会话号 → { sid, title, archived, mtime })
async function scanDesktopSessions(cache) {
    const fs = require("fs");
    const home = os.homedir();
    const base = process.platform === "darwin" ? path.join(home, "Library/Application Support")
        : process.platform === "win32" ? (process.env.APPDATA || path.join(home, "AppData/Roaming"))
        : (process.env.XDG_CONFIG_HOME || path.join(home, ".config"));
    const out = new Map();
    const walk = async (dir, depth) => {
        let ents;
        try { ents = await fs.promises.readdir(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const e of ents) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) { if (depth < 3) await walk(p, depth + 1); continue; }
            if (!e.isFile() || !/^local_.*\.json$/.test(e.name)) continue;
            let st;
            try { st = await fs.promises.stat(p); } catch (err) { continue; }
            let c = cache.get(p);
            if (!c || c.mtime !== st.mtimeMs) {
                c = { mtime: st.mtimeMs, sid: "", title: "", archived: false };
                try {
                    const d = JSON.parse(await fs.promises.readFile(p, "utf8"));
                    c.sid = String(d.cliSessionId || d.sessionId || "");
                    c.title = String(d.title || "");
                    c.archived = d.isArchived === true;
                } catch (err) { c.mtime = 0; }   // app 正好在写这个文件：下一轮再读
                cache.set(p, c);
            }
            if (c.sid) out.set(c.sid, c);
        }
    };
    await walk(path.join(base, "Claude", "claude-code-sessions"), 0);
    return out;
}

// 会话标题要能原样写成一行任务：去掉会被当成时间、格式标记、挪动标记的写法
const safeTitle = (s) => String(s || "").replace(/[\r\n\[\]`←*=~「」]/g, " ").replace(/(\d)[:：](\d)/g, "$1.$2").replace(/\s+/g, " ").trim().slice(0, 60) || "没起名的会话";

// ---------------- 插件 ----------------
module.exports = class JournalTidy extends Plugin {
    async onload() {
        this.settings = Object.assign({}, DEFAULTS, await this.loadData());
        this.addCommand({ id: "open", name: "整理日记…（选文件、选方式）", hotkeys: [{ modifiers: ["Mod", "Shift"], key: "J" }], callback: () => new TidyModal(this).open() });
        for (const mode of ["basic", "deep"]) {
            const id = mode === "basic" ? "" : "-deep";
            this.addCommand({ id: "today" + id, name: `${MODE_LABEL[mode]}今天的日记`, callback: () => this.runOn(this.todayFile(), this.optFor(mode)) });
            this.addCommand({
                id: "current" + id, name: `${MODE_LABEL[mode]}当前打开的日记`,
                checkCallback: (checking) => {
                    const f = this.app.workspace.getActiveFile();
                    if (!f || f.extension !== "md") return false;
                    if (!checking) this.runOn(f, this.optFor(mode));
                    return true;
                },
            });
        }
        this.addCommand({ id: "toggle-excerpt", name: "把光标所在的块标成摘录 / 取消", editorCallback: (editor) => this.toggleExcerpt(editor) });
        this.addCommand({ id: "toggle-thought", name: "把光标所在的行标成念头 / 取消", editorCallback: (editor) => this.toggleThought(editor) });
        this.addCommand({ id: "archive-check", name: "现在查一次有没有刚归档的 Claude 会话", callback: () => this.archiveTick(true) });
        this.addCommand({ id: "undo", name: "撤销上一次日记整理", callback: () => this.undo() });
        this.addRibbonIcon("list-checks", "整理日记", () => new TidyModal(this).open());
        this.addSettingTab(new TidySettings(this));
        // 归档记一笔：每分钟看一眼 Claude 桌面 app 的会话
        this.app.workspace.onLayoutReady(() => this.archiveTick());
        this.registerInterval(window.setInterval(() => this.archiveTick(), 60 * 1000));
    }

    async save() { await this.saveData(this.settings); }

    toggleThought(editor) {
        const at = editor.getCursor().line, line = editor.getLine(at), tag = this.settings.thoughtTag;
        if (!LIST_ITEM.test(line.replace(/^[ \t]+/, "")) || SEP_LINE.test(line)) return new Notice("光标不在列表项上");
        const on = !hasTag(line, tag);
        editor.setLine(at, setTag(line, tag, on));
        new Notice(on ? `已标成念头（${tag}）` : "已取消念头记号");
    }

    // 这种方式做哪几步：基础整理只做本地的；进阶整理再加上要问 Claude 的（各自还受设置里的开关管）
    optFor(mode) {
        const s = this.settings, deep = mode === "deep";
        return { mode, fixNumbered: s.fixNumbered, fillFields: s.fillFields, moveTodos: s.moveTodos, answerQuestions: deep && s.answerQuestions, groupMachine: deep && s.groupMachine, markExcerpts: deep && s.markExcerpts, markThoughts: deep && s.markThoughts };
    }

    toggleExcerpt(editor) {
        let at = editor.getCursor().line;
        while (at > 0 && (isBlank(editor.getLine(at)) || /^[ \t]/.test(editor.getLine(at)))) at--;
        const line = editor.getLine(at), tag = this.settings.excerptTag;
        if (!LIST_ITEM.test(line) || SEP_LINE.test(line)) return new Notice("光标不在列表块里");
        const on = !hasTag(line, tag);
        editor.setLine(at, setTag(line, tag, on));
        new Notice(on ? `已标成摘录（${tag}）` : "已取消摘录记号");
    }

    // 「今天」是哪一篇日记：和螺旋日程用同一个日期分界（它的设置「日记日期分界」，这个时刻之前还算前一天）。
    // 直接问螺旋日程要，它那边改了这边跟着变；螺旋日程没开着才按零点分
    todayMoment() {
        const sp = this.app.plugins.plugins["nautilus-spiral"];
        try { if (sp && typeof sp.today === "function") return sp.today().clone(); } catch (e) { /* 问不到就按零点 */ }
        return moment().startOf("day");
    }
    todayName() { return this.todayMoment().format("YYYY_MM_DD"); }
    // 给设置页看的：现在按哪个时刻分
    cutoffText() {
        const sp = this.app.plugins.plugins["nautilus-spiral"], cut = sp && sp.settings ? sp.settings.dayCutoff : null;
        if (typeof cut !== "number") return "螺旋日程没开着，现在按零点分：过了 0 点就是新的一天";
        const t = Math.round(cut * 60), hm = `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
        return `现在是 ${hm}：${hm} 之前还算前一天的日记（今天这篇是 ${this.todayName()}）`;
    }
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

    // 整理完只收起 DONE 区（规则在 done-to-top 的 foldDone 里），其它展开
    async foldDone(file) {
        if (!(file instanceof TFile)) return;
        const dtt = this.app.plugins.plugins["done-to-top"];
        if (!dtt || typeof dtt.foldDone !== "function") return;
        const leaf = this.app.workspace.getLeavesOfType("markdown").find((l) => l.view && l.view.file === file);
        if (!leaf || !leaf.view.getMode || leaf.view.getMode() !== "source") return;   // 没打开或在阅读模式就不管
        // 等编辑器把整理后的内容同步过来再折，不然同步时会把刚折好的冲掉
        const want = await this.app.vault.read(file);
        for (let i = 0; i < 20 && leaf.view.editor && leaf.view.editor.getValue() !== want; i++) await sleep(100);
        dtt.foldDone(leaf.view);
    }

    async runOn(file, opt) {
        if (!(file instanceof TFile)) return new Notice("没找到这篇日记（今天的可能还没建）");
        if (this.running) return new Notice("上一次整理还在进行中");
        this.running = true;
        const original = await this.app.vault.read(file);
        await this.backup(file, original);
        const report = [];
        try {
            // 编号改成有序列表（纯本地）：「- 1. 内容」→「1. 内容」，放在分区前面，改完的「1. TODO」分区也认得
            if (opt.fixNumbered) {
                let n = 0;
                await this.app.vault.process(file, (data) => { const r = fixNumberedBullets(data); n = r.count; return r.text; });
                if (n) report.push(`${n} 处「- 1.」改成了有序列表「1.」`);
            }
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
                    report.push(changed ? `任务已分区：DONE ${c.DONE} · DOING ${c.DOING} · TODO ${c.TODO}` + (c.LINK ? ` · 链接 ${c.LINK}` : "") + (c.inner ? `；块内归位 ${c.inner} 处` : "") : "任务分区本来就是整理好的");
                    if (moved.length) report.push(`搬到以后的日记：${dtt.movedSummary(moved)}`);
                } else {
                    let moved = 0;
                    await this.app.vault.process(file, (data) => { const r = moveTodos(data); moved = r.moved; return r.text; });
                    report.push(moved ? `${moved} 个待办块移到了元信息下方（done-to-top 插件没开，用的旧规则）` : "没有需要移动的待办");
                }
            }
            // 2. 进阶整理：问题回答、机器行按主题归类、摘录记号。两次问 Claude（联网查问题 / 归类判断）同时发出去，回来再依次写
            if (opt.answerQuestions || opt.groupMachine || opt.markExcerpts || opt.markThoughts) {
                const s = this.settings;
                const text = await this.app.vault.read(file);
                const cands = opt.answerQuestions ? findQuestionCandidates(text, s.questionBlockTitle) : [];
                // 机器行：超过门槛才归类。螺旋日程归过大方向的直接用，剩下的问 Claude
                const all = opt.groupMachine ? machineLines(text) : [];
                const over = all.length > Math.max(0, s.machineThreshold);
                const themes = new Map(), ask = [];
                if (over) {
                    const known = this.spiralThemes();
                    for (const m of all.filter(x => x.top && x.done)) {
                        const k = machineKey(m.label);
                        const hit = known.find(r => r.key === k) || known.find(r => r.key.length >= 4 && k.startsWith(r.key));
                        if (hit) themes.set(m.line, hit.dir || NO_THEME);
                        else ask.push({ id: "m" + (ask.length + 1), line: m.line, label: m.label });
                    }
                }
                const exc = (opt.markExcerpts ? findExcerptCandidates(text, s.excerptTag, s.questionBlockTitle) : []).map(e => ({ ...e, id: "e" + e.id }));
                const tho = (opt.markThoughts ? findThoughtCandidates(text, s.thoughtTag) : []).map(t => ({ ...t, id: "t" + t.id }));
                const doing = [cands.length ? `联网查证 ${cands.length} 个问句` : "", ask.length ? `给 ${ask.length} 条机器行归主题` : "", exc.length ? `看 ${exc.length} 块是不是摘录` : "", tho.length ? `看 ${tho.length} 条待办是不是念头` : ""].filter(Boolean);
                const wait = doing.length ? new Notice(`正在请 Claude ${doing.join("、")}…（大约一两分钟，可以继续写）`, 0) : null;
                let qa, cls;
                try {
                    [qa, cls] = await Promise.allSettled([
                        cands.length ? this.runClaude(buildPrompt(cands, file.path)).then(parseJsonArray) : null,
                        ask.length || exc.length || tho.length ? this.runClaude(buildClassifyPrompt(file.path, ask, this.knownThemes(text), exc, tho), { tools: false }).then(parseJsonObject) : null,
                    ]);
                } finally { if (wait) wait.hide(); }
                const why = (r) => String((r.reason && r.reason.message) || r.reason).slice(0, 120);
                // 2a. 问题汇总 + AI 回答
                if (opt.answerQuestions) {
                    if (!cands.length) report.push("没有找到需要回答的问句");
                    else if (qa.status === "rejected") report.push(`问题没答成：${why(qa)}`);
                    else {
                        const byId = new Map(qa.value.map(r => [Number(r.id), r]));
                        const kept = cands.map(c => ({ ...c, ...(byId.get(c.id) || {}) })).filter(c => c.keep && Array.isArray(c.items) && c.items.length);
                        const skipped = cands.length - kept.length;
                        let written = 0;
                        await this.app.vault.process(file, (data) => { const r = applyAnswers(data, kept, s.questionBlockTitle); written = r.written; return r.text; });
                        report.push(written ? `${written} 行问题挪进了「问题汇总」并写好回答` : "没有需要挪出来回答的问题");
                        if (skipped) report.push(`${skipped} 行没动（自言自语 / 游戏 / 提醒 / 摘抄等）`);
                    }
                }
                // 2b. 机器行按主题归类
                if (opt.groupMachine) {
                    if (!over) report.push(`机器行 ${all.length} 条，没超过 ${s.machineThreshold} 条，不归类`);
                    else {
                        if (ask.length && cls.status === "fulfilled") for (const m of ask) { const t = cleanTheme((cls.value.themes || {})[m.id]); if (t) themes.set(m.line, t); }
                        let r = null;
                        await this.app.vault.process(file, (data) => { r = groupMachine(data, themes); return r.text; });
                        const left = ask.filter(m => !themes.has(m.line)).length;
                        report.push(r.grouped ? `机器行 ${all.length} 条，${r.grouped} 条做完的收进了主题：${r.themes.join("、")}` : `机器行 ${all.length} 条，没有新的要归类`);
                        if (left) report.push(`${left} 条机器行没归上主题` + (cls.status === "rejected" ? `（${why(cls)}）` : ""));
                    }
                }
                // 2c. 摘录记号
                if (opt.markExcerpts && exc.length) {
                    if (cls.status === "rejected") report.push(`摘录没判断成：${why(cls)}`);
                    else {
                        const picked = exc.filter(e => (cls.value.excerpts || {})[e.id] === true);
                        let marked = 0;
                        if (picked.length) await this.app.vault.process(file, (data) => { const r = applyExcerpts(data, picked, s.excerptTag); marked = r.marked; return r.text; });
                        if (marked) report.push(`${marked} 块标成了摘录（${s.excerptTag}）`);
                    }
                }
                // 2d. 念头记号
                if (opt.markThoughts && tho.length) {
                    if (cls.status === "rejected") report.push(`念头没判断成：${why(cls)}`);
                    else {
                        const picked = tho.filter(t => (cls.value.thoughts || {})[t.id] === true);
                        let marked = 0;
                        if (picked.length) await this.app.vault.process(file, (data) => { const r = applyExcerpts(data, picked, s.thoughtTag); marked = r.marked; return r.text; });
                        if (marked) report.push(`${marked} 条待办标成了念头（${s.thoughtTag}）`);
                    }
                }
            }
            new Notice(`${file.basename} ${MODE_LABEL[opt.mode] || "整理"}完了：\n` + report.join("\n") + "\n（撤销：命令「撤销上一次日记整理」）", 10000);
        } catch (e) {
            console.error("[journal-tidy]", e);
            new Notice("日记整理出错：" + (e.message || e) + (report.length ? "\n已完成：" + report.join("；") : ""), 12000);
        } finally {
            this.running = false;
            // 不管整理成功还是中途报错，都把 DONE 区收一遍
            this.foldDone(file).catch((e) => console.error("[journal-tidy] foldDone", e));
        }
    }

    // 螺旋日程自动记日记时给每个会话归过的大方向：[{ key: 去掉 🤖 和空白的那行文字, dir }]，dir 是空的 = 它判断是杂事
    spiralThemes() {
        const st = this.app.plugins.plugins["nautilus-spiral"]?.settings?.autoLogState || {};
        const out = [];
        for (const day of Object.values(st)) for (const r of Object.values(day || {})) {
            if (r && r.label && typeof r.dir === "string" && !r.skip) out.push({ key: machineKey(r.label), dir: cleanTheme(r.dir) });
        }
        return out;
    }

    // 给 Claude 参考的主题名：螺旋日程的大方向 + 这篇日记里已有的主题母块
    knownThemes(text) {
        const sp = this.app.plugins.plugins["nautilus-spiral"];
        const dirs = sp && typeof sp.knownDirs === "function" ? sp.knownDirs() : [];
        const here = splitFrontmatter(text).body.map(l => l.match(THEME_HEAD_RE)).filter(Boolean).map(m => m[1].trim());
        return [...new Set([...dirs, ...here].map(cleanTheme).filter(t => t && t !== NO_THEME))];
    }

    // ---------------- 归档记一笔 ----------------
    // 你在 Claude 桌面 app 里归档一个会话，今天的日记里记一行「DONE 时刻 🤖 归档「标题」」（进 DONE 区）。
    // 螺旋日程自动记日记已经给这个会话记了一行的，由它把那一行标成 DONE，这里不重复记；它没记的（太短、当成闲聊跳过、不是今天的会话）记在这里。
    // 第一次运行时已经归档的会话算旧账，不补记。manual = 命令触发的，没有新归档也说一声
    async archiveTick(manual = false) {
        const s = this.settings;
        if ((!s.archiveLog && !manual) || this._archBusy) return;
        this._archBusy = true;
        try {
            const all = await scanDesktopSessions(this._archCache ||= new Map());
            if (!all.size) { if (manual) new Notice("没找到 Claude 桌面 app 的会话记录"); return; }
            const seen = (s.archiveSeen ||= {});
            let dirty = false;
            if (!s.archiveReady) {
                for (const [sid, x] of all) if (x.archived) seen[sid] = 0;
                s.archiveReady = true; dirty = true;
            }
            const fresh = [];
            const waits = (this._archWait ||= new Map());
            for (const [sid, x] of all) {
                if (!x.archived || sid in seen) continue;
                const own = this.spiralOwns(sid);
                if (own.wait) {
                    if (!waits.has(sid)) waits.set(sid, Date.now());
                    if (Date.now() - waits.get(sid) < own.wait) continue;   // 等螺旋日程下一轮；等过头了就自己记
                }
                seen[sid] = Date.now(); dirty = true;
                if (!own.line) fresh.push({ ...x, min: own.min || 0 });
            }
            const lines = fresh.length ? await this.logArchived(fresh) : [];
            if (dirty) await this.save();
            if (lines.length) new Notice(`📦 归档了 ${lines.length} 个会话，记进了今天的日记：\n` + fresh.map(x => safeTitle(x.title)).join("\n"), 8000);
            else if (manual) new Notice("没有新归档的会话要记");
        } catch (e) {
            console.error("[journal-tidy] 归档记一笔", e);
            if (manual) new Notice("归档记一笔出错：" + (e.message || e));
        } finally { this._archBusy = false; }
    }

    // 这个会话螺旋日程管不管：line = 它已经记了一行；wait = 它下一轮就会记，等这么多毫秒；min = 今天这个会话动了多少分钟
    spiralOwns(sid) {
        const sp = this.app.plugins.plugins["nautilus-spiral"];
        const cfg = sp && sp.settings;
        let min = 0;
        try {
            const key = sp.today().format(cfg.format || "YYYY_MM_DD");
            const x = ((sp.aiStore.days[key] || {}).list || []).find(v => v.sid === sid);
            if (x) min = Math.round(x.min || 0);
        } catch (e) { /* 没装螺旋日程，或者它还没扫完 */ }
        if (!cfg || !cfg.autoLog || cfg.autoLogArchiveDone === false) return { min };
        for (const day of Object.values(cfg.autoLogState || {})) {
            const r = day && day[sid];
            if (r) return { min, line: !!(r.key && !r.skip && !r.gone) };
        }
        return min >= 3 ? { min, wait: (Math.max(5, cfg.autoLogEvery || 20) + 5) * 60e3 } : { min };
    }

    async logArchived(list) {
        const filePath = this.todayPath();   // 和螺旋日程同一个日期分界（见 todayMoment）
        let file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file) file = await this.app.vault.create(filePath, `---\njournal: 每日\njournal-date: ${this.todayMoment().format("YYYY-MM-DD")}\n---\n`);
        const lines = list.map((x) => {
            const at = Date.now() - x.mtime < 12 * 3600e3 ? x.mtime : Date.now();   // 会话文件最后一次改动 ≈ 归档的时刻
            return `- DONE ${moment(at).format("HH:mm")} 🤖 归档「${safeTitle(x.title)}」` + (x.min >= 1 ? ` ${fmtMin(x.min)}` : "");
        });
        const written = [];
        const dtt = this.app.plugins.plugins["done-to-top"];
        await this.edit(file, (text) => {
            for (const l of lines) {
                if (text.includes(l.slice(l.indexOf("🤖")).replace(/ \d+h?\d*m?$/, ""))) continue;   // 今天已经记过这个标题
                text = dtt && dtt.core && dtt.core.addBlock ? dtt.core.addBlock(text, [l]) : text.replace(/\s*$/, "\n") + l + "\n";
                written.push(l);
            }
            return text;
        });
        return written;
    }

    // 改一篇笔记：开着编辑器就走编辑器（只动变了的那几行，不打断你打字），没开就直接改文件
    async edit(file, fn) {
        const leaf = this.app.workspace.getLeavesOfType("markdown").find((l) => l.view && l.view.file === file && l.view.getMode && l.view.getMode() === "source");
        const core = this.app.plugins.plugins["done-to-top"]?.core;
        if (leaf && leaf.view.editor && core && core.diffChange) {
            const old = leaf.view.editor.getValue();
            const ch = core.diffChange(old, fn(old));
            if (ch) leaf.view.editor.transaction({ changes: [ch] });
            return;
        }
        await this.app.vault.process(file, fn);
    }

    runClaude(prompt, { tools = true } = {}) {
        return new Promise((resolve, reject) => {
            const bin = this.settings.claudePath.replace(/^~(?=\/)/, os.homedir());
            const args = ["-p", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config"];
            if (this.settings.model) args.push("--model", this.settings.model);
            if (tools) args.push("--allowedTools", "WebSearch", "WebFetch");
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
        let mode = s.lastMode === "deep" ? "deep" : "basic";
        const opt = { fixNumbered: s.fixNumbered !== false, moveTodos: s.moveTodos, fillFields: s.fillFields, answerQuestions: s.answerQuestions, groupMachine: s.groupMachine, markExcerpts: s.markExcerpts, markThoughts: s.markThoughts };
        const deepRows = [];
        const show = () => deepRows.forEach(r => r.settingEl.toggle(mode === "deep"));
        new Setting(this.contentEl).setName("方式").setDesc("基础整理只在本地排，马上完成；进阶整理先做一遍基础整理，再请本机的 Claude 做下面几件，要一两分钟")
            .addDropdown(d => d.addOption("basic", "基础整理").addOption("deep", "进阶整理").setValue(mode).onChange(v => { mode = v; show(); }));
        new Setting(this.contentEl).setName("编号改成有序列表").setDesc("「- 1. 内容」「- 1、内容」这种在无序列表里手打编号的，改成标准的「1. 内容」；缩进和编号不变，「- 5.25」这种小数不动")
            .addToggle(t => t.setValue(opt.fixNumbered).onChange(v => { opt.fixNumbered = v; }));
        new Setting(this.contentEl).setName("补 SuperTag 字段").setDesc("写了 [[菜谱]] 这类 SuperTag 的项，下面插上还没有的字段（如「学会:: 否」），留给你填")
            .addToggle(t => t.setValue(opt.fillFields).onChange(v => { opt.fillFields = v; }));
        new Setting(this.contentEl).setName("任务按状态分区").setDesc("顶格任务块连同子块排成 DONE → DOING → TODO → 链接 → 其它，区之间用「- ---」隔开，整理完把 DONE 区折起来；块内用「- ---」分了栏的，子项也在块内按状态排")
            .addToggle(t => t.setValue(opt.moveTodos).onChange(v => { opt.moveTodos = v; }));
        deepRows.push(new Setting(this.contentEl).setName("汇总问题并用 AI 回答").setDesc("问句挪到文末「问题汇总」，Claude 联网查证后写回答；自言自语、游戏相关的不动")
            .addToggle(t => t.setValue(opt.answerQuestions).onChange(v => { opt.answerQuestions = v; })));
        deepRows.push(new Setting(this.contentEl).setName("机器行按主题归类").setDesc(`🤖 开头的机器行超过 ${s.machineThreshold} 条时，把做完的按主题收到各自的母块下面（留在 DONE 区，折起来）；还在做、搁置的留在原处`)
            .addToggle(t => t.setValue(opt.groupMachine).onChange(v => { opt.groupMachine = v; })));
        deepRows.push(new Setting(this.contentEl).setName("给摘录挂记号").setDesc(`从别处原样搬来的别人的话，顶格那一行末尾挂「${s.excerptTag}」；拿不准的不标`)
            .addToggle(t => t.setValue(opt.markExcerpts).onChange(v => { opt.markExcerpts = v; })));
        deepRows.push(new Setting(this.contentEl).setName("给念头挂记号").setDesc(`挂着 TODO 的条目里，口述的想法、疑问、还没想清楚做不做的事，行尾挂「${s.thoughtTag}」，TODO 留着；拿不准的算任务`)
            .addToggle(t => t.setValue(opt.markThoughts).onChange(v => { opt.markThoughts = v; })));
        show();
        new Setting(this.contentEl).addButton(b => b.setButtonText("开始整理").setCta().onClick(async () => {
            if (!chosen) return new Notice("先选一篇日记");
            Object.assign(s, opt, { lastMode: mode }); await p.save();
            this.close();
            p.runOn(chosen, p.optFor(mode));
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
        new Setting(containerEl).setName("几点之前算前一天").setDesc(`「整理今天的日记」「归档记一笔」里的「今天」，跟着螺旋日程设置里的「日记日期分界」走，不在这里单独设。${this.plugin.cutoffText()}`)
            .addButton(b => b.setButtonText("去螺旋日程里改").onClick(() => { this.app.setting.openTabById("nautilus-spiral"); }));
        text("claude 命令路径", "本机 Claude Code 的命令行（要先登录过）", "claudePath");
        text("模型", "留空用 Claude Code 的默认模型；也可以填 opus / sonnet 或完整的模型 ID", "model");
        text("超时（秒）", "问题多、要联网时会久一些", "timeoutSec", true);
        text("问题汇总块的标题", "顶格那一行 `- ` 后面的文字；已有这个块就往里追加", "questionBlockTitle");
        text("机器行超过几条才归类", "进阶整理时，全篇 🤖 开头的机器行超过这个数，才把做完的按主题收起来", "machineThreshold", true);
        text("摘录的记号", "挂在摘录那一块顶格行的末尾。改了以后，以前标的旧记号不会跟着换", "excerptTag");
        text("念头的记号", "挂在念头那一行的末尾（TODO 留着不动）", "thoughtTag");
        new Setting(containerEl).setName("归档记一笔").setDesc("在 Claude 桌面 app 里归档一个会话，今天的日记里记一行「DONE 时刻 🤖 归档「标题」」。螺旋日程自动记日记已经给它记过一行的，由螺旋日程把那一行标成 DONE，这里不重复记")
            .addToggle(t => t.setValue(s.archiveLog !== false).onChange(async v => { s.archiveLog = v; await this.plugin.save(); }));
    }
}

module.exports.__test = { fixNumberedBullets, moveTodos, findQuestionCandidates, applyAnswers, segment, splitFrontmatter, machineLines, groupMachine, findExcerptCandidates, findThoughtCandidates, applyExcerpts, setTag, buildClassifyPrompt, scanDesktopSessions, safeTitle };
