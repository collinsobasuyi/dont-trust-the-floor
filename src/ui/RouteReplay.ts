import type { Cell } from '../intelligence/RouteTracker';
export interface RoutePoint { cell: Cell; time: number; breakBefore?: boolean }
/** Playback of recorded grounded samples, independent of live gameplay. */
export class RouteReplay {
  points: RoutePoint[]=[];
  index=0;
  time=0;
  playing=false;
  load(points: RoutePoint[]) {
    this.points=points.map(p=>({cell:{...p.cell},time:p.time,...(p.breakBefore?{breakBefore:true}:{})}));this.playing=false;this.seek(0);
  }
  seek(index: number) {
    this.index=Math.max(0,Math.min(this.points.length-1,Math.floor(index)))||0;
    this.time=this.points[this.index]?.time??0;
  }
  toggle() {
    if(this.points.length<2)return;
    if(!this.playing&&this.index===this.points.length-1)this.seek(0);
    this.playing=!this.playing;
  }
  advance(dt: number) {
    if(!this.playing)return;
    this.time+=Math.max(0,dt);
    while(this.index+1<this.points.length&&this.points[this.index+1].time<=this.time)this.index++;
    if(this.index===this.points.length-1){this.time=this.points[this.index].time;this.playing=false;}
  }
}
