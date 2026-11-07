import {describe,it,expect} from 'vitest';
import {GhostMemory,GHOST_KEY,ghostPose,upcomingGhostCells} from '../src/game/GhostMemory';
function success(memory:GhostMemory,stage=0,owner='Dad'){
  memory.begin();for(let time=0;time<=30;time+=.1)memory.record(time,{x:Math.sin(time)*2,y:0,z:Math.cos(time)*2,facing:time});memory.record(30,{x:0,y:0,z:2,facing:0},true);return memory.clearStage(stage,owner);
}
describe('successful route memory',()=>{
  it('requires a complete successful stage recording, and snapshots source data',()=>{
    const m=new GhostMemory();m.begin();m.record(0,{x:0,y:0,z:0,facing:0});m.record(3,{x:1,y:0,z:0,facing:0});expect(m.clearStage(0,'Dad')).toBe(false);expect(m.source(0)).toBeNull();
    expect(success(m)).toBe(true);const source=m.source(0)!;source.points[0].x=99;expect(m.source(0)!.points[0].x).not.toBe(99);
  });
  it('uses the same-stage successful route first and the preceding stage as a labelled fallback',()=>{
    const m=new GhostMemory();success(m);expect(m.source(1)!.stage).toBe(0);expect(m.source(1)!.owner).toBe('Dad');expect(m.source(2)).toBeNull();
  });
  it('persists bounded recordings, tolerates unavailable storage and clears saved ghosts',()=>{
    let raw:string|null=null;const store={getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;},removeItem:()=>{raw=null;}};
    const m=new GhostMemory(store);success(m);expect(new GhostMemory(store).source(0)!.points.length).toBeLessThanOrEqual(450);m.clear();expect(new GhostMemory(store).source(0)).toBeNull();
    const blocked=new GhostMemory({getItem(){throw Error();},setItem(){throw Error();},removeItem(){}});expect(success(blocked)).toBe(true);
  });
  it('rejects corrupt timestamps, coordinates and oversized imported recordings',()=>{
    const m=new GhostMemory();success(m);const r=m.source(0)!;r.points[1].time=-1;
    const read=(route:unknown)=>new GhostMemory({getItem:()=>JSON.stringify([route,null,null,null,null,null]),setItem(){},removeItem(){}});
    expect(read(r).source(0)).toBeNull();r.points[1].time=.1;r.points[0].x=Infinity;expect(read(r).source(0)).toBeNull();
    expect(new GhostMemory({getItem:()=>'{bad',setItem(){},removeItem(){}}).source(0)).toBeNull();expect(GHOST_KEY).toContain('successful-routes');
  });
  it('interpolates a non-colliding echo, stops at its real duration, and forecasts grounded targets only',()=>{
    const route={stage:0,owner:'You',duration:3,points:[{time:0,x:0,y:0,z:0,facing:0},{time:2,x:2,y:0,z:0,facing:0},{time:3,x:3,y:1,z:0,facing:0}]};
    expect(ghostPose(route,1)!.x).toBe(1);expect(ghostPose(route,3.1)).toBeNull();
    expect(upcomingGhostCells(route,0)).toEqual([{x:7,z:5}]);expect(upcomingGhostCells(route,3)).toHaveLength(0);
  });
});
