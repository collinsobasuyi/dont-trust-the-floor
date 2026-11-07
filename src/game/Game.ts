import { GhostMemory, ghostPose, upcomingGhostCells, type GhostRoute } from './GhostMemory';
import { MemoryGhost } from './MemoryGhost';
import { isFair } from '../intelligence/FairnessValidator';
import { HotSeat } from './HotSeat';
import { threatLevel } from './ThreatLevel';
import { GamepadInput, type ControllerFrame } from './GamepadInput';
import { TVMode } from '../ui/TVMode';
import { controllerMenu } from '../ui/ControllerMenu';
import { DeathReplay } from './DeathReplay';
import { Progression } from './Progression';
import { canEscape, plannedCollapse } from './TemporalSafety';
import { habitText } from '../intelligence/Habits';
import type { RoundInsight } from '../intelligence/RoundInsight';
import * as THREE from 'three';
import { Arena } from './Arena';
import { Controls } from './Controls';
import { Player } from './Player';
import { screenToWorld, FollowCamera } from './CameraRig';
import { World } from './World';
import { StageEffects } from './StageEffects';
import { Sound } from './Sound';
import { COUNTDOWN_SECONDS, ROUND_SECONDS, phaseAt, scoreFor, STAGES, stageRemaining, stageStart, stageAt } from './RunRules';
import { HUD } from '../ui/HUD';
import { LearningEngine } from '../intelligence/LearningEngine';
import { HazardPlanner, type HazardDecision } from '../intelligence/HazardPlanner';
import { describeRound } from '../intelligence/RoundInsight';
import { RouteTracker, cellAt } from '../intelligence/RouteTracker';

type State = 'ready' | 'countdown' | 'playing' | 'paused' | 'lost' | 'won' | 'replay';
export class Game {
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private hud = new HUD();
  private arena = new Arena(this.reducedMotion);
  private player = new Player(this.reducedMotion);
  private world = new World();
  private controller=new GamepadInput();
  private controllerFrame:ControllerFrame|null=null;
  private effects = new StageEffects();
  private tracker = new RouteTracker();
  private sound: Sound;
  private progress: Progression;
  private practice:number|null=null;
  private familySession=new HotSeat();
  private familyMode=false;
  private raceMode=false;
  private ghostMemory:GhostMemory;
  private ghost=new MemoryGhost();
  private ghostRoute:GhostRoute|null=null;
  private ghostHazard=0;
  private ghostCompared=0;
  private ghostDifferent=0;
  private ghostBreaks:{x:number;z:number}[]=[];
  private ghostCells:{x:number;z:number}[]=[];
  private deathReplay=new DeathReplay();
  private replayMarker=new THREE.Mesh(new THREE.RingGeometry(.42,.47,32),new THREE.MeshBasicMaterial({color:0xffc107,side:THREE.DoubleSide,toneMapped:false,depthTest:false}));
  private lastInsight:RoundInsight|null=null;
  private resultWon=false;
  private tauntLeft=0;
  private lastTaunt=0;
  private seenTaunts=new Set<string>();
  private dodges=0;
  private pendingDodges:{cell:{x:number;z:number};due:number;learned?:boolean}[]=[];
  private countdownLeft=COUNTDOWN_SECONDS;
  private countdownNumber=COUNTDOWN_SECONDS;
  private resumeState: 'countdown' | 'playing' = 'playing';
  private phaseIndex=-1;
  private stageIndex=0;
  private toastLeft=0;
  private lastFinal=0;
  private engine: LearningEngine;
  private planner: HazardPlanner;
  private controls: Controls;
  private state: State = 'ready';
  private decisions: HazardDecision[] = [];
  private elapsed=0;
  private sample=0;
  private hazard=0;
  private last=0;
  private visual=0;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42,1,0.1,100);
  private cameraRig=new FollowCamera(this.camera,this.reducedMotion);
  private overviewPreferred=false;
  private renderDirty=true;

  constructor() {
    let storage: Storage | undefined;
    try { storage=window.localStorage; } catch { /* Play without persistent memory. */ }
    new TVMode(this.hud.root,storage);
    this.world.menuScene(true);
    this.engine=new LearningEngine(storage);this.ghostMemory=new GhostMemory(storage);
    this.progress=new Progression(storage);this.hud.progression(this.progress);this.player.setSuit(this.progress.color);
    this.hud.onFullRun=()=>{if(this.state==='paused')this.resume();else this.start();};
    this.hud.onRace=()=>this.start(null,false,true);
    this.hud.onSuit=id=>{if(this.progress.select(id)){this.player.setSuit(this.progress.color);this.hud.progression(this.progress);this.renderDirty=true;}};
    this.hud.onFamily=(names,race)=>{this.familySession.begin(names);this.start(null,true,race);};
    this.hud.onPractice=index=>{if(index<=this.progress.unlockedStage)this.start(index);};
    this.hud.get('watch-death').addEventListener('click',()=>this.watchDeath());
    this.hud.get('death-back').addEventListener('click',()=>this.endDeath());
    this.sound=new Sound(storage);
    this.hud.text('music-toggle',this.sound.musicEnabled?'On':'Off');this.hud.get('music-toggle').setAttribute('aria-pressed',String(this.sound.musicEnabled));
    this.hud.sound(this.sound.enabled,this.sound.available);
    this.hud.get('music-toggle').addEventListener('click',()=>{this.sound.toggleMusic();this.hud.text('music-toggle',this.sound.musicEnabled?'On':'Off');this.hud.get('music-toggle').setAttribute('aria-pressed',String(this.sound.musicEnabled));void this.sound.unlock();});
    this.hud.get('sound').addEventListener('click',()=>{
      this.sound.toggle();
      void this.sound.unlock().then(()=>this.hud.sound(this.sound.enabled,this.sound.available));
      this.hud.sound(this.sound.enabled,this.sound.available);
      (document.activeElement as HTMLElement)?.blur();
    });
    if(!storage)this.engine.persistent=false;
    this.planner=new HazardPlanner(this.engine);
    this.hud.onNavigate=screen=>{
      if(this.state==='replay')this.endDeath();
      this.world.menuScene(screen==='home');this.renderDirty=true;
      if(screen!=='game'&&(this.state==='playing'||this.state==='countdown'))this.togglePause();
      if(screen==='home'&&(this.state==='lost'||this.state==='won')){this.arena.reset();this.player.reset();this.renderDirty=true;}
      this.hud.text('home-play',this.state==='paused'?'▶ Resume run':'▶ Play');
    };
    this.controls=new Controls(this.hud.get('joystick'),this.hud.get('jump') as HTMLButtonElement,()=>this.togglePause());
    this.hud.get('start').addEventListener('click',()=>{
      if(this.state==='paused')this.resume();else if(this.familyMode){this.familySession.next();this.start(null,true,this.raceMode);}else this.start(this.practice,false,this.raceMode);
      (document.activeElement as HTMLElement)?.blur();
    });
    this.hud.get('camera-mode').addEventListener('click',()=>{
      this.overviewPreferred=!this.overviewPreferred;
      this.hud.text('camera-mode',this.overviewPreferred?'View: Overview':'View: Follow');
      this.hud.get('camera-mode').setAttribute('aria-pressed',String(!this.overviewPreferred));
      this.renderDirty=true;(document.activeElement as HTMLElement)?.blur();
    });
    this.hud.get('pause').addEventListener('click',()=>{this.togglePause();(document.activeElement as HTMLElement)?.blur();});
    this.hud.get('clear').addEventListener('click',()=>{
      this.tracker.reset();this.engine.clear();this.ghostMemory.clear();this.refreshMemory();this.hud.text('announcer','Learned routes reset.');
    });
    document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&(this.state==='playing'||this.state==='countdown'))this.togglePause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&(this.state==='playing'||this.state==='countdown'))this.togglePause();});
    window.addEventListener('blur',()=>{this.controller.suspend();if(this.state==='playing'||this.state==='countdown')this.togglePause();});
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    const touchDevice=window.matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,touchDevice?1.25:1.75));
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;
    this.renderer.setClearColor(0x09364b,0);
    this.renderer.domElement.setAttribute('aria-label','Third-person orbital arena with an astronaut runner and glowing platforms');
    this.hud.get('viewport').append(this.renderer.domElement);
    this.scene.fog=new THREE.FogExp2(0x182653,0.011);
    this.replayMarker.rotation.x=-Math.PI/2;this.replayMarker.visible=false;this.scene.add(this.replayMarker);
    this.scene.add(this.arena.group,this.player.mesh,this.world.group,this.effects.group,this.ghost.group);
    this.scene.add(new THREE.HemisphereLight(0xe0efff,0x3e3290,2.1));
    const light=new THREE.DirectionalLight(0xffedd4,3.4);
    light.position.set(-5,8,6);light.castShadow=true;
    const shadowSize=touchDevice?512:1024;
    light.shadow.mapSize.set(shadowSize,shadowSize);
    Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6});
    light.shadow.normalBias=0.03;this.scene.add(light);
    const rim=new THREE.PointLight(0xed4095,35,25);rim.position.set(0,4,-6);this.scene.add(rim);
    const underglow=new THREE.PointLight(0x664dff,22,17);underglow.position.set(0,-3,2);this.scene.add(underglow);
    const resize=()=>{
      const viewport=this.hud.get('viewport'),w=viewport.clientWidth,h=viewport.clientHeight;
      const cap=touchDevice?1.25:1.75;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,cap,this.hud.root.dataset.tv==='on'?Math.sqrt(3686400/Math.max(1,w*h)):cap));
      this.renderer.setSize(w,h);this.cameraRig.resize(w,h);this.renderDirty=true;
    };
    new ResizeObserver(resize).observe(this.hud.get('viewport'));resize();
    this.refreshMemory();this.renderer.setAnimationLoop(time=>this.frame(time));
  }

  private refreshMemory() {
    const m=this.engine.memory;
    this.hud.text('attempts',String(m.attempts).padStart(2,'0'));
    this.hud.text('run-number',String(m.attempts+1).padStart(2,'0'));
    this.hud.text('best',m.attempts?m.best.toFixed(1)+'s':'—');
    this.hud.text('best-score','BEST '+String(m.bestScore).padStart(3,'0'));
    this.hud.text('home-best',String(m.bestScore).padStart(3,'0'));
    this.hud.heat(m.visits.map((v,i)=>v+this.tracker.visits[i]));
    this.hud.text('memory-state',m.attempts?'PATTERNS SAVED':'OBSERVING');
    this.hud.text('storage-note',this.engine.persistent?'Memory saved on this browser.':'Storage unavailable. Memory lasts this session.');
    this.hud.text('memory-copy',m.attempts?'The arena remembers your past routes. Try a different way this time.':'Your habits leave a trace. The arena will use them.');
  }

  private start(practice:number|null=null,family=false,race=false) {
    (document.activeElement as HTMLElement)?.blur();
    this.raceMode=race&&practice===null;this.ghostCompared=0;this.ghostDifferent=0;this.ghostBreaks=[];this.ghostCells=[];
    this.familyMode=family;this.hud.family(family?this.familySession:null);
    this.practice=practice;this.replayMarker.visible=false;this.deathReplay.reset();this.lastInsight=null;this.pendingDodges=[];this.dodges=0;this.tauntLeft=0;this.lastTaunt=0;this.seenTaunts.clear();this.hud.get('arena-taunt').hidden=true;this.hud.get('death-controls').hidden=true;
    this.hud.show('game');this.hud.root.dataset.outcome='';this.world.menuScene(false);
    this.sound.stop();
    this.arena.reset();this.stageIndex=practice??0;this.arena.theme(STAGES[this.stageIndex].color);this.effects.reset();this.player.reset();this.tracker.reset();this.controls.reset();this.controller.suspend();this.cameraRig.recentre();this.hud.hideReveal();
    this.decisions=[];this.elapsed=stageStart(this.stageIndex);this.sample=0;this.hazard=0;this.state='countdown';
    this.loadGhost();
    this.phaseIndex=-1;this.lastFinal=0;this.toastLeft=0;
    this.hud.get('phase-toast').hidden=true;
    this.countdownLeft=COUNTDOWN_SECONDS;this.countdownNumber=COUNTDOWN_SECONDS;
    this.hud.get('countdown').hidden=false;this.hud.text('countdown-number',String(COUNTDOWN_SECONDS));
    this.hud.text('stage-name',`${family?this.familySession.current.name+' · ':practice!==null?'PRACTICE · ':''}${this.stageIndex+1} · ${STAGES[this.stageIndex].name}`);
    this.hud.text('announcer',`${STAGES[this.stageIndex].name}. ${STAGES[this.stageIndex].hint}`);
    void this.sound.unlock().then(()=>{
      this.hud.sound(this.sound.enabled,this.sound.available);
      if(this.state==='countdown')this.sound.play('countdown');
    });
    this.hud.get('overlay').hidden=true;this.hud.text('arena-status','GET READY');
    this.hud.root.classList.remove('is-playing');
    (this.hud.get('pause') as HTMLButtonElement).disabled=false;
    this.hud.allowReset(false);
    this.hud.text('pause','Ⅱ Pause arena');this.refreshMemory();
  }

  private nextStage() {
    this.saveGhostStage();
    this.progress.clearStage(this.stageIndex);this.hud.progression(this.progress);this.player.celebrate();this.pendingDodges=[];this.deathReplay.reset();
    const previous=STAGES[this.stageIndex].name;this.stageIndex++;this.state='countdown';this.controls.reset();this.sound.stop();
    this.arena.reset();this.arena.theme(STAGES[this.stageIndex].color);this.effects.reset();this.player.reset();this.tracker.beginSegment();this.player.celebrate();this.controller.suspend();this.cameraRig.recentre();
    this.loadGhost();
    this.hazard=0;this.sample=0;this.phaseIndex=-1;this.lastFinal=0;
    this.countdownLeft=COUNTDOWN_SECONDS;this.countdownNumber=COUNTDOWN_SECONDS;
    this.hud.text('stage-name',`${this.stageIndex+1} · ${STAGES[this.stageIndex].name}`);
    this.hud.text('countdown-number',String(COUNTDOWN_SECONDS));this.hud.get('countdown').hidden=false;
    this.hud.root.classList.remove('is-playing');
    this.hud.text('phase-toast',`${previous} CLEAR → ${STAGES[this.stageIndex].name} · ${STAGES[this.stageIndex].hint}`);
    this.hud.get('phase-toast').hidden=false;
    this.hud.text('arena-status',STAGES[this.stageIndex].name+' · GET READY');
    this.hud.text('announcer',`${previous} complete. Returned to the centre. ${STAGES[this.stageIndex].hint}`);
    this.sound.play('phase');
  }

  private togglePause() {
    if(this.state==='paused'){this.resume();return;}
    if(this.state!=='playing'&&this.state!=='countdown')return;
    this.resumeState=this.state;this.sound.stop();this.hud.get('countdown').hidden=true;this.hud.get('phase-toast').hidden=true;
    this.state='paused';this.hud.get('arena-taunt').hidden=true;this.controls.reset();this.hud.text('arena-status','PAUSED');
    this.hud.overlay('Take a breath.','The arena is paused. Your time and the floor will wait.','Resume arena ↗','PATTERN INTERRUPTED');
    this.hud.text('pause','▷ Resume arena');
  }

  private resume() {
    (document.activeElement as HTMLElement)?.blur();
    this.world.menuScene(false);this.renderDirty=true;
    this.state=this.resumeState;this.controls.reset();this.controller.suspend();this.hud.get('overlay').hidden=true;
    this.hud.get('countdown').hidden=this.state!=='countdown';
    this.hud.get('phase-toast').hidden=this.state!=='playing'||this.toastLeft<=0;
    this.hud.text('arena-status',this.state==='countdown'?'GET READY':phaseAt(this.elapsed).name+' · LIVE');
    this.hud.text('pause','Ⅱ Pause arena');
    void this.sound.unlock().then(()=>this.hud.sound(this.sound.enabled,this.sound.available));
  }

  private finish(won: boolean, beam=false) {
    if(won)this.saveGhostStage();
    this.ghost.group.visible=false;this.hud.get('ghost-banner').hidden=true;
    this.hud.root.dataset.outcome=won?'won':'lost';
    this.state=won?'won':'lost';this.controls.reset();this.sound.stop();this.sound.play(won?'win':'fall');
    this.hud.get('phase-toast').hidden=true;this.hud.get('countdown').hidden=true;
    this.displayRun(won);this.hud.root.classList.remove('is-playing');
    const insight=describeRound(this.tracker,this.decisions,won?null:this.player.fallCell,won);
    if(this.practice!==null&&won){insight.title='Practice complete.';insight.explanation=`${STAGES[this.stageIndex].name} cleared.`;}
    if(this.raceMode)insight.memoryRace={explanation:this.ghostCompared?`You chose a different tile for ${Math.round(this.ghostDifferent/this.ghostCompared*100)}% of ${this.ghostCompared} comparable ghost samples. ↗ marks where you broke the old route.`:'No ghost comparison yet. Clear a stage to record a successful route for your next lap.',deviations:this.ghostBreaks.map(c=>({...c})),ghost:this.ghostCells.map(c=>({...c}))};
    this.lastInsight=insight;this.resultWon=won;
    if(won)this.progress.clearStage(this.stageIndex,this.practice!==null);
    const oldBest=this.engine.memory.bestScore;
    this.progress.finish(scoreFor(this.elapsed,won),oldBest,this.dodges,this.practice!==null);
    this.hud.progression(this.progress);
    if(beam){insight.title='The sweeper caught you.';insight.explanation='The orange beam reached you near the floor. Jump over it when it approaches; route memory did not cause this collision.';insight.fall=null;}
    if(this.practice!==null)insight.explanation+=' Practice does not change saved scores, routes or unlocks.';
    this.hud.get('arena-taunt').hidden=true;this.tauntLeft=0;
    this.effects.group.visible=false;this.arena.reveal(insight.visits,insight.fall);
    if(this.practice===null)this.engine.remember(this.tracker,this.elapsed,scoreFor(this.elapsed,won));this.tracker.reset();this.refreshMemory();
    (this.hud.get('pause') as HTMLButtonElement).disabled=true;
    this.hud.allowReset(true);
    this.hud.text('arena-status',won?'ROUND COMPLETE':'FOOTPRINT REVEALED');
    this.hud.overlay(insight.title,insight.explanation,won?'Outsmart it again ↗':'Break the pattern ↗',won?'SURVIVAL CONFIRMED':'THE ARENA REMEMBERS');
    if(this.familyMode){this.familySession.record(scoreFor(this.elapsed,won));this.hud.family(this.familySession,true);this.hud.text('start',`${this.familySession.nextName} · Ready for next turn`);this.hud.text('overlay-eyebrow',`${this.familySession.current.name} · Turn ${this.familySession.turn}`);}
    this.hud.reveal(insight,this.practice===null?this.elapsed:this.elapsed-stageStart(this.practice));
    (this.hud.get('watch-death') as HTMLButtonElement).disabled=won||this.deathReplay.frames.length<2;
    this.hud.text('unlock-note',this.dodges?`${this.dodges} learned traps escaped this run. Check your earned suits.`:'Cosmetics change your look, never your abilities.');
  }

  private saveGhostStage(){
    if(this.practice!==null)return;
    this.ghostMemory.record(STAGES[this.stageIndex].duration,this.player.pose(),true);
    this.ghostMemory.clearStage(this.stageIndex,this.familyMode&&this.raceMode?this.familySession.current.name:'You');
  }
  private loadGhost(){
    this.ghostRoute=this.raceMode?this.ghostMemory.source(this.stageIndex):null;this.ghost.load(this.ghostRoute);this.ghostHazard=0;
    this.ghostMemory.begin();this.ghostMemory.record(0,this.player.pose(),true);
    this.hud.get('ghost-banner').hidden=!this.raceMode;
    this.hud.text('ghost-banner',this.ghostRoute?`GHOST · ${this.ghostRoute.owner==='You'?'Your':this.ghostRoute.owner+"’s"} successful ${STAGES[this.ghostRoute.stage].name} route · purple echo, orange warnings`:'RACE YOUR MEMORY · No successful route yet. Clear this stage to record your ghost.');
    if(this.ghostRoute)for(const point of this.ghostRoute.points){const cell=cellAt(point.x,point.z);if(cell&&!this.ghostCells.some(c=>c.x===cell.x&&c.z===cell.z))this.ghostCells.push(cell);}
  }
  private updateGhost(dt:number){
    const time=this.elapsed-stageStart(this.stageIndex);this.ghostMemory.record(time,this.player.pose());
    if(!this.raceMode||!this.ghostRoute)return;
    this.ghost.update(this.ghostRoute,time);this.ghostHazard+=dt;
    if(time>this.ghostRoute.duration)this.hud.text('ghost-banner','GHOST LAP COMPLETE · Keep improvising until the stage ends.');
    if(time>2&&this.ghostHazard>=1.4){
      this.ghostHazard=0;
      const current=cellAt(this.player.x,this.player.z);
      const target=upcomingGhostCells(this.ghostRoute,time).find(cell=>isFair(cell,current,this.arena.unavailable())&&canEscape(this.arena,this.player,this.stageIndex,time,plannedCollapse([cell],1.25)));
      if(target){this.arena.warn(target);this.ghost.mark(target,time+1.25);this.sound.play('warning');this.decisions.push({cell:target,savedWeight:0,liveWeight:0,kind:'ghost'});if(current?.x===target.x&&current.z===target.z)this.pendingDodges.push({cell:target,due:this.elapsed+1.45,learned:true});}
    }
  }
  private compareGhost(){
    if(!this.raceMode||!this.ghostRoute||!this.player.grounded)return;
    const pose=ghostPose(this.ghostRoute,this.elapsed-stageStart(this.stageIndex)),current=cellAt(this.player.x,this.player.z);
    if(!pose||pose.y>.12||!current)return;const old=cellAt(pose.x,pose.z);if(!old)return;
    this.ghostCompared++;if(current.x!==old.x||current.z!==old.z){this.ghostDifferent++;if(!this.ghostBreaks.some(c=>c.x===current.x&&c.z===current.z))this.ghostBreaks.push(current);}
  }

  private displayRun(won:boolean){
    this.hud.run(this.elapsed,won);
    if(this.practice!==null)this.hud.text('score',String(Math.floor((this.elapsed-stageStart(this.practice))*10)).padStart(3,'0'));
  }
  private watchDeath(){
    if(!this.lastInsight||!this.deathReplay.start())return;
    this.state='replay';this.sound.stop();this.controls.reset();this.hud.get('overlay').hidden=true;this.hud.get('reopen-reveal').hidden=true;this.hud.get('arena-taunt').hidden=true;this.hud.get('death-controls').hidden=false;
    const cell=this.lastInsight.fall;if(cell){this.replayMarker.position.set(cell.x-4.5,.04,cell.z-4.5);this.replayMarker.visible=true;}
  }
  private endDeath(){
    this.ghost.group.visible=false;this.replayMarker.visible=false;this.deathReplay.playing=false;this.state=this.resultWon?'won':'lost';this.effects.reset();this.hud.get('death-controls').hidden=true;
    this.player.mesh.position.set(this.player.x,this.player.y,this.player.z);
    if(this.lastInsight)this.arena.reveal(this.lastInsight.visits,this.lastInsight.fall);
    this.hud.get('overlay').hidden=false;this.renderDirty=true;
  }

  private showPhase() {
    const phase=phaseAt(this.elapsed);
    this.phaseIndex=phase.index;this.toastLeft=2.4;
    this.hud.text('phase-toast',`${this.stageIndex+1} / ${STAGES[this.stageIndex].name} — ${STAGES[this.stageIndex].hint}`);
    this.hud.get('phase-toast').hidden=false;
    this.hud.text('arena-status',STAGES[this.stageIndex].name+' · LIVE');
    this.hud.text('announcer',phase.name+'. '+phase.hint);
    this.sound.stage(this.stageIndex);
  }

  private frame(time: number) {
    const dt=Math.min((time-this.last)/1000||0,0.04);this.last=time;
    if(document.hidden){this.controller.suspend();return;}
    this.controllerFrame=this.controller.poll(dt);
    const pad=this.controllerFrame;
    this.hud.text('controller-status',pad.connected?pad.label+' · Left stick move · Right stick look · × jump · Options pause':pad.label);
    this.hud.root.dataset.controller=pad.connected?'on':'off';
    if(pad.disconnected&&(this.state==='playing'||this.state==='countdown')){this.togglePause();this.hud.text('overlay-copy','Controller disconnected. Reconnect and release the sticks, then press Options to resume. Keyboard and touch still work.');}
    const menu=this.hud.root.dataset.screen!=='game'||this.state==='ready'||this.state==='paused'||this.state==='lost'||this.state==='won';
    if(menu){
      controllerMenu(this.hud.root,pad);
      if(pad.back){if(this.state==='paused'&&this.hud.root.dataset.screen==='game')this.resume();else{this.hud.onNavigate('home');this.hud.show('home');}}
      if(pad.pause&&this.state==='paused'){this.hud.show('game');this.resume();}
    }else{
      if(pad.pause)this.togglePause();
      if(pad.back&&this.state==='replay')this.endDeath();
      if(pad.recentre){this.cameraRig.recentre();this.renderDirty=true;}
      if(this.state==='playing'||this.state==='countdown'){this.cameraRig.lookAround(pad.look,dt);if(Math.hypot(pad.look.x,pad.look.y)>0)this.renderDirty=true;}
    }
    this.hud.tick(dt);
    if(this.state==='replay'){
      if(this.hud.root.dataset.screen!=='game'){this.endDeath();return;}
      const frame=this.deathReplay.advance(dt);
      if(frame){this.ghost.group.visible=this.raceMode&&!!this.ghostRoute;if(this.ghostRoute)this.ghost.update(this.ghostRoute,frame.stageTime);this.arena.theme(STAGES[frame.stage].color);this.arena.restore(frame.tiles,frame.time);this.player.showPose(frame.pose);this.effects.update(frame.stage,frame.stageTime,this.arena,frame.pose,cellAt(frame.pose.x,frame.pose.z));this.arena.restore(frame.tiles,frame.time);this.world.menuScene(this.overviewPreferred);this.cameraRig.setMode(this.overviewPreferred?'overview':'follow',frame.pose.x,frame.pose.z);this.cameraRig.update(frame.pose.x,frame.pose.z,dt);this.hud.text('death-caption',`Last moments · ${(frame.time-this.deathReplay.frames[0].time).toFixed(1)}s · ${this.lastInsight?.explanation??''}`);this.renderer.render(this.scene,this.camera);}
      if(!this.deathReplay.playing)this.endDeath();return;
    }
    const screen=this.hud.root.dataset.screen;
    this.ghost.group.visible=this.raceMode&&!!this.ghostRoute&&screen==='game'&&(this.state==='playing'||this.state==='countdown'||this.state==='paused');
    this.effects.group.visible=screen==='game'&&STAGES[this.stageIndex].sweep&&(this.state==='playing'||(this.state==='paused'&&this.resumeState==='playing'));
    const follow=screen==='home'||(screen==='game'&&(this.state==='playing'||this.state==='countdown'||this.state==='paused')&&!this.overviewPreferred);
    this.world.menuScene(screen==='home'||!follow);
    if(this.cameraRig.setMode(follow?'follow':'overview',this.player.x,this.player.z))this.renderDirty=true;
    if(this.state==='paused'||(screen!=='home'&&screen!=='game')) {
      if(this.renderDirty){this.renderer.render(this.scene,this.camera);this.renderDirty=false;}
      return;
    }
    {
      this.visual+=dt;
      this.world.update(this.visual,this.reducedMotion);
      if(this.state==='ready'||this.state==='won'||this.state==='countdown')this.player.idle(dt);
    }
    if(this.state==='countdown') {
      this.countdownLeft=Math.max(0,this.countdownLeft-dt);
      const number=Math.ceil(this.countdownLeft);
      if(number>0&&number!==this.countdownNumber){
        this.countdownNumber=number;this.hud.text('countdown-number',String(number));this.sound.play('countdown');
      }
      if(this.countdownLeft<=0){
        this.state='playing';this.controls.reset();this.hud.get('countdown').hidden=true;
        this.hud.root.classList.add('is-playing');this.sound.play('start');this.showPhase();
      }
    }
    else if(this.state==='playing') {
      this.elapsed=Math.min(stageStart(this.stageIndex)+STAGES[this.stageIndex].duration,this.elapsed+dt);this.sample+=dt;this.hazard+=dt;
      if(this.arena.update(dt,this.visual)>0)this.sound.play('collapse');
      const grounded=this.player.grounded;
      const jump=this.controls.jump()||pad.jump;
      const jumped=this.player.update(dt,screenToWorld(this.controls.movement(pad.move),this.cameraRig.mode==='follow'?this.cameraRig.yaw:0),jump,this.arena);
      if(jumped)this.sound.play('jump');
      if(!grounded&&this.player.grounded)this.sound.play('land');
      if(phaseAt(this.elapsed).index!==this.phaseIndex)this.showPhase();
      this.toastLeft=Math.max(0,this.toastLeft-dt);
      if(this.toastLeft<=0)this.hud.get('phase-toast').hidden=true;
      const remaining=Math.ceil(stageRemaining(this.elapsed));
      if(remaining>=1&&remaining<=5&&remaining!==this.lastFinal){this.lastFinal=remaining;this.sound.play('final');}
      if(this.sample>=0.18) {
        this.sample=0;this.compareGhost();
        const cell=cellAt(this.player.x,this.player.z);
        if(cell&&this.player.grounded)this.tracker.sample(cell,this.elapsed);
        if(this.elapsed-this.lastTaunt>=12&&this.tracker.habits.samples>=12){
          const text=habitText(this.tracker.habits);
          if(!text.startsWith('You spread')&&!this.seenTaunts.has(text)){this.seenTaunts.add(text);this.lastTaunt=this.elapsed;this.tauntLeft=4;this.hud.text('arena-taunt','“'+text+' I’m taking notes.”');this.hud.get('arena-taunt').hidden=false;}
        }
        this.hud.heat(this.engine.memory.visits.map((v,i)=>v+this.tracker.visits[i]));
      }
      const interval=STAGES[this.stageIndex].interval;
      if((this.elapsed-stageStart(this.stageIndex))>2&&this.hazard>=interval&&this.player.y>=0) {
        this.hazard=0;
        const target=this.planner.choose(cellAt(this.player.x,this.player.z),this.tracker,this.arena.unavailable(),STAGES[this.stageIndex].learning,cell=>canEscape(this.arena,this.player,this.stageIndex,this.elapsed-stageStart(this.stageIndex),plannedCollapse([cell],1.25)));
        if(target){this.arena.warn(target);this.sound.play('warning');if(this.planner.lastDecision){this.decisions.push(this.planner.lastDecision);const current=cellAt(this.player.x,this.player.z);if(current&&current.x===target.x&&current.z===target.z)this.pendingDodges.push({cell:target,due:this.elapsed+1.45,learned:current.x===target.x&&current.z===target.z&&(this.planner.lastDecision.liveWeight>0||this.planner.lastDecision.savedWeight>0)});}}
      }
      this.updateGhost(dt);
      const effect=this.effects.update(this.stageIndex,this.elapsed-stageStart(this.stageIndex),this.arena,this.player,cellAt(this.player.x,this.player.z));
      if(effect.targets.length){this.sound.play('warning');for(const cell of effect.targets)this.decisions.push({cell,savedWeight:0,liveWeight:0,kind:cell.kind});}
      this.deathReplay.record(()=>({time:this.elapsed,pose:this.player.pose(),tiles:this.arena.snapshot(),stage:this.stageIndex,stageTime:this.elapsed-stageStart(this.stageIndex)}),this.elapsed);
      const current=cellAt(this.player.x,this.player.z);
      this.pendingDodges=this.pendingDodges.filter(d=>{if(this.elapsed<d.due)return true;if(this.player.grounded&&current&&(current.x!==d.cell.x||current.z!==d.cell.z)){if(d.learned)this.dodges++;this.sound.escape();}return false;});
      this.tauntLeft=Math.max(0,this.tauntLeft-dt);this.hud.get('arena-taunt').hidden=this.tauntLeft<=0;
      if(effect.hit||this.player.y<-3)this.deathReplay.record(()=>({time:this.elapsed,pose:this.player.pose(),tiles:this.arena.snapshot(),stage:this.stageIndex,stageTime:this.elapsed-stageStart(this.stageIndex)}),this.elapsed,true);
      this.sound.pulse(dt,threatLevel(this.arena,this.player,this.stageIndex,this.elapsed-stageStart(this.stageIndex)));
      if(effect.hit)this.finish(false,true);
      else if(this.player.y<-3)this.finish(false);
      else if(this.elapsed>=ROUND_SECONDS||(this.practice!==null&&this.elapsed>=stageStart(this.stageIndex)+STAGES[this.stageIndex].duration))this.finish(true);
      else if(stageAt(this.elapsed)>this.stageIndex)this.nextStage();
    }
    this.cameraRig.update(this.player.x,this.player.z,dt);
    this.displayRun(this.state==='won');
    const left=Math.max(0,stageStart(this.stageIndex)+STAGES[this.stageIndex].duration-this.elapsed);
    this.hud.text('time',left.toFixed(1));
    this.hud.get('time-fill').style.width=`${(left/STAGES[this.stageIndex].duration)*100}%`;
    this.renderer.render(this.scene,this.camera);this.renderDirty=false;
  }
}
