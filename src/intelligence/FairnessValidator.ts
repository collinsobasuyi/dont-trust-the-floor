import { SIZE, keyOf, type Cell } from './RouteTracker';
export const neighbors = ({ x, z }: Cell): Cell[] => [{x:x-1,z}, {x:x+1,z}, {x,z:z-1}, {x,z:z+1}].filter(c => c.x >= 0 && c.x < SIZE && c.z >= 0 && c.z < SIZE);
// Warnings count as unavailable. At least one reachable safe component must hold five tiles.
export function isFair(candidate: Cell, player: Cell | null, unavailable: Set<string>): boolean {
  if (!player || unavailable.has(keyOf(candidate))) return false;
  const blocked=new Set(unavailable).add(keyOf(candidate));
  const visited=new Set<string>();
  for(const exit of neighbors(player)) {
    if(blocked.has(keyOf(exit))||visited.has(keyOf(exit)))continue;
    const queue=[exit];visited.add(keyOf(exit));
    for(let i=0;i<queue.length;i++) {
      for(const next of neighbors(queue[i])) {
        const key=keyOf(next);
        if(!blocked.has(key)&&!visited.has(key)){visited.add(key);queue.push(next);}
      }
    }
    if(queue.length>=5)return true;
  }
  return false;
}
