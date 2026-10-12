// Partager une carte : image PNG (1080 × 1350, format des réseaux sociaux) dessinée dans un canvas,
// avec la carte dans sa version, le logo de Brol et le crédit de la photo (obligatoire pour les licences libres).
// Sur téléphone : menu de partage du système ; sinon : téléchargement du fichier.
(() => {
  'use strict';
  const API = window.RDL;
  const W = 1080, H = 1350, CW = 620, CH = Math.round(CW * 88 / 63);
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace', TEXT = '"Barlow", system-ui, sans-serif';

  // Cadres : mêmes couleurs que style.css (rareté, versions spéciales, versions d'événement)
  const FRAMES = {
    commune: ['#e2e2de', '#a8a8a2', '#d6d6d1'], 'peu-commune': ['#bfe6cb', '#3f8a5a', '#a9dbb9'], rare: ['#c3d8ff', '#2e5fc0', '#9dbcff'],
    epique: ['#e2cbff', '#6b3db8', '#c9a6ff'], legendaire: ['#7a5a12', '#f7dc84', '#a87b1e', '#fff1b8', '#8a6516'],
    mythique: ['#5a0012', '#ff2d55', '#9a0020', '#ff8fa0', '#5a0012'], // Rubis
    holo: ['#5d6470', '#e9edf3', '#8a92a0', '#ffffff', '#6f7783', '#dfe4ec'], // Chrome
    plein: ['#2b2b30', '#0c0c0e', '#3a3a42'],
    or: ['#6e4f0c', '#f9e08a', '#b8891f', '#fff3c2', '#a87b1e'], noir: ['#8a6410', '#f6d478', '#0b0b0b', '#0b0b0b', '#f6d478'],
    rouge: ['#4a0510', '#c8162c', '#ffd98a', '#9c0f22', '#ffe8b0'], confetti: ['#ff5fa8', '#ffd23f', '#2fc7e8', '#8a3fd6'],
    pave: ['#4a4a48', '#121212', '#f6d43a', '#121212'], iris: ['#0c2350', '#3b74d8', '#f2c400', '#1d4f9e'],
    lion: ['#f2c400', '#111', '#f2c400', '#111'], tricolore: ['#111', '#111', '#f2c400', '#f2c400', '#e1001e', '#e1001e'],
    coq: ['#c8102e', '#f2c400', '#c8102e', '#f2c400'],
    coquelicot: ['#14140f', '#7a1410', '#e0302a', '#7a1410', '#14140f'],
  };
  const BAND_INK_DARK = new Set(['jaune', 'flandre']);
  // Cartes Histoire « Archives » : carton kraft (cadre doré en légendaire, rouge en mythique), encre du tampon par rareté
  const TYPE = '"Special Elite", "Courier New", monospace';
  const ARCH_FRAMES = { commune: ['#c79b62', '#8d6633', '#b98a52'], legendaire: FRAMES.legendaire, mythique: ['#5a0012', '#c8102e', '#8a0020'] };
  const ARCH_INK = { commune: '#6b6b6b', 'peu-commune': '#2f7d4a', rare: '#2e5fc0', epique: '#6b3db8', legendaire: '#b8860b', mythique: '#c8102e' };

  // Bulles (BD) : design « Pop » (voir style.css, .card.cat-bd)
  const POP = '"Bangers", Impact, sans-serif', COMIC = '"Comic Neue", "Comic Sans MS", sans-serif';
  const POP_ACC = { commune: '#9a9a9a', 'peu-commune': '#2fae5f', rare: '#2e6fe0', epique: '#8a4be0', legendaire: '#f2b300', mythique: '#e3132d' };
  const POP_WORD = { commune: 'PLOP', 'peu-commune': 'PIF!', rare: 'PAF!', epique: 'BAM!', legendaire: 'BOUM!', mythique: 'KABOOM!' };
  const IRIS = ['#ff7ad9', '#ffd36b', '#7dffb2', '#6bd7ff', '#b38bff'];
  // Paysages : carte postale horizontale « Souvenir de… » (voir style.css, .card.is-land)
  const LOBSTER = '"Lobster", cursive', SLAB = '"Alfa Slab One", Georgia, serif', ELITE = '"Special Elite", "Courier New", monospace';
  const LAND_ACC = { commune: '#8a8a8a', 'peu-commune': '#2f7d4a', rare: '#2e5fc0', epique: '#6b3db8', legendaire: '#b8860b', mythique: '#c8102e' };
  const LAND_STAMP = { commune: '#6f7a86', 'peu-commune': '#3f8a5a', rare: '#2e5fc0', epique: '#7a4ac8', legendaire: '#c9971c', mythique: '#c8102e' };
  const STAMP_VAL = { commune: '1F', 'peu-commune': '2F', rare: '5F', epique: '10F', legendaire: '50F', mythique: '100F' };

  function loadImage(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Commons autorise le partage (CORS) : le canvas reste exportable
      img.onload = () => res(img); img.onerror = () => res(null);
      img.src = src;
    });
  }
  // Special:FilePath redirige sans en-tête CORS : le navigateur refuserait de dessiner la photo dans le canvas.
  // L'API de Commons (origin=*) donne directement l'adresse finale sur upload.wikimedia.org, qui l'autorise.
  async function commonsImage(file, width) {
    if (!file) return null;
    try {
      const q = new URLSearchParams({ action: 'query', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'url', iiurlwidth: width, format: 'json', origin: '*' });
      const r = await fetch('https://commons.wikimedia.org/w/api.php?' + q);
      const info = Object.values((await r.json()).query?.pages || {})[0]?.imageinfo?.[0];
      return await loadImage(info?.thumburl || info?.url);
    } catch (_) { return null; }
  }
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function gradient(ctx, x, y, w, h, stops, angle = 135) {
    const a = angle * Math.PI / 180, cx = x + w / 2, cy = y + h / 2, d = Math.hypot(w, h) / 2;
    const g = ctx.createLinearGradient(cx - Math.cos(a) * d, cy - Math.sin(a) * d, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    stops.forEach((c, i) => g.addColorStop(i / Math.max(1, stops.length - 1), c));
    return g;
  }
  // zoom : [facteur, origine x, origine y] (0–1 dans le cadre), comme le transform:scale des cartes (data/focus.js)
  function cover(ctx, img, x, y, w, h, posY = 0.2, contain = false, posX = 0.5, zoom = null) {
    const s = contain ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
    let iw = img.width * s, ih = img.height * s, dx = x + (w - iw) * (contain ? 0.5 : posX), dy = y + (h - ih) * (contain ? 0.5 : posY);
    if (zoom) {
      const [k, ox, oy] = zoom, cx = x + ox * w, cy = y + oy * h;
      dx = cx + k * (dx - cx); dy = cy + k * (dy - cy); iw *= k; ih *= k;
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    }
    ctx.drawImage(img, dx, dy, iw, ih);
  }
  function fitText(ctx, text, maxW, size, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 18);
    return s + 2;
  }
  // Une ligne qui tient dans maxW, coupée avec « … » si besoin (un seul mot trop long déborderait sinon)
  function clip(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }
  function wrap(ctx, text, maxW, maxLines) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += '…'; }
    return lines;
  }

  // Intérieur d'une carte Histoire : tirage photo scotché, texte tapé à la machine, tampon ou cachet de cire, statistiques
  function archives(ctx, c, photo, ix, iy, iw, ih, finish) {
    const gold = finish === 'or'; // Dorée : parchemin bordé d'or (« archives royales »)
    ctx.fillStyle = gradient(ctx, ix, iy, iw, ih, gold ? ['#f7ecd0', '#e6d3a1', '#d7bd80'] : ['#dcc597', '#cdb07a'], 100); ctx.fillRect(ix, iy, iw, ih);
    if (gold) { ctx.strokeStyle = '#b8891f'; ctx.lineWidth = 3; ctx.strokeRect(ix + 12, iy + 12, iw - 24, ih - 24); ctx.lineWidth = 2; ctx.strokeRect(ix + 20, iy + 20, iw - 40, ih - 40); }
    else { ctx.fillStyle = 'rgba(90,60,20,.05)'; for (let y = iy; y < iy + ih; y += 9) ctx.fillRect(ix, y, iw, 2); }
    // Plein cadre : grand tirage droit sur toute la carte, l'étiquette posée dessus
    const full = finish === 'plein', statsH = 116;
    const px = full ? ix + 16 : ix + 42, py = full ? iy + 16 : iy + 30, pw = full ? iw - 32 : iw - 84, ph = full ? ih - statsH - 32 : Math.round(ih * 0.56);
    // Tirage photo, légèrement de travers
    ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.rotate((full ? 0 : -2) * Math.PI / 180);
    ctx.shadowColor = 'rgba(60,40,10,.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = gold ? gradient(ctx, -pw / 2, -ph / 2, pw, ph, ['#8a6516', '#f7dc84', '#b8891f', '#fff1b8', '#a87b1e']) : '#f4efe3';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph); ctx.shadowColor = 'transparent';
    if (photo) {
      ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2 + 14, -ph / 2 + 14, pw - 28, ph - 28); ctx.clip();
      ctx.filter = finish === 'or' ? 'sepia(.65) saturate(1.3)' : c.artwork ? 'sepia(.15)' : 'sepia(.55) contrast(1.05)';
      if (c.artwork) { ctx.fillStyle = '#f4efe3'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph); cover(ctx, photo, -pw / 2 + 14, -ph / 2 + 14, pw - 28, ph - 28, 0.5, true); }
      else { const v = (window.FOCUS?.[c.img] || '50 20').split(' ').map(Number); cover(ctx, photo, -pw / 2 + 14, -ph / 2 + 14, pw - 28, ph - 28, v[1] / 100, false, v[0] / 100); }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(240,232,205,.85)'; // scotch
    if (full) for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * (pw / 2 - 20), -ph / 2 + 6); ctx.rotate(sx * 32 * Math.PI / 180); ctx.fillRect(-48, -16, 96, 32); ctx.restore(); }
    else { ctx.rotate(5 * Math.PI / 180); ctx.fillRect(-50, -ph / 2 - 18, 100, 34); }
    ctx.restore();
    // Plein cadre : étiquette en kraft scotchée sur le bas du tirage, sous le texte
    if (full) {
      ctx.save(); ctx.translate(ix + iw / 2, iy + ih - statsH - 100); ctx.rotate(-1.5 * Math.PI / 180);
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
      ctx.fillStyle = gradient(ctx, -(iw - 60) / 2, -95, iw - 60, 190, ['#e2cfa6', '#d2b886'], 100); ctx.fillRect(-(iw - 60) / 2, -95, iw - 60, 190);
      ctx.shadowColor = 'transparent'; ctx.fillStyle = 'rgba(240,232,205,.85)'; ctx.rotate(5 * Math.PI / 180); ctx.fillRect(-48, -110, 96, 32);
      ctx.restore();
    }
    // Reflet des versions spéciales (Holo : barre de lumière)
    if (finish === 'holo') {
      ctx.save(); ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = gradient(ctx, ix, iy, iw, ih, ['#ffffff00', '#ffffff00', '#ffffffcc', '#aae6ffaa', '#ffbef099', '#ffffff00', '#ffffff00'], 115);
      ctx.fillRect(ix, iy, iw, ih); ctx.restore();
    }
    // Tampon ARCHIVES / CONFIDENTIEL, ou cachet de cire (légendaire, mythique)
    const ink = gold ? '#a87b1e' : ARCH_INK[c.rarity] || ARCH_INK.commune, sy = full ? iy + ih - statsH - 210 : py + ph + 4;
    ctx.save(); ctx.translate(ix + iw - 120, sy); ctx.rotate(-12 * Math.PI / 180);
    if (finish === 'holo') { // Holo « plastifié » : sceau holographique
      const g = ctx.createConicGradient(0, 0, -10);
      ['#ff7ad9', '#ffd36b', '#7dffb2', '#6bd7ff', '#b38bff', '#ff7ad9'].forEach((col, n) => g.addColorStop(n / 5, col));
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -10, 46, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(0, -10, 9, 0, Math.PI * 2); ctx.fill();
    } else if (c.rarity === 'legendaire' || c.rarity === 'mythique') {
      const g = ctx.createRadialGradient(-12, -14, 4, 0, 0, 48);
      (c.rarity === 'mythique' ? ['#ff8fa0', '#c8102e', '#5a0012'] : ['#fff3c2', '#d9a52c', '#8a6516']).forEach((col, n) => g.addColorStop(n / 2, col));
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -10, 46, 0, Math.PI * 2); ctx.fill();
    } else {
      const word = gold ? 'ARCHIVES ROYALES' : c.rarity === 'epique' ? 'CONFIDENTIEL' : 'ARCHIVES';
      ctx.font = `700 ${gold ? 24 : 30}px ${DISPLAY}`; ctx.letterSpacing = '4px';
      const w = ctx.measureText(word).width + 30;
      ctx.globalAlpha = 0.8; ctx.strokeStyle = ink; ctx.lineWidth = 4; rr(ctx, -w / 2, -24, w, 46, 8); ctx.stroke();
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(word, 2, 0);
    }
    ctx.restore();
    // Nom, description et méta, tapés à la machine
    const by = iy + ih - statsH - 20;
    ctx.fillStyle = gold ? '#4a3410' : '#2b2116'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let fs = 50, lines;
    for (; ; fs -= 2) { ctx.font = `400 ${fs}px ${TYPE}`; lines = wrap(ctx, window.I18N.name(c).toUpperCase(), iw - 70, 2); if (fs <= 32 || lines.every(l => ctx.measureText(l).width <= iw - 70)) break; }
    let ty = by - 70 - (lines.length - 1) * fs;
    for (const l of lines) { ctx.fillText(l, ix + 34, ty); ty += fs; }
    ctx.font = `400 23px ${TYPE}`; ctx.fillStyle = '#4a3a26';
    ctx.fillText(wrap(ctx, window.I18N.subtitle(c), iw - 70, 1)[0] || '', ix + 34, by - 32);
    ctx.font = `400 20px ${TYPE}`; ctx.fillStyle = '#6a4f2c';
    ctx.fillText(wrap(ctx, window.I18N.meta(c) || '', iw - 70, 1)[0], ix + 34, by - 4);
    // Statistiques
    const st = iy + ih - statsH;
    ctx.fillStyle = 'rgba(255,250,235,.55)'; ctx.fillRect(ix, st, iw, statsH);
    ctx.strokeStyle = '#6a4f2c'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(ix, st); ctx.lineTo(ix + iw, st); ctx.stroke(); ctx.setLineDash([]);
    const stats = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), colW = (iw - 40) / 3;
    stats.forEach(([key, v], n) => {
      const sx = ix + 22 + n * colW;
      if (n) { ctx.fillStyle = 'rgba(90,60,20,.25)'; ctx.fillRect(sx - 12, st + 24, 2, statsH - 48); }
      ctx.fillStyle = '#7a5f3a'; ctx.font = `600 20px ${DISPLAY}`; ctx.fillText(wrap(ctx, window.I18N.statKey(key).toUpperCase(), colW - 20, 1)[0], sx, st + 46);
      ctx.fillStyle = '#2b2116'; ctx.font = `400 30px ${TYPE}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 20), sx, st + 88);
    });
  }

  // Trame de points (Ben-Day)
  function dots(ctx, x, y, w, h, step, r, color) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = color;
    for (let py = y + step / 2; py < y + h; py += step) for (let px = x + step / 2; px < x + w; px += step) { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // Onomatopée dans une explosion, centrée en (x, y)
  function burst(ctx, x, y, w, h, word, fill, ink) {
    const pts = [[50, 0], [62, 26], [96, 10], [76, 42], [100, 58], [70, 66], [80, 100], [50, 78], [20, 100], [30, 66], [0, 58], [24, 42], [4, 10], [38, 26]];
    ctx.save(); ctx.translate(x, y); ctx.rotate(-8 * Math.PI / 180);
    ctx.beginPath(); pts.forEach(([px, py], n) => ctx[n ? 'lineTo' : 'moveTo']((px / 100 - .5) * w, (py / 100 - .5) * h)); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = ink; ctx.font = `400 ${Math.round(h * .42)}px ${POP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '2px';
    ctx.fillText(word, 0, 2); ctx.restore();
  }
  function pop(ctx, c, photo, ix, iy, iw, ih, finish) {
    const acc = POP_ACC[c.rarity] || POP_ACC.commune, statsH = 116, full = finish === 'plein', gold = finish === 'or', holo = finish === 'holo';
    // Fond tramé de la couleur de la rareté (irisé en Holo, or en Dorée)
    ctx.fillStyle = holo ? gradient(ctx, ix, iy, iw, ih, IRIS) : gold ? gradient(ctx, ix, iy, iw, ih, ['#ffe58a', '#e0b23a', '#f7d777'], 160) : acc; ctx.fillRect(ix, iy, iw, ih);
    dots(ctx, ix, iy, iw, ih, 16, 3.6, holo ? 'rgba(255,255,255,.7)' : gold ? 'rgba(120,80,0,.35)' : c.rarity === 'mythique' ? 'rgba(255,225,74,.55)' : 'rgba(0,0,0,.18)');
    // Case : la photo de travers, bord noir et ombre décalée (pleine en Plein cadre)
    const px = full ? ix : ix + 26, py = full ? iy : iy + 26, pw = full ? iw : iw - 52, ph = full ? ih - statsH : Math.round(ih * 0.6);
    ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); if (!full) ctx.rotate(-1.5 * Math.PI / 180);
    if (!full) { ctx.fillStyle = '#111'; ctx.fillRect(-pw / 2 + 10, -ph / 2 + 10, pw, ph); ctx.fillRect(-pw / 2 - 5, -ph / 2 - 5, pw + 10, ph + 10); }
    if (photo) {
      ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); ctx.clip();
      ctx.filter = gold ? 'sepia(.35) saturate(1.3) contrast(1.1)' : 'saturate(1.4) contrast(1.15)';
      const v = (window.FOCUS?.[c.img] || '50 20').split(' ').map(Number); cover(ctx, photo, -pw / 2, -ph / 2, pw, ph, v[1] / 100, false, v[0] / 100);
      ctx.filter = 'none'; ctx.globalCompositeOperation = 'multiply'; dots(ctx, -pw / 2, -ph / 2, pw, ph, 11, 2.6, `rgba(0,0,0,${full ? .22 : .35})`);
      ctx.restore();
    }
    ctx.restore();
    // Nom et sous-titre : encadré blanc (noir et or en Dorée), ou titre d'album en haut en Plein cadre
    const name = window.I18N.name(c).toUpperCase(), sub = window.I18N.subtitle(c) || '';
    ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '2px';
    if (full) {
      let fs = 86; for (; fs > 44; fs -= 2) { ctx.font = `400 ${fs}px ${POP}`; if (ctx.measureText(name).width <= iw - 60) break; }
      ctx.save(); ctx.translate(ix + iw / 2, iy + 70 + fs * .8); ctx.rotate(-2 * Math.PI / 180); ctx.textAlign = 'center';
      ctx.fillStyle = '#111'; ctx.fillText(name, 6, 6); ctx.strokeStyle = '#111'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeText(name, 0, 0);
      ctx.fillStyle = '#ffe14a'; ctx.fillText(name, 0, 0);
      if (sub) { ctx.font = `700 24px ${COMIC}`; ctx.letterSpacing = '0px'; const w = ctx.measureText(sub).width + 30;
        ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, 22, w, 40); ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.strokeRect(-w / 2, 22, w, 40);
        ctx.fillStyle = '#111'; ctx.fillText(sub, 0, 51); }
      ctx.restore();
      // Logo d'éditeur
      ctx.save(); ctx.translate(ix + iw - 80, iy + ih - statsH - 50); ctx.rotate(-4 * Math.PI / 180);
      ctx.fillStyle = '#e3132d'; ctx.fillRect(-56, -24, 112, 48); ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.strokeRect(-56, -24, 112, 48);
      ctx.fillStyle = '#fff'; ctx.font = `400 34px ${POP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '4px'; ctx.fillText('BROL', 2, 2);
      ctx.restore();
    } else {
      const bx = ix + 26, bw = iw - 52, bh = 150, by = iy + ih - statsH - bh - 34;
      ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.rotate(1 * Math.PI / 180);
      ctx.fillStyle = '#111'; ctx.fillRect(-bw / 2 + 9, -bh / 2 + 9, bw, bh); ctx.fillStyle = gold ? '#111' : '#fff'; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
      let fs = 64; for (; fs > 36; fs -= 2) { ctx.font = `400 ${fs}px ${POP}`; if (ctx.measureText(name).width <= bw - 50) break; }
      ctx.fillStyle = gold ? '#f6d478' : '#111'; ctx.fillText(clip(ctx, name, bw - 50), -bw / 2 + 25, -6);
      ctx.font = `700 24px ${COMIC}`; ctx.letterSpacing = '0px'; ctx.fillStyle = gold ? '#e8cf8a' : '#333';
      ctx.fillText(clip(ctx, sub, bw - 50), -bw / 2 + 25, 44);
      ctx.restore();
    }
    // Onomatopée de la rareté
    const word = POP_WORD[c.rarity] || POP_WORD.commune, bw2 = c.rarity === 'mythique' ? 220 : 180;
    let fill = c.rarity === 'legendaire' || c.rarity === 'mythique' ? '#ffe14a' : '#fff';
    if (holo) { fill = ctx.createConicGradient(0.5, 0, 0); [...IRIS, IRIS[0]].forEach((col, n) => fill.addColorStop(n / 5, col)); }
    if (gold) fill = gradient(ctx, -bw2 / 2, -50, bw2, 100, ['#8a6516', '#f7dc84', '#b8891f', '#fff1b8']);
    const ox = ix + iw - bw2 / 2 + 6, oy = full ? iy + ih - statsH - 150 : iy + ih - statsH - 210;
    if (holo) { ctx.save(); ctx.translate(ox, oy); burst(ctx, 0, 0, bw2, 104, word, fill, '#111'); ctx.restore(); }
    else burst(ctx, ox, oy, bw2, 104, word, fill, c.rarity === 'mythique' && !gold ? '#e3132d' : '#111');
    // Statistiques
    const st = iy + ih - statsH;
    ctx.fillStyle = '#111'; ctx.fillRect(ix, st, iw, statsH);
    if (full) { ctx.fillStyle = acc; ctx.fillRect(ix, st, iw, 8); }
    const stats = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), colW = (iw - 40) / 3;
    ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
    stats.forEach(([key, v], n) => {
      const sx = ix + 22 + n * colW;
      if (n) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(sx - 12, st + 24, 2, statsH - 48); }
      ctx.fillStyle = '#8d8d95'; ctx.font = `600 20px ${DISPLAY}`; ctx.fillText(wrap(ctx, window.I18N.statKey(key).toUpperCase(), colW - 20, 1)[0], sx, st + 46);
      ctx.fillStyle = gold ? '#f6d478' : '#fff'; ctx.font = `700 30px ${COMIC}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 20), sx, st + 88);
    });
  }

  // Carte postale : (x, y, w, h) = intérieur du cadre ; u = 1 % de la largeur de la carte (comme 1cqw)
  function postcard(ctx, c, photo, x, y, w, h, finish, u) {
    const full = finish === 'plein', gold = finish === 'or', holo = finish === 'holo', top = c.rarity === 'legendaire' || c.rarity === 'mythique';
    const acc = LAND_ACC[c.rarity] || LAND_ACC.commune;
    ctx.fillStyle = '#2a2c33'; ctx.fillRect(x, y, w, h);
    if (photo) {
      // Cadrage : « 50% 70%;--zoom:1.2 » (comme dans le jeu)
      const m = /^(\d+)%\s+(\d+)%(?:;--zoom:([\d.]+))?/.exec(c.pos || '') || [];
      const px = (+m[1] || 50) / 100, py = (+m[2] || 50) / 100, zoom = +m[3] || 1;
      ctx.save(); ctx.filter = gold ? 'sepia(.3) saturate(1.3) contrast(1.05)' : 'saturate(1.25) contrast(1.05)';
      cover(ctx, photo, x - w * (zoom - 1) * px, y - h * (zoom - 1) * py, w * zoom, h * zoom, py, false, px);
      ctx.restore();
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(0,0,0,${full ? .45 : .4})`); g.addColorStop(full ? .36 : .38, 'rgba(0,0,0,0)'); g.addColorStop(full ? .62 : .7, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${full ? .65 : .3})`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (holo) { ctx.save(); ctx.globalCompositeOperation = 'color-dodge'; ctx.globalAlpha = .4; ctx.fillStyle = gradient(ctx, x, y, w, h, ['#00000000', ...IRIS, '#00000000'], 115); ctx.fillRect(x, y, w, h); ctx.restore(); }
    // « Souvenir de » et nom en grosses lettres
    ctx.save(); ctx.translate(x + 4 * u, y + 7 * u); ctx.rotate(-4 * Math.PI / 180);
    ctx.font = `400 ${4.4 * u}px ${LOBSTER}`; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.textBaseline = 'alphabetic';
    const hello = API.souvenirOf ? API.souvenirOf(c.name) : 'Souvenir de';
    ctx.fillText(hello, .3 * u, .3 * u); ctx.fillStyle = gold ? '#f6d478' : '#fff'; ctx.fillText(hello, 0, 0); ctx.restore();
    const name = window.I18N.name(c).toUpperCase();
    let fs = (full ? 9.4 : 8) * u, lines;
    for (; ; fs -= .2 * u) { ctx.font = `400 ${fs}px ${SLAB}`; lines = wrap(ctx, name, w * .74, 2); if (fs < 5 * u || lines.every(l => ctx.measureText(l).width <= w * .74)) break; }
    ctx.lineJoin = 'round';
    lines.forEach((l, n) => {
      const ly = y + 9 * u + fs * .82 + n * fs * .95;
      ctx.fillStyle = '#1a1a1a'; ctx.fillText(l, x + 3 * u + .7 * u, ly + .7 * u);
      ctx.strokeStyle = gold ? '#5a3f08' : acc; ctx.lineWidth = .7 * u; ctx.strokeText(l, x + 3 * u, ly);
      ctx.fillStyle = gold ? gradient(ctx, x, ly - fs, w, fs, ['#fff6cf', '#f2c94c', '#b8891f'], 90) : '#fff4c7'; ctx.fillText(l, x + 3 * u, ly);
    });
    // Timbre dentelé et cachet
    const sw = 12 * u, sh = 15 * u, sx = x + w - 2.4 * u - sw, sy = y + 2.4 * u;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = .6 * u; ctx.shadowOffsetY = .3 * u;
    ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, sw, sh); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    for (let t = 0; t <= sw; t += 1.8 * u) for (const yy of [sy, sy + sh]) { ctx.beginPath(); ctx.arc(sx + t, yy, .55 * u, 0, Math.PI * 2); ctx.fill(); }
    for (let t = 0; t <= sh; t += 1.8 * u) for (const xx of [sx, sx + sw]) { ctx.beginPath(); ctx.arc(xx, sy + t, .55 * u, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    const ix = sx + 1 * u, iy = sy + 1 * u, iw = sw - 2 * u, ih = sh - 2 * u;
    if (holo) { const cg = ctx.createConicGradient(.5, ix + iw / 2, iy + ih / 2); [...IRIS, IRIS[0]].forEach((col, n) => cg.addColorStop(n / 5, col)); ctx.fillStyle = cg; }
    else if (gold || c.rarity === 'legendaire') ctx.fillStyle = gradient(ctx, ix, iy, iw, ih, ['#7a5a12', '#f7dc84', '#a87b1e', '#fff1b8', '#8a6516']);
    else ctx.fillStyle = LAND_STAMP[c.rarity] || LAND_STAMP.commune;
    ctx.fillRect(ix, iy, iw, ih);
    const ink = holo || gold || c.rarity === 'legendaire' ? '#3a2a08' : '#fff';
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(ix + iw * .15, iy + ih * .8); ctx.lineTo(ix + iw * .42, iy + ih * .45); ctx.lineTo(ix + iw * .58, iy + ih * .63); ctx.lineTo(ix + iw * .7, iy + ih * .5); ctx.lineTo(ix + iw * .9, iy + ih * .8); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + iw * .68, iy + ih * .32, iw * .07, 0, Math.PI * 2); ctx.fill();
    ctx.font = `700 ${2.6 * u}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.fillText(STAMP_VAL[c.rarity] || '1F', ix + .8 * u, iy + 2.8 * u);
    ctx.font = `600 ${1.4 * u}px ${DISPLAY}`; ctx.textAlign = 'right'; ctx.fillText(API.rarityLabel(c.rarity).toUpperCase(), ix + iw - .6 * u, iy + ih - .6 * u); ctx.textAlign = 'left';
    ctx.save(); ctx.translate(x + w - 16.5 * u, y + 16.5 * u); ctx.rotate(-14 * Math.PI / 180);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = .35 * u; ctx.beginPath(); ctx.arc(0, 0, 7.5 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = .2 * u; ctx.beginPath(); ctx.arc(0, 0, 6.3 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.textAlign = 'center'; ctx.font = `700 ${1.6 * u}px ${DISPLAY}`;
    ctx.fillText(clip(ctx, String(window.I18N.tv(c.stats?.[1]?.[1] || '')).toUpperCase(), 11 * u), 0, 0);
    ctx.font = `700 ${1.9 * u}px ${DISPLAY}`; ctx.fillText(top ? '★ ★ ★' : window.I18N.lang === 'nl' ? 'BELGIË' : 'BELGIQUE', 0, 2.4 * u);
    ctx.restore(); ctx.textAlign = 'left';
    // Bande du bas : description et stats
    const bx = full ? x : x + 2 * u, bw = full ? w : w - 4 * u, bh = full ? 9 * u : 10 * u, by = y + h - (full ? 0 : 2 * u) - bh;
    if (!full) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 1.6 * u; ctx.shadowOffsetY = .6 * u;
      ctx.fillStyle = gold ? 'rgba(14,11,6,.92)' : 'rgba(246,239,220,.94)'; rr(ctx, bx, by, bw, bh, .6 * u); ctx.fill(); ctx.restore();
      ctx.fillStyle = gold ? '#d9a52c' : holo ? '#b38bff' : acc; ctx.fillRect(bx, by, 1.2 * u, bh);
    }
    const light = full, txt = light ? '#fff' : gold ? '#e8cf8a' : '#3a3226';
    if (light) { ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = .6 * u; }
    ctx.fillStyle = txt; ctx.font = `400 ${2.2 * u}px ${ELITE}`;
    const subL = wrap(ctx, window.I18N.subtitle(c) || '', bw * .36, 2);
    subL.forEach((l, n) => ctx.fillText(l, bx + 3.6 * u, by + bh / 2 + (n - (subL.length - 1) / 2) * 2.6 * u + .8 * u));
    const stats = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3);
    ctx.textAlign = 'left'; let cx = bx + bw - 2.4 * u;
    const cols = stats.map(([k, v]) => { ctx.font = `700 ${2.6 * u}px ${DISPLAY}`; const vv = String(window.I18N.tv(v)); const vw = ctx.measureText(vv).width;
      ctx.font = `600 ${1.4 * u}px ${DISPLAY}`; const kk = window.I18N.statKey(k).toUpperCase(); return { kk, vv, cw: Math.max(vw, ctx.measureText(kk).width) }; });
    for (const col of cols.reverse()) {
      cx -= col.cw;
      ctx.fillStyle = light ? 'rgba(255,255,255,.75)' : gold ? '#b8a06a' : '#8a7a5a'; ctx.font = `600 ${1.4 * u}px ${DISPLAY}`; ctx.fillText(col.kk, cx, by + bh / 2 - .8 * u);
      ctx.fillStyle = light ? '#fff' : gold ? '#f6d478' : '#2b2620'; ctx.font = `700 ${2.6 * u}px ${DISPLAY}`; ctx.fillText(col.vv, cx, by + bh / 2 + 2.2 * u);
      cx -= 2.6 * u;
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    // Numéro
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.font = `600 ${1.9 * u}px ${MONO}`; const nw = ctx.measureText(String(c.no).padStart(4, '0')).width + 1.8 * u;
    rr(ctx, x + 3 * u, by - 4.2 * u, nw, 3 * u, .5 * u); ctx.fill(); ctx.fillStyle = '#f1eee6'; ctx.fillText(String(c.no).padStart(4, '0'), x + 3.9 * u, by - 2 * u);
  }

  // Balade : fiche de randonnée (voir style.css, .card.cat-balade)
  function walkCard(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 100, acc = LAND_ACC[c.rarity] || LAND_ACC.commune, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const ink = gold ? '#17130a' : '#23281f', paper = gold ? '#f6e7b4' : '#f3efe4';
    ctx.fillStyle = holo ? gradient(ctx, x, y, w, h, ['#f3efe4', '#e9f3ff', '#fbe9ff'], 160) : paper; ctx.fillRect(x, y, w, h);
    const accFill = (gx, gy, gw, gh) => holo ? gradient(ctx, gx, gy, gw, gh, IRIS) : gold ? gradient(ctx, gx, gy, gw, gh, ['#8a6516', '#f7dc84', '#b8891f', '#fff1b8']) : acc;
    // Photo
    const px = full ? x : x + 4 * u, py = y + (full ? 11 : 14) * u, pw = full ? w : w - 8 * u, ph = full ? h - 29 * u : 66 * u;
    if (!full) { ctx.fillStyle = gold ? '#d9a52c' : '#fff'; ctx.fillRect(px - .8 * u, py - .8 * u, pw + 1.6 * u, ph + 1.6 * u); }
    if (photo) { ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); cover(ctx, photo, px, py, pw, ph, .5); ctx.restore(); }
    if (full) { const g = ctx.createLinearGradient(0, py + ph * .45, 0, py + ph); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    // Barre du haut : balisage, « Balade », numéro
    ctx.fillStyle = ink; ctx.fillRect(x, y, w, 11 * u);
    ctx.fillStyle = paper; ctx.fillRect(x + 3.6 * u, y + 2.4 * u, 9.8 * u, 6.2 * u);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 4 * u, y + 2.8 * u, 9 * u, 2.7 * u); ctx.fillStyle = accFill(x + 4 * u, y + 5.5 * u, 9 * u, 2.7 * u); ctx.fillRect(x + 4 * u, y + 5.5 * u, 9 * u, 2.7 * u);
    ctx.fillStyle = paper; ctx.textBaseline = 'middle'; ctx.font = `700 ${3.6 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.4 * u}px`;
    ctx.fillText(window.I18N.lang === 'nl' ? 'WANDELING' : 'BALADE', x + 16 * u, y + 5.6 * u); ctx.letterSpacing = '0px';
    ctx.textAlign = 'right'; ctx.font = `600 ${3.4 * u}px ${MONO}`; ctx.fillText(String(c.no).padStart(4, '0'), x + w - 4 * u, y + 5.6 * u); ctx.textAlign = 'left';
    // Pastille des kilomètres
    const kx = x + w - 16 * u, ky = full ? y + 27 * u : y + 81 * u;
    ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(kx, ky, 12 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accFill(kx - 11 * u, ky - 11 * u, 22 * u, 22 * u); ctx.beginPath(); ctx.arc(kx, ky, 11 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = holo || gold ? '#111' : '#fff'; ctx.textAlign = 'center'; ctx.font = `800 ${8 * u}px ${DISPLAY}`; ctx.fillText(String(c.walk?.km ?? ''), kx, ky - 1.4 * u);
    ctx.font = `700 ${3.4 * u}px ${DISPLAY}`; ctx.fillText('KM', kx, ky + 5 * u); ctx.textAlign = 'left';
    // Nom et description
    const light = full, name = window.I18N.name(c).toUpperCase();
    let fs = 8.4 * u, lines; for (; ; fs -= .3 * u) { ctx.font = `800 ${fs}px ${DISPLAY}`; lines = wrap(ctx, name, w - 36 * u, 2); if (fs < 5 * u || lines.every(l => ctx.measureText(l).width <= w - 36 * u)) break; }
    const ny = full ? y + h - 46 * u : y + 86 * u;
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = light ? '#fff' : gold ? '#3a2a08' : ink;
    lines.forEach((l, n) => ctx.fillText(l, x + 5 * u, ny + fs * .8 + n * fs * .95));
    ctx.font = `500 ${3.6 * u}px ${TEXT}`; ctx.fillStyle = light ? '#fff' : '#59604f';
    ctx.fillText(clip(ctx, window.I18N.subtitle(c) || '', w - 10 * u), x + 5 * u, ny + fs * .8 + lines.length * fs * .95 + 1.4 * u);
    // Profil de dénivelé décoratif (même tirage que dans le jeu n'est pas nécessaire : simple ondulation)
    const by = y + h - 18 * u, pr = 13 * u; let seed = [...c.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 233280, 7);
    ctx.beginPath(); ctx.moveTo(x, by);
    for (let i = 0; i <= 24; i++) { seed = (seed * 9301 + 49297) % 233280; ctx.lineTo(x + i * w / 24, by - pr * (.2 + .5 * (.5 + .5 * Math.sin(i / 3 + seed % 7)) + .3 * seed / 233280)); }
    ctx.lineTo(x + w, by); ctx.closePath(); ctx.globalAlpha = .3; ctx.fillStyle = accFill(x, by - pr, w, pr); ctx.fill(); ctx.globalAlpha = 1;
    // Stats
    ctx.fillStyle = ink; ctx.fillRect(x, by, w, 18 * u);
    const st = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), colW = w / 3;
    st.forEach(([k, v], n) => {
      const sx = x + 4 * u + n * colW;
      if (n) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + n * colW, by + 3 * u, 2, 12 * u); }
      ctx.fillStyle = '#a8ad9c'; ctx.font = `600 ${2.8 * u}px ${DISPLAY}`; ctx.fillText(window.I18N.statKey(k).toUpperCase(), sx, by + 6.5 * u);
      ctx.fillStyle = gold ? '#f6d478' : paper; ctx.font = `600 ${4.4 * u}px ${MONO}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 6 * u), sx, by + 13 * u);
    });
    // Liseré de rareté
    if (c.rarity === 'legendaire' || c.rarity === 'mythique') { ctx.strokeStyle = c.rarity === 'mythique' ? '#c8102e' : '#d9a52c'; ctx.lineWidth = 2.8 * u; ctx.strokeRect(x, y, w, h); }
  }

  // Voiture : « Showroom » (voir style.css, .card.cat-voiture)
  function showroom(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 100, acc = LAND_ACC[c.rarity] || LAND_ACC.commune, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const bg = ctx.createRadialGradient(x + w / 2, y + h * .3, 10, x + w / 2, y + h * .3, h * .8);
    bg.addColorStop(0, gold ? '#2e2614' : '#2b2e35'); bg.addColorStop(1, gold ? '#0b0904' : '#0b0c0f');
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const px = x + 1.6 * u, py = y + 1.6 * u, pw = w - 3.2 * u, ph = full ? h - 3.2 * u : 66 * u;
    if (photo) {
      const m = /^(\d+)%\s+(\d+)%(?:;--zoom:([\d.]+))?/.exec(c.pos || '') || [];
      const fx = (+m[1] || 50) / 100, fy = (+m[2] || 55) / 100, z = +m[3] || 1;
      ctx.save(); rr(ctx, px, py, pw, ph, full ? 3 * u : [3 * u, 3 * u, 0, 0]); ctx.clip();
      if (gold) ctx.filter = 'sepia(.25) saturate(1.2)';
      cover(ctx, photo, px - pw * (z - 1) * fx, py - ph * (z - 1) * fy, pw * z, ph * z, fy, false, fx); ctx.restore();
    }
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    if (full) { g.addColorStop(0, 'rgba(0,0,0,.15)'); g.addColorStop(.35, 'rgba(0,0,0,0)'); g.addColorStop(.62, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); }
    else { g.addColorStop(.55, 'rgba(11,12,15,0)'); g.addColorStop(1, gold ? '#0b0904' : '#0b0c0f'); }
    ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
    if (holo) { ctx.save(); ctx.globalCompositeOperation = 'color-dodge'; ctx.globalAlpha = .26; ctx.fillStyle = gradient(ctx, px, py, pw, ph, ['#00000000', ...IRIS, '#00000000'], 115); ctx.fillRect(px, py, pw, ph); ctx.restore(); }
    // Emblème émaillé
    const bx = full ? x + w - 10 * u : x + w / 2, by = full ? y + 10 * u : y + 67 * u, br = (full ? 6 : 7) * u;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 2 * u; ctx.shadowOffsetY = u;
    ctx.fillStyle = '#6c717a'; ctx.beginPath(); ctx.arc(bx, by, br + 1.1 * u, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = gold ? '#f7dc84' : '#d9dce2'; ctx.beginPath(); ctx.arc(bx, by, br + .7 * u, 0, Math.PI * 2); ctx.fill();
    if (holo) { const cg = ctx.createConicGradient(.5, bx, by); [...IRIS, IRIS[0]].forEach((col, n) => cg.addColorStop(n / 5, col)); ctx.fillStyle = cg; }
    else { const rg = ctx.createRadialGradient(bx - br * .3, by - br * .4, 1, bx, by, br); const base = gold ? '#d9a52c' : acc;
      rg.addColorStop(0, gold ? '#fff1b8' : '#ffffffaa'); rg.addColorStop(.25, base); rg.addColorStop(1, base); ctx.fillStyle = rg; }
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    ctx.letterSpacing = '0px'; ctx.fillStyle = holo || gold ? '#2a1e05' : '#fff'; ctx.font = `700 ${4.6 * u}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('B', bx, by + .3 * u);
    // Nom, description, stats
    const name = window.I18N.name(c).toUpperCase();
    ctx.letterSpacing = `${1.2 * u}px`; let fs = 7.4 * u;
    for (; fs > 4 * u; fs -= .2 * u) { ctx.font = `600 ${fs}px ${TEXT}`; if (ctx.measureText(name).width <= w - 12 * u) break; }
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = gold ? '#f6d478' : '#eceae4'; ctx.fillText(name, x + w / 2, y + 84 * u);
    ctx.letterSpacing = '0px'; ctx.font = `400 ${3.4 * u}px ${TEXT}`; ctx.fillStyle = gold ? '#b8a06a' : full ? '#d5d7dc' : '#a5a8af';
    wrap(ctx, window.I18N.subtitle(c) || '', w - 16 * u, 2).forEach((l, n) => ctx.fillText(l, x + w / 2, y + 91 * u + n * 4.4 * u));
    const st = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), cw = (w - 16 * u) / 3;
    st.forEach(([k, v], n) => {
      const cx = x + 8 * u + cw * (n + .5);
      if (n) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + 8 * u + cw * n, y + h - 16 * u, 2, 9 * u); }
      ctx.letterSpacing = `${.5 * u}px`; ctx.fillStyle = gold ? '#b8a06a' : '#8d9098'; ctx.font = `500 ${2.3 * u}px ${TEXT}`; ctx.fillText(window.I18N.statKey(k).toUpperCase(), cx, y + h - 12.5 * u);
      ctx.letterSpacing = '0px'; ctx.fillStyle = gold ? '#f6d478' : '#eceae4'; ctx.font = `500 ${4 * u}px ${TEXT}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), cw - 2 * u), cx, y + h - 7 * u);
    });
    ctx.textAlign = 'left';
    // Filet chromé (ou doré, rubis, irisé)
    const ring = holo ? IRIS : gold || c.rarity === 'legendaire' ? ['#fff1b8', '#a87b1e', '#f7dc84', '#8a6516', '#fff1b8'] : c.rarity === 'mythique' ? ['#ffd0d8', '#8a0020', '#ff6b81', '#6a0016', '#ffd0d8'] : ['#f5f6f8', '#7d828c', '#e8eaee', '#6c717a', '#f5f6f8'];
    ctx.strokeStyle = gradient(ctx, x, y, w, h, ring); ctx.lineWidth = .5 * u; rr(ctx, x + 1.6 * u, y + 1.6 * u, w - 3.2 * u, h - 3.2 * u, 3 * u); ctx.stroke();
  }

  async function render(c, finish) {
    if (c.landscape) try { await Promise.all([document.fonts?.load(`40px ${LOBSTER}`), document.fonts?.load(`40px ${SLAB}`), document.fonts?.load(`20px ${ELITE}`)]); } catch (_) { /* police de secours */ }
    if (c.cat === 'histoire') try { await document.fonts?.load(`40px ${TYPE}`); } catch (_) { /* police de secours */ }
    if (c.cat === 'bd') try { await Promise.all([document.fonts?.load(`40px ${POP}`), document.fonts?.load(`700 24px ${COMIC}`)]); } catch (_) { /* police de secours */ }
    await document.fonts?.ready;
    const L = window.I18N.lang, ed = c.cat === 'edition' && API.packById(c.pack);
    const fin = API.FINISHES.find(f => f.id === finish) || API.FINISHES[0];
    const photoFile = (finish === 'plein' && c.alt) || c.img;
    const photo = c.cat === 'evenement' || !photoFile ? null
      : window.IMAGES?.[photoFile] ? await loadImage(API.imgUrl(photoFile, 960)) || await commonsImage(photoFile, 900) : await commonsImage(photoFile, 900);
    const logo = await loadImage('logo.svg');

    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    // Fond : bleu nuit, rayons dorés, lueur de la couleur de la carte
    const glow = fin.color || (ed ? ed.metal[1] : css(`--r-${c.rarity}`) || '#e2b33c');
    ctx.fillStyle = '#0c1020'; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, H * 0.48, 40, W / 2, H * 0.48, W * 0.75);
    rg.addColorStop(0, glow + '66'); rg.addColorStop(1, '#0c102000');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * 0.48); ctx.globalAlpha = 0.06; ctx.fillStyle = '#e2b33c';
    for (let i = 0; i < 36; i++) { ctx.rotate(Math.PI / 18); ctx.fillRect(0, -6, W, 12); }
    ctx.restore();

    // En-tête : logo et nom
    if (logo) ctx.drawImage(logo, 60, 44, 74, 74);
    ctx.fillStyle = '#f6efe0'; ctx.font = `800 52px ${DISPLAY}`; ctx.textBaseline = 'middle';
    ctx.fillText('BROL', 148, 82);
    ctx.fillStyle = '#e2b33c'; ctx.font = `600 24px ${DISPLAY}`; ctx.textAlign = 'right';
    ctx.fillText((L === 'nl' ? 'BELGISCHE VERZAMELKAARTEN' : 'CARTES DE COLLECTION BELGES'), W - 60, 82);
    ctx.textAlign = 'left';

    // Carte
    // Paysage : carte horizontale, plus large et moins haute
    const land = !!c.landscape, cw = land ? 960 : CW, ch = land ? Math.round(960 * 63 / 88) : CH;
    const x = (W - cw) / 2, y = land ? 300 : 170, pad = c.walk || c.cat === 'voiture' ? 0 : land ? (finish === 'plein' ? 0 : finish === 'or' ? 17 : 9) : 16, r = land ? 15 : 30;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    rr(ctx, x, y, cw, ch, r);
    const arch = c.cat === 'histoire'; // cartes Histoire : dossier « Archives » (voir style.css)
    const bd = c.cat === 'bd'; // cartes Bulles : design « Pop »
    const frame = c.cat === 'voiture' ? ['#0b0c0f', '#0b0c0f'] : c.walk ? ['#f3efe4', '#e9e3d2'] : land ? (finish === 'holo' ? FRAMES.holo : finish === 'or' ? FRAMES.or : c.rarity === 'legendaire' ? FRAMES.legendaire : c.rarity === 'mythique' ? ['#5a0012', '#ff2d55', '#9a0020', '#ff6b81', '#5a0012'] : ['#ffffff', '#f4f1ea'])
      : bd && (finish === 'normal' || finish === 'plein') ? [POP_ACC[c.rarity] || POP_ACC.commune, POP_ACC[c.rarity] || POP_ACC.commune] : arch && (finish === 'normal' || finish === 'plein') ? ARCH_FRAMES[c.rarity] || ARCH_FRAMES.commune : FRAMES[fin.pack || finish !== 'normal' ? finish : c.rarity] || (ed ? [ed.metal[2], ed.metal[0], ed.metal[1], ed.metal[0], ed.metal[2]] : FRAMES[c.rarity]);
    ctx.fillStyle = gradient(ctx, x, y, cw, ch, ed && finish === 'normal' ? [ed.metal[2], ed.metal[0], ed.metal[1], ed.metal[0], ed.metal[2]] : frame, fin.id === 'tricolore' ? 0 : 135);
    ctx.fill(); ctx.restore();
    const ix = x + pad, iy = y + pad, iw = cw - pad * 2, ih = ch - pad * 2;
    ctx.save(); rr(ctx, ix, iy, iw, ih, land ? 10 : 18); ctx.clip();
    if (land) postcard(ctx, c, photo, ix, iy, iw, ih, finish, cw / 100);
    else if (c.walk) walkCard(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (c.cat === 'voiture') showroom(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (arch) archives(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (bd) pop(ctx, c, photo, ix, iy, iw, ih, finish);
    else {
      ctx.fillStyle = finish === 'noir' ? '#050505' : '#15161a'; ctx.fillRect(ix, iy, iw, ih);
      const statsH = 116, bandH = 190, full = finish === 'plein';
      const photoH = full ? ih : ih - statsH;
      if (photo) {
        ctx.save();
        if (finish === 'or') ctx.filter = 'sepia(.65) saturate(1.3)';
        if (finish === 'noir' || finish === 'pave') ctx.filter = 'grayscale(1) contrast(1.1)';
        const flat = c.emblem || c.artwork || (['commune', 'province', 'region', 'enseignement'].includes(c.cat) && /\.(svg|png)$/i.test(photoFile || ''));
        if (flat) { ctx.fillStyle = '#20232b'; ctx.fillRect(ix, iy, iw, photoH); cover(ctx, photo, ix + 50, iy + 50, iw - 100, photoH - bandH - 70, 0.5, true); }
        else { // cadrage sur le visage, avec le zoom éventuel
          const v = (window.FOCUS?.[photoFile] || '50 20').split(' ').map(Number);
          cover(ctx, photo, ix, iy, iw, photoH, v[1] / 100, false, v[0] / 100, v[2] ? [v[2], v[3] / 100, (v[4] ?? 100) / 100] : null);
        }
        ctx.restore();
      } else if (c.cat === 'evenement') {
        ctx.fillStyle = '#121318'; ctx.fillRect(ix, iy, iw, photoH);
        ctx.fillStyle = gradient(ctx, ix, iy, iw, photoH, ['#fff1b8', '#d6a12a'], 90); ctx.textAlign = 'center';
        ctx.font = `800 ${fitText(ctx, String(c.stats[0][1]), iw - 60, 230, 800, DISPLAY)}px ${DISPLAY}`;
        ctx.fillText(String(c.stats[0][1]), ix + iw / 2, iy + (photoH - bandH) / 2); ctx.textAlign = 'left';
      }
      // Reflet des versions spéciales
      if (finish === 'holo' || fin.pack) {
        ctx.save(); ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = finish === 'holo' // Chrome : une barre de lumière en diagonale
          ? gradient(ctx, ix, iy, iw, ih, ['#ffffff00', '#ffffff00', '#ffffffcc', '#aae6ffaa', '#ffbef099', '#ffffff00', '#ffffff00'], 115)
          : gradient(ctx, ix, iy, iw, ih, ['#ff008040', '#ffdc0040', '#00ffb440', '#008cff40', '#be00ff40'], 115);
        ctx.fillRect(ix, iy, iw, ih); ctx.restore();
      }
      // Bandeau : nom, sous-titre, méta
      const fam = c.family || 'gris';
      const band = ed ? ed.body[1] : finish === 'or' || finish === 'noir' ? '#0d0b06' : c.rarity === 'mythique' && finish === 'normal' ? '#7a001c' : css(`--p-${fam}`) || '#6f7077'; // Rubis
      const ink = ed ? ed.metal[0] : finish === 'or' || finish === 'noir' ? '#f6d478' : BAND_INK_DARK.has(fam) && !full && !(c.rarity === 'mythique' && finish === 'normal') ? '#141414' : '#ffffff';
      const by = iy + ih - statsH - bandH;
      ctx.save();
      if (full) { const g = ctx.createLinearGradient(0, by - 60, 0, by + bandH); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000d'); ctx.fillStyle = g; ctx.fillRect(ix, by - 60, iw, bandH + 60); }
      else { ctx.beginPath(); ctx.moveTo(ix, by + 26); ctx.lineTo(ix + iw, by); ctx.lineTo(ix + iw, by + bandH); ctx.lineTo(ix, by + bandH); ctx.closePath(); ctx.fillStyle = band; ctx.fill(); }
      ctx.restore();
      const name = window.I18N.name(c).toUpperCase();
      ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
      // Nom en entier sur deux lignes au plus : on réduit la taille jusqu'à ce qu'il tienne (les longs noms nobles…)
      let fs = 64, lines;
      for (; ; fs -= 2) {
        ctx.font = `800 ${fs}px ${DISPLAY}`;
        lines = wrap(ctx, name, iw - 60, 99);
        if (fs <= 34 || (lines.length <= (fs > 54 ? 1 : 2) && lines.every(l => ctx.measureText(l).width <= iw - 60))) break;
      }
      if (lines.length > 2) { lines = wrap(ctx, name, iw - 60, 2); }
      let ty = by + bandH - 60 - (lines.length - 1) * fs * 0.95;
      for (const l of lines) { ctx.fillText(l, ix + 30, ty); ty += fs * 0.95; }
      // Ligne du bas : sous-titre à gauche, parti à droite (sans jamais se chevaucher)
      let partyW = 0;
      if (c.party) {
        ctx.font = `700 22px ${DISPLAY}`; ctx.textAlign = 'right';
        const party = wrap(ctx, c.party.toUpperCase(), iw / 2 - 40, 1)[0];
        partyW = ctx.measureText(party).width + 20;
        ctx.fillText(party, ix + iw - 30, by + bandH - 26); ctx.textAlign = 'left';
      }
      ctx.font = `500 24px ${TEXT}`; ctx.globalAlpha = 0.92;
      ctx.fillText(wrap(ctx, window.I18N.subtitle(c), iw - 60 - partyW, 1)[0] || '', ix + 30, by + bandH - 26); ctx.globalAlpha = 1;
      // Statistiques
      const sy = iy + ih - statsH;
      ctx.fillStyle = full ? 'rgba(8,8,10,.82)' : finish === 'or' || finish === 'noir' ? '#0d0b06' : '#111216'; ctx.fillRect(ix, sy, iw, statsH);
      const stats = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), colW = (iw - 40) / 3;
      stats.forEach(([k, v], i) => {
        const sx = ix + 22 + i * colW;
        if (i) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(sx - 12, sy + 24, 2, statsH - 48); }
        ctx.fillStyle = '#8d8d95'; ctx.font = `600 20px ${DISPLAY}`; ctx.fillText(wrap(ctx, window.I18N.statKey(k).toUpperCase(), colW - 20, 1)[0], sx, sy + 46);
        ctx.fillStyle = finish === 'or' || finish === 'noir' ? '#f6d478' : '#f1eee6'; ctx.font = `600 30px ${MONO}`;
        ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 20), sx, sy + 88);
      });
    }
    ctx.restore();
    // Paysage : version et rareté sous la carte ; autres cartes : numéro, version et rareté en haut de la carte
    if (land || c.walk || c.cat === 'voiture') {
      const tag = (finish !== 'normal' ? API.finishLabel(finish) + ' · ' : '') + API.rarityLabel(c.rarity);
      ctx.font = `800 26px ${DISPLAY}`; const tw = ctx.measureText(tag.toUpperCase()).width + 32;
      ctx.fillStyle = glow; rr(ctx, (W - tw) / 2, y + ch + 40, tw, 44, 8); ctx.fill();
      ctx.fillStyle = '#111'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(tag.toUpperCase(), W / 2, y + ch + 63); ctx.textAlign = 'left';
    }
    ctx.save(); rr(ctx, ix, iy, iw, ih, 18); ctx.clip();
    if (!land && !c.walk && c.cat !== 'voiture') {
    ctx.fillStyle = 'rgba(10,10,12,.7)'; rr(ctx, ix + 20, iy + 20, 104, 40, 8); ctx.fill();
    ctx.fillStyle = '#f1eee6'; ctx.font = `600 24px ${MONO}`; ctx.fillText(String(c.no).padStart(4, '0'), ix + 34, iy + 49);
    const tag = (finish !== 'normal' ? API.finishLabel(finish) + ' · ' : '') + API.rarityLabel(c.rarity);
    ctx.font = `800 24px ${DISPLAY}`; const tw = ctx.measureText(tag.toUpperCase()).width + 28;
    ctx.fillStyle = glow; rr(ctx, ix + iw - 20 - tw, iy + 20, tw, 40, 8); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillText(tag.toUpperCase(), ix + iw - 6 - tw, iy + 49);
    }
    ctx.restore();

    // Pied : crédit de la photo
    ctx.fillStyle = 'rgba(241,238,230,.7)'; ctx.font = `500 22px ${TEXT}`; ctx.textAlign = 'center';
    const credit = photoFile && c.cat !== 'evenement' ? `${L === 'nl' ? 'Foto' : 'Photo'} : ${photoFile.replace(/\.[a-z]+$/i, '')} — Wikimedia Commons` : 'Wikidata · Wikipédia';
    ctx.fillText(wrap(ctx, credit, W - 120, 1)[0], W / 2, H - 70);
    ctx.fillStyle = '#e2b33c'; ctx.font = `700 24px ${DISPLAY}`;
    ctx.fillText(location.host ? location.host.toUpperCase() : 'BROL', W / 2, H - 34);
    ctx.textAlign = 'left';
    cv.dataset.photo = photo ? '1' : '0';
    return cv;
  }

  async function share(c, finish = 'normal') {
    const cv = await render(c, finish);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (!blob) throw new Error('image');
    const file = new File([blob], `brol-${c.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}.png`, { type: 'image/png' });
    const text = `${window.I18N.name(c)} — Brol`;
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: text, text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return 'downloaded';
  }

  window.SHARE = { render, share };
})();
