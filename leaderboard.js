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

// ─── Instagram Stories export ─────────────────────────────────────────────────

function buildInstagramCard(scores) {
  const card = document.getElementById('insta-card');
  const W = 1080, H = 1920;
  const PAD = 64;
  const HEADER_H = 260;
  const FOOTER_H = 140;
  const n = Math.min(scores.length, 14);
  const entryH = Math.floor((H - HEADER_H - FOOTER_H - PAD * 2) / (n || 1));
  const fontSize = Math.min(46, Math.max(32, entryH * 0.36));
  const subSize  = Math.max(24, fontSize * 0.58);

  // Colors (no CSS vars — html2canvas needs literal values)
  const BG      = '#0d1b2a';
  const BG2     = '#1a2d42';
  const ACCENT  = '#f5a623';
  const GREEN   = '#27ae60';
  const TEXT    = '#e8f0fe';
  const DIM     = '#7a9abf';
  const BORDER  = '#2e4a6a';
  const GOLD    = '#ffd700';
  const SILVER  = '#c0c0c0';
  const BRONZE  = '#cd7f32';

  const date = new Date().toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });

  let rows = '';
  scores.slice(0, n).forEach((entry, idx) => {
    const rank = idx + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
    const rankColor = rank === 1 ? GOLD : rank === 2 ? SILVER : rank === 3 ? BRONZE : DIM;
    const r = entry.rounds;
    const bg = idx % 2 === 0 ? BG : BG2;

    const breakdown = [
      r.r32    ? `T32: ${r.r32}` : '',
      r.r16    ? `Ott: ${r.r16}` : '',
      r.qf     ? `Qrt: ${r.qf}`  : '',
      r.sf     ? `Semi: ${r.sf}` : '',
      r.third  ? `3°: ${r.third}` : '',
      (r.finalist + r.champion) ? `Fin: ${r.finalist + r.champion}` : '',
      r.bonus  ? `Bonus: ${r.bonus}` : '',
    ].filter(Boolean).join('  ·  ');

    rows += `
      <div style="
        display:flex; align-items:center; gap:${PAD * 0.5}px;
        padding: ${entryH * 0.1}px ${PAD}px;
        height:${entryH}px; background:${bg};
        border-bottom: 1px solid ${BORDER};
        box-sizing:border-box;
      ">
        <div style="font-size:${fontSize * 1.1}px; width:${fontSize * 1.6}px; text-align:center; flex-shrink:0;">${medal}</div>
        <div style="flex:1; overflow:hidden;">
          <div style="
            font-size:${fontSize}px; font-weight:700; color:${TEXT};
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
            line-height:1.2;
          ">${entry.name}</div>
          ${breakdown ? `<div style="font-size:${subSize}px; color:${DIM}; margin-top:4px; line-height:1.2;">${breakdown}</div>` : ''}
        </div>
        <div style="
          font-size:${fontSize * 1.1}px; font-weight:900;
          color:${ACCENT}; flex-shrink:0; text-align:right;
        ">${entry.total}<span style="font-size:${subSize}px; color:${DIM}"> pt</span></div>
      </div>`;
  });

  card.innerHTML = `
    <div style="
      width:${W}px; height:${H}px;
      background: linear-gradient(160deg, #0d1b2a 0%, #0a1520 50%, #111d2e 100%);
      font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
      display:flex; flex-direction:column;
      box-sizing:border-box; overflow:hidden;
    ">
      <!-- Header -->
      <div style="
        padding: ${PAD}px ${PAD}px ${PAD * 0.6}px;
        border-bottom: 3px solid ${ACCENT};
        flex-shrink:0;
      ">
        <div style="font-size:88px; font-weight:900; color:${ACCENT}; letter-spacing:-1px; line-height:1;">
          GIUDAS CUP ⚽
        </div>
        <div style="font-size:44px; color:${DIM}; margin-top:8px; font-weight:500;">
          Mondiale 2026 · Classifica
        </div>
        <div style="font-size:34px; color:${BORDER}; margin-top:6px;">
          ${date}
        </div>
      </div>

      <!-- Entries -->
      <div style="flex:1; overflow:hidden;">
        ${rows}
      </div>

      <!-- Footer -->
      <div style="
        padding: ${PAD * 0.6}px ${PAD}px;
        border-top: 1px solid ${BORDER};
        flex-shrink:0;
      ">
        <div style="font-size:28px; color:${DIM}; line-height:1.6;">
          T32=1pt · Ott=2pt · Qrt=4pt · Semi=8pt · 3°=8pt
        </div>
        <div style="font-size:28px; color:${DIM}; line-height:1.6;">
          Finalista=16pt · 🏆 Campione=32pt · Bonus=5pt · Max: <strong style="color:${TEXT}">135pt</strong>
        </div>
      </div>
    </div>`;
}

function exportInstagram(btn) {
  const scores = computeAllScores(predictions, results);
  if (!scores.length) {
    showToast('Nessun partecipante da esportare', 'error');
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Generando...';

  buildInstagramCard(scores);

  const card = document.getElementById('insta-card');
  html2canvas(card.firstElementChild, {
    width: 1080,
    height: 1920,
    scale: 1,
    useCORS: true,
    backgroundColor: '#0d1b2a',
    logging: false,
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'giudas-cup-classifica.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('Immagine scaricata! 📸', 'success');
  }).catch(err => {
    btn.disabled = false;
    btn.textContent = originalText;
    showToast('Errore export: ' + err.message, 'error');
  });
}

function showToast(msg, type) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type||'info'}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
