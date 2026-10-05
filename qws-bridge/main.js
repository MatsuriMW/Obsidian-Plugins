const { Plugin, Notice, TFile, getLinkpath } = require("obsidian");

const OUT_ROOT     = "选题/_采访";      // 素材包和采访稿都放这里，每个选题一个子文件夹
const CLAUDIAN_ID  = "realclaudian";
const MAX_EXCERPTS = 200;               // 反链太多时只取最近的 200 处
const MAX_CHARS    = 150000;            // 素材包总长度上限，防止塞爆上下文
const JR = /^(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})$/;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const POINTER    = "00-素材包";          // 原笔记里留下的「素材已移到」那一行靠它认出来，下次不再搬
const safeName = (s) => String(s).replace(/[\\/:*?"<>|#^\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "未命名";

module.exports = class QwsBridge extends Plugin {
    onload() {
        this.addCommand({ id: "qws-interview", name: "QWS 采访：当前笔记 + 反链 → 知识稿",
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "q" }], checkCallback: (c) => this.cmd(c, "qws") });
        this.addCommand({ id: "grill-me", name: "grill-me：盘问当前选题的写作方案",
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "g" }], checkCallback: (c) => this.cmd(c, "grill") });
        this.addCommand({ id: "bundle-only", name: "只生成素材包（当前笔记 + 反链），不开对话",
            checkCallback: (c) => this.cmd(c, "bundle") });
        // obsidian://qws-bridge?path=<笔记路径>&mode=qws|grill|bundle[&line=<行号>][&send=0]
        this.registerObsidianProtocolHandler("qws-bridge", async (p) => {
            const f = this.app.vault.getAbstractFileByPath(p.path || "");
            if (!(f instanceof TFile)) return new Notice(`找不到笔记：${p.path}`);
            await this.run(f, p.mode || "qws", { line: p.line != null ? +p.line : null, send: p.send !== "0" });
        });
    }

    cmd(checking, mode) {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md") return false;
        if (!checking) this.run(f, mode);
        return true;
    }

    // ---------- 入口：给选题台的按钮也用这个 ----------
    async run(file, mode = "qws", opt = {}) {
        try {
            const b = opt.line != null ? await this.bundleBlock(file, opt.line) : await this.bundleNote(file);
            if (b.movedCount) new Notice(`已把 ${b.movedCount} 行选题内容搬进素材包，原笔记里只留一行链接`);
            if (mode === "bundle") { new Notice(`素材包已生成：${b.bundlePath}（反链 ${b.count} 处）`); return this.open(b.bundlePath); }
            const prompt = mode === "grill" ? this.grillPrompt(b) : this.qwsPrompt(b);
            await this.sendToClaudian(prompt, opt.send !== false);
        } catch (e) {
            console.error("[qws-bridge]", e);
            new Notice("追问成稿出错：" + (e.message || e));
        }
    }

    // ---------- 素材包：整篇笔记 + 全部反链 ----------
    // 选题页：正文（属性之外的部分）搬进素材包，原笔记只留一行「素材已移到」
    async bundleNote(file) {
        const title = file.basename;
        const folder = `${OUT_ROOT}/${safeName(title)}`;
        const raw = await this.app.vault.read(file);
        const fm = (raw.match(/^---\n[\s\S]*?\n---\n?/) || [""])[0];
        const moving = raw.slice(fm.length).split("\n").filter(l => !l.includes(POINTER));
        const { excerpts, sources } = await this.collectBacklinks(file);
        const b = await this.writeBundle({ title, folder, sourcePath: file.path, moved: moving, excerpts, sources });
        if (moving.join("").trim() && b.verified) {
            await this.app.vault.process(file, (data) => {
                const f2 = (data.match(/^---\n[\s\S]*?\n---\n?/) || [""])[0];
                return `${f2}${f2 && !f2.endsWith("\n") ? "\n" : ""}\n${this.pointerLine(b, "")}\n`;
            });
            b.movedCount = moving.filter(l => l.trim()).length;
        }
        return b;
    }

    pointerLine(b, indent) {
        return `${indent}- 素材已移到 [[${b.bundlePath.replace(/\.md$/, "")}|素材包]]（追问成稿 ${window.moment().format("YYYY-MM-DD")}）`;
    }

    // 选题对应的采访目录名：页面用文件名，日记块用那一行去掉前缀/分类链接后的前 40 字
    titleFor(file, line, lineText) {
        if (line == null) return file.basename;
        const raw = (lineText || "").replace(/^\s*[-*+]\s+(\[.\]\s+)?(TODO|DOING|DONE)?\s*/, "")
            .replace(/\[\[(文章选题|视频选题|blog选题|blog)(\|[^\]]*)?\]\]/g, "")
            .replace(/#[^\s#]+/g, "")                                   // #选题/状态 #主题/穿搭 之类的标签
            .replace(/[📅🛫✅]\s*\d{4}-\d{2}-\d{2}|📆\S+|📶\s*\d+|⭐/gu, "")
            .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")               // 其它双链只留显示文字
            .replace(/^[\s:：、,，·|\-–—]+/, "").trim();
        // 只取第一句当目录名：「写一篇文章聊一下高腰收臀阔腿裤。包括……」→「写一篇文章聊一下高腰收臀阔腿裤」
        const first = raw.split(/[。！？!?；;：:\n]/)[0].trim();
        const name = (first.length >= 4 ? first : raw).slice(0, 40).replace(/[\s。，,、：:；;！!？?…·]+$/, "");
        return name || `${file.basename} 第 ${line + 1} 行`;
    }

    // 给选题台显示进度用（同步、不写文件）：0 没做过 / 1 有素材包 / 2 有采访记录 / 3 有知识稿 02 / 4 有写作方案
    progress(file, line, lineText) {
        const folder = `${OUT_ROOT}/${safeName(this.titleFor(file, line, lineText))}`;
        const has = (n) => this.app.vault.getAbstractFileByPath(`${folder}/${n}`) instanceof TFile;
        const level = has("写作方案.md") ? 4 : has("02-采访分析与知识整理.md") ? 3 : has("01-完整采访记录.md") ? 2 : has("00-素材包.md") ? 1 : 0;
        return { folder, level };
    }

    // 选题台里「日记块」类型的选题：素材就是那一块及其子块，外加上一级
    async bundleBlock(file, line) {
        const text = await this.app.vault.cachedRead(file);
        const lines = text.split("\n");
        const cache = this.app.metadataCache.getFileCache(file) || {};
        const ctx = this.contextFor(cache, lines, line);
        const title = this.titleFor(file, line, lines[line]);
        const folder = `${OUT_ROOT}/${safeName(title)}`;
        const topic = lines[ctx.from];
        const indent = (topic.match(/^[\t ]*/) || [""])[0];
        const dedent = (l) => l.startsWith(indent) ? l.slice(indent.length) : l.replace(/^[\t ]+/, "");
        const kids = lines.slice(ctx.from + 1, ctx.to + 1).filter(l => !l.includes(POINTER));
        // 素材包里：选题这一行 + 它的全部子块（去掉整体缩进，当普通列表显示）
        const moved = [dedent(topic), ...kids.map(dedent)];
        const b = await this.writeBundle({ title, folder, sourcePath: file.path, moved, excerpts: [], sources: 0,
            note: `这个选题是 [[${file.basename}]] 里的一个块。` });
        // 原笔记：子块删掉，换成一行「素材已移到」；选题那一行本身留着，选题台还要用
        if (kids.some(l => l.trim()) && b.verified) {
            await this.app.vault.process(file, (data) => {
                const L = data.split("\n");
                let i = L[ctx.from] === topic ? ctx.from : L.indexOf(topic);
                if (i < 0) return data;
                let end = i + 1;
                const depth = (l) => (l.match(/^[\t ]*/) || [""])[0].replace(/ {4}/g, "\t").length;
                while (end < L.length && L[end].trim() && depth(L[end]) > depth(topic)) end++;
                L.splice(i + 1, end - i - 1, this.pointerLine(b, indent + "\t"));
                return L.join("\n");
            });
            b.movedCount = kids.filter(l => l.trim()).length;
        }
        return b;
    }

    // 找出所有链接到 file 的地方，每处取「所在的列表块 + 全部子块」或「所在段落」
    async collectBacklinks(file) {
        const mc = this.app.metadataCache;
        const srcs = [];
        for (const [src, targets] of Object.entries(mc.resolvedLinks || {})) {
            if (src === file.path || !targets || !targets[file.path]) continue;
            if (src.startsWith(OUT_ROOT + "/")) continue;          // 素材包自己不算
            const sf = this.app.vault.getAbstractFileByPath(src);
            if (sf instanceof TFile && sf.extension === "md") srcs.push(sf);
        }
        const excerpts = [];
        for (const sf of srcs) {
            const cache = mc.getFileCache(sf) || {};
            const lines = (await this.app.vault.cachedRead(sf)).split("\n");
            const hits = [...(cache.links || []), ...(cache.embeds || [])]
                .filter(l => mc.getFirstLinkpathDest(getLinkpath(l.link), sf.path)?.path === file.path)
                .map(l => l.position.start.line);
            const ranges = [];
            for (const L of hits) {
                const r = this.contextFor(cache, lines, L);
                const last = ranges[ranges.length - 1];
                if (last && r.from <= last.to + 1) { last.to = Math.max(last.to, r.to); last.parent = last.parent || r.parent; }
                else ranges.push(r);
            }
            for (const fl of cache.frontmatterLinks || []) {
                if (mc.getFirstLinkpathDest(getLinkpath(fl.link), sf.path)?.path === file.path)
                    excerpts.push({ file: sf, date: this.dateOf(sf), from: -1, to: -1, parent: null, text: `（在属性「${fl.key}」里引用了它）` });
            }
            for (const r of ranges) excerpts.push({ file: sf, date: this.dateOf(sf), ...r, text: lines.slice(r.from, r.to + 1).join("\n") });
        }
        // 日记按时间排在前面（看得出想法怎么演变），其它笔记按路径排在后面
        excerpts.sort((a, b) => (a.date && b.date) ? a.date.localeCompare(b.date) || a.from - b.from
            : a.date ? -1 : b.date ? 1 : a.file.path.localeCompare(b.file.path) || a.from - b.from);
        let kept = excerpts;
        if (kept.length > MAX_EXCERPTS) kept = kept.slice(-MAX_EXCERPTS);
        return { excerpts: kept, sources: srcs.length, dropped: excerpts.length - kept.length };
    }

    contextFor(cache, lines, L) {
        const items = cache.listItems || [];
        let item = null;
        for (const it of items) if (it.position.start.line <= L && L <= it.position.end.line) item = it;   // 最深的那个
        if (item) {
            const start = item.position.start.line;
            let end = item.position.end.line;
            const inside = new Set([start]);
            for (const it of items) {
                if (it.position.start.line <= start) continue;
                if (inside.has(it.parent)) { inside.add(it.position.start.line); end = Math.max(end, it.position.end.line); }
            }
            const parent = item.parent >= 0 ? (lines[item.parent] || "").trim() : null;
            return { from: start, to: end, parent };
        }
        const sec = (cache.sections || []).find(s => s.position.start.line <= L && L <= s.position.end.line);
        if (sec) {
            let from = sec.position.start.line, to = sec.position.end.line;
            if (to - from > 30) { from = Math.max(from, L - 3); to = Math.min(to, L + 3); }
            return { from, to, parent: null };
        }
        return { from: Math.max(0, L - 2), to: Math.min(lines.length - 1, L + 2), parent: null };
    }

    dateOf(f) {
        const m = f.basename.match(JR);
        return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
    }

    async writeBundle({ title, folder, sourcePath, moved, excerpts, sources, note }) {
        const fence = "~~~~~";
        const bundlePath = `${folder}/00-素材包.md`;
        // 上一次已经搬进来的内容要留着（原笔记里已经删了），这次新搬的接在后面
        let old = [];
        const prev = this.app.vault.getAbstractFileByPath(bundlePath);
        if (prev instanceof TFile) {
            const t = await this.app.vault.read(prev);
            const m = t.match(/\n## 一、[^\n]*\n([\s\S]*?)\n## 二、/);
            if (m) old = m[1].trim().replace(new RegExp(`^${fence}markdown\\n|\\n?${fence}\\s*$`, "g"), "")
                .replace(/^（这个选题是[^\n]*\n+/, "").replace(/^这个选题是 \[\[[^\n]*\n+/, "").split("\n");
        }
        const oldSet = new Set(old.map(l => l.trim()).filter(Boolean));
        const fresh = moved.filter(l => !l.trim() || !oldSet.has(l.trim()));
        const mainLines = [...old, ...fresh];   // 直接接在后面，不插空行（空行后的缩进行会被当成代码块）
        while (mainLines.length && !mainLines[mainLines.length - 1].trim()) mainLines.pop();
        while (mainLines.length && !mainLines[0].trim()) mainLines.shift();
        const parts = [];
        parts.push(`---\ntype: 素材包\n选题: "${sourcePath}"\n生成时间: ${window.moment().format("YYYY-MM-DD HH:mm")}\n反链: ${excerpts.length}\n---\n`);
        parts.push(`> 由「追问成稿」插件生成。第一部分是选题笔记里的内容，已经从原笔记搬到这里（原处只留一行「素材已移到」），直接当正文显示；第二部分是库里链接到它的段落，放在代码块里，免得重复产生反链和任务。重新运行会保留第一部分、只追加新内容，第二部分会重新生成。\n`);
        parts.push(`## 一、选题笔记全文（来自 ${sourcePath}）\n\n${note ? note + "\n\n" : ""}${mainLines.join("\n")}\n`);
        parts.push(`## 二、反向链接（${excerpts.length} 处，来自 ${sources} 篇笔记）\n`);
        if (!excerpts.length) parts.push("没有其它笔记链接到它。\n");
        let size = parts.join("\n").length;
        for (const e of excerpts) {
            const where = e.from < 0 ? "属性" : `第 ${e.from + 1}${e.to > e.from ? `–${e.to + 1}` : ""} 行`;
            let block = `### ${e.date ? e.date + " 日记" : e.file.basename}｜${e.file.path} ${where}\n`;
            if (e.parent) block += `上一级：${e.parent.replace(/^[-*+]\s+/, "")}\n`;
            block += `\n${fence}markdown\n${e.text}\n${fence}\n`;
            if (size + block.length > MAX_CHARS) { parts.push(`\n（素材包已到 ${MAX_CHARS} 字上限，后面的反链没有放进来）\n`); break; }
            parts.push(block); size += block.length;
        }
        await this.ensureFolder(folder);
        const existing = this.app.vault.getAbstractFileByPath(bundlePath);
        const content = parts.join("\n");
        if (existing instanceof TFile) await this.app.vault.modify(existing, content);
        else await this.app.vault.create(bundlePath, content);
        const has02 = this.app.vault.getAbstractFileByPath(`${folder}/02-采访分析与知识整理.md`) instanceof TFile;
        // 写完再读一遍，确认搬的每一行都在素材包里，才允许去原笔记删
        const back = await this.app.vault.read(this.app.vault.getAbstractFileByPath(bundlePath));
        const verified = moved.filter(l => l.trim()).every(l => back.includes(l.trim()));
        return { title, folder, bundlePath, count: excerpts.length, has02, verified };
    }

    async ensureFolder(path) {
        let cur = "";
        for (const seg of path.split("/")) {
            cur = cur ? `${cur}/${seg}` : seg;
            if (!this.app.vault.getAbstractFileByPath(cur)) await this.app.vault.createFolder(cur).catch(() => {});
        }
    }

    // ---------- 两种提示词 ----------
    qwsPrompt(b) {
        return [
            `请调取 QWS（qws skill），对我做一次 AI 采访。`,
            ``,
            `主题：「${b.title}」——我准备写成博客文章或口播稿的一个选题。`,
            `已有材料在「${b.bundlePath}」：这篇选题笔记的全文，以及库里所有链接到它的段落（大多来自我的日记，按时间排列）。请先完整读完素材包再开始：`,
            `- 素材包里已经说清楚的事实和观点不要再问，从说得不清、互相矛盾、只起了个头的地方问起`,
            `- 我的日记里既有自己的想法，也有从别处摘抄的内容。摘抄不等于我的观点——拿不准某段是不是我写的，就把它当成一个问题问我，不要替我认领`,
            `- 用途是之后公开发表，所以公开表达素材线请开启`,
            `- 采访文件保存到「${b.folder}/」`,
        ].join("\n");
    }

    grillPrompt(b) {
        const base = b.has02 ? `已经有一份采访整理出来的知识稿「${b.folder}/02-采访分析与知识整理.md」，观点以它为准；素材包「${b.bundlePath}」作补充。`
                             : `材料在「${b.bundlePath}」（选题笔记全文 + 库里所有链接到它的段落）。`;
        return [
            `我在准备「${b.title}」这篇内容（博客文章或口播稿）。${base}请先读完再开始。`,
            ``,
            `请用 grill-me 的方式盘问我的写作方案：`,
            `Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer. Ask the questions one at a time. If a question can be answered by reading the vault, read it instead of asking.`,
            ``,
            `要厘清的：写给谁、读者读完得到什么、一句话主张、论证顺序、开头用什么钩子、每一节用哪条素材、形式和篇幅、结尾落点、哪些材料要舍掉。`,
            `全程用中文，一次只问一个问题，并给出你推荐的答案。`,
            `达成共识后，把结论写成「${b.folder}/写作方案.md」：一句话主张、目标读者、结构大纲（每节一句话 + 对应素材出处）、开头、结尾、还缺的材料。`,
        ].join("\n");
    }

    // ---------- 交给 Claudian ----------
    async sendToClaudian(prompt, autoSend) {
        const cl = this.app.plugins.plugins[CLAUDIAN_ID];
        const fallback = async (why) => {
            await navigator.clipboard.writeText(prompt);
            if (cl) await this.app.commands.executeCommandById(`${CLAUDIAN_ID}:open-view`);
            new Notice(`提示词已复制到剪贴板（${why}），在 Claudian 里粘贴发送即可`, 8000);
        };
        if (!cl) return fallback("没找到 Claudian 插件");
        try {
            let view = cl.getView?.();
            if (!view) { await this.app.commands.executeCommandById(`${CLAUDIAN_ID}:open-view`); await sleep(800); view = cl.getView?.(); }
            if (!view) return fallback("Claudian 视图没打开");
            if (view.leaf) this.app.workspace.revealLeaf(view.leaf);
            // 新开一个对话标签，不打断正在进行的对话
            if (cl.canCreateNewTab?.()) { await cl.openNewTab(); await sleep(500); }
            const tab = view.getTabManager?.()?.getActiveTab?.();
            if (!tab || tab.state?.isStreaming) return fallback("当前对话还在输出，没法新开标签");
            const el = tab.dom?.inputEl;
            if (!el) return fallback("找不到输入框");
            el.focus();                                   // 输入框是惰性创建的 CodeMirror，聚焦后才生成编辑器
            el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            await sleep(80);
            const { EditorView } = require("@codemirror/view");
            const cm = EditorView.findFromDOM(el);
            if (!cm) return fallback("输入框编辑器没初始化");
            cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: prompt }, selection: { anchor: prompt.length } });
            cm.focus();
            const ctrl = tab.controllers?.inputController;
            if (autoSend && ctrl?.sendMessage) { await sleep(120); await ctrl.sendMessage(); new Notice("已发给 Claudian，开始追问"); }
            else new Notice("提示词已放进 Claudian 输入框，确认后发送");
        } catch (e) {
            console.error("[qws-bridge] send", e);
            return fallback("自动填入失败");
        }
    }

    async open(path) {
        const f = this.app.vault.getAbstractFileByPath(path);
        if (f instanceof TFile) await this.app.workspace.getLeaf(true).openFile(f);
    }
};
