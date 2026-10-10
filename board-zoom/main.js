const { Plugin, WorkspaceLeaf, MarkdownView } = require("obsidian");

// 点击发生在 DataView 看板里之后，这么多毫秒内打开的「文件 + 行号」都自动聚焦
const CLICK_WINDOW_MS = 4000;
const ZOOM_IN = "bullet:zoom-in";
const ZOOM_RESET = "bullet:zoom-reset";   // Bullet 的「Show whole note」，一步退回整篇
const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s/;

module.exports = class BoardZoom extends Plugin {
  onload() {
    this.lastBoardClick = 0;
    // 记住「刚刚在看板里点过」：DataView 的 dataviewjs / dataview 代码块渲染在 .block-language-dataview(js) 里
    const mark = (e) => {
      const t = e.target;
      if (t && t.closest && t.closest(".block-language-dataviewjs, .block-language-dataview")) this.lastBoardClick = Date.now();
    };
    this.registerDomEvent(document, "mousedown", mark, true);
    this.registerDomEvent(document, "keydown", mark, true);
    this.app.workspace.on("window-open", (win) => {
      this.registerDomEvent(win.doc, "mousedown", mark, true);
      this.registerDomEvent(win.doc, "keydown", mark, true);
    });

    // 所有看板打开条目最后都走 leaf.openFile(file, { eState: { line } })，在这里接住
    const plugin = this;
    const proto = WorkspaceLeaf.prototype;
    const orig = (this.origOpenFile = proto.openFile);
    proto.openFile = async function (file, openState, ...rest) {
      const line = openState && openState.eState && openState.eState.line;
      const fromBoard = Date.now() - plugin.lastBoardClick < CLICK_WINDOW_MS;
      const res = await orig.call(this, file, openState, ...rest);
      if (fromBoard && typeof line === "number" && file && file.extension === "md") {
        plugin.lastBoardClick = 0;   // 一次点击只聚焦一次
        plugin.zoomTo(this, line).catch((e) => console.error("[board-zoom]", e));
      }
      return res;
    };

    this.addCommand({
      id: "zoom-current-line",
      name: "聚焦到光标所在的块（先退出原来的聚焦）",
      editorCallback: (editor, view) => this.zoomTo(view.leaf, editor.getCursor().line),
    });
  }

  onunload() {
    if (this.origOpenFile) WorkspaceLeaf.prototype.openFile = this.origOpenFile;
  }

  async zoomTo(leaf, line) {
    await sleep(30);
    const view = leaf.view;
    if (!(view instanceof MarkdownView)) return;
    // Bullet 的聚焦只在编辑模式下有效
    if (view.getMode && view.getMode() === "preview") {
      await leaf.setViewState({ ...leaf.getViewState(), state: { ...leaf.getViewState().state, mode: "source" } }, { history: false });
      await sleep(30);
    }
    const editor = view.editor;
    if (!editor || line >= editor.lineCount()) return;
    // 行号落在列表项的续行上时，往上找到它所属的那一项
    let target = line;
    while (target > 0 && !LIST_LINE.test(editor.getLine(target)) && /^\s+\S/.test(editor.getLine(target))) target--;
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    await sleep(10);
    // 先把之前的聚焦退干净，不然新的光标会被限制在旧的聚焦范围里（落点、动画、退出路径由 Bullet 自己管）
    if (this.app.commands.executeCommandById(ZOOM_RESET)) await sleep(10);
    const text = editor.getLine(target);
    editor.setCursor({ line: target, ch: text.length });
    if (!LIST_LINE.test(text)) { editor.scrollIntoView({ from: { line: target, ch: 0 }, to: { line: target, ch: 0 } }, true); return; }
    await sleep(10);
    if (!this.app.commands.executeCommandById(ZOOM_IN)) {
      editor.scrollIntoView({ from: { line: target, ch: 0 }, to: { line: target, ch: 0 } }, true);
    }
  }
};
