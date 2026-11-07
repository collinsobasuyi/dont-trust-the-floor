import { describe, it, expect } from 'vitest';
import { phaseAt, scoreFor, ROUND_SECONDS, MAX_SCORE, stageStart, STAGES, stageAt, stageRemaining } from '../src/game/RunRules';
describe('run scoring and progression',()=>{
  it('awards survival points and reserves the bonus for a full clear',()=>{
    expect(scoreFor(0,false)).toBe(0);
    expect(scoreFor(12.5,false)).toBe(125);
    expect(scoreFor(24.9,true)).toBe(249);
    expect(scoreFor(25,false)).toBe(250);
    expect(scoreFor(25,true)).toBe(250);
    expect(scoreFor(70,true)).toBe(700);
    expect(scoreFor(ROUND_SECONDS,true)).toBe(MAX_SCORE);
  });
  it('bounds score and tolerates invalid time',()=>{
    expect(scoreFor(-2,false)).toBe(0);
    expect(scoreFor(1000,true)).toBe(MAX_SCORE);
    expect(scoreFor(NaN,true)).toBe(0);
  });
  it('changes phase at thirty and seventy seconds with readable warning time intact',()=>{
    expect(phaseAt(29.99).name).toBe('PLAYGROUND');
    expect(phaseAt(30).name).toBe('TRICKSTER');
    expect(phaseAt(69.99).index).toBe(1);
    expect(phaseAt(70).name).toBe('CHAOS FACTORY');
    expect(phaseAt(0).interval).toBeGreaterThan(phaseAt(30).interval);
    expect(phaseAt(70).interval).toBeGreaterThan(phaseAt(30).interval);
  });
});

it('advances only after Playground and gives Trickster its full forty seconds',()=>{
  expect(stageAt(29.99)).toBe(0);expect(stageAt(30)).toBe(1);
  expect(stageRemaining(0)).toBe(30);expect(stageRemaining(30)).toBe(40);
  expect(stageRemaining(70)).toBe(35);
  expect(STAGES[1].learning).toBeGreaterThan(STAGES[0].learning);
  expect(STAGES[1].interval).toBeLessThan(STAGES[0].interval);
});

it('reaches all six stages and awards the bonus only after the finale',()=>{
  expect(ROUND_SECONDS).toBe(215);
  STAGES.forEach((stage,i)=>{expect(stageAt(stageStart(i))).toBe(i);expect(stageRemaining(stageStart(i))).toBe(stage.duration);if(i)expect(stageAt(stageStart(i)-.001)).toBe(i-1);});
  expect(stageRemaining(215)).toBe(0);expect(stageAt(999)).toBe(5);
  expect(scoreFor(214.9,true)).toBe(2149);expect(scoreFor(215,true)).toBe(2250);
});
