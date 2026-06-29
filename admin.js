'use strict';
/* admin.html */

let db, auth;
let adminUid = null;
let currentAdmin = null;
let configData = {};
let resultsData = {};
let predictionsData = {};

function init() {
  db   = firebase.database();
  auth = firebase.auth();

  auth.onAuthStateChanged(user => {
    if (user && user.email) {
      currentAdmin = user;
      db.ref('config/adminUid').once('value', snap => {
        const storedUid = snap.val();
        if (!storedUid) {
          // First time: claim admin
          db.ref('config/adminUid').set(user.uid).then(() => {
            adminUid = user.uid;
            showAdmin();
          });
        } else if (storedUid === user.uid) {
          adminUid = user.uid;
          showAdmin();
        } else {
          showToast('Non sei autorizzato come admin.', 'error');
          auth.signOut();
        }
      });
    }
  });
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const pass  = document.getElementById('admin-pass').value;
  if (!email || !pass) { showToast('Inserisci email e password', 'error'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Accesso...';

  auth.signInWithEmailAndPassword(email, pass)
    .catch(err => {
      showToast('Errore login: ' + err.message, 'error');
      btn.disabled = false; btn.textContent = 'Accedi';
    });
}

function showAdmin() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('admin-panel').style.display   = 'block';
  document.getElementById('admin-email-display').textContent = currentAdmin.email;
  loadAdminData();
}

function handleLogout() {
  auth.signOut().then(() => {
    location.reload();
  });
}

// ─── Load data ─────────────────────────────────────────────────────────────────
function loadAdminData() {
  db.ref('config').on('value', snap => {
    configData = snap.val() || {};
    renderConfigSection();
    renderManageSection();
    renderResultsSection();
  });

  db.ref('results').on('value', snap => {
    resultsData = snap.val() || {};
    renderResultsSection();
  });

  db.ref('predictions').on('value', snap => {
    predictionsData = snap.val() || {};
    renderParticipants();
  });
}

// ─── Tab navigation ─────────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'section-' + tabId));
}

// ─── Section: Config (R32 matchups + teams) ────────────────────────────────────
function renderConfigSection() {
  const container = document.getElementById('matchup-grid');
  container.innerHTML = '';

  // Use saved matchups or fall back to the official WC2026 bracket
  const matchups = (configData.tournament && configData.tournament.round32Matchups && configData.tournament.round32Matchups.length)
    ? configData.tournament.round32Matchups
    : DEFAULT_MATCHUPS;
  const teamNames = Object.keys(TEAMS).sort();

  for (let i = 1; i <= 16; i++) {
    const matchId = 'r32_' + i;
    const existing = matchups.find(m => m.matchId === matchId) || {};

    const row = document.createElement('div');
    row.className = 'matchup-row';

    const num = document.createElement('span');
    num.className = 'match-num';
    num.textContent = '#' + i;

    const selHome = buildTeamSelect(teamNames, existing.home || '', 'home_' + i);
    const vs = document.createElement('span');
    vs.className = 'vs'; vs.textContent = 'vs';
    const selAway = buildTeamSelect(teamNames, existing.away || '', 'away_' + i);

    row.appendChild(num);
    row.appendChild(selHome);
    row.appendChild(vs);
    row.appendChild(selAway);
    container.appendChild(row);
  }
}

function buildTeamSelect(teamNames, selected, id) {
  const sel = document.createElement('select');
  sel.className = 'field';
  sel.id = 'sel_' + id;
  sel.style.flex = '1';

  const blank = document.createElement('option');
  blank.value = ''; blank.textContent = '— Seleziona —';
  sel.appendChild(blank);

  teamNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = (TEAMS[name] ? TEAMS[name].flag + ' ' : '') + name;
    if (name === selected) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

function saveMatchups() {
  const matchups = [];
  for (let i = 1; i <= 16; i++) {
    const home = document.getElementById('sel_home_' + i) && document.getElementById('sel_home_' + i).value;
    const away = document.getElementById('sel_away_' + i) && document.getElementById('sel_away_' + i).value;
    if (!home || !away) { showToast(`Partita #${i}: seleziona entrambe le squadre`, 'error'); return; }
    if (home === away)  { showToast(`Partita #${i}: la stessa squadra non può giocare contro se stessa`, 'error'); return; }
    matchups.push({ matchId: 'r32_' + i, home, away });
  }

  // Validate no team appears more than once
  const allTeams = matchups.flatMap(m => [m.home, m.away]);
  const dupes = allTeams.filter((t, i) => allTeams.indexOf(t) !== i);
  if (dupes.length) {
    showToast('Squadre duplicate: ' + [...new Set(dupes)].join(', '), 'error');
    return;
  }

  db.ref('config/tournament/round32Matchups').set(matchups)
    .then(() => showToast('Accoppiamenti salvati! ✓', 'success'))
    .catch(err => showToast('Errore: ' + err.message, 'error'));
}

// ─── Section: Results ──────────────────────────────────────────────────────────
function renderResultsSection() {
  const container = document.getElementById('results-grid');
  container.innerHTML = '';

  if (!configData.tournament || !configData.tournament.round32Matchups) {
    container.innerHTML = '<p style="color:var(--text-dim)">Configura prima gli accoppiamenti del Turno dei 32.</p>';
    return;
  }

  // All matches in order
  const allMatchSets = [
    { label: 'Turno dei 32', ids: Array.from({length:16}, (_,i) => 'r32_' + (i+1)) },
    { label: 'Ottavi di Finale', ids: Array.from({length:8}, (_,i) => 'r16_' + (i+1)) },
    { label: 'Quarti di Finale', ids: ['qf_1','qf_2','qf_3','qf_4'] },
    { label: 'Semifinali',       ids: ['sf_1','sf_2'] },
    { label: '3° Posto',         ids: ['third'] },
    { label: 'Finale',           ids: ['final'] },
  ];

  allMatchSets.forEach(set => {
    const heading = document.createElement('div');
    heading.className = 'section-title';
    heading.style.marginTop = '20px';
    heading.textContent = set.label;
    container.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'result-grid';

    set.ids.forEach(matchId => {
      const { home, away } = getMatchTeams(matchId, configData, buildBracketFromResults());
      const currentWinner = resultsData[matchId] && resultsData[matchId].winner;
      const done = !!currentWinner;

      const row = document.createElement('div');
      row.className = 'result-row' + (done ? ' done' : '');

      const lbl = document.createElement('div');
      lbl.className = 'match-id-label';
      lbl.textContent = matchId.toUpperCase().replace('_', ' ');
      row.appendChild(lbl);

      const picks = document.createElement('div');
      picks.className = 'team-picks';

      [home, away].forEach(team => {
        const btn = document.createElement('button');
        btn.className = 'result-pick' + (currentWinner === team ? ' chosen' : '') + (!team ? ' tbd' : '');
        btn.textContent = team ? teamFlag(team) + ' ' + team : 'TBD';
        btn.disabled = !team;
        if (team) {
          btn.addEventListener('click', () => setResult(matchId, team));
        }
        picks.appendChild(btn);
      });

      // Special: runner-up for final
      if (matchId === 'final' && currentWinner) {
        const ruLabel = document.createElement('div');
        const bothTeams = [home, away].filter(Boolean);
        const runnerUp = bothTeams.find(t => t !== currentWinner);
        if (runnerUp) {
          ruLabel.style.cssText = 'font-size:.75rem;color:var(--text-dim);margin-top:4px;text-align:center;width:100%';
          ruLabel.textContent = '🥈 Finalista: ' + runnerUp;
          row.appendChild(ruLabel);
        }
      }

      row.appendChild(picks);
      grid.appendChild(row);
    });

    container.appendChild(grid);
  });

  // Awards section
  const awardsHead = document.createElement('div');
  awardsHead.className = 'section-title';
  awardsHead.style.marginTop = '24px';
  awardsHead.textContent = 'Premi Speciali';
  container.appendChild(awardsHead);

  const awardsGrid = document.createElement('div');
  awardsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:8px;';

  const awards = [
    { key: 'mvp',        label: '🏅 MVP del Torneo' },
    { key: 'bestYoung',  label: '⭐ Miglior Giovane (U21)' },
    { key: 'bestKeeper', label: '🧤 Miglior Portiere' },
  ];

  awards.forEach(award => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.innerHTML = `<label>${award.label}</label>`;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.placeholder = 'Nome giocatore';
    inp.value = (resultsData.awards && resultsData.awards[award.key]) || '';
    inp.addEventListener('change', () => {
      db.ref('results/awards/' + award.key).set(inp.value.trim())
        .then(() => showToast('Premio salvato ✓', 'success'))
        .catch(err => showToast('Errore: ' + err.message, 'error'));
    });
    wrap.appendChild(inp);
    awardsGrid.appendChild(wrap);
  });
  container.appendChild(awardsGrid);
}

// Derive bracket winners from resultsData (for team resolution in higher rounds)
function buildBracketFromResults() {
  const state = {};
  ALL_MATCH_IDS.forEach(id => {
    if (resultsData[id] && resultsData[id].winner) {
      state[id] = { winner: resultsData[id].winner };
    }
  });
  return state;
}

function setResult(matchId, winner) {
  const bothTeams = (() => {
    const { home, away } = getMatchTeams(matchId, configData, buildBracketFromResults());
    return [home, away].filter(Boolean);
  })();
  const runnerUp = matchId === 'final' ? bothTeams.find(t => t !== winner) : undefined;

  const updates = {};
  updates['results/' + matchId + '/winner'] = winner;
  if (runnerUp) updates['results/' + matchId + '/runnerUp'] = runnerUp;

  db.ref().update(updates)
    .then(() => showToast(`Risultato salvato: ${winner} ✓`, 'success'))
    .catch(err => showToast('Errore: ' + err.message, 'error'));
}

// ─── Section: Manage ──────────────────────────────────────────────────────────
function renderManageSection() {
  const locked = configData.locked || false;
  const dl     = configData.deadline;

  const lockBtn = document.getElementById('toggle-lock-btn');
  lockBtn.textContent = locked ? '🔓 Riapri Predizioni' : '🔒 Blocca Predizioni';
  lockBtn.className = locked ? 'btn btn-secondary' : 'btn btn-danger';

  document.getElementById('locked-status').textContent = locked ? 'Chiuse' : 'Aperte';
  document.getElementById('locked-status').style.color = locked ? 'var(--red)' : 'var(--green)';

  const dlInput = document.getElementById('deadline-input');
  if (dl) {
    dlInput.value = new Date(dl).toISOString().slice(0,16);
  }
}

function toggleLock() {
  const newLocked = !configData.locked;
  db.ref('config/locked').set(newLocked)
    .then(() => showToast(newLocked ? '🔒 Predizioni bloccate' : '🔓 Predizioni riaperte', 'info'))
    .catch(err => showToast('Errore: ' + err.message, 'error'));
}

function saveDeadline() {
  const val = document.getElementById('deadline-input').value;
  if (!val) return;
  const ts = new Date(val).getTime();
  db.ref('config/deadline').set(ts)
    .then(() => showToast('Scadenza salvata ✓', 'success'))
    .catch(err => showToast('Errore: ' + err.message, 'error'));
}

// ─── Section: Participants ─────────────────────────────────────────────────────
function renderParticipants() {
  const list = document.getElementById('participants-list');
  list.innerHTML = '';
  const entries = Object.entries(predictionsData);

  document.getElementById('participants-count').textContent = entries.length;

  if (!entries.length) {
    list.innerHTML = '<div class="empty-state"><div>Nessun partecipante ancora.</div></div>';
    return;
  }

  const scores = computeAllScores(predictionsData, resultsData);

  scores.forEach(entry => {
    const pred = predictionsData[entry.uid];
    const name = pred.meta && pred.meta.name || 'Senza nome';
    const updatedAt = pred.meta && pred.meta.updatedAt ? new Date(pred.meta.updatedAt).toLocaleString('it-IT') : '—';
    const filled = ALL_MATCH_IDS.filter(id => pred.bracket && pred.bracket[id] && pred.bracket[id].winner).length;

    const row = document.createElement('div');
    row.className = 'participant-row';
    row.innerHTML = `
      <div>
        <div class="p-name">${escHtml(name)}</div>
        <div class="p-info">${filled}/${ALL_MATCH_IDS.length} partite · Aggiornato: ${updatedAt}</div>
      </div>
      <div class="p-score">${entry.total} pt</div>
    `;
    row.addEventListener('click', () => openParticipantModal(entry.uid, name, pred));
    list.appendChild(row);
  });
}

function openParticipantModal(uid, name, pred) {
  const modal = document.getElementById('participant-modal');
  modal.style.display = 'flex';
  document.getElementById('participant-modal-name').textContent = name;

  const view = document.getElementById('participant-bracket-view');
  view.innerHTML = '';

  db.ref('config').once('value', snap => {
    const cfg = snap.val() || {};
    [...ROUNDS, { id: 'third', label: '3° Posto', matchIds: ['third'] }].forEach(round => {
      const sec = document.createElement('div');
      sec.style.marginBottom = '16px';
      const h = document.createElement('div'); h.className = 'section-title'; h.textContent = round.label;
      sec.appendChild(h);
      const g = document.createElement('div');
      g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px';
      round.matchIds.forEach(matchId => {
        const { home, away } = getMatchTeams(matchId, cfg, pred.bracket || {});
        const winner = pred.bracket && pred.bracket[matchId] && pred.bracket[matchId].winner;
        const realW = resultsData[matchId] && resultsData[matchId].winner;
        const card = document.createElement('div');
        card.className = 'match-card'; card.style.position = 'static';
        [home, away].forEach((team, idx) => {
          if (idx === 1) card.appendChild(Object.assign(document.createElement('div'), { className: 'team-divider' }));
          const btn = document.createElement('div');
          btn.className = 'team-btn'; btn.style.cursor = 'default';
          if (!team) { btn.classList.add('tbd'); btn.innerHTML = '<span class="flag">⏳</span><span class="name">TBD</span>'; }
          else {
            if (winner === team) btn.classList.add(!realW ? 'selected' : realW === team ? 'correct' : 'wrong');
            btn.innerHTML = `<span class="flag">${teamFlag(team)}</span><span class="name">${escHtml(team)}</span>`;
          }
          card.appendChild(btn);
        });
        g.appendChild(card);
      });
      sec.appendChild(g); view.appendChild(sec);
    });
    if (pred.bonuses) {
      const b = document.createElement('div');
      b.innerHTML = `<div class="section-title">Premi speciali</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:.9rem">
          <div><strong>MVP:</strong> ${escHtml(pred.bonuses.mvp||'—')}</div>
          <div><strong>Miglior Giovane:</strong> ${escHtml(pred.bonuses.bestYoung||'—')}</div>
          <div><strong>Miglior Portiere:</strong> ${escHtml(pred.bonuses.bestKeeper||'—')}</div>
        </div>`;
      view.appendChild(b);
    }
  });
}

function closeParticipantModal() {
  document.getElementById('participant-modal').style.display = 'none';
}

// ─── Utils ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg, type) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type||'info'}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
