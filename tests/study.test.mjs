import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeCard, prepareSession, shuffleQueue, startPass} from '../dist/core.js';
const cards = () => ['red','amber','green'].flatMap(pile => [0,1].map(i => ({id:`${pile}${i}`,pile})));
const makeSet = () => {const set={cards:cards(),reviewed:0};prepareSession(set);return set;};
test('a pass follows import order and presents every card exactly once', () => {
  const set=makeSet(), seen=[];
  while(set.session.current){seen.push(set.session.current);gradeCard(set,false);}
  assert.deepEqual(seen,set.cards.map(c=>c.id));assert.equal(new Set(seen).size,seen.length);
  assert.equal(set.session.current,null);assert.deepEqual(set.session.queue,[]);
  assert.equal(set.session.answered,6);assert.equal(set.reviewed,6);
});
test('correct answers advance one pile; wrong answers return to Learning without repeating', () => {
  for(const [pile,correct,expected] of [['red',true,'amber'],['amber',true,'green'],['green',true,'green'],['red',false,'red'],['amber',false,'red'],['green',false,'red']]){
    const set={cards:[{id:'a',pile},{id:'b',pile:'red'}],reviewed:0};prepareSession(set);set.session.revealed=true;
    gradeCard(set,correct);assert.equal(set.cards[0].pile,expected);assert.equal(set.session.current,'b');assert.equal(set.session.revealed,false);
  }
});
test('shuffle changes only unreviewed cards and keeps a unique saved queue', () => {
  const set=makeSet();gradeCard(set,true);set.session.revealed=true;
  const pending=[...set.session.queue], cardsBefore=structuredClone(set.cards);
  shuffleQueue(set,()=>0);
  assert.notDeepEqual(set.session.queue,pending);
  assert.deepEqual([...set.session.queue].sort(),[...pending].sort());
  assert.equal(set.session.current,set.session.queue[0]);assert.equal(set.session.revealed,false);
  assert.equal(set.session.answered,1);assert.deepEqual(set.cards,cardsBefore);
  const restored=JSON.parse(JSON.stringify(set));prepareSession(restored);assert.deepEqual(restored,set);
  const seen=[];while(set.session.current){seen.push(set.session.current);gradeCard(set,true);}
  assert.equal(seen.length,5);assert.equal(new Set(seen).size,5);assert.ok(!seen.includes('red0'));
});
test('migrates weighted sessions without losing current answer, piles, or rewards', () => {
  const set={cards:cards(),reviewed:8,rewards:{xp:50},session:{mode:'weighted',current:'amber1',revealed:true,answered:8}};
  const before=structuredClone(set.cards);prepareSession(set);
  assert.equal(set.session.current,'amber1');assert.equal(set.session.revealed,true);
  assert.equal(set.session.queue.length,6);assert.equal(new Set(set.session.queue).size,6);
  assert.deepEqual(set.cards,before);assert.equal(set.rewards.xp,50);assert.equal(set.reviewed,8);
});
test('legacy queues retain remaining cards; completed passes stay complete after reload', () => {
  const set={cards:cards(),session:{queue:['amber0','green0'],revealed:true}};prepareSession(set);
  assert.deepEqual(set.session.queue,['amber0','green0']);gradeCard(set,true);gradeCard(set,true);
  const restored=JSON.parse(JSON.stringify(set));prepareSession(restored);assert.equal(restored.session.current,null);
  shuffleQueue(restored);assert.deepEqual(restored.session.queue,[]);
  startPass(restored);assert.equal(restored.session.queue.length,6);assert.equal(restored.session.current,'red0');
});
test('one-card and empty sets finish without auto-repeating; undo snapshots restore queues', () => {
  const set={cards:[{id:'a',pile:'red'}]};prepareSession(set);const snapshot=JSON.stringify(set);
  shuffleQueue(set);gradeCard(set,false);assert.equal(set.session.current,null);assert.equal(set.session.answered,1);
  const undo=JSON.parse(snapshot);prepareSession(undo);assert.deepEqual(undo.session.queue,['a']);
  const empty={cards:[]};prepareSession(empty);gradeCard(empty,true);shuffleQueue(empty);assert.equal(empty.session.current,null);
});
