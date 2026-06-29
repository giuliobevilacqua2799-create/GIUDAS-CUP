'use strict';

// ─── Teams ────────────────────────────────────────────────────────────────────
const TEAMS = {
  "Argentina":    { flag: "🇦🇷", conf: "CONMEBOL" },
  "Brazil":       { flag: "🇧🇷", conf: "CONMEBOL" },
  "Colombia":     { flag: "🇨🇴", conf: "CONMEBOL" },
  "Uruguay":      { flag: "🇺🇾", conf: "CONMEBOL" },
  "Ecuador":      { flag: "🇪🇨", conf: "CONMEBOL" },
  "Venezuela":    { flag: "🇻🇪", conf: "CONMEBOL" },
  "Chile":        { flag: "🇨🇱", conf: "CONMEBOL" },
  "Paraguay":     { flag: "🇵🇾", conf: "CONMEBOL" },
  "France":       { flag: "🇫🇷", conf: "UEFA" },
  "Spain":        { flag: "🇪🇸", conf: "UEFA" },
  "England":      { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", conf: "UEFA" },
  "Germany":      { flag: "🇩🇪", conf: "UEFA" },
  "Portugal":     { flag: "🇵🇹", conf: "UEFA" },
  "Netherlands":  { flag: "🇳🇱", conf: "UEFA" },
  "Belgium":      { flag: "🇧🇪", conf: "UEFA" },
  "Croatia":      { flag: "🇭🇷", conf: "UEFA" },
  "Italy":        { flag: "🇮🇹", conf: "UEFA" },
  "Switzerland":  { flag: "🇨🇭", conf: "UEFA" },
  "Austria":      { flag: "🇦🇹", conf: "UEFA" },
  "Denmark":      { flag: "🇩🇰", conf: "UEFA" },
  "Serbia":       { flag: "🇷🇸", conf: "UEFA" },
  "Turkey":       { flag: "🇹🇷", conf: "UEFA" },
  "Poland":       { flag: "🇵🇱", conf: "UEFA" },
  "Ukraine":      { flag: "🇺🇦", conf: "UEFA" },
  "Romania":      { flag: "🇷🇴", conf: "UEFA" },
  "Scotland":     { flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", conf: "UEFA" },
  "Hungary":      { flag: "🇭🇺", conf: "UEFA" },
  "Slovakia":     { flag: "🇸🇰", conf: "UEFA" },
  "USA":          { flag: "🇺🇸", conf: "CONCACAF" },
  "Canada":       { flag: "🇨🇦", conf: "CONCACAF" },
  "Mexico":       { flag: "🇲🇽", conf: "CONCACAF" },
  "Panama":       { flag: "🇵🇦", conf: "CONCACAF" },
  "Costa Rica":   { flag: "🇨🇷", conf: "CONCACAF" },
  "Honduras":     { flag: "🇭🇳", conf: "CONCACAF" },
  "Japan":        { flag: "🇯🇵", conf: "AFC" },
  "South Korea":  { flag: "🇰🇷", conf: "AFC" },
  "Australia":    { flag: "🇦🇺", conf: "AFC" },
  "Iran":         { flag: "🇮🇷", conf: "AFC" },
  "Saudi Arabia": { flag: "🇸🇦", conf: "AFC" },
  "Qatar":        { flag: "🇶🇦", conf: "AFC" },
  "Jordan":       { flag: "🇯🇴", conf: "AFC" },
  "Uzbekistan":   { flag: "🇺🇿", conf: "AFC" },
  "Iraq":         { flag: "🇮🇶", conf: "AFC" },
  "Morocco":      { flag: "🇲🇦", conf: "CAF" },
  "Senegal":      { flag: "🇸🇳", conf: "CAF" },
  "Egypt":        { flag: "🇪🇬", conf: "CAF" },
  "Nigeria":      { flag: "🇳🇬", conf: "CAF" },
  "Ivory Coast":  { flag: "🇨🇮", conf: "CAF" },
  "Cameroon":     { flag: "🇨🇲", conf: "CAF" },
  "Ghana":        { flag: "🇬🇭", conf: "CAF" },
  "DR Congo":     { flag: "🇨🇩", conf: "CAF" },
  "Tunisia":      { flag: "🇹🇳", conf: "CAF" },
  "Algeria":      { flag: "🇩🇿", conf: "CAF" },
  "South Africa": { flag: "🇿🇦", conf: "CAF" },
  "New Zealand":  { flag: "🇳🇿", conf: "OFC" },
};

// ─── Bracket tree (child → parent mapping) ────────────────────────────────────
const BRACKET_TREE = {
  r32_1:  { parent: "r16_1", slot: "home" },
  r32_2:  { parent: "r16_1", slot: "away" },
  r32_3:  { parent: "r16_2", slot: "home" },
  r32_4:  { parent: "r16_2", slot: "away" },
  r32_5:  { parent: "r16_3", slot: "home" },
  r32_6:  { parent: "r16_3", slot: "away" },
  r32_7:  { parent: "r16_4", slot: "home" },
  r32_8:  { parent: "r16_4", slot: "away" },
  r32_9:  { parent: "r16_5", slot: "home" },
  r32_10: { parent: "r16_5", slot: "away" },
  r32_11: { parent: "r16_6", slot: "home" },
  r32_12: { parent: "r16_6", slot: "away" },
  r32_13: { parent: "r16_7", slot: "home" },
  r32_14: { parent: "r16_7", slot: "away" },
  r32_15: { parent: "r16_8", slot: "home" },
  r32_16: { parent: "r16_8", slot: "away" },
  r16_1:  { parent: "qf_1",  slot: "home" },
  r16_2:  { parent: "qf_1",  slot: "away" },
  r16_3:  { parent: "qf_2",  slot: "home" },
  r16_4:  { parent: "qf_2",  slot: "away" },
  r16_5:  { parent: "qf_3",  slot: "home" },
  r16_6:  { parent: "qf_3",  slot: "away" },
  r16_7:  { parent: "qf_4",  slot: "home" },
  r16_8:  { parent: "qf_4",  slot: "away" },
  qf_1:   { parent: "sf_1",  slot: "home" },
  qf_2:   { parent: "sf_1",  slot: "away" },
  qf_3:   { parent: "sf_2",  slot: "home" },
  qf_4:   { parent: "sf_2",  slot: "away" },
  sf_1:   { parent: "final", slot: "home" },
  sf_2:   { parent: "final", slot: "away" },
};

const ROUNDS = [
  { id: 'r32',   label: 'Turno dei 32', matchIds: Array.from({length:16}, (_,i)=>`r32_${i+1}`) },
  { id: 'r16',   label: 'Ottavi',       matchIds: Array.from({length:8},  (_,i)=>`r16_${i+1}`) },
  { id: 'qf',    label: 'Quarti',       matchIds: ['qf_1','qf_2','qf_3','qf_4'] },
  { id: 'sf',    label: 'Semifinali',   matchIds: ['sf_1','sf_2'] },
  { id: 'final', label: 'Finale',       matchIds: ['final'] },
];

const ALL_MATCH_IDS = [
  ...Array.from({length:16}, (_,i) => `r32_${i+1}`),
  ...Array.from({length:8},  (_,i) => `r16_${i+1}`),
  'qf_1','qf_2','qf_3','qf_4',
  'sf_1','sf_2','third','final',
];

const ROUND_POINTS = { r32: 1, r16: 2, qf: 4, sf: 8, third: 8, finalist: 16, champion: 32, bonus: 5 };

const ROUND_LABELS = {
  r32: 'Turno dei 32', r16: 'Ottavi', qf: 'Quarti', sf: 'Semifinali',
  third: '3° Posto', final: 'Finale',
};

function getRoundId(matchId) {
  if (matchId.startsWith('r32')) return 'r32';
  if (matchId.startsWith('r16')) return 'r16';
  if (matchId.startsWith('qf'))  return 'qf';
  if (matchId.startsWith('sf'))  return 'sf';
  return matchId; // 'third' or 'final'
}

function teamFlag(teamName) {
  return (TEAMS[teamName] && TEAMS[teamName].flag) || '🏳️';
}

// ─── Match team resolution ────────────────────────────────────────────────────

function getMatchTeams(matchId, config, bracketState) {
  if (matchId === 'third') {
    const sf1 = getMatchTeams('sf_1', config, bracketState);
    const sf2 = getMatchTeams('sf_2', config, bracketState);
    const w1  = bracketState && bracketState['sf_1'] && bracketState['sf_1'].winner;
    const w2  = bracketState && bracketState['sf_2'] && bracketState['sf_2'].winner;
    const home = w1 ? (w1 === sf1.home ? sf1.away : sf1.home) : null;
    const away = w2 ? (w2 === sf2.home ? sf2.away : sf2.home) : null;
    return { home, away };
  }

  if (matchId.startsWith('r32_')) {
    const mu = (config && config.tournament && config.tournament.round32Matchups || [])
                 .find(m => m.matchId === matchId);
    return mu ? { home: mu.home, away: mu.away } : { home: null, away: null };
  }

  // Higher rounds: pull winners of child matches
  let home = null, away = null;
  Object.entries(BRACKET_TREE).forEach(([childId, info]) => {
    if (info.parent === matchId) {
      const w = bracketState && bracketState[childId] && bracketState[childId].winner;
      if (info.slot === 'home') home = w || null;
      else away = w || null;
    }
  });
  return { home, away };
}

// ─── Bracket mutation ─────────────────────────────────────────────────────────

function clearDownstream(team, fromMatchId, state) {
  const node = BRACKET_TREE[fromMatchId];
  if (!node) return;
  const parentId = node.parent;
  if (parentId && state[parentId] && state[parentId].winner === team) {
    state[parentId].winner = null;
    clearDownstream(team, parentId, state);
  }
}

function pickWinner(matchId, team, config, bracketState) {
  const state = JSON.parse(JSON.stringify(bracketState || {}));
  const prev = state[matchId] && state[matchId].winner;

  if (prev === team) {
    // Toggle off — deselect
    state[matchId] = { winner: null };
    clearDownstream(team, matchId, state);
    return state;
  }

  if (prev) clearDownstream(prev, matchId, state);

  if (!state[matchId]) state[matchId] = {};
  state[matchId].winner = team;

  // Refresh 3rd-place winner validity (invalidate if no longer a SF loser)
  const { home: t3h, away: t3a } = getMatchTeams('third', config, state);
  const thirdW = state['third'] && state['third'].winner;
  if (thirdW && thirdW !== t3h && thirdW !== t3a) {
    if (!state['third']) state['third'] = {};
    state['third'].winner = null;
  }

  return state;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeScore(prediction, results) {
  if (!results || !prediction || !prediction.bracket) return { total: 0, rounds: {} };

  const rounds = { r32: 0, r16: 0, qf: 0, sf: 0, third: 0, finalist: 0, champion: 0, bonus: 0 };

  ALL_MATCH_IDS.forEach(matchId => {
    if (matchId === 'final') return;
    const off  = results[matchId]  && results[matchId].winner;
    const pred = prediction.bracket[matchId] && prediction.bracket[matchId].winner;
    if (!off || !pred) return;
    if (off === pred) {
      const rid = getRoundId(matchId);
      rounds[rid] = (rounds[rid] || 0) + ROUND_POINTS[rid];
    }
  });

  // Final: champion vs finalist
  const fOff  = results['final']  && results['final'].winner;
  const fPred = prediction.bracket['final'] && prediction.bracket['final'].winner;
  if (fOff && fPred) {
    if (fOff === fPred) {
      rounds.champion += ROUND_POINTS.champion;
    } else {
      const ruOff = results['final'] && results['final'].runnerUp;
      if (ruOff && fPred === ruOff) rounds.finalist += ROUND_POINTS.finalist;
    }
  }

  // Bonus
  ['mvp', 'bestYoung', 'bestKeeper'].forEach(award => {
    const off  = ((results.awards && results.awards[award]) || '').trim().toLowerCase();
    const pred = ((prediction.bonuses && prediction.bonuses[award]) || '').trim().toLowerCase();
    if (off && pred && off === pred) rounds.bonus += ROUND_POINTS.bonus;
  });

  const total = Object.values(rounds).reduce((a, b) => a + b, 0);
  return { total, rounds };
}

function computeAllScores(predictions, results) {
  if (!predictions) return [];
  return Object.entries(predictions)
    .map(([uid, pred]) => {
      const { total, rounds } = computeScore(pred, results || {});
      return { uid, name: pred.meta && pred.meta.name || 'Senza nome', total, rounds };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Bracket layout geometry ──────────────────────────────────────────────────
// Each R32 match slot = SLOT_H px tall. Higher rounds are centered between children.

const SLOT_H = 80; // px

function matchYCenter(matchId) {
  if (matchId.startsWith('r32_')) {
    const i = parseInt(matchId.split('_')[1]) - 1;
    return i * SLOT_H + SLOT_H / 2;
  }
  if (matchId === 'third') return -1; // rendered separately

  const children = Object.entries(BRACKET_TREE)
    .filter(([, info]) => info.parent === matchId)
    .map(([id]) => id);

  if (!children.length) return SLOT_H / 2;
  const sum = children.reduce((acc, c) => acc + matchYCenter(c), 0);
  return sum / children.length;
}

function matchYTop(matchId) {
  return matchYCenter(matchId) - SLOT_H / 2;
}

const BRACKET_TOTAL_H = 16 * SLOT_H; // 1280px — height of the R32 column
