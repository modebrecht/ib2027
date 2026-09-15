(function(){
  'use strict';

  var STORAGE_KEY='tk_a5_progress_v1';
  var GROUP_META={
    'Schnellzugriff':{icon:'⚡',title:'Schnellzugriff',desc:'Windows-Funktionen sofort öffnen oder anzeigen'},
    'Programme & Werkzeuge':{icon:'🧰',title:'Programme & Werkzeuge',desc:'Zwischen Programmen wechseln und wichtige Werkzeuge direkt öffnen'},
    'Fenster anordnen':{icon:'🪟',title:'Fenster anordnen',desc:'Fenster schliessen, andocken, maximieren und minimieren'}
  };
  var META={q:9,name:'Windows & Arbeitsalltag',theme:{accent:'#3b82f6',rgb:'59,130,246'},lesson:[
    {group:'Schnellzugriff',title:'Computer sperren',keys:'Win + L',desc:'Der Computer wird sofort gesperrt, ohne Programme oder Dokumente zu schliessen.',remember:'L steht für „Lock“ – praktisch, sobald du deinen Platz verlässt.',mode:'lock',flow:['Desktop','Win + L','Gesperrt']},
    {group:'Schnellzugriff',title:'Desktop anzeigen',keys:'Win + D',desc:'Alle offenen Fenster werden ausgeblendet und der Desktop wird sichtbar.',remember:'Noch einmal Win + D bringt die Fenster wieder zurück.',mode:'desktop',flow:['Fenster offen','Win + D','Desktop sichtbar']},
    {group:'Schnellzugriff',title:'Datei-Explorer öffnen',keys:'Win + E',desc:'Der Datei-Explorer öffnet sich direkt.',remember:'E erinnert an „Explorer“.',mode:'explorer',flow:['Desktop','Win + E','Explorer']},
    {group:'Schnellzugriff',title:'Bildschirmausschnitt aufnehmen',keys:'Win + Shift + S',desc:'Das Bildschirmfoto-Werkzeug erscheint und du kannst einen Bereich auswählen.',remember:'Du bestimmst selbst, welcher Teil des Bildschirms aufgenommen wird.',mode:'snip',flow:['Bildschirm','Win + Shift + S','Ausschnitt wählen']},
    {group:'Programme & Werkzeuge',title:'Zwischen Programmen wechseln',keys:'Alt + Tab',desc:'Eine Übersicht der geöffneten Programme erscheint und du wechselst zum nächsten Fenster.',remember:'Alt gedrückt halten und mit Tab durch die offenen Programme wechseln.',mode:'appSwitch',flow:['Word aktiv','Alt + Tab','Browser aktiv']},
    {group:'Programme & Werkzeuge',title:'Task-Manager öffnen',keys:'Ctrl + Shift + Esc',desc:'Der Task-Manager öffnet sich direkt, zum Beispiel wenn ein Programm nicht mehr reagiert.',remember:'Direkter als der Umweg über Ctrl + Alt + Del.',mode:'taskManager',flow:['Programm hängt','Ctrl + Shift + Esc','Task-Manager']},
    {group:'Programme & Werkzeuge',title:'Zwischenablageverlauf öffnen',keys:'Win + V',desc:'Der Verlauf deiner zuletzt kopierten Inhalte wird eingeblendet.',remember:'Win + V zeigt mehr als nur den zuletzt kopierten Inhalt.',mode:'clipboard',flow:['Mehrfach kopiert','Win + V','Zwischenablage']},
    {group:'Programme & Werkzeuge',title:'Aktives Fenster schliessen',keys:'Alt + F4',desc:'Das aktuell aktive Fenster oder Programm wird geschlossen.',remember:'Alt + F4 betrifft das aktive Fenster – nicht automatisch den ganzen Computer.',mode:'closeWindow',flow:['Fenster aktiv','Alt + F4','Fenster geschlossen']},
    {group:'Fenster anordnen',title:'Fenster links andocken',keys:'Win + ←',desc:'Das aktive Fenster wird auf der linken Bildschirmhälfte angeordnet.',remember:'Ideal, wenn du zwei Fenster nebeneinander brauchst.',mode:'snapLeft',flow:['Fenster frei','Win + ←','Links angedockt']},
    {group:'Fenster anordnen',title:'Fenster rechts andocken',keys:'Win + →',desc:'Das aktive Fenster wird auf der rechten Bildschirmhälfte angeordnet.',remember:'Win + ← und Win + → sind ein Paar für geteilte Ansichten.',mode:'snapRight',flow:['Fenster frei','Win + →','Rechts angedockt']},
    {group:'Fenster anordnen',title:'Fenster maximieren',keys:'Win + ↑',desc:'Das aktive Fenster wird auf die maximale Bildschirmgrösse vergrössert.',remember:'Pfeil nach oben = Fenster gross machen.',mode:'maximize',flow:['Fenster normal','Win + ↑','Maximiert']},
    {group:'Fenster anordnen',title:'Fenster verkleinern oder minimieren',keys:'Win + ↓',desc:'Das aktive Fenster wird verkleinert oder – je nach Ausgangszustand – minimiert.',remember:'Pfeil nach unten ist das Gegenstück zu Win + ↑.',mode:'minimize',flow:['Fenster maximiert','Win + ↓','Verkleinert / minimiert']}
  ]};

  var DATA=[
    {text:'Du verlässt deinen Platz kurz und möchtest den Computer sperren.',correct:'Win + L',wrong:['Ctrl + L','Win + D']},
    {text:'Du möchtest schnell den Desktop anzeigen.',correct:'Win + D',wrong:['Win + E','Alt + Tab']},
    {text:'Du möchtest den Datei-Explorer öffnen.',correct:'Win + E',wrong:['Ctrl + E','Win + D']},
    {text:'Du möchtest nur einen Ausschnitt des Bildschirms aufnehmen.',correct:'Win + Shift + S',wrong:['Win + S','Taste Printscreen (Prt Scr)']},
    {text:'Du möchtest zwischen geöffneten Programmen wechseln.',correct:'Alt + Tab',wrong:['Ctrl + Tab','Win + D']},
    {text:'Ein Programm hängt. Du möchtest den Task-Manager direkt öffnen.',correct:'Ctrl + Shift + Esc',wrong:['Ctrl + Alt + Del','Alt + F4']},
    {text:'Du möchtest den Verlauf deiner kopierten Inhalte öffnen.',correct:'Win + V',wrong:['Ctrl + V','Win + C']},
    {text:'Du möchtest das aktuell geöffnete Fenster oder Programm schliessen.',correct:'Alt + F4',wrong:['Ctrl + W','Win + L']},
    {text:'Du möchtest das aktuelle Fenster auf der linken Bildschirmhälfte andocken.',correct:'Win + ←',wrong:['Win + →','Win + D']},
    {text:'Du möchtest das aktuelle Fenster auf der rechten Bildschirmhälfte andocken.',correct:'Win + →',wrong:['Win + ←','Win + D']},
    {text:'Du möchtest das aktuelle Fenster maximieren.',correct:'Win + ↑',wrong:['Win + ↓','Win + →']},
    {text:'Du möchtest das aktuelle Fenster verkleinern oder minimieren.',correct:'Win + ↓',wrong:['Win + ↑','Win + D']}
  ];

  var fresh=false,theoryRendered=false,theoryController=null;
  function byId(id){return document.getElementById(id);}
  function shuffle(arr){return arr.map(function(v){return{v:v,s:Math.random()};}).sort(function(a,b){return a.s-b.s;}).map(function(o){return o.v;});}
  function loadProgress(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch(e){return{};}}
  function attemptCount(entry){if(!entry)return 0;if(typeof entry.attempts==='number')return entry.attempts;return typeof entry.first==='number'?1:0;}
  function scoreColor(p){return p>=80?'var(--accent-green)':p>=50?'var(--accent-amber)':'var(--accent-red)';}
  function flowHtml(flow){return flow.map(function(part,index){return(index?'<b>→</b>':'')+'<span>'+part+'</span>';}).join('');}
  function keyHtml(keys){return keys.split(' + ').map(function(key){return '<kbd>'+key+'</kbd>';}).join('<span class="lesson-plus">+</span>');}

  function syncLegacyRootCompletion(){
    var q9=loadProgress().A;if(!q9)return;
    try{
      var a4=JSON.parse(localStorage.getItem('tk_a4_progress_v1')||'{}');
      a4.B={first:q9.first,second:typeof q9.second==='number'?q9.second:null,last:q9.last,best:q9.best,attempts:q9.attempts,compatQuest:9};
      localStorage.setItem('tk_a4_progress_v1',JSON.stringify(a4));
    }catch(e){}
  }

  function saveProgress(pct,answers,correct){
    var data=loadProgress(),old=data.A||{},previous=attemptCount(old),attempts=previous+1;
    data.A={
      first:typeof old.first==='number'?old.first:pct,
      second:typeof old.second==='number'?old.second:(previous===1?pct:null),
      last:pct,
      best:Math.max(typeof old.best==='number'?old.best:0,pct),
      answers:answers,
      lastCorrect:correct,
      attempts:attempts
    };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    syncLegacyRootCompletion();
  }

  function renderTheory(){
    if(theoryRendered)return;
    theoryRendered=true;
    theoryController=window.tk2TheoryCards.mount({
      grid:'q9TheoryGrid',
      groups:GROUP_META,
      items:META.lesson,
      accent:META.theme.accent,
      rgb:META.theme.rgb,
      accentText:'#93c5fd',
      sceneFactory:function(target,item){
        return createA4Scene(target,{mode:item.mode,autoplay:false});
      }
    });
  }

  function showFiftyFifty(select,hint){
    var row=select.parentNode,wrap=document.createElement('div'),note=document.createElement('div'),options=document.createElement('div');
    wrap.className='fifty-wrap';note.className='fifty-note';note.textContent='💡 Eine falsche Antwort wurde entfernt.';options.className='fifty-options';
    Array.from(select.options).filter(function(o){return o.value;}).forEach(function(o){
      var b=document.createElement('button');
      b.type='button';b.className='fifty-option'+(select.value===o.value?' selected':'');b.dataset.value=o.value;b.textContent=o.value;
      b.addEventListener('click',function(){select.value=o.value;options.querySelectorAll('.fifty-option').forEach(function(btn){btn.classList.toggle('selected',btn===b);});select.dispatchEvent(new Event('change',{bubbles:true}));});
      options.appendChild(b);
    });
    wrap.appendChild(note);wrap.appendChild(options);select.style.display='none';row.insertBefore(wrap,hint);
  }

  function updateProgress(){
    var selects=Array.from(byId('q9Questions').querySelectorAll('select')),answered=selects.filter(function(s){return s.value;}).length;
    byId('q9Progress').style.width=(selects.length?answered/selects.length*100:0)+'%';
  }

  function renderQuest(){
    var container=byId('q9Questions'),check=byId('q9CheckBtn'),score=byId('q9Score'),stored=loadProgress().A,completed=!fresh&&stored&&typeof stored.last==='number';
    byId('q9TheoryCard').style.display=fresh?'none':'';
    if(theoryController)theoryController.setActive(!fresh);
    container.innerHTML='';

    var randomized=shuffle(DATA.map(function(q,sourceIndex){return{q:q,sourceIndex:sourceIndex};}));
    randomized.forEach(function(entry,visualIndex){
      var q=entry.q,sourceIndex=entry.sourceIndex;
      var card=document.createElement('div'),title=document.createElement('div'),label=document.createElement('span'),text=document.createElement('span'),select=document.createElement('select'),empty=document.createElement('option'),hint=document.createElement('button'),row=document.createElement('div'),fb=document.createElement('div');
      card.className='question-card';
      card.dataset.sourceIndex=String(sourceIndex);
      title.className='question-title';
      label.className='question-label';label.textContent='Frage '+(visualIndex+1);
      text.className='question-text';text.textContent=q.text;
      title.appendChild(label);title.appendChild(text);
      select.className='answer-select';select.dataset.correct=q.correct;select.dataset.sourceIndex=String(sourceIndex);
      empty.value='';empty.textContent='Bitte wählen …';select.appendChild(empty);
      shuffle([q.correct].concat(q.wrong)).forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;select.appendChild(o);});
      if(!fresh&&stored&&stored.answers&&stored.answers[sourceIndex])select.value=stored.answers[sourceIndex];
      if(completed)select.disabled=true;
      hint.type='button';hint.className='btn-hint';hint.dataset.used='false';
      var xp=typeof getGlobalXP==='function'?getGlobalXP():0;
      hint.textContent=completed?'💡 Tipp':xp<30?'💡 Tipp (-30 XP | Zu wenig XP)':'💡 Tipp (-30 XP)';
      hint.disabled=completed||xp<30;
      hint.addEventListener('click',function(){
        if(hint.disabled||hint.dataset.used==='true')return;
        var now=typeof getGlobalXP==='function'?getGlobalXP():0;
        if(now<30){hint.disabled=true;return;}
        var wrong=Array.from(select.options).filter(function(o){return o.value&&o.value!==q.correct&&o.value!==select.value;});
        if(!wrong.length)wrong=Array.from(select.options).filter(function(o){return o.value&&o.value!==q.correct;});
        if(!wrong.length)return;
        wrong[Math.floor(Math.random()*wrong.length)].remove();
        if(typeof addGlobalXP==='function')addGlobalXP(-30);
        if(typeof playSound==='function')playSound('hint');
        hint.dataset.used='true';hint.textContent='💡 Tipp genutzt (-30 XP)';hint.disabled=true;showFiftyFifty(select,hint);
      });
      row.className='answer-row';row.appendChild(select);row.appendChild(hint);
      fb.className='q-feedback';
      select.addEventListener('change',function(){select.classList.remove('correct','wrong');fb.classList.remove('show');updateProgress();});
      card.appendChild(title);card.appendChild(row);card.appendChild(fb);container.appendChild(card);
    });

    if(completed){
      var c=typeof stored.lastCorrect==='number'?stored.lastCorrect:Math.round(stored.last/100*DATA.length),n=attemptCount(stored);
      score.textContent='Letzter Versuch: '+c+' / '+DATA.length+' richtig ('+stored.last+' %) · Durchgang '+n+' · Best '+stored.best+' %';
      score.style.color=scoreColor(stored.last);check.textContent=n>=2?'✓ Mindestziel 2/2 erfüllt':'✓ 1/2 erledigt';check.disabled=true;
    }else{
      var nextAttempt=attemptCount(stored)+1;
      score.textContent=(fresh?nextAttempt+'. Durchgang: ':'')+'0 / '+DATA.length+' richtig';
      score.style.color='var(--text-muted)';check.textContent='✅ Überprüfen';check.disabled=false;
    }
    updateProgress();
  }

  function evaluate(){
    var container=byId('q9Questions'),check=byId('q9CheckBtn'),score=byId('q9Score'),selects=Array.from(container.querySelectorAll('select')),chosen=Array(DATA.length).fill(''),correct=0;
    selects.forEach(function(sel){
      var card=sel.closest('.question-card'),fb=card.querySelector('.q-feedback'),hint=card.querySelector('.btn-hint'),buttons=card.querySelectorAll('.fifty-option'),c=sel.dataset.correct,sourceIndex=Number(sel.dataset.sourceIndex);
      chosen[sourceIndex]=sel.value||'';
      sel.classList.remove('correct','wrong');
      buttons.forEach(function(b){b.disabled=true;b.classList.remove('correct','wrong');});
      if(sel.value&&sel.value===c){
        correct++;sel.classList.add('correct');
        buttons.forEach(function(b){if(b.dataset.value===c)b.classList.add('correct');});
        fb.innerHTML='<span style="color:var(--accent-green)">✅ Richtig</span>';
      }else if(sel.value){
        sel.classList.add('wrong');
        buttons.forEach(function(b){if(b.dataset.value===sel.value)b.classList.add('wrong');if(b.dataset.value===c)b.classList.add('correct');});
        fb.innerHTML='<span style="color:var(--accent-red)">❌ Falsch</span><span style="color:var(--text-muted)">Richtig wäre:</span>';
        var k=document.createElement('kbd');k.textContent=c;fb.appendChild(k);
      }else{
        sel.classList.add('wrong');fb.innerHTML='<span style="color:var(--accent-amber)">⚠️ Keine Antwort</span>';
      }
      fb.classList.add('show');sel.disabled=true;hint.disabled=true;
    });
    var pct=Math.round(correct/selects.length*100);
    saveProgress(pct,chosen,correct);
    if(typeof saveQuestScore==='function')saveQuestScore('q9',pct);
    var xp=typeof awardQuestImprovementXP==='function'?awardQuestImprovementXP('q9',correct,5):0,saved=loadProgress().A,n=attemptCount(saved);
    score.textContent=correct+' / '+selects.length+' richtig ('+pct+' %) · Durchgang '+n+' · Best '+saved.best+' %'+(xp?' · +'+xp+' XP':'');
    score.style.color=scoreColor(pct);check.textContent=n>=2?'✓ Mindestziel 2/2 erfüllt':'✓ 1/2 erledigt';check.disabled=true;fresh=false;updateCompletion();renderSummary();
  }

  function handleCheck(){var progress=loadProgress().A,alreadyDone=!fresh&&progress&&typeof progress.last==='number';if(alreadyDone)return;evaluate();}
  function updateCompletion(){
    var n=attemptCount(loadProgress().A),active=fresh,repeat=byId('a5SecondPassCard'),done=byId('a5DoneCard'),title=repeat&&repeat.querySelector('h2'),copy=repeat&&repeat.querySelector('p'),button=byId('startSecondPassBtn');
    if(repeat)repeat.style.display=n>=1&&!active?'block':'none';
    if(done)done.style.display=n>=2&&!active?'block':'none';
    if(n===1){
      if(title)title.textContent='Noch ein Durchgang bis zum Mindestziel ↻';
      if(copy)copy.textContent='Bearbeite Quest 9 ein zweites Mal ohne eingeblendete Theorie. Danach ist das Mindestziel 2/2 erfüllt. Du kannst anschliessend beliebig oft weiter üben; nur dein Bestwert zählt.';
      if(button)button.textContent='2. Durchgang starten';
    }else if(n>=2){
      if(title)title.textContent='Weiter üben ↻';
      if(copy)copy.textContent='Mindestziel 2/2 erfüllt. Du kannst Quest 9 beliebig oft wiederholen; für die Fleissnote zählt nur dein Bestwert.';
      if(button)button.textContent=(n+1)+'. Durchgang starten';
      var doneCopy=done&&done.querySelector('p');
      if(doneCopy)doneCopy.textContent='Mindestziel 2/2 erfüllt. Du kannst hier trotzdem beliebig oft weiter üben; für die Fleissnote zählt dein Bestwert. Danach kannst du in A6 alles wiederholen und festigen.';
    }
  }
  function startSecondPass(){if(attemptCount(loadProgress().A)<1)return;fresh=true;renderQuest();updateCompletion();byId('q9QuestCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function renderSummary(){
    var s=loadProgress().A,host=byId('summaryRows');host.innerHTML='';
    var row=document.createElement('div'),qEl=document.createElement('div'),name=document.createElement('div'),vals=document.createElement('div');
    row.className='summary-row';qEl.className='summary-q';qEl.textContent='Q9';qEl.style.color=META.theme.accent;name.textContent=META.name;vals.className='summary-vals';
    if(!s)vals.textContent='noch offen';else{var parts=['1. '+s.first+' %'];if(typeof s.second==='number')parts.push('2. '+s.second+' %');var n=attemptCount(s);parts.push(n+' '+(n===1?'Durchgang':'Durchgänge'));parts.push('Best '+s.best+' %');vals.textContent=parts.join(' · ');}
    vals.style.color=s?scoreColor(s.best):'var(--text-muted)';row.appendChild(qEl);row.appendChild(name);row.appendChild(vals);host.appendChild(row);
  }
  function scrollTo(id){var el=byId(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}

  byId('toQ9QuestBtn').addEventListener('click',function(){scrollTo('q9QuestCard');});
  byId('q9CheckBtn').addEventListener('click',handleCheck);
  byId('startSecondPassBtn').addEventListener('click',startSecondPass);
  byId('showSummaryBtn').addEventListener('click',function(){renderSummary();byId('overlay').style.display='block';byId('summaryPanel').classList.add('open');});
  byId('closeSummary').addEventListener('click',function(){byId('overlay').style.display='none';byId('summaryPanel').classList.remove('open');});
  byId('overlay').addEventListener('click',function(){byId('overlay').style.display='none';byId('summaryPanel').classList.remove('open');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){byId('overlay').style.display='none';byId('summaryPanel').classList.remove('open');}});

  renderTheory();renderQuest();updateCompletion();renderSummary();
})();