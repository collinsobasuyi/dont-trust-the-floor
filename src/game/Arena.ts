import * as THREE from 'three';
import { SIZE, keyOf, type Cell } from '../intelligence/RouteTracker';
export type TileState = 'safe' | 'warning' | 'gone' | 'recovering';
interface Tile {
  cell: Cell;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  state: TileState;
  time: number;
  warningSeconds: number;
  permanent: boolean;
  cracks: THREE.LineSegments;
  rim: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  base: number;
  surface: THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>;
}
const PALETTE = [0x64b5e9,0x79c9ee,0x91c8f0,0x7bbbdc,0x8abfe7];
export class Arena {
  group = new THREE.Group();
  tiles: Tile[] = [];
  private revealVisits: number[] | null = null;
  private revealedFall: string | null = null;
  private reducedMotion: boolean;
  private rocks: THREE.InstancedMesh;
  private glow: THREE.InstancedMesh;
  private glowLocal=new THREE.Matrix4().makeTranslation(0,0.836,0);
  private rockLocal=new THREE.Matrix4();
  private rockMatrix=new THREE.Matrix4();
  private zeroScale=new THREE.Vector3(0,0,0);

  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    const geometry = new THREE.BoxGeometry(0.94,1.65,0.94);
    const rockGeometry = new THREE.BoxGeometry(0.79,0.18,0.79);
    const rockMaterial = new THREE.MeshStandardMaterial({color:0x191728,roughness:0.9,flatShading:true});
    this.rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,SIZE*SIZE);
    this.rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rocks.frustumCulled=false;this.group.add(this.rocks);
    const localRock=new THREE.Object3D();
    localRock.rotation.set(0,0,0);localRock.position.y=-0.9;localRock.updateMatrix();
    this.rockLocal.copy(localRock.matrix);
    const glowGeometry=new THREE.BufferGeometry();
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]],positions:number[]=[],indices:number[]=[];
    for(const radius of [0.472,0.445])for(const [x,z] of corners)positions.push(x*radius,0,z*radius);
    for(let i=0;i<4;i++){const next=(i+1)%4;indices.push(i,i+4,next,next,i+4,next+4);}
    glowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));glowGeometry.setIndex(indices);
    this.glow=new THREE.InstancedMesh(glowGeometry,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:false}),SIZE*SIZE);
    this.glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.glow.frustumCulled=false;this.group.add(this.glow);
    const edges = new THREE.EdgesGeometry(geometry);
    const stoneGeometry=new THREE.PlaneGeometry(0.88,0.88,7,7);
    stoneGeometry.rotateX(-Math.PI/2);
    const colors:number[]=[];
    for(let i=0;i<stoneGeometry.attributes.position.count;i++){
      const grain=0.82+(Math.sin(i*127.1)*43758.5453%1)*0.09;
      colors.push(grain,grain,grain);
    }
    stoneGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const crackGeometry = new THREE.BufferGeometry();
    crackGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
      -0.4,0.835,-0.38, -0.1,0.835,-0.1, -0.1,0.835,-0.1, -0.21,0.835,0.16,
      -0.21,0.835,0.16, 0.08,0.835,0.43, -0.1,0.835,-0.1, 0.25,0.835,-0.2,
      0.25,0.835,-0.2, 0.43,0.835,0.02, -0.21,0.835,0.16, -0.44,0.835,0.25,
    ],3));
    const crackMaterial = new THREE.LineBasicMaterial({color:0xfff4b4});
    for (let z=0;z<SIZE;z++) for (let x=0;x<SIZE;x++) {
      const base = PALETTE[(x*3+z*2)%PALETTE.length];
      const material = new THREE.MeshStandardMaterial({color:base,roughness:0.86,metalness:0.15,emissive:0x00354c,emissiveIntensity:0.12});
      const mesh = new THREE.Mesh(geometry,material);
      mesh.position.set(x-(SIZE-1)/2,-0.825,z-(SIZE-1)/2); mesh.receiveShadow=true; mesh.castShadow=true;
      const rim = new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:0x00dfff,transparent:true,opacity:0.95,toneMapped:false,fog:false}));
      rim.scale.setScalar(1.008);
      const cracks = new THREE.LineSegments(crackGeometry,crackMaterial); cracks.visible=false;
      const surface=new THREE.Mesh(stoneGeometry,new THREE.MeshStandardMaterial({color:base,vertexColors:true,roughness:0.95,metalness:0.08}));
      surface.position.y=0.827;surface.receiveShadow=true;
      surface.rotation.y=(x+z)%4*Math.PI/2;
      mesh.add(rim,cracks,surface); this.group.add(mesh);
      this.tiles.push({cell:{x,z},mesh,state:'safe',time:0,warningSeconds:1.25,permanent:false,cracks,rim,base,surface});
    }
    this.update(0,0);
  }
  snapshot(){return this.tiles.map(t=>({state:t.state,time:t.time,warningSeconds:t.warningSeconds,permanent:t.permanent}));}
  restore(snapshot:ReturnType<Arena['snapshot']>,clock:number){this.revealVisits=null;this.revealedFall=null;this.tiles.forEach((tile,i)=>Object.assign(tile,snapshot[i]));this.update(0,clock);}
  solidAfter(cell:Cell|null,seconds:number,extra:Map<string,number>=new Map()) {
    if(!cell)return false;
    if((extra.get(keyOf(cell))??Infinity)<=seconds)return false;
    const t=this.tiles[cell.z*SIZE+cell.x];
    if(t.state==='safe')return true;
    if(t.state==='warning')return t.time+seconds<t.warningSeconds;
    if(t.permanent)return false;
    const remaining=t.state==='gone'?3-t.time+0.65:0.65-t.time;
    return seconds>=remaining;
  }
  unavailable() { return new Set(this.tiles.filter(t => t.state !== 'safe').map(t => keyOf(t.cell))); }
  warn(cell: Cell, seconds=1.25, permanent=false) { const tile=this.tiles[cell.z*SIZE+cell.x]; if(permanent)tile.permanent=true; if(tile.state==='safe'||(permanent&&tile.state!=='gone')) {tile.state='warning';tile.time=0;tile.warningSeconds=seconds;} }
  solid(cell: Cell | null) { if(!cell)return false; const state=this.tiles[cell.z*SIZE+cell.x].state;return state==='safe'||state==='warning'; }
  reveal(visits: number[], fall: Cell | null) {
    this.revealVisits=[...visits]; this.revealedFall=fall?keyOf(fall):null; this.update(0,0);
  }
  update(dt: number, clock: number) {
    let collapsed=0;
    const max = this.revealVisits ? Math.max(1,...this.revealVisits) : 1;
    for (const t of this.tiles) {
      t.time += dt;
      if(t.state==='warning'&&t.time>=t.warningSeconds){t.state='gone';t.time=0;collapsed++;}
      if(t.state==='gone'&&!t.permanent&&t.time>=3){t.state='recovering';t.time=0;}
      if(t.state==='recovering'&&t.time>=0.65){t.state='safe';t.time=0;}
      const m=t.mesh, warning=t.state==='warning', gone=t.state==='gone';
      const intensity=this.revealVisits?.[t.cell.z*SIZE+t.cell.x]??0;
      const fallingTile=this.revealedFall===keyOf(t.cell);
      // The reveal reconstructs the floor so the complete route stays readable.
      m.visible = !!this.revealVisits || !gone || t.time<0.55;
      m.position.set(t.cell.x-(SIZE-1)/2,-0.825,t.cell.z-(SIZE-1)/2); m.rotation.set(0,0,0);
      t.cracks.visible=warning&&!this.revealVisits;
      t.rim.material.color.setHex(warning?(t.time<0.3?0xf060ff:0xffcf55):0x00dfff);
      if(this.revealVisits) {
        m.material.color.setHex(fallingTile?0xff6f63:intensity>0?0x63e8d5:t.base);
        m.material.emissive.setHex(fallingTile?0xa52d1d:intensity>0?0x10a98d:0x052f3a);
        m.material.emissiveIntensity=fallingTile?0.8:intensity/max*0.7;
        t.rim.material.color.setHex(fallingTile?0xffc99b:intensity>0?0xc7fff2:0x305c67);
      } else {
        m.material.color.setHex(warning?(t.time<0.3?0xb74bdf:t.time>0.9?0xff3657:0xf2aa43):t.state==='recovering'?0x56d8ce:t.base);
        m.material.emissive.setHex(warning?0xf36d20:0x002f4b);
        m.material.emissiveIntensity=warning?(this.reducedMotion?0.5:0.35+(Math.sin(clock*15)+1)*0.2):0.3;
        if(warning&&!this.reducedMotion) {
          const shake=t.time/t.warningSeconds*0.024;
          m.position.x+=Math.sin(clock*49)*shake; m.position.z+=Math.cos(clock*43)*shake;
          m.rotation.z=Math.sin(clock*31)*shake*0.5;
        }
        if(gone) {
          m.position.y-=t.time*t.time*19;
          if(!this.reducedMotion) {m.rotation.x=t.time*1.2;m.rotation.z=t.time*0.65;}
        }
        if(t.state==='recovering') m.position.y-=(1-t.time/0.65)*2.5;
      }
      t.surface.material.color.copy(m.material.color);
      t.surface.material.emissive.copy(m.material.emissive);
      t.surface.material.emissiveIntensity=m.material.emissiveIntensity*0.4;
      if(!this.revealVisits&&t.state==='safe'){t.surface.material.emissive.setHex(0x236496);t.surface.material.emissiveIntensity=0.3;}
      m.material.color.multiplyScalar(0.3);
      m.updateMatrix();this.rockMatrix.multiplyMatrices(m.matrix,this.rockLocal);
      if(!m.visible)this.rockMatrix.scale(this.zeroScale);
      this.rocks.setMatrixAt(t.cell.z*SIZE+t.cell.x,this.rockMatrix);
      this.rockMatrix.multiplyMatrices(m.matrix,this.glowLocal);if(!m.visible)this.rockMatrix.scale(this.zeroScale);
      this.glow.setMatrixAt(t.cell.z*SIZE+t.cell.x,this.rockMatrix);this.glow.setColorAt(t.cell.z*SIZE+t.cell.x,t.rim.material.color);
    }
    this.rocks.instanceMatrix.needsUpdate=true;this.glow.instanceMatrix.needsUpdate=true;
    if(this.glow.instanceColor)this.glow.instanceColor.needsUpdate=true;
    return collapsed;
  }
  theme(trickster: boolean | number) {
    for(const tile of this.tiles)tile.base=(trickster?[0xa17cde,0x9873d5,0x70ace8,0xbc87e3,0x809ce2]:PALETTE)[(tile.cell.x*3+tile.cell.z*2)%5];
    if(typeof trickster==='number')for(const tile of this.tiles)tile.base=trickster;
    this.update(0,0);
  }
  reset() {this.revealVisits=null;this.revealedFall=null;for(const tile of this.tiles){tile.state='safe';tile.time=0;tile.permanent=false;tile.warningSeconds=1.25;}this.update(0,0);}
}
