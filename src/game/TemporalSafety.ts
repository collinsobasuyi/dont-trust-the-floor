import { cellAt, keyOf, SIZE, type Cell } from '../intelligence/RouteTracker';
import { neighbors } from '../intelligence/FairnessValidator';
import { STAGES } from './RunRules';
import type { Arena } from './Arena';
export function beamZ(time:number){const travel=Math.max(0,time-2)*.85%(2*(SIZE-1));return travel<SIZE-1?travel-(SIZE-1)/2:1.5*(SIZE-1)-travel;}
/** Conservative timed walking escape: no jump is required by a trap plan. */
export function canEscape(arena:Arena,player:{x:number;z:number},stage:number,time:number,extra=new Map<string,number>()):boolean {
  const start=cellAt(player.x,player.z);if(!start)return false;
  const rules=STAGES[stage],step=.36,layers=12;
  const safe=(x:number,z:number,t:number)=>{
    const cell=cellAt(x,z);if(!cell||!arena.solidAfter(cell,t,extra))return false;
    const ring=Math.min(cell.x,cell.z,SIZE-1-cell.x,SIZE-1-cell.z);
    if(rules.shrink&&((ring===0&&time+t>=13)||(ring===1&&time+t>=26)))return false;
    return !rules.sweep||time+t<2||Math.abs(z-beamZ(time+t))>.32;
  };
  let frontier=[{x:player.x,z:player.z}];
  for(let layer=1;layer<=layers;layer++){
    const next=new Map<string,{x:number;z:number}>();
    for(const from of frontier){
      const cell=cellAt(from.x,from.z)!;
      for(const target of [cell,...neighbors(cell)]){
        const to={x:target.x-(SIZE-1)/2,z:target.z-(SIZE-1)/2};
        if(Math.hypot(to.x-from.x,to.z-from.z)>3.05*step)continue;
        let clear=true;
        for(let sub=1;sub<=6;sub++){
          const fraction=sub/6,t=(layer-1+fraction)*step;
          if(!safe(from.x+(to.x-from.x)*fraction,from.z+(to.z-from.z)*fraction,t)){clear=false;break;}
        }
        if(clear)next.set(keyOf(target),to);
      }
    }
    if(!next.size)return false;frontier=[...next.values()];
  }
  return true;
}
export function plannedCollapse(cells:Cell[],seconds:number){return new Map(cells.map(cell=>[keyOf(cell),seconds]));}
