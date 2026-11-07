export interface FamilyPlayer {name:string;turns:number;best:number;total:number}
/** One shared arena memory; only the human holding the controller changes. */
export class HotSeat {
  players:FamilyPlayer[]=[];index=0;turn=1;private recorded=false;
  begin(names:string[]){this.players=names.slice(0,4).map((name,i)=>({name:name.trim().slice(0,20)||`Player ${i+1}`,turns:0,best:0,total:0}));if(this.players.length<2)throw Error('Choose two to four players.');this.index=0;this.turn=1;this.recorded=false;}
  get current(){return this.players[this.index];}
  get nextName(){return this.players[(this.index+1)%this.players.length]?.name??'';}
  record(score:number){if(this.recorded||!this.current)return;const value=Number.isFinite(score)?Math.max(0,Math.floor(score)):0;this.current.turns++;this.current.best=Math.max(this.current.best,value);this.current.total+=value;this.recorded=true;}
  next(){if(!this.recorded)return false;this.index=(this.index+1)%this.players.length;this.turn++;this.recorded=false;return true;}
}
