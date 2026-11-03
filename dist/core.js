export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field === '') quoted = !quoted;
      else field += c;
    } else if (c === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote. Please check your CSV.');
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function columnsFor(rows) {
  const normalize = s => s.toLowerCase().trim().replace(/[_-]/g, ' ');
  const headers = (rows[0] || []).map(normalize);
  const front = headers.findIndex(x => ['question','front','term','prompt','q'].includes(x));
  const back = headers.findIndex(x => ['answer','back','definition','response','a'].includes(x));
  return {front: front < 0 ? 0 : front, back: back < 0 ? 1 : back, header: front >= 0 && back >= 0};
}
export const pileWeights = {red: 9, amber: 3, green: 1};
export function pickNext(cards, previousId = null, random = Math.random) {
  const piles = Object.entries(pileWeights).map(([pile, weight]) => ({weight, cards: cards.filter(card => card.pile === pile)})).filter(group => group.cards.length);
  if (!piles.length) return null;
  let draw = random() * piles.reduce((sum, group) => sum + group.weight, 0);
  let chosen = piles[piles.length - 1];
  for (const group of piles) {
    draw -= group.weight;
    if (draw < 0) { chosen = group; break; }
  }
  const candidates = chosen.cards.length > 1 ? chosen.cards.filter(card => card.id !== previousId) : chosen.cards;
  return candidates[Math.floor(random() * candidates.length)].id;
}
export function prepareSession(set) {
  if (set.session?.mode === 'weighted') return;
  set.session = {
    mode: 'weighted',
    current: set.session?.queue?.[0] || pickNext(set.cards),
    revealed: set.session?.revealed || false,
    answered: 0
  };
}
export function gradeCard(set, correct, random = Math.random) {
  const card = set.cards.find(c => c.id === set.session.current);
  if (!card) return;
  card.pile = correct ? {red: 'amber', amber: 'green', green: 'green'}[card.pile] : 'red';
  set.session.current = pickNext(set.cards, card.id, random);
  set.session.revealed = false;
  set.session.answered += 1;
  set.reviewed = (set.reviewed || 0) + 1;
}
