import { emptyHabits, habitPriority, type Habits } from './Habits';
import { ROUND_SECONDS, MAX_SCORE } from '../game/RunRules';
import { SIZE, keyOf, type Cell, type RouteTracker } from './RouteTracker';
export const STORAGE_KEY = 'dont-trust-the-floor:memory:v1';
export interface Memory { habits: Habits; visits: number[]; transitions: Record<string, number>; attempts: number; best: number; bestScore: number }
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const empty = (): Memory => ({ habits:emptyHabits(), visits: Array<number>(SIZE * SIZE).fill(0), transitions: {}, attempts: 0, best: 0, bestScore: 0 });
const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e7;
export class LearningEngine {
  memory = empty();
  persistent = true;
  constructor(private storage?: StorageLike) {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const m = JSON.parse(raw);
      if (!Array.isArray(m.visits) || ![49,SIZE*SIZE].includes(m.visits.length) || !m.visits.every(validNumber) || !validNumber(m.attempts) || !validNumber(m.best) || !m.transitions || typeof m.transitions !== 'object' || Array.isArray(m.transitions)) return;
      const oldSize = Math.sqrt(m.visits.length);
      const remap = (n: number) => Math.round(n / (oldSize - 1) * (SIZE - 1));
      const visits = Array<number>(SIZE*SIZE).fill(0);
      m.visits.forEach((v: number,i: number)=>{visits[remap(Math.floor(i/oldSize))*SIZE+remap(i%oldSize)] += v;});
      const transitions: Record<string, number> = {};
      for (const [key, value] of Object.entries(m.transitions)) {
        if (/^\d,\d>\d,\d$/.test(key) && validNumber(value)) { const coords=key.match(/\d/g)!.map(Number); if(coords.every(n=>n<oldSize)){const [x,z,a,b]=coords.map(remap);transitions[`${x},${z}>${a},${b}`]=value;} }
      }
      const habits=emptyHabits();for(const key of Object.keys(habits) as (keyof Habits)[])if(validNumber(m.habits?.[key]))habits[key]=m.habits[key];
      this.memory = { habits, visits, transitions, attempts: m.attempts, best: Math.min(ROUND_SECONDS, m.best), bestScore: validNumber(m.bestScore) ? Math.min(MAX_SCORE, Math.floor(m.bestScore)) : Math.floor(Math.min(ROUND_SECONDS,m.best)*10) };
    } catch { this.persistent = false; }
  }
  score(cell: Cell, current: Cell | null, tracker: RouteTracker): number {
    const index = cell.z * SIZE + cell.x;
    const transition = current ? `${keyOf(current)}>${keyOf(cell)}` : '';
    return habitPriority(this.memory.habits,cell,current)+habitPriority(tracker.habits,cell,current)*1.5+this.memory.visits[index] + tracker.visits[index] * 1.5 + (this.memory.transitions[transition] ?? 0) * 3 + (tracker.transitions[transition] ?? 0) * 4;
  }
  remember(tracker: RouteTracker, seconds: number, score = Math.floor(Math.max(0,Math.min(ROUND_SECONDS,seconds))*10)) {
    for(const key of Object.keys(this.memory.habits) as (keyof Habits)[])this.memory.habits[key]=Math.min(10000,this.memory.habits[key]*.85+tracker.habits[key]);
    this.memory.visits = this.memory.visits.map((v, i) => Math.min(10000, v * 0.85 + tracker.visits[i]));
    const merged: Record<string, number> = {};
    for (const key of new Set([...Object.keys(this.memory.transitions), ...Object.keys(tracker.transitions)])) {
      const n = (this.memory.transitions[key] ?? 0) * 0.85 + (tracker.transitions[key] ?? 0);
      if (n > 0.1) merged[key] = Math.min(10000, n);
    }
    this.memory.transitions = merged;
    this.memory.attempts = Math.min(1e7, this.memory.attempts + 1);
    this.memory.best = Math.max(this.memory.best, Math.min(ROUND_SECONDS, seconds));
    if (Number.isFinite(score)) this.memory.bestScore = Math.max(this.memory.bestScore, Math.min(MAX_SCORE,Math.max(0,Math.floor(score))));
    this.save();
  }
  clear() { this.memory = empty(); this.save(); }
  private save() {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.memory)); }
    catch { this.persistent = false; }
  }
}
