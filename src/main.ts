import './style.css';
import { Game } from './game/Game';
try { new Game(); }
catch (error) {
  console.error(error);
  document.getElementById('app')?.setAttribute('data-screen','game');
  for(const page of ['home','how','settings','analysis','practice','family']){const panel=document.getElementById(page+'-screen');if(panel)panel.hidden=true;}
  const overlay=document.getElementById('overlay');
  if(overlay) { overlay.hidden=false;overlay.innerHTML='<div class="overlay-card"><p class="eyebrow">RENDERER UNAVAILABLE</p><h2>We need a little graphics power.</h2><p>This game needs WebGL. Try enabling hardware acceleration in your browser, then reload.</p><button class="primary" id="reload">Reload ↗</button></div>';document.getElementById('reload')?.addEventListener('click',()=>location.reload()); }
}
