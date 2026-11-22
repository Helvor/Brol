// Fenêtres de question du jeu, à la place de confirm / alert / prompt du navigateur (même style que le jeu, FR et NL,
// clavier et lecteur d'écran). API : window.BrolDialog
//   ask({ title?, text, ok?, cancel?, danger? })                        → Promise<boolean>
//   askText({ title?, text, placeholder?, match?, minLength?, maxLength?, danger? }) → Promise<string|null> (null = annulé)
//   tell({ title?, text, ok? })                                          → Promise<void>
//   choose({ title?, text?, options: [{ value, label }], cancel? })      → Promise<value|null> (null = annulé)
// Toujours attendre la réponse (await) : une Promise est « vraie », `if (!BrolDialog.ask(…))` ne demanderait rien.
// Une seule question à la fois (file d'attente) ; textes posés en textContent (jamais de HTML).
(() => {
  'use strict';
  const t = (k, ...a) => window.I18N?.t(k, ...a) ?? k;
  let dlg, form, h2, p, field, input, choices, btnCancel, btnOk;
  let cur = null; // question en cours : { kind, match, minLength, danger, finish }
  let queue = Promise.resolve();
  // Touche maintenue : pas de réponse dans les 300 premières ms (Entrée qui a ouvert la question encore enfoncée),
  // et après la fermeture, les répétitions d'Entrée / Espace sont bloquées jusqu'au relâchement (sinon elles
  // relanceraient l'action sur le bouton d'origine, qui reprend le focus)
  const GUARD_MS = 300;
  let openedAt = 0, holdBlock = false;
  const tooSoon = () => performance.now() - openedAt < GUARD_MS;
  const accept = () => { if (cur && cur.kind !== 'choose' && !btnOk.disabled && !tooSoon()) cur.finish(true); }; // choose : seul un choix répond
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.repeat) { holdBlock = false; return; }
    if (holdBlock || cur) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') holdBlock = false; }, true);

  function build() {
    dlg = document.createElement('dialog');
    dlg.id = 'brol-ask';
    dlg.className = 'ask-dlg';
    dlg.setAttribute('aria-modal', 'true');
    dlg.innerHTML = `<form method="dialog">
      <h2 id="brol-ask-t"></h2>
      <p id="brol-ask-p" class="ask-text"></p>
      <label class="ask-field" for="brol-ask-in">
        <input id="brol-ask-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <div class="ask-choices" role="group" hidden></div>
      <div class="ask-btns"><button type="button" class="btn btn-line" data-ask="cancel"></button><button type="submit" class="btn" data-ask="ok"></button></div>
    </form>`;
    form = dlg.querySelector('form');
    h2 = dlg.querySelector('h2');
    p = dlg.querySelector('.ask-text');
    field = dlg.querySelector('.ask-field');
    input = dlg.querySelector('input');
    choices = dlg.querySelector('.ask-choices');
    btnCancel = dlg.querySelector('[data-ask="cancel"]');
    btnOk = dlg.querySelector('[data-ask="ok"]');
    // OK : bouton, ou Entrée dans le champ (envoi implicite du formulaire, impossible quand OK est grisé)
    form.addEventListener('submit', e => { e.preventDefault(); accept(); });
    btnCancel.addEventListener('click', () => cur?.finish(false));
    input.addEventListener('input', check);
    // Choix (choose) : un toucher sur une option répond tout de suite, sauf dans les 300 premières ms
    choices.addEventListener('click', e => {
      const b = e.target.closest('.ask-choice');
      if (b && cur?.kind === 'choose' && !tooSoon()) cur.finish(true, b.dataset.value);
    });
    // Échap : annuler (et pas de fermeture brute) ; « close » en filet si le navigateur ferme quand même
    dlg.addEventListener('cancel', e => { e.preventDefault(); cur?.finish(false); });
    dlg.addEventListener('close', () => { if (!dlg.open) cur?.finish(false); });
    dlg.addEventListener('keydown', e => {
      if (!cur) return;
      if (e.key === 'Tab') {
        // Focus piégé dans la fenêtre : Tab / Maj+Tab tournent sur les éléments visibles
        const items = [input, ...choices.children, btnCancel, btnOk].filter(el => !el.disabled && !el.closest('[hidden]') && !el.hidden);
        if (!items.length) return;
        const i = items.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
        e.preventDefault();
        items[next].focus();
      } else if (e.key === 'Enter' && !e.isComposing) {
        // Entrée sur un bouton : ce bouton (comportement natif) ; dans le champ : envoi du formulaire ; ailleurs : OK
        if (e.target === input || e.target.closest('button')) return;
        e.preventDefault();
        accept();
      }
    });
    document.body.append(dlg);
  }

  // OK grisé tant que la saisie ne convient pas (mot exact à retaper, longueur minimale)
  function check() {
    if (!cur || cur.kind !== 'text') { btnOk.disabled = false; return; }
    const v = input.value.trim(), n = [...v].length; // en caractères (un emoji compte pour un)
    btnOk.disabled = (cur.match != null && v !== String(cur.match)) || (cur.minLength > 0 && n < cur.minLength) || (cur.maxLength > 0 && n > cur.maxLength);
  }

  function run(kind, o = {}) {
    return new Promise(resolve => {
      if (!dlg) build();
      const prev = dlg.contains(document.activeElement) ? null : document.activeElement;
      let settled = false;
      cur = {
        kind, danger: !!o.danger, match: o.match ?? null, minLength: Math.max(0, o.minLength | 0), maxLength: Math.max(0, o.maxLength | 0),
        finish(ok, choice) {
          if (settled) return;
          settled = true;
          const value = kind === 'text' ? (ok ? input.value : null) : kind === 'ask' ? !!ok
            : kind === 'choose' ? (ok ? (o.options || []).find(x => String(x.value) === choice)?.value ?? null : null) : undefined;
          cur = null;
          holdBlock = true; // jusqu'au relâchement de la touche (ou une nouvelle frappe)
          if (dlg.open) dlg.close();
          document.documentElement.classList.remove('ask-open');
          resolve(value);
          // Focus rendu à l'élément d'origine s'il est encore dans la page, après la suite de l'appelant (bouton grisé
          // pendant la question puis réactivé), sans le voler à une autre question ou à ce que l'appelant a focalisé
          setTimeout(() => {
            if (dlg.open || !prev || !prev.isConnected || typeof prev.focus !== 'function') return;
            const a = document.activeElement;
            if (a && a !== document.body && a !== prev) return;
            try { prev.focus({ preventScroll: true }); } catch (_) {}
          }, 0);
        },
      };
      const title = o.title || (kind === 'tell' ? '' : t('dlg.title'));
      h2.textContent = title;
      h2.hidden = !title;
      p.textContent = o.text == null ? '' : String(o.text);
      dlg.setAttribute('role', kind === 'text' || kind === 'choose' ? 'dialog' : 'alertdialog');
      dlg.setAttribute('aria-labelledby', title ? 'brol-ask-t' : 'brol-ask-p');
      if (title) dlg.setAttribute('aria-describedby', 'brol-ask-p'); else dlg.removeAttribute('aria-describedby');
      dlg.classList.toggle('is-danger', !!o.danger);
      // Champ de saisie (askText) ; avec « match », le texte de la question dit déjà quel mot retaper
      field.hidden = kind !== 'text';
      dlg.classList.toggle('has-field', kind === 'text');
      input.value = '';
      input.placeholder = o.placeholder || '';
      // Limite du champ en unités UTF-16 (plus large que les caractères) : le contrôle exact est dans check()
      if (o.maxLength > 0) input.maxLength = o.maxLength * 2; else input.removeAttribute('maxlength');
      input.setAttribute('aria-labelledby', 'brol-ask-p');
      // Choix (choose) : un bouton par option, libellé en textContent ; pas de bouton OK (le choix répond)
      choices.replaceChildren(...(kind === 'choose' ? (o.options || []).map(x => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-line ask-choice';
        b.dataset.value = String(x.value);
        b.textContent = x.label == null ? String(x.value) : String(x.label);
        return b;
      }) : []));
      choices.hidden = kind !== 'choose';
      btnCancel.hidden = kind === 'tell';
      btnCancel.textContent = o.cancel || t('dlg.cancel');
      btnOk.textContent = o.ok || t(kind === 'tell' ? 'dlg.close' : kind === 'text' ? 'dlg.ok' : 'dlg.confirm');
      btnOk.className = o.danger ? 'btn btn-danger' : 'btn';
      btnOk.hidden = kind === 'choose';
      check();
      document.documentElement.classList.add('ask-open');
      openedAt = performance.now();
      try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', ''); }
      // Focus de départ : le champ ; le premier choix ; Annuler pour une action dangereuse ; sinon OK
      (kind === 'text' ? input : kind === 'choose' ? choices.firstElementChild || btnCancel : o.danger ? btnCancel : btnOk).focus();
    });
  }

  // File d'attente : la question suivante attend la réponse à la précédente
  function enqueue(kind, o) {
    const r = queue.then(() => run(kind, o));
    queue = r.catch(() => {});
    return r;
  }

  window.BrolDialog = Object.freeze({
    ask: o => enqueue('ask', o),
    askText: o => enqueue('text', o),
    tell: o => enqueue('tell', o),
    choose: o => enqueue('choose', o),
  });
})();
