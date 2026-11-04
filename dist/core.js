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
export function startPass(set) {
  const queue = set.cards.map(card => card.id);
  set.session = {mode: 'queue', queue, current: queue[0] || null, total: queue.length, answered: 0, revealed: false};
}
export function prepareSession(set) {
  if (set.session?.mode === 'queue') return;
  const previous = set.session;
  const ids = set.cards.map(card => card.id);
  let queue;
  if (Array.isArray(previous?.queue)) {
    const valid = new Set(ids);
    queue = [...new Set(previous.queue)].filter(id => valid.has(id));
  } else {
    queue = ids.includes(previous?.current) ? [previous.current, ...ids.filter(id => id !== previous.current)] : ids;
  }
  set.session = {mode: 'queue', queue, current: queue[0] || null, total: queue.length, answered: 0, revealed: !!previous?.revealed && queue.length > 0};
}
export function shuffleQueue(set, random = Math.random) {
  const session = set.session;
  if (session.queue.length < 2) return;
  for (let i = session.queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [session.queue[i], session.queue[j]] = [session.queue[j], session.queue[i]];
  }
  session.current = session.queue[0];
  session.revealed = false;
}
export function gradeCard(set, correct) {
  const card = set.cards.find(card => card.id === set.session.current);
  if (!card) return;
  card.pile = correct ? {red: 'amber', amber: 'green', green: 'green'}[card.pile] : 'red';
  set.session.queue.shift();
  set.session.current = set.session.queue[0] || null;
  set.session.revealed = false;
  set.session.answered += 1;
  set.reviewed = (set.reviewed || 0) + 1;
}
