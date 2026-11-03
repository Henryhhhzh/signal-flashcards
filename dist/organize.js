export function moveToPile(set, cardId, pile) {
  if (!['red', 'amber', 'green'].includes(pile)) throw new Error('Choose a valid pile.');
  const card = set.cards.find(card => card.id === cardId);
  if (card) card.pile = pile;
}
export function updateSetDetails(state, id, name, group) {
  name = name.trim(); group = group.trim();
  if (!name || name.length > 100) throw new Error('Enter a set name between 1 and 100 characters.');
  if (group.length > 60) throw new Error('Keep the group name under 61 characters.');
  const set = state.sets.find(set => set.id === id);
  if (!set) return;
  const existing = state.sets.find(set => set.group?.toLowerCase() === group.toLowerCase());
  set.name = name;
  set.group = existing?.group || group;
}
export function groupSets(sets) {
  const groups = new Map();
  for (const set of sets) {
    const name = set.group || '';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(set);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([name, sets]) => ({name, sets}));
}
