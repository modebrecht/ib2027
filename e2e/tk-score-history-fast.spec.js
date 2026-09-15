const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'https://ib2026.vercel.app').replace(/\/$/, '');

async function openClean(page, path) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('studentVorname', 'E2E TK Score');
    localStorage.setItem('student_vorname', 'E2E TK Score');
    localStorage.setItem('tk_student_name_v1', 'E2E TK Score');
  });
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
}

async function answerSelectRound(page, selector, checkSelector, wrongCount) {
  const selects = page.locator(selector);
  const count = await selects.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    const select = selects.nth(i);
    const correct = await select.getAttribute('data-correct');
    expect(correct).toBeTruthy();
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
    expect(correct).toBeTruthy();
    const values = await card.locator('.answer-option').evaluateAll((nodes) => nodes.map((n) => n.dataset.value));
    const value = i < wrongCount ? values.find((v) => v !== correct) : correct;
    expect(value).toBeTruthy();
    await card.locator(`.answer-option[data-value="${value}"]`).click();
  }

  await page.locator('#checkBtn').click();
  return Math.round(((count - wrongCount) / count) * 100);
}

async function readJson(page, key) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '{}'), key);
}

test.use({ screenshot: 'only-on-failure', trace: 'retain-on-failure' });
test.setTimeout(60_000);

test.describe('TK2 score history / retry regression', () => {
  test('Q1-Q6 keep first, second and best across unlimited attempts', async ({ page }) => {
    await openClean(page, '/tk2/A1.html');
    await page.waitForFunction(() => typeof window.saveQuestScore === 'function');

    await page.evaluate(() => {
      for (let i = 1; i <= 6; i += 1) {
        const q = `q${i}`;
        saveQuestScore(q, 60 + i);
        saveQuestScore(q, 80 + i);
        saveQuestScore(q, 70 + i);
      }
    });

    const attempts = await readJson(page, 'tk_quest_attempts_v1');
    const scores = await readJson(page, 'tk_quest_scores_v1');
    for (let i = 1; i <= 6; i += 1) {
      const q = `q${i}`;
      expect(attempts[q].attempts, q).toBe(3);
      expect(attempts[q].first, q).toBe(60 + i);
      expect(attempts[q].second, q).toBe(80 + i);
      expect(attempts[q].best, q).toBe(80 + i);
      expect(scores[q], q).toBe(80 + i);
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await readJson(page, 'tk_quest_attempts_v1')).toEqual(attempts);
    expect(await readJson(page, 'tk_quest_scores_v1')).toEqual(scores);
  });

  test('A4 Q8 supports unlimited retries and keeps first / second / best', async ({ page }) => {
    await openClean(page, '/tk2/A4.html');

    const first = await answerSelectRound(page, '#q8Questions .answer-select', '#q8CheckBtn', 2);
    let saved = await readJson(page, 'tk_a4_progress_v1');
    expect(saved.A.attempts).toBe(1);
    expect(saved.A.first).toBe(first);
    expect(saved.A.second).toBeNull();
    expect(saved.A.best).toBe(first);

    await expect(page.locator('#a4SecondPassCard')).toBeVisible();
    await page.locator('#startSecondPassBtn').click();
    const second = await answerSelectRound(page, '#q8Questions .answer-select', '#q8CheckBtn', 0);

    saved = await readJson(page, 'tk_a4_progress_v1');
    expect(saved.A.attempts).toBe(2);
    expect(saved.A.first).toBe(first);
    expect(saved.A.second).toBe(second);
    expect(saved.A.best).toBe(100);
    expect((await readJson(page, 'tk_quest_scores_v1')).q8).toBe(100);

    await expect(page.locator('#a4SecondPassCard')).toBeVisible();
    await expect(page.locator('#startSecondPassBtn')).toContainText('3. Durchgang');
    await page.locator('#startSecondPassBtn').click();
    const third = await answerSelectRound(page, '#q8Questions .answer-select', '#q8CheckBtn', 4);

    saved = await readJson(page, 'tk_a4_progress_v1');
    expect(saved.A.attempts).toBe(3);
    expect(saved.A.first).toBe(first);
    expect(saved.A.second).toBe(second);
    expect(saved.A.last).toBe(third);
    expect(saved.A.best).toBe(100);
    expect((await readJson(page, 'tk_quest_scores_v1')).q8).toBe(100);

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await readJson(page, 'tk_a4_progress_v1')).toEqual(saved);
    await expect(page.locator('#a4SecondPassCard')).toBeVisible();
    await expect(page.locator('#startSecondPassBtn')).toContainText('4. Durchgang');
    await expect(page.locator('#q8CheckBtn')).toContainText('Mindestziel 2/2');
  });

  test('A5 Q9 supports unlimited retries and keeps first / second / best', async ({ page }) => {
    await openClean(page, '/tk2/A5.html');

    const first = await answerSelectRound(page, '#q9Questions .answer-select', '#q9CheckBtn', 2);
    let saved = await readJson(page, 'tk_a5_progress_v1');
    expect(saved.A.attempts).toBe(1);
    expect(saved.A.first).toBe(first);
    expect(saved.A.second).toBeNull();
    expect(saved.A.best).toBe(first);

    await expect(page.locator('#a5SecondPassCard')).toBeVisible();
    await page.locator('#startSecondPassBtn').click();
    const second = await answerSelectRound(page, '#q9Questions .answer-select', '#q9CheckBtn', 0);

    saved = await readJson(page, 'tk_a5_progress_v1');
    expect(saved.A.attempts).toBe(2);
    expect(saved.A.first).toBe(first);
    expect(saved.A.second).toBe(second);
    expect(saved.A.best).toBe(100);
    expect((await readJson(page, 'tk_quest_scores_v1')).q9).toBe(100);

    await expect(page.locator('#a5SecondPassCard')).toBeVisible();
    await expect(page.locator('#startSecondPassBtn')).toContainText('3. Durchgang');
    await page.locator('#startSecondPassBtn').click();
    const third = await answerSelectRound(page, '#q9Questions .answer-select', '#q9CheckBtn', 5);

    saved = await readJson(page, 'tk_a5_progress_v1');
    expect(saved.A.attempts).toBe(3);
    expect(saved.A.first).toBe(first);
    expect(saved.A.second).toBe(second);
    expect(saved.A.last).toBe(third);
    expect(saved.A.best).toBe(100);
    expect((await readJson(page, 'tk_quest_scores_v1')).q9).toBe(100);

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await readJson(page, 'tk_a5_progress_v1')).toEqual(saved);
    await expect(page.locator('#a5SecondPassCard')).toBeVisible();
    await expect(page.locator('#startSecondPassBtn')).toContainText('4. Durchgang');
    await expect(page.locator('#q9CheckBtn')).toContainText('Mindestziel 2/2');
  });

  test('A6 retry preserves first score while best can improve and never regress', async ({ page }) => {
    await openClean(page, '/tk2/A6.html');

    const first = await answerButtonRound(page, 3);
    let saved = await readJson(page, 'tk_a6_progress_v1');
    expect(saved.A.first).toBe(first);
    expect(saved.A.last).toBe(first);
    expect(saved.A.best).toBe(first);

    await page.locator('#checkBtn').click();
    const second = await answerButtonRound(page, 0);
    expect(second).toBe(100);
    saved = await readJson(page, 'tk_a6_progress_v1');
    expect(saved.A.first).toBe(first);
    expect(saved.A.last).toBe(100);
    expect(saved.A.best).toBe(100);

    await page.locator('#checkBtn').click();
    const third = await answerButtonRound(page, 5);
    saved = await readJson(page, 'tk_a6_progress_v1');
    expect(saved.A.first).toBe(first);
    expect(saved.A.last).toBe(third);
    expect(saved.A.best).toBe(100);
    expect((await readJson(page, 'tk_quest_scores_v1')).q10).toBe(100);

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect((await readJson(page, 'tk_a6_progress_v1')).A).toEqual(saved.A);
  });
});