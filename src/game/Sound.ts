import { Heartbeat } from './Heartbeat';
import type { StorageLike } from '../intelligence/LearningEngine';
export const SOUND_KEY = 'dont-trust-the-floor:sound:v1';
export const MUSIC_KEY='dont-trust-the-floor:heartbeat:v1';
export type Cue = 'countdown' | 'start' | 'jump' | 'land' | 'warning' | 'collapse' | 'phase' | 'final' | 'fall' | 'win' | 'heartbeat' | 'heartbeatHigh' | 'harmony';
interface Note { frequency: number; end?: number; delay: number; duration: number; volume: number; type?: OscillatorType }
const NOTES: Record<Cue, Note[]> = {
  heartbeat: [{frequency:78,end:40,delay:0,duration:.15,volume:.065,type:'sine'},{frequency:62,end:35,delay:.19,duration:.13,volume:.045,type:'sine'}],
  heartbeatHigh: [{frequency:92,end:48,delay:0,duration:.13,volume:.09,type:'sine'},{frequency:72,end:38,delay:.16,duration:.11,volume:.06,type:'sine'}],
  harmony: [{frequency:146.83,delay:0,duration:.35,volume:.025,type:'triangle'},{frequency:220,delay:.12,duration:.3,volume:.018,type:'sine'}],
  countdown: [{frequency:440,delay:0,duration:0.1,volume:0.1}],
  start: [0,1,2].map((n)=>({frequency:[523,659,784][n],delay:n*0.08,duration:0.19,volume:0.1})),
  jump: [{frequency:240,end:600,delay:0,duration:0.16,volume:0.09}],
  land: [{frequency:130,end:70,delay:0,duration:0.07,volume:0.06,type:'triangle'}],
  warning: [{frequency:660,end:540,delay:0,duration:0.09,volume:0.045,type:'triangle'}],
  collapse: [{frequency:110,end:35,delay:0,duration:0.22,volume:0.12,type:'triangle'}],
  phase: [{frequency:392,delay:0,duration:0.13,volume:0.08},{frequency:587,delay:0.15,duration:0.19,volume:0.08}],
  final: [{frequency:880,delay:0,duration:0.06,volume:0.06}],
  fall: [{frequency:400,end:60,delay:0,duration:0.5,volume:0.12,type:'triangle'}],
  win: [523,659,784,1047].map((frequency,n)=>({frequency,delay:n*0.12,duration:0.28,volume:0.11})),
};
/** Quiet synthesized cues; no downloads, autoplay, or audio running while paused. */
export class Sound {
  enabled = true;
  musicEnabled=true;
  private heartbeat=new Heartbeat();
  available = true;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private musicVoices = new Set<OscillatorNode>();
  constructor(private storage?: StorageLike, private createContext=()=>new AudioContext()) {
    try {this.enabled=storage?.getItem(SOUND_KEY)!=='off';this.musicEnabled=storage?.getItem(MUSIC_KEY)!=='off';} catch { /* Session preference still works. */ }
  }
  async unlock() {
    if (!this.enabled || !this.available) return;
    try {
      if (!this.context) {
        this.context=this.createContext();this.master=this.context.createGain();
        this.master.gain.value=0.55;this.master.connect(this.context.destination);
      }
      if (this.context.state==='suspended') await this.context.resume();
    } catch {this.available=false;}
  }
  toggle() {
    this.enabled=!this.enabled;
    if (!this.enabled)this.stop();
    try {this.storage?.setItem(SOUND_KEY,this.enabled?'on':'off');} catch { /* Optional storage. */ }
  }
  toggleMusic(){this.musicEnabled=!this.musicEnabled;this.stopMusic();try{this.storage?.setItem(MUSIC_KEY,this.musicEnabled?'on':'off');}catch{/* Optional preference. */}}
  escape(){this.stopMusic();this.heartbeat.escape();}
  pulse(dt:number,danger:number){
    if(!this.enabled||!this.musicEnabled||!this.available||!this.context||this.context.state!=='running')return;
    const beat=this.heartbeat.tick(dt,danger);if(!beat.beat)return;
    this.play(beat.intensity>.55?'heartbeatHigh':'heartbeat');if(beat.accent&&beat.intensity>.25)this.play('harmony',beat.intensity>.75?1.125:1);
  }
  private stopMusic(){for(const voice of this.musicVoices){try{voice.stop();}catch{/* Already ended. */}this.voices.delete(voice);}this.musicVoices.clear();this.heartbeat.reset();}
  stop() {
    this.heartbeat.reset();
    for (const voice of this.voices) { try {voice.stop();} catch { /* Already finished. */ } }
    this.voices.clear();this.musicVoices.clear();
  }
  stage(index:number){this.play('phase',[1,1.12,.75,.9,1.35,.6][index]??1);}
  play(cue: Cue, pitch=1) {
    const ctx=this.context;
    if (!this.enabled || !this.available || !ctx || ctx.state!=='running' || !this.master)return;
    for(const note of NOTES[cue]) {
      if(this.voices.size>=16)break;
      const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+note.delay;
      oscillator.type=note.type??'sine';
      oscillator.frequency.setValueAtTime(note.frequency*pitch,start);
      if(note.end)oscillator.frequency.exponentialRampToValueAtTime(note.end*pitch,start+note.duration);
      gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(note.volume,start+0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001,start+note.duration);
      oscillator.connect(gain);gain.connect(this.master);this.voices.add(oscillator);
      if(cue==='heartbeat'||cue==='heartbeatHigh'||cue==='harmony')this.musicVoices.add(oscillator);
      oscillator.onended=()=>{this.voices.delete(oscillator);this.musicVoices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
      oscillator.start(start);oscillator.stop(start+note.duration+0.015);
    }
  }
}
