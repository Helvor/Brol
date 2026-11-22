// Effets sonores synthétisés avec la Web Audio API : aucun fichier audio, aucun droit d'auteur
(() => {
  'use strict';
  let ctx = null, master = null, noiseBuf = null;
  let on = true;
  try { on = localStorage.getItem('rdl-sound') !== 'off'; } catch (_) {}

  function audio() {
    if (!on) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    // « suspended » partout, « interrupted » sur iPhone après un passage en arrière-plan
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }

  // Retour sur la page (mobile) : le système a coupé l'audio, et iOS ne le relance que pendant un geste.
  // Au premier toucher, on le relance et on joue un son vide (déblocage iOS) ; s'il reste bloqué, on le recrée.
  let wake = false;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx) wake = true; });
  function unlock() {
    if (!on || !ctx || (!wake && ctx.state === 'running')) return;
    wake = false;
    const c = ctx;
    c.resume().catch(() => {}).finally(() => {
      if (c.state !== 'running' && ctx === c) { try { c.close(); } catch (_) {} ctx = null; } // recréé au prochain son
    });
    try { const b = c.createBufferSource(); b.buffer = c.createBuffer(1, 1, 22050); b.connect(c.destination); b.start(0); } catch (_) {}
  }
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });

  // Note simple avec enveloppe
  function tone(freq, { at = 0, dur = 0.2, type = 'sine', vol = 0.3, attack = 0.005, slideTo = null, filter = null } = {}) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filter;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Bruit filtré (déchirure, souffle)
  function noise({ at = 0, dur = 0.3, vol = 0.3, type = 'bandpass', from = 1000, to = 3000, q = 1 } = {}) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C4: 261.63, G4: 392, E4: 329.63 };

  window.SFX = {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('rdl-sound', on ? 'on' : 'off'); } catch (_) {} if (on) this.tick(); return on; },
    tick() { tone(1400, { dur: 0.04, type: 'square', vol: 0.05 }); },
    open() { tone(220, { dur: 0.25, type: 'triangle', vol: 0.15, slideTo: 330 }); },
    // Montée de tension pendant que le paquet tremble
    charge(dur = 0.9) {
      tone(110, { dur, type: 'sawtooth', vol: 0.06, slideTo: 440, attack: 0.3, filter: 900 });
      for (let i = 0; i < 6; i++) noise({ at: i * dur / 6, dur: 0.06, vol: 0.05 + i * 0.015, from: 2000, to: 2500, q: 4 });
    },
    tear() {
      noise({ dur: 0.45, vol: 0.45, from: 600, to: 5000, q: 0.8 });
      noise({ at: 0.05, dur: 0.3, vol: 0.25, type: 'highpass', from: 3000, to: 8000 });
      tone(80, { dur: 0.25, type: 'sine', vol: 0.25, slideTo: 40 });
    },
    deal(i = 0) { noise({ at: i * 0.09, dur: 0.08, vol: 0.12, type: 'highpass', from: 2500, to: 6000 }); },
    flip() { noise({ dur: 0.12, vol: 0.18, from: 1500, to: 4500, q: 1.5 }); tone(900, { dur: 0.05, type: 'triangle', vol: 0.05 }); },
    // Carillon selon la rareté (0 = commune … 5 = mythique)
    reveal(rank) {
      if (rank < 2) return;
      const seq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6, NOTES.G6].slice(0, rank + 1);
      seq.forEach((f, i) => tone(f, { at: 0.05 + i * 0.07, dur: 0.5, type: 'sine', vol: 0.12 }));
      if (rank >= 4) this.fanfare(rank === 5);
    },
    fanfare(big) {
      const chord = (fs, at, dur) => fs.forEach(f => tone(f, { at, dur, type: 'sawtooth', vol: 0.06, filter: 2200, attack: 0.03 }));
      chord([NOTES.C4, NOTES.E4, NOTES.G4], 0.45, 0.25);
      chord([NOTES.C4, NOTES.E4, NOTES.G4], 0.72, 0.18);
      chord([NOTES.C5, NOTES.E5, NOTES.G5], 0.92, big ? 1.4 : 0.9);
      if (big) chord([NOTES.E5, NOTES.G5, NOTES.C6], 1.3, 1.4);
      noise({ at: 0.92, dur: big ? 1.6 : 1, vol: 0.06, type: 'highpass', from: 6000, to: 9000 });
    },
    // Scintillement pour les versions spéciales
    shimmer() { for (let i = 0; i < 8; i++) tone(1800 + i * 260, { at: 0.1 + i * 0.04, dur: 0.25, type: 'sine', vol: 0.04 }); },
    coin() { tone(NOTES.E6, { dur: 0.09, type: 'square', vol: 0.05 }); tone(NOTES.G6 * 1.335, { at: 0.08, dur: 0.25, type: 'square', vol: 0.05 }); },
    achievement() {
      [NOTES.G5, NOTES.C6, NOTES.E6, NOTES.G6].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.6, type: 'triangle', vol: 0.12 }));
      this.shimmer();
    },
    error() { tone(200, { dur: 0.15, type: 'square', vol: 0.06, slideTo: 140 }); },
  };
})();
