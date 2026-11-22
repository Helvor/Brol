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
    citrouille: ['#1e0b2e', '#5b1f7a', '#ff7a00', '#ffd36a', '#ff7a00', '#5b1f7a', '#1e0b2e'],
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
  // place : image entière (contain) posée selon posX / posY, comme object-position, au lieu d'être centrée
  function cover(ctx, img, x, y, w, h, posY = 0.2, contain = false, posX = 0.5, zoom = null, place = false) {
    const s = contain ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
    let iw = img.width * s, ih = img.height * s, dx = x + (w - iw) * (contain && !place ? 0.5 : posX), dy = y + (h - ih) * (contain && !place ? 0.5 : posY);
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

  // Cours d'eau : « Atlas » (voir style.css, .card.cat-riviere), carte horizontale
  const GARAMOND = '"EB Garamond", Georgia, serif', STENCIL = '"Stardos Stencil", "Arial Black", sans-serif';
  const seeded = id => { let v = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 233280, 7); return () => (v = (v * 9301 + 49297) % 233280) / 233280; };
  function atlas(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 100, acc = LAND_ACC[c.rarity] || LAND_ACC.commune, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const ink = gold ? '#4a3410' : '#22303f', water = gold ? '#7a5410' : '#1d5aa6', paper = gold ? '#ead7a6' : '#f1ead6', grad = gold ? '#b8891f' : acc;
    ctx.fillStyle = holo ? gradient(ctx, x, y, w, h, ['#f6efff', '#e5fbff', '#fff3e3', '#f1e9ff']) : paper; ctx.fillRect(x, y, w, h);
    // Courbes de niveau et quadrillage
    ctx.save(); ctx.strokeStyle = holo ? 'rgba(150,110,255,.14)' : 'rgba(29,90,166,.09)'; ctx.lineWidth = .25 * u;
    for (let i = 1; i < 24; i++) { ctx.beginPath(); ctx.arc(x + .18 * w, y + .86 * h, i * 2.85 * u, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(34,48,63,.05)'; ctx.lineWidth = .15 * u;
    for (let gx = x; gx < x + w; gx += 12 * u) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
    for (let gy = y; gy < y + h; gy += 12 * u) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
    ctx.restore();
    // Photo
    const px = full ? x : x + 40 * u, py = full ? y : y + 3 * u, pw = full ? w : w - 43 * u, ph = full ? h : h - 6 * u;
    if (photo) {
      const m = /^(\d+)%\s+(\d+)%/.exec(c.pos || '') || [];
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.filter = gold ? 'sepia(.45) saturate(1.2) contrast(1.05)' : 'saturate(1.1) contrast(1.03)';
      cover(ctx, photo, px, py, pw, ph, (+m[2] || 50) / 100, false, (+m[1] || 50) / 100); ctx.restore();
    }
    if (holo) { ctx.save(); ctx.globalCompositeOperation = 'color-dodge'; ctx.globalAlpha = .4; ctx.fillStyle = gradient(ctx, px, py, pw, ph, ['#00000000', ...IRIS, '#00000000'], 115); ctx.fillRect(px, py, pw, ph); ctx.restore(); }
    if (!full) {
      ctx.strokeStyle = ink; ctx.lineWidth = .3 * u; ctx.strokeRect(px, py, pw, ph);
      // Bordure graduée et filet intérieur
      const t = 1.1 * u, seg = 4 * u;
      for (let gx = x, n = 0; gx < x + w; gx += seg, n++) { ctx.fillStyle = n % 2 ? '#fbf8ef' : holo ? IRIS[n % 5] : grad; ctx.fillRect(gx, y, seg, t); ctx.fillRect(gx, y + h - t, seg, t); }
      for (let gy = y, n = 0; gy < y + h; gy += seg, n++) { ctx.fillStyle = n % 2 ? '#fbf8ef' : holo ? IRIS[n % 5] : grad; ctx.fillRect(x, gy, t, seg); ctx.fillRect(x + w - t, gy, t, seg); }
      ctx.strokeStyle = ink; ctx.lineWidth = .25 * u; ctx.strokeRect(x + t, y + t, w - 2 * t, h - 2 * t);
    }
    // Rose des vents
    const rx = x + w - 10.1 * u, ry = y + 10.1 * u, rs = u * .275;
    ctx.save(); ctx.translate(rx, ry); ctx.scale(rs, rs); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const a of [90, 180, 270]) { ctx.save(); ctx.rotate(a * Math.PI / 180); ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(3.5, -3.5); ctx.lineTo(0, 0); ctx.lineTo(-3.5, -3.5); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = holo ? '#b38bff' : gold ? '#f7dc84' : acc; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(3.5, -3.5); ctx.lineTo(0, 0); ctx.lineTo(-3.5, -3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 6px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.fillText('N', 0, -21); ctx.restore();
    // Légende : panneau de gauche (cartouche de papier en Plein cadre)
    let lx = x + 4.4 * u, ly = y + 4.4 * u; const lw = 32 * u;
    if (full) {
      const bh = 40 * u; lx = x + 4 * u; ly = y + h - 2.4 * u - bh + 1.6 * u;
      ctx.fillStyle = 'rgba(241,234,214,.93)'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 2 * u; ctx.fillRect(x + 2.4 * u, y + h - 2.4 * u - bh, 36 * u, bh); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = ink; ctx.lineWidth = .25 * u; ctx.strokeRect(x + 2.4 * u, y + h - 2.4 * u - bh, 36 * u, bh);
    }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#7a6f58'; ctx.font = `600 ${1.9 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.4 * u}px`;
    ctx.fillText(String(window.I18N.tv(c.river?.kind || '')).toUpperCase(), lx, ly + 1.8 * u); ctx.letterSpacing = '0px';
    ctx.textAlign = 'right'; ctx.fillStyle = ink; ctx.font = `600 ${1.9 * u}px ${MONO}`; ctx.fillText(String(c.no).padStart(4, '0'), lx + lw, ly + 1.8 * u); ctx.textAlign = 'left';
    const top = c.rarity === 'legendaire' || c.rarity === 'mythique', name = top ? window.I18N.name(c).toUpperCase() : window.I18N.name(c);
    let fs = (top ? 6.2 : 7.4) * u, lines;
    for (; ; fs -= .2 * u) { ctx.font = `italic 700 ${fs}px ${GARAMOND}`; ctx.letterSpacing = top ? `${fs * .12}px` : '0px'; lines = wrap(ctx, name, lw, 2); if (fs < 3.6 * u || lines.every(l => ctx.measureText(l).width <= lw)) break; }
    ctx.fillStyle = holo ? gradient(ctx, lx, ly, lw, 10 * u, ['#6a3df0', '#1d8fd6', '#12a57a', '#c0399a'], 0) : water;
    let ty = ly + 3 * u + fs * .85; for (const l of lines) { ctx.fillText(l, lx, ty); ty += fs * .95; } ctx.letterSpacing = '0px';
    ctx.font = `500 ${2.2 * u}px ${TEXT}`; ctx.fillStyle = '#5a5140';
    for (const l of wrap(ctx, window.I18N.subtitle(c) || '', lw, 2)) { ty += .2 * u; ctx.fillText(l, lx, ty); ty += 2.6 * u; }
    // Tracé du cours d'eau (décoratif)
    if (!full) {
      const tx = lx, tyy = ty + .6 * u, tw = lw, th = 8.4 * u, rnd = seeded(c.id);
      ctx.strokeStyle = 'rgba(34,48,63,.25)'; ctx.lineWidth = .2 * u; ctx.beginPath(); ctx.moveTo(tx, tyy); ctx.lineTo(tx + tw, tyy); ctx.moveTo(tx, tyy + th); ctx.lineTo(tx + tw, tyy + th); ctx.stroke();
      let yy = 22 + rnd() * 8; const sx = v => tx + v / 100 * tw, sy = v => tyy + v / 40 * th, y0 = yy;
      ctx.beginPath(); ctx.moveTo(sx(4), sy(yy));
      for (let v = 4; v < 92; v += 11) { const ny = 8 + rnd() * 26; ctx.bezierCurveTo(sx(v + 4), sy(yy), sx(v + 7), sy(ny), sx(v + 11), sy(ny)); yy = ny; }
      ctx.strokeStyle = 'rgba(29,90,166,.18)'; ctx.lineWidth = 1.2 * u; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = water; ctx.lineWidth = .4 * u; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx(4), sy(y0), .5 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = water; ctx.beginPath(); ctx.moveTo(sx(93), sy(yy - 4)); ctx.lineTo(sx(99), sy(yy)); ctx.lineTo(sx(93), sy(yy + 4)); ctx.closePath(); ctx.fill();
      ty = tyy + th + 1.2 * u;
    }
    // Statistiques avec points de conduite
    const st = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3);
    for (const [k, v] of st) {
      ty += 2.4 * u;
      ctx.fillStyle = '#7a6f58'; ctx.font = `600 ${1.8 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.18 * u}px`; const key = window.I18N.statKey(k).toUpperCase(); ctx.fillText(key, lx, ty); const kw = ctx.measureText(key).width; ctx.letterSpacing = '0px';
      ctx.fillStyle = ink; ctx.font = `700 ${2.4 * u}px ${DISPLAY}`; ctx.textAlign = 'right'; const val = clip(ctx, String(window.I18N.tv(v)), lw * .6); ctx.fillText(val, lx + lw, ty); ctx.textAlign = 'left';
      const vw = ctx.measureText(val).width; ctx.strokeStyle = 'rgba(34,48,63,.35)'; ctx.lineWidth = .25 * u; ctx.setLineDash([.3 * u, .6 * u]);
      ctx.beginPath(); ctx.moveTo(lx + kw + u, ty); ctx.lineTo(lx + lw - vw - u, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    // Échelle proportionnelle à la longueur
    const km = c.river?.km || 0, segs = Math.max(4, Math.min(10, Math.round(4 + Math.log10(Math.max(km, 1)) * 2)));
    const sy2 = full ? ty + 2.6 * u : y + h - 4.4 * u - 1.4 * u, label = km ? `${km.toLocaleString(window.I18N.lang === 'nl' ? 'nl-BE' : 'fr-BE')} km` : '';
    ctx.font = `600 ${1.8 * u}px ${MONO}`; ctx.fillStyle = ink; ctx.fillText('0', lx, sy2 + 1.2 * u);
    const lab = ctx.measureText(label).width, bx = lx + 2.4 * u, bw = lw - 2.4 * u - lab - u;
    ctx.textAlign = 'right'; ctx.fillText(label, lx + lw, sy2 + 1.2 * u); ctx.textAlign = 'left';
    for (let n = 0; n < segs; n++) { ctx.fillStyle = n % 2 ? '#fbf8ef' : holo ? IRIS[n % 5] : grad; ctx.fillRect(bx + n * bw / segs, sy2 - .2 * u, bw / segs, 1.3 * u); }
    ctx.strokeStyle = ink; ctx.lineWidth = .2 * u; ctx.strokeRect(bx, sy2 - .2 * u, bw, 1.3 * u);
  }

  // Moulins : « Sac de farine » (voir style.css, .card.cat-moulin)
  const MILL_INK = { commune: '#3b3a36', 'peu-commune': '#2f6b3f', rare: '#224f9c', epique: '#5b2f98', legendaire: '#8f6208', mythique: '#b0122a' };
  const FLOUR = { fr: { commune: 'Farine bise', 'peu-commune': 'Farine de froment', rare: 'Fleur de farine', epique: 'Farine extra', legendaire: 'Qualité supérieure', mythique: 'Farine impériale' },
    nl: { commune: 'Grof meel', 'peu-commune': 'Tarwebloem', rare: 'Bloem', epique: 'Extra bloem', legendaire: 'Superieure kwaliteit', mythique: 'Keizerlijke bloem' } };
  function sack(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein', nl = window.I18N.lang === 'nl';
    const ink = gold ? '#8a6516' : holo ? '#7a5cd6' : MILL_INK[c.rarity] || MILL_INK.commune, jute = '#e9dec2';
    const bg = ctx.createRadialGradient(x + w / 2, y + h * .38, 10, x + w / 2, y + h * .38, h * .7);
    bg.addColorStop(0, gold ? '#fff8e2' : '#f3ead3'); bg.addColorStop(1, gold ? '#ecd9a2' : '#d8c69c'); ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const weave = () => { ctx.fillStyle = gold ? 'rgba(150,110,20,.08)' : 'rgba(110,80,30,.09)'; for (let v = 0; v < w; v += .9 * u) ctx.fillRect(x + v, y, .35 * u, h); for (let v = 0; v < h; v += .9 * u) ctx.fillRect(x, y + v, w, .35 * u); };
    weave();
    const cx = x + w / 2, cy = y + 59 * u, r = 28 * u, type = c.mill?.type === 'eau' ? 'eau' : 'vent';
    if (full && photo) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); cover(ctx, photo, x, y, w, h, .45); ctx.restore(); weave();
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(.3, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.8)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    // Ourlet cousu et rayures
    ctx.fillStyle = 'rgba(110,80,30,.14)'; ctx.fillRect(x, y, w, 3.6 * u);
    ctx.strokeStyle = 'rgba(70,50,20,.55)'; ctx.lineWidth = .4 * u; ctx.setLineDash([1.2 * u, .8 * u]); ctx.beginPath(); ctx.moveTo(x, y + 1.2 * u); ctx.lineTo(x + w, y + 1.2 * u); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = full ? .6 : .85; ctx.fillStyle = ink; ctx.fillRect(x, y + 6.6 * u, w, 1.5 * u); ctx.fillRect(x, y + 9.4 * u, w, 1.5 * u); ctx.globalAlpha = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = full ? '#fff' : 'rgba(70,50,20,.7)'; ctx.font = `700 ${3 * u}px ${MONO}`; ctx.fillText('N° ' + String(c.no).padStart(4, '0'), x + w - 4 * u, y + 2 * u);
    // « MOULIN À VENT » en arc
    const arch = (nl ? (type === 'eau' ? 'Watermolen' : 'Windmolen') : (type === 'eau' ? 'Moulin à eau' : 'Moulin à vent')).toUpperCase();
    const R = 63 * u, acy = y + 22.5 * u + R; ctx.font = `700 ${7.1 * u}px ${STENCIL}`; ctx.fillStyle = full ? '#fff' : gold ? '#7a5a12' : ink; ctx.textAlign = 'center';
    const sp = 1.3 * u, widths = [...arch].map(ch => ctx.measureText(ch).width + sp), total = widths.reduce((a, b) => a + b, 0) - sp;
    let ang = -total / 2 / R;
    [...arch].forEach((ch, n) => { const a = ang + (widths[n] - sp) / 2 / R; ctx.save(); ctx.translate(cx + Math.sin(a) * R, acy - Math.cos(a) * R); ctx.rotate(a); ctx.fillText(ch, 0, 0); ctx.restore(); ang += widths[n] / R; });
    // Médaillon
    if (!full) {
      const rings = holo ? [[3, '#6bd7ff'], [2.6, jute], [1.7, '#b38bff'], [1, jute]] : [[3, ink], [2.6, jute], [1.7, ink], [1, jute]];
      for (const [d, col] of rings) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r + d * u, 0, Math.PI * 2); ctx.fill(); }
      if (photo) {
        const m = /^(\d+)%\s+(\d+)%(?:;--zoom:([\d.]+))?/.exec(c.pos || '') || [], fx = (+m[1] || 50) / 100, fy = (+m[2] || 45) / 100, z = +m[3] || 1;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip(); ctx.filter = 'saturate(.85) sepia(.15) contrast(1.05)';
        cover(ctx, photo, cx - r - 2 * r * (z - 1) * fx, cy - r - 2 * r * (z - 1) * fy, 2 * r * z, 2 * r * z, fy, false, fx); ctx.restore();
      }
    }
    // Pictogramme : ailes ou roue
    const ix2 = full ? x + 9.5 * u : x + 64 * u + 6.5 * u, iy2 = full ? y + 9.5 * u + 4 * u : y + 74 * u + 6.5 * u, ir = (full ? 5.5 : 6.5) * u;
    ctx.fillStyle = jute; ctx.beginPath(); ctx.arc(ix2, iy2, ir + .8 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = holo ? gradient(ctx, ix2 - ir, iy2 - ir, 2 * ir, 2 * ir, IRIS) : ink; ctx.beginPath(); ctx.arc(ix2, iy2, ir, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(ix2, iy2); ctx.scale(ir / 16.6, ir / 16.6); ctx.fillStyle = jute; ctx.strokeStyle = jute; ctx.lineWidth = 2;
    if (type === 'eau') { ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke(); for (const a of [0, 45, 90, 135]) { ctx.save(); ctx.rotate(a * Math.PI / 180); ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke(); ctx.restore(); } }
    else for (const a of [0, 90, 180, 270]) { ctx.save(); ctx.rotate(a * Math.PI / 180); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, -11); ctx.lineTo(2, -11); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // Nom au pochoir, qualité, description
    const name = window.I18N.name(c).toUpperCase(), ny = y + (full ? 88 : 93) * u;
    let fs = 8.6 * u; for (; fs > 4 * u; fs -= .2 * u) { ctx.font = `700 ${fs}px ${STENCIL}`; ctx.letterSpacing = `${fs * .03}px`; if (ctx.measureText(name).width <= w - 8 * u) break; }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    ctx.fillStyle = full ? '#fff' : holo ? gradient(ctx, x, ny, w, fs, ['#c0399a', '#6a3df0', '#1d8fd6', '#12a57a'], 0) : gold ? gradient(ctx, x, ny, w, fs, ['#6e4f0c', '#a87b1e', '#4a3410'], 90) : ink;
    ctx.fillText(name, cx, ny + fs * .85); ctx.letterSpacing = '0px';
    const grade = FLOUR[nl ? 'nl' : 'fr'][c.rarity].toUpperCase(); ctx.font = `700 ${3.2 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.55 * u}px`;
    const gw = ctx.measureText(grade).width + 6 * u, gy = ny + fs + 1.6 * u;
    ctx.save(); ctx.translate(cx, gy + 2.3 * u); ctx.rotate(-2 * Math.PI / 180); ctx.fillStyle = holo ? gradient(ctx, -gw / 2, -2.3 * u, gw, 4.6 * u, IRIS, 0) : gold ? '#8a6516' : ink; ctx.fillRect(-gw / 2, -2.3 * u, gw, 4.6 * u);
    ctx.fillStyle = holo ? '#2a1d3a' : jute; ctx.textBaseline = 'middle'; ctx.fillText(grade, 0, .2 * u); ctx.restore(); ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic'; ctx.font = `500 ${3.4 * u}px ${TEXT}`; ctx.fillStyle = full ? '#eee' : gold ? '#5a4416' : '#5b4a2c';
    ctx.fillText(clip(ctx, window.I18N.subtitle(c) || '', w - 8 * u), cx, gy + 9.4 * u);
    // Cases tamponnées
    const st = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), gap = 1.6 * u, bw = (w - 6.8 * u - 2 * gap) / 3, bh = 15 * u, by = y + h - 3 * u - bh;
    st.forEach(([k, v], n) => {
      const bx = x + 3.4 * u + n * (bw + gap);
      if (full) { ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, bx, by, bw, bh, .8 * u); ctx.fill(); }
      ctx.strokeStyle = full ? 'rgba(255,255,255,.8)' : ink; ctx.lineWidth = .45 * u; rr(ctx, bx, by, bw, bh, .8 * u); ctx.stroke();
      ctx.fillStyle = full ? '#ddd' : '#7a6440'; ctx.font = `600 ${2.6 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.2 * u}px`; ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), bw - 2 * u), bx + bw / 2, by + 5 * u); ctx.letterSpacing = '0px';
      ctx.fillStyle = full ? '#fff' : gold ? '#6e4f0c' : ink; ctx.font = `700 ${3.8 * u}px ${DISPLAY}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), bw - 2 * u), bx + bw / 2, by + 11 * u);
    });
    ctx.textAlign = 'left';
  }

  // Arsenal : « Plan d'armurier » (voir style.css, .card.cat-arme)
  const PROOF = { commune: '#cfd8e6', 'peu-commune': '#6fe0a0', rare: '#7fb2ff', epique: '#c39bff', legendaire: '#ffd36b', mythique: '#ff5a6e' };
  function blueprint(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const line = gold ? 'rgba(60,40,8,.75)' : 'rgba(235,244,255,.85)', proof = gold ? '#5a3f08' : holo ? '#fff' : PROOF[c.rarity] || PROOF.commune, text = gold ? '#2a1e05' : '#fff', soft = gold ? '#5a4416' : '#9fb8d8';
    if (gold) ctx.fillStyle = gradient(ctx, x, y, w, h, ['#b8891f', '#f7dc84', '#c9971c', '#fff1b8', '#a87b1e']);
    else if (holo) ctx.fillStyle = gradient(ctx, x, y, w, h, ['#1b3f8f', '#3b2c8f', '#0f6a8f', '#2a3f9a']);
    else { const g = ctx.createRadialGradient(x + w / 2, y + h * .3, 10, x + w / 2, y + h * .3, h * .75); g.addColorStop(0, '#1a4f8f'); g.addColorStop(1, '#123d73'); ctx.fillStyle = g; }
    ctx.fillRect(x, y, w, h);
    const grid = (step, a) => { ctx.fillStyle = gold ? `rgba(60,40,8,${a * .75})` : `rgba(255,255,255,${a})`; for (let v = 0; v < w; v += step) ctx.fillRect(x + v, y, Math.max(1, .15 * u), h); for (let v = 0; v < h; v += step) ctx.fillRect(x, y + v, w, Math.max(1, .15 * u)); };
    grid(3 * u, .06); grid(15 * u, .16);
    // Figure
    const px = full ? x : x + 9 * u, py = full ? y : y + 13 * u, pw = full ? w : w - 15 * u, ph = full ? h : 66 * u;
    if (!full) { ctx.fillStyle = '#dce7f4'; ctx.fillRect(px, py, pw, ph); }
    if (photo) {
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      const pl = /--plein-fit:contain/.test(c.pos || '') && c.pos;
      if (full && pl) {
        // Petite pièce entière (ARME_POS --plein-*) : fond uni qui prolonge la photo, image posée et réduite, fondus du masque
        const v = k => (new RegExp(`--${k}:([^;]+)`).exec(pl) || [])[1], [ax, ay] = (v('plein-pos') || '50% 50%').split(' ').map(t => parseFloat(t) / 100), z = +v('plein-zoom') || 1;
        const bg = v('plein-bg') || '#0b2a50', ox = px + ax * pw, oy = py + ay * ph, clear = /^#[\da-f]{6}$/i.test(bg) ? bg + '00' : 'rgba(0,0,0,0)'; // fondu sans gris sombre
        ctx.fillStyle = bg; ctx.fillRect(px, py, pw, ph);
        cover(ctx, photo, px, py, pw, ph, ay, true, ax, z === 1 ? null : [z, ax, ay], true);
        // Masque (--plein-mask) : chaque dégradé repeint le fond là où il est transparent, aux mêmes endroits que style.css (transform compris)
        for (const [, g] of (v('plein-mask') || '').matchAll(/linear-gradient\(([^()]*)\)/g)) {
          const parts = g.split(','), hor = /deg/.test(parts[0]), stops = parts.filter(t => !/deg/.test(t)).map(t => [/transparent/.test(t) ? 1 : 0, parseFloat(t.trim().split(/\s+/)[1]) / 100]);
          const a0 = hor ? ox + z * (px - ox) : oy + z * (py - oy), len = (hor ? pw : ph) * z;
          const gr = hor ? ctx.createLinearGradient(a0, 0, a0 + len, 0) : ctx.createLinearGradient(0, a0, 0, a0 + len);
          stops.forEach(([o, f]) => { gr.addColorStop(Math.min(1, Math.max(0, f)), o ? bg : clear); });
          ctx.fillStyle = gr; ctx.fillRect(px, py, pw, ph);
        }
      } else if (full) cover(ctx, photo, px, py, pw, ph, .5);
      else {
        ctx.filter = gold ? 'grayscale(1) sepia(.6) contrast(1.2)' : 'grayscale(1) contrast(1.25) brightness(1.06)'; ctx.globalCompositeOperation = 'multiply';
        // --fit:cover (ARME_POS) : photo à fond coloré qui remplit le cadre, comme style.css
        const [ax, ay] = posOf(c, .5, .5);
        const z = +(/;--zoom:([\d.]+)/.exec(c.pos || '') || [])[1] || 1; // zoom éventuel, comme style.css
        const rot = +(/;--rot:(-?[\d.]+)deg/.exec(c.pos || '') || [])[1] || 0; // pièce couchée (--rot), tournée autour du point visé
        if (rot) { const ox = px + ax * pw, oy = py + ay * ph; ctx.translate(ox, oy); ctx.rotate(rot * Math.PI / 180); ctx.scale(z, z); ctx.translate(-ox, -oy); cover(ctx, photo, px, py, pw, ph, .5, true, .5); }
        else if (/;--fit:cover/.test(c.pos || '')) cover(ctx, photo, px, py, pw, ph, ay, false, ax); else cover(ctx, photo, px, py, pw, ph, .5, true, .5, z === 1 ? null : [z, ax, ay]);
      }
      ctx.restore();
    }
    if (!full) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = gold ? 'rgba(184,137,31,.25)' : 'rgba(18,61,115,.22)'; ctx.fillRect(px, py, pw, ph); ctx.restore();
      ctx.strokeStyle = line; ctx.lineWidth = .35 * u; ctx.strokeRect(px, py, pw, ph);
      // Cotes
      const arrow = (ax, ay, dx, dy) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx * 2 * u - dy * u, ay + dy * 2 * u - dx * u); ctx.lineTo(ax + dx * 2 * u + dy * u, ay + dy * 2 * u + dx * u); ctx.closePath(); ctx.fill(); };
      ctx.fillStyle = line; ctx.fillRect(px, y + 81.6 * u, pw, .25 * u); arrow(px, y + 81.7 * u, 1, 0); arrow(px + pw, y + 81.7 * u, -1, 0);
      ctx.fillRect(x + 5.4 * u, py, .25 * u, ph); arrow(x + 5.5 * u, py, 0, 1); arrow(x + 5.5 * u, py + ph, 0, -1);
    } else {
      grid(15 * u, .14); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(8,30,60,.5)'); g.addColorStop(.25, 'rgba(8,30,60,0)'); g.addColorStop(.5, 'rgba(8,30,60,0)'); g.addColorStop(1, 'rgba(8,30,60,.9)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    // En-tête de la planche
    ctx.fillStyle = line; ctx.fillRect(x + 4 * u, y + 7.4 * u, w - 8 * u, .3 * u);
    ctx.fillStyle = text; ctx.font = `600 ${3 * u}px ${MONO}`; ctx.letterSpacing = `${.24 * u}px`; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${window.I18N.lang === 'nl' ? 'PLAAT' : 'PLANCHE'} ${String(c.no).padStart(4, '0')}`, x + 4 * u, y + 5.6 * u);
    ctx.textAlign = 'right'; ctx.globalAlpha = .75; ctx.fillText('FIG. 1', x + w - 4 * u, y + 5.6 * u); ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    // Cartouche
    const bx = x + 4 * u, by = y + 86 * u, bw = w - 8 * u, bh = h - 89 * u, sh = 13 * u, cw = 23 * u;
    ctx.fillStyle = gold ? 'rgba(255,246,210,.35)' : full ? 'rgba(8,30,60,.72)' : 'rgba(10,40,80,.55)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = line; ctx.lineWidth = .35 * u; ctx.strokeRect(bx, by, bw, bh);
    ctx.lineWidth = .3 * u; ctx.beginPath(); ctx.moveTo(bx + bw - cw, by); ctx.lineTo(bx + bw - cw, by + bh - sh); ctx.moveTo(bx, by + bh - sh); ctx.lineTo(bx + bw, by + bh - sh); ctx.stroke();
    const name = window.I18N.name(c).toUpperCase(), tw = bw - cw - 6 * u;
    let fs = 8.6 * u, lines; for (; ; fs -= .2 * u) { ctx.font = `800 ${fs}px ${DISPLAY}`; lines = wrap(ctx, name, tw, 2); if (fs < 4.5 * u || lines.every(l => ctx.measureText(l).width <= tw)) break; }
    ctx.font = `500 ${3.2 * u}px ${TEXT}`; const sub = wrap(ctx, window.I18N.subtitle(c) || '', tw, 2);
    const blockH = lines.length * fs * .95 + sub.length * 4 * u + u; let ty = by + (bh - sh - blockH) / 2 + fs * .8;
    ctx.font = `800 ${fs}px ${DISPLAY}`; ctx.fillStyle = holo ? gradient(ctx, bx, by, tw, fs, ['#ffd1f1', '#ffffff', '#b8f3ff'], 0) : text;
    for (const l of lines) { ctx.fillText(l, bx + 3 * u, ty); ty += fs * .95; }
    ctx.font = `500 ${3.2 * u}px ${TEXT}`; ctx.fillStyle = gold ? '#5a4416' : '#b9cfea'; ty += .4 * u;
    for (const l of sub) { ctx.fillText(l, bx + 3 * u, ty); ty += 4 * u; }
    // Poinçon du banc d'épreuves (perron dans un ovale)
    const ox = bx + bw - cw / 2, oy = by + (bh - sh) / 2 - 2.4 * u, s = 12 * u / 40;
    ctx.save(); ctx.translate(ox - 20 * s, oy - 26 * s); ctx.scale(s, s); if (holo) { ctx.shadowColor = '#b38bff'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = proof; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(20, 26, 18, 24, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(20, 26, 14.5, 20.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = holo ? '#ffd36b' : proof; ctx.beginPath(); ctx.moveTo(20, 9); ctx.lineTo(23, 13); ctx.lineTo(17, 13); ctx.closePath(); ctx.fill();
    ctx.fillRect(18.5, 13, 3, 20); ctx.fillRect(14, 33, 12, 3); ctx.fillRect(12, 36, 16, 3); ctx.fillRect(10, 39, 20, 3); ctx.restore();
    ctx.fillStyle = proof; ctx.font = `700 ${2.3 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.23 * u}px`; ctx.textAlign = 'center';
    ctx.fillText(API.rarityLabel(c.rarity).toUpperCase(), ox, oy + 11 * u); ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    // Caractéristiques
    const st = (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3), colW = bw / 3, sy = by + bh - sh;
    st.forEach(([k, v], n) => {
      const sx = bx + n * colW;
      if (n) { ctx.fillStyle = line; ctx.fillRect(sx, sy, .3 * u, sh); }
      ctx.fillStyle = soft; ctx.font = `600 ${2.4 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.28 * u}px`; ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), colW - 4 * u), sx + 2.2 * u, sy + 4.4 * u); ctx.letterSpacing = '0px';
      ctx.fillStyle = text; ctx.font = `600 ${3.8 * u}px ${MONO}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 4 * u), sx + 2.2 * u, sy + 10 * u);
    });
  }

  // Cadrage choisi dans le générateur (c.pos : « 50% 70% »), comme object-position dans style.css
  const posOf = (c, dx = .5, dy = .5) => { const m = /^(\d+)% (\d+)%/.exec(c.pos || ''); return m ? [m[1] / 100, m[2] / 100] : [dx, dy]; };
  const statRows = c => (API.statsOf ? API.statsOf(c) : c.stats).slice(0, 3);

  // Pays noir : « Lampisterie » (voir style.css, .card.cat-industrie)
  const TOKEN = { commune: '#8e9298', 'peu-commune': '#4f9a73', rare: '#4f7fd0', epique: '#8a5bd0', legendaire: '#d9a52c', mythique: '#d4483c' };
  function lamp(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein', tk = gold ? '#d9a52c' : TOKEN[c.rarity] || TOKEN.commune;
    const bg = ctx.createRadialGradient(x + w / 2, y, 10, x + w / 2, y, h * .8); bg.addColorStop(0, '#2c2d31'); bg.addColorStop(1, '#0e0e10');
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const [px0, py0] = posOf(c, .5, .45);
    const px = full ? x : x + 3 * u, py = full ? y : y + 3 * u, pw = full ? w : w - 6 * u, ph = full ? h : 80 * u;
    ctx.save(); rr(ctx, px, py, pw, ph, full ? 0 : 1.6 * u); ctx.clip();
    // --fit:contain et --photo-bg (INDUSTRIE_POS) : objet entier sur le fond de sa photo, comme style.css (dégradé horizontal à deux couleurs)
    const bgc = ((/;--photo-bg:([^;]*)/.exec(c.pos || '') || [])[1] || '').match(/#[\da-f]{6}/gi) || [], fit = /;--fit:contain/.test(c.pos || '');
    if (bgc.length > 1) { const g = ctx.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, bgc[0]); g.addColorStop(1, bgc[1]); ctx.fillStyle = g; } else ctx.fillStyle = bgc[0] || '#222';
    ctx.fillRect(px, py, pw, ph);
    const lum = +(/;--lum:([\d.]+)/.exec(c.pos || '') || [])[1]; // photo sombre éclaircie, comme style.css (plein cadre compris)
    if (photo) { if (!full) ctx.filter = `sepia(.35) contrast(1.12) saturate(.8) brightness(${lum || .95})`; else if (lum) ctx.filter = `brightness(${lum})`; cover(ctx, photo, px, py, pw, ph, py0, fit, px0); ctx.filter = 'none'; }
    if (full) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(0,0,0,.2)'); g.addColorStop(.3, 'rgba(0,0,0,0)'); g.addColorStop(.58, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.9)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    else { const g = ctx.createRadialGradient(px + pw / 2, py + ph * .42, 0, px + pw / 2, py + ph * .42, pw * .75); g.addColorStop(0, 'rgba(255,196,110,.22)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    if (holo) { ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = gradient(ctx, px, py, pw, ph, ['#ffffff00', '#ff7ad9aa', '#ffd36baa', '#7dffb2aa', '#6bd7ffaa', '#b38bffaa', '#ffffff00'], 115); ctx.fillRect(px, py, pw, ph); }
    ctx.restore();
    if (!full) { ctx.strokeStyle = '#3a3b40'; ctx.lineWidth = .4 * u; rr(ctx, px, py, pw, ph, 1.6 * u); ctx.stroke(); }
    // Jeton de lampe : numéro de la carte dans le métal de la rareté
    const r = 8.5 * u, cx = x + w - 5 * u - r, cy = y + 72 * u + r;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 2 * u; ctx.shadowOffsetY = u;
    const tg = ctx.createRadialGradient(cx - r * .3, cy - r * .4, 0, cx, cy, r);
    if (holo) IRIS.forEach((col, i) => tg.addColorStop(i / (IRIS.length - 1), col)); else { tg.addColorStop(0, '#ffffffaa'); tg.addColorStop(.25, tk); tg.addColorStop(1, '#00000066'); }
    ctx.fillStyle = tk; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = tg; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#0e0e10'; ctx.beginPath(); ctx.arc(cx, cy - r + 2.9 * u, 1.3 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = holo ? '#1a1a1a' : 'rgba(20,16,10,.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${3.6 * u}px ${MONO}`; ctx.fillText(String(c.no).padStart(4, '0'), cx, cy + 2.2 * u);
    ctx.font = `700 ${1.7 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.14 * u}px`; ctx.fillText(API.rarityLabel(c.rarity).toUpperCase(), cx, cy + 4.6 * u); ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
    // Nom et description
    const tw = w - 29 * u, name = window.I18N.name(c).toUpperCase();
    let fs = (name.length > 18 ? 6 : name.length > 12 ? 7.4 : 9) * u, lines; for (; ; fs -= .2 * u) { ctx.font = `800 ${fs}px ${DISPLAY}`; lines = wrap(ctx, name, tw, 99); if (fs < 5 * u || (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= tw))) break; }
    lines = lines.length > 2 ? wrap(ctx, name, tw, 2) : lines;
    let ty = y + 87 * u + fs * .82;
    ctx.fillStyle = gold ? '#f6d478' : '#f2efe8'; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = u;
    for (const l of lines) { ctx.fillText(l, x + 5 * u, ty); ty += fs * .95; } ctx.restore();
    ctx.font = `500 ${3.5 * u}px ${TEXT}`; ctx.fillStyle = full ? '#d6d0c2' : '#b9b3a6'; ty += .8 * u;
    const limit = y + h - 24.5 * u, room = ty > limit ? 0 : Math.min(2, Math.floor((limit - ty) / (4.4 * u)) + 1); // jamais sur la bande de sécurité
    for (const l of wrap(ctx, window.I18N.subtitle(c) || '', w - 10 * u, room)) { ctx.fillText(l, x + 5 * u, ty); ty += 4.4 * u; }
    // Plaque d'acier rivetée et bande de sécurité
    const bx = x + 3 * u, bw = w - 6 * u, bh = 17 * u, by = y + h - 3 * u - bh;
    ctx.save(); rr(ctx, bx, by - 3 * u, bw, 1.6 * u, .4 * u); ctx.clip(); ctx.fillStyle = '#141414'; ctx.fillRect(bx, by - 3 * u, bw, 1.6 * u);
    ctx.fillStyle = '#f2c400'; for (let sx = bx - 4 * u; sx < bx + bw; sx += 5.1 * u) { ctx.beginPath(); ctx.moveTo(sx, by - 1.4 * u); ctx.lineTo(sx + 2.5 * u, by - 1.4 * u); ctx.lineTo(sx + 4.1 * u, by - 3 * u); ctx.lineTo(sx + 1.6 * u, by - 3 * u); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    const pg = ctx.createLinearGradient(0, by, 0, by + bh);
    (gold ? ['#c9971c', '#8a6516', '#6e4f0c'] : ['#5d6066', '#33353a', '#26282c']).forEach((col, i) => pg.addColorStop([0, .55, 1][i], col));
    ctx.fillStyle = pg; rr(ctx, bx, by, bw, bh, u); ctx.fill();
    for (const [rx, ry] of [[bx + 2 * u, by + 2 * u], [bx + bw - 2 * u, by + 2 * u], [bx + 2 * u, by + bh - 2 * u], [bx + bw - 2 * u, by + bh - 2 * u]]) {
      ctx.fillStyle = gold ? '#5a3f08' : '#2d2f34'; ctx.beginPath(); ctx.arc(rx, ry, .65 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = gold ? '#fff1b8' : '#c9ccd2'; ctx.beginPath(); ctx.arc(rx, ry, .5 * u, 0, Math.PI * 2); ctx.fill();
    }
    const colW = (bw - 7.2 * u) / 3;
    statRows(c).forEach(([k, v], n) => {
      const sx = bx + 3.6 * u + n * colW;
      if (n) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(sx - 1.2 * u, by + 3 * u, .2 * u, bh - 6 * u); }
      ctx.fillStyle = gold ? '#fff1b8' : '#c3c7cf'; ctx.font = `600 ${2.4 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.2 * u}px`;
      ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), colW - 2.4 * u), sx, by + 6.6 * u); ctx.letterSpacing = '0px';
      ctx.fillStyle = gold ? '#fff6d8' : '#fff'; ctx.font = `600 ${3.6 * u}px ${MONO}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 2.4 * u), sx, by + 12.4 * u);
    });
  }

  // Port et marine : « Affiche de paquebot » (voir style.css, .card.cat-marine)
  const LIMELIGHT = '"Limelight", Georgia, serif', PLAYFAIR = '"Playfair Display", Georgia, serif';
  const FLAG = { commune: '#8a8a8a', 'peu-commune': '#2f7d4a', rare: '#2e5fc0', epique: '#6b3db8', legendaire: '#c9971c', mythique: '#c8102e' };
  function liner(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const navy = gold ? '#0d0b06' : '#14213d', cream = gold ? '#f6e7b4' : holo ? '#f3f1fb' : '#efe6cf', flag = gold ? '#c9971c' : FLAG[c.rarity] || FLAG.commune;
    const flagFill = holo ? gradient(ctx, x, y, w, 0, IRIS, 0) : flag;
    ctx.fillStyle = cream; ctx.fillRect(x, y, w, h);
    const slope = w * Math.tan(6.6 * Math.PI / 180), ph = full ? h : 88 * u, [px0, py0] = posOf(c);
    ctx.save(); ctx.beginPath();
    if (full) ctx.rect(x, y, w, h); else { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + ph * .86); ctx.lineTo(x, y + ph); ctx.closePath(); }
    ctx.clip(); ctx.fillStyle = navy; ctx.fillRect(x, y, w, ph);
    if (photo) { ctx.filter = 'saturate(1.2) contrast(1.1)'; cover(ctx, photo, x, y, w, ph, py0, false, px0); ctx.filter = 'none'; }
    const g = ctx.createLinearGradient(0, y, 0, y + ph); g.addColorStop(0, 'rgba(20,33,61,.35)'); g.addColorStop(.3, 'rgba(20,33,61,0)');
    if (full) { g.addColorStop(.5, 'rgba(10,16,30,0)'); g.addColorStop(.8, 'rgba(10,16,30,.92)'); g.addColorStop(1, 'rgba(10,16,30,.95)'); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, ph); ctx.restore();
    // Bandes de coque, parallèles au bas de la photo
    if (!full) [[9, flagFill], [13, navy]].forEach(([dy, col]) => {
      const t = y + 79 * u + dy * u; ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(x, t); ctx.lineTo(x + w, t - slope); ctx.lineTo(x + w, t + 2.6 * u - slope); ctx.lineTo(x, t + 2.6 * u); ctx.closePath(); ctx.fill();
    });
    // Flamme à étoile
    const fw = 24 * u, fh = fw * 36 / 64, fx = x + w - fw, fy = y + 5 * u, k = fw / 64;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = u; ctx.shadowOffsetY = .6 * u; ctx.fillStyle = flagFill;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 64 * k, fy); ctx.lineTo(fx + 50 * k, fy + 18 * k); ctx.lineTo(fx + 64 * k, fy + 36 * k); ctx.lineTo(fx, fy + fh); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = (i % 2 ? 5.6 : 12) * k; ctx.lineTo(fx + 26 * k + rad * Math.cos(a), fy + 18.5 * k + rad * Math.sin(a)); }
    ctx.closePath(); ctx.fill();
    // Accroche (2ᵉ caractéristique), nom Art déco et description
    const ink = full ? '#f4ecd8' : navy, top = full ? y + h - 16 * u - 30 * u : y + 96 * u, tw = w - 10 * u;
    const st = statRows(c);
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = holo ? '#6a3df0' : flag; ctx.font = `700 ${2.8 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.84 * u}px`;
    ctx.fillText(clip(ctx, String(window.I18N.tv(st[1]?.[1] ?? '')).toUpperCase(), tw), x + 5 * u, top + 2.4 * u); ctx.letterSpacing = '0px';
    const name = window.I18N.name(c).toUpperCase();
    let fs = 8.4 * u, lines; for (; ; fs -= .2 * u) { ctx.font = `400 ${fs}px ${LIMELIGHT}`; lines = wrap(ctx, name, tw, 99); if (fs < 4.6 * u || (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= tw))) break; }
    lines = lines.length > 2 ? wrap(ctx, name, tw, 2) : lines;
    let ty = top + 3.4 * u + fs * .85; ctx.fillStyle = holo ? gradient(ctx, x, ty - fs, tw, fs, ['#6a3df0', '#1d8fd6', '#12a57a', '#c0399a'], 0) : ink;
    for (const l of lines) { ctx.fillText(l, x + 5 * u, ty); ty += fs; }
    ctx.font = `italic 500 ${3.5 * u}px ${PLAYFAIR}`; ctx.fillStyle = full ? '#dcd3bd' : '#3b3b45'; ty += .4 * u;
    const limit = y + h - 17.5 * u, room = ty > limit ? 0 : Math.min(2, Math.floor((limit - ty) / (4.3 * u)) + 1); // au-dessus de la bande marine
    for (const l of wrap(ctx, window.I18N.subtitle(c) || '', tw, room)) { ctx.fillText(l, x + 5 * u, ty); ty += 4.3 * u; }
    // Caractéristiques sur la bande marine
    const sh = 16 * u, sy = y + h - sh, colW = (w - 6 * u) / 3;
    ctx.fillStyle = navy; ctx.fillRect(x, sy, w, sh); ctx.fillStyle = flagFill; ctx.fillRect(x, sy, w, .8 * u);
    st.forEach(([kk, v], n) => {
      const sx = x + 3 * u + n * colW;
      if (n) { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(sx - 1.2 * u, sy + 3.4 * u, .2 * u, sh - 6 * u); }
      ctx.fillStyle = '#9fb3d1'; ctx.font = `600 ${2.4 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.2 * u}px`; ctx.fillText(clip(ctx, window.I18N.statKey(kk).toUpperCase(), colW - 2.4 * u), sx, sy + 6.2 * u); ctx.letterSpacing = '0px';
      ctx.fillStyle = gold ? '#f6d478' : '#f4ecd8'; ctx.font = `700 ${4.4 * u}px ${DISPLAY}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 2.4 * u), sx, sy + 12 * u);
    });
  }

  // Presse et imprimerie : « Une de journal » (voir style.css, .card.cat-presse)
  const FRAKTUR = '"UnifrakturMaguntia", "Old English Text MT", serif';
  const EDITION = { fr: { commune: 'Édition du matin', 'peu-commune': 'Édition du soir', rare: 'Deuxième édition', epique: 'Édition de nuit', legendaire: 'Dernière heure', mythique: 'Édition spéciale' },
    nl: { commune: 'Ochtendeditie', 'peu-commune': 'Avondeditie', rare: 'Tweede editie', epique: 'Nachteditie', legendaire: 'Laatste nieuws', mythique: 'Speciale editie' } };
  const NEWS_PRICE = { commune: '5 c.', 'peu-commune': '10 c.', rare: '15 c.', epique: '25 c.', legendaire: '50 c.', mythique: '1 fr.' };
  const NEWS_ACC = { commune: '#555', 'peu-commune': '#2f7d4a', rare: '#2e5fc0', epique: '#6b3db8', legendaire: '#a87b1e', mythique: '#c8102e' };
  function frontPage(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein', L = window.I18N.lang === 'nl' ? 'nl' : 'fr';
    const ink = gold ? '#3a2a08' : '#1a1a1a', acc = NEWS_ACC[c.rarity] || NEWS_ACC.commune, inkFill = holo ? gradient(ctx, x, y, w, 0, ['#6a3df0', '#1d8fd6', '#12a57a', '#c0399a'], 0) : ink;
    const pg = ctx.createLinearGradient(0, y, 0, y + h); pg.addColorStop(0, gold ? '#f6e7b4' : '#f6f2e8'); pg.addColorStop(1, gold ? '#f1dc9c' : holo ? '#f1ecfb' : '#f2ede1');
    ctx.fillStyle = pg; ctx.fillRect(x, y, w, h);
    // Photo tramée (similigravure)
    const px = full ? x : x + 4 * u, py = full ? y : y + 34 * u, pw = full ? w : w - 8 * u, ph = full ? h : 64 * u, [px0, py0] = posOf(c, .5, .3);
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.fillStyle = '#ddd6c6'; ctx.fillRect(px, py, pw, ph);
    if (photo) { ctx.filter = gold ? 'grayscale(1) sepia(.7) contrast(1.2)' : full ? 'grayscale(1) contrast(1.15)' : 'grayscale(1) contrast(1.3) brightness(1.05)'; cover(ctx, photo, px, py, pw, ph, py0, false, px0); ctx.filter = 'none'; }
    const dot = document.createElement('canvas'), ds = Math.max(4, Math.round(1.1 * u)); dot.width = dot.height = ds;
    const dc = dot.getContext('2d'); dc.fillStyle = 'rgba(0,0,0,.55)'; dc.beginPath(); dc.arc(ds / 2, ds / 2, ds * .3, 0, Math.PI * 2); dc.fill();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = full ? .3 : .45; ctx.fillStyle = ctx.createPattern(dot, 'repeat'); ctx.fillRect(px, py, pw, ph);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (full) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(246,242,232,.97)'); g.addColorStop(.3, 'rgba(246,242,232,.9)'); g.addColorStop(.42, 'rgba(246,242,232,0)'); g.addColorStop(.6, 'rgba(246,242,232,0)'); g.addColorStop(.74, 'rgba(246,242,232,.94)'); g.addColorStop(1, 'rgba(246,242,232,.97)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    if (!full) { ctx.strokeStyle = ink; ctx.lineWidth = .25 * u; ctx.strokeRect(px, py, pw, ph); }
    // Titre du journal, ligne d'édition et gros titre
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = gold ? '#8a6516' : inkFill; ctx.font = `400 ${11 * u}px ${FRAKTUR}`;
    ctx.fillText(L === 'nl' ? 'De Brol' : 'Le Brol', x + w / 2, y + 12.6 * u);
    const lx = x + 4 * u, lw = w - 8 * u, ly = y + 16.5 * u;
    ctx.fillStyle = ink; ctx.fillRect(lx, ly, lw, .5 * u); ctx.fillRect(lx, ly + 4.6 * u, lw, .2 * u);
    ctx.font = `600 ${2.5 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.2 * u}px`;
    ctx.textAlign = 'left'; ctx.fillText(`N° ${String(c.no).padStart(4, '0')}`, lx, ly + 3.5 * u);
    ctx.textAlign = 'right'; ctx.fillText(NEWS_PRICE[c.rarity] || '', lx + lw, ly + 3.5 * u);
    ctx.textAlign = 'center'; ctx.font = `800 ${2.5 * u}px ${DISPLAY}`; const ed = (EDITION[L][c.rarity] || '').toUpperCase();
    if (['legendaire', 'mythique'].includes(c.rarity)) { const ew = ctx.measureText(ed).width + 3.2 * u; ctx.fillStyle = acc; ctx.fillRect(x + w / 2 - ew / 2, ly + 1 * u, ew, 3.3 * u); ctx.fillStyle = '#fff'; }
    else ctx.fillStyle = acc;
    ctx.fillText(ed, x + w / 2, ly + 3.5 * u); ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
    const name = window.I18N.name(c); let fs = 8.4 * u; for (; fs > 4 * u; fs -= .2 * u) { ctx.font = `900 ${fs}px ${PLAYFAIR}`; if (ctx.measureText(name).width <= lw) break; }
    ctx.fillStyle = inkFill; ctx.fillText(clip(ctx, name, lw), lx, y + 22.4 * u + fs * .95);
    // Chapeau en italique et colonnes de texte
    ctx.font = `italic 500 ${3.6 * u}px ${PLAYFAIR}`; ctx.fillStyle = gold ? '#3a2a08' : '#2b2b2b';
    const sub = wrap(ctx, window.I18N.subtitle(c) || '', lw, full ? 2 : 3); let ty = full ? y + h - 22 * u - (sub.length - 1) * 4.5 * u : y + 103 * u; // plein cadre : juste au-dessus des caractéristiques
    for (const l of sub) { ctx.fillText(l, lx, ty); ty += 4.5 * u; }
    if (!full) { ctx.fillStyle = gold ? 'rgba(58,42,8,.18)' : 'rgba(0,0,0,.12)'; const cw = (lw - 4 * u) / 3;
      for (let col = 0; col < 3; col++) for (let yy = ty; yy < y + h - 20 * u; yy += 1.6 * u) ctx.fillRect(lx + col * (cw + 2 * u), yy, cw * (yy + 1.6 * u >= y + h - 20 * u ? .6 : 1), .5 * u); }
    // Caractéristiques sous un double filet
    const sy = y + h - 18 * u; ctx.fillStyle = ink; ctx.fillRect(lx, sy, lw, .35 * u); ctx.fillRect(lx, sy + .75 * u, lw, .35 * u);
    const colW = lw / 3;
    statRows(c).forEach(([k, v], n) => {
      const sx = lx + n * colW + (n ? 2 * u : 0);
      if (n) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(lx + n * colW, sy + 3 * u, .2 * u, 12 * u); }
      ctx.fillStyle = '#5a5550'; ctx.font = `600 ${2.4 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.2 * u}px`; ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), colW - 3 * u), sx, sy + 6.4 * u); ctx.letterSpacing = '0px';
      ctx.fillStyle = ink; ctx.font = `800 ${4 * u}px ${PLAYFAIR}`; ctx.fillText(clip(ctx, String(window.I18N.tv(v)), colW - 3 * u), sx, sy + 12.4 * u);
    });
  }

  // Chocolat & biscuits : « Ballotin » (voir style.css, .card.cat-chocolat)
  const RIBBON = { commune: '#8a6f5a', 'peu-commune': '#2f7d4a', rare: '#2e5fc0', epique: '#6b3db8', legendaire: '#c9971c', mythique: '#c8102e' };
  function ballotin(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const goldC = gold ? '#8a5a1c' : '#d9a441', cream = gold ? '#3a1f0f' : '#f6e3b4', rib = gold ? '#6e3b1c' : RIBBON[c.rarity] || RIBBON.commune;
    const ribFill = (x0, y0, w0, h0) => { if (holo) return gradient(ctx, x0, y0, w0, 0, IRIS, 0); const g = ctx.createLinearGradient(0, y0, 0, y0 + h0); g.addColorStop(0, '#ffffff88'); g.addColorStop(.35, rib); g.addColorStop(1, rib); return g; };
    // Carton chocolat (ou papier d'or) à losanges et filet d'or intérieur
    if (gold) ctx.fillStyle = gradient(ctx, x, y, w, h, ['#b8891f', '#f7dc84', '#c9971c', '#fff1b8', '#a87b1e'], 135);
    else { const bg = ctx.createRadialGradient(x + w / 2, y + h * .3, 10, x + w / 2, y + h * .3, h * .8); bg.addColorStop(0, '#4a2a1b'); bg.addColorStop(.6, '#3b2117'); bg.addColorStop(1, '#24130c'); ctx.fillStyle = bg; }
    ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = gold ? 'rgba(110,70,10,.14)' : 'rgba(217,164,65,.07)'; ctx.lineWidth = .25 * u;
    for (let k = -h; k < w + h; k += 4 * u) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); ctx.moveTo(x + k, y); ctx.lineTo(x + k - h, y + h); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = goldC; ctx.lineWidth = .4 * u; ctx.strokeRect(x + 1.6 * u, y + 1.6 * u, w - 3.2 * u, h - 3.2 * u);
    // Fenêtre du couvercle
    const [px0, py0] = posOf(c, .5, .45), z = +(/;--zoom:([\d.]+)/.exec(c.pos || '') || [])[1] || 1; // zoom éventuel, comme style.css
    const px = full ? x : x + 5 * u, py = full ? y : y + 5 * u, pw = full ? w : w - 10 * u, ph = full ? h : 78 * u;
    if (!full) { ctx.fillStyle = gold ? '#c9971c' : goldC; rr(ctx, px - 1.5 * u, py - 1.5 * u, pw + 3 * u, ph + 3 * u, 3 * u); ctx.fill(); ctx.fillStyle = '#24130c'; rr(ctx, px - .9 * u, py - .9 * u, pw + 1.8 * u, ph + 1.8 * u, 2.6 * u); ctx.fill(); ctx.fillStyle = goldC; rr(ctx, px - .6 * u, py - .6 * u, pw + 1.2 * u, ph + 1.2 * u, 2.4 * u); ctx.fill(); }
    ctx.save(); rr(ctx, px, py, pw, ph, full ? 0 : 2 * u); ctx.clip(); ctx.fillStyle = '#24130c'; ctx.fillRect(px, py, pw, ph);
    if (photo) { ctx.filter = 'saturate(1.08) contrast(1.04)'; cover(ctx, photo, px - pw * (z - 1) * px0, py - ph * (z - 1) * py0, pw * z, ph * z, py0, false, px0); ctx.filter = 'none'; }
    if (full) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(36,19,12,.2)'); g.addColorStop(.3, 'rgba(36,19,12,0)'); g.addColorStop(.48, 'rgba(36,19,12,0)'); g.addColorStop(.66, 'rgba(36,19,12,.9)'); g.addColorStop(1, 'rgba(24,12,6,.95)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    else { const g = ctx.createRadialGradient(px + pw / 2, py + ph * .4, pw * .3, px + pw / 2, py + ph * .4, pw * .8); g.addColorStop(0, 'rgba(36,19,12,0)'); g.addColorStop(1, 'rgba(36,19,12,.45)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    ctx.restore();
    // Ruban en travers et rosette : numéro et rareté
    const ry = y + 77 * u; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = u; ctx.shadowOffsetY = .6 * u;
    if (!full) { ctx.fillStyle = ribFill(x, ry, w, 5 * u); ctx.fillRect(x, ry, w, 5 * u); } // plein cadre : pas de ruban en travers du visage
    const r = 9 * u, cx = x + w - 6 * u - r, cy = y + 70.5 * u + r;
    for (const d of [-1, 1]) { ctx.save(); ctx.translate(cx + d * r * 1.1, cy - .6 * u); ctx.rotate(d * .25); ctx.fillStyle = ribFill(-5.5 * u, -3.5 * u, 11 * u, 7 * u); ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * u, 3.5 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = goldC; ctx.beginPath(); ctx.arc(cx, cy, r + .5 * u, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(cx - r * .3, cy - r * .4, 0, cx, cy, r);
    if (holo) IRIS.forEach((col, i) => bg.addColorStop(i / (IRIS.length - 1), col)); else { bg.addColorStop(0, '#ffffff99'); bg.addColorStop(.3, rib); bg.addColorStop(1, rib); }
    ctx.fillStyle = rib; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = bg; ctx.fill(); ctx.restore();
    ctx.fillStyle = holo || (c.rarity === 'legendaire' && !gold) ? '#2a1a05' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; // ruban doré : texte foncé
    ctx.font = `700 ${3.8 * u}px ${MONO}`; ctx.fillText(String(c.no).padStart(4, '0'), cx, cy + .4 * u);
    ctx.font = `700 ${2.3 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.08 * u}px`; ctx.fillText(clip(ctx, API.rarityLabel(c.rarity).toUpperCase(), 15 * u), cx, cy + 3.6 * u); ctx.letterSpacing = '0px';
    // Nom en lettres de confiseur et description, centrés
    const tw = w - 12 * u, name = window.I18N.name(c), mx = x + w / 2;
    let fs = (name.length > 20 ? 5.4 : name.length > 13 ? 6.6 : 8) * u, lines; for (; ; fs -= .2 * u) { ctx.font = `900 ${fs}px ${PLAYFAIR}`; lines = wrap(ctx, name, tw, 99); if (fs < 4.4 * u || (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= tw))) break; }
    lines = lines.length > 2 ? wrap(ctx, name, tw, 2) : lines;
    let ty = y + 90 * u + fs * .85;
    ctx.fillStyle = holo ? gradient(ctx, x, ty - fs, w, fs, ['#ffd1f1', '#fff6c8', '#b8f3ff'], 0) : cream;
    ctx.save(); if (!gold) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = .8 * u; }
    for (const l of lines) { ctx.fillText(l, mx, ty); ty += fs * 1.05; } ctx.restore();
    ctx.font = `italic 500 ${3.5 * u}px ${PLAYFAIR}`; ctx.fillStyle = gold ? '#5a3a14' : '#d8c3a0'; ty += .2 * u;
    const limit = y + h - 23 * u, room = ty > limit ? 0 : Math.min(2, Math.floor((limit - ty) / (4.2 * u)) + 1); // au-dessus des alvéoles
    for (const l of wrap(ctx, window.I18N.subtitle(c) || '', tw, room)) { ctx.fillText(l, mx, ty); ty += 4.2 * u; }
    // Trois alvéoles de pralines
    const sx0 = x + 5 * u, sw = w - 10 * u, gap = 2 * u, aw = (sw - 2 * gap) / 3, ah = 17 * u, sy = y + h - 4.5 * u - ah;
    statRows(c).forEach(([k, v], n) => {
      const ax = sx0 + n * (aw + gap);
      ctx.fillStyle = gold ? '#6e4f0c' : '#8a6a2c'; ctx.beginPath(); ctx.roundRect(ax - .35 * u, sy - .35 * u, aw + .7 * u, ah + .7 * u, 4 * u); ctx.fill();
      const ag = ctx.createRadialGradient(ax + aw / 2, sy + ah * .3, 0, ax + aw / 2, sy + ah * .3, aw * .8); ag.addColorStop(0, '#2a160d'); ag.addColorStop(1, '#160a05');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.roundRect(ax, sy, aw, ah, 4 * u); ctx.fill();
      ctx.fillStyle = gold ? '#e0b75a' : '#d9a441'; ctx.font = `600 ${2.6 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.2 * u}px`;
      ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), aw - 3 * u), ax + aw / 2, sy + 6.2 * u); ctx.letterSpacing = '0px';
      const val = String(window.I18N.tv(v)); let vs = 4 * u; // valeur longue : plus petite plutôt que coupée
      for (; vs > 2.4 * u; vs -= .1 * u) { ctx.font = `700 ${vs}px ${PLAYFAIR}`; if (ctx.measureText(val).width <= aw - 3 * u) break; }
      ctx.fillStyle = '#f6e3b4';
      if (ctx.measureText(val).width <= aw - 3 * u) ctx.fillText(val, ax + aw / 2, sy + 12 * u);
      else { ctx.font = `700 ${2.6 * u}px ${PLAYFAIR}`; wrap(ctx, val.replace(/-/g, '- '), aw - 3 * u, 2).forEach((l, i) => ctx.fillText(l.replace(/- /g, '-'), ax + aw / 2, sy + 10.4 * u + i * 3 * u)); } // sur deux lignes
    });
    ctx.textAlign = 'left';
  }

  // Géants et carnavals : « Affiche de ducasse » (voir style.css, .card.cat-geant)
  const GEANT_RANK = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire', 'mythique'];
  function poster(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const red = gold ? '#7a2a12' : '#c8102e', yel = '#f4b41a', ink = gold ? '#3a2a08' : '#1a1a1a', prog = gold ? '#fff1c4' : '#fff6dc', rib = gold ? '#6e3b1c' : RIBBON[c.rarity] || RIBBON.commune;
    const L = window.I18N.lang;
    // Papier d'affiche (ou papier d'or), losanges croisés et confettis
    ctx.fillStyle = gold ? gradient(ctx, x, y, w, h, ['#b8891f', '#f7dc84', '#c9971c', '#fff1b8', '#a87b1e'], 135) : (() => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#faefd2'); g.addColorStop(1, '#f6e7c1'); return g; })();
    ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.lineWidth = .35 * u;
    const t = Math.tan(34 * Math.PI / 180) * h; // losanges à 56°, comme style.css
    for (let k = -t; k < w + t; k += 7 * u / Math.sin(56 * Math.PI / 180)) {
      ctx.strokeStyle = gold ? 'rgba(110,70,10,.12)' : 'rgba(200,16,46,.07)'; ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + t, y); ctx.stroke();
      ctx.strokeStyle = gold ? 'rgba(110,70,10,.12)' : 'rgba(26,26,26,.06)'; ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + t, y + h); ctx.stroke();
    }
    if (!gold) [[3, 5, 17, 19, .5, 'rgba(200,16,46,.28)'], [11, 13, 13, 23, .45, 'rgba(244,180,26,.5)'], [7, 1, 21, 15, .4, 'rgba(46,95,192,.22)']].forEach(([ox, oy, sx, sy, r, col]) => {
      ctx.fillStyle = col; for (let px = ox; px < 95; px += sx) for (let py = oy; py < 135; py += sy) { ctx.beginPath(); ctx.arc(x + (px + sx / 2 - ox) * u, y + (py + sy / 2 - oy) * u, r * u, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.restore();
    // Paillettes des épiques et mieux, sur le papier (sous la photo, le ruban et le programme), comme style.css
    if (GEANT_RANK.indexOf(c.rarity) >= 3 && !full) {
      ctx.save(); ctx.globalAlpha = c.rarity === 'epique' ? .6 : 1;
      for (const [ox, oy, sxp, syp, col, r1] of [[2, 3, 9, 11, 'rgba(214,160,20,.95)', .8], [6, 8, 13, 9, 'rgba(220,60,120,.75)', .7]]) for (let gx = ox; gx < 95; gx += sxp) for (let gy = oy; gy < 135; gy += syp) {
        const cx = x + (gx + sxp / 2 - ox) * u, cy = y + (gy + syp / 2 - oy) * u, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r1 * u);
        g.addColorStop(0, '#fff7d0'); g.addColorStop(.3, '#fff7d0'); g.addColorStop(.55, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r1 * u, cy - r1 * u, 2 * r1 * u, 2 * r1 * u);
      }
      ctx.restore();
    }
    // Double filet du bord
    ctx.lineWidth = 1.2 * u; ctx.strokeStyle = red; ctx.strokeRect(x + .6 * u, y + .6 * u, w - 1.2 * u, h - 1.2 * u);
    ctx.lineWidth = .3 * u; ctx.strokeStyle = ink; ctx.strokeRect(x + 1.75 * u, y + 1.75 * u, w - 3.5 * u, h - 3.5 * u);
    // Photo : cadre rouge, lambrequin festonné (sauf plein cadre)
    const [px0, py0] = posOf(c, .5, .35), z = +(/;--zoom:([\d.]+)/.exec(c.pos || '') || [])[1] || 1; // zoom éventuel, comme style.css
    const px = full ? x : x + 5 * u, py = full ? y : y + 12.5 * u, pw = full ? w : w - 10 * u, ph = full ? h : 68 * u;
    if (!full) { ctx.fillStyle = ink; ctx.fillRect(px - 1 * u, py - 1 * u, pw + 2 * u, ph + 2 * u); ctx.fillStyle = red; ctx.fillRect(px - .7 * u, py - .7 * u, pw + 1.4 * u, ph + 1.4 * u); }
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.fillStyle = '#2a0f0f'; ctx.fillRect(px, py, pw, ph);
    if (photo) { ctx.filter = gold ? 'sepia(.65) saturate(1.3) contrast(1.05) brightness(.95)' : 'saturate(1.12) contrast(1.04)'; cover(ctx, photo, px - pw * (z - 1) * px0, py - ph * (z - 1) * py0, pw * z, ph * z, py0, false, px0); ctx.filter = 'none'; }
    if (full) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(42,15,15,.75)'); g.addColorStop(.16, 'rgba(42,15,15,0)'); g.addColorStop(.5, 'rgba(42,15,15,0)'); g.addColorStop(.66, 'rgba(42,15,15,.88)'); g.addColorStop(1, 'rgba(30,8,8,.95)'); ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); }
    ctx.restore();
    if (!full) { ctx.fillStyle = red; const sy0 = py + ph + .7 * u, r0 = 1.6 * u; for (let sx = px - .7 * u + r0; sx < px + pw + .7 * u; sx += 2 * r0) { ctx.beginPath(); ctx.arc(sx, sy0, r0, 0, Math.PI); ctx.fill(); } }
    // Guirlande de fanions rouges, jaunes et noirs
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = .4 * u; ctx.shadowOffsetY = .4 * u;
    for (let i = 0, fx = x + 4.3 * u; fx < x + w - 4.3 * u - .1; i++, fx += 6.4 * u) {
      const fw = Math.min(6.4 * u, x + w - 4.3 * u - fx), fy = y + 12.5 * u, hw = 4.4 * u * Math.tan(36 * Math.PI / 180);
      ctx.fillStyle = [red, yel, ink][i % 3]; ctx.beginPath(); ctx.moveTo(fx + 3.2 * u - hw, fy); ctx.lineTo(fx + 3.2 * u + hw, fy); ctx.lineTo(fx + 3.2 * u, fy + 4.4 * u); ctx.closePath();
      if (fw >= 3.2 * u + hw) ctx.fill();
    }
    ctx.restore();
    // En-tête « Grande Ducasse »
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const head = (L === 'nl' ? 'Grote Kermis' : 'Grande Ducasse').toUpperCase(); ctx.font = `400 ${6.4 * u}px ${SLAB}`; ctx.letterSpacing = `${.3 * u}px`;
    const hy = y + 9.2 * u;
    if (!holo) { ctx.fillStyle = full ? red : gold ? 'rgba(255,241,184,.7)' : yel; ctx.fillText(head, x + w / 2 + .35 * u, hy + .35 * u); }
    ctx.fillStyle = holo ? gradient(ctx, x, hy - 6 * u, w, 6 * u, ['#c8102e', '#b33dc6', '#1d8fd6', '#12a57a', '#c8102e'], 0) : full ? '#fff1c9' : red; ctx.fillText(head, x + w / 2, hy); ctx.letterSpacing = '0px';
    // Numéro en billet et étoiles de Gille (rareté)
    ctx.textAlign = 'left'; ctx.font = `600 ${3.4 * u}px ${MONO}`; const no = 'N° ' + String(c.no).padStart(4, '0'), nw = ctx.measureText(no).width + 3.2 * u;
    ctx.fillStyle = ink; ctx.fillRect(x + 7 * u, y + 18.5 * u, nw + .6 * u, 5.6 * u); ctx.fillStyle = prog; ctx.fillRect(x + 7.3 * u, y + 18.8 * u, nw, 5 * u);
    ctx.fillStyle = ink; ctx.fillText(no, x + 8.9 * u, y + 22.6 * u);
    const n = GEANT_RANK.indexOf(c.rarity) + 1, sw = n * 4 * u + (n - 1) * .5 * u + 2.8 * u, sx0 = x + w - 7 * u - sw, sy1 = y + 73 * u;
    ctx.fillStyle = 'rgba(26,26,26,.72)'; rr(ctx, sx0, sy1, sw, 5.8 * u, 2.9 * u); ctx.fill();
    for (let i = 0; i < n; i++) {
      const cx = sx0 + 1.4 * u + i * 4.5 * u + 2 * u, cy = sy1 + 2.9 * u, R1 = 2 * u;
      const g = ctx.createLinearGradient(0, cy - R1, 0, cy + R1); g.addColorStop(0, '#fff1b8'); g.addColorStop(1, yel); ctx.fillStyle = g; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rk = k % 2 ? R1 * .42 : R1; ctx[k ? 'lineTo' : 'moveTo'](cx + rk * Math.cos(a), cy + rk * Math.sin(a)); }
      ctx.closePath(); ctx.fill();
    }
    // Ruban en arc à queues d'aronde, nom en Lobster
    const bx = x + 2 * u, by = y + 83.5 * u, bw = w - 4 * u, bh = 15 * u, X = v => bx + v / 100 * bw, Y = v => by + v / 20 * bh;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = .6 * u; ctx.shadowOffsetY = .5 * u;
    ctx.beginPath(); ctx.moveTo(X(0), Y(4)); ctx.lineTo(X(9), Y(6)); ctx.quadraticCurveTo(X(50), Y(-1), X(91), Y(6)); ctx.lineTo(X(100), Y(4)); ctx.lineTo(X(95), Y(11)); ctx.lineTo(X(100), Y(18));
    ctx.lineTo(X(91), Y(16)); ctx.quadraticCurveTo(X(50), Y(9), X(9), Y(16)); ctx.lineTo(X(0), Y(18)); ctx.lineTo(X(5), Y(11)); ctx.closePath();
    if (holo) ctx.fillStyle = gradient(ctx, bx, by, bw, bh, IRIS, 0);
    else { const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#ffffff99'); g.addColorStop(.3, rib); g.addColorStop(1, rib); ctx.fillStyle = rib; ctx.fill(); ctx.fillStyle = g; }
    ctx.fill(); ctx.restore();
    const name = window.I18N.name(c), dark = holo || (c.rarity === 'legendaire' && !gold);
    let fs = 7.4 * u; for (; fs > 3.6 * u; fs -= .1 * u) { ctx.font = `400 ${fs}px ${LOBSTER}`; if (ctx.measureText(name).width <= bw - 24 * u) break; }
    ctx.textAlign = 'center'; const ny = by + 3.2 * u + fs * .95 + (7.4 * u - fs) * .55;
    ctx.save(); ctx.fillStyle = dark ? 'rgba(255,241,184,.6)' : 'rgba(0,0,0,.45)'; ctx.fillText(clip(ctx, name, bw - 24 * u), x + w / 2, ny + (dark ? .25 : .35) * u); ctx.restore();
    ctx.fillStyle = dark ? (holo ? '#1a1a1a' : '#2a1a05') : gold ? '#fff1c4' : '#fff'; ctx.fillText(clip(ctx, name, bw - 24 * u), x + w / 2, ny);
    // Description sous le ruban
    ctx.font = `italic 500 ${3.5 * u}px ${TEXT}`; ctx.fillStyle = full ? '#fff1c9' : gold ? '#3a2a08' : '#4a1f14';
    if (full) { ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = .4 * u; }
    wrap(ctx, window.I18N.subtitle(c) || '', w - 14 * u, 2).forEach((l, i) => ctx.fillText(l, x + w / 2, y + 102 * u + i * 4.27 * u));
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    // Programme : cartouche crème, filets rouges, trois colonnes
    const sx = x + 5.5 * u, sw2 = w - 11 * u, sh = 19.5 * u, sy = y + h - 4.4 * u - sh;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = u; ctx.shadowOffsetY = .6 * u; ctx.fillStyle = prog; ctx.fillRect(sx, sy, sw2, sh); ctx.restore();
    ctx.strokeStyle = red; ctx.lineWidth = .5 * u; ctx.strokeRect(sx + .25 * u, sy + .25 * u, sw2 - .5 * u, sh - .5 * u); ctx.lineWidth = .2 * u; ctx.strokeRect(sx + 1 * u, sy + 1 * u, sw2 - 2 * u, sh - 2 * u);
    ctx.font = `400 ${3 * u}px ${SLAB}`; ctx.letterSpacing = `${.36 * u}px`; const lab = (L === 'nl' ? 'Programma' : 'Programme').toUpperCase(), lw = ctx.measureText(lab).width + 5.2 * u;
    ctx.fillStyle = ink; ctx.fillRect(x + w / 2 - lw / 2 - .3 * u, sy - 2.5 * u, lw + .6 * u, 4.6 * u); ctx.fillStyle = red; ctx.fillRect(x + w / 2 - lw / 2, sy - 2.2 * u, lw, 4 * u);
    ctx.fillStyle = prog; ctx.fillText(lab, x + w / 2 + .18 * u, sy + .9 * u); ctx.letterSpacing = '0px';
    const cw = (sw2 - 2 * u) / 3;
    statRows(c).forEach(([k, v], i) => {
      const cx = sx + u + cw * i + cw / 2;
      if (i) { ctx.fillStyle = 'rgba(200,16,46,.55)'; for (let d = sy + 4 * u; d < sy + sh - 2 * u; d += .9 * u) ctx.fillRect(cx - cw / 2 - .15 * u, d, .3 * u, .4 * u); }
      ctx.fillStyle = red; ctx.font = `600 ${2.8 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.17 * u}px`; ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), cw - 2.8 * u), cx, sy + 7 * u); ctx.letterSpacing = '0px';
      const val = String(window.I18N.tv(v)); let vs = 4.2 * u;
      for (; vs > 2.5 * u; vs -= .1 * u) { ctx.font = `400 ${vs}px ${SLAB}`; if (ctx.measureText(val).width <= cw - 2.8 * u) break; }
      ctx.fillStyle = ink;
      if (ctx.measureText(val).width <= cw - 2.8 * u) ctx.fillText(val, cx, sy + 12.8 * u);
      else { ctx.font = `400 ${2.5 * u}px ${SLAB}`; wrap(ctx, val.replace(/-/g, '- '), cw - 2.8 * u, 2).forEach((l, j) => ctx.fillText(l.replace(/- /g, '-'), cx, sy + 11.4 * u + j * 3 * u)); } // sur deux lignes
    });
    ctx.textAlign = 'left';
  }

  // Inventions belges : « Brevet d'invention » (voir style.css, .card.cat-invention)
  const WAX = { commune: '#7a5c3e', 'peu-commune': '#2f7d4a', rare: '#2e5fc0', epique: '#6b3db8', legendaire: '#b8891f', mythique: '#c8102e' };
  function patent(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein', nl = window.I18N.lang === 'nl';
    const ink = holo ? '#f1f6ff' : gold ? '#3a2a08' : '#1d2a44', soft = holo ? '#c4d8f2' : gold ? '#6a5226' : '#4a4636', acc = WAX[c.rarity] || WAX.commune;
    const [hi, paper, lo] = holo ? ['#2c66ad', '#1f4f8f', '#153a6c'] : gold ? ['#f6e9c4', '#ead6a6', '#d2b276'] : ['#faf6ec', '#f4efe2', '#e6dcc4'];
    const veil = 'rgba(244,239,226,.9)';
    // Papier quadrillé et double filet d'encadrement
    const bg = ctx.createRadialGradient(x + w / 2, y + h * .4, 10, x + w / 2, y + h * .4, h * .75); bg.addColorStop(0, hi); bg.addColorStop(.65, paper); bg.addColorStop(1, lo);
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = holo ? 'rgba(255,255,255,.13)' : gold ? 'rgba(120,80,20,.12)' : 'rgba(70,110,170,.14)';
    for (let gx = x; gx < x + w; gx += 3.2 * u) ctx.fillRect(gx, y, .14 * u, h);
    for (let gy = y; gy < y + h; gy += 3.2 * u) ctx.fillRect(x, gy, w, .14 * u);
    ctx.strokeStyle = ink; ctx.lineWidth = .25 * u; ctx.strokeRect(x + 1.6 * u, y + 1.6 * u, w - 3.2 * u, h - 3.2 * u);
    ctx.lineWidth = .15 * u; ctx.strokeRect(x + 2.4 * u, y + 2.4 * u, w - 4.8 * u, h - 4.8 * u);
    // Planche : photo à double filet, sépia léger (cyanotype en holo)
    const px = full ? x : x + 6 * u, py = full ? y : y + 21.5 * u, pw = full ? w : w - 12 * u, ph = full ? h : 70 * u;
    const [px0, py0] = posOf(c, .5, .45), z = +(/;--zoom:([\d.]+)/.exec(c.pos || '') || [])[1] || 1; // zoom éventuel, comme style.css
    const fit = /;--fit:contain/.test(c.pos || ''); // image entière (schéma sur fond transparent), comme style.css
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.fillStyle = '#e8e1cf'; ctx.fillRect(px, py, pw, ph);
    if (photo) {
      ctx.filter = holo ? 'grayscale(1) contrast(1.1) brightness(1.08)' : gold ? 'sepia(.6) saturate(1.1) contrast(1.05)' : 'sepia(.28) saturate(.9) contrast(1.05)';
      cover(ctx, photo, px - pw * (z - 1) * px0, py - ph * (z - 1) * py0, pw * z, ph * z, py0, fit, px0); ctx.filter = 'none';
    }
    if (holo) { ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#2a6bb5'; ctx.fillRect(px, py, pw, ph); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    if (full) { ctx.fillStyle = veil; ctx.fillRect(x, y, w, 20.4 * u); }
    else { ctx.strokeStyle = ink; ctx.lineWidth = .3 * u; ctx.strokeRect(px - .15 * u, py - .15 * u, pw + .3 * u, ph + .3 * u); ctx.lineWidth = .25 * u; ctx.strokeRect(px - 1.22 * u, py - 1.22 * u, pw + 2.44 * u, ph + 2.44 * u); }
    // En-tête du Royaume, numéro tapé à la machine et rareté
    const hInk = full ? '#1d2a44' : ink, hSoft = full ? '#4a4636' : soft;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = hSoft; ctx.font = `600 ${2.5 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.8 * u}px`;
    ctx.fillText((nl ? 'Koninkrijk België' : 'Royaume de Belgique').toUpperCase(), x + w / 2 + .4 * u, y + 5.8 * u);
    ctx.fillStyle = hInk; ctx.font = `800 ${5 * u}px ${PLAYFAIR}`; ctx.fontVariantCaps = 'small-caps'; ctx.letterSpacing = `${.25 * u}px`;
    ctx.fillText(nl ? 'Uitvindingsoctrooi' : 'Brevet d’invention', x + w / 2, y + 11.3 * u); ctx.fontVariantCaps = 'normal'; ctx.letterSpacing = '0px';
    const lx = x + 5 * u, lw = w - 10 * u;
    ctx.fillStyle = hInk; ctx.fillRect(lx, y + 12.8 * u, lw, .2 * u); ctx.fillRect(lx, y + 13.3 * u, lw, .2 * u); ctx.fillRect(lx, y + 19.3 * u, lw, .2 * u);
    ctx.textAlign = 'left'; ctx.font = `400 ${3.5 * u}px ${ELITE}`; ctx.fillText(`Nº ${String(c.no).padStart(4, '0')}`, lx + .4 * u, y + 17.7 * u);
    ctx.textAlign = 'right'; ctx.fillStyle = holo ? ink : acc; ctx.font = `700 ${2.9 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.35 * u}px`;
    ctx.fillText(API.rarityLabel(c.rarity).toUpperCase(), lx + lw - .4 * u, y + 17.4 * u); ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
    // Tampon « Breveté » en biais : légendaires et mythiques
    if (['legendaire', 'mythique'].includes(c.rarity)) {
      const word = (nl ? 'Geoctrooieerd' : 'Breveté').toUpperCase();
      ctx.save(); ctx.font = `800 ${5.2 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.7 * u}px`;
      const sw = ctx.measureText(word).width + 4.4 * u, sh = 7 * u;
      ctx.translate(x + 8 * u + sw / 2, y + 27 * u + sh / 2); ctx.rotate(-12 * Math.PI / 180); ctx.globalAlpha = .88;
      ctx.fillStyle = 'rgba(255,246,240,.55)'; rr(ctx, -sw / 2, -sh / 2, sw, sh, u); ctx.fill();
      ctx.strokeStyle = '#c8102e'; ctx.lineWidth = .55 * u; ctx.stroke();
      ctx.fillStyle = '#c8102e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(word, .35 * u, .3 * u);
      ctx.restore(); ctx.letterSpacing = '0px';
    }
    // « Fig. 1 — nom » en Garamond italique (deux lignes au plus), description dessous
    const tx = x + (full ? 6.4 : 6) * u, tw = w - (full ? 12.8 : 12) * u, name = window.I18N.name(c), fig = 'Fig. 1 — ';
    let fs = (name.length > 18 ? 4.8 : name.length > 11 ? 5.6 : 6.6) * u, lines, figW;
    for (; ; fs -= .2 * u) {
      ctx.font = `italic 500 ${fs * .62}px ${GARAMOND}`; figW = ctx.measureText(fig).width;
      ctx.font = `italic 700 ${fs}px ${GARAMOND}`; lines = ['']; const words = name.split(' ');
      for (const wd of words) { const t = lines.at(-1) ? lines.at(-1) + ' ' + wd : wd, max = lines.length === 1 ? tw - figW : tw; if (ctx.measureText(t).width > max && lines.at(-1)) lines.push(wd); else lines[lines.length - 1] = t; }
      if (fs <= 4 * u || (lines.length <= 2 && ctx.measureText(lines[0]).width <= tw - figW && (!lines[1] || ctx.measureText(lines[1]).width <= tw))) break;
    }
    if (lines.length > 2) lines = [lines[0], clip(ctx, lines.slice(1).join(' '), tw)];
    ctx.font = `italic 500 ${3.7 * u}px ${GARAMOND}`; const sub = wrap(ctx, window.I18N.subtitle(c) || '', tw, 2);
    const top = y + 95 * u, subY = top + fs * .9 + (lines.length - 1) * fs * 1.05 + 1.2 * u + 3.3 * u;
    if (full) { ctx.fillStyle = veil; rr(ctx, x + 4 * u, top - 1.6 * u, w - 8 * u, subY - top + (sub.length - 1) * 4.4 * u + 2.8 * u, u); ctx.fill(); }
    const tInk = full ? '#1d2a44' : ink, tSoft = full ? '#4a4636' : soft;
    let ty = top + fs * .9;
    ctx.fillStyle = tSoft; ctx.font = `italic 500 ${fs * .62}px ${GARAMOND}`; ctx.fillText(fig, tx, ty);
    ctx.fillStyle = tInk; ctx.font = `italic 700 ${fs}px ${GARAMOND}`;
    lines.forEach((l, i) => { ctx.fillText(l, i ? tx : tx + figW, ty); ty += fs * 1.05; });
    ctx.fillStyle = tSoft; ctx.font = `italic 500 ${3.7 * u}px ${GARAMOND}`; ty = subY;
    for (const l of sub) { ctx.fillText(l, tx, ty); ty += 4.4 * u; }
    // Champs tapés à la machine sur ligne pointillée
    const sy = y + h - 18.4 * u, sx0 = x + (full ? 6.4 : 5) * u, sw = w - (full ? 12.8 : 10) * u, gap = 2.6 * u, colW = (sw - 2 * gap) / 3;
    if (full) { ctx.fillStyle = veil; rr(ctx, x + 4 * u, sy - .4 * u, w - 8 * u, 14.4 * u, u); ctx.fill(); }
    else { ctx.fillStyle = ink; ctx.fillRect(sx0, sy, sw, .25 * u); }
    statRows(c).forEach(([k, v], n) => {
      const ax = sx0 + n * (colW + gap);
      ctx.fillStyle = tSoft; ctx.font = `600 ${2.6 * u}px ${DISPLAY}`; ctx.letterSpacing = `${.36 * u}px`;
      ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), colW), ax, sy + 4.6 * u); ctx.letterSpacing = '0px';
      const val = String(window.I18N.tv(v)); let vs = 3.9 * u; // valeur longue : plus petite plutôt que coupée
      for (; vs > 2.4 * u; vs -= .1 * u) { ctx.font = `400 ${vs}px ${ELITE}`; if (ctx.measureText(val).width <= colW) break; }
      ctx.fillStyle = tInk;
      if (ctx.measureText(val).width <= colW) ctx.fillText(val, ax, sy + 9.6 * u);
      else { ctx.font = `400 ${2.6 * u}px ${ELITE}`; wrap(ctx, val, colW, 2).forEach((l, j) => ctx.fillText(l, ax, sy + 7.8 * u + j * 3 * u)); } // sur deux lignes
      ctx.save(); ctx.strokeStyle = tSoft; ctx.lineWidth = .3 * u; ctx.setLineDash([.3 * u, .7 * u]); ctx.beginPath(); ctx.moveTo(ax, sy + 11.2 * u); ctx.lineTo(ax + colW, sy + 11.2 * u); ctx.stroke(); ctx.restore();
    });
    // Cachet de cire à la couleur de la rareté (doré en version or), en dernier : par-dessus les bandeaux du plein cadre, comme dans le jeu
    const sr = 7.5 * u, scx = x + w - 2.6 * u - sr, scy = y + (full ? 83 : 80.5) * u + sr;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 1.6 * u; ctx.shadowOffsetY = .8 * u;
    const wax = ctx.createRadialGradient(scx - sr * .3, scy - sr * .4, 0, scx, scy, sr);
    if (gold) { wax.addColorStop(0, '#fff3c2'); wax.addColorStop(.4, '#d9b04a'); wax.addColorStop(1, '#8a6516'); }
    else { wax.addColorStop(0, '#ffffff88'); wax.addColorStop(.35, acc); wax.addColorStop(1, acc); }
    ctx.fillStyle = acc; ctx.beginPath(); ctx.ellipse(scx, scy, sr, sr * .97, .3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = wax; ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = gold ? 'rgba(90,63,8,.45)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = .35 * u; ctx.setLineDash([.9 * u, .6 * u]);
    ctx.beginPath(); ctx.arc(scx, scy, 5.2 * u, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.fillStyle = gold ? '#5a3f08' : 'rgba(255,255,255,.88)'; ctx.font = `900 ${4.2 * u}px ${PLAYFAIR}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('BE', scx, scy + .2 * u); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // Abbayes : « Enluminure » (voir style.css, .card.cat-abbaye)
  const ABB_RUB = { commune: '#6b4a2b', 'peu-commune': '#2f6b3a', rare: '#1f3a8a', epique: '#5b2378', legendaire: '#b8891f', mythique: '#b8891f' };
  const GLASS = ['#c81e32', '#1e46c8', '#e6b428', '#1e8c50', '#7a2ab8', '#c81e32'];
  // Arc brisé de l'arcade, comme le polygone --arch de style.css (épaule à 34 % de la hauteur)
  function arch(ctx, X, Y, W, Hh) {
    ctx.beginPath(); ctx.moveTo(X, Y + Hh); ctx.lineTo(X, Y + .34 * Hh);
    ctx.bezierCurveTo(X, Y + .15 * Hh, X + .34 * W, Y + .09 * Hh, X + .5 * W, Y);
    ctx.bezierCurveTo(X + .66 * W, Y + .09 * Hh, X + W, Y + .15 * Hh, X + W, Y + .34 * Hh);
    ctx.lineTo(X + W, Y + Hh); ctx.closePath();
  }
  function manuscrit(ctx, c, photo, x, y, w, h, finish) {
    const u = w / 95, gold = finish === 'or', holo = finish === 'holo', full = finish === 'plein';
    const rubric = '#9b1c1c', ink = '#2a1a0e', goldA = '#c9a03a', vellum = '#f3e6c4';
    const leaf = c.rarity === 'legendaire' || c.rarity === 'mythique';
    // Vélin : fond éclairci au centre, taches brunes, grain
    const vg = ctx.createRadialGradient(x + w / 2, y + h * .45, 0, x + w / 2, y + h * .45, Math.hypot(w, h) / 2);
    vg.addColorStop(0, '#f7edd2'); vg.addColorStop(.62, vellum); vg.addColorStop(1, '#e6d1a2'); ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
    for (const [fx, fy, rx, ry, a] of [[.18, .14, .4, .3, .13], [.86, .78, .45, .35, .14], [.7, .4, .3, .22, .07]]) {
      ctx.save(); ctx.translate(x + fx * w, y + fy * h); ctx.scale(rx * w, ry * h);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(150,100,35,${a})`); g.addColorStop(.7, 'rgba(150,100,35,0)');
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    ctx.fillStyle = 'rgba(90,60,20,.07)';
    for (let gx = .65 * u; gx < w; gx += 1.3 * u) for (let gy = .65 * u; gy < h; gy += 1.3 * u) ctx.fillRect(x + gx - .2 * u, y + gy - .2 * u, .4 * u, .4 * u);
    // Photo : arcade gothique à liseré d'or (plein cadre : toute la carte)
    const [px0, py0] = posOf(c, .5, .45);
    const px = full ? x : x + 7 * u, py = full ? y : y + 8.4 * u, pw = full ? w : w - 14 * u, ph = full ? h : 68 * u;
    if (!full) { arch(ctx, px, py, pw, ph); ctx.fillStyle = gradient(ctx, px, py, pw, ph, ['#8a6516', '#f7dc84', '#b8891f', '#fff1b8', '#a87b1e'], 160); ctx.fill(); }
    const ix = full ? px : px + .9 * u, iy = full ? py : py + .9 * u, iw = full ? pw : pw - 1.8 * u, ihh = full ? ph : ph - 1.8 * u;
    ctx.save(); if (full) { ctx.beginPath(); ctx.rect(ix, iy, iw, ihh); } else arch(ctx, ix, iy, iw, ihh); ctx.clip();
    ctx.fillStyle = full ? '#2a1a0e' : '#3a2a18'; ctx.fillRect(ix, iy, iw, ihh);
    if (photo) { ctx.filter = 'saturate(1.05) contrast(1.03) sepia(.08)'; cover(ctx, photo, ix, iy, iw, ihh, py0, false, px0); ctx.filter = 'none'; }
    if (holo) { // vitrail : verres colorés (mode couleur) puis plombs
      ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = .6;
      const cg = ctx.createConicGradient(30 * Math.PI / 180 - Math.PI / 2, ix + iw / 2, iy + ihh * .6); GLASS.forEach((col, n) => cg.addColorStop(n / 5, col));
      ctx.fillStyle = cg; ctx.fillRect(ix, iy, iw, ihh); ctx.restore();
      ctx.strokeStyle = 'rgba(25,18,12,.8)'; ctx.lineWidth = .35 * u; const t = Math.tan(30 * Math.PI / 180) * ihh, step = 9 * u / Math.sin(60 * Math.PI / 180);
      for (let k = -t; k < iw + t; k += step) { ctx.beginPath(); ctx.moveTo(ix + k, iy + ihh); ctx.lineTo(ix + k + t, iy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ix + k, iy); ctx.lineTo(ix + k + t, iy + ihh); ctx.stroke(); }
      ctx.fillStyle = 'rgba(25,18,12,.8)'; ctx.fillRect(ix + iw / 2 - .25 * u, iy, .5 * u, ihh);
    }
    ctx.restore();
    // Plein cadre : cartouche de vélin sous la photo
    if (full) {
      const cx0 = x + 3.6 * u, cy0 = y + 77 * u, cw0 = w - 7.2 * u, ch0 = h - 80.6 * u;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3 * u; ctx.shadowOffsetY = u; rr(ctx, cx0, cy0, cw0, ch0, u); ctx.fillStyle = vellum; ctx.fill(); ctx.restore();
      ctx.lineWidth = .45 * u; ctx.strokeStyle = goldA; rr(ctx, cx0 + .225 * u, cy0 + .225 * u, cw0 - .45 * u, ch0 - .45 * u, u); ctx.stroke();
      ctx.lineWidth = .3 * u; ctx.strokeStyle = rubric; rr(ctx, cx0 - .65 * u, cy0 - .65 * u, cw0 + 1.3 * u, ch0 + 1.3 * u, 1.5 * u); ctx.stroke();
    } else {
      // Double filet or et rouge (Dorée : bordure entière à la feuille d'or, filet rouge à l'intérieur)
      if (gold) {
        const b = 2.4 * u; ctx.fillStyle = gradient(ctx, x, y, w, h, ['#8a6516', '#f9e08a', '#b8891f', '#fff3c2', '#a87b1e', '#f3d47a', '#7a5a12'], 135);
        ctx.fillRect(x, y, w, b); ctx.fillRect(x, y + h - b, w, b); ctx.fillRect(x, y, b, h); ctx.fillRect(x + w - b, y, b, h);
        ctx.lineWidth = .3 * u; ctx.strokeStyle = rubric; ctx.strokeRect(x + 3.25 * u, y + 3.25 * u, w - 6.5 * u, h - 6.5 * u);
      } else {
        ctx.lineWidth = .45 * u; ctx.strokeStyle = goldA; ctx.strokeRect(x + 2.025 * u, y + 2.025 * u, w - 4.05 * u, h - 4.05 * u);
        ctx.lineWidth = .3 * u; ctx.strokeStyle = rubric; ctx.strokeRect(x + 1.1 * u, y + 1.1 * u, w - 2.2 * u, h - 2.2 * u);
      }
      // Fleurons des coins : quatre lobes autour d'un bouton rouge
      for (const [fx, fy] of [[5.6, 5.6], [95 - 5.6, 5.6], [5.6, h / u - 5.6], [95 - 5.6, h / u - 5.6]]) {
        const cx = x + fx * u, cy = y + fy * u; ctx.fillStyle = gold ? '#7a5410' : goldA;
        for (const [dx, dy] of [[0, -1.56], [-1.56, 0], [1.56, 0], [0, 1.56]]) { ctx.beginPath(); ctx.arc(cx + dx * u, cy + dy * u, 1.3 * u, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = rubric; ctx.beginPath(); ctx.arc(cx, cy, .8 * u, 0, Math.PI * 2); ctx.fill();
      }
    }
    // En-tête « Ora et labora » en petites capitales, filets et losanges
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = `800 ${3.4 * u}px ${PLAYFAIR}`; ctx.fontVariantCaps = 'small-caps'; ctx.letterSpacing = `${.75 * u}px`;
    const head = 'Ora et labora', hw = ctx.measureText(head).width, hy = y + (full ? 6.5 : 6) * u;
    if (full) { const pw2 = hw + 4.8 * u; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 1.6 * u; ctx.shadowOffsetY = .6 * u; rr(ctx, x + w / 2 - pw2 / 2, y + 2.6 * u, pw2, 5.4 * u, 2.7 * u); ctx.fillStyle = vellum; ctx.fill(); ctx.restore();
      ctx.lineWidth = .3 * u; ctx.strokeStyle = goldA; rr(ctx, x + w / 2 - pw2 / 2, y + 2.6 * u, pw2, 5.4 * u, 2.7 * u); ctx.stroke(); }
    ctx.fillStyle = rubric; ctx.fillText(head, x + w / 2 + .375 * u, hy); ctx.fontVariantCaps = 'normal'; ctx.letterSpacing = '0px';
    if (!full) for (const s of [-1, 1]) {
      const e = x + w / 2 + s * (hw / 2 + 1.6 * u), cyh = hy - 1.1 * u; ctx.fillStyle = goldA; ctx.fillRect(Math.min(e, e + s * 5 * u), cyh - .125 * u, 5 * u, .25 * u);
      ctx.fillStyle = rubric; ctx.beginPath(); ctx.moveTo(e, cyh - .45 * u); ctx.lineTo(e + s * .45 * u, cyh); ctx.lineTo(e, cyh + .45 * u); ctx.lineTo(e - s * .45 * u, cyh); ctx.closePath(); ctx.fill();
    }
    // Numéro, en rouge
    ctx.textAlign = 'left'; ctx.font = `800 ${2.9 * u}px ${PLAYFAIR}`; ctx.letterSpacing = `${.12 * u}px`; const no = 'N° ' + String(c.no).padStart(4, '0');
    if (full) { const nw = ctx.measureText(no).width + 3.6 * u; rr(ctx, x + 6.4 * u, y + 10 * u, nw, 4.5 * u, .8 * u); ctx.fillStyle = vellum; ctx.fill(); ctx.fillStyle = rubric; ctx.fillText(no, x + 8.2 * u, y + 13.3 * u); }
    else { ctx.fillStyle = rubric; ctx.fillText(no, x + 6.4 * u, y + 11.7 * u); }
    ctx.letterSpacing = '0px';
    // Lettrine dans un carré à la feuille d'or, peint à la couleur de la rareté
    const name = window.I18N.name(c), init = [...name][0] || '', rest = name.slice(init.length);
    const lx = x + 7 * u, ly = y + 80 * u, ls = 13.4 * u;
    ctx.save(); ctx.shadowColor = 'rgba(60,40,10,.35)'; ctx.shadowBlur = .8 * u; ctx.shadowOffsetX = .3 * u; ctx.shadowOffsetY = .5 * u;
    ctx.fillStyle = '#7a5410'; ctx.fillRect(lx - .25 * u, ly - .25 * u, ls + .5 * u, ls + .5 * u); ctx.restore();
    if (holo) { const cg = ctx.createConicGradient(Math.PI / 4 - Math.PI / 2, lx + ls / 2, ly + ls / 2); ['#c81e32', '#e6b428', '#1e8c50', '#1e46c8', '#7a2ab8', '#c81e32'].forEach((col, n) => cg.addColorStop(n / 5, col)); ctx.fillStyle = cg; }
    else ctx.fillStyle = leaf ? gradient(ctx, lx, ly, ls, ls, ['#a87b1e', '#fff3c2', '#d4a537', '#fff8dc', '#b8891f', '#f7dc84'], 115) : ABB_RUB[c.rarity] || ABB_RUB.commune;
    ctx.fillRect(lx, ly, ls, ls);
    if (!leaf && !holo) { ctx.fillStyle = 'rgba(255,241,184,.35)'; for (let gx = 1.1 * u; gx < ls; gx += 2.2 * u) for (let gy = 1.1 * u; gy < ls; gy += 2.2 * u) { ctx.beginPath(); ctx.arc(lx + gx, ly + gy, .3 * u, 0, Math.PI * 2); ctx.fill(); } }
    ctx.lineWidth = .55 * u; ctx.strokeStyle = c.rarity === 'mythique' ? '#fff1b8' : '#d4a537'; ctx.strokeRect(lx + .275 * u, ly + .275 * u, ls - .55 * u, ls - .55 * u);
    ctx.lineWidth = .25 * u; ctx.strokeStyle = '#7a5410'; ctx.strokeRect(lx + .675 * u, ly + .675 * u, ls - 1.35 * u, ls - 1.35 * u);
    ctx.textAlign = 'center'; ctx.font = `900 ${10.4 * u}px ${PLAYFAIR}`;
    const m = ctx.measureText(init), base = ly + ls / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    ctx.save(); ctx.shadowColor = holo ? 'rgba(0,0,0,.6)' : leaf ? 'rgba(255,248,220,.7)' : 'rgba(0,0,0,.35)'; ctx.shadowOffsetY = .3 * u; ctx.shadowBlur = holo ? .4 * u : 0;
    ctx.fillStyle = holo ? '#fff' : leaf ? rubric : '#f7dc84'; ctx.fillText(init, lx + ls / 2, base); ctx.restore();
    // Nom en italique, sur deux lignes au besoin
    const nx = lx + 15.6 * u, nwid = x + w - 7 * u - nx; let fs = 6.6 * u, lines;
    for (; ; fs -= .1 * u) { ctx.font = `italic 700 ${fs}px ${GARAMOND}`; lines = wrap(ctx, rest, nwid, 2); if (fs <= 4.2 * u || (lines.length <= (fs > 5.8 * u ? 1 : 2) && lines.every(l => ctx.measureText(l).width <= nwid))) break; }
    ctx.textAlign = 'left'; ctx.fillStyle = ink; const lh = fs * 1.06, ny0 = y + 79 * u + 7.7 * u - lh * lines.length / 2 + fs * .78;
    lines.forEach((l, i) => ctx.fillText(clip(ctx, l, nwid), nx, ny0 + i * lh));
    // Description
    ctx.textAlign = 'center'; ctx.font = `italic 500 ${3.7 * u}px ${GARAMOND}`; ctx.fillStyle = '#4a3420';
    wrap(ctx, window.I18N.subtitle(c) || '', w - 16 * u, 2).forEach((l, i) => ctx.fillText(l, x + w / 2, y + 98.2 * u + i * 4.5 * u));
    // Caractéristiques : filets or et rouge, losange, libellés rubriqués
    const sx = x + 7 * u, sw = w - 14 * u, sh = 18.6 * u, sy = y + h - 6 * u - sh;
    ctx.fillStyle = goldA; ctx.fillRect(sx, sy, sw, .3 * u); ctx.fillStyle = rubric; ctx.fillRect(sx, sy - .6 * u, sw, .3 * u);
    ctx.save(); ctx.translate(x + w / 2, sy - .15 * u); ctx.rotate(Math.PI / 4); ctx.fillStyle = vellum; ctx.fillRect(-1.5 * u, -1.5 * u, 3 * u, 3 * u); ctx.fillStyle = rubric; ctx.fillRect(-1.1 * u, -1.1 * u, 2.2 * u, 2.2 * u); ctx.restore();
    const cw = (sw - .8 * u) / 3;
    statRows(c).forEach(([k, v], i) => {
      const cx = sx + .4 * u + cw * i + cw / 2;
      if (i) { ctx.fillStyle = 'rgba(155,28,28,.35)'; ctx.fillRect(cx - cw / 2 - .125 * u, sy + 3 * u, .25 * u, sh - 3 * u); }
      ctx.fillStyle = rubric; ctx.font = `800 ${2.6 * u}px ${PLAYFAIR}`; ctx.letterSpacing = `${.16 * u}px`;
      ctx.fillText(clip(ctx, window.I18N.statKey(k).toUpperCase(), cw - 2.4 * u), cx, sy + 5.6 * u); ctx.letterSpacing = '0px';
      const val = String(window.I18N.tv(v)); let vs = 4.4 * u;
      for (; vs > 3.1 * u; vs -= .1 * u) { ctx.font = `italic 700 ${vs}px ${GARAMOND}`; if (ctx.measureText(val).width <= cw - 2.4 * u) break; }
      ctx.fillStyle = ink;
      if (ctx.measureText(val).width <= cw - 2.4 * u) ctx.fillText(val, cx, sy + 11.4 * u);
      else { ctx.font = `italic 700 ${3.1 * u}px ${GARAMOND}`; wrap(ctx, val.replace(/-/g, '- '), cw - 2.4 * u, 2).forEach((l, j) => ctx.fillText(l.replace(/- /g, '-'), cx, sy + 10.2 * u + j * 3.5 * u)); } // sur deux lignes
    });
    ctx.textAlign = 'left';
  }

  async function render(c, finish) {
    const design = API.designOf ? API.designOf(c) : c.cat; // design de la carte (douceurs du paquet Chocolat : « Ballotin »)
    if (c.landscape) try { await Promise.all([document.fonts?.load(`40px ${LOBSTER}`), document.fonts?.load(`40px ${SLAB}`), document.fonts?.load(`20px ${ELITE}`)]); } catch (_) { /* police de secours */ }
    if (design === 'histoire') try { await document.fonts?.load(`40px ${TYPE}`); } catch (_) { /* police de secours */ }
    if (design === 'bd') try { await Promise.all([document.fonts?.load(`40px ${POP}`), document.fonts?.load(`700 24px ${COMIC}`)]); } catch (_) { /* police de secours */ }
    if (design === 'riviere') try { await document.fonts?.load(`italic 700 40px ${GARAMOND}`); } catch (_) { /* police de secours */ }
    if (design === 'moulin') try { await document.fonts?.load(`700 40px ${STENCIL}`); } catch (_) { /* police de secours */ }
    if (design === 'marine') try { await Promise.all([document.fonts?.load(`40px ${LIMELIGHT}`), document.fonts?.load(`italic 500 24px ${PLAYFAIR}`)]); } catch (_) { /* police de secours */ }
    if (design === 'chocolat') try { await Promise.all([document.fonts?.load(`900 40px ${PLAYFAIR}`), document.fonts?.load(`italic 500 24px ${PLAYFAIR}`)]); } catch (_) { /* police de secours */ }
    if (design === 'presse') try { await Promise.all([document.fonts?.load(`40px ${FRAKTUR}`), document.fonts?.load(`900 40px ${PLAYFAIR}`), document.fonts?.load(`italic 500 24px ${PLAYFAIR}`)]); } catch (_) { /* police de secours */ }
    if (design === 'geant') try { await Promise.all([document.fonts?.load(`40px ${LOBSTER}`), document.fonts?.load(`40px ${SLAB}`), document.fonts?.load(`italic 500 24px ${TEXT}`)]); } catch (_) { /* police de secours */ }
    if (design === 'invention') try { await Promise.all([document.fonts?.load(`800 40px ${PLAYFAIR}`), document.fonts?.load(`italic 700 40px ${GARAMOND}`), document.fonts?.load(`italic 500 24px ${GARAMOND}`), document.fonts?.load(`20px ${ELITE}`)]); } catch (_) { /* police de secours */ }
    if (design === 'abbaye') try { await Promise.all([document.fonts?.load(`900 40px ${PLAYFAIR}`), document.fonts?.load(`800 24px ${PLAYFAIR}`), document.fonts?.load(`italic 700 40px ${GARAMOND}`), document.fonts?.load(`italic 500 24px ${GARAMOND}`)]); } catch (_) { /* police de secours */ }
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
    const x = (W - cw) / 2, y = land ? 300 : 170, pad = design === 'balade' || design === 'voiture' ? 0 : land ? (finish === 'plein' ? 0 : finish === 'or' ? 17 : 9) : 16, r = land ? 15 : 30;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    rr(ctx, x, y, cw, ch, r);
    const arch = design === 'histoire'; // cartes Histoire : dossier « Archives » (voir style.css)
    const bd = design === 'bd'; // cartes Bulles : design « Pop »
    const frame = design === 'voiture' ? ['#0b0c0f', '#0b0c0f'] : design === 'balade' ? ['#f3efe4', '#e9e3d2'] : land ? (finish === 'holo' ? FRAMES.holo : finish === 'or' ? FRAMES.or : c.rarity === 'legendaire' ? FRAMES.legendaire : c.rarity === 'mythique' ? ['#5a0012', '#ff2d55', '#9a0020', '#ff6b81', '#5a0012'] : ['#ffffff', '#f4f1ea'])
      : bd && (finish === 'normal' || finish === 'plein') ? [POP_ACC[c.rarity] || POP_ACC.commune, POP_ACC[c.rarity] || POP_ACC.commune] : arch && (finish === 'normal' || finish === 'plein') ? ARCH_FRAMES[c.rarity] || ARCH_FRAMES.commune : FRAMES[fin.pack || finish !== 'normal' ? finish : c.rarity] || (ed ? [ed.metal[2], ed.metal[0], ed.metal[1], ed.metal[0], ed.metal[2]] : FRAMES[c.rarity]);
    ctx.fillStyle = gradient(ctx, x, y, cw, ch, ed && finish === 'normal' ? [ed.metal[2], ed.metal[0], ed.metal[1], ed.metal[0], ed.metal[2]] : frame, fin.id === 'tricolore' ? 0 : 135);
    ctx.fill(); ctx.restore();
    const ix = x + pad, iy = y + pad, iw = cw - pad * 2, ih = ch - pad * 2;
    ctx.save(); rr(ctx, ix, iy, iw, ih, land ? 10 : 18); ctx.clip();
    if (design === 'riviere') atlas(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (land) postcard(ctx, c, photo, ix, iy, iw, ih, finish, cw / 100);
    else if (design === 'moulin') sack(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'arme') blueprint(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'industrie') lamp(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'marine') liner(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'presse') frontPage(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'chocolat') ballotin(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'geant') poster(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'abbaye') manuscrit(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'invention') patent(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'balade') walkCard(ctx, c, photo, ix, iy, iw, ih, finish);
    else if (design === 'voiture') showroom(ctx, c, photo, ix, iy, iw, ih, finish);
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
    const ownTag = land || design === 'balade' || ['voiture', 'moulin', 'arme', 'industrie', 'marine', 'presse', 'chocolat', 'geant', 'invention', 'abbaye'].includes(design);
    if (ownTag) {
      const tag = (finish !== 'normal' ? API.finishLabel(finish) + ' · ' : '') + API.rarityLabel(c.rarity);
      ctx.font = `800 26px ${DISPLAY}`; const tw = ctx.measureText(tag.toUpperCase()).width + 32;
      ctx.fillStyle = glow; rr(ctx, (W - tw) / 2, y + ch + 40, tw, 44, 8); ctx.fill();
      ctx.fillStyle = '#111'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(tag.toUpperCase(), W / 2, y + ch + 63); ctx.textAlign = 'left';
    }
    ctx.save(); rr(ctx, ix, iy, iw, ih, 18); ctx.clip();
    if (!ownTag) {
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
    const credit = photoFile && c.credit && photoFile === c.img ? `${c.credit} — Wikimedia Commons` // logo : son copyright
      : photoFile && c.cat !== 'evenement' ? `${L === 'nl' ? 'Foto' : 'Photo'} : ${photoFile.replace(/\.[a-z]+$/i, '')} — Wikimedia Commons` : 'Wikidata · Wikipédia';
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
    // Feuille de partage seulement sur téléphone et tablette : sur ordinateur (Windows, macOS), Chrome, Edge et Safari
    // ont navigator.share mais ouvrent une fenêtre du système peu utile, ou la refusent une fois l'image prête (le clic
    // est trop ancien) ; on y enregistre l'image et on la copie dans le presse-papiers
    const mobile = navigator.userAgentData?.mobile || matchMedia('(pointer: coarse)').matches;
    if (mobile && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: text, text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    // Copie en plus (à coller dans un message), avant le téléchargement (sa fenêtre « Enregistrer sous » ôte le focus
    // et la copie serait refusée) ; refusée aussi par certains navigateurs (Safari, clic trop ancien), sans gravité
    let copied = false;
    if (!mobile && window.ClipboardItem && navigator.clipboard?.write) {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); copied = true; } catch (_) { /* image enregistrée quand même */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return copied ? 'copied' : 'downloaded';
  }

  window.SHARE = { render, share };
})();
