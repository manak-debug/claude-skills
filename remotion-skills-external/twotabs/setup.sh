#!/usr/bin/env bash
# Sets up claude-skills globally by symlinking ~/.claude/skills → this repo's skills/ directory.
# Run once after cloning. Re-running is safe.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$REPO_DIR/skills"
SKILLS_DEST="$HOME/.claude/skills"

if [ -L "$SKILLS_DEST" ]; then
  echo "Symlink already exists: $SKILLS_DEST → $(readlink "$SKILLS_DEST")"
  echo "Updating to point to: $SKILLS_SRC"
  rm "$SKILLS_DEST"
elif [ -d "$SKILLS_DEST" ]; then
  BACKUP="$SKILLS_DEST.bak.$(date +%Y%m%d%H%M%S)"
  echo "Backing up existing skills directory to $BACKUP"
  mv "$SKILLS_DEST" "$BACKUP"
fi

mkdir -p "$HOME/.claude"
ln -s "$SKILLS_SRC" "$SKILLS_DEST"
echo "Done. ~/.claude/skills → $SKILLS_SRC"
