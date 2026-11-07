import {GhostMemory} from '../src/game/GhostMemory';
import {HotSeat} from '../src/game/HotSeat';
import {describe,it,expect,vi} from 'vitest';
import {Game} from '../src/game/Game';
import {Arena} from '../src/game/Arena';
import {Player} from '../src/game/Player';
import {Progression} from '../src/game/Progression';
import {LearningEngine} from '../src/intelligence/LearningEngine';
import {RouteTracker} from '../src/intelligence/RouteTracker';
import {DeathReplay} from '../src/game/DeathReplay';
// Exercise real run result/transition methods without constructing a GPU renderer.
function run(practice:number|null){
  const elements=new Map<string,any>();const get=(id:string)=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false});return elements.get(id);};
  const game=Object.create(Game.prototype) as any;
  Object.assign(game,{hud:{root:{dataset:{},classList:{remove:vi.fn()}},get,text:vi.fn(),run:vi.fn(),progression:vi.fn(),allowReset:vi.fn(),overlay:vi.fn(),reveal:vi.fn(),heat:vi.fn(),family:vi.fn()},sound:{stop:vi.fn(),play:vi.fn()},controls:{reset:vi.fn()},controller:{suspend:vi.fn()},cameraRig:{recentre:vi.fn()},progress:new Progression(),engine:new LearningEngine(),tracker:new RouteTracker(),arena:new Arena(),player:new Player(),effects:{group:{visible:false},reset:vi.fn()},replayMarker:{visible:false,position:{set:vi.fn()}},ghostMemory:new GhostMemory(),ghost:{group:{visible:false},load:vi.fn(),update:vi.fn(),mark:vi.fn()},raceMode:false,ghostRoute:null,ghostCompared:0,ghostDifferent:0,ghostBreaks:[],ghostCells:[],familySession:new HotSeat(),familyMode:false,decisions:[],practice,stageIndex:practice??0,elapsed:30,dodges:3,deathReplay:new DeathReplay(),pendingDodges:[]});
  game.tracker.sample({x:0,z:0});return game;
}
describe('practice isolation and real run progression',()=>{
  it('finishes practice without writing learned memory, records or cosmetics',()=>{
    const game=run(0);game.finish(true);
    expect(game.state).toBe('won');expect(game.engine.memory.attempts).toBe(0);expect(game.progress.clears).toBe(0);expect(game.progress.dodges).toBe(0);
    expect(game.hud.reveal.mock.calls[0][0].title).toBe('Practice complete.');
  });
  it('saves completed runs once and rewards real stage clears',()=>{
    const game=run(null);game.stageIndex=5;game.elapsed=215;game.finish(true);
    expect(game.engine.memory.attempts).toBe(1);expect(game.progress.unlockedStage).toBe(5);expect(game.progress.available('mint')).toBe(true);expect(game.progress.available('gold')).toBe(true);
  });
  it('carries movement habits into the next stage without learning the centre reposition',()=>{
    const game=run(null);const samples=game.tracker.habits.samples;game.nextStage();
    expect(game.stageIndex).toBe(1);expect(game.state).toBe('countdown');expect(game.player.y).toBe(0);expect(game.arena.unavailable().size).toBe(0);
    expect(game.tracker.habits.samples).toBe(samples);game.tracker.sample({x:5,z:5},30.2);expect(game.tracker.transitions['0,0>5,5']).toBeUndefined();
  });
});

it('can replay a death repeatedly without saving extra attempts or rewards',()=>{
  const game=run(null);game.player.fallCell={x:5,z:5};
  for(const time of [1,2])game.deathReplay.record(()=>({time,pose:game.player.pose(),tiles:game.arena.snapshot(),stage:0,stageTime:time}),time);
  game.finish(false);expect(game.engine.memory.attempts).toBe(1);
  for(let i=0;i<2;i++){game.watchDeath();expect(game.state).toBe('replay');game.endDeath();expect(game.state).toBe('lost');}
  expect(game.engine.memory.attempts).toBe(1);expect(game.progress.dodges).toBe(3);
});

it('shares learned routes with the next family player and records a turn only once',()=>{
  const game=run(null);game.familySession.begin(['Parent','Child']);game.familyMode=true;game.elapsed=5;game.finish(false);
  expect(game.familySession.current.name).toBe('Parent');expect(game.familySession.current.total).toBe(50);
  expect(game.hud.text).toHaveBeenCalledWith('start','Child · Ready for next turn');
  game.familySession.next();expect(game.familySession.current.name).toBe('Child');
  expect(game.engine.score({x:0,z:0},null,new RouteTracker())).toBeGreaterThan(0);expect(game.engine.memory.attempts).toBe(1);
});

it('makes a cleared stage available as the next ghost while keeping practice recordings isolated',()=>{
  const game=run(null);game.raceMode=true;game.ghostMemory.begin();for(let time=0;time<30;time+=.1)game.ghostMemory.record(time,{x:0,y:0,z:0,facing:0});game.nextStage();
  expect(game.ghostRoute.stage).toBe(0);expect(game.ghost.load).toHaveBeenCalled();expect(game.ghostRoute.duration).toBe(30);
  const practice=run(0);practice.ghostMemory.begin();for(let time=0;time<30;time+=.1)practice.ghostMemory.record(time,{x:0,y:0,z:0,facing:0});practice.finish(true);expect(practice.ghostMemory.source(0)).toBeNull();
});
it('reports measured route divergence instead of claiming every changed tile was an escape',()=>{
  const game=run(null);game.raceMode=true;game.ghostCompared=10;game.ghostDifferent=6;game.ghostBreaks=[{x:1,z:2}];game.finish(false);
  const insight=game.hud.reveal.mock.calls[0][0];expect(insight.memoryRace.explanation).toContain('60% of 10');expect(insight.memoryRace.deviations).toEqual([{x:1,z:2}]);
});
it('adds a visibly marked ghost trap only when the timed escape check permits it',()=>{
  const game=run(null);game.raceMode=true;game.elapsed=4;game.ghostHazard=2;
  game.ghostRoute={stage:0,owner:'Parent',duration:30,points:[{time:0,x:0,y:0,z:0,facing:0},{time:6,x:2,y:0,z:0,facing:0},{time:30,x:0,y:0,z:0,facing:0}]};
  game.updateGhost(.016);expect(game.decisions.some((d:any)=>d.kind==='ghost')).toBe(true);expect(game.ghost.mark).toHaveBeenCalled();
  expect(game.arena.tiles[57].state).toBe('warning');
  const blocked=run(null);blocked.raceMode=true;blocked.elapsed=4;blocked.ghostHazard=2;blocked.ghostRoute=game.ghostRoute;
  for(const tile of blocked.arena.tiles){tile.state='gone';tile.permanent=true;}
  blocked.updateGhost(.016);expect(blocked.decisions).toHaveLength(0);
});
