const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'https://ib2026.vercel.app').replace(/\/$/, '');
const STUDENT = 'E2E Unlimited Retry';

async function openClean(page, path) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((student) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('studentVorname', student);
    localStorage.setItem('student_vorname', student);
    localStorage.setItem('tk_student_name_v1', student);
  }, STUDENT);
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
}

async function readJson(page, key) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '{}'), key);
}

async function answerSelectRound(page, selector, checkSelector, wrongCount) {
  const selects = page.locator(selector);
  const count = await selects.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    const select = selects.nth(i);
    const correct = await select.getAttribute('data-correct');
    const options = await select.locator('option').evaluateAll((nodes) => nodes.map((o) => o.value).filter(Boolean));
    const value = i < wrongCount ? options.find((v) => v !== correct) : correct;
    expect(value).toBeTruthy();
    await select.selectOption(value);
  }

  await page.locator(checkSelector).click();
  return Math.round(((count - wrongCount) / count) * 100);
}

async function answerButtonRound(page, wrongCount) {
  const cards = page.locator('#questionsContainer .question-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    const correct = await card.getAttribute('data-correct');
    const values = await card.locator('.answer-option').evaluateAll((nodes) => nodes.map((node) => node.dataset.value));
    const value = i < wrongCount ? values.find((v) => v !== correct) : correct;
    expect(value).toBeTruthy();
    await card.locator(`.answer-option[data-value="${value}"]`).click();
  }

  await page.locator('#checkBtn').click();
  return Math.round(((count - wrongCount) / count) * 100);
}

async function completeEasyMemory(page) {
  const cards = page.locator('#memoryBoard .mem-card');
  await expect(cards.first()).toBeVisible();
  const pairs = await page.evaluate(() => {
    const grouped = new Map();
    memory.cards.forEach((card, index) => {
      const indexes = grouped.get(card.pairId) || [];
      indexes.push(index);
      grouped.set(card.pairId, indexes);
    });
    return Array.from(grouped.values());
  });
  expect(pairs.length).toBeGreaterThan(0);
  expect(pairs.every((pair) => pair.length === 2)).toBe(true);

  for (const [a, b] of pairs) {
    await cards.nth(a).click();
    await cards.nth(b).click();
    await expect(cards.nth(a)).toHaveClass(/matched/);
    await expect(cards.nth(b)).toHaveClass(/matched/);
  }
  await expect(page.locator('#memoryModal')).toBeVisible({ timeout: 5_000 });
}

test.use({
  acceptDownloads: true,
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
});

test.setTimeout(240_000);

test.describe('TK2 unlimited quest retries', () => {
  test('Q1-Q6 expose retry controls and accept more than two scored attempts', async ({ page }) => {
    await openClean(page, '/tk2/A1.html');
    await page.waitForFunction(() => typeof window.saveQuestScore === 'function');

    for (let q = 1; q <= 3; q += 1) {
      await expect(page.locator(`[onclick="resetQ${q}()"]`).first()).toBeAttached();
      expect(await page.evaluate((name) => typeof window[name], `resetQ${q}`)).toBe('function');
    }

    await page.evaluate(() => {
      for (let q = 1; q <= 3; q += 1) {
        [50, 70, 100, 80, 60].forEach((score) => saveQuestScore(`q${q}`, score));
      }
    });

    let attempts = await readJson(page, 'tk_quest_attempts_v1');
    let scores = await readJson(page, 'tk_quest_scores_v1');
    for (let q = 1; q <= 3; q += 1) {
      expect(attempts[`q${q}`].attempts).toBe(5);
      expect(attempts[`q${q}`].first).toBe(50);
      expect(attempts[`q${q}`].second).toBe(70);
      expect(attempts[`q${q}`].best).toBe(100);
      expect(scores[`q${q}`]).toBe(100);
    }

    await page.goto(`${BASE_URL}/tk2/A2.html`, { waitUntil: 'domcontentloaded' });
    for (let q = 4; q <= 6; q += 1) {
      await expect(page.locator(`[onclick="resetQ${q}()"]`).first()).toBeAttached();
      expect(await page.evaluate((name) => typeof window[name], `resetQ${q}`)).toBe('function');
    }

    await page.evaluate(() => {
      for (let q = 4; q <= 6; q += 1) {
        [55, 75, 100, 85, 65].forEach((score) => saveQuestScore(`q${q}`, score));
      }
    });

    attempts = await readJson(page, 'tk_quest_attempts_v1');
    scores = await readJson(page, 'tk_quest_scores_v1');
    for (let q = 4; q <= 6; q += 1) {
      expect(attempts[`q${q}`].attempts).toBe(5);
      expect(attempts[`q${q}`].first).toBe(55);
      expect(attempts[`q${q}`].second).toBe(75);
      expect(attempts[`q${q}`].best).toBe(100);
      expect(scores[`q${q}`]).toBe(100);
    }
  });

  test('Q7 can be completed, reopened/edited and completed again', async ({ page }) => {
    await openClean(page, '/tk2/A3.html');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#theory-download').click();
    await downloadPromise;

    const shortcuts = ['Ctrl + C', 'Ctrl + Z', 'Win + L'];
    const reasons = ['schneller kopieren können', 'Fehler rückgängig machen', 'Computer schnell sperren'];
    for (let i = 0; i < 3; i += 1) {
      await page.locator('.shortcut-choice').nth(i).fill(shortcuts[i]);
      await page.locator('.shortcut-reason').nth(i).fill(reasons[i]);
    }
    await page.locator('#onedrive-confirm').check();
    await expect(page.locator('#completion-card')).toBeVisible();
    expect((await readJson(page, 'tk_quest_scores_v1')).q7).toBe(100);

    await expect(page.locator('.shortcut-choice').first()).toBeEnabled();
    await page.locator('.shortcut-choice').first().fill('Ctrl + X');
    await page.locator('#onedrive-confirm').uncheck();
    await expect(page.locator('#completion-card')).toBeHidden();
    expect((await readJson(page, 'tk_quest_scores_v1')).q7).toBeUndefined();

    await page.locator('#onedrive-confirm').check();
    await expect(page.locator('#completion-card')).toBeVisible();
    const progress = await readJson(page, 'tk_a3_progress_v1');
    expect(progress.completed).toBe(true);
    expect(progress.choices[0].shortcut).toBe('Ctrl + X');
    expect((await readJson(page, 'tk_quest_scores_v1')).q7).toBe(100);
  });

  for (const cfg of [
    { q: 8, path: '/tk2/A4.html', selector: '#q8Questions .answer-select', check: '#q8CheckBtn', card: '#a4SecondPassCard', button: '#startSecondPassBtn', key: 'tk_a4_progress_v1' },
    { q: 9, path: '/tk2/A5.html', selector: '#q9Questions .answer-select', check: '#q9CheckBtn', card: '#a5SecondPassCard', button: '#startSecondPassBtn', key: 'tk_a5_progress_v1' },
  ]) {
    test(`Q${cfg.q} supports four real UI attempts and keeps only the best score`, async ({ page }) => {
      await openClean(page, cfg.path);
      const wrongCounts = [2, 0, 4, 1];
      const results = [];

      results.push(await answerSelectRound(page, cfg.selector, cfg.check, wrongCounts[0]));
      for (let round = 2; round <= 4; round += 1) {
        await expect(page.locator(cfg.card)).toBeVisible();
        await page.locator(cfg.button).click();
        results.push(await answerSelectRound(page, cfg.selector, cfg.check, wrongCounts[round - 1]));
      }

      const saved = (await readJson(page, cfg.key)).A;
      expect(saved.attempts).toBe(4);
      expect(saved.first).toBe(results[0]);
      expect(saved.second).toBe(results[1]);
      expect(saved.last).toBe(results[3]);
      expect(saved.best).toBe(100);
      expect((await readJson(page, 'tk_quest_scores_v1'))[`q${cfg.q}`]).toBe(100);
      await expect(page.locator(cfg.card)).toBeVisible();
      await expect(page.locator(cfg.button)).toContainText('5. Durchgang');
    });
  }

  test('Q10-Q13 each support three real UI attempts without regressing best score', async ({ page }) => {
    await openClean(page, '/tk2/A6.html');
    const keys = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < keys.length; i += 1) {
      if (i > 0) await page.locator('.set-tab').nth(i).click();
      const first = await answerButtonRound(page, 2);
      await expect(page.locator('#checkBtn')).toContainText('Neuer Versuch');

      await page.locator('#checkBtn').click();
      const second = await answerButtonRound(page, 0);
      expect(second).toBe(100);

      await page.locator('#checkBtn').click();
      const third = await answerButtonRound(page, 3);

      const saved = (await readJson(page, 'tk_a6_progress_v1'))[keys[i]];
      expect(saved.first).toBe(first);
      expect(saved.last).toBe(third);
      expect(saved.best).toBe(100);
      expect((await readJson(page, 'tk_quest_scores_v1'))[`q${10 + i}`]).toBe(100);
      await expect(page.locator('#checkBtn')).toContainText('Neuer Versuch');
    }
  });

  test('Q14 training remains repeatable after completion: Memory can run twice', async ({ page }) => {
    await openClean(page, '/tk2/A7.html');
    await page.locator('[data-view="memory"]').first().click();
    await page.locator('[data-memory-diff="easy"]').click();

    await completeEasyMemory(page);
    let training = await readJson(page, 'tk_a7_training_v1');
    expect(training.modes.memory.all.completedRuns).toBe(1);

    await page.locator('#memoryAgain').click();
    await expect(page.locator('#memoryModal')).toBeHidden();
    await completeEasyMemory(page);

    training = await readJson(page, 'tk_a7_training_v1');
    expect(training.modes.memory.all.completedRuns).toBe(2);
    await expect(page.locator('#memoryAgain')).toBeVisible();
  });
});
