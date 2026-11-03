export function rewardStats(set) {
  const {xp = 0, streak = 0, best = 0, answered = 0} = set?.rewards || {};
  return {xp, streak, best, answered, level: Math.floor(xp / 100) + 1, progress: xp % 100};
}
export function awardReview(set, correct) {
  const previous = rewardStats(set);
  const streak = correct ? previous.streak + 1 : 0;
  const answered = previous.answered + 1;
  const milestone = answered % 5 === 0;
  const points = (correct ? 20 + Math.min(streak - 1, 4) * 5 : 5) + (milestone ? 50 : 0);
  set.rewards = {xp: previous.xp + points, streak, best: Math.max(previous.best, streak), answered};
  const next = rewardStats(set);
  return {...next, points, milestone, levelUp: next.level > previous.level, correct};
}
