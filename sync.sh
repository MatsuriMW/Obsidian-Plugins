#!/bin/zsh
# 把「马自立」库里自己做的插件（manifest 作者以「马自立」开头）同步到这个仓库，然后提交推送。
# 只复制代码文件；data.json 等运行数据（含设置、token、使用记录）不进仓库。
# 用法：./sync.sh [提交说明]
set -e
SRC="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/马自立/.obsidian/plugins"
DST="${0:A:h}"
FILES=(main.js manifest.json styles.css)

mine=()
for m in "$SRC"/*/manifest.json; do
  grep -qE '"author": *"马自立' "$m" && mine+=("${${m:h}:t}")
done

# 仓库里有、但库里已经不是自己插件（或删掉了）的目录：移除
for d in "$DST"/*(/N); do
  n=${d:t}
  (( ${mine[(Ie)$n]} )) || rm -rf "$d"
done

for n in $mine; do
  mkdir -p "$DST/$n"
  for f in $FILES; do
    if [[ -f "$SRC/$n/$f" ]]; then cp "$SRC/$n/$f" "$DST/$n/$f"; else rm -f "$DST/$n/$f"; fi
  done
done

# README 的插件清单
{
  echo "# Obsidian Plugins"
  echo
  echo "马自立自用的 Obsidian 插件，装在主库「马自立」的 \`.obsidian/plugins/\` 下。由 \`sync.sh\` 从库里同步，不要直接改这里的文件。"
  echo
  echo "| 插件 | 版本 | 说明 |"
  echo "|---|---|---|"
  for n in $mine; do
    j="$DST/$n/manifest.json"
    g() { plutil -extract "$1" raw -o - "$j" 2>/dev/null | tr '\n' ' ' | sed -e 's/|/\\|/g' -e 's/ *$//'; }
    echo "| **$(g name)** (\`$(g id)\`) | $(g version) | $(g description) |"
  done
  echo
  echo "安装：把对应目录复制到库的 \`.obsidian/plugins/\` 下，完全退出并重新打开 Obsidian，再到「第三方插件」里启用。"
} > "$DST/README.md"

cd "$DST"
git add -A
if git diff --cached --quiet; then echo "没有变化"; exit 0; fi
git commit -q -m "${1:-同步插件}"
git remote get-url origin >/dev/null 2>&1 && git push -q
git log --oneline -1
