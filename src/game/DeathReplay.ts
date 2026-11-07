import type { Arena } from './Arena';
export interface ReplayFrame {time:number;pose:{x:number;y:number;z:number;facing:number};tiles:ReturnType<Arena['snapshot']>;stage:number;stageTime:number}
/** Bounded recent world snapshots include airborne motion and actual tile warnings. */
export class DeathReplay {
  frames:ReplayFrame[]=[];playing=false;cursor=0;private sampled=-Infinity;
  reset(){this.frames=[];this.playing=false;this.cursor=0;this.sampled=-Infinity;}
  record(frame:()=>ReplayFrame,time:number,force=false){if(!force&&time-this.sampled<.1)return;this.sampled=time;this.frames.push(frame());while(this.frames.length>1&&this.frames[0].time<time-5)this.frames.shift();}
  start(){if(this.frames.length<2)return false;this.cursor=this.frames[0].time;this.playing=true;return true;}
  advance(dt:number){
    if(!this.frames.length)return null;
    this.cursor=Math.min(this.frames.at(-1)!.time,this.cursor+Math.max(0,dt)*.65);
    let index=0;while(index+1<this.frames.length&&this.frames[index+1].time<=this.cursor)index++;
    const current=this.frames[index],next=this.frames[index+1]??current;
    const fraction=next.time>current.time?(this.cursor-current.time)/(next.time-current.time):0;
    const mix=(a:number,b:number)=>a+(b-a)*fraction;
    const turn=Math.atan2(Math.sin(next.pose.facing-current.pose.facing),Math.cos(next.pose.facing-current.pose.facing));
    if(this.cursor>=this.frames.at(-1)!.time)this.playing=false;
    return {...current,time:this.cursor,stageTime:mix(current.stageTime,next.stageTime),pose:{x:mix(current.pose.x,next.pose.x),y:mix(current.pose.y,next.pose.y),z:mix(current.pose.z,next.pose.z),facing:current.pose.facing+turn*fraction}};
  }
}
