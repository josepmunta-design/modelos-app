// The artwork is decorative. The four entrances work without JavaScript.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');
const toggle = document.querySelector('#motion-toggle');
let paused = reduced.matches, frame = 0, last = 0, time = 0;
const TAU = Math.PI * 2;
const scenes = [...document.querySelectorAll('.portal')].map((element, index) => {
  const canvas = element.querySelector('canvas');
  return { element, canvas, ctx: canvas.getContext('2d'), index, kind: element.dataset.scene,
    width: 1, height: 1, visible: true, active: false, energy: 0, x: 0, y: 0, tx: 0, ty: 0,
    color: ['208,183,141', '164,198,166', '139,185,190', '197,157,121'][index] };
});
function stroke(ctx, color, alpha, width = 1) { ctx.strokeStyle = `rgba(${color},${alpha})`; ctx.lineWidth = width; }
function dot(ctx, x, y, radius, color, alpha = 1) {
  ctx.fillStyle = `rgba(${color},${alpha})`; ctx.beginPath(); ctx.arc(x,y,radius,0,TAU); ctx.fill();
}
function glow(ctx, x, y, radius, color, alpha) {
  const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,`rgba(${color},${alpha})`); gradient.addColorStop(1,`rgba(${color},0)`);
  ctx.fillStyle=gradient;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}
function library(s, cx, cy, radius) {
  const {ctx,color,energy}=s;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.07+Math.sin(time*.22)*.013);
  for(let page=2;page>=0;page--) {
    const x=-radius*.7+page*9, y=-radius*.65-page*9, w=radius*1.42, h=radius*1.36;
    ctx.fillStyle=`rgba(16,23,18,${page===0?.83:.55})`;ctx.fillRect(x,y,w,h);
    stroke(ctx,color,page===0?.48:.22);ctx.strokeRect(x,y,w,h);
    if(page>0)continue;
    ctx.font=`italic ${Math.max(17,radius*.19)}px "Instrument Serif",Georgia,serif`;
    ctx.fillStyle=`rgba(${color},.94)`;ctx.fillText('El archivo vivo',x+14,y+29);
    const scan=(Math.sin(time*.65)*.5+.5)*6;
    for(let row=0;row<7;row++) {
      const ry=y+49+row*(h-63)/7, near=Math.max(0,1-Math.abs(row-scan));
      stroke(ctx,color,.2+near*(.25+energy*.4),.75);ctx.beginPath();ctx.moveTo(x+27,ry);ctx.lineTo(x+w-15-(row%3)*12,ry);ctx.stroke();
      dot(ctx,x+16,ry,1.4+near*.8,color,.45+near*.5);
      stroke(ctx,color,.12,.6);ctx.beginPath();ctx.moveTo(x+27,ry+5);ctx.lineTo(x+w*.52,ry+5);ctx.stroke();
    }
  }
  ctx.restore();
}
function network(s,cx,cy,radius) {
  const {ctx,color,energy}=s;
  const points=Array.from({length:27},(_,i)=>{
    const angle=i*2.39996+time*.025;
    const r=Math.sqrt((i+.5)/27)*radius;
    return {x:cx+Math.cos(angle)*r+Math.sin(time*.38+i)*4,y:cy+Math.sin(angle)*r*.82+Math.cos(time*.3+i)*4};
  });
  for(let i=0;i<points.length;i++) {
    const a=points[i];
    for(let j=i+1;j<points.length;j++) {
      const b=points[j],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d>radius*.73)continue;
      stroke(ctx,color,(1-d/(radius*.73))*(.48+energy*.35),.75);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2+Math.sin(i+time*.2)*9,(a.y+b.y)/2-8,b.x,b.y);ctx.stroke();
    }
    if(i%5===0)glow(ctx,a.x,a.y,17,color,.16+energy*.1);
    dot(ctx,a.x,a.y,i%5===0?3:1.5,color,.6+energy*.35);
    if(i%7===0){stroke(ctx,color,.35);ctx.beginPath();ctx.arc(a.x,a.y,7,0,TAU);ctx.stroke();}
  }
  ctx.font='italic 13px "Instrument Serif",Georgia,serif';ctx.fillStyle=`rgba(${color},.75)`;
  ctx.fillText('vínculo',cx-radius*.9,cy-radius*.8);ctx.fillText('experiencia',cx+radius*.1,cy+radius*.96);
}
// Local geographic outlines are optional; the globe renders immediately.
let land = [];
fetch('/assets/atlas-home/land.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  land=data;
  if(paused)render(true);
}).catch(()=>{});
function globe(s,cx,cy,radius) {
  const {ctx,color,energy}=s;
  const rotation=time*.055+s.x*.007-.5;
  const project=(lon,lat)=>{
    const a=lon*Math.PI/180+rotation,b=lat*Math.PI/180;
    return {x:cx+Math.cos(b)*Math.sin(a)*radius,y:cy-Math.sin(b)*radius,z:Math.cos(b)*Math.cos(a)};
  };
  glow(ctx,cx-radius*.35,cy-radius*.25,radius*1.35,color,.085+energy*.04);
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,radius,0,TAU);ctx.clip();
  for(let lon=-180;lon<180;lon+=30){
    ctx.beginPath();let pen=false;
    for(let lat=-90;lat<=90;lat+=3){const p=project(lon,lat);if(p.z<0){pen=false;continue;}pen?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pen=true;}
    stroke(ctx,color,.22,.65);ctx.stroke();
  }
  for(let lat=-60;lat<=60;lat+=30){
    ctx.beginPath();let pen=false;
    for(let lon=-180;lon<=180;lon+=3){const p=project(lon,lat);if(p.z<0){pen=false;continue;}pen?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pen=true;}
    stroke(ctx,color,.22,.65);ctx.stroke();
  }
  for(const ring of land){
    ctx.beginPath();let pen=false;
    for(const [lon,lat] of ring){const p=project(lon,lat);if(p.z<0){pen=false;continue;}pen?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pen=true;}
    stroke(ctx,color,.62,.8);ctx.stroke();
  }
  for(const [lon,lat] of [[16.37,48.21],[-.12,51.51],[8.54,47.37],[-74,40.71],[-122,37.44],[-58.38,-34.6],[139.69,35.68],[2.17,41.39],[77.21,28.61],[151.21,-33.87]]){
    const p=project(lon,lat);if(p.z<0)continue;
    glow(ctx,p.x,p.y,9,color,.27);dot(ctx,p.x,p.y,2,color,.95);
  }
  ctx.restore();stroke(ctx,color,.55,.9);ctx.beginPath();ctx.arc(cx,cy,radius,0,TAU);ctx.stroke();
  stroke(ctx,color,.16,.65);ctx.beginPath();ctx.ellipse(cx,cy,radius*1.23,radius*.38,-.4,0,TAU);ctx.stroke();
}
function genealogy(s,cx,cy,radius) {
  const {ctx,color,energy}=s;
  const rows=[[0],[-.48,.43],[-.78,-.23,.25,.8],[-.9,-.57,-.25,.1,.46,.85]];
  const points=rows.map((row,ri)=>row.map((x,i)=>({x:cx+x*radius+Math.sin(time*.23+ri+i)*2,y:cy-radius*.85+ri*radius*.53})));
  for(let row=0;row<points.length;row++) {
    stroke(ctx,color,.12,.5);ctx.beginPath();ctx.moveTo(cx-radius,points[row][0].y);ctx.lineTo(cx+radius,points[row][0].y);ctx.stroke();
    for(let i=0;i<points[row].length;i++) {
      const p=points[row][i];
      if(row>0){const parent=points[row-1][Math.min(points[row-1].length-1,Math.floor(i*points[row-1].length/points[row].length))];
        stroke(ctx,color,.42+energy*.2,1);ctx.beginPath();ctx.moveTo(parent.x,parent.y);ctx.bezierCurveTo(parent.x,parent.y+radius*.27,p.x,p.y-radius*.27,p.x,p.y);ctx.stroke();}
      glow(ctx,p.x,p.y,12,color,.12);dot(ctx,p.x,p.y,row===0?4:2.7,color,.85);
      if(row<2){stroke(ctx,color,.34);ctx.beginPath();ctx.arc(p.x,p.y,8,0,TAU);ctx.stroke();}
    }
  }
}
const painters={list:library,network,map:globe,genealogy};
function paint(s,snap=false) {
  if(!s.ctx)return;
  const {ctx,width:w,height:h}=s;
  const ease=snap?1:.075;
  s.energy+=((s.active?1:0)-s.energy)*ease;
  s.x+=(s.tx-s.x)*ease;s.y+=(s.ty-s.y)*ease;
  s.element.style.setProperty('--dx',`${(s.x*.35).toFixed(2)}px`);
  s.element.style.setProperty('--dy',`${(s.y*.35).toFixed(2)}px`);
  ctx.clearRect(0,0,w,h);
  const cx=w*.5+s.x*.4,cy=h*.27+s.y*.4,radius=Math.min(w*.32,h*.17);
  painters[s.kind](s,cx,cy,radius);
  // Slow particles and fine drifting filaments give all four scenes one atmosphere.
  for(let i=0;i<19;i++){
    const x=(Math.sin(i*47.1)*.5+.5)*w;
    const y=((i*37.13+time*(1.4+i%3))%(h*.56))+40;
    dot(ctx,x+Math.sin(time*.18+i)*7,y,i%3===0?1:.5,s.color,.1+(.5+.5*Math.sin(time*.4+i))*.19);
  }
}
function render(snap=false){for(const s of scenes)if(s.visible)paint(s,snap);}
function tick(now){
  frame=0;if(paused||document.hidden||!scenes.some(s=>s.visible))return;
  if(now-last>=32){time+=Math.min((now-last)/1000,.06);last=now;render();}
  frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);frame=0;last=performance.now();
  toggle.setAttribute('aria-pressed',String(paused));
  toggle.querySelector('.motion-label').textContent=paused?'Activar movimiento':'Pausar movimiento';
  toggle.querySelector('.motion-icon').textContent=paused?'▷':'Ⅱ';
  if(!paused&&!document.hidden&&scenes.some(s=>s.visible))frame=requestAnimationFrame(tick);
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){const s=scenes.find(s=>s.element===entry.target);s.visible=entry.isIntersecting;if(s.visible&&paused)paint(s,true);}sync();
},{rootMargin:'80px'});
for(const s of scenes){
  const resize=()=>{const box=s.element.getBoundingClientRect();s.width=box.width;s.height=box.height;const dpr=Math.min(devicePixelRatio||1,1.75);s.canvas.width=Math.round(s.width*dpr);s.canvas.height=Math.round(s.height*dpr);s.ctx?.setTransform(dpr,0,0,dpr,0,0);paint(s,true);};
  new ResizeObserver(resize).observe(s.element);observer.observe(s.element);resize();
  const activate=value=>{s.active=value;if(paused)paint(s,true);};
  s.element.addEventListener('pointerenter',()=>activate(true));
  s.element.addEventListener('focus',()=>activate(true));
  s.element.addEventListener('blur',()=>activate(false));
  s.element.addEventListener('pointerleave',()=>{if(document.activeElement!==s.element)activate(false);s.tx=s.ty=0;});
  s.element.addEventListener('pointermove',event=>{
    if(paused||!finePointer.matches)return;
    const box=s.element.getBoundingClientRect(),x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;
    s.tx=(x-.5)*24;s.ty=(y-.5)*18;s.element.style.setProperty('--mx',`${x*100}%`);s.element.style.setProperty('--my',`${y*100}%`);
  });
}
toggle.hidden=false;toggle.addEventListener('click',()=>{paused=!paused;sync();});
reduced.addEventListener('change',()=>{paused=reduced.matches;for(const s of scenes)s.tx=s.ty=s.x=s.y=0;render(true);sync();});
document.addEventListener('visibilitychange',sync);
window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));
window.addEventListener('pageshow',sync);
sync();
