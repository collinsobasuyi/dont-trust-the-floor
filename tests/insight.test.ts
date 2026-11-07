import { describe, it, expect } from 'vitest';
import { RouteTracker } from '../src/intelligence/RouteTracker';
import { describeRound } from '../src/intelligence/RoundInsight';
import { LearningEngine } from '../src/intelligence/LearningEngine';
import { HazardPlanner } from '../src/intelligence/HazardPlanner';

describe('truthful post-game explanations', () => {
  it('distinguishes route entries from standing still', () => {
    const tracker=new RouteTracker();
    for(let i=0;i<10;i++)tracker.sample({x:3,z:3});
    expect(describeRound(tracker,[],null,false).habit).toBe('Your longest stop was D4.');
    tracker.sample({x:4,z:3});tracker.sample({x:3,z:3});
    expect(describeRound(tracker,[],null,false).habit).toContain('You entered D4 2 times.');
  });
  it('explains an edge fall without claiming a trap killed the player', () => {
    const result=describeRound(new RouteTracker(),[{cell:{x:3,z:3},savedWeight:20,liveWeight:0}],null,false);
    expect(result.title).toBe('The edge got you.');
    expect(result.explanation).toContain('beyond the arena');
    expect(result.fall).toBeNull();
  });
  it('identifies a saved-route influence on the actual missing tile', () => {
    const result=describeRound(new RouteTracker(),[{cell:{x:2,z:4},savedWeight:4,liveWeight:0}],{x:2,z:4},false);
    expect(result.explanation).toContain('Tile C5');
    expect(result.explanation).toContain('saved routes');
    expect(result.title).toBe('The floor read your route.');
  });
  it('labels exploratory hazards without inventing a learned habit', () => {
    const result=describeRound(new RouteTracker(),[{cell:{x:2,z:4},savedWeight:0,liveWeight:0}],{x:2,z:4},false);
    expect(result.title).toBe('One warning too late.');
    expect(result.explanation).toContain('exploratory trap');
  });
  it('keeps a snapshot of the route after the tracker resets', () => {
    const tracker=new RouteTracker();tracker.sample({x:1,z:1});
    const result=describeRound(tracker,[],null,true);tracker.reset();
    expect(result.visits[11]).toBe(1);
    expect(result.title).toBe('You broke the pattern.');
    expect(tracker.entries.every(v=>v===0)).toBe(true);
  });
  it('records live and saved hazard weights at selection time', () => {
    const engine=new LearningEngine(),tracker=new RouteTracker();
    for(let i=0;i<20;i++)tracker.sample({x:1,z:1});
    const planner=new HazardPlanner(engine,()=>0);
    planner.choose({x:3,z:3},tracker,new Set());
    expect(planner.lastDecision?.liveWeight).toBe(42);
    expect(planner.lastDecision?.savedWeight).toBe(0);
    engine.remember(tracker,3);tracker.reset();planner.choose({x:3,z:3},tracker,new Set());
    expect(planner.lastDecision?.savedWeight).toBe(28);
    expect(planner.lastDecision?.liveWeight).toBe(0);
  });
});
it('explains a shrinking ring without attributing it to learned habits',()=>{
  const insight=describeRound(new RouteTracker(),[{cell:{x:0,z:0},savedWeight:0,liveWeight:0,kind:'ring'}],{x:0,z:0},false);
  expect(insight.explanation).toContain('shrinking arena');expect(insight.explanation).not.toContain('exploratory');
});
it('identifies a ghost-route trap without claiming it was a random or hidden collision',()=>{
  const insight=describeRound(new RouteTracker(),[{cell:{x:5,z:5},savedWeight:0,liveWeight:0,kind:'ghost'}],{x:5,z:5},false);
  expect(insight.title).toBe('Your old route caught you.');expect(insight.explanation).toContain('recorded successful ghost route');
});
