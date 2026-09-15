(function () {
  'use strict';

  const STYLE_ID = 'a8GearVisualStyles';
  const DEBUG = {
    version: 3,
    renderedPieces: 0,
    bodyOverlaySuppressed: true,
    lastSignature: ''
  };

  const TIER = {
    1: { color: '#94a3b8', glow: 'rgba(148,163,184,.24)', weapon: 'drop-shadow(0 0 4px rgba(148,163,184,.35))' },
    2: { color: '#4ade80', glow: 'rgba(74,222,128,.28)', weapon: 'sepia(.45) saturate(2) hue-rotate(72deg) brightness(1.05) drop-shadow(0 0 7px rgba(74,222,128,.55))' },
    3: { color: '#60a5fa', glow: 'rgba(96,165,250,.32)', weapon: 'sepia(.58) saturate(2.8) hue-rotate(164deg) brightness(1.08) drop-shadow(0 0 8px rgba(96,165,250,.65))' },
    4: { color: '#c084fc', glow: 'rgba(192,132,252,.38)', weapon: 'sepia(.7) saturate(4) hue-rotate(228deg) brightness(1.1) drop-shadow(0 0 10px rgba(192,132,252,.72))' },
    5: { color: '#f87171', glow: 'rgba(248,113,113,.46)', weapon: 'sepia(.92) saturate(6.4) hue-rotate(318deg) brightness(1.15) contrast(1.08) drop-shadow(0 0 13px rgba(248,113,113,.95))' }
  };

  const css = `
    /* A8 TIERED KNIGHT GEAR VISUALS 2026 */
    #inventoryView .equipment-slot.a8-tier-frame {
      border-color: var(--a8-tier-color) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.035),
        inset 0 0 0 1px var(--a8-tier-glow),
        0 0 18px var(--a8-tier-glow) !important;
    }

    #inventoryView .equipment-slot.a8-tier-frame .slot-icon {
      border-color: var(--a8-tier-color) !important;
      box-shadow:
        inset 0 0 22px rgba(2,6,23,.55),
        0 0 0 1px var(--a8-tier-glow),
        0 0 14px var(--a8-tier-glow) !important;
    }

    #inventoryView .equipment-slot.a8-tier-item-art .slot-icon > img,
    #inventoryView .equipment-slot.a8-tier-item-art .slot-icon > svg,
    .a8-tier-weapon > img,
    .a8-tier-weapon > svg {
      filter: var(--a8-weapon-filter) !important;
      transition: filter .18s ease;
    }

    #inventoryView .equipment-slot[data-a8-gear-tier='5'] {
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.04),
        inset 0 0 0 1px rgba(248,113,113,.34),
        0 0 20px rgba(248,113,113,.34) !important;
    }

    .a8-tier-weapon[data-a8-gear-tier='5']::after {
      content: '';
      position: absolute;
      inset: 14%;
      border-radius: 999px;
      pointer-events: none;
      background: radial-gradient(circle, rgba(248,113,113,.24), transparent 66%);
      filter: blur(5px);
      opacity: .84;
    }
  `;

  function installStyles() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  function getOwnedItems() {
    try {
      return Array.isArray(state && state.items) ? state.items : [];
    } catch (_) {
      return [];
    }
  }

  function getEquipment() {
    try {
      return state && state.equipment && typeof state.equipment === 'object' ? state.equipment : {};
    } catch (_) {
      return {};
    }
  }

  function itemKey(item) {
    return String(item && (item.key || item.name) || '');
  }

  function equippedItem(slotKey) {
    const equipment = getEquipment();
    const key = String(equipment[slotKey] || '');
    if (!key) return null;
    return getOwnedItems().find(item => itemKey(item) === key) || null;
  }

  function tierOf(item) {
    return Math.max(1, Math.min(5, Math.floor(Number(item && item.tier || 1))));
  }

  function applyTierVisual(element, item, weapon) {
    if (!element) return;
    if (!item) {
      element.classList.remove('a8-tier-frame', 'a8-tier-weapon', 'a8-tier-item-art');
      delete element.dataset.a8GearTier;
      element.style.removeProperty('--a8-tier-color');
      element.style.removeProperty('--a8-tier-glow');
      element.style.removeProperty('--a8-weapon-filter');
      return;
    }

    const tier = tierOf(item);
    const palette = TIER[tier];
    element.dataset.a8GearTier = String(tier);
    element.style.setProperty('--a8-tier-color', palette.color);
    element.style.setProperty('--a8-tier-glow', palette.glow);
    element.style.setProperty('--a8-weapon-filter', palette.weapon);
    element.classList.toggle('a8-tier-frame', !weapon);
    element.classList.toggle('a8-tier-weapon', Boolean(weapon));
  }

  function clearBodyOverlays() {
    document.querySelectorAll('.a8-knight-gear-piece').forEach(node => node.remove());
    ['heroAvatar', 'battleKnight'].forEach(id => {
      const host = document.getElementById(id);
      if (host) delete host.dataset.a8GearSignature;
    });
    const preview = document.querySelector('#battleView .battle-stage-preview .battle-side.hero .battle-portrait-icon');
    if (preview) delete preview.dataset.a8GearSignature;
  }

  function syncInventoryFrames() {
    document.querySelectorAll('#inventoryView [data-equip-slot]').forEach(slot => {
      const slotKey = slot.dataset.equipSlot || '';
      const item = equippedItem(slotKey);
      applyTierVisual(slot, item, false);
      slot.classList.toggle('a8-tier-item-art', Boolean(item && (slotKey === 'weapon' || slotKey === 'offhand')));
    });
  }

  function syncWeaponTiers() {
    const weapon = equippedItem('weapon');
    const offhand = equippedItem('offhand');
    applyTierVisual(document.querySelector('#battleView .battle-stage-preview .a8-arena-weapon.weapon-left'), weapon, true);
    applyTierVisual(document.querySelector('#battleView .battle-stage-preview .a8-arena-weapon.weapon-right'), offhand, true);
    applyTierVisual(document.getElementById('battleWeaponSlot1'), weapon, true);
    applyTierVisual(document.getElementById('battleWeaponSlot2'), offhand, true);
  }

  function inventorySignature() {
    const equipment = getEquipment();
    return Object.keys(equipment).sort().map(slot => {
      const item = equippedItem(slot);
      return item ? `${slot}:${itemKey(item)}:${tierOf(item)}` : `${slot}:-`;
    }).join('|');
  }

  function sync() {
    installStyles();
    clearBodyOverlays();
    syncInventoryFrames();
    syncWeaponTiers();
    DEBUG.renderedPieces = 0;
    DEBUG.lastSignature = inventorySignature();
  }

  let frame = 0;
  function scheduleSync() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  }

  function init() {
    sync();
    document.addEventListener('click', event => {
      if (event.target.closest('#inventoryView, #battleView, #shopView, .nav-toggle, #autoEquipBtn, #unequipAllBtn')) scheduleSync();
    });
    window.addEventListener('storage', scheduleSync);

    ['inventoryView', 'battleView'].forEach(id => {
      const root = document.getElementById(id);
      if (!root || !('MutationObserver' in window)) return;
      const observer = new MutationObserver(scheduleSync);
      observer.observe(root, { childList: true, subtree: true });
    });
  }

  window.A8_GEAR_VISUAL_DEBUG = DEBUG;
  window.A8_GEAR_VISUALS = Object.freeze({ version: 3, sync });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
