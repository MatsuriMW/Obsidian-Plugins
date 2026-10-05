// 书签图标：书签面板里每个笔记不再都是同一个「文件」图标，换成各自的图标 + 淡色底的小方块
//   · 先看笔记属性：icon（Lucide 图标名，如 dumbbell；或者直接写一个 emoji）、icon-color（red / orange / yellow / green / cyan / blue / purple / pink / gray）
//   · 没写属性就按下面的 RULES 匹配路径（从上往下，第一条命中的算）；都没命中：type 是「看板」的用 layout-dashboard，其余 file-text
//   · 只改显示：不碰 bookmarks.json，也不改笔记
//   · 书签面板重画（加删书签、拖动、折叠、搜索）时用 MutationObserver 跟着补上，已经画好的不重复画
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
`;

module.exports = class BookmarkIcons extends Plugin {
	onload() {
		this.icons = new Set(getIconIds().map((id) => id.replace(/^lucide-/, "")));
		this.styleEl = document.head.createEl("style", { text: CSS });
		this.register(() => this.styleEl.remove());
		this.observers = new Map();
		this.app.workspace.onLayoutReady(() => this.hookAll());
		this.registerEvent(this.app.workspace.on("layout-change", () => this.hookAll()));
		// 改了笔记的 icon / icon-color 属性：重画
		this.registerEvent(this.app.metadataCache.on("changed", (f) => { if (this.bookmarked(f.path)) this.repaintAll(true); }));
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
				if (el.dataset.bmi) { el.removeClass("bmi-tile", "bmi-emoji"); el.style.removeProperty("--bmi-c"); delete el.dataset.bmi; setIcon(el, "lucide-file"); }
				(dom.titleEl || dom.innerEl)?.querySelectorAll(".bmi-hide").forEach((s) => s.replaceWith(s.textContent));
				return;
			}
			this.hideLeadingEmoji(dom.titleEl || dom.innerEl);
			const p = this.pick(item);
			const sig = `${p.icon}|${p.color}`;
			if (!force && el.dataset.bmi === sig) return;
			el.dataset.bmi = sig;
			el.addClass("bmi-tile");
			el.toggleClass("bmi-emoji", p.emoji);
			el.style.setProperty("--bmi-c", p.color);
			if (p.emoji) { el.empty(); el.setText(p.icon); } else setIcon(el, p.icon);
		});
		walk(this.bm?.items || []);
	}
};
