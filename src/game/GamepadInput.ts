export interface PadLike {index:number;id:string;connected:boolean;mapping:string;axes:readonly number[];buttons:readonly {pressed:boolean;value:number}[]}
export interface ControllerFrame {connected:boolean;unsupported:boolean;label:string;disconnected:boolean;move:{x:number;z:number};look:{x:number;y:number};jump:boolean;confirm:boolean;back:boolean;pause:boolean;recentre:boolean;nav:'up'|'down'|'left'|'right'|null}
export function stick(x=0,y=0,dead=.2){const length=Math.hypot(x,y);if(!Number.isFinite(length)||length<=dead)return {x:0,y:0};const scale=Math.min(1,(length-dead)/(1-dead))/length;return {x:x*scale,y:y*scale};}
const empty=():ControllerFrame=>({connected:false,unsupported:false,label:'Press a controller button to connect',disconnected:false,move:{x:0,z:0},look:{x:0,y:0},jump:false,confirm:false,back:false,pause:false,recentre:false,nav:null});
/** One active standard-mapped controller. No WebHID permission or vendor mapping guesses. */
export class GamepadInput {
  private owner:string|null=null;
  private previous:boolean[]=[];
  private armed=false;
  private navHeld='';private repeat=0;
  constructor(private read:()=>readonly (PadLike|null)[]=()=>navigator.getGamepads?Array.from(navigator.getGamepads()):[]){}
  suspend(){this.armed=false;this.previous=[];this.navHeld='';this.repeat=0;}
  poll(dt:number):ControllerFrame{
    let pads:readonly (PadLike|null)[];try{pads=this.read();}catch{return this.lost();}
    const candidates=pads.filter((p):p is PadLike=>!!p&&p.connected);
    const key=(p:PadLike)=>`${p.index}:${p.id}`;
    let pad=candidates.find(p=>key(p)===this.owner&&p.mapping==='standard');
    if(this.owner&&!pad)return this.lost();
    if(!pad)pad=candidates.find(p=>p.mapping==='standard');
    if(!pad){const frame=empty();frame.unsupported=candidates.length>0;frame.label=frame.unsupported?'Controller detected · standard mapping unavailable':frame.label;return frame;}
    const buttons=pad.buttons.map(b=>b.pressed||b.value>.5),left=stick(pad.axes[0],pad.axes[1]),right=stick(pad.axes[2],pad.axes[3],.18);
    if(!this.owner){this.owner=key(pad);this.suspend();}
    const frame=empty();frame.connected=true;frame.label=/dualsense|054c.*0ce6|wireless controller/i.test(pad.id)?'DualSense / PlayStation controller':'Standard controller';
    if(!this.armed){this.previous=buttons;this.armed=!buttons.some(Boolean)&&Math.hypot(left.x,left.y)<.1&&Math.hypot(right.x,right.y)<.1;return frame;}
    const pressed=(i:number)=>!!buttons[i]&&!this.previous[i];
    frame.move={x:left.x,z:left.y};frame.look={x:right.x,y:right.y};
    frame.jump=frame.confirm=pressed(0);frame.back=pressed(1);frame.pause=pressed(9);frame.recentre=pressed(11);
    const direction=buttons[12]||left.y<-.65?'up':buttons[13]||left.y>.65?'down':buttons[14]||left.x<-.65?'left':buttons[15]||left.x>.65?'right':'';
    this.repeat=Math.max(0,this.repeat-dt);
    if(direction&&(direction!==this.navHeld||this.repeat<=0)){frame.nav=direction;this.repeat=direction!==this.navHeld ? .4 : .16;}
    if(!direction)this.repeat=0;this.navHeld=direction;this.previous=buttons;return frame;
  }
  private lost(){const frame=empty();frame.disconnected=this.owner!==null;this.owner=null;this.suspend();return frame;}
}
