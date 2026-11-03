import {awardReview, rewardStats} from './rewards.js';
import {celebrate, clearEffects, playTone} from './effects.js';
import {moveToPile, updateSetDetails, groupSets} from './organize.js';
import {parseCSV, columnsFor, prepareSession, gradeCard} from './core.js';
const $ = id => document.getElementById(id);
const STORAGE = 'signal-flashcards-v1';
const labels = {red: ['Learning', ''], amber: ['Getting there', ''], green: ['Got it', '']};
let state = {sets: [], selected: null}, pending = null, undo = null, draggedCard = null, editingSet = null, feedback = '', feedbackTone = '';
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && Array.isArray(saved.sets)) state = saved;
  state.sets.forEach(prepareSession);
} catch { $('save-state').textContent = 'Storage unavailable'; }
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current = () => state.sets.find(s => s.id === state.selected);
function save() {
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); $('save-state').textContent = 'Saved on this browser'; $('saved-badge').textContent = '✓ Saved'; }
  catch { $('save-state').textContent = 'Could not save progress'; $('saved-badge').textContent = '⚠ Not saved'; toast('Browser storage is unavailable or full. Keep this tab open to keep studying.'); }
}
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2400); }
function render() {
  const set = current();
  renderArcade(set);
  $('set-count').textContent = state.sets.length;
  $('library').innerHTML = groupSets(state.sets).map(group => `<section class="library-group"><h3>${esc(group.name || 'Ungrouped')}<span>${group.sets.length}</span></h3>${group.sets.map(s => `<button class="set-item ${s.id === state.selected ? 'active' : ''}" data-set="${esc(s.id)}" ${s.id === state.selected ? 'aria-current="true"' : ''}><span class="set-icon">▤</span><span><strong>${esc(s.name)}</strong><small>${s.cards.length} cards · ${Math.round(s.cards.filter(c => c.pile === 'green').length / s.cards.length * 100)}% green</small></span></button>`).join('')}</section>`).join('');
  const boardVisible = !!set && state.view === 'board';
  document.body.classList.toggle('board-view', boardVisible);
  $('board').hidden = !boardVisible;
  $('study').hidden = boardVisible;
  $('study-footer').hidden = boardVisible;
  $('action-feedback').hidden = !feedback || !set;
  $('action-feedback').textContent = feedback;
  $('action-feedback').dataset.tone = feedbackTone;
  $('set-progress').hidden = !set;
  if (set) {
    const mastered = set.cards.filter(card => card.pile === 'green').length;
    $('mastery-progress').max = set.cards.length || 1;
    $('mastery-progress').value = mastered;
    $('mastery-count').textContent = `${mastered} / ${set.cards.length} in Got it`;
  }
  $('edit-set').hidden = !set;
  $('view-toolbar').hidden = !set;
  $('study-view').setAttribute('aria-pressed', String(!boardVisible));
  $('board-view').setAttribute('aria-pressed', String(boardVisible));
  $('set-title').textContent = set?.name || 'Flashcards';
  $('set-subtitle').textContent = set ? `${set.cards.length} cards${set.group ? ' · ' + set.group : ''}` : 'Import a CSV to start.';
  $('piles').innerHTML = Object.entries(labels).map(([key, [title, hint]]) => `<button class="pile ${key}" data-open-pile="${key}" ${set ? '' : 'disabled'} aria-label="Open ${title} list, ${set?.cards.filter(c => c.pile === key).length || 0} cards"><span class="light"></span><span><strong>${title}</strong></span><span class="count">${set?.cards.filter(c => c.pile === key).length || 0}</span></button>`).join('');
  if (!set) {
    $('study').innerHTML = `<div class="card-content empty"><div class="empty-icon">▤</div><h3>Import flashcards</h3><p>Choose a NotebookLM CSV with questions and answers.</p><button class="button dark" data-action="import">Import CSV</button><br><button class="text-button" data-action="demo">Try a sample set</button></div>`;
    $('session-note').textContent = ''; return;
  }
  if (boardVisible) { renderBoard(set); return; }
  const session = set.session;
  const card = set.cards.find(c => c.id === session.current);
  if (!card) {
    $('study').innerHTML = '<div class="card-content empty"><h3>No cards in this set.</h3><button class="button dark" data-action="import">Import flashcards</button></div>';
    return;
  }
  const nextPile = {red: 'Getting there', amber: 'Got it', green: 'Got it'}[card.pile];
  $('study').innerHTML = `<div class="study-top"><span> ${labels[card.pile][0]}</span><button data-action="undo" ${undo ? '' : 'disabled'}>↶ Undo last</button></div><div class="card-content"><div class="card-label">${session.revealed ? 'QUESTION & ANSWER' : 'QUESTION'}</div><div class="question">${esc(card.front)}</div>${session.revealed ? `<div class="answer">${esc(card.back)}</div>` : ''}</div>${session.revealed ? `<div class="ratings"><button class="rate red" data-rate="wrong">I got it wrong<small>Back to Learning</small><kbd>1</kbd></button><button class="rate green" data-rate="right">I got it right<small>${card.pile === 'green' ? 'Stays in Got it' : 'Moves to ' + nextPile}</small><kbd>2</kbd></button></div>` : '<button class="button dark reveal" data-action="reveal">Reveal answer <span>↵</span></button>'}`;
  $('session-note').textContent = `${set.reviewed || 0} ${(set.reviewed || 0) === 1 ? 'card' : 'cards'} reviewed`;
}
function reveal() {
  const set = current(); if (!set?.session?.current) return;
  if (set.session.revealed) return;
  set.session.revealed = true; save(); render(); animateStudy('answer-reveal'); $('study').focus({preventScroll:true});
}
function rate(result) {
  const set = current(); if (!set?.session?.revealed || !set.session.current) return;
  const card = set.cards.find(card => card.id === set.session.current);
  const previous = labels[card.pile][0];
  undo = JSON.stringify(set); gradeCard(set, result === 'right');
  const reward = state.adhdMode ? awardReview(set, result === 'right') : null;
  feedbackTone = result === 'right' ? 'green' : 'red';
  feedback = `${result === 'right' ? '✓ Right' : '↩ Wrong'} · ${previous === labels[card.pile][0] ? 'Stays in ' + previous : previous + ' → ' + labels[card.pile][0]}`;
  if (reward) feedback += ` · +${reward.points} XP${reward.streak > 1 ? ' · ' + reward.streak + ' in a row' : ''}`;
  save(); render(); animateStudy('next-card');
  if (reward) { celebrate(reward); if (state.arcadeSound) playTone(reward.levelUp || reward.milestone ? 'big' : result); }
  document.querySelector(`[data-open-pile="${card.pile}"]`)?.classList.add('pile-updated');
  $('study').focus({preventScroll:true});
}
function restore() {
  if (!undo) return;
  state.sets[state.sets.findIndex(s => s.id === state.selected)] = JSON.parse(undo);
  clearEffects();
  undo = null; feedback = 'Last answer undone.'; feedbackTone = ''; save(); render(); $('study').focus({preventScroll:true});
}
function openImport() { $('import-dialog').showModal(); }
$('import').onclick = openImport; $('new-set').onclick = openImport;
$('library').onclick = e => { const item = e.target.closest('[data-set]'); if (item) { state.selected = item.dataset.set; clearEffects(); undo = null; feedback = ''; save(); render(); } };
$('study').onclick = e => {
  const rating = e.target.closest('[data-rate]'); if (rating) { rate(rating.dataset.rate); return; }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'import') openImport();
  if (action === 'demo') addSet('The science of learning', [ ['What is active recall?', 'Retrieving information from memory without looking at the answer. Testing yourself with flashcards is one way to practise it.'], ['What is spaced repetition?', 'Reviewing information at intervals over time, instead of doing all your practice in a single session.'], ['Why does sleep help learning?', 'Sleep supports memory consolidation: the process of strengthening and organising newly learned information.'], ['What is interleaving?', 'Mixing related topics or problem types during practice, so you learn to recognise when to use different approaches.'], ['What is the Feynman technique?', 'Explaining an idea in simple language, spotting gaps in your understanding, and revisiting those gaps.'] ]);
  if (action === 'reveal') reveal(); if (action === 'undo') restore();
};
function addSet(name, pairs) {
  const set = {id: crypto.randomUUID(), name, reviewed: 0, cards: pairs.map(([front,back]) => ({id: crypto.randomUUID(), front, back, pile: 'red'}))};
  prepareSession(set); state.sets.push(set); state.selected = set.id; undo = null; feedback = ''; save(); render(); $('import-dialog').close(); pending = null; $('mapping').hidden = true; toast(`${set.cards.length} cards imported.`);
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
  if (e.repeat || state.view === 'board' || $('edit-dialog').open || $('import-dialog').open || ['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); reveal(); }
  if (['1','2'].includes(e.key)) rate(e.key === '1' ? 'wrong' : 'right');
});
window.addEventListener('storage', e => { if (e.key === STORAGE && e.newValue) { try { const next = JSON.parse(e.newValue); if (Array.isArray(next.sets)) { state = next; state.sets.forEach(prepareSession); undo = null; render(); } } catch {} } });
render();

function renderBoard(set) {
  $('board').innerHTML = `<p class="board-help">Drag to move · or use Move to</p><div class="board-columns">${Object.entries(labels).map(([pile, [title]]) => {
    const cards = set.cards.filter(card => card.pile === pile);
    return `<section class="board-column ${pile}" data-drop-pile="${pile}" aria-labelledby="column-${pile}"><h3 id="column-${pile}" tabindex="-1"><span class="light"></span>${title}<span>${cards.length}</span></h3><div class="board-list">${cards.map(card => `<article class="board-card" id="board-card-${esc(card.id)}" data-card="${esc(card.id)}" draggable="true"><div class="board-card-top"><span>QUESTION</span><span aria-hidden="true">⠿</span></div><p>${esc(card.front)}</p><details><summary>Show answer</summary><div class="board-answer">${esc(card.back)}</div></details><label>Move to<select data-move-card="${esc(card.id)}" aria-label="Move card: ${esc(card.front.slice(0,80))}">${Object.entries(labels).map(([key,[name]]) => `<option value="${key}" ${pile === key ? 'selected' : ''}>${name}</option>`).join('')}</select></label></article>`).join('')}${cards.length ? '' : '<p class="empty-pile">Drop cards here</p>'}</div></section>`;
  }).join('')}</div>`;
}
function changeView(view, pile = null) {
  clearEffects();
  state.view = view; feedback = ''; save(); render();
  if (view === 'board') $('column-' + (pile || 'red')).focus();
  else $('study').focus({preventScroll:true});
}
$('study-view').onclick = () => changeView('study');
$('board-view').onclick = () => changeView('board');
$('piles').onclick = e => {
  const button = e.target.closest('[data-open-pile]');
  if (button && current()) changeView('board', button.dataset.openPile);
};
function moveBoardCard(id, pile, focusMenu = false) {
  const set = current();
  if (!set || !set.cards.some(card => card.id === id)) return;
  moveToPile(set, id, pile); undo = null; save(); render();
  const article = document.getElementById('board-card-' + id);
  article?.classList.add('card-moved');
  article?.scrollIntoView({block:'nearest',inline:'nearest'});
  if (focusMenu) article?.querySelector('select').focus();
  toast(`Card moved to ${labels[pile][0]}.`);
}
$('board').addEventListener('change', e => {
  if (e.target.matches('[data-move-card]')) moveBoardCard(e.target.dataset.moveCard, e.target.value, true);
});
$('board').addEventListener('dragstart', e => {
  if (e.target.closest('select, summary, details')) { e.preventDefault(); return; }
  const card = e.target.closest('[data-card]');
  if (!card) return;
  draggedCard = {id: card.dataset.card, set: state.selected};
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.card);
  card.classList.add('dragging');
});
$('board').addEventListener('dragover', e => {
  const column = e.target.closest('[data-drop-pile]');
  if (!column || !draggedCard || draggedCard.set !== state.selected) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  $('board').querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  column.classList.add('drop-target');
});
$('board').addEventListener('dragleave', e => {
  const column = e.target.closest('[data-drop-pile]');
  if (column && !column.contains(e.relatedTarget)) column.classList.remove('drop-target');
});
$('board').addEventListener('drop', e => {
  const column = e.target.closest('[data-drop-pile]');
  if (!column || !draggedCard || draggedCard.set !== state.selected) return;
  e.preventDefault();
  const id = draggedCard.id; draggedCard = null;
  moveBoardCard(id, column.dataset.dropPile);
});
$('board').addEventListener('dragend', () => {
  draggedCard = null;
  $('board').querySelectorAll('.dragging, .drop-target').forEach(el => el.classList.remove('dragging','drop-target'));
});
$('edit-set').onclick = () => {
  const set = current(); if (!set) return;
  editingSet = set.id;
  $('edit-name').value = set.name; $('edit-group').value = set.group || '';
  $('edit-error').textContent = '';
  $('group-options').innerHTML = [...new Set(state.sets.map(set => set.group).filter(Boolean))].map(name => `<option value="${esc(name)}"></option>`).join('');
  $('edit-dialog').showModal(); $('edit-name').focus();
};
$('close-edit').onclick = () => $('edit-dialog').close();
$('edit-form').onsubmit = e => {
  e.preventDefault();
  if (!state.sets.some(set => set.id === editingSet)) { $('edit-error').textContent = 'This set is no longer available.'; return; }
  try {
    updateSetDetails(state, editingSet, $('edit-name').value, $('edit-group').value);
    undo = null; feedback = ''; save(); render(); $('edit-dialog').close(); toast('Set details saved.');
  } catch (err) { $('edit-error').textContent = err.message; }
};

function animateStudy(name) {
  const study = $('study');
  study.classList.remove('answer-reveal', 'next-card');
  void study.offsetWidth;
  study.classList.add(name);
}

function renderArcade(set) {
  const enabled = !!state.adhdMode;
  document.body.classList.toggle('adhd-mode', enabled);
  $('adhd-toggle').checked = enabled;
  $('arcade-hud').hidden = !enabled || !set;
  if (!enabled) { clearEffects(); return; }
  const stats = rewardStats(set);
  $('arcade-level').textContent = stats.level;
  $('arcade-xp').textContent = `${stats.xp} XP`;
  $('arcade-next').textContent = `${100 - stats.progress} to level ${stats.level + 1}`;
  $('arcade-progress').value = stats.progress;
  $('arcade-streak').textContent = stats.streak;
  const completed = stats.answered % 5;
  $('arcade-mission').textContent = `${completed} / 5 reviews → +50 XP`;
  $('mission-dots').innerHTML = Array.from({length:5},(_,i)=>`<i class="${i < completed ? 'complete' : ''}"></i>`).join('');
  $('arcade-sound').textContent = state.arcadeSound ? '♫ Sound on' : '♪ Sound off';
  $('arcade-sound').setAttribute('aria-pressed', String(!!state.arcadeSound));
}
$('adhd-toggle').onchange = e => {
  state.adhdMode = e.target.checked; clearEffects(); feedback = ''; save(); render();
};
$('arcade-sound').onclick = () => {
  state.arcadeSound = !state.arcadeSound; save(); renderArcade(current());
  if (state.arcadeSound) playTone('right');
};
