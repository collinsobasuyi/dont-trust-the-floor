import type { HotSeat } from '../game/HotSeat';
import { SUITS, type Progression } from '../game/Progression';
import { SIZE } from '../intelligence/RouteTracker';
import { phaseAt, scoreFor, STAGES } from '../game/RunRules';
import { cellName, type RoundInsight } from '../intelligence/RoundInsight';
import { RouteReplay } from './RouteReplay';

type Screen='home'|'how'|'settings'|'game'|'analysis'|'practice'|'family';
const warden=`<svg class="warden-art" viewBox="0 0 400 400" aria-hidden="true"><defs><linearGradient id="hood" x2="1" y2="1"><stop stop-color="#8d29b4"/><stop offset=".45" stop-color="#211444"/><stop offset="1" stop-color="#080d25"/></linearGradient><radialGradient id="aura"><stop stop-color="#e91cc7" stop-opacity=".32"/><stop offset="1" stop-color="#5b20c0" stop-opacity="0"/></radialGradient><filter id="eyes"><feGaussianBlur stdDeviation="4"/></filter></defs><circle cx="200" cy="190" r="190" fill="url(#aura)"/><path d="M32 348 Q58 259 104 208 Q114 84 199 33 Q286 83 298 208 Q347 260 370 348 Q200 397 32 348" fill="url(#hood)" stroke="#9d34c6" stroke-width="3"/><path d="M113 225 Q121 112 200 63 Q277 117 286 225 L246 285 L154 285Z" fill="#060a20" stroke="#44216e" stroke-width="3"/><path d="M143 160 L188 182 L183 194 L150 184Z M257 160 L212 182 L217 194 L250 184Z" fill="#f72cd4" filter="url(#eyes)"/><path d="M143 160 L188 182 L183 194 L150 184Z M257 160 L212 182 L217 194 L250 184Z" fill="#ff6bdf"/><path d="M113 225 L154 285 L105 333 M286 225 L246 285 L295 333" fill="none" stroke="#642787" stroke-width="4"/></svg>`;
const tileArt=(kind:string)=>`<div class="tile-art ${kind}"><i></i><i></i><i></i><i></i><span><svg viewBox="0 0 50 70" aria-hidden="true"><g stroke="#bff4ff" stroke-width="4" stroke-linecap="round"><circle cx="25" cy="14" r="11" fill="#dceeff"/><rect x="18" y="9" width="14" height="9" rx="4" fill="#163153" stroke="none"/><path d="M18 31 L15 47 L9 62 M31 31 L34 47 L41 58 M15 31 L7 41 M34 31 L43 22" fill="none"/><rect x="16" y="28" width="18" height="18" rx="5" fill="#539ac7"/></g></svg></span></div>`;

export class HUD {
  root:HTMLElement;
  onRace:()=>void=()=>{};
  onFamily:(names:string[],race:boolean)=>void=()=>{};
  onFullRun:()=>void=()=>{};
  onPractice:(index:number)=>void=()=>{};
  onSuit:(id:string)=>void=()=>{};
  onNavigate:(screen:Screen)=>void=()=>{};
  private replay=new RouteReplay();
  constructor() {
    this.root=document.querySelector<HTMLElement>('#app')!;
    this.root.dataset.screen='home';
    this.root.innerHTML=`
      <div class="starfield" aria-hidden="true"></div>
      <header class="app-bar"><button class="mini-brand" data-page="home" aria-label="Home">◈ <span>DTTF<span class="brand-slash"> / </span>MEMORY MODE</span></button><nav aria-label="Game menu"><button id="tv-mode" aria-pressed="false">TV mode</button><button data-page="how" aria-label="How it works">?</button><button data-page="settings" aria-label="Settings">⚙</button></nav></header>
      <div id="controller-status" class="controller-status" role="status">Keyboard / touch · controller ready</div><main class="game-shell">
        <section class="arena-panel" aria-label="Learning arena">
          <div class="warden">${warden}</div><div id="viewport"></div>
          <div class="game-top">
            <div class="glass run-box"><span><span id="stage-name">PLAYGROUND</span> · RUN <b id="run-number">01</b></span><strong>◷ <span id="time">30.0</span><small>s</small></strong><div class="time-track"><div id="time-fill"></div></div></div>
            <div class="mood-badge"><span class="brain-icon"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M16 7 C11 0 5 5 7 10 C1 12 2 18 6 20 C3 26 10 30 16 25 C22 30 29 26 26 20 C30 18 31 12 25 10 C27 5 21 0 16 7Z"/><path d="M16 7 V25 M7 10 L11 13 L9 17 M6 20 L11 19 L12 24 M25 10 L21 13 L23 17 M26 20 L21 19 L20 24 M11 13 L16 15 L21 13"/></svg></span><div><small>ARENA STATUS</small><strong id="arena-mood">WATCHING</strong><span id="arena-status">AWAITING PLAYER</span></div></div>
            <div class="glass score-box"><small>SCORE</small><strong id="score">000</strong><span id="best-score">BEST 000</span></div>
          </div>
          <div id="ghost-banner" class="ghost-banner" hidden></div><div id="family-banner" class="family-banner" hidden></div><div id="arena-taunt" class="arena-taunt" role="status" hidden></div><div id="death-controls" class="death-controls" hidden><span id="death-caption"></span><button id="death-back" class="secondary">Back to results</button></div><div id="phase-toast" class="phase-toast" hidden></div>
          <div id="countdown" class="countdown" hidden><strong id="countdown-number">3</strong><span>GET READY</span></div>
          <div class="game-bottom"><span><i class="legend safe"></i> SAFE <i class="legend warning"></i> WARNING <i class="legend gone"></i> FALLEN</span><div><button id="sound" aria-label="Sound" aria-pressed="true">♪ Sound on</button><button id="camera-mode" aria-label="Follow camera" aria-pressed="true">View: Follow</button><button id="pause" disabled>Ⅱ Pause</button></div></div>
          <div class="phase-meter" aria-label="Run progression">${STAGES.map((s,i)=>`<span id="phase-${i}" title="${s.name}">${i+1}</span>`).join('')}</div>
          <div class="mobile-controls"><div id="joystick" aria-label="Movement joystick"><span></span><i>⌃</i></div><button id="jump" aria-label="Jump">⌃<small>JUMP</small></button></div>
          <button id="reopen-reveal" class="inspect-back secondary" hidden>← Back to results</button>
          <div id="overlay" class="overlay" hidden><div class="overlay-card"><span class="card-kicker" id="overlay-eyebrow">THE ARENA REMEMBERS</span><h2 id="overlay-title">Your habits left a trace.</h2><p id="overlay-copy"></p><div id="run-reveal" hidden><div class="result-stats"><div><small>SCORE</small><b id="result-score">000</b></div><div><small>SURVIVED</small><b id="reveal-duration">0.0s</b></div></div><p class="habit-line" id="reveal-habit"></p><p id="ghost-result" class="ghost-result" hidden></p><div class="result-map-row"><div id="reveal-map" class="reveal-map" role="img" aria-label="Your footprint"></div><p>Every step teaches the floor.<br><span>Try a different route.</span></p></div><div id="family-results" class="family-results" hidden></div><div class="result-actions"><button id="watch-death" class="secondary">↶ Watch last moments</button><button id="open-analysis" class="secondary">▥ View heatmap</button><button id="inspect-route" class="text-button">Inspect arena ↗</button></div></div><button id="start" class="primary">▶ Try again</button><button class="text-button overlay-home" data-page="home">⌂ Home</button></div></div>
        </section>
        <section id="home-screen" class="page home-page" aria-label="Home">
          <div class="home-copy"><span class="eyebrow">THE ARENA LEARNS HOW YOU MOVE</span><h1>DON’T TRUST<br>THE FLOOR<span>MEMORY MODE</span></h1><p class="home-tagline">Your own muscle memory <br>becomes the trap.</p><div class="home-actions"><button id="home-play" class="primary">▶ Play</button><button class="secondary" data-page="how">◈ How it works</button><button id="race-play" class="secondary">◈ Race your memory</button><button class="secondary" data-page="family">♧ Family hot-seat</button><button class="secondary" data-page="practice">◇ Stage practice</button><button class="secondary" data-page="settings">⚙ Settings & suits</button></div><div class="best-card"><span>🏆</span><div><small>PERSONAL BEST</small><strong id="home-best">000</strong><p>Best survival <b id="best">—</b></p></div></div><p id="home-controls" class="home-controls">WASD / ARROWS · SPACE TO JUMP<br><span>Six stages. One learning arena. No predictable moves.</span></p></div><div class="home-world-label"><span class="live-dot"></span> THE LEARNING ARENA <small>YOUR NEXT STEP IS A LESSON.</small></div>
        </section>
        <section id="how-screen" class="page modal-page" hidden><div class="page-card tutorial"><button class="back-button" data-page="home" aria-label="Back to home">←</button><span class="eyebrow">OUTSMART YOUR OWN HABITS</span><h2>HOW IT WORKS</h2><div class="steps"><article>${tileArt('cyan')}<span class="step-number">1</span><h3>MOVE & SURVIVE</h3><p>Run, jump, and find a safe path. Survive six stages: route traps, sweepers, shrinking rings and shifting stripes.</p></article><article>${tileArt('purple')}<span class="step-number">2</span><h3>THE ARENA REMEMBERS</h3><p>Your steps leave a footprint. Repeated routes influence future traps.</p></article><article>${tileArt('danger')}<span class="step-number">3</span><h3>BREAK YOUR PATTERN</h3><p>Race Your Memory adds a purple ghost from a successful stage. No ghost until your first clear. Pink and orange tiles will fall. Change course before they collapse.</p></article></div><div class="stage-list" aria-label="Six-stage run">${STAGES.map((stage,i)=>`<div><b>${i+1} · ${stage.name}</b><span>${stage.duration}s</span></div>`).join('')}</div><div class="tutorial-keys"><span><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> MOVE</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>ESC</kbd> PAUSE</span></div><p class="touch-hint">Controller: left stick moves · right stick looks · Cross jumps · Options pauses. On your phone: joystick + Jump.</p><button id="tutorial-play" class="primary">▶ Play now</button></div></section>
        <section id="settings-screen" class="page modal-page" hidden><div class="page-card settings-card"><button class="back-button" data-page="home" aria-label="Back to home">←</button><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>SETTINGS</h2><div class="tv-settings"><button id="fullscreen" class="secondary">Enter full screen · F</button><p id="tv-status" role="status"></p><h3>Controller setup</h3><p>Connect your DualSense by USB or Bluetooth, then press a controller button. Left stick moves, right stick looks, Cross (×) jumps / selects, Circle (○) goes back, Options pauses, and R3 centres the camera. D-pad moves through menus. Other standard-mapped controllers use their equivalent buttons.</p><p>Single-player controller test. Local multiplayer is planned for a later branch.</p></div><div class="setting-row"><div><h3>Sound effects</h3><p>Warnings, jumps, and little victories.</p></div><button id="settings-sound" class="secondary">Sound on</button></div><div class="setting-row"><div><h3>Arena heartbeat</h3><p>Rhythmic music builds near danger, then pauses after an escape. Uses the main sound switch.</p></div><button id="music-toggle" class="secondary" aria-pressed="true">On</button></div><div class="setting-row"><div><h3>Motion effects</h3><p>Follows your device’s reduced-motion setting.</p></div><span id="motion-setting">System</span></div><div class="wardrobe"><h3>Earned suits</h3><p id="unlock-note">Cosmetics change your look, never your abilities.</p><div id="suit-options"></div></div><div class="saved-memory"><div><h3>Arena memory</h3><p id="memory-copy"></p><p><b id="attempts">00</b> saved attempts · <span id="memory-state">OBSERVING</span></p></div><div id="heatmap" class="heatmap" aria-label="Saved movement heatmap"></div></div><button id="clear" class="secondary danger-button">↺ Reset learned routes & scores</button><p class="storage-note" id="reset-hint">Clears saved routes, successful ghosts, attempts, and personal bests.</p><p class="storage-note" id="storage-note"></p></div></section>
        <section id="family-screen" class="page modal-page" hidden><div class="page-card family-card"><button class="back-button" data-page="home" aria-label="Back to home">←</button><span class="eyebrow">ONE CONTROLLER. ONE VERY NOSY ARENA.</span><h2>FAMILY HOT-SEAT</h2><p>Take turns through the six-stage run. The arena keeps its shared memory, so the next player inherits the routes you taught it.</p><form id="family-form"><label for="family-count">Players</label><select id="family-count"><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select><label class="race-option"><input id="family-race" type="checkbox"/> Race Your Memory: inherit successful ghosts as well as habits</label><p class="ghost-name-note">When enabled, successful ghosts keep their creator’s name on this browser. Reset learned routes clears them.</p><div id="family-names">${[1,2,3,4].map(i=>`<label class="family-name" ${i>2?'hidden':''}>Player ${i}<input id="family-name-${i}" type="text" maxlength="20" value="Player ${i}" autocomplete="off"/></label>`).join('')}</div><p>Session scores stay until you start a new family challenge or reload. Existing arena memory is kept.</p><button id="family-start" type="submit" class="primary">Start family challenge</button></form></div></section>
        <section id="practice-screen" class="page modal-page" hidden><div class="page-card practice-card"><button class="back-button" data-page="home" aria-label="Back to home">←</button><span class="eyebrow">LEARN EACH CHALLENGE</span><h2>STAGE PRACTICE</h2><p>Clear stages in a full run to unlock them here. Practice ends after one stage and does not change scores, memory or unlocks.</p><div id="practice-options"></div></div></section>
        <section id="analysis-screen" class="page modal-page" hidden><div class="page-card analysis-card"><button class="back-button" id="analysis-back" aria-label="Back to results">←</button><span class="eyebrow">YOUR STEPS. THE ARENA’S MEMORY.</span><h2>YOUR ROUTE <em>ANALYSIS</em></h2><div class="analysis-layout"><div class="analysis-stage"><div id="analysis-map" class="analysis-map" role="img" aria-label="Heatmap and recorded route"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path id="route-line" fill="none" stroke="#ffc107" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle id="route-marker" r="13" fill="#fff7c3" stroke="#ffbd09" stroke-width="9"/></svg></div></div><div class="analysis-legend"><h3>Heatmap</h3><span><i class="hot"></i>High use</span><span><i class="warm"></i>Medium use</span><span><i class="cool"></i>Low use</span><span><b>◇</b>Hazard target</span><span><b>×</b>Fell here</span><p id="analysis-habit"></p></div></div><div class="replay-controls"><button id="replay-play" class="secondary" aria-label="Play route replay">▶</button><input id="replay-slider" type="range" min="0" max="0" value="0" aria-label="Route playback position"/><span id="replay-time">0.0s</span></div><p class="replay-caption" id="replay-caption">Replay your recorded steps. Airborne movement is not recorded.</p><button id="analysis-retry" class="primary">↻ Try again</button></div></section>
      </main><div id="announcer" class="sr-only" role="status" aria-live="polite"></div>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button=>button.addEventListener('click',()=>{const page=button.dataset.page as Screen;this.onNavigate(page);this.show(page);}));
    for(const id of ['home-play','tutorial-play'])this.get(id).addEventListener('click',()=>{this.show('game');this.onFullRun();});
    this.get('analysis-retry').addEventListener('click',()=>{this.show('game');this.get('start').click();});
    this.get('race-play').addEventListener('click',()=>this.onRace());
    this.get('family-count').addEventListener('change',()=>{const count=Number((this.get('family-count') as HTMLSelectElement).value);this.root.querySelectorAll<HTMLElement>('.family-name').forEach((label,i)=>label.hidden=i>=count);});
    this.get('family-form').addEventListener('submit',event=>{event.preventDefault();const count=Number((this.get('family-count') as HTMLSelectElement).value);this.onFamily(Array.from({length:count},(_,i)=>(this.get('family-name-'+(i+1)) as HTMLInputElement).value),(this.get('family-race') as HTMLInputElement).checked);});
    this.get('settings-sound').addEventListener('click',()=>this.get('sound').click());
    this.get('inspect-route').addEventListener('click',()=>{this.get('overlay').hidden=true;this.get('reopen-reveal').hidden=false;});
    this.get('reopen-reveal').addEventListener('click',()=>{this.get('overlay').hidden=false;this.get('reopen-reveal').hidden=true;});
    this.get('open-analysis').addEventListener('click',()=>{this.show('analysis');this.renderReplay();});
    this.get('analysis-back').addEventListener('click',()=>this.show('game'));
    this.get('replay-play').addEventListener('click',()=>{this.replay.toggle();this.renderReplay();});
    this.get('replay-slider').addEventListener('input',()=>{this.replay.playing=false;this.replay.seek(Number((this.get('replay-slider') as HTMLInputElement).value));this.renderReplay();});
    for(let i=0;i<SIZE*SIZE;i++)this.get('heatmap').append(document.createElement('span'));
    if(window.matchMedia('(pointer: coarse)').matches)this.text('home-controls','JOYSTICK TO MOVE · TAP TO JUMP');
    this.text('motion-setting',window.matchMedia('(prefers-reduced-motion: reduce)').matches?'Reduced':'Standard');
  }
  family(session:HotSeat|null,results=false){
    const banner=this.get('family-banner');banner.hidden=!session;
    const board=this.get('family-results');board.hidden=!session||!results;board.replaceChildren();
    if(!session)return;
    banner.textContent=`${session.current.name} · Turn ${session.turn} · Shared arena memory`;
    if(results){const title=document.createElement('p');title.textContent=`Pass the controller to ${session.nextName}. Press Ready when they have it.`;board.append(title);
      const table=document.createElement('table');const header=table.createTHead().insertRow();for(const text of ['Player','Turns','Best','Total']){const th=document.createElement('th');th.textContent=text;header.append(th);}
      for(const player of session.players){const row=table.insertRow();for(const text of [player.name,player.turns,player.best,player.total])row.insertCell().textContent=String(text);}board.append(table);
    }
  }
  progression(progress:Progression){
    const options=this.get('practice-options');options.replaceChildren();
    STAGES.forEach((stage,i)=>{const button=document.createElement('button');button.className='secondary';button.disabled=i>progress.unlockedStage;button.textContent=`${i+1} · ${stage.name} · ${stage.duration}s${button.disabled?' · Locked':''}`;button.addEventListener('click',()=>this.onPractice(i));options.append(button);});
    const suits=this.get('suit-options');suits.replaceChildren();
    for(const suit of SUITS){const button=document.createElement('button');button.className='secondary';button.disabled=!progress.available(suit.id);button.textContent=`${suit.name}${progress.selected===suit.id?' · Equipped':button.disabled?' · Locked':''}`;button.title=suit.requirement;button.setAttribute('aria-pressed',String(progress.selected===suit.id));const note=document.createElement('small');note.textContent=suit.requirement;button.append(note);button.addEventListener('click',()=>this.onSuit(suit.id));suits.append(button);}
  }
  get(id:string){return document.getElementById(id)!;}
  text(id:string,text:string){const element=this.get(id);if(element.textContent!==text)element.textContent=text;}
  show(screen:Screen){
    this.root.dataset.screen=screen;
    for(const page of ['home','how','settings','analysis','practice','family'])this.get(page+'-screen').hidden=screen!==page;
    if(screen!=='analysis')this.replay.playing=false;
  }
  overlay(title:string,copy:string,button:string,eyebrow:string){
    this.show('game');this.text('overlay-title',title);this.text('overlay-copy',copy);this.text('start',button);this.text('overlay-eyebrow',eyebrow);
    this.get('overlay').hidden=false;this.text('announcer',title+' '+copy);
  }
  allowReset(enabled:boolean){
    (this.get('clear') as HTMLButtonElement).disabled=!enabled;
    this.text('reset-hint',enabled?'Clears saved routes, successful ghosts, attempts, and personal bests.':'Finish the current run before resetting arena memory.');
  }
  hideReveal(){this.get('run-reveal').hidden=true;this.get('reopen-reveal').hidden=true;this.get('overlay').classList.remove('result-overlay');}
  reveal(insight:RoundInsight,seconds:number){
    this.get('ghost-result').hidden=!insight.memoryRace;this.text('ghost-result',insight.memoryRace?.explanation??'');
    this.replay.load(insight.path);
    this.get('run-reveal').hidden=false;this.get('overlay').classList.add('result-overlay');
    this.text('result-score',this.get('score').textContent??'000');this.text('reveal-duration',seconds.toFixed(1)+'s');this.text('reveal-habit',insight.habit);
    this.text('analysis-habit',insight.habit+(insight.memoryRace?' '+insight.memoryRace.explanation:''));this.fillMap('reveal-map',insight);this.fillMap('analysis-map',insight);
    const slider=this.get('replay-slider') as HTMLInputElement;slider.max=String(Math.max(0,insight.path.length-1));slider.disabled=insight.path.length<2;
    (this.get('replay-play') as HTMLButtonElement).disabled=insight.path.length<2;
    this.text('replay-caption',insight.path.length?'Replay your recorded floor steps. Airborne movement is not shown.':'No floor steps recorded in this run. Move around in your next attempt.');this.renderReplay();
  }
  private fillMap(id:string,insight:RoundInsight){
    const map=this.get(id);map.querySelectorAll('.map-tile').forEach(tile=>tile.remove());
    map.setAttribute('aria-label',insight.habit+' '+insight.explanation);
    const max=Math.max(1,...insight.visits);
    for(let i=0;i<SIZE*SIZE;i++){
      const cell={x:i%SIZE,z:Math.floor(i/SIZE)},tile=document.createElement('span'),heat=insight.visits[i]/max;
      const targeted=insight.targets.some(t=>t.x===cell.x&&t.z===cell.z),fallen=insight.fall?.x===cell.x&&insight.fall.z===cell.z;
      const different=insight.memoryRace?.deviations.some(c=>c.x===cell.x&&c.z===cell.z),echo=insight.memoryRace?.ghost.some(c=>c.x===cell.x&&c.z===cell.z);
      tile.className='map-tile '+(different?' deviated ':echo?' ghost-route ':'')+(heat>0.66?'heat-hot':heat>0.25?'heat-warm':heat>0?'heat-cool':'heat-empty')+(fallen?' fell':targeted?' targeted':'');
      tile.textContent=fallen?'×':targeted?'◇':different?'↗':'';tile.title=cellName(cell)+(fallen?' · fell here':targeted?' · hazard target':'');map.append(tile);
    }
  }
  sound(enabled:boolean,available:boolean){
    const button=this.get('sound') as HTMLButtonElement;button.textContent=available?(enabled?'♪ Sound on':'♪ Sound off'):'Sound unavailable';button.setAttribute('aria-pressed',String(enabled&&available));button.disabled=!available;
    const settings=this.get('settings-sound') as HTMLButtonElement;settings.textContent=available?(enabled?'On':'Off'):'Unavailable';settings.setAttribute('aria-pressed',String(enabled&&available));settings.disabled=!available;
  }
  run(seconds:number,won:boolean){
    this.text('score',String(scoreFor(seconds,won)).padStart(3,'0'));const phase=phaseAt(seconds);
    for(let i=0;i<STAGES.length;i++)this.get('phase-'+i).classList.toggle('active',i===phase.index);
    const mood=seconds<3?'watching':seconds<30?'learning':seconds<50?'predicting':'hunting';
    if(this.root.dataset.mood!==mood){this.root.dataset.mood=mood;this.text('arena-mood',mood.toUpperCase());}
  }
  heat(visits:number[]){const max=Math.max(1,...visits);Array.from(this.get('heatmap').children).forEach((tile,i)=>(tile as HTMLElement).style.background=`rgba(0,229,255,${0.07+visits[i]/max*0.8})`);}
  tick(dt:number){if(this.root.dataset.screen==='analysis'&&this.replay.playing){this.replay.advance(dt);this.renderReplay();}}
  private renderReplay(){
    const point=this.replay.points[this.replay.index];
    this.get('route-marker').setAttribute('visibility',point?'visible':'hidden');
    if(point){this.get('route-marker').setAttribute('cx',String(point.cell.x*100+50));this.get('route-marker').setAttribute('cy',String(point.cell.z*100+50));}
    this.get('route-line').setAttribute('d',this.replay.points.slice(0,this.replay.index+1).map((p,i)=>`${i===0||p.breakBefore?'M':'L'}${p.cell.x*100+50},${p.cell.z*100+50}`).join(' '));
    (this.get('replay-slider') as HTMLInputElement).value=String(this.replay.index);
    this.text('replay-play',this.replay.playing?'Ⅱ':'▶');this.get('replay-play').setAttribute('aria-label',this.replay.playing?'Pause route replay':'Play route replay');
    this.text('replay-time',this.replay.time.toFixed(1)+'s');
  }
}
