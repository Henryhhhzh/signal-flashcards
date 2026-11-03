let context;
export function clearEffects() {
  document.getElementById('reward-effects').replaceChildren();
}
export function playTone(kind) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    context ||= new Audio();
    context.resume().catch(() => {});
    const notes = kind === 'big' ? [523,659,784,1047] : kind === 'right' ? [523,784] : [330,440];
    notes.forEach((note, index) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const start = context.currentTime + index * .085;
      oscillator.type = 'sine'; oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.06,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+.18);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.2);
    });
  } catch { /* Audio is optional when the browser blocks playback. */ }
}
export function celebrate(reward) {
  clearEffects();
  const container = document.getElementById('reward-effects');
  const banner = document.createElement('div');banner.className = 'reward-banner';
  const headline = document.createElement('strong');
  headline.textContent = reward.levelUp ? `LEVEL ${reward.level}!` : reward.milestone ? '5-CARD BONUS!' : reward.correct ? ['NICE!','NAILED IT!','ON A ROLL!'][Math.min(reward.streak-1,2)] : 'RETRY LOADED';
  const detail = document.createElement('span');detail.textContent = `+${reward.points} XP${reward.streak > 1 ? ' · ' + reward.streak + '× STREAK' : ''}`;
  banner.append(headline,detail);container.append(banner);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const particles = [];
    const colours = ['#c7ff46','#ff6cde','#6ee7ff','#ffe26b','#ad8dff'];
    for(let i=0;i<(reward.correct||reward.milestone?42:12);i++){
      const piece=document.createElement('i');piece.className='reward-particle';
      piece.style.setProperty('--x', `${(Math.random()-.5)*760}px`);
      piece.style.setProperty('--y', `${-80-Math.random()*320}px`);
      piece.style.setProperty('--r', `${Math.random()*600-300}deg`);
      piece.style.setProperty('--colour',colours[i%colours.length]);
      piece.style.setProperty('--delay',`${Math.random()*.12}s`);
      container.append(piece); particles.push(piece);
    }
    setTimeout(()=>particles.forEach(piece=>piece.remove()),1600);
  }
  setTimeout(()=>banner.remove(),1500);
}
