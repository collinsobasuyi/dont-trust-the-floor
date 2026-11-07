import * as THREE from 'three';
import { cellAt, type Cell } from '../intelligence/RouteTracker';
import type { Arena } from './Arena';

/** Original articulated runner built from geometry; no downloaded character assets. */
export class Player {
  mesh=new THREE.Group();
  x=0;z=0;y=0;velocity=0;
  grounded=true;
  fallCell: Cell|null=null;
  private character=new THREE.Group();
  private arms=[new THREE.Group(),new THREE.Group()];
  private legs=[new THREE.Group(),new THREE.Group()];
  private knees=[new THREE.Group(),new THREE.Group()];
  private marker:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
  private ripple:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
  private phase=0;
  private grace=0;
  private jumpBuffer=0;
  private reaction=0;
  private armor!:THREE.MeshStandardMaterial;
  pose(){return {x:this.x,y:this.y,z:this.z,facing:this.character.rotation.y};}
  showPose(p:{x:number;y:number;z:number;facing:number}){this.mesh.position.set(p.x,p.y,p.z);this.character.rotation.y=p.facing;this.marker.visible=p.y>=0;this.marker.position.y=.018-p.y;}
  setSuit(color:number){this.armor.color.setHex(color);}
  celebrate(){this.reaction=1;}
  private squash=0;
  private facing=Math.PI;
  private landing=0;

  constructor(private reducedMotion=false) {
    const armor=new THREE.MeshStandardMaterial({color:0xf1f3ff,roughness:0.45,metalness:0.5});
    this.armor=armor;
    const suit=new THREE.MeshStandardMaterial({color:0x18233c,roughness:0.68});
    const trim=new THREE.MeshStandardMaterial({color:0x8468ec,emissive:0x1a337a,emissiveIntensity:0.35,roughness:0.4});
    const visor=new THREE.MeshStandardMaterial({color:0x63f6ef,emissive:0x26ddda,emissiveIntensity:1.3,roughness:0.2});
    const part=(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number)=>{
      const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
    };
    part(new THREE.BoxGeometry(0.28,0.33,0.19),suit,this.character,0,0.65,0);
    const chest=part(new THREE.BoxGeometry(0.24,0.21,0.045),armor,this.character,0,0.69,0.11);chest.rotation.x=-0.15;
    part(new THREE.BoxGeometry(0.055,0.16,0.055),trim,this.character,0,0.7,0.14);
    part(new THREE.BoxGeometry(0.29,0.055,0.22),trim,this.character,0,0.48,0);
    part(new THREE.BoxGeometry(0.23,0.13,0.17),suit,this.character,0,0.44,0);
    part(new THREE.CapsuleGeometry(0.132,0.085,4,10),armor,this.character,0,0.98,0);
    part(new THREE.BoxGeometry(0.22,0.075,0.065),visor,this.character,0,1.0,0.111);
    part(new THREE.BoxGeometry(0.085,0.04,0.2),trim,this.character,0,1.125,-0.01);
    part(new THREE.BoxGeometry(0.17,0.22,0.12),suit,this.character,0,0.68,-0.15);
    for(let i=0;i<2;i++) {
      const side=i===0?-1:1,arm=this.arms[i],leg=this.legs[i],knee=this.knees[i];
      arm.position.set(side*0.205,0.77,0);this.character.add(arm);
      part(new THREE.SphereGeometry(0.095,10,8),trim,arm,0,0,0);
      part(new THREE.CapsuleGeometry(0.048,0.14,3,8),suit,arm,0,-0.12,0);
      const forearm=part(new THREE.BoxGeometry(0.09,0.17,0.09),armor,arm,0,-0.245,0.045);forearm.rotation.x=-0.35;
      part(new THREE.SphereGeometry(0.052,8,6),suit,arm,0,-0.33,0.07);
      leg.position.set(side*0.09,0.43,0);this.character.add(leg);
      part(new THREE.CapsuleGeometry(0.06,0.12,3,8),suit,leg,0,-0.105,0);
      knee.position.set(0,-0.22,0);leg.add(knee);
      part(new THREE.BoxGeometry(0.105,0.14,0.1),armor,knee,0,-0.065,0);
      part(new THREE.BoxGeometry(0.1,0.055,0.055),trim,knee,0,0,0.06);
      part(new THREE.BoxGeometry(0.11,0.08,0.21),suit,knee,0,-0.17,0.045);
    }
    this.character.rotation.y=this.facing;this.mesh.add(this.character);
    this.marker=new THREE.Mesh(new THREE.RingGeometry(0.32,0.35,40),new THREE.MeshBasicMaterial({color:0x50f6d3,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false}));
    this.marker.rotation.x=-Math.PI/2;this.marker.position.y=0.018;this.mesh.add(this.marker);
    this.ripple=new THREE.Mesh(new THREE.RingGeometry(0.27,0.3,32),new THREE.MeshBasicMaterial({color:0xb9fff0,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
    this.ripple.rotation.x=-Math.PI/2;this.ripple.position.y=0.023;this.mesh.add(this.ripple);
  }
  update(dt:number,movement:{x:number;z:number},jump:boolean,arena:Arena) {
    this.jumpBuffer=jump?0.14:Math.max(0,this.jumpBuffer-dt);
    this.grace=this.grounded?0.12:Math.max(0,this.grace-dt);
    let jumped=false;
    if(this.jumpBuffer>0&&(this.grounded||this.grace>0)&&this.y>=-0.15){this.velocity=5.8;this.grounded=false;this.grace=0;this.jumpBuffer=0;jumped=true;}
    this.x+=movement.x*3.05*dt;this.z+=movement.z*3.05*dt;
    const cell=cellAt(this.x,this.z),solid=arena.solid(cell);
    if(this.grounded&&!solid){this.grounded=false;this.velocity=0;this.fallCell=cell;}
    if(!this.grounded) {
      const previous=this.y;this.velocity-=15*dt;this.y+=this.velocity*dt;
      if(this.velocity<=0&&previous>=0&&this.y<=0) {
        if(solid){this.y=0;this.velocity=0;this.grounded=true;this.squash=1;this.landing=1;this.fallCell=null;}
        else this.fallCell=cell;
      }
    }
    this.mesh.position.set(this.x,this.y,this.z);
    this.marker.visible=solid&&this.y>=0;this.marker.position.y=0.018-this.y;
    this.ripple.visible=this.marker.visible&&!this.reducedMotion;this.ripple.position.y=0.023-this.y;
    const moving=Math.hypot(movement.x,movement.z)>0.1;
    if(moving)this.facing=Math.atan2(movement.x,movement.z);
    const difference=Math.atan2(Math.sin(this.facing-this.character.rotation.y),Math.cos(this.facing-this.character.rotation.y));
    this.character.rotation.y+=difference*(this.reducedMotion?1:1-Math.exp(-dt*18));
    this.animate(dt,moving);return jumped;
  }
  idle(dt:number){this.animate(dt,false);}
  private animate(dt:number,moving:boolean) {
    this.phase+=dt;this.reaction=Math.max(0,this.reaction-dt);this.squash=Math.max(0,this.squash-dt*6);this.landing=Math.max(0,this.landing-dt*3);
    this.ripple.material.opacity=this.landing*0.7;this.ripple.scale.setScalar(1+(1-this.landing)*1.5);
    if(this.reducedMotion)return;
    const stride=moving&&this.grounded?Math.sin(this.phase*16):0;
    const jumping=!this.grounded&&this.y>=0,falling=this.y<0;
    this.character.position.y=this.grounded?(moving?Math.abs(stride)*0.035:Math.sin(this.phase*2.5)*0.008):0;
    this.character.scale.set(1+this.squash*0.08,1-this.squash*0.12,1+this.squash*0.08);
    this.character.rotation.x=moving&&this.grounded?0.12:0;
    for(let i=0;i<2;i++) {
      const sign=i===0?1:-1;
      this.legs[i].rotation.x=jumping?sign*0.55:stride*sign*0.7;
      this.knees[i].rotation.x=jumping?0.7:Math.max(0,-stride*sign)*0.8;
      this.arms[i].rotation.x=jumping?-1.0:falling?-2:-stride*sign*0.65-0.15;
      if(this.reaction>0)this.arms[i].rotation.x=-2.4;
      this.arms[i].rotation.z=falling?sign*0.9:sign*0.08;
    }
  }
  reset() {
    this.grace=0;this.jumpBuffer=0;this.reaction=0;this.x=0;this.y=0;this.z=0;this.velocity=0;this.grounded=true;this.fallCell=null;this.squash=0;this.landing=0;this.facing=Math.PI;
    this.mesh.position.set(0,0,0);this.character.rotation.set(0,this.facing,0);this.character.scale.setScalar(1);
    this.marker.visible=true;this.marker.position.y=0.018;this.animate(0,false);
  }
}
