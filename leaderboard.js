'use strict';
/* leaderboard.html */

let db, auth;
let results = {};
let predictions = {};
let myUid = null;
let modalOpen = null;

function init() {
  db   = firebase.database();
  auth = firebase.auth();

  auth.onAuthStateChanged(user => {
    myUid = user ? user.uid : null;
  });
  auth.signInAnonymously();

  // Listen for results changes → recompute
  db.ref('results').on('value', snap => {
    results = snap.val() || {};
    renderTable();
  });

  // Listen for predictions changes → recompute
  db.ref('predictions').on('value', snap => {
    predictions = snap.val() || {};
    renderTable();
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('bracket-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('bracket-modal')) closeModal();
  });
}

function renderTable() {
  const scores = computeAllScores(predictions, results);
  const tbody  = document.getElementById('leaderboard-body');
  const empty  = document.getElementById('empty-state');
  const ts     = document.getElementById('last-updated');

  ts.textContent = 'Aggiornato: ' + new Date().toLocaleTimeString('it-IT');

  if (!scores.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = '';
  scores.forEach((entry, idx) => {
    const rank = idx + 1;
    const tr = document.createElement('tr');
    tr.dataset.uid = entry.uid;
    if (entry.uid === myUid) tr.classList.add('own-row');
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => openModal(entry.uid));

    const r = entry.rounds;

    tr.innerHTML = `
      <td class="rank ${rankClass(rank)}">${rankBadge(rank)}</td>
      <td style="font-weight:600">${escHtml(entry.name)}</td>
      <td class="pts-cell ${r.r32 ? 'has-pts' : ''}">${r.r32 || '—'}</td>
      <td class="pts-cell ${r.r16 ? 'has-pts' : ''}">${r.r16 || '—'}</td>
      <td class="pts-cell ${r.qf  ? 'has-pts' : ''}">${r.qf  || '—'}</td>
      <td class="pts-cell ${r.sf  ? 'has-pts' : ''}">${r.sf  || '—'}</td>
      <td class="pts-cell ${r.third ? 'has-pts' : ''}">${r.third || '—'}</td>
      <td class="pts-cell ${(r.finalist||r.champion) ? 'has-pts' : ''}">${(r.finalist + r.champion) || '—'}</td>
      <td class="pts-cell ${r.bonus ? 'has-pts' : ''}">${r.bonus || '—'}</td>
      <td class="total">${entry.total}</td>
    `;
    tbody.appendChild(tr);
  });
}

function rankClass(n) { return n === 1 ? 'rank-1' : n === 2 ? 'rank-2' : n === 3 ? 'rank-3' : ''; }
function rankBadge(n) { return n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : n; }

// ─── Read-only bracket modal ───────────────────────────────────────────────────
function openModal(uid) {
  const pred = predictions[uid];
  if (!pred) return;

  const modal = document.getElementById('bracket-modal');
  const inner = document.getElementById('modal-inner');

  modal.classList.add('open');
  document.getElementById('modal-title').textContent = (pred.meta && pred.meta.name) || 'Tabellone';

  // Get config for team resolution
  db.ref('config').once('value', snap => {
    const cfg = snap.val() || {};
    renderReadOnlyBracket(inner, pred, cfg, results);
  });
}

function closeModal() {
  document.getElementById('bracket-modal').classList.remove('open');
}

function renderReadOnlyBracket(container, pred, cfg, res) {
  const view = document.getElementById('modal-bracket-view');
  view.innerHTML = '';

  // Show rounds as a simple list
  [...ROUNDS, { id: 'third', label: '3° Posto', matchIds: ['third'] }].forEach(round => {
    const section = document.createElement('div');
    section.style.marginBottom = '20px';

    const h = document.createElement('div');
    h.className = 'section-title';
    h.textContent = round.label;
    section.appendChild(h);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;';

    round.matchIds.forEach(matchId => {
      const { home, away } = getMatchTeams(matchId, cfg, pred.bracket || {});
      const winner = pred.bracket && pred.bracket[matchId] && pred.bracket[matchId].winner;
      const realWinner = res && res[matchId] && res[matchId].winner;

      const card = document.createElement('div');
      card.className = 'match-card';
      card.style.position = 'static';

      [home, away].forEach((team, idx) => {
        if (idx === 1) card.appendChild(Object.assign(document.createElement('div'), { className: 'team-divider' }));

        const btn = document.createElement('div');
        btn.className = 'team-btn';
        btn.style.cursor = 'default';

        if (!team) {
          btn.classList.add('tbd');
          btn.innerHTML = '<span class="flag">⏳</span><span class="name">TBD</span>';
        } else {
          let stateClass = '';
          if (winner === team) {
            if (!realWinner) stateClass = 'selected';
            else stateClass = realWinner === team ? 'correct' : 'wrong';
          }
          if (stateClass) btn.classList.add(stateClass);
          btn.innerHTML = `<span class="flag">${teamFlag(team)}</span><span class="name">${escHtml(team)}</span>`;
        }
        card.appendChild(btn);
      });
      grid.appendChild(card);
    });

    section.appendChild(grid);
    view.appendChild(section);
  });

  // Bonus section
  if (pred.bonuses) {
    const bonusSec = document.createElement('div');
    bonusSec.innerHTML = `
      <div class="section-title">Premi speciali</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:.9rem;">
        <div><strong>MVP:</strong> ${escHtml(pred.bonuses.mvp || '—')}</div>
        <div><strong>Miglior Giovane:</strong> ${escHtml(pred.bonuses.bestYoung || '—')}</div>
        <div><strong>Miglior Portiere:</strong> ${escHtml(pred.bonuses.bestKeeper || '—')}</div>
      </div>
    `;
    view.appendChild(bonusSec);
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
