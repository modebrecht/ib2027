/* Shared score-attempt standard for graded HW quests.
 * Persistent history is deliberately stored separately from worksheet autosaves:
 *   firstScore  = first completed round, immutable
 *   secondScore = second completed round, immutable
 *   bestScore   = best completed round, updated forever
 * Normal reset buttons only restart the current round and NEVER delete history.
 */
(function () {
  'use strict';

  var file = (location.pathname.split('/').pop() || '').toUpperCase();
  var page = (file.match(/^A(\d+)\.HTML$/) || [])[1];
  if (!page) return;
  var code = 'A' + page;
  var SCORE_PAGES = ['A1','A4','A8','A9','A10','A11','A12','A14'];
  var WRITING_PAGES = ['A2','A3','A5','A13'];
  var HIST_PREFIX = 'hw_score_history_';
  var WORK_PREFIX = 'hw_score_work_';

  function n(v) { if (v === null || v === undefined || v === '') return null; var x = Number(v); return Number.isFinite(x) ? x : null; }
  function historyKey(suffix) { return HIST_PREFIX + code + (suffix ? '_' + suffix : ''); }
  function workKey() { return WORK_PREFIX + code; }
  function emptyHistory(total) {
    return { version: 1, firstScore: null, secondScore: null, bestScore: null, attempts: 0, total: total == null ? null : Number(total), passedEver: false, lastScore: null };
  }
  function loadHistory(suffix, total) {
    var key = historyKey(suffix), h = emptyHistory(total);
    try {
      var d = JSON.parse(localStorage.getItem(key) || '{}') || {};
      h.firstScore = n(d.firstScore);
      h.secondScore = n(d.secondScore);
      h.bestScore = n(d.bestScore);
      h.attempts = Math.max(0, Number(d.attempts) || 0);
      h.total = d.total == null ? h.total : Number(d.total);
      h.passedEver = !!d.passedEver;
      h.lastScore = n(d.lastScore);
    } catch (_) {}
    return h;
  }
  function saveHistory(h, suffix) {
    localStorage.setItem(historyKey(suffix), JSON.stringify(h));
    return h;
  }
  function record(score, total, passAt, suffix) {
    score = Number(score) || 0;
    var h = loadHistory(suffix, total);
    if (h.attempts === 0 || h.firstScore === null) h.firstScore = score;
    else if (h.attempts === 1 || h.secondScore === null) h.secondScore = score;
    h.bestScore = h.bestScore === null ? score : Math.max(h.bestScore, score);
    h.lastScore = score;
    h.attempts += 1;
    h.total = total == null ? h.total : Number(total);
    if (passAt == null || score >= Number(passAt)) h.passedEver = true;
    saveHistory(h, suffix);
    return h;
  }
  function fmt(v, total, points) {
    if (v === null || v === undefined) return '–';
    return points ? (v + ' Pkt.') : (v + ' / ' + total);
  }

  function injectStyle() {
    if (document.getElementById('scoreHistoryStyle')) return;
    var s = document.createElement('style');
    s.id = 'scoreHistoryStyle';
    s.textContent =
      '.score-history-panel{margin:1rem auto 0;max-width:760px;padding:1rem;border:1px solid #cbd5e1;border-radius:1rem;background:rgba(255,255,255,.82);text-align:left}' +
      '.dark .score-history-panel{background:rgba(15,23,42,.72);border-color:#475569}' +
      '.score-history-title{font-size:.68rem;font-weight:950;text-transform:uppercase;letter-spacing:.13em;color:#64748b;margin-bottom:.65rem}' +
      '.score-history-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}' +
      '.score-history-stat{padding:.7rem;border-radius:.85rem;background:#f8fafc;border:1px solid #e2e8f0}' +
      '.dark .score-history-stat{background:#1e293b;border-color:#334155}' +
      '.score-history-stat span{display:block;font-size:.62rem;text-transform:uppercase;font-weight:900;color:#94a3b8}' +
      '.score-history-stat strong{display:block;margin-top:.15rem;font-size:1rem;font-weight:950}' +
      '.score-history-correct{border-color:#10b981!important;background:#ecfdf5!important;box-shadow:0 0 0 4px rgba(16,185,129,.11)!important}' +
      '.dark .score-history-correct{background:rgba(6,78,59,.3)!important}' +
      '.score-history-spec{border-radius:.65rem;background:#dcfce7!important;box-shadow:0 0 0 2px rgba(34,197,94,.25);animation:scoreSpecPulse 1.15s ease-in-out 2}' +
      '.dark .score-history-spec{background:rgba(6,95,70,.5)!important;color:#d1fae5!important}' +
      '@keyframes scoreSpecPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.025);box-shadow:0 0 0 4px rgba(34,197,94,.2),0 0 20px rgba(34,197,94,.2)}}' +
      '@media(max-width:520px){.score-history-grid{grid-template-columns:1fr}.score-history-panel{padding:.8rem}}' +
      '@media(prefers-reduced-motion:reduce){.score-history-spec{animation:none!important}}';
    document.head.appendChild(s);
  }

  function panelTarget() {
    if (code === 'A1') return document.getElementById('modal') && document.getElementById('modal').querySelector('.bg-white, .dark\\:bg-slate-900') || document.getElementById('modal');
    return document.getElementById('result') || document.querySelector('main');
  }
  function renderPanel(suffix, total, points, label) {
    if (!SCORE_PAGES.includes(code)) return;
    var h = loadHistory(suffix, total), target = panelTarget();
    if (!target) return;
    var id = 'scoreHistoryPanel' + (suffix ? '_' + suffix : '');
    var old = document.getElementById(id);
    if (!old) {
      old = document.createElement('div'); old.id = id; old.className = 'score-history-panel'; target.appendChild(old);
    }
    old.innerHTML = '<div class="score-history-title">' + (label || 'Versuchsverlauf') + '</div>' +
      '<div class="score-history-grid">' +
      '<div class="score-history-stat"><span>Erster Versuch</span><strong>' + fmt(h.firstScore,total,points) + '</strong></div>' +
      '<div class="score-history-stat"><span>Zweiter Versuch</span><strong>' + fmt(h.secondScore,total,points) + '</strong></div>' +
      '<div class="score-history-stat"><span>Bester Versuch</span><strong>' + fmt(h.bestScore,total,points) + '</strong></div>' +
      '</div>';
  }

  function pdfFields() {
    if (code === 'A1') {
      var modes = [['einfach','Einfach'],['mittel','Mittel'],['schwer','Schwer'],['ultra','Ultra']], fields = [];
      modes.forEach(function (m) {
        var h = loadHistory(m[0], null);
        if (!h.attempts) return;
        fields.push({label:m[1]+' · Erster Versuch',value:fmt(h.firstScore,null,true)});
        fields.push({label:m[1]+' · Zweiter Versuch',value:fmt(h.secondScore,null,true)});
        fields.push({label:m[1]+' · Bester Versuch',value:fmt(h.bestScore,null,true)});
      });
      return fields;
    }
    var totalMap = {A4:16,A8:15,A9:12,A10:10,A11:5,A12:12,A14:14};
    var total = totalMap[code], h = loadHistory('', total);
    return [
      {label:'Erster Versuch',value:fmt(h.firstScore,total,false)},
      {label:'Zweiter Versuch',value:fmt(h.secondScore,total,false)},
      {label:'Bester Versuch',value:fmt(h.bestScore,total,false)},
      {label:'Bestanden',value:h.passedEver?'Ja':'Nein'}
    ];
  }
  function installPdfHooks() {
    if (!SCORE_PAGES.includes(code)) return;
    try {
      if (typeof downloadTextWorksheetPDF === 'function' && !downloadTextWorksheetPDF.__scoreHistoryWrapped) {
        var originalTextPdf = downloadTextWorksheetPDF;
        var wrappedTextPdf = function (cfg) {
          var fields = pdfFields();
          window.__scoreHistoryPdfPayload = fields;
          cfg = Object.assign({}, cfg || {});
          cfg.sections = (cfg.sections || []).slice();
          cfg.sections.push({heading:'Versuchsverlauf',fields:fields});
          return originalTextPdf(cfg);
        };
        wrappedTextPdf.__scoreHistoryWrapped = true;
        downloadTextWorksheetPDF = wrappedTextPdf;
        try { window.downloadTextWorksheetPDF = wrappedTextPdf; } catch (_) {}
      }
    } catch (_) {}
    try {
      if (typeof downloadCertificatePDF === 'function' && !downloadCertificatePDF.__scoreHistoryWrapped) {
        var originalCertPdf = downloadCertificatePDF;
        var wrappedCertPdf = function (cfg) {
          var fields = pdfFields();
          window.__scoreHistoryPdfPayload = fields;
          cfg = Object.assign({}, cfg || {});
          cfg.blocks = (cfg.blocks || []).slice();
          cfg.blocks.push({type:'table',heading:'Versuchsverlauf',headers:['Messung','Ergebnis'],colWidths:[80,80],rows:fields.map(function(f){return [f.label,f.value];})});
          return originalCertPdf(cfg);
        };
        wrappedCertPdf.__scoreHistoryWrapped = true;
        downloadCertificatePDF = wrappedCertPdf;
        try { window.downloadCertificatePDF = wrappedCertPdf; } catch (_) {}
      }
    } catch (_) {}
  }

  function hideWritingReset() {
    if (!WRITING_PAGES.includes(code)) return;
    document.querySelectorAll('button').forEach(function (b) {
      var text = ((b.getAttribute('title') || '') + ' ' + (b.getAttribute('onclick') || '') + ' ' + (b.textContent || '')).toLowerCase();
      if (text.includes('zurücksetzen') || /reset[a-z0-9_]*(\(|\b)/i.test(text) || text.includes('confirmreset')) b.remove();
    });
  }

  function initA1() {
    if (typeof showSummary !== 'function') return;
    var originalSummary = showSummary;
    showSummary = function () {
      originalSummary();
      var diff = state && state.difficulty || 'einfach';
      record(state && state.points || 0, null, null, diff);
      renderPanel(diff, null, true, 'Versuchsverlauf · ' + diff.charAt(0).toUpperCase() + diff.slice(1));
    };
    confirmReset = function () {
      if (!confirm('Aktuelle Memory-Runde neu starten? Deine Versuchshistorie bleibt erhalten.')) return;
      if (typeof modalEl !== 'undefined' && modalEl) modalEl.classList.add('hidden');
      restartGame();
    };
  }

  function initA4() {
    if (typeof endQuiz !== 'function') return;
    var originalEnd = endQuiz;
    endQuiz = function () {
      originalEnd();
      record(correctCount, TOTAL_QUESTIONS, MIN_CORRECT_TO_PASS, '');
      renderPanel('', TOTAL_QUESTIONS, false);
    };
    confirmReset = function () {
      if (!confirm('Aktuellen Test neu starten? Erster, zweiter und bester Versuch bleiben erhalten.')) return;
      var modal = document.getElementById('modal'); if (modal) modal.classList.add('hidden');
      startQuiz();
    };
    renderPanel('', TOTAL_QUESTIONS, false);
  }

  function initSimpleQuest(opts) {
    var dirty = false;
    var originalAnswer = opts.getAnswer();
    opts.setAnswer(function () { dirty = true; return originalAnswer.apply(this, arguments); });
    var originalFinish = opts.getFinish();
    opts.setFinish(function () {
      var shouldRecord = dirty, currentScore = opts.score();
      var out = originalFinish.apply(this, arguments);
      if (shouldRecord) {
        record(currentScore, opts.total(), opts.pass(), '');
        dirty = false;
      }
      renderPanel('', opts.total(), false);
      return out;
    });
    opts.setReset(function () {
      if (!confirm('Aktuelle Runde neu starten? Erster, zweiter und bester Versuch bleiben erhalten.')) return;
      dirty = false;
      opts.restart();
      renderPanel('', opts.total(), false);
    });
    renderPanel('', opts.total(), false);
  }

  function initA8() {
    initSimpleQuest({
      getAnswer:function(){return answer},setAnswer:function(f){answer=f},
      getFinish:function(){return finish},setFinish:function(f){finish=f},
      score:function(){return firstTryCorrect},total:function(){return ITEMS.length},pass:function(){return PDF_MIN},
      setReset:function(f){resetA8=f},restart:function(){clearAuto();startFullRound()}
    });
  }
  function initA9() {
    initSimpleQuest({
      getAnswer:function(){return answer},setAnswer:function(f){answer=f},
      getFinish:function(){return finish},setFinish:function(f){finish=f},
      score:function(){return score},total:function(){return TOTAL},pass:function(){return PASS},
      setReset:function(f){resetA9=f},restart:function(){clearAuto();startRound()}
    });
  }
  function initA10() {
    initSimpleQuest({
      getAnswer:function(){return answer},setAnswer:function(f){answer=f},
      getFinish:function(){return finish},setFinish:function(f){finish=f},
      score:function(){return score},total:function(){return TOTAL},pass:function(){return PASS},
      setReset:function(f){resetA10=f},restart:function(){clearAuto();startRound()}
    });
  }
  function initA14() {
    initSimpleQuest({
      getAnswer:function(){return answer},setAnswer:function(f){answer=f},
      getFinish:function(){return finishRound},setFinish:function(f){finishRound=f},
      score:function(){return score},total:function(){return TOTAL},pass:function(){return PASS},
      setReset:function(f){resetA14=f},restart:function(){clearTimer();startRound()}
    });
  }

  function initA11() {
    if (typeof CASES === 'undefined' || typeof render !== 'function') return;
    var score = 0;
    var work = null;
    try { work = JSON.parse(localStorage.getItem(workKey()) || 'null'); } catch (_) {}
    if (work) score = Math.max(0, Math.min(CASES.length, Number(work.score) || 0));
    var history = loadHistory('', CASES.length);
    var nativeSave = save;
    save = function () {
      nativeSave();
      try {
        var d = JSON.parse(localStorage.getItem(K) || '{}') || {};
        d.completed = completed.slice();
        d.done = completed.slice();
        d.score = score;
        var h = loadHistory('', CASES.length);
        if (h.bestScore !== null) d.bestScore = h.bestScore;
        localStorage.setItem(K, JSON.stringify(d));
      } catch (_) {}
    };
    var resumeCompleted = false;
    var showSavedResult = false;
    if (work && work.active) {
      if (Array.isArray(work.done)) completed = work.done.filter(function(id){return CASES.some(function(c){return c.id===id})});
      var beforeResume = index;
      while (index < CASES.length && completed.includes(CASES[index].id)) index++;
      if (index >= CASES.length && completed.length >= CASES.length) resumeCompleted = true;
      else if (index !== beforeResume) { render(); save(); }
    } else if (work && work.active === false && history.attempts && index >= CASES.length) {
      showSavedResult = true;
    } else if (!history.attempts && index >= CASES.length) {
      index = 0; completed = []; score = 0;
    }

    function saveWork(active) {
      localStorage.setItem(workKey(), JSON.stringify({version:1,active:active !== false,index:index,score:score,done:completed.slice()}));
    }
    function highlightCorrect(caseObj) {
      var correct = document.querySelector('.device-card[data-id="' + caseObj.correct + '"]');
      if (!correct) return;
      correct.classList.add('correct','score-history-correct');
      var map = {
        school:['Gewicht','Akku / Strom'],
        gaming:['RAM','Speicher','Grafik'],
        creator:['RAM','Speicher','Grafik','Display'],
        pen:['Display','Gewicht','Akku / Strom'],
        schoolfinal:['Gewicht','Akku / Strom']
      };
      var labels = map[caseObj.id] || [];
      correct.querySelectorAll('.spec-item').forEach(function (item) {
        var label = item.querySelector('.spec-label');
        if (label && labels.includes(label.textContent.trim())) item.classList.add('score-history-spec');
      });
    }

    choose = function (id, button) {
      if (answered || !dialogueOpen) return;
      var c = CASES[index], ok = id === c.correct;
      answered = true;
      if (ok) score += 1;
      if (!completed.includes(c.id)) completed.push(c.id);
      document.querySelectorAll('.device-card').forEach(function (b) {
        b.disabled = true;
        if (b.dataset.id !== c.correct && b !== button) b.classList.add('dim');
        if (!ok && b === button) b.classList.add('wrong');
      });
      highlightCorrect(c);
      $('feedback').innerHTML = '<div class="feedback-box ' + (ok?'good':'bad') + '"><i class="fa-solid ' + (ok?'fa-circle-check':'fa-lightbulb') + ' text-lg"></i><span><strong>' + (ok?'Richtig.':'Nicht ganz. Die richtige Empfehlung ist grün markiert.') + '</strong> ' + c.why + '</span></div>';
      $('nextBtn').innerHTML = index===CASES.length-1 ? 'Schicht abschliessen <i class="fa-solid fa-check"></i>' : 'Nächste Kundschaft <i class="fa-solid fa-arrow-right"></i>';
      $('nextBtn').classList.add('show');
      save(); saveWork(true); updateProgress();
    };

    updateProgress = function () {
      var p = Math.round(completed.length/CASES.length*100), b = $('pdf'), h = loadHistory('', CASES.length);
      $('pct').textContent = p + '% bearbeitet'; $('bar').style.width = p + '%';
      var unlocked = h.bestScore !== null && h.bestScore >= 3;
      b.className = unlocked ? 'w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'w-10 h-10 rounded-xl bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600';
      b.innerHTML = unlocked ? '<i class="fa-solid fa-file-pdf"></i>' : '<i class="fa-solid fa-lock"></i>';
      b.title = unlocked ? 'PDF frei · Best ' + h.bestScore + '/5' : 'PDF ab 3/5';
    };

    function showA11Result(h) {
      $('playArea').classList.add('hidden'); $('result').classList.remove('hidden');
      $('customer').classList.add('leave'); $('speech').classList.remove('open');
      var result = $('result');
      var title = result.querySelector('h2'); if (title) title.textContent = score >= 3 ? 'Quest bestanden.' : 'Noch nicht bestanden.';
      var desc = result.querySelector('p'); if (desc) desc.textContent = score >= 3 ? 'Du hast Kundenbedürfnisse und technische Daten sinnvoll verknüpft.' : 'Nutze die hervorgehobenen technischen Angaben und starte eine neue Runde.';
      var big = result.querySelector('.text-5xl'); if (big) big.textContent = score + ' / 5';
      var small = big && big.nextElementSibling; if (small) small.textContent = 'im ersten Klick richtig · Best ' + (h.bestScore == null ? '–' : h.bestScore) + ' / 5';
      updateProgress(); renderPanel('', CASES.length, false);
    }

    finish = function () {
      index = CASES.length;
      var h = record(score, CASES.length, 3, '');
      saveWork(false);
      showA11Result(h);
      save();
    };

    startOver = function () {
      index = 0; completed = []; answered = false; dialogueOpen = false; score = 0;
      saveWork(true); render(); save(); renderPanel('', CASES.length, false);
    };
    resetA11 = function () {
      if (!confirm('Aktuelle Beratungsrunde neu starten? Deine Versuchshistorie bleibt erhalten.')) return;
      startOver();
    };
    makePdf = function () {
      var h = loadHistory('', CASES.length);
      if (h.bestScore === null || h.bestScore < 3) return alert('PDF ab mindestens 3 von 5 richtigen Empfehlungen.');
      downloadTextWorksheetPDF({title:'A11 · Kaufberatung im Tech Shop',filenamePrefix:'A11_Kaufberatung',sections:CASES.map(function(c){return {heading:({school:'Schule & Mobilität',gaming:'Gaming & Aufrüstbarkeit',creator:'Videoschnitt & Kreativarbeit',pen:'2-in-1 & Stift',schoolfinal:'Finale · Schulnotebooks'})[c.id]||c.id,fields:[{label:'Empfehlung',value:c.options.find(function(o){return o.id===c.correct}).name},{label:'Warum?',value:c.why}]};})});
    };
    if (resumeCompleted) { finish(); return; }
    if (showSavedResult) { showA11Result(history); return; }
    if (!work) score = 0;
    renderPanel('', CASES.length, false); updateProgress();
  }

  function initA12() {
    if (typeof C === 'undefined') return;
    var PASS12 = C.length; // Preserve the existing 12/12 PDF requirement.
    var score12 = 0, answeredIds = [], choices = {}, active = true;
    var savedWork = null;
    try { savedWork = JSON.parse(localStorage.getItem(workKey()) || 'null'); } catch (_) {}
    if (savedWork) {
      score12 = Number(savedWork.score) || 0;
      answeredIds = Array.isArray(savedWork.answeredIds) ? savedWork.answeredIds.filter(function(id){return C.some(function(x){return x.id===id})}) : [];
      choices = savedWork.choices || {};
      active = savedWork.active !== false;
    }
    function save12() {
      localStorage.setItem(workKey(), JSON.stringify({version:1,active:active,score:score12,answeredIds:answeredIds,choices:choices,lastScore:score12}));
      localStorage.setItem(K, JSON.stringify({version:3,choices:choices,score:score12,answeredIds:answeredIds}));
    }
    function applyCard(x, value) {
      var card = $('card_'+x.id), fb = $('fb_'+x.id), ok = value === x.category;
      if (!card || !fb) return;
      card.classList.remove('ok','bad');
      if (ok) { card.classList.add('ok'); fb.innerHTML='<i class="fa-solid fa-circle-check mr-1"></i> Richtig zugeordnet.'; fb.className='feedback text-emerald-600 dark:text-emerald-400'; }
      else { card.classList.add('bad'); fb.innerHTML='<i class="fa-solid fa-lightbulb mr-1"></i> Richtig wäre <strong>'+LABEL[x.category]+'</strong>.'; fb.className='feedback text-amber-600 dark:text-amber-400'; }
    }
    function update12() {
      var answered = answeredIds.length, p = Math.round(answered/C.length*100), h = loadHistory('', C.length), b = $('pdf');
      $('pct').textContent = p+'% bearbeitet'; $('bar').style.width=p+'%'; $('score').innerHTML='<i class="fa-solid fa-bullseye text-onedrive-500"></i>'+score12+' / '+C.length+' richtig';
      var unlocked = h.bestScore !== null && h.bestScore >= PASS12;
      b.className = unlocked?'w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20':'w-10 h-10 rounded-xl bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600';
      b.innerHTML=unlocked?'<i class="fa-solid fa-file-pdf"></i>':'<i class="fa-solid fa-lock"></i>'; b.title=unlocked?'PDF frei · Best '+h.bestScore+'/'+C.length:'PDF nach 12/12';
    }
    function showResult12(finalScore) {
      var result = $('result'); if (!result) return;
      result.classList.remove('hidden');
      var h2=result.querySelector('h2'); if(h2)h2.textContent=finalScore+' / '+C.length+' im ersten Klick richtig.';
      var p=result.querySelector('p'); if(p)p.textContent=finalScore>=PASS12?'Perfekt zugeordnet. Das PDF ist freigeschaltet.':'Die falschen Zuordnungen wurden erklärt. Starte eine neue Runde und verbessere deinen Bestwert.';
      var status=$('pdfStatus'),h=loadHistory('',C.length); if(status){status.innerHTML=h.bestScore>=PASS12?'<i class="fa-solid fa-file-pdf"></i> PDF freigeschaltet · Best '+h.bestScore+'/'+C.length:'<i class="fa-solid fa-lock"></i> PDF nach 12/12 · Best '+(h.bestScore==null?'–':h.bestScore)+'/'+C.length;}
      if(!document.getElementById('a12Repeat')){var btn=document.createElement('button');btn.id='a12Repeat';btn.type='button';btn.className='mt-5 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 font-black';btn.innerHTML='<i class="fa-solid fa-rotate-right mr-1"></i> Ganze Runde nochmals';btn.onclick=resetA12;result.appendChild(btn);}
      renderPanel('',C.length,false);
    }
    function start12() {
      score12=0;answeredIds=[];choices={};active=true;$('result').classList.add('hidden');
      C.forEach(function(x){var e=$('choice_'+x.id);if(e){e.value='';e.disabled=false;}var card=$('card_'+x.id);if(card)card.classList.remove('ok','bad');var fb=$('fb_'+x.id);if(fb){fb.textContent='';fb.className='feedback';}});
      save12();update12();
    }
    // Replace the old retry-until-correct select listeners by cloning the selects.
    C.forEach(function(x){
      var old=$('choice_'+x.id);if(!old)return;var e=old.cloneNode(true);old.replaceWith(e);
      var prior=choices[x.id]||'';e.value=prior;
      if(answeredIds.includes(x.id)){e.disabled=true;applyCard(x,prior);}
      e.addEventListener('change',function(){
        if(!active||answeredIds.includes(x.id)||!e.value)return;
        choices[x.id]=e.value;answeredIds.push(x.id);e.disabled=true;if(e.value===x.category)score12++;applyCard(x,e.value);save12();update12();
        if(answeredIds.length===C.length){active=false;record(score12,C.length,PASS12,'');save12();showResult12(score12);update12();}
      });
    });
    resetA12=function(){if(!confirm('Aktuelle Sortierrunde neu starten? Deine Versuchshistorie bleibt erhalten.'))return;start12();renderPanel('',C.length,false)};
    makePdf=function(){var h=loadHistory('',C.length);if(h.bestScore===null||h.bestScore<PASS12)return alert('PDF erst ab einem Bestwert von 12/12.');downloadTextWorksheetPDF({title:'A12 · Schnittstellen sortieren',filenamePrefix:'A12_Schnittstellen',sections:[{heading:'Sortierung',fields:C.map(function(x){return{label:x.name,value:LABEL[x.category]}})}]})};
    if(!savedWork){start12();}else if(!active&&answeredIds.length===C.length){showResult12(score12);}else{update12();}
    renderPanel('',C.length,false);
  }

  function exposeForTests() {
    window.__getScoreHistory = function (suffix, total) { return loadHistory(suffix || '', total); };
    window.__scoreHistoryPage = code;
  }

  function init() {
    injectStyle(); hideWritingReset(); exposeForTests();
    if (!SCORE_PAGES.includes(code)) return;
    installPdfHooks();
    try {
      if(code==='A1')initA1(); else if(code==='A4')initA4(); else if(code==='A8')initA8(); else if(code==='A9')initA9(); else if(code==='A10')initA10(); else if(code==='A11')initA11(); else if(code==='A12')initA12(); else if(code==='A14')initA14();
    } catch (err) { console.error('[score-history]', code, err); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){setTimeout(init,0)});
  else setTimeout(init,0);
})();
