import type {ControllerFrame} from '../game/GamepadInput';
/** Operates the same visible controls as keyboard and mouse; respects locked rewards. */
export function controllerMenu(root:HTMLElement,frame:ControllerFrame){
  const controls=Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')).filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
  if(!controls.length)return;
  const current=document.activeElement as HTMLElement,index=controls.indexOf(current);
  if(frame.nav){
    if(current instanceof HTMLSelectElement&&(frame.nav==='left'||frame.nav==='right')){
      current.selectedIndex=Math.max(0,Math.min(current.options.length-1,current.selectedIndex+(frame.nav==='right'?1:-1)));current.dispatchEvent(new Event('change',{bubbles:true}));
    }else if(current instanceof HTMLInputElement&&current.type==='range'&&(frame.nav==='left'||frame.nav==='right')){
      current.value=String(Math.max(Number(current.min),Math.min(Number(current.max),Number(current.value)+(frame.nav==='right'?1:-1))));current.dispatchEvent(new Event('input',{bubbles:true}));
    }else{
      const delta=frame.nav==='up'||frame.nav==='left'?-1:1;
      const target=controls[index<0?0:(index+delta+controls.length)%controls.length];target.focus({preventScroll:true});target.scrollIntoView({block:'nearest'});
    }
  }
  if(frame.confirm){const target=index<0?controls.find(el=>el.classList.contains('primary'))??controls[0]:current;target.click();}
}
