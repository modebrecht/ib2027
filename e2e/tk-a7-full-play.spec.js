const fs = require('fs');
const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'https://ib2026.vercel.app').replace(/\/$/, '');
const TEST_STUDENT = 'A7 Full Play';

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openCleanA7(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((student) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('studentVorname', student);
    localStorage.setItem('student_vorname', student);
    localStorage.setItem('tk_student_name_v1', student);
  }, TEST_STUDENT);
  await page.goto(`${BASE_URL}/tk2/A7.html`, { waitUntil: 'domcontentloaded' });
}

async function assertPdfDownload(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.locator(selector).click(),
  ]);
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/\.pdf$/i);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.readFileSync(downloadPath);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
}

test.use({
  acceptDownloads: true,
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
});

test.setTimeout(240_000);

test('A7 full student journey: 10 challenge + 10 hunt + complete memory + reload + PDF', async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanA7(page);

  await expect(page).toHaveTitle(/A7: Tastenkombinationen/);
  expect(await page.evaluate(() => localStorage.getItem('tk_a7_training_v1'))).toBeNull();

  // 1) Challenge: complete all ten main questions through the real UI.
  await page.locator('[data-view="train"]').first().click();
  for (let round = 1; round <= 10; round += 1) {
    await expect(page.locator('#practiceLabel')).toContainText(`${round} / 10`);
    const correct = page.locator('.quiz-option[data-correct="1"]');
    await expect(correct).toHaveCount(1);
    await correct.click();
    if (round < 10) {
      await expect(page.locator('#practiceLabel')).toContainText(`${round + 1} / 10`, { timeout: 6_000 });
    }
  }
  await expect(page.locator('#practiceLabel')).toHaveText('Challenge abgeschlossen', { timeout: 6_000 });
  await expect(page.locator('#practicePrompt')).toContainText('10 / 10');

  let training = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_a7_training_v1') || '{}'));
  expect(training.modes.challenge.all.completedRuns).toBe(1);
  expect(training.modes.challenge.all.correct).toBe(10);
  expect(training.modes.challenge.all.wrong).toBe(0);

  // 2) Fehlerjagd: solve all ten rounds. Wrong probes are allowed and exercise the feedback path.
  await page.locator('[data-view="hunt"]').first().click();
  for (let round = 1; round <= 10; round += 1) {
    await expect(page.locator('#huntPromptLabel')).toContainText(`${round} / 10`);
    const options = page.locator('.hunt-option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);

    let caught = false;
    for (let i = 0; i < count; i += 1) {
      const option = options.nth(i);
      if (await option.isDisabled()) continue;
      await option.click();
      const classes = await option.getAttribute('class');
      if ((classes || '').split(/\s+/).includes('caught')) {
        caught = true;
        break;
      }
    }
    expect(caught, `Fehler in Runde ${round} konnte nicht gefunden werden`).toBe(true);
    await expect(page.locator('#huntNext')).toBeVisible();
    await page.locator('#huntNext').click();
    if (round < 10) {
      await expect(page.locator('#huntPromptLabel')).toContainText(`${round + 1} / 10`);
    }
  }
  await expect(page.locator('#huntPromptLabel')).toHaveText('Fehlerjagd abgeschlossen');
  await expect(page.locator('#huntFeedback')).toContainText('10 von 10 Fehlern gefunden');

  training = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_a7_training_v1') || '{}'));
  expect(training.modes.hunt.all.completedRuns).toBe(1);
  expect(training.modes.hunt.all.correct).toBe(10);

  // 3) Memory: complete every pair by flipping the real cards. We only read pair ids to choose matching cards;
  // no completion/progress state is injected.
  await page.locator('[data-view="memory"]').first().click();
  await page.locator('[data-memory-diff="easy"]').click();
  const memoryCards = page.locator('#memoryBoard .mem-card');
  await expect(memoryCards.first()).toBeVisible();

  const pairs = await page.evaluate(() => {
    const byPair = new Map();
    memory.cards.forEach((card, index) => {
      const list = byPair.get(card.pairId) || [];
      list.push(index);
      byPair.set(card.pairId, list);
    });
    return Array.from(byPair.values());
  });
  expect(pairs.length).toBe(4);
  expect(pairs.every((pair) => pair.length === 2)).toBe(true);

  for (const [a, b] of pairs) {
    await memoryCards.nth(a).click();
    await memoryCards.nth(b).click();
    await expect(memoryCards.nth(a)).toHaveClass(/matched/);
    await expect(memoryCards.nth(b)).toHaveClass(/matched/);
  }

  await expect(page.locator('#memoryModal')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#memorySummary')).toContainText('Treffer: 4');

  // The current product modal only offers "Nochmal". It closes the modal by starting a fresh board;
  // the completed training record must remain intact so the learner can then open the evidence view.
  await page.locator('#memoryAgain').click();
  await expect(page.locator('#memoryModal')).toBeHidden();

  training = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_a7_training_v1') || '{}'));
  expect(training.modes.memory.all.completedRuns).toBe(1);
  expect(training.modes.memory.all.pairs).toBe(4);

  // 4) Real completion must now be unlocked without seeding any A7 progress.
  await page.locator('[data-view="evidence"]').first().click();
  await expect(page.locator('#evidenceStatus')).toHaveText('PDF bereit ✓');
  await expect(page.locator('#downloadEvidencePdf')).toBeEnabled();

  let progress = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_a7_progress_v1') || '{}'));
  expect(progress.schemaVersion).toBe(2);
  expect(progress.completed).toBe(true);
  expect(progress.completedStations).toBe(3);
  expect(progress.stations).toEqual({ challenge: 1, hunt: 1, memory: 1 });
  expect(progress.completedRuns).toBe(3);
  expect(progress.pdfReady).toBe(true);

  await assertPdfDownload(page, '#downloadEvidencePdf');

  // 5) Reload contract and index Done state.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-view="evidence"]').first().click();
  await expect(page.locator('#evidenceStatus')).toHaveText('PDF bereit ✓');
  await expect(page.locator('#downloadEvidencePdf')).toBeEnabled();

  progress = await page.evaluate(() => JSON.parse(localStorage.getItem('tk_a7_progress_v1') || '{}'));
  expect(progress.completed).toBe(true);
  expect(progress.completedStations).toBe(3);

  await page.goto(`${BASE_URL}/tk2/index.html`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#module-a7')).toHaveClass(/done/);
  await expect(page.locator('#module-a7 .module-state')).toHaveText('Done');

  expect(errors, `Uncaught browser errors: ${errors.join(' | ')}`).toEqual([]);
});
