// 粘贴图片缩放：粘贴 / 拖进笔记的图片，默认按原图宽度的 50% 显示
//   · Obsidian 先把图片存进附件文件夹、再在光标处插入 ![[图片.png]]；这个插件等那段链接出现，
//     读出图片的原始宽度，改成 ![[图片.png|宽度]]（Markdown 链接写法是 ![|宽度](路径)）
//   · Retina 截图（CleanShot 的 @2x 之类）像素是屏幕上的两倍，50% 正好回到截图时看到的大小
//   · 只管刚粘贴 / 拖进来的那一张；已经写了宽度的、笔记里原有的图片都不碰
//   · 想看原图大小：删掉 |宽度 就行
const { Plugin, PluginSettingTab, Setting, TFile } = require("obsidian");

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "svg", "heic", "tif", "tiff"];
const DEFAULTS = { percent: 50, onPaste: true, onDrop: true, minWidth: 0 };
const WINDOW_MS = 6000;   // 粘贴之后这么久里新建的图片，算这次粘贴的

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = class PasteImageScale extends Plugin {
	async onload() {
		this.settings = Object.assign({}, DEFAULTS, await this.loadData());
		this.armed = null;   // { editor, until }：刚粘贴 / 拖进了文件

		const arm = (evt, editor, kind) => {
			if (!this.settings[kind]) return;
			const dt = kind === "onPaste" ? evt.clipboardData : evt.dataTransfer;
			const files = dt && dt.files ? [...dt.files] : [];
			if (!files.some((f) => (f.type || "").startsWith("image/") || IMAGE_EXT.includes((f.name.split(".").pop() || "").toLowerCase()))) return;
			this.armed = { editor, until: Date.now() + WINDOW_MS };
		};
		this.registerEvent(this.app.workspace.on("editor-paste", (evt, editor) => arm(evt, editor, "onPaste")));
		this.registerEvent(this.app.workspace.on("editor-drop", (evt, editor) => arm(evt, editor, "onDrop")));

		this.registerEvent(this.app.vault.on("create", (file) => {
			if (!(file instanceof TFile) || !IMAGE_EXT.includes(file.extension.toLowerCase())) return;
			const armed = this.armed;
			if (!armed || Date.now() > armed.until) return;
			this.resize(armed.editor, file).catch((e) => console.error("[paste-image-scale]", e));
		}));

		this.addSettingTab(new ScaleSettingTab(this.app, this));
	}

	// 等编辑器里出现这张图的链接（最多等几秒），量出原图宽度，补上 |宽度
	async resize(editor, file) {
		const width = await this.naturalWidth(file);
		if (!width) return;
		const shown = Math.round(width * this.settings.percent / 100);
		if (this.settings.minWidth && shown < this.settings.minWidth) return;
		const name = esc(file.name), full = esc(file.path), enc = esc(encodeURI(file.path)), encName = esc(encodeURI(file.name));
		// ![[a.png]] / ![[dir/a.png]]（没有 |）；![](a.png) / ![](dir/a%20b.png)（alt 里没有 |数字）
		const wiki = new RegExp(`!\\[\\[((?:[^\\]|]*/)?(?:${name}))\\]\\]`);
		const md = new RegExp(`!\\[([^\\]|]*)\\]\\(((?:[^)]*/)?(?:${name}|${encName})|${full}|${enc})\\)`);
		for (let i = 0; i < 25; i++) {
			const cur = editor.getCursor();
			const from = Math.max(0, cur.line - 3), to = Math.min(editor.lineCount() - 1, cur.line + 3);
			for (let ln = to; ln >= from; ln--) {
				const text = editor.getLine(ln);
				let m = wiki.exec(text);
				if (m) return this.swap(editor, ln, m.index, m[0], `![[${m[1]}|${shown}]]`);
				m = md.exec(text);
				if (m) return this.swap(editor, ln, m.index, m[0], `![${m[1] ? m[1] + "|" : "|"}${shown}](${m[2]})`);
			}
			await new Promise((r) => setTimeout(r, 200));
		}
	}

	swap(editor, line, ch, before, after) {
		editor.replaceRange(after, { line, ch }, { line, ch: ch + before.length });
		const cur = editor.getCursor();
		if (cur.line === line && cur.ch >= ch + before.length) editor.setCursor({ line, ch: cur.ch + after.length - before.length });
		this.armed = null;
	}

	naturalWidth(file) {
		return new Promise((resolve) => {
			const img = new Image();
			const t = setTimeout(() => resolve(0), 5000);
			img.onload = () => { clearTimeout(t); resolve(img.naturalWidth || 0); };
			img.onerror = () => { clearTimeout(t); resolve(0); };
			img.src = this.app.vault.getResourcePath(file);
		});
	}
};

class ScaleSettingTab extends PluginSettingTab {
	constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
	display() {
		const { containerEl } = this;
		const s = this.plugin.settings;
		const save = () => this.plugin.saveData(s);
		containerEl.empty();
		new Setting(containerEl).setName("显示比例").setDesc("按原图宽度的百分之几显示。50 = Retina 截图回到截图时屏幕上的大小。")
			.addSlider((sl) => sl.setLimits(10, 100, 5).setValue(s.percent).setDynamicTooltip().onChange((v) => { s.percent = v; save(); }));
		new Setting(containerEl).setName("粘贴的图片").addToggle((t) => t.setValue(s.onPaste).onChange((v) => { s.onPaste = v; save(); }));
		new Setting(containerEl).setName("拖进来的图片").addToggle((t) => t.setValue(s.onDrop).onChange((v) => { s.onDrop = v; save(); }));
		new Setting(containerEl).setName("缩完小于多少像素就不缩").setDesc("小图标、小截图保持原样。0 = 都缩。")
			.addText((t) => t.setValue(String(s.minWidth || 0)).onChange((v) => { s.minWidth = Math.max(0, parseInt(v, 10) || 0); save(); }));
	}
}
