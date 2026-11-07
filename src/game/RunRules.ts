export const COUNTDOWN_SECONDS = 3;
export const STAGES = [
  { name: 'PLAYGROUND', duration: 30, interval: 1.15, learning: 0.35, hint: 'Move and jump. Every warning is real.', sweep: false, shrink: false, patterns: false, color: 0x79c9ee },
  { name: 'TRICKSTER', duration: 40, interval: 0.7, learning: 2.4, hint: 'Your favourite routes are now stronger targets. Change your habits.', sweep: false, shrink: false, patterns: false, color: 0xa17cde },
  { name: 'CHAOS FACTORY', duration: 35, interval: 0.85, learning: 2, hint: 'Jump over the orange sweeping beam. It activates after two seconds.', sweep: true, shrink: false, patterns: false, color: 0x58d3bb },
  { name: 'MELTDOWN', duration: 35, interval: 0.9, learning: 2.2, hint: 'Outer rings fall at 10 and 23 seconds. Move toward the centre.', sweep: false, shrink: true, patterns: false, color: 0xe9a465 },
  { name: 'MIND GAMES', duration: 35, interval: 0.9, learning: 2.8, hint: 'Warning stripes alternate direction. Every warning is real.', sweep: false, shrink: false, patterns: true, color: 0xd68ddb },
  { name: 'FINAL SHOWDOWN', duration: 40, interval: 0.85, learning: 3.2, hint: 'Beam, shrinking rings and stripes together. Keep an escape open.', sweep: true, shrink: true, patterns: true, color: 0xe97c97 },
] as const;
export const ROUND_SECONDS = STAGES.reduce((sum, stage) => sum + stage.duration, 0);
export const MAX_SCORE = ROUND_SECONDS * 10 + 100;
export function stageStart(index: number) { return STAGES.slice(0,index).reduce((sum,stage)=>sum+stage.duration,0); }
export function stageAt(seconds: number) {
  for(let i=0;i<STAGES.length-1;i++)if(seconds<stageStart(i+1))return i;
  return STAGES.length-1;
}
export function stageRemaining(seconds: number) { const i=stageAt(seconds);return Math.max(0,stageStart(i)+STAGES[i].duration-seconds); }
export interface RunPhase { name: string; hint: string; interval: number; index: number }
export function phaseAt(seconds: number): RunPhase {
  const stage=STAGES[stageAt(seconds)];
  return {name:stage.name,hint:stage.hint,interval:stage.interval,index:stageAt(seconds)};
}
export function scoreFor(seconds: number, cleared: boolean): number {
  const elapsed = Math.max(0, Math.min(ROUND_SECONDS, Number.isFinite(seconds) ? seconds : 0));
  return Math.floor(elapsed * 10) + (cleared && elapsed >= ROUND_SECONDS ? 100 : 0);
}
