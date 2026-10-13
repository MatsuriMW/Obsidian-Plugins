const { Plugin, Notice, FileView, PluginSettingTab, Setting, Platform } = require("obsidian");

// 一条命令现在绑着哪些键（你改过的优先，没改过就是默认的），写成 ⌥⌘W 这种样子；没绑返回 ""
function hotkeyText(app, id) {
    const hm = app.hotkeyManager, list = (hm.getHotkeys(id) || hm.getDefaultHotkeys(id) || []);
    const mac = Platform.isMacOS, sym = { Mod: mac ? "⌘" : "Ctrl+", Meta: mac ? "⌘" : "Win+", Ctrl: mac ? "⌃" : "Ctrl+", Alt: mac ? "⌥" : "Alt+", Shift: mac ? "⇧" : "Shift+" };
    const order = ["Ctrl", "Alt", "Shift", "Mod", "Meta"];
    return list.map((h) => order.filter((m) => (h.modifiers || []).includes(m)).map((m) => sym[m]).join("") + String(h.key || "").toUpperCase()).join(" / ");
}
// 打开「设置 → 快捷键」并只列出名字里带 word 的命令
function openHotkeys(app, word) {
    app.setting.open();
    const tab = app.setting.openTabById("hotkeys");
    if (tab && typeof tab.setQuery === "function") tab.setQuery(word);
}

class CloseSidebarSettings extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl).setName("快捷键").setHeading();
        const row = (id, name) => new Setting(containerEl).setName(name).setDesc(`现在：${hotkeyText(this.app, id) || "没有绑键"}。键位在 Obsidian 的「设置 → 快捷键」里改，改了就用你的，默认的那个自动让位`)
            .addButton((b) => b.setButtonText("去改").onClick(() => openHotkeys(this.app, "侧边栏里打开的笔记")));
        row("close-sidebar-files:close-sidebar-files", "清空两侧边栏里打开的笔记");
        new Setting(containerEl).setName("只清空右侧栏里打开的笔记").setDesc(`现在：${hotkeyText(this.app, "close-sidebar-files:close-right-sidebar-files") || "没有绑键"}`)
            .addButton((b) => b.setButtonText("去改").onClick(() => openHotkeys(this.app, "右侧栏里打开的笔记")));
    }
}

module.exports = class CloseSidebarFiles extends Plugin {
    onload() {
        this.addCommand({
            id: "close-sidebar-files",
            name: "清空两侧边栏里打开的笔记（插件面板不动）",
            hotkeys: [{ modifiers: ["Mod", "Alt"], key: "W" }],   // 字母要大写：Mac 上按住 ⌥ 打出来的是特殊字符，Obsidian 改按键位比对，区分大小写
            callback: () => this.closeFiles(["left", "right"]),
        });
        this.addCommand({
            id: "close-right-sidebar-files",
            name: "只清空右侧栏里打开的笔记",
            callback: () => this.closeFiles(["right"]),
        });
        this.addRibbonIcon("panel-right-close", "清空侧边栏里打开的笔记", () => this.closeFiles(["left", "right"]));
        this.addSettingTab(new CloseSidebarSettings(this.app, this));
    }

    // 能打开文件的那些 view type（markdown / pdf / image / audio / video / canvas / base，
    // 以及插件自己注册的，比如 excalidraw）。viewRegistry 里按扩展名注册的就是全集。
    fileViewTypes() {
        const reg = this.app.viewRegistry;
        const set = new Set(["markdown", "pdf", "image", "audio", "video", "canvas", "bases"]);
        try { Object.values(reg.typeByExtension || {}).forEach((t) => set.add(t)); } catch (e) {}
        return set;
    }

    // 关键：Obsidian 1.7 起侧边栏里非激活的标签是「延迟视图」，leaf.view 只是个占位，
    // 用 instanceof FileView 判断只会命中当前那一个。所以改成读 leaf.getViewState().type，
    // 它不管有没有加载都是真实类型。backlink / outline / search / 各家插件面板不在 fileViewTypes 里，碰不到。
    isFileLeaf(leaf, fileTypes) {
        let type = "";
        try { type = (leaf.getViewState() || {}).type || ""; } catch (e) {}
        if (!type && leaf.view && leaf.view.getViewType) type = leaf.view.getViewType();
        if (type === "empty") return true;              // 空白页签，留着也没用
        if (fileTypes.has(type)) return true;
        return leaf.view instanceof FileView;            // 兜底
    }

    leafName(leaf) {
        try {
            const st = leaf.getViewState() || {};
            const f = (st.state && st.state.file) || (leaf.view && leaf.view.file && leaf.view.file.path);
            if (f) return String(f).split("/").pop().replace(/\.md$/, "");
        } catch (e) {}
        return null;
    }

    closeFiles(sides) {
        const ws = this.app.workspace;
        const roots = sides.map((s) => (s === "right" ? ws.rightSplit : ws.leftSplit)).filter(Boolean);
        if (!roots.length) { new Notice("找不到侧边栏。"); return; }

        const fileTypes = this.fileViewTypes();
        const doomed = [];
        let kept = 0;
        ws.iterateAllLeaves((leaf) => {
            let root = null;
            try { root = leaf.getRoot(); } catch (e) {}
            if (!roots.includes(root)) return;
            if (this.isFileLeaf(leaf, fileTypes)) doomed.push(leaf);
            else kept++;
        });

        if (!doomed.length) { new Notice("侧边栏里没有打开的笔记。"); return; }

        const names = doomed.map((l) => this.leafName(l)).filter(Boolean);
        // 先全部收集再统一 detach —— 边遍历边关会漏
        doomed.forEach((leaf) => { try { leaf.detach(); } catch (e) {} });

        // 哪一侧被清空了就把哪一侧收起来，省得留一块空白
        roots.forEach((root) => {
            let left = 0;
            ws.iterateAllLeaves((leaf) => { try { if (leaf.getRoot() === root) left++; } catch (e) {} });
            if (left === 0 && root.collapse) root.collapse();
        });

        const preview = names.slice(0, 3).join("、") + (names.length > 3 ? ` 等 ${names.length} 篇` : "");
        new Notice(`关掉了 ${doomed.length} 篇${preview ? "：" + preview : ""}${kept ? `，保留 ${kept} 个面板` : ""}`);
    }
};
