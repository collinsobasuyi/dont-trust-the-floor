import { Arena } from '../src/game/Arena';
import { describe, it, expect } from 'vitest';
import { LearningEngine, STORAGE_KEY, type StorageLike } from '../src/intelligence/LearningEngine';
import { RouteTracker, cellAt } from '../src/intelligence/RouteTracker';
import { HazardPlanner } from '../src/intelligence/HazardPlanner';
import { isFair } from '../src/intelligence/FairnessValidator';
function storage(): StorageLike { const data = new Map<string,string>(); return {getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}; }
describe('movement learning',()=>{
  it('records dwell samples and transitions only between different tiles',()=>{const t=new RouteTracker();t.sample({x:3,z:3});t.sample({x:3,z:3});t.sample({x:4,z:3});expect(t.visits[33]).toBe(2);expect(t.transitions).toEqual({'3,3>4,3':1});});
  it('persists a completed attempt and restores it after reload',()=>{const s=storage(),e=new LearningEngine(s),t=new RouteTracker();t.sample({x:3,z:3});e.remember(t,12.5);const restored=new LearningEngine(s);expect(restored.memory.attempts).toBe(1);expect(restored.memory.best).toBe(12.5);expect(restored.memory.visits[33]).toBe(1);});
  it('targets repeated routes more strongly after a completed run',()=>{const e=new LearningEngine(),t=new RouteTracker();for(let i=0;i<20;i++)t.sample({x:5,z:5});e.remember(t,10);t.reset();const p=new HazardPlanner(e,()=>0);expect(p.choose({x:3,z:3},t,new Set())).toEqual({x:5,z:5});});
  it('preserves an escape when the last safe neighboring tile is proposed',()=>{expect(isFair({x:4,z:3},{x:3,z:3},new Set(['2,3','3,2','3,4']))).toBe(false);expect(isFair({x:0,z:0},{x:3,z:3},new Set())).toBe(true);});
  it('rejects plans that leave only a tiny safe pocket',()=>{expect(isFair({x:6,z:6},{x:0,z:0},new Set(['2,0','1,1','0,2']))).toBe(false);});
  it('never selects an already warning or collapsed tile',()=>{const e=new LearningEngine(),t=new RouteTracker();for(let i=0;i<20;i++)t.sample({x:0,z:0});const p=new HazardPlanner(e,()=>0);expect(p.choose({x:3,z:3},t,new Set(['0,0']))).not.toEqual({x:0,z:0});});
  it('handles corrupt storage and refuses invalid numeric data',()=>{const s=storage();s.setItem(STORAGE_KEY,'{oops');expect(new LearningEngine(s).memory.attempts).toBe(0);s.setItem(STORAGE_KEY,JSON.stringify({visits:Array(49).fill(-1),transitions:{},attempts:1,best:2}));expect(new LearningEngine(s).memory.attempts).toBe(0);});
  it('continues in memory when browser storage is blocked',()=>{const e=new LearningEngine({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){}});e.remember(new RouteTracker(),3);expect(e.memory.attempts).toBe(1);expect(e.persistent).toBe(false);});
  it('clears learned routes and stored attempts',()=>{const s=storage(),e=new LearningEngine(s);e.remember(new RouteTracker(),4);e.clear();expect(new LearningEngine(s).memory.attempts).toBe(0);expect(e.memory.visits.every(v=>v===0)).toBe(true);});
  it('maps arena bounds and excludes points off the edge',()=>{expect(cellAt(0,0)).toEqual({x:5,z:5});expect(cellAt(-4.99,4.99)).toEqual({x:0,z:9});expect(cellAt(5.01,0)).toBeNull();});
});

describe('saved best score',()=>{
  it('persists an actual clear bonus and never infers one from survival time',()=>{
    const s=storage(),engine=new LearningEngine(s),tracker=new RouteTracker();
    engine.remember(tracker,25,250);
    expect(new LearningEngine(s).memory.bestScore).toBe(250);
    engine.remember(tracker,25,350);
    expect(new LearningEngine(s).memory.bestScore).toBe(350);
    engine.remember(tracker,1,10);
    expect(engine.memory.bestScore).toBe(350);
  });
  it('migrates old memory without losing routes or inventing a clear bonus',()=>{
    const s=storage();s.setItem(STORAGE_KEY,JSON.stringify({visits:Array(49).fill(2),transitions:{},attempts:3,best:25}));
    const engine=new LearningEngine(s);
    expect(engine.memory.bestScore).toBe(250);
    expect(engine.memory.visits[0]).toBe(2);
    engine.clear();expect(engine.memory.bestScore).toBe(0);
  });
});

it('does not combine disconnected escape pockets into a safe area',()=>{
  const safe=new Set(['3,3','2,3','1,3','1,2','4,3','5,3','5,4']);
  const blocked=new Set<string>();
  for(let z=0;z<10;z++)for(let x=0;x<10;x++)if(!safe.has(`${x},${z}`))blocked.add(`${x},${z}`);
  expect(isFair({x:3,z:3},{x:3,z:3},blocked)).toBe(false);
});
it('retains a Playground route as a stronger Trickster target through a floor reset',()=>{
  const tracker=new RouteTracker(),engine=new LearningEngine(),arena=new Arena();
  for(let i=0;i<12;i++)tracker.sample({x:8,z:8},i*.2);
  arena.warn({x:8,z:8});arena.update(1.26,1.26);arena.reset();arena.theme(true);tracker.beginSegment();
  const planner=new HazardPlanner(engine,()=>0);
  expect(planner.choose({x:5,z:5},tracker,arena.unavailable(),2.4)).toEqual({x:8,z:8});
  expect(planner.lastDecision?.liveWeight).toBeGreaterThan(0);
  expect(engine.memory.attempts).toBe(0);expect(arena.tiles).toHaveLength(100);
  expect(arena.unavailable().size).toBe(0);
});
it('skips a preferred target when the combined timed escape check rejects it',()=>{
  const tracker=new RouteTracker(),engine=new LearningEngine();for(let i=0;i<20;i++)tracker.sample({x:5,z:5});
  const planner=new HazardPlanner(engine,()=>0);
  expect(planner.choose({x:5,z:5},tracker,new Set(),1,cell=>cell.x!==5||cell.z!==5)).not.toEqual({x:5,z:5});
  expect(planner.choose({x:5,z:5},tracker,new Set(),1,()=>false)).toBeNull();
});
