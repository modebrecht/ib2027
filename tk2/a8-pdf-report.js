(function () {
  'use strict';

  var PDF_SCRIPT = '../../tk/vendor/jspdf.umd.min.js';
  var BUTTON_ID = 'a8PdfReportBtn';
  var EXPORTING = false;

  function safeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/[\u200D\uFE0E\uFE0F]/g, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}]/gu, '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[–—−]/g, '-')
      .replace(/[“”„]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/…/g, '...')
      .replace(/€/g, 'Euro')
      .replace(/°/g, 'Grad')
      .replace(/←/g, 'Left')
      .replace(/→/g, 'Right')
      .replace(/↑/g, 'Up')
      .replace(/↓/g, 'Down')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function safeFileName(value) {
    return safeText(value || 'Schueler')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Schueler';
  }

  function ensureJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (window.__a8PdfJsPdfLoading) return window.__a8PdfJsPdfLoading;
    window.__a8PdfJsPdfLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = PDF_SCRIPT;
      script.onload = function () {
        if (window.jspdf && window.jspdf.jsPDF) resolve();
        else reject(new Error('jsPDF wurde geladen, ist aber nicht verfügbar.'));
      };
      script.onerror = function () { reject(new Error('jsPDF konnte nicht geladen werden.')); };
      document.head.appendChild(script);
    });
    return window.__a8PdfJsPdfLoading;
  }

  function readGameState() {
    try {
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    } catch (error) {
      // Top-level lexical bindings can differ between builds.
    }
    var keys = ['shortcutRitter_2026_v1', 'shortcutRitter_v1'];
    for (var i = 0; i < keys.length; i += 1) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (raw) return JSON.parse(raw);
      } catch (error) {
        console.warn('A8 PDF: Spielstand konnte nicht gelesen werden', error);
      }
    }
    return null;
  }

  function sectionTitleMap() {
    var map = {};
    var blueprints = Array.isArray(window.LEARN_SECTION_BLUEPRINTS) ? window.LEARN_SECTION_BLUEPRINTS : [];
    blueprints.forEach(function (section) {
      var id = String(section && section.id != null ? section.id : '');
      if (!id) return;
      var title = safeText(section.title || section.tabLabel || ('Abschnitt ' + id));
      map[id] = title.replace(/^\d+\.\s*/, '') || ('Abschnitt ' + id);
    });
    return map;
  }

  function clamp(value, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    return Math.max(min, Math.min(max, number));
  }

  function percent(correct, total) {
    return total ? Math.round((correct / total) * 100) : 0;
  }

  function uniqueNumbers(values) {
    var seen = {};
    return values.map(function (value) { return Number(value); })
      .filter(function (value) {
        if (!Number.isFinite(value) || value < 1 || value > 30 || seen[value]) return false;
        seen[value] = true;
        return true;
      })
      .sort(function (a, b) { return a - b; });
  }

  function buildReportData(gameState) {
    var titles = sectionTitleMap();
    var sectionReports = gameState.sectionReports || {};
    var sectionClears = gameState.sectionClears || {};
    var sections = [];

    for (var i = 1; i <= 30; i += 1) {
      var id = String(i);
      var report = sectionReports[id] || {};
      var promptStats = report.promptStats || {};
      var attempts = 0;
      var misses = 0;
      var firstTotal = 0;
      var firstCorrect = 0;

      Object.keys(promptStats).forEach(function (key) {
        var entry = promptStats[key] || {};
        attempts += Number(entry.attempts) || 0;
        misses += Number(entry.misses) || 0;
        if (Array.isArray(entry.history) && entry.history.length) {
          firstTotal += 1;
          if (entry.history[0] && entry.history[0].success) firstCorrect += 1;
        }
      });

      var completed = Number(sectionClears[id]) > 0 || Number(report.successes) > 0;
      var accuracy = attempts ? percent(attempts - misses, attempts) : (completed ? 100 : 0);
      var firstAccuracy = firstTotal ? percent(firstCorrect, firstTotal) : accuracy;
      var rawBest = Number(report.bestScore);
      var best = Number.isFinite(rawBest) && rawBest > 0 ? clamp(rawBest, 0, 100) : (completed ? Math.max(accuracy, firstAccuracy) : 0);
      var rawLast = Number(report.lastScore);
      var last = Number.isFinite(rawLast) && rawLast > 0 ? clamp(rawLast, 0, 100) : (completed ? best : 0);

      sections.push({
        id: i,
        title: titles[id] || ('Abschnitt ' + id),
        checks: Number(report.checks) || 0,
        successes: Number(report.successes) || 0,
        completed: completed,
        attempts: attempts,
        misses: misses,
        accuracy: clamp(accuracy, 0, 100),
        firstAccuracy: clamp(firstAccuracy, 0, 100),
        best: best,
        last: last,
        clears: Number(sectionClears[id]) || 0
      });
    }

    var combos = Object.keys(gameState.comboStats || {}).map(function (key) {
      var entry = gameState.comboStats[key] || {};
      var attempts = Number(entry.attempts) || 0;
      var misses = Number(entry.misses) || 0;
      var shortcut = safeText(entry.shortcut || key.replace(/^combo:/, ''));
      var taskLabel = safeText(entry.label || shortcut || key.replace(/^combo:/, ''));
      var history = Array.isArray(entry.history) ? entry.history.slice() : [];
      var sectionIds = uniqueNumbers(history.map(function (item) { return item && item.sectionId; }));
      if (!sectionIds.length && Array.isArray(entry.sections)) {
        sectionIds = uniqueNumbers(entry.sections.map(function (text) {
          var match = String(text || '').match(/Abschnitt\s+(\d+)/i);
          return match ? match[1] : null;
        }));
      }
      var display = shortcut || taskLabel;
      if (taskLabel && shortcut && taskLabel.toLowerCase() !== shortcut.toLowerCase()) display = shortcut + ' - ' + taskLabel;
      return {
        key: key,
        label: display,
        shortcut: shortcut,
        taskLabel: taskLabel,
        attempts: attempts,
        misses: misses,
        accuracy: attempts ? percent(attempts - misses, attempts) : 0,
        history: history,
        sectionIds: sectionIds,
        sectionNames: sectionIds.map(function (sectionId) { return titles[String(sectionId)] || ('Abschnitt ' + sectionId); })
      };
    }).filter(function (item) { return item.attempts > 0; });

    var completedCount = sections.filter(function (item) { return item.completed; }).length;
    var totalAttempts = sections.reduce(function (sum, item) { return sum + item.attempts; }, 0);
    var totalMisses = sections.reduce(function (sum, item) { return sum + item.misses; }, 0);
    var overallAccuracy = totalAttempts ? percent(totalAttempts - totalMisses, totalAttempts) : 0;

    var focusSections = sections.filter(function (item) { return item.misses > 0; }).sort(function (a, b) {
      return b.misses - a.misses || a.firstAccuracy - b.firstAccuracy || a.id - b.id;
    });
    var problemCombos = combos.filter(function (item) { return item.misses > 0; }).sort(function (a, b) {
      return b.misses - a.misses || a.accuracy - b.accuracy || b.attempts - a.attempts || a.shortcut.localeCompare(b.shortcut);
    });
    var strongCombos = combos.filter(function (item) { return item.misses === 0 && item.attempts >= 2; }).sort(function (a, b) {
      return b.attempts - a.attempts || a.shortcut.localeCompare(b.shortcut);
    });

    return {
      sections: sections,
      combos: combos,
      completedCount: completedCount,
      totalAttempts: totalAttempts,
      totalMisses: totalMisses,
      overallAccuracy: overallAccuracy,
      focusSections: focusSections,
      problemCombos: problemCombos,
      strongCombos: strongCombos
    };
  }

  function drawPdf(student, data) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    var W = 297;
    var H = 210;
    var M = 12;
    var pageNo = 1;
    var C = {
      ink: [20, 31, 48], muted: [92, 108, 128], navy: [15, 23, 42],
      blue: [59, 130, 246], blueSoft: [235, 244, 255], gold: [245, 158, 11], goldSoft: [255, 247, 225],
      green: [34, 197, 94], greenSoft: [236, 253, 245], red: [239, 68, 68], redSoft: [254, 242, 242],
      line: [222, 228, 236], panel: [248, 250, 252], white: [255, 255, 255]
    };

    function setColor(rgb, fill) {
      if (fill) doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      else doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    }
    function lineColor(rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

    function footer() {
      lineColor(C.line);
      doc.line(M, H - 10, W - M, H - 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      setColor(C.muted);
      doc.text('A8 Shortcut Quest | Lernnachweis', M, H - 5.5);
      doc.text(student + ' | Seite ' + pageNo, W - M, H - 5.5, { align: 'right' });
    }

    function header(title, kicker) {
      setColor(C.navy, true);
      doc.rect(0, 0, W, 24, 'F');
      setColor(C.gold, true);
      doc.rect(0, 0, 4, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(191, 219, 254);
      doc.text(safeText(kicker || 'INFORMATIK B25 | TK2 | A8'), M, 7.5);
      doc.setFontSize(15.5);
      setColor(C.white);
      doc.text(safeText(title), M, 17.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(203, 213, 225);
      doc.text(student, W - M, 17.2, { align: 'right' });
    }

    function newPage(title, kicker) {
      footer();
      doc.addPage('a4', 'landscape');
      pageNo += 1;
      header(title, kicker);
    }

    function roundedPanel(x, y, w, h, fill, border) {
      setColor(fill || C.panel, true);
      if (border) {
        lineColor(border);
        doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
      } else doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F');
    }

    function ellipsize(text, maxWidth, fontSize, fontStyle) {
      text = safeText(text);
      doc.setFont('helvetica', fontStyle || 'normal');
      doc.setFontSize(fontSize || 8);
      if (doc.getTextWidth(text) <= maxWidth) return text;
      var suffix = '...';
      while (text.length && doc.getTextWidth(text + suffix) > maxWidth) text = text.slice(0, -1);
      return text + suffix;
    }

    function sectionHeading(text, x, y, accent) {
      setColor(accent || C.blue, true);
      doc.roundedRect(x, y - 4.2, 3, 7.2, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      setColor(C.ink);
      doc.text(safeText(text), x + 6, y);
    }

    function metricCard(x, y, w, h, label, value, tone, detail) {
      var palette = tone === 'red' ? [C.redSoft, C.red] : tone === 'green' ? [C.greenSoft, C.green] : tone === 'gold' ? [C.goldSoft, C.gold] : [C.blueSoft, C.blue];
      roundedPanel(x, y, w, h, palette[0], C.line);
      setColor(palette[1], true);
      doc.roundedRect(x + 4, y + 4, 3, h - 8, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); setColor(C.ink);
      doc.text(String(value), x + 11, y + 13);
      doc.setFontSize(7.6); setColor(C.muted); doc.text(safeText(label), x + 11, y + 20);
      if (detail) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.7);
        doc.text(ellipsize(detail, w - 15, 6.7), x + 11, y + 26);
      }
    }

    function drawFocusRows(rows, x, y, w, maxRows) {
      var count = Math.min(rows.length, maxRows || 6);
      if (!count) {
        roundedPanel(x, y, w, 18, C.greenSoft, C.line);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setColor(C.green);
        doc.text('Keine Fehlerschwerpunkte registriert.', x + 5, y + 11);
        return 18;
      }
      var rowH = 12;
      for (var i = 0; i < count; i += 1) {
        var row = rows[i];
        roundedPanel(x, y + i * rowH, w, rowH - 1.4, i % 2 ? C.white : C.panel, C.line);
        setColor(C.red, true);
        doc.roundedRect(x + 3.5, y + i * rowH + 3, 5.5, 5.5, 1.3, 1.3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setColor(C.white);
        doc.text(String(row.misses), x + 6.25, y + i * rowH + 6.9, { align: 'center' });
        doc.setFontSize(8.1); setColor(C.ink);
        doc.text(ellipsize(row.id + '. ' + row.title, w - 42, 8.1, 'bold'), x + 12, y + i * rowH + 5.4);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.7); setColor(C.muted);
        doc.text(row.accuracy + '% Treffer | erster Kontakt ' + row.firstAccuracy + '%', x + 12, y + i * rowH + 9.1);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); setColor(C.red);
        doc.text(row.misses + ' Fehler', x + w - 4, y + i * rowH + 6.8, { align: 'right' });
      }
      return count * rowH;
    }

    function drawSimpleTable(rows, x, y, widths, headers, maxRows) {
      var rowH = 8.2;
      var h = rowH * (Math.min(rows.length, maxRows || rows.length) + 1);
      var totalW = widths.reduce(function (sum, value) { return sum + value; }, 0);
      setColor(C.navy, true); doc.roundedRect(x, y, totalW, rowH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); setColor(C.white);
      var cx = x;
      headers.forEach(function (headerText, index) {
        doc.text(ellipsize(headerText, widths[index] - 3, 6.8, 'bold'), cx + 2, y + 5.2);
        cx += widths[index];
      });
      var count = Math.min(rows.length, maxRows || rows.length);
      for (var r = 0; r < count; r += 1) {
        var ry = y + rowH * (r + 1);
        setColor(r % 2 ? C.white : C.panel, true); doc.rect(x, ry, totalW, rowH, 'F');
        lineColor(C.line); doc.line(x, ry + rowH, x + totalW, ry + rowH);
        cx = x;
        for (var c = 0; c < widths.length; c += 1) {
          doc.setFont('helvetica', c === 0 ? 'bold' : 'normal'); doc.setFontSize(6.6); setColor(C.ink);
          doc.text(ellipsize(rows[r][c], widths[c] - 3, 6.6, c === 0 ? 'bold' : 'normal'), cx + 2, ry + 5.1);
          cx += widths[c];
        }
      }
      lineColor(C.line); doc.roundedRect(x, y, totalW, h, 1.5, 1.5, 'S');
      return h;
    }

    function comboSectionText(item) {
      return item.sectionIds.length ? item.sectionIds.join(', ') : '-';
    }

    function drawProblemComboChart(items, x, y, w, h) {
      var chosen = items.slice(0, 10);
      if (!chosen.length) {
        roundedPanel(x, y, w, 28, C.greenSoft, C.line);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setColor(C.green);
        doc.text('Keine Kombination mit Fehlversuchen.', x + 6, y + 12);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); setColor(C.muted);
        doc.text('Der Lernnachweis zeigt hier nur Kombinationen, bei denen tatsächlich Fehler vorkamen.', x + 6, y + 20);
        return;
      }
      var rowH = h / chosen.length;
      var labelW = 72;
      var sectionsW = 73;
      var barX = x + labelW;
      var barW = w - labelW - sectionsW - 17;
      chosen.forEach(function (item, index) {
        var py = y + index * rowH;
        if (index % 2 === 0) {
          setColor(C.panel, true);
          doc.roundedRect(x, py, w, rowH - 1, 1.5, 1.5, 'F');
        }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); setColor(C.ink);
        doc.text(ellipsize(item.label, labelW - 4, 7.2, 'bold'), x + 2, py + 5.1);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.0); setColor(C.muted);
        doc.text(item.attempts + ' Versuche | ' + item.misses + ' Fehler', x + 2, py + 9.1);

        setColor(C.redSoft, true);
        doc.roundedRect(barX, py + 3.0, barW, 5.2, 1.4, 1.4, 'F');
        setColor(item.accuracy >= 90 ? C.green : item.accuracy >= 75 ? C.gold : C.red, true);
        if (item.accuracy > 0) doc.roundedRect(barX, py + 3.0, Math.max(1, barW * item.accuracy / 100), 5.2, 1.4, 1.4, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.7); setColor(C.ink);
        doc.text(item.accuracy + '%', barX + barW + 3, py + 6.9);

        var sx = x + w - sectionsW;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.1); setColor(C.muted);
        doc.text('Abschnitte', sx, py + 4.6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); setColor(C.ink);
        doc.text(ellipsize(comboSectionText(item), sectionsW - 2, 6.8), sx, py + 9.0);
      });
    }

    function drawSectionOverview(items, x, y, w, h) {
      var cols = 10;
      var rows = 3;
      var gap = 3;
      var cellW = (w - gap * (cols - 1)) / cols;
      var cellH = (h - gap * (rows - 1)) / rows;
      items.slice(0, 30).forEach(function (item, index) {
        var col = index % cols;
        var row = Math.floor(index / cols);
        var px = x + col * (cellW + gap);
        var py = y + row * (cellH + gap);
        var fill = !item.completed ? C.panel : item.misses > 1 ? C.redSoft : item.misses === 1 ? C.goldSoft : C.greenSoft;
        var accent = !item.completed ? C.muted : item.misses > 1 ? C.red : item.misses === 1 ? C.gold : C.green;
        roundedPanel(px, py, cellW, cellH, fill, C.line);
        setColor(accent, true);
        doc.roundedRect(px + 3, py + 3, 7.5, 7.5, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); setColor(C.white);
        doc.text(String(item.id), px + 6.75, py + 8.0, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3); setColor(C.ink);
        doc.text(item.completed ? item.accuracy + '%' : '-', px + cellW - 3, py + 7.5, { align: 'right' });
        doc.setFont('helvetica', item.misses > 0 ? 'bold' : 'normal'); doc.setFontSize(5.1); setColor(item.misses > 0 ? accent : C.muted);
        doc.text(ellipsize(item.title, cellW - 6, 5.1, item.misses > 0 ? 'bold' : 'normal'), px + 3, py + 14.2);
      });
    }

    function drawImprovementChart(items, x, y, w, h) {
      var chosen = items.slice(0, 8);
      if (!chosen.length) {
        roundedPanel(x, y, w, 24, C.greenSoft, C.line);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setColor(C.green);
        doc.text('Keine Fehler-Abschnitte - kein Verbesserungsverlauf nötig.', x + 5, y + 14);
        return;
      }
      var rowH = h / chosen.length;
      var labelW = 67;
      var barX = x + labelW;
      var barW = w - labelW - 16;
      chosen.forEach(function (item, index) {
        var py = y + index * rowH;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); setColor(C.muted);
        doc.text(ellipsize(item.id + '. ' + item.title, labelW - 4, 6.2), x, py + 5.0);

        setColor(C.line, true); doc.roundedRect(barX, py + 2.0, barW, 2.4, 0.9, 0.9, 'F');
        setColor(item.firstAccuracy >= 80 ? C.gold : C.red, true);
        if (item.firstAccuracy > 0) doc.roundedRect(barX, py + 2.0, Math.max(0.8, barW * item.firstAccuracy / 100), 2.4, 0.9, 0.9, 'F');

        setColor(C.line, true); doc.roundedRect(barX, py + 5.4, barW, 2.4, 0.9, 0.9, 'F');
        setColor(C.green, true);
        if (item.best > 0) doc.roundedRect(barX, py + 5.4, Math.max(0.8, barW * item.best / 100), 2.4, 0.9, 0.9, 'F');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.9); setColor(C.ink);
        doc.text(item.firstAccuracy + ' > ' + item.best + '%', x + w, py + 6.0, { align: 'right' });
      });
    }

    header('Lernnachweis - Überblick', 'INFORMATIK B25 | TK2 | A8 SHORTCUT QUEST');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); setColor(C.ink); doc.text(student, M, 36);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); setColor(C.muted);
    doc.text('Stand: ' + new Date().toLocaleString('de-CH') + ' | automatisch aus dem gespeicherten Spielstand', M, 42);

    var cardGap = 5;
    var cardW = (W - 2 * M - 3 * cardGap) / 4;
    metricCard(M, 49, cardW, 31, 'Abschnitte abgeschlossen', data.completedCount + '/30', data.completedCount === 30 ? 'green' : 'blue', 'Fortschritt im A8-Kurs');
    metricCard(M + cardW + cardGap, 49, cardW, 31, 'Antwortversuche', data.totalAttempts, 'blue', 'über alle Aufgaben hinweg');
    metricCard(M + 2 * (cardW + cardGap), 49, cardW, 31, 'Fehlversuche', data.totalMisses, data.totalMisses ? 'red' : 'green', data.focusSections.length + ' Abschnitte betroffen');
    metricCard(M + 3 * (cardW + cardGap), 49, cardW, 31, 'Trefferquote', data.overallAccuracy + '%', data.overallAccuracy >= 90 ? 'green' : data.overallAccuracy >= 75 ? 'gold' : 'red', 'über alle protokollierten Antworten');

    sectionHeading('Wo noch ansetzen', M, 94, C.red);
    drawFocusRows(data.focusSections, M, 100, 132, 6);
    sectionHeading('Starke Kombinationen', 151, 94, C.green);
    var strongRows = data.strongCombos.slice(0, 7).map(function (item) { return [item.label, item.attempts + ' Versuche', '0 Fehler']; });
    if (strongRows.length) drawSimpleTable(strongRows, 151, 100, [83, 25, 25], ['Kombination', 'Praxis', 'Fehler'], 7);
    else {
      roundedPanel(151, 100, 133, 18, C.panel, C.line);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setColor(C.muted);
      doc.text('Noch zu wenig Daten für eine Stärkenliste.', 156, 111);
    }

    sectionHeading('FAZIT', M, 181, C.gold);
    roundedPanel(M, 186, W - 2 * M, 10, C.goldSoft, C.line);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); setColor(C.ink);
    var summary = data.totalMisses
      ? 'Fokus auf ' + data.problemCombos.slice(0, 3).map(function (item) { return item.shortcut || item.label; }).join(' | ') + '. Seite 2 zeigt, in welchen Abschnitten diese Kombinationen erneut geübt werden können.'
      : 'Aktuell sind keine Fehlversuche registriert. Für eine belastbare Diagnose sind weitere Wiederholungen sinnvoll.';
    doc.text(ellipsize(summary, W - 2 * M - 10, 7.4), M + 5, 192.3);

    newPage('Kombinationen - Übungsbedarf', 'WAS NOCH ÜBEN | WO KOMMT ES VOR?');
    sectionHeading('Kombinationen mit Fehlversuchen', M, 35, C.red);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.0); setColor(C.muted);
    doc.text('Nur Kombinationen mit echten Fehlversuchen. Die Abschnittsnummern zeigen, wo derselbe Shortcut im Kurs erneut vorkommt.', M, 41.5);
    drawProblemComboChart(data.problemCombos, M, 47, W - 2 * M, 102);

    sectionHeading('Priorität', M, 153, C.blue);
    var comboRows = data.problemCombos.slice(0, 4).map(function (item) {
      return [item.shortcut || item.label, item.accuracy + '%', String(item.misses), comboSectionText(item)];
    });
    if (comboRows.length) {
      drawSimpleTable(comboRows, M, 157, [72, 24, 24, 153], ['Kombination', 'Treffer', 'Fehler', 'Kommt vor in Abschnitten'], 4);
    } else {
      roundedPanel(M, 157, W - 2 * M, 20, C.greenSoft, C.line);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setColor(C.green);
      doc.text('Keine Kombination braucht aktuell gezielte Nacharbeit.', M + 6, 169);
    }

    newPage('Abschnitte & Lernfortschritt', 'WO TRATEN FEHLER AUF? | WAS HAT SICH VERBESSERT?');
    sectionHeading('30 Abschnitte auf einen Blick', M, 35, C.blue);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); setColor(C.muted);
    doc.text('Grün = fehlerfrei | Gold = 1 Fehler | Rot = mehrere Fehler | Zahl rechts = aktuelle Trefferquote', M, 41.5);
    drawSectionOverview(data.sections, M, 47, W - 2 * M, 61);

    sectionHeading('Verbesserung in Fehler-Abschnitten', M, 122, C.gold);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.7); setColor(C.muted);
    doc.text('Obere Linie = erster Kontakt | untere Linie = bestes Ergebnis. Gezeigt werden nur Abschnitte mit Fehlversuchen.', M, 128.3);
    drawImprovementChart(data.focusSections, M, 133, 166, 52);

    sectionHeading('Fehler-Abschnitte', 187, 122, C.red);
    var focusRows = data.focusSections.slice(0, 7).map(function (item) {
      return [item.id + '. ' + item.title, item.firstAccuracy + '%', item.best + '%', String(item.misses)];
    });
    if (focusRows.length) {
      drawSimpleTable(focusRows, 187, 133, [48, 16, 16, 17], ['Abschnitt', 'Start', 'Best', 'Fehler'], 7);
    } else {
      roundedPanel(187, 133, 97, 22, C.greenSoft, C.line);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setColor(C.green);
      doc.text('Keine Fehler-Abschnitte.', 193, 146);
    }

    footer();
    doc.save('A8_Shortcut_Quest_Lernnachweis_' + safeFileName(student) + '.pdf');
  }

  async function generatePdf(button) {
    if (EXPORTING) return;
    EXPORTING = true;
    var originalText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'PDF wird erstellt ...';
    }
    try {
      var student = window.prompt('Bitte gib deinen Vornamen für den Lernnachweis ein:', '');
      if (!student) return;
      await ensureJsPdf();
      var gameState = readGameState();
      if (!gameState) throw new Error('Kein gespeicherter A8-Spielstand gefunden.');
      var data = buildReportData(gameState);
      if (!data.sections.length) throw new Error('Keine Reportdaten gefunden.');
      drawPdf(student, data);
      console.info('A8 PDF erstellt: 3-seitiger Lernnachweis mit Fokus auf Fazit, Übungs-Kombinationen und Lernfortschritt.');
    } catch (error) {
      console.error('A8 PDF export failed', error);
      window.alert('Das A8-PDF konnte nicht erzeugt werden. Bitte aktualisiere zuerst den Lern-Report und versuche es erneut.');
    } finally {
      EXPORTING = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function installButton() {
    if (document.getElementById(BUTTON_ID)) return;
    var actions = document.querySelector('.report-secondary-actions');
    if (!actions) return;
    var button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'report-action ghost';
    button.textContent = 'PDF Lernnachweis';
    button.title = '3-seitiger Lernnachweis mit Fazit, Übungsbedarf und Lernfortschritt';
    button.addEventListener('click', function () { generatePdf(button); });
    actions.insertBefore(button, actions.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installButton);
  else installButton();

  var observer = new MutationObserver(function () { installButton(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();


/* A8 TIERED GEAR DEV LOADER 2026 */
(() => {
  if (document.querySelector('script[data-a8-tiered-gear-loader]')) return;
  const script = document.createElement('script');
  script.src = 'gear-visuals.js?v=2742c3e6';
  script.async = false;
  script.dataset.a8TieredGearLoader = 'true';
  document.head.appendChild(script);
})();


/* A8 BATTLE CONTINUITY DEV LOADER 2026 */
(() => {
  if (document.querySelector('script[data-a8-battle-continuity-loader]')) return;
  const script = document.createElement('script');
  script.src = 'battle-continuity.js?v=a6d1d495';
  script.async = false;
  script.dataset.a8BattleContinuityLoader = 'true';
  document.head.appendChild(script);
})();
