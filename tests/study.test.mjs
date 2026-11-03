import test from 'node:test';
import assert from 'node:assert/strict';
import {pickNext,gradeCard,prepareSession} from '../dist/core.js';
const cards = () => ['red','amber','green'].flatMap(pile => [0,1].map(i => ({id: `${pile}${i}`,pile})));
test('correct answers advance one pile, incorrect answers return to Learning', () => {
  for (const [pile,correct,expected] of [['red',true,'amber'],['amber',true,'green'],['green',true,'green'],['red',false,'red'],['amber',false,'red'],['green',false,'red']]) {
    const set = {cards:[{id:'a',pile},{id:'b',pile:'red'}],reviewed:0,session:{current:'a',revealed:true,answered:0}};
    gradeCard(set,correct,()=>0);
    assert.equal(set.cards[0].pile,expected);
    assert.ok(['a','b'].includes(set.session.current));
    assert.equal(set.session.revealed,false);
    assert.equal(set.reviewed,1);
  }
});
test('weighted draws follow 9:3:1 across nonempty piles', () => {
  const count={red:0,amber:0,green:0};
  for(let i=0;i<13000;i++){
    const draw=(i+.5)/13000; const id=pickNext(cards(),null,()=>draw);
    count[id.replace(/\d/g,'')]++;
  }
  assert.deepEqual(count,{red:9000,amber:3000,green:1000});
});
test('handles empty piles, avoids repeats within a pile, preserves small-set weighting', () => {
  assert.equal(pickNext([]),null);
  assert.equal(pickNext([{id:'one',pile:'green'}],'one'), 'one');
  assert.equal(pickNext([{id:'a',pile:'red'},{id:'b',pile:'red'}],'a',()=>0),'b');
  assert.equal(pickNext([{id:'a',pile:'red'},{id:'b',pile:'green'}],'a',()=>0),'a');
  assert.equal(pickNext([{id:'a',pile:'red'},{id:'b',pile:'green'}],'a',()=>.95),'b');
});
test('migration retains piles and current card; reload retains weighted session', () => {
  const set={cards:cards(),reviewed:8,session:{queue:['amber1','red0'],revealed:true}};
  const before=JSON.stringify(set.cards);prepareSession(set);
  assert.equal(set.session.current,'amber1');assert.equal(set.session.revealed,true);
  assert.equal(JSON.stringify(set.cards),before);
  gradeCard(set,true,()=>0);
  const saved=JSON.parse(JSON.stringify(set));prepareSession(saved);
  assert.deepEqual(saved,set);
});
