import {describe,it,expect} from 'vitest';
import {GamepadInput,stick,type PadLike} from '../src/game/GamepadInput';
function pad(index=0):PadLike{return {index,id:'DualSense Wireless Controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};}
function press(p:PadLike,index:number,down=true){p.buttons[index].pressed=down;p.buttons[index].value=down?1:0;}
describe('standard DualSense input',()=>{
  it('removes stick drift and preserves bounded analogue strength',()=>{
    expect(stick(.1,-.1)).toEqual({x:0,y:0});expect(stick(.6,0).x).toBeCloseTo(.5);expect(Math.hypot(...Object.values(stick(1,1)))).toBeCloseTo(1);expect(stick(NaN,0)).toEqual({x:0,y:0});
  });
  it('maps left/right sticks, Cross, Circle, Options and R3 without held-button repeats',()=>{
    const p=pad(),input=new GamepadInput(()=>[p]);input.poll(.016);(p.axes as number[]).splice(0,4,.8,-.6,.5,.3);
    for(const index of [0,1,9,11])press(p,index);
    const f=input.poll(.016);expect(f.move.x).toBeGreaterThan(0);expect(f.move.z).toBeLessThan(0);expect(f.look.x).toBeGreaterThan(0);expect(f.look.y).toBeGreaterThan(0);
    expect(f.jump&&f.confirm&&f.back&&f.pause&&f.recentre).toBe(true);expect(input.poll(.016).jump).toBe(false);
    press(p,0,false);input.poll(.016);press(p,0);expect(input.poll(.016).jump).toBe(true);
  });
  it('requires neutral input after connection, suspension and reconnect',()=>{
    const p=pad(),input=new GamepadInput(()=>[p]);press(p,0);expect(input.poll(.016).confirm).toBe(false);expect(input.poll(.016).jump).toBe(false);
    press(p,0,false);input.poll(.016);press(p,0);expect(input.poll(.016).jump).toBe(true);
    input.suspend();expect(input.poll(.016).jump).toBe(false);press(p,0,false);input.poll(.016);press(p,9);expect(input.poll(.016).pause).toBe(true);
  });
  it('emits disconnect once, clears stale movement, and accepts a new controller without resuming actions',()=>{
    let pads:(PadLike|null)[]=[pad()];const input=new GamepadInput(()=>pads);input.poll(.016);(pads[0]!.axes as number[])[0]=1;expect(input.poll(.016).move.x).toBe(1);
    pads=[];const lost=input.poll(.016);expect(lost.disconnected).toBe(true);expect(lost.move.x).toBe(0);expect(input.poll(.016).disconnected).toBe(false);
    const replacement=pad(1);press(replacement,0);pads=[replacement];expect(input.poll(.016).jump).toBe(false);
  });
  it('keeps a single controller owner even when another controller presses buttons',()=>{
    const a=pad(),b=pad(1),input=new GamepadInput(()=>[a,b]);input.poll(.016);press(b,0);expect(input.poll(.016).jump).toBe(false);press(a,0);expect(input.poll(.016).jump).toBe(true);
  });
  it('does not guess nonstandard mappings or fail when browser access is unavailable',()=>{
    const p=pad();p.mapping='';const f=new GamepadInput(()=>[p]).poll(.016);expect(f.connected).toBe(false);expect(f.unsupported).toBe(true);
    expect(new GamepadInput(()=>{throw Error('blocked');}).poll(.016).connected).toBe(false);
  });
  it('repeats D-pad menu navigation with a delay, while a direction change acts immediately',()=>{
    const p=pad(),input=new GamepadInput(()=>[p]);input.poll(.016);press(p,13);
    expect(input.poll(.016).nav).toBe('down');expect(input.poll(.2).nav).toBeNull();expect(input.poll(.21).nav).toBe('down');press(p,13,false);press(p,12);expect(input.poll(.01).nav).toBe('up');
  });
});
