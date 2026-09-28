#!/usr/bin/env bash
# New laptop, one command (after installing Claude Code):
#   git clone https://github.com/manak-debug/claude-skills.git && cd claude-skills && bash install.sh
# Puts every skill listed in skills-manifest.txt into ~/.claude/skills/<name> — the same set as the main laptop.
# A skill already there is left alone, so running it twice is safe. Then installs the official plugins.
set -uo pipefail
cd "$(dirname "$0")"
DEST="$HOME/.claude/skills"
mkdir -p "$DEST"
added=0; skipped=0; missing=0
while IFS=$'\t' read -r name dir; do
  [[ -z "${name:-}" || "$name" == \#* ]] && continue
  if [ -e "$DEST/$name" ]; then skipped=$((skipped + 1)); continue; fi
  if [ ! -f "$dir/SKILL.md" ]; then echo "  not in this repo: $name ($dir)"; missing=$((missing + 1)); continue; fi
  cp -R "$dir" "$DEST/$name" && added=$((added + 1))
done < skills-manifest.txt
echo "Skills: $added added, $skipped already there, $missing not found."

PLUGINS="railway supabase shopify-ai-toolkit context7 github code-review frontend-design"
if command -v claude >/dev/null 2>&1; then
  for p in $PLUGINS; do claude plugin install "$p@claude-plugins-official" >/dev/null 2>&1 && echo "Plugin: $p" || echo "Plugin: $p (install by hand: claude plugin install $p@claude-plugins-official)"; done
else
  echo "Claude Code is not installed yet — install it, then run this again for the plugins."
fi
echo "Done. Restart Claude Code to load the skills."
