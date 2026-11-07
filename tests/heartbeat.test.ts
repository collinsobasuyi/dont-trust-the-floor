import {describe,it,expect} from 'vitest';
import {Heartbeat} from '../src/game/Heartbeat';
import {threatLevel} from '../src/game/ThreatLevel';
import {Arena} from '../src/game/Arena';
describe('responsive arena heartbeat',()=>{
  it('builds tempo smoothly as danger increases',()=>{
    const beats=(danger:number)=>{const h=new Heartbeat();let count=0;for(let i=0;i<1000;i++)if(h.tick(.01,danger).beat)count++;return count;};
    expect(beats(1)).toBeGreaterThan(beats(0)*1.7);
    const h=new Heartbeat();expect(h.tick(.016,1).intensity).toBeLessThan(.1);for(let i=0;i<200;i++)h.tick(.016,1);expect(h.tick(.016,1).intensity).toBeGreaterThan(.95);
  });
  it('leaves a real musical silence after an escape and resets cleanly',()=>{
    const h=new Heartbeat();h.tick(.1,1);h.escape();for(let i=0;i<11;i++)expect(h.tick(.1,1).beat).toBe(false);
    h.tick(.1,1);expect(h.tick(.2,1).beat).toBe(true);h.reset();expect(h.tick(.01,0).beat).toBe(true);
  });
  it('responds to proximity, warning urgency and a moving beam',()=>{
    const a=new Arena(),p={x:.5,y:0,z:.5};const calm=threatLevel(a,p,0,3);a.warn({x:5,z:5});a.update(.8,0);
    expect(threatLevel(a,p,0,3)).toBeGreaterThan(calm);expect(threatLevel(a,{x:-4.5,y:0,z:-4.5},0,3)).toBeLessThan(threatLevel(a,p,0,3));
    a.reset();expect(threatLevel(a,{x:0,y:0,z:-4.5},2,2)).toBe(1);expect(threatLevel(a,{x:0,y:1,z:-4.5},2,2)).toBeLessThan(1);
  });
});
