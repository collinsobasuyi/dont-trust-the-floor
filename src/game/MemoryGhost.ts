import * as THREE from 'three';
import {Player} from './Player';
import type {Cell} from '../intelligence/RouteTracker';
import {ghostPose,type GhostRoute} from './GhostMemory';
/** Visual echo only: it never changes collisions or player controls. */
export class MemoryGhost {
  group=new THREE.Group();
  private actor=new Player(true);
  private trail:THREE.Line;
  private marks:{mesh:THREE.Mesh;until:number}[]=[];
  mark(cell:Cell,until:number){const mesh=new THREE.Mesh(new THREE.TorusGeometry(.36,.025,5,20),new THREE.MeshBasicMaterial({color:0xe0b3ff,toneMapped:false,depthTest:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(cell.x-4.5,.06,cell.z-4.5);this.group.add(mesh);this.marks.push({mesh,until});}
  private clearMarks(){for(const m of this.marks){this.group.remove(m.mesh);m.mesh.geometry.dispose();(m.mesh.material as THREE.Material).dispose();}this.marks=[];}
  constructor(){
    this.actor.mesh.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=false;object.receiveShadow=false;object.material=new THREE.MeshBasicMaterial({color:0x9b81ff,transparent:true,opacity:.32,depthWrite:false,toneMapped:false});}});
    this.trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xa286ff,transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));
    this.group.add(this.actor.mesh,this.trail);this.group.visible=false;
  }
  load(route:GhostRoute|null){this.clearMarks();this.group.visible=!!route;this.trail.geometry.dispose();this.trail.geometry=new THREE.BufferGeometry().setFromPoints(route?route.points.filter((_,i)=>i%3===0).map(p=>new THREE.Vector3(p.x,.025,p.z)):[]);if(route)this.update(route,0);}
  update(route:GhostRoute,time:number){this.marks=this.marks.filter(m=>{if(time<=m.until)return true;this.group.remove(m.mesh);m.mesh.geometry.dispose();(m.mesh.material as THREE.Material).dispose();return false;});const pose=ghostPose(route,time);this.actor.mesh.visible=!!pose;if(pose)this.actor.showPose(pose);}
}
