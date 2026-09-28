---
name: scope
description: Kisi ek agent par kaam lock karta hai ya lock hatata hai. Use this WHENEVER the user names an agent or module they are about to work on, in Hinglish or English. Examples - "trinetra pe kaam karna hai", "I need to work on the google ads agent", "meta agent mein changes karne hai", "youtube agent theek karna hai", "merchant center agent pe kaam hai", "scope kya hai", "scope hata do", "unlock everything". Also use this whenever an edit is BLOCKED because no scope lock is set.
---

## Rule

User jab kisi agent ka naam le, SABSE PEHLE lock lagao. Kaam baad mein.
Agar koi edit "BLOCKED: koi scope lock nahi laga hai" de, to ruk jao aur
user se poochho kis agent par kaam karna hai. Khud mat chuno.

## Lock lagana

bash ~/.claude/hooks/scope-set.sh <repo-path> <agent-naam>

  trinetra, tri netra, trintera   -> trinetra
  google ads, gads, google agent  -> google-ads
  meta, meta ads, facebook ads    -> meta-ads
  merchant, merchant center, gmc  -> merchant
  youtube, yt                     -> youtube
  reports, reporting              -> reports

"LOCK LAGA" aaye to Hinglish mein confirm karo.

## Naya agent (UNKNOWN_AGENT aaye)

Script khud folders dhoondh ke dikhata hai. Tab list user ko dikhao,
confirm karao, phir <repo>/.claude/agents/<naam>.txt banao (ek line ek path),
phir dobara scope-set.sh chalao. Bina confirm kiye file mat banao.

## Baaki

bash ~/.claude/hooks/scope-set.sh <repo> --status
bash ~/.claude/hooks/scope-set.sh <repo> --list
bash ~/.claude/hooks/scope-set.sh <repo> --off

--off SIRF tab jab user khud saaf saaf bole "scope hata do" / "lock kholo" /
"unlock everything". Apne aap kabhi mat chalao, chahe kuch bhi block ho jaye.

## Sakht

Lock ke bahar edit MAT karo. Zaroori lage to ruko aur user se poochho.

## Commit guard (2026-08-30)

`~/.claude/hooks/scope-commit-guard.sh` (Bash PreToolUse) blocks `git add/commit/push`
jab repo mein koi bhi changed/untracked file scope ke bahar ho. Bash/python se likhi
files bhi pakdi jaati hain. BLOCKED aaye to: bahar wali file revert karo, ya user se
poochh ke `.claude/agents/<agent>.txt` mein path add karo. Kabhi bypass mat karo.

Shared file chahiye (direct-client, features.ts, sidebar, package.json...)? Pehle user
se poochho, exact file list ke saath. Haan ke baad hi agent file mein add karo, aur
kaam ke baad temporary additions hata do.
