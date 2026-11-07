import { isFair } from './FairnessValidator';
import { LearningEngine } from './LearningEngine';
import { RouteTracker, SIZE, type Cell } from './RouteTracker';
export interface HazardDecision { cell: Cell; savedWeight: number; liveWeight: number; kind?: 'ring' | 'stripe' | 'ghost' }
export class HazardPlanner {
  lastDecision: HazardDecision | null = null;
  constructor(private engine: LearningEngine, private random = Math.random) {}
  choose(player: Cell | null, tracker: RouteTracker, unavailable: Set<string>, learning = 1, safe:(cell:Cell)=>boolean=()=>true): Cell | null {
    const candidates: { cell: Cell; rank: number }[] = [];
    for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
      const cell = {x,z};
      if (isFair(cell, player, unavailable)) candidates.push({cell, rank: this.engine.score(cell, player, tracker) * learning + this.random() * 8});
    }
    candidates.sort((a,b) => b.rank - a.rank);
    const chosen = candidates.find(candidate=>safe(candidate.cell))?.cell ?? null;
    this.lastDecision = chosen ? {
      cell: {...chosen},
      savedWeight: this.engine.score(chosen, player, new RouteTracker()),
      liveWeight: this.engine.score(chosen, player, tracker) - this.engine.score(chosen, player, new RouteTracker()),
    } : null;
    return chosen;
  }
}
