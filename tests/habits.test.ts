import {describe,it,expect} from 'vitest';
import {RouteTracker} from '../src/intelligence/RouteTracker';
import {habitText,habitPriority} from '../src/intelligence/Habits';
import {LearningEngine,STORAGE_KEY} from '../src/intelligence/LearningEngine';
describe('recognisable movement habits',()=>{
  it('generalises edge use to edge tiles that were never visited',()=>{
    const tracker=new RouteTracker();for(let i=0;i<20;i++)tracker.sample({x:0,z:3});
    expect(habitText(tracker.habits)).toContain('100%');
    expect(habitPriority(tracker.habits,{x:9,z:8},null)).toBeGreaterThan(habitPriority(tracker.habits,{x:5,z:5},null));
    const engine=new LearningEngine();expect(engine.score({x:9,z:8},null,tracker)).toBeGreaterThan(0);
  });
  it('counts centre returns without treating stage repositioning as player movement',()=>{
    const t=new RouteTracker();for(let i=0;i<3;i++){t.sample({x:2,z:4});t.sample({x:3,z:4});}
    t.beginSegment();t.sample({x:4,z:4});expect(t.habits.returns).toBe(3);
  });
  it('recognises circling direction and favours destinations ahead along the circle',()=>{
    const t=new RouteTracker();for(let repeat=0;repeat<3;repeat++)for(const c of [{x:7,z:4},{x:7,z:5},{x:6,z:7},{x:5,z:7},{x:4,z:7},{x:2,z:6},{x:2,z:5},{x:2,z:4},{x:3,z:2},{x:4,z:2},{x:5,z:2},{x:7,z:3}])t.sample(c);
    expect(habitText(t.habits)).toContain('clockwise');
    expect(habitPriority(t.habits,{x:7,z:6},{x:7,z:5})).toBeGreaterThan(habitPriority(t.habits,{x:7,z:4},{x:7,z:5}));
  });
  it('persists aggregate habits and migrates earlier saves without them',()=>{
    let raw:string|null=null;const store={getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;},removeItem:()=>{raw=null;}};
    const t=new RouteTracker();for(let i=0;i<20;i++)t.sample({x:0,z:0});const e=new LearningEngine(store);e.remember(t,5);
    expect(new LearningEngine(store).memory.habits.edge).toBe(20);
    const old=JSON.parse(raw!);delete old.habits;store.setItem(STORAGE_KEY,JSON.stringify(old));expect(new LearningEngine(store).memory.habits.samples).toBe(0);
  });
});
