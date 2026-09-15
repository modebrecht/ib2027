const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'https://ib2026.vercel.app').replace(/\/$/, '');

async function openClean(page, path) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('studentVorname', 'E2E TK Persist');
    localStorage.setItem('student_vorname', 'E2E TK Persist');
    localStorage.setItem('tk_student_name_v1', 'E2E TK Persist');
  });
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
}

async function readJson(page, key) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '{}'), key);
}

async function writeJson(page, key, value) {
  await page.evaluate(({ storageKey, value }) => localStorage.setItem(storageKey, JSON.stringify(value)), { storageKey: key, value });
}

test.use({ screenshot: 'only-on-failure', trace: 'retain-on-failure' });
test.setTimeout(45_000);

test.describe('TK2 persistence contract A1-A7', () => {
  test('A3 choices, reasons and completion survive reload', async ({ page }) => {
    await openClean(page, '/tk2/A3.html');
    const progress = {
      schemaVersion: 2,
      downloaded: true,
      onedriveStored: true,
      choices: [
        { shortcut: 'Ctrl + C', reason: 'Kopieren geht schneller' },
        { shortcut: 'Ctrl + Z', reason: 'Fehler schnell rückgängig' },
        { shortcut: 'Win + L', reason: 'Computer schnell sperren' },
      ],
      completed: true,
      rewarded: true,
    };
    await writeJson(page, 'tk_a3_progress_v1', progress);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('#completion-card')).toBeVisible();
    await expect(page.locator('#onedrive-confirm')).toBeChecked();
    for (let i = 0; i < progress.choices.length; i += 1) {
      await expect(page.locator('.shortcut-choice').nth(i)).toHaveValue(progress.choices[i].shortcut);
      await expect(page.locator('.shortcut-reason').nth(i)).toHaveValue(progress.choices[i].reason);
    }
    expect(await readJson(page, 'tk_a3_progress_v1')).toEqual(progress);
  });

  for (const [code, storageKey, question, first, second, best] of [
    ['A4', 'tk_a4_progress_v1', 'q8', 63, 88, 88],
    ['A5', 'tk_a5_progress_v1', 'q9', 70, 90, 90],
  ]) {
    test(`${code}: first / second / best progress survives reload`, async ({ page }) => {
      await openClean(page, `/tk2/${code}.html`);
      const progress = {
        A: {
          attempts: 2,
          first,
          second,
          last: second,
          best,
          answers: [],
          lastCorrect: 0,
        },
      };
      await writeJson(page, storageKey, progress);
      await writeJson(page, 'tk_quest_scores_v1', { [question]: best });
      await page.reload({ waitUntil: 'domcontentloaded' });

      expect(await readJson(page, storageKey)).toEqual(progress);
      expect((await readJson(page, 'tk_quest_scores_v1'))[question]).toBe(best);
      await expect(page.locator(code === 'A4' ? '#q8CheckBtn' : '#q9CheckBtn')).toContainText('2/2');
      await expect(page.locator(code === 'A4' ? '#a4DoneCard' : '#a5DoneCard')).toBeVisible();
    });
  }

  test('A6 all four set results and first/best values survive reload', async ({ page }) => {
    await openClean(page, '/tk2/A6.html');
    const progress = {
      A: { first: 71, last: 93, best: 93, answers: [], lastCorrect: 13 },
      B: { first: 60, last: 90, best: 90, answers: [], lastCorrect: 9 },
      C: { first: 75, last: 95, best: 95, answers: [], lastCorrect: 19 },
      D: { first: 63, last: 100, best: 100, answers: [], lastCorrect: 8 },
    };
    await writeJson(page, 'tk_a6_progress_v1', progress);
    await writeJson(page, 'tk_quest_scores_v1', { q10: 93, q11: 90, q12: 95, q13: 100 });
    await page.reload({ waitUntil: 'domcontentloaded' });

    expect(await readJson(page, 'tk_a6_progress_v1')).toEqual(progress);
    await expect(page.locator('#finishCard')).toBeVisible();
    await expect(page.locator('#downloadPdfBtn')).toBeEnabled();

    for (let i = 0; i < 4; i += 1) {
      if (i > 0) await page.locator('.set-tab').nth(i).click();
      await expect(page.locator('#scoreBox')).toContainText('Letzter Versuch');
    }
  });

  test('A7 training statistics and completed evidence survive reload', async ({ page }) => {
    await openClean(page, '/tk2/A7.html');
    const now = '2026-08-29T12:00:00.000Z';
    const training = {
      schemaVersion: 1,
      modes: {
        challenge: { all: { completedRuns: 3, correct: 26, wrong: 4, lastAccuracy: 80, bestAccuracy: 100, lastAt: now, retries: 2 } },
        hunt: { all: { completedRuns: 2, correct: 18, wrong: 2, lastAccuracy: 90, bestAccuracy: 90, lastAt: now, retries: 1 } },
        memory: { all: { completedRuns: 4, pairs: 12, moves: 14, points: 240, lastEfficiency: 86, bestEfficiency: 100, lastDiff: 'easy', lastElapsed: 1200, lastAt: now } },
      },
    };
    const progress = {
      schemaVersion: 2,
      completed: true,
      completedStations: 3,
      stations: { challenge: 3, hunt: 2, memory: 4 },
      completedRuns: 9,
      accuracy: 90,
      target: 70,
      targetReached: true,
      pdfReady: true,
      updatedAt: now,
    };
    await writeJson(page, 'tk_a7_training_v1', training);
    await writeJson(page, 'tk_a7_progress_v1', progress);
    await page.reload({ waitUntil: 'domcontentloaded' });

    expect(await readJson(page, 'tk_a7_training_v1')).toEqual(training);
    await page.locator('[data-view="evidence"]').first().click();
    await expect(page.locator('#evidenceStatus')).toHaveText('PDF bereit ✓');
    await expect(page.locator('#downloadEvidencePdf')).toBeEnabled();
    const restoredProgress = await readJson(page, 'tk_a7_progress_v1');
    expect(restoredProgress.completed).toBe(true);
    expect(restoredProgress.completedStations).toBe(3);
    expect(restoredProgress.pdfReady).toBe(true);
  });

  test('index derives A1-A7 Done state while A8 remains open after reload', async ({ page }) => {
    await openClean(page, '/tk2/index.html');
    const now = '2026-08-29T12:00:00.000Z';
    await writeJson(page, 'tk_quest_scores_v1', {
      q1: 100, q2: 100, q3: 80,
      q4: 100, q5: 100, q6: 90,
      q7: 100, q8: 88, q9: 90,
      q10: 93, q11: 90, q12: 95, q13: 100,
    });
    await writeJson(page, 'tk_a3_progress_v1', {
      schemaVersion: 2,
      downloaded: true,
      onedriveStored: true,
      choices: [
        { shortcut: 'Ctrl + C', reason: 'Kopieren geht schneller' },
        { shortcut: 'Ctrl + Z', reason: 'Fehler schnell rückgängig' },
        { shortcut: 'Win + L', reason: 'Computer schnell sperren' },
      ],
      completed: true,
      rewarded: true,
    });
    await writeJson(page, 'tk_a4_progress_v1', { A: { attempts: 2, first: 63, second: 88, last: 88, best: 88 } });
    await writeJson(page, 'tk_a5_progress_v1', { A: { attempts: 2, first: 70, second: 90, last: 90, best: 90 } });
    await writeJson(page, 'tk_a6_progress_v1', {
      A: { first: 71, best: 93 }, B: { first: 60, best: 90 }, C: { first: 75, best: 95 }, D: { first: 63, best: 100 },
    });
    await writeJson(page, 'tk_a7_progress_v1', {
      schemaVersion: 2, completed: true, completedStations: 3, stations: { challenge: 1, hunt: 1, memory: 1 }, completedRuns: 3,
      accuracy: 90, target: 70, targetReached: true, pdfReady: true, updatedAt: now,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    for (let i = 1; i <= 7; i += 1) {
      await expect(page.locator(`#module-a${i}`)).toHaveClass(/done/);
      await expect(page.locator(`#module-a${i} .module-state`)).toHaveText('Done');
    }
    await expect(page.locator('#module-a8')).not.toHaveClass(/done/);
    await expect(page.locator('#module-a8 .module-state')).toHaveText('offen');
    await expect(page.locator('#progressText')).toHaveText('7 / 8');
    await expect(page.locator('#courseDone')).toBeHidden();
    await expect(page.locator('#resumeBtn')).toHaveAttribute('href', 'A8/');
  });
});
