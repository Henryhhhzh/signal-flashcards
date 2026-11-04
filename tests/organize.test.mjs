import test from 'node:test';
import assert from 'node:assert/strict';
import {moveToPile, updateSetDetails, groupSets} from '../dist/organize.js';
const makeState = () => ({sets:[{id:'s',name:'Biology',cards:[{id:'a',pile:'red',front:'Question',back:'Answer'}],reviewed:5,session:{mode:'queue',queue:['a'],current:'a',total:1,revealed:true,answered:0}}],selected:'s'});
test('manual moves preserve the study position, content and review counts', () => {
  const state=makeState(), set=state.sets[0], session=structuredClone(set.session);
  for(const pile of ['green','amber','red']) { moveToPile(set,'a',pile); assert.equal(set.cards[0].pile,pile); }
  assert.deepEqual(set.session,session);assert.equal(set.reviewed,5);assert.equal(set.cards[0].back,'Answer');
  assert.throws(()=>moveToPile(set,'a','purple'));
});
test('rename and grouping persist without changing flashcards or session', () => {
  const state=makeState(), before=structuredClone(state.sets[0]);
  updateSetDetails(state,'s','  Cell biology  ','  Science  ');
  const restored=JSON.parse(JSON.stringify(state));
  assert.equal(restored.sets[0].name,'Cell biology');assert.equal(restored.sets[0].group,'Science');
  assert.deepEqual(restored.sets[0].cards,before.cards);assert.deepEqual(restored.sets[0].session,before.session);
  updateSetDetails(state,'s','Biology','');assert.equal(state.sets[0].group,'');
  assert.throws(()=>updateSetDetails(state,'s','   ','Science'));
});
test('library groups old ungrouped sets and reuses an existing group name', () => {
  const state=makeState();state.sets.push({id:'t',name:'Chemistry',group:'Science',cards:[]});
  updateSetDetails(state,'s','Biology','science');assert.equal(state.sets[0].group,'Science');
  assert.deepEqual(groupSets(state.sets).map(g=>[g.name,g.sets.length]),[['Science',2]]);
  state.sets.push({id:'u',name:'Old set',cards:[]});
  assert.deepEqual(groupSets(state.sets).map(g=>[g.name,g.sets.length]),[['',1],['Science',2]]);
});
