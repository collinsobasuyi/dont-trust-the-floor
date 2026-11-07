import { describe, it, expect, vi } from 'vitest';
import { Sound, SOUND_KEY } from '../src/game/Sound';
function audio() {
  const voices: {stop: ReturnType<typeof vi.fn>}[]=[];
  const parameter=()=>({value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()});
  const createGain=()=>({gain:parameter(),connect:vi.fn(),disconnect:vi.fn()});
  const context={state:'running',currentTime:0,destination:{},resume:vi.fn().mockResolvedValue(undefined),createGain:vi.fn(createGain),createOscillator:vi.fn(()=>{
    const voice={frequency:parameter(),type:'sine',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};voices.push(voice);return voice;
  })};
  const factory=vi.fn(()=>context as unknown as AudioContext);
  return {context,factory,voices};
}
describe('sound lifecycle',()=>{
  it('does not construct audio or play until unlocked by interaction',()=>{
    const a=audio(),s=new Sound(undefined,a.factory);s.play('jump');
    expect(a.factory).not.toHaveBeenCalled();
    expect(a.context.createOscillator).not.toHaveBeenCalled();
  });
  it('plays a cue and stops active voices when muted',async()=>{
    const a=audio(),s=new Sound(undefined,a.factory);await s.unlock();s.play('jump');
    expect(a.voices).toHaveLength(1);expect(a.voices[0].stop).toHaveBeenCalledTimes(1);
    s.toggle();expect(a.voices[0].stop).toHaveBeenCalledTimes(2);
    s.play('win');expect(a.voices).toHaveLength(1);
  });
  it('restores the mute preference without creating an audio context',async()=>{
    const a=audio(),write=vi.fn();const s=new Sound({getItem:()=> 'off',setItem:write,removeItem:vi.fn()},a.factory);
    await s.unlock();expect(s.enabled).toBe(false);expect(a.factory).not.toHaveBeenCalled();
    s.toggle();expect(write).toHaveBeenCalledWith(SOUND_KEY,'on');
  });
  it('keeps gameplay safe when audio or storage is unavailable',async()=>{
    const s=new Sound({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){}},()=>{throw Error('no audio');});
    await expect(s.unlock()).resolves.toBeUndefined();expect(s.available).toBe(false);
    expect(()=>s.play('win')).not.toThrow();expect(()=>s.toggle()).not.toThrow();
  });
  it('caps simultaneous scheduled voices and can cancel a win sequence on pause',async()=>{
    const a=audio(),s=new Sound(undefined,a.factory);await s.unlock();
    for(let i=0;i<20;i++)s.play('win');expect(a.voices).toHaveLength(16);
    s.stop();expect(a.voices.every(v=>v.stop.mock.calls.length===2)).toBe(true);
  });
});

it('schedules heartbeat only after audio unlock and respects mute, escape silence and music preference',async()=>{
  const a=audio(),s=new Sound(undefined,a.factory);s.pulse(.1,1);expect(a.voices).toHaveLength(0);
  await s.unlock();s.pulse(.1,1);expect(a.voices.length).toBeGreaterThan(0);const before=a.voices.length;
  s.escape();for(let i=0;i<10;i++)s.pulse(.1,1);expect(a.voices).toHaveLength(before);
  s.toggleMusic();s.pulse(5,1);expect(a.voices).toHaveLength(before);
  s.toggleMusic();s.toggle();s.pulse(5,1);expect(a.voices).toHaveLength(before);
});
it('keeps warning effects audible during the musical escape silence',async()=>{
  const a=audio(),s=new Sound(undefined,a.factory);await s.unlock();s.play('warning');s.pulse(.1,1);s.escape();
  expect(a.voices[0].stop).toHaveBeenCalledTimes(1);expect(a.voices[1].stop).toHaveBeenCalledTimes(2);
});
