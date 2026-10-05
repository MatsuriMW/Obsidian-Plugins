const { Plugin, Notice, FileView } = require("obsidian");

module.exports = class CloseSidebarFiles extends Plugin {
    onload() {
        this.addCommand({
            id: "close-sidebar-files",
            name: "清空两侧边栏里打开的笔记（插件面板不动）",
            hotkeys: [{ modifiers: ["Mod", "Alt"], key: "w" }],
            callback: () => this.closeFiles(["left", "right"]),
        });
        this.addCommand({
            id: "close-right-sidebar-files",
            name: "只清空右侧栏里打开的笔记",
            callback: () => this.closeFiles(["right"]),
        });
        this.addRibbonIcon("panel-right-close", "清空侧边栏里打开的笔记", () => this.closeFiles(["left", "right"]));
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
