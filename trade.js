// Échanges entre joueurs, sans serveur : l'offre et la réponse voyagent dans un lien (QR code ou partage).
//   1. A choisit ses doublons à donner et les cartes demandées → ses cartes sont mises de côté, QR « offre ».
//   2. B scanne, accepte → ses cartes partent, celles de A arrivent, QR « réponse ».
//   3. A scanne la réponse → il reçoit les cartes de B.
// Chaque échange a un identifiant aléatoire et ne sert qu'une fois par sauvegarde.
(() => {
  'use strict';
  const API = window.RDL;
  const { CARDS, BY_ID, esc, imgUrl, fmt, toast, SFX } = API;
  const L = () => window.I18N.lang;
  const nm = c => window.I18N.name(c);
  const $ = s => document.querySelector(s);
  const area = () => $('#trade-area');
  const MAX = 5;
  const FIN_CODE = { normal: '', holo: 'h', plein: 'p', or: 'o' };
  const CODE_FIN = { h: 'holo', p: 'plein', o: 'or' };

  // ---------- Textes ----------
  const TX = {
    fr: {
      title: 'Échanges',
      intro: 'Échange tes doublons avec tes amis : un QR code à scanner ensemble, ou un lien à envoyer.',
      new: 'Proposer un échange', scan: 'Scanner un QR code', paste_ph: 'ou colle un lien d’échange', open: 'Ouvrir',
      pending_h: 'Mes offres en attente', pending_none: 'Aucune offre en attente.',
      show_qr: 'Afficher le QR', cancel: 'Annuler',
      cancel_confirm: 'Annuler cette offre et récupérer tes cartes ?\nNe le fais que si ton ami ne l’a pas acceptée : sinon il perdra les siennes.',
      cancelled_toast: 'Offre annulée, cartes récupérées',
      done_count: n => n ? `${n} échange${n > 1 ? 's' : ''} réalisé${n > 1 ? 's' : ''}` : '',
      back: '← Échanges',
      give_h: 'Je donne', want_h: 'Je demande',
      give_hint: 'Tes doublons : touche une carte pour l’ajouter.',
      want_hint: 'Cherche les cartes que tu veux en échange. Sans demande, c’est un cadeau.',
      no_dups: 'Tu n’as pas encore de doublon à échanger. Ouvre des paquets !',
      search_ph: 'Rechercher une carte…', search_more: 'Tape au moins deux lettres.', no_result: 'Aucune carte trouvée.',
      empty_side: 'Rien pour l’instant.',
      create: 'Créer l’échange', max: `Cinq cartes au plus de chaque côté.`, need_one: 'Ajoute au moins une carte.',
      offer_qr_h: 'Montre ce QR code à ton ami',
      offer_qr_p: 'Il le scanne avec l’appareil photo de son téléphone ou avec le bouton « Scanner » de Brol. Tes cartes sont mises de côté en attendant. Quand il accepte, scanne son QR de réponse pour recevoir ses cartes.',
      reply_qr_h: 'Dernière étape : montre ce QR code à ton ami',
      reply_qr_p: 'Il le scanne pour terminer l’échange et recevoir tes cartes. Tu as déjà reçu les siennes.',
      share: 'Partager le lien', copy: 'Copier le lien', copied: 'Lien copié', finish: 'Terminé',
      you_get: 'Tu reçois', you_give: 'Tu donnes', gift: 'Rien : c’est un cadeau !',
      he_gets: 'Ton ami reçoit', he_gives: 'Ton ami donne',
      offer_in_h: 'Offre d’échange', accept: 'Accepter l’échange', decline: 'Refuser',
      have_dup: n => `✓ doublon disponible (×${n})`, need_dup: n => n ? `✗ il te faut un doublon (tu en as 1)` : '✗ tu n’as pas cette carte',
      cant_accept: 'Il te manque des doublons pour accepter.',
      accepted: 'Échange accepté !',
      own_offer: 'C’est ta propre offre : montre ce QR code à ton ami.',
      already_acc: 'Tu as déjà accepté cet échange. Si ton ami n’a pas encore scanné ta réponse, montre-la-lui à nouveau.',
      done_h: 'Échange terminé !', done_p: 'Les cartes ont été ajoutées à ton album.', to_album: 'Voir l’album',
      already_done: 'Cet échange est déjà terminé.', was_cancelled: 'Tu as annulé cette offre : l’échange ne peut plus être terminé.',
      unknown: 'Échange inconnu : il a été créé dans un autre navigateur ou une autre sauvegarde.',
      invalid: 'Lien ou QR code d’échange invalide.',
      scan_p: 'Vise le QR code de ton ami.', no_cam: 'Caméra indisponible : colle plutôt le lien.', not_trade: 'Ce QR code n’est pas un échange Brol.',
      close: 'Fermer', share_text: 'Échange de cartes Brol',
    },
    nl: {
      title: 'Ruilen',
      intro: 'Ruil je dubbele kaarten met je vrienden: samen een QR-code scannen, of een link sturen.',
      new: 'Ruil voorstellen', scan: 'QR-code scannen', paste_ph: 'of plak een ruillink', open: 'Openen',
      pending_h: 'Mijn openstaande voorstellen', pending_none: 'Geen openstaande voorstellen.',
      show_qr: 'QR tonen', cancel: 'Annuleren',
      cancel_confirm: 'Dit voorstel annuleren en je kaarten terugkrijgen?\nDoe dit alleen als je vriend het niet aanvaard heeft: anders verliest hij de zijne.',
      cancelled_toast: 'Voorstel geannuleerd, kaarten terug',
      done_count: n => n ? `${n} ruil${n > 1 ? 'en' : ''} afgerond` : '',
      back: '← Ruilen',
      give_h: 'Ik geef', want_h: 'Ik vraag',
      give_hint: 'Je dubbele kaarten: tik op een kaart om ze toe te voegen.',
      want_hint: 'Zoek de kaarten die je in ruil wilt. Zonder vraag is het een cadeau.',
      no_dups: 'Je hebt nog geen dubbele kaarten om te ruilen. Open pakjes!',
      search_ph: 'Kaart zoeken…', search_more: 'Typ minstens twee letters.', no_result: 'Geen kaart gevonden.',
      empty_side: 'Nog niets.',
      create: 'Ruil aanmaken', max: 'Maximaal vijf kaarten per kant.', need_one: 'Voeg minstens één kaart toe.',
      offer_qr_h: 'Toon deze QR-code aan je vriend',
      offer_qr_p: 'Hij scant ze met de camera van zijn telefoon of met de knop « Scannen » in Brol. Je kaarten worden intussen opzijgezet. Als hij aanvaardt, scan je zijn antwoord-QR om zijn kaarten te krijgen.',
      reply_qr_h: 'Laatste stap: toon deze QR-code aan je vriend',
      reply_qr_p: 'Hij scant ze om de ruil af te ronden en jouw kaarten te krijgen. Jij hebt de zijne al.',
      share: 'Link delen', copy: 'Link kopiëren', copied: 'Link gekopieerd', finish: 'Klaar',
      you_get: 'Je krijgt', you_give: 'Je geeft', gift: 'Niets: het is een cadeau!',
      he_gets: 'Je vriend krijgt', he_gives: 'Je vriend geeft',
      offer_in_h: 'Ruilvoorstel', accept: 'Ruil aanvaarden', decline: 'Weigeren',
      have_dup: n => `✓ dubbele kaart beschikbaar (×${n})`, need_dup: n => n ? '✗ je hebt een dubbele kaart nodig (je hebt er 1)' : '✗ je hebt deze kaart niet',
      cant_accept: 'Je mist dubbele kaarten om te aanvaarden.',
      accepted: 'Ruil aanvaard!',
      own_offer: 'Dit is je eigen voorstel: toon deze QR-code aan je vriend.',
      already_acc: 'Je hebt deze ruil al aanvaard. Heeft je vriend je antwoord nog niet gescand, toon het dan opnieuw.',
      done_h: 'Ruil afgerond!', done_p: 'De kaarten zijn aan je album toegevoegd.', to_album: 'Naar het album',
      already_done: 'Deze ruil is al afgerond.', was_cancelled: 'Je hebt dit voorstel geannuleerd: de ruil kan niet meer afgerond worden.',
      unknown: 'Onbekende ruil: hij werd in een andere browser of een ander spel aangemaakt.',
      invalid: 'Ongeldige ruillink of QR-code.',
      scan_p: 'Richt op de QR-code van je vriend.', no_cam: 'Camera niet beschikbaar: plak liever de link.', not_trade: 'Deze QR-code is geen Brol-ruil.',
      close: 'Sluiten', share_text: 'Brol-kaartenruil',
    },
  };
  const T = (k, ...a) => { const v = TX[L()][k] ?? TX.fr[k]; return typeof v === 'function' ? v(...a) : v; };

  // ---------- Sauvegarde ----------
  const TS = () => { const s = API.state; s.trade ||= {}; s.trade.pending ||= {}; s.trade.done ||= {}; return s.trade; };
  const count = it => API.countOf(it.id, it.fin);
  const addCard = (it, n) => { const k = API.keyOf(it.id, it.fin); API.state.owned[k] = (API.state.owned[k] || 0) + n; if (API.state.owned[k] <= 0) delete API.state.owned[k]; };

  // ---------- Format des liens ----------
  // Offre :   1o.<id>.<donne>.<demande>        éléments « Q123 » ou « Q123~h » séparés par des virgules
  // Réponse : 1r.<id>.<empreinte de l'offre>
  const encItems = list => list.map(it => it.id + (FIN_CODE[it.fin] ? '~' + FIN_CODE[it.fin] : '')).join(',');
  function decItems(s) {
    if (!s) return [];
    const out = s.split(',').map(x => {
      const [id, f] = x.split('~');
      const fin = f ? CODE_FIN[f] : 'normal';
      return BY_ID.has(id) && fin ? { id, fin } : null;
    });
    if (out.some(x => !x) || out.length > MAX) return null;
    if (new Set(out.map(it => API.keyOf(it.id, it.fin))).size !== out.length) return null;
    return out;
  }
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
  const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => (b % 36).toString(36)).join('');
  const offerCode = (id, give, want) => `1o.${id}.${encItems(give)}.${encItems(want)}`;
  const replyCode = (id, offer) => `1r.${id}.${hash(offer)}`;
  const linkOf = code => location.origin + location.pathname + '#t=' + code;

  function parse(text) {
    let s = String(text || '').trim();
    try { s = decodeURIComponent(s); } catch (_) { /* déjà décodé */ }
    const m = s.match(/(?:#t=)?(1[or]\.[A-Za-z0-9~,.\-]+)\s*$/);
    if (!m) return null;
    const code = m[1];
    const p = code.split('.');
    if (p[0] === '1o' && p.length === 4 && /^[a-z0-9]{4,12}$/.test(p[1])) {
      const give = decItems(p[2]), want = decItems(p[3]);
      if (!give || !want || (!give.length && !want.length)) return null;
      return { type: 'offer', id: p[1], give, want, code };
    }
    if (p[0] === '1r' && p.length === 3 && /^[a-z0-9]{4,12}$/.test(p[1])) return { type: 'reply', id: p[1], h: p[2], code };
    return null;
  }

  // ---------- Petites vues ----------
  function item(it, { remove = false, note = '', bad = false } = {}) {
    const c = BY_ID.get(it.id);
    const thumb = c.img ? `<span class="t-thumb" style="background-image:url('${imgUrl(c.img, 160)}')"></span>`
      : `<span class="t-thumb is-ev">${esc(String(c.stats[0]?.[1] ?? ''))}</span>`;
    const fin = it.fin !== 'normal' ? `<span class="t-fin fin-word d-${it.fin}">${esc(API.finishLabel(it.fin))}</span>` : '';
    return `<div class="t-item${bad ? ' is-bad' : ''}" data-key="${esc(API.keyOf(it.id, it.fin))}">
      ${thumb}
      <span class="t-text"><b>${esc(nm(c))}</b><small><span class="gem" style="background:var(--r-${c.rarity})"></span>${esc(API.rarityLabel(c.rarity))} · ${esc(API.catLabel(c.cat))}${fin ? ' · ' : ''}${fin}</small>${note ? `<em>${esc(note)}</em>` : ''}</span>
      ${remove ? '<button class="t-x" aria-label="×">×</button>' : ''}
    </div>`;
  }
  const side = (title, list, opts = {}) => `<div class="t-side"><h3>${esc(title)}${opts.counter ? ` <small>${list.length}/${MAX}</small>` : ''}</h3>
    ${list.length ? list.map(it => item(it, typeof opts.item === 'function' ? opts.item(it) : opts.item)).join('') : `<p class="t-empty">${esc(opts.empty || T('empty_side'))}</p>`}</div>`;
  const head = (title, extra = '') => `<div class="game-head"><button class="btn btn-line t-back">${T('back')}</button><h2>${esc(title)}</h2>${extra}</div>`;

  // ---------- Accueil ----------
  let composing = null; // { give: [], want: [], q: '' }

  function render() {
    $('#trade-title').textContent = T('title');
    $('#trade-intro').textContent = T('intro');
    const tr = TS();
    const pending = Object.entries(tr.pending).sort((a, b) => b[1].at - a[1].at);
    const n = API.state.stats.trades || 0;
    area().innerHTML = `
      <div class="t-actions">
        <button class="game-tile" id="t-new"><span class="game-icon">${icon('swap')}</span><span class="game-text"><b>${T('new')}</b><span>${T('give_hint')}</span></span></button>
        <button class="game-tile" id="t-scan"><span class="game-icon">${icon('qr')}</span><span class="game-text"><b>${T('scan')}</b><span>${T('scan_p')}</span></span></button>
      </div>
      <form class="t-paste" autocomplete="off"><input id="t-paste" placeholder="${esc(T('paste_ph'))}"><button class="btn btn-line">${T('open')}</button></form>
      <section class="t-pending">
        <h2>${T('pending_h')} <small>${T('done_count', n)}</small></h2>
        ${pending.length ? pending.map(([id, p]) => `
          <div class="t-offer" data-id="${esc(id)}">
            <div class="t-offer-sides">${side(T('you_give'), p.give)}${side(T('you_get'), p.want, { empty: T('gift') })}</div>
            <div class="t-offer-btns"><button class="btn t-showqr">${T('show_qr')}</button><button class="btn btn-line t-cancel">${T('cancel')}</button></div>
          </div>`).join('') : `<p class="t-empty">${T('pending_none')}</p>`}
      </section>`;
    $('#t-new').onclick = () => { SFX.tick(); composing = { give: [], want: [], q: '' }; renderCompose(); };
    $('#t-scan').onclick = () => { SFX.tick(); openScanner(); };
    area().querySelector('.t-paste').onsubmit = e => { e.preventDefault(); const v = $('#t-paste').value; if (v.trim()) handle(v); };
    area().querySelectorAll('.t-offer').forEach(el => {
      const id = el.dataset.id;
      el.querySelector('.t-showqr').onclick = () => { const p = TS().pending[id]; showQR(offerCode(id, p.give, p.want), 'offer'); };
      el.querySelector('.t-cancel').onclick = () => cancelOffer(id);
    });
  }
  const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${ICONS[n]}</svg>`;
  const ICONS = {
    swap: window.ACH_ICONS.swap,
    qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  };

  // ---------- Composer une offre ----------
  // Doublons disponibles : une entrée par version possédée au moins deux fois
  function duplicates() {
    const out = [];
    for (const c of CARDS) for (const f of API.FINISHES) if (API.countOf(c.id, f.id) >= 2) out.push({ id: c.id, fin: f.id, n: API.countOf(c.id, f.id) });
    return out.sort((a, b) => API.rarityRank(BY_ID.get(b.id).rarity) - API.rarityRank(BY_ID.get(a.id).rarity));
  }
  const inList = (list, it) => list.some(x => x.id === it.id && x.fin === it.fin);

  function renderCompose() {
    const C = composing;
    const dups = duplicates();
    area().innerHTML = head(T('new')) + `
      <div class="t-tray">
        ${side(T('give_h'), C.give, { counter: true, item: { remove: true } })}
        ${side(T('want_h'), C.want, { counter: true, item: { remove: true }, empty: T('gift') })}
        <div class="t-tray-go"><button class="btn btn-gold" id="t-create" ${C.give.length || C.want.length ? '' : 'disabled'}>${T('create')}</button></div>
      </div>
      <div class="t-pickers">
        <section>
          <h3>${T('give_h')}</h3><p class="muted small">${T('give_hint')}</p>
          ${dups.length ? `<div class="t-dups">${dups.map(d => `<div class="cell t-pick${inList(C.give, d) ? ' is-picked' : ''}" data-id="${esc(d.id)}" data-fin="${d.fin}">${API.cardHTML(BY_ID.get(d.id), { finish: d.fin, count: d.n })}</div>`).join('')}</div>`
            : `<p class="t-empty">${T('no_dups')}</p>`}
        </section>
        <section>
          <h3>${T('want_h')}</h3><p class="muted small">${T('want_hint')}</p>
          <input id="t-search" type="search" placeholder="${esc(T('search_ph'))}" value="${esc(C.q)}" autocomplete="off">
          <div id="t-results" class="t-results"></div>
        </section>
      </div>`;
    renderResults();
    const tray = area().querySelector('.t-tray');
    tray.querySelectorAll('.t-side').forEach((el, i) => el.addEventListener('click', e => {
      const x = e.target.closest('.t-x');
      if (!x) return;
      const key = x.closest('.t-item').dataset.key;
      const list = i === 0 ? C.give : C.want;
      list.splice(list.findIndex(it => API.keyOf(it.id, it.fin) === key), 1);
      SFX.tick(); renderCompose();
    }));
    area().querySelector('.t-dups')?.addEventListener('click', e => {
      const cell = e.target.closest('.t-pick');
      if (!cell) return;
      const it = { id: cell.dataset.id, fin: cell.dataset.fin };
      if (inList(C.give, it)) C.give = C.give.filter(x => !(x.id === it.id && x.fin === it.fin));
      else if (C.give.length >= MAX) return toast(T('max'));
      else C.give.push(it);
      SFX.tick(); renderCompose();
    });
    $('#t-search').addEventListener('input', e => { C.q = e.target.value; renderResults(); });
    $('#t-create').onclick = createOffer;
  }

  function renderResults() {
    const C = composing;
    const q = C.q.trim().toLowerCase();
    const box = $('#t-results');
    if (q.length < 2) { box.innerHTML = `<p class="t-empty">${T('search_more')}</p>`; return; }
    const list = CARDS.filter(c => [c.name, c.nl?.name].some(s => (s || '').toLowerCase().includes(q))).slice(0, 20);
    if (!list.length) { box.innerHTML = `<p class="t-empty">${T('no_result')}</p>`; return; }
    box.innerHTML = list.map(c => `<div class="t-result">${item({ id: c.id, fin: 'normal' })}<div class="t-fins">${API.FINISHES.map(f =>
      `<button class="t-finbtn${inList(C.want, { id: c.id, fin: f.id }) ? ' is-on' : ''}" data-id="${esc(c.id)}" data-fin="${f.id}"><span class="fin-dot d-${f.id}"></span>${esc(API.finishLabel(f.id))}</button>`).join('')}</div></div>`).join('');
    box.onclick = e => {
      const b = e.target.closest('.t-finbtn');
      if (!b) return;
      const it = { id: b.dataset.id, fin: b.dataset.fin };
      if (inList(C.want, it)) C.want = C.want.filter(x => !(x.id === it.id && x.fin === it.fin));
      else if (C.want.length >= MAX) return toast(T('max'));
      else C.want.push(it);
      SFX.tick(); renderCompose();
      $('#t-search').focus();
    };
  }

  function createOffer() {
    const { give, want } = composing;
    if (!give.length && !want.length) return toast(T('need_one'));
    if (give.some(it => count(it) < 2)) return toast(T('cant_accept'));
    const id = newId();
    for (const it of give) addCard(it, -1); // mises de côté jusqu'à la fin de l'échange
    TS().pending[id] = { give, want, at: Date.now() };
    API.save(); API.renderWallet();
    composing = null;
    SFX.coin();
    showQR(offerCode(id, give, want), 'offer');
  }

  function cancelOffer(id) {
    const p = TS().pending[id];
    if (!p || !confirm(T('cancel_confirm'))) return;
    for (const it of p.give) addCard(it, 1);
    delete TS().pending[id];
    TS().done[id] = { at: Date.now(), cancelled: true };
    API.save(); API.renderWallet();
    toast(T('cancelled_toast'));
    render();
  }

  // ---------- QR code ----------
  let qrLib = null;
  const loadScript = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  async function qrSVG(text) {
    if (!window.qrcode) await (qrLib ||= loadScript('vendor/qrcode.min.js'));
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  }

  async function showQR(code, kind, summary = null) {
    const link = linkOf(code);
    const offer = kind === 'offer' ? parse(code) : null;
    const sides = offer ? `${side(T('you_give'), offer.give)}${side(T('you_get'), offer.want, { empty: T('gift') })}` : summary || '';
    area().innerHTML = head(T(kind === 'offer' ? 'offer_qr_h' : 'reply_qr_h')) + `
      <div class="t-qr-wrap">
        <div class="t-qr" id="t-qr"></div>
        <div class="t-qr-side">
          <p class="game-rules">${T(kind === 'offer' ? 'offer_qr_p' : 'reply_qr_p')}</p>
          <div class="t-qr-btns">
            ${navigator.share ? `<button class="btn" id="t-share">${T('share')}</button>` : ''}
            <button class="btn btn-line" id="t-copy">${T('copy')}</button>
            <button class="btn btn-line" id="t-done">${T('finish')}</button>
          </div>
          <input id="trade-link" class="t-link" readonly value="${esc(link)}">
          <div class="t-offer-sides">${sides}</div>
        </div>
      </div>`;
    $('#t-qr').innerHTML = await qrSVG(link).catch(() => '');
    $('#t-share')?.addEventListener('click', () => navigator.share({ title: 'Brol', text: T('share_text'), url: link }).catch(() => {}));
    $('#t-copy').onclick = () => { navigator.clipboard?.writeText(link).then(() => toast(T('copied')), () => { $('#trade-link').select(); }); };
    $('#t-done').onclick = () => { SFX.tick(); render(); };
    window.scrollTo(0, 0);
  }

  // ---------- Recevoir une offre ou une réponse ----------
  function handle(text) {
    const t = parse(text);
    if (!t) { SFX.error(); toast(T('invalid')); return; }
    API.show('trade');
    if (t.type === 'offer') receiveOffer(t);
    else receiveReply(t);
  }

  function message(title, text, buttons = '') {
    area().innerHTML = head(title) + `<div class="game-result"><span>${esc(text)}</span>${buttons}</div>`;
  }

  function receiveOffer(o) {
    const tr = TS();
    if (tr.pending[o.id]) return showQR(o.code, 'offer').then(() => toast(T('own_offer')));
    const done = tr.done[o.id];
    if (done?.reply) return showQR(done.reply, 'reply', `${side(T('you_get'), o.give)}${side(T('you_give'), o.want, { empty: T('gift') })}`).then(() => toast(T('already_acc')));
    if (done) return message(T('offer_in_h'), T('already_done'));
    // Ce que B donne = ce que A demande, et inversement
    const ok = it => count(it) >= 2;
    const canAccept = o.want.every(ok);
    area().innerHTML = head(T('offer_in_h')) + `
      <div class="t-incoming">
        <section><h3>${T('you_get')}</h3>
          <div class="t-cards">${o.give.length ? o.give.map(it => `<div class="cell">${API.cardHTML(BY_ID.get(it.id), { finish: it.fin })}</div>`).join('') : `<p class="t-empty">${T('empty_side')}</p>`}</div>
        </section>
        <section>${side(T('you_give'), o.want, { empty: T('gift'), item: it => ok(it) ? { note: T('have_dup', count(it)) } : { note: T('need_dup', count(it)), bad: true } })}</section>
      </div>
      <div class="t-accept">
        <button class="btn btn-gold" id="t-accept" ${canAccept ? '' : 'disabled'}>${T('accept')}</button>
        <button class="btn btn-line" id="t-decline">${T('decline')}</button>
        ${canAccept ? '' : `<span class="t-warn">${T('cant_accept')}</span>`}
      </div>`;
    $('#t-decline').onclick = () => { SFX.tick(); render(); };
    $('#t-accept').onclick = () => {
      if (TS().done[o.id] || !o.want.every(ok)) return;
      for (const it of o.want) addCard(it, -1);
      for (const it of o.give) addCard(it, 1);
      const reply = replyCode(o.id, o.code);
      TS().done[o.id] = { at: Date.now(), reply };
      countTrade(o.give, o.want, o.want.length === 0);
      API.save(); API.renderWallet();
      SFX.achievement(); toast(T('accepted'));
      showQR(reply, 'reply', `${side(T('you_get'), o.give)}${side(T('you_give'), o.want, { empty: T('gift') })}`);
      API.checkAchievements();
    };
    window.scrollTo(0, 0);
  }

  function receiveReply(r) {
    const tr = TS();
    const p = tr.pending[r.id];
    if (!p) {
      const d = tr.done[r.id];
      return message(T('title'), d?.cancelled ? T('was_cancelled') : d ? T('already_done') : T('unknown'));
    }
    if (hash(offerCode(r.id, p.give, p.want)) !== r.h) return message(T('title'), T('invalid'));
    for (const it of p.want) addCard(it, 1);
    delete tr.pending[r.id];
    tr.done[r.id] = { at: Date.now() };
    countTrade(p.want, p.give, p.want.length === 0);
    API.save(); API.renderWallet();
    if (SFX.fanfare) SFX.fanfare(false); else SFX.achievement();
    area().innerHTML = head(T('done_h')) + `
      <div class="game-result win"><b>${T('done_h')}</b><span>${T('done_p')}</span><button class="btn btn-line" id="t-album">${T('to_album')}</button></div>
      ${p.want.length ? `<div class="t-cards">${p.want.map(it => `<div class="cell">${API.cardHTML(BY_ID.get(it.id), { finish: it.fin })}</div>`).join('')}</div>` : ''}`;
    $('#t-album').onclick = () => API.show('binder');
    API.checkAchievements();
  }

  // Statistiques pour les succès (des deux côtés de l'échange)
  function countTrade(got, gave, gift) {
    const st = API.state.stats;
    st.trades = (st.trades || 0) + 1;
    if (gift && gave.length) st.tradeGift = 1;
    if (got.length === MAX && gave.length === MAX) st.tradeFull = 1;
    if ([...got, ...gave].some(it => BY_ID.get(it.id).rarity === 'mythique')) st.tradeMyth = 1;
  }

  // ---------- Scanner (caméra) ----------
  let scan = null;
  let jsqrLib = null;
  async function openScanner() {
    const el = document.createElement('div');
    el.className = 't-scanner';
    el.innerHTML = `<div class="t-scan-box"><video playsinline muted></video><span class="t-scan-frame"></span></div>
      <p>${T('scan_p')}</p><button class="btn btn-line btn-light">${T('close')}</button>`;
    document.body.appendChild(el);
    const video = el.querySelector('video');
    const stop = () => { if (!scan) return; scan.stream?.getTracks().forEach(t => t.stop()); cancelAnimationFrame(scan.raf); scan = null; el.remove(); };
    el.querySelector('button').onclick = stop;
    scan = { stop };
    try {
      scan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (_) {
      stop(); toast(T('no_cam')); $('#t-paste')?.focus(); return;
    }
    if (!scan) { return; }
    video.srcObject = scan.stream;
    await video.play().catch(() => {});
    let detect;
    if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats?.().catch(() => []))?.includes('qr_code')) {
      const bd = new BarcodeDetector({ formats: ['qr_code'] });
      detect = async () => (await bd.detect(video))[0]?.rawValue;
    } else {
      if (!window.jsQR) await (jsqrLib ||= loadScript('vendor/jsQR.min.js'));
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      detect = async () => {
        const w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth);
        if (!w || !h) return null;
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        return window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data;
      };
    }
    let busy = false, warned = 0;
    const loop = async () => {
      if (!scan) return;
      if (!busy && video.readyState >= 2) {
        busy = true;
        const text = await detect().catch(() => null);
        busy = false;
        if (text && scan) {
          if (parse(text)) { navigator.vibrate?.(60); stop(); handle(text); return; }
          if (Date.now() - warned > 2500) { warned = Date.now(); toast(T('not_trade')); }
        }
      }
      if (scan) scan.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  // ---------- Liens ouverts directement (#t=…) ----------
  function fromHash() {
    if (!location.hash.startsWith('#t=')) return;
    const code = decodeURIComponent(location.hash.slice(3));
    history.replaceState(null, '', location.pathname + location.search);
    handle(code);
  }
  window.addEventListener('hashchange', fromHash);
  document.addEventListener('click', e => { if (e.target.closest('.t-back')) { SFX.tick(); composing = null; render(); window.scrollTo(0, 0); } });

  window.TRADE_UI = { render, handle, parse };
  fromHash();
})();
