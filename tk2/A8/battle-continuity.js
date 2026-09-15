(function () {
  'use strict';

  const STYLE_ID = 'a8BattleContinuityStyles';
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* A8 BATTLE CONTINUITY PASS 2026
       Pre-battle keeps the premium arena-scene. Only the active fight switches
       to the original per-rank SVG battle environments. */
    #battleView .battle-arena > .a8-themed-battle-backdrop {
      position:absolute !important;
      inset:0 !important;
      z-index:0 !important;
      display:block !important;
      pointer-events:none !important;
      background-color:#07101a !important;
      background-size:cover !important;
      background-position:center center !important;
      background-repeat:no-repeat !important;
    }
    #battleView .battle-arena > .a8-themed-battle-backdrop[data-theme='celestial'] {
      background-position:center top !important;
    }

    #battleView .battle-stage-preview .battle-side.hero .a8-arena-weapon {
      top:61% !important;
      bottom:auto !important;
      width:clamp(70px,7.2vw,84px) !important;
      height:clamp(92px,8.6vw,108px) !important;
      transform-origin:50% 10% !important;
    }
    #battleView .battle-stage-preview .battle-side.hero .a8-arena-weapon.weapon-left {
      left:23% !important;
      right:auto !important;
    }
    #battleView .battle-stage-preview .battle-side.hero .a8-arena-weapon.weapon-right {
      right:23% !important;
      left:auto !important;
    }

    #battleView .battle-card.a8-battle-active .battle-arena,
    #battleView #battleArena {
      height:clamp(420px,40vw,520px) !important;
      min-height:420px !important;
      /* One shared visual floor for both fighters and both contact shadows.
         Keeping this as a percentage makes the baseline scale with every SVG arena size. */
      --a8-battle-ground-y:94.5%;
      --a8-battle-ground-bottom:calc(100% - var(--a8-battle-ground-y));
    }
    #battleView .battle-arena .fighter.knight {
      left:21% !important;
      bottom:var(--a8-battle-ground-bottom) !important;
      width:260px !important;
      height:360px !important;
    }
    #battleView .battle-arena .fighter.enemy {
      right:21% !important;
      bottom:var(--a8-battle-ground-bottom) !important;
      width:260px !important;
      height:350px !important;
    }
    #battleView .battle-arena .fighter.knight .fighter-sprite {
      height:clamp(280px,26.88vw,347px) !important;
    }
    #battleView .battle-arena .fighter.enemy .fighter-sprite {
      height:clamp(270px,26vw,335px) !important;
    }
    #battleView .battle-arena .fighter::after {
      display:block !important;
      top:auto !important;
      bottom:0 !important;
      width:184px !important;
      height:28px !important;
      transform:translate(-50%,35%) !important;
    }
    #battleView .battle-arena .fighter-sprite {
      top:auto !important;
      bottom:0 !important;
    }
    #battleView .battle-arena .fighter.knight .battle-weapon-slot {
      width:88px !important;
      height:108px !important;
      bottom:10px !important;
      transform-origin:50% 10% !important;
    }
    #battleView .battle-arena .fighter.knight .battle-weapon-slot.weapon-left {
      left:35px !important;
      right:auto !important;
    }
    #battleView .battle-arena .fighter.knight .battle-weapon-slot.weapon-right {
      right:33px !important;
      left:auto !important;
    }
    #battleView .a8-enemy-item {
      width:88px !important;
      height:88px !important;
      bottom:82px !important;
    }
    #battleView .a8-enemy-item[data-kind='shield'] {
      width:94px !important;
      height:94px !important;
      bottom:102px !important;
    }
    #battleView .a8-enemy-item[data-kind='focus'],
    #battleView .a8-enemy-item[data-kind='heal'] {
      width:60px !important;
      height:60px !important;
      bottom:158px !important;
    }

    @media (max-width:720px) {
      #battleView .battle-stage-preview .battle-side.hero .a8-arena-weapon {
        top:62% !important;
        width:clamp(56px,15vw,70px) !important;
        height:clamp(74px,18vw,90px) !important;
      }
      #battleView .battle-stage-preview .battle-side.hero .a8-arena-weapon.weapon-left { left:19% !important; }
      #battleView .battle-stage-preview .battle-side.hero .a8-arena-weapon.weapon-right { right:19% !important; }
      #battleView .battle-card.a8-battle-active .battle-arena,
      #battleView #battleArena { height:360px !important; min-height:360px !important; }
      #battleView .battle-arena .fighter.knight { left:17% !important; width:196px !important; height:282px !important; }
      #battleView .battle-arena .fighter.enemy { right:17% !important; width:196px !important; height:270px !important; }
      #battleView .battle-arena .fighter.knight .fighter-sprite { height:272px !important; }
      #battleView .battle-arena .fighter.enemy .fighter-sprite { height:258px !important; }
      #battleView .battle-arena .fighter.knight .battle-weapon-slot { width:68px !important; height:86px !important; bottom:7px !important; }
      #battleView .battle-arena .fighter.knight .battle-weapon-slot.weapon-left { left:26px !important; }
      #battleView .battle-arena .fighter.knight .battle-weapon-slot.weapon-right { right:24px !important; }
    }

    @media (max-width:460px) {
      #battleView .battle-card.a8-battle-active .battle-arena,
      #battleView #battleArena { height:315px !important; min-height:315px !important; }
      #battleView .battle-arena .fighter.knight { left:15% !important; width:162px !important; height:238px !important; }
      #battleView .battle-arena .fighter.enemy { right:15% !important; width:162px !important; height:228px !important; }
      #battleView .battle-arena .fighter.knight .fighter-sprite { height:230px !important; }
      #battleView .battle-arena .fighter.enemy .fighter-sprite { height:218px !important; }
      #battleView .battle-arena .fighter.knight .battle-weapon-slot { width:58px !important; height:74px !important; bottom:5px !important; }
      #battleView .battle-arena .fighter.knight .battle-weapon-slot.weapon-left { left:20px !important; }
      #battleView .battle-arena .fighter.knight .battle-weapon-slot.weapon-right { right:18px !important; }
    }
  `;
  document.head.appendChild(style);

  const THEME_ASSETS = Object.freeze({
    forest: 'assets/battle-bg-forest.svg',
    mountain: 'assets/battle-bg-mountain.svg',
    celestial: 'assets/battle-bg-celestial.svg'
  });

  function syncBackdrop(stage) {
    if (!stage) return;
    const theme = stage.getAttribute('data-battle-theme') || 'forest';
    const asset = THEME_ASSETS[theme] || THEME_ASSETS.forest;
    let layer = stage.querySelector(':scope > .a8-themed-battle-backdrop');
    if (!layer) {
      layer = document.createElement('span');
      layer.className = 'a8-themed-battle-backdrop';
      layer.setAttribute('aria-hidden', 'true');
      stage.prepend(layer);
    }
    if (layer.dataset.theme !== theme) layer.dataset.theme = theme;
    const wanted = `url("${asset}")`;
    if (layer.style.backgroundImage !== wanted) layer.style.setProperty('background-image', wanted, 'important');
  }

  function syncAllBackdrops() {
    /* Preview deliberately stays on arena-scene.svg. Remove stale layers left
       by older cached versions, then theme only the live battle arena. */
    document.querySelectorAll('#battleView .battle-stage-preview > .a8-themed-battle-backdrop').forEach(layer => layer.remove());
    document.querySelectorAll('#battleView .battle-arena[data-battle-theme]').forEach(syncBackdrop);
  }

  let queued = false;
  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncAllBackdrops();
    });
  }

  syncAllBackdrops();
  const battleView = document.getElementById('battleView');
  if (battleView && 'MutationObserver' in window) {
    const observer = new MutationObserver(queueSync);
    observer.observe(battleView, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['data-battle-theme']
    });
  }

  window.A8_BATTLE_CONTINUITY = Object.freeze({ version:6, previewArena:true, activeThemedBackgrounds:true, backdropLayer:true, sharedGroundLine:true });
})();
