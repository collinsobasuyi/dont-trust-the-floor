import {describe,it,expect} from 'vitest';
import {StageEffects} from '../src/game/StageEffects';
import {Arena} from '../src/game/Arena';
const centre={x:5,z:5},player={x:0,y:0,z:0};
describe('distinct stage mechanics',()=>{
  it('gives the sweeper a grace period and lets a jump clear it',()=>{
    const effects=new StageEffects(),arena=new Arena();
    expect(effects.update(2,1,arena,{x:0,y:0,z:-4.5},centre).hit).toBe(false);
    const crossing=2+4.5/.85;
    expect(effects.update(2,crossing,arena,player,centre).hit).toBe(true);
    expect(effects.update(2,crossing,arena,{...player,y:.6},centre).hit).toBe(false);
    expect(effects.update(1,crossing,arena,player,centre).hit).toBe(false);
  });
  it('warns outer rings for three seconds, keeps them gone and restores them on reset',()=>{
    const effects=new StageEffects(),arena=new Arena();
    expect(effects.update(3,9.9,arena,player,centre).targets).toHaveLength(0);
    expect(effects.update(3,10,arena,player,centre).targets).toHaveLength(36);
    arena.update(2.9,12.9);expect(arena.solid({x:0,z:0})).toBe(true);
    arena.update(.11,13.01);expect(arena.solid({x:0,z:0})).toBe(false);
    arena.update(20,33);expect(arena.solid({x:0,z:0})).toBe(false);
    expect(effects.update(3,23,arena,player,centre).targets).toHaveLength(28);
    expect(arena.solid(centre)).toBe(true);
    effects.reset();arena.reset();expect(arena.unavailable().size).toBe(0);
    expect(effects.update(3,10,arena,player,centre).targets).toHaveLength(36);
  });
  it('alternates warned columns and rows without repeating waves every frame',()=>{
    const effects=new StageEffects(),arena=new Arena();
    const first=effects.update(4,5,arena,player,centre).targets;
    expect(first.length).toBeGreaterThan(0);expect(first.every(c=>c.x===2)).toBe(true);
    expect(effects.update(4,5.1,arena,player,centre).targets).toHaveLength(0);
    arena.reset();const second=effects.update(4,11,arena,player,centre).targets;
    expect(second.every(c=>c.z===3)).toBe(true);
  });
  it('combines mechanics only in the finale and hides the beam on reset',()=>{
    const effects=new StageEffects(),arena=new Arena();
    const result=effects.update(5,10,arena,player,centre);
    expect(result.targets.some(c=>c.x===0)).toBe(true);expect(effects.group.visible).toBe(true);
    effects.reset();expect(effects.group.visible).toBe(false);
  });
});
