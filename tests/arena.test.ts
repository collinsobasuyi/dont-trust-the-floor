import { describe, it, expect } from 'vitest';
import { Arena } from '../src/game/Arena';
import { Player } from '../src/game/Player';

describe('arena and player physics', () => {
  it('warns, collapses, recovers, and restores a tile', () => {
    const arena = new Arena(), cell = { x: 3, z: 3 };
    arena.warn(cell);
    expect(arena.solid(cell)).toBe(true);
    expect(arena.unavailable().has('3,3')).toBe(true);
    arena.update(1.26, 1.26);
    expect(arena.solid(cell)).toBe(false);
    arena.update(3.01, 4.27);
    expect(arena.solid(cell)).toBe(false);
    arena.update(0.66, 4.93);
    expect(arena.solid(cell)).toBe(true);
    expect(arena.unavailable().size).toBe(0);
  });
  it('jumps and lands back on a solid floor', () => {
    const arena = new Arena(), player = new Player();
    player.update(0.016, {x:0,z:0}, true, arena);
    expect(player.y).toBeGreaterThan(0);
    for(let i=0;i<120;i++) player.update(1/120, {x:0,z:0}, false, arena);
    expect(player.grounded).toBe(true);
    expect(player.y).toBe(0);
  });
  it('falls through a collapsed floor and can restart safely', () => {
    const arena = new Arena(), player = new Player();
    arena.warn({x:5,z:5});arena.update(1.26,1.26);
    for(let i=0;i<120;i++) player.update(1/120,{x:0,z:0},false,arena);
    expect(player.y).toBeLessThan(-3);
    arena.reset();player.reset();
    expect(player.grounded).toBe(true);
    expect(player.y).toBe(0);
    expect(arena.unavailable().size).toBe(0);
  });
  it('moves off the arena and falls instead of landing in empty space', () => {
    const arena = new Arena(), player = new Player();
    for(let i=0;i<360;i++) player.update(1/120,{x:1,z:0},false,arena);
    expect(player.x).toBeGreaterThan(5);
    expect(player.y).toBeLessThan(-3);
  });
});

it('accepts a jump just after leaving an edge, but cannot jump repeatedly in the air',()=>{
  const arena=new Arena(),player=new Player();player.x=4.99;player.update(.016,{x:1,z:0},false,arena);
  expect(player.grounded).toBe(false);expect(player.update(.016,{x:0,z:0},true,arena)).toBe(true);
  expect(player.velocity).toBeGreaterThan(0);expect(player.update(.016,{x:0,z:0},true,arena)).toBe(false);
});
it('buffers a jump pressed just before landing and clears input grace on reset',()=>{
  const arena=new Arena(),player=new Player();player.grounded=false;player.y=.01;player.velocity=-1;
  expect(player.update(.016,{x:0,z:0},true,arena)).toBe(false);expect(player.grounded).toBe(true);
  expect(player.update(.016,{x:0,z:0},false,arena)).toBe(true);player.reset();expect(player.y).toBe(0);
});
it('does not permit a late midair jump after edge grace expires',()=>{
  const arena=new Arena(),player=new Player();player.x=4.99;player.update(.016,{x:1,z:0},false,arena);
  for(let i=0;i<10;i++)player.update(.016,{x:0,z:0},false,arena);
  expect(player.update(.016,{x:0,z:0},true,arena)).toBe(false);
});
