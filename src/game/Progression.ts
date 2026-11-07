import type { StorageLike } from '../intelligence/LearningEngine';
import { STAGES } from './RunRules';
export const PROGRESS_KEY='dont-trust-the-floor:progress:v1';
export const SUITS=[
  {id:'original',name:'Orbital White',color:0xf1f3ff,requirement:'Always available'},
  {id:'mint',name:'Pathfinder Mint',color:0x80f6cd,requirement:'Clear Playground in a full run'},
  {id:'gold',name:'Patternbreaker Gold',color:0xffd36b,requirement:'Escape 3 learned traps in full runs'},
  {id:'rose',name:'Personal Best Rose',color:0xff9fcd,requirement:'Beat an existing personal best in a full run'},
  {id:'violet',name:'Champion Violet',color:0xbb97ff,requirement:'Clear all six stages in a full run'},
] as const;
export class Progression {
  unlockedStage=0;clears=0;dodges=0;record=false;selected='original';
  constructor(private storage?:StorageLike){try{const m=JSON.parse(storage?.getItem(PROGRESS_KEY)??'null');if(m){this.unlockedStage=Math.max(0,Math.min(STAGES.length-1,Math.floor(Number(m.unlockedStage)||0)));this.clears=Math.max(0,Math.min(6,Number(m.clears)||0));this.dodges=Math.max(0,Math.min(3,Number(m.dodges)||0));this.record=m.record===true;if(SUITS.some(s=>s.id===m.selected))this.selected=m.selected;}}catch{/* Optional browser storage. */}if(!this.available(this.selected))this.selected='original';}
  available(id:string){return id==='original'||id==='mint'&&this.clears>=1||id==='gold'&&this.dodges>=3||id==='rose'&&this.record||id==='violet'&&this.clears>=6;}
  clearStage(index:number,practice=false){if(practice)return;this.clears=Math.max(this.clears,index+1);this.unlockedStage=Math.max(this.unlockedStage,Math.min(STAGES.length-1,index+1));this.save();}
  finish(score:number,oldBest:number,dodges:number,practice=false){if(practice)return;this.dodges=Math.min(3,this.dodges+dodges);if(oldBest>0&&score>oldBest)this.record=true;this.save();}
  select(id:string){if(!this.available(id)||!SUITS.some(s=>s.id===id))return false;this.selected=id;this.save();return true;}
  get color(){return SUITS.find(s=>s.id===this.selected)!.color;}
  private save(){try{this.storage?.setItem(PROGRESS_KEY,JSON.stringify({unlockedStage:this.unlockedStage,clears:this.clears,dodges:this.dodges,record:this.record,selected:this.selected}));}catch{/* Session unlocks still work. */}}
}
