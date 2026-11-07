import * as THREE from 'three';

/** An original orbital stadium. All scenery sits outside the playable floor. */
export class World {
  group=new THREE.Group();
  private stadium=new THREE.Group();
  private stars:THREE.Points;
  private ring:THREE.Mesh;
  constructor(){
    const shell=new THREE.MeshStandardMaterial({color:0xa8bddd,roughness:0.5,metalness:0.28});
    const blue=new THREE.MeshStandardMaterial({color:0x2462c7,roughness:0.45,metalness:0.3});
    const gold=new THREE.MeshStandardMaterial({color:0xf8bd43,roughness:0.4,metalness:0.35});
    const cyan=new THREE.MeshBasicMaterial({color:0x77eeff,toneMapped:false});
    const violet=new THREE.MeshBasicMaterial({color:0x9365ff,toneMapped:false});
    const add=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{
      const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);this.stadium.add(mesh);return mesh;
    };
    // Open central void: the setting surrounds the arena without hiding floor gaps.
    for(const [radius,y,thickness,material] of [[12,-1.3,0.28,blue],[12,3.6,0.18,gold],[12,3.9,0.045,cyan],[12,6.4,0.24,blue],[12,6.7,0.04,violet]] as const){
      const track=add(new THREE.TorusGeometry(radius,thickness,6,64),material,0,y,0);track.rotation.x=Math.PI/2;
    }
    const towerGeometry=new THREE.CylinderGeometry(0.43,0.63,8.8,8);
    const panelGeometry=new THREE.BoxGeometry(0.56,1.3,0.17);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,x=Math.sin(a)*12,z=Math.cos(a)*12;
      add(towerGeometry,shell,x,2.2,z);
      for(const y of [-0.9,0.2,4.2,6])add(new THREE.CylinderGeometry(0.65,0.65,0.22,8),blue,x,y,z);
      const panel=add(panelGeometry,cyan,x*0.94,2.6,z*0.94);panel.rotation.y=a;
      const brace=add(new THREE.BoxGeometry(0.94,0.28,0.85),gold,x,4.2,z);brace.rotation.y=a;
      const light=add(new THREE.SphereGeometry(0.14,8,6),cyan,x,6.8,z);light.scale.y=0.65;
    }
    const deck=add(new THREE.RingGeometry(10.7,13.1,64),new THREE.MeshStandardMaterial({color:0x263b82,roughness:0.75,side:THREE.DoubleSide}),0,-1.15,0);deck.rotation.x=-Math.PI/2;
    // Yellow marks along the outer walkway reinforce scale and direction.
    const markerGeometry=new THREE.BoxGeometry(0.13,0.035,0.55);
    const marks=new THREE.InstancedMesh(markerGeometry,gold,48),dummy=new THREE.Object3D();
    for(let i=0;i<48;i++){const a=i*Math.PI/24;dummy.position.set(Math.sin(a)*11,-1.1,Math.cos(a)*11);dummy.rotation.y=a+0.5;dummy.updateMatrix();marks.setMatrixAt(i,dummy.matrix);}
    this.stadium.add(marks);this.group.add(this.stadium);
    const positions=new Float32Array(200*3);
    for(let i=0;i<200;i++){positions[i*3]=Math.sin(i*127.1)*35;positions[i*3+1]=Math.cos(i*63.7)*20+7;positions[i*3+2]=Math.sin(i*39.3)*35;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xc6dfff,size:0.07,transparent:true,opacity:0.8,depthWrite:false}));this.group.add(this.stars);
    this.ring=new THREE.Mesh(new THREE.RingGeometry(4.4,4.5,64),new THREE.MeshBasicMaterial({color:0xa76cff,side:THREE.DoubleSide,transparent:true,opacity:0.4}));
    this.ring.rotation.x=-Math.PI/2;this.ring.position.y=-3;this.group.add(this.ring);
  }
  menuScene(menu:boolean){this.stadium.visible=!menu;}
  update(time:number,reducedMotion:boolean){if(!reducedMotion){this.stars.rotation.y=time*0.002;this.ring.rotation.z=time*0.06;}}
}
