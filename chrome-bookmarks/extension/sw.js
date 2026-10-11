// Obsidian 书签桥：Chrome 这一头
// · Chrome → Obsidian：书签一有变化（或每 30 秒的闹钟），把整棵书签树 POST 给 Obsidian 插件
// · Obsidian → Chrome：长轮询 /poll 领操作，一次一条，用 chrome.bookmarks 执行后 /ack 回执
// 只和本机 127.0.0.1:27184 通信。Obsidian 没开时什么都不做，等闹钟下次再试。

const BASE = "http://127.0.0.1:27184";   // 端口和 manifest 的 host_permissions、插件里的 PORT 是同一个
const POLL_TIMEOUT = 28000;               // 插件最多挂 20 秒；service worker 30 秒没动静会被回收
const UNPAIRED_RETRIES = 40;              // 等用户在 Obsidian 里点「允许」：每 3 秒问一次，最多 2 分钟

let looping = false;      // 长轮询在跑
let executing = false;    // 正在执行一条操作：这期间不推树，等回执发出去再推
let pushTimer = null;
let unpairedLeft = UNPAIRED_RETRIES;
let status = { state: "off", lastOk: 0, error: "" };   // state: on / off / unpaired / denied

async function setStatus(patch) {
	Object.assign(status, patch);
	try { await chrome.storage.session.set({ status }); } catch {}
}

async function api(path, body, timeout = 8000) {
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), timeout);
	try {
		const r = await fetch(BASE + path, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body || {}),
			signal: ctl.signal,
		});
		if (r.status === 403) {
			const j = await r.json().catch(() => ({}));
			throw Object.assign(new Error(j.error || "forbidden"), { code: j.error || "forbidden" });
		}
		if (!r.ok) throw new Error("HTTP " + r.status);
		return await r.json();
	} finally { clearTimeout(t); }
}

// ---------- Chrome → Obsidian ----------

async function pushTree() {
	const [root] = await chrome.bookmarks.getTree();
	const r = await api("/tree", { tree: root, version: chrome.runtime.getManifest().version });
	if (r.need && r.need.length) sendIcons(r.need).catch(() => {});
}

// 插件缺哪些网站的图标就补哪些；取不到的回空串，免得它反复来要
async function sendIcons(urls) {
	while (urls && urls.length) {
		const icons = {};
		for (const u of urls) {
			let host = "";
			try { host = new URL(u).host; } catch { continue; }
			try {
				const res = await fetch(chrome.runtime.getURL("/_favicon/") + "?pageUrl=" + encodeURIComponent(u) + "&size=32");
				const buf = new Uint8Array(await res.arrayBuffer());
				let s = "";
				for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
				icons[host] = "data:" + (res.headers.get("content-type") || "image/png") + ";base64," + btoa(s);
			} catch { icons[host] = ""; }
		}
		const r = await api("/favicons", { icons });
		urls = r.need;
	}
}

function schedulePush() {
	clearTimeout(pushTimer);
	pushTimer = setTimeout(() => {
		if (executing) return schedulePush();
		ensure(true);
	}, 300);
}
for (const ev of ["onCreated", "onRemoved", "onChanged", "onMoved", "onChildrenReordered", "onImportEnded"]) {
	chrome.bookmarks[ev].addListener(schedulePush);
}

// ---------- Obsidian → Chrome ----------

// 「插到 beforeId 前面」：Chrome 的 index 按移动前的位置算，正好就是 beforeId 现在的 index
async function place(parentId, beforeId) {
	if (beforeId) {
		try {
			const [b] = await chrome.bookmarks.get(beforeId);
			return { parentId: b.parentId, index: b.index };
		} catch {}
	}
	return { parentId };
}

async function restore(node, where) {
	const made = await chrome.bookmarks.create({ ...where, title: node.title || "", ...(node.url ? { url: node.url } : {}) });
	for (const c of node.children || []) await restore(c, { parentId: made.id });
	return made.id;
}

async function run(cmd) {
	const a = cmd.args || {};
	switch (cmd.op) {
		case "create": {
			const n = await chrome.bookmarks.create({ ...(await place(a.parentId, a.beforeId)), title: a.title || "", ...(a.url ? { url: a.url } : {}) });
			return { newId: n.id };
		}
		case "update": {
			const ch = {};
			if (a.title != null) ch.title = a.title;
			if (a.url) ch.url = a.url;
			await chrome.bookmarks.update(a.id, ch);
			return {};
		}
		case "move":
			await chrome.bookmarks.move(a.id, await place(a.parentId, a.beforeId));
			return {};
		case "remove": {
			const [n] = await chrome.bookmarks.get(a.id);
			if (n.url) await chrome.bookmarks.remove(a.id); else await chrome.bookmarks.removeTree(a.id);
			return {};
		}
		case "restore":
			return { newId: await restore(a.node, await place(a.parentId, a.beforeId)) };
	}
	throw new Error("不认识的操作：" + cmd.op);
}

// 同一条操作只执行一次：回执没送到、插件重发时，直接把上次的结果再回一遍
async function exec(cmd) {
	const { done = {} } = await chrome.storage.session.get("done");
	if (done[cmd.id]) return done[cmd.id];
	let res;
	try { res = { id: cmd.id, ok: true, ...(await run(cmd)) }; }
	catch (e) { res = { id: cmd.id, ok: false, error: String((e && e.message) || e) }; }
	const ids = Object.keys(done);
	if (ids.length > 50) for (const k of ids.slice(0, ids.length - 50)) delete done[k];
	done[cmd.id] = res;
	await chrome.storage.session.set({ done });
	return res;
}

async function loop() {
	if (looping) return;
	looping = true;
	try {
		for (;;) {
			const r = await api("/poll", {}, POLL_TIMEOUT);
			await setStatus({ state: "on", lastOk: Date.now(), error: "" });   // 顺带重置 service worker 的空闲计时
			if (!r.cmd) continue;
			executing = true;
			try {
				await api("/ack", await exec(r.cmd));
				await pushTree();
			} finally { executing = false; }
		}
	} finally { looping = false; }
}

// ---------- 连接 ----------

async function ensure(force) {
	if (looping && !force) return;
	try {
		await pushTree();
		unpairedLeft = UNPAIRED_RETRIES;
		await setStatus({ state: "on", lastOk: Date.now(), error: "" });
		await loop();
	} catch (e) {
		const code = e && e.code;
		if (code === "unpaired") {
			await setStatus({ state: "unpaired", error: "" });
			if (unpairedLeft-- > 0) setTimeout(() => ensure(), 3000);
		} else if (code === "denied") {
			await setStatus({ state: "denied", error: "" });
		} else {
			await setStatus({ state: "off", error: String((e && e.message) || e) });
		}
	}
}

chrome.alarms.create("tick", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => ensure());
chrome.runtime.onStartup.addListener(() => ensure());
chrome.runtime.onInstalled.addListener(() => ensure());
chrome.runtime.onMessage.addListener((msg) => {
	if (msg && msg.type === "sync") {
		unpairedLeft = UNPAIRED_RETRIES;
		ensure(true);
	}
});
ensure();
