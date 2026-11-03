import {parseCSV, columnsFor, prepareSession, gradeCard} from './core.js';
const $ = id => document.getElementById(id);
const STORAGE = 'signal-flashcards-v1';
const labels = {red: ['Learning', 'Give these a little more time'], amber: ['Getting there', 'A little practice goes a long way'], green: ['Got it', 'Keep your knowledge fresh']};
let state = {sets: [], selected: null}, pending = null, undo = null;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && Array.isArray(saved.sets)) state = saved;
  state.sets.forEach(prepareSession);
} catch { $('save-state').textContent = 'Storage unavailable'; }
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current = () => state.sets.find(s => s.id === state.selected);
function save() {
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); $('save-state').textContent = 'Saved on this browser'; $('saved-badge').textContent = '↳ Auto-saved'; }
  catch { $('save-state').textContent = 'Could not save progress'; $('saved-badge').textContent = '⚠ Not saved'; toast('Browser storage is unavailable or full. Keep this tab open to keep studying.'); }
}
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500); }
function render() {
  const set = current();
  $('set-count').textContent = state.sets.length;
  $('library').innerHTML = state.sets.map(s => `<button class="set-item ${s.id === state.selected ? 'active' : ''}" data-set="${esc(s.id)}" ${s.id === state.selected ? 'aria-current="true"' : ''}><span class="set-icon">▤</span><span><strong>${esc(s.name)}</strong><small>${s.cards.length} cards · ${Math.round(s.cards.filter(c => c.pile === 'green').length / s.cards.length * 100)}% green</small></span></button>`).join('');
  $('set-label').textContent = set ? 'YOUR STUDY SPACE' : 'LET’S GET STARTED';
  $('set-title').textContent = set?.name || 'A fresh start.';
  $('set-subtitle').textContent = set ? `${set.cards.length} cards · Right moves you up. Wrong returns to Learning.` : 'Bring your NotebookLM flashcards along.';
  $('piles').innerHTML = Object.entries(labels).map(([key, [title, hint]]) => `<div class="pile ${key}" aria-label="${title}, ${set?.cards.filter(c => c.pile === key).length || 0} cards"><span class="light"></span><span><strong>${title}</strong><small>${hint}</small></span><span class="count">${set?.cards.filter(c => c.pile === key).length || 0}</span></div>`).join('');
  if (!set) {
    $('study').innerHTML = `<div class="card-content empty"><div class="empty-icon">▤</div><h3>Your next lightbulb moment starts here.</h3><p>Import your NotebookLM CSV and turn what you’ve learned into what you remember.</p><button class="button dark" data-action="import">Import your first set ↗</button><br><button class="text-button" data-action="demo">Take a look with a sample set</button></div>`;
    $('session-note').textContent = 'Small steps add up.'; return;
  }
  const session = set.session;
  const card = set.cards.find(c => c.id === session.current);
  if (!card) {
    $('study').innerHTML = '<div class="card-content empty"><h3>No cards in this set.</h3><button class="button dark" data-action="import">Import flashcards</button></div>';
    return;
  }
  const nextPile = {red: 'Getting there', amber: 'Got it', green: 'Got it'}[card.pile];
  $('study').innerHTML = `<div class="study-top"><span>Weighted shuffle &nbsp; / &nbsp; ${labels[card.pile][0]}</span><button data-action="undo" ${undo ? '' : 'disabled'}>↶ Undo last</button></div><div class="card-content"><div class="card-label">${session.revealed ? 'HOW DID YOU DO?' : 'THINK IT THROUGH'}</div><div class="question">${esc(card.front)}</div>${session.revealed ? `<div class="answer">${esc(card.back)}</div>` : ''}</div>${session.revealed ? `<div class="ratings"><button class="rate red" data-rate="wrong">I got it wrong<small>Back to Learning</small><kbd>1</kbd></button><button class="rate green" data-rate="right">I got it right<small>${card.pile === 'green' ? 'Stays in Got it' : 'Moves to ' + nextPile}</small><kbd>2</kbd></button></div>` : '<button class="button dark reveal" data-action="reveal">Reveal answer <span>↵</span></button>'}`;
  $('session-note').textContent = `${set.reviewed || 0} ${(set.reviewed || 0) === 1 ? 'card' : 'cards'} reviewed · Saved as you go`;
  $('shuffle-note').hidden = false;
}
function reveal() {
  const set = current(); if (!set?.session?.current) return;
  set.session.revealed = true; save(); render(); $('study').focus({preventScroll:true});
}
function rate(result) {
  const set = current(); if (!set?.session?.revealed || !set.session.current) return;
  undo = JSON.stringify(set); gradeCard(set, result === 'right'); save(); render(); $('study').focus({preventScroll:true});
}
function restore() {
  if (!undo) return;
  state.sets[state.sets.findIndex(s => s.id === state.selected)] = JSON.parse(undo);
  undo = null; save(); render(); $('study').focus({preventScroll:true}); toast('Last card restored.');
}
function openImport() { $('import-dialog').showModal(); }
$('import').onclick = openImport; $('new-set').onclick = openImport;
$('library').onclick = e => { const item = e.target.closest('[data-set]'); if (item) { state.selected = item.dataset.set; undo = null; save(); render(); } };
$('study').onclick = e => {
  const rating = e.target.closest('[data-rate]'); if (rating) { rate(rating.dataset.rate); return; }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'import') openImport();
  if (action === 'demo') addSet('The science of learning', [ ['What is active recall?', 'Retrieving information from memory without looking at the answer. Testing yourself with flashcards is one way to practise it.'], ['What is spaced repetition?', 'Reviewing information at intervals over time, instead of doing all your practice in a single session.'], ['Why does sleep help learning?', 'Sleep supports memory consolidation: the process of strengthening and organising newly learned information.'], ['What is interleaving?', 'Mixing related topics or problem types during practice, so you learn to recognise when to use different approaches.'], ['What is the Feynman technique?', 'Explaining an idea in simple language, spotting gaps in your understanding, and revisiting those gaps.'] ]);
  if (action === 'reveal') reveal(); if (action === 'undo') restore();
};
function addSet(name, pairs) {
  const set = {id: crypto.randomUUID(), name, reviewed: 0, cards: pairs.map(([front,back]) => ({id: crypto.randomUUID(), front, back, pile: 'red'}))};
  prepareSession(set); state.sets.push(set); state.selected = set.id; undo = null; save(); render(); $('import-dialog').close(); pending = null; $('mapping').hidden = true; toast(`${set.cards.length} cards ready. Let’s start learning.`);
}
$('dropzone').onclick = () => $('file').click();
$('file').onchange = async e => { if (e.target.files[0]) await readFile(e.target.files[0]); e.target.value = ''; };
for (const name of ['dragenter','dragover']) $('dropzone').addEventListener(name, e => { e.preventDefault(); $('dropzone').classList.add('drag'); });
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('drag'));
$('dropzone').addEventListener('drop', e => { e.preventDefault(); $('dropzone').classList.remove('drag'); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
async function readFile(file) {
  $('import-error').textContent = ''; $('mapping').hidden = true; pending = null;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Please choose a CSV smaller than 5 MB.');
    if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Please choose a .csv file.');
    const rows = parseCSV(await file.text());
    if (!rows.length || rows.reduce((max, row) => Math.max(max, row.length), 0) < 2) throw new Error('We need at least two columns: a question and an answer.');
    pending = rows; const detected = columnsFor(rows);
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
    for (const id of ['front-col','back-col']) $(id).innerHTML = Array.from({length: width}, (_, i) => `<option value="${i}">Column ${i + 1} · ${esc((rows[0][i] || 'Untitled').slice(0,45))}</option>`).join('');
    $('front-col').value = detected.front; $('back-col').value = detected.back; $('has-header').checked = detected.header;
    $('set-name').value = file.name.replace(/\.csv$/i,'').replace(/[_-]/g,' '); $('mapping').hidden = false; updatePreview();
  } catch (err) { $('import-error').textContent = err.message; }
}
function selectedPairs() { return pending.slice($('has-header').checked ? 1 : 0).map(r => [r[+$('front-col').value] || '', r[+$('back-col').value] || '']); }
function updatePreview() {
  if (!pending) return;
  const pairs = selectedPairs(); const valid = pairs.filter(([a,b]) => a && b).length;
  $('preview-text').textContent = `${valid} cards ready${pairs.length - valid ? ` · ${pairs.length - valid} incomplete rows will be skipped` : ''}. All new cards start in Learning.`;
}
for (const id of ['front-col','back-col','has-header']) $(id).onchange = updatePreview;
$('confirm-import').onclick = () => {
  if (!pending) return;
  if ($('front-col').value === $('back-col').value) { $('import-error').textContent = 'Choose different columns for the question and answer.'; return; }
  const pairs = selectedPairs().filter(([a,b]) => a && b);
  if (!pairs.length) { $('import-error').textContent = 'No complete cards found. Check the columns and header setting.'; return; }
  addSet($('set-name').value.trim() || 'Untitled set', pairs);
};
document.addEventListener('keydown', e => {
  if ($('import-dialog').open || ['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); reveal(); }
  if (['1','2'].includes(e.key)) rate(e.key === '1' ? 'wrong' : 'right');
});
window.addEventListener('storage', e => { if (e.key === STORAGE && e.newValue) { try { const next = JSON.parse(e.newValue); if (Array.isArray(next.sets)) { state = next; state.sets.forEach(prepareSession); undo = null; render(); } } catch {} } });
render();
