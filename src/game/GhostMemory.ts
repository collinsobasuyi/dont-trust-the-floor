import type {StorageLike} from '../intelligence/LearningEngine';
import {cellAt,type Cell} from '../intelligence/RouteTracker';
import {STAGES} from './RunRules';
export const GHOST_KEY='dont-trust-the-floor:successful-routes:v1';
export interface GhostPoint {time:number;x:number;y:number;z:number;facing:number}
export interface GhostRoute {stage:number;owner:string;duration:number;points:GhostPoint[]}
/** Bounded, validated successful-stage recordings. No input hijacking or simulated wins. */
export class GhostMemory {
  routes:(GhostRoute|null)[]=STAGES.map(()=>null);
  private recording:GhostPoint[]=[];
  constructor(private storage?:StorageLike){try{const raw=JSON.parse(storage?.getItem(GHOST_KEY)??'null');if(Array.isArray(raw)&&raw.length===STAGES.length)this.routes=raw.map((route,i)=>this.valid(route,i)?route:null);}catch{/* Optional session-only storage. */}}
  private valid(r:GhostRoute,i:number){return r&&r.stage===i&&typeof r.owner==='string'&&r.owner.length<=20&&r.duration===STAGES[i].duration&&Array.isArray(r.points)&&r.points.length>=2&&r.points.length<=450&&r.points[0].time<=.2&&r.points.at(-1)!.time>=r.duration-.2&&r.points.every((p,n)=>[p.time,p.x,p.y,p.z,p.facing].every(Number.isFinite)&&p.time>=0&&p.time<=r.duration&&Math.abs(p.x)<=6&&Math.abs(p.z)<=6&&p.y>=-.2&&p.y<=3&&(n===0||p.time>r.points[n-1].time));}
  begin(){this.recording=[];}
  record(time:number,pose:{x:number;y:number;z:number;facing:number},force=false){if(time<0||this.recording.length>=450)return;const last=this.recording.at(-1);if(last&&time<=last.time)return;if(!force&&last&&time-last.time<.1)return;this.recording.push({time,...pose});}
  clearStage(stage:number,owner:string){const route:GhostRoute={stage,owner:owner.slice(0,20),duration:STAGES[stage].duration,points:this.recording.map(p=>({...p}))};if(!this.valid(route,stage))return false;this.routes[stage]=route;try{this.storage?.setItem(GHOST_KEY,JSON.stringify(this.routes));}catch{/* Keep the recorded route in memory. */}return true;}
  source(stage:number){const route=this.routes[stage]??(stage>0?this.routes[stage-1]:null);return route?{...route,points:route.points.map(p=>({...p}))}:null;}
  clear(){this.routes=STAGES.map(()=>null);this.begin();try{this.storage?.removeItem(GHOST_KEY);}catch{/* Optional storage. */}}
}
export function ghostPose(route:GhostRoute,time:number):GhostPoint|null{
  if(time<0||time>route.duration||!route.points.length)return null;
  let i=0;while(i+1<route.points.length&&route.points[i+1].time<=time)i++;
  const a=route.points[i],b=route.points[i+1]??a,t=b.time>a.time?Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))):0;
  const mix=(x:number,y:number)=>x+(y-x)*t;
  return {time,x:mix(a.x,b.x),y:mix(a.y,b.y),z:mix(a.z,b.z),facing:a.facing+Math.atan2(Math.sin(b.facing-a.facing),Math.cos(b.facing-a.facing))*t};
}
export function upcomingGhostCells(route:GhostRoute,time:number):Cell[]{
  const result:Cell[]=[];for(const p of route.points){if(p.time<time+1.6||p.time>time+3.2||p.y>.12)continue;const cell=cellAt(p.x,p.z);if(cell&&!result.some(c=>c.x===cell.x&&c.z===cell.z))result.push(cell);if(result.length===3)break;}return result;
}
