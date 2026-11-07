import {afterEach,describe,it,expect,vi} from 'vitest';
import {TVMode,TV_KEY} from '../src/ui/TVMode';
afterEach(()=>vi.unstubAllGlobals());
function fixture(saved='off',blocked=false){
  const elements=new Map<string,any>();
  for(const id of ['#tv-mode','#fullscreen','#tv-status'])elements.set(id,{textContent:'',attributes:{},listeners:{} as Record<string,()=>void>,setAttribute(k:string,v:string){this.attributes[k]=v;},addEventListener(k:string,handler:()=>void){this.listeners[k]=handler;}});
  const doc={fullscreenElement:null as unknown,addEventListener:vi.fn(),exitFullscreen:vi.fn(async()=>{doc.fullscreenElement=null;})};
  const root={dataset:{},querySelector:(id:string)=>elements.get(id),requestFullscreen:vi.fn(async()=>{if(blocked)throw Error('activation required');doc.fullscreenElement=root;})};
  vi.stubGlobal('document',doc);vi.stubGlobal('window',{addEventListener:vi.fn()});
  const store={getItem:()=>saved,setItem:vi.fn(),removeItem:vi.fn()};
  const mode=new TVMode(root as any,store);return {elements,doc,root,store,mode};
}
describe('TV layout and fullscreen fallback',()=>{
  it('restores layout without attempting automatic fullscreen on page load',()=>{
    const {root,mode}=fixture('on');expect(mode.enabled).toBe(true);expect(root.dataset).toEqual({tv:'on'});expect(root.requestFullscreen).not.toHaveBeenCalled();
  });
  it('enters fullscreen from the visible toggle, saves the preference, and exits when toggled off',async()=>{
    const f=fixture();f.elements.get('#tv-mode').listeners.click();await Promise.resolve();await Promise.resolve();
    expect(f.root.requestFullscreen).toHaveBeenCalledOnce();expect(f.store.setItem).toHaveBeenCalledWith(TV_KEY,'on');
    f.elements.get('#tv-mode').listeners.click();await Promise.resolve();expect(f.doc.exitFullscreen).toHaveBeenCalledOnce();expect(f.mode.enabled).toBe(false);
  });
  it('keeps the readable layout and explains a blocked fullscreen request',async()=>{
    const f=fixture('off',true);f.elements.get('#tv-mode').listeners.click();await Promise.resolve();await Promise.resolve();
    expect(f.mode.enabled).toBe(true);expect(f.elements.get('#tv-status').textContent).toContain('Full screen was blocked');
  });
});
