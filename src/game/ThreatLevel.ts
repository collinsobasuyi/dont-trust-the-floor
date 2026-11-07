import type {Arena} from './Arena';
import {STAGES} from './RunRules';
import {beamZ} from './TemporalSafety';
export function threatLevel(arena:Arena,player:{x:number;y:number;z:number},stage:number,time:number){
  let danger=.05+stage*.035;
  for(const tile of arena.tiles){if(tile.state==='safe'||tile.state==='recovering')continue;
    const distance=Math.hypot(player.x-(tile.cell.x-4.5),player.z-(tile.cell.z-4.5));
    const proximity=Math.max(0,1-distance/2.5);
    const urgency=tile.state==='warning'?Math.max(.25,1-(tile.warningSeconds-tile.time)/3):.8;
    danger=Math.max(danger,proximity*urgency);
  }
  if(STAGES[stage].sweep&&time>=2&&player.y<.5)danger=Math.max(danger,Math.max(0,1-Math.abs(player.z-beamZ(time))/3));
  return Math.max(0,Math.min(1,danger));
}
