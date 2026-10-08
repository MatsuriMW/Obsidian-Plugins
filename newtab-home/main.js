// ⌘T 新标签页：原生的标题和选项由 styles.css 隐藏，换成 库名 + 搜索条 + 四个按钮，都在这个标签页里打开
// 从这个页面打开的任何东西，都会先往该标签页的历史里压一条「新标签页」，所以后退（← 按钮 / ⌘⌥← / 手势）能回到这个页面
const { Plugin, Notice, TFile, setIcon, prepareFuzzySearch, renderMatches } = require("obsidian");

const ACTIONS = [
	{ title: "打开任务看板", icon: "list-checks", color: "blue", run: (p, leaf) => p.openNote(leaf, "Concepts/知识管理/任务管理") },
	{ title: "打开 LLM Wiki", icon: "library", color: "purple", run: (p, leaf) => p.openView(leaf, "llm-wiki-view", "LLM Wiki") },
	{ title: "打开每日回顾", icon: "history", color: "orange", run: (p, leaf) => p.openView(leaf, "sb-daily-review", "第二大脑") },
	{ title: "打开书架", icon: "book-open", color: "green", run: (p, leaf) => p.openView(leaf, "weave-epub-bookshelf-sidebar-standalone", "织文阅者") },
];
const LOGO = "Klauschen";
const MAX_RESULTS = 8;
const MAX_RECENT = 6;
const HOME_TITLE = "新标签页";
const HOME_ICON = "lucide-file-plus";

// 原生新标签页（empty view）的状态；Obsidian 自己不会把它记进历史，所以要手动压一条
const homeState = () => ({ type: "empty", state: {} });

class SearchBox {
	constructor(plugin, leaf, parent) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.leaf = leaf;
		this.items = [];
		this.sel = 0;
		const wrap = parent.createDiv({ cls: "nth-search-wrap" });
		this.card = wrap.createDiv({ cls: "nth-search" });
		const bar = this.card.createDiv({ cls: "nth-search-bar" });
		setIcon(bar.createSpan({ cls: "nth-search-icon" }), "search");
		this.input = bar.createEl("input", { type: "text", attr: { placeholder: "search my brain", spellcheck: "false" } });
		this.list = this.card.createDiv({ cls: "nth-results" });
		bar.addEventListener("mousedown", (e) => { if (e.target !== this.input) { e.preventDefault(); this.input.focus(); } });
		this.input.addEventListener("input", () => this.update());
		this.input.addEventListener("focus", () => this.update());
		this.input.addEventListener("blur", () => this.card.removeClass("is-open"));
		this.input.addEventListener("keydown", (e) => this.onKey(e));
	}

	update() {
		const q = this.input.value.trim();
		this.items = q ? this.search(q) : this.recent();
		if (q) this.items.push({ kind: "fulltext", q });
		this.sel = 0;
		this.render(q);
	}

	search(q) {
		const fuzzy = prepareFuzzySearch(q);
		const out = [];
		for (const file of this.app.vault.getFiles()) {
			const m = fuzzy(file.basename);
			if (m) { out.push({ kind: "file", file, score: m.score, matches: m.matches }); continue; }
			const mp = fuzzy(file.path);
			if (mp) out.push({ kind: "file", file, score: mp.score - 1 });
		}
		return out.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
	}

	recent() {
		const items = this.app.workspace.getLastOpenFiles()
			.map((p) => this.app.vault.getAbstractFileByPath(p))
			.filter((f) => f instanceof TFile)
			.slice(0, MAX_RECENT)
			.map((file) => ({ kind: "file", file, recent: true }));
		if (items.length) items.push({ kind: "clear" });
		return items;
	}

	render(q) {
		this.list.empty();
		this.card.toggleClass("is-open", this.items.length > 0);
		if (!q && this.items.length) this.list.createDiv({ cls: "nth-results-label", text: "最近打开" });
		this.rows = this.items.map((it, i) => {
			const row = this.list.createDiv({ cls: "nth-result" });
			const icon = row.createSpan({ cls: "nth-result-icon" });
			const name = row.createSpan({ cls: "nth-result-name" });
			if (it.kind === "fulltext") {
				row.addClass("is-fulltext");
				setIcon(icon, "search");
				name.setText(`全文搜索「${it.q}」`);
			} else if (it.kind === "clear") {
				row.addClass("is-clear");
				setIcon(icon, "eraser");
				name.setText("清除最近打开");
			} else {
				const f = it.file;
				setIcon(icon, it.recent ? "clock" : f.extension === "md" ? "file-text" : "file");
				if (it.matches) renderMatches(name, f.basename, it.matches);
				else name.setText(f.basename);
				if (f.extension !== "md") row.createSpan({ cls: "nth-result-ext", text: f.extension });
				const dir = f.parent && f.parent.path !== "/" ? f.parent.path : "";
				if (dir) row.createSpan({ cls: "nth-result-path", text: dir });
				if (it.recent) {
					const x = row.createSpan({ cls: "nth-result-x", attr: { "aria-label": "从最近打开里移除" } });
					setIcon(x, "x");
					x.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
					x.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						this.plugin.clearRecent(f.path);
						this.update();
						this.input.focus();
					});
				}
			}
			row.addEventListener("mousedown", (e) => e.preventDefault());
			row.addEventListener("mouseenter", () => this.select(i));
			row.addEventListener("click", (e) => this.choose(it, e.metaKey || e.ctrlKey));
			return row;
		});
		this.select(0);
	}

	select(i) {
		this.sel = i;
		(this.rows || []).forEach((r, k) => r.toggleClass("is-selected", k === i));
	}

	onKey(e) {
		if (e.isComposing || e.keyCode === 229) return;
		const n = this.items.length;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			if (n) this.select((this.sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (this.items[this.sel]) this.choose(this.items[this.sel], e.metaKey || e.ctrlKey);
		} else if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			if (this.input.value) { this.input.value = ""; this.update(); } else this.input.blur();
		}
	}

	choose(it, newTab) {
		if (it.kind === "clear") {
			if (this.plugin.clearRecent()) new Notice("已清除最近打开");
			this.update();
			this.input.focus();
			return;
		}
		this.input.blur();
		if (it.kind === "fulltext") return this.plugin.globalSearch(it.q);
		const leaf = newTab ? this.app.workspace.getLeaf("tab") : this.leaf;
		this.plugin.pushHomeHistory(leaf);
		leaf.openFile(it.file, { active: true });
	}
}

module.exports = class NewTabHome extends Plugin {
	onload() {
		const ws = this.app.workspace;
		ws.onLayoutReady(() => this.decorateAll());
		this.registerEvent(ws.on("layout-change", () => this.decorateAll()));
		this.registerEvent(ws.on("active-leaf-change", () => this.decorateAll()));
	}

	onunload() {
		document.querySelectorAll(".nth-home").forEach((el) => el.remove());
	}

	decorateAll() {
		const ws = this.app.workspace;
		for (const leaf of ws.getLeavesOfType("empty")) {
			const root = leaf.getRoot();
			if (root !== ws.leftSplit && root !== ws.rightSplit) this.decorate(leaf);
		}
	}

	decorate(leaf) {
		const list = leaf.view.containerEl.querySelector(".empty-state-action-list");
		if (!list || list.parentElement.querySelector(":scope > .nth-home")) return;
		const home = list.parentElement.createDiv({ cls: "nth-home" });
		home.createDiv({ cls: "nth-logo", text: LOGO });
		new SearchBox(this, leaf, home);

		const acts = home.createDiv({ cls: "nth-actions" });
		for (const a of ACTIONS) {
			const el = acts.createDiv({ cls: `nth-action nth-c-${a.color}`, attr: { tabindex: "0" } });
			setIcon(el.createSpan({ cls: "nth-action-icon" }), a.icon);
			el.createSpan({ cls: "nth-action-label", text: a.title });
			el.addEventListener("click", () => a.run(this, leaf));
			el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.run(this, leaf); } });
		}
	}

	// 打开之前先压一条「新标签页」进历史，这样后退能回到这个页面
	pushHomeHistory(leaf) {
		const h = leaf && leaf.history;
		if (!h || typeof h.pushState !== "function") return;
		const back = h.backHistory || (h.backHistory = []);
		const last = back[back.length - 1];
		if (last && last.nthHome) return;
		h.pushState({ title: HOME_TITLE, icon: HOME_ICON, state: homeState(), eState: {}, nthHome: true });
	}

	// 清掉 Obsidian 的「最近打开」记录：给 path 只删一条，不给就全清
	clearRecent(path) {
		const ws = this.app.workspace;
		const tracker = ws.recentFileTracker;
		if (!tracker || !Array.isArray(tracker.lastOpenFiles)) return false;
		tracker.lastOpenFiles = path ? tracker.lastOpenFiles.filter((p) => p !== path) : [];
		if (typeof ws.requestSaveLayout === "function") ws.requestSaveLayout();
		return true;
	}

	async openNote(leaf, path) {
		const f = this.app.metadataCache.getFirstLinkpathDest(path, "");
		if (!(f instanceof TFile)) return new Notice(`没找到「${path}」`);
		this.pushHomeHistory(leaf);
		await leaf.openFile(f, { active: true });
	}

	async openView(leaf, type, pluginName) {
		if (!this.app.viewRegistry.getViewCreatorByType(type)) return new Notice(`「${pluginName}」插件没有启用`);
		this.pushHomeHistory(leaf);
		await leaf.setViewState({ type, active: true });
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
	}

	globalSearch(q) {
		const gs = this.app.internalPlugins.getPluginById("global-search");
		if (!gs || !gs.enabled) return new Notice("核心插件「搜索」没有启用");
		gs.instance.openGlobalSearch(q);
	}
};
