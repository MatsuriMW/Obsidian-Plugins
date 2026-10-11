// 看板直达：跳到常用看板
//   · 命令「看板切换器」（默认 ⌥⌘K）：列出设置里登记的看板 + 全库 frontmatter 写了 type: 看板 的笔记，输入就能搜，新看板不用登记也能跳
//     切换器就是 Better Command Palette 文件搜索的「书签」范围（由 Palette Enhancements 提供，书签 + 看板一起搜）；那两个插件没开时退回自带的小面板
//   · 设置里每一行登记一个看板（名字 / 路径），给切换器和下面的链接用；不再给每个看板单独注册命令和快捷键
//   · 链接 obsidian://board?name=长期项目（或 path=…）：给 Keyboard Maestro / Raycast 做全局快捷键用
//   · 已经开着的就切过去，不重复开；没开就在新标签打开（设置里可以改成当前标签）
//   · 看板全宽：书签里的笔记、type: 看板 的笔记，只要里面有 dataview / dataviewjs 代码块，就不受「可读行宽」限制、铺满面板
//     （给视图加 board-wide 类，样式在 styles.css）；命令「当前笔记切换全宽」可以单篇改，记在设置里
const { Plugin, PluginSettingTab, Setting, SuggestModal, Notice, TFile, MarkdownView } = require("obsidian");

const DEFAULTS = {
  boards: [
    { name: "任务管理", path: "Concepts/知识管理/任务管理.md" },
    { name: "长期项目", path: "计划与总结/长期项目.md" },
  ],
  switcherHotkey: "Alt+Mod+K",
  openIn: "tab",   // tab = 新标签 · current = 当前标签
  wideBoards: true,     // 书签 / type: 看板 里带 Dataview 的笔记全宽显示
  wideOverrides: {},    // 单篇例外：path → true 全宽 / false 照常
};
const DV_BLOCK = /^\s*(```|~~~)\s*dataview(js)?\b/m;
const parseHotkey = (s) => {
  if (!s || !String(s).trim()) return [];
  const parts = String(s).split("+").map((x) => x.trim()).filter(Boolean);
  const key = parts.pop();
  return [{ modifiers: parts, key: key.length === 1 ? key.toUpperCase() : key }];
};

const PALETTE_PLUGIN = "palette-split-open";
const BCP_FILE_SEARCH = "obsidian-better-command-palette:open-better-commmand-palette-file-search";

// 备用：Better Command Palette / Palette Enhancements 没开时用的小面板
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
    el.createEl("small", { text: b.path, attr: { style: "color:var(--text-muted);" } });
  }
  onChooseSuggestion(b) { this.plugin.openBoard(b); }
}

module.exports = class BoardJump extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addCommand({ id: "switcher", name: "看板切换器", hotkeys: parseHotkey(this.settings.switcherHotkey), callback: () => this.openSwitcher() });
    this.registerObsidianProtocolHandler("board", (p) => {
      const b = this.allBoards().find((x) => (p.path && x.path === p.path) || (p.name && x.name === p.name));
      if (b) this.openBoard(b); else new Notice("看板直达：找不到 " + (p.name || p.path));
    });
    this.addSettingTab(new BoardJumpSettings(this.app, this));
    this.setupWide();
  }

  // ---------- 看板全宽 ----------
  setupWide() {
    this.dvCache = new Map();   // path → 有没有 dataview 代码块
    const refresh = () => this.refreshWide();
    this.registerEvent(this.app.workspace.on("layout-change", refresh));
    this.registerEvent(this.app.workspace.on("file-open", refresh));
    this.registerEvent(this.app.metadataCache.on("changed", (f) => { this.dvCache.delete(f.path); refresh(); }));
    this.registerEvent(this.app.vault.on("rename", (f, old) => { this.dvCache.delete(old); refresh(); }));
    const bm = this.bookmarks();
    if (bm && typeof bm.on === "function") this.registerEvent(bm.on("changed", refresh));
    this.app.workspace.onLayoutReady(refresh);
    this.addCommand({
      id: "toggle-wide", name: "当前笔记切换全宽 / 可读行宽",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) return false;
        if (!checking) this.toggleWide(view.file);
        return true;
      },
    });
    this.register(() => this.app.workspace.iterateAllLeaves((l) => l.view?.containerEl?.removeClass("board-wide")));
  }
  bookmarks() { return this.app.internalPlugins?.getPluginById?.("bookmarks")?.instance || null; }
  bookmarkedPaths() {
    const out = new Set();
    const walk = (items) => { for (const it of items || []) { if (it.type === "file" && it.path) out.add(it.path); if (it.items) walk(it.items); } };
    walk(this.bookmarks()?.items);
    return out;
  }
  async hasDataview(f) {
    if (this.dvCache.has(f.path)) return this.dvCache.get(f.path);
    let yes = false;
    try { yes = DV_BLOCK.test(await this.app.vault.cachedRead(f)); } catch (e) {}
    this.dvCache.set(f.path, yes);
    return yes;
  }
  async isWide(f, marked) {
    const o = this.settings.wideOverrides || {};
    if (f.path in o) return !!o[f.path];
    if (!this.settings.wideBoards) return false;
    const isBoard = marked.has(f.path) || String(this.app.metadataCache.getFileCache(f)?.frontmatter?.type) === "看板";
    return isBoard && (await this.hasDataview(f));
  }
  async refreshWide() {
    const marked = this.bookmarkedPaths();
    const leaves = [];
    this.app.workspace.iterateAllLeaves((l) => { if (l.view instanceof MarkdownView) leaves.push(l); });
    for (const l of leaves) {
      const f = l.view.file;
      l.view.containerEl.toggleClass("board-wide", !!f && (await this.isWide(f, marked)));
    }
  }
  async toggleWide(f) {
    const now = await this.isWide(f, this.bookmarkedPaths());
    const o = (this.settings.wideOverrides = this.settings.wideOverrides || {});
    delete o[f.path];
    if ((await this.isWide(f, this.bookmarkedPaths())) === now) o[f.path] = !now;   // 默认规则给不出想要的结果，才记成例外
    await this.saveData(this.settings);
    await this.refreshWide();
    new Notice(`看板直达：「${f.basename}」${now ? "恢复可读行宽" : "全宽显示"}`);
  }

  // 看板切换器：Better Command Palette 文件搜索的「书签」范围（书签 + 看板）；没有就用自带的小面板
  openSwitcher() {
    const palette = this.app.plugins.plugins[PALETTE_PLUGIN];
    if (palette && palette.openScoped && this.app.commands.findCommand(BCP_FILE_SEARCH)) palette.openScoped("bookmarks");
    else new BoardSwitcher(this).open();
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
  }
};

class BoardJumpSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    containerEl.createEl("p", { text: "每一行登记一个看板，在「看板切换器」里能搜到（切换器就是 Better Command Palette 的书签范围，默认 ⌥⌘K；⌘O 之后打 、 进的也是它）。书签里的笔记、frontmatter 写了 type: 看板 的笔记不用登记也能搜到。全局快捷键：让 Keyboard Maestro 打开 obsidian://board?name=看板名。", attr: { style: "color:var(--text-muted);font-size:.9em;" } });
    s.boards.forEach((b, k) => {
      new Setting(containerEl)
        .setName(`看板 ${k + 1}`)
        .addText((t) => t.setPlaceholder("名字").setValue(b.name || "").onChange((v) => { b.name = v; }))
        .addText((t) => t.setPlaceholder("路径，如 计划与总结/长期项目.md").setValue(b.path || "").onChange((v) => { b.path = v.trim(); }))
        .addExtraButton((x) => x.setIcon("trash").setTooltip("删除").onClick(async () => { s.boards.splice(k, 1); await this.plugin.saveSettings(); this.display(); }));
    });
    new Setting(containerEl)
      .addButton((x) => x.setButtonText("＋ 加一个看板").onClick(() => { s.boards.push({ name: "", path: "" }); this.display(); }))
      .addButton((x) => x.setButtonText("保存").setCta().onClick(async () => { await this.plugin.saveSettings(); new Notice("看板直达：已保存"); }));
    new Setting(containerEl).setName("看板切换器快捷键").setDesc("写法：Alt+Mod+K（Mod = ⌘，Alt = ⌥，Ctrl = ⌃）。改了要重启插件才生效（或者直接在 设置 → 快捷键 里搜「看板切换器」改）")
      .addText((t) => t.setValue(s.switcherHotkey || "").onChange(async (v) => { s.switcherHotkey = v.trim(); await this.plugin.saveData(s); }));
    new Setting(containerEl).setName("看板全宽显示")
      .setDesc("书签里的笔记、type: 看板 的笔记，只要有 dataview / dataviewjs 代码块，就不受「可读行宽」限制。单篇想改用命令「当前笔记切换全宽」")
      .addToggle((t) => t.setValue(s.wideBoards !== false).onChange(async (v) => { s.wideBoards = v; await this.plugin.saveData(s); this.plugin.refreshWide(); }));
    new Setting(containerEl).setName("没开着的看板在哪打开")
      .addDropdown((d) => d.addOption("tab", "新标签").addOption("current", "当前标签").setValue(s.openIn).onChange(async (v) => { s.openIn = v; await this.plugin.saveData(s); }));
  }
}
