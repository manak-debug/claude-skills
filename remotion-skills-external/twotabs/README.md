# claude-skills

Personal Claude Code skill library. Skills are loaded by the Claude Code CLI from `~/.claude/skills/` and made available as slash commands in any project.

## Setup

Clone the repo, then run `setup.sh` once:

```bash
git clone https://github.com/wyn-twotabs/claude-skills.git ~/Documents/GitHub/claude-skills
cd ~/Documents/GitHub/claude-skills
bash setup.sh
```

This symlinks `~/.claude/skills/` → `claude-skills/skills/` so any `git pull` instantly updates all skills globally across every project.

## Skills

| Skill | Description |
|---|---|
| `software-tutorial-studio` | Generate narrated instructional tutorial videos for software platforms using Remotion + macOS TTS |
| `video-creator` | General-purpose Remotion video creation with style guides and TTS providers |
| `ui-flow-studio` | Build animated UI flow diagrams as Remotion videos |
| `meme-factory` | Generate meme videos with Remotion and a Python generator script |
| `remotion-best-practices` | Remotion patterns and best practices reference (animations, audio, captions, charts, fonts, etc.) |
| `tailwindcss` | Tailwind CSS patterns for Remotion projects |

## Usage

Once set up, skills are available as slash commands in Claude Code:

```
/software-tutorial-studio
/video-creator
/meme-factory
```

## Updating skills

```bash
cd ~/Documents/GitHub/claude-skills
git pull
```

Changes are immediately live — no restart needed.

## Adding a new skill

```bash
mkdir skills/my-skill
# Create skills/my-skill/SKILL.md with frontmatter: name, description, metadata
git add skills/my-skill
git commit -m "feat: add my-skill"
git push
```
