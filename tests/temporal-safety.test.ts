import {describe,it,expect} from 'vitest';
import {Arena} from '../src/game/Arena';
import {canEscape,plannedCollapse} from '../src/game/TemporalSafety';
describe('combined timed escape checks',()=>{
  it('allows an escapable targeted collapse but rejects a whole floor scheduled to vanish',()=>{
    const arena=new Arena(),player={x:.5,z:.5};expect(canEscape(arena,player,0,3,plannedCollapse([{x:5,z:5}],1.25))).toBe(true);
    expect(canEscape(arena,player,0,3,plannedCollapse(arena.tiles.map(t=>t.cell),1.25))).toBe(false);
  });
  it('rejects a connected corridor when an incoming beam makes it impassable',()=>{
    const arena=new Arena();for(const t of arena.tiles)if(t.cell.z!==5){t.state='gone';t.permanent=true;}
    expect(canEscape(arena,{x:.5,z:.5},0,7.4)).toBe(true);
    expect(canEscape(arena,{x:.5,z:.5},2,7.4)).toBe(false);
  });
  it('accounts for a shrinking ring deadline even before the ring is removed',()=>{
    const arena=new Arena();for(const t of arena.tiles)if(Math.min(t.cell.x,t.cell.z,9-t.cell.x,9-t.cell.z)>0){t.state='gone';t.permanent=true;}
    expect(canEscape(arena,{x:-4.5,z:.5},0,10)).toBe(true);
    expect(canEscape(arena,{x:-4.5,z:.5},3,10)).toBe(false);
  });
});
