const TEXT = {
	on: ["已连接 Obsidian", "书签的增删改会实时同步到「Chrome 书签」侧栏。"],
	off: ["未连接", "Obsidian 没开，或者没启用「Chrome 书签」插件。打开后 30 秒内会自动连上。"],
	unpaired: ["等待允许", "请到 Obsidian 里，在弹出的窗口点「允许」。"],
	denied: ["已被拒绝", "在 Obsidian 的「Chrome 书签」设置里清掉拒绝记录后，再点「立即同步」。"],
};

function show(s) {
	const [title, sub] = TEXT[s.state] || TEXT.off;
	document.getElementById("title").textContent = title;
	document.getElementById("sub").textContent = sub + (s.lastOk ? ` 上次连上：${new Date(s.lastOk).toLocaleTimeString()}` : "");
	document.getElementById("dot").className = "dot" + (s.state === "on" ? " on" : s.state === "unpaired" ? " wait" : "");
}

chrome.storage.session.get("status").then(({ status }) => show(status || { state: "off" }));
chrome.storage.session.onChanged.addListener((ch) => { if (ch.status) show(ch.status.newValue); });
document.getElementById("sync").addEventListener("click", () => chrome.runtime.sendMessage({ type: "sync" }));
