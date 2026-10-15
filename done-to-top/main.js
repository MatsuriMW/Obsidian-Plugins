// 任务归位：按状态把顶格任务块放进各自的分区
//   分区顺序：DONE（最上面）→ DOING（中间）→ TODO（DOING 下面）→ 没状态的（最下面，原样不动），分区之间用「- ---」隔开；
//     日记是固定三区：后面还有内容时，空着的区也留着它的分隔线，TODO 区永远在第二条「- ---」下面（新日记的模板就是两条分隔线）
//   · 只看顶格条目的状态；子项的状态不参与分类，整块跟着母项走
//   · 块内部也一样：块里自己用「- ---」分了栏的，子项按状态在块内排成 DONE → DOING → TODO → 没状态的，
//     只在块内部排，不会跑到别的块里、也不会被提到文件级；块里没用分割线的不动
//   · 闪卡：已经做成卡的块（首行打了 #card，或者首行有 ==挖空== 而且闪卡插件已经写了 ^q-xxxx 标识符）一律归 DONE 区，
//     不管它首行写的是什么状态；块里用分割线分了栏的子块也一样
//   · 链接区：孤零零的一个条目（没有母块、也没有子块）、不超过两行、里面又有这些平台的链接
//     （小红书 / 知乎 / X / GitHub / B 站 b23 / 抖音）就算链接类，聚到一起放在 TODO 区下面、其它内容上面。
//     有任务关键字的（TODO / DOING / DONE / SUSPENDED / FAILED / CANCELLED…）一律算任务，优先级更高
//   · DONE 栏 = 正文第一条「- ---」之前的那一段；手动放进去的普通条目留在栏里不动
//   · 关键字和复选框都认：DONE/[x]、DOING/NOW/[/]、TODO/LATER/[ ]；CANCELED/FAILED/SUSPENDED 归 DONE 区，PAUSED（停一下）归 DOING 区，WAITING 归 TODO 区
//   · core 挂在插件实例上，Telegram Inbox（自用版）收消息时也用它归位
//   · 单独占一行的块 ID（闪卡插件写在卡片下面一行、顶格的「^q-r7d4」这类）算在它上面那一块里：
//     移到顶部、归位、一键整理、发送到今天 / 明天时都跟着块一起走，不会落在原地
//   · 一键整理时，顶格条目带「明天 / 后天 / 大后天」的，整块搬到那一天的日记，行尾记上「← [[来源日记]]」
//     （带这个记号的不会再被搬；DONE 和 DONE 栏里的不搬）。⌥Space 快速记录（nautilus-cli.js）用同一份规则
//   · 发送：光标所在块（连同子项）可以发到几个去向（命令「发送这一块到…」列出全部，每个去向也各有一条命令）：
//     页面顶部、明天的日记、Claude CLI（开一个会话，这一块当第一句话；选中几块并列的就每块各开一个；
//     「Claude CLI 并发」是母块当背景、每个子块一个会话；会话可以跑在终端窗口、后台的 tmux、或者无头的 claude -p 里）、Claudian 的 Inline edit（选中整块再叫它）、
//     MD Flow（写进中转笔记、选一个模板、打开排版面板）、macOS 日历、提醒事项、AI 解释。后面这些只在桌面端有
//     AI 解释：这一块（连同子块）交给 claude -p 讲讲是什么意思、里面的英文词和术语各指什么，答案记成这一块下面的一个「💡」子块；
//     再发一次是把那个子块换成新的（不会越攒越多）。等答案的时候先放一行「💡 解释中…」占位
//     日历 / 提醒事项的时间：任务下面一行的「SCHEDULED: <2026-10-14 Wed 19:30>」「DEADLINE: <…>」和行里的「⏳ / 📅 2026-10-14」定哪天，
//     没写就看「明天 / 后天 / 大后天」，再没有就是这篇日记的那一天；时刻认 14:00、14:00-15:30、8pm、8:00pm、7am-9am、下午3点、晚上8点半、下午3点到5点，有时刻的就不是全天
//   · 音效：发出去的那一下响一声，用的是螺旋日程那套任务状态的音（开关也跟它走，没装就不响）。
//     页面顶部、今天 / 明天的日记、日历、提醒事项是 DONE 那一声；交给 Claude CLI、Claudian、MD Flow 去做的是 DOING 那一声
//   · 优先级（Logseq 写法）：「TODO [#A] 核心任务」「TODO [#B] 重要任务」「TODO [#C] 次要任务」。
//     简写「todoa」「todo a」「doing b」整理时改成标准写法（螺旋日程计时用的时刻排在前面：DOING 14:05 [#A] …）。
//     DOING / TODO 区里按 A → B → C → 没写优先级的排，同一级里同一个关键字的挨在一起（DOING 在 PAUSED 前、TODO 在 WAITING 前）；
//     DONE 区不看优先级，只按关键字聚类：DONE → SUSPENDED → FAILED → CANCELLED。块内部用分割线分了栏的也照此排
//     （切换「重要 / 紧急」在 TODOseq 里：A = 重要且紧急、B = 紧急不重要、C = 重要不紧急）
//   · 信息增量：顶格只写「- [[信息增量]]」的那一块没有状态，归 TODO 区，排在 TODO 区最后；一篇里有好几块的并成一块。
//     core.appendInfo(text, [文字…]) 往它下面追加子块，还没有就在 TODO 区最后建一个（AI 记信息增量用）
//   · 快速跳转：⌃1 DOING 区、⌃2 TODO 区、⌃3 结尾、⌃0 DONE 栏（DONE 栏藏着的话先关掉隐藏）
//   · 列表项不分有序无序：「1. 」「1) 」开头的和「- 」开头的一样移动、归位、改状态、发送（序号原样带走，不重排）
const { Plugin, Notice, PluginSettingTab, Setting, FuzzySuggestModal, Platform } = require("obsidian");

const DEFAULTS = {
	claudeCommand: "claude",        // 发给 Claude CLI 时在终端里运行的命令
	claudeCwd: "",                  // 在哪个目录里运行；空 = 这个库的根目录
	claudeMarkDoing: true,          // 发出去以后，TODO 的那一行改成 DOING（螺旋日程的进度条就会开始监听这个会话）
	claudeLink: true,               // 发出去时给会话定好会话号、起好名字，并在这一行下面记一行「🔗」（螺旋日程靠它把这一行和会话绑死）
	claudeMaxParallel: 6,           // 选中几块并列的一起发时，一次最多开几个会话（多了不发，免得误选一大片）
	slashOnly: false,               // 斜杠命令（Obsidian 自带的「/」）只留名字里带下面这个词的命令，别的不出现
	slashKeyword: "块",             // 名字里（连同前面的插件名）带这个词的命令才留下
	claudeRun: "terminal",          // 会话跑在哪儿：terminal = macOS「终端」的窗口；tmux = 后台的 tmux 会话（不弹窗口）；headless = claude -p（没有窗口，答完一轮就退出）
	claudeTmuxSession: "agents",    // 跑在 tmux 里时用哪个 tmux 会话（没有就建）。想看：tmux attach -t agents
	claudeHeadlessArgs: "",         // 无头跑的时候多带的参数，比如 --permission-mode acceptEdits（不给权限它只能读、不能改）
	calendar: "",                   // 发到哪个日历；空 = 第一个能写的日历
	remindersList: "",              // 发到提醒事项的哪个列表；空 = 默认列表
	mdflowNote: "MD Flow/块.md",    // 发到 MD Flow 时，这一块先写进这篇中转笔记（每次覆盖）
	explainModel: "claude-haiku-5-5",   // 「AI 解释」用哪个模型（claude 命令行的 --model）。写全名，别名会跟着版本变
	hideDone: true,                 // 日记里的 DONE 栏（连同下面那条「- ---」）在编辑器里整段藏起来
};

const BULLET_RE = /^(\s*)([-*+]|\d+[.)])(\s+|$)(.*)$/;   // 列表项：无序（- * +）和有序（1. 1)）一样对待
const ITEM_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/;
const SEP_RE = /^[-*+]\s+-{3,}\s*$/;                 // 分割线只认「- ---」（*** ___ 不算）
const SEP = "- ---";
const KEYWORD_RE = /^(TODO|DOING|LATER|NOW|PAUSED|WAITING|WAIT|IN-PROGRESS|SUSPENDED|CANCELED|CANCELLED|FAILED|DONE)(\s+|$)/;
const CHECKBOX_RE = /^\[[^\]]\](\s+|$)/;
const STAMP_RE = /^\*\*\d{1,2}[:：]\d{2}\*\*\s*/;          // 前面的 **07:37** 记录点
const LEADING_TIME_RE = /^\d{1,2}(?:[:：]\d{2}|点)/;
const TIME_OR_RANGE_RE = /^\d{1,2}[:：]\d{2}(?:\s*[-–~～]\s*\d{1,2}[:：]\d{2})?\s*/;
const SINGLE_TIME_RE = /^(\d{1,2}[:：]\d{2})(?!\s*[-–~～]\s*\d)\s*/;
const LOWER_KW_RE = /^(todo|doing|done)(?=[\s:：]|$)[:：]?\s*/i;   // todo / Todo / todo： → TODO
// 优先级：[#A] / [#B] / [#C]（Logseq 写法）
const PRIO_RE = /\[#([ABC])\]/;
const PRIO_HEAD_RE = /^\[#([ABC])\]\s*/;
const PRIO_RANK = { A: 0, B: 1, C: 2 };          // 没写的排在 C 后面（3）
const SHORT_KW_RE = /^(TODO|DOING|LATER|NOW|PAUSED|WAITING|WAIT|IN-PROGRESS|SUSPENDED|CANCELLED|CANCELED|FAILED|DONE)/i;
// 优先级的简写：关键字后面紧跟 a / b / c（todoa 写稿），或者隔空格（todo a 写稿、doing b）。
// 隔空格的，a / b / c 后面要么没字了、要么紧跟中文、要么空格后面不是英文字母（todo a book 是英文句子，不算）
function prioShort(s) {
	const k = SHORT_KW_RE.exec(s);
	if (!k) return null;
	const r = s.slice(k[0].length);
	const m = /^([abcABC])(?=$|[\s:：]|[^\x00-\x7f])/.exec(r) || /^[ \t]+([abcABC])(?=$|[^\x00-\x7f]|[ \t]+(?![ \tA-Za-z]))/.exec(r);
	if (!m) return null;
	return { kw: k[1].toUpperCase(), prio: m[1].toUpperCase(), rest: r.slice(m[0].length).replace(/^[\s:：]+/, "") };
}
function hasPrioShort(line) {
	const m = line.match(ITEM_RE);
	return !!(m && prioShort(m[2].replace(STAMP_RE, "")));
}
// 优先级标记放在关键字（和紧跟着的时刻）后面：TODO [#A] 写稿、DOING 14:05 [#A] 写稿。
// 螺旋日程靠「关键字后面紧跟的时刻」计时，所以时刻在前
function joinPrio(prio, rest) {
	if (!prio) return rest;
	const t = rest.match(TIME_OR_RANGE_RE);
	if (!t) return `[#${prio}]${rest ? " " + rest : ""}`;
	const after = rest.slice(t[0].length);
	return `${t[0].trimEnd()} [#${prio}]${after ? " " + after : ""}`;
}
const ZONE = {
	DONE: "DONE", CANCELED: "DONE", CANCELLED: "DONE", FAILED: "DONE", SUSPENDED: "DONE",
	DOING: "DOING", NOW: "DOING", "IN-PROGRESS": "DOING", PAUSED: "DOING",
	TODO: "TODO", LATER: "TODO", WAITING: "TODO", WAIT: "TODO",
};
// 常驻 TODO 区的母块：顶格只写「- [[信息增量]]」的那一块没有状态，归 TODO 区，排在 TODO 区最后。
// AI 往它下面追加子块，它在哪儿都一样追加；一篇里有好几块的，整理时并成一块
const INFO_PIN_RE = /^[-*+][ \t]+\[\[信息增量\]\][ \t]*$/;
const TAB_WIDTH = 4;
// 单独占一行的块 ID：闪卡插件（flashcards-obsidian）把卡片的标识符写在卡片最后一行的下一行、顶格，比如「^q-r7d4」。
// 它没有缩进，但属于上面那一块，切块时不能把它当成新的一块
const ID_LINE_RE = /^[ \t]*\^[A-Za-z0-9-]+[ \t]*$/;
const CARD_TAG_RE = /(?:^|\s)#card(?![\w/-])/;           // 多行卡片：这一项连同子项是一张卡，ID 写在整块后面
// 机器记在任务下面的记号行：🔗 绑定的会话、⏱ 实际时段、💬 会话最后说的话（螺旋日程写的）。它们不是内容：不当成一块发出去，也不带进发给 Agent 的话里
const MARK_LINE_RE = /^\s*[-*+]\s+(?:🔗|⏱|💬)/;

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

// todo / Doing / done： 这类写法统一成大写关键字；优先级的简写（todoa / todo a / doing b）改成「TODO [#A]」；
// DOING 没写时间的话（withTime）补上开始时间
function normalizeKeyword(line, withTime) {
	const m = line.match(ITEM_RE);
	if (!m) return line;
	let rest = m[2], stamp = "";
	const st = rest.match(STAMP_RE);
	if (st) { stamp = st[0]; rest = rest.slice(st[0].length); }
	let kw, prio = null, body;
	const ps = prioShort(rest);
	if (ps) { kw = ps.kw; prio = ps.prio; body = ps.rest; }
	else {
		const k = rest.match(LOWER_KW_RE);
		if (!k) return line;
		kw = k[1].toUpperCase();
		body = rest.slice(k[0].length);
	}
	if (kw === "DOING" && withTime && !LEADING_TIME_RE.test(body)) body = body ? `${nowHM()} ${body}` : nowHM();
	body = joinPrio(prio, body);
	return `${m[1]}${stamp}${kw}${body ? " " + body : ""}`;
}

// 这一块在本区里排第几类：DOING / TODO 区先按优先级（A → B → C → 没写），同一级里同一个关键字的挨在一起；
// DONE 区不看优先级，只按关键字聚类（DONE 和手动放进来的、闪卡在前，然后 SUSPENDED → FAILED → CANCELLED）
const KW_CLUSTER = {
	DONE: { SUSPENDED: 1, FAILED: 2, CANCELLED: 3, CANCELED: 3 },
	DOING: { PAUSED: 1 },
	TODO: { WAITING: 1, WAIT: 1 },
};
function rankIn(zone, line) {
	let rest = line.replace(/^[ \t]*(?:[-*+]|\d+[.)])\s+/, "").replace(STAMP_RE, "");
	let kw = null;
	const cb = rest.match(/^\[(.)\](\s+|$)/);
	if (cb) kw = cb[1] === "-" ? "CANCELLED" : null;
	else { const k = rest.match(KEYWORD_RE); kw = k ? k[1] : null; }
	const cluster = (kw && KW_CLUSTER[zone] && KW_CLUSTER[zone][kw]) || 0;
	if (zone === "DONE") return cluster;
	const p = line.match(PRIO_RE);
	return (p ? PRIO_RANK[p[1]] : 3) * 10 + cluster;
}
// 稳定排序：同一类里保持原来的先后。「- [[信息增量]]」排在 TODO 区最后
function sortZone(zone, items) {
	return items.map((ls, i) => ({ ls, i, k: INFO_PIN_RE.test(ls[0]) ? 1e3 : rankIn(zone, ls[0]) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.ls);
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
		const startsNew = !inFence && !isBlank(line) && !/^\s/.test(line) && !ID_LINE_RE.test(line);   // 块 ID 那一行跟着上一块
		if (startsNew || !blocks.length) {
			const sep = SEP_RE.test(line), pin = INFO_PIN_RE.test(line);
			blocks.push({ lines: [line], start: i, sep, pin, zone: sep ? null : pin ? "TODO" : zoneOf(line) });
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

// ---------- 链接类条目 ----------
// 单个条目不超过两行，里面有这些平台的链接，就是链接类：小红书 / 知乎 / X / GitHub / B 站（b23）/ 抖音。
// 要加平台就往 LINK_HOSTS 里加。有状态的（TODO / DONE…）是任务，不算链接
const LINK_HOSTS = ["xiaohongshu.com", "xhslink.com", "xhslink.cn", "zhihu.com", "github.com", "bilibili.com", "b23.tv", "douyin.com", "x.com", "twitter.com"];
const LINK_URL_RE = new RegExp("(?:^|[\\s(（【「]|https?://)(?:www\\.)?(?:[\\w-]+\\.)*(" + LINK_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|") + ")(?=[\\s/)?#.,，。、\\]】」]|$)", "i");

// 这一块是不是已经做成了闪卡：首行打了 #card（含 #card/子标签），或者首行有 ==挖空== 而且闪卡插件已经给它写了标识符（^q-xxxx）。
// 只看这一块自己的首行：母块下面有几张子卡，母块本身不算卡
const CARD_ANY_RE = /(?:^|\s)#card(?=$|[\s/])/;
const CARD_ID_RE = /^[ \t]*\^q-[A-Za-z0-9]+[ \t]*$/;
const CLOZE_RE = /==[^=\n]+==/;
function isCardBlock(lines) {
	const first = (lines && lines[0]) || "";
	if (CARD_ANY_RE.test(first)) return true;
	return CLOZE_RE.test(first) && lines.some((l) => CARD_ID_RE.test(l));
}

// 这一行是不是任务：开头有 TODO / DOING / DONE / SUSPENDED / FAILED / CANCELLED…（大小写都算）或者复选框
function isTaskLine(line) {
	const bare = line.replace(/^[ \t]+/, "");
	return !!zoneOf(normalizeKeyword(bare, false));
}

const ITEM_LINE_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]/;          // 这一行是列表项（= 一个块）

// lines = 一整个顶格条目（首行 + 跟着的行）。下面四条都满足才是链接类：
//   ① 是单个条目：没有母块（自己顶格）、也没有子块（下面没有列表项）
//   ② 不超过两行（多出来只能是续行，不能是子块）
//   ③ 里面有平台链接
//   ④ 不是任务：没有 TODO / DOING / DONE / SUSPENDED / FAILED / CANCELLED… 也没有复选框
function isLinkBlock(lines) {
	const ls = trimBlock(lines).filter((l, i) => i === 0 || !ID_LINE_RE.test(l));   // 块 ID 那一行不算
	if (ls.length > 2) return false;
	if (/^[ \t]/.test(ls[0])) return false;                   // 有母块（不是顶格条目）
	if (ls.length > 1 && ls.slice(1).some((l) => ITEM_LINE_RE.test(l))) return false;   // 带子块
	if (isTaskLine(ls[0])) return false;                      // 任务关键字优先
	const m = ls[0].match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
	if (!m) return false;
	return LINK_URL_RE.test(ls.join("\n"));
}

// ---------- 块内部的分区 ----------
// 块里也用「- ---」把子项分成 DONE → DOING → TODO 三栏（和文件级同一套规则），只在这一块内部排：
// 子项不会跑到别的块里，也不会被提到文件级。块里没有分割线的不动（只往更深的层递归），
// 子项里有不是列表项的（续行、段落）或带代码块的也不动，免得把说明文字挪走。深的先排，一层层往上
const ANY_SEP_RE = /^[ \t]*(?:[-*+][ \t]+)?-{3,}\s*$/;   // 块内部的：「\t- ---」或「\t---」
const CHILD_ITEM_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]/;
const FENCE_RE = /^[ \t]*(?:```|~~~)/;

// 子项属于哪个分区（zoneOf 只认顶格，这里先去掉缩进）
const itemZone = (line) => zoneOf(line.replace(/^[ \t]+/, ""));

function trimTail(lines) {
	const out = lines.slice();
	while (out.length > 1 && isBlank(out[out.length - 1])) out.pop();
	return out;
}

// lines[0] 是这一块自己那一行，其余是它的子项（子项还可以有自己的子项）。返回排好的行
function organizeInner(lines) {
	if (lines.length < 2) return lines;
	let w1 = -1;                                     // 子项那一层的缩进 = 里面最浅的一行
	for (let i = 1; i < lines.length; i++) {
		const l = lines[i];
		if (FENCE_RE.test(l)) return lines;          // 带代码块的不动
		if (isBlank(l) || ID_LINE_RE.test(l)) continue;   // 块 ID 那一行顶格，不算缩进层级
		const w = indentWidth(l);
		if (w1 < 0 || w < w1) w1 = w;
	}
	if (w1 < 0) return lines;
	const lead = [], groups = [];                    // lead：块首行后面、第一个子项之前的空行
	for (let i = 1; i < lines.length; i++) {
		const l = lines[i];
		// 空行、块 ID 那一行跟着上面的子项走
		if (isBlank(l) || ID_LINE_RE.test(l)) { (groups.length ? groups[groups.length - 1] : lead).push(l); continue; }
		if (indentWidth(l) === w1) groups.push([l]);
		else if (groups.length) groups[groups.length - 1].push(l);
	}
	if (!groups.length) return [lines[0], ...lead];
	const kids = groups.map((g) => ({ lines: organizeInner(g), sep: g.length === 1 && ANY_SEP_RE.test(g[0]) }));
	const plain = [lines[0], ...lead, ...kids.flatMap((k) => k.lines)];
	if (!kids.some((k) => k.sep)) return plain;      // 没用分割线：不排
	if (!kids.every((k) => k.sep || CHILD_ITEM_RE.test(k.lines[0]))) return plain;

	const zones = { DONE: [], DOING: [], TODO: [] }, rest = [];
	let before = true;
	for (const k of kids) {
		if (k.sep) { before = false; continue; }
		let ls = k.lines;
		const fixed = normalizeKeyword(ls[0], false);
		if (fixed !== ls[0]) { ls = ls.slice(); ls[0] = fixed; }
		const z = isCardBlock(ls) ? "DONE" : itemZone(ls[0]);   // 做成了闪卡的子块归 DONE 栏
		if (z) zones[z].push(trimTail(ls));
		else if (before) zones.DONE.push(trimTail(ls));   // 第一条分割线之前的普通子项留在最上面
		else rest.push(trimTail(ls));
	}
	// 分割线跟子项同一层缩进，写法跟着块里原来那条（有就照抄它的缩进）
	const sepLine = (kids.find((k) => k.sep) || kids[0]).lines[0];
	const sep = (sepLine.match(/^[ \t]*/) || [""])[0] + SEP;
	const out = [lines[0], ...lead];
	// 这一块没有 DONE 栏、下面又有 DOING / TODO 时，先留一条分割线占住 DONE 栏的位置
	const emptyDone = !zones.DONE.length && (zones.DOING.length || zones.TODO.length);
	let started = false;
	const add = (ls) => { if (!ls.length) return; if (started || emptyDone) out.push(sep); out.push(...ls); started = true; };
	for (const z of ["DONE", "DOING", "TODO"]) add(sortZone(z, zones[z]).flat());
	add(rest.flat());
	return out;
}

// DONE 栏 = 正文第一段（第一条「- ---」之前），里面有没有 DONE 都算；栏是空的 = 正文以「- ---」开头。
// 用户会把读完、理解完的普通条目也手动放进这一栏，所以栏里没状态的块算它的成员，原地不动。
// 返回第一条分隔线的下标（= 这一栏的块数）；没有分隔线（还没有栏）时返回 -1
function doneZoneEnd(blocks) {
	return blocks.findIndex((b) => b.sep);
}

// 一键整理：DONE 栏 → DOING → TODO → 链接 → 其余（原顺序、原样），区之间「- ---」
function organize(text) {
	const { head, blocks, tail } = parse(text);
	const zones = { DONE: [], DOING: [], TODO: [] };
	const links = [], rest = [];
	let pin = null;   // 「- [[信息增量]]」那一块（TODO 区里）
	const keep = doneZoneEnd(blocks);
	blocks.forEach((b, i) => { b.inDone = i < keep; });
	let inner = 0;
	// 链接区只在已经分区的文件（日记那种：有状态块或分割线）里排；
	// 一篇没分区的普通笔记不去动它，免得平白插进去几条分割线
	const zoned = blocks.some((b) => (b.zone && !b.pin) || b.sep);
	if (!zoned) for (const b of blocks) if (b.pin) { b.pin = false; b.zone = null; }   // 没分区的笔记：「- [[信息增量]]」也原样不动
	for (const b of blocks) {
		if (!b.sep && (!b.zone || hasPrioShort(b.lines[0]))) {
			// 小写关键字、优先级简写（todo a / TODO a）先规范，再重新判断
			const fixed = normalizeKeyword(b.lines[0], false);
			if (fixed !== b.lines[0]) { b.lines[0] = fixed; b.zone = zoneOf(fixed); }
		}
		// 块内部：子项按状态在块里分成 DONE / DOING / TODO（只在块里排，不影响这一块自己在哪一区）
		if (b.lines.length > 1) {
			const fixedKids = organizeInner(b.lines);
			if (fixedKids.join("\n") !== b.lines.join("\n")) { b.lines = fixedKids; inner++; }
		}
		if (!b.sep && isCardBlock(b.lines)) b.zone = "DONE";   // 做成了闪卡的块归 DONE 区，不管首行写的是什么状态
		if (b.pin && pin) pin.push(...trimBlock(b.lines).slice(1));   // 第二块「- [[信息增量]]」：子块并进第一块
		else if (b.pin) zones.TODO.push((pin = trimBlock(b.lines)));
		else if (b.zone) zones[b.zone].push(trimBlock(b.lines));
		else if (b.inDone) zones.DONE.push(trimBlock(b.lines));   // 手动放进 DONE 栏的普通条目留在栏里
		else if (b.sep) { if (rest.length && !rest[rest.length - 1].sep) rest.push(b); }   // 开头的、连着的分隔线不要
		else if (zoned && isLinkBlock(b.lines)) links.push(trimBlock(b.lines));   // 链接类：归到链接区
		else rest.push(b);
	}
	if (rest.length && rest[rest.length - 1].sep) rest.pop();
	const out = [];
	const extra = [links.flat(), rest.flatMap((b) => b.lines)].filter((ls) => ls.length);   // 链接区：任务区（TODO）下面、其它内容上面
	if (zoned) {
		// 日记的固定三区：DONE 栏 | DOING 区 | TODO 区（信息增量在它最后），后面还有内容的话，空着的区也留着它那条分隔线，
		// 所以 TODO 区永远在第二条「- ---」下面（模板 Templates/日记.md 就是这两条分隔线）
		const slots = ["DONE", "DOING", "TODO"].map((z) => sortZone(z, zones[z]).flat());
		slots.forEach((ls, k) => {
			out.push(...ls);
			if (slots.slice(k + 1).some((x) => x.length) || extra.length) out.push(SEP);
		});
	}
	extra.forEach((ls, i) => { if (i) out.push(SEP); out.push(...ls); });
	const counts = { DONE: blocks.filter((b) => b.zone === "DONE").length, DOING: zones.DOING.length, TODO: zones.TODO.length - (pin ? 1 : 0), LINK: links.length, inner };
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
		// 新的 TODO 放在「- [[信息增量]]」前面，它留在 TODO 区最后；TODO 区里只有它的话就插在它前面
		const pinAt = blocks.findIndex((x, i) => i >= from && i < headEnd && x.pin);
		let inTodo = false;   // 找到的位置已经在 TODO 区里（挨着别的 TODO 或信息增量）
		for (const z of zone === "DOING" ? ["DOING"] : ["TODO", "DOING"]) {
			for (let i = headEnd - 1; i >= from; i--) if (blocks[i].zone === z && !blocks[i].pin) { idx = i + 1; break; }
			if (idx < 0 && z === "TODO" && pinAt >= 0) idx = pinAt;
			if (idx >= 0) { inTodo = z === "TODO"; break; }
		}
		if (idx < 0) idx = hasZone ? doneEnd + 1 : 0;   // 紧跟 DONE 栏的分隔线
		// TODO 区里还没东西：越过 DOING 区后面那条分隔线（DOING 区空着时就是紧挨着的第二条），落进 TODO 区
		if (zone === "TODO" && !inTodo && blocks[idx] && blocks[idx].sep) idx++;
		const prev = blocks[idx - 1], next = blocks[idx];
		if (!hasZone && idx === 0) ins.unshift(...(zone === "TODO" ? [SEP, SEP] : [SEP]));   // 还没有栏：先留出空的 DONE 栏（TODO 连空的 DOING 区也留出来）
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
	if (hasPrioShort(line)) line = normalizeKeyword(line, false);   // 简写（todo a）先改成「TODO [#A]」
	const m = line.match(BULLET_RE);
	let content = m[4];
	let stamp = "";
	const st = content.match(STAMP_RE);
	if (st) { stamp = st[0]; content = content.slice(st[0].length); }
	const kw = content.match(KEYWORD_RE);
	const low = kw ? null : content.match(LOWER_KW_RE);   // todo / Doing 这类小写写法
	const old = kw ? kw[1] : low ? low[1].toUpperCase() : null;
	// SUSPENDED 整理时归 DONE 区，但手动标成 DONE 时要真的改成 DONE
	if (kw && ZONE[old] === zone && old !== "SUSPENDED") {
		// 已经是这个状态，只挪位置；DOING 没记开始时间的补上
		const body0 = content.slice(kw[0].length);
		const pb = body0.match(PRIO_HEAD_RE);
		const body = pb ? body0.slice(pb[0].length) : body0;
		if (old !== "DOING" || LEADING_TIME_RE.test(body)) return line;
		return `${m[1]}${m[2]} ${stamp}DOING ${joinPrio(pb && pb[1], body ? `${nowHM()} ${body}` : nowHM())}`;
	}
	content = content.replace(CHECKBOX_RE, "");
	content = low ? content.slice(low[0].length) : content.replace(KEYWORD_RE, "");
	// 优先级先拿出来（在时刻前后都认），状态改完再按「时刻在前、优先级在后」放回去
	let prio = null;
	{
		const t = content.match(TIME_OR_RANGE_RE);
		const off = t ? t[0].length : 0;
		const p = content.slice(off).match(PRIO_HEAD_RE);
		if (p) { prio = p[1]; content = content.slice(0, off) + content.slice(off + p[0].length); }
	}
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
	if (prio) content = joinPrio(prio, content.trimEnd());
	return `${m[1]}${m[2]} ${stamp}${zone}${content ? " " + content : ""}`;
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
	const zone = zoneOf(lines[0]) || (INFO_PIN_RE.test(lines[0]) ? "TODO" : null);
	if (zone) return place(text, lines, zone).text;
	return text.replace(/\s*$/, "\n") + lines.join("\n") + "\n";
}

// 往「- [[信息增量]]」下面追加子块（items 是一条条的文字，不带「- 」）：接在那一块最后一个子块后面，块在哪儿都一样；
// 还没有这一块就在 TODO 区最后建一个。AI 记信息增量时用：app.plugins.plugins["done-to-top"].core.appendInfo
function appendInfo(text, items) {
	const kids = items.map((s) => String(s).replace(/[\r\n]+/g, " ").trim()).filter(Boolean).map((s) => "\t- " + s);
	if (!kids.length) return text;
	const { head, blocks, tail } = parse(text);
	const b = blocks.find((x) => x.pin);
	if (!b) return addBlock(text, ["- [[信息增量]]", ...kids]);
	const ls = trimBlock(b.lines);
	b.lines = [...ls, ...kids, ...b.lines.slice(ls.length)];
	return head.concat(blocks.flatMap((x) => x.lines), tail).join("\n");
}

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

// 同上，但拆成好几处小改动（按行求最长公共子序列）：只动真的变了的那几行。
// 一整段替换会把中间折叠着的块全部展开、页面跟着跳；拆开以后没动的行连折叠带位置都不变。
// 太大（两边变动的行数相乘超过四百万）就退回一整段替换
function diffChanges(oldText, newText) {
	const a = oldText.split("\n"), b = newText.split("\n");
	let s = 0;
	while (s < a.length && s < b.length && a[s] === b[s]) s++;
	if (s === a.length && s === b.length) return [];
	let ea = a.length - 1, eb = b.length - 1;
	while (ea >= s && eb >= s && a[ea] === b[eb]) { ea--; eb--; }
	const n = ea - s + 1, m = eb - s + 1;
	const whole = () => { const c = diffChange(oldText, newText); return c ? [c] : []; };
	if (n === 0 || m === 0 || n * m > 4e6) return whole();
	const W = m + 1, t = new Uint32Array((n + 1) * W);
	for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
		t[i * W + j] = a[s + i] === b[s + j] ? t[(i + 1) * W + j + 1] + 1 : Math.max(t[(i + 1) * W + j], t[i * W + j + 1]);
	}
	// 一段段「旧的第 i0…i1 行换成新的第 j0…j1 行」（都是左闭右开）
	const hunks = [];
	let i = 0, j = 0, cur = null;
	const open = () => (cur ||= { i0: s + i, i1: s + i, j0: s + j, j1: s + j });
	const close = () => { if (cur) { hunks.push(cur); cur = null; } };
	while (i < n || j < m) {
		if (i < n && j < m && a[s + i] === b[s + j]) { close(); i++; j++; }
		else if (j < m && (i === n || t[i * W + j + 1] >= t[(i + 1) * W + j])) { open().j1 = s + ++j; }
		else { open().i1 = s + ++i; }
	}
	close();
	const out = [];
	for (const h of hunks) {
		const text = b.slice(h.j0, h.j1).join("\n");
		if (h.i1 < a.length) {
			// 后面还有旧行：整行整行地换，换行符跟着新的那几行走
			out.push({ from: { line: h.i0, ch: 0 }, to: { line: h.i1, ch: 0 }, text: h.j1 > h.j0 ? text + "\n" : "" });
		} else if (h.i0 < a.length && h.j1 > h.j0) {
			out.push({ from: { line: h.i0, ch: 0 }, to: { line: a.length - 1, ch: a[a.length - 1].length }, text });
		} else if (h.i0 < a.length) {
			// 删到文末：连同前面那个换行
			if (h.i0 === 0) return whole();
			out.push({ from: { line: h.i0 - 1, ch: a[h.i0 - 1].length }, to: { line: a.length - 1, ch: a[a.length - 1].length }, text: "" });
		} else {
			out.push({ from: { line: a.length - 1, ch: a[a.length - 1].length }, to: { line: a.length - 1, ch: a[a.length - 1].length }, text: "\n" + text });
		}
	}
	return out;
}

function applyText(editor, newText, cursor) {
	const changes = diffChanges(editor.getValue(), newText);
	if (!changes.length) return false;
	const tx = { changes };
	if (cursor) tx.selection = { from: cursor };
	editor.transaction(tx);
	return true;
}

const core = { plainText, whenOf, timeIn, planOf, calendarScript, remindersScript, mdflowText, parse, organize, organizeInner, isLinkBlock, place, mark, zoneOf, normalizeKeyword, prioShort, joinPrio, sortZone, diffChange, diffChanges, SEP, dayWordOffset, markFrom, journalAfter, takeDayItems, dropBlocks, addBlock, appendInfo };

// ---------- 发送去向 ----------
const execFile = (cmd, args, timeout = 30000, env = undefined) => new Promise((ok) => {
	try { require("child_process").execFile(cmd, args, { timeout, env }, (err, out, errOut) => ok({ ok: !err, out: String(out || "").trim(), err: String(errOut || (err && err.message) || "").trim() })); }
	catch (e) { ok({ ok: false, out: "", err: String(e) }); }
});
const shq = (x) => `'${String(x).replace(/'/g, `'\\''`)}'`;                 // 给 shell 的单引号串
const asStr = (x) => `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;   // 给 AppleScript 的字符串

// 一块里要发给 Agent 的子项：记号行（🔗 / ⏱ / 💬）不发过去
const contentOf = (g) => g.kids.filter((l) => !MARK_LINE_RE.test(l));
// AI 解释写回来的那个子块：以 💡 开头。它是内容（会跟着块走、也会带进发给 Claude 的话里），只是再解释一次时不把上一次的答案发回去
const EXPLAIN_RE = /^\s*[-*+]\s+💡/;
const EXPLAIN_WAIT = "💡 解释中…";
const EXPLAIN_TIMEOUT = 120;
const EXPLAIN_SYSTEM = "你是一个讲解助手：把别人笔记里的一段话讲明白。只输出讲解本身，不寒暄，不反问，不用 Markdown 标题和代码块。";
const explainPrompt = (text) => `下面是我笔记里的一块（第一行是这一块，后面的是它的子块）。请用中文讲清楚它是什么意思。

输出格式（只输出下面这些行）：
第 1 行：用一两句大白话直接说出它的意思和作者想下的判断。不要用「这一块」「这段话」「作者」开头。
之后每行一条，一条只占一行，不要再分层：
· 里面出现的每个英文词、缩写、专业术语各占一行，写成「**原词**（中文叫法）：它本来是什么意思；在这句话里指什么」。
· 有没说出口的前提、推理的链条或者言下之意，再用一两行补上，以「背景：」「言下之意：」开头。
没有术语就只写第 1 行和必要的补充。总共不超过 8 行。拿不准的词直接说拿不准，不要编。

这一块：
<<<
${text}
>>>`;
// 模型的答案 → 一个 💡 子块：第一行是这一块的意思，后面每行一个子项。indent = 💡 那一行的缩进
function explainLines(result, indent) {
	const ls = String(result || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter((l) => l && !/^(```|~~~|<<<|>>>)/.test(l))
		.map((l) => l.replace(/^#{1,6}\s+/, "").replace(/^(?:[-*+]\s+|[·•]\s*|\d+[.)、]\s+)/, "").replace(/^💡\s*/, "").trim()).filter(Boolean);
	if (!ls.length) return [];
	return [`${indent}- 💡 ${ls[0]}`, ...ls.slice(1).map((l) => `${indent}\t- ${l}`)];
}
// 一块下面那个 💡 子块（直接子项，连同它的子项）占哪几行：[第一行, 最后一行]；没有返回 null。b = blockAt 的结果
function explainSpan(lines, b) {
	let w = Infinity;
	for (let i = b.start + 1; i <= b.end; i++) if (BULLET_RE.test(lines[i])) w = Math.min(w, indentWidth(lines[i]));
	for (let i = b.start + 1; i <= b.end; i++) {
		if (!EXPLAIN_RE.test(lines[i]) || indentWidth(lines[i]) !== w) continue;
		let end = i;
		while (end < b.end && !ID_LINE_RE.test(lines[end + 1]) && (isBlank(lines[end + 1]) || indentWidth(lines[end + 1]) > w)) end++;
		while (end > i && isBlank(lines[end])) end--;
		return [i, end];
	}
	return null;
}
// 子块该用什么缩进：照已有的子块来；还没有子块就是这一行的缩进再加一个 Tab
function kidIndent(lines, b) {
	let best = null;
	for (let i = b.start + 1; i <= b.end; i++) if (BULLET_RE.test(lines[i]) && (best === null || indentWidth(lines[i]) < indentWidth(best))) best = lines[i];
	return best !== null ? best.match(/^[ \t]*/)[0] : lines[b.start].match(/^[ \t]*/)[0] + "\t";
}
// 新子块插在哪一行前面：块的最后；块尾有单独占一行的块 ID 的话插在它前面（ID 要留在卡片的最后）
function kidInsertAt(lines, b) {
	let at = b.end + 1;
	while (at - 1 > b.start && ID_LINE_RE.test(lines[at - 1])) at--;
	return at;
}
// 从访达启动的 Obsidian 拿不到终端里的 PATH：先看几个常见的安装位置
const findBin = (name) => {
	const fs = require("fs"), home = require("os").homedir();
	return [`${home}/.local/bin`, "/opt/homebrew/bin", "/usr/local/bin", `${home}/.npm-global/bin`, `${home}/.bun/bin`, "/usr/bin"].map((d) => `${d}/${name}`).find((p) => fs.existsSync(p)) || name;
};
// 在「终端」里各开一个窗口运行这几条命令（一条命令一个窗口）
const claudeScript = (cmds) => `tell application "Terminal"\nactivate\n${cmds.map((c) => `do script ${asStr(c)}`).join("\n")}\nend tell`;

// 一行任务的正文：去掉列表符号、**07:37** 记录点、复选框、关键字和紧跟的时刻 / 时间段
// keepPlan = true 时，开头写的计划时间（TODO 14:00-15:30 …）留着，只去掉 DOING / DONE 后面那种记录下来的时刻
function plainText(line, keepPlan = false) {
	const m = line.match(ITEM_RE);
	let rest = (m ? m[2] : line.trim()).replace(STAMP_RE, "").replace(CHECKBOX_RE, "");
	const k = rest.match(KEYWORD_RE);
	if (k) rest = rest.slice(k[0].length);
	if (!keepPlan || (k && /^(DOING|NOW|IN-PROGRESS|DONE)$/.test(k[1]))) rest = rest.replace(TIME_OR_RANGE_RE, "");
	return rest.replace(FROM_RE, "").replace(/\s+\^[A-Za-z0-9-]+$/, "").trim();
}

// 一个时刻有三种写法：14:00、8pm / 8:00pm、3点 / 3点半 / 三点一刻 / 3点15分；前面可以带「下午」「晚上」这类时段词。
// moment(i) 是认一个时刻的正则，分组名后面带 i（一段起止里有两个时刻）：p 时段词、h 数字的时、m 冒号后面的分、
// d「点」、t「点」后面的半 / 整 / 钟 / 一刻 / 15分、a 是 am / pm 的 a / p；c、u 是时用汉字写的那种写法的时和「点」后面的
const PERIODS = "凌晨|半夜|深夜|夜里|清晨|早上|早晨|今早|明早|上午|中午|午后|下午|傍晚|晚上|今晚|明晚";
const CN_NUM = "[零〇一二两三四五六七八九十]{1,3}";
const TIME_TAIL = String.raw`半(?!小时|个|天|年)|整|钟|[一三]刻|\d{1,2}分|\d{2}(?!\d)|${CN_NUM}分`;
const moment = (i) => String.raw`(?:(?<p${i}>${PERIODS})\s*|(?<![\w:：.第零〇一二两三四五六七八九十]))` +
	String.raw`(?:(?<h${i}>\d{1,2})(?:[:：](?<m${i}>\d{2})|(?<d${i}>点)(?<t${i}>${TIME_TAIL})?(?!点))?(?:\s*(?<a${i}>[ap])\.?m\.?(?![a-z]))?` +
	String.raw`|(?<c${i}>${CN_NUM})点(?<u${i}>${TIME_TAIL})?(?!点))`;
const CLOCK_RANGE_RE = new RegExp(String.raw`${moment(1)}\s*(?:[-–—~～]|到|至)\s*${moment(2)}(?![\d:：])`, "gi");
const CLOCK_RE = new RegExp(String.raw`${moment(1)}(?![\d:：])`, "gi");

// 「十五」「两」「三十」「15」→ 数
function cnNum(s) {
	if (/^\d+$/.test(s)) return +s;
	const d = (c) => "零一二三四五六七八九".indexOf(c === "〇" ? "零" : c === "两" ? "二" : c);
	const i = s.indexOf("十");
	if (i < 0) return s.length === 1 ? d(s) : NaN;
	return (i ? d(s[0]) : 1) * 10 + (i < s.length - 1 ? d(s[i + 1]) : 0);
}

// 从一次匹配里取出第 i 个时刻：{ h, min, ap, period, colon 写了冒号分钟, dian 写了「点」, tail「点」后面还有东西 }
function momentOf(g, i) {
	const cn = g["c" + i], tail = cn ? g["u" + i] : g["t" + i];
	let min = g["m" + i] ? +g["m" + i] : 0;
	if (tail) min = tail === "半" ? 30 : tail === "整" || tail === "钟" ? 0 : tail === "一刻" ? 15 : tail === "三刻" ? 45 : cnNum(tail.replace(/分$/, ""));
	return { h: cn ? cnNum(cn) : +g["h" + i], min, ap: g["a" + i] || "", period: g["p" + i] || "", colon: !!g["m" + i], dian: !!cn || !!g["d" + i], tail: !!tail };
}

// 时、分、a / p → 当天第几分钟；不是个时刻返回 null。12am 是 0 点，12pm 是中午；14:00pm 这种按 24 小时算
function clockMinutes(h, m, ap) {
	h = +h; m = +(m || 0);
	if (!(h <= 23) || !(m <= 59)) return null;
	if (ap && h >= 1 && h <= 12) h = (h % 12) + (/p/i.test(ap) ? 12 : 0);
	return h * 60 + m;
}

// 带时段词的 1–12 点是 24 小时制的几点。晚上 12 点是 24 点、晚上 1–4 点是过了半夜的那几个钟头（都算到第二天去）
function periodHour(h, p) {
	if (/凌晨/.test(p)) return h % 12;                        // 凌晨 12 点 = 0 点
	if (/早|晨|上午/.test(p)) return h;                       // 清晨 早上 早晨 今早 明早 上午
	if (/中午/.test(p)) return h <= 4 ? h + 12 : h;           // 中午 1 点 = 13 点
	if (/午后|下午|傍晚/.test(p)) return h < 12 ? h + 12 : 12;
	if (/晚/.test(p)) return h <= 4 ? h + 24 : h + 12;         // 晚上 今晚 明晚
	return h >= 6 ? h + 12 : h;                                // 半夜 深夜 夜里：11 点是 23 点，2 点是凌晨 2 点
}

// 一个时刻是当天第几分钟。mark = 它自己的、或者从起止另一头借来的 { ap } / { period }
function momentMinutes(t, mark) {
	if (mark && mark.ap) return clockMinutes(t.h, t.min, mark.ap);
	if (!(t.h <= 23) || !(t.min <= 59)) return null;
	const h = mark && mark.period && t.h >= 1 && t.h <= 12 ? periodHour(t.h, mark.period) : t.h;
	return h * 60 + t.min;
}

// 从一段话里找出时刻：{ start, end（当天第几分钟）, day（时段词带出来的往后几天：明早 / 明晚 = 1）}，没有就是 null
//   起止：「14:00-15:30」「14:00 到 15:30」「7am-9am」「8-10pm」「下午3点到5点」「晚上8-10点」；单独一个时刻算一小时
//   单个时刻要够明确才算：写了分钟（14:00、8点半、3点15分、8点整）、写了 am / pm、或者带时段词（下午3点、晚上八点）。
//   光一个数字（「3-5」「10-14」）、光一个「3点」「三点」不算：「总结 3 点」「有一点累」不是时刻
//   起止里只有一头写了 am / pm 或时段词：另一头先跟它一样，顺序不对再换成另一半天（10-2pm、上午10点到2点 都是 10:00–14:00）
function timeIn(text) {
	const own = (t) => (t.ap ? { ap: t.ap } : t.period ? { period: t.period } : null);
	const flip = (v, t) => (t.h >= 1 && t.h <= 12 && v < 1440 ? (v >= 720 ? v - 720 : v + 720) : v);
	const day = (...ts) => (ts.some((t) => /^明/.test(t.period)) ? 1 : 0);
	for (const r of text.matchAll(CLOCK_RANGE_RE)) {
		const a = momentOf(r.groups, 1), b = momentOf(r.groups, 2);
		const sure = a.colon || a.ap || a.period || a.tail;
		if (!(b.colon || b.ap || (b.dian && (b.period || b.tail || sure)))) continue;
		if (!(a.colon || a.ap || (a.dian ? a.period || a.tail || b.period || b.tail || b.ap : b.ap || (b.dian && (a.period || b.period || b.tail))))) continue;
		const ma = own(a), mb = own(b);
		let start = momentMinutes(a, ma || mb), end = momentMinutes(b, mb || ma);
		if (start === null || end === null) continue;
		if (end <= start && !ma && mb) start = flip(start, a);
		else if (end <= start && ma && !mb) end = flip(end, b);
		if (end <= start) end += 1440;
		return { start, end, day: day(a, b) };
	}
	for (const r of text.matchAll(CLOCK_RE)) {
		const t = momentOf(r.groups, 1);
		if (!(t.colon || t.ap || (t.dian && (t.period || t.tail)))) continue;
		const start = momentMinutes(t, own(t));
		if (start !== null) return { start, end: start + 60, day: day(t) };
	}
	return null;
}

// 写明了日期的：任务下面一行的「SCHEDULED: <2026-10-14 Wed 19:30>」「DEADLINE: <…>」（TODOseq / Logseq 的写法，
// 尖括号、方括号都认，后面的重复规则 .+1d 不管），和行里的「⏳ 2026-10-14」「📅 2026-10-14」
const PLAN_LINE_RE = /^[ \t>]*(SCHEDULED|DEADLINE):\s*[<\[]\s*(\d{4})-(\d{1,2})-(\d{1,2})([^>\]]*)[>\]]/;
const PLAN_MARK_RE = /(⏳|📅)️?\s*(\d{4})-(\d{1,2})-(\d{1,2})/gu;

// lines = 一块（首行 + 跟着的行）。返回 { date, time: { start, end } 或 null }，没写就是 null。
// 只看这一项自己的（到第一个子项为止）；先认计划哪天做（SCHEDULED、⏳），没有再认截止（DEADLINE、📅）
function planOf(lines) {
	const at = (m, time) => ({ date: new Date(+m[2], +m[3] - 1, +m[4]), time });
	const found = {};
	for (let i = 1; i < lines.length && !ITEM_LINE_RE.test(lines[i]); i++) {
		const m = PLAN_LINE_RE.exec(lines[i]);
		if (m) found[m[1]] ||= at(m, timeIn(m[5]));
	}
	for (const m of lines[0].matchAll(PLAN_MARK_RE)) found[m[1]] ||= at(m, null);
	return found.SCHEDULED || found["⏳"] || found.DEADLINE || found["📅"] || null;
}

// 这一块什么时候：{ date: Date（那天 0 点）, start / end: 当天第几分钟或 null, dayGiven: 知不知道是哪天, dated: 这一块自己说了哪天 }
//   lines = 一块（首行 + 跟着的行），只给首行那一行字也行
//   哪天：SCHEDULED / DEADLINE / ⏳ / 📅 写的日期；没有就看行里的「明天 / 后天 / 大后天」「明早 / 明晚」；再没有就是这篇日记的那一天，不在日记里就是今天
//   几点：SCHEDULED / DEADLINE 里写了就用它的；没写就看这一行里的（见 timeIn）。DOING / DONE 后面紧跟的时刻是记录，不算
function whenOf(lines, fileName, now = new Date()) {
	if (typeof lines === "string") lines = [lines];
	const text = plainText(lines[0], true).replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "").replace(/!?\[\[[^\]]*\]\]/g, "");
	const jm = JOURNAL_NAME_RE.exec(fileName || "");
	const base = jm ? new Date(+jm[1], +jm[2] - 1, +jm[3]) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const plan = planOf(lines);
	const dw = plan ? null : DAY_WORD_RE.exec(text);
	const t = (plan && plan.time) || timeIn(text.replace(/\d{4}-\d{1,2}-\d{1,2}/g, " "));   // 日期里的数字不当时刻看
	const later = plan ? 0 : dw ? DAY_OFFSET[dw[0]] : (t && t.day) || 0;                    // 往后几天
	const date = plan ? plan.date : new Date(base.getFullYear(), base.getMonth(), base.getDate() + later);
	return { date, start: t ? t.start : null, end: t ? t.end : null, dayGiven: !!plan || !!later || !!jm, dated: !!plan || !!later };
}

// AppleScript 里造一个日期：从 current date 改年月日时分，不依赖系统的日期格式
const asDate = (name, d, minutes) => [
	`set ${name} to current date`, `set day of ${name} to 1`, `set year of ${name} to ${d.getFullYear()}`, `set month of ${name} to ${d.getMonth() + 1}`,
	`set day of ${name} to ${d.getDate()}`, `set time of ${name} to ${Math.round((minutes || 0) * 60)}`].join("\n");

// 发到日历：有时刻的是定时事件，没有的是全天事件
function calendarScript({ title, notes, when, calendar }) {
	const allDay = when.start === null;
	const target = calendar ? `calendar ${asStr(calendar)}` : "(first calendar whose writable is true)";
	return [asDate("s", when.date, allDay ? 0 : when.start), asDate("e", when.date, allDay ? 0 : when.end),
		`tell application "Calendar"`, `tell ${target}`,
		`set ev to make new event with properties {summary:${asStr(title)}, start date:s, end date:e, allday event:${allDay}, description:${asStr(notes)}}`,
		`return name of it`, `end tell`, `end tell`].join("\n");
}

// 发到提醒事项：有时刻的到点提醒；只说了哪天（行里写了明天这类词，或者 SCHEDULED / ⏳ 这类日期）的记成那天的全天提醒；都没有就不设日期
function remindersScript({ title, notes, when, list, dated }) {
	const props = [`name:${asStr(title)}`, `body:${asStr(notes)}`];
	const pre = [];
	if (when.start !== null) { pre.push(asDate("d", when.date, when.start)); props.push("due date:d"); }
	else if (dated) { pre.push(asDate("d", when.date, 0)); props.push("allday due date:d"); }
	const target = list ? `list ${asStr(list)}` : "default list";
	return [...pre, `tell application "Reminders"`, `tell ${target}`, `make new reminder with properties {${props.join(", ")}}`, `return name of it`, `end tell`, `end tell`].join("\n");
}

// 发到 MD Flow 的中转笔记长什么样：这一块自己是标题，直接子项各成一段，再往下的照旧是列表
function mdflowText(lines) {
	const title = plainText(lines[0]);
	const kids = lines.slice(1).filter((l) => !ID_LINE_RE.test(l));
	if (!kids.some((l) => !isBlank(l))) return title + "\n";
	const w = Math.min(...kids.filter((l) => !isBlank(l)).map(indentWidth));
	const body = [];
	for (const l of kids) {
		if (isBlank(l)) { body.push(""); continue; }
		const d = dedent(l, w), m = /^[ \t]/.test(d) ? null : d.match(ITEM_RE);
		if (m) body.push("", plainText(d));
		else body.push(d.replace(/^\t/, "").replace(/^ {1,4}/, ""));
	}
	return `# ${title}\n${body.join("\n")}\n`.replace(/\n{3,}/g, "\n\n");
}

// 发到 X 的文字：这一块自己一行，子项各一行（去掉列表符号、缩进、任务关键字和时刻、块 ID）；
// 双链只留显示的字，==高亮== / **加粗** 去掉记号；⏱ 时段、🔗 绑定这类机器写的子行不带
function tweetText(lines) {
	const out = [];
	for (const l of lines) {
		if (isBlank(l) || ID_LINE_RE.test(l)) continue;
		const t = plainText(l)
			.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
			.replace(/==([^=\n]+)==/g, "$1").replace(/\*\*([^*\n]+)\*\*/g, "$1")
			.trim();
		if (!t || /^(⏱|🔗)/.test(t)) continue;
		out.push(t);
	}
	return out.join("\n");
}

class SendModal extends FuzzySuggestModal {
	constructor(plugin, editor, file) {
		super(plugin.app);
		this.plugin = plugin; this.editor = editor; this.file = file;
		// 选中了几块并列的：「Claude CLI 单发」每块各开一个会话，其余去向还是只发光标所在的那一块
		this.many = (plugin.pickedStarts(editor) || []).length;
		this.setPlaceholder(this.many > 1 ? `选中了 ${this.many} 块，发到哪儿…` : "这一块发到哪儿…");
	}
	getItems() { return this.plugin.directions().filter((d) => !d.desktop || (Platform && Platform.isDesktopApp)); }
	getItemText(d) { return `${d.icon} ${d.name}`; }
	onChooseItem(d) { d.run(this.editor, this.file); }
}

// 选一个在后台无头跑着的会话停掉
class StopModal extends FuzzySuggestModal {
	constructor(app, items, done) {
		super(app);
		this.items = items; this.done = done;
		this.setPlaceholder("停掉哪一个…");
	}
	getItems() { return this.items; }
	getItemText(x) { return `${x.title}　${x.sid.slice(0, 8)}`; }
	onChooseItem(x) { this.done(x); }
}

// 选一个 MD Flow 的模板
class TemplateModal extends FuzzySuggestModal {
	constructor(app, items, current, done) {
		super(app);
		this.items = items; this.current = current; this.done = done;
		this.setPlaceholder("用哪个模板排…");
	}
	getItems() { return this.items; }
	getItemText(t) { return `${t.name}${t.id === this.current ? "（现在用的）" : ""}　${t.id}`; }
	onChooseItem(t) { this.done(t); }
}

// 一条命令现在绑着哪些键（你改过的优先，没改过就是默认的），写成 ⌥⌘S 这种样子；没绑返回 ""
function hotkeyText(app, id) {
	const hm = app.hotkeyManager, list = hm.getHotkeys(id) || hm.getDefaultHotkeys(id) || [];
	const mac = Platform && Platform.isMacOS, sym = { Mod: mac ? "⌘" : "Ctrl+", Meta: mac ? "⌘" : "Win+", Ctrl: mac ? "⌃" : "Ctrl+", Alt: mac ? "⌥" : "Alt+", Shift: mac ? "⇧" : "Shift+" };
	return list.map((h) => ["Ctrl", "Alt", "Shift", "Mod", "Meta"].filter((m) => (h.modifiers || []).includes(m)).map((m) => sym[m]).join("") + String(h.key || "").toUpperCase()).join(" / ");
}
// 打开「设置 → 快捷键」并只列出名字里带 word 的命令
function openHotkeys(app, word) {
	app.setting.open();
	const tab = app.setting.openTabById("hotkeys");
	if (tab && typeof tab.setQuery === "function") tab.setQuery(word);
}

// ---------- 隐藏日记的 DONE 区 ----------
// 开着时，日记（文件名 YYYY_MM_DD）里的 DONE 栏——正文第一条「- ---」之前那一段，连同这条分隔线——在编辑器里整段藏起来，
// 光标也进不去（整段当一个原子跳过）。只管编辑模式（实时预览 / 源码），阅读视图照常显示。栏是空的、还没有分隔线的日记不动
function hideDoneExtension(plugin) {
	const { StateField, StateEffect } = require("@codemirror/state");
	const { EditorView, Decoration } = require("@codemirror/view");
	const { editorInfoField } = require("obsidian");
	const refresh = StateEffect.define();
	const build = (state) => {
		if (!plugin.settings.hideDone) return Decoration.none;
		const file = state.field(editorInfoField, false)?.file;
		if (!file || !JOURNAL_NAME_RE.test(file.basename)) return Decoration.none;
		const { blocks } = parse(state.doc.toString());
		const end = doneZoneEnd(blocks);
		if (end <= 0) return Decoration.none;
		// 从栏里第一块的首行藏到那条分隔线（块之间的空行一起藏）
		const doc = state.doc;
		const from = doc.line(blocks[0].start + 1).from, to = doc.line(blocks[end].start + 1).to;
		return Decoration.set([Decoration.replace({ block: true }).range(from, to)]);
	};
	const field = StateField.define({
		create: build,
		update: (deco, tr) => (tr.docChanged || tr.effects.some((e) => e.is(refresh)) ? build(tr.state) : deco),
		provide: (f) => [EditorView.decorations.from(f), EditorView.atomicRanges.of((view) => view.state.field(f))],
	});
	return { extension: field, refresh };
}

class SendSettings extends PluginSettingTab {
	constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
	display() {
		const { containerEl } = this, s = this.plugin.settings;
		containerEl.empty();
		const text = (name, desc, key, placeholder) => new Setting(containerEl).setName(name).setDesc(desc)
			.addText((t) => t.setPlaceholder(placeholder || "").setValue(s[key] || "").onChange(async (v) => { s[key] = v.trim(); await this.plugin.saveData(s); }));
		new Setting(containerEl).setName("日记").setHeading();
		new Setting(containerEl).setName("隐藏 DONE 区").setDesc("日记里正文第一条「- ---」之前的 DONE 栏（连同这条分隔线）在编辑器里整段不显示。阅读视图照常显示。也可以用命令「隐藏 / 显示日记的 DONE 区」切换")
			.addToggle((t) => t.setValue(!!s.hideDone).onChange(async (v) => { s.hideDone = v; await this.plugin.saveData(s); this.plugin.refreshHideDone(); }));
		new Setting(containerEl).setName("快捷键").setHeading();
		new Setting(containerEl).setName("叫出「发送这一块到…」面板").setDesc(`现在：${hotkeyText(this.app, "done-to-top:send-block") || "没有绑键"}。键位在 Obsidian 的「设置 → 快捷键」里改，改了就用你的，默认的那个自动让位。每个去向也各有一条命令，想给哪个单独绑键也在那里绑`)
			.addButton((b) => b.setButtonText("去改").onClick(() => openHotkeys(this.app, "块去向")));
		new Setting(containerEl).setName("斜杠命令").setHeading();
		new Setting(containerEl).setName("斜杠命令只留带这个词的").setDesc("Obsidian 自带的斜杠命令（编辑器里打 /）默认把全部命令都列出来。打开以后只留名字里带下面这个词的命令，「发送到 Claude CLI」只要对得上你打的字就排第一个。要先在「核心插件」里开着「斜杠命令」")
			.addToggle((t) => t.setValue(!!s.slashOnly).onChange(async (v) => { s.slashOnly = v; await this.plugin.saveData(s); this.plugin.patchSlash(); }));
		text("留下哪个词", "命令的名字（连同前面的插件名，比如「块去向: …」）里带这个词才留下", "slashKeyword", DEFAULTS.slashKeyword);
		new Setting(containerEl).setName("发给 Claude CLI").setHeading();
		text("运行的命令", "在「终端」里运行它，后面跟上这一块的内容当第一句话。换成 codex 也行", "claudeCommand", "claude");
		text("在哪个目录里运行", "留空 = 这个库的根目录。可以写 ~/某个目录", "claudeCwd", "留空用库的根目录");
		new Setting(containerEl).setName("发出去以后改成 DOING").setDesc("这一行原来是 TODO 的话改成 DOING 并记下时刻。没有任务关键字的块不动")
			.addToggle((t) => t.setValue(s.claudeMarkDoing !== false).onChange(async (v) => { s.claudeMarkDoing = v; await this.plugin.saveData(s); }));
		new Setting(containerEl).setName("记下是哪个会话").setDesc("命令是 claude 的时候：发出去前替这个会话定好会话号、用这一行的字起名，并在这一行下面记一行「🔗 [Claude：名字](claude://…)」。螺旋日程的进度条靠它直接认这个会话，不用再按名字去对")
			.addToggle((t) => t.setValue(s.claudeLink !== false).onChange(async (v) => { s.claudeLink = v; await this.plugin.saveData(s); }));
		text("一次最多发几块", "选中几块并列的再发、或者按子块发，每块各开一个会话。超过这个数就不发，免得误选一大片", "claudeMaxParallel", String(DEFAULTS.claudeMaxParallel));
		new Setting(containerEl).setName("会话跑在哪儿").setDesc("终端窗口：macOS 自带的「终端」，一个会话一个窗口。tmux 后台：桌面上什么都不弹，想看、想答话时在随便哪个终端里 tmux attach（要先装 tmux）。无头：claude -p，没有窗口，答完一轮就退出，只在大纲里看进度条和它最后说的话")
			.addDropdown((d) => d.addOption("terminal", "终端窗口").addOption("tmux", "tmux 后台").addOption("headless", "无头（claude -p）").setValue(["tmux", "headless"].includes(s.claudeRun) ? s.claudeRun : "terminal")
				.onChange(async (v) => { s.claudeRun = v; await this.plugin.saveData(s); }));
		text("tmux 会话的名字", "跑在 tmux 后台时，会话都开在这个 tmux 会话里（没有就建），一个 Agent 会话一个窗口。进去看：tmux attach -t 这个名字", "claudeTmuxSession", DEFAULTS.claudeTmuxSession);
		text("无头跑时多带的参数", "无头的时候没人能替它点「允许」：不给权限它只能读、不能改文件也不能跑命令。要它动手就写在这里，比如 --permission-mode acceptEdits", "claudeHeadlessArgs", "留空 = 只读");
		new Setting(containerEl).setName("AI 解释").setHeading();
		text("用哪个模型", "交给 claude 命令行（用它自己的登录）讲这一块是什么意思，答案记成这一块下面的「💡」子块。解释一句话不用强模型，默认 Haiku", "explainModel", DEFAULTS.explainModel);
		new Setting(containerEl).setName("发到日历和提醒事项").setHeading();
		text("日历", "macOS「日历」里那个日历的名字。留空 = 第一个能写的日历", "calendar", "留空用第一个能写的");
		text("提醒事项的列表", "macOS「提醒事项」里那个列表的名字。留空 = 默认列表", "remindersList", "留空用默认列表");
		new Setting(containerEl).setName("发到 MD Flow").setHeading();
		text("中转笔记", "这一块先写进这篇笔记（每次覆盖），再打开 MD Flow 的面板来排", "mdflowNote", DEFAULTS.mdflowNote);
	}
}

module.exports = class DoneToTopPlugin extends Plugin {
	async onload() {
		this.core = core;
		this.settings = Object.assign({}, DEFAULTS, await this.loadData());
		this.hideDone = hideDoneExtension(this);
		this.registerEditorExtension(this.hideDone.extension);
		this.addCommand({
			id: "toggle-hide-done",
			name: "隐藏 / 显示日记的 DONE 区",
			callback: async () => {
				this.settings.hideDone = !this.settings.hideDone;
				await this.saveData(this.settings);
				this.refreshHideDone();
				new Notice(this.settings.hideDone ? "日记的 DONE 区已隐藏" : "日记的 DONE 区已显示");
			},
		});
		// 快速跳转：⌃1 DOING 区、⌃2 TODO 区、⌃3 结尾、⌃0 DONE 栏（藏着的话先放出来）
		for (const [id, key, name, where] of [
			["jump-doing", "1", "跳到 DOING 区", "DOING"],
			["jump-todo", "2", "跳到 TODO 区", "TODO"],
			["jump-end", "3", "跳到结尾", "END"],
			["jump-done", "0", "跳到 DONE 区（藏着的话先显示出来）", "DONE"],
		]) this.addCommand({ id, name, hotkeys: [{ modifiers: ["Ctrl"], key }], editorCallback: (editor) => this.jumpTo(editor, where) });
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
			name: "一键整理：DONE / DOING / TODO / 其它 分区（块内也按分割线分区）",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "f" }],
			editorCallback: (editor, ctx) => this.organize(editor, ctx),
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
		// 发送：光标所在块（连同子项）发到别处。「发送这一块到…」列出全部去向；每个去向也各有一条命令，可以单独绑快捷键
		this.addCommand({
			id: "send-block",
			name: "发送这一块到…",
			hotkeys: [{ modifiers: ["Mod", "Alt"], key: "S" }],   // 字母要大写：Mac 上按住 ⌥ 打出来的是 ß，Obsidian 改按键位 S 比对，区分大小写
			editorCallback: (editor, ctx) => new SendModal(this, editor, ctx && ctx.file).open(),
		});
		for (const d of this.directions()) {
			if (!d.command) continue;
			this.addCommand({ id: d.command, name: `发送到 ${d.name}`, editorCallback: (editor, ctx) => d.run(editor, ctx && ctx.file) });
		}
		this.addCommand({ id: "stop-headless", name: "停掉一个在后台无头跑着的 Claude 会话…", callback: () => this.stopHeadless() });
		this.addSettingTab(new SendSettings(this.app, this));
		this.app.workspace.onLayoutReady(() => this.patchSlash());
		// 不给默认快捷键，免得误按；要用就在「设置 → 快捷键」里自己绑
		this.addCommand({
			id: "delete-rest",
			name: "以下全部删除：删掉光标所在行及以下的内容",
			editorCallback: (editor) => this.deleteRest(editor),
		});
	}

	// 「今天」是哪一天（那天 0 点的 Date）：直接问螺旋日程，它设置里的「日记日期分界」之前还算前一天，它那边怎么算这边就怎么算。
	// 螺旋日程没开着：照它的设置自己算一遍；连设置都没有就按早上 7 点分
	dayNow() {
		const sp = this.app.plugins?.plugins?.["nautilus-spiral"];
		try { if (sp && typeof sp.today === "function") return sp.today().toDate(); } catch (e) { /* 问不到就自己算 */ }
		const d = new Date();
		if (d.getHours() * 60 + d.getMinutes() < ((sp && sp.settings && sp.settings.dayCutoff) ?? 7) * 60) d.setDate(d.getDate() - 1);
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}

	// 明天的日记：当前笔记是日记就取它的后一天；不是日记就取「今天」的后一天（和螺旋日程同一个日期分界，见 dayNow）
	tomorrowOf(file) {
		if (file && JOURNAL_NAME_RE.test(file.basename)) {
			const to = journalAfter(file.basename, 1);
			return { ...to, folder: file.parent && file.parent.path !== "/" ? file.parent.path : "", source: file.basename };
		}
		const cfg = this.app.plugins?.plugins?.["nautilus-spiral"]?.settings || {};
		const d = this.dayNow();
		const today = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("_");
		return { ...journalAfter(today, 1), folder: cfg.folder || "日记", source: file ? file.basename : today };
	}

	// 今天的日记（和螺旋日程同一个日期分界，见 dayNow）；当前笔记是日记就放在它那个文件夹
	todayOf(file) {
		const cfg = this.app.plugins?.plugins?.["nautilus-spiral"]?.settings || {};
		const d = this.dayNow();
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
		const isSep = (l) => SEP_RE.test(l) || /^\s*-{3,}\s*$/.test(l);
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
		this.cue("DONE");
		const tops = moved.filter((l) => !isBlank(l) && !/^\s/.test(l) && !isSep(l)).length;
		new Notice(`➡️ 已追加到${dayLabel}（${to.name}）：${tops} 块，共 ${orig.length} 行`);
	}

	// 「以下全部」从哪一行算起：光标所在行（不进属性区）；光标在列表项的续行上时从这一项开始
	restStart(lines, cursorLine) {
		const bodyStart = topInsertLine(lines);
		let start = Math.max(cursorLine, bodyStart);
		const tails = (l) => /^\s/.test(l) || ID_LINE_RE.test(l);   // 续行，或者块 ID 那一行
		if (start > bodyStart && !isBlank(lines[start]) && tails(lines[start])) {
			let i = start;
			while (i > bodyStart && !ITEM_RE.test(lines[i]) && (isBlank(lines[i]) || tails(lines[i]))) i--;
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

	// 斜杠命令瘦身：Obsidian 自带的「/」会把六百多条命令全列出来。设置里打开以后只留名字里带「块」的（词可以改），
	// 并且只要「发送到 Claude CLI」对得上你打的字，就排第一个。改的是那个建议器实例自己的 getSuggestions，停用插件时还原
	patchSlash() {
		const sp = this.app.internalPlugins.getPluginById("slash-command"), sg = sp && sp.instance && sp.instance.suggest;
		if (!sg || Object.prototype.hasOwnProperty.call(sg, "getSuggestions")) return;
		const orig = sg.getSuggestions, FIRST = "done-to-top:send-block-to-claude";
		sg.getSuggestions = (ctx) => {
			const list = orig.call(sg, ctx);
			const word = (this.settings.slashKeyword || DEFAULTS.slashKeyword).trim();
			if (!this.settings.slashOnly || !word || !Array.isArray(list)) return list;
			const kept = list.filter((x) => x && x.item && String(x.item.name || "").includes(word));
			const at = kept.findIndex((x) => x.item.id === FIRST);
			if (at > 0) kept.unshift(...kept.splice(at, 1));
			return kept;
		};
		this.register(() => { delete sg.getSuggestions; });
	}

	// 全部去向。command = 单独那条命令的 id（没有的是别处已经有命令了）；desktop = 只在桌面端有
	directions() {
		return [
			{ icon: "⬆️", name: "页面顶部", run: (ed) => this.run(ed, false) },
			{ icon: "➡️", name: "明天", run: (ed, f) => this.sendToTomorrow(ed, f) },
			{ icon: "🤖", name: "Claude CLI 单发", command: "send-block-to-claude", desktop: true, run: (ed, f) => this.sendToClaude(ed, f) },
			{ icon: "🧩", name: "Claude CLI 并发", command: "send-kids-to-claude", desktop: true, run: (ed, f) => this.sendKidsToClaude(ed, f) },
			{ icon: "🪺", name: "Claude CLI subagent", command: "send-kids-to-subagents", desktop: true, run: (ed, f) => this.sendKidsToSubagents(ed, f) },
			{ icon: "✏️", name: "Claudian Inline edit", command: "send-block-to-claudian", desktop: true, run: (ed) => this.sendToClaudian(ed) },
			{ icon: "🖼", name: "MD Flow", command: "send-block-to-mdflow", desktop: true, run: (ed, f) => this.sendToMdflow(ed, f) },
			{ icon: "📅", name: "日历", command: "send-block-to-calendar", desktop: true, run: (ed, f) => this.sendToCalendar(ed, f) },
			{ icon: "☑️", name: "提醒事项", command: "send-block-to-reminders", desktop: true, run: (ed, f) => this.sendToReminders(ed, f) },
			{ icon: "💡", name: "AI 解释", command: "send-block-to-explain", desktop: true, run: (ed, f) => this.sendToExplain(ed, f) },
			{ icon: "🐦", name: "X（Twitter）", command: "send-block-to-twitter", run: (ed) => this.sendToTwitter(ed) },
		];
	}

	// 光标所在块（连同子项），去掉了它自己那一层缩进。块 ID 那一行不带（那是给闪卡插件看的）
	grab(editor) {
		const g = this.grabAt(editor.getValue().split("\n"), editor.getCursor().line);
		if (!g) { new Notice("光标不在列表项里"); return null; }
		if (!g.title) { new Notice("这一块是空的"); return null; }
		return g;
	}
	// 第 at 行所在的那一块。不在列表项里返回 null；title 为空 = 这一块是空的
	grabAt(lines, at) {
		const b = this.blockAt(lines, at);
		if (!b) return null;
		const block = lines.slice(b.start, b.end + 1).map((l) => (isBlank(l) ? "" : dedent(l, b.baseIndent))).filter((l) => !ID_LINE_RE.test(l));
		while (block.length > 1 && isBlank(block[block.length - 1])) block.pop();
		const title = plainText(block[0]);
		// 子项去掉它们共有的那一层缩进：发出去的文字里，直接子项是顶格的列表
		const rest = block.slice(1), w = Math.min(...rest.filter((l) => !isBlank(l)).map(indentWidth), Infinity);
		const kids = rest.map((l) => (isBlank(l) || !isFinite(w) ? l : dedent(l, w)));
		return { ...b, raw: lines[b.start], block, title, kids };
	}
	// 选区里并列的几块，各自第一行的行号：起始行落在选区里、缩进最浅的那一层列表项，各算一块（子项跟着它走）；
	// 分隔线、🔗 / ⏱ 记号行不算。选区只落在一行里（或者根本没选）返回 null，按光标所在的那一块办
	pickedStarts(editor) {
		const picked = new Set();
		for (const { anchor, head } of (editor.listSelections ? editor.listSelections() : [])) {
			const [a, b] = anchor.line < head.line || (anchor.line === head.line && anchor.ch <= head.ch) ? [anchor, head] : [head, anchor];
			const last = b.line > a.line && b.ch === 0 ? b.line - 1 : b.line;   // 选区停在下一行的行首：那一行不算
			for (let i = a.line; i <= last; i++) picked.add(i);
		}
		if (picked.size < 2) return null;
		const lines = editor.getValue().split("\n"), body = topInsertLine(lines);
		const items = [...picked].sort((x, y) => x - y).filter((i) => i >= body && BULLET_RE.test(lines[i]) && !ANY_SEP_RE.test(lines[i]) && !MARK_LINE_RE.test(lines[i]));
		if (!items.length) return null;
		const w = Math.min(...items.map((i) => indentWidth(lines[i])));
		return items.filter((i) => indentWidth(lines[i]) === w);
	}
	// 发出去的那一下响一声：name = "DOING" / "DONE"，就是螺旋日程里任务切到这个状态时的那一声，开关也跟它走；没装螺旋日程就不响。
	// changed = 这一下顺带把状态改成了 name 的那几行（改完以后的样子）：先跟螺旋日程登记，不然它看到这次状态变化还会再响一遍。
	// 所以要在改编辑器之前调
	cue(name, changed = []) {
		const sp = this.app.plugins?.plugins?.["nautilus-spiral"];
		if (!sp || typeof sp.sound !== "function") return;
		const kwLine = sp.constructor && sp.constructor.core && sp.constructor.core.kwLine;
		if (changed.length && kwLine && typeof sp.kwFresh === "function") {
			const file = this.app.workspace.activeEditor?.file ?? this.app.workspace.getActiveFile();
			sp.kwFresh(file ? file.path : "", changed.map((l) => ({ body: (kwLine(l) || {}).body, to: name })).filter((c) => c.body));
		}
		sp.sound(name);
	}
	desktopOnly() {
		if (Platform && Platform.isDesktopApp) return true;
		new Notice("这个去向只在电脑上有");
		return false;
	}
	// 点了能回到这一块所在笔记的链接（写进日历事件、提醒事项的备注里）
	backLink(file) {
		return file ? `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(file.path)}` : "";
	}
	notesOf(g, file) {
		const kids = g.kids.filter((l) => !PLAN_LINE_RE.test(l));   // SCHEDULED / DEADLINE 那一行已经成了事件的时间，不进备注
		return [kids.join("\n"), this.backLink(file)].filter((x) => x && x.trim()).join("\n\n");
	}

	// 发给 Claude CLI：进到设置的目录，运行 claude '这一块的内容'（跑在哪儿见 dispatchClaude）。
	// 并列 = 并发：选中了几块并列的，每块各开一个会话、各写各的 🔗（做完的那几块跳过）
	async sendToClaude(editor, file) {
		if (!this.desktopOnly()) return;
		const lines = editor.getValue().split("\n");
		const starts = this.pickedStarts(editor);
		let gs, skipped = 0;
		if (starts && starts.length > 1) {
			const all = starts.map((i) => this.grabAt(lines, i)).filter((g) => g && g.title);
			gs = all.filter((g) => itemZone(g.raw) !== "DONE");
			skipped = all.length - gs.length;
			if (!gs.length) return new Notice("选中的几块都是做完了的，没有发");
		} else {
			// 选区只圈住了一块（母项连同子项）：发的是圈住的那一块，不是光标停着的那个子项
			const g = starts ? this.grabAt(lines, starts[0]) : this.grab(editor);
			if (!g) return;
			if (!g.title) return new Notice("这一块是空的");
			gs = [g];
		}
		return this.dispatchClaude(editor, gs.map((g) => ({ g, prompt: [g.title, ...contentOf(g)].join("\n") })), { skipped });
	}

	// 纵深 = 子会话：光标所在的母块不整块发，它的每个直接子块各开一个会话；母块的字是每个会话开头都带的共同背景。
	// 🔗 记在各个子块下面，所以进度条、会话最后说的话（💬）也都回到各自的子块下面。做完的子块、记号行、分隔线跳过
	async sendKidsToClaude(editor, file) {
		const k = this.kidsOf(editor);
		if (!k) return;
		const { top, gs, all } = k;
		const jobs = gs.map((g) => ({ g, prompt: [
			`背景：这是「${top.title}」里的一项。`,
			...(gs.length > 1 ? [`同一件事里别的几项另有会话在做，不用你管：${gs.filter((o) => o !== g).map((o) => o.title).join("；")}`] : []),
			"", "你要做的这一项：", g.title, ...contentOf(g)].join("\n") }));
		return this.dispatchClaude(editor, jobs, { skipped: all.length - gs.length, parent: top });
	}

	// 母块 = 一个会话，子块 = 它派出去的 subagent：只开一个会话，让它用 Agent 工具把每个直接子块各交给一个 subagent 并行做，
	// 回来的只有结论，最后在这个会话里汇总，还能接着聊。subagent 没有自己的会话号，所以 🔗 只记在母块下面
	async sendKidsToSubagents(editor, file) {
		const k = this.kidsOf(editor);
		if (!k) return;
		const { top, gs, all } = k;
		const max = Math.max(1, parseInt(this.settings.claudeMaxParallel, 10) || DEFAULTS.claudeMaxParallel);
		if (gs.length > max) return new Notice(`一共 ${gs.length} 个子块，一次最多派 ${max} 个（设置里可以改），这次没有发`);
		const items = gs.map((g, n) => [`${n + 1}. ${g.title}`, ...contentOf(g).map((l) => (isBlank(l) ? l : `   ${l}`))].join("\n"));
		const prompt = [top.title, "",
			"下面每一项交给一个 subagent 去做：用 Agent 工具在同一条消息里一次全派出去，让它们并行跑；description 写那一项的头二十个字。你自己不要动手做这几项。",
			"每个 subagent 做完只回结论：要点、改了哪些文件、还剩什么没做，不要贴原文和长日志。",
			"全部回来以后，按项汇总给我，再说说合起来看的结论和下一步。", "",
			...items].join("\n");
		return this.dispatchClaude(editor, [{ g: top, prompt }], { skipped: all.length - gs.length });
	}

	// 光标所在的母块和它没做完的直接子块（记号行、分隔线不算）。不成立时弹提示、返回 null
	kidsOf(editor) {
		if (!this.desktopOnly()) return null;
		const lines = editor.getValue().split("\n");
		const starts = this.pickedStarts(editor);
		if (starts && starts.length > 1) { new Notice("母块一次发一个：把光标放在母块上，不要选中好几块"); return null; }
		const top = starts ? this.grabAt(lines, starts[0]) : this.grab(editor);
		if (!top) return null;
		if (!top.title) { new Notice("这一块是空的"); return null; }
		const inner = [];
		for (let i = top.start + 1; i <= top.end; i++) if (BULLET_RE.test(lines[i]) && !ANY_SEP_RE.test(lines[i]) && !MARK_LINE_RE.test(lines[i])) inner.push(i);
		if (!inner.length) { new Notice("这一块下面没有子块。只发这一块，用「Claude CLI 单发」"); return null; }
		const w = Math.min(...inner.map((i) => indentWidth(lines[i])));
		const all = inner.filter((i) => indentWidth(lines[i]) === w).map((i) => this.grabAt(lines, i)).filter((g) => g && g.title);
		const gs = all.filter((g) => itemZone(g.raw) !== "DONE");
		if (!gs.length) { new Notice("子块都是做完了的，没有发"); return null; }
		return { top, gs, all };
	}

	// 把几块各开成一个会话。jobs = [{ g: 那一块, prompt: 第一句话 }]；parent = 它们共同的母块（按子会话发的时候）。
	// 命令是 claude 的时候，先替每个会话定好会话号（--session-id）、用那一行的字起名（-n），再在那一行下面记一行
	// 「🔗 [Claude：名字](claude://resume?session=会话号)」：会话还没开口，这一行和它就已经绑死了，螺旋日程的进度条直接听它。
	// 跑在哪儿（设置 claudeRun）：terminal = macOS「终端」里一个会话一个窗口；tmux = 后台的 tmux 会话里一个会话一个窗口，
	// 桌面上什么都不弹，想看、想答话时 tmux attach；headless = claude -p 在后台跑，答完一轮就退出，只在大纲里看进度条
	async dispatchClaude(editor, jobs, { skipped = 0, parent = null } = {}) {
		const s = this.settings;
		const max = Math.max(1, parseInt(s.claudeMaxParallel, 10) || DEFAULTS.claudeMaxParallel);
		if (jobs.length > max) return new Notice(`一共 ${jobs.length} 块，一次最多发 ${max} 块（设置里可以改），这次没有发`);
		const bin = (s.claudeCommand || "claude").trim(), isClaude = /(^|\/)claude$/.test(bin.split(/\s+/)[0]);
		const mode = ["tmux", "headless"].includes(s.claudeRun) ? s.claudeRun : "terminal";
		if (mode === "headless" && !isClaude) return new Notice("无头的跑法只支持 claude 命令。换一种跑法，或者把命令改回 claude");
		let cwd = (s.claudeCwd || "").trim() || (this.app.vault.adapter.getBasePath ? this.app.vault.adapter.getBasePath() : "");
		if (cwd.startsWith("~")) cwd = require("os").homedir() + cwd.slice(1);
		const linked = isClaude && (s.claudeLink !== false || mode === "headless");   // 无头的会话没有窗口可看，一定要记下是哪个
		for (const j of jobs) {
			j.sid = linked ? require("crypto").randomUUID() : "";
			j.name = j.g.title.replace(/[\r\n]+/g, " ").slice(0, 60);
			j.flags = j.sid ? ["--session-id", j.sid, "-n", j.name] : [];
			j.cmd = `${cwd ? `cd ${shq(cwd)} && ` : ""}${bin}${j.sid ? ` --session-id ${j.sid} -n ${shq(j.name)}` : ""} ${shq(j.prompt)}`;
		}
		const doing = (raw) => (s.claudeMarkDoing !== false && itemZone(raw) === "TODO" ? mark(raw, "DOING") : raw);
		// 这一声在发出去之前响：终端一打开 Obsidian 就不在最前面了，等它回来再响就听不到了
		this.cue("DOING", [...jobs.map((j) => j.g.raw), ...(parent ? [parent.raw] : [])].filter((raw) => doing(raw) !== raw).map(doing));
		const r = mode === "tmux" ? await this.runTmux(jobs, cwd) : mode === "headless" ? await this.runHeadless(jobs, cwd, bin)
			: await execFile("/usr/bin/osascript", ["-e", claudeScript(jobs.map((j) => j.cmd))]);
		if (!r.ok) { console.error("[done-to-top] 发给 Claude CLI 失败", r.err); return new Notice(mode === "tmux" ? `tmux 没跑起来：${r.err.slice(0, 120) || "详情见控制台"}` : mode === "headless" ? `后台没跑起来：${r.err.slice(0, 120) || "详情见控制台"}` : "没能打开终端。详情见控制台"); }
		// 各块原地改：TODO 的那一行改成 DOING（不挪位置），下面记上 🔗。这期间被改过的那一行不动它
		const now = editor.getValue().split("\n"), changes = [];
		const spiral = this.app.plugins.plugins["nautilus-spiral"], sc = spiral && spiral.constructor && spiral.constructor.core;
		let moved = 0;
		for (const { g, sid, name } of jobs) {
			if (now[g.start] !== g.raw) { moved++; continue; }
			let line = doing(g.raw);
			if (sid) {
				const indent = (g.raw.match(/^[ \t]*/) || [""])[0] + "\t";
				const link = sc && sc.linkLine ? sc.linkLine(indent, "claude", name, sid) : `${indent}- 🔗 [Claude：${name.replace(/[\[\]()`]+/g, " ").slice(0, 40)}](claude://resume?session=${sid})`;
				// 以前发过、下面已经有一行 🔗：换成这次的
				const had = sc && sc.linkUnder ? sc.linkUnder(now, g.start) : null;
				if (had) changes.push({ from: { line: had.line, ch: 0 }, to: { line: had.line, ch: now[had.line].length }, text: link });
				else line += "\n" + link;
			}
			if (line !== g.raw) changes.push({ from: { line: g.start, ch: 0 }, to: { line: g.start, ch: g.raw.length }, text: line });
		}
		// 母块自己：子块都发出去了，它也算开始做了（不记 🔗，会话是子块的）
		if (parent && now[parent.start] === parent.raw && doing(parent.raw) !== parent.raw) changes.push({ from: { line: parent.start, ch: 0 }, to: { line: parent.start, ch: parent.raw.length }, text: doing(parent.raw) });
		if (changes.length) editor.transaction({ changes: changes.sort((x, y) => x.from.line - y.from.line) });
		const where = mode === "tmux" ? `\n在后台的 tmux 里跑，想看就在终端里：tmux attach -t ${this.tmuxSession()}` : mode === "headless" ? "\n在后台跑，进度看这一行下面的进度条" : "";
		const tail = [skipped ? `跳过 ${skipped} 块做完了的` : "", moved ? `${moved} 块在这期间被改过，没有记 🔗` : ""].filter(Boolean).join("；");
		if (jobs.length === 1 && !parent) new Notice(`🤖 已发给 ${bin}：${jobs[0].g.title.slice(0, 24)}${where}${tail ? `\n${tail}` : ""}`, where ? 8000 : undefined);
		else new Notice(`🤖 已发给 ${bin}：${parent ? `「${parent.title.slice(0, 16)}」的 ${jobs.length} 个子块` : `${jobs.length} 块`}各开了一个会话\n${jobs.map((j) => `· ${j.g.title.slice(0, 24)}`).join("\n")}${where}${tail ? `\n${tail}` : ""}`, 8000);
	}

	tmuxSession() { return (this.settings.claudeTmuxSession || DEFAULTS.claudeTmuxSession).trim().replace(/[.:\s]+/g, "-") || DEFAULTS.claudeTmuxSession; }
	// tmux 后台：设置里那个名字的 tmux 会话（没有就建），每个 Agent 会话是里面的一个窗口。命令交给登录 shell 跑（拿得到终端里的 PATH）；
	// claude 没跑起来或者出错退出时窗口留着，能看到它说了什么；正常退出窗口就关了
	async runTmux(jobs, cwd) {
		const tmux = findBin("tmux"), shell = process.env.SHELL || "/bin/zsh", session = this.tmuxSession();
		// 从访达启动的 Obsidian 没有 UTF-8 的语言环境，tmux 会把窗口名里的中文换成下划线：-u 加上 LC_CTYPE 让它按 UTF-8 来
		const run = (args) => execFile(tmux, ["-u", ...args], 30000, { ...process.env, LC_CTYPE: process.env.LC_CTYPE || "en_US.UTF-8" });
		let made = (await run(["has-session", "-t", `=${session}`])).ok;
		for (const j of jobs) {
			const inner = `${j.cmd} || { echo; echo '[块去向] 这个会话没跑起来，或者出错退出了。上面是它说的话'; exec ${shq(shell)} -l; }`;
			const win = j.name.replace(/[.:]+/g, " ").slice(0, 24);
			const args = made ? ["new-window", "-d", "-t", `=${session}:`, "-n", win] : ["new-session", "-d", "-s", session, "-n", win];
			if (cwd) args.push("-c", cwd);
			const r = await run([...args, `${shq(shell)} -lic ${shq(inner)}`]);
			if (!r.ok) return r;
			made = true;
		}
		return { ok: true };
	}
	// 无头：claude -p 在后台跑，不开任何窗口；答完一轮它就退出，说的话在会话日志里（螺旋日程读得到），也另存一份到缓存目录。
	// 这种跑法没人能替它点「允许」，要它改文件、跑命令，在设置的「附加参数」里给权限（比如 --permission-mode acceptEdits）
	async runHeadless(jobs, cwd, bin) {
		const fs = require("fs"), path = require("path"), os = require("os");
		const [prog, ...pre] = bin.split(/\s+/);
		const exe = prog.includes("/") ? prog.replace(/^~(?=\/)/, os.homedir()) : findBin(prog);
		const extra = (this.settings.claudeHeadlessArgs || "").trim().split(/\s+/).filter(Boolean);
		const dir = path.join(os.homedir(), "Library/Caches/done-to-top");
		const env = { ...process.env, PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":") };
		try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { return { ok: false, err: String(e) }; }
		const running = (this.running ||= new Map());
		for (const j of jobs) {
			const log = path.join(dir, `${j.sid}.log`);
			let child;
			try {
				const fd = fs.openSync(log, "a");
				child = require("child_process").spawn(exe, [...pre, "-p", ...j.flags, ...extra, j.prompt], { cwd: cwd || undefined, env, detached: true, stdio: ["ignore", fd, fd] });
				fs.closeSync(fd);
			} catch (e) { return { ok: false, err: String(e && e.message || e) }; }
			const title = j.g.title.slice(0, 24);
			running.set(j.sid, { title, child, log });
			child.on("error", (e) => { running.delete(j.sid); new Notice(`🤖 后台会话没跑起来：${title}\n${e.message}`, 10000); });
			child.on("exit", (code, sig) => {
				running.delete(j.sid);
				if (!code && !sig) return new Notice(`🤖 后台会话答完了：${title}`);
				let last = "";
				try { last = fs.readFileSync(log, "utf8").trim().split("\n").pop().slice(0, 160); } catch (e) { /* 没有日志 */ }
				new Notice(`🤖 后台会话${sig ? "被停掉了" : `出错退出了（${code}）`}：${title}${last ? `\n${last}` : ""}`, 10000);
			});
			child.unref();
		}
		return { ok: true };
	}
	// 停掉一个无头跑着的会话（只认这次打开 Obsidian 以后发出去的）
	stopHeadless() {
		const list = [...(this.running || new Map())].map(([sid, v]) => ({ sid, ...v }));
		if (!list.length) return new Notice("现在没有在后台跑着的无头会话");
		new StopModal(this.app, list, (x) => { try { x.child.kill(); } catch (e) { new Notice(`没停掉：${e.message}`); } }).open();
	}

	// AI 解释：这一块（连同子块，不带上一次的 💡 答案和记号行）交给 claude -p，答案记成这一块下面的 💡 子块。
	// 等的时候放一行「💡 解释中…」占位；以前解释过的，旧答案先留着，新的回来了再整个换掉
	async sendToExplain(editor, file) {
		if (!this.desktopOnly()) return;
		file = file || this.app.workspace.getActiveFile();
		if (!file) return new Notice("没找到这一块在哪篇笔记里");
		const lines = editor.getValue().split("\n");
		const starts = this.pickedStarts(editor);
		if (starts && starts.length > 1) return new Notice("一次解释一块：把光标放在那一块上，不要选中好几块");
		const g = starts ? this.grabAt(lines, starts[0]) : this.grab(editor);
		if (!g) return;
		if (!g.title) return new Notice("这一块是空的");
		if (EXPLAIN_RE.test(g.raw)) return new Notice("这一块就是解释。把光标放在它上面那一块再发");
		// 发过去的字：这一行 + 子项，去掉记号行和上一次的 💡 子块
		const kids = [];
		for (let i = 0, skip = false; i < g.kids.length; i++) {
			const l = g.kids[i], top = !isBlank(l) && indentWidth(l) === 0;
			if (top) skip = EXPLAIN_RE.test(l);
			if (!skip && !MARK_LINE_RE.test(l)) kids.push(l);
		}
		const prompt = explainPrompt([g.title, ...kids].join("\n").trim());
		this.cue("DOING");
		// 占位：还没解释过的才放（解释过的旧答案就是占位）
		if (!explainSpan(lines, g)) {
			const at = kidInsertAt(lines, g), wait = `${kidIndent(lines, g)}- ${EXPLAIN_WAIT}`;
			editor.replaceRange(at >= lines.length ? `\n${wait}` : `${wait}\n`, at >= lines.length ? { line: lines.length - 1, ch: lines[lines.length - 1].length } : { line: at, ch: 0 });
		}
		new Notice(`💡 在问 AI：${g.title.slice(0, 24)}`);
		const r = await this.askClaude(prompt, (this.settings.explainModel || DEFAULTS.explainModel).trim());
		const put = await this.putExplain(file, g, r.ok ? r.text : null);
		if (!r.ok) return new Notice(`💡 没解释成：${r.err.slice(0, 160)}`, 10000);
		if (put) return new Notice(`💡 解释好了：${g.title.slice(0, 24)}`);
		try { await navigator.clipboard.writeText(explainLines(r.text, "").join("\n")); } catch (e) { /* 剪贴板用不了 */ }
		new Notice("💡 解释好了，但那一块已经找不到了（被改过或者挪走了）。答案放进了剪贴板", 10000);
	}
	// 问 claude -p 一句，只要它的回答：不存会话、不带工具、不读用户的设置和钩子（在临时目录里跑），所以又快又不留痕迹
	askClaude(prompt, model) {
		return new Promise((done) => {
			const os = require("os"), path = require("path");
			const env = { ...process.env, PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":") };
			const args = ["-p", "--model", model, "--output-format", "json", "--no-session-persistence", "--strict-mcp-config", "--setting-sources", "project", "--tools", "", "--system-prompt", EXPLAIN_SYSTEM];
			let child, out = "", err = "", over = false;
			const end = (x) => { if (!over) { over = true; clearTimeout(timer); done(x); } };
			const timer = setTimeout(() => { try { child && child.kill(); } catch (e) { /* 已经退出了 */ } end({ ok: false, err: `等了 ${EXPLAIN_TIMEOUT} 秒没有结果` }); }, EXPLAIN_TIMEOUT * 1000);
			try { child = require("child_process").spawn(findBin("claude"), args, { cwd: os.tmpdir(), env }); }
			catch (e) { return end({ ok: false, err: `claude 没跑起来：${e.message}` }); }
			child.stdout.on("data", (d) => (out += d));
			child.stderr.on("data", (d) => (err += d));
			child.on("error", (e) => end({ ok: false, err: `claude 没跑起来：${e.message}` }));
			child.on("close", (code) => {
				let d;
				try { d = JSON.parse(out); } catch (e) { return end({ ok: false, err: (err || out || `claude 退出码 ${code}`).trim() }); }
				if (d.is_error || !String(d.result || "").trim()) return end({ ok: false, err: String(d.result || "claude 没有回答") });
				end({ ok: true, text: String(d.result) });
			});
			child.stdin.end(prompt);
		});
	}
	// 把答案写回那一块下面（text = null：没解释成，只把占位行拿掉）。那篇笔记还开着就改编辑器（⌘Z 能撤回），没开着就直接改文件。
	// 等答案这段时间笔记可能被改过：按那一行原来的字重新找这一块，找不到返回 false
	async putExplain(file, g, text) {
		const edit = (lines) => {
			let at = -1;
			lines.forEach((l, i) => { if (l === g.raw && (at < 0 || Math.abs(i - g.start) < Math.abs(at - g.start))) at = i; });
			const b = at < 0 ? null : this.blockAt(lines, at);
			if (!b || b.start !== at) return null;
			const span = explainSpan(lines, b);
			const waiting = span && span[0] === span[1] && lines[span[0]].trim().replace(/^[-*+]\s+/, "") === EXPLAIN_WAIT;
			if (text === null) return waiting ? { from: span[0], to: span[1], put: [] } : { from: 0, to: -1, put: [] };
			const indent = span ? lines[span[0]].match(/^[ \t]*/)[0] : kidIndent(lines, b);
			const put = explainLines(text, indent);
			if (!put.length) return waiting ? { from: span[0], to: span[1], put: [] } : null;
			if (span) return { from: span[0], to: span[1], put };
			const ins = kidInsertAt(lines, b);
			return { from: ins, to: ins - 1, put };
		};
		let leaf = null;
		this.app.workspace.iterateAllLeaves((l) => { if (!leaf && l.view && l.view.file && l.view.file.path === file.path && l.view.editor) leaf = l; });
		if (leaf) {
			const ed = leaf.view.editor, lines = ed.getValue().split("\n"), c = edit(lines);
			if (!c) return false;
			if (c.to < c.from && !c.put.length) return true;
			const next = [...lines.slice(0, c.from), ...c.put, ...lines.slice(c.to + 1)].join("\n");
			const ch = diffChange(lines.join("\n"), next);
			if (ch) ed.transaction({ changes: [ch] });
			return true;
		}
		let ok = false;
		await this.app.vault.process(file, (data) => {
			const lines = data.split("\n"), c = edit(lines);
			if (!c) return data;
			ok = true;
			return [...lines.slice(0, c.from), ...c.put, ...lines.slice(c.to + 1)].join("\n");
		});
		return ok;
	}

	// 触发 Claudian 的 Inline edit：把整块（连同子项）选中，再叫它的命令
	sendToClaudian(editor) {
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) return new Notice("光标不在列表项里");
		if (!this.app.commands.commands["realclaudian:inline-edit"]) return new Notice("没找到 Claudian 的 Inline edit 命令（插件没开？）");
		editor.setSelection({ line: b.start, ch: 0 }, { line: b.end, ch: lines[b.end].length });
		this.cue("DOING");
		this.app.commands.executeCommandById("realclaudian:inline-edit");
	}

	// 发到 MD Flow：选一个模板 → 这一块写进中转笔记 → 打开那篇笔记和 MD Flow 的面板
	sendToMdflow(editor, file) {
		if (!this.desktopOnly()) return;
		const g = this.grab(editor);
		if (!g) return;
		const md = this.app.plugins.plugins["mdflow-local"] || this.app.plugins.plugins["mdflow"];
		const rs = md && md.redNoteSettings;
		if (!md || !rs || typeof rs.getTemplates !== "function") return new Notice("没找到 MD Flow 插件");
		const cur = (rs.getSettings && rs.getSettings().templateId) || "";
		(this.picker = new TemplateModal(this.app, rs.getTemplates(), cur, async (tpl) => {
			try {
				const path = (this.settings.mdflowNote || DEFAULTS.mdflowNote).replace(/^\/+/, "").replace(/(\.md)?$/, ".md");
				const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
				if (dir && !this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir).catch(() => {});
				const text = mdflowText(g.block) + (file ? `\n<!-- 来自 [[${file.basename}]] -->\n` : "");
				let note = this.app.vault.getAbstractFileByPath(path);
				if (note) await this.app.vault.modify(note, text); else note = await this.app.vault.create(path, text);
				if (tpl.id !== cur) await rs.update({ templateId: tpl.id });
				await this.app.workspace.getLeaf("tab").openFile(note);
				if (typeof md.activateView === "function") await md.activateView();
				this.cue("DOING");
				new Notice(`🖼 已发到 MD Flow（${tpl.name}）：${g.title.slice(0, 24)}`);
			} catch (e) {
				console.error("[done-to-top] 发到 MD Flow 失败", e);
				new Notice("发到 MD Flow 失败。详情见控制台");
			}
		})).open();
	}

	// 发到 macOS 日历：标题是这一行的正文，备注是子项和回到这篇笔记的链接
	async sendToCalendar(editor, file) {
		if (!this.desktopOnly()) return;
		const g = this.grab(editor);
		if (!g) return;
		const when = whenOf(g.block, file && file.basename);
		const r = await execFile("/usr/bin/osascript", ["-e", calendarScript({ title: g.title, notes: this.notesOf(g, file), when, calendar: this.settings.calendar })]);
		if (!r.ok) { console.error("[done-to-top] 发到日历失败", r.err); return new Notice(`没能写进日历${/-1743|not allowed|不允许/.test(r.err) ? "：先在「系统设置 → 隐私与安全性 → 自动化」里允许 Obsidian 控制日历" : "。详情见控制台"}`); }
		this.cue("DONE");
		const hm = (t) => `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
		new Notice(`📅 已建事件（${r.out || "日历"}）：${when.date.getMonth() + 1}/${when.date.getDate()} ${when.start === null ? "全天" : `${hm(when.start)}–${hm(when.end)}`} ${g.title.slice(0, 24)}`);
	}

	// 发到 macOS 提醒事项
	async sendToReminders(editor, file) {
		if (!this.desktopOnly()) return;
		const g = this.grab(editor);
		if (!g) return;
		const when = whenOf(g.block, file && file.basename);
		const r = await execFile("/usr/bin/osascript", ["-e", remindersScript({ title: g.title, notes: this.notesOf(g, file), when, list: this.settings.remindersList, dated: when.dated })]);
		if (!r.ok) { console.error("[done-to-top] 发到提醒事项失败", r.err); return new Notice(`没能写进提醒事项${/-1743|not allowed|不允许/.test(r.err) ? "：先在「系统设置 → 隐私与安全性 → 自动化」里允许 Obsidian 控制提醒事项" : "。详情见控制台"}`); }
		this.cue("DONE");
		const day = `${when.date.getMonth() + 1}/${when.date.getDate()}`;
		const due = when.start !== null ? `${day} ${pad(Math.floor(when.start / 60) % 24)}:${pad(when.start % 60)}${when.start >= 1440 ? "（次日）" : ""} ` : when.dated ? `${day} ` : "";
		new Notice(`☑️ 已加到提醒事项（${r.out || "默认列表"}）：${due}${g.title.slice(0, 24)}`);
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
		this.cue("DONE");
		const label = orig[0].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").slice(0, 24);
		new Notice(`➡️ 已发送到明天（${to.name}）：${label}${orig.length > 1 ? `（含 ${orig.length - 1} 行子项）` : ""}`);
	}

	// 发到 X：交给 NoteTweet 插件的发推编辑框，预填这一块（连同子项，见 tweetText）；超过一条的长度 NoteTweet 会自动拆成线程。
	// 这里不直接发，发不发、发哪个账号在编辑框里定。NoteTweet 的编辑框只认「当前选中的文字」当预填，借它一下 currentSelection
	async sendToTwitter(editor) {
		const nt = this.app.plugins.plugins["notetweet"];
		if (!nt || typeof nt.composeAndPost !== "function") return new Notice("要先装好并启用 NoteTweet 插件");
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) return new Notice("光标不在列表项里");
		const text = tweetText(lines.slice(b.start, b.end + 1));
		if (!text) return new Notice("这一块是空的");
		const own = Object.prototype.hasOwnProperty.call(nt, "currentSelection"), orig = nt.currentSelection;
		nt.currentSelection = () => text;
		let shown;
		try { shown = nt.composeAndPost(); } finally { if (own) nt.currentSelection = orig; else delete nt.currentSelection; }
		this.cue("DOING");
		await shown;
	}

	// 光标所在的列表项（光标在续行/空行时向上找）连同子项。
	// 单独占一行的块 ID（「^q-r7d4」这类，顶格写在卡片下面）也算在块里：这一项自己的、子项的都带上
	blockAt(lines, cursorLine) {
		let start = cursorLine;
		while (start >= 0 && !BULLET_RE.test(lines[start])) start--;
		if (start < 0 || start < topInsertLine(lines) || SEP_RE.test(lines[start])) return null;
		const baseIndent = indentWidth(lines[start]);
		let end = start;
		for (let i = start + 1; i < lines.length; i++) {
			if (isBlank(lines[i]) || indentWidth(lines[i]) > baseIndent || ID_LINE_RE.test(lines[i])) end = i;
			else break;
		}
		while (end > start && isBlank(lines[end])) end--;
		if (end > start && this.idBelongsAbove(lines, start, end, baseIndent)) end--;
		while (end > start && isBlank(lines[end])) end--;
		return { start, end, baseIndent };
	}

	// 块末尾那一行块 ID 是不是上一级的：上一级是 #card 多行卡片（这一项连同子项是一张卡，ID 写在整块后面），
	// 而这一块正好是它最后一个子项、自己又不是 #card —— 这个 ID 是那张卡的，留在原处
	idBelongsAbove(lines, start, end, baseIndent) {
		if (!ID_LINE_RE.test(lines[end]) || indentWidth(lines[end]) >= baseIndent) return false;
		if (baseIndent === 0 || CARD_TAG_RE.test(lines[start])) return false;
		// 块后面第一行真正的内容有多深：比某一级浅或一样，说明那一级也在这里结束
		let after = -1;
		for (let i = end + 1; i < lines.length; i++) {
			if (isBlank(lines[i]) || ID_LINE_RE.test(lines[i])) continue;
			after = indentWidth(lines[i]);
			break;
		}
		let level = baseIndent;
		for (let i = start - 1; i >= 0 && level > 0; i--) {
			if (isBlank(lines[i]) || !BULLET_RE.test(lines[i]) && !ITEM_RE.test(lines[i])) continue;
			const w = indentWidth(lines[i]);
			if (w >= level) continue;
			level = w;                               // 往上一级
			if (after > w) return false;             // 这一级后面还有子项，卡片没在这里结束
			if (CARD_TAG_RE.test(lines[i])) return true;
		}
		return false;
	}

	run(editor, markAsDone) {
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) {
			new Notice("光标不在列表项里");
			return;
		}
		const { start, end, baseIndent } = b;

		// （可选）标记 DONE，并把整块提到顶层缩进
		const block = lines.slice(start, end + 1);
		if (markAsDone) block[0] = mark(block[0], "DONE");
		const moved = block.map((l) => (isBlank(l) ? "" : dedent(l, baseIndent)));

		// 一次事务（一次 ⌘Z 撤销）里两处小改动：顶部插进去、原处删掉。中间那段一个字不碰——
		// 以前是把「页首到这一块」整段替换，中间折叠着的块（DONE 区）会全部展开，页面高度一变，光标就不在原来的地方了
		const insertAt = topInsertLine(lines);
		if (start < insertAt) return;
		const changes = start === insertAt
			? [{ from: { line: start, ch: 0 }, to: { line: end, ch: lines[end].length }, text: moved.join("\n") }]
			: [{ from: { line: insertAt, ch: 0 }, to: { line: insertAt, ch: 0 }, text: moved.join("\n") + "\n" },
				{ from: { line: start - 1, ch: lines[start - 1].length }, to: { line: end, ch: lines[end].length }, text: "" }];
		if (start === insertAt && moved.join("\n") === block.join("\n")) return;   // 已经在最上面，也不用改状态
		// 光标落到原位置的下一项，方便连续处理（上面多了几行、这里少了几行，下一项的行号正好没变）
		const next = Math.min(end + 1, lines.length - 1);
		const nextLen = (next === end + 1 ? lines[next] : start === insertAt ? moved[moved.length - 1] : lines[start - 1] || "").length;
		this.cue("DONE", block[0] !== lines[start] ? [block[0]] : []);   // 顶上是 DONE 栏：挪上去就是 DONE 那一声；⌘⇧D 顺带改了状态的，这一声就顶了螺旋日程那一声
		this.keepInPlace(editor, start, next, () => editor.transaction({ changes, selection: { from: { line: next, ch: nextLen } } }));
	}

	// 做一次改动，做完以后让第 after 行出现在屏幕上第 before 行原来的高度：页面不跳，眼睛不用重新找位置。
	// 第 before 行本来就不在屏幕上、或者不是 CodeMirror 6 的编辑器，就只做改动
	keepInPlace(editor, before, after, change) {
		const cm = editor.cm;
		let offset = null;
		try {
			if (cm && cm.coordsAtPos && cm.scrollDOM) {
				const c = cm.coordsAtPos(editor.posToOffset({ line: before, ch: 0 })), box = cm.scrollDOM.getBoundingClientRect();
				if (c && c.top >= box.top && c.bottom <= box.bottom) offset = c.top - box.top;
			}
		} catch (e) { /* 量不到就算了 */ }
		change();
		if (offset === null) return;
		try {
			const { EditorView } = require("@codemirror/view");
			const line = Math.min(after, editor.lineCount() - 1);
			cm.dispatch({ effects: EditorView.scrollIntoView(editor.posToOffset({ line, ch: 0 }), { y: "start", yMargin: offset }) });
		} catch (e) { /* 滚不了就留在 CodeMirror 自己定的位置 */ }
	}

	// 跳到某一区的第一块（光标放在那一行末尾，那一行滚到屏幕上方）。DOING / TODO 只在 DONE 栏后面找；
	// DONE：DONE 栏藏着的话先把隐藏关掉（和命令「隐藏 / 显示日记的 DONE 区」是同一个开关），再跳到栏里第一块
	async jumpTo(editor, where) {
		let line;
		if (where === "END") line = editor.lastLine();
		else {
			const { head, blocks } = parse(editor.getValue());
			const end = doneZoneEnd(blocks);
			if (where === "DONE") {
				if (this.settings.hideDone) {
					this.settings.hideDone = false;
					await this.saveData(this.settings);
					this.refreshHideDone();
				}
				if (end === 0) new Notice("DONE 栏是空的");
				line = blocks.length ? blocks[0].start : head.length;
			} else {
				const b = blocks.slice(end >= 0 ? end + 1 : 0).find((x) => x.zone === where);
				if (!b) return new Notice(`这篇里没有 ${where} 区`);
				line = b.start;
			}
		}
		line = Math.min(line, editor.lastLine());
		editor.setCursor({ line, ch: editor.getLine(line).length });
		try {
			const { EditorView } = require("@codemirror/view");
			editor.cm.dispatch({ effects: EditorView.scrollIntoView(editor.posToOffset({ line, ch: 0 }), { y: where === "END" ? "center" : "start", yMargin: 60 }) });
		} catch (e) { editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true); }
		editor.focus();
	}

	// 开关变了：让每个打开着的编辑器重新算一遍要藏的范围
	refreshHideDone() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			const cm = leaf.view && leaf.view.editor && leaf.view.editor.cm;
			if (cm && cm.dispatch) cm.dispatch({ effects: this.hideDone.refresh.of(null) });
		});
	}

	moveTo(editor, zone) {
		const lines = editor.getValue().split("\n");
		const b = this.blockAt(lines, editor.getCursor().line);
		if (!b) {
			new Notice("光标不在列表项里");
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

	// 只把 DONE 栏（正文第一条「- ---」之前）和 DONE 块里带子项的顶格块折起来，其它全部展开。
	// 日记整理（journal-tidy）整理完也调这个
	foldDone(view) {
		const mode = view && view.currentMode;
		if (!mode || typeof mode.applyFoldInfo !== "function" || !view.editor) return false;
		const { blocks } = parse(view.editor.getValue());
		const end = doneZoneEnd(blocks);
		const folds = [];
		// 属性栏原来是收起的就保持收起
		const prev = typeof mode.getFoldInfo === "function" ? mode.getFoldInfo() : null;
		const fm = prev && prev.folds && prev.folds.find((f) => f.from === 0);
		if (fm) folds.push(fm);
		blocks.forEach((b, i) => {
			if (b.sep || !(i < end || b.zone === "DONE")) return;
			// 顶格的块 ID 那一行不在 Obsidian 的折叠范围里：只折到它前面
			const ls = trimBlock(b.lines);
			const cut = ls.findIndex((l, k) => k > 0 && ID_LINE_RE.test(l) && !/^\s/.test(l));
			let n = cut < 0 ? ls.length : cut;
			while (n > 1 && isBlank(ls[n - 1])) n--;
			if (n > 1) folds.push({ from: b.start, to: b.start + n - 1 });
		});
		mode.applyFoldInfo({ folds, lines: view.editor.lineCount() });
		return true;
	}

	async organize(editor, ctx) {
		const file = this.app.workspace.activeEditor?.file ?? this.app.workspace.getActiveFile();
		const moved = await this.moveDayItems(file, editor.getValue());
		const res = organize(moved.length ? dropBlocks(editor.getValue(), moved.map((m) => m.orig)) : editor.getValue());
		const changed = applyText(editor, res.text);
		// 整理的是日记才折：只收起 DONE 区，剩下的展开
		if (file && JOURNAL_NAME_RE.test(file.basename)) this.foldDone(ctx && ctx.currentMode ? ctx : this.app.workspace.activeEditor);
		const c = res.counts;
		const days = moved.length ? `\n搬到以后的日记：${this.movedSummary(moved)}` : "";
		new Notice(changed ? `已整理：DONE ${c.DONE} · DOING ${c.DOING} · TODO ${c.TODO}${c.LINK ? ` · 链接 ${c.LINK}` : ""}${c.inner ? `\n块内归位 ${c.inner} 处` : ""}${days}` : "已经是整理好的样子");
	}
};
module.exports.core = core;
