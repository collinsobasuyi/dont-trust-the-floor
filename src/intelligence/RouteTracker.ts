import { emptyHabits, isEdge, isCentre } from './Habits';
export interface Cell { x: number; z: number }
export const SIZE = 10;
export const keyOf = ({ x, z }: Cell) => `${x},${z}`;
export function cellAt(x: number, z: number): Cell | null {
  const cell = { x: Math.floor(x + SIZE / 2), z: Math.floor(z + SIZE / 2) };
  return cell.x >= 0 && cell.x < SIZE && cell.z >= 0 && cell.z < SIZE ? cell : null;
}
export class RouteTracker {
  habits=emptyHabits();
  visits = Array<number>(SIZE * SIZE).fill(0);
  transitions: Record<string, number> = {};
  entries = Array<number>(SIZE * SIZE).fill(0);
  path: Cell[] = [];
  trail: {cell: Cell;time:number; breakBefore?: boolean}[] = [];
  private segmentBreak=false;
  beginSegment() { this.previous=null;this.segmentBreak=true; }
  private previous: Cell | null = null;
  sample(cell: Cell, time=this.trail.length*0.18) {
    this.trail.push({cell:{...cell},time,...(this.segmentBreak?{breakBefore:true}:{})});this.segmentBreak=false;
    this.habits.samples++;if(isEdge(cell))this.habits.edge++;if(isCentre(cell))this.habits.centre++;
    if(this.previous){
      if(!isCentre(this.previous)&&isCentre(cell))this.habits.returns++;
      const a=Math.atan2(this.previous.z-4.5,this.previous.x-4.5),b=Math.atan2(cell.z-4.5,cell.x-4.5);
      const turn=Math.atan2(Math.sin(b-a),Math.cos(b-a));
      if(Math.hypot(cell.x-4.5,cell.z-4.5)>1.5&&Math.abs(turn)<1){if(turn>0)this.habits.clockwise+=turn;else this.habits.anticlockwise-=turn;}
    }
    this.visits[cell.z * SIZE + cell.x] += 1;
    if (!this.previous || keyOf(this.previous) !== keyOf(cell)) {
      this.entries[cell.z * SIZE + cell.x] += 1;
      this.path.push({...cell});
    }
    if (this.previous && keyOf(this.previous) !== keyOf(cell)) {
      const key = `${keyOf(this.previous)}>${keyOf(cell)}`;
      this.transitions[key] = (this.transitions[key] ?? 0) + 1;
    }
    this.previous = cell;
  }
  reset() { this.habits=emptyHabits();this.segmentBreak=false;this.visits.fill(0); this.entries.fill(0); this.path = []; this.trail=[]; this.transitions = {}; this.previous = null; }
}
