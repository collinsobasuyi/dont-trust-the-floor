import {describe,it,expect} from 'vitest';
import {RouteReplay} from '../src/ui/RouteReplay';
import {RouteTracker} from '../src/intelligence/RouteTracker';
import {describeRound} from '../src/intelligence/RoundInsight';
const points=[{cell:{x:1,z:1},time:0.2},{cell:{x:2,z:1},time:1},{cell:{x:3,z:1},time:2.5}];
describe('recorded route playback',()=>{
  it('advances against recorded time and stops at the final point',()=>{
    const replay=new RouteReplay();replay.load(points);replay.toggle();replay.advance(0.9);
    expect(replay.index).toBe(1);replay.advance(10);expect(replay.index).toBe(2);expect(replay.time).toBe(2.5);expect(replay.playing).toBe(false);
  });
  it('pauses, scrubs, and restarts playback without changing the recording',()=>{
    const replay=new RouteReplay();replay.load(points);replay.toggle();replay.advance(1);replay.toggle();const time=replay.time;replay.advance(4);expect(replay.time).toBe(time);
    replay.seek(99);expect(replay.index).toBe(2);replay.toggle();expect(replay.index).toBe(0);expect(replay.playing).toBe(true);expect(points[0].time).toBe(0.2);
  });
  it('does not play an empty or one-point route and clears a previous replay',()=>{
    const replay=new RouteReplay();replay.load(points);replay.toggle();replay.load([]);replay.toggle();replay.advance(10);expect(replay.index).toBe(0);expect(replay.playing).toBe(false);
    replay.load([points[0]]);replay.toggle();expect(replay.playing).toBe(false);
  });
  it('snapshots timestamped samples before the live run resets',()=>{
    const tracker=new RouteTracker();tracker.sample({x:1,z:1},0.24);tracker.sample({x:2,z:1},0.7);
    const insight=describeRound(tracker,[],null,false);tracker.reset();
    expect(insight.path).toEqual([{cell:{x:1,z:1},time:0.24},{cell:{x:2,z:1},time:0.7}]);expect(tracker.trail).toEqual([]);
  });
});
it('keeps Playground memory while separating the safe stage reposition from walked routes',()=>{
  const tracker=new RouteTracker();tracker.sample({x:1,z:1},29.8);
  tracker.beginSegment();tracker.sample({x:5,z:5},30.2);
  expect(tracker.visits[11]).toBe(1);expect(tracker.visits[55]).toBe(1);
  expect(tracker.transitions['1,1>5,5']).toBeUndefined();
  const insight=describeRound(tracker,[],null,false), replay=new RouteReplay();replay.load(insight.path);
  expect(replay.points[1].breakBefore).toBe(true);
});
