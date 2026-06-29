'use strict';
/* index.html — bracket editor */

let db, auth;
let currentUser = null;
let config = null;
let bracketState = {}; // matchId → { winner }
let bonuses = { mvp: '', bestYoung: '', bestKeeper: '' };
let saveTimer = null;
let isLocked = false;

// ─── Init ──────────────────────────────────────────────────────────────────────
function init() {
  db   = firebase.database();
  auth = firebase.auth();

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      document.getElementById('user-uid').textContent = '';
      loadApp();
    } else {
      auth.signInAnonymously().catch(err => {
        showToast('Errore autenticazione: ' + err.message, 'error');
      });
    }
  });
}

function loadApp() {
  // Load config from Firebase
  db.ref('config').on('value', snap => {
    config = snap.val() || {};
    isLocked = config.locked || isDeadlinePassed(config.deadline);
    renderLockBanner();

    // Load user's prediction
    db.ref('predictions/' + currentUser.uid).once('value', predSnap => {
      const pred = predSnap.val();
      if (pred) {
        if (!pred.meta || !pred.meta.name) {
          showNameModal();
        } else {
          document.getElementById('user-name-display').textContent = pred.meta.name;
          bracketState = pred.bracket || {};
          bonuses = pred.bonuses || { mvp: '', bestYoung: '', bestKeeper: '' };
          renderAll();
          document.getElementById('loading-overlay').classList.add('hidden');
        }
      } else {
        document.getElementById('loading-overlay').classList.add('hidden');
        showNameModal();
      }
    });
  });
}

function isDeadlinePassed(deadline) {
  return deadline && Date.now() > deadline;
}

// ─── Name modal ────────────────────────────────────────────────────────────────
function showNameModal() {
  document.getElementById('name-modal').classList.remove('hidden');
  document.getElementById('name-input').focus();
}

function handleNameSubmit() {
  const name = (document.getElementById('name-input').value || '').trim();
  if (!name) { showToast('Inserisci il tuo nome!', 'error'); return; }
  if (name.length > 40) { showToast('Nome troppo lungo (max 40 caratteri)', 'error'); return; }

  document.getElementById('name-modal').classList.add('hidden');
  document.getElementById('user-name-display').textContent = name;

  // Save meta to Firebase
  db.ref('predictions/' + currentUser.uid + '/meta').set({
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }).then(() => {
    renderAll();
  }).catch(err => showToast('Errore: ' + err.message, 'error'));
}

// ─── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  if (!config || !config.tournament || !config.tournament.round32Matchups) {
    document.getElementById('bracket-placeholder').style.display = 'block';
    document.getElementById('bracket-content').style.display = 'none';
    return;
  }
  document.getElementById('bracket-placeholder').style.display = 'none';
  document.getElementById('bracket-content').style.display = 'block';

  renderDesktopBracket();
  renderMobileBracket();
  renderSpecialMatches();
  renderBonusSection();
  updateProgress();
}

// ── Desktop bracket ────────────────────────────────────────────────────────────
function renderDesktopBracket() {
  const wrap = document.getElementById('desktop-bracket');
  wrap.innerHTML = '';

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.id = 'bracket-svg';
  svgEl.classList.add('bracket-svg');

  ROUNDS.forEach(round => {
    const col = document.createElement('div');
    col.className = 'bracket-col';

    const header = document.createElement('div');
    header.className = 'bracket-col-header';
    header.textContent = round.label;
    col.appendChild(header);

    const body = document.createElement('div');
    body.className = 'bracket-col-body';
    body.style.height = BRACKET_TOTAL_H + 'px';

    round.matchIds.forEach(matchId => {
      const card = buildMatchCard(matchId, false);
      card.style.top = matchYTop(matchId) + 'px';
      body.appendChild(card);
    });

    col.appendChild(body);
    wrap.appendChild(col);
  });

  // SVG overlay spans full bracket width × height
  svgEl.style.height = BRACKET_TOTAL_H + 'px';
  wrap.style.position = 'relative';

  // We'll draw connectors after layout
  setTimeout(() => drawConnectors(wrap, svgEl), 50);
  wrap.appendChild(svgEl);
}

function drawConnectors(wrap, svgEl) {
  svgEl.innerHTML = '';
  const wrapRect = wrap.getBoundingClientRect();
  svgEl.style.width  = wrap.scrollWidth + 'px';

  Object.entries(BRACKET_TREE).forEach(([childId, info]) => {
    const childEl  = wrap.querySelector(`[data-match-id="${childId}"]`);
    const parentEl = wrap.querySelector(`[data-match-id="${info.parent}"]`);
    if (!childEl || !parentEl) return;

    const cr = childEl.getBoundingClientRect();
    const pr = parentEl.getBoundingClientRect();
    const scrollLeft = wrap.scrollLeft;

    const x1 = cr.right  - wrapRect.left + scrollLeft;
    const y1 = cr.top + cr.height / 2 - wrapRect.top;
    const x2 = pr.left   - wrapRect.left + scrollLeft;
    const y2 = pr.top + pr.height / 2 - wrapRect.top;
    const mx = (x1 + x2) / 2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`);
    path.setAttribute('stroke', '#2e4a6a');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '1.5');
    svgEl.appendChild(path);
  });
}

// ── Mobile bracket ─────────────────────────────────────────────────────────────
function renderMobileBracket() {
  const view = document.getElementById('mobile-view');
  view.innerHTML = '';

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'round-tabs';

  const panels = document.createElement('div');

  const allRounds = [...ROUNDS];
  // third place as extra round entry
  const thirdRound = { id: 'third', label: '3° Posto', matchIds: ['third'] };
  const finalExtra = { id: 'final_extra', label: 'Finale', matchIds: ['final'] };
  // already included in ROUNDS as 'final'
  // include third before final
  allRounds.splice(allRounds.length - 1, 0, thirdRound);

  allRounds.forEach((round, idx) => {
    const tab = document.createElement('button');
    tab.className = 'round-tab' + (idx === 0 ? ' active' : '');
    tab.textContent = round.label;
    tab.dataset.roundIdx = idx;
    tab.addEventListener('click', () => {
      view.querySelectorAll('.round-tab').forEach(t => t.classList.remove('active'));
      view.querySelectorAll('.mobile-round').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panels.children[idx].classList.add('active');
    });

    const panel = document.createElement('div');
    panel.className = 'mobile-round' + (idx === 0 ? ' active' : '');
    const list = document.createElement('div');
    list.className = 'match-list';

    round.matchIds.forEach(matchId => {
      list.appendChild(buildMatchCard(matchId, true));
    });

    panel.appendChild(list);
    tabs.appendChild(tab);
    panels.appendChild(panel);
  });

  view.appendChild(tabs);
  view.appendChild(panels);
  updateMobileTabs(view, allRounds);
}

function updateMobileTabs(view, allRounds) {
  const tabs = view.querySelectorAll('.round-tab');
  allRounds.forEach((round, idx) => {
    const done = round.matchIds.every(id => bracketState[id] && bracketState[id].winner);
    tabs[idx].classList.toggle('complete', done);
  });
}

// ── Special matches (3rd place + final rendered separately on mobile) ──────────
function renderSpecialMatches() {
  const wrap = document.getElementById('special-matches');
  wrap.innerHTML = '';

  const thirdWrap = document.createElement('div');
  thirdWrap.className = 'special-match-wrapper';
  thirdWrap.innerHTML = '<h3>🥉 Terzo Posto</h3>';
  thirdWrap.appendChild(buildMatchCard('third', false));

  const finalWrap = document.createElement('div');
  finalWrap.className = 'special-match-wrapper final';
  finalWrap.innerHTML = '<h3>🏆 Finale</h3>';
  finalWrap.appendChild(buildMatchCard('final', false));

  wrap.appendChild(thirdWrap);
  wrap.appendChild(finalWrap);
}

// ── Build a single match card ──────────────────────────────────────────────────
function buildMatchCard(matchId, showLabel) {
  const { home, away } = getMatchTeams(matchId, config, bracketState);
  const winner = bracketState[matchId] && bracketState[matchId].winner;

  const card = document.createElement('div');
  card.className = 'match-card';
  card.dataset.matchId = matchId;

  if (showLabel) {
    const lbl = document.createElement('div');
    lbl.className = 'match-label';
    lbl.textContent = ROUND_LABELS[getRoundId(matchId)] || matchId;
    card.appendChild(lbl);
  }

  [home, away].forEach((team, idx) => {
    if (idx === 1) card.appendChild(Object.assign(document.createElement('div'), { className: 'team-divider' }));
    const btn = buildTeamBtn(team, winner, matchId);
    card.appendChild(btn);
  });

  return card;
}

function buildTeamBtn(team, winner, matchId) {
  const btn = document.createElement('button');
  btn.className = 'team-btn';
  btn.dataset.matchId = matchId;
  btn.dataset.team = team || '';

  if (!team) {
    btn.classList.add('tbd');
    btn.disabled = true;
    btn.innerHTML = '<span class="flag">⏳</span><span class="name">TBD</span>';
    return btn;
  }

  const flag = teamFlag(team);
  btn.innerHTML = `<span class="flag">${flag}</span><span class="name">${team}</span>`;

  if (winner === team) btn.classList.add('selected');
  if (isLocked) btn.disabled = true;
  else btn.addEventListener('click', onTeamClick);

  return btn;
}

function onTeamClick(e) {
  if (isLocked) return;
  const matchId = e.currentTarget.dataset.matchId;
  const team    = e.currentTarget.dataset.team;
  if (!team) return;

  bracketState = pickWinner(matchId, team, config, bracketState);
  scheduleSave();
  renderAll();
}

// ─── Bonus section ──────────────────────────────────────────────────────────────
function renderBonusSection() {
  document.getElementById('bonus-mvp').value        = bonuses.mvp || '';
  document.getElementById('bonus-youngPlayer').value = bonuses.bestYoung || '';
  document.getElementById('bonus-keeper').value     = bonuses.bestKeeper || '';
}

function onBonusChange() {
  bonuses.mvp       = document.getElementById('bonus-mvp').value.trim();
  bonuses.bestYoung = document.getElementById('bonus-youngPlayer').value.trim();
  bonuses.bestKeeper = document.getElementById('bonus-keeper').value.trim();
  scheduleSave();
}

// ─── Save ────────────────────────────────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToFirebase, 800);
  document.getElementById('save-status').textContent = '⏳ Salvataggio...';
}

function saveToFirebase() {
  if (!currentUser) return;
  const uid = currentUser.uid;
  const updates = {};
  updates['predictions/' + uid + '/bracket'] = bracketState;
  updates['predictions/' + uid + '/bonuses'] = bonuses;
  updates['predictions/' + uid + '/meta/updatedAt'] = Date.now();

  db.ref().update(updates)
    .then(() => { document.getElementById('save-status').textContent = '✓ Salvato'; })
    .catch(err => {
      document.getElementById('save-status').textContent = '✗ Errore';
      showToast('Errore salvataggio: ' + err.message, 'error');
    });
}

// ─── Progress bar ────────────────────────────────────────────────────────────────
function updateProgress() {
  const total = ALL_MATCH_IDS.length;
  const done  = ALL_MATCH_IDS.filter(id => bracketState[id] && bracketState[id].winner).length;
  const pct   = Math.round((done / total) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done}/${total} partite compilate`;
}

// ─── Lock banner ────────────────────────────────────────────────────────────────
function renderLockBanner() {
  const banner = document.getElementById('lock-banner');
  if (isLocked) {
    banner.className = 'banner banner-locked';
    banner.textContent = '🔒 Le predizioni sono chiuse. Segui la classifica!';
    banner.style.display = 'block';
  } else if (config && config.deadline) {
    const d = new Date(config.deadline);
    banner.className = 'banner banner-open';
    banner.textContent = `✅ Predizioni aperte — scadenza: ${d.toLocaleString('it-IT')}`;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// ─── Confirm ─────────────────────────────────────────────────────────────────────
function confirmPredictions() {
  if (isLocked) { showToast('Le predizioni sono chiuse!', 'error'); return; }

  const total = ALL_MATCH_IDS.length;
  const done  = ALL_MATCH_IDS.filter(id => bracketState[id] && bracketState[id].winner).length;
  const missing = total - done;

  if (missing > 0) {
    const msg = document.getElementById('confirm-msg');
    msg.style.color = 'var(--red)';
    msg.textContent = `⚠️ Mancano ancora ${missing} partite da compilare (${done}/${total}).`;
    showToast(`Completa tutte le ${missing} partite rimanenti!`, 'error');
    return;
  }

  // Force immediate save
  clearTimeout(saveTimer);
  if (!currentUser) return;
  const uid = currentUser.uid;
  const updates = {};
  updates['predictions/' + uid + '/bracket'] = bracketState;
  updates['predictions/' + uid + '/bonuses'] = bonuses;
  updates['predictions/' + uid + '/meta/updatedAt'] = Date.now();

  db.ref().update(updates).then(() => {
    const msg = document.getElementById('confirm-msg');
    msg.style.color = 'var(--green)';
    msg.textContent = '✓ Predizioni salvate! Puoi sempre tornare a modificarle finché non scade il termine.';
    document.getElementById('save-status').textContent = '✓ Salvato';
    showToast('Predizioni confermate! 🎉', 'success');
  }).catch(err => showToast('Errore: ' + err.message, 'error'));
}

// ─── Toast ────────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
