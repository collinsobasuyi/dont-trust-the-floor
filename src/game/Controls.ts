export class Controls {
  private keys = new Set<string>();
  private jumpQueued = false;
  private pointer: number | null = null;
  private stick = {x:0,z:0};
  constructor(private joystick: HTMLElement, jump: HTMLButtonElement, private pause: () => void) {
    const handled = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','Escape'];
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement)?.closest('button, input, a')) return;
      if (!handled.includes(e.code)) return;
      e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
      if (e.code === 'Escape' && !e.repeat) this.pause();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());
    joystick.addEventListener('pointerdown', e => { if (this.pointer !== null) return; this.pointer = e.pointerId; joystick.setPointerCapture(e.pointerId); move(e); });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.pointer) return;
      const r = joystick.getBoundingClientRect();
      let x = (e.clientX-r.left-r.width/2)/35, z = (e.clientY-r.top-r.height/2)/35;
      const length = Math.hypot(x,z); if (length > 1) { x/=length; z/=length; }
      this.stick = {x,z};
      joystick.style.setProperty('--jx', `${x*27}px`); joystick.style.setProperty('--jy', `${z*27}px`);
    };
    joystick.addEventListener('pointermove', move);
    const release = () => { this.pointer = null; this.stick = {x:0,z:0}; joystick.style.setProperty('--jx','0px'); joystick.style.setProperty('--jy','0px'); };
    joystick.addEventListener('lostpointercapture', release);
    joystick.addEventListener('pointerup', release);
    joystick.addEventListener('pointercancel', release);
    jump.addEventListener('pointerdown', e => { e.preventDefault(); this.jumpQueued = true; });
  }
  movement(controller={x:0,z:0}) {
    let x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')) + this.stick.x + controller.x;
    let z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) + this.stick.z + controller.z;
    const length = Math.hypot(x,z); if (length > 1) { x/=length; z/=length; }
    return {x,z};
  }
  jump() { const jump = this.jumpQueued; this.jumpQueued = false; return jump; }
  reset() {
    this.keys.clear();this.jumpQueued=false;this.stick={x:0,z:0};
    if(this.pointer!==null&&this.joystick.hasPointerCapture(this.pointer))this.joystick.releasePointerCapture(this.pointer);
    this.pointer=null;this.joystick.style.setProperty('--jx','0px');this.joystick.style.setProperty('--jy','0px');
  }
}
