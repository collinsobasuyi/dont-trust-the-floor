import { beamZ, canEscape, plannedCollapse } from './TemporalSafety';
import * as THREE from 'three';
import { SIZE, type Cell } from '../intelligence/RouteTracker';
import { isFair } from '../intelligence/FairnessValidator';
import { STAGES } from './RunRules';
import type { Arena } from './Arena';
/** Stage-local time keeps countdowns, pauses and restarts from advancing hazards. */
export class StageEffects {
  group=new THREE.Group();
  private beam=new THREE.Mesh(new THREE.BoxGeometry(SIZE,0.18,0.16),new THREE.MeshBasicMaterial({color:0xffa330,transparent:true,opacity:0.8,toneMapped:false}));
  private ring=0;
  private wave=0;
  constructor(){this.group.add(this.beam);this.reset();}
  reset(){this.ring=0;this.wave=0;this.group.visible=false;}
  update(index:number,time:number,arena:Arena,player:{x:number;y:number;z:number},cell:Cell|null) {
    const stage=STAGES[index],targets:(Cell & {kind: 'ring' | 'stripe'})[]=[];
    this.group.visible=stage.sweep;
    const z=beamZ(time);
    this.beam.position.set(0,0.2,z);this.beam.material.opacity=time<2?0.25:0.9;
    const hit=stage.sweep&&time>=2&&Math.abs(player.z-z)<0.24&&Math.abs(player.x)<SIZE/2&&player.y>=-0.1&&player.y<0.5;
    if(stage.shrink&&this.ring<2&&time>=[10,23][this.ring]){
      const ring=this.ring;
      const cells:Cell[]=[];
      for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++)if(Math.min(x,z,SIZE-1-x,SIZE-1-z)===ring)cells.push({x,z});
      // Remove additional traps if needed to preserve the scheduled inward escape.
      if(!canEscape(arena,player,index,time,plannedCollapse(cells,3)))return {hit,targets};
      this.ring++;
      for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++)if(Math.min(x,z,SIZE-1-x,SIZE-1-z)===ring){
        const target={x,z};arena.warn(target,3,true);targets.push({...target,kind:'ring'});
      }
    }
    if(stage.patterns&&time>=5+this.wave*6){
      const wave=this.wave++,line=2+(wave%6);
      for(let n=2;n<SIZE-2;n++){
        const target=wave%2?{x:n,z:line}:{x:line,z:n};
        if(isFair(target,cell,arena.unavailable())&&canEscape(arena,player,index,time,plannedCollapse([target],1.8))){arena.warn(target,1.8);targets.push({...target,kind:'stripe'});}
      }
    }
    return {hit,targets};
  }
}
