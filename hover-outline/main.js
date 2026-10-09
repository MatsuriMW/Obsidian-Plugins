// 悬浮目录：仿 Claude Code 对话框左上角的隐藏式目录
//   · 编辑区左上角平时只有一列短横线（一条 = 一个目录项，当前位置那条加深），鼠标移上去展开成卡片，点击跳转
//   · 目录 = 开头 + 标题 + 结尾；默认只列到 h3，笔记里有 h4 及更深的标题时，卡片顶上出现层级切换（H1…Hn）
//   · 日记（「日记」文件夹里的，或 frontmatter 有 journal）：顶格分割线（「- ---」或单独一行 ---）当 h1 分段，
//     分区规则同 Done To Top 的一键整理：
//       第一段（第一条分割线之前）= DONE；紧接着的、任务全是 DOING / NOW / PAUSED 的段 = DOING；
//       再紧接着的、任务全是 TODO / LATER / WAITING / SUSPENDED 的段 = TODO；其余段显示分割线下第一条
//     日记里如果也写了标题，标题整体降一级挂在分段下面
//   · 有 dataview / dataviewjs 代码块的笔记不显示；除了开头结尾没有别的目录项时也不显示
//   · 手机上没有 hover：点一下展开、再点收起
const { Plugin, MarkdownView, Platform } = require("obsidian");
const { EditorView } = require("@codemirror/view");

const DEFAULT_LEVEL = 3;
const DIARY_FOLDER = "日记/";

// 和 Done To Top 同一套状态关键字
const KEYWORD_RE = /^(TODO|DOING|LATER|NOW|PAUSED|WAITING|WAIT|IN-PROGRESS|SUSPENDED|CANCELED|CANCELLED|FAILED|DONE)(\s+|$)/;
const STAMP_RE = /^\*\*\d{1,2}[:：]\d{2}\*\*\s*/;
const TIME_OR_RANGE_RE = /^\d{1,2}[:：]\d{2}(?:\s*[-–~～]\s*\d{1,2}[:：]\d{2})?\s*/;
const ZONE = {
	DONE: "DONE", CANCELED: "DONE", CANCELLED: "DONE", FAILED: "DONE",
	DOING: "DOING", NOW: "DOING", "IN-PROGRESS": "DOING", PAUSED: "DOING",
	TODO: "TODO", LATER: "TODO", WAITING: "TODO", WAIT: "TODO", SUSPENDED: "TODO",
};

const MAX_CHARS = 7;   // 目录项最多显示几个字，多的用 …
const clip = (t) => { const a = Array.from(t); return a.length > MAX_CHARS ? a.slice(0, MAX_CHARS).join("") + "…" : t; };
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const SEP_RE = /^(?: {0,3}|[-*+]\s+)(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const FENCE_RE = /^\s*(`{3,}|~{3,})\s*(\S*)/;

// 跳过 YAML frontmatter，返回正文第一行
function bodyStart(lines) {
	if (lines[0] !== "---") return 0;
	for (let i = 1; i < lines.length; i++) if (lines[i] === "---") return i + 1;
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

// 去掉链接 / 强调等标记，只留看得见的字
function plain(s) {
	return s
		.replace(/\s*←\s*\[\[[^\]]*\]\]\s*$/, "")                   // 行尾「← [[来源日记]]」
		.replace(/!?\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
		.replace(/!?\[\[([^\]]*)\]\]/g, (_, a) => a.replace(/#\^?/g, " › "))
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/(\*\*|__|==|~~|`)/g, "")
		.replace(/<[^>]+>/g, "")
		.trim();
}

// 日记分段的显示文字：分割线下第一条，去掉列表符号、复选框、状态关键字和时间
function firstLineText(line) {
	const s = line
		.replace(/^(?:[-*+]|\d+[.)])\s+/, "")
		.replace(/^\[.\]\s*/, "")
		.replace(STAMP_RE, "")
		.replace(KEYWORD_RE, "")
		.replace(TIME_OR_RANGE_RE, "");
	return plain(s) || plain(line) || "（空）";
}

// 扫一遍正文：标题、日记分段、有没有 dataview
function scan(text) {
	const lines = text.split("\n");
	const start = bodyStart(lines);
	const heads = [];
	const segs = [{ line: start, sep: false, tops: [] }];
	let fence = null;
	let dataview = false;
	for (let i = start; i < lines.length; i++) {
		const l = lines[i];
		const f = l.match(FENCE_RE);
		if (fence) {
			if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2]) fence = null;
			continue;
		}
		if (f) {
			fence = f[1];
			if (/^dataview(js)?$/i.test(f[2])) dataview = true;
			if (!/^\s/.test(l)) segs[segs.length - 1].tops.push({ text: l, line: i });
			continue;
		}
		const h = l.match(HEADING_RE);
		if (h) heads.push({ line: i, level: h[1].length, text: plain(h[2]) || "（空标题）" });
		if (SEP_RE.test(l)) segs.push({ line: i, sep: true, tops: [] });
		else if (l.trim() && !/^\s/.test(l)) segs[segs.length - 1].tops.push({ text: l, line: i });
	}
	return { lines, start, heads, segs, dataview };
}

// 日记分段 → 目录项（规则见文件开头）
function diarySections(segs) {
	const out = [];
	let stage = 0;   // 0 = 还没过 DONE，1 = 过了 DONE，2 = 过了 DOING，3 = 后面都是其余段
	const all = (seg, z) => {
		const zs = seg.tops.map((t) => zoneOf(t.text)).filter(Boolean);
		return zs.length > 0 && zs.every((x) => x === z);
	};
	for (const seg of segs) {
		if (!seg.tops.length) continue;
		let text;
		if (!seg.sep) { text = "DONE"; stage = 1; }
		else if (stage <= 1 && all(seg, "DOING")) { text = "DOING"; stage = 2; }
		else if (stage <= 2 && all(seg, "TODO")) { text = "TODO"; stage = 3; }
		else { text = firstLineText(seg.tops[0].text); stage = 3; }
		out.push({ line: seg.tops[0].line, level: 1, text, zone: /^(DONE|DOING|TODO)$/.test(text) });   // 跳到分割线下第一条，选中它
	}
	return out;
}

function buildItems(text, diary) {
	const r = scan(text);
	if (r.dataview) return null;
	let items = r.heads;
	if (diary) {
		items = diarySections(r.segs)
			.concat(r.heads.map((h) => ({ ...h, level: Math.min(h.level + 1, 6) })))
			.sort((a, b) => a.line - b.line);
	}
	if (!items.length) return null;
	return { items, start: r.start, last: r.lines.length - 1 };
}

// ---------- 跳到某一行：稳定地停在视口正中，并选中这一行的文字（第二大脑 main.js 里有同一份） ----------
//   · 编辑模式：选中行内文字（不含缩进、列表符号、复选框、#、行尾 ^块ID）；高度是边滚边量的，对中后再量几次，偏了就补
//   · 阅读模式：先滚到附近让它渲染出来，再按段落 / 列表项（data-line）找到对应元素，对中后用浏览器选区选中
//   · 靠近文首文末滚不动的时候，停在能到的最近位置
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
	for (let i = 0; i < 12 && !el; i++) { await wait(i ? 80 : 30); el = previewElAt(rd, line); }
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

class Outline {
	constructor(plugin, view) {
		this.plugin = plugin;
		this.view = view;
		this.path = null;
		this.data = null;
		this.visible = [];
		this.rows = [];
		this.bars = [];
		this.current = -1;

		view.contentEl.addClass("ho-host");
		this.el = view.contentEl.createDiv({ cls: "ho is-hidden" });
		this.barsEl = this.el.createDiv({ cls: "ho-bars" });
		this.card = this.el.createDiv({ cls: "ho-card" });

		if (Platform.isMobile) {
			this.barsEl.addEventListener("click", () => this.open());
			this.onOutside = (e) => { if (!this.el.contains(e.target)) this.close(); };
			document.addEventListener("pointerdown", this.onOutside, true);
		} else {
			this.el.addEventListener("mouseenter", () => { clearTimeout(this.closeTimer); this.open(); });
			this.el.addEventListener("mouseleave", () => { this.closeTimer = setTimeout(() => this.close(), 150); });
		}

		this.onScroll = () => {
			if (this.raf) return;
			this.raf = requestAnimationFrame(() => { this.raf = 0; this.markCurrent(); });
		};
		view.contentEl.addEventListener("scroll", this.onScroll, true);
		view.register(() => this.destroy());
	}

	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		clearTimeout(this.closeTimer);
		clearTimeout(this.refreshTimer);
		this.view.contentEl.removeEventListener("scroll", this.onScroll, true);
		if (this.onOutside) document.removeEventListener("pointerdown", this.onOutside, true);
		this.el.remove();
		this.view.contentEl.removeClass("ho-host");
		this.plugin.outlines.delete(this.view);
	}

	refreshSoon() {
		clearTimeout(this.refreshTimer);
		this.refreshTimer = setTimeout(() => this.refresh(), 300);
	}

	refresh() {
		if (this.destroyed) return;
		const file = this.view.file;
		this.path = file ? file.path : null;
		this.text = file ? this.view.getViewData() : null;
		this.data = file ? buildItems(this.text, this.plugin.isDiary(file)) : null;
		if (!this.data) { this.el.addClass("is-hidden"); this.close(); return; }
		this.el.removeClass("is-hidden");
		this.render();
	}

	render() {
		const { items, start, last } = this.data;
		const maxLevel = Math.max(...items.map((i) => i.level));
		// 默认到 h3；整篇最高只有 h4 这类的，至少显示最高那一级
		const minLevel = Math.min(...items.map((i) => i.level));
		const base = Math.max(DEFAULT_LEVEL, minLevel);
		const lv = Math.min(this.plugin.levels.get(this.path) || base, maxLevel);
		this.visible = [
			{ line: start, level: 0, text: "开头", edge: "start" },
			...items.filter((i) => i.level <= lv),
			{ line: last, level: 0, text: "结尾", edge: "end" },
		];

		this.barsEl.empty();
		this.bars = this.visible.map((it) => this.barsEl.createDiv({ cls: `ho-bar ho-bar-l${Math.min(it.level, 3)}` }));

		const scrollTop = this.card.scrollTop;
		this.card.empty();
		// 有比默认层级更深的标题（h4 及以下）才给层级切换，按钮只列这篇用到的层级（日记里标题降了一级，按降级后的算）
		if (maxLevel > base) {
			const row = this.card.createDiv({ cls: "ho-levels" });
			for (let n = minLevel; n <= maxLevel; n++) {
				const b = row.createDiv({ cls: "ho-lv" + (n === lv ? " is-active" : ""), text: `H${n}` });
				b.addEventListener("mousedown", (e) => e.preventDefault());
				b.addEventListener("click", (e) => {
					e.stopPropagation();
					this.plugin.levels.set(this.path, n);
					this.render();
				});
			}
		}
		this.rows = this.visible.map((it) => {
			const row = this.card.createDiv({ cls: "ho-row" + (it.edge ? " is-edge" : "") + (it.zone ? " is-zone" : "") });
			if (it.level > 1) row.style.paddingLeft = `${8 + (it.level - 1) * 12}px`;
			row.createDiv({ cls: "ho-dash" });
			row.createDiv({ cls: "ho-text", text: clip(it.text), attr: { title: it.text } });
			row.addEventListener("mousedown", (e) => e.preventDefault());
			// 点了不收起，鼠标离开触发区域才收（手机上没有 hover，点完就收）
			row.addEventListener("click", () => { this.jump(it); if (Platform.isMobile) this.close(); });
			return row;
		});
		this.card.scrollTop = scrollTop;
		this.current = -1;
		this.picked = -1;
		this.markCurrent();
	}

	open() {
		if (!this.data || this.el.hasClass("is-open")) return;
		this.el.addClass("is-open");
		this.markCurrent();
		const row = this.rows[this.current];
		if (row) row.scrollIntoView({ block: "nearest" });
	}

	close() {
		this.el.removeClass("is-open");
	}

	scroller() {
		const v = this.view;
		if (v.getMode() === "source") return v.editor && v.editor.cm ? v.editor.cm.scrollDOM : null;
		const r = v.previewMode.renderer;
		return r && r.previewEl ? r.previewEl : v.previewMode.containerEl.querySelector(".markdown-preview-view");
	}

	// 视口正中那一行（0 起）：跳转是把目标放到正中的，当前位置也按正中算
	centerLine() {
		const v = this.view;
		if (v.getMode() === "source") {
			const cm = v.editor && v.editor.cm;
			if (!cm) return 0;
			const r = cm.scrollDOM.getBoundingClientRect();
			const h = r.top + r.height / 2 - cm.documentTop;
			if (h <= 0) return 0;
			return cm.state.doc.lineAt(cm.lineBlockAtHeight(h).from).number - 1;
		}
		const rd = v.previewMode.renderer;
		const sc = this.scroller();
		if (!rd || !sc) return 0;
		const s = sc.getBoundingClientRect();
		const cy = s.top + s.height / 2;
		let line = 0;
		for (const sec of rd.sections || []) {
			if (!sec.el || !sec.el.isConnected || !sec.start) continue;
			const r = sec.el.getBoundingClientRect();
			if (!r.height) continue;
			if (r.top > cy) break;
			line = sec.start.line;
			for (const li of sec.el.querySelectorAll("li[data-line]")) {
				if (li.getBoundingClientRect().top > cy) break;
				line = sec.start.line + Number(li.getAttribute("data-line"));
			}
		}
		return line;
	}

	markCurrent() {
		if (!this.data || !this.visible.length) return;
		const sc = this.scroller();
		const lastIdx = this.visible.length - 1;
		let cur = 0;
		const lj = this.lastJump;
		const pinned = lj && sc && Math.abs(sc.scrollTop - lj.top) < 2
			? this.visible.findIndex((x) => x.edge === lj.edge && x.line === lj.line) : -1;
		if (pinned >= 0) {
			cur = pinned;   // 刚点过的那一项：自己没再滚动之前一直高亮它（文首文末对不了中，按正中算会算到隔壁）
		} else {
			this.lastJump = null;
			const mid = this.centerLine();
			const maxed = sc && sc.scrollTop > 4 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
			if (sc && sc.scrollTop <= 4) cur = 0;
			else if (mid >= this.data.last || maxed) cur = lastIdx;
			else for (let i = 1; i < lastIdx; i++) if (this.visible[i].line <= mid) cur = i;
		}
		// 刚点过的那一栏 handle 变长；自己滚动了（不再钉住）就恢复
		if (pinned !== this.picked) {
			if (this.rows[this.picked]) this.rows[this.picked].removeClass("is-picked");
			this.picked = pinned;
			if (this.rows[pinned]) this.rows[pinned].addClass("is-picked");
		}
		if (cur === this.current) return;
		if (this.rows[this.current]) this.rows[this.current].removeClass("is-current");
		if (this.bars[this.current]) this.bars[this.current].removeClass("is-current");
		this.current = cur;
		this.rows[cur].addClass("is-current");
		this.bars[cur].addClass("is-current");
	}

	// 开头：回到最上面，光标放正文第一行；结尾：滚到最底，光标放行末；其余：目标行放正中并选中
	async jump(it) {
		const v = this.view;
		const sc = this.scroller();
		this.lastJump = null;
		if (it.edge) {
			if (v.getMode() === "source") {
				const ed = v.editor;
				const l = it.edge === "start" ? it.line : ed.lastLine();
				ed.setCursor({ line: l, ch: it.edge === "start" ? 0 : ed.getLine(l).length });
				ed.focus();
			} else window.getSelection().removeAllRanges();
			// 阅读视图边滚边渲染，文末的高度一开始是估的，滚到底后再补几次
			for (let i = 0; sc && i < (it.edge === "end" ? 6 : 1); i++) {
				sc.scrollTop = it.edge === "start" ? 0 : sc.scrollHeight;
				await nextFrame();
				await nextFrame();
			}
		} else await revealLine(v, it.line);
		if (sc) this.lastJump = { edge: it.edge, line: it.line, top: sc.scrollTop };
		this.current = -1;
		this.markCurrent();
	}
}

module.exports = class HoverOutline extends Plugin {
	onload() {
		this.outlines = new Map();   // MarkdownView → Outline
		this.levels = new Map();     // 文件路径 → 手动切过的层级（本次打开 Obsidian 期间有效）

		const sync = () => this.sync();
		this.app.workspace.onLayoutReady(sync);
		this.registerEvent(this.app.workspace.on("layout-change", sync));
		this.registerEvent(this.app.workspace.on("active-leaf-change", sync));
		// 刚打开的笔记内容可能还没载入，过一会儿再对一遍
		this.registerEvent(this.app.workspace.on("file-open", () => { setTimeout(sync, 50); setTimeout(sync, 400); }));
		this.registerEvent(this.app.workspace.on("editor-change", (_, info) => {
			const o = this.outlines.get(info);
			if (o) o.refreshSoon();
		}));
		this.registerEvent(this.app.vault.on("modify", (file) => {
			for (const o of this.outlines.values()) if (o.path === file.path) o.refreshSoon();
		}));
		// 改了 frontmatter 的 journal 之类，日记判断会变
		this.registerEvent(this.app.metadataCache.on("changed", (file) => {
			for (const o of this.outlines.values()) if (o.path === file.path) o.refreshSoon();
		}));
	}

	onunload() {
		for (const o of [...this.outlines.values()]) o.destroy();
	}

	isDiary(file) {
		if (file.path.startsWith(DIARY_FOLDER)) return true;
		const fm = this.app.metadataCache.getFileCache(file);
		return !!(fm && fm.frontmatter && fm.frontmatter.journal);
	}

	sync() {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const v = leaf.view;
			if (!(v instanceof MarkdownView)) continue;
			const o = this.outlines.get(v);
			if (!o) {
				const n = new Outline(this, v);
				this.outlines.set(v, n);
				n.refresh();
			} else if (o.path !== (v.file ? v.file.path : null) || (v.file && o.text !== v.getViewData())) {
				o.refresh();
			}
		}
	}
};
