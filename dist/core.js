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
export function moveCard(set, id, pile) {
  const card = set.cards.find(c => c.id === id);
  if (!card) return;
  card.pile = pile;
  set.session.queue = set.session.queue.filter(x => x !== id);
  set.session.revealed = false;
  set.reviewed = (set.reviewed || 0) + 1;
}
