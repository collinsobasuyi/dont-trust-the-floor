import { habitText } from './Habits';
import { SIZE, keyOf, type Cell, type RouteTracker } from './RouteTracker';
import type { HazardDecision } from './HazardPlanner';
export const cellName = (cell: Cell) => `${String.fromCharCode(65+cell.x)}${cell.z+1}`;
export interface RoundInsight {
  memoryRace?:{explanation:string;deviations:Cell[];ghost:Cell[]};
  title: string;
  explanation: string;
  habit: string;
  visits: number[];
  targets: Cell[];
  fall: Cell | null;
  favourite: Cell | null;
  path: {cell:Cell;time:number; breakBefore?: boolean}[];
}
export function describeRound(tracker: RouteTracker, hazards: HazardDecision[], fall: Cell | null, won: boolean): RoundInsight {
  const max=Math.max(...tracker.visits);
  const index=tracker.visits.indexOf(max);
  const favourite=max>0?{x:index%SIZE,z:Math.floor(index/SIZE)}:null;
  const entries=favourite?tracker.entries[index]:0;
  const tileHabit=favourite?(entries>1?`You entered ${cellName(favourite)} ${entries} times.`:`Your longest stop was ${cellName(favourite)}.`):'Keep moving to leave a route for the arena to learn.';
  const habit=tracker.habits.samples>=12?habitText(tracker.habits)+' '+tileHabit:tileHabit;
  const trap=fall?[...hazards].reverse().find(h=>keyOf(h.cell)===keyOf(fall)):undefined;
  let title=won?'You broke the pattern.':'The edge got you.';
  let explanation=won?'All six stages survived. Your footprint is saved. Next time, the arena starts with this memory.':'You fell beyond the arena. Keep an eye on the outer tiles; there is no floor past the edge.';
  if(!won&&fall) {
    title=trap?.kind==='ghost'?'Your old route caught you.':trap&&(trap.savedWeight>0||trap.liveWeight>0)?'The floor read your route.':'One warning too late.';
    const reason=trap?.kind==='ghost'?'This tile was visibly targeted because it lay ahead on a recorded successful ghost route.':trap?.kind==='ring'?'This outer ring was removed by the shrinking arena. Move inward during its three-second warning.':trap?.kind==='stripe'?'This tile belonged to an alternating warning stripe. Its direction changes with each wave.':trap?.savedWeight?"Your saved routes increased this tile’s hazard priority.":trap?.liveWeight?"Your movements in this run increased this tile’s hazard priority.":'This was an exploratory trap, chosen without a learned preference for this tile.';
    explanation=`Tile ${cellName(fall)} was missing when you fell. ${reason}`;
  }
  return {title,explanation,habit,path:tracker.trail.map(p=>({cell:{...p.cell},time:p.time,...(p.breakBefore?{breakBefore:true}:{})})),visits:[...tracker.visits],targets:hazards.map(h=>({...h.cell})),fall,favourite};
}
