import {describe,it,expect} from 'vitest';
import {DeathReplay} from '../src/game/DeathReplay';
import {Arena} from '../src/game/Arena';
describe('last-moments world replay',()=>{
  it('bounds recordings and preserves actual airborne poses and warning states',()=>{
    const replay=new DeathReplay(),arena=new Arena();arena.warn({x:5,z:5});
    for(let i=0;i<=100;i++){const time=i*.1;replay.record(()=>({time,pose:{x:0,y:1,z:0,facing:1},tiles:arena.snapshot(),stage:0,stageTime:time}),time);}
    expect(replay.frames[0].time).toBeGreaterThanOrEqual(5);expect(replay.frames.length).toBeLessThanOrEqual(51);
    arena.reset();expect(replay.frames.at(-1)!.tiles[55].state).toBe('warning');expect(replay.frames[0].pose.y).toBe(1);
    expect(replay.start()).toBe(true);expect(replay.advance(1)!.time).toBeLessThan(replay.frames[0].time+1);
    replay.advance(20);expect(replay.playing).toBe(false);replay.reset();expect(replay.start()).toBe(false);
  });
});
