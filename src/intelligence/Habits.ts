import { SIZE, type Cell } from './RouteTracker';
export interface Habits { samples:number; edge:number; centre:number; returns:number; clockwise:number; anticlockwise:number }
export const emptyHabits=():Habits=>({samples:0,edge:0,centre:0,returns:0,clockwise:0,anticlockwise:0});
export const isEdge=(c:Cell)=>Math.min(c.x,c.z,SIZE-1-c.x,SIZE-1-c.z)<2;
export const isCentre=(c:Cell)=>c.x>=3&&c.x<=6&&c.z>=3&&c.z<=6;
export function habitText(h:Habits):string {
  if(h.samples<12)return 'Still watching. Keep moving to reveal a habit.';
  const total=h.clockwise+h.anticlockwise;
  if(total>=1.5&&Math.max(h.clockwise,h.anticlockwise)/total>.75)return `You circle ${h.clockwise>h.anticlockwise?'clockwise':'anticlockwise'} (${Math.round(Math.max(h.clockwise,h.anticlockwise)/total*100)}% of your turning around the centre).`;
  if(h.returns>=3)return `You returned to the centre ${h.returns} times.`;
  if(h.edge/h.samples>=.55)return `You spent ${Math.round(h.edge/h.samples*100)}% of recorded floor time near the edges.`;
  if(h.centre/h.samples>=.55)return `You spent ${Math.round(h.centre/h.samples*100)}% of recorded floor time near the centre.`;
  return 'You spread your route across the arena. Keep changing it.';
}
export function habitPriority(h:Habits,cell:Cell,current:Cell|null):number {
  if(h.samples<12)return 0;
  let weight=isEdge(cell)?Math.max(0,h.edge/h.samples-.5)*16:0;
  if(isCentre(cell))weight+=Math.max(0,h.centre/h.samples-.5)*16+Math.min(8,h.returns);
  const turns=h.clockwise+h.anticlockwise;
  if(current&&turns>1.5&&Math.max(h.clockwise,h.anticlockwise)/turns>.75){
    const cx=current.x-4.5,cz=current.z-4.5,dx=cell.x-current.x,dz=cell.z-current.z;
    const cross=cx*dz-cz*dx;
    if(Math.abs(dx)+Math.abs(dz)<=2&&Math.sign(cross)===(h.clockwise>h.anticlockwise?1:-1))weight+=6;
  }
  return weight;
}
