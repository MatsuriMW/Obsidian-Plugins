// 书签图标：书签面板里每个笔记不再都是同一个「文件」图标，换成各自的图标 + 淡色底的小方块
//   · 先看笔记属性：icon（Lucide 图标名，如 dumbbell；或者直接写一个 emoji）、icon-color（red / orange / yellow / green / cyan / blue / purple / pink / gray）
//   · 没写属性就按下面的 RULES 匹配路径（从上往下，第一条命中的算）；都没命中：type 是「看板」的用 layout-dashboard，其余 file-text
//   · 只改显示：不碰 bookmarks.json，也不改笔记
//   · 书签面板重画（加删书签、拖动、折叠、搜索）时用 MutationObserver 跟着补上，已经画好的不重复画
//   · 角标：这篇笔记靠别的笔记里的数据（看板 ← 数据表），数据变了而它还没被打开看过，图标上亮一个小红点；打开它就灭
//       盯哪份数据：笔记属性 badge-watch（一个路径，或者一组路径），没写就按 WATCH 匹配
//       「变了」比的是表格里的数据行，不是文件的修改时间：改说明文字、iCloud 重新同步都不会亮
//       红点放哪个角跟着图标走（DOT_AT）：放在图形留空的那个角，不压住图形；没列出来的放右上
const { Plugin, setIcon, getIconIds } = require("obsidian");

const RULES = [
	[/任务管理/, "list-checks", "blue"],
	[/力量训练|健康/, "dumbbell", "red"],
	[/资产/, "wallet", "green"],
	[/小说选题/, "feather", "orange"],
	[/选题/, "lightbulb", "yellow"],
	[/长期项目/, "target", "purple"],
	[/AI 学习|AI学习/, "brain-circuit", "cyan"],
	[/素材库|典故/, "quote", "orange"],
	[/穿搭/, "shirt", "pink"],
	[/审美/, "palette", "pink"],
	[/家居|环境/, "sofa", "green"],
	[/towatch|toread|tolisten/i, "inbox", "blue"],
	[/待听/, "headphones", "purple"],
	[/待看|影视/, "tv", "red"],
	[/待读/, "book-open", "orange"],
	[/音乐/, "headphones", "purple"],
	[/已发表/, "newspaper", "blue"],
	[/书单|Books\//, "library", "cyan"],
	[/宝的|^宝\//, "heart", "pink"],
	[/菜谱/, "chef-hat", "orange"],
	[/使用手册|手册/, "book-marked", "gray"],
	[/SuperTag|速查/i, "tags", "gray"],
	[/日记|journal/i, "calendar-days", "blue"],
];
// 看板 ← 它的数据笔记
const WATCH = [
	[/力量训练与健康/, ["健康/体重记录.md"]],
];
// tr 右上 / br 右下 / tl 左上 / bl 左下。哑铃、羽毛是从左下斜到右上的，右上被占了
const DOT_AT = { dumbbell: "br", feather: "br", "book-open": "br", lightbulb: "br", headphones: "tr", heart: "tr" };
const ROW_RE = /^\s*\|\s*\d{4}-\d{1,2}-\d{1,2}\s*\|/;
const hash = (text) => { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

const COLORS = new Set(["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"]);
const EMOJI_RE = /^\p{Extended_Pictographic}/u;

const CSS = `
.bmi-tile { display: inline-flex !important; align-items: center; justify-content: center; width: 20px; height: 20px;
	border-radius: 6px; background: color-mix(in srgb, var(--bmi-c) 16%, transparent); color: var(--bmi-c) !important; --icon-color: var(--bmi-c); flex: none; }
.bmi-tile svg.svg-icon { width: 13px; height: 13px; stroke-width: 2.2; color: var(--bmi-c) !important; }
.bmi-hide { display: none; }
.bmi-tile.bmi-emoji { background: color-mix(in srgb, var(--bmi-c) 12%, transparent); font-size: 12px; line-height: 1; }
.bookmark .tree-item-icon.bmi-tile { margin-inline-end: 6px; }
.bookmark:hover .bmi-tile { background: color-mix(in srgb, var(--bmi-c) 26%, transparent); }
.bmi-tile { position: relative; overflow: visible; }
.bmi-dot { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #e5484d; pointer-events: none;
	box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--bmi-c) 16%, var(--background-secondary)); animation: bmi-pop .32s cubic-bezier(.3, 1.7, .5, 1) both; }
.bmi-dot-tr { top: 0; right: 0; } .bmi-dot-br { bottom: 0; right: 0; } .bmi-dot-tl { top: 0; left: 0; } .bmi-dot-bl { bottom: 0; left: 0; }
@keyframes bmi-pop { from { transform: scale(0); } to { transform: scale(1); } }
`;

module.exports = class BookmarkIcons extends Plugin {
	async onload() {
		this.seen = ((await this.loadData()) || {}).seen || {};   // 笔记路径 → 上次打开它时数据的样子
		this.dots = new Set();                                    // 现在亮着红点的笔记
		this.icons = new Set(getIconIds().map((id) => id.replace(/^lucide-/, "")));
		this.styleEl = document.head.createEl("style", { text: CSS });
		this.register(() => this.styleEl.remove());
		this.observers = new Map();
		this.app.workspace.onLayoutReady(() => { this.hookAll(); this.checkDots(); });
		this.registerEvent(this.app.workspace.on("layout-change", () => this.hookAll()));
		// 改了笔记的 icon / icon-color 属性：重画
		this.registerEvent(this.app.metadataCache.on("changed", (f) => { if (this.bookmarked(f.path)) { this.repaintAll(true); this.checkDots(); } }));
		// 数据笔记变了（手改的、同步脚本写的都算）：看看要不要亮红点；打开了那篇看板：灭掉
		let t = 0;
		const later = () => { window.clearTimeout(t); t = window.setTimeout(() => this.checkDots(), 300); };
		this.registerEvent(this.app.vault.on("modify", (f) => { if (this.watchedPaths().has(f.path)) later(); }));
		this.registerEvent(this.app.workspace.on("file-open", (f) => { if (f && this.dots.has(f.path)) this.checkDots(); }));
		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => { const f = leaf?.view?.file; if (f && this.dots.has(f.path)) this.checkDots(); }));
		this.register(() => {
			for (const ob of this.observers.values()) ob.disconnect();
			this.repaintAll(true, true);
		});
	}

	get bm() { return this.app.internalPlugins.getPluginById("bookmarks")?.instance; }

	bookmarked(path) {
		let hit = false;
		const walk = (items) => items.forEach((i) => { if (i.path === path) hit = true; if (i.items) walk(i.items); });
		walk(this.bm?.items || []);
		return hit;
	}

	// 这篇笔记盯着哪几份数据
	watchOf(path) {
		const file = this.app.vault.getAbstractFileByPath(path);
		const fm = file ? this.app.metadataCache.getFileCache(file)?.frontmatter || {} : {};
		const own = fm["badge-watch"];
		if (own) return [].concat(own).map((x) => String(x).trim().replace(/^\[\[|\]\]$/g, "")).filter(Boolean).map((x) => (/\.\w+$/.test(x) ? x : `${x}.md`));
		const r = WATCH.find(([re]) => re.test(path));
		return r ? r[1] : [];
	}
	bookmarkedPaths() {
		const out = [];
		const walk = (items) => items.forEach((i) => { if (i.type === "file" && i.path) out.push(i.path); if (i.items) walk(i.items); });
		walk(this.bm?.items || []);
		return out;
	}
	watchedPaths() {
		const set = new Set();
		for (const p of this.bookmarkedPaths()) for (const w of this.watchOf(p)) set.add(w);
		return set;
	}
	// 数据现在的样子：表格里带日期的那些行。没有表格（或者文件不在）就拿整篇
	async stateOf(paths) {
		const parts = [];
		for (const p of paths) {
			const f = this.app.vault.getAbstractFileByPath(p);
			if (!f) { parts.push(""); continue; }
			const text = await this.app.vault.cachedRead(f);
			const rows = text.split("\n").filter((l) => ROW_RE.test(l));
			parts.push(hash(rows.length ? rows.join("\n") : text));
		}
		return parts.join(".");
	}
	// 重新算一遍哪些书签该亮红点。正开着（在最前面）的那篇算看过了；第一次见到的不亮，只记下现在的样子
	async checkDots() {
		const active = this.app.workspace.getActiveFile()?.path;
		const dots = new Set();
		let dirty = false;
		for (const path of this.bookmarkedPaths()) {
			const watch = this.watchOf(path);
			if (!watch.length) continue;
			const now = await this.stateOf(watch);
			if (this.seen[path] === undefined || (path === active && this.seen[path] !== now)) { this.seen[path] = now; dirty = true; }
			if (this.seen[path] !== now) dots.add(path);
		}
		if (dirty) await this.saveData({ seen: this.seen });
		const changed = dots.size !== this.dots.size || [...dots].some((p) => !this.dots.has(p));
		this.dots = dots;
		if (changed) this.repaintAll();
	}

	hookAll() {
		for (const leaf of this.app.workspace.getLeavesOfType("bookmarks")) {
			const view = leaf.view;
			if (!view?.itemDoms || this.observers.has(view)) { this.paint(view); continue; }
			let t = 0;
			const ob = new MutationObserver(() => { window.clearTimeout(t); t = window.setTimeout(() => this.paint(view), 30); });
			ob.observe(view.containerEl, { childList: true, subtree: true });
			this.observers.set(view, ob);
			this.paint(view);
		}
	}

	repaintAll(force, restore) {
		for (const leaf of this.app.workspace.getLeavesOfType("bookmarks")) this.paint(leaf.view, force, restore);
	}

	// 这个书签该用什么图标：{ icon, color, emoji }
	pick(item) {
		const file = this.app.vault.getAbstractFileByPath(item.path);
		const fm = file ? this.app.metadataCache.getFileCache(file)?.frontmatter || {} : {};
		let icon = fm.icon ? String(fm.icon).trim() : "", color = fm["icon-color"] ? String(fm["icon-color"]).trim() : "";
		if (icon && !EMOJI_RE.test(icon)) icon = icon.replace(/^lucide-/, "");
		if (!icon) {
			const r = RULES.find(([re]) => re.test(item.path));
			if (r) { icon = r[1]; color = color || r[2]; }
		}
		if (!icon) icon = fm.type === "看板" ? "layout-dashboard" : "file-text";
		const emoji = EMOJI_RE.test(icon);
		if (!emoji && !this.icons.has(icon)) icon = "file-text";
		return { icon, emoji, color: COLORS.has(color) ? `var(--color-${color})` : "var(--text-muted)" };
	}

	// 名字开头的 emoji（📺待看）和图标重复了：只在面板里藏起来，书签标题和文件名都不改
	hideLeadingEmoji(inner) {
		const node = inner && inner.firstChild;
		if (!node || node.nodeType !== Node.TEXT_NODE) return;
		const m = node.textContent.match(/^(?:\p{Extended_Pictographic}️?‍?)+\s*/u);
		if (!m || m[0].length >= node.textContent.length) return;
		const span = createSpan({ cls: "bmi-hide", text: m[0] });
		node.textContent = node.textContent.slice(m[0].length);
		inner.insertBefore(span, node);
	}

	paint(view, force, restore) {
		if (!view?.itemDoms) return;
		const walk = (items) => items.forEach((item) => {
			if (item.items) walk(item.items);
			if (item.type !== "file" || !item.path || item.path.endsWith(".canvas")) return;
			const dom = view.itemDoms.get(item);
			const el = dom?.iconEl;
			if (!el) return;
			if (restore) {
				if (el.dataset.bmi) { el.querySelectorAll(".bmi-dot").forEach((d) => d.remove()); el.removeClass("bmi-tile", "bmi-emoji"); el.style.removeProperty("--bmi-c"); delete el.dataset.bmi; setIcon(el, "lucide-file"); }
				(dom.titleEl || dom.innerEl)?.querySelectorAll(".bmi-hide").forEach((s) => s.replaceWith(s.textContent));
				return;
			}
			this.hideLeadingEmoji(dom.titleEl || dom.innerEl);
			const p = this.pick(item);
			const dot = this.dots.has(item.path) ? DOT_AT[p.icon] || "tr" : "";
			const sig = `${p.icon}|${p.color}|${dot}`;
			if (!force && el.dataset.bmi === sig) return;
			el.dataset.bmi = sig;
			el.addClass("bmi-tile");
			el.toggleClass("bmi-emoji", p.emoji);
			el.style.setProperty("--bmi-c", p.color);
			el.querySelectorAll(".bmi-dot").forEach((d) => d.remove());   // setIcon 只换图形，不会清掉上一次的红点
			if (p.emoji) { el.empty(); el.setText(p.icon); } else setIcon(el, p.icon);
			if (dot) el.createSpan({ cls: `bmi-dot bmi-dot-${dot}`, attr: { "aria-label": "数据更新了，还没看" } });
		});
		walk(this.bm?.items || []);
	}
};
