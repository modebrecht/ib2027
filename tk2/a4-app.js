(function(){
  'use strict';

  var STORAGE_KEY='tk_a4_progress_v1';
  var GROUP_META={
    'Dokument & Programm':{icon:'📄',title:'Dokument & Programm',desc:'Neue Dokumente und Programmfenster'},
    'Browser-Tabs':{icon:'🗂️',title:'Browser-Tabs',desc:'Tabs öffnen, schliessen und wiederherstellen'},
    'Im Browser navigieren':{icon:'🌐',title:'Im Browser navigieren',desc:'Seiten aktualisieren, Adressen und Tabs direkt ansteuern'}
  };
  var META={q:8,name:'Programme & Browser',theme:{accent:'#06b6d4',rgb:'6,182,212'},lesson:[
    {group:'Dokument & Programm',title:'Neues Dokument',keys:'Ctrl + N',desc:'Ein neues Dokument oder – je nach Programm – ein neues Fenster wird geöffnet.',remember:'N steht für „New“: Du startest etwas Neues.',mode:'newDoc',flow:['Programm geöffnet','Ctrl + N','Neues Dokument']},
    {group:'Browser-Tabs',title:'Neuen Tab öffnen',keys:'Ctrl + T',desc:'Im Browser öffnet sich sofort eine neue Registerkarte.',remember:'T steht für „Tab“.',mode:'newTab',flow:['Browser geöffnet','Ctrl + T','Neuer Tab']},
    {group:'Browser-Tabs',title:'Aktuellen Tab schliessen',keys:'Ctrl + W',desc:'Die aktuell ausgewählte Browser-Registerkarte wird geschlossen.',remember:'Nur der aktuelle Tab verschwindet – nicht der ganze Browser.',mode:'closeTab',flow:['Aktiver Tab','Ctrl + W','Tab schliesst']},
    {group:'Browser-Tabs',title:'Geschlossenen Tab zurückholen',keys:'Ctrl + Shift + T',desc:'Der zuletzt geschlossene Browser-Tab wird wieder geöffnet.',remember:'Sehr praktisch, wenn du einen Tab aus Versehen geschlossen hast.',mode:'reopenTab',flow:['Tab geschlossen','Ctrl + Shift + T','Tab wieder da']},
    {group:'Im Browser navigieren',title:'Webseite aktualisieren',keys:'F5',desc:'Die aktuelle Webseite wird neu geladen.',remember:'Nutze F5, wenn eine Seite veraltet aussieht oder nicht richtig geladen hat.',mode:'refresh',flow:['Webseite','F5','Neu geladen']},
    {group:'Im Browser navigieren',title:'Adressleiste markieren',keys:'Ctrl + L',desc:'Die komplette Adresse im Browser wird markiert, damit du sofort eine neue eingeben kannst.',remember:'Nach Ctrl + L kannst du direkt lostippen.',mode:'addressBar',flow:['Webseite','Ctrl + L','Adresse markiert']},
    {group:'Im Browser navigieren',title:'Zum nächsten Tab wechseln',keys:'Ctrl + Tab',desc:'Der Browser wechselt zur nächsten geöffneten Registerkarte.',remember:'Wie beim Durchblättern: Ctrl + Tab geht einen Tab weiter.',mode:'nextTab',flow:['Tab 1 aktiv','Ctrl + Tab','Tab 2 aktiv']},
    {group:'Im Browser navigieren',title:'Zum vorherigen Tab wechseln',keys:'Ctrl + Shift + Tab',desc:'Der Browser wechselt zur vorherigen geöffneten Registerkarte.',remember:'Shift dreht die Richtung von Ctrl + Tab um.',mode:'prevTab',flow:['Tab 2 aktiv','Ctrl + Shift + Tab','Tab 1 aktiv']}
  ]};

  var DATA=[
    {text:'Du möchtest in Word ein neues Dokument erstellen.',correct:'Ctrl + N',wrong:['Ctrl + T','Ctrl + W']},
    {text:'Du willst im Browser einen neuen Tab öffnen.',correct:'Ctrl + T',wrong:['Ctrl + N','Ctrl + Shift + T']},
    {text:'Du willst den aktuellen Browser-Tab schliessen.',correct:'Ctrl + W',wrong:['Alt + Tab','Ctrl + T']},
    {text:'Du hast einen Browser-Tab versehentlich geschlossen und willst ihn zurückholen.',correct:'Ctrl + Shift + T',wrong:['Ctrl + T','Ctrl + Shift + N']},
    {text:'Du möchtest eine Webseite aktualisieren.',correct:'F5',wrong:['Ctrl + F','Win + D']},
    {text:'Du möchtest sofort die Adresse der aktuellen Webseite markieren.',correct:'Ctrl + L',wrong:['Ctrl + F','Ctrl + T']},
    {text:'Du möchtest zum nächsten geöffneten Browser-Tab wechseln.',correct:'Ctrl + Tab',wrong:['Alt + Tab','Ctrl + T']},
    {text:'Du möchtest zum vorherigen geöffneten Browser-Tab wechseln.',correct:'Ctrl + Shift + Tab',wrong:['Ctrl + Tab','Ctrl + Shift + T']}
  ];

  var fresh=false,theoryRendered=false,theoryController=null;
  function byId(id){return document.getElementById(id);}
  function shuffle(arr){return arr.map(function(v){return{v:v,s:Math.random()};}).sort(function(a,b){return a.s-b.s;}).map(function(o){return o.v;});}
  function loadProgress(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch(e){return{};}}
  function attemptCount(entry){if(!entry)return 0;if(typeof entry.attempts==='number')return entry.attempts;return typeof entry.first==='number'?1:0;}
  function scoreColor(p){return p>=80?'var(--accent-green)':p>=50?'var(--accent-amber)':'var(--accent-red)';}
  function flowHtml(flow){return flow.map(function(part,index){return(index?'<b>→</b>':'')+'<span>'+part+'</span>';}).join('');}
  function keyHtml(keys){return keys.split(' + ').map(function(key){return '<kbd>'+key+'</kbd>';}).join('<span class="lesson-plus">+</span>');}

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
  }

  function renderTheory(){
    if(theoryRendered)return;
    theoryRendered=true;
    theoryController=window.tk2TheoryCards.mount({
      grid:'q8TheoryGrid',
      groups:GROUP_META,
      items:META.lesson,
      accent:META.theme.accent,
      rgb:META.theme.rgb,
      accentText:'#67e8f9',
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
    var selects=Array.from(byId('q8Questions').querySelectorAll('select')),answered=selects.filter(function(s){return s.value;}).length;
    byId('q8Progress').style.width=(selects.length?answered/selects.length*100:0)+'%';
  }

  function renderQuest(){
    var container=byId('q8Questions'),check=byId('q8CheckBtn'),score=byId('q8Score'),stored=loadProgress().A,completed=!fresh&&stored&&typeof stored.last==='number';
    byId('q8TheoryCard').style.display=fresh?'none':'';
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
    var container=byId('q8Questions'),check=byId('q8CheckBtn'),score=byId('q8Score'),selects=Array.from(container.querySelectorAll('select')),chosen=Array(DATA.length).fill(''),correct=0;
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
    if(typeof saveQuestScore==='function')saveQuestScore('q8',pct);
    var xp=typeof awardQuestImprovementXP==='function'?awardQuestImprovementXP('q8',correct,5):0,saved=loadProgress().A,n=attemptCount(saved);
    score.textContent=correct+' / '+selects.length+' richtig ('+pct+' %) · Durchgang '+n+' · Best '+saved.best+' %'+(xp?' · +'+xp+' XP':'');
    score.style.color=scoreColor(pct);check.textContent=n>=2?'✓ Mindestziel 2/2 erfüllt':'✓ 1/2 erledigt';check.disabled=true;fresh=false;updateCompletion();renderSummary();
  }

  function handleCheck(){var progress=loadProgress().A,alreadyDone=!fresh&&progress&&typeof progress.last==='number';if(alreadyDone)return;evaluate();}
  function updateCompletion(){
    var n=attemptCount(loadProgress().A),active=fresh,repeat=byId('a4SecondPassCard'),done=byId('a4DoneCard'),title=repeat&&repeat.querySelector('h2'),copy=repeat&&repeat.querySelector('p'),button=byId('startSecondPassBtn');
    if(repeat)repeat.style.display=n>=1&&!active?'block':'none';
    if(done)done.style.display=n>=2&&!active?'block':'none';
    if(n===1){
      if(title)title.textContent='Noch ein Durchgang bis zum Mindestziel ↻';
      if(copy)copy.textContent='Bearbeite Quest 8 ein zweites Mal ohne eingeblendete Theorie. Danach ist das Mindestziel 2/2 erfüllt. Du kannst anschliessend beliebig oft weiter üben; nur dein Bestwert zählt.';
      if(button)button.textContent='2. Durchgang starten';
    }else if(n>=2){
      if(title)title.textContent='Weiter üben ↻';
      if(copy)copy.textContent='Mindestziel 2/2 erfüllt. Du kannst Quest 8 beliebig oft wiederholen; für die Fleissnote zählt nur dein Bestwert.';
      if(button)button.textContent=(n+1)+'. Durchgang starten';
      var doneCopy=done&&done.querySelector('p');
      if(doneCopy)doneCopy.textContent='Mindestziel 2/2 erfüllt. Du kannst hier trotzdem beliebig oft weiter üben; für die Fleissnote zählt dein Bestwert. Als Nächstes folgt Windows & Arbeitsalltag in A5.';
    }
  }
  function startSecondPass(){if(attemptCount(loadProgress().A)<1)return;fresh=true;renderQuest();updateCompletion();byId('q8QuestCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function renderSummary(){
    var s=loadProgress().A,host=byId('summaryRows');host.innerHTML='';
    var row=document.createElement('div'),qEl=document.createElement('div'),name=document.createElement('div'),vals=document.createElement('div');
    row.className='summary-row';qEl.className='summary-q';qEl.textContent='Q8';qEl.style.color=META.theme.accent;name.textContent=META.name;vals.className='summary-vals';
    if(!s)vals.textContent='noch offen';else{var parts=['1. '+s.first+' %'];if(typeof s.second==='number')parts.push('2. '+s.second+' %');var n=attemptCount(s);parts.push(n+' '+(n===1?'Durchgang':'Durchgänge'));parts.push('Best '+s.best+' %');vals.textContent=parts.join(' · ');}
    vals.style.color=s?scoreColor(s.best):'var(--text-muted)';row.appendChild(qEl);row.appendChild(name);row.appendChild(vals);host.appendChild(row);
  }
  function scrollTo(id){var el=byId(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}

  byId('toQ8QuestBtn').addEventListener('click',function(){scrollTo('q8QuestCard');});
  byId('q8CheckBtn').addEventListener('click',handleCheck);
  byId('startSecondPassBtn').addEventListener('click',startSecondPass);
  byId('showSummaryBtn').addEventListener('click',function(){renderSummary();byId('overlay').style.display='block';byId('summaryPanel').classList.add('open');});
  byId('closeSummary').addEventListener('click',function(){byId('overlay').style.display='none';byId('summaryPanel').classList.remove('open');});
  byId('overlay').addEventListener('click',function(){byId('overlay').style.display='none';byId('summaryPanel').classList.remove('open');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){byId('overlay').style.display='none';byId('summaryPanel').classList.remove('open');}});

  renderTheory();renderQuest();updateCompletion();renderSummary();
})();