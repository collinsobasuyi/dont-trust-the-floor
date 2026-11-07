/** Frame-driven music timing; no timers continue after the game pauses. */
export class Heartbeat {
  private untilBeat=0;
  private quiet=0;
  private step=0;
  private level=0;
  reset(){this.untilBeat=0;this.quiet=0;this.step=0;this.level=0;}
  escape(){this.quiet=1.15;this.untilBeat=.15;}
  tick(dt:number,danger:number):{beat:boolean;accent:boolean;intensity:number}{
    const target=Math.max(0,Math.min(1,Number.isFinite(danger)?danger:0));
    const intensity=this.level+=(target-this.level)*(1-Math.exp(-Math.max(0,dt)*3));
    if(this.quiet>0){this.quiet=Math.max(0,this.quiet-dt);return {beat:false,accent:false,intensity};}
    this.untilBeat-=dt;
    if(this.untilBeat>0)return {beat:false,accent:false,intensity};
    this.untilBeat=60/(62+intensity*76);this.step++;
    return {beat:true,accent:this.step%4===0,intensity};
  }
}
