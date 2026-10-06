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
    mythique: ['#ff4e5f', '#ffcf5e', '#59e0ff', '#b07cff', '#ff4e5f'],
    holo: ['#d9d9e6', '#ffffff', '#a9b4c9', '#f2f2ff', '#9aa6bd'], plein: ['#2b2b30', '#0c0c0e', '#3a3a42'],
    or: ['#6e4f0c', '#f9e08a', '#b8891f', '#fff3c2', '#a87b1e'], noir: ['#8a6410', '#f6d478', '#0b0b0b', '#0b0b0b', '#f6d478'],
    rouge: ['#4a0510', '#c8162c', '#ffd98a', '#9c0f22', '#ffe8b0'], confetti: ['#ff5fa8', '#ffd23f', '#2fc7e8', '#8a3fd6'],
    pave: ['#4a4a48', '#121212', '#f6d43a', '#121212'], iris: ['#0c2350', '#3b74d8', '#f2c400', '#1d4f9e'],
    lion: ['#f2c400', '#111', '#f2c400', '#111'], tricolore: ['#111', '#111', '#f2c400', '#f2c400', '#e1001e', '#e1001e'],
    coq: ['#c8102e', '#f2c400', '#c8102e', '#f2c400'],
  };
  const BAND_INK_DARK = new Set(['jaune', 'flandre']);

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
  function cover(ctx, img, x, y, w, h, posY = 0.2, contain = false) {
    const s = contain ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * (contain ? 0.5 : posY), iw, ih);
  }
  function fitText(ctx, text, maxW, size, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 18);
    return s + 2;
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

  async function render(c, finish) {
    await document.fonts?.ready;
    const L = window.I18N.lang, ed = c.cat === 'edition' && API.packById(c.pack);
    const fin = API.FINISHES.find(f => f.id === finish) || API.FINISHES[0];
    const photoFile = (finish === 'plein' && c.alt) || c.img;
    const photo = c.cat === 'evenement' ? null : API.isFlickr(photoFile) ? await loadImage(API.imgUrl(photoFile, 1024)) : await commonsImage(photoFile, 900);
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
    const x = (W - CW) / 2, y = 170, pad = 16, r = 30;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    rr(ctx, x, y, CW, CH, r);
    const frame = FRAMES[fin.pack || finish !== 'normal' ? finish : c.rarity] || (ed ? [ed.metal[2], ed.metal[0], ed.metal[1], ed.metal[0], ed.metal[2]] : FRAMES[c.rarity]);
    ctx.fillStyle = gradient(ctx, x, y, CW, CH, ed && finish === 'normal' ? [ed.metal[2], ed.metal[0], ed.metal[1], ed.metal[0], ed.metal[2]] : frame, fin.id === 'tricolore' ? 0 : 135);
    ctx.fill(); ctx.restore();
    const ix = x + pad, iy = y + pad, iw = CW - pad * 2, ih = CH - pad * 2;
    ctx.save(); rr(ctx, ix, iy, iw, ih, 18); ctx.clip();
    ctx.fillStyle = finish === 'noir' ? '#050505' : '#15161a'; ctx.fillRect(ix, iy, iw, ih);
    const statsH = 116, bandH = 190, full = finish === 'plein';
    const photoH = full ? ih : ih - statsH;
    if (photo) {
      ctx.save();
      if (finish === 'or') ctx.filter = 'sepia(.65) saturate(1.3)';
      if (finish === 'noir' || finish === 'pave') ctx.filter = 'grayscale(1) contrast(1.1)';
      const flat = c.emblem || c.artwork || (['commune', 'province', 'region', 'enseignement'].includes(c.cat) && /\.(svg|png)$/i.test(photoFile || ''));
      if (flat) { ctx.fillStyle = '#20232b'; ctx.fillRect(ix, iy, iw, photoH); cover(ctx, photo, ix + 50, iy + 50, iw - 100, photoH - bandH - 70, 0.5, true); }
      else cover(ctx, photo, ix, iy, iw, photoH);
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
      ctx.fillStyle = gradient(ctx, ix, iy, iw, ih, ['#ff008040', '#ffdc0040', '#00ffb440', '#008cff40', '#be00ff40'], 115);
      ctx.fillRect(ix, iy, iw, ih); ctx.restore();
    }
    // Bandeau : nom, sous-titre, méta
    const fam = c.family || 'gris';
    const band = ed ? ed.body[1] : finish === 'or' || finish === 'noir' ? '#0d0b06' : css(`--p-${fam}`) || '#6f7077';
    const ink = ed ? ed.metal[0] : finish === 'or' || finish === 'noir' ? '#f6d478' : BAND_INK_DARK.has(fam) && !full ? '#141414' : '#ffffff';
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
      ctx.fillText(wrap(ctx, String(window.I18N.tv(v)), colW - 20, 1)[0], sx, sy + 88);
    });
    // En haut de la carte : numéro, version, rareté
    ctx.fillStyle = 'rgba(10,10,12,.7)'; rr(ctx, ix + 20, iy + 20, 104, 40, 8); ctx.fill();
    ctx.fillStyle = '#f1eee6'; ctx.font = `600 24px ${MONO}`; ctx.fillText(String(c.no).padStart(4, '0'), ix + 34, iy + 49);
    const tag = (finish !== 'normal' ? API.finishLabel(finish) + ' · ' : '') + API.rarityLabel(c.rarity);
    ctx.font = `800 24px ${DISPLAY}`; const tw = ctx.measureText(tag.toUpperCase()).width + 28;
    ctx.fillStyle = glow; rr(ctx, ix + iw - 20 - tw, iy + 20, tw, 40, 8); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillText(tag.toUpperCase(), ix + iw - 6 - tw, iy + 49);
    ctx.restore();

    // Pied : crédit de la photo
    ctx.fillStyle = 'rgba(241,238,230,.7)'; ctx.font = `500 22px ${TEXT}`; ctx.textAlign = 'center';
    const credit = !photoFile || c.cat === 'evenement' ? 'Wikidata · Wikipédia'
      : API.isFlickr(photoFile) ? `${L === 'nl' ? 'Foto' : 'Photo'} : ${c.photoCredit || 'Flickr'} — Flickr`
      : `${L === 'nl' ? 'Foto' : 'Photo'} : ${photoFile.replace(/\.[a-z]+$/i, '')} — Wikimedia Commons`;
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
