// 快捷键总览：给 Obsidian 自带的「设置 → 快捷键」加聚类和透视，不另开界面，改快捷键仍用原来的那一套
//   · 分组：按插件（默认）/ 不分组；每组标题上写这一组有几个快捷键、几个是我改过的、几处冲突，点标题折叠
//   · 筛选：来源（自制 / 改版 / 社区 / 核心）、某一个插件，和自带的「全部 / 已分配 / 由我分配 / 未分配 / 冲突」叠加
//   · 情境快捷键：写死在插件里、只在某个场景下生效的按键（比如反链就地编辑里的 ⌘↩、命令面板里的 Tab），
//     也按插件列进来，可以搜索和筛选，标注「只在…时生效」；它们不是命令，不能在这里改
// 只改显示：渲染完原来的列表后，把条目重新排进分组；原来条目上的「＋ / × / 恢复默认」照常可用
const { Plugin } = require("obsidian");

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD_ORDER = ["Mod", "Ctrl", "Meta", "Alt", "Shift"];
const MOD_SYM = IS_MAC ? { Mod: "⌘", Meta: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧" } : { Mod: "Ctrl", Meta: "Win", Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift" };
const KEY_SYM = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Enter: "↩", Escape: "Esc", Backspace: "⌫", Delete: "⌦", " ": "Space" };
const SOURCE_NAME = { mine: "自制", mod: "改版", community: "社区", core: "核心" };
const SOURCE_ORDER = { mine: 0, mod: 1, community: 2, core: 3 };
// 核心命令的前缀 → 显示名（内置插件的名字从 Obsidian 里取，取不到才用这里）
const CORE_NAMES = {
	editor: "编辑器", app: "应用", workspace: "工作区", window: "窗口", markdown: "Markdown", theme: "外观",
	"open-with-default-app": "用默认应用打开", "insert-template": "模板", "file-explorer": "文件列表",
};

// 情境快捷键：写死在插件里、只在某个场景下才生效（不是 Obsidian 命令）。按插件 id 登记；
// 插件自己也可以在实例上挂 contextHotkeys = [{ keys, name, when }]，会优先用插件自己的
const CONTEXT = {
	"backlink-defaults": [
		{ keys: ["Mod+Enter", "Mod+S"], name: "保存就地编辑", when: "反链里就地编辑时" },
		{ keys: ["Escape"], name: "取消就地编辑", when: "反链里就地编辑时" },
		{ keys: ["Mod+B", "Mod+I", "Mod+E", "Mod+Shift+H"], name: "加粗 / 斜体 / 行内代码 / 高亮", when: "反链里就地编辑时" },
		{ keys: ["Tab", "Shift+Tab"], name: "调整所选行缩进", when: "反链里就地编辑时" },
		{ keys: ["点击"], name: "面包屑：展开这一级的上下文", when: "反链面包屑上" },
		{ keys: ["Mod+点击"], name: "面包屑：跳到原文", when: "反链面包屑上" },
		{ keys: ["Shift+点击"], name: "在右侧栏叠放打开（链接 / 块 / 面包屑 / 文件标题）", when: "反链面板里" },
	],
	"second-brain": [
		{ keys: ["右键"], name: "不再作为卡片（去掉 #card / 挖空标记，可撤销）", when: "每日回顾的随机漫步卡片上" },
		{ keys: ["Mod+点击"], name: "打开原文并定位高亮（那篇已开着就切过去，不另开标签）", when: "每日回顾的卡片 / 面包屑上（单点不跳）" },
		{ keys: ["点击"], name: "选中这张卡片，好用键盘作答", when: "每日回顾的随机漫步卡片上" },
		{ keys: [" "], name: "揭开", when: "每日回顾里选中了一张卡片时" },
		{ keys: ["1", "2", "3", "4"], name: "作答：重来 / 困难 / 良好 / 简单（写进 Anki）", when: "每日回顾里选中的卡片揭开后" },
		{ keys: ["ArrowUp", "ArrowDown"], name: "换一张选中的卡片", when: "每日回顾面板是当前焦点时" },
	],
	"esc-select-block": [
		{ keys: ["Escape"], name: "选中光标所在的整个列表块（再按回到原来的光标）", when: "编辑器里" },
		{ keys: ["ArrowUp", "ArrowDown"], name: "在块之间切换", when: "已选中整块时" },
		{ keys: ["Shift+ArrowUp", "Shift+ArrowDown"], name: "扩选到上 / 下一块", when: "已选中整块时" },
		{ keys: ["Enter"], name: "回到编辑（光标在块首行末尾）", when: "已选中整块时" },
		{ keys: ["[", "（", "【", "「"], name: "选中文字后输入成对符号 = 包裹", when: "有选中文字时" },
		{ keys: ["Enter"], name: "确认包裹：光标跳到右半边符号后面，不换行", when: "选中的文字被成对符号包着时" },
	],
	"palette-split-open": [
		{ keys: ["Mod+Alt+Enter"], name: "在右侧拆分打开（最多 3 栏）", when: "⌘O 文件搜索面板里" },
		{ keys: ["Tab"], name: "加一层全文搜索；再按一次打开全局搜索", when: "⌘O 文件搜索面板里" },
		{ keys: ["Mod+Shift+O", "Mod+Shift+M", "Mod+Shift+K"], name: "切换搜索范围：Wiki 条目 / 书签 / 卡片（再按一次取消；键位跟着同名命令改）", when: "Better Command Palette 面板里" },
		{ keys: ["Backspace"], name: "退出搜索范围，回到普通文件搜索", when: "范围搜索、输入框为空时" },
	],
	"llm-wiki": [{ keys: ["Mod+Enter"], name: "提交问题", when: "Wiki 面板提问框里" }],
	journals: [{ keys: ["Mod+Enter"], name: "在新标签页打开这篇日记", when: "「没整理完的日记」列表里（⌘⇧J）" }],
	"done-to-top": [{ keys: ["/明天"], name: "把光标所在块发送到明天的日记", when: "编辑器里输入" }],
	"chrome-tab-groups": [{ keys: ["Enter", "Escape"], name: "结束编辑分组名", when: "编辑标签页分组名时" }],
};

const DEFAULTS = { groupBy: "plugin", source: "all", plugin: "", showContext: true, collapsed: [] };

function parseKey(s) {
	const parts = s.split("+");
	const key = parts.pop();
	return { modifiers: parts, key };
}
function normMods(mods) {
	return [...new Set((mods || []).map((m) => (m === "Meta" && IS_MAC ? "Mod" : m)))].sort((a, b) => MOD_ORDER.indexOf(a) - MOD_ORDER.indexOf(b));
}
function fmtKey(h) {
	const key = KEY_SYM[h.key] || (h.key.length === 1 ? h.key.toUpperCase() : h.key);
	return [...normMods(h.modifiers).map((m) => MOD_SYM[m]), key].join(" ");
}

module.exports = class HotkeyAtlas extends Plugin {
	async onload() {
		this.state = Object.assign({}, DEFAULTS, await this.loadData());
		if (this.state.groupBy !== "none") this.state.groupBy = "plugin";
		delete this.state.mods;
		this.app.workspace.onLayoutReady(() => this.patch());
		this.addCommand({
			id: "open",
			name: "打开快捷键设置（按插件分组）",
			callback: () => this.openTab(),
		});
		this.addCommand({
			id: "open-mine",
			name: "只看自制插件的快捷键",
			callback: () => { Object.assign(this.state, { source: "mine", plugin: "" }); this.save(); this.openTab(); },
		});
	}

	onunload() {
		const tab = this.tab();
		if (tab && this.origRender) {
			Object.getPrototypeOf(tab).renderHotkeyList = this.origRender;
			if (tab.__haBar) tab.__haBar.remove();
			if (tab.containerEl.isConnected) tab.renderHotkeyList();
		}
	}

	save() { this.saveData(this.state); }
	tab() { return this.app.setting && this.app.setting.settingTabs.find((t) => t.id === "hotkeys"); }
	openTab() { this.app.setting.open(); this.app.setting.openTabById("hotkeys"); }

	patch() {
		const tab = this.tab();
		if (!tab) return;
		const proto = Object.getPrototypeOf(tab);
		if (proto.__haPatched) return;
		const plugin = this;
		const orig = (this.origRender = proto.renderHotkeyList);
		proto.renderHotkeyList = function (...args) {
			orig.apply(this, args);
			try { plugin.decorate(this); } catch (e) { console.error("[hotkey-atlas]", e); }
		};
		proto.__haPatched = true;
		this.register(() => { proto.__haPatched = false; });
	}

	// ---------- 命令 → 插件 ----------

	pluginOf(cmdId) {
		const i = cmdId.indexOf(":");
		const pid = i < 0 ? cmdId : cmdId.slice(0, i);
		const man = this.app.plugins.manifests[pid];
		if (man) {
			const a = man.author || "";
			return { id: pid, name: man.name, source: /^马自立/.test(a) ? (/改自/.test(a) ? "mod" : "mine") : "community" };
		}
		const ip = this.app.internalPlugins && this.app.internalPlugins.plugins[pid];
		const name = (ip && ip.instance && ip.instance.name) || CORE_NAMES[pid] || pid;
		return { id: pid, name, source: "core" };
	}

	// 当前所有命令的快捷键信息，按命令名索引（原列表的条目只有名字）
	commandIndex(tab) {
		const hm = this.app.hotkeyManager;
		const byName = new Map();
		for (const c of Object.values(this.app.commands.commands)) {
			const custom = hm.getHotkeys(c.id), def = hm.getDefaultHotkeys(c.id);
			const keys = custom || def || [];
			const info = { cmd: c, plugin: this.pluginOf(c.id), keys, mine: custom !== undefined, conflict: tab.conflicts && tab.conflicts.has(c.name) };
			if (!byName.has(c.name)) byName.set(c.name, info);
		}
		return byName;
	}

	contextRows() {
		const rows = [];
		const ids = new Set([...Object.keys(CONTEXT), ...Object.keys(this.app.plugins.plugins)]);
		for (const pid of ids) {
			if (!this.app.plugins.enabledPlugins.has(pid)) continue;
			const inst = this.app.plugins.plugins[pid];
			const list = (inst && Array.isArray(inst.contextHotkeys) && inst.contextHotkeys) || CONTEXT[pid];
			if (!list) continue;
			const plugin = this.pluginOf(pid + ":");
			for (const r of list) rows.push({ plugin, name: r.name, when: r.when, keys: r.keys.map(parseKey), context: true });
		}
		return rows;
	}

	// ---------- 筛选 ----------

	passes(info) {
		const st = this.state;
		if (st.source !== "all" && info.plugin.source !== st.source) return false;
		if (st.plugin && info.plugin.id !== st.plugin) return false;
		return true;
	}

	contextPasses(tab, row, query) {
		if (!this.state.showContext || !this.passes(row)) return false;
		if (!["show-all", "show-assigned"].includes(tab.activeStatusFilter)) return false;
		if (query && !(row.name + " " + row.when + " " + row.plugin.name + " " + row.plugin.id).toLowerCase().includes(query)) return false;
		const f = tab.activeHotkeyFilter;
		if (f && !row.keys.some((h) => h.key.toLowerCase() === (f.key || "").toLowerCase() && normMods(h.modifiers).join() === normMods(f.modifiers).join())) return false;
		return true;
	}

	groupKey(info) {
		const g = this.state.groupBy;
		if (g === "plugin") return { key: "p:" + info.plugin.id, label: info.plugin.name, source: info.plugin.source, order: SOURCE_ORDER[info.plugin.source] + "|" + info.plugin.name.toLowerCase() };
		return { key: "all", label: "", order: "" };
	}

	// ---------- 渲染 ----------

	decorate(tab) {
		const group = tab.hotkeyGroup;
		if (!group || !group.listEl) return;
		this.renderBar(tab);
		const index = this.commandIndex(tab);
		const query = (tab.searchComponent && tab.searchComponent.inputEl.value || "").trim().toLowerCase();

		const groups = new Map();
		const put = (info, el) => {
			const g = this.groupKey(info);
			if (!groups.has(g.key)) groups.set(g.key, Object.assign(g, { els: [], keys: 0, mine: 0, conflict: 0, cmds: 0, ctx: 0 }));
			const G = groups.get(g.key);
			G.els.push(el);
			if (info.context) { G.ctx++; return; }
			G.cmds++;
			if (info.keys.length) G.keys++;
			if (info.mine) G.mine++;
			if (info.conflict) G.conflict++;
		};
		let empty = null;
		for (const s of group.settings) {
			if (s.settingEl.hasClass("mod-empty-state")) { empty = s.settingEl; continue; }
			const info = index.get(s.nameEl.textContent);
			if (!info) { put({ plugin: { id: "?", name: "其它", source: "core" }, keys: [] }, s.settingEl); continue; }
			if (!this.passes(info)) { s.settingEl.detach(); continue; }
			s.settingEl.toggleClass("ha-mine", info.mine);
			put(info, s.settingEl);
		}
		for (const row of this.contextRows()) if (this.contextPasses(tab, row, query)) put(row, this.renderContextRow(row));

		const list = group.listEl;
		list.empty();
		const sorted = [...groups.values()].sort((a, b) => a.order.localeCompare(b.order, "zh"));
		const collapsed = new Set(this.state.collapsed);
		let shown = 0;
		for (const G of sorted) {
			shown += G.els.length;
			if (this.state.groupBy !== "none") {
				const isCol = collapsed.has(G.key) && !query;
				const head = list.createDiv({ cls: "ha-group-head" + (isCol ? " is-collapsed" : "") });
				head.createSpan({ cls: "ha-group-caret", text: isCol ? "▸" : "▾" });
				head.createSpan({ cls: "ha-group-name", text: G.label });
				if (G.source) head.createSpan({ cls: "ha-tag ha-src-" + G.source, text: SOURCE_NAME[G.source] });
				const stat = [];
				if (G.cmds) stat.push(`${G.keys}/${G.cmds} 有快捷键`);
				if (G.mine) stat.push(`我改过 ${G.mine}`);
				if (G.ctx) stat.push(`情境 ${G.ctx}`);
				head.createSpan({ cls: "ha-group-stat", text: stat.join(" · ") });
				if (G.conflict) head.createSpan({ cls: "ha-tag ha-conflict", text: `冲突 ${G.conflict}` });
				head.addEventListener("click", () => {
					const s = new Set(this.state.collapsed);
					if (s.has(G.key)) s.delete(G.key); else s.add(G.key);
					this.state.collapsed = [...s];
					this.save();
					tab.renderHotkeyList();
				});
				if (isCol) continue;
			}
			for (const el of G.els) list.appendChild(el);
		}
		if (!shown && empty) list.appendChild(empty);
		else if (!shown) list.createDiv({ cls: "setting-item mod-empty-state", text: "没有符合条件的快捷键" });
		if (this.summaryEl) {
			const all = [...groups.values()];
			const sum = (k) => all.reduce((n, g) => n + g[k], 0);
			this.summaryEl.setText(`${all.length} 组 · ${sum("cmds")} 条命令，${sum("keys")} 条有快捷键 · 我改过 ${sum("mine")}` + (sum("ctx") ? ` · 情境快捷键 ${sum("ctx")}` : ""));
		}
	}

	renderContextRow(row) {
		const el = createDiv({ cls: "setting-item ha-context" });
		const info = el.createDiv({ cls: "setting-item-info" });
		info.createDiv({ cls: "setting-item-name", text: `${row.plugin.name}: ${row.name}` });
		info.createDiv({ cls: "setting-item-description", text: `只在${row.when}生效 · 写在插件里，不是命令，这里不能改` });
		const keys = el.createDiv({ cls: "setting-item-control" }).createDiv({ cls: "setting-command-hotkeys" });
		for (const h of row.keys) keys.createSpan({ cls: "setting-hotkey ha-context-key", text: fmtKey(h) });
		return el;
	}

	// 工具栏：接在自带的「全部 / 已分配 …」那一行下面
	renderBar(tab) {
		if (tab.__haBar && tab.__haBar.isConnected) { this.syncBar(tab); return; }
		const host = tab.containerEl.querySelector(".setting-group-search-control") || tab.hotkeyGroup.listEl.parentElement;
		const bar = (tab.__haBar = host.createDiv({ cls: "ha-bar" }));
		const rerender = () => { this.save(); tab.renderHotkeyList(); };
		const row = (label) => { const r = bar.createDiv({ cls: "ha-row" }); r.createSpan({ cls: "ha-row-label", text: label }); return r.createDiv({ cls: "setting-group-filters" }); };
		const chips = (r, items, get, set) => {
			for (const [val, text] of items) {
				const c = r.createDiv({ cls: "setting-group-filter", text, attr: { tabIndex: 0, "data-ha": val } });
				c.__haGet = () => get(val);
				const act = () => { set(val); rerender(); };
				c.addEventListener("click", act);
				c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
			}
		};
		chips(row("分组"), [["plugin", "按插件"], ["none", "不分组"]], (v) => this.state.groupBy === v, (v) => { this.state.groupBy = v; });
		chips(row("来源"), [["all", "全部"], ["mine", "自制"], ["mod", "改版"], ["community", "社区"], ["core", "核心"]], (v) => this.state.source === v, (v) => { this.state.source = v; this.state.plugin = ""; });
		const pr = row("插件");
		const sel = (this.pluginSelect = pr.createEl("select", { cls: "dropdown ha-plugin-select" }));
		sel.addEventListener("change", () => { this.state.plugin = sel.value; rerender(); });
		const ctx = pr.createDiv({ cls: "setting-group-filter", text: "情境快捷键", attr: { tabIndex: 0, "aria-label": "列出写死在插件里、只在某个场景生效的按键" } });
		ctx.__haGet = () => this.state.showContext;
		ctx.addEventListener("click", () => { this.state.showContext = !this.state.showContext; rerender(); });
		const reset = pr.createDiv({ cls: "setting-group-filter", text: "清除筛选", attr: { tabIndex: 0 } });
		reset.__haGet = () => false;
		reset.addEventListener("click", () => { Object.assign(this.state, { source: "all", plugin: "" }); rerender(); });
		this.summaryEl = bar.createDiv({ cls: "ha-summary" });
		this.syncBar(tab);
	}

	syncBar(tab) {
		const bar = tab.__haBar;
		bar.querySelectorAll(".setting-group-filter").forEach((c) => c.__haGet && c.toggleClass("is-active", !!c.__haGet()));
		// 插件下拉：按来源筛过的插件，只显示插件名
		const counts = new Map();
		for (const c of Object.values(this.app.commands.commands)) {
			const p = this.pluginOf(c.id);
			if (this.state.source !== "all" && p.source !== this.state.source) continue;
			if (!counts.has(p.id)) counts.set(p.id, { p });
		}
		const sel = this.pluginSelect;
		sel.empty();
		sel.createEl("option", { value: "", text: "全部插件" });
		const list = [...counts.values()].sort((a, b) => SOURCE_ORDER[a.p.source] - SOURCE_ORDER[b.p.source] || a.p.name.localeCompare(b.p.name, "zh"));
		for (const e of list) sel.createEl("option", { value: e.p.id, text: e.p.name });
		sel.value = counts.has(this.state.plugin) ? this.state.plugin : "";
	}
};
