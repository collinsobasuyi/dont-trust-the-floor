import {describe,it,expect} from 'vitest';
import {Progression} from '../src/game/Progression';
describe('earned practice stages and cosmetic suits',()=>{
  it('unlocks only cleared progression and never unlocks rewards through practice',()=>{
    const p=new Progression();p.clearStage(0,true);p.finish(9999,1,10,true);
    expect(p.unlockedStage).toBe(0);expect(p.available('mint')).toBe(false);expect(p.available('gold')).toBe(false);expect(p.available('rose')).toBe(false);
    p.clearStage(0);expect(p.unlockedStage).toBe(1);expect(p.available('mint')).toBe(true);
    p.clearStage(5);expect(p.unlockedStage).toBe(5);expect(p.available('violet')).toBe(true);
  });
  it('requires actual mastery and a previous record for the appropriate rewards',()=>{
    const p=new Progression();expect(p.select('gold')).toBe(false);p.finish(100,0,2);expect(p.available('rose')).toBe(false);expect(p.available('gold')).toBe(false);
    p.finish(110,100,1);expect(p.available('rose')).toBe(true);expect(p.select('gold')).toBe(true);expect(p.selected).toBe('gold');
  });
  it('restores earned and equipped cosmetics while tolerating unavailable storage',()=>{
    let raw:string|null=null;const store={getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;},removeItem:()=>{}};
    const p=new Progression(store);p.clearStage(0);p.select('mint');const restored=new Progression(store);expect(restored.selected).toBe('mint');expect(restored.unlockedStage).toBe(1);
    const blocked=new Progression({getItem(){throw Error();},setItem(){throw Error();},removeItem(){}});blocked.clearStage(0);expect(blocked.available('mint')).toBe(true);
  });
});
