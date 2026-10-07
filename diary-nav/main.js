// 日记翻页 + 刷新
//   · ⌘R：刷新当前光标所在的页面（重建这个面板，光标和滚动位置留在原处）
//   · 前进 / 后退：当前是日记（「日记」文件夹里 YYYY_MM_DD 的文件）时，变成后一天 / 前一天的日记
//       - 后退：跳到更早的最近一篇日记，中间没写的日子直接跳过，不会凭空建空日记
//       - 前进：跳到更晚的最近一篇；已经是最后一篇了，就新建（按日记模板）后一天的日记
//     不是日记时，照常执行 Obsidian 自带的前进 / 后退
//   日记文件夹和日期格式直接读核心「日记」插件的设置，改了那边这里跟着变
const { Plugin, Notice, TFile, moment } = require("obsidian");

module.exports = class DiaryNav extends Plugin {
  onload() {
    this.addCommand({
      id: "refresh-page",
      name: "刷新当前页面",
      callback: () => this.refresh(),
    });
    this.addCommand({
      id: "go-back",
      name: "后退（日记里 = 前一天）",
      callback: () => this.step(-1),
    });
    this.addCommand({
      id: "go-forward",
      name: "前进（日记里 = 后一天）",
      callback: () => this.step(1),
    });
  }

  daily() {
    const p = this.app.internalPlugins.getPluginById("daily-notes");
    return p && p.enabled ? p.instance : null;
  }

  // 当前文件是日记就返回它的日期，否则 null
  diaryDate(file) {
    const dn = this.daily();
    if (!dn || !(file instanceof TFile) || file.extension !== "md") return null;
    const folder = (dn.options.folder || "").replace(/^\/+|\/+$/g, "");
    if (folder && !file.path.startsWith(folder + "/")) return null;
    const d = moment(file.basename, dn.getFormat(), true);
    return d.isValid() ? d : null;
  }

  async step(dir) {
    const leaf = this.app.workspace.getMostRecentLeaf();
    const file = leaf && leaf.view && leaf.view.file;
    const date = this.diaryDate(file);
    if (!date) {
      this.app.commands.executeCommandById(dir < 0 ? "app:go-back" : "app:go-forward");
      return;
    }

    const dn = this.daily();
    const cur = date.clone().startOf("day").valueOf();
    let best = null, bestTs = null;
    dn.iterateDailyNotes((f, ts) => {
      if (dir < 0 ? ts < cur && (bestTs === null || ts > bestTs) : ts > cur && (bestTs === null || ts < bestTs)) {
        best = f; bestTs = ts;
      }
    });

    if (!best && dir > 0) best = await dn.getDailyNote(date.clone().add(1, "day"));
    if (!best) {
      new Notice("前面没有更早的日记了");
      return;
    }
    await leaf.openFile(best, { active: true });
  }

  async refresh() {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) return;
    const eState = leaf.getEphemeralState();
    await leaf.rebuildView();
    leaf.setEphemeralState(eState);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }
};
