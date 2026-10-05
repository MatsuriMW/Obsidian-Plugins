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

# README：开头的介绍取 README.intro.md，插件清单按 order.txt 分组排序
g() { plutil -extract "$2" raw -o - "$DST/$1/manifest.json" 2>/dev/null | tr '\n' ' ' | sed -e 's/|/\\|/g' -e 's/ *$//'; }
titles=() ; typeset -A members
for line in "${(@f)$(grep -v -e '^#[^#]' -e '^$' "$DST/order.txt")}"; do
  if [[ $line == '## '* ]]; then titles+=("${line#\#\# }"); continue; fi
  (( ${mine[(Ie)$line]} )) && members[${#titles}]+="$line "
done
listed=" ${(j: :)${(v)members}} "
for n in $mine; do
  [[ $listed == *" $n "* ]] && continue
  if [[ $(g $n author) == *改自* ]]; then members[2]+="$n "; else members[1]+="$n "; fi
done
{
  cat "$DST/README.intro.md"
  echo
  echo "## 全部插件"
  for i in {1..${#titles}}; do
    [[ -z ${members[$i]} ]] && continue
    echo
    echo "### ${titles[$i]}"
    echo
    echo "| 插件 | 版本 | 说明 |"
    echo "|---|---|---|"
    for n in ${=members[$i]}; do
      echo "| **$(g $n name)** ([\`$n\`]($n)) | $(g $n version) | $(g $n description) |"
    done
  done
  echo
  echo "## 安装"
  echo
  echo "把对应目录复制到库的 \`.obsidian/plugins/\` 下，完全退出并重新打开 Obsidian，再到「第三方插件」里启用。"
} > "$DST/README.md"

cd "$DST"
git add -A
if git diff --cached --quiet; then echo "没有变化"; exit 0; fi
git commit -q -m "${1:-同步插件}"
git remote get-url origin >/dev/null 2>&1 && git push -q
git log --oneline -1
