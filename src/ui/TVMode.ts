import type {StorageLike} from '../intelligence/LearningEngine';
export const TV_KEY='dont-trust-the-floor:tv:v1';
export class TVMode {
  enabled=false;
  constructor(private root:HTMLElement,private storage?:StorageLike){
    try{this.enabled=storage?.getItem(TV_KEY)==='on';}catch{/* Optional preference. */}
    root.querySelector('#tv-mode')!.addEventListener('click',()=>{this.toggle();if(this.enabled&&!document.fullscreenElement||!this.enabled&&document.fullscreenElement===this.root)void this.fullscreen();});
    root.querySelector('#fullscreen')!.addEventListener('click',()=>void this.fullscreen());
    document.addEventListener('fullscreenchange',()=>this.sync());
    window.addEventListener('keydown',event=>{if(event.code==='KeyF'&&!event.repeat&&!(event.target as HTMLElement)?.closest('input,select,textarea')){event.preventDefault();void this.fullscreen();}});
    this.sync();
  }
  private toggle(){this.enabled=!this.enabled;try{this.storage?.setItem(TV_KEY,this.enabled?'on':'off');}catch{/* Session setting works. */}this.sync();}
  private sync(){
    this.root.dataset.tv=this.enabled?'on':'off';
    const button=this.root.querySelector('#tv-mode')!;button.textContent=this.enabled?'TV mode: On':'TV mode';button.setAttribute('aria-pressed',String(this.enabled));
    this.root.querySelector('#fullscreen')!.textContent=document.fullscreenElement?'Exit full screen':'Enter full screen · F';
    this.root.querySelector('#tv-status')!.textContent=this.enabled?'TV layout enabled. F toggles full screen. Escape exits full screen and pauses play.':'Enable TV mode for larger text, stronger focus outlines and a screen-filling arena.';
  }
  private async fullscreen(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(this.root.requestFullscreen)await this.root.requestFullscreen();else throw Error('unavailable');this.sync();}
    catch{this.root.querySelector('#tv-status')!.textContent='TV layout is available. Full screen was blocked: click Enter full screen or press F directly. You can also use your browser’s full-screen command.';}
  }
}
