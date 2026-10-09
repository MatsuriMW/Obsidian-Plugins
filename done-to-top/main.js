// 任务归位：按状态把顶格任务块放进各自的分区
//   分区顺序：DONE（最上面）→ DOING（中间）→ TODO（DOING 下面）→ 没状态的（最下面，原样不动），分区之间用「- ---」隔开
//   · 只看顶格条目的状态；子项的状态不参与分类，整块跟着母项走
//   · DONE 栏 = 正文第一条「- ---」之前的那一段；手动放进去的普通条目留在栏里不动
//   · 关键字和复选框都认：DONE/[x]、DOING/NOW/[/]、TODO/LATER/[ ]；CANCELED/FAILED 归 DONE 区，PAUSED（停一下）归 DOING 区，WAITING/SUSPENDED 归 TODO 区
//   · core 挂在插件实例上，Telegram Inbox（自用版）收消息时也用它归位
//   · 一键整理时，顶格条目带「明天 / 后天 / 大后天」的，整块搬到那一天的日记，行尾记上「← [[来源日记]]」
//     （带这个记号的不会再被搬；DONE 和 DONE 栏里的不搬）。⌥Space 快速记录（nautilus-cli.js）用同一份规则
const { Plugin, Notice } = require("obsidian");

const BULLET_RE = /^(\s*)([-*+])(\s+|$)(.*)$/;
const ITEM_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/;
const SEP_RE = /^[-*+]\s+(-{3,}|\*{3,}|_{3,})\s*$/;
const SEP = "- ---";
const KEYWORD_RE = /^(TODO|DOING|LATER|NOW|PAUSED|WAITING|WAIT|IN-PROGRESS|SUSPENDED|CANCELED|CANCELLED|FAILED|DONE)(\s+|$)/;
const CHECKBOX_RE = /^\[[^\]]\](\s+|$)/;
const STAMP_RE = /^\*\*\d{1,2}[:：]\d{2}\*\*\s*/;          // 前面的 **07:37** 记录点
const LEADING_TIME_RE = /^\d{1,2}(?:[:：]\d{2}|点)/;
const TIME_OR_RANGE_RE = /^\d{1,2}[:：]\d{2}(?:\s*[-–~～]\s*\d{1,2}[:：]\d{2})?\s*/;
const SINGLE_TIME_RE = /^(\d{1,2}[:：]\d{2})(?!\s*[-–~～]\s*\d)\s*/;
const LOWER_KW_RE = /^(todo|doing|done)(?=[\s:：]|$)[:：]?\s*/i;   // todo / Todo / todo： → TODO
const ZONE = {
	DONE: "DONE", CANCELED: "DONE", CANCELLED: "DONE", FAILED: "DONE",
	DOING: "DOING", NOW: "DOING", "IN-PROGRESS": "DOING", PAUSED: "DOING",
	TODO: "TODO", LATER: "TODO", WAITING: "TODO", WAIT: "TODO", SUSPENDED: "TODO",
};
const TAB_WIDTH = 4;

const pad = (n) => String(n).padStart(2, "0");
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function indentWidth(line) {
	let w = 0;
	for (const ch of line) {
		if (ch === "\t") w += TAB_WIDTH;
		else if (ch === " ") w += 1;
		else break;
	}
	return w;
}

function isBlank(line) {
	return line.trim() === "";
}

// 去掉 width 宽度的前导缩进
function dedent(line, width) {
	let w = 0;
	let i = 0;
	while (i < line.length && w < width) {
		if (line[i] === "\t") w += TAB_WIDTH;
		else if (line[i] === " ") w += 1;
		else break;
		i++;
	}
	return line.slice(i);
}

// 跳过 YAML frontmatter，返回正文第一行
function topInsertLine(lines) {
	if (lines[0] !== "---") return 0;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i] === "---") return i + 1;
	}
	return 0;
}

// 顶格条目属于哪个分区：DONE / DOING / TODO / null（没状态）
function zoneOf(line) {
	const m = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
	if (!m) return null;
	let rest = m[1];
	const cb = rest.match(/^\[(.)\](\s+|$)/);
	if (cb) return cb[1] === " " ? "TODO" : cb[1] === "/" ? "DOING" : /[xX-]/.test(cb[1]) ? "DONE" : null;
	rest = rest.replace(STAMP_RE, "");
	const k = rest.match(KEYWORD_RE);
	return k ? ZONE[k[1]] : null;
}

// todo / Doing / done： 这类写法统一成大写关键字；DOING 没写时间的话（withTime）补上开始时间
function normalizeKeyword(line, withTime) {
	const m = line.match(ITEM_RE);
	if (!m) return line;
	const k = m[2].match(LOWER_KW_RE);
	if (!k) return line;
	const kw = k[1].toUpperCase();
	let body = m[2].slice(k[0].length);
	if (kw === "DOING" && withTime && !LEADING_TIME_RE.test(body)) body = body ? `${nowHM()} ${body}` : nowHM();
	return `${m[1]}${kw}${body ? " " + body : ""}`;
}

// 把正文切成顶格块：顶格非空行开一个新块，缩进行 / 空行 / 代码块里的行跟着上一块
function parse(text) {
	const lines = text.split("\n");
	const bodyStart = topInsertLine(lines);
	let bodyEnd = lines.length;
	while (bodyEnd > bodyStart && isBlank(lines[bodyEnd - 1])) bodyEnd--;
	const blocks = [];
	let inFence = false;
	for (let i = bodyStart; i < bodyEnd; i++) {
		const line = lines[i];
		const fence = /^\s*(```|~~~)/.test(line);
		const startsNew = !inFence && !isBlank(line) && !/^\s/.test(line);
		if (startsNew || !blocks.length) {
			const sep = SEP_RE.test(line);
			blocks.push({ lines: [line], start: i, sep, zone: sep ? null : zoneOf(line) });
		} else blocks[blocks.length - 1].lines.push(line);
		if (fence) inFence = !inFence;
	}
	return { head: lines.slice(0, bodyStart), blocks, tail: lines.slice(bodyEnd) };
}

function trimBlock(blockLines) {
	const out = blockLines.slice();
	while (out.length > 1 && isBlank(out[out.length - 1])) out.pop();
	return out;
}

// DONE 栏 = 正文第一段（第一条「- ---」之前），里面有没有 DONE 都算；栏是空的 = 正文以「- ---」开头。
// 用户会把读完、理解完的普通条目也手动放进这一栏，所以栏里没状态的块算它的成员，原地不动。
// 返回第一条分隔线的下标（= 这一栏的块数）；没有分隔线（还没有栏）时返回 -1
function doneZoneEnd(blocks) {
	return blocks.findIndex((b) => b.sep);
}

// 一键整理：DONE 栏 → DOING → TODO → 其余（原顺序、原样），区之间「- ---」
function organize(text) {
	const { head, blocks, tail } = parse(text);
	const zones = { DONE: [], DOING: [], TODO: [] };
	const rest = [];
	const keep = doneZoneEnd(blocks);
	blocks.forEach((b, i) => { b.inDone = i < keep; });
	for (const b of blocks) {
		if (!b.sep && !b.zone) {
			// 小写关键字先规范，再重新判断
			const fixed = normalizeKeyword(b.lines[0], false);
			if (fixed !== b.lines[0]) { b.lines[0] = fixed; b.zone = zoneOf(fixed); }
		}
		if (b.zone) zones[b.zone].push(trimBlock(b.lines));
		else if (b.inDone) zones.DONE.push(trimBlock(b.lines));   // 手动放进 DONE 栏的普通条目留在栏里
		else if (b.sep) { if (rest.length && !rest[rest.length - 1].sep) rest.push(b); }   // 开头的、连着的分隔线不要
		else rest.push(b);
	}
	if (rest.length && rest[rest.length - 1].sep) rest.pop();
	const out = [];
	// DONE 栏空着、下面又有 DOING / TODO 时，开头留一条分隔线占住 DONE 栏的位置（不然 DOING 那段会被当成 DONE 栏）
	const emptyDone = !zones.DONE.length && (zones.DOING.length || zones.TODO.length);
	const add = (ls) => { if (!ls.length) return; if (out.length || emptyDone) out.push(SEP); out.push(...ls); };
	for (const z of ["DONE", "DOING", "TODO"]) add(zones[z].flat());
	add(rest.flatMap((b) => b.lines));
	const counts = { DONE: blocks.filter((b) => b.zone === "DONE").length, DOING: zones.DOING.length, TODO: zones.TODO.length };
	return { text: head.concat(out, tail).join("\n"), counts };
}

// 把一个块放进它的分区，别的内容不动。
// DONE 放 DONE 栏最上面；DOING 接在 DONE 栏后面那段任务区里最后一个 DOING 后面（没有就紧跟 DONE 栏）；
// TODO 接在最后一个 TODO（没有就 DOING，再没有就紧跟 DONE 栏）后面。需要时自动补「- ---」
function place(text, blockLines, zone) {
	const { head, blocks, tail } = parse(text);
	const doneEnd = doneZoneEnd(blocks);
	const hasZone = doneEnd >= 0;
	const ins = trimBlock(blockLines);
	let idx = 0;
	if (zone === "DONE") {
		// 还没有栏：下面不是 DONE 的话用分隔线隔开，这一条就成了 DONE 栏
		if (!hasZone && blocks[0] && blocks[0].zone !== "DONE") ins.push(SEP);
	} else {
		const from = hasZone ? doneEnd : 0;   // 任务区 = DONE 栏之后连续的状态块和分隔线
		let headEnd = from;
		while (headEnd < blocks.length && (blocks[headEnd].sep || blocks[headEnd].zone)) headEnd++;
		idx = -1;
		for (const z of zone === "DOING" ? ["DOING"] : ["TODO", "DOING"]) {
			for (let i = headEnd - 1; i >= from; i--) if (blocks[i].zone === z) { idx = i + 1; break; }
			if (idx >= 0) break;
		}
		if (idx < 0) idx = hasZone ? doneEnd + 1 : 0;   // 紧跟 DONE 栏的分隔线
		const prev = blocks[idx - 1], next = blocks[idx];
		if (!hasZone && idx === 0) ins.unshift(SEP);   // 还没有栏：先留出空的 DONE 栏
		else if (prev && !prev.sep && prev.zone !== zone) ins.unshift(SEP);
		if (next && !next.sep && next.zone !== zone) ins.push(SEP);
	}
	const before = blocks.slice(0, idx).flatMap((b) => b.lines);
	const after = blocks.slice(idx).flatMap((b) => b.lines);
	const out = head.concat(before, ins, after, tail);
	return { text: out.join("\n"), line: head.length + before.length, count: ins.length };
}

// 改这一行的状态
function mark(line, zone) {
	const m = line.match(BULLET_RE);
	let content = m[4];
	let stamp = "";
	const st = content.match(STAMP_RE);
	if (st) { stamp = st[0]; content = content.slice(st[0].length); }
	const kw = content.match(KEYWORD_RE);
	const low = kw ? null : content.match(LOWER_KW_RE);   // todo / Doing 这类小写写法
	const old = kw ? kw[1] : low ? low[1].toUpperCase() : null;
	if (kw && ZONE[old] === zone) {
		// 已经是这个状态，只挪位置；DOING 没记开始时间的补上
		const body = content.slice(kw[0].length);
		if (old !== "DOING" || LEADING_TIME_RE.test(body)) return line;
		return `${m[1]}${m[2]} ${stamp}DOING ${nowHM()}${body ? " " + body : ""}`;
	}
	content = content.replace(CHECKBOX_RE, "");
	content = low ? content.slice(low[0].length) : content.replace(KEYWORD_RE, "");
	const wasStamped = old === "DOING" || old === "NOW" || old === "IN-PROGRESS" || old === "DONE";
	if (zone === "DONE") {
		// 完成时间写在 DONE 后面，螺旋日程靠它定位；DOING 记过开始时间的写成「开始-现在」
		const t = wasStamped && old !== "DONE" ? content.match(SINGLE_TIME_RE) : null;
		if (t) content = `${t[1].replace("：", ":")}-${nowHM()} ${content.slice(t[0].length)}`.trimEnd();
		else if (!LEADING_TIME_RE.test(content)) content = content ? `${nowHM()} ${content}` : nowHM();
	} else if (zone === "DOING") {
		if (old === "DONE") content = content.replace(TIME_OR_RANGE_RE, "");
		if (!LEADING_TIME_RE.test(content)) content = content ? `${nowHM()} ${content}` : nowHM();
	} else if (wasStamped) {
		// 退回 TODO：DOING / DONE 留下的时间戳去掉，不然螺旋日程会当成钉了时间的任务
		content = content.replace(TIME_OR_RANGE_RE, "");
	}
	return `${m[1]}${m[2]} ${stamp}${zone}${content ? " " + content : ""}`;
}

// ---------- 四象限（任务管理看板的 #q1…#q4）----------
const QUAD_RE = /(?<![A-Za-z0-9_/#&;])#q([1-4])(?![\p{L}\p{N}_/-])/giu;
const QUAD = { 1: [1, 1], 2: [1, 0], 3: [0, 1], 4: [0, 0] };   // [重要, 紧急]

function toggleQuadrant(line, axis) {
	const found = [...line.matchAll(QUAD_RE)];
	const cur = found.length ? QUAD[found[0][1]].slice() : [0, 0];
	cur[axis] = cur[axis] ? 0 : 1;
	const key = cur[0] && cur[1] ? 1 : cur[0] ? 2 : cur[1] ? 3 : 0;   // 都不是 = 不标
	let out = line.replace(QUAD_RE, "").replace(/(\S)[ \t]{2,}/g, "$1 ").replace(/\s+$/, "");
	if (key) {
		const id = out.match(/\s+\^[A-Za-z0-9-]+$/);   // 块 ID 要留在行尾
		out = id ? `${out.slice(0, id.index)} #q${key}${id[0]}` : `${out} #q${key}`;
	}
	return { line: out, key };
}

// ---------- 明天 / 后天 / 大后天：搬到那一天的日记 ----------
const DAY_WORD_RE = /大后天|后天|明天/;
const DAY_OFFSET = { 明天: 1, 后天: 2, 大后天: 3 };
const FROM_RE = /\s←\s*\[\[\d{4}_\d{2}_\d{2}\]\]/;
const JOURNAL_NAME_RE = /^(\d{4})_(\d{2})_(\d{2})$/;

// 这一行要往后搬几天；0 = 不搬（没提日子、已经搬过、已经 DONE）
function dayWordOffset(line) {
	if (FROM_RE.test(line) || zoneOf(line) === "DONE") return 0;
	const bare = line.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "").replace(/!?\[\[[^\]]*\]\]/g, "");   // 网址、双链里的不算
	const m = DAY_WORD_RE.exec(bare);
	return m ? DAY_OFFSET[m[0]] : 0;
}

// 行尾记上从哪篇日记搬来的（块 ID 要留在行尾）
function markFrom(line, sourceName) {
	const id = line.match(/\s+\^[A-Za-z0-9-]+$/);
	const body = (id ? line.slice(0, id.index) : line).replace(/\s+$/, "");
	return `${body} ← [[${sourceName}]]${id ? id[0] : ""}`;
}

// 2026_10_04 往后数 n 天 → 2026_10_05；返回 { name, date: "2026-10-05" }
function journalAfter(name, n) {
	const m = JOURNAL_NAME_RE.exec(name);
	if (!m) return null;
	const d = new Date(+m[1], +m[2] - 1, +m[3] + n);
	const ymd = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())];
	return { name: ymd.join("_"), date: ymd.join("-") };
}

// 找出要搬走的顶格块（DONE 栏里的不算）。orig = 原样（用来从原文删掉），lines = 加了来源记号、要写进目标日记的
function takeDayItems(text, sourceName) {
	const { blocks } = parse(text);
	const keep = doneZoneEnd(blocks);
	const moves = [];
	blocks.forEach((b, i) => {
		const off = b.sep || i < keep ? 0 : dayWordOffset(b.lines[0]);
		const to = off && journalAfter(sourceName, off);
		if (!to) return;
		const lines = trimBlock(b.lines);
		lines[0] = markFrom(normalizeKeyword(lines[0], false), sourceName);
		moves.push({ offset: off, to, orig: trimBlock(b.lines), lines });
	});
	return moves;
}

// 按内容从原文里删掉这些块（整理过程中原文可能变了，所以不按行号）
function dropBlocks(text, origs) {
	const { head, blocks, tail } = parse(text);
	const want = origs.map((ls) => ls.join("\n"));
	const out = blocks.filter((b) => {
		const i = want.indexOf(trimBlock(b.lines).join("\n"));
		if (i < 0) return true;
		want.splice(i, 1);
		return false;
	});
	return head.concat(out.flatMap((b) => b.lines), tail).join("\n");
}

// 把一块写进日记：任务进分区，其余追加到末尾
function addBlock(text, lines) {
	const zone = zoneOf(lines[0]);
	if (zone) return place(text, lines, zone).text;
	return text.replace(/\s*$/, "\n") + lines.join("\n") + "\n";
}

const QUAD_LABEL = ["已清除四象限标记", "#q1 重要且紧急", "#q2 重要不紧急", "#q3 紧急不重要"];

// 算出只替换「前后不一样的那几行」的一次改动：一次 ⌘Z 撤销，折叠和滚动位置也不乱
function diffChange(oldText, newText) {
	const a = oldText.split("\n"), b = newText.split("\n");
	let s = 0;
	while (s < a.length && s < b.length && a[s] === b[s]) s++;
	if (s === a.length && s === b.length) return null;
	let ea = a.length - 1, eb = b.length - 1;
	while (ea >= s && eb >= s && a[ea] === b[eb]) { ea--; eb--; }
	let from, to, text = b.slice(s, eb + 1).join("\n");
	if (ea < s) {
		// 纯插入
		if (s < a.length) { from = to = { line: s, ch: 0 }; text += "\n"; }
		else { from = to = { line: a.length - 1, ch: a[a.length - 1].length }; text = "\n" + text; }
	} else if (eb < s) {
		// 纯删除
		if (ea + 1 < a.length) { from = { line: s, ch: 0 }; to = { line: ea + 1, ch: 0 }; }
		else if (s > 0) { from = { line: s - 1, ch: a[s - 1].length }; to = { line: ea, ch: a[ea].length }; }
		else { from = { line: 0, ch: 0 }; to = { line: ea, ch: a[ea].length }; }
	} else {
		from = { line: s, ch: 0 };
		to = { line: ea, ch: a[ea].length };
	}
	return { from, to, text };
}

function applyText(editor, newText, cursor) {
	const change = diffChange(editor.getValue(), newText);
	if (!change) return false;
	const tx = { changes: [change] };
	if (cursor) tx.selection = { from: cursor };
	editor.transaction(tx);
	return true;
}

const core = { parse, organize, place, mark, zoneOf, normalizeKeyword, toggleQuadrant, diffChange, SEP, dayWordOffset, markFrom, journalAfter, takeDayItems, dropBlocks, addBlock };

module.exports = class DoneToTopPlugin extends Plugin {
	onload() {
		this.core = core;
		this.addCommand({
			id: "mark-done-and-move-to-top",
			name: "标记 DONE 并移到页面顶部",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "d" }],
			editorCallback: (editor) => this.run(editor, true),
		});
		this.addCommand({
			id: "move-to-top",
			name: "移到页面顶部（不标记 DONE）",
			hotkeys: [{ modifiers: ["Mod"], key: "d" }],
			editorCallback: (editor) => this.run(editor, false),
		});
		this.addCommand({
			id: "mark-doing-and-move-to-middle",
			name: "标记 DOING 并移到中间（DONE 区下面）",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "d" }],
			editorCallback: (editor) => this.moveTo(editor, "DOING"),
		});
		this.addCommand({
			id: "mark-todo-and-move-below-doing",
			name: "标记 TODO 并移到 DOING 区下面",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "t" }],
			editorCallback: (editor) => this.moveTo(editor, "TODO"),
		});
		this.addCommand({
			id: "organize",
			name: "一键整理：DONE / DOING / TODO / 其它 分区",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "f" }],
			editorCallback: (editor) => this.organize(editor),
		});
		this.addCommand({
			id: "toggle-important",
			name: "切换「重要」（四象限 #q1…#q4）",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "i" }],
			editorCallback: (editor) => this.quadrant(editor, 0),
		});
		this.addCommand({
			id: "toggle-urgent",
			name: "切换「紧急」（四象限 #q1…#q4）",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "u" }],
			editorCallback: (editor) => this.quadrant(editor, 1),
		});
		// 命令名里带「明天」：编辑器里打 /明天 就能从斜杠命令里叫出来
		this.addCommand({
			id: "send-block-to-tomorrow",
			name: "发送到明天：把光标所在块（连同子项）移到明天的日记",
			editorCallback: (editor, ctx) => this.sendToTomorrow(editor, ctx && ctx.file),
		});
		// 以下全部：光标所在行到页尾整段追加到今天 / 明天的日记（光标在分隔线上就从下一行起，分隔线留在原处）
		this.addCommand({
			id: "send-rest-to-today",
			name: "以下全部发送到今天：光标所在行及以下的块追加到今天的日记",
			hotkeys: [{ modifiers: ["Alt"], key: "2" }],
			editorCallback: (editor, ctx) => this.sendRest(editor, ctx && ctx.file, "today"),
		});
		this.addCommand({
			id: "send-rest-to-tomorrow",
			name: "以下全部发送到明天：光标所在行及以下的块追加到明天的日记",
			hotkeys: [{ modifiers: ["Alt"], key: "3" }],
			editorCallback: (editor, ctx) => this.sendRest(editor, ctx && ctx.file, "tomorrow"),
		});
		// 不给默认快捷键，免得误按；要用就在「设置 → 快捷键」里自己绑
		this.addCommand({
			id: "delete-rest",
			name: "以下全部删除：删掉光标所在行及以下的内容",
			editorCallback: (editor) => this.deleteRest(editor),
		});
	}

	// 明天的日记：当前笔记是日记就取它的后一天；不是日记就取「今天」的后一天（和螺旋日程同一个凌晨分界）
	tomorrowOf(file) {
		if (file && JOURNAL_NAME_RE.test(file.basename)) {
			const to = journalAfter(file.basename, 1);
			return { ...to, folder: file.parent && file.parent.path !== "/" ? file.parent.path : "", source: file.basename };
		}
		const cfg = this.app.plugins?.plugins?.["nautilus-spiral"]?.settings || {};
		const d = new Date();
		if (d.getHours() * 60 + d.getMinutes() < (cfg.dayCutoff ?? 7) * 60) d.setDate(d.getDate() - 1);
		const today = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("_");
		return { ...journalAfter(today, 1), folder: cfg.folder || "日记", source: file ? file.basename : today };
	}

	// 今天的日记（和螺旋日程同一个凌晨分界）；当前笔记是日记就放在它那个文件夹
	todayOf(file) {
		const cfg = this.app.plugins?.plugins?.["nautilus-spiral"]?.settings || {};
		const d = new Date();
		if (d.getHours() * 60 + d.getMinutes() < (cfg.dayCutoff ?? 7) * 60) d.setDate(d.getDate() - 1);
		const ymd = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())];
		const isJournal = file && JOURNAL_NAME_RE.test(file.basename);
		const folder = isJournal ? (file.parent && file.parent.path !== "/" ? file.parent.path : "") : cfg.folder || "日记";
		return { name: ymd.join("_"), date: ymd.join("-"), folder, source: file ? file.basename : ymd.join("_") };
	}

	// 光标所在行到页尾整段拿走，原样追加到今天 / 明天日记的末尾；顶格条目行尾记上「← [[来源]]」。
	// 光标在列表项的续行上时从这一项开始；光标正好在分隔线上时跳过这条线（它留在原处，原日记就以分隔线收尾）
	async sendRest(editor, file, day = "today") {
		file = file || this.app.workspace.getActiveFile();
		const lines = editor.getValue().split("\n");
		let start = this.restStart(lines, editor.getCursor().line);
		const isSep = (l) => SEP_RE.test(l) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
		if (isSep(lines[start])) start++;
		while (start < lines.length && isBlank(lines[start])) start++;
		let end = lines.length - 1;
		while (end >= start && isBlank(lines[end])) end--;
		if (start > end) return new Notice("下面没有可以发送的内容");

		const dayLabel = day === "tomorrow" ? "明天" : "今天";
		const to = day === "tomorrow" ? this.tomorrowOf(file) : this.todayOf(file);
		if (file && to.name === file.basename) return new Notice(`这里已经是${dayLabel}的日记了`);
		const orig = lines.slice(start, end + 1);
		const baseIndent = indentWidth(orig[0]);
		let inFence = false;
		const moved = orig.map((l) => {
			const out = isBlank(l) ? "" : dedent(l, baseIndent);
			const fence = /^\s*(```|~~~)/.test(out);
			// 顶格列表项（不是分隔线、不在代码块里、还没记过来源）记上来源
			const top = !inFence && !fence && ITEM_RE.test(out) && !/^\s/.test(out) && !isSep(out);
			if (fence) inFence = !inFence;
			return top && !FROM_RE.test(out) ? markFrom(normalizeKeyword(out, false), to.source) : out;
		});
		const path = (to.folder ? to.folder + "/" : "") + to.name + ".md";
		try {
			let target = this.app.vault.getAbstractFileByPath(path);
			if (!target) target = await this.app.vault.create(path, `---\njournal: 每日\njournal-date: ${to.date}\n---\n`);
			await this.app.vault.process(target, (data) => data.replace(/\s*$/, "\n") + moved.join("\n") + "\n");
		} catch (e) {
			console.error("[done-to-top] 以下全部发送失败", path, e);
			return new Notice("写入日记失败，原文没动。详情见控制台");
		}
		// 原文里删掉这一段（编辑器事务，⌘Z 能撤回；目标日记里那份要手动删）
		const last = lines.length - 1;
		if (editor.getRange({ line: start, ch: 0 }, { line: last, ch: lines[last].length }).replace(/\s+$/, "") !== orig.join("\n")) {
			return new Notice(`已写进 ${to.name}，但原文在这期间变了，没有删原处，请手动删`);
		}
		const from = start > 0 ? { line: start - 1, ch: lines[start - 1].length } : { line: 0, ch: 0 };
		editor.transaction({ changes: [{ from, to: { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length }, text: "" }] });
		const next = Math.max(0, Math.min(start - 1, editor.lastLine()));
		editor.setCursor({ line: next, ch: editor.getLine(next).length });
		const tops = moved.filter((l) => !isBlank(l) && !/^\s/.test(l) && !isSep(l)).length;
		new Notice(`➡️ 已追加到${dayLabel}（${to.name}）：${tops} 块，共 ${orig.length} 行`);
	}

	// 「以下全部」从哪一行算起：光标所在行（不进属性区）；光标在列表项的续行上时从这一项开始
	restStart(lines, cursorLine) {
		const bodyStart = topInsertLine(lines);
		let start = Math.max(cursorLine, bodyStart);
		if (start > bodyStart && !isBlank(lines[start]) && /^\s/.test(lines[start])) {
			let i = start;
			while (i > bodyStart && !ITEM_RE.test(lines[i]) && (isBlank(lines[i]) || /^\s/.test(lines[i]))) i--;
			if (ITEM_RE.test(lines[i])) start = i;
		}
		return start;
	}

	// 光标所在行到页尾整段删掉（连同光标所在的分隔线）；一次编辑器事务，⌘Z 能撤回
	deleteRest(editor) {
		const lines = editor.getValue().split("\n");
		const start = this.restStart(lines, editor.getCursor().line);
		if (start >= lines.length || lines.slice(start).every(isBlank)) return new Notice("下面没有可以删的内容");
		const count = lines.slice(start).filter((l) => !isBlank(l)).length;
		const last = lines.length - 1;
		const from = start > 0 ? { line: start - 1, ch: lines[start - 1].length } : { line: 0, ch: 0 };
		editor.transaction({ changes: [{ from, to: { line: last, ch: lines[last].length }, text: "" }] });
		const next = Math.max(0, Math.min(start - 1, editor.lastLine()));
		editor.setCursor({ line: next, ch: editor.getLine(next).length });
		new Notice(`🗑 已删除以下全部：${count} 行（⌘Z 可撤回）`);
	}

	// 整块从这里拿走（一次 ⌘Z 可以撤回原文这边），写进明天的日记：任务进对应分区，其余追加到末尾，行尾记上「← [[来源]]」
	async sendToTomorrow(editor, file) {
		file = file || this.app.workspace.getActiveFile();
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) return new Notice("光标不在列表项里");
		const { start, end, baseIndent } = b;
		const orig = lines.slice(start, end + 1);
		const moved = orig.map((l) => (isBlank(l) ? "" : dedent(l, baseIndent)));
		while (moved.length > 1 && isBlank(moved[moved.length - 1])) moved.pop();
		const to = this.tomorrowOf(file);
		if (file && to.name === file.basename) return new Notice("这里已经是明天的日记了");
		// 已经是搬来的就保留最初的来源，不叠两个记号
		moved[0] = normalizeKeyword(moved[0], false);
		if (!FROM_RE.test(moved[0])) moved[0] = markFrom(moved[0], to.source);
		const path = (to.folder ? to.folder + "/" : "") + to.name + ".md";
		try {
			let target = this.app.vault.getAbstractFileByPath(path);
			if (!target) target = await this.app.vault.create(path, `---\njournal: 每日\njournal-date: ${to.date}\n---\n`);
			await this.app.vault.process(target, (data) => addBlock(data, moved));
		} catch (e) {
			console.error("[done-to-top] 发送到明天失败", path, e);
			return new Notice("写入明天的日记失败，原文没动。详情见控制台");
		}
		// 原文里删掉这一块（编辑器事务，⌘Z 能撤回；明天日记里那份要手动删）
		if (editor.getRange({ line: start, ch: 0 }, { line: end, ch: lines[end].length }) !== orig.join("\n")) {
			return new Notice(`已写进 ${to.name}，但原文在这期间变了，没有删原处，请手动删`);
		}
		const last = editor.lastLine();
		const from = end < last ? { line: start, ch: 0 } : start > 0 ? { line: start - 1, ch: editor.getLine(start - 1).length } : { line: 0, ch: 0 };
		const until = end < last ? { line: end + 1, ch: 0 } : { line: end, ch: lines[end].length };
		editor.transaction({ changes: [{ from, to: until, text: "" }] });
		const next = Math.min(start, editor.lastLine());
		editor.setCursor({ line: next, ch: editor.getLine(next).length });
		const label = orig[0].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").slice(0, 24);
		new Notice(`➡️ 已发送到明天（${to.name}）：${label}${orig.length > 1 ? `（含 ${orig.length - 1} 行子项）` : ""}`);
	}

	// 光标所在的列表项（光标在续行/空行时向上找）连同子项
	blockAt(lines, cursorLine) {
		let start = cursorLine;
		while (start >= 0 && !BULLET_RE.test(lines[start])) start--;
		if (start < 0 || start < topInsertLine(lines) || SEP_RE.test(lines[start])) return null;
		const baseIndent = indentWidth(lines[start]);
		let end = start;
		for (let i = start + 1; i < lines.length; i++) {
			if (isBlank(lines[i]) || indentWidth(lines[i]) > baseIndent) end = i;
			else break;
		}
		while (end > start && isBlank(lines[end])) end--;
		return { start, end, baseIndent };
	}

	run(editor, markAsDone) {
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) {
			new Notice("光标不在无序列表里");
			return;
		}
		const { start, end, baseIndent } = b;

		// （可选）标记 DONE，并把整块提到顶层缩进
		const block = lines.slice(start, end + 1);
		if (markAsDone) block[0] = mark(block[0], "DONE");
		const moved = block.map((l) => (isBlank(l) ? "" : dedent(l, baseIndent)));

		// 一次性替换 [insertAt, end]，保证一次 Cmd+Z 就能撤销
		const insertAt = topInsertLine(lines);
		const between = start > insertAt ? lines.slice(insertAt, start) : [];
		const newText = moved.concat(between).join("\n");
		const from = { line: Math.min(insertAt, start), ch: 0 };
		const to = { line: end, ch: lines[end].length };
		editor.transaction({ changes: [{ from, to, text: newText }] });

		// 光标落到原位置的下一项，方便连续处理
		const next = Math.min(end + 1, editor.lineCount() - 1);
		editor.setCursor({ line: next, ch: editor.getLine(next).length });
	}

	moveTo(editor, zone) {
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) {
			new Notice("光标不在无序列表里");
			return;
		}
		const { start, end, baseIndent } = b;
		const block = lines.slice(start, end + 1);
		block[0] = mark(block[0], zone);
		const moved = block.map((l) => (isBlank(l) ? "" : dedent(l, baseIndent)));
		lines.splice(start, end - start + 1);
		const res = place(lines.join("\n"), moved, zone);
		// 光标落到原位置的下一项，方便连续处理
		const total = res.text.split("\n");
		const next = Math.min(start + (res.line <= start ? res.count : 0), total.length - 1);
		applyText(editor, res.text, { line: next, ch: total[next].length });
	}

	// 把这篇日记里带「明天 / 后天 / 大后天」的块写进那几天的日记，返回写成功的（原文里的删除交给调用方）
	async moveDayItems(file, text) {
		if (!file || !JOURNAL_NAME_RE.test(file.basename)) return [];
		const done = [];
		for (const mv of takeDayItems(text, file.basename)) {
			const path = (file.parent && file.parent.path !== "/" ? file.parent.path + "/" : "") + mv.to.name + ".md";
			try {
				let target = this.app.vault.getAbstractFileByPath(path);
				if (!target) target = await this.app.vault.create(path, `---\njournal: 每日\njournal-date: ${mv.to.date}\n---\n`);
				await this.app.vault.process(target, (data) => addBlock(data, mv.lines));
				done.push(mv);
			} catch (e) {
				console.error("[done-to-top] 搬到", path, "失败", e);
			}
		}
		return done;
	}

	// 搬走了哪些，给提示用：「明天 2 条、后天 1 条」
	movedSummary(moved) {
		const n = { 1: 0, 2: 0, 3: 0 };
		for (const m of moved) n[m.offset]++;
		return ["明天", "后天", "大后天"].map((w, i) => (n[i + 1] ? `${w} ${n[i + 1]} 条` : "")).filter(Boolean).join("、");
	}

	async organize(editor) {
		const file = this.app.workspace.activeEditor?.file ?? this.app.workspace.getActiveFile();
		const moved = await this.moveDayItems(file, editor.getValue());
		const res = organize(moved.length ? dropBlocks(editor.getValue(), moved.map((m) => m.orig)) : editor.getValue());
		const changed = applyText(editor, res.text);
		const c = res.counts;
		const days = moved.length ? `\n搬到以后的日记：${this.movedSummary(moved)}` : "";
		new Notice(changed ? `已整理：DONE ${c.DONE} · DOING ${c.DOING} · TODO ${c.TODO}${days}` : "已经是整理好的样子");
	}

	quadrant(editor, axis) {
		const lines = new Set();
		for (const s of editor.listSelections()) {
			const a = Math.min(s.anchor.line, s.head.line), z = Math.max(s.anchor.line, s.head.line);
			if (a === z) {
				// 光标在续行上时算到它所属的那一项
				let n = a;
				while (n >= 0 && !ITEM_RE.test(editor.getLine(n))) n--;
				if (n >= 0) lines.add(n);
			} else for (let n = a; n <= z; n++) if (ITEM_RE.test(editor.getLine(n))) lines.add(n);
		}
		const changes = [];
		let last = null;
		for (const n of lines) {
			const old = editor.getLine(n);
			if (SEP_RE.test(old.trim())) continue;
			const res = toggleQuadrant(old, axis);
			if (res.line === old) continue;
			changes.push({ from: { line: n, ch: 0 }, to: { line: n, ch: old.length }, text: res.line });
			last = res.key;
		}
		if (!changes.length) {
			new Notice("光标不在列表项上");
			return;
		}
		editor.transaction({ changes });
		new Notice(QUAD_LABEL[last]);
	}
};
module.exports.core = core;
