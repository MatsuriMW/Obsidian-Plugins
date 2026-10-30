const TEXT = {
	on: ["已同步", "书签有改动、或者在 Obsidian 里改过书签以后，点一下「同步」。"],
	syncing: ["同步中…", "正在把书签推给 Obsidian，并执行那边排队的修改。"],
	off: ["没连上 Obsidian", "Obsidian 没开，或者没启用「Chrome 书签」插件。打开以后再点「同步」。"],
	unpaired: ["等待允许", "请到 Obsidian 里，在弹出的窗口点「允许」，允许以后会自动接着同步。"],
	denied: ["已被拒绝", "在 Obsidian 的「Chrome 书签」设置里清掉拒绝记录后，再点「同步」。"],
};

function show(s) {
	const [title, sub] = TEXT[s.state] || TEXT.off;
	const last = s.lastOk ? ` 上次同步：${new Date(s.lastOk).toLocaleString()}` + (s.ran ? `，执行了 ${s.ran} 条修改` : "") + "。" : "";
	document.getElementById("title").textContent = title;
	document.getElementById("sub").textContent = sub + last;
	document.getElementById("dot").className = "dot" + (s.state === "on" ? " on" : s.state === "unpaired" || s.state === "syncing" ? " wait" : "");
}

chrome.storage.local.get("status").then(({ status }) => show(status || { state: "off" }));
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.status) show(ch.status.newValue); });
document.getElementById("sync").addEventListener("click", () => chrome.runtime.sendMessage({ type: "sync" }));
