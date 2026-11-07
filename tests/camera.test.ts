import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {fitArena,screenToWorld,CAMERA_POSITION,FollowCamera} from '../src/game/CameraRig';
describe('perspective readability and input',()=>{
  it('maps screen directions without changing movement speed',()=>{
    const right=screenToWorld({x:1,z:0});
    expect(right.x).toBe(1);expect(right.z).toBe(0);
    for(const input of [{x:0,z:-1},{x:1,z:0},{x:Math.SQRT1_2,z:Math.SQRT1_2}]){
      const output=screenToWorld(input);expect(Math.hypot(output.x,output.z)).toBeCloseTo(1);
    }
  });
  it.each([[1280,720],[850,650],[320,500],[740,380]])('keeps the board and deep columns in frame at %sx%s',(w,h)=>{
    const camera=new THREE.PerspectiveCamera(42,1,0.1,100);
    camera.position.copy(CAMERA_POSITION);camera.lookAt(0,-0.45,0);camera.updateMatrixWorld();fitArena(camera,w,h);
    for(const x of [-5,5])for(const z of [-5,5])for(const y of [0,-1.65]){
      const projected=new THREE.Vector3(x,y,z).project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);expect(Math.abs(projected.y)).toBeLessThan(1);
    }
  });
});

describe('third-person follow camera',()=>{
  it.each([[1280,720],[320,700]])('keeps the runner and nearby forward tile visible at %sx%s',(w,h)=>{
    const camera=new THREE.PerspectiveCamera(60,1,0.1,100),rig=new FollowCamera(camera);
    rig.resize(w,h);rig.setMode('follow',0,0);
    for(const position of [[0,0.1,0],[0,1.15,0],[0,0,-1]]){
      const point=new THREE.Vector3(position[0],position[1],position[2]).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);expect(Math.abs(point.y)).toBeLessThan(1);expect(point.z).toBeLessThan(1);
    }
  });
  it('tracks floor position, clamps outside the arena, and restores the overview',()=>{
    const camera=new THREE.PerspectiveCamera(),rig=new FollowCamera(camera,true);
    rig.resize(800,600);rig.setMode('follow',0,0);rig.update(2,-1,0.1);
    expect(camera.position.x).toBe(2);expect(camera.position.z).toBeCloseTo(3.3);expect(camera.position.y).toBe(2.7);
    rig.update(100,-100,1);expect(camera.position.x).toBe(5.3);expect(camera.position.z).toBeCloseTo(-1);
    rig.setMode('overview',0,0);expect(camera.position.equals(CAMERA_POSITION)).toBe(true);
  });
});

describe('controller camera orbit',()=>{
  it('keeps forward movement relative to the camera after a quarter turn',()=>{
    const direction=screenToWorld({x:0,z:-1},Math.PI/2);expect(direction.x).toBeCloseTo(-1);expect(direction.z).toBeCloseTo(0);
    expect(Math.hypot(...Object.values(screenToWorld({x:.6,z:.8},2)))).toBeCloseTo(1);
  });
  it('orbits and clamps pitch without moving below the floor, then recentres exactly',()=>{
    const camera=new THREE.PerspectiveCamera(),rig=new FollowCamera(camera,true);rig.resize(1920,1080);rig.setMode('follow',0,0);
    rig.lookAround({x:1,y:-1},10);rig.update(0,0,.016);expect(rig.yaw).not.toBe(0);expect(camera.position.y).toBeGreaterThan(1);
    const runner=new THREE.Vector3(0,.6,0).project(camera);expect(Math.abs(runner.x)).toBeLessThan(1);expect(Math.abs(runner.y)).toBeLessThan(1);
    rig.recentre();rig.update(0,0,.016);expect(camera.position.x).toBeCloseTo(0);expect(camera.position.z).toBeCloseTo(4.3);expect(camera.position.y).toBeCloseTo(2.7);
  });
  it('ignores right-stick orbit in overview mode',()=>{const rig=new FollowCamera(new THREE.PerspectiveCamera());rig.lookAround({x:1,y:1},1);expect(rig.yaw).toBe(0);});
});
