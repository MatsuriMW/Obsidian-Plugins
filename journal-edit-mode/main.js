const { Plugin, Notice } = require("obsidian");

// 日记命名：2026_09_23 / 2026-9-3 都算
const JOURNAL_RE = /^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/;

module.exports = class JournalEditMode extends Plugin {
	onload() {
		const run = () => this.forceEdit();
		this.registerEvent(this.app.workspace.on("file-open", () => setTimeout(run, 30)));
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => setTimeout(run, 30)));
		this.app.workspace.onLayoutReady(() => setTimeout(run, 200));

		this.addCommand({
			id: "force-edit-now",
			name: "把当前日记切到编辑模式（用于自检）",
			callback: () => {
				const n = this.forceEdit(true);
				new Notice(n ? "已切到编辑模式" : "当前不是日记笔记，或已在编辑模式");
			},
		});
	}

	forceEdit(force = false) {
		let changed = 0;
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const file = leaf.view && leaf.view.file;
			if (!file || file.extension !== "md") continue;
			if (!force && !JOURNAL_RE.test(file.basename)) continue;
			if (force && !JOURNAL_RE.test(file.basename)) continue;
			const state = leaf.getViewState();
			if (!state.state || state.state.mode === "source") continue;
			leaf.setViewState({ ...state, state: { ...state.state, mode: "source" } });
			changed++;
		}
		return changed;
	}
};
