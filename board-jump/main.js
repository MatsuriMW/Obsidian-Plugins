// 看板直达：一键跳到常用看板
//   · 设置里每一行一个看板（名字 / 路径 / 默认快捷键）→ 各自一条命令「看板直达：打开 xx」，快捷键也可以在 设置 → 快捷键 里改
//   · 命令「看板切换器」：列出设置里的看板 + 全库 frontmatter 写了 type: 看板 的笔记，输入就能搜，新看板不用登记也能跳
//   · 链接 obsidian://board?name=长期项目（或 path=…）：给 Keyboard Maestro / Raycast 做全局快捷键用
//   · 已经开着的就切过去，不重复开；没开就在新标签打开（设置里可以改成当前标签）
const { Plugin, PluginSettingTab, Setting, SuggestModal, Notice, TFile } = require("obsidian");

const DEFAULTS = {
  boards: [
    { name: "任务管理", path: "Concepts/知识管理/任务管理.md", hotkey: "Alt+Mod+1" },
    { name: "长期项目", path: "计划与总结/长期项目.md", hotkey: "Alt+Mod+2" },
  ],
  switcherHotkey: "Alt+Mod+K",
  openIn: "tab",   // tab = 新标签 · current = 当前标签
};
const parseHotkey = (s) => {
  if (!s || !String(s).trim()) return [];
  const parts = String(s).split("+").map((x) => x.trim()).filter(Boolean);
  const key = parts.pop();
  return [{ modifiers: parts, key: key.length === 1 ? key.toUpperCase() : key }];
};

class BoardSwitcher extends SuggestModal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.setPlaceholder("跳到哪个看板？（设置里登记的 + 所有 type: 看板 的笔记）");
  }
  getSuggestions(q) {
    const list = this.plugin.allBoards();
    const qq = q.trim().toLowerCase();
    return qq ? list.filter((b) => (b.name + " " + b.path).toLowerCase().includes(qq)) : list;
  }
  renderSuggestion(b, el) {
    el.createDiv({ text: b.name });
    el.createEl("small", { text: b.path + (b.hotkey ? "　" + b.hotkey.replace("Alt", "⌥").replace("Mod", "⌘").replace("Ctrl", "⌃").replace("Shift", "⇧").replace(/\+/g, "") : ""), attr: { style: "color:var(--text-muted);" } });
  }
  onChooseSuggestion(b) { this.plugin.openBoard(b); }
}

module.exports = class BoardJump extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.registered = [];
    this.addCommand({ id: "switcher", name: "看板切换器", hotkeys: parseHotkey(this.settings.switcherHotkey), callback: () => new BoardSwitcher(this).open() });
    this.registerBoardCommands();
    this.registerObsidianProtocolHandler("board", (p) => {
      const b = this.allBoards().find((x) => (p.path && x.path === p.path) || (p.name && x.name === p.name));
      if (b) this.openBoard(b); else new Notice("看板直达：找不到 " + (p.name || p.path));
    });
    this.addSettingTab(new BoardJumpSettings(this.app, this));
  }

  // 命令 ID 用序号（open-board-1、open-board-2…），在 设置 → 快捷键 里改过的绑定跟着序号走
  registerBoardCommands() {
    for (const id of this.registered) this.app.commands.removeCommand(`${this.manifest.id}:${id}`);
    this.registered = [];
    this.settings.boards.forEach((b, k) => {
      if (!b.path) return;
      const id = `open-board-${k + 1}`;
      this.addCommand({ id, name: `打开 ${b.name || b.path}`, hotkeys: parseHotkey(b.hotkey), callback: () => this.openBoard(b) });
      this.registered.push(id);
    });
  }

  allBoards() {
    const out = this.settings.boards.filter((b) => b.path).map((b) => ({ ...b }));
    const seen = new Set(out.map((b) => b.path));
    for (const f of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
      if (fm && String(fm.type) === "看板" && !seen.has(f.path)) out.push({ name: f.basename, path: f.path });
    }
    return out;
  }

  async openBoard(b) {
    let f = this.app.vault.getAbstractFileByPath(b.path);
    if (!(f instanceof TFile)) f = this.app.metadataCache.getFirstLinkpathDest(b.path.replace(/\.md$/, ""), "");
    if (!(f instanceof TFile)) return new Notice("看板直达：找不到 " + b.path);
    // 已经开着 → 切过去
    let found = null;
    // 后台没加载的标签（Obsidian 延迟加载）view 里还没有 file，要看 viewState
    this.app.workspace.iterateAllLeaves((l) => { if (!found && (l.view?.file?.path || l.getViewState()?.state?.file) === f.path) found = l; });
    if (found) {
      if (found.loadIfDeferred) await found.loadIfDeferred();
      this.app.workspace.setActiveLeaf(found, { focus: true });
      this.app.workspace.revealLeaf(found);
      return;
    }
    const leaf = this.settings.openIn === "current" ? this.app.workspace.getLeaf(false) : this.app.workspace.getLeaf("tab");
    await leaf.openFile(f, { state: { mode: "preview" } });
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.registerBoardCommands();
  }
};

class BoardJumpSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    containerEl.createEl("p", { text: "每一行是一个看板，各自一条命令。快捷键写法：Alt+Mod+1（Mod = ⌘，Alt = ⌥，Ctrl = ⌃）；这里写的是默认值，在「设置 → 快捷键」里搜「看板直达」改的会优先。没登记的看板只要 frontmatter 写了 type: 看板，也能在「看板切换器」里搜到。全局快捷键：让 Keyboard Maestro 打开 obsidian://board?name=看板名。", attr: { style: "color:var(--text-muted);font-size:.9em;" } });
    s.boards.forEach((b, k) => {
      new Setting(containerEl)
        .setName(`看板 ${k + 1}`)
        .addText((t) => t.setPlaceholder("名字").setValue(b.name || "").onChange((v) => { b.name = v; }))
        .addText((t) => t.setPlaceholder("路径，如 计划与总结/长期项目.md").setValue(b.path || "").onChange((v) => { b.path = v.trim(); }))
        .addText((t) => t.setPlaceholder("快捷键，如 Alt+Mod+3").setValue(b.hotkey || "").onChange((v) => { b.hotkey = v.trim(); }))
        .addExtraButton((x) => x.setIcon("trash").setTooltip("删除").onClick(async () => { s.boards.splice(k, 1); await this.plugin.saveSettings(); this.display(); }));
    });
    new Setting(containerEl)
      .addButton((x) => x.setButtonText("＋ 加一个看板").onClick(() => { s.boards.push({ name: "", path: "", hotkey: `Alt+Mod+${s.boards.length + 1}` }); this.display(); }))
      .addButton((x) => x.setButtonText("保存").setCta().onClick(async () => { await this.plugin.saveSettings(); new Notice("看板直达：已保存，命令已更新"); }));
    new Setting(containerEl).setName("看板切换器快捷键").setDesc("改了要重启插件才生效（或者直接在 设置 → 快捷键 里改）")
      .addText((t) => t.setValue(s.switcherHotkey || "").onChange(async (v) => { s.switcherHotkey = v.trim(); await this.plugin.saveData(s); }));
    new Setting(containerEl).setName("没开着的看板在哪打开")
      .addDropdown((d) => d.addOption("tab", "新标签").addOption("current", "当前标签").setValue(s.openIn).onChange(async (v) => { s.openIn = v; await this.plugin.saveData(s); }));
  }
}
