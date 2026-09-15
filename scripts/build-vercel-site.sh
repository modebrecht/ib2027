#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/dist"
A8_TMP="/tmp/shortcut-quest-a8"
SHORTCUT_QUEST_SHA="6a655e2ba732dca9c84b08a74341d6adcda9b63b"

rm -rf "$OUT" "$A8_TMP"
mkdir -p "$OUT"

# Copy the student-facing static site into a clean Vercel output directory.
tar \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./.vercel' \
  --exclude='./.vercelignore' \
  --exclude='./.gitignore' \
  --exclude='./dist' \
  --exclude='./_site' \
  --exclude='./e2e' \
  --exclude='./node_modules' \
  --exclude='./playwright-report' \
  --exclude='./test-results' \
  --exclude='./scripts' \
  --exclude='./vercel.json' \
  -cf - . | tar -xf - -C "$OUT"

# Build TK2 A8 from the exact verified Shortcut Quest revision.
git init -q "$A8_TMP"
git -C "$A8_TMP" remote add origin https://github.com/modebrecht/shortcut-quest.git
git -C "$A8_TMP" fetch -q --depth=1 origin "$SHORTCUT_QUEST_SHA"
git -C "$A8_TMP" checkout -q --detach FETCH_HEAD

mkdir -p "$OUT/tk2/A8"
for file in \
  index.html sections-data.js skill-hotkeys.js \
  modern-ui.css modern-exercises.css modern-game.css modern-battle.css modern-report.css \
  apexcharts.min.js favicon.svg premium-motion.js battle-motion.js knight-premium-motion.js \
  arena-dev-fix.js arena-dev-tuning.css a8-dev-polish.js battle-continuity.js battle-balance.js
do
  cp "$A8_TMP/2026/$file" "$OUT/tk2/A8/$file"
done
cp -R "$A8_TMP/2026/assets" "$OUT/tk2/A8/"

# Add the IB2026 diagnostic PDF overlay and classroom filename A8-VORNAME.pdf.
cp "$ROOT/tk2/a8-pdf-report.js" "$OUT/tk2/A8/pdf-report.js"

node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const a8 = path.join(process.cwd(), 'dist', 'tk2', 'A8');
const pdfPath = path.join(a8, 'pdf-report.js');
let pdf = fs.readFileSync(pdfPath, 'utf8');
const oldName = "doc.save('A8_Shortcut_Quest_Lernnachweis_' + safeFileName(student) + '.pdf');";
const newName = "doc.save('A8-' + safeFileName(student) + '.pdf');";
if (pdf.includes(oldName)) pdf = pdf.replace(oldName, newName);
else if (!pdf.includes(newName)) throw new Error('A8 PDF filename marker not found');
fs.writeFileSync(pdfPath, pdf);

const indexPath = path.join(a8, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('A8 index.html is missing head/body markers');

const arenaStyle = '<link rel="stylesheet" href="arena-dev-tuning.css?v=6193079d">';
if (!html.includes(arenaStyle)) html = html.replace('</head>', `${arenaStyle}\n</head>`);

const scripts = [
  '<script src="premium-motion.js"></script>',
  '<script src="battle-motion.js?v=5f9aa1a7"></script>',
  '<script src="arena-dev-fix.js?v=59809da9"></script>',
  '<script src="a8-dev-polish.js?v=8af72c1b"></script>',
  '<script src="battle-continuity.js?v=6a655e2b"></script>',
  '<script src="battle-balance.js?v=6a655e2b"></script>',
  '<script src="knight-premium-motion.js?v=74934b8f"></script>',
  '<script src="pdf-report.js"></script>'
];
const missing = scripts.filter(script => !html.includes(script));
if (missing.length) html = html.replace('</body>', `${missing.join('\n')}\n</body>`);
fs.writeFileSync(indexPath, html);
NODE

# Fail before deploy if the assembled runtime is incomplete.
for file in premium-motion.js battle-motion.js knight-premium-motion.js arena-dev-fix.js a8-dev-polish.js battle-continuity.js battle-balance.js pdf-report.js; do
  node --check "$OUT/tk2/A8/$file"
done

test -s "$OUT/tk2/A8/index.html"
test -s "$OUT/tk2/A8/assets/arena-scene.svg"
grep -Fq "doc.save('A8-' + safeFileName(student) + '.pdf');" "$OUT/tk2/A8/pdf-report.js"
grep -Fq '<script src="battle-continuity.js?v=6a655e2b"></script>' "$OUT/tk2/A8/index.html"
grep -Fq '<script src="battle-balance.js?v=6a655e2b"></script>' "$OUT/tk2/A8/index.html"
grep -Fq 'SHORTCUT_QUEST_BATTLE_ENGINE_V2' "$OUT/tk2/A8/index.html"
grep -Fq 'SHORTCUT_QUEST_ENEMY_ITEMS' "$OUT/tk2/A8/index.html"
grep -Fq 'A8 PREMIUM HD BATTLE MOTION 2026' "$OUT/tk2/A8/battle-motion.js"
grep -Fq 'A8 PREMIUM KNIGHT MOTION 2026' "$OUT/tk2/A8/knight-premium-motion.js"
grep -Fq 'BATTLE UI SKILL BAR PREMIUM PASS 2026' "$OUT/tk2/A8/modern-battle.css"
grep -Fq 'BATTLE UI SKILL CARD FIT FIX 2026' "$OUT/tk2/A8/modern-battle.css"
grep -Fq 'BATTLE SKILL CONTENT HIERARCHY FIX 2026' "$OUT/tk2/A8/modern-battle.css"

echo "Vercel static bundle ready: $(find "$OUT/tk2/A8" -type f | wc -l | tr -d ' ') A8 files from $SHORTCUT_QUEST_SHA"