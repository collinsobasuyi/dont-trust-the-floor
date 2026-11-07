import { SIZE } from '../intelligence/RouteTracker';
import * as THREE from 'three';
export const CAMERA_POSITION=new THREE.Vector3(2.8,7.5,11.5);
export function screenToWorld(input:{x:number;z:number},yaw=0){return {x:input.x*Math.cos(yaw)+input.z*Math.sin(yaw),z:-input.x*Math.sin(yaw)+input.z*Math.cos(yaw)};}
export function fitArena(camera:THREE.PerspectiveCamera,width:number,height:number){
  camera.aspect=Math.max(0.1,width/Math.max(1,height));camera.updateMatrixWorld();
  let tangent=0;const point=new THREE.Vector3();
  for(const x of [-SIZE/2,SIZE/2])for(const z of [-SIZE/2,SIZE/2])for(const y of [-1.65,1.15]){
    point.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);const depth=Math.max(0.1,-point.z);
    tangent=Math.max(tangent,Math.abs(point.y)/depth,Math.abs(point.x)/(depth*camera.aspect));
  }
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(tangent*1.16));camera.updateProjectionMatrix();
}
export class FollowCamera {
  mode:'follow'|'overview'='overview';
  yaw=0;private pitch=.0;
  lookAround(input:{x:number;y:number},dt:number){if(this.mode!=='follow')return;this.yaw=(this.yaw-input.x*dt*1.9)%(Math.PI*2);this.pitch=THREE.MathUtils.clamp(this.pitch+input.y*dt*.9,-.35,.65);}
  recentre(){this.yaw=0;this.pitch=0;}
  private width=1;private height=1;
  private focus=new THREE.Vector3();
  private position=new THREE.Vector3();
  private look=new THREE.Vector3();
  constructor(private camera:THREE.PerspectiveCamera,private reducedMotion=false){this.overview();}
  resize(width:number,height:number){this.width=width;this.height=height;this.projection();}
  setMode(mode:'follow'|'overview',x:number,z:number){
    if(mode===this.mode)return false;
    this.mode=mode;
    if(mode==='overview')this.overview();else this.update(x,z,0,true);
    this.projection();return true;
  }
  update(x:number,z:number,dt:number,snap=false){
    if(this.mode!=='follow')return;
    // Follow the floor position, not jump height or a fall into the void.
    this.focus.set(THREE.MathUtils.clamp(x,-SIZE/2-.3,SIZE/2+.3),0,THREE.MathUtils.clamp(z,-SIZE/2-.3,SIZE/2+.3));
    const distance=4.3*Math.cos(this.pitch),height=2.7+4.3*Math.sin(this.pitch);
    this.position.set(this.focus.x+Math.sin(this.yaw)*distance,height,this.focus.z+Math.cos(this.yaw)*distance);
    this.look.set(this.focus.x-Math.sin(this.yaw)*1.2,0.55,this.focus.z-Math.cos(this.yaw)*1.2);
    this.camera.position.lerp(this.position,snap||this.reducedMotion?1:1-Math.exp(-dt*10));
    this.camera.lookAt(this.look);this.camera.updateMatrixWorld();
  }
  private overview(){this.camera.position.copy(CAMERA_POSITION);this.camera.lookAt(0,-0.45,0);this.camera.updateMatrixWorld();this.projection();}
  private projection(){
    if(this.mode==='overview'){fitArena(this.camera,this.width,this.height);return;}
    this.camera.aspect=Math.max(0.1,this.width/Math.max(1,this.height));
    this.camera.fov=this.camera.aspect<0.8?72:60;this.camera.updateProjectionMatrix();
  }
}
