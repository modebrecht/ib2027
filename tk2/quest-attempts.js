(function(){
  'use strict';

  if(window.__tk2QuestAttemptsInitialized)return;
  window.__tk2QuestAttemptsInitialized=true;

  var STORE='tk_quest_attempts_v1';
  var TRACKED=/^q[1-6]$/;

  function read(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}');}
    catch(e){return{};}
  }

  function write(data){localStorage.setItem(STORE,JSON.stringify(data));}

  function record(questId,percentage){
    if(!TRACKED.test(String(questId))||typeof percentage!=='number'||!isFinite(percentage))return;
    var data=read();
    var entry=data[questId]||{attempts:0,first:null,second:null,best:null};
    entry.attempts=(Number(entry.attempts)||0)+1;
    if(entry.attempts===1)entry.first=percentage;
    if(entry.attempts===2)entry.second=percentage;
    entry.best=entry.best===null||entry.best===undefined?percentage:Math.max(Number(entry.best)||0,percentage);
    data[questId]=entry;
    write(data);
  }

  var previousSave=window.saveQuestScore;
  if(typeof previousSave==='function'&&!previousSave.__tk2AttemptsWrapped){
    var wrappedSave=function(questId,percentage){
      record(questId,percentage);
      return previousSave.apply(this,arguments);
    };
    wrappedSave.__tk2AttemptsWrapped=true;
    window.saveQuestScore=wrappedSave;
  }

  function formattedScores(){
    var base=typeof window.__tk2OriginalGetQuestScores==='function'?window.__tk2OriginalGetQuestScores():{};
    var scores=Object.assign({},base||{});
    var attempts=read();
    for(var i=1;i<=6;i++){
      var id='q'+i;
      if(!Object.prototype.hasOwnProperty.call(scores,id))continue;
      var best=Number(scores[id]);
      var entry=attempts[id];
      if(entry&&Number(entry.attempts)>0){
        var parts=[];
        if(typeof entry.first==='number')parts.push('1. Versuch '+entry.first+' %');
        if(Number(entry.attempts)>=2&&typeof entry.second==='number')parts.push('2. Versuch '+entry.second+' %');
        var bestValue=isFinite(best)?best:(typeof entry.best==='number'?entry.best:0);
        parts.push('Best '+bestValue);
        scores[id]=parts.join(' · ');
      }else if(isFinite(best)){
        scores[id]='Best '+best;
      }
    }
    return scores;
  }

  var originalGet=window.getQuestScores;
  if(typeof originalGet==='function')window.__tk2OriginalGetQuestScores=originalGet;

  document.addEventListener('click',function(event){
    var trigger=event.target&&event.target.closest&&event.target.closest('#pdf-module-btn,.tk2-pdf-action');
    if(!trigger||typeof originalGet!=='function')return;
    window.getQuestScores=formattedScores;
    setTimeout(function(){window.getQuestScores=originalGet;},0);
  },true);
})();
