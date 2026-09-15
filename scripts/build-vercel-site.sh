#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/dist"
A8_TMP="/tmp/shortcut-quest-a8"
SHORTCUT_QUEST_SHA="59809da992334942a4ff05c2ed02751576de15bd"

rm -rf "$OUT" "$A8_TMP"
mkdir -p "$OUT"

# Copy the student-facing static site into a clean Vercel output directory.
# CI sources, build sources and local caches do not belong in production.
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

# Build TK2 A8 from the exact pinned Shortcut Quest revision used by Pages QA.
git init -q "$A8_TMP"
git -C "$A8_TMP" remote add origin https://github.com/modebrecht/shortcut-quest.git
git -C "$A8_TMP" fetch -q --depth=1 origin "$SHORTCUT_QUEST_SHA"
git -C "$A8_TMP" checkout -q --detach FETCH_HEAD

mkdir -p "$OUT/tk2/A8"
for file in \
  index.html \
  sections-data.js \
  skill-hotkeys.js \
  modern-ui.css \
  modern-exercises.css \
  modern-game.css \
  modern-battle.css \
  modern-report.css \
  apexcharts.min.js \
  favicon.svg \
  premium-motion.js \
  battle-motion.js \
  arena-dev-fix.js
do
  cp "$A8_TMP/2026/$file" "$OUT/tk2/A8/$file"
done
cp -R "$A8_TMP/2026/assets" "$OUT/tk2/A8/"

# Add the IB2026 diagnostic PDF overlay and use the classroom filename A8-VORNAME.pdf.
cp "$ROOT/tk2/a8-pdf-report.js" "$OUT/tk2/A8/pdf-report.js"

node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const a8 = path.join(root, 'dist', 'tk2', 'A8');
const pdfPath = path.join(a8, 'pdf-report.js');
let pdf = fs.readFileSync(pdfPath, 'utf8');
const oldName = "doc.save('A8_Shortcut_Quest_Lernnachweis_' + safeFileName(student) + '.pdf');";
const newName = "doc.save('A8-' + safeFileName(student) + '.pdf');";
if (pdf.includes(oldName)) {
  pdf = pdf.replace(oldName, newName);
} else if (!pdf.includes(newName)) {
  throw new Error('A8 PDF filename marker not found');
}
fs.writeFileSync(pdfPath, pdf);

const indexPath = path.join(a8, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('</body>')) throw new Error('A8 index.html has no </body> marker');
const scripts = [
  '<script src="premium-motion.js"></script>',
  '<script src="battle-motion.js"></script>',
  '<script src="arena-dev-fix.js?v=59809da9"></script>',
  '<script src="pdf-report.js"></script>'
];
const missing = scripts.filter(script => !html.includes(script));
if (missing.length) {
  html = html.replace('</body>', `${missing.join('\n')}\n</body>`);
  fs.writeFileSync(indexPath, html);
}
NODE

# Fail the production build before deploy if the assembled A8 runtime is incomplete.
node --check "$OUT/tk2/A8/premium-motion.js"
node --check "$OUT/tk2/A8/battle-motion.js"
node --check "$OUT/tk2/A8/arena-dev-fix.js"
node --check "$OUT/tk2/A8/pdf-report.js"
test -s "$OUT/tk2/A8/index.html"
test -s "$OUT/tk2/A8/assets/arena-scene.svg"
grep -Fq "doc.save('A8-' + safeFileName(student) + '.pdf');" "$OUT/tk2/A8/pdf-report.js"
grep -Fq '<script src="premium-motion.js"></script>' "$OUT/tk2/A8/index.html"
grep -Fq '<script src="battle-motion.js"></script>' "$OUT/tk2/A8/index.html"
grep -Fq '<script src="arena-dev-fix.js?v=59809da9"></script>' "$OUT/tk2/A8/index.html"
grep -Fq '<script src="pdf-report.js"></script>' "$OUT/tk2/A8/index.html"

echo "Vercel static bundle ready: $(find "$OUT/tk2/A8" -type f | wc -l | tr -d ' ') A8 files"
