import {describe,it,expect} from 'vitest';
import {HotSeat} from '../src/game/HotSeat';
describe('family hot-seat session',()=>{
  it('rotates only after recording a completed turn and keeps each player’s scores',()=>{
    const f=new HotSeat();f.begin(['Dad','Daughter']);expect(f.next()).toBe(false);
    f.record(80);f.record(999);expect(f.current.total).toBe(80);expect(f.current.turns).toBe(1);expect(f.nextName).toBe('Daughter');
    expect(f.next()).toBe(true);expect(f.current.name).toBe('Daughter');f.record(120);f.next();f.record(50);
    expect(f.current.name).toBe('Dad');expect(f.current.best).toBe(80);expect(f.current.total).toBe(130);expect(f.turn).toBe(3);
  });
  it('supports four players and starts a fresh session with bounded names',()=>{
    const f=new HotSeat();f.begin(['  ','B','C','D','E']);expect(f.players).toHaveLength(4);expect(f.current.name).toBe('Player 1');
    for(let i=0;i<4;i++){f.record(10);f.next();}expect(f.current.name).toBe('Player 1');
    f.begin(['X'.repeat(50),'Y']);expect(f.current.name).toHaveLength(20);expect(f.current.turns).toBe(0);expect(f.turn).toBe(1);
  });
});
