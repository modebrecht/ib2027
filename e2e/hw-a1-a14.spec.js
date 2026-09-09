const fs = require('fs');
const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'https://ib2026.vercel.app').replace(/\/$/, '');
const TEST_STUDENT = 'E2E Smoke';

async function seedStudent(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((student) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('studentVorname', student);
    localStorage.setItem('student_vorname', student);
  }, TEST_STUDENT);
}

async function openWorksheet(page, path) {
  await seedStudent(page);
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
}

async function assertDownload(download, extension, magic, expectedPrefix) {
  const filename = download.suggestedFilename();
  expect(filename).toMatch(new RegExp(`\\.${extension}$`, 'i'));
  if (expectedPrefix) expect(filename).toMatch(new RegExp(`^${expectedPrefix}`, 'i'));

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.readFileSync(downloadPath);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, magic.length).toString('ascii')).toBe(magic);
}

async function downloadFrom(page, selector, extension, magic, expectedPrefix) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    page.locator(selector).click({ force: true }),
  ]);
  await assertDownload(download, extension, magic, expectedPrefix);
}

async function downloadPdf(page, selector, expectedPrefix) {
  await downloadFrom(page, selector, 'pdf', '%PDF-', expectedPrefix);
}

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

function expectNoPageErrors(errors) {
  expect(errors, `Uncaught browser errors: ${errors.join(' | ')}`).toEqual([]);
}

async function solveCurrentMemory(page) {
  await page.waitForFunction(() => typeof state !== 'undefined' && Array.isArray(state.deck) && state.deck.length > 0);

  const pairs = await page.evaluate(() => {
    const grouped = new Map();
    state.deck.forEach((card, index) => {
      if (!grouped.has(card.pairId)) grouped.set(card.pairId, []);
      grouped.get(card.pairId).push(index);
    });
    return Array.from(grouped.values()).map((indexes) => indexes.slice(0, 2));
  });

  expect(pairs.length).toBeGreaterThan(0);
  for (const [first, second] of pairs) {
    await page.locator(`.mem-card[data-index="${first}"]`).click();
    await page.locator(`.mem-card[data-index="${second}"]`).click();
  }

  await expect(page.locator('#modal')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#modalTitle')).toContainText('Runde geschafft');
}

async function speedUpTimers(page) {
  await page.evaluate(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (fn, delay, ...args) => nativeSetTimeout(fn, Math.min(Number(delay) || 0, 50), ...args);
  });
}

test.use({
  acceptDownloads: true,
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
});

test.setTimeout(180_000);

test.describe('HW production smoke: A1-A14', () => {
  test('A1: solves three Memory modes and downloads a valid PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A1.html');

    await expect(page).toHaveTitle(/A1: IT-Hardware Memory/);
    await expect(page.locator('#studentName')).toHaveValue(TEST_STUDENT);
    await expect(page.locator('#board .mem-card')).toHaveCount(8);

    const modes = ['einfach', 'mittel', 'schwer'];
    for (let i = 0; i < modes.length; i += 1) {
      if (i > 0) await page.locator('#change').click();
      await page.locator(`.diff-btn[data-diff="${modes[i]}"]`).click();
      await solveCurrentMemory(page);
      await expect(page.locator('#completionBadge')).toContainText(`${i + 1} / 3`);
    }

    await expect(page.locator('#modalPdfBtn')).toContainText('PDF herunterladen (3/3)');
    await downloadPdf(page, '#modalPdfBtn', 'A1_Leistungsnachweis');
    expectNoPageErrors(errors);
  });

  test('A2: reveal flow, 100%, persistence and PDF', async ({ page, context }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A2.html');

    await expect(page).toHaveTitle(/A2: Das EVA-Prinzip/);
    await expect(page.locator('#studentName')).toHaveValue(TEST_STUDENT);
    await page.locator('#play-btn-hd').click({ force: true });
    await expect(page.locator('#secVideo')).toBeVisible({ timeout: 35_000 });

    context.on('page', async (popup) => {
      if (popup !== page) await popup.close().catch(() => {});
    });
    await page.locator('#ytButton').click({ force: true, noWaitAfter: true });
    await expect(page.locator('#secPraxis')).toBeVisible({ timeout: 5_000 });

    const examples = {
      3: ['Smartphone', 'Touch auf App-Symbol', 'App verarbeitet den Touch', 'App wird auf dem Display geöffnet'],
      4: ['Waschmaschine', 'Programm und Start wählen', 'Maschine steuert den Waschgang', 'Saubere Wäsche und Signal'],
      5: ['Türklingel', 'Klingeltaste drücken', 'Signal wird elektrisch verarbeitet', 'Klingelton ertönt'],
      6: ['Fahrkartenautomat', 'Ziel und Zahlungsmittel wählen', 'Automat berechnet und verbucht', 'Fahrkarte wird ausgegeben'],
    };

    for (const [number, values] of Object.entries(examples)) {
      const [name, input, processing, output] = values;
      await page.locator(`#ex${number}_name`).fill(name);
      await page.locator(`#ex${number}_in`).fill(input);
      await page.locator(`#ex${number}_proc`).fill(processing);
      await page.locator(`#ex${number}_out`).fill(output);
    }

    await expect(page.locator('#headerPercentText')).toHaveText('100% erledigt');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('onedrive_a2_eva_worksheet_8sek') || '{}'));
    expect(saved.percent).toBe(100);
    expect(saved.form.ex6_out).toContain('Fahrkarte');
    await downloadPdf(page, '#hdrPdfBtn', 'A2_EVA_Prinzip');
    expectNoPageErrors(errors);
  });

  test('A3: completes all 14 component functions and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A3.html');

    await expect(page).toHaveTitle(/A3: Aufbau eines Computers/);
    await page.locator('#viewToggleBtn').click();

    const fields = page.locator('textarea[id^="comp_"][id$="_func"]');
    await expect(fields).toHaveCount(14);
    for (let i = 0; i < 14; i += 1) {
      const field = fields.nth(i);
      if (!(await field.inputValue()).trim()) {
        await field.fill(`E2E Funktionsbeschreibung ${i + 1}`);
      }
    }

    await expect(page.locator('#headerPercentText')).toHaveText('100% erledigt');
    await downloadPdf(page, '#hdrPdfBtn', 'A3_Computeraufbau');
    expectNoPageErrors(errors);
  });

  test('A4: answers all 16 port questions correctly and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A4.html');

    await expect(page).toHaveTitle(/A4: Kabel & Anschlüsse/);
    await page.locator('#btnQuiz').click();

    const total = await page.evaluate(() => TOTAL_QUESTIONS);
    expect(total).toBe(16);

    for (let i = 0; i < total; i += 1) {
      await expect(page.locator('#quizOptions button').first()).toBeVisible({ timeout: 10_000 });
      const correctId = await page.evaluate(() => currentQuestion && currentQuestion.id);
      expect(correctId).toBeTruthy();
      await page.locator(`#quizOptions button[data-id="${correctId}"]`).click();
      await page.waitForFunction(
        (previousId) => !quizActive || (currentQuestion && currentQuestion.id !== previousId),
        correctId,
        { timeout: 5_000 },
      );
    }

    const result = await page.evaluate(() => ({ quizActive, correctCount, errorCount, hasPassed }));
    expect(result.quizActive).toBe(false);
    expect(result.correctCount).toBe(16);
    expect(result.errorCount).toBe(0);
    expect(result.hasPassed).toBe(true);
    await expect(page.locator('#headerPercentText')).toHaveText('16 / 16 richtig');
    await expect(page.locator('#modalPdfBtn')).toBeVisible();
    await downloadPdf(page, '#modalPdfBtn');
    expectNoPageErrors(errors);
  });

  test('A5: completes all 16 connector cards, persists and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A5.html');

    await expect(page).toHaveTitle(/A5: Schnittstellen & PC-Kabel/);
    const ids = await page.evaluate(() => fieldIds());
    expect(ids).toHaveLength(16);

    await expect(page.locator('#nextCardBtn')).toBeVisible();
    expect(await page.evaluate(() => currentCardIndex)).toBe(0);
    await page.locator('#nextCardBtn').click();

    for (let i = 0; i < ids.length; i += 1) {
      expect(await page.evaluate(() => currentCardIndex)).toBe(i + 1);
      await expect(page.locator(`#${ids[i]}`)).toBeVisible();
      await page.locator(`#${ids[i]}`).fill(`E2E A5 ${i + 1}`);
      if (i < ids.length - 1) await page.locator('#nextCardBtn').click();
    }

    await expect(page.locator('#headerPercentText')).toHaveText('100% erledigt');
    await expect(page.locator('#pdfBtn')).toHaveAttribute('title', 'PDF herunterladen');
    await page.waitForTimeout(250);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('onedrive_a5_worksheet_8sek') || '{}'));
    expect(saved.percent).toBe(100);
    expect(Object.keys(saved.answers || {})).toHaveLength(16);
    await downloadPdf(page, '#pdfBtn', 'A5_Schnittstellen_PC-Kabel');
    expectNoPageErrors(errors);
  });

  test('A6: downloads the real DOCX and persists manual completion', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A6.html');

    await expect(page).toHaveTitle(/A6: Mainboard-Anschlüsse/);
    await downloadFrom(page, '#b64DownloadBtn', 'docx', 'PK');

    await page.locator('#manualDoneA6').check();
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#manualDoneA6')).toBeChecked();
    expectNoPageErrors(errors);
  });

  test('A7: exposes all seven Troubleshooter cases, completes one and persists manual completion', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A7.html');

    await expect(page).toHaveTitle(/A7: TROUBLESHOOTER/);
    const launcher = page.locator('a[href="https://ib-ts.vercel.app"]');
    await expect(launcher).toBeVisible();

    const [toolPage] = await Promise.all([
      page.waitForEvent('popup'),
      launcher.click(),
    ]);
    await toolPage.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await expect(toolPage).toHaveURL(/ib-ts\.vercel\.app/);
    await expect(toolPage).toHaveTitle(/PC-Troubleshooter/);
    await expect(toolPage.locator('.hub-item')).toHaveCount(7);

    await toolPage.getByRole('button', { name: 'Starten', exact: true }).click();
    await expect(toolPage.getByRole('heading', { name: /Szenario 1: Der PC/ })).toBeVisible();

    await toolPage.getByRole('button', { name: /Stromkabel & Steckdose prüfen/ }).click();
    await expect(toolPage.getByRole('heading', { name: 'Stromkette geprüft' })).toBeVisible();
    await toolPage.getByRole('button', { name: 'Schliessen', exact: true }).click();

    await toolPage.getByRole('button', { name: /Monitor ein\/aus/ }).click();
    await expect(toolPage.getByRole('heading', { name: 'Aufgabe abgeschlossen' })).toBeVisible();
    await expect(toolPage.getByText('Das Login ist sichtbar.')).toBeVisible();
    await expect(toolPage.locator('#rankText')).toContainText('Bewertung: Gold');
    await toolPage.close();

    await page.locator('#manualDoneA7').check();
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#manualDoneA7')).toBeChecked();
    expectNoPageErrors(errors);
  });

  test('A8: answers all EVA repetition items correctly and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A8.html');

    await expect(page).toHaveTitle(/A8: EVA-Repetition/);
    const total = await page.evaluate(() => ITEMS.length);
    expect(total).toBe(15);

    for (let i = 0; i < total; i += 1) {
      const category = await page.evaluate(() => current().cat);
      await page.locator(`.eva-btn[data-cat="${category}"]`).click();
      await page.waitForFunction(
        (previousIndex) => index > previousIndex || document.getElementById('result')?.classList.contains('hidden') === false,
        i,
        { timeout: 5_000 },
      );
    }

    const result = await page.evaluate(() => ({ index, firstTryCorrect, bestFullScore }));
    expect(result.index).toBeGreaterThanOrEqual(total);
    expect(result.firstTryCorrect).toBe(total);
    expect(result.bestFullScore).toBe(total);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    expect(saved.bestFullScore).toBe(total);
    await expect(page.locator('#result')).toBeVisible();
    await downloadPdf(page, '#pdf', 'A8_EVA_Repetition');
    expectNoPageErrors(errors);
  });

  test('A9: answers all stream scenarios correctly and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A9.html');

    await expect(page).toHaveTitle(/A9: EVA-Szenarien/);
    const total = await page.evaluate(() => SCENES.length);
    expect(total).toBe(12);

    for (let i = 0; i < total; i += 1) {
      const category = await page.evaluate(() => current().cat);
      await page.locator(`.eva-btn[data-cat="${category}"]`).click();
      await page.waitForFunction(
        (previousIndex) => index > previousIndex || document.getElementById('result')?.classList.contains('hidden') === false,
        i,
        { timeout: 5_000 },
      );
    }

    const result = await page.evaluate(() => ({ index, score, bestScore }));
    expect(result.index).toBeGreaterThanOrEqual(total);
    expect(result.score).toBe(total);
    expect(result.bestScore).toBe(total);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    expect(saved.bestScore).toBe(total);
    await expect(page.locator('#result')).toBeVisible();
    await downloadPdf(page, '#pdf', 'A9_EVA_Szenarien');
    expectNoPageErrors(errors);
  });

  test('A10: solves all storage scenarios, persists best score and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A10.html');

    await expect(page).toHaveTitle(/A10: RAM, HDD oder SSD/);
    const total = await page.evaluate(() => SCENES.length);
    expect(total).toBe(10);
    await speedUpTimers(page);

    for (let i = 0; i < total; i += 1) {
      const category = await page.evaluate(() => current().cat);
      await page.locator(`.storage-btn[data-cat="${category}"]`).click();
      await page.waitForFunction(
        (previousIndex) => index > previousIndex || document.getElementById('result')?.classList.contains('hidden') === false,
        i,
        { timeout: 5_000 },
      );
    }

    const result = await page.evaluate(() => ({ index, score, bestScore, pass: PASS }));
    expect(result.score).toBe(total);
    expect(result.bestScore).toBe(total);
    expect(result.pass).toBe(7);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    expect(saved.bestScore).toBe(total);
    await expect(page.locator('#result')).toBeVisible();
    await downloadPdf(page, '#pdf', 'A10_RAM_HDD_SSD');
    expectNoPageErrors(errors);
  });

  test('A11: completes all five customer consultations, persists and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A11.html');

    await expect(page).toHaveTitle(/A11: Kaufberatung im Tech Shop/);
    const total = await page.evaluate(() => CASES.length);
    expect(total).toBe(5);
    await speedUpTimers(page);

    for (let i = 0; i < total; i += 1) {
      await page.locator('#dialogueNext').click({ force: true });
      const correctId = await page.evaluate(() => CASES[index].correct);
      await page.locator(`.device-card[data-id="${correctId}"]`).click();
      await expect(page.locator('#nextBtn')).toHaveClass(/show/);
      await page.locator('#nextBtn').click();
      await page.waitForFunction(
        (previousIndex) => index > previousIndex || document.getElementById('result')?.classList.contains('hidden') === false,
        i,
        { timeout: 5_000 },
      );
    }

    await expect(page.locator('#result')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    expect(saved.done).toHaveLength(total);
    expect(saved.index).toBe(total);
    await expect(page.locator('#pct')).toHaveText('100% bearbeitet');
    await downloadPdf(page, '#pdf', 'A11_Kaufberatung');
    expectNoPageErrors(errors);
  });

  test('A12: sorts all 12 interfaces correctly, persists and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A12.html');

    await expect(page).toHaveTitle(/A12: Schnittstellen sortieren/);
    const connectors = await page.evaluate(() => C.map(({ id, category }) => ({ id, category })));
    expect(connectors).toHaveLength(12);

    for (const connector of connectors) {
      await page.locator(`#choice_${connector.id}`).selectOption(connector.category);
    }

    await expect(page.locator('#pct')).toHaveText('100% bearbeitet');
    await page.waitForTimeout(250);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    for (const connector of connectors) {
      expect(saved.choices?.[connector.id]).toBe(connector.category);
    }
    await downloadPdf(page, '#pdf', 'A12_Schnittstellen');
    expectNoPageErrors(errors);
  });

  test('A13: experiments with both energy sliders, answers the concept check and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A13.html');

    await expect(page).toHaveTitle(/A13: Grüne IT & Nachhaltigkeit/);
    for (const id of ['cobalt', 'lithium', 'gold']) {
      await page.locator(`#${id}`).selectOption('correct');
    }
    await page.locator('#responsibility').fill('Hersteller, Politik und Konsumentinnen tragen gemeinsam Verantwortung.');
    await page.locator('#goldEstimate').fill('Altgeräte enthalten konzentrierte Wertstoffe und können zurückgewonnen werden.');
    await page.locator('#task2 button').click();
    await expect(page.locator('#dot2')).toHaveClass(/done/);

    await expect(page.getByText(/Smartphone ≈ 8 W/)).toBeVisible();
    await expect(page.getByText(/PC\/Konsole ≈ 120 W/)).toBeVisible();
    await expect(page.locator('#energyAnswerMobile')).toBeDisabled();
    await expect(page.locator('#energyAnswerPc')).toBeDisabled();

    await page.locator('#mobileHours').focus();
    await page.locator('#mobileHours').press('ArrowRight');
    await expect(page.locator('#dot3')).not.toHaveClass(/done/);
    await expect(page.locator('#energyAnswerPc')).toBeDisabled();

    await page.locator('#pcHours').focus();
    await page.locator('#pcHours').press('ArrowRight');
    await expect(page.locator('#dot3')).not.toHaveClass(/done/);
    await expect(page.locator('#energyAnswerMobile')).toBeEnabled();
    await expect(page.locator('#energyAnswerPc')).toBeEnabled();

    await page.locator('#energyAnswerMobile').click();
    await expect(page.locator('#dot3')).not.toHaveClass(/done/);
    await expect(page.locator('#energyCheckFeedback')).toContainText('Vergleiche noch einmal');

    await page.locator('#energyAnswerPc').click();
    await expect(page.locator('#dot3')).toHaveClass(/done/);
    await expect(page.locator('#energyCheckFeedback')).toContainText('Richtig');

    await page.locator('#oldDevices').fill('2');
    const goodProcureIds = await page.evaluate(() => procure.filter((item) => item.good).map((item) => item.id));
    for (const id of goodProcureIds) {
      await page.locator(`[data-procure="${id}"]`).check();
    }
    await page.locator('#task5 button').nth(0).click();

    for (const name of ['rq1', 'rq2', 'rq3']) {
      await page.locator(`input[name="${name}"][value="1"]`).check();
    }
    await page.locator('#task5 button').nth(1).click();

    await expect(page.locator('#pct')).toHaveText('100% bearbeitet');
    await expect(page.locator('#pdf')).toHaveAttribute('data-unlocked', '1');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    expect(saved.version).toBe(3);
    expect(saved.state).toMatchObject({
      task2: true,
      task3: true,
      energyTriedMobile: true,
      energyTriedPc: true,
      energyAnswer: 'pc',
      procure: true,
      recycle: true,
    });
    expect(saved.vals.oldDevices).toBe('2');
    await downloadPdf(page, '#pdf', 'A13_Gruene_IT');
    expectNoPageErrors(errors);
  });

  test('A14: solves all Green IT scenarios, persists best score and downloads PDF', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWorksheet(page, '/hw/A14.html');

    await expect(page).toHaveTitle(/A14: Green IT Challenge/);
    const total = await page.evaluate(() => TOTAL);
    expect(total).toBe(14);
    await speedUpTimers(page);

    for (let i = 0; i < total; i += 1) {
      const correctId = await page.evaluate(() => queue[index].correct);
      await page.locator(`.option-btn[data-id="${correctId}"]`).click();
      await page.waitForFunction(
        (previousIndex) => index > previousIndex || document.getElementById('result')?.classList.contains('hidden') === false,
        i,
        { timeout: 5_000 },
      );
    }

    await expect(page.locator('#result')).toBeVisible();
    const result = await page.evaluate(() => ({ score, bestScore, pass: PASS }));
    expect(result.score).toBe(total);
    expect(result.bestScore).toBe(total);
    expect(result.pass).toBe(10);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(K) || '{}'));
    expect(saved.bestScore).toBe(total);
    await downloadPdf(page, '#pdf', 'A14_Green_IT_Challenge');
    expectNoPageErrors(errors);
  });

  test('Root: exposes A1-A14 + P1 and only manualDoneA6 completes A6', async ({ page }) => {
    const errors = collectPageErrors(page);
    await seedStudent(page);

    await expect(page).toHaveTitle(/Informatische Bildung/);
    await expect(page.locator('#hwKachel .hw-task-list .task-card')).toHaveCount(15);
    for (let n = 1; n <= 14; n += 1) {
      await expect(page.locator(`#title-A${n}`)).toBeAttached();
      await expect(page.locator(`a[href="hw/A${n}.html"]`)).toBeAttached();
    }

    await expect(page.locator('#title-P1')).toBeAttached();
    await expect(page.locator('a[href="hw/P1.docx"]')).toBeAttached();

    const a6Card = page.locator('#title-A6').locator('xpath=ancestor::div[contains(@class,"task-card")][1]');
    await page.evaluate(() => {
      localStorage.setItem('hw_autosave_A6.html', JSON.stringify({ manualDoneA5: true }));
      checkCompletionStatus();
    });
    await expect(a6Card).not.toHaveClass(/task-done/);

    await page.evaluate(() => {
      localStorage.setItem('hw_autosave_A6.html', JSON.stringify({ manualDoneA6: true }));
      checkCompletionStatus();
    });
    await expect(a6Card).toHaveClass(/task-done/);
    expectNoPageErrors(errors);
  });
});
