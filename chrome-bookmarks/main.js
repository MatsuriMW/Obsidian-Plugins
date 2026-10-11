// Chrome 书签：侧栏里一棵和 Chrome 双向同步的书签树
//
// 怎么通的：Chrome 那头装扩展「Obsidian 书签桥」（仓库 chrome-bookmarks/extension），这头在 127.0.0.1:27184 起一个本机服务。
//   · Chrome → Obsidian：扩展每次书签变化都把整棵树 POST 过来（/tree），这里存成快照（snapshot）
//   · Obsidian → Chrome：面板里的操作先进队列（queue），扩展长轮询 /poll 一次领一条，执行完 /ack 回执
//   · 面板显示的 = 快照 + 队列里还没执行的操作；所以 Chrome 没开时也能改，连上以后按顺序补做
// 谁能连：只认请求头 Origin 是 chrome-extension://… 的扩展，而且第一次要在弹窗里点「允许」；网页伪造不了这个头
// 不直接改 Chrome 的 Bookmarks 文件：Chrome 开着账号同步，外部改文件会被覆盖，或者同步出重复
//
// 自动同步（文件最后一节）：Chrome 里新收藏的网页，按内容量自动记成待读卡 / 待看卡 / 长期项目块
//
// 面板里：单击打开（默认内置浏览器，⌘ 单击走另一边）、右键菜单、拖动排序 / 拖进文件夹、搜索；删除可以撤销（重新建一份）
// 命令「搜索 Chrome 书签」：打开 Better Command Palette 的「Chrome 书签」范围（Palette Enhancements 插件加的）；那两个没开就用自带的小面板
const { Plugin, ItemView, Notice, Menu, Modal, Setting, PluginSettingTab, FuzzySuggestModal, TFile, setIcon, debounce, getIconIds, requestUrl } = require("obsidian");
const http = require("http");
const { execFile } = require("child_process");

const VIEW = "chrome-bookmarks";
const PORT = 27184;        // 和扩展 manifest 的 host_permissions 是同一个，要改得两边一起改
const POLL_HOLD = 20000;   // 长轮询最多挂多久（扩展的 service worker 30 秒没动静会被 Chrome 回收）
const ALIVE = 35000;       // 这么久没收到扩展的请求，就算断开
const ICON_BATCH = 40;     // 一次向扩展要多少个网站图标
const MAX_HITS = 200;      // 搜索最多列多少条
const PALETTE_PLUGIN = "palette-split-open";
const BCP_FILE_SEARCH = "obsidian-better-command-palette:open-better-commmand-palette-file-search";

const DEFAULT_DATA = {
	origin: "",          // 已允许连接的扩展（chrome-extension://<id>），只认一个
	denied: [],          // 拒绝过的扩展
	openIn: "obsidian",  // 单击书签：obsidian = 内置浏览器，chrome = Chrome
	fold: {},            // 文件夹 id → 是否展开（没记过的：最外层展开，其余折叠）
	snapshot: null,      // Chrome 最近一次推过来的书签树
	snapshotAt: 0,
	queue: [],           // 还没在 Chrome 里执行的操作，按顺序一条一条发
	seq: 0,
	lastParent: "",      // 上次新建书签放进的文件夹
	lastDeleted: null,   // 最近删掉的一条书签或一个文件夹，撤销用
	placed: false,       // 第一次启用时把面板放进左侧栏，之后不再自动放
	autoImport: true,    // Chrome 里新收藏的网页自动整理进笔记
	known: null,         // 已经见过的书签 id；第一次用时把现有的全记上，之后多出来的才算新收藏
	imported: {},        // 书签 id → 整理成了什么、记在哪篇笔记
};

// ---------- 书签树 ----------

const hostOf = (url) => { try { return new URL(url).host; } catch { return ""; } };
const clone = (x) => JSON.parse(JSON.stringify(x));

function normalizeUrl(s) {
	s = (s || "").trim();
	if (!s) return "";
	if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
	try { new URL(s); return s; } catch { return ""; }
}

// Chrome 给的节点字段很多，只留用得上的
function slim(n) {
	const o = { id: n.id, title: n.title || "" };
	if (n.url) o.url = n.url; else o.children = (n.children || []).map(slim);
	return o;
}

function locate(root, id) {
	if (!id) return null;
	const stack = [root];
	while (stack.length) {
		const p = stack.pop();
		const kids = p.children || [];
		for (let i = 0; i < kids.length; i++) {
			if (kids[i].id === id) return { node: kids[i], parent: p, idx: i };
			if (kids[i].children) stack.push(kids[i]);
		}
	}
	return null;
}

// path：从最外层文件夹到 n 的父文件夹的名字
function walk(n, fn, path = [], depth = -1) {
	if (depth >= 0) fn(n, path, depth);
	if (n.children) for (const c of n.children) walk(c, fn, depth >= 0 ? [...path, n.title] : path, depth + 1);
}

const countUrls = (n) => { let c = 0; walk({ children: [n] }, (x) => { if (x.url) c++; }); return c; };

// 插到 beforeId 前面；没有 beforeId（或它已经不在了）就放到 parentId 的末尾
function insert(root, node, parentId, beforeId) {
	const b = locate(root, beforeId);
	if (b) { b.parent.children.splice(b.idx, 0, node); return true; }
	const p = parentId === root.id ? root : (locate(root, parentId) || {}).node;
	if (!p || !p.children) return false;
	p.children.push(node);
	return true;
}

// 把一条操作作用到树上。realId：Chrome 已经执行完、回执里给的真 id；没给说明还在排队，节点标成 pending
function applyCmd(root, cmd, realId) {
	const a = cmd.args;
	if (cmd.op === "create") {
		const n = { id: realId || cmd.tmpId, title: a.title };
		if (a.url) n.url = a.url; else n.children = [];
		if (!realId) n.pending = true;
		insert(root, n, a.parentId, a.beforeId);
	} else if (cmd.op === "update") {
		const t = locate(root, a.id);
		if (!t) return;
		if (a.title != null) t.node.title = a.title;
		if (a.url && t.node.url) t.node.url = a.url;
	} else if (cmd.op === "move") {
		const t = locate(root, a.id);
		if (!t || !(locate(root, a.beforeId) || a.parentId === root.id || locate(root, a.parentId))) return;
		t.parent.children.splice(t.idx, 1);
		insert(root, t.node, a.parentId, a.beforeId);
	} else if (cmd.op === "remove") {
		const t = locate(root, a.id);
		if (t) t.parent.children.splice(t.idx, 1);
	} else if (cmd.op === "restore") {
		// 恢复出来的一整棵，里面每个节点的真 id 要等 Chrome 推新树才知道，先锁住不让动
		let k = 0;
		const copy = (n) => {
			const o = { id: `${cmd.tmpId}-${k++}`, title: n.title, pending: true, locked: true };
			if (n.url) o.url = n.url; else o.children = (n.children || []).map(copy);
			return o;
		};
		const n = copy(a.node);
		n.id = realId || cmd.tmpId;
		insert(root, n, a.parentId, a.beforeId);
	}
}

const REF_KEYS = ["id", "parentId", "beforeId"];

// ---------- 插件 ----------

module.exports = class ChromeBookmarksPlugin extends Plugin {
	async onload() {
		this.data = Object.assign({}, DEFAULT_DATA, await this.loadData());
		this.icons = await this.readIcons();
		if (!this.data.known && this.data.snapshot) this.detectNew();   // 现有书签记成「见过」，不回头整理
		this.asked = new Set();   // 这次启动里已经向扩展要过图标的网站
		this.lastSeen = 0;
		this.wasOn = false;
		this.waiter = null;       // 正挂着的那个 /poll
		this.save = debounce(() => this.saveData(this.data), 800, true);
		this.saveIcons = debounce(() => this.app.vault.adapter.write(this.iconsPath(), JSON.stringify(this.icons)), 2000, true);
		this.refresh = debounce(() => {
			for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof BookmarksView) leaf.view.render();
		}, 40, true);

		this.registerView(VIEW, (leaf) => new BookmarksView(leaf, this));
		this.addSettingTab(new BookmarksSettingTab(this.app, this));

		this.addCommand({ id: "open-panel", name: "打开 Chrome 书签面板", callback: () => this.reveal() });
		this.addCommand({ id: "search", name: "搜索 Chrome 书签", callback: () => this.openSearch() });
		this.addCommand({ id: "new-bookmark", name: "新建 Chrome 书签", callback: () => this.promptCreate(false) });
		this.addCommand({
			id: "add-current-page", name: "把当前网页加入 Chrome 书签",
			checkCallback: (checking) => {
				const v = this.app.workspace.getActiveViewOfType(ItemView);
				const url = v && v.getViewType() === "webviewer" && v.getState && v.getState().url;
				if (!url) return false;
				if (!checking) this.promptCreate(false, null, { title: v.getDisplayText(), url });
				return true;
			},
		});
		this.addCommand({ id: "undo-delete", name: "撤销上一次删除的 Chrome 书签", callback: () => this.undoDelete() });

		this.startServer();
		this.registerInterval(window.setInterval(() => this.checkAlive(), 5000));
		this.app.workspace.onLayoutReady(() => this.placeOnce());
	}

	onunload() {
		if (this.waiter) this.waiter.done(null);
		if (this.server) {
			if (this.server.closeAllConnections) this.server.closeAllConnections();
			this.server.close();
		}
		this.saveData(this.data);
	}

	iconsPath() { return `${this.manifest.dir}/icons.json`; }
	async readIcons() {
		try { return JSON.parse(await this.app.vault.adapter.read(this.iconsPath())); } catch { return {}; }
	}

	async placeOnce() {
		if (this.data.placed) return;
		this.data.placed = true;
		this.save();
		if (!this.app.workspace.getLeavesOfType(VIEW).length) {
			await this.app.workspace.getLeftLeaf(false).setViewState({ type: VIEW });
		}
	}

	async reveal() {
		let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
		if (!leaf) {
			leaf = this.app.workspace.getLeftLeaf(false);
			await leaf.setViewState({ type: VIEW });
		}
		this.app.workspace.revealLeaf(leaf);
	}

	// ----- 本机服务 -----

	startServer() {
		this.server = http.createServer((req, res) => this.handle(req, res));
		this.server.on("error", (e) => {
			this.serverError = e.code === "EADDRINUSE" ? `端口 ${PORT} 被别的程序占着` : String(e.message || e);
			new Notice(`Chrome 书签：本机服务没起来（${this.serverError}）`, 8000);
			this.refresh();
		});
		this.server.listen(PORT, "127.0.0.1");
	}

	handle(req, res) {
		const send = (code, obj) => {
			if (res.writableEnded || res.destroyed) return;
			res.writeHead(code, { "Content-Type": "application/json" });
			res.end(JSON.stringify(obj));
		};
		const origin = req.headers.origin || "";
		const host = req.headers.host || "";
		if (req.method !== "POST" || !origin.startsWith("chrome-extension://") || (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`)) {
			return send(403, { error: "forbidden" });
		}
		if (origin !== this.data.origin) {
			if (this.data.denied.includes(origin)) return send(403, { error: "denied" });
			this.askPairing(origin);
			return send(403, { error: "unpaired" });
		}
		let body = "";
		req.on("data", (c) => { body += c; if (body.length > 8e6) req.destroy(); });
		req.on("end", () => {
			let j;
			try { j = body ? JSON.parse(body) : {}; } catch { return send(400, { error: "bad json" }); }
			this.touch();
			try { this.route(req.url, j, send, res); } catch (e) { console.error("[chrome-bookmarks]", e); send(500, { error: String(e.message || e) }); }
		});
	}

	route(url, j, send, res) {
		if (url === "/tree") {
			if (!j.tree || !Array.isArray(j.tree.children)) return send(400, { error: "bad tree" });
			this.data.snapshot = slim(j.tree);
			this.data.snapshotAt = Date.now();
			this.detectNew();
			this.save();
			this.refresh();
			return send(200, { ok: true, need: this.missingIcons() });
		}
		if (url === "/favicons") {
			for (const [h, src] of Object.entries(j.icons || {})) if (typeof src === "string") this.icons[h] = src;
			this.saveIcons();
			this.refresh();
			return send(200, { ok: true, need: this.missingIcons() });
		}
		if (url === "/poll") return this.poll(send, res);
		if (url === "/ack") { this.ack(j); return send(200, { ok: true }); }
		send(404, { error: "not found" });
	}

	askPairing(origin) {
		if (this.pairing || (this.pairSnooze && Date.now() < this.pairSnooze)) return;
		this.pairing = origin;
		new PairModal(this.app, origin, !!this.data.origin, (yes) => {
			this.pairing = null;
			if (yes === true) { this.data.origin = origin; this.saveData(this.data); new Notice("Chrome 书签：已允许，几秒内连上"); }
			else if (yes === false) { this.data.denied.push(origin); this.saveData(this.data); }
			else this.pairSnooze = Date.now() + 60000;   // 没选就关掉了：一分钟内不再弹
			this.refresh();
		}).open();
	}

	connected() { return Date.now() - this.lastSeen < ALIVE; }
	touch() { this.lastSeen = Date.now(); this.checkAlive(); }
	checkAlive() {
		const on = this.connected();
		if (on === this.wasOn) return;
		this.wasOn = on;
		if (on) this.asked.clear();   // 重新连上：上次没要到的图标可以再要一次
		this.refresh();
	}

	missingIcons() {
		const need = [];
		if (!this.data.snapshot) return need;
		walk(this.data.snapshot, (n) => {
			if (!n.url || need.length >= ICON_BATCH || !/^https?:/i.test(n.url)) return;
			const h = hostOf(n.url);
			if (!h || h in this.icons || this.asked.has(h)) return;
			this.asked.add(h);
			need.push(n.url);
		});
		return need;
	}

	// ----- 操作队列 -----

	poll(send, res) {
		if (this.waiter) this.waiter.done(null);
		if (this.data.queue.length) return send(200, { cmd: this.data.queue[0] });
		const w = {
			done: (cmd) => {
				if (this.waiter === w) this.waiter = null;
				clearTimeout(w.timer);
				this.lastSeen = Date.now();
				send(200, { cmd });
			},
		};
		w.timer = setTimeout(() => w.done(null), POLL_HOLD);
		res.on("close", () => { if (this.waiter === w) { this.waiter = null; clearTimeout(w.timer); } });
		this.waiter = w;
	}

	enqueue(op, args, label, tmpId) {
		const cmd = { id: `c${Date.now().toString(36)}-${this.data.seq++}`, op, args, label };
		if (tmpId) cmd.tmpId = tmpId;
		this.data.queue.push(cmd);
		this.save();
		this.refresh();
		if (this.waiter) this.waiter.done(this.data.queue[0]);
		return cmd;
	}

	ack(j) {
		const head = this.data.queue[0];
		if (!head || head.id !== j.id) return;
		this.data.queue.shift();
		if (j.ok) {
			if (this.data.snapshot) applyCmd(this.data.snapshot, head, j.newId);
			if (head.tmpId && j.newId) this.renameId(head.tmpId, j.newId);
		} else {
			new Notice(`Chrome 书签：「${head.label}」没成功：${j.error}`, 8000);
			// 新建没成功，后面指着它的操作也做不了，一起丢掉
			if (head.tmpId) this.data.queue = this.data.queue.filter((c) => !REF_KEYS.some((k) => c.args[k] === head.tmpId));
		}
		this.save();
		this.refresh();
	}

	// 新建的节点先用临时 id，Chrome 回执里才有真 id：把后面排队的操作、折叠状态里的临时 id 换掉
	renameId(from, to) {
		for (const c of this.data.queue) for (const k of REF_KEYS) if (c.args[k] === from) c.args[k] = to;
		if (from in this.data.fold) { this.data.fold[to] = this.data.fold[from]; delete this.data.fold[from]; }
		if (this.data.lastParent === from) this.data.lastParent = to;
		const d = this.data.lastDeleted;
		if (d) for (const k of ["parentId", "beforeId"]) if (d[k] === from) d[k] = to;
	}

	// 面板显示的树 = Chrome 的快照 + 还在排队的操作
	viewTree() {
		if (!this.data.snapshot) return null;
		const tree = clone(this.data.snapshot);
		for (const c of this.data.queue) applyCmd(tree, c);
		return tree;
	}

	// 所有书签摊平成一个列表（文件夹不算），path 是所在文件夹；还没连上过 Chrome 时是 null。Palette Enhancements 的「Chrome 书签」范围读这个
	allBookmarks() {
		const tree = this.viewTree();
		if (!tree) return null;
		const out = [];
		walk(tree, (n, path) => {
			if (!n.url) return;
			const host = hostOf(n.url);
			out.push({ id: n.id, title: n.title || n.url, url: n.url, host, path: path.join(" / "), icon: this.icons[host] || "" });
		});
		return out;
	}

	openSearch() {
		const palette = this.app.plugins.plugins[PALETTE_PLUGIN];
		if (palette && palette.openScoped && this.app.commands.findCommand(BCP_FILE_SEARCH)) palette.openScoped("chrome");
		else new BookmarkSearchModal(this).open();
	}

	folders(tree, excludeId) {
		const out = [];
		const visit = (n, path) => {
			if (!n.children || n.id === excludeId || n.locked) return;
			const p = [...path, n.title || "（未命名）"];
			out.push({ id: n.id, path: p.join(" / ") });
			for (const c of n.children) visit(c, p);
		};
		for (const r of tree.children) visit(r, []);
		return out;
	}

	newTmpId() { return `tmp${Date.now().toString(36)}${this.data.seq++}`; }

	addNode({ title, url, parentId, beforeId }) {
		this.data.fold[parentId] = true;
		if (url) this.data.lastParent = parentId;
		const args = { title, parentId };
		if (url) args.url = url;
		if (beforeId) args.beforeId = beforeId;
		this.enqueue("create", args, title, this.newTmpId());
	}

	editNode(node, { title, url }) {
		const args = { id: node.id };
		if (title !== node.title) args.title = title;
		if (node.url && url && url !== node.url) args.url = url;
		if (Object.keys(args).length > 1) this.enqueue("update", args, title);
	}

	moveNode(node, parentId, beforeId) {
		const args = { id: node.id, parentId };
		if (beforeId) args.beforeId = beforeId;
		this.enqueue("move", args, node.title);
	}

	removeNode(node) {
		const tree = this.viewTree();
		const t = tree && locate(tree, node.id);
		if (!t) return;
		const strip = (n) => (n.url ? { title: n.title, url: n.url } : { title: n.title, children: n.children.map(strip) });
		const next = t.parent.children[t.idx + 1];
		this.data.lastDeleted = { node: strip(t.node), parentId: t.parent.id, beforeId: next ? next.id : "" };
		this.enqueue("remove", { id: node.id }, node.title);
		const notice = new Notice(createFragment((f) => {
			f.createSpan({ text: `已删除「${node.title || node.url}」　` });
			const a = f.createEl("a", { text: "撤销" });
			a.addEventListener("click", (e) => { e.stopPropagation(); notice.hide(); this.undoDelete(); });
		}), 8000);
	}

	undoDelete() {
		const d = this.data.lastDeleted;
		if (!d) return new Notice("没有可以撤销的删除");
		this.data.lastDeleted = null;
		const args = { node: d.node, parentId: d.parentId };
		if (d.beforeId) args.beforeId = d.beforeId;
		this.enqueue("restore", args, d.node.title, this.newTmpId());
	}

	confirmRemove(node) {
		if (node.url) return this.removeNode(node);
		const n = countUrls(node);
		if (!n && !node.children.length) return this.removeNode(node);
		new ConfirmModal(this.app, `删除文件夹「${node.title}」？`,
			`里面的 ${n} 条书签会一起删掉，Chrome 那边也会删；Chrome 开着账号同步的话，其他设备上同样会消失。删完可以用「撤销上一次删除的 Chrome 书签」恢复。`,
			"删除", () => this.removeNode(node)).open();
	}

	promptCreate(folder, parentId, preset = {}) {
		const tree = this.viewTree();
		if (!tree) return new Notice("还没连上 Chrome，先装好扩展「Obsidian 书签桥」");
		const folders = this.folders(tree);
		if (!folders.length) return;
		const pick = [parentId, this.data.lastParent, folders[0].id].find((id) => id && folders.some((f) => f.id === id));
		new NodeModal(this.app, {
			heading: folder ? "新建文件夹" : "新建 Chrome 书签",
			folder, folders, parentId: pick, title: preset.title, url: preset.url,
			onSubmit: (v) => this.addNode(v),
		}).open();
	}

	promptEdit(node) {
		new NodeModal(this.app, {
			heading: node.url ? "编辑书签" : "重命名文件夹",
			folder: !node.url, title: node.title, url: node.url,
			onSubmit: (v) => this.editNode(node, v),
		}).open();
	}

	// ----- 打开 -----

	// pane：内置浏览器开在哪，"tab" 新标签页 / "split" 右侧拆分
	openUrl(url, where = this.data.openIn, pane = "tab") {
		if (where === "chrome") {
			execFile("open", ["-a", "Google Chrome", url], (e) => { if (e) new Notice("没能在 Chrome 里打开：" + e.message); });
			return;
		}
		const wv = this.app.internalPlugins.getEnabledPluginById("webviewer");
		if (!wv) {
			new Notice("内置浏览器（Web viewer）没开，改用系统默认浏览器");
			window.open(url);
			return;
		}
		const same = this.app.workspace.getLeavesOfType("webviewer").find((l) => l.view && l.view.getState && l.view.getState().url === url);
		if (same) return this.app.workspace.setActiveLeaf(same, { focus: true });
		wv.openUrl(url, pane, true);
	}

	otherSide() { return this.data.openIn === "chrome" ? "obsidian" : "chrome"; }
};

// ---------- 侧栏面板 ----------

class BookmarksView extends ItemView {
	constructor(leaf, plugin) {
		super(leaf);
		this.plugin = plugin;
		this.query = "";
		this.drag = null;
	}
	getViewType() { return VIEW; }
	getDisplayText() { return "Chrome 书签"; }
	getIcon() { return getIconIds().includes("lucide-chrome") ? "chrome" : "globe"; }

	async onOpen() {
		const root = this.contentEl;
		root.empty();
		root.addClass("cbm-view");
		const head = root.createDiv({ cls: "cbm-head" });
		this.statusEl = head.createDiv({ cls: "cbm-status" });
		const btns = head.createDiv({ cls: "cbm-btns" });
		const btn = (icon, label, fn) => {
			const b = btns.createDiv({ cls: "clickable-icon nav-action-button", attr: { "aria-label": label } });
			setIcon(b, icon);
			b.addEventListener("click", fn);
		};
		btn("plus", "新建书签", () => this.plugin.promptCreate(false));
		btn("folder-plus", "新建文件夹", () => this.plugin.promptCreate(true));
		btn("chevrons-down-up", "全部折叠", () => this.collapseAll());
		const sw = root.createDiv({ cls: "cbm-search" });
		this.searchEl = sw.createEl("input", { type: "search", attr: { placeholder: "搜索书签…", spellcheck: "false" } });
		this.searchEl.addEventListener("input", () => { this.query = this.searchEl.value.trim().toLowerCase(); this.renderTree(); });
		this.treeEl = root.createDiv({ cls: "cbm-tree" });
		this.render();
	}

	render() {
		if (!this.treeEl) return;
		this.tree = this.plugin.viewTree();
		this.renderStatus();
		this.renderTree();
	}

	renderStatus() {
		const p = this.plugin, q = p.data.queue.length;
		let cls = "", text;
		if (p.serverError) text = `本机服务没起来：${p.serverError}`;
		else if (p.connected()) {
			if (q) { cls = "is-busy"; text = `正在同步 ${q} 项…`; }
			else { cls = "is-on"; text = `已连接 Chrome · ${this.tree ? countUrls(this.tree) : 0} 条书签`; }
		} else if (!p.data.snapshot) text = "还没连上 Chrome";
		else {
			const d = new Date(p.data.snapshotAt);
			const pad = (x) => String(x).padStart(2, "0");
			text = `Chrome 未连接 · ${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())} 的快照` + (q ? ` · ${q} 项待同步` : "");
		}
		this.statusEl.empty();
		this.statusEl.createSpan({ cls: "cbm-dot " + cls });
		this.statusEl.createSpan({ cls: "cbm-status-text", text });
		this.statusEl.setAttr("aria-label", text);
	}

	renderTree() {
		const el = this.treeEl, top = el.scrollTop;
		el.empty();
		if (!this.tree) return this.renderSetup(el);
		if (this.query) return this.renderHits(el);
		this.tree.children.forEach((r, i) => {
			if (i >= 2 && !r.children.length) return;   // 空的「移动设备书签」之类不占地方
			this.renderNode(el, r, this.tree, 0);
		});
		el.scrollTop = top;
	}

	renderSetup(el) {
		const box = el.createDiv({ cls: "cbm-setup" });
		box.createEl("p", { text: "还没有连上 Chrome。装一次扩展就行：" });
		const ol = box.createEl("ol");
		ol.createEl("li", { text: "在 Chrome 打开 chrome://extensions，打开右上角「开发者模式」" });
		ol.createEl("li", { text: "点「加载已解压的扩展程序」，选插件仓库里的 chrome-bookmarks/extension 目录" });
		ol.createEl("li", { text: "回到 Obsidian，在弹出的窗口点「允许」" });
	}

	renderHits(el) {
		const hits = [];
		walk(this.tree, (n, path) => {
			if (n.url && hits.length < MAX_HITS && (n.title.toLowerCase().includes(this.query) || n.url.toLowerCase().includes(this.query))) hits.push({ n, path });
		});
		if (!hits.length) return el.createDiv({ cls: "cbm-none", text: "没有匹配的书签" });
		for (const { n, path } of hits) {
			const self = this.bookmarkRow(el, n);
			self.addClass("cbm-hit");
			self.querySelector(".tree-item-inner").createDiv({ cls: "cbm-sub", text: `${path.join(" / ")} · ${hostOf(n.url)}` });
		}
	}

	isOpen(node, depth) {
		const f = this.plugin.data.fold[node.id];
		return f == null ? depth === 0 : f;
	}

	renderNode(parentEl, node, parent, depth) {
		if (!node.children) { this.dnd(this.bookmarkRow(parentEl, node), node, parent, depth); return; }
		const open = this.isOpen(node, depth);
		const item = parentEl.createDiv({ cls: "tree-item nav-folder" + (open ? "" : " is-collapsed") });
		const self = item.createDiv({ cls: "tree-item-self nav-folder-title is-clickable mod-collapsible cbm-row" + (node.pending ? " cbm-pending" : "") });
		setIcon(self.createDiv({ cls: "tree-item-icon collapse-icon" + (open ? "" : " is-collapsed") }), "right-triangle");
		self.createDiv({ cls: "tree-item-inner nav-folder-title-content", text: node.title || "（未命名）" });
		self.createDiv({ cls: "tree-item-flair-outer" }).createSpan({ cls: "tree-item-flair", text: String(countUrls(node)) });
		self.addEventListener("click", () => { this.plugin.data.fold[node.id] = !open; this.plugin.save(); this.renderTree(); });
		self.addEventListener("contextmenu", (e) => this.folderMenu(e, node, depth));
		this.dnd(self, node, parent, depth);
		if (!open) return;
		const kids = item.createDiv({ cls: "tree-item-children nav-folder-children" });
		if (!node.children.length) kids.createDiv({ cls: "cbm-none", text: "空文件夹" });
		for (const c of node.children) this.renderNode(kids, c, node, depth + 1);
	}

	bookmarkRow(parentEl, node) {
		const item = parentEl.createDiv({ cls: "tree-item nav-file" });
		const self = item.createDiv({
			cls: "tree-item-self nav-file-title is-clickable cbm-row" + (node.pending ? " cbm-pending" : ""),
			attr: { "aria-label": node.url, "data-tooltip-position": "right", "data-tooltip-delay": "700" },
		});
		const fav = self.createDiv({ cls: "cbm-fav" });
		const src = this.plugin.icons[hostOf(node.url)];
		if (src) fav.createEl("img", { attr: { src, alt: "" } }); else setIcon(fav, "globe");
		self.createDiv({ cls: "tree-item-inner nav-file-title-content" }).createDiv({ cls: "cbm-title", text: node.title || node.url });
		const open = (e) => this.plugin.openUrl(node.url, e.metaKey || e.ctrlKey || e.button === 1 ? this.plugin.otherSide() : undefined);
		self.addEventListener("click", open);
		self.addEventListener("auxclick", (e) => { if (e.button === 1) open(e); });
		self.addEventListener("contextmenu", (e) => this.bookmarkMenu(e, node));
		return self;
	}

	collapseAll() {
		if (!this.tree) return;
		walk(this.tree, (n) => { if (n.children) this.plugin.data.fold[n.id] = false; });
		this.plugin.save();
		this.renderTree();
	}

	// ----- 右键菜单 -----

	bookmarkMenu(e, node) {
		e.preventDefault();
		const p = this.plugin, m = new Menu();
		m.addItem((i) => i.setTitle("在内置浏览器打开").setIcon("globe").onClick(() => p.openUrl(node.url, "obsidian")));
		m.addItem((i) => i.setTitle("在 Chrome 打开").setIcon("external-link").onClick(() => p.openUrl(node.url, "chrome")));
		m.addSeparator();
		m.addItem((i) => i.setTitle("复制链接").setIcon("link").onClick(() => navigator.clipboard.writeText(node.url)));
		m.addItem((i) => i.setTitle("复制为 Markdown 链接").setIcon("brackets").onClick(() => navigator.clipboard.writeText(`[${node.title}](${node.url})`)));
		if (!node.pending) {
			m.addSeparator();
			m.addItem((i) => i.setTitle("整理进笔记（自动判断）").setIcon("inbox").onClick(() => p.queueImport(node, p.folderOf(node.id), "auto")));
			m.addItem((i) => i.setTitle("整理进笔记：当单篇，进待读").setIcon("book-open").onClick(() => p.queueImport(node, p.folderOf(node.id), "article")));
			m.addItem((i) => i.setTitle("整理进笔记：当合集，进长期项目").setIcon("list-tree").onClick(() => p.queueImport(node, p.folderOf(node.id), "collection")));
		}
		if (!node.locked) {
			m.addSeparator();
			m.addItem((i) => i.setTitle("编辑…").setIcon("pencil").onClick(() => p.promptEdit(node)));
			m.addItem((i) => i.setTitle("移动到…").setIcon("folder-input").onClick(() => new MoveModal(p, node).open()));
			m.addItem((i) => { i.setTitle("删除").setIcon("trash-2").onClick(() => p.confirmRemove(node)); if (i.setWarning) i.setWarning(true); });
		}
		m.showAtMouseEvent(e);
	}

	folderMenu(e, node, depth) {
		e.preventDefault();
		if (node.locked) return;
		const p = this.plugin, m = new Menu();
		m.addItem((i) => i.setTitle("在这里新建书签…").setIcon("plus").onClick(() => p.promptCreate(false, node.id)));
		m.addItem((i) => i.setTitle("在这里新建文件夹…").setIcon("folder-plus").onClick(() => p.promptCreate(true, node.id)));
		if (depth > 0) {   // 最外层的「书签栏」「其他书签」Chrome 不让改
			m.addSeparator();
			m.addItem((i) => i.setTitle("重命名…").setIcon("pencil").onClick(() => p.promptEdit(node)));
			m.addItem((i) => i.setTitle("移动到…").setIcon("folder-input").onClick(() => new MoveModal(p, node).open()));
			m.addItem((i) => { i.setTitle("删除文件夹").setIcon("trash-2").onClick(() => p.confirmRemove(node)); if (i.setWarning) i.setWarning(true); });
		}
		m.showAtMouseEvent(e);
	}

	// ----- 拖动：拖到书签上半 / 下半 = 插到它前 / 后；拖到文件夹中间 = 放进去 -----

	dnd(self, node, parent, depth) {
		if (depth > 0 && !node.locked) {
			self.draggable = true;
			self.addEventListener("dragstart", (e) => {
				this.drag = node;
				e.dataTransfer.effectAllowed = "copyMove";
				e.dataTransfer.setData("text/plain", node.url ? `[${node.title}](${node.url})` : node.title);   // 拖进笔记里就是一条链接
				self.addClass("cbm-dragging");
			});
			self.addEventListener("dragend", () => { this.drag = null; self.removeClass("cbm-dragging"); this.clearDrop(); });
		}
		self.addEventListener("dragover", (e) => {
			const pos = this.dropPos(e, self, node, depth);
			if (!pos) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			if (self.dataset.drop !== pos) { this.clearDrop(); self.dataset.drop = pos; }
		});
		self.addEventListener("dragleave", () => { delete self.dataset.drop; });
		self.addEventListener("drop", (e) => {
			const pos = this.dropPos(e, self, node, depth), d = this.drag;
			this.clearDrop();
			if (!pos || !d) return;
			e.preventDefault();
			this.drag = null;
			if (pos === "into") { this.plugin.data.fold[node.id] = true; return this.plugin.moveNode(d, node.id); }
			const idx = parent.children.indexOf(node);
			const before = pos === "before" ? node : parent.children[idx + 1];
			if (before && before.id === d.id) return;                              // 本来就在这个位置
			if (pos === "before" && idx > 0 && parent.children[idx - 1].id === d.id) return;
			this.plugin.moveNode(d, parent.id, before ? before.id : "");
		});
	}

	dropPos(e, self, node, depth) {
		const d = this.drag;
		if (!d || d.id === node.id || node.locked) return null;
		if (d.children && locate(d, node.id)) return null;   // 文件夹不能拖进自己里面
		const r = self.getBoundingClientRect(), y = (e.clientY - r.top) / r.height;
		if (!node.children) return y < 0.5 ? "before" : "after";
		if (depth === 0) return "into";
		return y < 0.25 ? "before" : y > 0.75 ? "after" : "into";
	}

	clearDrop() {
		for (const el of this.treeEl.querySelectorAll("[data-drop]")) delete el.dataset.drop;
	}
}

// ---------- 弹窗 ----------

class PairModal extends Modal {
	constructor(app, origin, replacing, onDecide) {
		super(app);
		this.origin = origin;
		this.replacing = replacing;
		this.onDecide = onDecide;
	}
	onOpen() {
		this.titleEl.setText("允许这个 Chrome 扩展连接书签面板？");
		this.contentEl.createEl("p", { text: `扩展 ${this.origin.replace("chrome-extension://", "")} 想连接「Chrome 书签」面板。` });
		this.contentEl.createEl("p", { text: "允许后，它会把 Chrome 的书签发给这个面板；你在面板里新建、改名、移动、删除书签，也由它在 Chrome 里执行。" });
		if (this.replacing) this.contentEl.createEl("p", { text: "现在连着的另一个扩展会被换掉。" });
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("允许").setCta().onClick(() => this.decide(true)))
			.addButton((b) => b.setButtonText("拒绝").onClick(() => this.decide(false)));
	}
	decide(v) { this.decided = true; this.close(); this.onDecide(v); }
	onClose() { if (!this.decided) this.onDecide(null); }
}

class ConfirmModal extends Modal {
	constructor(app, title, text, action, onYes) {
		super(app);
		Object.assign(this, { heading: title, text, action, onYes });
	}
	onOpen() {
		this.titleEl.setText(this.heading);
		this.contentEl.createEl("p", { text: this.text });
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText(this.action).setWarning().onClick(() => { this.close(); this.onYes(); }))
			.addButton((b) => b.setButtonText("取消").onClick(() => this.close()));
	}
}

// 新建 / 编辑书签或文件夹。opts.folders 给了就多一个「放在」下拉
class NodeModal extends Modal {
	constructor(app, opts) {
		super(app);
		this.opts = opts;
	}
	onOpen() {
		const o = this.opts;
		let title = o.title || "", url = o.url || "", parentId = o.parentId, first;
		this.titleEl.setText(o.heading);
		const submit = () => {
			title = title.trim();
			if (o.folder) { if (!title) return new Notice("名字不能空着"); }
			else {
				url = normalizeUrl(url);
				if (!url) return new Notice("网址不对");
				if (!title) title = url;
			}
			this.close();
			o.onSubmit({ title, url: o.folder ? "" : url, parentId });
		};
		const onKey = (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(); } };
		new Setting(this.contentEl).setName("名称").addText((t) => {
			t.setValue(title).onChange((v) => { title = v; });
			t.inputEl.addEventListener("keydown", onKey);
			t.inputEl.addClass("cbm-input");
			first = t.inputEl;
		});
		if (!o.folder) new Setting(this.contentEl).setName("网址").addText((t) => {
			t.setPlaceholder("https://").setValue(url).onChange((v) => { url = v; });
			t.inputEl.addEventListener("keydown", onKey);
			t.inputEl.addClass("cbm-input");
		});
		if (o.folders) new Setting(this.contentEl).setName("放在").addDropdown((d) => {
			for (const f of o.folders) d.addOption(f.id, f.path);
			d.setValue(parentId).onChange((v) => { parentId = v; });
		});
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("保存").setCta().onClick(submit))
			.addButton((b) => b.setButtonText("取消").onClick(() => this.close()));
		window.setTimeout(() => { first.focus(); first.select(); }, 0);
	}
}

class MoveModal extends FuzzySuggestModal {
	constructor(plugin, node) {
		super(plugin.app);
		this.plugin = plugin;
		this.node = node;
		this.setPlaceholder(`把「${node.title}」移动到…`);
	}
	getItems() {
		const tree = this.plugin.viewTree();
		return tree ? this.plugin.folders(tree, this.node.id) : [];
	}
	getItemText(f) { return f.path; }
	onChooseItem(f) {
		this.plugin.data.fold[f.id] = true;
		this.plugin.moveNode(this.node, f.id);
	}
}

// 备用：Better Command Palette / Palette Enhancements 没开时用的小面板
class BookmarkSearchModal extends FuzzySuggestModal {
	constructor(plugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.setPlaceholder("搜索 Chrome 书签（↵ 打开，⌘↵ 走另一边）");
		this.scope.register(["Mod"], "Enter", (e) => { if (this.selectActiveSuggestion) this.selectActiveSuggestion(e); else this.chooser.useSelectedItem(e); return false; });
	}
	getItems() {
		const tree = this.plugin.viewTree(), out = [];
		if (tree) walk(tree, (n, path) => { if (n.url) out.push({ n, path: path.join(" / ") }); });
		return out;
	}
	getItemText(it) { return `${it.n.title}  ·  ${it.path}  ·  ${hostOf(it.n.url)}`; }
	onChooseItem(it, e) { this.plugin.openUrl(it.n.url, e && (e.metaKey || e.ctrlKey) ? this.plugin.otherSide() : undefined); }
}

// ---------- 设置 ----------

class BookmarksSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display() {
		const el = this.containerEl, p = this.plugin, d = p.data;
		el.empty();
		new Setting(el).setName("连接").setDesc(
			p.serverError ? `本机服务没起来：${p.serverError}`
				: p.connected() ? "已连接 Chrome。"
				: d.origin ? "Chrome 未连接：Chrome 没开，或者扩展被停用了。连上之前在面板里做的修改会排队，连上后补做。"
				: "还没有允许任何扩展。在 Chrome 里加载仓库的 chrome-bookmarks/extension 目录，然后回到这里点「允许」。");
		if (d.origin) new Setting(el).setName("已允许的扩展").setDesc(d.origin.replace("chrome-extension://", ""))
			.addButton((b) => b.setButtonText("断开").onClick(async () => { d.origin = ""; p.lastSeen = 0; p.checkAlive(); await p.saveData(d); this.display(); }));
		if (d.denied.length) new Setting(el).setName("拒绝过的扩展").setDesc(d.denied.map((o) => o.replace("chrome-extension://", "")).join("、"))
			.addButton((b) => b.setButtonText("清掉记录").onClick(async () => { d.denied = []; await p.saveData(d); this.display(); }));
		new Setting(el).setName("单击书签时").setDesc("按住 ⌘ 单击走另一边。")
			.addDropdown((dd) => dd.addOption("obsidian", "用内置浏览器打开").addOption("chrome", "在 Chrome 打开").setValue(d.openIn)
				.onChange(async (v) => { d.openIn = v; await p.saveData(d); }));
		new Setting(el).setName("新收藏自动整理进笔记")
			.setDesc("在 Chrome 里新收藏的网页：单篇文章记成待读卡，视频记成待看卡，Wiki 式的（有一大串同栏目页面）记成长期项目；工具类文件夹里的只记一行链接。判断错了，在面板里右键这条书签重新指定。")
			.addToggle((t) => t.setValue(d.autoImport).onChange(async (v) => { d.autoImport = v; await p.saveData(d); }));
		if (d.queue.length) new Setting(el).setName(`待同步的操作：${d.queue.length} 项`).setDesc(d.queue.map((c) => c.label).join("、"))
			.addButton((b) => b.setButtonText("全部放弃").setWarning().onClick(async () => { d.queue = []; await p.saveData(d); p.refresh(); this.display(); }));
	}
}

// ---------- 自动同步：Chrome 新收藏 → 库里的块 ----------
// 扩展每次推树过来，和「已经见过的书签 id」（data.known）比一下，多出来的就是新收藏。
// 新收藏先按所在的 Chrome 文件夹定去哪篇笔记，再读页面判断内容量：
//   · 单篇文章 → 一张待读卡（#toread + SuperTags 字段），出现在 📖待读 看板
//   · 视频 → 一张待看卡（#towatch），出现在 📺待看 看板
//   · Wiki 式（侧栏 / 正文里有一大串同栏目页面）→ 一个长期项目块：标题行链到 [[长期计划]]，目录每页一个勾选框，
//     长期项目看板把它当项目、把勾选框当子任务算进度
//   · 网站首页、工具类文件夹里的 → 只记一行链接，不进看板
// 判断错了可以在面板里右键这条书签，「整理进笔记」里手动指定。

const NOTES = {
	econ: "阅读收藏/经济学书签（Chrome）.md",
	ai: "阅读收藏/AI 与 AIGC 书签（Chrome）.md",
	tools: "阅读收藏/工具箱（Chrome 书签）.md",
	inbox: "阅读收藏/Chrome 新收藏.md",
};
// 按书签所在的 Chrome 文件夹定去向，从上往下第一个匹配的算；路径形如「书签栏/经济学/信息源」
// area = 长期项目看板的领域（#领域/xxx），domain = 待读卡的 domain 字段，fixed = 不看内容、直接按这个类型记
const ROUTES = [
	{ re: /(^|\/)(归档|待删除)(\/|$)/, skip: true },
	{ re: /(^|\/)经济学\/信息源$/, note: "econ", fixed: "link" },
	{ re: /(^|\/)经济学(\/|$)/, note: "econ", area: "投资理财", domain: "[[经济学]]" },
	{ re: /(^|\/)AI·AIGC\/工具与信息源$/, note: "ai", fixed: "link" },
	{ re: /(^|\/)AI·AIGC\/AIGC 创作$/, note: "ai", area: "AI技能", domain: "[[aigc]]" },
	{ re: /(^|\/)AI·AIGC(\/|$)/, note: "ai", area: "AI技能", domain: "[[AI]]" },
	{ re: /(^|\/)(工具|产品经理|做视频|design|声音处理)(\/|$)/, note: "tools", fixed: "link" },
	{ re: /./, note: "inbox", area: "阅读学习", domain: "" },
];
const SECTION = "新收藏（Chrome 自动同步）";
const BULK_LIMIT = 15;     // 一次冒出来这么多条新书签（导入、换设备同步）就不自动整理
const TOC_LIMIT = 150;     // 目录最多列多少页
const FETCH_TIMEOUT = 15000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const KIND_LABEL = { article: "待读", video: "待看", collection: "长期项目", link: "只记链接" };

// 网址本身就能看出来的
const COLLECTION_URL = /\/(docs?|documentation|learn|guide|guides|handbook|manual|course|courses|tutorial|tutorials|book|categories|collection|column|series)(\/|$)|readthedocs\.io|gitbook\.io/i;
const ARTICLE_URL = /\/(blog|blogs|post|posts|p|article|articles|news|status|answer|a|s)\/[^/]+|\/question\/\d+|\/\d{4}\/\d{1,2}\//i;
// 百科站：每个词条都带一整条全站侧栏，但收藏的是这一个词条
const ENTRY_HOST = /(^|\.)wikipedia\.org$|^baike\.baidu\.com$|(^|\.)wikiwand\.com$/i;
// 文档站的首页也算合集，别的网站首页只记链接
const DOCS_HOST = /^(docs?|wiki|learn|developer|developers|help|support)\.|readthedocs\.io$|gitbook\.io$/i;
const NAV_SELECTOR = 'nav, aside, [role="navigation"], [class*="sidebar" i], [id*="sidebar" i], [class*="toc" i], [id*="toc" i], [class*="menu" i], [class*="nav" i]';

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => window.setTimeout(() => rej(new Error("超时")), ms))]);
const oneLine = (s, max) => { s = (s || "").replace(/\s+/g, " ").trim(); return max && s.length > max ? s.slice(0, max - 1) + "…" : s; };
// 写进列表行之前：方括号会破坏链接、# 会变成标签
const safe = (s) => oneLine(s).replace(/\[/g, "【").replace(/\]/g, "】").replace(/(^|\s)#/g, "$1＃");
const today = () => window.moment().format("YYYY-MM-DD");

function tidyTitle(raw) {
	let t = oneLine(raw), author = "";
	const x = t.match(/^(.+?) on X: "(.+?)"? \/ X$/);
	if (x) { author = x[1]; t = x[2]; }
	t = t.replace(/^\(\d+[^)]*\)\s*/, "")
		.replace(/_哔哩哔哩_bilibili$/, "")
		.replace(/\s*[-–—|]\s*(知乎|哔哩哔哩|bilibili|小红书|掘金|简书|GitHub|YouTube|Medium|X)\s*$/i, "")
		.replace(/\s+https?:\/\/t\.co\/\S+/g, "");
	return { title: oneLine(t, 80), author };
}

function videoKind(u) {
	const h = u.host.replace(/^www\./, "");
	if (/(^|\.)bilibili\.com$/.test(h) && /^\/video\//.test(u.pathname)) return "视频（B站）";
	if ((/(^|\.)youtube\.com$/.test(h) && u.pathname === "/watch") || h === "youtu.be") return "视频（YouTube）";
	return "";
}

// 一个容器里指向「同站、同栏目、别的页面」的链接；页内锚点（文章自己的小标题）不算
function sectionLinks(root, u, anyPath) {
	const seg = u.pathname.split("/").filter(Boolean)[0];
	const prefix = seg ? "/" + seg : "/";
	const here = u.pathname.replace(/\/$/, "");
	const seen = new Map();
	for (const a of root.querySelectorAll("a[href]")) {
		let t;
		try { t = new URL(a.getAttribute("href"), u.href); } catch { continue; }
		if (t.origin !== u.origin || !/^https?:$/.test(t.protocol)) continue;
		const p = t.pathname.replace(/\/$/, "");
		if (p === here || p === "") continue;
		if (anyPath ? a.closest("header, footer, nav") : prefix !== "/" && p !== prefix && !p.startsWith(prefix + "/")) continue;
		const text = oneLine(a.textContent, 80);
		if (!text || text.length < 2) continue;
		const key = t.origin + p;
		if (!seen.has(key)) seen.set(key, { t: text, u: t.origin + t.pathname });
	}
	return [...seen.values()];
}

// 读网页，看是单篇还是 Wiki 式
function judgeHtml(html, u, out) {
	const doc = new DOMParser().parseFromString(html, "text/html");
	const meta = (sel) => { const el = doc.querySelector(sel); return el ? oneLine(el.getAttribute("content")) : ""; };
	out.title = meta('meta[property="og:title"]') || oneLine(doc.title);
	out.desc = oneLine(meta('meta[property="og:description"]') || meta('meta[name="description"]'), 120);
	out.author = meta('meta[name="author"]') || meta('meta[property="article:author"]');
	if (/^https?:/i.test(out.author)) out.author = "";
	for (const el of doc.querySelectorAll("script, style, noscript, template, svg")) el.remove();

	// 侧栏 / 目录：挑链接最多的那个容器
	let nav = [];
	for (const c of doc.querySelectorAll(NAV_SELECTOR)) {
		if (c.closest("footer")) continue;
		const ls = sectionLinks(c, u);
		if (ls.length > nav.length) nav = ls;
	}
	const main = doc.querySelector("article, main, [role='main']") || doc.body;
	const mainLinks = main ? sectionLinks(main, u) : [];
	const textLen = main ? oneLine(main.textContent).length : 0;
	const hasArticle = !!doc.querySelector("article");

	const home = u.pathname.replace(/\/$/, "") === "" && !u.search;
	if (ENTRY_HOST.test(u.host)) { out.kind = "article"; out.why = "百科里的一个词条"; return; }
	if (home && !DOCS_HOST.test(u.host)) { out.kind = "link"; out.why = "是网站首页"; return; }
	let score = 0;
	const why = [];
	if (nav.length >= 12) { score += nav.length >= 30 ? 3 : 2; why.push(`侧栏目录里有 ${nav.length} 个同栏目页面`); }
	const index = mainLinks.length >= 20 && textLen / mainLinks.length < 120;
	if (index) { score += 2; why.push(`正文是 ${mainLinks.length} 条链接的索引`); }
	if (COLLECTION_URL.test(u.pathname) || COLLECTION_URL.test(u.host)) { score += 2; why.push("网址是文档 / 课程 / 专栏的样子"); }
	else if (DOCS_HOST.test(u.host)) { score += 2; why.push("是文档站"); }
	if (ARTICLE_URL.test(u.pathname)) { score -= 2; why.push("网址是单篇文章的样子"); }
	if (hasArticle && textLen >= 2500 && nav.length < 30) { score -= 1; why.push(`正文约 ${textLen} 字`); }

	out.cand = (nav.length >= mainLinks.length ? nav : mainLinks).slice(0, TOC_LIMIT);
	if (score >= 2) {
		out.kind = "collection";
		out.toc = (nav.length >= mainLinks.length || !index ? nav : mainLinks).slice(0, TOC_LIMIT);
		if (!out.toc.length) out.toc = mainLinks.slice(0, TOC_LIMIT);
		// 目录太少：栏目页的条目常常不在同一个路径下（/categories/1 下面列的是 /topic123），放宽到正文里的全部站内链接
		if (out.toc.length < 8 && main) {
			const groups = new Map();
			for (const l of sectionLinks(main, u, true)) {
				const shape = "/" + (new URL(l.u).pathname.split("/").filter(Boolean)[0] || "").replace(/\d+/g, "#");
				if (!groups.has(shape)) groups.set(shape, []);
				groups.get(shape).push(l);
			}
			const best = [...groups.values()].sort((a, b) => b.length - a.length)[0];
			if (best && best.length >= 8 && best.length > out.toc.length) out.toc = best.slice(0, TOC_LIMIT);
		}
	} else {
		out.kind = "article";
		if (!why.length) why.push(textLen ? `正文约 ${textLen} 字，没有成规模的目录` : "没有成规模的目录");
	}
	out.why = why.join("，");
}

// GitHub 仓库：读 README。里面有一批指向仓库内文档的链接（课程、手册）或者是一长串外链（awesome 清单）就算合集
async function judgeGithub(gh, out) {
	const [, owner, repo, ref, sub] = gh;
	out.repo = `${owner}/${repo}`;
	const api = `https://api.github.com/repos/${owner}/${repo}`;
	const get = (url, accept) => withTimeout(requestUrl({ url, throw: false, headers: { "User-Agent": UA, Accept: accept } }), FETCH_TIMEOUT);
	try {
		const info = await get(api, "application/vnd.github+json");
		if (info.status < 400) { out.desc = oneLine(info.json.description, 120); out.author = info.json.owner ? info.json.owner.login : owner; }
	} catch {}
	let md = "", base = `https://github.com/${owner}/${repo}/blob/${ref || "HEAD"}/`, dir = "";
	try {
		if (sub && /\.(md|markdown)$/i.test(sub)) {
			dir = sub.replace(/^\//, "").replace(/[^/]*$/, "");
			const r = await get(`https://raw.githubusercontent.com/${owner}/${repo}/${ref || "HEAD"}${sub}`, "text/plain");
			if (r.status < 400) md = r.text;
		} else {
			dir = sub ? sub.replace(/^\//, "") + "/" : "";
			const r = await get(`${api}/readme/${dir}${ref ? "?ref=" + ref : ""}`, "application/vnd.github.raw");
			if (r.status < 400) md = r.text;
		}
	} catch {}
	if (!md) { out.kind = "article"; out.why = "README 没读到，按单篇算"; return; }
	const inner = [], seen = new Set();
	let outer = 0;
	for (const m of md.matchAll(/\[([^\]\n]{2,100})\]\(([^)\s]+)\)/g)) {
		let text = oneLine(m[1].replace(/[*_`]/g, ""), 80);
		const href = m[2];
		// 表格里常见的「Link / 链接」这种没信息量的链接文字，换成它指向的目录名
		if (/^(link|链接|here|click here|查看|详情|more)$/i.test(text)) text = href.replace(/^\.\//, "").split("#")[0].replace(/\/?(README|index)\.mdx?$/i, "").split("/").pop() || text;
		if (/^(https?:)?\/\//.test(href)) { outer++; continue; }
		if (href.startsWith("#") || /\.(png|jpe?g|gif|svg|webp)$/i.test(href) || !text) continue;
		const rel = href.replace(/^\.\//, "").split("#")[0];
		const path = dir + rel;
		if (!rel || seen.has(path) || /(^|\/)(translations?|i18n|locales?)\//i.test(path) || /^README([._-][\w-]+)?\.md$/i.test(rel)) continue;
		seen.add(path);
		inner.push({ t: text, u: base + encodeURI(decodeURI(path)) });
	}
	const heads = [...md.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => oneLine(m[1].replace(/[*_`]|\[([^\]]*)\]\([^)]*\)/g, "$1"), 60)).filter(Boolean);
	if (inner.length >= 8) {
		out.kind = "collection"; out.toc = inner.slice(0, TOC_LIMIT);
		out.why = `README 里有 ${inner.length} 个指向仓库内文档的链接`;
	} else if (outer >= 40 && heads.length >= 4) {
		out.kind = "collection"; out.toc = heads.slice(0, 40).map((t) => ({ t }));
		out.why = `README 是 ${outer} 条外链的清单，分 ${heads.length} 节`;
	} else {
		let docs = [];
		try {
			const t = await get(`${api}/git/trees/${ref || "HEAD"}?recursive=1`, "application/vnd.github+json");
			if (t.status < 400) docs = (t.json.tree || []).map((x) => x.path).filter((x) => /\.(md|markdown|mdx)$/i.test(x) && x.startsWith(dir) && !/(^|\/)(translations?|i18n|locales?|node_modules)\//i.test(x));
		} catch {}
		if (docs.length >= 20) {
			const byDir = new Map();
			for (const d of docs) {
				const rest = d.slice(dir.length).split("/");
				const key = rest.length > 2 ? rest.slice(0, 2).join("/") : rest.length > 1 ? rest[0] : "";
				byDir.set(key, (byDir.get(key) || 0) + 1);
			}
			const tree = `https://github.com/${owner}/${repo}/tree/${ref || "HEAD"}/${dir}`;
			out.kind = "collection";
			out.toc = [...inner, ...[...byDir.entries()].filter(([k, c]) => k && c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, c]) => ({ t: `${k}（${c} 篇）`, u: tree + encodeURI(k) }))];
			out.why = `仓库里有 ${docs.length} 篇 Markdown 文档`;
		} else {
			out.kind = "article";
			out.why = `README 里只有 ${inner.length} 个仓库内文档链接，仓库里 ${docs.length} 篇文档，按单篇算`;
		}
	}
}

const SYNC_METHODS = {
	// ----- 发现新收藏 -----
	currentIds() {
		const out = [];
		if (this.data.snapshot) walk(this.data.snapshot, (n, path) => { if (n.url) out.push({ n, folder: path.join("/") }); });
		return out;
	},

	detectNew() {
		const all = this.currentIds();
		if (!this.data.known) { this.data.known = all.map((x) => x.n.id); return; }   // 第一次：现有的都算见过
		const known = new Set(this.data.known);
		const fresh = all.filter((x) => !known.has(x.n.id) && /^https?:/i.test(x.n.url));
		for (const x of all) if (!known.has(x.n.id)) this.data.known.push(x.n.id);
		if (!fresh.length || !this.data.autoImport) return;
		if (fresh.length > BULK_LIMIT) {
			new Notice(`Chrome 书签：一次多了 ${fresh.length} 条新书签，没有自动整理进笔记。要整理的在面板里右键「整理进笔记」`, 10000);
			return;
		}
		for (const x of fresh) this.queueImport(x.n, x.folder);
	},

	queueImport(n, folder, force) {
		this.importing = (this.importing || Promise.resolve()).then(() => this.importBookmark(n, folder, force)).catch((e) => {
			console.error("[chrome-bookmarks] 整理进笔记失败", e);
			new Notice(`Chrome 书签：「${n.title}」没能整理进笔记：${e.message || e}`, 8000);
		});
		return this.importing;
	},

	// ----- 判断内容量 -----
	async inspect(url) {
		const u = new URL(url);
		const out = { kind: "article", why: "", title: "", desc: "", author: "", toc: [], video: videoKind(u) };
		if (out.video) { out.kind = "video"; out.why = "是视频页"; return out; }
		const gh = u.host === "github.com" && u.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\/(?:tree|blob)\/([^/]+)(\/.*?)?)?\/?$/);
		if (gh) { await judgeGithub(gh, out); return out; }
		let html = "";
		try {
			const r = await withTimeout(requestUrl({ url, throw: false, headers: { "User-Agent": UA } }), FETCH_TIMEOUT);
			if (r.status < 400 && /html/i.test(r.headers["content-type"] || r.headers["Content-Type"] || "html")) html = r.text;
		} catch {}
		if (html.length > 500) { judgeHtml(html, u, out); return out; }
		// 读不到（要登录、被拦、超时）：只能看网址
		const looksLikeCollection = COLLECTION_URL.test(u.pathname) && !ARTICLE_URL.test(u.pathname);
		out.kind = looksLikeCollection ? "collection" : "article";
		out.why = looksLikeCollection ? "页面没读到，网址是文档 / 课程 / 专栏的样子" : "页面没读到，按单篇算";
		return out;
	},

	// ----- 写进笔记 -----
	async importBookmark(n, folder, force) {
		const route = ROUTES.find((r) => r.re.test(folder));
		if (route.skip && !force) return;
		const manual = !!force;                       // 面板里右键触发的
		if (force === "auto") force = null;           // 手动触发、但类型还是自动判断
		const file = await this.noteFor(route.note || "inbox");
		const tidy = tidyTitle(n.title);
		const page = route.fixed && !manual ? { kind: route.fixed || "link", why: `在「${folder.split("/").pop()}」文件夹里`, toc: [], desc: "", author: "", title: "" } : await this.inspect(n.url);
		const kind = force || page.kind;
		const info = {
			kind, url: n.url, folder,
			// GitHub 默认的书签标题是「路径 at main · owner/repo」这种，换成仓库名；自己改过的标题保留
			title: safe((page.repo && n.title.includes(page.repo) ? page.repo.split("/")[1] : tidy.title) || page.title || n.url),
			author: safe(tidy.author || page.author),
			desc: safe(page.desc),
			toc: page.toc && page.toc.length ? page.toc : kind === "collection" ? page.cand || [] : [], video: page.video || videoKind(new URL(n.url)) || "视频（B站）",
			area: route.area || "阅读学习", domain: route.domain || "", note: file.basename,
		};
		const added = await this.appendBlock(file, n.url, this.blockFor(info));
		if (!added) {
			if (manual) new Notice(`Chrome 书签：「${info.title}」已经在「${file.basename}」里了，没有重复写`);
			return;
		}
		this.data.imported[n.id] = { kind, note: file.path, at: Date.now() };
		this.save();
		const extra = kind === "collection" ? `，目录 ${info.toc.length} 页` : "";
		new Notice(`Chrome 书签：「${info.title}」→ ${KIND_LABEL[kind]}${extra}\n依据：${force ? "手动指定" : page.why}\n记在「${file.basename}」`, 10000);
	},

	blockFor(i) {
		const L = [], kid = (s) => L.push("\t\t- " + s);
		const where = `收藏于：${today()} · Chrome「${i.folder}」`;
		if (i.kind === "collection") {
			L.push(`\t- 学完 [${i.title}](${i.url}) [[长期计划]] #领域/${i.area} 🛫 ${today()}`);
			if (i.author) kid(`作者：${i.author}`);
			if (i.desc) kid(`简介：${i.desc}`);
			for (const t of i.toc) kid("[ ] " + (t.u ? `[${safe(t.t)}](${t.u})` : safe(t.t)));
			if (!i.toc.length) kid("备注：目录没读到（页面要登录，或者是脚本渲染的）。要解析可以叫 Claude 用 Chrome 读");
			kid(where);
		} else if (i.kind === "video") {
			L.push(`\t- ${i.title} #towatch`);
			kid(`链接：${i.url}`); kid("type:: 作品"); kid(`类别:: ${i.video}`); kid("清单:: [[towatch]]"); kid("状态:: 想看");
			if (i.author) kid(`作者:: ${i.author}`);
			kid(`from:: [[${i.note}]]`); kid(where);
		} else if (i.kind === "link") {
			L.push(`\t- [${i.title}](${i.url})` + (i.desc ? `：${i.desc}` : ""));
		} else {
			L.push(`\t- ${i.title} #toread`);
			kid(`链接：${i.url}`); kid("type:: 文章"); kid("清单:: [[toread]]"); kid("状态:: 想读");
			if (i.author) kid(`author:: ${i.author}`);
			if (i.domain) kid(`domain:: ${i.domain}`);
			if (i.desc) kid(`def:: ${i.desc}`);
			kid(`from:: [[${i.note}]]`); kid(where);
		}
		return L;
	},

	async noteFor(key) {
		const path = NOTES[key];
		let f = this.app.vault.getAbstractFileByPath(path);
		if (f instanceof TFile) return f;
		const dir = path.replace(/\/[^/]*$/, "");
		if (!this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
		return this.app.vault.create(path, [
			"---", "tags:", "  - 收藏/阅读清单", "source: Chrome 书签（自动同步）", "---", "",
			"- 这页是什么：在 Chrome 里新收藏、又不属于经济学 / AI / 工具那几篇的网页，由「Chrome 书签」插件自动记到这里", "",
		].join("\n"));
	},

	// 追加到「新收藏」那一节的末尾；笔记里已经有这个网址就不写
	appendBlock(file, url, block) {
		let added = false;
		return this.app.vault.process(file, (text) => {
			if (text.includes(url)) return text;
			const lines = text.replace(/\s+$/, "").split("\n");
			let at = lines.findIndex((l) => l === "- " + SECTION);
			if (at < 0) { lines.push("- " + SECTION); at = lines.length - 1; }
			let end = at + 1;
			while (end < lines.length && (lines[end].startsWith("\t") || lines[end].trim() === "")) end++;
			while (end > at + 1 && lines[end - 1].trim() === "") end--;
			lines.splice(end, 0, ...block);
			added = true;
			return lines.join("\n") + "\n";
		}).then(() => added);
	},

	folderOf(id) {
		const hit = this.currentIds().find((x) => x.n.id === id);
		return hit ? hit.folder : "";
	},
};
Object.assign(module.exports.prototype, SYNC_METHODS);
