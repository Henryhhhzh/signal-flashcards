import test from 'node:test';
import assert from 'node:assert/strict';
import {awardReview, rewardStats} from '../dist/rewards.js';
test('awards effort, streak bonuses, and a five-review milestone', () => {
  const set={};
  assert.equal(awardReview(set,true).points,20);
  assert.equal(awardReview(set,true).points,25);
  assert.equal(awardReview(set,false).points,5);
  assert.equal(rewardStats(set).streak,0);
  awardReview(set,true);
  const reward=awardReview(set,true);
  assert.equal(reward.points,75);assert.equal(reward.milestone,true);
  assert.equal(rewardStats(set).xp,145);assert.equal(rewardStats(set).level,2);
  assert.equal(rewardStats(set).best,2);
});
test('points and streaks survive reload and follow set undo snapshots', () => {
  const set={cards:[{id:'a',pile:'red'}],session:{current:'a'}};
  const before=JSON.stringify(set);awardReview(set,true);
  assert.equal(rewardStats(JSON.parse(JSON.stringify(set))).xp,20);
  assert.equal(rewardStats(JSON.parse(before)).xp,0);
  assert.equal(set.cards[0].pile,'red');assert.equal(set.session.current,'a');
});
test('streak reward is capped and level progress is bounded', () => {
  const set={};for(let i=0;i<50;i++)awardReview(set,true);
  assert.equal(rewardStats(set).streak,50);
  assert.equal(awardReview(set,true).points,40);
  assert.ok(rewardStats(set).progress>=0 && rewardStats(set).progress<100);
});
