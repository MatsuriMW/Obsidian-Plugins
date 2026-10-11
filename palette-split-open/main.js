// Better Command Palette 文件搜索：⌘⌥↵ 在右侧新拆分视图打开（Open in split view）
//   · 分栏上限 3 栏：已经有 3 栏时不再拆分，改在最右边那一栏开新标签页
//   · 不改 Better Command Palette 本身（它更新会覆盖），在它的面板打开时给这个面板加按键和底部提示
//   · 键位和 Obsidian 自带快速切换器的「在右侧打开」一样
//   · 没有搜索结果时什么都不做（和 ⇧↵ 一样），不会把输入框的字当成新文件名去建文件；新建只用 ⌘↵
//   · 打开逻辑借面板自己的：调用期间把 workspace.openLinkText 的 newLeaf 换成 "split"（默认就是向右拆分）
// 文件名没有匹配时，改做全库内容搜索（相当于把 ⌘⇧F 并进来）：
//   · 输入按空格拆成几个词，笔记正文里每个词都出现才算命中；含全部词的那一行做摘要，词高亮
//   · 排序：有一行同时含全部词的在前，再按出现次数，再按日记日期从新到旧
//   · 结果就是面板里的普通条目：↵ 打开并跳到那一行，⇧↵ 新标签页，⌘⌥↵ 右侧拆分；最后一条「在搜索面板中查看全部」打开 Obsidian 自带的全局搜索
//   · 全文按修改时间缓存在内存里（全库约 13 MB），启动后空闲时先读一遍，之后只读改过的文件
// Tab 递进加一层全文搜索（文件名有匹配时也能搜正文）：
//   · 第一次按 Tab：文件名结果不动，正文命中接在下面（已经在文件名结果里的笔记不重复列）；之后继续改输入，这一层一直开着，直到面板关掉
//   · 正文结果已经在面板里时再按 Tab：打开 Obsidian 自带的全局搜索（⌘⇧F）接着搜，面板关掉
// 限定范围的搜索：⌘O 打开文件搜索以后，输入框里第一个字符打一个符号，就切到对应的范围（符号本身不留在输入框里）：
//     、书签和看板   ？Chrome 书签   《 选题台   @ 小说选题台   # Wiki 条目   ！卡片
//   · 范围按常用程度排（上面这个顺序），符号按在 Mac 键盘上的顺手程度分：、不用按 Shift 最顺手，其次 ？《（Shift + 右手下排），
//     再是数字排的 # @ ！（越往左越别扭）；# 固定给 Wiki 条目
//   · 同一个键在中文 / 英文输入法下打出来的符号算同一个（！= !，、= \，？= ?，《 = <），不用切输入法；有的输入法顿号在 / 键上，所以 / 也算顿号
//   · 符号可以改：Better Command Palette 设置里每个范围一行 Scope Trigger（存在它自己的设置里），留空就是不用
//   · 没有单独的命令和快捷键了（原来的 ⌘⇧O / ⌘⇧M / ⌘⇧K / ⌘⇧U / ⌘⇧X 已删）。别的插件的入口还在：看板直达的「看板切换器」、Chrome 书签的「搜索 Chrome 书签」
//   · Wiki 条目：只在 Wiki/ 下「（wiki）」页里搜，文件名 + 正文
//   · 书签：只在书签里的笔记（含书签分组、书签文件夹里的笔记）和看板里搜，文件名 + 正文
//     看板 = 「看板直达」设置里登记的 + 所有 type: 看板 的笔记，没加书签也算；「看板直达」的看板切换器（默认 ⌥⌘K）打开的就是这个范围
//     ↵ 用看板直达的方式打开（已经开着就切过去，没开就按它的设置开新标签 / 当前标签）；⇧↵、⌘⌥↵ 照面板原来的
//     Better Command Palette 设置里多两行（存在它自己的设置里）：Bookmark Search Prefix（默认 、，在 ⌘P 面板开头输入就切到这个范围，英文输入法打 \ 也行）、
//     Bookmark Search Hotkey（默认 b，面板里按 ⌘B 切到这个范围，再按一次取消）
//   · 卡片：搜 Flashcards 插件认作卡片的块：带 #card（含 -reverse、/reverse、-reminder）的，或有挖空（==高亮== / {{c1::…}}）的；
//     规则照 Flashcards：列表项、段落、标题都算一块，引用块和代码块里的不算。没输入时按日期从新到旧列出；↵ 跳到那一块
//   · Chrome 书签：搜「Chrome 书签」插件同步过来的书签（标题、所在文件夹、网址），结果不是笔记；没输入时按 Chrome 里的顺序列出
//     那个插件的命令「搜索 Chrome 书签」打开的就是这个范围。↵ 按它的设置打开（内置浏览器或 Chrome），⌘↵ 走另一边，
//     ⌘⌥↵ 用内置浏览器在右侧拆分打开（同样最多 3 栏）；这个范围里 ⌘↵ 不新建笔记，Tab 不做事
//   · 选题 / 小说选题：分别搜「选题台」「小说选题台」看板里的条目（选题页 + 日记 / 笔记里的选题块；小说还有 小说index 里列的点子）
//     搜标题（小说选题块起过的名字也算）、主题 / 题材、状态、出处，再搜子块；没输入时还在做的排前面、新的在前。右边是状态
//     ↵ 打开选题页，或跳到日记里那一块（命中的是子块就跳到那一行）；⇧↵、⌘⌥↵ 照面板原来的。只读，不改看板和原文
//     条目的口径照 scripts/topic-board.js（两个看板共用的脚本），那边改了口径这里要跟着改
//   · 输入框前面有范围标签，点 × 或在空输入框里按 ⌫ 回到普通文件搜索
const { Plugin, Modal, MarkdownView, Notice, Setting, setIcon, getAllTags } = require("obsidian");

const PALETTE_CLS = "better-command-palette";
const HINT = "Open in split view";
const CS_HINT = "全文搜索，再按打开搜索面板";
const MAX_COLUMNS = 3;
const CONTENT_LIMIT = 50;
const JOURNAL_RE = /^日记\/(\d{4})_(\d{2})_(\d{2})\.md$/;
const SNIPPET_LEN = 90;
// 和 Journals 补丁（原 Journal Edit Mode）同一套日记命名：这些笔记直接以编辑模式打开，免得它再切模式、把光标恢复到上次的位置
const JOURNAL_NAME_RE = /^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/;
const BCP_FILE_SEARCH = "obsidian-better-command-palette:open-better-commmand-palette-file-search";
const WIKI_DIR = "Wiki/";
// 顺序 = 常用程度（底部提示和设置页也按这个排）。trigger：⌘O 之后在输入框开头打的符号（默认值，可在 Better Command Palette 设置里改）；
// board：这个范围搜哪个选题看板
const SCOPES = {
	bookmarks: { label: "书签", trigger: "、", empty: "书签和看板里没有匹配的笔记", placeholder: "在书签和看板里搜索（文件名和正文）" },
	chrome: { label: "Chrome 书签", trigger: "？", empty: "没有匹配的 Chrome 书签", placeholder: "搜索 Chrome 书签（标题、文件夹、网址）" },
	topics: { label: "选题", trigger: "《", board: "选题台", empty: "没有匹配的选题", placeholder: "搜索选题台的条目（标题、主题、状态、子块）" },
	fiction: { label: "小说选题", trigger: "@", board: "小说选题台", empty: "没有匹配的小说选题", placeholder: "搜索小说选题台的条目（标题、题材、状态、子块）" },
	wiki: { label: "Wiki 条目", trigger: "#", empty: "Wiki 里没有匹配的条目", placeholder: "在 Wiki 条目里搜索（文件名和正文）" },
	cards: { label: "卡片", trigger: "！", empty: "没有匹配的卡片", placeholder: "搜索 #card 和挖空卡片（正面、答案、文件名）" },
};
// 同一个键在中文输入法下打出来的符号 → 英文输入法下的那个；比较符号前先这样归一。
// 顿号多数输入法在 \ 键上，也有放在 / 键上的，所以 / 也归到 \
const PUNCT = { "！": "!", "＠": "@", "＃": "#", "、": "\\", "＼": "\\", "/": "\\", "？": "?", "《": "<", "》": ">", "￥": "$", "¥": "$", "％": "%", "…": "^", "＆": "&", "＊": "*", "×": "*",
	"（": "(", "）": ")", "；": ";", "：": ":", "，": ",", "。": ".", "～": "~", "·": "`", "【": "[", "】": "]", "「": "{", "」": "}", "｜": "|", "—": "-", "＝": "=", "＋": "+" };
const normPunct = (ch) => PUNCT[ch] || ch;
// 结果不是笔记的范围：不要文件名候选，也不搜正文
const VIRTUAL = new Set(["cards", "chrome", "topics", "fiction"]);
const LOADING = { cards: "正在读取卡片…", topics: "正在读取选题…", fiction: "正在读取小说选题…" };
const boardOf = (key) => (SCOPES[key] && SCOPES[key].board) || "";
const BOARD_JUMP = "board-jump";
const BOARD_SWITCHER = "board-jump:switcher";
const BCP_ID = "obsidian-better-command-palette";
const CHROME_BM = "chrome-bookmarks";
const CHROME_SEARCH = "chrome-bookmarks:search";
const CHROME_LIMIT = 100;
const TOPIC_LIMIT = 60;   // 每个看板最多列多少条
// 存在 Better Command Palette 自己的设置里的两项（它的设置页里由这个插件加出来）
const BCP_DEFAULTS = { bookmarkSearchPrefix: "、", bookmarkSearchHotkey: "b", scopeTriggers: {} };
const CARD_LIMIT = 50;
const CARD_TAG_RE = /(?:^|\s)#card(-reminder|-reverse|\/reverse)?(?![\w\-\/])/;
const CARD_TAG_ALL_RE = /(?:^|\s)#card(?:-reminder|-reverse|\/reverse)?(?![\w\-\/])/g;
const CLOZE_RE = /==[^=\n]+==|\{\{c\d+::/;
const CLOZE_SPLIT_RE = /(==[^=\n]+==|\{\{c\d+::[\s\S]*?\}\})/;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(\[.\]\s+)?/;
const ANCHOR_END_RE = /\s*\^[A-Za-z0-9-]+\s*$/;
const SYNCED_RE = /\^(q-[a-z0-9]{4}|\d{13})\s*$/;
// BCP 的文件条目：id 是路径，别名条目是「别名:路径」
const itemPath = (it) => (it.id.includes(":") ? it.id.slice(it.id.lastIndexOf(":") + 1) : it.id);
// 卡片预览去掉 Markdown 记号：[[页|别名]] → 别名，[字](网址) → 字，加粗 / 斜体记号去掉；==挖空== 留着
const plainMd = (s) => s
	.replace(/^#{1,6}\s+/, "")
	.replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
	.replace(/!?\[\[([^\]]+)\]\]/g, (m, t) => t.replace(/#\^?/, " > "))
	.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
	.replace(/(\*\*|__)(.+?)\1/g, "$2")
	.replace(/\s+/g, " ")
	.trim();

// 按 Flashcards 插件的规则找卡片：列表项（连同它的续行）、段落、标题各算一块；引用块、代码块跳过
function parseCards(text) {
	const lines = text.split("\n");
	let i = 0;
	if (lines[0] === "---") { i = 1; while (i < lines.length && lines[i] !== "---") i++; i++; }
	const units = [];
	let cur = null, fence = false;
	const indentOf = (s) => s.match(/^\s*/)[0].replace(/\t/g, "    ").length;
	for (; i < lines.length; i++) {
		const l = lines[i], t = l.trim();
		if (/^(```|~~~)/.test(t)) { fence = !fence; cur = null; continue; }
		if (fence) continue;
		if (!t) { cur = null; continue; }
		// 单独一行的块 id：挂在上一块上（Obsidian 也是这么算的），^q-xxxx 说明已同步到 Anki
		if (/^\^[A-Za-z0-9-]+$/.test(t)) { if (SYNCED_RE.test(t) && units.length) units[units.length - 1].synced = true; cur = null; continue; }
		const m = l.match(LIST_RE);
		if (m) { cur = { line: i, indent: indentOf(l), list: true, lines: [l.slice(m[0].length)] }; units.push(cur); continue; }
		if (/^#{1,6}\s/.test(t)) { cur = null; units.push({ line: i, indent: 0, lines: [t.replace(/^#+\s+/, "")] }); continue; }
		if (cur) { cur.lines.push(t); continue; }
		cur = { line: i, indent: indentOf(l), lines: [t], quote: t.startsWith(">") };
		units.push(cur);
	}
	const cards = [];
	units.forEach((u, k) => {
		if (u.quote) return;
		const raw = u.lines.join("\n");
		const bare = raw.replace(/`[^`\n]*`/g, "");
		const tag = bare.match(CARD_TAG_RE);
		if (!tag && !CLOZE_RE.test(bare)) return;
		const kind = tag ? ({ "-reverse": "反转", "/reverse": "反转", "-reminder": "提醒" }[tag[1]] || "#card") : "挖空";
		const synced = !!u.synced || u.lines.some((x) => SYNCED_RE.test(x));
		const clean = (ls) => plainMd(ls.map((x) => x.replace(ANCHOR_END_RE, "").replace(CARD_TAG_ALL_RE, "")).join(" "));
		const front = clean(u.lines);
		// 答案预览：#card 列表项的前两个子项
		const kids = [];
		if (u.list) for (let j = k + 1; j < units.length && units[j].indent > u.indent && kids.length < 2; j++) {
			if (units[j].list) kids.push(clean(units[j].lines));
		}
		cards.push({ line: u.line, kind, synced, front, answer: kids.join("；") });
	});
	return cards;
}

// ---------- 选题台 / 小说选题台的条目 ----------
// 口径照 scripts/topic-board.js 的 A（选题页）/ B（选题块）/ C（小说枢纽页）三段，只读
const TOPIC_KW = "TODO|DOING|NOW|LATER|DONE|WAITING|IN-PROGRESS|CANCELLED|CANCELED";
const TOPIC_BULLET = /^(\s*(?:[-*+]|\d+[.)])\s+)/;
const TOPIC_KEYWORD = new RegExp(`^\\s*(?:[-*+]|\\d+[.)])\\s+(?:\\[.\\]\\s+)?(${TOPIC_KW})\\s+`);
const TOPIC_CHECKBOX = /^\s*(?:[-*+]|\d+[.)])\s+\[(.)\]\s+/;
const TOPIC_HEADING_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+#{1,6}\s/;
const TOPIC_FICTION_RE = /\[\[\s*小说选题\s*(?:[|#][^\]]*)?\]\]|#小说选题(?![^\s#])/;
const TOPIC_CAT_KEYS = ["视频选题", "文章选题", "blog选题", "blog", "longform", "小说选题"];
const TOPIC_SKIP_DIRS = ["Templates/", "选题/_采访/", "已发表/"];
const TOPIC_GONE_TAGS = ["#作品入库", "#并入小说"];   // 已移进作品库 / 已并入小说页的块
const TOPIC_NAMES_FILE = "小说/.素材状态.json";       // 小说选题块起的名字（和素材库共用）
const TOPIC_DEAD = new Set(["已发表", "已废弃"]);
// 页面字段除了 frontmatter，也认 Dataview 的行内写法：顶格单独一行的 category:: [[blog]]。
// 缩进在列表项下面的（Logseq 的块属性）是那一块的字段，不算页面的
const TOPIC_INLINE_HINT = /(?:category|type|主题)::/;
const TOPIC_INLINE_RE = /^(category|type|主题|题材|状态|稿件|形式)::[ \t]*(.*)$/;
const TOPIC_BOARDS = [
	{ name: "选题台", fiction: false, links: ["文章选题", "视频选题", "blog选题", "blog"], tags: [], themeLabel: "主题", hubs: [], kidMax: 8,
		stages: ["草稿", "成稿中", "已成稿", "录制中", "已录", "已发表", "已废弃"], draftMin: "成稿中", alias: {} },
	{ name: "小说选题台", fiction: true, links: ["小说选题"], tags: ["#小说选题"], themeLabel: "题材", hubs: ["小说index"], kidMax: 60,
		stages: ["灵感", "构思", "大纲", "初稿中", "修改中", "完稿", "已发表", "已废弃"], draftMin: "初稿中",
		alias: { 草稿: "灵感", 成稿中: "初稿中", 已成稿: "完稿", 录制中: "完稿", 已录: "完稿" } },
];
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normTheme = (v) => {
	if (v == null) return "";
	return String(v).trim().replace(/^\[\[|\]\]$/g, "").replace(/^#/, "").replace(/^(?:主题|题材)\//, "").replace(/[\s#,，]+/g, "");
};
// 和 topic-board.js 的 nameKey 同一个算法：小说选题块的名字按「路径 + 标题」的哈希存
function topicNameKey(path, text) {
	const s = path + "\u0001" + ("选题|" + text).replace(/\s+/g, "").slice(0, 120);
	let a = 5381, b = 2166136261;
	for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = ((a << 5) + a + c) | 0; b = Math.imul(b ^ c, 16777619); }
	return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}
// 一个看板自己的那套写法：认哪些双链 / 标签、怎么从一行里读出标题、状态、主题
function topicTools(B) {
	const matchers = [
		...B.links.map((n) => ({ name: n, re: new RegExp(`\\[\\[\\s*${reEsc(n)}\\s*(?:[|#][^\\]]*)?\\]\\]`) })),
		...B.tags.map((t) => ({ name: t, re: new RegExp(`${reEsc(t)}(?![^\\s#])`) })),
	];
	const topicRe = new RegExp(matchers.map((m) => m.re.source).join("|"), "g");
	const themeRe = new RegExp(`#${B.themeLabel}\\/([^\\s#]+)`);
	const metaRes = [/\s*#选题\/[^\s#]+/g, new RegExp(`\\s*#${B.themeLabel}\\/[^\\s#]+`, "g"), /\s*#篇幅\/[^\s#]+/g, /\s*🧩[^\s#]+/g,
		/\s*📅\s*\d{4}-\d{2}-\d{2}/g, /\s*🛫\s*\d{4}-\d{2}-\d{2}/g, /\s*✅\s*\d{4}-\d{2}-\d{2}/g, /\s*📆[^\s:：]+[:：]\d{4}-\d{2}-\d{2}/g,
		/\s*⭐/g, /\s*📶\s*\d{1,2}/g, /\s*\[status::[^\]]*\]/g, /\s*\[due-[^:\]]+::[^\]]*\]/g];
	const stripMeta = (line) => metaRes.reduce((x, re) => x.replace(re, ""), line).trimEnd();
	const head = (t) => t.replace(TOPIC_BULLET, "").replace(/^\s*\[.\]\s*/, "").replace(new RegExp(`^\\s*(${TOPIC_KW})\\s+`), "");
	const normStatus = (v) => { v = String(v ?? "").trim(); return B.stages.includes(v) ? v : (B.alias[v] || ""); };
	return {
		matchers,
		normStatus,
		cleanChild: (line) => head(stripMeta(line)).trim(),
		cleanTitle: (line) => head(stripMeta(line)).replace(topicRe, "").replace(/^[\s\-–—:：、,，·|]+/, "").replace(/[\s\-–—:：、,，·|]+$/, "").replace(/\s{2,}/g, " ").trim(),
		themeOf: (line) => (line.match(themeRe) || [])[1] || "",
		// 任务状态优先：CANCELLED 关键字、或复选框 [-]，一律算「已废弃」
		blockStatus: (line) => {
			let v = (line.match(/#选题\/([^\s#]+)/) || [])[1] || "";
			if (!v) { const l = line.match(/\[status::\s*([^\]]*)\]/); if (l) v = l[1].trim(); }
			if (/^CANCELL?ED$/.test((line.match(TOPIC_KEYWORD) || [])[1] || "") || (line.match(TOPIC_CHECKBOX) || [])[1] === "-") return "已废弃";
			return normStatus(v) || B.stages[0];
		},
	};
}

// 和 leaf 同一个窗口里现在有几栏，以及最右边一栏的标签栏（那一栏上下又分过的，取最近用过的那格）
function columnsOf(ws, leaf) {
	const root = leaf.getRoot();
	const groups = new Set();
	ws.iterateAllLeaves((l) => { if (l.parent && l.getRoot() === root) groups.add(l.parent); });
	const boxes = [...groups].map((g) => ({ g, r: g.containerEl.getBoundingClientRect() })).filter((x) => x.r.width > 0);
	const lefts = [];
	for (const b of boxes) if (!lefts.some((x) => Math.abs(x - b.r.left) < 4)) lefts.push(b.r.left);
	const maxLeft = Math.max(...lefts);
	const recent = (g) => Math.max(0, ...g.children.map((l) => l.activeTime || 0));
	const rightmost = boxes.filter((b) => Math.abs(b.r.left - maxLeft) < 4).map((b) => b.g).sort((a, b) => recent(b) - recent(a))[0];
	return { count: lefts.length, rightmost };
}

module.exports = class PaletteSplitOpen extends Plugin {
	onload() {
		const plugin = this;
		this.textCache = new Map();   // path → { mtime, size, low, cards }
		this.pendingScope = null;
		this.app.workspace.onLayoutReady(() => { this.warmTimer = window.setTimeout(() => this.fillCache(), 8000); });
		this.register(() => window.clearTimeout(this.warmTimer));
		const orig = Modal.prototype.open;
		const patched = function (...args) {
			if (this.modalEl?.hasClass(PALETTE_CLS)) {
				plugin.patchBcpSettings();
				if (!this.__splitOpen) plugin.enhance(this);
				plugin.setScope(this, plugin.pendingScope, false);   // 每次打开面板都从只搜文件名开始（除非是范围搜索命令打开的）
				plugin.pendingScope = null;
			}
			return orig.apply(this, args);
		};
		Modal.prototype.open = patched;
		this.register(() => { if (Modal.prototype.open === patched) Modal.prototype.open = orig; });
		this.app.workspace.onLayoutReady(() => this.patchBcpSettings());
	}

	// ---------- Better Command Palette 设置页里加两行 ----------
	bcpSetting(key) {
		const bcp = this.app.plugins.plugins[BCP_ID];
		const v = bcp && bcp.settings ? bcp.settings[key] : undefined;
		return v === undefined ? BCP_DEFAULTS[key] : v;
	}

	// 不改它的文件：包一层它设置页的 display，画完以后把这两行插到同类设置后面。它重载后设置页是新的，所以每次开面板都看一眼
	patchBcpSettings() {
		const tab = ((this.app.setting && this.app.setting.pluginTabs) || []).find((t) => t.id === BCP_ID);
		if (!tab || tab.__psoPatched) return;
		const plugin = this;
		const orig = tab.display;
		tab.display = function (...args) {
			const r = orig.apply(this, args);
			try { plugin.addBcpSettings(this); } catch (e) { console.error("[palette-split-open]", e); }
			return r;
		};
		tab.__psoPatched = true;
		this.register(() => { delete tab.display; delete tab.__psoPatched; });
	}

	addBcpSettings(tab) {
		const bcp = tab.plugin;
		const el = tab.containerEl;
		const add = (anchorName, name, desc, value, save) => {
			const st = new Setting(el).setName(name).setDesc(desc)
				.addText((t) => t.setValue(value).onChange(async (v) => { save(v.trim()); await bcp.saveSettings(); }));
			const anchor = [...el.querySelectorAll(".setting-item")].find((x) => x.querySelector(".setting-item-name")?.textContent === anchorName);
			if (anchor) anchor.insertAdjacentElement("afterend", st.settingEl);
		};
		const plain = (key) => (v) => { bcp.settings[key] = v; };
		add("Tag Search Prefix", "Bookmark Search Prefix", "The prefix used to tell the palette you want to search bookmarks and boards. Leave empty to disable. (Added by Palette Enhancements)", this.bcpSetting("bookmarkSearchPrefix"), plain("bookmarkSearchPrefix"));
		add("Tag Search Hotkey", "Bookmark Search Hotkey", "The hotkey used to switch to bookmark and board search while using the command palette. Press again to go back to file search. (Added by Palette Enhancements)", this.bcpSetting("bookmarkSearchHotkey"), plain("bookmarkSearchHotkey"));
		// 每个范围一行触发符号，接在 Bookmark Search Prefix 后面
		let anchor = "Bookmark Search Prefix";
		for (const [key, sc] of Object.entries(SCOPES)) {
			const name = `Scope Trigger: ${sc.label}`;
			add(anchor, name, `Type this symbol right after the file search prefix (open file search, then type ${sc.trigger}) to search only ${sc.label}. The Chinese and English forms of the same key count as the same symbol, so the input method doesn't matter. Several symbols may be listed. Leave empty to disable. (Added by Palette Enhancements)`,
				this.triggerOf(key), (v) => { bcp.settings.scopeTriggers = Object.assign({}, bcp.settings.scopeTriggers, { [key]: v }); });
			anchor = name;
		}
	}

	// ---------- 触发符号 ----------
	// 这个范围认哪些符号（设置里改过就用改过的，留空 = 不用）
	triggerOf(key) {
		const map = this.bcpSetting("scopeTriggers") || {};
		return key in map ? String(map[key] || "") : SCOPES[key].trigger;
	}

	// ch 是哪个范围的触发符号；中英文标点先归一再比
	triggerScope(ch) {
		if (!ch || !ch.trim()) return null;
		const n = normPunct(ch);
		return Object.keys(SCOPES).find((key) => [...this.triggerOf(key)].some((c) => c.trim() && normPunct(c) === n)) || null;
	}

	enhance(palette) {
		const plugin = this;
		palette.__splitOpen = true;
		const isFiles = () => palette.currentAdapter && palette.currentAdapter === palette.fileAdapter;

		palette.scope.register(["Mod", "Alt"], "Enter", (evt) => {
			if (!isFiles()) return;
			evt.preventDefault();
			const list = palette.currentSuggestions || [];
			const item = list[palette.chooser?.selectedItem ?? 0];
			if (item && palette.__scope === "chrome") { palette.close(evt); this.openBookmark(item, evt, true); }
			else if (item) this.openInSplit(palette, item, evt);
			return false;
		});

		// Tab：没开全文层就开；正文结果已经在面板里了就交给 Obsidian 自带的全局搜索
		palette.scope.register([], "Tab", (evt) => {
			if (!isFiles()) return;
			evt.preventDefault();
			const q = this.queryOf(palette);
			if (!q || palette.__scope === "chrome") return false;
			if (palette.__csShown || palette.__scope === "cards" || boardOf(palette.__scope)) {
				palette.close();
				this.openGlobalSearch(this.globalQuery(palette, q));
			} else {
				palette.__csLayer = true;
				this.scheduleContentSearch(palette, 0);
			}
			return false;
		});

		// 底部提示：插在「Open file in new pane」后面；面板切模式时会重建提示，所以包一层
		const origUpdate = palette.updateInstructions;
		palette.updateInstructions = function (...args) {
			const r = origUpdate.apply(this, args);
			if (isFiles()) {
				const box = this.modalEl.querySelector(".prompt-instructions");
				if (box && palette.__scope === "chrome") plugin.chromeHints(box);
				else if (box && !box.querySelector(".pso-hint")) {
					const item = box.createDiv({ cls: "prompt-instruction pso-hint" });
					item.createSpan({ cls: "prompt-instruction-command", text: "⌘ ⌥ ↵" });
					item.createSpan({ text: HINT });
					box.insertBefore(item, box.children[2] || null);
					const tab = box.createDiv({ cls: "prompt-instruction pso-hint" });
					tab.createSpan({ cls: "prompt-instruction-command", text: "⇥" });
					tab.createSpan({ text: CS_HINT });
					box.insertBefore(tab, item.nextSibling);
					// 各范围的触发符号（每个范围只显示第一个）
					const trig = Object.keys(SCOPES).map((k) => ({ k, t: [...plugin.triggerOf(k)].find((c) => c.trim()) })).filter((x) => x.t);
					if (trig.length) {
						const sc = box.createDiv({ cls: "prompt-instruction pso-hint" });
						sc.createSpan({ cls: "prompt-instruction-command", text: trig.map((x) => x.t).join(" ") });
						sc.createSpan({ text: trig.map((x) => SCOPES[x.k].label).join(" / ") });
						box.insertBefore(sc, tab.nextSibling);
					}
				}
			}
			plugin.renderScope(this);
			return r;
		};

		// 范围标签：放在输入框前面
		const chip = createDiv({ cls: "pso-scope" });
		chip.createSpan({ cls: "pso-scope-label" });
		const x = chip.createSpan({ cls: "pso-scope-x", text: "×" });
		x.addEventListener("mousedown", (e) => { e.preventDefault(); this.setScope(palette, null); });
		palette.inputEl.parentElement.insertBefore(chip, palette.inputEl);
		palette.__scopeEl = chip;

		// 面板里按别的入口的快捷键（看板切换器、⌘B、「搜索 Chrome 书签」）：切到那个范围，已经是这个范围就取消
		for (const key of Object.keys(SCOPES)) {
			for (const h of this.scopeHotkeys(key)) {
				palette.scope.register(h.modifiers, h.key, (evt) => {
					evt.preventDefault();
					this.setScope(palette, palette.__scope === key ? null : key);
					return false;
				});
			}
		}
		// 文件前缀后面第一个字符是某个范围的触发符号：把符号拿掉，切到那个范围。
		// 另外保留旧入口：整个输入以「书签前缀」（Bookmark Search Prefix）开头，换成文件前缀并切到书签范围（单个符号的前缀同样不分中英文）。
		// 挂在面板上、捕获阶段，赶在面板自己处理输入之前；中文标点有的走输入法的组字，所以组字结束时也看一眼
		const onTyped = (evt) => {
			if (evt.target !== palette.inputEl || evt.isComposing) return;
			const filePrefix = palette.plugin.settings.fileSearchPrefix;
			const p = this.bcpSetting("bookmarkSearchPrefix");
			const v = palette.inputEl.value;
			let key = null, cut = 0;
			if (v.startsWith(filePrefix)) { key = this.triggerScope(v.charAt(filePrefix.length)); cut = filePrefix.length + 1; }
			else if (p && p !== filePrefix && (v.startsWith(p) || (p.length === 1 && v && normPunct(v.charAt(0)) === normPunct(p)))) { key = "bookmarks"; cut = p.length; }
			if (!key) return;
			evt.stopPropagation();
			const caret = palette.inputEl.selectionStart ?? v.length;
			palette.inputEl.value = filePrefix + v.slice(cut);
			const at = Math.max(filePrefix.length, caret - cut + filePrefix.length);
			palette.inputEl.setSelectionRange(at, at);
			this.setScope(palette, key);
		};
		palette.modalEl.addEventListener("input", onTyped, true);
		palette.modalEl.addEventListener("compositionend", onTyped, true);
		// 空输入框里按 ⌫：先退出范围，不删前缀、不关面板
		palette.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key !== "Backspace" || !palette.__scope || evt.metaKey || evt.altKey) return;
			if (!isFiles() || this.queryOf(palette) !== "" || palette.inputEl.selectionStart !== palette.inputEl.value.length) return;
			evt.preventDefault();
			evt.stopPropagation();
			this.setScope(palette, null);
		});

		// 文件名候选只留范围里的笔记；卡片和 Chrome 书签范围不要文件名候选（结果不是笔记）
		const adapter = palette.fileAdapter;
		const origSorted = adapter.getSortedItems;
		adapter.getSortedItems = function (...args) {
			const items = origSorted.apply(this, args);
			if (!palette.__scope) return items;
			if (VIRTUAL.has(palette.__scope)) return [];
			return items.filter((it) => palette.__scopePaths.has(itemPath(it)));
		};

		palette.updateInstructions();
		this.hookContentSearch(palette, isFiles);
	}

	// ---------- 限定范围 ----------
	scopeHotkeys(key) {
		const hm = this.app.hotkeyManager;
		const of = (id) => (hm.getHotkeys(id) || hm.getDefaultHotkeys(id) || []).filter((h) => h && h.key);
		const out = [];
		// 书签范围的两个入口：看板直达的「看板切换器」，和 Better Command Palette 设置里的 Bookmark Search Hotkey（⌘ + 那个键）
		if (key === "bookmarks") {
			out.push(...of(BOARD_SWITCHER));
			const k = this.bcpSetting("bookmarkSearchHotkey");
			if (k) out.push({ modifiers: ["Mod"], key: k });
		}
		// Chrome 书签范围：「Chrome 书签」插件的「搜索 Chrome 书签」命令要是配了键，也算
		if (key === "chrome") out.push(...of(CHROME_SEARCH));
		const seen = new Set();
		return out.filter((h) => { const id = [...h.modifiers].sort().join("+") + "+" + h.key.toLowerCase(); return seen.has(id) ? false : seen.add(id); });
	}

	openScoped(key) {
		if (!this.app.commands.findCommand(BCP_FILE_SEARCH)) { new Notice("需要先启用 Better Command Palette"); return; }
		this.pendingScope = key;
		try { this.app.commands.executeCommandById(BCP_FILE_SEARCH); } finally { this.pendingScope = null; }
	}

	scopePaths(key) {
		const files = this.app.vault.getMarkdownFiles();
		if (key === "wiki") return new Set(files.filter((f) => f.path.startsWith(WIKI_DIR) && f.basename.endsWith("（wiki）")).map((f) => f.path));
		if (key === "bookmarks") {
			const out = new Set();
			const bm = this.app.internalPlugins.getPluginById("bookmarks");
			const walk = (items) => {
				for (const it of items || []) {
					if (it.type === "file" && it.path) out.add(it.path);
					else if (it.type === "folder" && it.path) files.forEach((f) => { if (f.path.startsWith(it.path + "/")) out.add(f.path); });
					else if (it.type === "group") walk(it.items);
				}
			};
			walk(bm && bm.enabled && bm.instance ? bm.instance.items : []);
			// 看板也算：看板直达里登记的 + type: 看板 的笔记（没加书签的也能搜到）
			const bj = this.app.plugins.plugins[BOARD_JUMP];
			for (const b of (bj && bj.allBoards ? bj.allBoards() : [])) {
				const f = this.app.vault.getAbstractFileByPath(b.path) || this.app.metadataCache.getFirstLinkpathDest(String(b.path).replace(/\.md$/, ""), "");
				if (f && f.path) out.add(f.path);
			}
			for (const f of files) if (String(this.app.metadataCache.getFileCache(f)?.frontmatter?.type) === "看板") out.add(f.path);
			return out;
		}
		return null;
	}

	// refresh = false：面板还没打开（open 之前调用），交给面板自己的 onOpen 去搜
	setScope(palette, key, refresh = true) {
		key = key && SCOPES[key] ? key : null;
		palette.__scope = key;
		palette.__scopePaths = key ? this.scopePaths(key) : null;
		palette.__csLayer = !!key && !VIRTUAL.has(key);   // Wiki 和书签：文件名和正文一起搜
		palette.__csShown = false;
		palette.__csEmpty = key ? SCOPES[key].empty : (palette.fileAdapter.emptyStateText || "No matching files.");
		if (boardOf(key)) this.topicRows = null;   // 每次进选题的范围重新收集一遍
		if (refresh) palette.emptyStateText = LOADING[key] || palette.__csEmpty;
		palette.setPlaceholder(key ? SCOPES[key].placeholder : "Select a command");
		palette.updateInstructions();   // 底部提示跟着范围换（Chrome 书签范围有自己的一套），顺带刷新范围标签
		if (!refresh) return;
		const prefix = palette.plugin.settings.fileSearchPrefix;
		const q = palette.inputEl.value;
		if (!q.startsWith(prefix)) palette.inputEl.value = prefix + palette.currentAdapter.cleanQuery(q);
		palette.lastQuery = null;   // 输入没变也让面板重新搜一遍
		palette.currentSuggestions = [];
		palette.updateSuggestions();
		palette.inputEl.focus();
	}

	renderScope(palette) {
		const chip = palette.__scopeEl;
		if (!chip) return;
		const on = !!palette.__scope && palette.currentAdapter === palette.fileAdapter;
		chip.toggleClass("is-shown", on);
		if (on) chip.querySelector(".pso-scope-label").setText(SCOPES[palette.__scope].label);
	}

	// ---------- 文件名没匹配 → 全库内容搜索 ----------
	hookContentSearch(palette, isFiles) {
		const plugin = this;
		const adapter = palette.fileAdapter;
		palette.__csToken = 0;

		const origReceived = palette.receivedSuggestions;
		palette.receivedSuggestions = function (...args) {
			origReceived.apply(this, args);
			if (!isFiles()) return;
			if (palette.__scope === "cards") plugin.scheduleCardSearch(palette);
			else if (palette.__scope === "chrome") plugin.chromeSearch(palette);
			else if (boardOf(palette.__scope)) plugin.scheduleTopicSearch(palette);
			else plugin.scheduleContentSearch(palette);
		};

		const origRender = adapter.renderSuggestion;
		adapter.renderSuggestion = function (item, content, aux) {
			if (!item || !item.__cs) return origRender.call(this, item, content, aux);
			if (item.__cs.card) plugin.renderCard(item, content, aux);
			else if (item.__cs.chrome) plugin.renderBookmark(item, content, aux);
			else if (item.__cs.topic) plugin.renderTopic(item, content, aux);
			else plugin.renderHit(item, content, aux);
		};

		const origChoose = adapter.onChooseSuggestion;
		adapter.onChooseSuggestion = function (item, evt) {
			// Chrome 书签范围：结果不是笔记，全部自己接。⌘↵ 面板传过来的是 null（本来是「用输入的字新建笔记」），这里改成打开选中的那条
			if (palette.__scope === "chrome") return plugin.openBookmark(item || (palette.currentSuggestions || [])[palette.chooser?.selectedItem ?? 0], evt);
			if (item && !item.__cs && palette.__scope === "bookmarks" && plugin.openBoard(item, evt)) return;
			if (!item || !item.__cs) return origChoose.call(this, item, evt);
			return plugin.openHit(palette, item, evt);
		};
	}

	// 书签范围里直接按 ↵：交给看板直达（已经开着就切过去）。带修饰键的（新标签页、拆分、新建）照面板原来的
	openBoard(item, evt) {
		if (evt && (evt.shiftKey || evt.metaKey || evt.ctrlKey || evt.altKey)) return false;
		const bj = this.app.plugins.plugins[BOARD_JUMP];
		if (!bj || !bj.openBoard) return false;
		bj.openBoard({ path: itemPath(item) });
		return true;
	}

	queryOf(palette) {
		return palette.fileAdapter.cleanQuery((palette.inputEl.value || "").trim()).trim();
	}

	// 文件名没匹配时自动搜正文；按过 Tab（__csLayer）时文件名有匹配也搜，正文结果接在文件名结果下面
	scheduleContentSearch(palette, delay = 200) {
		window.clearTimeout(palette.__csTimer);
		const token = ++palette.__csToken;
		const q = this.queryOf(palette);
		const files = (palette.currentSuggestions || []).filter((x) => !x.__cs);
		palette.__csShown = false;
		if (palette.__csEmpty === undefined) palette.__csEmpty = palette.emptyStateText;
		if (!q || (files.length && !palette.__csLayer)) { palette.emptyStateText = palette.__csEmpty; return; }
		if (!files.length) {
			palette.emptyStateText = `文件名里没有「${q}」，正在全文搜索…`;
			palette.updateSuggestions();
		}
		palette.__csTimer = window.setTimeout(async () => {
			const hits = await this.contentSearch(q, new Set(files.map((x) => x.id)), palette.__scopePaths);
			if (token !== palette.__csToken || !palette.modalEl.isConnected) return;   // 期间又改了输入，或面板关了
			const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
			if (!Item) return;
			const found = hits.map((h) => Object.assign(new Item(h.path, h.path, []), { __cs: h }));
			if (found.length && files.length) found[0].__cs.section = q;   // 文件名结果下面的第一条正文结果带一个小标题
			const items = [...files, ...found];
			if (items.length) items.push(Object.assign(new Item("__pso_global_search__", "", []), { __cs: { panel: true, q, gq: this.globalQuery(palette, q), none: !found.length } }));
			const sel = palette.chooser?.selectedItem ?? 0;
			palette.currentSuggestions = items;
			palette.limit = items.length;
			palette.emptyStateText = items.length ? palette.__csEmpty : `文件名和正文里都没有「${q}」`;
			palette.__csShown = true;
			palette.updateSuggestions();
			// 正文结果是追加的，别把正在看的文件名结果的选中项挪回第一条
			if (files.length && sel > 0 && sel < files.length) palette.chooser.setSelectedItem(sel, false);
		}, delay);
	}

	async fillCache(files) {
		files = files || this.app.vault.getMarkdownFiles();
		const todo = files.filter((f) => { const c = this.textCache.get(f.path); return !c || c.mtime !== f.stat.mtime || c.size !== f.stat.size; });
		for (let i = 0; i < todo.length; i += 100) {
			await Promise.all(todo.slice(i, i + 100).map(async (f) => {
				try {
					const text = await this.app.vault.cachedRead(f);
					let cards = [];
					try { cards = parseCards(text); } catch (e) { /* 解析不了的当作没有卡片 */ }
					this.textCache.set(f.path, { mtime: f.stat.mtime, size: f.stat.size, low: text.toLowerCase(), cards });
				} catch (e) { /* 读不了的跳过 */ }
			}));
		}
	}

	async contentSearch(q, exclude, only) {
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		if (!terms.length) return [];
		let files = this.app.vault.getMarkdownFiles();
		if (only) files = files.filter((f) => only.has(f.path));
		await this.fillCache(files);
		const hits = [];
		for (const f of files) {
			if (exclude && exclude.has(f.path)) continue;   // 文件名结果里已经有了
			const c = this.textCache.get(f.path);
			if (!c || !terms.every((t) => c.low.includes(t))) continue;
			const lines = c.low.split("\n");
			let best = 0, bestN = 0;
			for (let i = 0; i < lines.length; i++) {
				const n = terms.filter((t) => lines[i].includes(t)).length;
				if (n > bestN) { best = i; bestN = n; if (n === terms.length) break; }
			}
			let count = 0;
			for (let at = c.low.indexOf(terms[0]); at >= 0 && count < 99; at = c.low.indexOf(terms[0], at + terms[0].length)) count++;
			const m = f.path.match(JOURNAL_RE);
			hits.push({ path: f.path, file: f, line: best, allInLine: bestN === terms.length, count, date: m ? +(m[1] + m[2] + m[3]) : 0, terms });
		}
		hits.sort((a, b) => (b.allInLine - a.allInLine) || (b.count - a.count) || (b.date - a.date) || a.path.localeCompare(b.path, "zh"));
		const top = hits.slice(0, CONTENT_LIMIT);
		// 摘要取原文（保留大小写），只读命中的这几篇
		await Promise.all(top.map(async (h) => {
			const text = await this.app.vault.cachedRead(h.file);
			h.snippet = this.snippet((text.split("\n")[h.line] || "").trim(), terms);
		}));
		return top;
	}

	// ---------- Chrome 书签 ----------
	// 书签都在「Chrome 书签」插件的内存里，直接筛，不用等
	chromeSearch(palette) {
		window.clearTimeout(palette.__csTimer);
		++palette.__csToken;
		palette.__csShown = false;
		const q = this.queryOf(palette);
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		const cb = this.app.plugins.plugins[CHROME_BM];
		const all = cb && cb.allBookmarks ? cb.allBookmarks() : null;
		const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
		const hits = [];
		(all || []).forEach((b, i) => {
			const title = b.title.toLowerCase(), path = b.path.toLowerCase(), url = b.url.toLowerCase();
			if (!terms.every((t) => title.includes(t) || path.includes(t) || url.includes(t))) return;
			// 词都在标题里的排前面，其次是靠文件夹名凑齐的，最后是只在网址里的；同一档按 Chrome 里的顺序
			const rank = terms.every((t) => title.includes(t)) ? 0 : terms.every((t) => title.includes(t) || path.includes(t)) ? 1 : 2;
			hits.push(Object.assign({ chrome: true, terms, rank, i }, b));
		});
		hits.sort((a, b) => (a.rank - b.rank) || (a.i - b.i));
		const items = Item ? hits.slice(0, CHROME_LIMIT).map((h) => Object.assign(new Item(`${CHROME_BM}/${h.id}`, h.title, []), { __cs: h })) : [];
		if (items.length) {
			const more = hits.length > items.length ? `，先列 ${items.length} 条` : "";
			items[0].__cs.section = q ? `${hits.length} 条 Chrome 书签含「${q}」${more}` : `共 ${hits.length} 条 Chrome 书签${more}`;
		}
		palette.currentSuggestions = items;
		palette.limit = items.length;
		palette.emptyStateText = !cb ? "需要先启用「Chrome 书签」插件"
			: !all ? "还没连上 Chrome：先在 Chrome 里装好扩展「Obsidian 书签桥」"
			: q ? `没有含「${q}」的 Chrome 书签` : "Chrome 里还没有书签";
		palette.updateSuggestions();
	}

	renderBookmark(item, content, aux) {
		const b = item.__cs;
		aux.empty();
		if (b.section) content.createDiv({ cls: "suggestion-note pso-section", text: `── ${b.section} ──` });
		const title = content.createDiv({ cls: "suggestion-title pso-bm-title" });
		const fav = title.createSpan({ cls: "pso-bm-fav" });
		if (b.icon) fav.createEl("img", { attr: { src: b.icon, alt: "" } }); else setIcon(fav, "globe");
		this.appendMarked(title.createSpan({ cls: "pso-bm-name" }), b.title, b.terms);
		const note = content.createDiv({ cls: "suggestion-note pso-snippet pso-bm-note" });
		if (b.path) { this.appendMarked(note, b.path, b.terms); note.createSpan({ cls: "pso-card-sep", text: " · " }); }
		// 网址去掉协议头；%E7%90… 这样的转义还原成字，还原不了就照原样
		let url = b.url;
		try { url = decodeURI(url); } catch (e) { /* 照原样 */ }
		this.appendMarked(note, this.snippet(url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), b.terms), b.terms);
	}

	// ↵ 按「Chrome 书签」插件的设置打开，⌘↵ 走另一边；split：用内置浏览器在右侧拆分打开，已经 3 栏就在最右边那一栏开新标签页
	openBookmark(item, evt, split) {
		const cb = this.app.plugins.plugins[CHROME_BM];
		const b = item && item.__cs;
		if (!cb || !b || !b.chrome) return;
		if (!split) return cb.openUrl(b.url, evt && (evt.metaKey || evt.ctrlKey) ? cb.otherSide() : undefined);
		const ws = this.app.workspace;
		const active = ws.getMostRecentLeaf();
		const cols = active ? columnsOf(ws, active) : { count: 0 };
		if (cols.count < MAX_COLUMNS || !cols.rightmost) return cb.openUrl(b.url, "obsidian", "split");
		const leaf = cols.rightmost.children[cols.rightmost.currentTab];
		if (leaf) ws.setActiveLeaf(leaf, { focus: true });
		cb.openUrl(b.url, "obsidian", "tab");
	}

	// 底部提示换成书签的（面板自带的那几条说的是打开 / 新建笔记）
	chromeHints(box) {
		const cb = this.app.plugins.plugins[CHROME_BM];
		const side = (w) => (w === "chrome" ? "在 Chrome 打开" : "用内置浏览器打开");
		const openIn = cb && cb.data ? cb.data.openIn : "obsidian";
		box.empty();
		const add = (keys, text) => {
			const item = box.createDiv({ cls: "prompt-instruction pso-hint" });
			item.createSpan({ cls: "prompt-instruction-command", text: keys });
			item.createSpan({ text });
		};
		add("↵", side(openIn));
		add("⌘ ↵", side(openIn === "chrome" ? "obsidian" : "chrome"));
		add("⌘ ⌥ ↵", "内置浏览器，右侧拆分");
		add("⌫", "回到文件搜索");
		add("Esc", "关闭");
	}

	// ---------- 选题 ----------
	// 把两个看板的条目收集成一个列表。口径见文件开头的 TOPIC_BOARDS / topicTools，照 scripts/topic-board.js
	async collectTopics() {
		const app = this.app, mc = app.metadataCache;
		const files = app.vault.getMarkdownFiles();
		await this.fillCache(files);
		const read = new Map();
		const linesOf = async (f) => { if (!read.has(f.path)) read.set(f.path, (await app.vault.cachedRead(f)).split("\n")); return read.get(f.path); };
		// 日记里的块按日记的日期算新旧（老日记的文件名有不补零的，比如 2023_02_5），别的笔记按修改时间
		const timeOf = (f) => { const m = f.basename.match(/^(\d{4})[_-](\d{1,2})[_-](\d{1,2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : f.stat.mtime; };
		const fields = new Map();
		const fieldsOf = async (f, cache) => {
			if (fields.has(f.path)) return fields.get(f.path);
			const fm = Object.assign({}, (cache && cache.frontmatter) || {});
			const c = this.textCache.get(f.path);
			if (c && TOPIC_INLINE_HINT.test(c.low)) for (const line of await linesOf(f)) {
				const m = line.match(TOPIC_INLINE_RE);
				if (m && fm[m[1]] == null && m[2].trim()) fm[m[1]] = m[2].trim();
			}
			fields.set(f.path, fm);
			return fm;
		};
		// 这篇笔记是不是真的链到了某个选题页 / 带某个标签（写在反引号里的不算，和 Dataview 的口径一样）
		const linksTo = (f, name) => {
			const dest = mc.getFirstLinkpathDest(name, "");
			return dest ? !!(mc.resolvedLinks[f.path] || {})[dest.path] : !!(mc.unresolvedLinks[f.path] || {})[name];
		};
		const hasTag = (cache, tag) => (getAllTags(cache) || []).some((t) => t === tag || t.startsWith(tag + "/"));
		let names = {};
		try { if (await app.vault.adapter.exists(TOPIC_NAMES_FILE)) names = JSON.parse(await app.vault.adapter.read(TOPIC_NAMES_FILE)).names || {}; } catch (e) { /* 没有名字就显示原句 */ }
		const rows = [];
		const push = (B, r) => {
			const display = plainMd(r.alias || r.title) || r.title;
			const orig = r.alias ? plainMd(r.title) : "";
			rows.push(Object.assign(r, {
				topic: true, board: B.name, display, orig, dead: TOPIC_DEAD.has(r.status),
				kids: r.kids.map((k) => { const text = plainMd(k.text); return { line: k.line, text, low: text.toLowerCase() }; }).filter((k) => k.text),
				lowHead: `${display}\n${orig}`.toLowerCase(),
				lowMeta: `${r.theme}\n${r.status}\n${r.page ? "选题页" : r.file.basename}`.toLowerCase(),
			}));
		};
		for (const B of TOPIC_BOARDS) {
			const T = topicTools(B);
			const seen = new Set();
			const gone = (text) => TOPIC_GONE_TAGS.some((t) => text.includes(t));
			// 一个列表项下面的所有子块
			const kidsOf = (items, i, lines) => {
				const desc = new Set([items[i].position.start.line]), out = [];
				for (let j = i + 1; j < items.length; j++) {
					if (!desc.has(items[j].parent)) continue;
					const n = items[j].position.start.line;
					desc.add(n);
					if (lines[n] !== undefined) out.push({ line: n, text: T.cleanChild(lines[n]) });
				}
				return out;
			};
			// 枢纽页里只写了一个链接的条目，链到的那篇直接当小说页
			const hubs = B.hubs.map((h) => mc.getFirstLinkpathDest(h, "")).filter(Boolean);
			const hubTargets = new Set();
			for (const hf of hubs) {
				const hc = mc.getFileCache(hf);
				if (!hc || !hc.listItems) continue;
				const hl = await linesOf(hf);
				for (const it of hc.listItems) {
					if (it.parent < 0 || !TOPIC_HEADING_ITEM.test(hl[it.parent] || "")) continue;
					const m = T.cleanTitle(hl[it.position.start.line] || "").match(/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/);
					const d = m && mc.getFirstLinkpathDest(m[1], hf.path);
					if (d && d.extension === "md") hubTargets.add(d.path);
				}
			}

			// A. 选题页：type: 选题，或 category 含选题类双链；带小说选题记号的只进小说选题台
			for (const f of files) {
				if (JOURNAL_NAME_RE.test(f.basename) || TOPIC_SKIP_DIRS.some((d) => f.path.startsWith(d))) continue;
				const cache = mc.getFileCache(f);
				const fm = await fieldsOf(f, cache);
				const cat = fm.category == null ? "" : [fm.category].flat().join(" ");
				const tags = ((cache && getAllTags(cache)) || []).join(" ");
				const type = String(fm.type || "");
				const fictionPage = cat.includes("小说选题") || tags.includes("小说选题") || hubTargets.has(f.path) || normTheme(fm["主题"]) === "小说选题" || type === "小说选题";
				const isTopic = B.fiction ? fictionPage : !fictionPage && (type === "选题" || TOPIC_CAT_KEYS.some((k) => cat.includes(k)));
				if (!isTopic) continue;
				let status = T.normStatus(fm["状态"]) || B.stages[0];
				// 已经有稿子的，状态至少算到「成稿中 / 初稿中」
				if ([fm["稿件"]].flat().filter(Boolean).length && B.stages.indexOf(status) < B.stages.indexOf(B.draftMin)) status = B.draftMin;
				const lines = await linesOf(f);
				let start = 0;
				if (lines[0] === "---") { const e = lines.indexOf("---", 1); if (e > 0) start = e + 1; }
				const kids = [];
				for (let i = start; i < lines.length && kids.length < B.kidMax; i++) { const t = T.cleanChild(lines[i]); if (t) kids.push({ line: i, text: t }); }
				const video = !B.fiction && (String(fm["形式"] || "") || (cat.includes("视频") ? "视频" : "文章")) === "视频";
				push(B, { page: true, emoji: B.fiction ? "📕" : video ? "📺" : "📖", title: f.basename, alias: "", path: f.path, file: f, line: 0,
					status, theme: normTheme(fm[B.themeLabel]), kids, time: f.stat.mtime });
				seen.add(f.path + ":page");
			}

			// B. 选题块：日记 / 笔记里带选题双链（或 #小说选题）的列表项
			const needles = [...B.links, ...B.tags].map((x) => x.toLowerCase());
			for (const f of files) {
				if (f.path.startsWith("选题/_采访/")) continue;   // 追问成稿的产物不算选题
				const c = this.textCache.get(f.path);
				if (!c || !needles.some((n) => c.low.includes(n))) continue;
				const cache = mc.getFileCache(f);
				if (!cache || !cache.listItems) continue;
				const live = T.matchers.filter((m) => (m.name.startsWith("#") ? hasTag(cache, m.name) : linksTo(f, m.name)));
				if (!live.length) continue;
				const items = cache.listItems, lines = await linesOf(f);
				for (let i = 0; i < items.length; i++) {
					const ln = items[i].position.start.line, text = lines[ln];
					if (text === undefined || gone(text)) continue;
					const hit = live.find((m) => m.re.test(text));
					if (!hit || (!B.fiction && TOPIC_FICTION_RE.test(text))) continue;   // 小说选题归小说选题台
					const key = `${f.path}:${ln}`;
					if (seen.has(key)) continue;
					seen.add(key);
					const kids = kidsOf(items, i, lines);
					// 只写了「- [[小说选题]]」、内容全在子块里的，拿第一行子块当标题
					const title = T.cleanTitle(text) || (kids.find((k) => k.text) || {}).text || "（空）";
					push(B, { page: false, emoji: B.fiction ? "📕" : hit.name === "视频选题" ? "📺" : "📖", title, alias: B.fiction ? names[topicNameKey(f.path, title)] || "" : "",
						path: f.path, file: f, line: ln, status: T.blockStatus(text), theme: T.themeOf(text), kids, time: timeOf(f) });
				}
			}

			// C. 小说的枢纽页：挂在标题项下面的每一条都算一个选题
			for (const hf of hubs) {
				const hc = mc.getFileCache(hf);
				if (!hc || !hc.listItems) continue;
				const items = hc.listItems, lines = await linesOf(hf);
				for (let i = 0; i < items.length; i++) {
					const it = items[i];
					if (it.parent < 0 || !TOPIC_HEADING_ITEM.test(lines[it.parent] || "")) continue;
					const ln = it.position.start.line, text = lines[ln];
					if (text === undefined || gone(text)) continue;
					const title = T.cleanTitle(text);
					if (!title) continue;
					const only = title.match(/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/);
					const dest = only && mc.getFirstLinkpathDest(only[1], hf.path);
					if (dest && seen.has(dest.path + ":page")) continue;   // 链到的那篇已经作为小说页列过了
					const key = `${hf.path}:${ln}`;
					if (seen.has(key)) continue;
					seen.add(key);
					push(B, { page: false, emoji: "📕", title, alias: names[topicNameKey(hf.path, title)] || "", path: hf.path, file: hf, line: ln,
						status: T.blockStatus(text), theme: T.themeOf(text), kids: kidsOf(items, i, lines), time: hf.stat.mtime });
				}
			}
		}
		return rows;
	}

	scheduleTopicSearch(palette, delay = 80) {
		window.clearTimeout(palette.__csTimer);
		const token = ++palette.__csToken;
		const q = this.queryOf(palette);
		const scope = palette.__scope, board = boardOf(scope);
		palette.__csShown = false;
		palette.__csTimer = window.setTimeout(async () => {
			let res;
			try { res = await this.topicSearch(q, board); } catch (e) { console.error("[palette-split-open] 选题", e); this.topicRows = null; res = { groups: [], error: true }; }
			if (token !== palette.__csToken || !palette.modalEl.isConnected || palette.__scope !== scope) return;
			const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
			if (!Item) return;
			const items = [];
			for (const g of res.groups) {
				if (!g.list.length) continue;
				const more = g.total > g.list.length ? `，先列 ${g.list.length} 条` : "";
				g.list[0].section = q ? `${g.board} · ${g.total} 条含「${q}」${more}` : `${g.board} · 共 ${g.total} 条，还在做的在前${more}`;
				for (const h of g.list) items.push(Object.assign(new Item(`topic/${h.board}/${h.path}#L${h.line0}`, h.path, []), { __cs: h }));
			}
			palette.currentSuggestions = items;
			palette.limit = items.length;
			palette.emptyStateText = res.error ? "读取选题出错了，详情看控制台" : q ? `${board}里没有含「${q}」的条目` : `${board}里还没有条目`;
			palette.__csShown = !!q;
			palette.updateSuggestions();
		}, delay);
	}

	// board：只要哪个看板的条目
	async topicSearch(q, board) {
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		const rows = await (this.topicRows || (this.topicRows = this.collectTopics()));
		const groups = TOPIC_BOARDS.filter((B) => !board || B.name === board).map((B) => ({ board: B.name, total: 0, list: [] }));
		for (const r of rows) {
			const group = groups.find((g) => g.board === r.board);
			if (!group) continue;
			// 词都在标题里的排前面，其次是靠主题 / 状态 / 出处凑齐的，最后是靠某一行子块凑齐的
			let rank = 0, kid = null;
			if (terms.length && !terms.every((t) => r.lowHead.includes(t))) {
				const rest = terms.filter((t) => !r.lowHead.includes(t) && !r.lowMeta.includes(t));
				if (!rest.length) rank = 1;
				else if ((kid = r.kids.find((k) => rest.every((t) => k.low.includes(t))))) rank = 2;
				else continue;
			}
			// line0：条目自己在第几行（显示出处用）；line：打开后跳到哪一行
			group.list.push(Object.assign({}, r, { terms, rank, kid, line0: r.line, line: kid ? kid.line : r.line, plain: r.page && !kid }));
		}
		for (const g of groups) {
			g.total = g.list.length;
			g.list.sort((a, b) => (a.dead - b.dead) || (a.rank - b.rank) || (b.time - a.time) || a.path.localeCompare(b.path, "zh") || (a.line0 - b.line0));
			g.list = g.list.slice(0, TOPIC_LIMIT);
		}
		return { groups };
	}

	renderTopic(item, content, aux) {
		const h = item.__cs;
		aux.empty();
		if (h.section) content.createDiv({ cls: "suggestion-note pso-section", text: `── ${h.section} ──` });
		const title = content.createDiv({ cls: "suggestion-title pso-card-front" });
		title.appendText(h.emoji + " ");
		this.appendMarked(title, this.snippet(h.display, h.terms), h.terms);
		const note = content.createDiv({ cls: "suggestion-note pso-snippet" });
		const sep = () => note.createSpan({ cls: "pso-card-sep", text: " · " });
		// 命中的子块；没有就放起名之前的原句
		if (h.kid) { this.appendMarked(note, this.snippet(h.kid.text, h.terms), h.terms); sep(); }
		else if (h.orig) { this.appendMarked(note, this.snippet(h.orig, h.terms), h.terms); sep(); }
		if (h.theme) { this.appendMarked(note, h.theme, h.terms); sep(); }
		const from = note.createSpan({ cls: "pso-card-file" });
		this.appendMarked(from, h.page ? "选题页" : `${h.file.basename} L${h.line0 + 1}`, h.terms);
		aux.createSpan({ cls: "suggestion-flair pso-topic-status" + (h.dead ? " is-dead" : ""), text: h.status });
	}

	// ---------- 卡片 ----------
	scheduleCardSearch(palette, delay = 120) {
		window.clearTimeout(palette.__csTimer);
		const token = ++palette.__csToken;
		const q = this.queryOf(palette);
		palette.__csShown = false;
		palette.__csTimer = window.setTimeout(async () => {
			const res = await this.cardSearch(q);
			if (token !== palette.__csToken || !palette.modalEl.isConnected || palette.__scope !== "cards") return;
			const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
			if (!Item) return;
			const items = res.list.map((h) => Object.assign(new Item(`${h.path}#L${h.line}`, h.path, []), { __cs: h }));
			if (items.length) {
				const more = res.total > items.length ? `，先列 ${items.length} 张` : "";
				items[0].__cs.section = q ? `${res.total} 张卡片含「${q}」${more}` : `共 ${res.total} 张卡片，新的在前${more}`;
			}
			palette.currentSuggestions = items;
			palette.limit = items.length;
			palette.emptyStateText = q ? `没有含「${q}」的卡片` : "库里还没有卡片";
			palette.__csShown = !!q;
			palette.updateSuggestions();
		}, delay);
	}

	async cardSearch(q) {
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		const files = this.app.vault.getMarkdownFiles();
		await this.fillCache(files);
		const hits = [];
		for (const f of files) {
			const c = this.textCache.get(f.path);
			if (!c || !c.cards || !c.cards.length) continue;
			const m = f.path.match(JOURNAL_RE);
			const time = m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : f.stat.ctime;
			for (const card of c.cards) {
				let inFront = true;
				if (terms.length) {
					const front = card.front.toLowerCase();
					const hay = `${front}\n${card.answer.toLowerCase()}\n${f.path.toLowerCase()}`;
					if (!terms.every((t) => hay.includes(t))) continue;
					inFront = terms.every((t) => front.includes(t));
				}
				hits.push(Object.assign({ card: true, path: f.path, file: f, terms, inFront, time }, card));
			}
		}
		hits.sort((a, b) => (b.inFront - a.inFront) || (b.time - a.time) || a.path.localeCompare(b.path, "zh") || (a.line - b.line));
		return { total: hits.length, list: hits.slice(0, CARD_LIMIT) };
	}

	renderCard(item, content, aux) {
		const h = item.__cs;
		aux.empty();
		if (h.section) content.createDiv({ cls: "suggestion-note pso-section", text: `── ${h.section} ──` });
		const title = content.createDiv({ cls: "suggestion-title pso-card-front" });
		// 挖空的部分单独标出来；被截断成半个的挖空就照原样显示
		for (const part of this.snippet(h.front, h.terms).split(CLOZE_SPLIT_RE)) {
			if (!part) continue;
			if (CLOZE_SPLIT_RE.test(part) && (part.startsWith("==") ? part.endsWith("==") : part.endsWith("}}"))) {
				const inner = part.startsWith("==") ? part.slice(2, -2) : part.replace(/^\{\{c\d+::/, "").replace(/(::[\s\S]*)?\}\}$/, "");
				this.appendMarked(title.createSpan({ cls: "pso-cloze" }), inner, h.terms);
			} else this.appendMarked(title, part.replace(/==/g, ""), h.terms);
		}
		const note = content.createDiv({ cls: "suggestion-note pso-snippet" });
		if (h.answer) { this.appendMarked(note, this.snippet(h.answer, h.terms), h.terms); note.createSpan({ cls: "pso-card-sep", text: " · " }); }
		note.createSpan({ cls: "pso-card-file", text: h.file.basename });
		aux.createSpan({
			cls: "suggestion-flair pso-card-kind" + (h.synced ? "" : " is-unsynced"),
			text: h.kind,
			attr: { "aria-label": h.synced ? "已同步到 Anki" : "还没同步到 Anki" },
		});
	}

	// 把 s 写进 el，terms 里的词加高亮
	appendMarked(el, s, terms) {
		const low = s.toLowerCase();
		const marks = [];
		for (const t of terms) for (let i = low.indexOf(t); i >= 0; i = low.indexOf(t, i + t.length)) marks.push([i, i + t.length]);
		marks.sort((a, b) => a[0] - b[0]);
		let pos = 0;
		for (const [a, b] of marks) {
			if (a < pos) continue;
			if (a > pos) el.appendText(s.slice(pos, a));
			el.createSpan({ cls: "suggestion-highlight", text: s.slice(a, b) });
			pos = b;
		}
		el.appendText(s.slice(pos));
	}

	// 一行摘要：去掉列表记号，太长就以第一个命中词为中心截一段
	snippet(line, terms) {
		line = line.replace(/^([-*+]|\d+[.)])\s+(\[.\]\s+)?/, "");
		if (line.length <= SNIPPET_LEN) return line;
		const low = line.toLowerCase();
		const first = Math.min(...terms.map((t) => { const i = low.indexOf(t); return i < 0 ? Infinity : i; }));
		const at = Number.isFinite(first) ? first : 0;   // 没有命中词（或没输入）就从头显示
		const start = Math.max(0, Math.min(at - 20, line.length - SNIPPET_LEN));
		return (start > 0 ? "…" : "") + line.slice(start, start + SNIPPET_LEN) + (start + SNIPPET_LEN < line.length ? "…" : "");
	}

	renderHit(item, content, aux) {
		const h = item.__cs;
		aux.empty();   // 去掉「隐藏这一项」的叉
		if (h.panel) {
			if (h.none) content.createDiv({ cls: "suggestion-note pso-section", text: `正文里没有更多含「${h.q}」的笔记` });
			content.createDiv({ cls: "suggestion-title", text: `🔍 在搜索面板中查看「${h.q}」的全部结果` });
			content.createDiv({ cls: "suggestion-note", text: "Obsidian 全局搜索（⌘⇧F，面板里再按 Tab 也行），支持 path: tag: 等搜索语法" });
			return;
		}
		if (h.section) content.createDiv({ cls: "suggestion-note pso-section", text: `── 正文里含「${h.section}」的笔记 ──` });
		content.createDiv({ cls: "suggestion-title", text: h.path.replace(/\.md$/, "") });
		this.appendMarked(content.createDiv({ cls: "suggestion-note pso-snippet" }), h.snippet || "", h.terms);
		aux.createSpan({ cls: "suggestion-flair", text: `L${h.line + 1}` });
	}

	async openHit(palette, item, evt) {
		const h = item.__cs;
		if (h.panel) return this.openGlobalSearch(h.gq || h.q);
		const mod = palette.plugin && palette.plugin.settings && palette.plugin.settings.openInNewTabMod;
		const newLeaf = !!evt && (mod === "Shift" ? evt.shiftKey : (evt.metaKey || evt.ctrlKey));
		const ws = this.app.workspace;
		if (h.plain) return ws.openLinkText(h.path, "", newLeaf);   // 选题页：直接打开，不用跳到某一行
		const shows = () => { const out = []; ws.iterateAllLeaves((l) => { if (l.view instanceof MarkdownView && l.view.file && l.view.file.path === h.path) out.push(l); }); return out; };
		const before = new Set(shows());
		const journal = JOURNAL_NAME_RE.test(h.file.basename);
		await ws.openLinkText(h.path, "", newLeaf, journal ? { state: { mode: "source" }, eState: { line: h.line } } : { eState: { line: h.line } });
		// 光标放到命中那一行并选中第一个命中词（只给 line 的话 Obsidian 只滚动，光标还在上次的位置）。
		// 新标签页刚打开时不一定是当前标签页，所以按「打开前后多出来的那个」找；没多出来就是在原标签页里打开的
		const now = shows();
		const leaf = now.find((l) => !before.has(l)) || now.sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0))[0];
		if (!leaf) return;
		ws.setActiveLeaf(leaf, { focus: true });
		const place = () => {
			const ed = leaf.view && leaf.view.editor;
			if (!ed || h.line >= ed.lineCount()) return null;
			const low = ed.getLine(h.line).toLowerCase();
			const t = h.terms.find((x) => low.includes(x));
			const ch = t ? low.indexOf(t) : 0;
			const from = { line: h.line, ch }, to = { line: h.line, ch: ch + (t ? t.length : 0) };
			ed.setSelection(from, to);
			ed.scrollIntoView({ from, to }, true);
			return ed;
		};
		const ed = place();
		// 别的插件切模式时可能把光标恢复到上次的位置：过一会儿看一眼，被挪走了就再放回来
		if (ed) window.setTimeout(() => { const e = leaf.view && leaf.view.editor; if (e && e.getCursor("from").line !== h.line && !e.somethingSelected()) place(); }, 250);
	}

	// 交给全局搜索时带上范围：Wiki 能用 path: 表达；书签和卡片没法用搜索语法表达，只带关键词
	globalQuery(palette, q) {
		return palette.__scope === "wiki" ? `path:"${WIKI_DIR}" ${q}` : q;
	}

	openGlobalSearch(q) {
		const gs = this.app.internalPlugins.getPluginById("global-search");
		if (gs && gs.instance) gs.instance.openGlobalSearch(q);
	}

	async openInSplit(palette, item, evt) {
		const ws = this.app.workspace;
		const active = ws.getMostRecentLeaf();
		const cols = active ? columnsOf(ws, active) : { count: 0 };
		const own = Object.prototype.hasOwnProperty.call(ws, "openLinkText");
		const prev = ws.openLinkText;
		ws.openLinkText = async function (linktext, sourcePath, newLeaf, state) {
			if (cols.count < MAX_COLUMNS || !cols.rightmost) return prev.call(this, linktext, sourcePath, "split", state);
			// 已经 3 栏：在最右边一栏、它当前标签页的右边开新标签页
			const tabs = cols.rightmost;
			const leaf = ws.createLeafInParent(tabs, tabs.currentTab + 1);
			await leaf.openLinkText(linktext, sourcePath, state);
			ws.setActiveLeaf(leaf, { focus: true });
		};
		try {
			palette.close(evt);
			await palette.currentAdapter.onChooseSuggestion(item, evt);
		} finally {
			if (own) ws.openLinkText = prev; else delete ws.openLinkText;
		}
	}
};
